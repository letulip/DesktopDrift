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
    desc:   'Письменный стол. Зелёное сукно, латунная отделка.',
    svgSrc: 'tracks/WORK_DESK_1.svg',
    page:   'green-study.html',
  },
];
