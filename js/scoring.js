// Чистая игровая логика скоринга дрифта — без состояния, без побочных эффектов.
// Вынесено из game-engine.js, чтобы покрыть юнит-тестами (раньше формулы жили
// внутри замыкания startGame и были непокрываемы). Поведение идентично прежнему.
//
// Именованные константы заменяют «магические числа» — это единственные ручки
// настройки баланса комбо. Меняешь баланс — меняешь здесь, а не по коду движка.

// Порог входа в занос (дрифт засчитывается)
export const DRIFT_MIN_SLIP  = 60;   // боковая скорость |vS|, выше которой это занос
export const DRIFT_MIN_SPEED = 90;   // общая скорость, ниже которой заноса нет

// Качество дрифта (нормировка slip/speed) и его потолок
export const QUALITY_SLIP_REF  = 160;
export const QUALITY_SPEED_REF = 260;
export const QUALITY_MAX        = 1.4;

// Накопление множителя
export const MULT_GAIN_PER_S      = 0.14;  // прирост multBuild за секунду чистого дрифта (× quality)
export const MULT_TRANSITION_BONUS = 0.3;  // бонус к multBuild за перекладку
export const MULT_NEARMISS_BONUS   = 0.28; // бонус к multBuild за near-miss
export const MULT_MAX              = 8;    // потолок итогового множителя

// Порог знака заноса (для детекта перекладки) и скорость набора очков
export const SLIP_SIGN_THRESHOLD = 50;
export const COMBO_RATE          = 0.0015; // slip × speed × dt × mult × COMBO_RATE

// Идёт ли занос при данной боковой/общей скорости.
export const isDrifting = (vS, speed) =>
  Math.abs(vS) > DRIFT_MIN_SLIP && speed > DRIFT_MIN_SPEED;

// Качество текущего дрифта (0…QUALITY_MAX): чем больше snос и скорость, тем выше.
export const driftQuality = (slip, speed) =>
  Math.min(QUALITY_MAX, (slip / QUALITY_SLIP_REF) * (speed / QUALITY_SPEED_REF));

// Итоговый множитель из накопленного multBuild (1…MULT_MAX).
export const comboMult = (multBuild) =>
  Math.min(MULT_MAX, 1 + multBuild);

// Прирост очков комбо за кадр.
export const comboGain = (slip, speed, dt, mult) =>
  slip * speed * dt * COMBO_RATE * mult;

// Знак заноса: +1 / -1 / 0 (для детекта перекладки и накопления transitions).
export const slipSign = (vS) =>
  vS > SLIP_SIGN_THRESHOLD ? 1 : (vS < -SLIP_SIGN_THRESHOLD ? -1 : 0);
