import {writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sections,slides,topics,sequences} from './generative-part1-course-data.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const build=join(root,'..','AI工程学','.course-build','06-generative','part1');
const reading='# 第六讲：生成模型 · Part I\n\n'+sections.map(g=>'## '+g.title+'\n\n'+g.intro+'\n\n'+g.steps.map(s=>'### '+s.title+'\n\n'+s.reading.join('\n\n')+'\n\n'+s.equations.map(e=>'$$\n'+e.tex+'\n$$\n\n'+e.explanation+'\n').join('\n')).join('\n')).join('\n');
const script='# 生成模型 Part I 演示脚本\n\n'+slides.map(s=>'## '+s.page+'. '+s.title+'\n\n主题：'+topics[s.topic].label+'\n内部来源：'+s.sourcePages.join(', ')+'\n\n'+s.reading.join('\n\n')+'\n\n'+s.equations.map(e=>'$$\n'+e.tex+'\n$$\n\n'+e.explanation+'\n').join('\n')+(sequences[s.id]?'\n过程：\n'+sequences[s.id].steps.map((step,i)=>(i+1)+'. '+step).join('\n')+'\n':'')).join('\n');
writeFileSync(join(build,'reading-content.md'),reading);
writeFileSync(join(build,'presentation-script.md'),script);
writeFileSync(join(build,'source-mapping.json'),JSON.stringify({sections:sections.map(({steps,...g})=>g),slides:slides.map(s=>({id:s.id,page:s.page,section:s.section,sourcePages:s.sourcePages,visual:s.visual,evidence:s.evidence}))},null,2)+'\n');
console.log('Saved derived reading prose, presentation script and source mapping.');
