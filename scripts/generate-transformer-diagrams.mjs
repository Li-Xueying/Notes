import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {slides,sequences,videos,attentionExample,expertExample,importanceExamples,shiftedWindowExample} from './transformer-course-data.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const build=join(root,'..','AI工程学','.course-build','04-transformers');
const ppt=join(root,'..','AI工程学','PPT材料','Transformer Models.pptx');
const output=join(root,'diagrams','transformer'),media=join(root,'media','transformer');
mkdirSync(output,{recursive:true});mkdirSync(media,{recursive:true});
const facts=JSON.parse(readFileSync(join(build,'source-review.json'),'utf8'));
const C={ink:'#263f35',muted:'#667f72',green:'#176653',pale:'#e9f3ee',line:'#a8c2b4',amber:'#b47936',warm:'#fbf0dd',blue:'#547a8a',bluePale:'#eaf1f4',red:'#a75d52'};
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text=(value,x,y,{size=17,color=C.ink,anchor='middle',weight=400}={})=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}">${esc(value)}</text>`;
const rect=(x,y,w,h,fill='white',stroke=C.line)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="${stroke}"/>`;
const box=(x,y,w,h,title,detail='',fill=C.pale)=>rect(x,y,w,h,fill)+text(title,x+w/2,y+h/2-(detail?7:-6),{weight:650})+(detail?text(detail,x+w/2,y+h/2+21,{size:14,color:C.muted}):'');
const arrow=(x1,y1,x2,y2,color=C.green)=>`<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="2" marker-end="url(#arrow)"/>`;
const path=d=>`<path d="${d}" fill="none" stroke="${C.green}" stroke-width="2" marker-end="url(#arrow)"/>`;
const formula=(value,y=362)=>rect(46,y-28,868,51,'#f6faf7','#d7e5dc')+text(value,480,y+3,{size:18,color:C.green});
const flow=(items,y=161)=>items.map(([a,b],i)=>box(46+i*868/items.length,y,868/items.length-24,92,a,b,i%2?C.bluePale:C.pale)+(i<items.length-1?arrow(46+(i+1)*868/items.length-24,y+46,46+(i+1)*868/items.length-4,y+46):'')).join('');
const lines=(values,x=80,y=133)=>values.map((v,i)=>text(v,x,y+i*48,{anchor:'start',size:18})).join('');
const softmax=values=>{const max=Math.max(...values);const exp=values.map(v=>Math.exp(v-max)),sum=exp.reduce((a,b)=>a+b,0);return exp.map(v=>v/sum);};
const cv=values=>{const mean=values.reduce((a,b)=>a+b,0)/values.length;const std=Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/values.length);return {mean,std,cv:std/mean};};
const assets=new Map();
function asset(name){
  if(!assets.has(name)){
    const sources=facts.slides.flatMap(page=>page.assets.filter(a=>a.part===`ppt/media/${name}`&&page.objects.some(o=>o.imageRelationships.includes(a.relationshipId))).map(a=>({...a,sourcePage:page.sourcePage})));
    if(!sources.length)throw new Error(`Not a displayed source asset: ${name}`);
    const data=execFileSync('unzip',['-p',ppt,`ppt/media/${name}`],{maxBuffer:30*1024*1024});writeFileSync(join(media,name),data);
    assets.set(name,{name,data,sha256:sources[0].sha256,bytes:data.length,sourcePages:sources.map(s=>s.sourcePage)});
  }
  return assets.get(name);
}
const image=(name,x=46,y=89,w=868,h=296,crop=null)=>{
  const {data}=asset(name),mime=/jpe?g$/i.test(name)?'image/jpeg':'image/png';
  if(crop)return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${crop.join(' ')}" preserveAspectRatio="xMidYMid meet" overflow="hidden"><image href="data:${mime};base64,${data.toString('base64')}" width="${data.readUInt32BE(16)}" height="${data.readUInt32BE(20)}"/></svg>`;
  return `<image href="data:${mime};base64,${data.toString('base64')}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
};
const sourceImages=names=>names.map((name,i)=>image(name,46+i*868/names.length,89,868/names.length-12,296)).join('');
function beamImage(name,sourcePage){
  const source=facts.slides[sourcePage-1],entry=source.assets.find(a=>a.part===`ppt/media/${name}`),obj=source.objects.find(o=>o.imageRelationships.includes(entry.relationshipId));
  const offset=obj.transforms.find(t=>t.type==='off'),extent=obj.transforms.find(t=>t.cx);
  // Keep the tree's origin and scale fixed while new branches are added.
  const scale=296/4000000,left=46+(868-7900000*scale)/2;
  return image(name,left+(Number(offset.x)-1820000)*scale,89+(Number(offset.y)-2000000)*scale,Number(extent.cx)*scale,Number(extent.cy)*scale);
}
const row=(label,values,y,fill=C.pale)=>text(label,72,y+32,{anchor:'start',size:16})+values.map((v,i)=>box(243+i*670/values.length,y,670/values.length-12,52,String(v),'',fill)).join('');
function attentionVector(step=4){
  const weights=softmax(attentionExample.scores),weighted=weights.map((w,i)=>w*attentionExample.values[i]);
  return row('q₁ · kᵢ',attentionExample.scores,103,C.warm)+(step>=1?row('Softmax α₁ᵢ',weights.map(v=>v.toFixed(3)),166):'')+(step>=2?row('Value vᵢ',attentionExample.values,229,C.bluePale):'')+(step>=3?row('α₁ᵢ × vᵢ',weighted.map(v=>v.toFixed(3)),292):'')+(step>=4?formula(`b₁ = ${weighted.reduce((a,b)=>a+b,0).toFixed(3)}：同一权重对值向量的各分量加权`,381):'');
}
function matrixBody(step=3){
  let out=box(45,114,150,74,'Q','N × dₖ')+box(45,235,150,74,'K','N × dₖ',C.warm)+box(742,235,170,74,'V','N × dᵥ',C.bluePale);
  if(step<1)return out+text('三个投影参数在位置间共享',480,207,{color:C.green});
  out+=arrow(195,151,315,151)+arrow(195,272,315,190)+text('QKᵀ',443,110,{weight:650})+text('列：被查询位置 j',443,299,{size:14,color:C.muted});
  for(let i=0;i<4;i++)for(let j=0;j<4;j++)out+=rect(325+j*59,128+i*35,58,34,i===0?C.warm:'white')+text(i===0||step>=2?`s${i+1}${j+1}`:'',354+j*59,151+i*35,{size:14});
  out+=text('行 i',294,194,{size:14});
  if(step>=3)out+=arrow(565,198,648,198)+box(650,161,263,57,'A = softmax(S)','逐行归一化')+path('M694 219 V334 H616')+path('M828 309 V357 H616')+box(367,321,246,55,'输出 B = AV','N × dᵥ',C.bluePale);
  return out;
}
function sequenceNetwork(local=false,one=false){
  let out='';
  for(let i=0;i<4;i++)for(let j=0;j<(one?1:4);j++)if(!local||Math.abs(i-j)<=1)out+=arrow(157+i*214,287,157+j*214,159,local?C.blue:C.green);
  return out+[0,1,2,3].map(i=>box(108+i*214,287,98,50,`a${i+1}`,'',C.bluePale)+(one&&i? '':box(108+i*214,109,98,50,`b${i+1}`))).join('');
}
function autoregression(step=3,stop=false){
  const words=['深','度','学','习',...(stop?['EOS']:[])];
  const inputs=['BOS',...words.slice(0,-1)],stride=stop?157:198;
  return box(45,194,122,68,'Decoder','读取前缀')+words.map((word,i)=>i>step?'':box(197+i*stride,108,134,51,word,'',C.pale)+arrow(264+i*stride,193,264+i*stride,160)+box(197+i*stride,194,134,67,`第 ${i+1} 步`,'条件预测',C.bluePale)+box(197+i*stride,299,134,46,inputs[i],'',C.warm)+arrow(264+i*stride,299,264+i*stride,262)+(i?path(`M${264+(i-1)*stride} 159 H${348+(i-1)*stride} V322 H${197+i*stride}`):'')).join('');
}
function maskBody(query=3){
  let out=text('输入已右移：BOS、深、度、学',265,107,{size:16})+text('查询 i；列 j 为可读取输入',265,133,{size:14,color:C.muted});
  for(let i=0;i<4;i++)for(let j=0;j<4;j++)out+=rect(117+j*73,155+i*42,72,41,j<=i?(i===query?C.warm:C.pale):'#f0f0ef')+text(j<=i?'0':'−∞',153+j*73,182+i*42,{size:17});
  out+=text(`当前查询：i=${query+1}`,690,133,{weight:650})+text('Softmax 之后的权重',690,163,{size:15});
  const weights=softmax([2,1,0,-1].map((v,j)=>j<=query?v:-Infinity));
  out+=weights.map((v,j)=>rect(503+j*97,327-v*137,65,v*137,C.bluePale,C.blue)+text(v.toFixed(3),535+j*97,351,{size:15})+text(['BOS','深','度','学'][j],535+j*97,375,{size:15})).join('');
  out+=text('未来权重为 0；允许位置的权重和为 1',690,397,{size:15,color:C.green});
  return out;
}
function crossBody(step=2){
  const source=['a₁','a₂','a₃'],weights=step===2?[0.2,0.6,0.2]:[0.6,0.3,0.1];
  let out=source.map((v,i)=>box(61+i*208,276,156,51,v,'',C.bluePale)+arrow(139+i*208,276,139+i*208,227)+box(61+i*208,176,156,51,`k${i+1} / v${i+1}`,`α${i+1}=${weights[i]}`)).join('')+box(697,278,215,51,step===2?'START → 机':'START','',C.warm)+arrow(804,278,804,227)+box(750,176,110,51,step===2?'新 q':'q')+text('编码器：源序列',347,358,{color:C.blue})+text('目标侧因果状态',805,358,{color:C.amber});
  for(let i=0;i<3;i++)out+=path(`M805 176 V163 H${139+i*208} V176`);
  if(step>=1)out+=source.map((_,i)=>arrow(139+i*208,176,429+i*51,129,C.blue)).join('')+box(377,86,206,43,'∑ αᵢvᵢ')+arrow(583,108,701,108)+box(703,86,157,43,step===2?'预测下一字':'预测：机');
  return out;
}
function shiftBody(step=2){
  const grid=shiftedWindowExample.grid;
  const arrangement=(step?grid.map((row,y)=>row.map((_,x)=>grid[(y+1)%4][(x+1)%4])):grid).flat();
  let out=text(step?'移位后的区域编号':'移位前的区域编号',218,110,{weight:650})+text('每格一个 token；粗线为 2×2 计算窗口',218,130,{size:13,color:C.muted});
  arrangement.forEach((v,i)=>{out+=rect(108+(i%4)*55,148+Math.floor(i/4)*43,54,42,v===4?C.pale:step===2&&v===8?C.warm:'white')+text(v,135+(i%4)*55,176+Math.floor(i/4)*43,{size:21});});
  out+=`<path d="M108 148 H328 V320 H108 Z M218 148 V320 M108 234 H328" fill="none" stroke="${C.blue}" stroke-width="2.5"/>`;
  out+=arrow(361,222,473,222);
  if(step<2)return out+box(495,169,383,99,step?'按固定窗口分组':'向左、向上循环移一格',step?'同一区域编号可互读':'行、列都按循环索引移动')+formula(step?'四个计算窗口：[4,4,4,4]、[5,3,5,3]、[7,7,1,1]、[8,6,2,0]':'16 个 token；0 至 8 为区域编号，重复编号表示同一区域');
  return out+text('右下计算窗口的区域编号',696,112,{weight:650})+[8,6,2,0].map((v,i)=>box(496+i*104,146,96,48,`K：${v}`,'',i?C.bluePale:C.warm)).join('')+box(502,224,116,61,'Q：8','',C.warm)+arrow(619,254,669,254)+box(671,223,242,64,'加遮罩','[0, −∞, −∞, −∞]')+formula('区域 4 的四个 token 可互读；右下窗口的四个区域彼此屏蔽');
}
function topkBody(step=2){
  const noisy=expertExample.logits.map((v,i)=>v+expertExample.noise[i]),masked=noisy.map((v,i)=>i<2?v:-Infinity),weights=softmax(masked);
  return row('加噪后分数',noisy.map(v=>v.toFixed(1)),109,C.warm)+(step>=1?row('KeepTop2',masked.map(v=>Number.isFinite(v)?v.toFixed(1):'−∞'),187):'')+(step>=2?row('Softmax',weights.map(v=>v.toFixed(3)),265,C.bluePale)+formula(`y = ${weights[0].toFixed(3)} E1(x) + ${weights[1].toFixed(3)} E2(x)`):'');
}
function capacityBody(step=5){
  const words=['What','is','Mixture','of','Experts','?','Summarize'],arrived=[1,2,3,4,6,7][step];
  let out=words.map((word,i)=>box(48+i*124,103,114,45,word,'',i<arrived?C.pale:'white')).join('');
  out+=box(155,221,250,128,'E1','容量 3')+box(556,221,250,128,'E4','容量 3',C.bluePale);
  for(let i=0;i<Math.min(arrived,6);i++)out+=arrow(105+i*124,148,i<3?250+(i%3)*27:650+(i%3)*27,221)+box((i<3?164:565)+(i%3)*77,305,70,33,words[i],'',i<3?C.warm:C.bluePale);
  if(step>=3)out+=text('E1 已满，使用备选 E4',480,197,{size:16,color:C.amber});
  if(step===5)out+=path('M849 149 H937 V377 H915')+box(710,357,204,40,'下一层（残差）','',C.bluePale)+text('overflow：跳过专家分支',366,387,{color:C.red});
  return out;
}
function nativeBody(item,step){
  switch(item.visual){
    case 'route':return flow([['自注意力','位置之间交换信息'],['编码器 / 解码器','组装序列模型'],['NLP / Vision','适配任务与输入'],['MoE','稀疏条件计算']])+formula('机制 → 模型 → 任务扩展 → 专家容量');
    case 'attention-layer':return sequenceNetwork()+text('所有位置均可读取整段输入',480,383,{color:C.green});
    case 'attention-relevance':return sequenceNetwork(false,true)+text('固定一个输出 b₁，选择与它相关的输入',480,383,{color:C.green});
    case 'score-functions':return box(64,120,374,65,'Dot-product','qᵀk',C.pale)+flow([['输入 a、b','分别投影'],['q、k','相同比较维度'],['兼容度分数','尚未归一化']],237)+box(520,120,374,65,'Additive','uᵀ tanh(Wa a + Wb b)',C.bluePale);
    case 'query-key':return box(61,185,133,65,'q₁','Wq a₁',C.warm)+[1,2,3,4].map((v,i)=>box(307+i*152,278,112,50,`a${v}`,'',C.bluePale)+arrow(363+i*152,278,363+i*152,223)+box(307+i*152,169,112,54,`k${v}`)+arrow(195,213,307+i*152,169)+text(`q₁ᵀk${v}`,363+i*152,139,{size:16})).join('');
    case 'attention-vector':return attentionVector(step??4);
    case 'attention-next-query':return flow([['同一源序列','a₁…a₄'],['换查询 q₂','重新计算 α₂ᵢ'],['汇总同一 V','b₂ = ∑ α₂ᵢvᵢ']])+formula('每个查询得到自己的权重分布');
    case 'attention-parallel':return sequenceNetwork()+formula('各查询独立计算，可以并行得到 b₁…b₄');
    case 'qkv-matrices':return box(65,184,195,76,'X','N × D')+['Q = XWQ','K = XWK','V = XWV'].map((label,i)=>arrow(260,222,446,121+i*100)+box(448,88+i*100,370,66,label,i===2?'N × dᵥ':'N × dₖ',[C.pale,C.warm,C.bluePale][i])).join('')+formula('WQ / WK：D × dₖ；WV：D × dᵥ');
    case 'attention-matrix':return matrixBody(step??3);
    case 'scaled-attention':return flow([['点积分数','QKᵀ'],['控制尺度','除以 √dₖ'],['逐行归一化','Softmax'],['汇总内容','乘 V']])+formula('序列长 N：权重 N × N，输出 N × dᵥ');
    case 'multi-head-branches':return box(57,184,148,80,'同一输入 X')+[0,1].map(i=>arrow(205,224,333,143+i*157)+box(335,103+i*157,408,79,`头 ${i+1}：独立 Q、K、V`,'打分 → Softmax → 加权和',i?C.bluePale:C.pale)+arrow(743,142+i*157,828,142+i*157)+text(`B${i+1}`,859,149+i*157)).join('');
    case 'multi-head-merge':return box(57,110,220,67,'head₁','N × dᵥ')+box(57,266,220,67,'head₂','N × dᵥ',C.bluePale)+arrow(277,143,417,198)+arrow(277,298,417,244)+box(420,176,199,91,'拼接','N × 2dᵥ')+arrow(619,222,707,222)+box(709,176,204,91,'输出投影 Wᴼ','N × D')+formula('MultiHead = Concat(head₁,…,headₕ) Wᴼ');
    case 'cnn-receptive-field':return text('CNN：固定局部连接',235,108,{weight:650})+text('自注意力：输入相关连接',704,108,{weight:650})+`<g transform="translate(36 37) scale(.48 .75)">${sequenceNetwork(true)}</g><g transform="translate(502 37) scale(.48 .75)">${sequenceNetwork()}</g>`+formula('感受野类比帮助理解连接范围；参数形式与先验仍有差异');
    case 'rnn-comparison':return [0,1,2,3].map(i=>box(93+i*214,108,133,59,`h${i+1}`,'',C.bluePale)+(i?arrow(226+(i-1)*214,138,93+i*214,138):'')+text(`x${i+1}`,159+i*214,217)+arrow(159+i*214,198,159+i*214,168)).join('')+text('RNN：沿时间递推',480,94,{size:16})+flow([['任意位置 i','已有输入'],['自注意力','直接读取位置 j'],['所有位置','并行更新表示']],269);
    case 'encoder-stack':return ['Block 1','Block 2','Block 3'].map((v,i)=>box(222,282-i*80,516,59,v,i===0?'Self-attention + 逐位置 FFN':'',i%2?C.bluePale:C.pale)+(i<2?arrow(480,282-i*80,480,261-i*80):'')).join('')+text('x₁…xₙ',480,384)+arrow(480,367,480,341)+text('h₁…hₙ',480,97);
    case 'encoder-residual':return flow([['X','输入'],['自注意力','位置间交换'],['Add & Norm','得到 U'],['FFN','逐位置变换'],['Add & Norm','输出 H']],169)+path('M121 169 V126 H468 V169')+text('保留 X',294,113,{size:16,color:C.green})+path('M468 261 V309 H815 V261')+text('保留 U',642,333,{size:16,color:C.green})+formula('U = LN(X + SelfAttn(X))；H = LN(U + FFN(U))',384);
    case 'ln-order':return [0,1].map(i=>text(i?'Pre-LN':'Post-LN',249+i*453,104,{weight:650})+box(133+i*453,126,230,60,i?'LN → F':'F','模块分支',i?C.bluePale:C.pale)+arrow(248+i*453,186,248+i*453,227)+box(133+i*453,229,230,52,'+ x')+path(`M${248+i*453} 126 V113 H${93+i*453} V256 H${133+i*453}`)+arrow(248+i*453,281,248+i*453,297)+box(133+i*453,298,230,50,i?'输出':'LN → 输出')).join('')+formula('布局改变梯度路径；训练表现还依赖深度与训练配置',388);
    case 'decoder-role':case 'cross-role':return flow([['源输入 x','完整可用'],['Encoder','源表示 Henc'],['Decoder','已有目标前缀'],['输出分布','预测下一词']])+path('M585 255 V298 H856 V255')+text('已生成 token 反馈为下步输入',703,328,{size:16,color:C.amber});
    case 'decoder-first':return box(70,213,170,71,'START / BOS','开始前缀',C.warm)+arrow(240,248,319,248)+box(321,206,238,84,'Decoder','读取源输入条件')+arrow(559,248,628,248)+lines(['学：0.0','深：0.8  ← 最大项','度：0.0','习：0.1','其他：0.1'],650,119);
    case 'autoregressive-feedback':return autoregression(step??3);
    case 'decoder-length':return flow([['已有输出','深 度 学 习'],['继续预测','还可能生成“惯”'],['问题','怎样知道结束？']])+formula('目标长度未知 → 为词表加入停止符');
    case 'decoder-stop':return autoregression(4,true)+formula('下一词预测为 EOS：停止当前序列',386);
    case 'decoder-block':return flow([['已有目标前缀','含位置表示'],['Masked MHA','只读取前缀'],['FFN','逐位置变换'],['输出预测','下一个 token']])+formula('每个子层配残差和归一化；稍后接入源侧交叉注意力');
    case 'causal-mask':return maskBody(step??3);
    case 'nar-length':return lines(['AR：BOS → w₁ → w₂ → w₃ → END','NAR：同时预测 w₁、w₂、w₃、…','长度：单独预测，或准备足够槽位并在 END 后截断'])+formula('AR 依赖前缀；NAR 尝试并行生成多个目标位置');
    case 'nar-multimodality':return flow([['同一个输入','多个合理答案'],['逐位置独立选择','可能混合不同模式'],['生成取舍','速度与一致性']])+formula('任务与依赖结构决定并行生成的适用方式');
    case 'cross-process':return crossBody(step??2);
    case 'training-loss':return flow([['源输入 x','编码条件'],['START','目标侧输入'],['预测分布','P(深)=0.8'],['真实标签','深：1']])+formula('L = −log P(深 | START, x) = −log 0.8');
    case 'teacher-forcing':return row('预测标签',['深','度','学','习','EOS'],113)+box(252,214,654,50,'带因果遮罩的 Decoder')+row('右移输入',['BOS','深','度','学','习'],293,C.bluePale)+[0,1,2,3,4].map(i=>arrow(304+i*134,292,304+i*134,264)+arrow(304+i*134,214,304+i*134,166)).join('');
    case 'greedy-tree':return box(48,203,149,58,'START')+arrow(197,219,272,165)+arrow(197,249,272,311)+[0,1].map(branch=>[branch?['B：0.4','B：0.9','B：0.9']:['A：0.6','B：0.6','A：0.4']].flat().map((label,i)=>box(274+i*220,130+branch*144,185,67,label,i===0?(branch?'另一条路径':'贪心路径'):'条件概率',branch?C.bluePale:C.warm)+(i?arrow(459+(i-1)*220,163+branch*144,492+(i-1)*220,163+branch*144):'')).join('')).join('')+formula('贪心 0.144；另一条 0.324',389);
    case 'bleu-definition':return flow([['候选与参考','n-gram 裁剪计数'],['p₁…pₘ','几何平均'],['BP','短句惩罚']])+formula('BLEU = BP × exp(∑ wₙ log pₙ)');
    case 'bleu-example':return lines(['候选：the cat sat on the mat','参考：the cat is on the mat','一元：the ×2、cat、on、mat → 5/6','二元：the cat、on the、the mat → 3/5'])+formula('BP = 1；BLEU₂ = √((5/6) × (3/5)) ≈ 0.7071');
    case 'metric-optimization':return flow([['模型分布','生成离散 token'],['完整输出','评价得到奖励'],['序列训练','按奖励更新参数']])+path('M765 253 V302 H179 V254')+formula('词级交叉熵与序列级评价，是不同优化目标');
    case 'exposure-bias':return lines(['训练输入：BOS 深 度 → 下一词“学”','推理输入：BOS 深 渡 → 当前前缀已变化','错误预测被反馈后，后续输入偏离训练中的真实前缀'])+formula('Scheduled Sampling 尝试在训练中混合两类前缀');
    case 'model-families':return flow([['Encoder-only','双向输入表示'],['Encoder–Decoder','源条件 → 目标生成'],['Decoder-only','同一前缀续写']])+formula('BERT                       T5                       GPT');
    case 't5':return flow([['输入文本','完整源序列'],['Encoder','双向源表示'],['Decoder','因果 + 交叉注意力'],['输出文本','条件生成']]);
    case 'decoder-choice':return flow([['提示 + 已生成前缀','同一序列'],['缓存历史 K、V','各层复用'],['计算当前 Q、K、V','读取历史缓存'],['预测下一词','追加到前缀']])+path('M797 254 V305 H152 V254')+formula('统一任务格式；缓存随长度与批大小占用空间');
    case 'vision-comparison':return flow([['CNN','局部性与平移先验'],['ViT','全局内容相关连接'],['取舍','数据、计算、任务']])+formula('先把二维图像转换为 token 序列');
    case 'patch-embedding':return image('image367.png',45,97,275,226,[70,794,275,276])+[1,2,3].map(i=>`<path d="M${70.5+i*56.5} 97 V323 M70.5 ${97+i*56.5} H296.5" stroke="white" stroke-width="1.5"/>`).join('')+arrow(321,214,389,214)+box(392,158,231,108,'展平每个 patch','P²C 个分量',C.bluePale)+arrow(623,211,679,211)+box(680,158,231,108,'共享线性投影','D 维 token')+formula('224 × 224，P=16 → 196 个 patch；每块 RGB 为 768 维');
    case 'vit-limitations':return flow([['P × P patch','N 个 token'],['patch 边长减半','4N 个 token'],['分数矩阵','N² → 16N²']])+formula('固定尺度 + 全局二次交互 → 引出层级与窗口');
    case 'window-cost':return lines(['全局 MSA：4hwC² + 2(hw)²C','窗口 W-MSA：4hwC² + 2M²hwC','窗口边长 M 固定时：分数项随 hw 线性增长'])+formula('相同投影项 4hwC²；变化的是位置交互项');
    case 'shifted-window':return shiftBody(step??2);
    case 'relative-bias':return flow([['query / key 位置','相对行列位移'],['偏置表','查出 Bᵢⱼ'],['加入分数','QKᵀ / √d + B'],['Softmax','形成权重']])+formula('窗口内各位置对，按相对位移共享偏置');
    case 'noisy-topk':return topkBody(step??2);
    case 'importance-cv':return importanceExamples.map((values,a)=>{const stat=cv(values);return values.map((v,i)=>rect(75+a*451+i*74,278-v*172,47,v*172,a?C.bluePale:C.warm)+text(v,98+a*451+i*74,299,{size:16})).join('')+text(a?'更均匀':'更集中',256+a*451,108,{weight:650})+text(`μ=${stat.mean.toFixed(2)}，σ=${stat.std.toFixed(3)}，CV=${stat.cv.toFixed(3)}`,256+a*451,342,{size:17});}).join('')+text('采用总体标准差：对全部专家统计',480,390,{size:16,color:C.muted});
    case 'cv-loss':return flow([['专家重要性 I','批次门控概率求和'],['CV(I)²','重要性差异惩罚'],['加权加入损失','共同更新参数']])+path('M776 254 V302 H180 V254')+formula('L = Ltask + wimportance × CV(I)²');
    case 'capacity-overflow':return capacityBody(step??5);
    case 'capacity-factor':return lines(['6 个 token，3 个专家：平均 2 个 / 专家','容量因子 1.0：单专家容量 2，偏斜路由可能溢出','容量因子 1.5：单专家容量 3，允许更多偏斜，也有空槽'])+formula('C = ceil(c × T / E)；激活路径数改变时需核对容量约定');
    case 'switch-loss':return row('实际 token 数',[3,1,2],129)+row('比例 fᵢ',['3/6','1/6','2/6'],216,C.bluePale)+formula('Laux = α E ∑ᵢ fᵢpᵢ；pᵢ 是批内平均路由概率');
    case 'device-balance':return flow([['设备 A','E1 + E2'],['设备 B','E3 + E4'],['设备统计','汇总各自专家的 f、p']])+formula('专家均衡：细粒度利用；设备均衡：通信与计算负载');
    case 'batch-effects':return flow([['同一个 token','路由分数相同'],['同批其他 token','占用有限槽位'],['当前专家满员','重路由或 overflow']])+formula('批次容量 + 丢弃策略 → 计算路径可能依赖同批输入');
    case 'routing-variants':return lines(['Top-k：按当前分数选择少数专家','Hash：按固定映射分配','RL：学习离散路径策略','Matching：优化整体 token—expert 分配']);
    case 'moe-summary':return flow([['稀疏容量','更多总参数'],['路由与均衡','有效使用专家'],['激活与系统','计算、存储、通信']])+formula('结合任务效果与实测成本评价 MoE');
    default:throw new Error(`Missing diagram ${item.id}`);
  }
}
const svg=(item,body)=>`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="417" viewBox="0 0 960 417" role="img" aria-label="${esc(item.title)}"><title>${esc(item.title)}</title><desc>${esc(item.note)}</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10" fill="none" stroke="context-stroke" stroke-width="1.5"/></marker></defs><rect width="960" height="417" fill="#fbfdfb"/><g font-family="PingFang SC,Microsoft YaHei,Arial,sans-serif">${text(item.title,46,39,{size:22,weight:650,anchor:'start'})}${text(item.caption,46,65,{size:13,color:C.muted,anchor:'start'})}${body}</g></svg>\n`;
const manifest={schema:'transformer-courseware-diagrams/v2',sourceSha256:facts.sha256,diagrams:[],assets:[],excludedMedia:[{file:'image329.png',reason:'重复辅助对象；束搜索只保留每步的候选树。'},{file:'image340.png',reason:'束搜索组合中的 k⁴ 注释；该步候选树为 image342.png。'},{file:'image299.png',reason:'辅助遮罩对象；使用完整三种连接范围原图。'},{file:'image397.png',reason:'密集预测插图的独立标题；正文已保留其含义。'},{file:'image439.png',reason:'CV 数值使用统一总体标准差重绘，纠正统计与舍入不一致。'},{file:'image441.png',reason:'另一组 CV 原始图；保留向量后按同一统计定义重绘。'},{file:'image355.png',reason:'BLEU 等权几何平均公式数值错误，保留句子与计数后重算。'}]};
for(const item of slides){
  const body=item.id==='transformer-task'?text('输入：深度学习',314,103,{weight:650})+box(54,139,202,65,'Encoder')+arrow(256,171,327,171)+box(329,139,202,65,'Decoder','输出：Deep Learning',C.bluePale)+image('image8.png',48,247,519,137)+image('image9.png',650,87,263,296):item.id==='beam-example'?beamImage('image349.png',77):Array.isArray(item.visual)?sourceImages(item.visual):nativeBody(item);
  writeFileSync(join(output,`${item.id}.svg`),svg(item,body));
  manifest.diagrams.push({id:item.id,file:`diagrams/transformer/${item.id}.svg`,sourcePages:item.sourcePages,decision:Array.isArray(item.visual)?'preserve-source-figure':'redraw',title:item.title});
  const sequence=sequences[item.id];if(!sequence)continue;
  sequence.steps.forEach((_,i)=>writeFileSync(join(output,`${item.id}-step-${i}.svg`),svg(item,sequence.kind==='images'?beamImage(sequence.files[i],65+i):nativeBody(item,i))));
}
manifest.assets=[...assets.values()].map(({data,...a})=>a);
manifest.videos=Object.entries(videos).map(([id,config])=>{
  const source=facts.slides[config.sourcePage-1],part=`ppt/media/${config.file}`,entry=source.assets.find(a=>a.part===part);
  if(!entry||!source.objects.some(o=>o.mediaRelationships.includes(entry.relationshipId)))throw new Error(`Not a displayed source video: ${part}`);
  const data=execFileSync('unzip',['-p',ppt,part]);writeFileSync(join(media,config.file),data);
  return {id,file:`media/transformer/${config.file}`,sourcePage:config.sourcePage,sha256:entry.sha256,crop:config.crop};
});
writeFileSync(join(build,'diagram-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Generated ${slides.length} diagrams, ${Object.keys(sequences).length} sequences and ${assets.size} original source images.`);
