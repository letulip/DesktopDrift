// "Steel Kitchen" track — generated from tracks/steel-kitchen.svg.
// viewBox 0 0 16399 8756; track stroke-width 800 → SCALE = 100/400 = 0.25.
import { makeTrack, TRACK_HALF, CONE_R, K, CP_R } from './track-factory.js';

export { TRACK_HALF, CONE_R, K, CP_R };

export const {
  center, outer, inner, cones, TABLE,
  props, collectibles, checkpoints,
  startPos, startAngle, id, laps, theme,
} = await makeTrack({
  svgPath: './tracks/steel-kitchen.svg',
  svgCx:   16399 / 2,
  svgCy:   8756  / 2,
  scale:   0.25,
  id:      'steel-kitchen',
  laps:    3,
  theme:   {
    background:    '#c6cace',
    table:         '#6b7178',
    tableEdge:     '#444a50',
    track:         '#c6bca1',
    skid:          'rgba(30,34,40,0.5)',
    checkpoint:    'rgba(60,120,160,0.6)',
    cone:          '#ff7a1a',
  },
});
