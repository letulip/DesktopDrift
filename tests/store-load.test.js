// store.js — путь "загрузка существующих данных": в localStorage уже лежит
// сохранение с совпадающей версией, store обязан его поднять, а не сбросить.
// Отдельный файл (а не отдельный тест) — чтобы получить свежий процесс и
// чистый модульный кэш store.js (см. комментарий в store.test.js).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage } from './helpers.js';

installLocalStorage({
  'desktop-drift': JSON.stringify({
    version:      1,
    settings:     { units: 'mph' },
    garage:       { carIndex: 3, bodyColor: '#00ff00' },
    records:      { oval: { timeattack: { bestLap: 12345, bestScore: 999 } } },
    achievements: { firstDrift: { unlocked: true, progress: 1 } },
  }),
});

const { settings, garage, records, achievements } =
  await import('../js/store.js');

test('loads persisted settings', () => {
  assert.deepEqual(settings(), { units: 'mph' });
});

test('loads persisted garage', () => {
  assert.deepEqual(garage(), { carIndex: 3, bodyColor: '#00ff00' });
});

test('loads persisted records / achievements', () => {
  assert.equal(records().oval.timeattack.bestLap, 12345);
  assert.equal(achievements().firstDrift.unlocked, true);
});

// version mismatch → сброс к defaults (защита от несовместимой схемы)
test('version mismatch falls back to defaults', async () => {
  installLocalStorage({
    'desktop-drift': JSON.stringify({ version: 999, settings: { units: 'mph' } }),
  });
  // отдельный импорт с busting query — новый модульный экземпляр, чистый _s
  const fresh = await import('../js/store.js?v=mismatch');
  assert.deepEqual(fresh.settings(), { units: 'kmh' });
});
