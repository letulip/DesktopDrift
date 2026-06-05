// Реестр трасс Time Attack — единый источник правды.
// Каждая запись: { id, name, desc, svgSrc, page }
//   id      — ключ для store.records()[id].timeattack
//   svgSrc  — SVG-файл Figma (track_path + ITEM_* линии)
//   page    — HTML-страница игры
// Добавляя трассу: создай track-модуль, HTML-страницу, впиши сюда.

export const TRACKS = [
  {
    id:     'green-study',
    name:   'Green Study',
    desc:   'A writing desk. Green baize and brass accents.',
    svgSrc: 'tracks/green-study.svg',
    page:   'green-study.html',
    // Canvas-world colours from tracks/track_themes.json (not CSS tokens)
    theme:  { background: '#14130e', table: '#2f4034', tableEdge: '#7a6334', track: '#cdbf9e' },
  },
];
