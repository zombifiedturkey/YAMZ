#!/usr/bin/env node
/*
 * YAMZ server — serves the YAMZ web app, keeps its data in /config, signs people in,
 * and relays requests to the media servers on your network (Plex, Jellyfin, Radarr, Sonarr…).
 * No dependencies: Node 20+ only.
 */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');

const VERSION = require('../package.json').version;
const env = (k, d) => (process.env[k] ?? '').trim() || d;
const bool = (k, d) => /^(1|true|yes|on)$/i.test(env(k, d ? 'true' : 'false'));
const PORT = +env('PORT', '7979');
const HOST = env('HOST', '0.0.0.0');
const CONFIG = path.resolve(env('YAMZ_CONFIG', '/config'));
const PUBLIC = path.resolve(__dirname, '..', 'public');
const AUTH = env('YAMZ_AUTH', 'on').toLowerCase() === 'none' ? 'none' : 'on';
const TRUST_PROXY = bool('YAMZ_TRUST_PROXY', false);
const SESSION_DAYS = Math.max(1, +env('YAMZ_SESSION_DAYS', '30'));
const BASE = ('/' + env('YAMZ_BASE_PATH', '').replace(/^\/+|\/+$/g, '')).replace(/^\/$/, '');
if(bool('YAMZ_ALLOW_SELF_SIGNED', false)) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const log = (...a) => console.log(new Date().toISOString(), ...a);
fs.mkdirSync(CONFIG, {recursive:true});

/* ---------------- small JSON file store ---------------- */
function jsonFile(name, fallback){
  const file = path.join(CONFIG, name);
  let data = fallback, timer = null;
  try{ data = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch(e){ if(e.code !== 'ENOENT') log(`Couldn't read ${name} (${e.message}); starting fresh. The old file was kept as ${name}.broken`), fs.renameSync(file, file + '.broken'); }
  const writeNow = () => {
    clearTimeout(timer); timer = null;
    const tmp = file + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data), {mode:0o600});
    fs.renameSync(tmp, file);
  };
  return {
    get data(){ return data; }, set data(v){ data = v; },
    save(ms = 800){ if(!timer) timer = setTimeout(() => { try{ writeNow(); }catch(e){ log(`Saving ${name} failed:`, e.message); } }, ms); },
    flush(){ if(timer) writeNow(); }
  };
}
const STATE = jsonFile('state.json', {});
const USERS = jsonFile('auth.json', {users:[]});
const SESS = jsonFile('sessions.json', {});

/* ---------------- passwords & sessions ---------------- */
const scrypt = (pw, salt) => new Promise((res, rej) => crypto.scrypt(pw, salt, 64, {N:16384, r:8, p:1}, (e, k) => e ? rej(e) : res(k)));
async function hashPw(pw){ const salt = crypto.randomBytes(16).toString('hex'); return {salt, hash:(await scrypt(pw, salt)).toString('hex')}; }
async function checkPw(user, pw){
  const salt = user?.salt || 'x'.repeat(32), want = Buffer.from(user?.hash || '0'.repeat(128), 'hex');
  const got = await scrypt(String(pw), salt);
  return !!user && got.length === want.length && crypto.timingSafeEqual(got, want);
}
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
const findUser = name => USERS.data.users.find(u => u.name.toLowerCase() === String(name || '').toLowerCase());
function newSession(res, req, user){
  const token = crypto.randomBytes(32).toString('base64url');
  SESS.data[sha(token)] = {user:user.name, created:Date.now(), seen:Date.now(), exp:Date.now() + SESSION_DAYS * 864e5, ua:String(req.headers['user-agent'] || '').slice(0, 120)};
  SESS.save(); setCookie(res, req, token, SESSION_DAYS * 86400);
}
function setCookie(res, req, value, maxAge){
  const secure = req.socket.encrypted || (TRUST_PROXY && /https/i.test(String(req.headers['x-forwarded-proto'] || '')));
  res.setHeader('Set-Cookie', `yamz_sid=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`);
}
function sessionOf(req){
  if(AUTH === 'none') return {user:'', key:null};
  const m = /(?:^|;\s*)yamz_sid=([A-Za-z0-9_-]+)/.exec(req.headers.cookie || '');
  if(!m) return null;
  const key = sha(m[1]), s = SESS.data[key];
  if(!s || s.exp < Date.now() || !findUser(s.user)){ if(s){ delete SESS.data[key]; SESS.save(); } return null; }
  if(Date.now() - s.seen > 36e5){ s.seen = Date.now(); s.exp = Date.now() + SESSION_DAYS * 864e5; SESS.save(); }
  return {user:s.user, key};
}
setInterval(() => { let n = 0; for(const [k, s] of Object.entries(SESS.data)) if(s.exp < Date.now()){ delete SESS.data[k]; n++; } if(n) SESS.save(); }, 36e5).unref();

/* sign-in rate limiting: 10 failures per 15 minutes per address */
const FAILS = new Map();
const clientIp = req => (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
const limited = ip => { const f = FAILS.get(ip); return f && f.n >= 10 && Date.now() - f.t < 15 * 60e3; };
const fail = ip => { const f = FAILS.get(ip); if(!f || Date.now() - f.t > 15 * 60e3) FAILS.set(ip, {n:1, t:Date.now()}); else f.n++; };

/* seed the first account from the environment (handy for unattended installs) */
const seeded = (async () => {
  if(AUTH === 'on' && !USERS.data.users.length && env('YAMZ_USER') && env('YAMZ_PASSWORD')){
    USERS.data.users.push({name:env('YAMZ_USER'), ...(await hashPw(env('YAMZ_PASSWORD'))), created:Date.now()}); USERS.save(0);
    log(`Created the account "${env('YAMZ_USER')}" from YAMZ_USER / YAMZ_PASSWORD.`);
  }
})();

/* ---------------- helpers ---------------- */
function send(res, status, body, type = 'text/plain; charset=utf-8', extra = {}){
  res.writeHead(status, {'Content-Type':type, 'X-Content-Type-Options':'nosniff', ...extra}); res.end(body);
}
const json = (res, status, obj, extra) => send(res, status, JSON.stringify(obj), 'application/json; charset=utf-8', extra);
const needAuth = res => json(res, 401, {error:'Please sign in to YAMZ.', message:'Please sign in to YAMZ.'}, {'X-YAMZ-Auth':'required'});
function readBody(req, limit){
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if(n > limit){ reject(Object.assign(new Error('Request too large'), {status:413})); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
async function readJson(req, limit = 64 * 1024){
  const b = await readBody(req, limit);
  try{ return JSON.parse(b.toString('utf8') || '{}'); }catch{ throw Object.assign(new Error('Invalid JSON'), {status:400}); }
}
/* Requests that change things must come from the YAMZ page itself (blocks cross-site form posts). */
function sameOrigin(req){
  if(req.headers['x-yamz'] === '1') return true;
  const o = req.headers.origin; if(!o) return false;
  try{ const host = (TRUST_PROXY && req.headers['x-forwarded-host']) || req.headers.host; return new URL(o).host === String(host).split(',')[0].trim(); }catch{ return false; }
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const safeJson = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16));

/* ---------------- the app page ---------------- */
const INDEX_FILE = [path.join(PUBLIC, 'index.html'), path.resolve(__dirname, '..', 'YAMZ.html')].find(f => fs.existsSync(f));
const INDEX = fs.readFileSync(INDEX_FILE, 'utf8');
const LOGIN = fs.readFileSync(path.join(__dirname, 'login.html'), 'utf8');
const ICON_SVG = fs.readFileSync(path.join(PUBLIC, 'icon.svg'), 'utf8');
function appPage(sess){
  const boot = `<script>window.__YAMZ_SERVER__=${safeJson({version:VERSION, user:sess.user, auth:AUTH})};window.__YAMZ_STATE__=${safeJson(STATE.data)};</script>` +
    `<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icon-192.png"><meta name="theme-color" content="#0c0d10">`;
  return INDEX.replace(/<head>/i, m => m + boot);
}
function loginPage(mode){
  return LOGIN.replace(/\{\{MODE\}\}/g, mode).replace(/\{\{VERSION\}\}/g, esc(VERSION)).replace('{{ICON}}', ICON_SVG);
}

/* ---------------- relay to servers on your network ---------------- */
const BLOCKED = new Set(['169.254.169.254', 'metadata.google.internal', '[fd00:ec2::254]', '100.100.100.200']);
const DROP = new Set(['host', 'connection', 'keep-alive', 'proxy-connection', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade',
  'cookie', 'origin', 'referer', 'x-yamz', 'content-length', 'accept-encoding', 'x-real-ip', 'forwarded']);
const PASS_BACK = ['content-type', 'cache-control', 'etag', 'last-modified', 'retry-after', 'content-disposition', 'x-plex-protocol'];
async function relay(req, res, url){
  let target;
  try{ target = new URL(url); }catch{ return json(res, 400, {error:'Bad address', message:'Bad address'}); }
  if(!/^https?:$/.test(target.protocol) || BLOCKED.has(target.hostname)) return json(res, 403, {error:'That address isn’t allowed.', message:'That address isn’t allowed.'});
  const headers = {};
  for(const [k, v] of Object.entries(req.headers)) if(!DROP.has(k) && !k.startsWith('sec-') && !k.startsWith('x-forwarded')) headers[k] = v;
  const method = req.method.toUpperCase();
  let body;
  if(!['GET', 'HEAD'].includes(method)) body = await readBody(req, 20 * 1024 * 1024);
  let r;
  try{ r = await fetch(target, {method, headers, body, redirect:'follow', signal:AbortSignal.timeout(60000)}); }
  catch(e){
    const code = e.cause?.code || e.cause?.errors?.[0]?.code;
    const why = e.name === 'TimeoutError' ? 'timed out' : ({ECONNREFUSED:'connection refused', ENOTFOUND:'address not found', EHOSTUNREACH:'host unreachable', ETIMEDOUT:'timed out', ECONNRESET:'connection reset', DEPTH_ZERO_SELF_SIGNED_CERT:'self-signed certificate — set YAMZ_ALLOW_SELF_SIGNED=true', SELF_SIGNED_CERT_IN_CHAIN:'self-signed certificate — set YAMZ_ALLOW_SELF_SIGNED=true'}[code] || code || e.message);
    return json(res, 502, {error:`YAMZ couldn't reach ${target.host} (${why}).`, message:`YAMZ couldn't reach ${target.host} (${why}). Check the address, and that the YAMZ container can reach it on your network.`});
  }
  const out = {'X-Content-Type-Options':'nosniff'};
  for(const k of PASS_BACK){ const v = r.headers.get(k); if(v) out[k] = v; }
  if(/^image\//.test(out['content-type'] || '') && r.ok) out['cache-control'] = 'private, max-age=86400';
  res.writeHead(r.status, out);
  if(!r.body || method === 'HEAD') return res.end();
  Readable.fromWeb(r.body).on('error', () => res.destroy()).pipe(res);
}

/* ---------------- routes ---------------- */
async function handle(req, res){
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if(BASE && (p === BASE || p.startsWith(BASE + '/'))) p = p.slice(BASE.length) || '/';
  const q = new URL(req.url, 'http://x').searchParams;
  const method = req.method.toUpperCase();
  const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  if(p === '/healthz') return json(res, 200, {ok:true, version:VERSION});
  if(p === '/icon.svg') return send(res, 200, ICON_SVG, 'image/svg+xml', {'Cache-Control':'public, max-age=86400'});
  if(/^\/icon-(192|512)\.png$/.test(p) || p === '/favicon.ico'){
    const f = path.join(PUBLIC, p === '/favicon.ico' ? 'icon-192.png' : p.slice(1));
    return fs.readFile(f, (e, b) => e ? send(res, 404, 'Not found') : send(res, 200, b, 'image/png', {'Cache-Control':'public, max-age=86400'}));
  }
  if(p === '/manifest.webmanifest') return json(res, 200, {name:'YAMZ', short_name:'YAMZ', description:'Yet Another Media Zombie', start_url:'.', scope:'.', display:'standalone',
    background_color:'#0c0d10', theme_color:'#0c0d10', icons:[{src:'icon-192.png', sizes:'192x192', type:'image/png'}, {src:'icon-512.png', sizes:'512x512', type:'image/png'}, {src:'icon.svg', sizes:'any', type:'image/svg+xml'}]});

  if(mutating && !sameOrigin(req)) return json(res, 403, {error:'Blocked: that request didn’t come from YAMZ.'});

  /* --- sign-in --- */
  if(p.startsWith('/api/auth/')){
    if(AUTH === 'none') return json(res, 400, {error:'Sign-in is turned off on this server.'});
    if(method !== 'POST') return json(res, 405, {error:'Use POST.'});
    const ip = clientIp(req);
    if(p === '/api/auth/setup'){
      if(USERS.data.users.length) return json(res, 409, {error:'This YAMZ server is already set up. Sign in instead.'});
      const {username, password} = await readJson(req);
      const name = String(username || '').trim();
      if(!/^[A-Za-z0-9_.@-]{1,32}$/.test(name)) return json(res, 400, {error:'Usernames can use letters, numbers and . _ - @ (up to 32).'});
      if(String(password || '').length < 8) return json(res, 400, {error:'Use a password of at least 8 characters.'});
      const u = {name, ...(await hashPw(String(password))), created:Date.now()};
      USERS.data.users.push(u); USERS.save(0); log(`Account "${name}" created.`);
      newSession(res, req, u); return json(res, 200, {ok:true});
    }
    if(p === '/api/auth/login'){
      if(limited(ip)) return json(res, 429, {error:'Too many attempts. Wait 15 minutes and try again.'});
      const {username, password} = await readJson(req);
      const u = findUser(username);
      if(!(await checkPw(u, password || ''))){ fail(ip); log(`Failed sign-in for "${String(username).slice(0, 40)}" from ${ip}`); return json(res, 401, {error:'That username or password isn’t right.'}); }
      FAILS.delete(ip); newSession(res, req, u); return json(res, 200, {ok:true});
    }
    const s = sessionOf(req); if(!s) return needAuth(res);
    if(p === '/api/auth/logout'){ if(s.key){ delete SESS.data[s.key]; SESS.save(); } setCookie(res, req, '', 0); return json(res, 200, {ok:true}); }
    if(p === '/api/auth/password'){
      const {current, password} = await readJson(req);
      const u = findUser(s.user);
      if(limited(ip)) return json(res, 429, {error:'Too many attempts. Wait 15 minutes and try again.'});
      if(!(await checkPw(u, current || ''))){ fail(ip); return json(res, 401, {error:'Your current password isn’t right.'}); }
      if(String(password || '').length < 8) return json(res, 400, {error:'Use a password of at least 8 characters.'});
      Object.assign(u, await hashPw(String(password))); USERS.save(0);
      for(const [k, v] of Object.entries(SESS.data)) if(v.user === u.name && k !== s.key) delete SESS.data[k];
      SESS.save(); log(`Password changed for "${u.name}".`);
      return json(res, 200, {ok:true});
    }
    return json(res, 404, {error:'Not found'});
  }

  const sess = sessionOf(req);

  /* --- the page --- */
  if(p === '/' || p === '/index.html'){
    if(method !== 'GET' && method !== 'HEAD') return json(res, 405, {error:'Use GET.'});
    const head = {'Cache-Control':'no-store', 'Referrer-Policy':'same-origin', 'X-Frame-Options':'SAMEORIGIN'};
    if(!sess) return send(res, 200, loginPage(USERS.data.users.length ? 'login' : 'setup'), 'text/html; charset=utf-8', head);
    return send(res, 200, appPage(sess), 'text/html; charset=utf-8', head);
  }

  if(!p.startsWith('/api/')) return send(res, 404, 'Not found');
  if(!sess) return needAuth(res);

  if(p === '/api/me') return json(res, 200, {user:sess.user, auth:AUTH, version:VERSION});
  if(p === '/api/state'){
    if(method === 'GET') return json(res, 200, STATE.data, {'Cache-Control':'no-store'});
    if(method === 'PATCH' || method === 'POST'){
      const {set, del} = await readJson(req, 64 * 1024 * 1024);
      let n = 0;
      if(set && typeof set === 'object') for(const [k, v] of Object.entries(set)) if(/^(zn|vault):/.test(k)){ STATE.data[k] = v; n++; }
      if(Array.isArray(del)) for(const k of del) if(typeof k === 'string' && k in STATE.data){ delete STATE.data[k]; n++; }
      if(n) STATE.save();
      return json(res, 200, {ok:true, changed:n});
    }
    return json(res, 405, {error:'Method not allowed'});
  }
  if(p === '/api/proxy') return relay(req, res, q.get('u') || '');
  return json(res, 404, {error:'Not found'});
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(e => {
    if(!e.status) log('Error:', req.method, req.url.split('?')[0], e.stack || e.message);
    if(!res.headersSent) json(res, e.status || 500, {error:e.status ? e.message : 'Something went wrong on the YAMZ server.'}); else res.destroy();
  });
});
server.requestTimeout = 120000;
seeded.then(() => server.listen(PORT, HOST, () => {
  log(`YAMZ ${VERSION} listening on http://${HOST}:${PORT}${BASE || ''}/  (data in ${CONFIG})`);
  if(AUTH === 'none') log('WARNING: sign-in is turned off (YAMZ_AUTH=none). Only do this behind a reverse proxy that handles sign-in.');
  else if(!USERS.data.users.length) log('No account yet — open YAMZ in your browser to create one.');
}));
const bye = sig => { log(`${sig} received — saving and shutting down.`); try{ STATE.flush(); USERS.flush(); SESS.flush(); }catch(e){ log('Final save failed:', e.message); } server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
process.on('SIGTERM', () => bye('SIGTERM')); process.on('SIGINT', () => bye('SIGINT'));
module.exports = {server};
