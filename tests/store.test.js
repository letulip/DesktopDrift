// store.js — путь "чистого старта": нет сохранённых данных, отдаём defaults,
// мутируем живые объекты, save() пишет корректный JSON.
//
// ВАЖНО: store.js кэширует состояние в _s на уровне модуля после первого
// _ensure(). Поэтому "загрузку готовых данных" проверяем в отдельном файле
// (store-load.test.js) — node:test запускает каждый файл в своём процессе,
// так что модуль грузится заново и кэш не протекает между сценариями.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installLocalStorage } from './helpers.js';

// localStorage должен существовать ДО импорта store.js (модуль трогает его лениво,
// но getItem вызывается при первом геттере — ставим заранее, чтобы быть уверенными).
const store = installLocalStorage();

const { settings, garage, records, achievements, save } =
  await import('../js/store.js');

test('defaults: garage', () => {
  const g = garage();
  assert.equal(g.carIndex, 0);
  assert.equal(g.bodyColor, null);
});

test('defaults: settings / records / achievements', () => {
  assert.deepEqual(settings(), { units: 'kmh' });
  assert.deepEqual(records(), {});
  assert.deepEqual(achievements(), {});
});

test('getters return the same live object across calls', () => {
  assert.equal(garage(), garage());
});

test('mutate live object + save() persists correct JSON shape', () => {
  const g = garage();
  g.carIndex  = 2;
  g.bodyColor = '#ff0000';
  save();

  const raw = JSON.parse(store.get('desktop-drift'));
  assert.equal(raw.version, 1);
  assert.equal(raw.garage.carIndex, 2);
  assert.equal(raw.garage.bodyColor, '#ff0000');
  assert.deepEqual(raw.settings, { units: 'kmh' });
});
