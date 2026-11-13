/*
 * YAMZ → TV launcher dashboard (read-only).
 * GET /api/shield/dashboard   -> small JSON summary (now streaming, download queue)
 * GET /api/shield/img?i=<id>  -> artwork proxied through YAMZ (never exposes server tokens)
 * Auth: a long-lived token, sent as "Authorization: Bearer <token>" or "X-Shield-Token".
 * Token comes from YAMZ_SHIELD_TOKEN, else one is generated once and kept in /config/shield.json.
 * Uses the Plex / Jellyfin / Radarr / Sonarr connections already saved in YAMZ (state zn:lib, zn:arr).
 * No dependencies.
 */
'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

module.exports = function createShield({STATE, CONFIG, log, json, send, env}){
  const file = path.join(CONFIG, 'shield.json');
  let token = env('YAMZ_SHIELD_TOKEN', '');
  if(!token){
    try{ token = JSON.parse(fs.readFileSync(file, 'utf8')).token; }catch{}
    if(!token){ token = crypto.randomBytes(24).toString('base64url'); fs.writeFileSync(file, JSON.stringify({token}), {mode:0o600}); }
  }
  log(`Shield dashboard token: ${token}  (use it in the launcher; endpoint /api/shield/dashboard)`);

  const authed = req => {
    const h = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || String(req.headers['x-shield-token'] || '');
    const a = Buffer.from(h), b = Buffer.from(token);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  };

  /* artwork: id -> upstream request (kept in memory only, capped) */
  const IMGS = new Map();
  const imgId = (url, headers = {}) => {
    const id = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
    IMGS.set(id, {url, headers});
    if(IMGS.size > 300) IMGS.delete(IMGS.keys().next().value);
    return id;
  };
  const imgUrl = (url, headers) => url ? `/api/shield/img?i=${imgId(url, headers)}` : null;

  const get = async (url, headers = {}, ms = 6000) => {
    const r = await fetch(url, {headers:{Accept:'application/json', ...headers}, signal:AbortSignal.timeout(ms)});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  };
  const pad2 = n => String(n ?? '').padStart(2, '0');
  const jfAuth = t => ({Authorization:`MediaBrowser Client="YAMZ Shield", Device="Launcher", DeviceId="yamz-shield", Version="1.0", Token="${String(t).replace(/"/g, '')}"`});

  async function plex(s){
    const mc = (await get(`${s.url}/status/sessions?X-Plex-Token=${encodeURIComponent(s.token)}`)).MediaContainer || {};
    return (mc.Metadata || []).map(m => {
      const ep = m.type === 'episode', ts = m.TranscodeSession;
      const th = ep ? (m.grandparentThumb || m.parentThumb || m.thumb) : m.thumb;
      const art = ep ? (m.grandparentArt || m.art) : m.art;
      const pu = p => p ? imgUrl(`${s.url}${p}?X-Plex-Token=${encodeURIComponent(s.token)}`) : null;
      return {src:'plex', server:s.name, user:m.User?.title || 'Someone', title:ep ? (m.grandparentTitle || m.title) : m.title,
        sub:ep ? `S${pad2(m.parentIndex)}E${pad2(m.index)} · ${m.title || ''}` : String(m.year || ''), state:m.Player?.state || 'playing',
        progress:m.duration ? Math.min(1, (+m.viewOffset || 0) / +m.duration) : 0, mode:ts?.videoDecision === 'transcode' ? 'transcode' : ts ? 'direct stream' : 'direct play',
        device:m.Player?.title || m.Player?.product || '', kbps:+(m.Session?.bandwidth || 0), remote:m.Session?.location ? m.Session.location !== 'lan' : false,
        poster:pu(th), backdrop:pu(art)};
    });
  }
  async function jellyfin(s){
    const ss = await get(`${s.url}/Sessions?activeWithinSeconds=960`, jfAuth(s.token));
    return (ss || []).filter(x => x.NowPlayingItem).map(x => {
      const it = x.NowPlayingItem, ps = x.PlayState || {}, ep = it.Type === 'Episode', ti = x.TranscodingInfo;
      const id = ep ? (it.SeriesId || it.Id) : it.Id, h = jfAuth(s.token);
      return {src:'jellyfin', server:s.name, user:x.UserName || 'Someone', title:ep ? (it.SeriesName || it.Name) : it.Name,
        sub:ep ? `S${pad2(it.ParentIndexNumber)}E${pad2(it.IndexNumber)} · ${it.Name || ''}` : String(it.ProductionYear || ''), state:ps.IsPaused ? 'paused' : 'playing',
        progress:it.RunTimeTicks ? Math.min(1, (+ps.PositionTicks || 0) / +it.RunTimeTicks) : 0, mode:ti && ti.IsVideoDirect === false ? 'transcode' : ti ? 'direct stream' : 'direct play',
        device:x.DeviceName || x.Client || '', kbps:ti?.Bitrate ? ti.Bitrate / 1000 : 0, remote:!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|::1|fe80|fc|fd)/i.test(String(x.RemoteEndPoint || '')),
        poster:imgUrl(`${s.url}/Items/${id}/Images/Primary?fillHeight=450&fillWidth=300&quality=85`, h), backdrop:imgUrl(`${s.url}/Items/${id}/Images/Backdrop?maxWidth=800&quality=70`, h)};
    });
  }
  async function arrQueue(svc, c){
    const q = await get(`${c.url}/api/v3/queue?page=1&pageSize=20&includeMovie=true&includeSeries=true&includeEpisode=true`, {'X-Api-Key':c.key});
    return (q.records || []).map(r => {
      const size = +r.size || 0, left = +r.sizeleft || 0;
      const title = svc === 'radarr' ? (r.movie?.title || r.title) : (r.series?.title || r.title);
      const sub = svc === 'sonarr' && r.episode ? `S${pad2(r.episode.seasonNumber)}E${pad2(r.episode.episodeNumber)}` : (r.movie?.year ? String(r.movie.year) : '');
      return {svc, title, sub, status:r.status, progress:size ? Math.max(0, Math.min(1, 1 - left / size)) : 0, eta:r.timeleft || null};
    });
  }

  let cache = {at:0, data:null, busy:null};
  async function build(){
    const lib = STATE.data['zn:lib'] || {}, arr = STATE.data['zn:arr'] || {};
    const servers = (lib.servers || []).filter(s => (s.type === 'plex' || s.type === 'jellyfin') && s.url && s.token);
    const errors = [];
    const streams = [], queue = [];
    await Promise.all([
      ...servers.map(async s => { try{ streams.push(...await (s.type === 'plex' ? plex(s) : jellyfin(s))); }catch(e){ errors.push(`${s.name || s.type}: ${e.message}`); } }),
      ...['radarr', 'sonarr'].filter(k => arr[k]?.url && arr[k]?.key).map(async k => { try{ queue.push(...await arrQueue(k, arr[k])); }catch(e){ errors.push(`${k}: ${e.message}`); } })
    ]);
    streams.sort((a, b) => (a.state === 'paused') - (b.state === 'paused') || a.user.localeCompare(b.user));
    const mbps = streams.reduce((n, s) => n + s.kbps, 0) / 1000;
    return {updated:Date.now(), streams, summary:{streaming:streams.length, transcoding:streams.filter(s => s.mode === 'transcode').length, mbps:Math.round(mbps * 10) / 10, downloading:queue.length},
      queue, errors};
  }
  const dashboard = () => {
    if(cache.data && Date.now() - cache.at < 4000) return Promise.resolve(cache.data);
    return cache.busy ||= build().then(d => { cache = {at:Date.now(), data:d, busy:null}; return d; }, e => { cache.busy = null; throw e; });
  };

  /* returns true if it handled the request */
  return async function shield(req, res, p, q){
    if(!p.startsWith('/api/shield/')) return false;
    if(req.method !== 'GET') return json(res, 405, {error:'Use GET.'}), true;
    if(!authed(req)) return json(res, 401, {error:'Bad or missing shield token.'}), true;
    if(p === '/api/shield/dashboard') return json(res, 200, await dashboard(), {'Cache-Control':'no-store'}), true;
    if(p === '/api/shield/img'){
      const it = IMGS.get(q.get('i') || '');
      if(!it) return send(res, 404, 'Not found'), true;
      const r = await fetch(it.url, {headers:it.headers, signal:AbortSignal.timeout(15000)}).catch(() => null);
      if(!r || !r.ok) return send(res, 502, 'Upstream error'), true;
      return send(res, 200, Buffer.from(await r.arrayBuffer()), r.headers.get('content-type') || 'image/jpeg', {'Cache-Control':'private, max-age=3600'}), true;
    }
    return json(res, 404, {error:'Not found'}), true;
  };
};
