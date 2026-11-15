// vercel.json routes and public/sitemap.xml (handover 14/11/2026, task F).
//
// Vercel used to send every address to index.html, so a page that does
// not exist answered HTTP 200. vercel.json now lists the app's routes;
// anything else gets Vercel's 404 with public/404.html (noindex). The
// cost of a list is forgetting a route, so this test reads every
// <Route path> in src/App.jsx and fails if one is missing.
// The sitemap must hold only public pages: no login-only page and no
// /auth/* path (robots.txt blocks /auth/).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const app = read('src/App.jsx');
const vercel = JSON.parse(read('vercel.json'));

// Every <Route path="…"> and whether its element is a <ProtectedRoute>.
const routes = [...app.matchAll(/<Route path="([^"]+)" element=\{\s*(<ProtectedRoute)?/g)].map((m) => ({
  path: m[1],
  protected: Boolean(m[2]),
}));
const appPaths = routes.map((r) => r.path).filter((p) => p !== '*');

// Enough of Vercel's path matching for these sources: literal segments and
// ":param" for one segment.
const sourceMatches = (source, path) => {
  const re = new RegExp(`^${source.replace(/:[A-Za-z]+/g, '[^/]+').replace(/\//g, '\\/')}$`);
  return re.test(path);
};
const rewritten = (path) => vercel.rewrites.some((r) => r.destination === '/index.html' && sourceMatches(r.source, path));

test('no catch-all rewrite: unknown addresses reach the 404 page', () => {
  for (const r of vercel.rewrites) {
    assert.ok(!/\(\.\*\)|:\w+\*|\*$/.test(r.source), `catch-all rewrite: ${r.source}`);
  }
  for (const p of ['/nope', '/compare/extra', '/store/x/y', '/wp-login.php']) {
    assert.equal(rewritten(p), false, p);
  }
  assert.equal(vercel.trailingSlash, false);
});

test('every route in App.jsx is served by the app', () => {
  assert.ok(appPaths.length >= 40, `only ${appPaths.length} routes read from App.jsx`);
  for (const path of appPaths) {
    const sample = path.replace(/:[A-Za-z]+/g, 'sample');
    assert.ok(rewritten(sample), `vercel.json has no rewrite for ${path}`);
  }
});

test('the 404 page is plain HTML with noindex', () => {
  const page = read('public/404.html');
  assert.match(page, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(page, /<script/i);
});

test('the sitemap lists only public pages the app has', () => {
  const locs = [...read('public/sitemap.xml').matchAll(/<loc>https:\/\/snapgain\.uk([^<]*)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length >= 5);
  const byPath = new Map(routes.map((r) => [r.path, r]));
  for (const loc of locs) {
    assert.ok(!loc.startsWith('/auth/'), `${loc} is under /auth/, which robots.txt blocks`);
    const route = byPath.get(loc);
    assert.ok(route, `${loc} is not a route in App.jsx`);
    assert.equal(route.protected, false, `${loc} needs a login`);
  }
});
