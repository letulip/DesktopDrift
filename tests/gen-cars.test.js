// scripts/gen-cars.js — the pure SVG→car parse + build. Importing the module must NOT
// regenerate the file (guarded by the direct-run check); we only exercise the pure helpers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseCarSvg, buildCarData } from '../scripts/gen-cars.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const plumSvg = readFileSync(join(ROOT, 'cars', 'plum.svg'), 'utf8');

test('parseCarSvg pulls viewBox, one body path, and the filled details', () => {
  const g = parseCarSvg(plumSvg);
  assert.equal(g.vw, 417);
  assert.equal(g.vh, 156);
  assert.ok(g.path.startsWith('M') && g.path.length > 200, 'body is the long stroke path');
  assert.equal(g.lines.length, 0, 'plum has no separate panel-line paths');
  assert.equal(g.details.length, 11);                       // 2 cream + 2 red + 7 dark
  assert.ok(g.details.every(d => d.c && d.d), 'each detail has a colour + path');
  assert.ok(g.details.some(d => d.c === '#FFFBCF'), 'keeps the headlight tint');
});

test('bare black stroke normalises to the house #222222', () => {
  const g = parseCarSvg('<svg viewBox="0 0 10 20"><path d="M0 0L1 1Z" stroke="black"/></svg>');
  assert.equal(g.stroke, '#222222');
});

test('longest stroke path wins as the body; shorter ones become lines', () => {
  const svg = '<svg viewBox="0 0 10 10">' +
    '<path d="M0 0L9 0L9 9L0 9Z extra long body path here" stroke="black"/>' +
    '<path d="M1 1L2 2" stroke="black"/>' +
    '</svg>';
  const g = parseCarSvg(svg);
  assert.ok(g.path.includes('body'), 'body = the longer d');
  assert.deepEqual(g.lines, ['M1 1L2 2']);
});

test('buildCarData derives 7/7/7 drive + carries registry identity/feel', () => {
  const car = buildCarData(
    { id: 'plum', name: 'Plum', body: '#8e4585', stroke: '#222222', flip: true, len: 78,
      ratings: { handling: 7, accel: 7, speed: 7 }, feel: { grip: 0.98 } },
    plumSvg,
  );
  assert.equal(car.id, 'plum');
  assert.equal(car.vw, 417);
  assert.equal(car.flip, true);
  assert.equal(car.drive.maxSpeed, 457);
  assert.equal(car.drive.thrust, 630);
  assert.equal(car.drive.grip, 0.98);        // feel override survives
  assert.equal(car.lines, undefined);        // no panel lines → field omitted
});

test('rect / circle / ellipse fills become details (Figma exports lights as these)', () => {
  const svg = '<svg viewBox="0 0 100 50">' +
    '<path d="M0 0L99 0L99 49L0 49Z long body path" stroke="black"/>' +
    '<rect x="5" y="6" width="4" height="3" fill="#DD0000"/>' +
    '<circle cx="20" cy="10" r="3" fill="#FFFBCF"/>' +
    '<ellipse cx="30" cy="10" rx="4" ry="2" fill="#FFFBCF"/>' +
    '<rect x="0" y="0" width="2" height="2" fill="none"/>' +   // fill=none → skipped
    '</svg>';
  const g = parseCarSvg(svg);
  assert.equal(g.details.length, 3);                          // the fill=none rect is skipped
  assert.equal(g.details.filter(d => d.c === '#DD0000').length, 1);
  assert.equal(g.details.filter(d => d.c === '#FFFBCF').length, 2);
  assert.ok(g.details[0].d.startsWith('M5 6h4v3'), 'rect → rect path');
  assert.ok(g.details.some(d => d.d.includes('A')), 'circle/ellipse → arc path');
});
