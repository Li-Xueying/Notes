import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {slides, sequences, embeddingVectors} from './rnn-course-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const build = join(root,'..','AI工程学','.course-build','03-rnns-lstms');
const ppt = join(root,'..','AI工程学','PPT材料','RNNs and LSTMs.pptx');
const output = join(root,'diagrams','rnn');
const media = join(root,'media','rnn');
mkdirSync(output,{recursive:true}); mkdirSync(media,{recursive:true});
const facts = JSON.parse(readFileSync(join(build,'source-review.json'),'utf8'));
const C = {ink:'#263f35',muted:'#667f72',green:'#176653',pale:'#e9f3ee',line:'#a8c2b4',amber:'#b47936',warm:'#fbf0dd',blue:'#547a8a',bluePale:'#eaf1f4',red:'#a75d52'};
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const text = (value,x,y,{size=17,color=C.ink,anchor='middle',weight=400}={})=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-weight="${weight}">${esc(value)}</text>`;
const rect = (x,y,w,h,fill='white',stroke=C.line)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="${stroke}"/>`;
const box = (x,y,w,h,title,detail='',fill=C.pale)=>rect(x,y,w,h,fill)+text(title,x+w/2,y+h/2-(detail?7:-6),{weight:650})+(detail?text(detail,x+w/2,y+h/2+21,{size:14,color:C.muted}):'');
const arrow = (x1,y1,x2,y2,color=C.green)=>`<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="2" marker-end="url(#arrow)"/>`;
const formula = (value,y=352)=>rect(48,y-29,864,52,'#f6faf7','#d7e5dc')+text(value,480,y+3,{size:18,color:C.green});
const flow = (items,y=154)=>items.map(([a,b],i)=>box(48+i*(864/items.length),y,864/items.length-24,92,a,b,i%2?C.bluePale:C.pale)+(i<items.length-1?arrow(48+(i+1)*(864/items.length)-24,y+46,48+(i+1)*(864/items.length)-4,y+46):'')).join('');
const lines = (values,x=80,y=137)=>values.map((v,i)=>text(v,x,y+i*47,{anchor:'start',size:18})).join('');
const defs = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10" fill="none" stroke="${C.green}" stroke-width="1.5"/></marker></defs>`;
const assets = new Map();
function asset(name) {
  if(!assets.has(name)) {
    const data = execFileSync('unzip',['-p',ppt,`ppt/media/${name}`],{maxBuffer:30*1024*1024});
    writeFileSync(join(media,name),data);
    const source = facts.slides.flatMap(page=>page.assets.filter(item=>item.part===`ppt/media/${name}`).map(item=>({...item,sourcePage:page.sourcePage})));
    if(!source.length) throw new Error(`Missing source asset ${name}`);
    assets.set(name,{name,sha256:source[0].sha256,sourcePages:source.map(item=>item.sourcePage),bytes:data.length,data});
  }
  return assets.get(name);
}
const image = (name,x=46,y=88,w=868,h=286)=>{
  const {data}=asset(name); const mime = /jpe?g$/i.test(name)?'image/jpeg':'image/png';
  const href=`data:${mime};base64,${data.toString('base64')}`;
  const cropRight={'image99.png':50539,'image101.png':49562,'image104.png':49815,'image107.png':51669}[name];
  const hideFooter=['image164.png','image166.png',...Array.from({length:11},(_,i)=>`image${168+i}.png`)].includes(name);
  if(cropRight||hideFooter) {
    const width=data.readUInt32BE(16),height=data.readUInt32BE(20),cropWidth=width*(1-(cropRight||0)/100000);
    // Honor the PPTX's cell-diagram crop; omit only the imported illustration's footer number.
    const clip=hideFooter?`<defs><clipPath id="footer-${name}"><path d="M0 0 H${width} V${height} H${width*.08} V${height*.95} H0 Z"/></clipPath></defs>`:'';
    return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${cropWidth} ${height}" preserveAspectRatio="xMidYMid meet" overflow="hidden">${clip}<image href="${href}" width="${width}" height="${height}"${hideFooter?` clip-path="url(#footer-${name})"`:''}/></svg>`;
  }
  return `<image href="${href}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
};

function windowBody(step=0,live=false) {
  const words=['problems','turning','into','banking','crises','as'];
  return words.map((word,i)=>box(48+i*144,135,136,54,word,'','white')).join('')+
    `<g ${live?'data-window-band="true"':''} transform="translate(${48+step*144} 128)"><rect width="712" height="68" rx="0" fill="none" stroke="${C.amber}" stroke-width="3"/><rect x="288" width="136" height="68" fill="none" stroke="${C.amber}" stroke-width="3"/></g>`+
    text('窗口半径 m = 2；中心位置用内框标出',480,112,{size:16,color:C.amber})+
    `<g ${live?'data-window-pairs="true"':''}>${text(step?'中心 banking':'中心 into',480,238,{weight:650})}${(step?['turning','into','crises','as']:['problems','turning','banking','crises']).map((word,i)=>arrow(480,247,144+i*216,265)+box(48+i*216,265,192,82,word,'上下文',i%2?C.bluePale:C.pale)).join('')}</g>`;
}
function forwardBody(step=4,live=false) {
  const words=['the','students','opened','their','exams'];
  return text('同一 Wₓ、Wₕ、bₕ、Wᵧ 在每个时间步复用',480,111,{size:16,color:C.amber})+
    words.map((word,i)=>`<g ${live?`data-forward-node="${i}"`:''}${i>step?' visibility="hidden"':''}>${box(57+i*177,147,136,65,`h${i+1}`,'历史摘要')}${box(57+i*177,264,136,44,word,'',C.bluePale)}${arrow(125+i*177,264,125+i*177,212)}${arrow(125+i*177,147,125+i*177,128)}${text(`ŷ${i+1}`,125+i*177,124,{size:15})}${i?arrow(193+(i-1)*177,180,57+i*177,180):''}</g>`).join('')+
    formula('hₜ = tanh(Wₓxₜ + Wₕhₜ₋₁ + bₕ)     ŷₜ = softmax(Wᵧhₜ + bᵧ)',362);
}
function memoryBody(step=4,live=false) {
  const items=[['旧细胞 cₜ₋₁','[0.8, −0.4]'],['保留 f ⊙ c','[0.6, −0.1]'],['写入 i ⊙ c̃','[0.1, 0.24]'],['新细胞 cₜ','[0.7, 0.14]'],['隐藏状态 hₜ','[0.302, 0.111]']];
  return text('固定 f = [0.75, 0.25]，i = [0.5, 0.8]，c̃ = [0.2, 0.3]，o = [0.5, 0.8]',480,113,{size:16})+
    items.map(([a,b],i)=>`<g ${live?`data-memory-node="${i}"`:''}${i>step?' visibility="hidden"':''}>${box(38+i*182,162,166,106,a,b,i===2?C.bluePale:i===4?C.warm:C.pale)}${i?arrow(22+i*182,215,36+i*182,215):''}</g>`).join('')+
    formula('cₜ = f ⊙ cₜ₋₁ + i ⊙ c̃      hₜ = o ⊙ tanh(cₜ)',349);
}
function cellBody() {
  const op=(label,x,y)=>`<circle cx="${x}" cy="${y}" r="21" fill="white" stroke="${C.green}"/>${text(label,x,y+6,{size:22})}`;
  return text('cₜ₋₁',48,122,{anchor:'start'})+arrow(75,150,205,150)+op('⊙',230,150)+arrow(251,150,579,150)+op('+',600,150)+arrow(621,150,887,150)+text('cₜ',887,130)+
    box(152,258,156,45,'σ → fₜ','',C.warm)+arrow(230,258,230,171)+
    box(332,258,156,45,'σ → iₜ')+box(512,258,156,45,'tanh → c̃ₜ','',C.bluePale)+arrow(410,258,489,215)+arrow(590,258,535,215)+op('⊙',512,208)+arrow(533,208,600,171)+
    arrow(747,150,747,200)+box(696,201,102,44,'tanh','',C.bluePale)+arrow(747,245,835,274)+op('⊙',860,284)+box(696,299,108,44,'σ → oₜ','',C.warm)+arrow(804,321,845,301)+arrow(881,284,917,284)+text('hₜ',917,261)+
    text('各门与候选均由 [hₜ₋₁;xₜ] 计算；⊙ 为逐元素乘法',480,379,{size:17,color:C.muted});
}

function body(item) {
  if(Array.isArray(item.visual)) return item.visual.map((name,i,all)=>image(name,46+i*868/all.length,88,868/all.length-12,298)).join('');
  switch(item.visual) {
    case 'route': return flow([['词表示','输入怎样编码'],['RNN','历史怎样传递'],['LSTM / GRU','记忆怎样保留'],['Seq2Seq','序列怎样生成']])+formula('Word Representation → RNN → LSTM → Sequence to Sequence');
    case 'motivation': return box(55,100,330,84,'图片 → 前馈网络 → cat','固定输入的图像分类',C.bluePale)+text('one minus two plus three',600,131,{size:24,weight:650})+flow([['读入 one','当前值 1'],['减去 two','当前值 −1'],['加上 three','结果 2']],218)+text('序列需要保留中间状态，并按输入顺序更新',480,365,{color:C.green});
    case 'cosine': return arrow(250,285,640,285)+arrow(250,285,530,130)+text('u',654,291)+text('v',541,125)+text('θ',348,264)+formula('cos(u,v) = uᵀv / (‖u‖₂ ‖v‖₂)');
    case 'semantic': return flow([['hotel','旅馆'],['motel','汽车旅馆'],['conference','会议']])+formula('语义关系应能体现在向量之间的几何关系中');
    case 'one-hot': return lines(['hotel：索引 8 → [0,…,1,…,0]','motel：索引 11 → [0,…,1,…,0]','conference：索引 2 → [0,1,0,…,0]'])+formula('不同词的独热向量内积为 0；语义相近也不例外');
    case 'lookup': return lines([...Object.entries(embeddingVectors).map(([k,v])=>`${k.padEnd(12)} [${v.join(', ')}]`),'词表第 4 行     [−0.456, 0.789, −0.123]','词表第 5 行     [0.567, −0.891, 0.234]'],80,115)+formula('E ∈ ℝ^(|V|×d)      e_w = Eᵀx_w：选出第 w 行',374);
    case 'contexts': return lines(['… government debt problems turning into banking crises …','… Europe needs unified banking regulation …','… India has just given its banking system a shot in the arm …'])+formula('共同出现的上下文，构成表示学习的训练信号');
    case 'training-loop': return flow([['随机向量','初始化参数'],['文本窗口','形成词对'],['概率与损失','预测邻词'],['梯度更新','调整向量']])+formula('反复扫描大量文本窗口');
    case 'skipgram-window': return windowBody();
    case 'likelihood': return flow([['中心 wₜ','当前位置'],['上下文 wₜ₊ⱼ','j ≠ 0'],['P(wₜ₊ⱼ | wₜ)','真实邻词的概率']])+formula('L(θ) = ∏ₜ ∏ⱼ P(wₜ₊ⱼ | wₜ; θ)');
    case 'nll': return flow([['概率乘积','L(θ)'],['对数求和','log L(θ)'],['最小化负值','J(θ)']])+formula('J(θ) = −(1/T) ∑ₜ ∑ⱼ log P(wₜ₊ⱼ | wₜ; θ)');
    case 'two-vectors': return flow([['中心表 V','取 v_c'],['点积','u_oᵀv_c'],['上下文表 U','取 u_o']])+formula('每个词有两个角色，两套可学习向量');
    case 'softmax': return flow([['所有点积','u_wᵀv_c'],['指数化','exp(u_wᵀv_c)'],['词表归一化','P(w|c)']])+formula('P(o|c) = exp(u_oᵀv_c) / ∑_w exp(u_wᵀv_c)');
    case 'sgd': return flow([['参数 θ','全部 V 与 U'],['梯度 ∇J','当前样本'],['更新参数','沿负梯度移动']])+formula('θ ∈ ℝ^(2d|V|)       θ ← θ − η∇J(θ)');
    case 'softmax-cost': return flow([['一个中心词','v_c'],['整个词表','|V| 次打分'],['归一化分母','全部候选共同参与']])+formula('单个词对的完整 Softmax 成本随 |V| 增长');
    case 'negative-task': return flow([['banking → crises','真实上下文：1'],['banking → 噪声词','随机抽样：0'],['二分类训练','区分真实与噪声']])+formula('一个真实词对 + k 个抽样词对');
    case 'sigmoid': {
      const points=Array.from({length:81},(_,i)=>{const z=(i-40)/8;return `${100+i*9},${285-160/(1+Math.exp(-z))}`;}).join(' ');
      return arrow(90,290,870,290)+arrow(460,300,460,102)+`<polyline points="${points}" fill="none" stroke="${C.green}" stroke-width="3"/>`+text('0',78,294)+text('1',78,129)+text('z',880,296)+formula('σ(z) = 1 / (1 + exp(−z))');
    }
    case 'negative-objective': return lines(['真实词对：增大 u_oᵀv_c → 增大 σ(u_oᵀv_c)','噪声词对：减小 u_nᵀv_c → 增大 σ(−u_nᵀv_c)'])+formula('J = −log σ(u_oᵀv_c) − ∑ₙ log σ(−u_nᵀv_c)');
    case 'sampling': return flow([['原频率','0.9 / 0.01'],['取 3/4 次幂','0.924 / 0.0316'],['整个词表归一化','频率比 90 → 约 29.2']])+formula('P_n(w) = f(w)^(3/4) / ∑_v f(v)^(3/4)');
    case 'sparse-update': return flow([['中心向量','1 个 v'],['真实上下文','2m 个 u'],['抽样上下文','最多 2km 个 u']])+formula('其余词向量本次梯度为 0；总计最多 1 + 2m + 2km');
    case 'polysemy': return flow([['pike：鱼','一种使用语境'],['pike：尖状武器','另一种语境'],['pike：道路 / 跳水','其他使用语境']])+formula('一个静态向量混合多个含义 → 需要当前上下文');
    case 'language-model': return flow([['已读前缀','the students …'],['下一词分布','P(x_t | x_<t)'],['整句概率','各条件概率的乘积']])+formula('P(x₁,…,x_T) = ∏ₜ P(x_t | x_<t)');
    case 'rnn-forward': return forwardBody();
    case 'rnn-tradeoffs': return lines(['优势：输入可变长；同一规则处理各位置；参数量不随长度增加','限制：计算沿时间串行；早期信息可能在多次更新中丢失'])+formula('可访问任意长度的历史 ≠ 能可靠保存全部历史');
    case 'clipping': return arrow(200,280,700,110,C.red)+arrow(200,280,450,195)+text('原梯度 g',706,98,{color:C.red})+text('裁剪后的 g',466,194,{color:C.green})+formula('g_clip = g · min(1, τ / ‖g‖₂)');
    case 'memory-problem': return flow([['普通 RNN','整体状态反复变换'],['长期依赖','多步后仍需早期信息'],['独立记忆通路','受控保留 + 写入']])+formula('引出 LSTM：怎样保存、擦除和读出信息？');
    case 'lstm-gates': return lines(['f：保留多少旧记忆；i：写入多少候选内容；o：输出多少记忆','每一道门都是向量，由 [hₜ₋₁;xₜ] 的当前上下文计算'])+formula('σ(·) ∈ (0,1)；逐元素控制，而非整层的单一开关');
    case 'lstm-cell': return cellBody();
    case 'lstm-memory': return memoryBody();
    case 'gru-update': return lines(['zₜ = σ(W_z[hₜ₋₁;xₜ] + b_z)','rₜ = σ(W_r[hₜ₋₁;xₜ] + b_r)','h̃ₜ = tanh(W_c[rₜ ⊙ hₜ₋₁;xₜ] + b_c)'])+formula('hₜ = (1 − zₜ) ⊙ hₜ₋₁ + zₜ ⊙ h̃ₜ');
    case 'translation-task': return lines(['English: Machine Translation in natural language processing','German: Maschinelle Übersetzung in der Verarbeitung natürlicher Sprache'])+formula('源序列 x → 翻译系统 → 目标序列 y');
    case 'smt': return flow([['翻译模型 P(x|y)','平行语料：忠实'],['语言模型 P(y)','目标语料：流畅'],['搜索 argmax','共同高分的译文']])+formula('argmax_y P(y|x) = argmax_y P(x|y)P(y)');
    case 'learn-alignments': return flow([['句子对 (x,y)','可观察'],['对应关系 a','潜变量'],['估计参数与对齐','例如 EM']])+formula('P(x|y) = ∑_a P(x,a|y)');
    case 'smt-complexity': return flow([['概率模块','翻译 / 语言 / 对齐'],['人工设计','特征与短语资源'],['维护成本','每个语言对重复工作']])+formula('引出一个可端到端训练的神经模型');
    case 'seq2seq-tasks': return flow([['摘要 / 对话','文本 → 文本'],['解析','句子 → 结构序列'],['代码生成','描述 → 代码']])+formula('输入与输出长度不必相同');
    case 'conditional-lm': return flow([['源句 x','编码表示'],['目标前缀 y_<t','已生成的词'],['下一词分布','P(y_t | y_<t,x)']])+formula('P(y|x) = ∏ₜ P(y_t | y_<t,x)');
    case 'greedy-failure': return flow([['he hit','当前前缀'],['选择 a','固定这个决定'],['无法回到 me','后续受限']])+formula('局部最高分不保证完整序列最高分');
    case 'exhaustive': return flow([['每步 |V| 个词','所有分支'],['长度 T','|V|^T 个序列'],['搜索代价','随长度指数增长']])+formula('max_y ∑ₜ log P(y_t | y_<t,x)');
    case 'beam-rule': return flow([['扩展活动束','至多 k|V| 候选'],['累加对数分数','上一分数 + 当前 log P'],['全局保留 k 个','继续下一步']])+formula('score(y₁:ₜ) = ∑ᵢ log P(y_i | y_<i,x)');
    case 'beam-stop': return flow([['活动假设','继续扩展'],['产生 <END>','移入完成列表'],['停止条件','步数或完成数上限']])+formula('完成假设不再继续生成词');
    case 'length-normalization': return lines(['各项 log P ≤ 0，累加使长序列的分数更低','比较完成译文时，用平均对数概率减轻长度偏置'])+formula('score_norm(y₁:ₜ) = (1/t) ∑ᵢ log P(y_i | y_<i,x)');
    case 'nmt-advantages': return flow([['上下文与流畅度','学习连续表示'],['整个系统','端到端优化'],['人工工程量','减少模块和特征']]);
    case 'nmt-limitations': return flow([['解释与调试','错误较难定位'],['显式控制','规则不易指定'],['可靠性','仍需评估约束']]);
    case 'bleu': return flow([['参考译文','一种或多种表达'],['1—4 元匹配','裁剪后的精确率'],['短句惩罚','避免只输出少量词']])+formula('短语重合度 ≠ 完整的语义忠实度');
    case 'mt-challenges': return flow([['未知词 / 领域','训练分布差异'],['长上下文','跨句信息'],['低资源语言','平行数据不足']]);
    case 'attention-transition': return flow([['NMT 的进展','统一模型'],['仍有结构局限','源信息如何传递'],['Attention','每步直接访问源状态']]);
    case 'bottleneck': return ['il','a','m’','entarté'].map((word,i)=>box(48+i*80,159,60,75,`h${i+1}`,'',i===3?C.warm:C.pale)+text(word,78+i*80,285,{size:15})+arrow(78+i*80,264,78+i*80,234)+(i<3?arrow(108+i*80,196,126+i*80,196):'')).join('')+arrow(348,196,480,196)+text('整句编码',414,176,{size:15,color:C.amber})+['he','hit','me','with','a','pie','<END>'].map((word,i)=>box(480+i*60,159,45,75,`s${i+1}`,'',C.bluePale)+text(word,503+i*60,123,{size:15})+arrow(503+i*60,159,503+i*60,130)+text(['<START>','he','hit','me','with','a','pie'][i],503+i*60,285,{size:13})+arrow(503+i*60,264,503+i*60,234)+(i<6?arrow(525+i*60,196,538+i*60,196):'')).join('')+formula('最后一个编码状态，必须传递整段源句的信息');
    case 'attention-idea': return ['il','a','m’','entarté'].map((word,i)=>box(85+i*215,123,145,78,`源状态 h${i+1}`,word,i%2?C.bluePale:C.pale)+arrow(157+i*215,201,480,279)).join('')+box(360,280,240,65,'当前解码状态','每轮直接访问源位置',C.warm)+text('完整编码状态序列保持可访问',480,101,{size:16,color:C.green})+text('生成不同目标词时，重新选择所需的源信息',480,389,{size:17,color:C.muted});
    case 'attention-scores': return flow([['N 个源状态 h_i','当前解码状态 s_t'],['兼容度 e_t','每个源位置一个分数'],['Softmax','N 个非负权重']])+formula('e_(t,i) = s_tᵀh_i      α_t = softmax(e_t)      ∑ᵢ α_(t,i) = 1');
    case 'attention-context': return flow([['源状态序列','h₁,…,h_N'],['权重 α_t','加权求和 a_t'],['拼接 [a_t;s_t]','预测下一词']])+formula('a_t = ∑ᵢ α_(t,i)h_i');
    case 'attention-benefits': return flow([['访问全部源状态','绕过固定瓶颈'],['当前词专属上下文','每步重新选择'],['更短监督路径','辅助长期依赖学习']]);
    case 'attention-variants': return lines(['点积：e = sᵀh                       相同状态维度','双线性：e = sᵀWh                 可有不同维度','加性：e = vᵀ tanh(W_hh + W_ss + b)'])+formula('三个打分函数 → 同样的归一化与加权汇总');
    default: throw new Error(`Missing diagram body ${item.id}`);
  }
}
const svg = (item,content)=>`<svg xmlns="http://www.w3.org/2000/svg" width="960" height="417" viewBox="0 0 960 417" role="img" aria-label="${esc(item.title)}"><title>${esc(item.title)}</title><desc>${esc(item.note)}</desc>${defs}<rect width="960" height="417" fill="#fbfdfb"/><g font-family="PingFang SC,Microsoft YaHei,Arial,sans-serif">${text(item.title,46,40,{size:22,weight:650,anchor:'start'})}${text(item.caption,46,66,{size:13,color:C.muted,anchor:'start'})}${content}</g></svg>\n`;
const manifest={sourceSha256:facts.sha256,diagrams:[],assets:[],excludedMedia:[{file:'image94.GIF',reason:'初始帧为黄色背景，改用可暂停的 LSTM 数值计算，避免无含义色块。'},{file:'image109.GIF',reason:'初始帧为空背景，改用完整 GRU 更新图和公式。'},{file:'image167.png',reason:'重复辅助对象，不作为独立图。'},{file:'image180.png',reason:'小型覆盖块，不是软对齐图。'}]};
for(const item of slides) {
  const file=`${item.id}.svg`;
  writeFileSync(join(output,file),svg(item,body(item)));
  manifest.diagrams.push({id:item.id,file:`diagrams/rnn/${file}`,sourcePages:item.sourcePages,decision:Array.isArray(item.visual)?'preserve-source-figure':'redraw',title:item.title});
  const sequence=sequences[item.id];
  if(!sequence) continue;
  if(sequence.kind==='images') sequence.files.forEach((name,i)=>writeFileSync(join(output,`${item.id}-step-${i}.svg`),svg(item,image(name))));
  else writeFileSync(join(output,`${item.id}-live.svg`),svg(item,sequence.kind==='window'?windowBody(0,true):sequence.kind==='forward'?forwardBody(0,true):memoryBody(0,true)));
}
manifest.assets=[...assets.values()].map(({data,...entry})=>entry);
writeFileSync(join(build,'diagram-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(`Generated ${slides.length} diagrams, ${Object.keys(sequences).length} sequences, ${assets.size} original assets.`);
