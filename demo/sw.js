/*
 * YAMZ live demo — a service worker that stands in for the YAMZ server and for every outside service.
 * It answers sign-in, saves the demo's state in this browser (IndexedDB), and fakes Plex, Radarr,
 * Sonarr, Wikidata, Wikipedia and TVmaze with a made-up library and generated poster art.
 * Nothing leaves your browser.
 */
const VERSION = '1.0.0';
const DEMO_USER = 'demo';
const DEMO_PASS = 'zombies123';
const ARR_KEY = '7f3c9a1e5b2d4f6081a9c3e5d7b9f1a2';
const BASE = new URL('./', self.location).href;          // e.g. https://user.github.io/YAMZ/

self.addEventListener('install', e => { e.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

/* ---------------- tiny IndexedDB key/value store ---------------- */
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('yamz-demo', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function kvGet(k){ const db = await idb(); return new Promise((res, rej) => { const t = db.transaction('kv').objectStore('kv').get(k); t.onsuccess = () => res(t.result); t.onerror = () => rej(t.error); }); }
async function kvSet(k, v){ const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); }); }
async function kvClear(){ const db = await idb(); return new Promise(res => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').clear(); tx.oncomplete = () => res(); }); }

let STATE = null, AUTH = null;
async function loadState(){
  if(STATE) return STATE;
  STATE = await kvGet('state');
  if(!STATE){ STATE = await (await fetch(BASE + 'seed.json', {cache:'no-store'})).json().catch(() => ({})); await kvSet('state', STATE); }
  return STATE;
}
async function loadAuth(){ if(!AUTH) AUTH = (await kvGet('auth')) || {pass:DEMO_PASS, signedIn:false}; return AUTH; }
const saveAuth = () => kvSet('auth', AUTH);
let saveT = null; const saveState = () => { clearTimeout(saveT); saveT = setTimeout(() => kvSet('state', STATE), 300); };

/* ---------------- helpers ---------------- */
const J = (o, status = 200, h = {}) => new Response(JSON.stringify(o), {status, headers:{'Content-Type':'application/json', 'Access-Control-Allow-Origin':'*', ...h}});
const SVG = s => new Response(s, {headers:{'Content-Type':'image/svg+xml', 'Cache-Control':'max-age=86400', 'Access-Control-Allow-Origin':'*'}});
const HTML = s => new Response(s, {headers:{'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store'}});
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hash = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
const safeJson = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/[\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16));
const daysFromNow = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const IMG = 'https://img.demo/';
const P_ = (t, y) => `${IMG}p/${encodeURIComponent(t + '|' + (y || ''))}.svg`;

/* ---------------- generated artwork (title-card posters, not real artwork) ---------------- */
function posterSVG(title, year){
  const h = hash(title) % 360, h2 = (h + 50) % 360, m = hash(title + 'm') % 4;
  const words = title.toUpperCase().split(' '); const lines = []; let cur = '';
  words.forEach(w => { if((cur + ' ' + w).trim().length > 11 && cur){ lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); }); if(cur) lines.push(cur);
  const fs = Math.min(lines.length > 3 ? 34 : 42, Math.floor(272 / (Math.max(...lines.map(l => l.length)) * 0.62)));
  const motif = [
    `<circle cx="150" cy="170" r="92" fill="hsl(${h2} 80% 60% / .55)"/><circle cx="150" cy="170" r="60" fill="hsl(${h} 60% 12% / .7)"/>`,
    `<path d="M0 300 L150 90 L300 300 Z" fill="hsl(${h2} 75% 55% / .5)"/><path d="M60 300 L150 170 L240 300 Z" fill="hsl(${h} 60% 10% / .65)"/>`,
    `<rect x="40" y="70" width="220" height="200" rx="6" fill="none" stroke="hsl(${h2} 85% 65% / .7)" stroke-width="6"/><rect x="80" y="110" width="140" height="120" fill="hsl(${h2} 80% 55% / .35)"/>`,
    `<g stroke="hsl(${h2} 85% 62% / .6)" stroke-width="8">${[0, 1, 2, 3, 4, 5].map(i => `<line x1="${i * 60 - 40}" y1="60" x2="${i * 60 + 80}" y2="290"/>`).join('')}</g>`
  ][m];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><defs><linearGradient id="g" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="hsl(${h} 55% 32%)"/><stop offset="1" stop-color="hsl(${h2} 60% 8%)"/></linearGradient><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></linearGradient></defs><rect width="300" height="450" fill="url(#g)"/>${motif}<rect width="300" height="450" fill="url(#f)"/>${lines.map((l, i) => `<text x="150" y="${330 - (lines.length - 1 - i) * (fs + 2)}" text-anchor="middle" font-family="Impact,'Arial Black','Helvetica Neue',sans-serif" font-weight="900" font-size="${fs}" fill="#fff" letter-spacing="1">${xml(l)}</text>`).join('')}${year ? `<text x="150" y="380" text-anchor="middle" font-family="Arial,sans-serif" font-size="15" fill="hsl(${h2} 80% 75%)" letter-spacing="5">${year}</text>` : ''}<rect x="12" y="12" width="276" height="426" fill="none" stroke="#fff" stroke-opacity=".12"/></svg>`;
}
const backdropSVG = t => { const h = hash(t) % 360; return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="540"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h} 50% 22%)"/><stop offset="1" stop-color="hsl(${(h + 60) % 360} 60% 6%)"/></linearGradient></defs><rect width="1280" height="540" fill="url(#g)"/>${[0, 1, 2, 3, 4, 5, 6].map(i => `<circle cx="${hash(t + i) % 1280}" cy="${hash(t + i + 'y') % 540}" r="${60 + hash(t + i + 'r') % 160}" fill="hsl(${(h + i * 25) % 360} 70% 50% / .12)"/>`).join('')}</svg>`; };
const faceSVG = n => { const h = hash(n) % 360, ini = n.split(' ').map(w => w[0]).slice(0, 2).join(''); return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="hsl(${h} 35% 30%)"/><circle cx="100" cy="82" r="38" fill="hsl(${h} 25% 55%)"/><path d="M30 200c6-48 36-72 70-72s64 24 70 72z" fill="hsl(${h} 25% 55%)"/><text x="100" y="94" text-anchor="middle" font-family="Arial" font-weight="700" font-size="30" fill="hsl(${h} 35% 22%)">${xml(ini)}</text></svg>`; };

/* ---------------- the demo library ---------------- */
const MOV = [
  ['The Thing', 1982, ['Horror', 'Science Fiction'], 98, 8.2], ['Aliens', 1986, ['Science Fiction', 'Action'], 97, 8.4], ['Die Hard', 1988, ['Action', 'Thriller'], 94, 8.2],
  ['Predator', 1987, ['Action', 'Science Fiction'], 80, 7.8], ['The Terminator', 1984, ['Action', 'Science Fiction'], 100, 8.1], ['Terminator 2: Judgment Day', 1991, ['Action', 'Science Fiction'], 91, 8.6],
  ['Evil Dead II', 1987, ['Horror', 'Comedy'], 98, 7.7], ['An American Werewolf in London', 1981, ['Horror', 'Comedy'], 89, 7.5], ['The Fly', 1986, ['Horror', 'Science Fiction'], 93, 7.6],
  ['A Nightmare on Elm Street', 1984, ['Horror'], 95, 7.4], ['Halloween', 1978, ['Horror'], 96, 7.7], ['Hellraiser', 1987, ['Horror'], 71, 7.0],
  ['The Lost Boys', 1987, ['Horror', 'Comedy'], 77, 7.2], ['Gremlins', 1984, ['Comedy', 'Horror'], 86, 7.3], ['Re-Animator', 1985, ['Horror', 'Comedy'], 94, 7.1],
  ['Big Trouble in Little China', 1986, ['Action', 'Comedy', 'Fantasy'], 81, 7.3], ['They Live', 1988, ['Science Fiction', 'Action'], 86, 7.2], ['Hard Boiled', 1992, ['Action', 'Crime'], 94, 7.8],
  ['Mad Max', 1979, ['Action'], 90, 6.8], ['Mad Max Beyond Thunderdome', 1985, ['Action', 'Adventure'], 80, 6.3], ['Mad Max: Fury Road', 2015, ['Action', 'Adventure'], 97, 8.1],
  ['John Wick', 2014, ['Action', 'Thriller'], 86, 7.4], ['John Wick: Chapter 2', 2017, ['Action', 'Thriller'], 89, 7.4], ['The Fast and the Furious', 2001, ['Action', 'Crime'], 54, 6.8],
  ['2 Fast 2 Furious', 2003, ['Action', 'Crime'], 36, 5.9], ['Heat', 1995, ['Crime', 'Thriller'], 83, 8.3], ['Jaws', 1975, ['Thriller', 'Adventure'], 97, 8.1],
  ['Ghostbusters', 1984, ['Comedy', 'Fantasy'], 95, 7.8], ['Back to the Future', 1985, ['Adventure', 'Comedy', 'Science Fiction'], 93, 8.5], ['Raiders of the Lost Ark', 1981, ['Adventure', 'Action'], 93, 8.4],
  ['Tremors', 1990, ['Horror', 'Comedy'], 86, 7.1], ['Night of the Creeps', 1986, ['Horror', 'Comedy'], 69, 6.8], ['Dawn of the Dead', 2004, ['Horror', 'Action'], 76, 7.3],
  ['Night of the Living Dead', 1990, ['Horror'], 68, 6.8]
];
const TVS = [
  ['Breaking Bad', 2008, ['Drama', 'Crime'], [7, 13, 13, 13, 16], [[1, 7], [2, 13], [3, 13], [4, 10]]],
  ['Stranger Things', 2016, ['Science Fiction', 'Horror', 'Drama'], [8, 9, 8, 9], [[1, 8], [2, 9], [3, 8]]],
  ['Ash vs Evil Dead', 2015, ['Horror', 'Comedy'], [10, 10, 10], [[1, 10], [2, 10], [3, 10]]],
  ['The X-Files', 1993, ['Science Fiction', 'Mystery', 'Drama'], [24, 25, 24, 24, 20], [[1, 24], [2, 25], [3, 24], [5, 20]]],
  ['Firefly', 2002, ['Science Fiction', 'Western'], [14], [[1, 14]]],
  ['The Walking Dead', 2010, ['Horror', 'Drama'], [6, 13, 16], [[1, 6], [2, 13]]]
];
const PLEXMOV = MOV.map(([t, y, g, rt, imdb], i) => ({ratingKey:String(1000 + i), title:t, year:y, thumb:`/library/metadata/${1000 + i}/thumb/1`, Genre:g.map(tag => ({tag})), Guid:[{id:`imdb://tt${9000000 + i}`}], rating:rt / 10, ratingImage:'rottentomatoes://image.rating.ripe', audienceRating:imdb, audienceRatingImage:'imdb://image.rating'}));
const PLEXTV = TVS.map(([t, y, g], i) => ({ratingKey:String(2000 + i), title:t, year:y, thumb:`/library/metadata/${2000 + i}/thumb/1`, Genre:g.map(tag => ({tag})), Guid:[{id:`tvdb://${70000 + i}`}]}));
const PLEXEPS = TVS.flatMap(([t, y, g, all, own], i) => own.flatMap(([s, n]) => Array.from({length:n}, (_, k) => ({grandparentRatingKey:String(2000 + i), parentIndex:s, index:k + 1}))));
const TITLE_BY_KEY = Object.fromEntries([...PLEXMOV, ...PLEXTV].map(m => [m.ratingKey, [m.title, m.year]]));
const WL = [['RoboCop', 1987, '5d1'], ['Escape from New York', 1981, '5d2'], ['The Fog', 1980, '5d3'], ['Severance', 2022, '5d4', 'show']];
const GOAT80 = [['The Thing', 1982, 98, 57], ['Evil Dead II', 1987, 98, 72], ['The Fly', 1986, 93, 79], ['Aliens', 1986, 97, 84], ['An American Werewolf in London', 1981, 89, 0], ['A Nightmare on Elm Street', 1984, 95, 78], ['Videodrome', 1983, 80, 0], ['The Fog', 1980, 75, 0], ['Poltergeist', 1982, 85, 79], ['Re-Animator', 1985, 94, 0], ['Near Dark', 1987, 88, 0], ['Fright Night', 1985, 92, 0], ['The Lost Boys', 1987, 77, 63], ['Day of the Dead', 1985, 86, 0], ['Hellraiser', 1987, 71, 0], ['The Return of the Living Dead', 1985, 93, 0], ['Prince of Darkness', 1987, 62, 0], ["Child's Play", 1988, 73, 58], ['Gremlins', 1984, 86, 70], ['Pumpkinhead', 1988, 64, 0], ['From Beyond', 1986, 75, 0], ['The Hitcher', 1986, 70, 0], ['Night of the Creeps', 1986, 69, 0], ['Phantasm II', 1988, 50, 0]];
const GOATALL = [['Alien', 1979, 93, 89], ['The Exorcist', 1973, 78, 82], ['Halloween', 1978, 96, 87], ['The Thing', 1982, 98, 57], ['Psycho', 1960, 97, 97], ['Get Out', 2017, 98, 85], ["Rosemary's Baby", 1968, 96, 96], ['Night of the Living Dead', 1968, 95, 89], ['The Texas Chain Saw Massacre', 1974, 85, 78], ['Jaws', 1975, 97, 87], ['Hereditary', 2018, 90, 87], ['Evil Dead II', 1987, 98, 72], ['The Babadook', 2014, 98, 86], ['Dawn of the Dead', 1978, 93, 71], ['A Nightmare on Elm Street', 1984, 95, 78], ['The Fly', 1986, 93, 79]];
const UPC = [['The Hollow Hour', 37], ['Grave Shift', 58], ['Night Feeders', 107], ['Saltwater Witch', 142], ['The Pale Room', 184], ['Carrion', 247], ['Deadlight Motel', 303], ['Below the Ice', 380]];
const LAST = [['Bone Orchard', -18], ['The Quiet Ones Return', -61], ['Maw', -103], ['House of Hooks', -145], ['Lantern Road', -215], ['Static Choir', -258], ['Rot', -314], ['The Neighbours', -349]];
const DEMOY = {};
[...GOAT80, ...GOATALL].forEach(([t, y]) => DEMOY[t] = y);
[...UPC, ...LAST].forEach(([t, n]) => DEMOY[t] = +daysFromNow(n).slice(0, 4));
WL.forEach(([t, y]) => DEMOY[t] = y);
['Starfall', 'Paper Kingdom', 'Last Light Over Kansas', 'The Long Con', 'Ironclad 3', 'Velvet Hours', 'Neon Saints', 'The Archivist', 'Copper Moon'].forEach(t => DEMOY[t] = new Date().getFullYear());

/* ---------------- fake outside services ---------------- */
let plexPolls = 0;
const ARRADD = {radarr:[], sonarr:[]};
function plexTv(u){
  if(/\/api\/v2\/pins$/.test(u.pathname)) return J({id:1, code:'ZMBY'}, 201);
  if(u.pathname.startsWith('/api/v2/pins/')) return J(++plexPolls > 1 ? {id:1, authToken:'USERTOK'} : {id:1, authToken:null});
  if(u.pathname === '/api/v2/user') return J({username:'zombie_fan', thumb:''});
  if(u.pathname === '/api/v2/resources') return J([{name:'Crypt', provides:'server', clientIdentifier:'mach1', accessToken:'SRVTOK', owned:true, connections:[{uri:'http://192.168.1.20:32400', local:true, relay:false}]}]);
  return J({}, 404);
}
function plexServer(u){
  const P = u.searchParams;
  if(u.pathname === '/identity') return J({MediaContainer:{machineIdentifier:'mach1', friendlyName:'Crypt'}});
  if(u.pathname === '/library/sections') return J({MediaContainer:{Directory:[{key:'1', title:'Movies', type:'movie'}, {key:'2', title:'TV Shows', type:'show'}]}});
  if(u.pathname === '/library/sections/1/all') return J({MediaContainer:{totalSize:PLEXMOV.length, Metadata:PLEXMOV}});
  if(u.pathname === '/library/sections/2/all' && P.get('type') === '4') return J({MediaContainer:{totalSize:PLEXEPS.length, Metadata:PLEXEPS}});
  if(u.pathname === '/library/sections/2/all') return J({MediaContainer:{totalSize:PLEXTV.length, Metadata:PLEXTV}});
  if(u.pathname.startsWith('/photo')){ const k = /metadata\/(\d+)/.exec(P.get('url') || '')?.[1]; const [t, y] = TITLE_BY_KEY[k] || ['?', '']; return SVG(posterSVG(t, y)); }
  return J({}, 404);
}
function plexDiscover(u, req){
  if(u.pathname.includes('/watchlist/')) return J({MediaContainer:{totalSize:WL.length, Metadata:WL.map(([t, y, k, ty]) => ({title:t, year:y, type:ty || 'movie', ratingKey:k, guid:'plex://movie/' + k, thumb:P_(t, y), addedAt:Math.floor(Date.now() / 1000)}))}});
  if(u.pathname === '/library/search'){ const q = u.searchParams.get('query'); return J({MediaContainer:{SearchResults:[{SearchResult:[{Metadata:{title:q, year:DEMOY[q], type:'movie', ratingKey:'7' + hash(q) % 9999, guid:'plex://movie/x'}}]}]}}); }
  if(u.pathname.startsWith('/actions/')) return new Response('', {status:200, headers:{'Access-Control-Allow-Origin':'*'}});
  return J({}, 404);
}
async function arr(svc, u, req){
  const app = svc === 'radarr' ? 'Radarr' : 'Sonarr', P = u.pathname, m = req.method;
  if((req.headers.get('x-api-key') || u.searchParams.get('apikey')) !== ARR_KEY) return J({message:'Unauthorized'}, 401);
  if(P === '/api/v3/system/status') return J({appName:app, version:svc === 'radarr' ? '5.14.0.9383' : '4.0.10.2544'});
  if(P === '/api/v3/qualityprofile') return J([{id:1, name:'HD-1080p'}, {id:4, name:'Ultra-HD'}, {id:6, name:'HD - 720p/1080p'}]);
  if(P === '/api/v3/rootfolder') return J([{id:1, path:svc === 'radarr' ? '/data/media/movies' : '/data/media/tv', freeSpace:6.8e12, accessible:true}]);
  if(P === '/api/v3/tag') return J([{id:2, label:'horror'}, {id:3, label:'4k'}]);
  if(P === '/api/v3/movie' && m === 'GET') return J([...MOV.slice(0, 20).map(([t, y], i) => ({id:i + 1, title:t, year:y, tmdbId:100 + i, titleSlug:slug(t), hasFile:true})), ...ARRADD.radarr]);
  if(P === '/api/v3/series' && m === 'GET') return J(ARRADD.sonarr);
  if(P === '/api/v3/calendar'){
    const D = n => daysFromNow(n) + 'T00:00:00Z', img = (t, y) => [{coverType:'poster', remoteUrl:P_(t, y)}];
    if(svc === 'radarr') return J([['Grave Shift', 4, 40, 75], ['The Hollow Hour', 9, 45, 82], ['Bone Orchard', -18, 3, 16], ['Night Feeders', 17, 58, 96], ['Carrion', -40, -6, 12], ['Starfall', -60, 1, 23], ['Deadlight Motel', 24, 66, 101]]
      .map(([t, c, dg, ph], i) => ({title:t, year:+daysFromNow(c).slice(0, 4), inCinemas:D(c), digitalRelease:D(dg), physicalRelease:D(ph), hasFile:i === 2, tmdbId:4000 + i, images:img(t)})));
    const eps = [];
    [['Severance', 2022, 3, -6, 'Apple TV+'], ['Deadwater County', 2025, 2, 1, 'HBO'], ['The Crypt Keepers', 2026, 1, 9, 'Shudder']].forEach(([t, y, sn, st, net]) => {
      for(let n = 1; n <= 8; n++) eps.push({seasonNumber:sn, episodeNumber:n, title:['Opening Night', 'Below', 'The Ledger', 'Static', 'Cold Storage', 'Lanterns', 'Undertow', 'Daybreak'][n - 1], airDateUtc:D(st + (n - 1) * 7).replace('T00', 'T10'), hasFile:false, finaleType:n === 8 ? 'season' : undefined, series:{title:t, year:y, network:net, images:img(t, y)}});
    });
    return J(eps);
  }
  if(P.endsWith('/lookup')){
    const term = (u.searchParams.get('term') || '').replace(/^(tmdb|tvdb|imdb):/, ''), y = DEMOY[term];
    const o = {title:term, year:y || 1985, overview:'Found by the demo ' + app + ' server.', images:[{coverType:'poster', remoteUrl:P_(term, y)}], titleSlug:slug(term)};
    const have = ARRADD[svc].find(x => x.title === term);
    return J([svc === 'radarr' ? {...o, tmdbId:5000 + hash(term) % 9999, runtime:95, studio:'Demo Pictures', status:'released', ...(have ? {id:have.id} : {})} : {...o, tvdbId:6000 + hash(term) % 9999, network:'Demo TV', seasons:[{seasonNumber:1}, {seasonNumber:2}], ...(have ? {id:have.id} : {})}]);
  }
  if(m === 'POST'){
    const b = await req.json();
    if(ARRADD[svc].some(x => x.title === b.title)) return J([{propertyName:'Title', errorMessage:'This title has already been added', errorCode:svc === 'radarr' ? 'MovieExistsValidator' : 'SeriesExistsValidator'}], 400);
    const added = {...b, id:900 + ARRADD[svc].length}; ARRADD[svc].push(added); return J(added, 201);
  }
  return J({}, 404);
}
const tvIdx = t => TVS.findIndex(x => x[0].toLowerCase() === String(t || '').toLowerCase());
const EPN = ['Pilot', 'The Long Night', 'Cold Open', 'Deadlights', 'The Return', 'Static', 'Under the Floor', 'Blackout', 'Afterglow', 'The Signal', 'Night Shift', 'Hollow', 'Ashes', 'Last Light', 'Out of Time', 'Endgame', 'Dead Air', 'Lockdown', 'Doppelganger', 'Home', 'Rust', 'Wake', 'Fault Lines', 'The Hunt', 'Finale'];
const episodes = i => { const all = TVS[i]?.[3] || [], y = TVS[i]?.[1] || 2000; return all.flatMap((n, s) => Array.from({length:n}, (_, k) => ({id:i * 1000 + s * 100 + k, season:s + 1, number:k + 1, name:EPN[(k + s * 3) % EPN.length], airdate:`${y + s}-0${1 + k % 9}-1${k % 9}`, airstamp:`${y + s}-0${1 + k % 9}-1${k % 9}T02:00:00+00:00`, runtime:48, summary:`<p>Season ${s + 1}, episode ${k + 1}. In YAMZ, episode lists and descriptions come from TVmaze.</p>`, image:null}))); };
const showObj = (i, emb) => { const [t, y, g, all] = TVS[i]; return {id:300 + i, name:t, premiered:`${y}-01-20`, genres:g, rating:{average:8.6}, image:{original:P_(t, y), medium:P_(t, y)}, summary:`<p>${t} (${y}). Show details, cast and seasons come from TVmaze.</p>`, externals:{thetvdb:70000 + i}, network:{name:'Demo TV'}, runtime:50, url:'https://www.tvmaze.com/', _embedded:{cast:['Lead Actor', 'Second Lead', 'Supporting Player', 'Guest Star'].map((n, k) => ({person:{name:`${n} ${k + 1}`, image:{medium:`${IMG}face/${encodeURIComponent(n)}.svg`}}, character:{name:'Character ' + (k + 1)}})), seasons:all.map((n, s) => ({number:s + 1, episodeOrder:n})), ...(emb ? {episodes:episodes(i)} : {})}}; };
function tvmaze(u){
  const P = u.pathname; let m;
  if((m = /\/shows\/(\d+)\/episodes/.exec(P))) return J(episodes(+m[1] - 300));
  if(/\/shows\/(\d+)\/images/.test(P)) return J([]);
  if((m = /\/shows\/(\d+)$/.exec(P))) return TVS[+m[1] - 300] ? J(showObj(+m[1] - 300, u.search.includes('episodes'))) : J({}, 404);
  if(P.startsWith('/lookup/shows')){ const i = +(u.searchParams.get('thetvdb') || 0) - 70000; return TVS[i] ? J(showObj(i)) : J({}, 404); }
  if(P.startsWith('/singlesearch/shows')){ const i = tvIdx(u.searchParams.get('q')); return i >= 0 ? J(showObj(i)) : J({}, 404); }
  if(P.startsWith('/search/shows')){ const i = tvIdx(u.searchParams.get('q')); return J(i >= 0 ? [{score:1, show:showObj(i)}] : []); }
  return J({}, 404);
}
const E = 'http://www.wikidata.org/entity/', WK = 'https://en.wikipedia.org/wiki/';
const B = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, {value:v}]));
async function sparql(req){
  const body = req.method === 'POST' ? await req.text() : new URL(req.url).search;
  const q = decodeURIComponent(body.replace(/^\??query=/, '').replace(/\+/g, ' '));
  if(q.includes('p:P444')){
    const dec = /"(\d{4})-01-01T00:00:00Z"\^\^xsd:dateTime && \?d </.exec(q)?.[1], seen = new Set();
    const L = dec ? [...GOAT80, ...GOATALL].filter(([t, y]) => y >= +dec && y < +dec + 10 && !seen.has(t) && seen.add(t)) : GOATALL;
    return J({results:{bindings:L.map(([t, y, rt, mc], i) => B({f:E + 'Q' + (8000 + hash(t) % 9999), date:`${y}-06-01T00:00:00Z`, art:WK + t.replace(/ /g, '_'), sl:String(120 - i * 3), rts:rt + '%', mcs:mc ? mc + '/100' : ''}))}});
  }
  if(q.includes('ORDER BY DESC(?sl)')){ const L = q.includes('?d >') ? UPC : LAST; return J({results:{bindings:L.map(([t, n], i) => B({f:E + 'Q' + (7000 + hash(t) % 9999), date:daysFromNow(n) + 'T00:00:00Z', art:WK + t.replace(/ /g, '_'), sl:String(40 - i)}))}}); }
  if(q.includes('SELECT DISTINCT ?f')){ const ids = [...q.matchAll(/wd:(Q\d+)/g)].map(m => m[1]); return J({results:{bindings:ids.filter((_, i) => i % 3 === 1).map(id => B({f:E + id}))}}); }
  return J({results:{bindings:[]}});
}
function wikipedia(u){
  const titles = (u.searchParams.get('titles') || '').split('|').filter(Boolean);
  return J({batchcomplete:true, query:{pages:titles.map((t, i) => { const c = t.replace(/ \(.*\)$/, ''); return {pageid:i + 1, title:t, extract:`${c} is one of the titles in the YAMZ live demo. In the real app, the description, cast and photos come from Wikipedia and Wikidata.`, thumbnail:{source:P_(c, DEMOY[c] || ''), width:300, height:450}, pageprops:{wikibase_item:'Q' + (7000 + hash(c) % 9999)}}; })}});
}
function images(u){
  const [, kind, raw] = u.pathname.split('/'), name = decodeURIComponent(raw || '').replace(/\.svg$/, '');
  return SVG(kind === 'bd' ? backdropSVG(name) : kind === 'face' ? faceSVG(name) : posterSVG(name.split('|')[0], name.split('|')[1]));
}
async function outside(url, req){
  const u = new URL(url), h = u.hostname;
  if(h === 'img.demo') return images(u);
  if(h === 'plex.tv') return plexTv(u);
  if(h === 'discover.provider.plex.tv' || h === 'metadata.provider.plex.tv') return plexDiscover(u, req);
  if(u.host === '192.168.1.20:32400') return plexServer(u);
  if(u.host === '192.168.1.20:7878') return arr('radarr', u, req);
  if(u.host === '192.168.1.20:8989') return arr('sonarr', u, req);
  if(h === 'api.tvmaze.com') return tvmaze(u);
  if(h === 'query.wikidata.org') return sparql(req);
  if(h === 'www.wikidata.org') return J({entities:{}});
  if(/wikipedia\.org$/.test(h)) return wikipedia(u);
  if(/wikimedia\.org$/.test(h)) return J({items:[{articles:[]}]});
  return null;   // not part of the demo — let it through (fonts, YouTube links, …)
}

/* ---------------- the YAMZ server, emulated ---------------- */
async function appPage(){
  await loadState();
  const now = Date.now();
  for(const v of Object.values(STATE)) if(v && typeof v === 'object' && !Array.isArray(v) && typeof v.at === 'number') v.at = now;   // keep demo caches fresh
  const html = await (await fetch(BASE + 'yamz.html', {cache:'no-cache'})).text();
  const boot = `<script>window.__YAMZ_SERVER__=${safeJson({version:VERSION, user:DEMO_USER, auth:'on', demo:true})};window.__YAMZ_STATE__=${safeJson(STATE)};</script>` +
    `<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#0c0d10">`;
  const badge = `<style>#demoBadge{position:fixed;left:14px;bottom:14px;z-index:45;display:flex;gap:10px;align-items:center;background:rgba(12,13,16,.86);border:1px solid rgba(232,176,75,.45);color:#ecebe6;font:600 12px Inter,system-ui,sans-serif;padding:7px 12px;border-radius:99px;backdrop-filter:blur(6px)}#demoBadge b{color:#e8b04b;letter-spacing:.12em;text-transform:uppercase;font-size:10.5px}#demoBadge a{color:#94c35c;text-decoration:none}#demoBadge a:hover{text-decoration:underline}@media(max-width:600px){#demoBadge{left:8px;bottom:8px;font-size:11px}}</style>
    <div id="demoBadge"><b>Live demo</b><span>sample data</span><a href="#" id="demoReset">Reset</a><a href="https://github.com/zombifiedturkey/YAMZ" target="_blank" rel="noopener">GitHub ↗</a></div>
    <script>document.getElementById('demoReset').onclick=e=>{e.preventDefault();if(confirm('Reset the demo to its starting state?'))fetch('api/demo/reset',{method:'POST',headers:{'X-YAMZ':'1'}}).then(()=>{try{localStorage.clear()}catch{}location.reload()})};</script>`;
  return HTML(html.replace(/<head>/i, m => m + boot).replace(/<\/body>/i, badge + '</body>'));
}
async function loginPage(){
  const [tpl, icon] = await Promise.all([fetch(BASE + 'login.html').then(r => r.text()), fetch(BASE + 'icon.svg').then(r => r.text())]);
  const hint = `<p class="lead" style="margin-top:-8px;color:#e8b04b">Live demo — sign in with <b>demo</b> / <b>${DEMO_PASS}</b></p>`;
  return HTML(tpl.replace(/\{\{MODE\}\}/g, 'login').replace(/\{\{VERSION\}\}/g, VERSION + ' · live demo').replace('{{ICON}}', icon)
    .replace('<p class="lead" id="lead"></p>', '<p class="lead" id="lead"></p>' + hint)
    .replace("$('u').focus();", (AUTH.pass === DEMO_PASS ? "$('u').value='demo';$('p').value='" + DEMO_PASS + "';" : "$('u').value='demo';") + "$('go').focus();"));
}
async function api(path, req){
  await loadAuth();
  const body = req.method === 'GET' ? null : await req.json().catch(() => ({}));
  if(path === 'api/auth/login'){
    if(String(body.username).toLowerCase() !== DEMO_USER || body.password !== AUTH.pass) return J({error:'That username or password isn’t right. (Demo: demo / ' + (AUTH.pass === DEMO_PASS ? DEMO_PASS : 'the password you set') + ')'}, 401);
    AUTH.signedIn = true; await saveAuth(); return J({ok:true});
  }
  if(path === 'api/demo/reset'){ STATE = null; AUTH = null; ARRADD.radarr = []; ARRADD.sonarr = []; await kvClear(); return J({ok:true}); }
  if(!AUTH.signedIn) return J({error:'Please sign in to YAMZ.', message:'Please sign in to YAMZ.'}, 401, {'X-YAMZ-Auth':'required'});
  if(path === 'api/auth/logout'){ AUTH.signedIn = false; await saveAuth(); return J({ok:true}); }
  if(path === 'api/auth/password'){
    if(body.current !== AUTH.pass) return J({error:'Your current password isn’t right.'}, 401);
    if(String(body.password || '').length < 8) return J({error:'Use a password of at least 8 characters.'}, 400);
    AUTH.pass = body.password; await saveAuth(); return J({ok:true});
  }
  if(path === 'api/me') return J({user:DEMO_USER, auth:'on', version:VERSION, demo:true});
  if(path === 'api/state'){
    await loadState();
    if(req.method === 'GET') return J(STATE);
    let n = 0;
    for(const [k, v] of Object.entries(body.set || {})) if(/^(zn|vault):/.test(k)){ STATE[k] = v; n++; }
    for(const k of body.del || []) if(k in STATE){ delete STATE[k]; n++; }
    if(n) saveState();
    return J({ok:true, changed:n});
  }
  return J({error:'Not found'}, 404);
}

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if(url.origin === self.location.origin && url.href.startsWith(BASE)){
    const path = url.href.slice(BASE.length).split(/[?#]/)[0];
    if(path === 'app.html' || path === 'app') return e.respondWith((async () => { await loadAuth(); return AUTH.signedIn ? appPage() : loginPage(); })());
    if(path === 'api/proxy') return e.respondWith((async () => (await outside(url.searchParams.get('u'), req)) || J({error:'YAMZ couldn’t reach that address (demo).', message:'This address isn’t part of the demo.'}, 502))());
    if(path.startsWith('api/')) return e.respondWith(api(path, req));
    if(path === 'manifest.webmanifest') return e.respondWith(J({name:'YAMZ demo', short_name:'YAMZ', start_url:'app.html', scope:'./', display:'standalone', background_color:'#0c0d10', theme_color:'#0c0d10', icons:[{src:'icon-192.png', sizes:'192x192', type:'image/png'}, {src:'icon-512.png', sizes:'512x512', type:'image/png'}]}));
    return;   // real files (index.html, yamz.html, icons…)
  }
  e.respondWith((async () => (await outside(req.url, req)) || fetch(req))());
});
