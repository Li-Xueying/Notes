import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {slides,sequences,chainExample,vaeExample} from './generative-part1-course-data.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const build=join(root,'..','AI工程学','.course-build','06-generative','part1');
const out=join(root,'diagrams','generative','part1');
mkdirSync(out,{recursive:true});
const manifest=JSON.parse(readFileSync(join(build,'asset-manifest.json')));
const assets=new Map(manifest.assets.map(a=>[a.id,a]));
const C={ink:'#283b34',muted:'#63766c',green:'#2f7253',pale:'#eaf3ed',blue:'#306b87',bluePale:'#eaf2f8',warm:'#fff1d7',rose:'#f9e7e3',red:'#ab4d42',line:'#ccdbd2'};
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const T=(text,x,y,size=18,color=C.ink,anchor='middle')=>'<text x="'+x+'" y="'+y+'" font-size="'+size+'" fill="'+color+'" text-anchor="'+anchor+'">'+esc(text)+'</text>';
const R=(x,y,w,h,fill=C.pale,stroke=C.line)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="4" fill="'+fill+'" stroke="'+stroke+'"/>';
const B=(x,y,w,h,title,sub='',fill=C.pale)=>R(x,y,w,h,fill)+T(title,x+w/2,y+(sub?30:h/2+6),18)+sub.split('\n').filter(Boolean).map((line,i)=>T(line,x+w/2,y+55+i*23,14,C.muted)).join('');
const P=(d,color=C.green)=>'<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2" marker-end="url(#arrow)"/>';
const A=(x,y,x2,y2,color=C.green)=>P('M'+x+' '+y+' L'+x2+' '+y2,color);
const F=(text,y=405)=>T(text,480,y,17,C.muted);
const flow=(items,y=172)=>items.map(([title,sub],i)=>{const width=(876-(items.length-1)*50)/items.length,x=42+i*(width+50);return B(x,y,width,86,title,sub,i%2?C.pale:C.bluePale)+(i<items.length-1?A(x+width+4,y+43,x+width+46,y+43):'');}).join('');
function img(id,x,y,w,h){
  const asset=assets.get(id);if(!asset)throw new Error('Unknown evidence '+id);
  return '<image href="data:image/png;base64,'+readFileSync(join(root,asset.output)).toString('base64')+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" preserveAspectRatio="xMidYMid meet"/>';
}
function evidence(s){
  const ids=s.visual;
  if(ids.length===4){
    const labels=['整图类别','文字描述','边框与类别','像素类别'];
    return ids.map((id,i)=>T(labels[i],151+i*220,109,18)+img(id,44+i*220,127,214,260)).join('')+F('输入与目标配对，训练所需标签随任务改变',421);
  }
  if(ids.length===3)return ids.map((id,i)=>img(id,42+i*295,110,280,270)+T(['聚类','PCA 降维','密度估计'][i],182+i*295,405,18)).join('');
  if(ids.length===2)return img(ids[0],42,98,430,286)+img(ids[1],494,98,424,286)+T('猫与犬：各自的类别分布',257,411,17)+T('猴与噪声：仍输出预设类别',706,411,17);
  if(ids[0]==='latent-grid')return B(42,134,333,83,'纵轴 z₁，横轴 z₂','沿同一方向比较数字形态',C.bluePale)+B(42,256,333,87,'独立先验 ≠ 语义解耦','观察连续变化，勿预设语义轴',C.warm)+img(ids[0],406,80,503,337);
  return img(ids[0],42,88,876,316)+F(s.id==='video-ambiguity'?'左：当前画面；右：未来帧示例':s.id==='image-autoregression'?'二维位置 + RGB 通道 → 固定扫描顺序':s.id==='conditional-probabilities'?'固定条件后，在同一图像空间内归一化':'所有可能图像共同构成数据分布',424);
}
function chain(state){
  const probs=chainExample.probabilities;
  let body=T('固定前缀，选择当前事件，再将概率相乘',480,109,19);
  let product=1;
  for(let i=0;i<3;i++){
    const active=state>i,x=55+i*307;
    if(active)product*=probs[i];
    body+=B(x,156,235,89,active?chainExample.events[i]+' 已选':'等待第 '+(i+1)+' 步',active?'条件概率 '+probs[i]:'先得到归一化分布',active?C.bluePale:'#f4f6f4');
    if(i<2)body+=A(x+239,201,x+300,201);
    body+=T(active?'前缀：'+chainExample.events.slice(0,i+1).join('、'):'前缀尚未扩展',x+117,280,16,active?C.green:C.muted);
  }
  return body+B(195,323,570,61,state?'当前累计路径概率 = '+Number(product.toFixed(4)):'起点：尚未选择任何事件','',C.warm);
}
function autoencoder(state){
  let body=B(44,168,156,76,'输入 x','同一数据',C.bluePale);
  if(state>=1)body+=A(204,206,243,206)+B(247,168,160,76,'编码器 fφ','得到潜表示 z')+A(411,206,450,206)+B(454,168,96,76,'z');
  if(state>=2)body+=A(554,206,593,206)+B(597,168,160,76,'解码器 gθ','得到重建 x̂')+A(761,206,800,206)+B(804,168,111,76,'重建 x̂','与 x 同维',C.bluePale);
  if(state>=3)body+=P('M859 249 V289 H477 V316',C.red)+P('M122 249 V289 H477 V316',C.red)+B(325,320,304,53,'平方误差 ‖x−x̂‖²','',C.rose)+P('M325 346 H284 V250',C.red)+T('误差反传到两网络',170,379,16,C.red);
  return body+F(state<3?'原输入既是模型输入，也是重建目标':'重建得到训练信号；特征用途还需下游评价',419);
}
const pair=values=>'('+values.map(n=>Number(n.toFixed(3))).join(', ')+')';
function training(state){
  const e=vaeExample,z=e.mu.map((m,j)=>m+e.sigma[j]*e.epsilon[j]);
  const mean=z.map((v,j)=>v*e.decoderScales[j]);
  const kl=.5*e.mu.reduce((sum,m,j)=>sum+m*m+e.sigma[j]**2-1-Math.log(e.sigma[j]**2),0);
  const rec=mean.reduce((sum,v,j)=>sum+(v-e.x[j])**2,0)/(2*e.observationVariance);
  let body=T('二维结构算例：输入与噪声在所有步骤中保持固定',480,103,17,C.muted)+B(43,159,150,86,'输入 x',pair(e.x),C.bluePale);
  if(state>=1)body+=A(197,202,227,202)+B(231,150,238,104,'编码分布参数','μ='+pair(e.mu)+'\nσ='+pair(e.sigma))+B(231,289,238,56,'先验 KL = '+kl.toFixed(2),'',C.warm)+A(350,256,350,284);
  if(state>=2)body+=B(508,110,174,70,'独立噪声 ε',pair(e.epsilon),C.warm)+A(473,202,504,202)+A(595,183,595,194)+B(508,199,174,72,'采样 z',pair(z),C.bluePale);
  if(state>=3)body+=A(686,235,720,235)+B(724,199,192,72,'解码均值',pair(mean),C.bluePale)+T('D(z)=(z₁/2,z₂/4)',817,298,14,C.muted);
  if(state>=4)body+=P('M820 274 V329 H665',C.red)+B(508,334,407,50,'重建 '+rec.toFixed(2)+' + KL '+kl.toFixed(2)+' = '+(kl+rec).toFixed(2),'',C.rose)+P('M508 360 H487 V282 H260 V256',C.red)+P('M916 359 H935 V188 H820 V196',C.red);
  return body+F(state===4?'观察方差 1，去固定高斯常数；梯度联合更新 θ 与 φ':'先得到分布参数，再将独立噪声变成潜变量',422);
}
function terms(stage){
  const labels=[['重建项','Eq[log pθ(x|z)]'],['先验 KL','KL(qφ(z|x) ∥ p(z))'],['后验 KL','KL(qφ(z|x) ∥ pθ(z|x))']];
  let body=labels.map(([title,sub],i)=>B(42+i*300,145,275,96,title,sub,i===0?C.bluePale:i===1?C.pale:C.rose)).join('');
  body+=T('−',330,205,27)+T('+',630,205,27);
  if(stage==='reconstruction-term')body+=B(42,286,275,79,'固定 z 可求值','期望一般用采样估计',C.bluePale);
  else if(stage==='prior-kl')body+=B(342,286,275,79,'此设置有闭式','对角高斯对标准高斯');
  else if(stage==='gap')body+=B(642,286,275,79,'难求值，但非负','它是 log p 与 ELBO 的差',C.rose);
  else body+=P('M45 258 V278 H615 V258')+T('前两项合起来：ELBO',330,316,21,C.green)+T('log pθ(x) = ELBO + 非负差距',480,383,20);
  return body;
}
function custom(s){
  switch(s.visual){
    case 'route':return B(42,82,876,63,'Part I · 概率建模与潜变量','分布建模 → 最大似然 / 自回归 → VAE',C.bluePale)+[
      ['生成建模基础','分布、条件与一对多'],
      ['最大似然与自回归','条件分解、顺序采样'],
      ['VAE','潜变量、ELBO 与采样'],
    ].map(([title,sub],i)=>B(42+i*300,160,276,63,title,sub,i===1?C.pale:C.bluePale)).join('')+
    B(42,248,876,63,'Part II · 对抗、连续与条件生成','GAN → Rectified Flow / 扩散 → 条件生成与应用',C.warm)+[
      ['GAN','对抗学习、生成器采样'],
      ['Rectified Flow 与扩散','速度 / 去噪、逐步采样'],
      ['条件生成与应用','CFG；图像、视频、世界模型'],
    ].map(([title,sub],i)=>B(42+i*300,326,276,63,title,sub,i===1?C.rose:C.warm)).join('')+
    F('同一组问题：怎样学习分布？怎样从模型生成样本？',423);
    case 'distributions':return flow([['判别 p(y|x)','固定数据 x → 标签 y'],['生成 p(x)','模型 → 新数据 x'],['条件生成 p(x|y)','固定条件 y → 数据 x']],158)+F('先固定条件，再确认在什么变量上归一化');
    case 'bayes':return B(342,99,275,67,'联合分布 p(x,y)','同一个数据与标签空间')+P('M343 134 H207 V221')+P('M619 134 H757 V221')+B(63,226,287,90,'p(y|x) × p(x)','判别项 × 数据分布',C.bluePale)+B(612,226,287,90,'p(x|y) × p(y)','条件生成 × 标签先验',C.warm)+T('=',480,280,29)+F('由同一个联合分布的两种分解得到贝叶斯联系');
    case 'uses':return [['判别模型','类别预测 / 有标签特征'],['无条件生成','采样数据 / 无标签结构'],['条件生成','指定条件下采样数据']].map(([t,v],i)=>B(42,96+i*103,224,76,t,'',i===0?C.bluePale:i===1?C.pale:C.warm)+A(270,134+i*103,326,134+i*103)+T(v,351,141+i*103,20,C.ink,'start')).join('');
    case 'poem':return B(43,136,300,122,'提示条件 y','写一首关于生成模型的\n押韵短诗',C.bluePale)+A(347,197,408,197)+B(412,136,502,122,'一种可能的输出 x','它从学到的分布采样；\n每个词依上下文登场。')+F('相同提示可以对应多个合理文本：建模 p(x|y)');
    case 'taxonomy':return T('方法',64,111,18,C.muted,'start')+T('典型训练对象',405,111,18,C.muted)+T('典型采样路径',760,111,18,C.muted)+[['自回归','精确条件似然','按元素顺序生成'],['VAE','对数似然下界','先采 z，再解码'],['GAN','对抗目标','噪声经生成器'],['扩散模型','去噪等目标','逐步迭代生成']].map(([a,b,c],i)=>R(42,126+i*64,876,57,i<2?(i?C.pale:C.bluePale):'#f6f6f3')+T(a,64,163+i*64,19,C.ink,'start')+T(b,405,163+i*64,18)+T(c,760,163+i*64,18)).join('')+F('后两类在 Part II 展开；不同变体的似然形式可能不同',421);
    case 'likelihood':return flow([['训练数据','x⁽¹⁾,…,x⁽ᴺ⁾'],['概率模型 pθ','归一化分布'],['选取参数 θ','最大化样本似然']],157)+F('独立同分布假设：训练集联合似然 = 各样本似然的乘积');
    case 'log-likelihood':return B(93,133,774,76,'pθ(x⁽¹⁾) × pθ(x⁽²⁾) × … × pθ(x⁽ᴺ⁾)','概率乘积',C.bluePale)+A(480,214,480,264)+B(93,270,774,76,'log pθ(x⁽¹⁾) + log pθ(x⁽²⁾) + … + log pθ(x⁽ᴺ⁾)','对数和：保持最优参数')+T('单调 log',587,249,17,C.green);
    case 'nll':return flow([['对数似然','最大化'],['取负并平均','得到 NLL'],['梯度下降','最小化 NLL']],156)+B(189,301,582,63,'负号同时改变优化方向','符号一致，才能提高训练数据的似然',C.warm);
    case 'chain':return chain(3);
    case 'ar-networks':return T('RNN',108,117,19)+flow([['前缀 x<t','时间递归状态'],['隐藏状态 ht','汇集历史'],['下一词分布','采样 xt']],138)+T('因果 Transformer',168,294,19)+flow([['前缀 x<t','位置表示'],['因果注意力','仅可见过去'],['下一词分布','追加到前缀']],312);
    case 'image-cost':return B(54,132,384,96,'1024×1024×3','3,145,728 个子像素',C.bluePale)+A(443,180,512,180)+B(517,132,390,96,'逐子像素生成','超过三百万次顺序决策',C.rose)+B(168,292,624,79,'表示为块或视觉 token','需要定义编码与解码，才能缩短序列',C.warm);
    case 'vae-transition':return B(57,135,394,112,'自回归','直接分解 pθ(x)\n条件概率可求值',C.bluePale)+B(508,135,394,112,'潜变量模型','对 z 边缘化\n似然通常难精确求值')+A(455,190,504,190)+F('从表征与重建出发，逐步建立可采样的潜变量模型');
    case 'ae-encoder':return flow([['输入数据 x','无类别标签'],['编码器 fφ','MLP / CNN / Transformer'],['潜表示 z','保留有用信息']],166)+F('先明确表示学习目的，再为编码器建立训练信号');
    case 'ae-reconstruction':return autoencoder(3);
    case 'ae-transfer':return flow([['目标数据 x','有标签 y'],['预训练编码器','保留 z'],['分类头','预测标签 ŷ']],167)+B(183,301,594,63,'训练信号从重建误差变成分类误差','编码器可冻结，也可随下游任务微调',C.warm);
    case 'latent-gap':return B(49,153,235,86,'新潜变量 z','从哪里抽样？',C.rose)+A(288,197,346,197)+B(350,153,235,86,'已有解码器','只学过训练表示')+A(589,197,647,197)+B(651,153,262,86,'新数据 x','随意 z 不保证合理',C.bluePale)+F('为 z 建立简单可采样的先验，才有明确的生成起点');
    case 'latent-process':return flow([['已知先验 p(z)','标准高斯 N(0,I)'],['采样潜变量 z','生成起点'],['条件分布 pθ(x|z)','再从中采样 x']],172)+F('生成方向 z → x；模型学习如何把简单随机性转成数据结构');
    case 'marginalization':return B(57,141,245,100,'训练只看到 x','真实 z 未观测',C.bluePale)+B(355,141,547,100,'汇总所有可能的潜变量解释','pθ(x|z) × p(z)，对整个 z 空间积分')+A(307,191,350,191)+B(136,299,688,69,'固定 z 的两个因子可算 ≠ 积分容易计算','非线性解码器使高维边缘化通常难有解析解',C.warm);
    case 'posterior':return flow([['先验 p(z)','生成前的潜变量分布'],['观察输入 x','贝叶斯更新'],['真实后验 pθ(z|x)','依赖难算的 pθ(x)']],157)+B(177,301,606,65,'改写贝叶斯公式，没有移除归一化困难','引入可计算的近似推断分布',C.warm);
    case 'variational':return T('推断路径',113,121,19)+flow([['观测 x','编码器输入'],['变分编码器 qφ','学习近似后验'],['潜变量 z','分布而非单点']],140)+T('生成路径',113,292,19)+flow([['潜变量 z','解码器输入'],['生成解码器 pθ','学习条件分布'],['观测 x','数据空间']],310);
    case 'gaussian-parameters':return B(42,133,200,100,'输入 x','D 维',C.bluePale)+A(246,183,294,183)+B(298,133,239,100,'编码器','μ 与 log σ²')+A(541,183,589,183)+B(593,133,325,100,'qφ(z|x)','d 维对角高斯')+B(149,303,662,72,'σ = exp(log σ² / 2)','方差为 σ²；重参数化乘的是标准差 σ',C.warm);
    case 'gaussian-loss':return B(52,140,355,113,'高斯解码器','均值 μθ(z)\n固定观察方差 τ²',C.bluePale)+A(411,197,477,197)+B(481,140,426,113,'条件对数似然','固定常数 − 缩放平方误差')+F('观察方差若可学习，归一化项也必须参与优化');
    case 'elbo-bayes':return B(102,151,755,101,'条件生成 × 先验 ÷ 真实后验','pθ(x|z) × p(z) / pθ(z|x)',C.bluePale)+F('固定 x，整个比值与选取的有效 z 无关');
    case 'elbo-insert':return flow([['原始比值','保留 p(z)'],['乘 qφ / qφ','值保持不变'],['准备重新分组','近似后验进入代数式']],163)+F('qφ 出现在分子和分母中；此时仍为精确恒等式');
    case 'elbo-split':return [['重建对数','log pθ(x|z)'],['先验密度比','log [qφ(z|x) / p(z)]'],['后验密度比','log [qφ(z|x) / pθ(z|x)]']].map(([title,sub],i)=>B(42+i*300,145,275,96,title,sub,i===0?C.bluePale:i===1?C.pale:C.rose)).join('')+T('−',330,205,27)+T('+',630,205,27)+F('每一项仍含 z；下一步对同一个 qφ(z|x) 取期望',344);
    case 'elbo-expectation':return B(55,133,365,89,'左侧：log pθ(x)','固定 x 后不依赖 z',C.bluePale)+B(525,133,380,89,'右侧：三个含 z 的项','对同一个 qφ(z|x) 取期望')+A(424,178,520,178)+B(174,294,612,79,'期望线性性保持等式','左侧常数不变，右侧分成三个期望');
    case 'elbo-decomposition':return terms('identity');
    case 'reconstruction-term':case 'prior-kl':case 'gap':return terms(s.visual);
    case 'objective':return B(86,124,786,93,'ELBO = 期望重建对数似然 − 先验 KL','最大化：同时训练编码器 φ 与解码器 θ',C.bluePale)+A(480,222,480,277)+B(173,283,614,76,'log pθ(x) ≥ ELBO','真实后验 KL 构成非负差距',C.warm);
    case 'vae-encode':return training(1);
    case 'reparameterization':return training(2);
    case 'vae-decode':return training(3);
    case 'vae-training':return training(4);
    case 'tradeoff':return B(50,137,405,131,'重建项的倾向','保留不同输入的差异\n需要 z 携带可解码的信息',C.bluePale)+B(505,137,405,131,'先验 KL 的倾向','μ 靠近 0，σ 靠近 1\n约束编码分布偏离先验',C.warm)+B(141,316,678,62,'平衡两项；任一极端都可能损失重要能力','',C.rose);
    case 'sampling':return flow([['采样 z ~ N(0,I)','不需要真实输入'],['解码器 μθ(z)','均值图像'],['条件采样 x','再加入观察噪声 τξ']],163)+F('编码器服务于训练推断；新样本生成从先验开始');
    case 'recap':return B(50,111,406,125,'自回归','条件分布乘积\n按前缀逐项采样',C.bluePale)+B(504,111,406,125,'VAE','潜变量边缘化与 ELBO\n先验采样后解码')+B(143,303,674,71,'继续比较：训练信号怎样来？样本怎样生成？','Part II：生成对抗网络与扩散模型',C.warm);
    default:throw new Error('Missing visual '+s.visual);
  }
}
function svg(s,body,description=s.note){
  return '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="440" viewBox="0 0 960 440" role="img" aria-labelledby="title desc"><title id="title">'+esc(s.title)+'</title><desc id="desc">'+esc(description)+'</desc><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 Z" fill="context-stroke"/></marker></defs><rect width="960" height="440" fill="white"/><g font-family="PingFang SC,Microsoft YaHei,sans-serif">'+T(s.title,42,39,22,C.ink,'start')+'<path d="M42 63 H918" stroke="'+C.line+'"/>'+body+'</g></svg>\n';
}
for(const s of slides){
  writeFileSync(join(out,s.id+'.svg'),svg(s,Array.isArray(s.visual)?evidence(s):custom(s)));
  if(sequences[s.id])for(const [i,state] of sequences[s.id].frames.entries()){
    const type=sequences[s.id].type;
    writeFileSync(join(out,s.id+'-step-'+i+'.svg'),svg(s,type==='chain'?chain(state):type==='autoencoder'?autoencoder(state):training(state),sequences[s.id].steps[i]));
  }
}
// The paired reconstruction evidence gets its own full-size, zoomable figure in reading and presentation.
const facts=JSON.parse(readFileSync(join(build,'facts.json')));
writeFileSync(join(build,'diagram-manifest.json'),JSON.stringify({sourceSha256:manifest.sourceSha256,assets:manifest.assets,diagrams:slides.map(s=>({id:s.id,sourcePages:s.sourcePages,file:'diagrams/generative/part1/'+s.id+'.svg',visual:s.visual,sequence:sequences[s.id]||null})),extraEvidence:{'ae-reconstruction':'media/generative/part1/reconstruction.png'}},null,2)+'\n');
writeFileSync(join(build,'teaching-coverage.json'),JSON.stringify({sourceSha256:manifest.sourceSha256,coverage:facts.groups.map(g=>({...g,locations:slides.filter(s=>s.sourcePages.some(p=>p>=g.sourcePages[0]&&p<=g.sourcePages[1])).map(s=>({id:s.id,reading:'generative-models.html#read-'+s.id,presentation:'generative-models.html?mode=slides&page='+s.page,title:s.title,equations:s.equations.map(e=>e.tex)}))}))},null,2)+'\n');
console.log('Generated '+slides.length+' figures, '+Object.keys(sequences).length+' sequences, and exact reading/presentation coverage.');
