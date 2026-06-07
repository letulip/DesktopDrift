// Как использовать: addProp({ ...ITEM_PLATE_YELLOW, x: 800, y: -450, ang: 0 });

// ==========================================
// УНИВЕРСАЛЬНЫЕ ПРЕДМЕТЫ
// (которые можно раскидать по разным трекам, не меняя код)
// ==========================================

export const ITEM_CUP = { 
  hl: 0, 
  r: 88, // Рассчитано под диаметр 15 см в масштабе 1:64
  kind: 'bowl', 
  imgSrc: 'items/cup-ready.svg', 
  c: '#ffffff' 
};

// --- Мелкие объекты ---
// Крышечка от колы (~3 см, круглая)
export const ITEM_COLA_CAP = { hl: 0, r: 18, kind: 'plate', c: '#ff9999', imgSrc: 'objects/cola.svg' };

// ==========================================
// 📚 КУХНЯ И СВЯЗАННОЕ (Масштаб 1:64)
// ==========================================

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
// 🔪 ДОСКИ И ИНВЕНТАРЬ (Масштаб 1:64)
// ==========================================

// Разделочная доска с ручкой (~35x20 см, широкая капсула)
export const ITEM_BOARD_1 = { hl: 88, r: 117, kind: 'board', c: '#a48c84', imgSrc: 'items/kitchen-board-1-ready.svg' };

// Разделочная доска прямоугольная (~30x20 см, капсула)
export const ITEM_BOARD_2 = { hl: 58, r: 117, kind: 'board', c: '#bcccd4', imgSrc: 'items/kitchen-board-2-ready.svg' };

// Терка металлическая (~22x10 см, капсула)
export const ITEM_GRATER  = { hl: 70, r: 58, kind: 'board', c: '#9cbecf', imgSrc: 'items/grater-ready.svg' };

// Кухонная прихватка-рукавица (~28x18 см, широкая капсула)
export const ITEM_MITTEN  = { hl: 59, r: 105, kind: 'board', c: '#f4dcac', imgSrc: 'items/mitten-ready.svg' };

// ==========================================
// 🍳 КУХНЯ И ТЕХНИКА (Масштаб 1:64)
// ==========================================

// --- Крупная техника и предметы ---

// Стационарный телефон (~20x20 см)
// Огромный квадратный предмет. Используем широкую короткую капсулу.
export const ITEM_PHONE     = { hl: 30, r: 100, kind: 'board', c: '#f0ce35', imgSrc: 'items/phone1-ready.svg' };

// Ручной миксер (~18x25 см с венчиками)
export const ITEM_MIXER     = { hl: 40, r: 105, kind: 'board', c: '#e3e5e6', imgSrc: 'items/mixer2-ready.svg' };

// Пульверизатор (Бутылка средства) (~10x25 см)
export const ITEM_SPRAY     = { hl: 87, r: 58,  kind: 'board', c: '#a4d3ee', imgSrc: 'items/washer-ready.svg' };

// Сковорода с яичницей (~45 см с ручкой, диаметр сковороды ~28 см)
// SVG 800×537 (aspect 1.490). Капсула hl:80 + r:164 → fw/fh 488/328 (aspect 1.488) —
// почти точное совпадение: SVG вписывается без искажений.
// Левый кружок капсулы (-80) = центр чаши; правый (+80) = область ручки.
// r:164 = 28 см в масштабе 1:64 (как ITEM_PLATE_*).
export const ITEM_PAN_EGG   = { hl: 80, r: 164, kind: 'bowl',  c: '#385253', imgSrc: 'items/pan1-ready.svg' };


// --- Наборы посуды (Сборные SVG) ---

// Набор: Тарелка + Нож + Вилка (~30x30 см)
// Используем круглый коллайдер, так как предметы лежат квадратом.
export const ITEM_SET_1     = { hl: 0,  r: 175, kind: 'plate', c: '#faf5d4', imgSrc: 'items/cutlery-set1-ready.svg' };
export const ITEM_SET_2     = { hl: 0,  r: 175, kind: 'plate', c: '#faf5d4', imgSrc: 'items/cutlery-set2-ready.svg' };


// --- Кухонная утварь (ВНИМАНИЕ: Нарисованы под углом!) ---
// Для этих предметов расчеты даны для ГОРИЗОНТАЛЬНОГО коллайдера.
// При добавлении на трассу их нужно будет повернуть: ang: -0.78 (или перерисовать SVG).

// Открывалка для консервов (~18x5 см)
export const ITEM_OPENER    = { hl: 76, r: 29,  kind: 'knife', c: '#9c5c56', imgSrc: 'items/opener-ready.svg' };

// Кухонный топорик (Тесак) (~30x9 см)
export const ITEM_CLEAVER   = { hl: 122, r: 52, kind: 'knife', c: '#c8ccce', imgSrc: 'items/cook-knife-ready.svg' };

// Лопатка сплошная (~30x8 см)
export const ITEM_SPATULA_1 = { hl: 128, r: 46, kind: 'knife', c: '#c9ccce', imgSrc: 'items/spatula1-ready.svg' };

// Лопатка с прорезями (~30x8 см)
export const ITEM_SPATULA_2 = { hl: 128, r: 46, kind: 'knife', c: '#c9ccce', imgSrc: 'items/spatula2-ready.svg' };

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

// Транспортир (~12x6 см, капсула)
export const ITEM_RULER = { hl: 35, r: 35, kind: 'board', c: '#a4acb4', imgSrc: 'items/ruler-ready.svg' };

// Сборка: Транспортир и циркуль (~15x10 см, широкая капсула)
export const ITEM_COMPASS_RULER = { hl: 29, r: 58, kind: 'board', c: '#a4acb4', imgSrc: 'items/ruler-plus-ready.svg' };