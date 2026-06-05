// Реестр трасс Time Attack — единый источник правды.
// Каждая запись: { id, name, desc, svgSrc, page }
//   id      — ключ для store.records()[id].timeattack
//   svgSrc  — SVG-файл Figma (track_path + ITEM_* линии)
//   page    — HTML-страница игры
// Добавляя трассу: создай track-модуль, HTML-страницу, впиши сюда.

export const TRACKS = [
  {
    id:     `green-study`,
    name:   `Midnight Deadline`,
    desc:   `Drift across a classic green baize desk. Dodge sharp compasses and leave tire marks on important documents!`,
    svgSrc: `tracks/green-study.svg`,
    page:   `green-study.html`,
    // Canvas-world colours from tracks/track_themes.json (not CSS tokens)
    theme:  { background: `#14130e`, table: `#2f4034`, tableEdge: `#7a6334`, track: `#cdbf9e` },
  },
  // {
  //   id:     `dining-oak`,
  //   name:   `Breakfast Boulevard`,
  //   desc:   `A cozy dining table turned dangerous circuit. Watch out – those giant forks are unforgiving!`,
  //   svgSrc: `tracks/dining-oak.svg`,
  //   page:   `dining-oak.html`,
  //   theme:  { background: `#111111`, table: `#222222`, tableEdge: `#555555`, track: `#888888` },
  // },
  // {
  //   id:     `steel-kitchen`,
  //   name:   `Stainless Speedway`,
  //   desc:   `Cold steel and sharp cleavers. Navigate a perilous maze of kitchen utensils and don't slip on the oil!`,
  //   svgSrc: `tracks/steel-kitchen.svg`,
  //   page:   `steel-kitchen.html`,
  //   theme:  { background: `#f0f0f0`, table: `#ffffff`, tableEdge: `#cccccc`, track: `#999999` },
  // },
  // {
  //   id:     `cafe-marble`,
  //   name:   `Macchiato Madness`,
  //   desc:   `An elegant bistro table. Slide around giant coffee cups and scattered sugar packets. Don't spill the espresso!`,
  //   svgSrc: `tracks/cafe-marble.svg`,
  //   page:   `cafe-marble.html`,
  //   theme:  { background: `#e0e0e0`, table: `#ffffff`, tableEdge: `#cccccc`, track: `#999999` },
  // },
  // {
  //   id:     `workbench`,
  //   name:   `Workshop Wasteland`,
  //   desc:   `A rugged industrial workbench. Put your suspension to the test among heavy tools, bolts, and wrenches.`,
  //   svgSrc: `tracks/workbench.svg`,
  //   page:   `workbench.html`,
  //   theme:  { background: `#e0e0e0`, table: `#ffffff`, tableEdge: `#cccccc`, track: `#999999` },
  // },
  // {
  //   id:     `dev-desk`,
  //   name:   `Office Overdrive`,
  //   desc:   `Late-night coding chaos. Drift through a maze of sticky notes, flash drives, and empty energy drinks!`,
  //   svgSrc: `tracks/dev-desk.svg`,
  //   page:   `dev-desk.html`,
  //   theme:  { background: `#e0e0e0`, table: `#ffffff`, tableEdge: `#cccccc`, track: `#999999` },
  // }
];
