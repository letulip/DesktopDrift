// Usage: addProp({ ...ITEM_PLATE_YELLOW, x: 800, y: -450, ang: 0 });

// ==========================================
// UNIVERSAL ITEMS
// (can be placed on any track without code changes)
// ==========================================

export const ITEM_CUP = {
  hl: 0,
  r: 88, // calibrated for 15 cm diameter at 1:64 scale
  kind: 'bowl',
  imgSrc: 'items/cup-ready.svg',
  c: '#ffffff'
};

// --- Small objects ---
// Cola bottle cap (~3 cm, round)
export const ITEM_COLA_CAP = { hl: 0, r: 18, kind: 'plate', c: '#ff9999', imgSrc: 'objects/cola.svg' };

// ==========================================
// 📚 KITCHEN & RELATED (1:64 scale)
// ==========================================

// export const ITEM_FORK = {
//   hl: 123, // calibrated for 21 cm length
//   r: 15,   // collider thickness for a fork
//   kind: 'fork',
//   imgSrc: 'items/fork.svg',
//   c: '#c8ccd2'
// };

// --- Plates (28 cm, r: 164) ---
export const ITEM_PLATE_YELLOW = { hl: 0, r: 164, kind: 'plate', c: '#fff9d6', imgSrc: 'items/plate1-yellow-ready.svg' };
export const ITEM_PLATE_WHITE  = { hl: 0, r: 164, kind: 'plate', c: '#ffffff', imgSrc: 'items/plate1-ready.svg' };
export const ITEM_PLATE_GREY   = { hl: 0, r: 164, kind: 'plate', c: '#dce3e8', imgSrc: 'items/plate2-ready.svg' };

// --- Table knives (~21 cm, capsule 246×30) ---
export const ITEM_KNIFE_1 = { hl: 75, r: 15, kind: 'knife', c: '#a4b3bc', imgSrc: 'items/knife1-ready.svg' };
export const ITEM_KNIFE_2 = { hl: 75, r: 15, kind: 'knife', c: '#a4b3bc', imgSrc: 'items/knife2-ready.svg' };
export const ITEM_KNIFE_3 = { hl: 75, r: 15, kind: 'knife', c: '#a4b3bc', imgSrc: 'items/knife3-ready.svg' };

// --- Table forks (~21 cm, capsule 246×30) ---
export const ITEM_FORK_1 = { hl: 75, r: 15, kind: 'fork', c: '#a4b3bc', imgSrc: 'items/fork1-ready.svg' };
export const ITEM_FORK_2 = { hl: 75, r: 15, kind: 'fork', c: '#a4b3bc', imgSrc: 'items/fork2-ready.svg' };

// --- Large meat fork (~32.5 cm, capsule 380×40) ---
export const ITEM_TRIDENT = { hl: 170, r: 20, kind: 'fork', c: '#79c8f2', imgSrc: 'items/trident1-ready.svg' };

// ==========================================
// 🔪 BOARDS & UTENSILS (1:64 scale)
// ==========================================

// Chopping board with handle (~35×20 cm, wide capsule)
export const ITEM_BOARD_1 = { hl: 88, r: 117, kind: 'board', c: '#a48c84', imgSrc: 'items/kitchen-board-1-ready.svg' };
// Rectangular chopping board (~30×20 cm, capsule)
export const ITEM_BOARD_2 = { hl: 58, r: 117, kind: 'board', c: '#bcccd4', imgSrc: 'items/kitchen-board-2-ready.svg' };
// Metal grater (~22×10 cm, capsule)
export const ITEM_GRATER  = { hl: 70, r: 58, kind: 'board', c: '#9cbecf', imgSrc: 'items/grater-ready.svg' };
// Oven glove / mitt (~28×18 cm, wide capsule)
export const ITEM_MITTEN  = { hl: 59, r: 105, kind: 'board', c: '#f4dcac', imgSrc: 'items/mitten-ready.svg' };

// ==========================================
// 🍳 KITCHEN & APPLIANCES (1:64 scale)
// ==========================================

// --- Large appliances and objects ---

// Landline phone (~20×20 cm)
// Very square object — using a wide short capsule.
export const ITEM_PHONE     = { hl: 30, r: 100, kind: 'board', c: '#f0ce35', imgSrc: 'items/phone1-ready.svg' };
// Phone 2 (same dimensions as ITEM_PHONE)
export const ITEM_PHONE_2 = { hl: 30, r: 100, kind: 'board', c: '#ced3d8', imgSrc: 'items/phone2-ready.svg' };

// --- Laptops (13 inch = 30.41 × 21.24 cm) ---
export const ITEM_LAPTOP_OPEN   = { hl: 54, r: 124, kind: 'board', c: '#e2e6e8', imgSrc: 'items/laptop-open-ready.svg' };
export const ITEM_LAPTOP_CLOSED = { hl: 54, r: 124, kind: 'board', c: '#d2d6d9', imgSrc: 'items/laptop-ready.svg' };

// Hand mixer (~18×25 cm with beaters)
export const ITEM_MIXER     = { hl: 40, r: 105, kind: 'board', c: '#e3e5e6', imgSrc: 'items/mixer2-ready.svg' };

// Spray bottle (~10×25 cm)
export const ITEM_SPRAY     = { hl: 87, r: 58,  kind: 'board', c: '#a4d3ee', imgSrc: 'items/washer-ready.svg' };

// Frying pan with fried egg (~45 cm with handle, pan diameter ~28 cm)
// SVG 800×537 (aspect 1.490). Capsule hl:80 + r:164 → fw/fh 488/328 (aspect 1.488) —
// near-perfect fit: SVG scales without distortion.
// Left capsule circle (-80) = pan centre; right (+80) = handle area.
// r:164 = 28 cm at 1:64 scale (matches ITEM_PLATE_*).
export const ITEM_PAN_EGG   = { hl: 80, r: 164, kind: 'bowl',  c: '#385253', imgSrc: 'items/pan1-ready.svg' };

// --- Doughnuts (saucer 15 cm, round collider) ---
export const ITEM_DOUGHNUT_1 = { hl: 0, r: 88, kind: 'plate', c: '#ff6b5a', imgSrc: 'items/doughnut-1-ready.svg' };
export const ITEM_DOUGHNUT_2 = { hl: 0, r: 88, kind: 'plate', c: '#7b5c46', imgSrc: 'items/doughnut-2-ready.svg' };
export const ITEM_DOUGHNUT_3 = { hl: 0, r: 88, kind: 'plate', c: '#f07178', imgSrc: 'items/doughnut-3-ready.svg' };

// --- Food & tableware descriptors are consolidated in the "FOOD & TABLEWARE" section below. ---


// --- Tableware sets (composite SVGs) ---

// Set: plate + knife + fork (~30×30 cm)
// Round collider because the items are arranged in a square layout.
export const ITEM_SET_1     = { hl: 0,  r: 175, kind: 'plate', c: '#faf5d4', imgSrc: 'items/cutlery-set1-ready.svg' };
export const ITEM_SET_2     = { hl: 0,  r: 175, kind: 'plate', c: '#faf5d4', imgSrc: 'items/cutlery-set2-ready.svg' };


// --- Kitchen utensils (NOTE: drawn at an angle in the SVG!) ---
// Collider dimensions below assume a HORIZONTAL capsule.
// When placing on a track these items need rotating: ang: -0.78 (or redraw the SVG upright).

// Can opener (~18×5 cm)
export const ITEM_OPENER    = { hl: 76, r: 29,  kind: 'knife', c: '#9c5c56', imgSrc: 'items/opener-ready.svg' };

// Cleaver (~30×9 cm)
export const ITEM_CLEAVER   = { hl: 122, r: 52, kind: 'knife', c: '#c8ccce', imgSrc: 'items/cook-knife-ready.svg' };

// Solid spatula (~30×8 cm)
export const ITEM_SPATULA_1 = { hl: 128, r: 46, kind: 'knife', c: '#c9ccce', imgSrc: 'items/spatula1-ready.svg' };

// Slotted spatula (~30×8 cm)
export const ITEM_SPATULA_2 = { hl: 128, r: 46, kind: 'knife', c: '#c9ccce', imgSrc: 'items/spatula2-ready.svg' };

// ==========================================
// 📚 STATIONERY & DESK (1:64 scale)
// ==========================================

// --- Large objects (notepads, clipboards) ---
// Clipboard with clip (~32×23 cm)
export const ITEM_CLIPBOARD = { hl: 52, r: 135, kind: 'board', c: '#70a441', imgSrc: 'items/writing-board-ready.svg' };
// Planner / notepad (~21×15 cm)
export const ITEM_NOTEBOOK  = { hl: 55, r: 108,  kind: 'board', c: '#6ca342', imgSrc: 'items/daily-ready.svg' };
export const ITEM_NOTEBOOK_2 = { hl: 55, r: 108, kind: 'board', c: '#c8cfd5', imgSrc: 'items/notebook2-ready.svg' };
export const ITEM_RUBBER_DUCK = { hl: 12, r: 46, kind: 'board', c: '#fff2b2', imgSrc: 'items/rubber-duck-ready.svg' };
// Smartphone (diagonal 16.94 cm, body ~16.5×7.5 cm)
export const ITEM_SMARTPHONE_1 = { hl: 53, r: 74, kind: 'board', c: '#333333', imgSrc: 'items/smartphone1-ready.svg' };
export const ITEM_SMARTPHONE_2 = { hl: 53, r: 74, kind: 'board', c: '#000000', imgSrc: 'items/smartphone2-ready.svg' };

// Tablet (diagonal 25.4 cm, body ~24×17 cm, landscape)
export const ITEM_TABLET_10 = { hl: 41, r: 99, kind: 'board', c: '#3d444d', imgSrc: 'items/tablet-10inch-ready.svg' };

// --- Medium objects (stapler, tape dispenser, corrector) ---
// Tape dispenser (~20×8 cm)
export const ITEM_TAPE      = { hl: 30, r: 29,  kind: 'board', c: '#ffd13b', imgSrc: 'items/ducttape-dispensor-ready.svg' };
// Stapler (~16×4 cm)
export const ITEM_STAPLER   = { hl: 70, r: 64,  kind: 'board', c: '#b3b8bd', imgSrc: 'items/stapler-ready.svg' };
// Correction tape (~10×5 cm)
export const ITEM_CORRECTOR = { hl: 30, r: 29,  kind: 'board', c: '#609f40', imgSrc: 'items/corrector-ready.svg' };

// --- Elongated objects (cutters, pencils, compasses) ---
// Box cutter (~16×3.5 cm)
export const ITEM_CUTTER    = { hl: 73, r: 20,  kind: 'knife', c: '#fed42d', imgSrc: 'items/card-knife-ready.svg' };
// Plain pencil (~19 cm, collider r:9 for stable physics)
export const ITEM_PENCIL    = { hl: 102, r: 9,  kind: 'knife', c: '#64a03c', imgSrc: 'items/pencil-ready.svg' };
// Pencil + cutter together (composite SVG, ~17×5.5 cm)
export const ITEM_PENCIL_PLUS = { hl: 67, r: 32, kind: 'board', c: '#fed42d', imgSrc: 'items/pencil-plus-ready.svg' };

// --- Compasses (folded, ~15 cm) ---
export const ITEM_COMPASS_1 = { hl: 73, r: 15,  kind: 'knife', c: '#b5bcc2', imgSrc: 'items/compass-ready.svg' };
export const ITEM_COMPASS_2 = { hl: 73, r: 55,  kind: 'knife', c: '#7db9d6', imgSrc: 'items/compass2-ready.svg' };

// Protractor (~12×6 cm, capsule)
export const ITEM_RULER = { hl: 35, r: 35, kind: 'board', c: '#a4acb4', imgSrc: 'items/ruler-ready.svg' };

// Protractor + compass set (~15×10 cm, wide capsule)
export const ITEM_COMPASS_RULER = { hl: 29, r: 78, kind: 'board', c: '#a4acb4', imgSrc: 'items/ruler-plus-ready.svg' };

// --- Additional stationery ---
// Pencil (~19 cm)
export const ITEM_PENCIL_2 = { hl: 102, r: 9, kind: 'knife', c: '#fca311', imgSrc: 'items/pencil2-ready.svg' };
// Pen (~15 cm)
export const ITEM_PEN_1 = { hl: 80, r: 9, kind: 'knife', c: '#437cd6', imgSrc: 'items/pen1-ready.svg' };
// Pen and pencil together (~19×3 cm)
export const ITEM_PEN_PENCIL = { hl: 94, r: 17, kind: 'board', c: '#437cd6', imgSrc: 'items/pen-pencil-ready.svg' };
// Long ruler (~30×3 cm)
export const ITEM_RULER_LONG = { hl: 158, r: 17, kind: 'knife', c: '#f59e0b', imgSrc: 'items/ruler2-ready.svg' };

// --- Tools (Workshop) ---
// Drill (~20×20 cm)
export const ITEM_DRILL = { hl: 27, r: 200, kind: 'board', c: '#fca311', imgSrc: 'items/drill-ready.svg' };
// Open-end spanner (~15×3 cm)
export const ITEM_WRENCH_1 = { hl: 70, r: 27, kind: 'knife', c: '#cccccc', imgSrc: 'items/wrench1-ready.svg' };
// Adjustable spanner (~20×5 cm)
export const ITEM_WRENCH_2 = { hl: 88, r: 39, kind: 'knife', c: '#cccccc', imgSrc: 'items/wrench2-ready.svg' };
// Hammer (~30×12 cm, capsule covers handle and head)
export const ITEM_HAMMER_1 = { hl: 120, r: 110, kind: 'knife', c: '#787676', imgSrc: 'items/hummer1-ready.svg' };
// Screwdriver 1 (red handle, ~20×3 cm)
export const ITEM_SCREWDRIVER_1 = { hl: 100, r: 17, kind: 'knife', c: '#d94b4b', imgSrc: 'items/screwdriver1-ready.svg' };
// Screwdriver 2 (orange handle, ~20×3 cm)
export const ITEM_SCREWDRIVER_2 = { hl: 100, r: 27, kind: 'knife', c: '#eb7152', imgSrc: 'items/screwdriver2-ready.svg' };

// --- Tool sets ---
// Set of 3 tools in a row (~20×10 cm)
export const ITEM_TOOLSET_1 = { hl: 59, r: 128, kind: 'board', c: '#cccccc', imgSrc: 'items/toolset1-ready.svg' };
// Hammer and screwdriver crossed (~25×25 cm, round collider)
export const ITEM_TOOLSET_2 = { hl: 0, r: 146, kind: 'plate', c: '#737373', imgSrc: 'items/toolset2-ready.svg' };

// --- Miscellaneous (Workshop / Household) ---

// Comb (~20×4 cm)
export const ITEM_COMB = { hl: 94, r: 53, kind: 'knife', c: '#568ae5', imgSrc: 'items/comb-ready.svg' };
// Work gloves (~25×20 cm)
export const ITEM_GLOVES = { hl: 29, r: 117, kind: 'board', c: '#eed247', imgSrc: 'items/gloves1-ready.svg' };
// 3 nails in a row (~10×8 cm)
export const ITEM_NAILS_ROW = { hl: 12, r: 46, kind: 'board', c: '#ffd600', imgSrc: 'items/nails2-ready.svg' };
// Nails crossed (~10×10 cm, round collider)
export const ITEM_NAILS_CROSS = { hl: 0, r: 58, kind: 'plate', c: '#ffd600', imgSrc: 'items/nails1-ready.svg' };
// Horseshoe (~12×12 cm, round collider)
export const ITEM_HORSESHOE = { hl: 0, r: 110, kind: 'plate', c: '#fabf48', imgSrc: 'items/horseshoe-ready.svg' };


// ==========================================
// 🍽️ FOOD & TABLEWARE (1:64 scale)
// ==========================================

// Deep soup plate with spoon (~30×28 cm, enlarged round collider to include spoon)
export const ITEM_PLATE_SOUP_SPOON = {
  hl: 40,
  r: 175,
  kind: 'plate',
  c: '#dce2e8',
  imgSrc: 'items/plate-soup2-ready.svg'
};

// Frying pan with stew / sausages (~45 cm with handle, pan diameter 28 cm)
export const ITEM_PAN_STEER = {
  hl: 0,
  r: 184,
  kind: 'bowl',
  c: '#3d434a',
  imgSrc: 'items/pan-steer-ready.svg'
};

// Fries in red package (~12×8 cm)
export const ITEM_FRIES_RED = {
  hl: 35,
  r: 66,
  kind: 'board',
  c: '#f92a1c',
  imgSrc: 'items/fries2-ready.svg'
};

// Fries in orange package (~12×8 cm)
export const ITEM_FRIES_ORANGE = {
  hl: 35,
  r: 76,
  kind: 'board',
  c: '#f27221',
  imgSrc: 'items/fries1-ready.svg'
};

// Plate with chicken drumsticks (28 cm plate)
export const ITEM_PLATE_CHICKEN = {
  hl: 0,
  r: 164,
  kind: 'plate',
  c: '#a0b4ed',
  imgSrc: 'items/plate-chicken-ready.svg'
};

// Plate with BBQ skewers (28 cm plate)
export const ITEM_PLATE_BBQ = {
  hl: 0,
  r: 164,
  kind: 'plate',
  c: '#faba02',
  imgSrc: 'items/plate-bbq-ready.svg'
};

// Plate with mashed potato and chicken (28 cm plate)
export const ITEM_PLATE_MASHED = {
  hl: 0,
  r: 164,
  kind: 'plate',
  c: '#ededed',
  imgSrc: 'items/plate-mashed-chicken-ready.svg'
};

// Soup bowl (diameter ~20 cm)
export const ITEM_BOWL_SOUP_1 = {
  hl: 0,
  r: 117,
  kind: 'plate',
  c: '#f5f5f5',
  imgSrc: 'items/plate-soup3-ready.svg'
};

// Soup bowl with egg (diameter ~20 cm)
export const ITEM_BOWL_SOUP_EGG = {
  hl: 0,
  r: 117,
  kind: 'plate',
  c: '#ffdb59',
  imgSrc: 'items/plate-soup1-ready.svg'
};

// Plate with sausages and cutlery (~30×28 cm, enlarged collider to include cutlery)
export const ITEM_PLATE_SAUSAGE_SET = {
  hl: 40,
  r: 175,
  kind: 'plate',
  c: '#f5f2db',
  imgSrc: 'items/plate-sausage-ready.svg'
};