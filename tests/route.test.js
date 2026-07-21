// Unit tests for the pure hash-route parser/builder (js/route.js) — the SPA-shell routing seam.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCREENS, parseRoute, routeToHash } from '../js/route.js';

const empty = { track: null, mode: null, dir: null, car: null, dpr: null, surface: null };

test('parseRoute: empty / root / unknown → the menu screen with no params', () => {
  assert.deepEqual(parseRoute(''),        { screen: 'menu', ...empty });
  assert.deepEqual(parseRoute('#'),       { screen: 'menu', ...empty });
  assert.deepEqual(parseRoute('#/'),      { screen: 'menu', ...empty });
  assert.deepEqual(parseRoute('#/nope'),  { screen: 'menu', ...empty });   // unknown screen falls back
});

test('parseRoute: every known screen name resolves', () => {
  for (const s of SCREENS) assert.equal(parseRoute('#/' + s).screen, s);
});

test('parseRoute: accepts a full URL, a bare hash, or a plain path', () => {
  assert.equal(parseRoute('https://letulip.github.io/DesktopDrift/index.html#/tracks').screen, 'tracks');
  assert.equal(parseRoute('#/tracks').screen, 'tracks');
  assert.equal(parseRoute('/tracks').screen,  'tracks');
  assert.equal(parseRoute('tracks').screen,   'tracks');
});

test('parseRoute: select params (track / mode / dir)', () => {
  assert.deepEqual(parseRoute('#/select?track=green-study'),
    { screen: 'select', ...empty, track: 'green-study' });
  assert.equal(parseRoute('#/select?track=x&mode=zen').mode, 'zen');
  assert.equal(parseRoute('#/select?track=x&mode=sandbox').mode, 'sandbox');
  assert.equal(parseRoute('#/select?track=x&dir=rev').dir, 'rev');
  assert.equal(parseRoute('#/select?track=x&dir=normal').dir, null);   // only 'rev' is meaningful
});

test('parseRoute: modify car index — present clamps to ≥0, absent is null', () => {
  assert.equal(parseRoute('#/modify?car=3&track=x').car, 3);
  assert.equal(parseRoute('#/modify?car=0').car, 0);
  assert.equal(parseRoute('#/modify?car=-2').car, 0);      // negative clamps to 0
  assert.equal(parseRoute('#/modify?car=abc').car, 0);     // non-numeric → 0 (matches the old modify.html)
  assert.equal(parseRoute('#/modify?track=x').car, null);  // absent → null (screen defaults it)
});

test('parseRoute: dpr / surface debug params pass through verbatim', () => {
  const r = parseRoute('#/select?track=x&dpr=1.5&surface=bake');
  assert.equal(r.dpr, '1.5');
  assert.equal(r.surface, 'bake');
});

test('routeToHash: inverse of parseRoute; emits only known non-empty params in a stable order', () => {
  assert.equal(routeToHash('tracks'), '#/tracks');
  assert.equal(routeToHash('menu'), '#/menu');
  assert.equal(routeToHash('select', { track: 'green-study', dir: 'rev' }), '#/select?track=green-study&dir=rev');
  assert.equal(routeToHash('modify', { car: 2, track: 'x' }), '#/modify?track=x&car=2');   // stable order: track before car
  assert.equal(routeToHash('bogus', {}), '#/menu');                                        // unknown screen → menu
  assert.equal(routeToHash('select', { track: 'x', mode: null, dir: '' }), '#/select?track=x');   // null/'' dropped
});

test('routeToHash → parseRoute round-trips the params', () => {
  const params = { track: 'steel-kitchen', mode: 'zen', dir: 'rev', car: 4, dpr: '1', surface: 'bake' };
  const back = parseRoute(routeToHash('modify', params));
  assert.equal(back.screen, 'modify');
  assert.equal(back.track, 'steel-kitchen');
  assert.equal(back.mode, 'zen');
  assert.equal(back.dir, 'rev');
  assert.equal(back.car, 4);
  assert.equal(back.dpr, '1');
  assert.equal(back.surface, 'bake');
});
