// Кураторская палитра цветов кузова — 20 оттенков, подобранных под
// тёмный контур (#222) и общий стиль игры.
//
// Формат: { hex, name }
// Масштабирование (Phase 2+): ливреи расширят схему до
//   { name, body, stroke, details: [{ c, path }] }
// и будут жить в отдельном массиве LIVERIES в этом же файле.
export const PALETTE = [
  { hex: '#D32F2F', name: 'Rosso'   },  // deep red
  { hex: '#E64A19', name: 'Fuoco'   },  // orange-red
  { hex: '#FF8F00', name: 'Arancio' },  // amber orange
  { hex: '#F9A825', name: 'Giallo'  },  // golden yellow
  { hex: '#C0CA33', name: 'Lime'    },  // lime green
  { hex: '#388E3C', name: 'Verde'   },  // forest green
  { hex: '#00838F', name: 'Acqua'   },  // teal
  { hex: '#039BE5', name: 'Cielo'   },  // sky blue
  { hex: '#1565C0', name: 'Blu'     },  // cobalt blue
  { hex: '#283593', name: 'Notte'   },  // dark navy
  { hex: '#6A1B9A', name: 'Viola'   },  // purple
  { hex: '#AD1457', name: 'Magenta' },  // hot pink
  { hex: '#F5F5F5', name: 'Bianco'  },  // white
  { hex: '#B0BEC5', name: 'Argento' },  // silver
  { hex: '#78909C', name: 'Grigio'  },  // gray
  { hex: '#455A64', name: 'Ardesia' },  // dark slate
  { hex: '#212121', name: 'Nero'    },  // black
  { hex: '#5D4037', name: 'Tabacco' },  // brown
  { hex: '#FF6F00', name: 'Ambra'   },  // deep amber
  { hex: '#FFB14D', name: 'Miele'   },  // honey (matches UI accent)
];
