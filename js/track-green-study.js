// "Green Study" track — generated from tracks/green-study.svg.
import { makeTrack, TRACK_HALF, CONE_R, K, CP_R } from './track-factory.js';

export { TRACK_HALF, CONE_R, K, CP_R };

export const {
  center, outer, inner, cones, TABLE,
  props, collectibles, checkpoints,
  startPos, startAngle, id, laps, theme,
} = await makeTrack({
  svgPath: './tracks/green-study.svg',
  id:      'green-study',
  laps:    3,
  theme:   {
    background: '#14130e',
    table:      '#2f4034',
    tableEdge:  '#7a6334',
    track:      '#cdbf9e',
    skid:       'rgba(10,16,10,0.5)',
    checkpoint: 'rgba(125,212,255,0.5)',
    cone:       '#ff7a1a',
  },
});
