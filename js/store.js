// Единственная точка сохранения и загрузки. Ни один другой модуль не трогает
// localStorage напрямую — всё идёт через геттеры отсюда + save().
//
// При смене схемы: (1) увеличь VERSION, (2) добавь миграцию в _ensure() ниже.

const KEY     = 'desktop-drift';
const VERSION = 1;

const defaults = () => ({
  version:      VERSION,
  settings:     { units: 'kmh' },
  garage:       { carIndex: 0, bodyColor: null, neonColor: null },
  records:      {},        // { [trackId]: { [mode]: { bestLap, bestScore } } }
  achievements: {},        // { [id]: { unlocked: bool, progress: number } }
});

let _s = null;

const _ensure = () => {
  if (_s) return;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (raw?.version === VERSION) { _s = raw; return; }
    // Версия не совпала — сбрасываем.
    // Добавь здесь миграцию (raw.version → VERSION) если данные надо сохранить.
  } catch {}
  _s = defaults();
};

// Записывает текущее состояние в localStorage.
// Вызывать после любой мутации возвращённых объектов.
export const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(_s)); } catch {}
};

// Геттеры возвращают живые объекты — мутируй нужные поля, затем вызывай save().
export const settings     = () => { _ensure(); return _s.settings; };
export const garage       = () => { _ensure(); return _s.garage; };
export const records      = () => { _ensure(); return _s.records; };
export const achievements = () => { _ensure(); return _s.achievements; };
