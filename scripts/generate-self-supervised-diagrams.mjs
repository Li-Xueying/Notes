import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {slides,sequences,maeExample,contrastiveExample} from './self-supervised-course-data.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const build=join(root,'..','AI工程学','.course-build','05-self-supervised');
const facts=JSON.parse(readFileSync(join(build,'source-review.json')));
const ppt=join(root,'..','AI工程学','PPT材料','Self-supervised Learning.pptx');
const output=join(root,'diagrams','self-supervised'),media=join(root,'media','self-supervised');
mkdirSync(output,{recursive:true});mkdirSync(media,{recursive:true});
const C={ink:'#263f35',muted:'#5d7469',green:'#176653',pale:'#e9f3ee',line:'#a8c2b4',blue:'#426f91',bluePale:'#edf3f8',red:'#ac4f53',rose:'#f9eeee',amber:'#986525',warm:'#fcf3df'};
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const T=(v,x,y,size=18,color=C.ink,anchor='middle')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+color+'" text-anchor="'+anchor+'">'+esc(v)+'</text>';
const R=(x,y,w,h,fill='white',stroke=C.line)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="4" fill="'+fill+'" stroke="'+stroke+'"/>';
const B=(x,y,w,h,title,detail='',fill=C.pale)=>R(x,y,w,h,fill)+T(title,x+w/2,y+h/2-(detail?6:-6),18)+(detail?T(detail,x+w/2,y+h/2+20,14,C.muted):'');
const A=(x1,y1,x2,y2,color=C.green)=>'<path d="M'+x1+' '+y1+' L'+x2+' '+y2+'" fill="none" stroke="'+color+'" stroke-width="2" marker-end="url(#arrow)"/>';
const P=(d,color=C.green)=>'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2" marker-end="url(#arrow)"/>';
const F=(v,y=390)=>R(42,y-28,876,48,'#f5f9f6','#d7e5dc')+T(v,480,y+3,18,C.green);
const flow=(items,y=170)=>items.map(([title,detail],i)=>{
  const stride=876/items.length,x=42+i*stride,w=stride-28;
  return B(x,y,w,82,title,detail,i%2?C.bluePale:C.pale)+(i<items.length-1?A(x+w,y+41,x+stride-6,y+41):'');
}).join('');
const assets=new Map();
function asset(name){
  if(!assets.has(name)){
    const sources=facts.slides.flatMap(p=>p.assets.filter(a=>a.part==='ppt/media/'+name&&p.objects.some(o=>o.imageRelationships.includes(a.relationshipId))).map(a=>({...a,sourcePage:p.sourcePage})));
    if(!sources.length)throw new Error('Not a displayed source asset: '+name);
    const data=execFileSync('unzip',['-p',ppt,'ppt/media/'+name],{maxBuffer:40*1024*1024});
    writeFileSync(join(media,name),data);
    assets.set(name,{name,sha256:sources[0].sha256,bytes:data.length,sourcePages:sources.map(s=>s.sourcePage),data});
  }
  return assets.get(name);
}
const image=(name,x,y,w,h)=>{
  const a=asset(name),mime=/jpe?g$/i.test(name)?'image/jpeg':'image/png';
  return '<image href="data:'+mime+';base64,'+a.data.toString('base64')+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid meet"/>';
};
const crop=(name,x,y,w,h,viewBox)=>'<svg x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" viewBox="'+viewBox+'" preserveAspectRatio="xMidYMid meet">'+image(name,0,0,1072,503)+'</svg>';
function sourceImages(s){
  const names=s.visual;
  if(s.id==='mae-reconstruction'){
    return image(names[0],130,110,780,300)+T('50%',80,190,19,C.red)+T('75%',80,341,19,C.red)+['掩码输入','重建','重建+可见','原图'].map((v,i)=>T(v,227+i*194,102,16)).join('');
  }
  if(s.id==='visual-tasks')return image(names[0],42,130,876,265)+['分类','语义分割','目标检测','实例分割'].map((v,i)=>T(v,151+i*218,111,18)).join('');
  if(s.id.startsWith('video-results'))return ['参考彩色帧','目标灰度帧','预测颜色'].map((v,i)=>T(v,188+i*292,109,17)).join('')+image(names[0],42,126,876,277);
  const labels={
    'pretext-examples':['补全','旋转','拼图','灰度着色'],
    'inpainting-results':['输入上下文','仅重建','仅对抗','重建+对抗'],
    'mae-decoder-ablation':['解码深度：blocks','解码宽度：dim'],
    'transfer-evidence':['分类错误率 ↓','检测指标 ↑'],
    'lab-channels':['分离 L 与 ab','预测后与 L 合并'],
  }[s.id];
  if(names.length===2&&['lab-channels','split-brain'].includes(s.id))
    return names.map((n,i)=>image(n,42,108+i*148,876,136)+(labels?T(labels[i],480,101+i*148,15,C.muted):'')).join('');
  return names.map((n,i)=>{
    const stride=876/names.length;
    return image(n,42+i*stride,labels?133:98,stride-12,labels?268:308)+(labels?T(labels[i],42+i*stride+(stride-12)/2,115,16):'');
  }).join('');
}
function mae(state){
  let out=T('原始位置：4×4 结构示例',150,112,16);
  for(let i=0;i<16;i++){
    const visible=maeExample.visible.includes(i),masked=state>0&&!visible;
    out+=R(42+(i%4)*52,130+Math.floor(i/4)*45,47,40,masked?'#f0f0ef':C.bluePale);
    out+=T(masked?'×':i+1,65+(i%4)*52,157+Math.floor(i/4)*45,17,masked?C.muted:C.blue);
  }
  if(state>=1)out+=A(252,220,305,220)+maeExample.visible.map((v,i)=>B(308,125+i*48,76,39,'p'+(v+1),'',C.bluePale)).join('')+T('可见块 + 位置',346,338,15);
  if(state>=2)out+=A(386,220,432,220)+B(435,151,122,138,'编码器','仅 4 块')+A(558,220,604,220);
  if(state>=3){
    out+=T('恢复原位置',659,112,15);
    for(let i=0;i<16;i++)out+=R(605+(i%4)*28,133+Math.floor(i/4)*42,25,36,maeExample.visible.includes(i)?C.pale:C.warm)+T(maeExample.visible.includes(i)?'h':'M',617+(i%4)*28,157+Math.floor(i/4)*42,14);
    out+=T('h：表征；M：共享掩码',669,333,13);
  }
  if(state>=4)out+=A(718,220,752,220)+B(755,151,107,138,'解码器','轻量')+T('预测 16 块',808,324,15);
  if(state>=5)out+=P('M809 289 V353 H485')+B(294,337,188,39,'只算 12 块误差','',C.rose);
  return out+F(state===0?'N=16；原位置保持稳定':state===1?'75% 掩码；可见位置 p1、p6、p11、p16':state===2?'编码器不接收 mask token':state===3?'补回掩码位置，并加入解码器位置编码':state===4?'完整 16 位置序列进入解码器':'监督来自原像素，损失只比较缺失块',412);
}
function contrastive(state){
  const cx=state===2?395:480;
  let out=crop('image91.png',cx-49,225,98,127,'305 321 123 166')+T('锚点 x',cx,374,17);
  ['image24.png','image25.png','image26.png','image27.png'].forEach((n,i)=>{
    const x=55+i*185;
    out+=image(n,x,104,120,105)+T('x⁺：同图视图',x+60,227,15,C.green)+A(cx,258,x+60,210);
  });
  if(state>=1)out+=crop('image91.png',764,250,145,122,'727 321 198 166')+T('x⁻：另一图像',836,393,16,C.red)+A(cx+52,286,759,286,C.red);
  return out+T(state===2?'正对距离缩短；负对保持区分':'来源身份定义配对关系',450,424,17,C.green);
}
function affinity(row){
  let out=T('视图配对：(1,2)、(3,4)、(5,6)',480,110,19);
  const positive=row^1;
  for(let i=0;i<6;i++){
    out+=T(i+1,289+i*49,145,16)+T(i+1,245,185+i*36,16);
    for(let j=0;j<6;j++){
      const self=i===j,pos=j===(i^1);
      out+=R(265+j*49,161+i*36,47,34,self?'#ededeb':pos?C.bluePale:i===row?C.warm:'white',i===row?C.blue:C.line)+T(self?'×':pos?'正':'负',288+j*49,183+i*36,15,self?C.muted:pos?C.blue:C.ink);
    }
  }
  out+=B(633,180,265,77,'当前锚点 '+(row+1),'正列 '+(positive+1)+'；自身列 '+(row+1)+' 排除')+P('M634 274 H574 V'+(178+row*36));
  return out+F('每行 5 个候选：1 个正样本 + 4 个负样本',415);
}
function fifo(state){
  const keys=state===2?[3,4,5,6]:[1,2,3,4];
  let out=T('队首（最旧）',145,142,16,C.red)+T('队尾（最新）',705,142,16,C.green);
  out+=keys.map((k,i)=>B(65+i*186,160,159,77,'K'+k,'',k>=5?C.pale:C.bluePale)).join('');
  out+=T('固定容量 4',856,205,15);
  if(state>=1)out+=B(65,278,159,58,state===2?'移除 K1、K2':'当前查询 q','',state===2?C.rose:C.pale)+B(565,278,295,58,state===2?'保留 K3–K6':'当前新键 K5、K6','',C.warm);
  if(state===1)out+=P('M145 278 V253 H612 V239')+T('使用旧队列计算 loss',400,279,17);
  if(state===2)out+=P('M709 278 V248 H713 V238')+P('M145 238 V278',C.red);
  return out+F(state===0?'历史键已保存，不保留反向传播激活':state===1?'当前损失计算完成后，才维护队列':'下一轮使用更新后的队列',409);
}
function dino(state){
  let out=B(58,287,181,66,'同一图像','多裁剪',C.bluePale);
  out+=B(318,246,193,67,'学生 θs','2 全局 + 8 局部')+B(650,246,243,67,'教师 θt','2 全局 / stop-grad',C.warm);
  out+=A(239,302,315,280)+P('M150 287 V227 H770 V244');
  if(state>=1)out+=A(411,246,411,200)+B(318,146,193,51,'学生分布 ps')+A(771,246,771,200)+B(650,146,243,51,'教师分布 pt','',C.warm)+P('M650 170 H553 V108')+P('M411 146 V108 H512')+B(402,69,205,39,'跨视图交叉熵');
  if(state>=2)out+=P('M402 88 H278 V281 H315',C.red)+T('梯度更新学生',161,153,16,C.red);
  if(state>=3)out+=A(511,280,647,280)+T('EMA',580,269,17,C.green);
  return out+F(state===0?'教师和学生读取同图不同视图':state===1?'排除同一视图；教师目标停止梯度':state===2?'优化器只更新学生参数':'EMA 更新教师，下一轮产生新的目标',409);
}
function barDistribution(temp=1,center=false){
  const logits=center?[1,0,-1]:[2,1,0],exps=logits.map(v=>Math.exp(v/temp)),sum=exps.reduce((a,b)=>a+b,0);
  return exps.map((v,i)=>{const p=v/sum;return R(530+i*112,337-p*198,75,p*198,C.bluePale,C.blue)+T(p.toFixed(3),567+i*112,363,17)+T('原型 '+(i+1),567+i*112,391,15);}).join('');
}
function custom(s){
  switch(s.visual){
    case 'route':return flow([['动机与评估','标注、表征与迁移'],['传统代理任务','空间、变换与重建'],['现代方法','对比、队列与蒸馏']])+F('先看目标从哪里来，再看表征是否有用');
    case 'label-bottleneck':return flow([['收集标签','任务专属'],['设计与训练','模型 + 目标'],['部署评价','检查泛化']])+B(222,286,516,59,'目标标注有限：能否复用已有特征？','',C.warm);
    case 'transfer':return T('从头训练',121,119,19)+flow([['较多目标标签','同时学特征与头'],['编码器 + 头','输出目标类别']],145)+T('迁移学习',121,275,19)+flow([['大源数据','预训练编码器'],['小目标数据','换头 / 微调'],['目标评价','k ≪ n']],300);
    case 'supervision':return flow([['监督学习','图像 + 人工标签'],['目标误差','更新模型']],134)+flow([['自监督学习','由数据构造目标'],['代理误差','更新编码器']],279);
    case 'pretext':return flow([['原图数据','无人工类别标签'],['编码器','学到表征'],['代理头','预测自动目标']],156)+P('M797 239 V307 H425 V240',C.red)+T('目标比较 → 梯度更新',600,337,17,C.red);
    case 'downstream':return flow([['目标图像','少量应用标签'],['已学编码器','保留表征'],['新任务头','类别 / 框 / 区域']],160)+F('代理头被替换；编码器冻结或微调');
    case 'evaluate':case 'probe-finetune':return flow([['冻结编码器','固定特征'],['训练线性头','使用目标标签'],['线性探测','检查可分性']],137)+flow([['更新编码器','目标任务适配'],['训练任务头','使用目标标签'],['微调评价','检查适配效果']],280);
    case 'rotation-transfer':return flow([['未标注图像','施加旋转'],['预训练编码器','预测 90° 等角度']],132)+P('M658 213 V245 H380 V278')+flow([['目标图像','少量鸟类别标签'],['编码器 + 线性头','输出鸟类别'],['目标评价','独立数据']],279);
    case 'traditional-summary':return flow([['数据结构','空间 / 时间 / 通道'],['代理预测','视觉常识任务'],['迁移表征','下游评价']],133)+B(154,270,652,70,'统一的视图任务','同图不同变换，保留来源身份',C.warm);
    case 'video-match':return image('image57.png',60,110,470,175)+B(592,130,302,70,'固定目标 j','参考 i=1…R')+T('Aij：参考 i → 目标 j',300,319,19)+F('对每个目标 j，参考权重沿 i 求和为 1');
    case 'video-color':return image('image57.png',60,105,490,195)+flow([['参考颜色 ci','输入'],['加权 ∑i Aij ci','目标预测 yj']],310);
    case 'video-loss':return flow([['编码器','位置特征'],['匹配与复制','预测 yj'],['颜色损失','比较真值 cj']],149)+P('M794 230 V310 H187 V234',C.red)+T('梯度：损失 → 复制 → 匹配 → 编码器',480,344,18,C.red);
    case 'inpainting-loss':return flow([['掩码上下文','(1−M)⊙x'],['生成器 F','重建缺失区'],['像素重建','只比较 M 内']],127)+B(605,280,280,63,'判别器 D','真图 / 重建真假')+P('M480 209 V311 H601')+P('M745 280 V259 H480 V209',C.red)+T('F 最小化；D 最大化',265,319,18);
    case 'mae-mask':return mae(1);
    case 'mae-encode':return mae(2);
    case 'mae-decode':return mae(4);
    case 'mae-loss':return mae(5);
    case 'contrastive':return contrastive(2);
    case 'contrastive-score':return image('image98.png',48,123,330,240)+image('image99.png',620,120,280,241)+T('正对：s+ 较高',446,187,19,C.green)+T('负对：s− 较低',446,274,19,C.red);
    case 'infonce-probability':case 'infonce-loss':{
      const e=contrastiveExample.scores.map(v=>Math.exp(v)),sum=e.reduce((a,b)=>a+b,0),p=e[0]/sum;
      return contrastiveExample.scores.map((v,i)=>B(48+i*228,115,185,87,i?'负候选 '+i:'正候选','分数 '+v,i?C.bluePale:C.pale)+T('exp = '+e[i].toFixed(3),139+i*228,236,18)+T('p = '+(e[i]/sum).toFixed(3),139+i*228,292,19)).join('')+F(s.visual==='infonce-loss'?'结构算例：−log p+ = '+(-Math.log(p)).toFixed(3):'结构算例：p+ = exp(2) / ∑ exp = '+p.toFixed(3));
    }
    case 'infonce-mi':return B(141,137,678,83,'I(f(x); f(x⁺)) ≥ log N − 𝓛N','下界由候选数量和预测损失共同确定')+B(141,272,678,65,'正样本：联合关系；负样本：独立边缘抽样','',C.warm);
    case 'simclr':return image('image103.png',51,99,386,292)+B(516,138,384,72,'h = f(增强图像)','下游使用表征',C.bluePale)+A(708,211,708,254)+B(516,259,384,72,'z = g(h)','对比损失作用于 z');
    case 'simclr-batch':return ['图 A','图 B','图 C'].map((v,i)=>B(61+i*302,117,232,53,v)+A(177+i*302,171,177+i*302,213)+B(60+i*302,220,111,65,'视图 '+(2*i+1),'',C.bluePale)+B(186+i*302,220,111,65,'视图 '+(2*i+2),'',C.bluePale)).join('')+F('B=3 结构示例：每个锚点的候选 = 1 正 + 4 负');
    case 'affinity':return affinity(0);
    case 'moco':case 'moco-momentum':return B(62,251,239,67,'查询编码器 θq','梯度更新')+B(62,126,239,59,'查询 q')+A(181,251,181,189)+B(570,251,315,67,'键编码器 θk','停止梯度 / EMA',C.bluePale)+B(570,126,315,59,'正键 k⁺ + 历史负键','',C.bluePale)+A(726,251,726,189)+P('M302 157 H451 V96')+P('M570 157 H511 V96')+B(374,63,213,49,'对比损失')+P('M374 86 H36 V283 H60',C.red)+A(301,283,566,283)+T('EMA 参数更新',432,274,15)+F(s.visual==='moco-momentum'?'θk ← m θk + (1−m) θq':'队列键数与当前批量解耦');
    case 'fifo':return fifo(2);
    case 'dino-views':return B(53,156,191,86,'同一原图','多裁剪',C.bluePale)+A(245,198,309,198)+B(313,112,256,69,'2 个全局视图','224×224')+B(313,252,256,69,'8 个局部视图','96×96',C.warm)+A(570,147,642,147)+B(646,112,264,69,'教师','只读 2 全局')+P('M570 161 H608 V286 H642')+A(570,286,642,286)+B(646,252,264,69,'学生','读全部 10 视图',C.warm)+F('面积比例：全局 40%–100%；局部 5%–40%');
    case 'dino-loss':return B(46,139,297,81,'教师：2 全局','pt 停止梯度')+A(346,179,417,179)+B(423,126,480,105,'每个全局匹配其余 9 学生视图','2×9 = 18 个交叉熵项',C.bluePale)+F('同一视图配对排除；有效项等权平均');
    case 'dino-center':return flow([['教师 logits zt','K 维分数'],['减中心 c','逐维 EMA'],['除温度 τt','Softmax']],170)+F('中心来自 logits 批均值，c 与 zt 维度相同');
    case 'dino-sharpen':return B(53,153,363,72,'同一 logits：[2,1,0]','温度 1 → 0.5')+T('τ=0.5 的概率',694,125,17)+barDistribution(.5)+T('低温度放大概率差异',233,294,18,C.green);
    case 'dino-ema':return dino(3);
    case 'summary':return flow([['产生监督','任务 / 视图 / 教师'],['保留表征','编码器'],['检验用途','冻结 / 微调 / 迁移']],162)+F('输入输出、标签来源、更新范围、评价条件');
    default:throw new Error('Missing diagram '+s.visual);
  }
}
function svg(s,body,description=s.note){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="440" viewBox="0 0 960 440" role="img" aria-labelledby="title desc"><title id="title">'+esc(s.title)+'</title><desc id="desc">'+esc(description)+'</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="context-stroke"/></marker></defs><rect width="960" height="440" fill="#fff"/><g font-family="PingFang SC,Microsoft YaHei,sans-serif">'+T(s.title,42,39,22,C.ink,'start')+'<path d="M42 63 H918" stroke="#d7e5dc"/>'+body+'</g></svg>\n';
}
for(const s of slides){
  writeFileSync(join(output,s.id+'.svg'),svg(s,Array.isArray(s.visual)?sourceImages(s):custom(s)));
  if(sequences[s.id]){
    const sequence=sequences[s.id];
    sequence.frames.forEach((frame,i)=>{
      const body=sequence.type==='mae'?mae(frame):sequence.type==='contrastive'?contrastive(frame):sequence.type==='affinity'?affinity(frame):sequence.type==='fifo'?fifo(frame):dino(frame);
      writeFileSync(join(output,s.id+'-step-'+i+'.svg'),svg(s,body,sequence.steps[i]));
    });
  }
}
writeFileSync(join(build,'diagram-manifest.json'),JSON.stringify({
  sourceSha256:facts.sha256,
  diagrams:slides.map(s=>({id:s.id,sourcePages:s.sourcePages,file:'diagrams/self-supervised/'+s.id+'.svg',visual:s.visual,alt:s.title+'。'+s.caption,caption:s.caption,sequence:sequences[s.id]||null})),
  assets:[...assets.values()].map(({data,...a})=>a),
  crops:[{diagram:'contrastive-pairs',asset:'image91.png',originalSize:[1072,503],regions:{anchor:[305,321,123,166],negative:[727,321,198,166]},purpose:'保留原猫与犬身份；完整原图仍保存在媒体目录'}],
  excluded:['image1.png','image2.png','image3.png','image92.png','image93.png','image94.png','image95.png'],
},null,2)+'\n');
console.log('Generated '+slides.length+' diagrams, '+Object.keys(sequences).length+' sequences and '+assets.size+' verified source images.');
