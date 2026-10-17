// Regression tests for Jellyfin sign-in (issue #1). Contributed by @RoWe90.
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Test the real Jellyfin adapter embedded in the single-file browser app.
const html = fs.readFileSync(path.join(__dirname, '..', 'YAMZ.html'), 'utf8');
const start = html.indexOf('const JF = {');
const end = html.indexOf('\nconst SRV =', start);
assert.ok(start !== -1 && end > start, 'Jellyfin adapter must be present');

function adapter(respond) {
  const requests = [];
  const jget = async (url, options = {}, timeout) => {
    requests.push({url, options, timeout});
    return respond(url, options);
  };
  const qs = params => new URLSearchParams(
    Object.entries(params).filter(([, value]) => value != null && value !== '')
  ).toString();
  const JF = vm.runInNewContext(
    `${html.slice(start, end)}\nJF`,
    {CID:'yamz-auth-test', jget, qs, px:url => url}
  );
  return {JF, requests};
}

test('authenticated API requests use the modern MediaBrowser header, not a key in the URL', async () => {
  const {JF, requests} = adapter(async () => ({Items:[]}));
  await JF.get(
    {url:'http://jellyfin:8096', token:'test-api-key'},
    '/Items',
    {Recursive:true, Limit:1}
  );
  const {url, options} = requests[0];
  const parsed = new URL(url);
  assert.equal(parsed.pathname, '/Items');
  assert.equal(parsed.searchParams.get('Recursive'), 'true');
  assert.equal(parsed.searchParams.get('Limit'), '1');
  assert.equal(parsed.searchParams.has('api_key'), false);
  assert.equal(parsed.searchParams.has('ApiKey'), false);
  assert.match(options.headers.Authorization, /^MediaBrowser /);
  assert.match(options.headers.Authorization, /Token="test-api-key"/);
  assert.equal(options.headers.Accept, 'application/json');
});

test('API-key connection selects a user and sends the key only in the Authorization header', async () => {
  const {JF, requests} = adapter(async url => {
    if(url.endsWith('/System/Info/Public')) return {ServerName:'Test Jellyfin', Id:'server-id'};
    if(url.endsWith('/Users')) return [
      {Id:'viewer', Policy:{IsAdministrator:false}},
      {Id:'admin', Policy:{IsAdministrator:true}}
    ];
    throw new Error('unexpected URL: ' + url);
  });
  const result = await JF.connect('http://jellyfin:8096', '', '', 'test-api-key');
  assert.equal(result.user, 'admin');
  assert.equal(result.sid, 'server-id');
  assert.equal(result.token, 'test-api-key');
  assert.equal(requests.length, 2);
  assert.equal(requests[1].url, 'http://jellyfin:8096/Users');
  assert.match(requests[1].options.headers.Authorization, /Token="test-api-key"/);
  assert.equal(requests[0].options.headers.Authorization, undefined);
});

test('rejected API keys raise their original 401 instead of silently falling back', async () => {
  const {JF} = adapter(async url => {
    if(url.endsWith('/System/Info/Public')) return {ServerName:'Test Jellyfin'};
    const error = new Error('HTTP 401');
    error.status = 401;
    throw error;
  });
  await assert.rejects(
    JF.connect('http://jellyfin:8096', '', '', 'wrong-key'),
    error => error.status === 401
  );
});

test('username/password login also uses the modern Authorization header', async () => {
  const {JF, requests} = adapter(async url => {
    if(url.endsWith('/System/Info/Public')) return {ServerName:'Test Jellyfin'};
    if(url.endsWith('/Users/AuthenticateByName')) {
      return {AccessToken:'user-token', User:{Id:'viewer'}};
    }
    throw new Error('unexpected URL');
  });
  const result = await JF.connect('http://jellyfin:8096', 'viewer', 'password', '');
  assert.equal(result.token, 'user-token');
  assert.equal(result.user, 'viewer');
  assert.equal(requests[1].options.method, 'POST');
  assert.match(requests[1].options.headers.Authorization, /^MediaBrowser /);
  assert.equal(requests[1].options.headers['X-Emby-Authorization'], undefined);
});

test('library discovery uses the authenticated request helper', async () => {
  const {JF, requests} = adapter(async () => ({
    Items:[{Id:'movies', Name:'Movies', CollectionType:'movies'}]
  }));
  const libs = await JF.libs({url:'http://jellyfin:8096', token:'test-api-key', user:'admin'});
  assert.equal(libs.length, 1);
  assert.equal(libs[0].name, 'Movies');
  assert.equal(requests[0].url, 'http://jellyfin:8096/Users/admin/Views');
  assert.match(requests[0].options.headers.Authorization, /Token="test-api-key"/);
});
