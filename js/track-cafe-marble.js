// "Cafe Marble" track (Macchiato Madness) — generated from tracks/cafe-marble.svg.
// Light bistro-table scheme → dark startLine so the finish flag reads on the pale surface.
import { makeTrack, TRACK_HALF, CONE_R, K, CP_R } from './track-factory.js';

export { TRACK_HALF, CONE_R, K, CP_R };

export const {
  center, outer, inner, cones, TABLE,
  props, collectibles, checkpoints,
  startPos, startAngle, id, laps, theme,
} = await makeTrack({
  svgPath: './tracks/cafe-marble.svg',
  id:      'cafe-marble',
  laps:    3,
  tires:   12,   // seeded along the centerline (see js/tire-seed.js); must match registry `tires`
  theme:   {
    background: '#d7d0c4',
    table:      '#4a3726',
    tableEdge:  '#2e2114',
    track:      '#d3b483',
    skid:       'rgba(30,18,8,0.5)',
    checkpoint: 'rgba(125,212,255,0.5)',
    cone:       '#ff7a1a',
    startLine:  '#2e2114',   // dark flag on a light table
  },
});
