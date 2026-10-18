import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const build=join(root,'..','AI工程学','.course-build','06-generative','part2');
const raw=JSON.parse(readFileSync(join(build,'source-review.json')));
export const groups=[
  [1,5,'衔接','从显式似然、自回归与 VAE 下界转到可采样的隐式分布','保留路线次序；VAE 下界作用于 log p(x)','gen-gan-intro'],
  [6,8,'任务与机制','从已知噪声生成样本，用真假判别给生成器训练信号','噪声→G→假样本，与真样本共同输入同一个 D','gen-gan-intro'],
  [9,12,'目标分解','逐项解释两类样本及固定一方时另一方的目标','真假两路、G 与 D 的梯度路径、真实项与 G 无关','gen-gan-objective'],
  [13,15,'交替更新','D 梯度上升、G 梯度下降；双方没有共同单调损失','原伪代码 G 加号需修正；可观察双方损失但不能直接当质量指标','gen-gan-training'],
  [16,18,'梯度困难','初期判别过强导致饱和，采用非饱和生成器目标','保留两条损失曲线；解释对 sigmoid logit 的梯度','gen-gan-training'],
  [19,22,'理论与边界','固定生成分布先求最优 D，再看全局分布匹配与收敛限制','最优判别器公式、匹配时 1/2；网络容量和有限数据限制','gen-gan-theory'],
  [23,23,'架构实例','DCGAN 以卷积结构学习从潜变量到自然图像','生成器分辨率路径与真实生成结果完整保留','gen-gan-architectures'],
  [24,24,'架构实例','StyleGAN 区分映射风格调制与独立随机噪声','原架构中的 mapping、AdaIN、noise 支路；通道尺度广播','gen-gan-architectures'],
  [25,25,'潜空间证据','固定两个潜变量端点插值，解码观察连续变化','保留实际猫图；PDF 仅有静帧，不伪造原视频','gen-gan-interpolation'],
  [26,28,'总结与转场','GAN 的样本质量与稳定性权衡，引出逐步生成；本节扩散按 RF 表述','历史使用阶段需限定；RF 是确定性流形式，非全部扩散等价','gen-gan-summary'],
  [29,31,'噪声直觉','由干净图到噪声，再从噪声迭代返回数据','保留同一猫图的噪声级别、t=0 数据/t=1 噪声','gen-flow-intuition'],
  [32,33,'训练样本','独立采 x、z、t，构造同一直线上的 x_t 与目标速度 z-x','蓝噪声、红数据、紫中间状态；训练方向为数据到噪声','gen-flow-training'],
  [34,35,'回归目标与代码','用平方误差学习条件平均速度；每轮重采样训练三元组','代码采样、插值、预测、MSE；图中 v 标注反向疑点须按导数统一','gen-flow-training'],
  [36,38,'采样起点','选择步数，抽初始噪声，在当前状态和时间计算速度','采样方向 t 从 1 下降，不用真实数据端点','gen-flow-sampling'],
  [39,43,'逐步积分','每步减 v/T、移动后重新求速度，展示弯曲生成路径','保留原三步轨迹证据；不能把训练直线误当所有推断轨迹','gen-flow-sampling'],
  [44,46,'采样代码与总结','恰好 T 次更新，返回 t=0；训练并行采时刻而生成顺序积分','原列表包含 0 会多更新一次，修正为 k=T,...,1','gen-flow-sampling'],
  [47,49,'条件生成','训练和每一步采样都加入同一个条件 y','原散点圆/方条件分布与训练/采样代码共同保留','gen-flow-conditional'],
  [50,51,'无条件支路','随机丢条件使同一网络支持有/无条件预测','空条件不是目标为零；数据和速度目标不变','gen-flow-cfg'],
  [52,55,'引导组合','同一 x_t,t 计算 v_u 与 v_c，再外推条件方向','保持 v=z-x 约定，向数据运动的是 -v；两支不能来自不同状态','gen-flow-cfg'],
  [56,59,'引导代价','采样使用组合速度；无独立分类器，通常两次模型评估','原分类器梯度是直觉对照，成本为近似双倍网络计算而非必然双倍时延','gen-flow-cfg'],
  [60,61,'条件平均','同一中间状态可来自不同端点对，平方损失最优是条件均值','多条穿过同点的训练线，不能预测每个未知真实配对','gen-flow-optimal'],
  [62,64,'端点与中间','独立噪声下计算两端最优速度，解释中间歧义','原均值表述缺少当前状态/符号；t=0 是无噪声','gen-flow-optimal'],
  [65,69,'训练时间分布','从均匀 t 到 logit-normal，说明中间区域权重与高分辨率偏移','保留 p(t) 曲线及坐标；不把经验策略写成普遍定理','gen-flow-schedule'],
  [70,71,'扩展动机','简单可扩展的框架仍需要高分辨率表征与架构设计','衔接广义参数化与潜空间扩散','gen-flow-schedule'],
  [72,73,'广义框架','分开输入加噪路径、回归目标和采样器','a,b 与 c,d 两组系数；统一加号以避免原符号矛盾','gen-diffusion-general'],
  [74,75,'路径比较','独立单位方差下 VP 满足 a²+b²=1，VE 保留信号并增大噪声','根号以原图为准，PDF 提取文本丢根号；VE 终点只是噪声占优','gen-diffusion-general'],
  [76,76,'预测目标','比较 x、epsilon、VP v 预测及可逆转换条件','修正原 c,d 与公式不一致；VP v=a z-b x，不混同 RF z-x','gen-diffusion-targets'],
  [77,77,'潜空间架构','编码压缩图像，在潜空间迭代，再解码，条件经交叉注意力进入','保留完整 LDM 图和像素/潜空间边界','gen-ldm'],
  [78,79,'实验与生成证据','在数据集与采样设定内比较指标，结合原提示与样例看语义和文字限制','完整四组数据表、六列提示/两行生成图及采样说明','gen-ldm'],
  [80,81,'Transformer 去噪','潜变量切块后用 DiT，比较条件注入的结构消融与训练曲线','保留 DiT 完整架构、FID 曲线、ImageNet 256 表','gen-dit'],
  [82,84,'表征对齐','用冻结视觉编码器的干净特征监督扩散网络内部表示','保留方法/加速曲线、层级探针/对齐/FID、消融表','gen-repa'],
  [85,88,'视频生成','CogVideoX 联合文本和视频 token，以 3D VAE 和打包训练应对时空成本','保留架构、8×8×4 压缩、frame packing、5B/2B 结果表','gen-cogvideox'],
  [89,91,'视频表征对齐','VideoREPA 对齐视频关系表征以改善运动与物理一致性','保留两种场景帧/轨迹、TRD 方法、VideoPhy 表','gen-videorepa'],
  [92,95,'世界模型','从视频编码的多层特征学习对齐并建模关系，用消融和多场景序列检验','标题 WorldForge，图内方法 DreamWorld，不擅自认定同名；保留方法、失败例、三表、生成帧','gen-worldforge'],
  [96,97,'动作条件世界模型','H3-World 将动作分解和分层交互用于受控未来生成','保留堆叠 token/三种注意力与同一起点动作反事实','gen-h3-world'],
  [98,99,'迁移应用与收束','生成表征可用于感知；比较普通像素头与扩散式预测，再看开放词汇分割结果','两个管线及完整 benchmark 表；区分感知评估与生成质量','gen-generative-applications'],
  [100,100,'结束','以四类生成路线的目标、生成路径与代价复习全讲','致谢不额外扩写课程主题','gen-generative-applications'],
];
mkdirSync(build,{recursive:true});
const pages=raw.pages.map(p=>{
  const g=groups.find(([a,b])=>p.sourcePage>=a&&p.sourcePage<=b);
  return {...p,title:p.exactText.split('\n')[0],teachingRole:g[2],teachingIntent:g[3],visualStructure:g[4],contextLinks:{pageGroup:[g[0],g[1]],readingSection:g[5]},formulasAndData:'原始文本和行框见 exactText/textLines；图内公式、表格见配套原图与 OCR；校正见 issues.md',exampleStates:p.sourcePage>=29&&p.sourcePage<=76?{identities:['固定数据 x','独立噪声 z','时间 t','中间状态 x_t','速度目标 z-x'],sourceConvention:'t=0 数据，t=1 噪声；训练速度沿增大 t，生成沿减小 t',progression:g[4],numbers:'原采样图用三步示意；网页补充二维算例需明确标记，不能称原实验'}:p.sourcePage>=6&&p.sourcePage<=26?{identities:['真实样本 x','噪声 z','假样本 G(z)','同一判别器 D'],progression:g[4],conditions:'更新 D 时冻结 G；更新 G 时冻结 D 的参数但保留对输入的梯度'}:null,assets:'PDF 组合图，见 source-crops.json；不将截图当作可编辑对象或原视频',uncertainties:'仅有 PDF；备注、音视频和动画元数据不可恢复。图内文字由图像核对，OCR 只辅助索引，不作为未经核查的结论。'};
});
writeFileSync(join(build,'facts.json'),JSON.stringify({...raw,pages,groups:groups.map(([a,b,role,intent,visual,section])=>({sourcePages:[a,b],role,intent,visual,section}))},null,2)+'\n');
const crops=[
  ['dcgan',23,[.52,.22,.40,.57],'卷积生成器与自然图像样本'],
  ['stylegan',24,[.59,.19,.32,.66],'StyleGAN 映射、样式、噪声完整架构'],
  ['gan-interpolation',25,[.55,.19,.34,.60],'潜空间插值视频的可见猫图静帧'],
  ['noise-levels',30,[.68,.18,.21,.67],'同一猫图 t=0 至 t=1 与端点说明'],
  ['sampling-path',43,[.58,.15,.36,.68],'三次采样更新，含噪声分布、数据分布和中间点'],
  ['conditional-flow',48,[.58,.15,.36,.68],'圆/方条件数据分布与噪声起点'],
  ['noise-schedule',68,[.59,.19,.35,.42],'logit-normal 时间分布曲线、坐标与图例'],
  ...Array.from({length:23},(_,i)=>[77+i, ['ldm-architecture','ldm-results','ldm-samples','dit-architecture','dit-results','repa-method','repa-analysis','repa-results','cogvideox-architecture','cogvideox-vae','cogvideox-packing','cogvideox-results','videorepa-evidence','videorepa-method','videorepa-results','worldforge-method','worldforge-failures','worldforge-results','worldforge-samples','h3-world-method','h3-world-actions','perception-pipelines','perception-results'][i]]).map(([page,id])=>[id,page,[.065,.145,.875,.735],'完整方法图、实验表或生成案例；保留图例、坐标、表头、行列、配对和图内说明']),
].map(([id,sourcePage,boundsTopLeftNormalized,description])=>({id,sourcePage,boundsTopLeftNormalized:sourcePage>=77?[.01,.145,.98,.79]:boundsTopLeftNormalized,description,output:'media/generative/part2/'+id+'.png',decision:'保留完整观察对象；原图静态证据不冒充动态视频，复杂图可放大查看'}));
writeFileSync(join(build,'source-crops.json'),JSON.stringify({sourceSha256:raw.sha256,coordinateSystem:'PDF mediaBox 左上归一化坐标，4x PDF point 渲染',crops},null,2)+'\n');
writeFileSync(join(build,'teaching-logic-review.md'),`# 生成模型 Part II 教学思路审查

输入：pdf/Part II-Generative.pdf，100 页，SHA-256 ${raw.sha256}。Part I 与 II 合成第六讲，保留 Part I 的 47 个演示页和已有锚点，后续内容追加。五阶段全流程、两种模式均已授权。

## 目标、原始叙事与深度

从上一部分的似然训练转到“只需可采样的分布怎样训练”。GAN 先有噪声到样本，再借真假判别建立目标，交替更新、饱和问题、非饱和替代，最后求理想最优 D 并说明理论边界。DCGAN、StyleGAN、插值给出架构与定性证据，不能用一个损失公式替代整段教学。

从 GAN 的博弈困难转到噪声逐步回到数据。先观察同一图像的噪声级别，再构造 x_t 与 z-x，解释 MSE 及训练代码。按原三步例逐次“求速度→移动→重新求速度”，得到采样代码。随后加入条件、随机条件丢弃、两支速度和 CFG；再追问 MSE 的最优预测，解释条件均值、端点和中间歧义，由此引出非均匀时间采样。保留原顺序，不提前将条件均值作为定义压过任务与计算。

广义扩散把输入路径与输出目标分开，VP/VE 和 x/epsilon/v 需公式、条件与符号校核。由像素规模困难引出 LDM，再到 DiT 与 REPA。视频沿 CogVideoX→VideoREPA→WorldForge→H3-World→感知应用逐一保留方法、实验、案例，作为研究实例深度，不扩写来源没有的工程实现或实时能力。

## 逐项页组与承接

${groups.map(([a,b,role,intent,visual,section])=>`- ${a}–${b} ${role}：${intent}。原证据/推导：${visual}。阅读 #${section}，演示在同节拆成相同内容的步骤，精确位置由 teaching-coverage.json 生成。`).join('\n')}

## 图与状态规格

30 组原图证据见 source-crops.json，先渲染核查再写正文。复杂论文图和实验表保留完整信息，图注说明观察条件和指标方向，不将全部结果缩成普遍胜出结论。图内标题 WorldForge/DreamWorld 不一致只说明图内方法标识。

重绘结构图沿用 960×440 画布。GAN 保留真假两路和冻结/更新边界；Rectified Flow 明确训练 v=z-x 与推断 -v 的反向关系；CFG 所有速度共用同一状态，画移动方向 -v 避免符号矛盾。计划加入 GAN 交替更新、直线插值、三步 Euler 与 CFG 向量组合四个有数值状态的序列，固定端点/噪声，提供现有播放控件，阅读终态、减少动态和离开暂停。

阅读与演示共用一份数据。补充算例仅用于逐项计算，不替代原照片、曲线、表格或论文结果。公式独立 KaTeX 渲染，紧随符号、维度和适用条件；代码作为独立可横向滚动文本。

## 疑点、边界与验收

issues.md 记录 GAN 更新符号、饱和梯度链、AdaIN 的样式/噪声区别、RF 端点与符号、采样步数、CFG 方向、条件均值、VP 根号及 v-prediction。仅有 PDF 无法恢复原动画，保留静态帧且不编造视频。

无需人工决策的阻塞问题。目录继续只有第六讲，标题更新为完整生成模型，两个 PDF 保持独立下载。验收覆盖全部新增演示页、阅读锚点、计算与数值、资产校验、实际下载、移动端局部横向滚动、动画清理、KaTeX 和图内边界；回归检查 Part I 页序与交互。
`);
writeFileSync(join(build,'issues.md'),`# Part II 疑点与教学层修正

核查日期 2026-10-15，原始文本保持不变。

1. 4–5：VAE 的下界为 log p_theta(x) 的下界，不是 p_theta(x) 本身；GAN 仍定义隐式分布 p_G，只是不要求可求值的显式密度。
2. 14–15：min_G max_D V 对 D 梯度上升、对 G 下降。双方损失可记录，缺少的是共同单调、可直接对应样本质量的单一标量。
3. 16–18：log(1-D) 对概率 D 的导数在 D≈0 不为零；经过 sigmoid 的 logit 导数为 -D，才解释 G 的弱信号。非饱和 -log D 的 logit 导数 D-1。
4. 19–22：D*=p_data/(p_data+p_G) 仅在分母正处定义；分布匹配是理想全局解，不保证有限网络交替梯度收敛。依据 https://arxiv.org/abs/1406.2661 §2–4。
5. 23–26：DCGAN 表述为自然图像卷积架构实例，避免“第一个非玩具 GAN”绝对史实；StyleGAN 风格来自映射网络及 affine/AdaIN，独立噪声另行注入。AdaIN 按通道归一化并广播样式参数，不是每个像素独立预测；公式加 epsilon 保数值稳定。https://arxiv.org/abs/1812.04948 。
6. 28–46：以 t=0 数据、t=1 噪声统一 x_t=(1-t)x+tz；导数 v=z-x。原示意箭头可能画生成方向，网页区分 -v。Euler 从 1 向 0 恰好 T 步，k=T,...,1；不在 t=0 再更新。原三步图说明路径弯曲，学习到的边缘速度不必沿某一随机训练配对直线。https://arxiv.org/abs/2209.03003 、https://arxiv.org/abs/2210.02747 。
7. 50–59：CFG 写 v_cfg=(1+w)v_c-w v_u，w=0 为普通条件预测；在本时间约定下实际移动 -v_cfg，原“指向数据”的 v 文字不沿用。两次模型预测通常约双倍网络计算，可合并 batch，非严格双倍时延。https://arxiv.org/abs/2207.12598 。
8. 60–66：MSE 最优 v*=E[z-x|x_t,t]；独立耦合下 t=1 为 z-E[x]、t=0 为 E[z]-x=-x（标准高斯）；原文直接说均值丢失减项且把 t=0 也写 Full noise。中间难度是原经验动机，非所有分布必然最难。
9. 67–71：logit-normal 为 u~N(m,s²)、t=sigmoid(u)，高分辨率时间偏移是经验设计，不等同改变生成 ODE 的时间方向。https://arxiv.org/abs/2403.03206 。
10. 74：原视觉含根号，文字提取丢失，不判为原公式错误。VP a=sqrt(s),b=sqrt(1-s)，独立单位方差才有 Var(x_t)=1；RF 方差为 (1-t)²+t²。VE a=1,b=sigma(t)，有限终点是信号被噪声压过，不严格等于纯高斯。
11. 73/76：原 y=cx-dz 的系数与 epsilon/v 公式互相不一致。网页统一 y=cx+dz；x:(1,0)，epsilon:(0,1)，VP v:(-b,a)，v=a z-b x。RF 的 z-x 与 VP 角参数速度不可混同；还原与采样器须匹配路径。标准 VP v 依据 https://arxiv.org/abs/2202.00512 §2。
12. 77–99：原页大部分只有标题可提取，实际论文图、表和图注必须视觉核对并保存 OCR 辅助索引。表内实验只在各自数据/采样条件下成立，不构造跨论文排名。WorldForge 章节的图表标识 DreamWorld，保留该差异；不推测未提供的重命名历史。

所有上述原图和原始文字保留在 source-review.json、source-crops.json 与资产清单中。补充二维算例是教学计算，不属于原论文数据。未恢复的动画与视频不声称已恢复。
`);
console.log('Saved Part II 100-page fact index, teaching review and 30 crop specifications.');
