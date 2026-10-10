import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sections,slides,sequences} from './self-supervised-course-data.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const build=join(root,'..','AI工程学','.course-build','05-self-supervised');
mkdirSync(build,{recursive:true});
const facts=JSON.parse(readFileSync(join(build,'source-review.json')));
const coverage=slides.map(s=>({
  id:s.id,sourcePages:s.sourcePages,section:s.section,studentQuestion:s.title,
  coreUnderstanding:s.note,prerequisites:sections.find(g=>g.id===s.section).intro,
  readingLocation:'self-supervised-learning.html#'+s.section,
  presentationLocation:'self-supervised-learning.html?mode=slides&page='+s.page,
  originalEvidence:Array.isArray(s.visual)?s.visual:[],
  calculationSteps:sequences[s.id]?.steps||s.equations.map(e=>e.explanation),
  conclusion:s.reading.at(-1),
}));
writeFileSync(join(build,'teaching-coverage.json'),JSON.stringify(coverage,null,2)+'\n');
writeFileSync(join(build,'facts.json'),JSON.stringify({...facts,slides:facts.slides.map(p=>{
  const targets=coverage.filter(s=>s.sourcePages.includes(p.sourcePage));
  return {...p,title:p.exactText.filter(t=>t.trim()&&t.trim()!=='\n').slice(0,2).join(' / '),
    formulasAndData:p.objects.flatMap(o=>o.formulas),
    visualStructure:{objects:p.objects,review:'完整原页与媒体已经视觉核对；语义规格参见 cross-page-relationships.md 与 diagram-manifest.json'},
    teachingRole:targets.map(t=>t.id),teachingIntent:targets.map(t=>t.coreUnderstanding),
    contextLinks:targets.map(t=>({sourcePages:t.sourcePages,step:t.id})),
    exampleStates:targets.flatMap(t=>t.calculationSteps),uncertainties:'修正记录见 issues.md'};
})},null,2)+'\n');
const reading=['# 自监督学习',''];
for(const g of sections){
  reading.push('## '+g.index+'. '+g.title,'',g.intro,'');
  for(const s of g.steps){
    reading.push('### '+s.title,'',...s.reading.flatMap(p=>[p,'']),'<!-- figure: '+s.id+' -->','');
    for(const e of s.equations)reading.push('$$',e.tex,'$$','',e.explanation,'');
  }
}
writeFileSync(join(build,'reading-content.md'),reading.join('\n')+'\n');
writeFileSync(join(build,'presentation-script.json'),JSON.stringify(slides.map(({id,page,title,caption,note,sourcePages,section,equations})=>({id,page,title,caption,note,sourcePages,section,equations,sequence:sequences[id]||null})),null,2)+'\n');
writeFileSync(join(build,'visual-audit.json'),JSON.stringify(slides.map(s=>({
  id:s.id,sourcePages:s.sourcePages,decision:sequences[s.id]?'制作交互':Array.isArray(s.visual)?'保留原图':'重绘',
  uniqueTeachingRole:Array.isArray(s.visual)?'保留具体观察对象、实验曲线、表格及原案例关系':s.caption,
  elements:Array.isArray(s.visual)?s.visual:[s.visual],sequence:sequences[s.id]||null,
  mobile:'稳定 960×440 画布，局部滚动与放大；原图保持比例，所有实际标签可放大读取',
  alt:s.title+'。'+s.caption,
})),null,2)+'\n');
console.log('Saved ordered facts, reading prose, presentation script, itemized coverage and visual audit.');
