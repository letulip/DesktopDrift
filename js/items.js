// Как использовать: addProp({ ...ITEM_PLATE_YELLOW, x: 800, y: -450, ang: 0 });

// ==========================================
// 📚 КУХНЯ И СВЯЗАННОЕ (Масштаб 1:64)
// ==========================================

export const ITEM_CUP = { 
  hl: 0, 
  r: 88, // Рассчитано под диаметр 15 см в масштабе 1:64
  kind: 'bowl', 
  imgSrc: 'items/Cup.svg', 
  c: '#ffffff' 
};

// export const ITEM_FORK = { 
//   hl: 123, // Рассчитано под длину 21 см
//   r: 15,   // Толщина коллайдера для вилки
//   kind: 'fork', 
//   imgSrc: 'items/fork.svg', 
//   c: '#c8ccd2' 
// };

// --- Тарелки (28 см, r: 164) ---
export const ITEM_PLATE_YELLOW = { hl: 0, r: 164, kind: 'plate', c: '#fff9d6', imgSrc: 'items/plate1-yellow-ready.svg' };
export const ITEM_PLATE_WHITE  = { hl: 0, r: 164, kind: 'plate', c: '#ffffff', imgSrc: 'items/plate1-ready.svg' };
export const ITEM_PLATE_GREY   = { hl: 0, r: 164, kind: 'plate', c: '#dce3e8', imgSrc: 'items/plate2-ready.svg' };

// --- Столовые ножи (~21 см, капсула 246x30) ---
export const ITEM_KNIFE_1 = { hl: 108, r: 15, kind: 'knife', c: '#a4b3bc', imgSrc: 'items/knife1-ready.svg' };
export const ITEM_KNIFE_2 = { hl: 108, r: 15, kind: 'knife', c: '#a4b3bc', imgSrc: 'items/knife2-ready.svg' };
export const ITEM_KNIFE_3 = { hl: 108, r: 15, kind: 'knife', c: '#a4b3bc', imgSrc: 'items/knife3-ready.svg' };

// --- Столовые вилки (~21 см, капсула 246x30) ---
export const ITEM_FORK_1 = { hl: 108, r: 15, kind: 'fork', c: '#a4b3bc', imgSrc: 'items/fork1-ready.svg' };
export const ITEM_FORK_2 = { hl: 108, r: 15, kind: 'fork', c: '#a4b3bc', imgSrc: 'items/fork2-ready.svg' };

// --- Большая вилка для мяса (~32.5 см, капсула 380x40) ---
export const ITEM_TRIDENT = { hl: 170, r: 20, kind: 'fork', c: '#79c8f2', imgSrc: 'items/trident1-ready.svg' };

// ==========================================
// 📚 КАНЦЕЛЯРИЯ И РАБОЧИЙ СТОЛ (Масштаб 1:64)
// ==========================================

// --- Крупные объекты (Блокноты, планшетки) ---
// Планшетка с зажимом (~32x23 см)
export const ITEM_CLIPBOARD = { hl: 52, r: 135, kind: 'board', c: '#70a441', imgSrc: 'items/writing-board-ready.svg' };
// Ежедневник / Блокнот (~21x15 см)
export const ITEM_NOTEBOOK  = { hl: 35, r: 88,  kind: 'board', c: '#6ca342', imgSrc: 'items/daily-ready.svg' };

// --- Средние объекты (Степлер, диспенсер, корректор) ---
// Диспенсер для скотча (~20x8 см)
export const ITEM_TAPE      = { hl: 70, r: 46,  kind: 'board', c: '#ffd13b', imgSrc: 'items/ducttape-dispensor-ready.svg' };
// Степлер (~16x4 см)
export const ITEM_STAPLER   = { hl: 70, r: 24,  kind: 'board', c: '#b3b8bd', imgSrc: 'items/stapler-ready.svg' };
// Ленточный корректор (~10x5 см)
export const ITEM_CORRECTOR = { hl: 30, r: 29,  kind: 'board', c: '#609f40', imgSrc: 'items/corrector-ready.svg' };

// --- Вытянутые объекты (Ножи, карандаши, циркули) ---
// Канцелярский нож (~16x3.5 см)
export const ITEM_CUTTER    = { hl: 73, r: 20,  kind: 'knife', c: '#fed42d', imgSrc: 'items/card-knife-ready.svg' };
// Простой карандаш (~19 см, коллайдер r:9 для стабильной физики)
export const ITEM_PENCIL    = { hl: 102, r: 9,  kind: 'knife', c: '#64a03c', imgSrc: 'items/pencil-ready.svg' };
// Карандаш + Нож вместе (Сборный SVG, ~17x5.5 см)
export const ITEM_PENCIL_PLUS = { hl: 67, r: 32, kind: 'board', c: '#fed42d', imgSrc: 'items/pencil-plus-ready.svg' };

// --- Циркули (в сложенном виде, ~15 см) ---
export const ITEM_COMPASS_1 = { hl: 73, r: 15,  kind: 'knife', c: '#b5bcc2', imgSrc: 'items/compass-ready.svg' };
export const ITEM_COMPASS_2 = { hl: 73, r: 15,  kind: 'knife', c: '#7db9d6', imgSrc: 'items/compass2-ready.svg' };