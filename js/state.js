// Машинка — объект, поля мутируются напрямую
export const car = { x: 0, y: 0, angle: 0, vx: 0, vy: 0 };

// Инициализация стартовой позиции из данных трека
export function initCar({ startPos, startAngle }) {
  car.x = startPos.x; car.y = startPos.y; car.angle = startAngle;
  car.vx = 0; car.vy = 0;
}

// Весь мутабельный игровой стейт — в одном объекте S.
// Оба модуля (game-engine.js пишет, render.js читает) работают с одной ссылкой → нет проблемы ES-биндингов.
export const S = {
  carModel:      0,
  steerSmooth:   0,
  steerInput:    0,

  score:         0,
  comboPoints:   0,
  mult:          1,
  driftTime:     0,
  transitions:   0,
  driftGrace:    0,
  lastSlipSign:  0,
  multBuild:     0,
  nearMisses:    0,
  nearMissCd:    0,
  crashCd:       0,

  flashMsg:      '',
  flashT:        0,
  flashColor:    '#fff',

  lapTime:       0,
  lastLap:       null,
  bestLap:       null,
  lapStarted:    true,
  nextCp:        1,
  lapNum:        0,
  lapScoreStart: 0,
  lapScores:     [],

  startCd:       3.0,
  goT:           0,
  physT:         0,

  skids:         [],
};

// Ввод
export const keys     = {};
export const pointers = new Map();
