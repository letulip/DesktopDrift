// Трасса «Green Study» — генерируется из tracks/WORK_DESK_1.svg.
// Прокси-линии (<line id="ITEM_*">) задают позицию и угол предметов.
// Использует top-level await (ES-модули, современные браузеры).

import * as ITEMS from './items.js';
import { chaikin, offsetEdges, placeCones, sampleCheckpoints, prepProp } from './track-util.js';

// ── Константы ────────────────────────────────────────────────────────────────
// viewBox 0 0 14462 7829; stroke-width дорожки 800 → half = 400.
// SCALE = TRACK_HALF / 400 = 100 / 400 = 0.25 (мир совпадает по размеру со старым треком).
const SVG_CX = 14462 / 2;
const SVG_CY = 7829  / 2;
const SCALE  = 0.25;

export const TRACK_HALF = 100;
export const CONE_R     = 9;
export const K          = 8;
export const CP_R       = TRACK_HALF + 70;

// ── Вспомогательные ─────────────────────────────────────────────────────────

const toGame = (x, y) => ({ x: (x - SVG_CX) * SCALE, y: -(y - SVG_CY) * SCALE });

// Разбор SVG path d: только M, L, H, V, Z (абсолютные координаты)
function parseSvgPath(d) {
  const pts = [];
  const tokens = d.match(/[MLHVZmlhvz]|[-+]?[0-9]*\.?[0-9]+/g) || [];
  let i = 0, cmd = '', x = 0, y = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[MLHVZmlhvz]/.test(t)) { cmd = t; i++; continue; }
    const v = parseFloat(t);
    if (cmd === 'M' || cmd === 'L') {
      x = v; y = parseFloat(tokens[++i]); i++;
      pts.push([x, y]);
    } else if (cmd === 'H') {
      x = v; i++;
      pts.push([x, y]);
    } else if (cmd === 'V') {
      y = v; i++;
      pts.push([x, y]);
    } else {
      i++;
    }
  }
  return pts;
}

// Разрешение layer-ID в ключ items.js:
// 1) прямое совпадение; 2) обрезаем суффикс _N (номер экземпляра)
function resolveKey(id) {
  if (id in ITEMS) return id;
  const stripped = id.replace(/_\d+$/, '');
  return stripped in ITEMS ? stripped : null;
}

// ── Загрузка SVG ─────────────────────────────────────────────────────────────
const svgText = await fetch('./tracks/WORK_DESK_1.svg').then(r => r.text());
const _doc    = new DOMParser().parseFromString(svgText, 'image/svg+xml');

// ── Центральная линия ────────────────────────────────────────────────────────
const rawVerts  = parseSvgPath(_doc.getElementById('track_path').getAttribute('d'));
let smoothPoly  = rawVerts.map(([x, y]) => toGame(x, y));
for (let i = 0; i < 4; i++) smoothPoly = chaikin(smoothPoly); // 26 → 416 точек

export const { center, outer, inner } = offsetEdges(smoothPoly, TRACK_HALF);

// ── Конусы ───────────────────────────────────────────────────────────────────
export const cones = placeCones(outer, inner, 5);

// ── TABLE: размер стола из реальных границ outer + отступ ───────────────────
// Отступ 250 игровых единиц с каждой стороны (≈ 200–300 px на экране).
// render.js прочитает T.TABLE в initRender и заменит глобальный TABLE из config.js.
const TABLE_MARGIN = 250;
let _maxX = 0, _maxY = 0;
for (const o of outer) { _maxX = Math.max(_maxX, Math.abs(o.x)); _maxY = Math.max(_maxY, Math.abs(o.y)); }
export const TABLE = { w: Math.round((_maxX + TABLE_MARGIN) * 2), h: Math.round((_maxY + TABLE_MARGIN) * 2), shape: 'rect' };

// ── Предметы из прокси-линий ─────────────────────────────────────────────────
export const props = [];
const addProp = (o) => { props.push(prepProp(o)); };

_doc.querySelectorAll('line[id^="ITEM_"]').forEach(el => {
  const rawId = el.id;
  const key   = resolveKey(rawId);
  if (!key) {
    console.warn(`[track-green-study] unknown item id "${rawId}" — не найден в items.js`);
    return;
  }
  const item = ITEMS[key];

  const x1 = parseFloat(el.getAttribute('x1'));
  const y1 = parseFloat(el.getAttribute('y1'));
  const x2 = parseFloat(el.getAttribute('x2'));
  const y2 = parseFloat(el.getAttribute('y2'));

  const { x: gx, y: gy } = toGame((x1 + x2) / 2, (y1 + y2) / 2);
  const ang = Math.atan2(-(y2 - y1), x2 - x1);

  addProp({ ...item, x: Math.round(gx), y: Math.round(gy), ang: parseFloat(ang.toFixed(3)) });
});

// ── Чекпоинты ────────────────────────────────────────────────────────────────
export const checkpoints = sampleCheckpoints(center, K);

// ── Старт ────────────────────────────────────────────────────────────────────
const _c0 = center[0], _c1 = center[1];
export const startPos   = { x: _c0.x, y: _c0.y };
export const startAngle = Math.atan2(_c1.y - _c0.y, _c1.x - _c0.x);

export const collectibles = [];

// Цветовая тема — передаётся в render.js через initRender(T).
// Значения из tracks/track_themes.json → "green-study".palette
export const theme = {
  background: '#14130e',
  table:      '#2f4034',
  tableEdge:  '#7a6334',
  track:      '#cdbf9e',
  startLine:  '#efe9d8',
  skid:       'rgba(10,16,10,0.5)',
  checkpoint: 'rgba(125,212,255,0.5)',
  cone:       '#ff7a1a',
};
