// Реестр трасс Time Attack — единый источник правды.
// Каждая запись: { id, name, desc, svgSrc, theme }
//   id      — ключ для store.records()[id].timeattack; также определяет
//             имя модуля js/track-${id}.js (dynamic import в game.html)
//   svgSrc  — SVG-файл Figma (track_path + ITEM_* линии)
// Добавляя трассу: создай track-модуль js/track-<id>.js + SVG, впиши сюда.
// HTML-страница не нужна — game.html?track=<id> обслуживает все треки.

export const TRACKS = [
  {
    id:     `green-study`,
    name:   `Midnight Deadline`,
    desc:   `Drift across a classic green baize desk. Dodge sharp compasses and leave tire marks on important documents!`,
    svgSrc: `tracks/green-study.svg`,
    // Canvas-world colours from tracks/track_themes.json (not CSS tokens)
    theme:  { background: `#14130e`, table: `#2f4034`, tableEdge: `#7a6334`, track: `#cdbf9e` },
  },
  // {
  //   id:     `dining-oak`,
  //   name:   `Breakfast Boulevard`,
  //   desc:   `A cozy dining table turned dangerous circuit. Watch out – those giant forks are unforgiving!`,
  //   svgSrc: `tracks/dining-oak.svg`,
  //
  //   theme:  { background: `#0f0b08`, table: `#2e241a`, tableEdge: `#5a4a36`, track: `#43372a` },
  // },
  {
    id:     `steel-kitchen`,
    name:   `Stainless Speedway`,
    desc:   `Cold steel and sharp cleavers. Navigate a perilous maze of kitchen utensils on a stainless worktop.`,
    svgSrc: `tracks/steel-kitchen.svg`,
    theme:  { background: `#c6cace`, table: `#6b7178`, tableEdge: `#444a50`, track: `#c6bca1` },
  },
  // {
  //   id:     `cafe-marble`,
  //   name:   `Macchiato Madness`,
  //   desc:   `An elegant bistro table. Slide around giant coffee cups and scattered sugar packets. Don't spill the espresso!`,
  //   svgSrc: `tracks/cafe-marble.svg`,
  //
  //   theme:  { background: `#d7d0c4`, table: `#4a3726`, tableEdge: `#2e2114`, track: `#d3b483` },
  // },
  // {
  //   id:     `workbench`,
  //   name:   `Workshop Wasteland`,
  //   desc:   `A rugged industrial workbench. Put your suspension to the test among heavy tools, bolts, and wrenches.`,
  //   svgSrc: `tracks/workbench.svg`,
  //
  //   theme:  { background: `#14130e`, table: `#2f4034`, tableEdge: `#7a6334`, track: `#cdbf9e` },
  // },
  // {
  //   id:     `dev-desk`,
  //   name:   `Office Overdrive`,
  //   desc:   `Late-night coding chaos. Drift through a maze of sticky notes, flash drives, and empty energy drinks!`,
  //   svgSrc: `tracks/dev-desk.svg`,
  //
  //   theme:  { background: `#181d1d`, table: `#574b39`, tableEdge: `#837a68`, track: `#9a8c6f` },
  // }
];
