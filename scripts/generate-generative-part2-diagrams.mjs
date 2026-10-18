import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {slides,sequences,ganStates,flowExample,eulerStates,cfgExample} from './generative-part2-course-data.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const build=join(root,'..','AI工程学','.course-build','06-generative','part2');
const out=join(root,'diagrams','generative','part2');
mkdirSync(out,{recursive:true});
const manifest=JSON.parse(readFileSync(join(build,'asset-manifest.json')));
const assets=new Map(manifest.assets.map(a=>[a.id,a]));
const C={ink:'#283b34',muted:'#63766c',green:'#2f7253',pale:'#eaf3ed',blue:'#306b87',bluePale:'#eaf2f8',warm:'#fff1d7',rose:'#f9e7e3',red:'#ab4d42',line:'#ccdbd2',ochre:'#9a701c'};
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const T=(v,x,y,size=18,color=C.ink,anchor='middle')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+color+'" text-anchor="'+anchor+'">'+esc(v)+'</text>';
const R=(x,y,w,h,fill=C.pale)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="4" fill="'+fill+'" stroke="'+C.line+'"/>';
const B=(x,y,w,h,title,sub='',fill=C.pale)=>R(x,y,w,h,fill)+T(title,x+w/2,y+(sub?29:h/2+6),18)+sub.split('\n').filter(Boolean).map((line,i)=>T(line,x+w/2,y+54+i*22,14,C.muted)).join('');
const P=(d,color=C.green)=>'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2" marker-end="url(#arrow)"/>';
const A=(x,y,x2,y2,c=C.green)=>P('M'+x+' '+y+' L'+x2+' '+y2,c);
const F=(v,y=414)=>T(v,480,y,17,C.muted);
const pair=v=>'('+v.map(n=>Number(n.toFixed(3))).join(', ')+')';
const flow=(items,y=170)=>items.map(([title,sub],i)=>{const w=(876-(items.length-1)*46)/items.length,x=42+i*(w+46);return B(x,y,w,90,title,sub,i%2?C.pale:C.bluePale)+(i<items.length-1?A(x+w+3,y+45,x+w+42,y+45):'');}).join('');
function image(id,x=42,y=78,w=876,h=352){
  const a=assets.get(id);if(!a)throw new Error('Missing asset '+id);
  return '<image href="data:image/png;base64,'+readFileSync(join(root,a.output)).toString('base64')+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid meet"/>';
}
function gan(kind){
  let b=B(42,126,122,75,'噪声 z','简单先验',C.warm)+A(168,164,204,164)+B(208,126,150,75,'生成器 G','参数 θ')+A(362,164,398,164)+B(402,126,164,75,'假样本 G(z)','由 G 定义 pG',C.bluePale);
  if(kind==='generator')return b+F('从先验取样后，一次前向得到生成样本');
  b+=B(402,285,164,75,'真实样本 x','来自 pdata',C.bluePale)+P('M570 164 H605 V227 H646')+P('M570 322 H605 V247 H646')+B(650,199,145,75,'判别器 D','参数 ψ')+A(799,237,835,237)+T('真假分数',880,244,17);
  if(kind==='update-d')b+=T('冻结 θ',284,111,17,C.muted)+T('更新 ψ',722,182,18,C.red)+F('提高 D(x)，降低 D(G(z))；G 的输出停止梯度');
  else if(kind==='update-g')b+=T('更新 θ',284,111,18,C.red)+T('冻结 ψ',722,182,17,C.muted)+P('M721 195 V91 H284 V122',C.red)+F('梯度穿过 D 的输入回到 G；真实分支与 θ 无关');
  else b+=F(kind==='minimax'?'D 最大化真假分类价值，G 通过生成分支最小化':'两条样本路径共享同一个判别器');
  return b;
}
function alternating(index){
  const values=ganStates(),s=values[index];
  return T('结构算例：真实 x=1，噪声 z=1，学习率 0.2',480,102,18)+B(42,142,260,110,'G(z)=g z','g='+s.g.toFixed(4)+'\n假样本='+s.fake.toFixed(4),index===2?C.warm:C.bluePale)+A(306,197,347,197)+B(351,142,310,110,'D(u)=sigmoid(a u+b)','a='+s.a.toFixed(4)+'\nb='+s.b.toFixed(4),index===1?C.warm:C.pale)+A(665,197,706,197)+B(710,142,208,110,'当前分数','D(真)='+s.realScore.toFixed(4)+'\nD(假)='+s.fakeScore.toFixed(4),C.bluePale)+B(157,309,646,65,s.stage,'同一步更新只改变一方的参数',C.rose)+F('分数由当前参数重算；G 使用非饱和损失',421);
}
function saturation(both){
  const x0=83,y0=352,w=388,h=228;
  let b=A(x0,y0,x0+w+8,y0,C.muted)+A(x0,y0,x0,101,C.muted)+T('D(G(z))',x0+w/2,389,16)+T('损失',83,90,16)+T('0',75,372,13)+T('1',477,372,13);
  for(const value of both?[-4,-2,0,2,4]:[-4,-3,-2,-1,0]){
    const y=y0-(value+4.7)/(both?9.4:4.7)*h;
    b+='<path d="M79 '+y+' H87" stroke="'+C.muted+'"/>'+T(value,69,y+5,13,C.muted);
    if(value===0)b+='<path d="M87 '+y+' H471" stroke="'+C.line+'" stroke-dasharray="4 4"/>';
  }
  for(const [type,color] of [['minimax',C.blue],...(both?[['ns',C.red]]:[])]){
    const points=Array.from({length:99},(_,i)=>{const p=(i+1)/100,value=type==='ns'?-Math.log(p):Math.log(1-p),scaled=both?(value+4.7)/9.4:(value+4.7)/4.7;return [x0+p*w,y0-scaled*h];});
    b+='<polyline points="'+points.map(p=>p.join(',')).join(' ')+'" stroke="'+color+'" stroke-width="3" fill="none"/>';
  }
  b+=B(548,134,354,92,'D=0.01：原始目标','logit 导数 −0.01',C.bluePale);
  if(both)b+=B(548,258,354,92,'D=0.01：非饱和目标','logit 导数 −0.99',C.rose)+T('蓝：log(1−D)；红：−log D',284,421,15,C.muted);
  else b+=B(548,258,354,92,'必须保留链式求导','损失 → sigmoid → D → G',C.warm);
  return b;
}
function interpolation(index){
  const e=flowExample,t=e.times[index],u=e.x.map((v,i)=>(1-t)*v+t*e.z[i]),map=p=>[650+p[0]*75,250-p[1]*65],x=map(e.x),z=map(e.z),point=map(u);
  return B(42,117,396,95,'固定数据 x=(2,−1)','固定噪声 z=(−1,2)',C.bluePale)+B(42,242,396,96,'t='+t+'，xₜ='+pair(u),'v=z−x=(−3,3)',C.warm)+A(...x,...z,C.green)+'<circle cx="'+x[0]+'" cy="'+x[1]+'" r="7" fill="'+C.red+'"/><circle cx="'+z[0]+'" cy="'+z[1]+'" r="7" fill="'+C.blue+'"/><circle cx="'+point[0]+'" cy="'+point[1]+'" r="10" fill="'+C.green+'"/>'+T('x：数据端点',x[0],x[1]+31,16,C.red)+T('z：噪声端点',z[0],z[1]-25,16,C.blue)+T('xₜ',point[0]+26,point[1]+7,17,C.green)+F('绿色箭头：时间增加方向；生成时沿负时间方向移动');
}
function euler(index){
  const states=eulerStates(),s=states[index],map=p=>[833+145*p[0],366-105*p[1]],labels=['x₁','x₂/₃','x₁/₃','x₀'];
  let b=B(42,120,403,102,'三步 Euler：当前 t='+Number(s.t.toFixed(3)),'当前状态 '+pair(s.x),C.bluePale)+B(42,255,403,96,index===3?'完成，返回 x₀':'当前位置的速度 '+pair(s.velocity),index===3?'不在 t=0 再更新':'下一步 x ← x−v/3',index===3?C.pale:C.warm);
  b+=A(553,366,902,366,C.muted)+A(833,366,833,88,C.muted)+T('u₁',911,372,15)+T('u₂',823,88,15)+T('0',823,386,14,C.muted);
  states.slice(0,index+1).forEach((v,i)=>{const p=map(v.x);if(i){const previous=map(states[i-1].x);b+=A(...previous,...p,C.green);}b+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="7" fill="'+(i===index?C.red:C.green)+'"/>'+T(labels[i],p[0]+30,p[1]+5,16);});
  if(index<3){const a=map(s.x),next=map(states[index+1].x);b+=P('M'+a.join(' ')+' L'+next.join(' '),C.ochre)+T('−v/3',Math.min(865,a[0]+70),Math.max(99,(a[1]+next[1])/2),15,C.ochre);}
  return b+F('结构场 f(u,t)=(u₁+t,2u₂−t)；每次移动后重新求值');
}
function cfg(index){
  const e=cfgExample,origin=[632,321],scale=45,move=v=>[origin[0]-scale*v[0],origin[1]-scale*v[1]],u=move(e.unconditional),c=move(e.conditional);
  let b=B(42,112,391,99,'固定同一 xₜ 与 t','vᵤ=(1,2)，v꜀=(−1,2)',C.bluePale)+A(...origin,...u,C.ochre)+T('−vᵤ',u[0]-22,u[1]-12,17,C.ochre);
  if(index>0){const w=e.weights[index-1],v=e.conditional.map((n,i)=>(1+w)*n-w*e.unconditional[i]),end=move(v);b+=A(...origin,...c,C.blue)+T('−v꜀',c[0],c[1]-25,17,C.blue)+A(...origin,...end,C.green)+T('−vCFG',end[0],end[1]-5,17,C.green)+B(42,251,391,96,'w='+w+'：vCFG='+pair(v),'生成移动方向 '+pair(v.map(n=>-n)),C.warm);}
  else b+=B(42,251,391,96,'先看无条件分支','之后在同点比较条件差异',C.warm);
  return b+'<circle cx="'+origin[0]+'" cy="'+origin[1]+'" r="7" fill="'+C.ink+'"/>'+T('当前状态 xₜ',origin[0],origin[1]+32,17)+F('箭头表示实际生成方向 −v；组合后再乘负时间步长');
}
function conditionalMean(){
  const center=[695,242],starts=[[550,329],[612,359],[847,319]],ends=starts.map(p=>center.map((v,i)=>2*v-p[i]));
  return B(42,128,396,111,'同一个中间状态','可能来自多个 (x,z) 配对',C.bluePale)+B(42,285,396,71,'最优预测 = 条件平均速度','',C.warm)+starts.map((p,i)=>A(...p,...ends[i],[C.red,C.blue,C.ochre][i])).join('')+'<circle cx="695" cy="242" r="11" fill="'+C.green+'"/>'+T('xₜ=u',695,274,17)+F('只对能够产生这个 u、t 的配对求平均');
}
function custom(s){
  switch(s.visual){
    case 'bridge':return flow([['自回归','显式条件似然'],['VAE','变分下界'],['GAN','可采样隐式分布']])+F('仍然学习数据分布；改变提供训练信号的方法');
    case 'generator':case 'discriminator':case 'minimax':case 'update-d':case 'update-g':return gan(s.visual);
    case 'alternating':return alternating(2);
    case 'saturation':return saturation(false);
    case 'non-saturating':return saturation(true);
    case 'optimal-d':return flow([['固定生成分布','pG 不变'],['逐点最大化','真密度×log D\n假密度×log(1−D)'],['最优判别','真密度 / 两密度之和']])+F('仅在两分布密度和为正处定义');
    case 'match':return B(67,133,387,115,'pG = pdata','所有位置的来源比例相同',C.bluePale)+A(459,191,507,191)+B(512,133,387,115,'D* = 1/2','理想判别器也无法区分')+B(176,304,608,67,'批次上分数 1/2 本身不能证明分布匹配','还要排除判别器能力不足',C.warm);
    case 'limits':return flow([['表达能力','有限网络不一定能表示'],['统计误差','有限数据与泛化'],['优化动态','交替更新可能振荡']])+F('样本质量与模式覆盖分别评价');
    case 'gan-summary':return B(51,127,411,128,'生成的优势','先验 → G → 样本\n一次前向，图像质量可高',C.bluePale)+B(499,127,411,128,'训练的难点','D 与 G 同时变化\n稳定性、覆盖与扩展性',C.rose)+B(203,314,554,64,'下一条路线：监督回归 + 多步生成','',C.warm);
    case 'iterative':return flow([['x₁：噪声','从简单分布抽样'],['反复评估 fθ','状态与时间共同输入'],['x₀：数据','积分后的样本']])+F('网络输出局部速度；求解器负责推进状态');
    case 'endpoints':return flow([['训练数据 x','从数据集抽样'],['独立噪声 z','与 x 同形状'],['时间 t','基础设置 U[0,1]']])+B(234,314,492,65,'三者共同构造 xₜ 与速度监督','不需要数据集提供真实去噪轨迹',C.warm);
    case 'linear-path':return interpolation(4);
    case 'velocity-loss':return flow([['已知 x,z,t','构造 xₜ'],['模型预测','fθ(xₜ,t)'],['监督目标','z−x']])+B(203,311,554,65,'平方误差连接预测与已知目标','随机抽时刻并行训练',C.warm);
    case 'training-code':return flow([['每轮重采样','数据、噪声、时间'],['预测并比较','MSE 对齐速度'],['反向传播','更新同一个 θ']])+F('批次时间广播到其余轴，预测与监督形状一致');
    case 'sampling-start':return flow([['选步数 T','决定网络评估预算'],['抽 x₁','高斯噪声'],['开始积分','t=1，参数固定']])+F('采样只需要噪声；看不到真实数据端点');
    case 'euler-step':return flow([['当前位置 xₜ','当前时间 t'],['求 vₜ=fθ(xₜ,t)','沿时间增加定义'],['更新 xₜ−vₜ/T','向较小时间移动']])+F('从 1 走到 0，负步长给出更新减号');
    case 'euler-trajectory':return euler(3);
    case 'sampling-code':return flow([['初始化','x₁ ~ pnoise'],['T 次迭代','k=T,…,1'],['返回','x₀']])+B(163,309,634,65,'训练：随机时刻；生成：顺序依赖','每一步都在更新后的状态重新求速度',C.warm);
    case 'conditional-sampling':return flow([['固定条件 y','选择希望的分布'],['当前状态 xₜ','每步都注入 y'],['条件速度','fθ(xₜ,t,y)']])+F('不同初始噪声，在同一条件下仍能产生不同输出');
    case 'cfg-dropout':return B(70,132,272,101,'训练数据 (x,y)','速度目标 z−x',C.bluePale)+P('M346 182 H421 V126 H491')+P('M421 182 V299 H491')+B(495,88,387,91,'保留 y','条件预测 fθ(xₜ,t,y)')+B(495,260,387,91,'替换为空条件 ∅','无条件预测 fθ(xₜ,t,∅)',C.warm)+F('只改变条件输入；数据、噪声、时间与目标身份不变');
    case 'cfg-directions':return cfg(1);
    case 'cfg-combination':return cfg(3);
    case 'cfg-cost':return flow([['有条件评估','同一 xₜ,t'],['无条件评估','同一网络'],['速度组合','沿组合方向积分']])+B(181,314,598,64,'通常约两倍网络计算，无额外分类器','合批可影响实际时延',C.warm);
    case 'conditional-mean':return conditionalMean();
    case 'endpoint-velocities':return B(55,124,406,130,'t=1：已知 z','只需平均未知的数据端点\nf*(z,1)=z−E[x]',C.bluePale)+B(501,124,406,130,'t=0：已知 x','只需平均未知的噪声端点\nf*(x,0)=−x')+F('端点独立；标准高斯 E[z]=0；最优速度仍含当前状态',341);
    case 'ambiguity':return flow([['低噪声','数据身份较明确'],['中间噪声','多对端点的解释混合'],['高噪声','噪声端点较明确']])+F('具体难度依赖数据和参数化；引出训练时间的加权');
    case 'time-reweighting':return B(53,135,402,125,'均匀时间采样','同长度区间机会相同\nt ~ Uniform[0,1]',C.bluePale)+B(505,135,402,125,'非均匀时间采样','资源偏向所选噪声尺度\nt ~ pt',C.warm)+A(460,197,500,197)+F('训练采样分布与生成积分网格是两个独立设计选择');
    case 'high-resolution':return flow([['分辨率增大','像素相关与计算增多'],['调整表示与噪声','潜空间、时间策略'],['扩展模型','U-Net / Transformer']])+F('简洁框架仍需要匹配数据尺度与网络设计');
    case 'general-framework':return B(59,129,399,124,'输入路径','xₜ=a(t)x+b(t)z\n决定当前含噪状态',C.bluePale)+B(501,129,399,124,'回归目标','y*=c(t)x+d(t)z\n决定网络输出的意义',C.warm)+B(159,309,642,65,'采样器必须与这两种选择匹配','网络输出不总是 d xₜ / dt');
    case 'vp':return flow([['独立单位方差','Var(x)=Var(z)=1'],['混合方差','a²+b²'],['VP 条件','a²+b²=1']])+F('a=√s，b=√(1−s)；RF 的平方和在中间时刻小于 1');
    case 've':return flow([['原始信号','系数恒为 1'],['噪声尺度','σ(t) 逐渐增大'],['总方差','1+σ(t)²']])+F('终点噪声占优；有限 σ 下仍包含数据分量');
    case 'prediction-targets':return flow([['x 预测','干净数据'],['ε 预测','标准高斯噪声 z'],['VP v 预测','a z−b x']])+F('相同输入可配不同目标；先声明路径和时间约定');
    case 'prediction-conversion':return B(64,130,386,117,'已知状态与 VP v','xₜ=a x+b z\nv=−b x+a z',C.bluePale)+A(455,188,508,188)+B(513,130,385,117,'反解数据与噪声','x=a xₜ−b v\nz=b xₜ+a v')+F('a²+b²=1；RF 的 z−x 不直接代入这组旋转公式');
    case 'full-recap':return [['自回归','条件似然','按前缀顺序采样'],['VAE','变分下界','先采潜变量，再解码'],['GAN','真假博弈','噪声经生成器'],['扩散 / 流','回归去噪等目标','从噪声迭代到数据']].map(([a,b,c],i)=>R(42,91+i*77,876,65,i%2?C.pale:C.bluePale)+T(a,63,131+i*77,19,C.ink,'start')+T(b,407,131+i*77,18)+T(c,744,131+i*77,18)).join('');
    default:throw new Error('Missing diagram '+s.id+' / '+s.visual);
  }
}
function svg(s,body,description=s.note){return '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="440" viewBox="0 0 960 440" role="img" aria-labelledby="title desc"><title id="title">'+esc(s.title)+'</title><desc id="desc">'+esc(description)+'</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="context-stroke"/></marker></defs><rect width="960" height="440" fill="white"/><g font-family="PingFang SC,Microsoft YaHei,sans-serif">'+T(s.title,42,39,22,C.ink,'start')+'<path d="M42 63 H918" stroke="'+C.line+'"/>'+body+'</g></svg>\n';}
const renderers={gan:alternating,interpolation,euler,cfg};
for(const s of slides){
  writeFileSync(join(out,s.id+'.svg'),svg(s,assets.has(s.visual)?image(s.visual):custom(s)));
  if(sequences[s.id])for(const [i,state] of sequences[s.id].frames.entries())writeFileSync(join(out,s.id+'-step-'+i+'.svg'),svg(s,renderers[sequences[s.id].type](state),sequences[s.id].steps[i]));
}
const facts=JSON.parse(readFileSync(join(build,'facts.json')));
writeFileSync(join(build,'diagram-manifest.json'),JSON.stringify({sourceSha256:manifest.sourceSha256,assets:manifest.assets,diagrams:slides.map(s=>({id:s.id,sourcePages:s.sourcePages,file:'diagrams/generative/part2/'+s.id+'.svg',visual:s.visual,sourceImage:assets.get(s.visual)?.output||null,sequence:sequences[s.id]||null})),extraEvidence:{'flow-euler-trajectory':'media/generative/part2/sampling-path.png'}},null,2)+'\n');
writeFileSync(join(build,'teaching-coverage.json'),JSON.stringify({sourceSha256:manifest.sourceSha256,coverage:facts.groups.map(g=>({...g,locations:slides.filter(s=>s.sourcePages.some(p=>p>=g.sourcePages[0]&&p<=g.sourcePages[1])).map(s=>({id:s.id,reading:'generative-models.html#read-'+s.id,presentation:'generative-models.html?mode=slides&page='+s.page,title:s.title,equations:s.equations.map(e=>e.tex),code:s.code||null,sourceImage:assets.get(s.visual)?.output||s.evidence?.url||null}))}))},null,2)+'\n');
writeFileSync(join(build,'reading-content.md'),sectionsMarkdown());
function sectionsMarkdown(){return slides.map(s=>'## '+s.title+'\n\n'+s.reading.join('\n\n')+'\n\n'+s.equations.map(e=>'```tex\n'+e.tex+'\n```\n'+e.explanation).join('\n\n')+(s.code?'\n\n```python\n'+s.code+'\n```':'')).join('\n\n');}
writeFileSync(join(build,'presentation-script.md'),slides.map(s=>'## '+s.page+' · '+s.title+'\n\n'+s.reading.join('\n\n')+'\n\n图：diagrams/generative/part2/'+s.id+'.svg').join('\n\n'));
writeFileSync(join(build,'source-mapping.json'),JSON.stringify({sourceSha256:facts.sha256,slides:slides.map(s=>({id:s.id,sourcePages:s.sourcePages,reading:'#read-'+s.id,page:s.page,section:s.section}))},null,2)+'\n');
console.log('Generated '+slides.length+' Part II figures and '+Object.keys(sequences).length+' numeric sequences, with coverage and content artifacts.');
