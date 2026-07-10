// Time Attack track registry — single source of truth.
// Each entry: { id, name, desc, svgSrc, theme }
//   id      — key for store.records()[id].timeattack; also determines
//             the module name js/track-${id}.js (dynamic import in game.html)
//   svgSrc  — Figma SVG file (track_path + ITEM_* proxy lines)
// To add a track: create js/track-<id>.js + SVG, add an entry here.
// No HTML page needed — game.html?track=<id> serves all tracks.

export const TRACKS = [
  {
    id:     `green-study`,
    name:   `Midnight Deadline`,
    desc:   `Drift across a classic green baize desk. Dodge sharp compasses and leave tire marks on important documents!`,
    svgSrc: `tracks/green-study.svg`,
    caps:   1,
    tires:  12,   // tire-coin pickups (badge denominator); must match the track module's `tires`
    // Canvas-world colours from tracks/track_themes.json (not CSS tokens)
    theme:  { background: `#14130e`, table: `#2f4034`, tableEdge: `#7a6334`, track: `#cdbf9e` },
  },
  {
    id:     `steel-kitchen`,
    name:   `Stainless Speedway`,
    desc:   `Cold steel and sharp cleavers. Navigate a perilous maze of kitchen utensils on a stainless worktop.`,
    svgSrc: `tracks/steel-kitchen.svg`,
    caps:   1,
    tires:  11,   // tire-coin pickups (badge denominator); must match the track module's `tires`
    theme:  { background: `#c6cace`, table: `#6b7178`, tableEdge: `#444a50`, track: `#c6bca1` },
  },
  {
    id:     `workbench`,
    name:   `Workshop Wasteland`,
    desc:   `A rugged industrial workbench. Dodge wrenches, hammers and drills on weathered wood and cold metal.`,
    svgSrc: `tracks/workbench.svg`,
    caps:   1,
    tires:  13,   // tire-coin pickups (badge denominator); must match the track module's `tires`
    theme:  { background: `#181d1d`, table: `#574b39`, tableEdge: `#837a68`, track: `#9a8c6f` },
  },
  // {
  {
    id:     `cafe-marble`,
    name:   `Macchiato Madness`,
    desc:   `An elegant bistro table. Slide around giant coffee cups and delicious doughnuts. Don't spill the espresso!`,
    svgSrc: `tracks/cafe-marble.svg`,
    caps:   1,
    tires:  12,   // tire-coin pickups (badge denominator); must match the track module's `tires`
    theme:  { background: `#d7d0c4`, table: `#4a3726`, tableEdge: `#2e2114`, track: `#d3b483` },
  },
  {
    id:     `dev-desk`,
    name:   `Office Overdrive`,
    desc:   `Late-night coding chaos. Drift through a maze of sticky notes, flash drives, and empty energy drinks!`,
    svgSrc: `tracks/dev-desk.svg`,
    caps:   1,
    tires:  12,   // tire-coin pickups (badge denominator); must match the track module's `tires`
    theme:  { background: `#1b2230`, table: `#7e889b`, tableEdge: `#525b6d`, track: `#c7bda4` },
  },
  // {
  //   id:     `dining-oak`,
  //   name:   `Breakfast Boulevard`,
  //   desc:   `A cozy dining table turned dangerous circuit. Watch out – those giant forks are unforgiving!`,
  //   svgSrc: `tracks/dining-oak.svg`,
  //
  //   theme:  { background: `#0f0b08`, table: `#2e241a`, tableEdge: `#5a4a36`, track: `#43372a` },
  // },
];
