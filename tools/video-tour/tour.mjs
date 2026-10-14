/*
  YAMZ video tour — drives your own YAMZ server and films it at 1920×1080 (16:9).

    node tour.mjs                      records to ./output/yamz-tour.webm (headless, any monitor)
    node tour.mjs --obs                opens a 1920×1080 window for you to capture with OBS
    node tour.mjs --watch              like the default, but shows the browser while it records

  It asks for your YAMZ address, username and password (or reads YAMZ_URL / YAMZ_USER / YAMZ_PASSWORD).
  Sign-in happens before filming starts. Your connections, API keys, server addresses and Plex username
  are hidden or blanked on screen. It doesn't add, remove or send anything: the Radarr dialog is only
  opened and closed, and any Discover / Gaps preferences it touches are put back when it finishes.
*/
import { chromium } from 'playwright';
import readline from 'node:readline';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const args = new Set(process.argv.slice(2));
const OBS = args.has('--obs'), WATCH = args.has('--watch');
const W = 1920, H = 1080;
const OUT = path.resolve('output');
const SEARCH_TERM = process.env.YAMZ_SEARCH || 'Alien';     // typed into Gaps → Search & add
const GENRE = process.env.YAMZ_GENRE || 'Horror';           // used for Discover
const DECADE = process.env.YAMZ_DECADE || '1980s';

/* ---------- ask for the address and sign-in ---------- */
const rl = readline.createInterface({input:process.stdin, output:process.stdout});
const ask = (q, hidden) => new Promise(res => {
  if(!hidden) return rl.question(q, a => res(a.trim()));
  const w = rl._writeToOutput; rl._writeToOutput = s => { if(s.includes(q)) w.call(rl, s); else w.call(rl, '*'); };
  rl.question(q, a => { rl._writeToOutput = w; process.stdout.write('\n'); res(a); });
});
let URL_ = process.env.YAMZ_URL || await ask('YAMZ address (e.g. http://192.168.1.10:7979): ');
if(!/^https?:\/\//.test(URL_)) URL_ = 'http://' + URL_;
URL_ = URL_.replace(/\/+$/, '') + '/';
const USER = process.env.YAMZ_USER ?? await ask('Username (leave blank if sign-in is off): ');
const PASS = USER ? (process.env.YAMZ_PASSWORD ?? await ask('Password: ', true)) : '';

fs.mkdirSync(OUT, {recursive:true});
const log = (...a) => console.log('·', ...a);

/* ---------- presentation layer: fake cursor, click ripple, captions, title cards, privacy ---------- */
const overlay = scrub => {
  const css = `#fakecur{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none}
    #fakecur svg{filter:drop-shadow(0 2px 3px rgba(0,0,0,.6))}
    .clk{position:fixed;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;border:3px solid rgba(255,214,90,.95);z-index:2147483646;pointer-events:none;animation:clk .5s ease-out forwards}
    @keyframes clk{from{transform:scale(.3);opacity:1}to{transform:scale(1.4);opacity:0}}
    #democap{position:fixed;right:30px;bottom:30px;pointer-events:none;z-index:2147483640;max-width:520px;background:rgba(10,11,14,.9);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:18px 22px;color:#f3f1ea;font:17px/1.5 Inter,system-ui,sans-serif;box-shadow:0 16px 50px rgba(0,0,0,.55);transition:opacity .35s,transform .35s}
    #democap.hide{opacity:0;transform:translateY(14px)}
    #democap b{display:block;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#e8b04b;margin-bottom:6px}
    #democard{position:fixed;inset:0;z-index:2147483645;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at center,#1b1d23 0%,#07080a 75%);color:#f3f1ea;text-align:center;transition:opacity .5s}
    #democard.hide{opacity:0;pointer-events:none}
    #democard h1{font:400 120px/1 "Bebas Neue",Impact,sans-serif;letter-spacing:.04em;margin:0;color:#e8b04b}
    #democard h1 span{color:#94c35c}
    #democard p{font:500 26px Inter,system-ui,sans-serif;color:#b9b6ad;margin:18px 0 0}
    #democard small{font:600 14px Inter,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#6d6a63;margin-top:30px}
    #democard.herocard{background:linear-gradient(#07040f 0%,#160a2b 30%,#3b1048 58%,#0a0612 58.2%,#05040a 100%);overflow:hidden}
    #democard.herocard > :not(.scene){position:relative;z-index:2}
    .scene{position:absolute;inset:0;z-index:0;pointer-events:none}
    .stars{position:absolute;inset:0 0 42% 0;background-image:radial-gradient(1.5px 1.5px at 12% 18%,#fff8 50%,transparent 51%),radial-gradient(1px 1px at 28% 8%,#fff9 50%,transparent 51%),radial-gradient(1.5px 1.5px at 44% 26%,#fff6 50%,transparent 51%),radial-gradient(1px 1px at 63% 12%,#fffa 50%,transparent 51%),radial-gradient(2px 2px at 78% 22%,#fff7 50%,transparent 51%),radial-gradient(1px 1px at 90% 6%,#fff9 50%,transparent 51%),radial-gradient(1.5px 1.5px at 6% 40%,#fff6 50%,transparent 51%),radial-gradient(1px 1px at 86% 44%,#fff8 50%,transparent 51%);animation:tw 2.4s ease-in-out infinite alternate}
    @keyframes tw{from{opacity:.55}to{opacity:1}}
    .sky{position:absolute;left:0;right:0;top:0;height:58%;overflow:hidden}
    .sun{position:absolute;left:50%;bottom:-200px;width:760px;height:760px;margin-left:-380px;border-radius:50%;background:linear-gradient(#ffe36e 8%,#ff9a3c 42%,#ff3d7f 72%,#b4248f 100%);box-shadow:0 0 160px 40px rgba(255,80,140,.35);
      -webkit-mask-image:linear-gradient(#000 48%,transparent 48%),repeating-linear-gradient(#000 0 17px,transparent 17px 28px);mask-image:linear-gradient(#000 48%,transparent 48%),repeating-linear-gradient(#000 0 17px,transparent 17px 28px);animation:sunrise 1.6s cubic-bezier(.2,.8,.2,1) both}
    @keyframes sunrise{from{transform:translateY(200px);opacity:0}to{transform:none;opacity:1}}
    .floor{position:absolute;left:-50%;right:-50%;top:58%;background-color:#0a0612;bottom:-10%;transform:perspective(420px) rotateX(62deg);transform-origin:50% 0;
      background-image:repeating-linear-gradient(90deg,rgba(255,64,200,.75) 0 2px,transparent 2px 90px),repeating-linear-gradient(0deg,rgba(255,64,200,.75) 0 2px,transparent 2px 60px);animation:roll .9s linear infinite;box-shadow:inset 0 80px 100px -20px #0a0612}
    @keyframes roll{to{background-position:0 60px}}
    .horizon{position:absolute;left:0;right:0;top:58%;height:3px;margin-top:-1px;background:linear-gradient(90deg,transparent,#ff4fd8,#ffd25a,#ff4fd8,transparent);box-shadow:0 0 22px 5px rgba(255,79,216,.7)}
    .zbig{width:320px;height:320px;margin-top:-90px;filter:drop-shadow(0 0 30px rgba(148,195,92,.75)) drop-shadow(0 22px 36px rgba(0,0,0,.7));animation:zpop 1.1s cubic-bezier(.2,1.6,.4,1) .35s both, zfloat 3s ease-in-out 1.5s infinite alternate}
    .zbig svg{width:100%;height:100%;display:block}
    @keyframes zpop{0%{transform:scale(0) rotate(-200deg);opacity:0}70%{opacity:1}100%{transform:scale(1) rotate(0)}}
    @keyframes zfloat{from{transform:translateY(0) rotate(-2deg)}to{transform:translateY(-12px) rotate(2deg)}}
    #democard.herocard h1{font-size:170px;font-weight:900;font-style:italic;letter-spacing:.01em;margin-top:26px;color:#ffd25a;text-shadow:0 0 10px rgba(255,210,90,.6),0 0 36px rgba(255,61,127,.6),5px 5px 0 #b4248f;animation:tin .8s ease-out .9s both}
    #democard.herocard h1 span{color:#9df06a;text-shadow:0 0 10px rgba(157,240,106,.7),0 0 36px rgba(157,240,106,.5),5px 5px 0 #1e6b3a}
    #democard.herocard p{color:#ffd9f4;font-size:30px;letter-spacing:.06em;text-shadow:0 0 14px rgba(255,79,216,.8);animation:tin .8s ease-out 1.2s both}
    #democard.herocard small{color:#ff9ad9;animation:tin .8s ease-out 1.5s both}
    @keyframes tin{from{opacity:0;translate:0 16px}to{opacity:1;translate:0 0}}
    /* privacy: never film connections, keys, backup or account details */
    #connBox,#acctBox,#backupBox,.prov,#key,#omdb,#pinField,[for=key],[for=omdb],.side-foot .muted-host{display:none!important}
    #sov .tourhide{display:none!important}`;
  addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    // black cover over sign-in and set-up, lifted when the tour starts
    if(sessionStorage.getItem('tourlive') !== '1'){ const cv = document.createElement('div'); cv.id = 'tourcover'; cv.style.cssText = 'position:fixed;inset:0;background:#000;z-index:2147483647;pointer-events:none'; document.body.appendChild(cv); }
    const c = document.createElement('div'); c.id = 'fakecur';
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l15 9.5-6.6 1.3L16 20l-3 1.4-3.6-7.3L4 19z" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    document.body.appendChild(c);
    addEventListener('mousemove', e => { c.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)`; }, true);
    addEventListener('mousedown', e => { const k = document.createElement('div'); k.className = 'clk'; k.style.left = e.clientX + 'px'; k.style.top = e.clientY + 'px'; document.body.appendChild(k); setTimeout(() => k.remove(), 600); }, true);
    // blank out names and addresses wherever they appear
    const words = (scrub || []).filter(w => w && w.length > 2).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const rx = new RegExp([...words, '\\b\\d{1,3}(?:\\.\\d{1,3}){3}(?::\\d+)?\\b', location.host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')].join('|'), 'gi');
    const clean = root => { const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while((n = tw.nextNode())){ if(n.parentElement?.closest('#democap,#democard,script,style')) continue; rx.lastIndex = 0; if(rx.test(n.nodeValue)){ rx.lastIndex = 0; n.nodeValue = n.nodeValue.replace(rx, '•••'); } } };
    clean(document.body);
    new MutationObserver(ms => ms.forEach(m => { m.addedNodes.forEach(x => x.nodeType === 1 ? clean(x) : x.nodeType === 3 && clean(x.parentNode || document.body)); if(m.type === 'characterData') clean(m.target.parentNode || document.body); }))
      .observe(document.body, {childList:true, subtree:true, characterData:true});
  });
};

/* ---------- browser ---------- */
const browser = OBS ? null : await chromium.launch({headless:!WATCH});
let ctx, page;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'yamz-tour-'));
async function open(record){
  if(OBS){
    ctx = await chromium.launchPersistentContext(profile, {headless:false, viewport:{width:W, height:H}, args:[`--window-size=${W},${H + 40}`, '--app=about:blank', '--hide-scrollbars']});
    page = ctx.pages()[0] || await ctx.newPage();
  } else {
    ctx = await browser.newContext({viewport:{width:W, height:H}, ...(record ? {recordVideo:{dir:OUT, size:{width:W, height:H}}} : {}), storageState:fs.existsSync(path.join(OUT, '.state.json')) ? path.join(OUT, '.state.json') : undefined});
    page = await ctx.newPage();
  }
  ctx.on('page', pg => { if(pg !== page) setTimeout(() => pg.close().catch(() => {}), 2000); });
}

/* ---------- 1. sign in and look around (not filmed) ---------- */
async function signIn(){
  await page.goto(URL_, {waitUntil:'domcontentloaded'});
  await page.waitForSelector('#u, #tabs', {timeout:30000}).catch(() => {});
  if(await page.locator('#u').isVisible().catch(() => false)){
    if(!USER){ console.error('This YAMZ asks for a sign-in. Run again and enter your username and password.'); process.exit(1); }
    await page.fill('#u', USER); await page.fill('#p', PASS); await page.click('#go');
  }
  await page.waitForSelector('#tabs', {timeout:30000}).catch(() => { console.error('Could not sign in or load YAMZ. Check the address, username and password.'); process.exit(1); });
  await page.waitForLoadState('load').catch(() => {});
  await page.waitForFunction(() => { try{ return typeof applyLook === 'function' && typeof LOOK === 'object' && Array.isArray(DATA); }catch{ return false; } }, null, {timeout:30000});
}
await open(false);
log('Opening', URL_);
await signIn();
await page.waitForTimeout(3000);
log('Signed in. Looking through your library for good examples…');

const info = await page.evaluate(() => ({
  names:[typeof PW !== 'undefined' ? PW.name : '', window.__YAMZ_SERVER__?.user || ''].filter(Boolean),
  movies:DATA.filter(d => d.s === 'movie').length, shows:DATA.filter(d => d.s === 'tv').length,
  radarr:typeof arrOn === 'function' && arrOn('radarr'), sonarr:typeof arrOn === 'function' && arrOn('sonarr'),
  watchlist:typeof PW !== 'undefined' && !!PW.token, lists:typeof LISTS !== 'undefined' ? LISTS.length : 0,
  tvChecked:typeof TV !== 'undefined' && !!TV.res, tmdb:typeof tmdbOn === 'function' && tmdbOn(), analysed:typeof MISS !== 'undefined' && !!MISS.data,
  // remember preferences we might change, so they can be put back afterwards
  prefs:Object.fromEntries(store.keys().filter(k => k !== 'zn:look' && !/^zn:(disc:|pp$|qid$|miss$|tvr$|arrlib|lib$)/.test(k)).map(k => [k, JSON.stringify(store.get(k))]).filter(([, v]) => (v || '').length < 4000))
}));
if(USER) info.names.push(USER);
log(`${info.movies} movies, ${info.shows} shows · Radarr ${info.radarr ? 'on' : 'off'} · Sonarr ${info.sonarr ? 'on' : 'off'} · Watchlist ${info.watchlist ? 'on' : 'off'}`);

// a movie that's part of a series (for the series row in the pop-up)
const franchiseHint = /\b(2|3|4|5|II|III|IV|Part|Chapter|Returns|Rises|Reloaded|Revenge|Strikes|Resurrection|Begins|Origins)\b|:/i;
const pickSeries = await page.evaluate(async hint => {
  const cand = [...DATA.filter(d => d.s === 'movie' && new RegExp(hint, 'i').test(d.t)), ...DATA.filter(d => d.s === 'movie')].filter((d, i, a) => a.indexOf(d) === i).slice(0, 30);
  for(const d of cand){
    openDetail(d);
    for(let t = 0; t < 40; t++){ await new Promise(r => setTimeout(r, 200)); const s = document.querySelector('#seriesSec'); if(s && !s.hidden && s.querySelectorAll('.mini').length >= 3){ closeOv('ov'); return d.t; } if(document.querySelector('#modal .mbody') && t > 25) break; }
    closeOv('ov');
  }
  return null;
}, franchiseHint.source);
log(pickSeries ? `Series example: ${pickSeries}` : 'No movie with a series row found — skipping that bit.');
const pickShow = await page.evaluate(() => {
  try{ if(TV.res){ const r = tvList().filter(r => r.missEp > 0 && r.seasons?.length >= 3).sort((a, b) => b.seasons.length - a.seasons.length)[0]; if(r) return r.t || r.name; } }catch{}
  return DATA.find(d => d.s === 'tv')?.t || null;
});
log(pickShow ? `TV example: ${pickShow}` : 'No TV shows found — skipping TV.');

if(!OBS){ await ctx.storageState({path:path.join(OUT, '.state.json')}); await ctx.close(); await open(true); }
await ctx.addInitScript(overlay, info.names);

/* ---------- filming helpers ---------- */
const p = () => page;
const wait = ms => page.waitForTimeout(ms);
let mx = W / 2, my = H / 2;
async function moveTo(x, y, steps = 22){ await page.mouse.move(x, y, {steps}); mx = x; my = y; }
async function to(sel, opt = {}){
  const el = typeof sel === 'string' ? page.locator(sel).first() : sel;
  await el.scrollIntoViewIfNeeded({timeout:4000}).catch(() => {});
  const bx = await el.boundingBox(); if(!bx) throw new Error('not on screen: ' + sel);
  const x = bx.x + bx.width * (opt.fx ?? .5), y = bx.y + bx.height * (opt.fy ?? .5);
  await moveTo(x, y, Math.max(14, Math.min(44, Math.round(Math.hypot(x - mx, y - my) / 20))));
  return el;
}
async function click(sel, opt = {}){ await to(sel, opt); await wait(opt.pre ?? 260); await page.mouse.down(); await wait(70); await page.mouse.up(); await wait(opt.post ?? 800); }
async function tryClick(sel, opt){ try{ await click(sel, opt); return true; }catch{ return false; } }
async function type(sel, text, delay = 70){ await click(sel, {post:200}); await page.keyboard.type(text, {delay}); await wait(400); }
async function cap(title, text, hold = 0){ await page.evaluate(([t, x]) => { let c = document.getElementById('democap'); if(!c){ c = document.createElement('div'); c.id = 'democap'; document.body.appendChild(c); }
  if(!t){ c.classList.add('hide'); return; } c.classList.add('hide'); setTimeout(() => { c.innerHTML = `<b>${t}</b>${x}`; c.classList.remove('hide'); }, 200); }, [title, text]); await wait(hold || 400); }
async function card(h, sub, ms = 2400, small = '', hero = false){ await page.evaluate(([h, s, sm, hero]) => { let c = document.getElementById('democard'); if(!c){ c = document.createElement('div'); c.id = 'democard'; document.body.appendChild(c); }
  const icon = hero ? (document.querySelector('.zicon')?.outerHTML || '').replace(/id="([^"]+)"/g, 'id="$1b"').replace(/url\(#([^)]+)\)/g, 'url(#$1b)') : '';
  c.className = hero ? 'herocard' : ''; c.classList.remove('hide');
  c.innerHTML = (hero ? `<div class="scene"><div class="stars"></div><div class="sky"><div class="sun"></div></div><div class="floor"></div><div class="horizon"></div></div><div class="zbig">${icon}</div>` : '') + `<h1>${h}</h1>${s ? `<p>${s}</p>` : ''}${sm ? `<small>${sm}</small>` : ''}`; }, [h, sub, small, hero]); await wait(ms);
  await page.evaluate(() => document.getElementById('democard').classList.add('hide')); await wait(600); }
const wheel = async (dy, steps = 10) => { for(let i = 0; i < steps; i++){ await page.mouse.wheel(0, dy / steps); await wait(40); } await wait(500); };
async function pick(selectSel, label){   // YAMZ's own dropdown list
  await click(selectSel, {post:500});
  const opt = page.locator('.selpop.open button').filter({hasText:new RegExp('^\\s*' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$')}).first();
  if(!(await opt.count())){ await page.keyboard.press('Escape'); return false; }
  await opt.evaluate(el => el.scrollIntoView({block:'center'})); await wait(350);
  await click(opt, {post:1200});
  return true;
}
async function openTitle(title){
  await page.fill('#q', ''); await type('#q', title, 60); await wait(900);
  const c = page.locator('#grid .card', {hasText:title}).first();
  if(!(await c.count())) return false;
  await click(c, {post:2400}); return true;
}
const closeModal = () => tryClick('[data-close="ov"]', {post:700});

/* ---------- 2. the tour (filmed) ---------- */
await signIn();
// film in the Glass theme with the default amber accent (only this browser's appearance — your devices are untouched)
await page.evaluate(() => { LOOK = Object.assign(LOOK, {theme:'glass', accent:'#e8b04b', psize:2, corner:'round', frost:2, amb:true, side:'show'}); store.set('zn:look', LOOK); applyLook(); renderLook?.(); });
await page.addStyleTag({content:'#progress{visibility:hidden}'}).catch(() => {});
await wait(2500);
if(OBS){ console.log('\n>>> Start your OBS recording now (Window Capture on the YAMZ window), then press Enter here.'); await ask(''); }
await page.evaluate(() => { sessionStorage.setItem('tourlive', '1'); document.getElementById('tourcover')?.remove(); });
const t0 = Date.now();

await card('YAM<span>Z</span>', 'Yet Another Media Zombie', 5600, 'The future of media management', true);

// Library + Glass
await card('Your library', 'In liquid glass', 1900);
await cap('Liquid Glass', 'A new theme: frosted panels, with your posters glowing through.', 400);
const cards = page.locator('#grid .card');
for(const i of [0, 3, 6, 9]){ if(await cards.nth(i).count()){ await to(cards.nth(i).locator('.poster')); await wait(1300); } }
await cap('Ambient colour', 'The background picks up the colours of whatever poster you’re on.', 1400);
await wheel(500); await to(cards.nth(14).locator('.poster')).catch(() => {}); await wait(1400); await wheel(-500);

// Series row in the pop-up
if(pickSeries && await openTitle(pickSeries)){
  await cap('Details', 'Ratings, cast and photos for every title, with Play in Plex one click away.', 1800);
  await page.locator('#modal').hover();
  const sec = page.locator('#seriesSec'); await sec.scrollIntoViewIfNeeded().catch(() => {}); await wait(900);
  await cap('The whole series', 'Every film in the franchise, in order: see where this one sits and which you own, are missing, or are still to come.', 2600);
  const minis = sec.locator('.mini:not(.cur)'); const n = Math.min(await minis.count(), 4);
  for(let i = 0; i < n; i++){ await to(minis.nth(i).locator('.poster')); await wait(700); }
  await closeModal();
  await page.fill('#q', ''); await page.dispatchEvent('#q', 'input'); await wait(700);
}

// Side menu auto-hide
await cap('Make room', 'Tuck the side menu away, and bring it back from the menu button whenever you need it.', 600);
if(await tryClick('#side .sidepin', {post:1400})){
  await tryClick('#menuBtn', {post:1500});
  await tryClick('#side .sidepin', {post:1200});
}

// TV
if(pickShow){
  await card('TV', 'Every season, every episode', 1700);
  await click('#tabs button[data-s="tv"]', {post:1300});
  if(await openTitle(pickShow)){
    await page.locator('#modal').hover(); await page.locator('#seasonSec').scrollIntoViewIfNeeded().catch(() => {}); await wait(1500);
    await cap('Seasons', 'Green is complete, amber is partly there, red is missing. Click a season for every episode.', 2400);
    if(await tryClick('#seasonSec button.sc >> nth=1', {post:1800})) await tryClick('[data-close="eov"]', {post:600});
    await closeModal();
    await page.fill('#q', ''); await page.dispatchEvent('#q', 'input'); await wait(500);
  }
}

// Gaps
await card('Gaps', 'Find what’s missing, then fill it', 1900);
await click('#tabs button[data-s="missing"]', {post:1300});
await tryClick('#side [data-misskind="movie"]', {post:600});
await click('#side .mansrch', {post:900});
await cap('Search & add', 'Look up any movie or show and send it to a list, your Plex Watchlist, Radarr or Sonarr.', 600);
await type('#manQ', SEARCH_TERM, 90); await page.keyboard.press('Enter'); await wait(2600);
const res = page.locator('#manRes .dcard');
for(const i of [0, 1, 2]){ if(await res.nth(i).count()){ await to(res.nth(i).locator('.poster')); await wait(800); } }
if(info.analysed){
  await click('#side .cat[data-c="Collections"]', {post:1500});
  await cap('Collections', 'Franchises you own part of, with the films you’re missing up front.', 1800);
  await wheel(450); await wait(800);
  await click('#side .cat[data-c="Actors"]', {post:1400});
  await cap('Actors', 'The people who turn up most in your movies, and what else they’ve made.', 1900);
}
if(info.radarr){
  await click('#side .cat[data-c="Waiting in Radarr"]', {post:2600});
  await cap('Waiting in Radarr', 'Everything Radarr is still waiting on: out now but not in your library, and not released yet.', 2600);
  await wheel(400);
}
await click('#side [data-misskind="tv"]', {post:1600});
if(info.tvChecked){
  await cap('TV gaps', 'Incomplete shows, whole missing seasons, and the shows you’ve got every episode of.', 2000);
  await tryClick('#side .cat[data-c="Missing seasons"]', {post:1500});
}
if(info.sonarr){
  await tryClick('#side .cat[data-c="Waiting in Sonarr"]', {post:2400});
  await cap('Waiting in Sonarr', 'Series with aired episodes still to come in, and how far along each one is.', 2200);
}

// Discover
await card('Discover', 'Popular, upcoming, recent, essential', 1900);
await click('#tabs button[data-s="discover"]', {post:1500});
await tryClick('#side [data-dkind="movie"]', {post:800});
await tryClick('#side .cat[data-c="Popular"]', {post:2200});
await cap('Discover', info.tmdb ? 'What’s trending this week, straight from TMDB. Anything you already own is marked.' : 'What’s trending right now. Anything you already own is marked.', 1800);
for(const i of [0, 2, 4]){ const d = page.locator('.dcard').nth(i); if(await d.count()){ await to(d.locator('.poster')); await wait(700); } }
await cap('Genres', 'Pick a genre and every list follows it. Every dropdown now matches your theme.', 400);
await pick('#dGenre', GENRE); await wait(1600);
await click('#side .cat[data-c="Recent"]', {post:2000});
await cap('Recent', 'How far back? Slide from the last month to the last year.', 600);
try{
  const s = await to('#dMonths'); const bx = await s.boundingBox();
  const at = i => bx.x + 8 + (bx.width - 16) * i / 4, y = bx.y + bx.height / 2;
  await moveTo(at(4), y); await page.mouse.down(); for(const i of [3, 2, 1]){ await moveTo(at(i), y, 12); await wait(900); } await page.mouse.up(); await wait(900);
  await page.mouse.down(); await moveTo(at(3), y, 14); await page.mouse.up(); await wait(1200);
}catch{}
await click('#side .cat[data-c="Essentials"]', {post:2600});
await cap('Essentials', `The must-see ${GENRE.toLowerCase()} titles of all time, or pick a decade.`, 900);
await pick('#dDec', DECADE); await wait(2400);
await cap('No subtitles tonight?', 'Hide foreign-language titles with one tick. Lists still fill to 100.', 600);
await tryClick('#dforeign', {post:1800});
const ess = page.locator('.dcard:not(:has(.badge.have))').first();
if(await ess.count()){
  await to(ess.locator('.poster')); await wait(700);
  if(info.radarr && await ess.locator('.arrbtn').count()){
    await cap('Add to Radarr', 'One click sends a title to Radarr with your root folder, quality profile and tags.', 400);
    await click(ess.locator('.arrbtn'), {post:2400});
    await page.keyboard.press('Escape'); await wait(800);      // just a look — nothing is added
  }
}
await tryClick('#dforeign', {post:600});

// Lists
await card('Lists', 'Your lists and Plex Watchlist', 1700);
await click('#tabs button[data-s="lists"]', {post:1600});
await cap('Lists', 'Marathons, shopping lists, films to lend a mate, with your Plex Watchlist right alongside.', 2200);
if(info.watchlist) await tryClick('[data-open-list="plexwl"]', {post:1800});
if(info.lists) await tryClick(page.locator('#side .cat').nth(info.watchlist ? 2 : 1), {post:1800});

// Calendar
await card('Calendar', 'Never miss a release', 1700);
await click('#tabs button[data-s="calendar"]', {post:2600});
await cap('Release calendar', 'Everything in Radarr, Sonarr, your lists and Watchlist, labelled Theatres, Streaming or Physical media.', 2400);
for(const c of (await page.locator('.ccell:not(.out) .cev').all()).slice(0, 3)){ await to(c); await wait(600); }
await tryClick('[data-cmon="1"]', {post:1300}); await tryClick('[data-cmon="0"]', {post:900});
if(await tryClick('[data-cview="agenda"]', {post:1400})){ await cap('Agenda', 'The upcoming list, day by day.', 1200); await wheel(400); await tryClick('[data-cview="month"]', {post:600}); }

// Make it yours
await card('Make it yours', 'Themes, colours and posters', 1700);
await click('#settingsBtn', {post:900});
await cap('Appearance', 'Dark, Light, Auto or Glass, three glass strengths, nine accent colours and five poster sizes.', 800);
for(const f of ['1', '3', '2']) await tryClick(`#frostSeg [data-frost="${f}"]`, {post:1100});
await tryClick('#swatches .sw:nth-child(4)', {post:900}); await tryClick('#swatches .sw:nth-child(2)', {post:900});
await tryClick('#themeSeg [data-theme="dark"]', {post:1200}); await tryClick('#themeSeg [data-theme="light"]', {post:1300});
await tryClick('#themeSeg [data-theme="glass"]', {post:1000}); await tryClick('#swatches .sw:nth-child(1)', {post:900});
await tryClick('[data-close="sov"]', {post:1200});

// Outro
await cap('', '');
await card('Docker · Unraid', 'ghcr.io/zombifiedturkey/yamz', 3600, 'Unraid template included · amd64 + arm64');
await card('Try it now', 'zombifiedturkey.github.io/YAMZ', 3200, 'Live demo · github.com/zombifiedturkey/YAMZ');
await card('YAM<span>Z</span>', 'Your whole collection. Beautifully.', 5200, 'Yet Another Media Zombie', true);
log(`Tour finished in ${Math.round((Date.now() - t0) / 1000)} s.`);
if(OBS) console.log('>>> Stop your OBS recording now.');

/* ---------- 3. put any changed preferences back ---------- */
await page.evaluate(prefs => {
  for(const [k, v] of Object.entries(prefs)){ if(JSON.stringify(store.get(k)) !== v) store.set(k, JSON.parse(v)); }
}, info.prefs).catch(() => {});
await wait(2500);

const video = page.video?.();
await page.close().catch(() => {});
await ctx.close();
await browser?.close();
fs.rmSync(path.join(OUT, '.state.json'), {force:true});
if(video){
  const src = await video.path(), dest = path.join(OUT, 'yamz-tour.webm');
  fs.renameSync(src, dest);
  console.log(`\nDone! Your video is ${dest}\nSend that file back to Claude to add the music, titles and final polish.`);
}
rl.close();
