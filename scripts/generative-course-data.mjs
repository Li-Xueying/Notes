import * as part1 from './generative-part1-course-data.mjs';
import * as part2 from './generative-part2-course-data.mjs';

export const assetVersion='20261018-2';
export const topics={...part1.topics,...part2.topics};
export const sequences={...part1.sequences,...part2.sequences};
export const sections=[...part1.sections,...part2.sections].map((g,i)=>{
  const part=i<part1.sections.length?'part1':'part2';
  return {...g,part,index:i+1,steps:g.steps.map(s=>({...s,part}))};
});
export const slides=[...part1.slides.map(s=>({...s,part:'part1'})),...part2.slides].map((s,i)=>({...s,page:i+1}));
export {chainExample,vaeExample} from './generative-part1-course-data.mjs';
export {ganExample,ganStates,flowExample,eulerExample,eulerStates,cfgExample} from './generative-part2-course-data.mjs';
