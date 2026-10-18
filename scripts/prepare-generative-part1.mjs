import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const build=join(root,'..','AI工程学','.course-build','06-generative','part1');
const facts=JSON.parse(readFileSync(join(build,'source-review.json')));
const groups=[
  [1,3,'课程路线','认识生成模型全讲范围；Part I 到 VAE，Part II 延续 GAN 与扩散模型','目录的强调颜色标记当前主题；封面与重复目录不作独立知识点','gen-learning-tasks'],
  [4,8,'监督任务','从图像到标签、描述、边框和像素类别，先确认输入输出','同一监督框架，猫分类、行李箱上的猫描述、两犬一猫检测、天空草地猫树分割；四例不能互换','gen-learning-tasks'],
  [9,12,'无监督任务','无外部标签时学习聚类、低维结构和密度','聚类散点、3D 到 2D PCA、1D/2D 密度，保持坐标与配对','gen-unsupervised'],
  [13,14,'三类分布','区分 p(y|x)、p(x)、p(x|y) 及归一化对象','猫图与标签配对；密度归一化积分，不能把密度当单点概率','gen-distributions'],
  [15,17,'判别模型','固定每幅图像，在标签间分配概率；输入异常仍输出分布','猫与犬各有两类柱图；猴与噪声仍有分类分布，柱高仅示意','gen-distributions'],
  [18,20,'生成模型','固定模型，在所有可能图像间分配概率质量或密度','猫、犬、猴、噪声共用横轴，强调跨图像比较；拒识能力需加条件','gen-distributions'],
  [21,21,'条件生成','固定类别后，比较该条件下所有可能图像','cat 与 dog 两行，图像身份与位置一致，颜色对应条件','gen-conditional'],
  [22,23,'贝叶斯联系','用联合分布联系三类模型；恒等式不等于常见训练方案','分子判别条件项、无条件项与标签先验分母分别标明','gen-conditional'],
  [24,27,'模型用途','从分布区别转到分类、表征、异常分析和采样用途','三条平行分支，生成模型包含条件与无条件，不把视觉并列读作包含','gen-conditional'],
  [28,29,'一对多动机','提示词能有多首诗，一张图能有多种未来；学习可能输出的分布','保留诗歌提示与输出语义；图像到视频是同一手部纸盒场景的未来，不以通用图库替换','gen-ambiguity'],
  [30,31,'方法地图','按密度计算与采样路径区分四类方法，引出显式似然','原图扩散模型放置过于绝对：网页用计算目标和采样方式表格，GAN/扩散仅预告','gen-model-map'],
  [32,35,'最大似然','给定独立样本，概率乘积转为对数和，再转为可最小化的 NLL','连续三次展开同一目标；原文最大化与梯度下降需统一负号','gen-likelihood'],
  [36,39,'链式分解','序列联合分布等于条件分布的乘积；RNN 与因果 Transformer 共享该分解','RNN 时间箭头与 Transformer 因果遮罩是两种参数化，不能表述成任意掩码模型','gen-autoregressive'],
  [40,42,'图像自回归','将 RGB 子像素按扫描顺序转成 256 分类；解释生成成本与分块方向','保留人物课堂照片及 RGB 放大图；1024²×3=3145728；tiles 是方向预告','gen-image-ar'],
  [43,44,'VAE 转场','从可算的条件乘积转到有定义却难精确积分的潜变量密度','VAE 优化的是对数似然的下界，不能称密度本身没有定义','gen-autoencoder'],
  [45,47,'自编码器','从无标签特征的目标，引出解码器重建与 L2 训练信号','x 向上经编码器得 z 再解码到重建；原输入/重建缩略图保留成对关系','gen-autoencoder'],
  [48,48,'特征迁移','训练后接分类头，区分预训练无标签与下游有标签','替换解码器为分类器；不能把下游监督也写成无监督','gen-autoencoder'],
  [49,51,'采样缺口','仅有解码器还不知道从哪里采 z；引出已知先验','解码路径不变，逐步加入采样困难与先验思路','gen-latent-model'],
  [52,55,'潜变量生成过程','先采潜变量，再从条件分布采观察量；先验取标准高斯','z 到 x 是生成方向，编码方向稍后才出现；属性方向只作直觉','gen-latent-model'],
  [56,59,'边缘化困难','观测数据没有 z，只能对 z 积分；两个因子可算不保证积分可算','同一积分依次强调解码器和先验，保留困难而不跳到公式答案','gen-inference'],
  [60,63,'后验困难','贝叶斯式分母为真实后验，依赖同样的难算边缘似然','依次高亮条件似然、先验、后验；说明贝叶斯改写未解决困难','gen-inference'],
  [64,66,'变分近似','引入 q_phi(z|x) 近似 p_theta(z|x)，联合训练推断与生成网络','原页 66 把后验写成 p(x|z)，输入变量也误称 latent x；必须校正','gen-variational'],
  [67,70,'分布输出','编码器给均值与对角方差，解码器给观察分布参数；固定高斯方差对应平方误差','两网络方向相反；Sigma 为协方差，sigma 为标准差；重建期望一般需采样','gen-variational'],
  [71,72,'ELBO 代数起点','从贝叶斯恒等式开始，分子分母乘同一个 q，保留先验因子','原页 72 个别分母变量/先验因子有排版错误；按前后页完整恒等式修正','gen-elbo-algebra'],
  [73,74,'拆对数与取期望','拆成重建、先验比和后验比；左侧与 z 无关所以可取 q 期望','三项位置与正负号稳定，不压成一个结论式','gen-elbo-algebra'],
  [75,75,'KL 分解','识别两个 KL，得到 log p = 重建项 - 先验 KL + 后验 KL','两个 KL 的第二个分布不同，最后一项在等式中为正','gen-elbo-bound'],
  [76,77,'可计算项','重建对固定 z 可算，但一般对 q 的期望不可解析；高斯先验 KL 有闭式','原页 76 对重建闭式的表述需限定，先验 KL 才是该设置的解析正则','gen-elbo-bound'],
  [78,81,'下界与训练目标','真实后验 KL 难算且非负；去掉正项得到 ELBO，联合最大化','界是 log p 的下界；差距为后验 KL，不能保证训练中始终收紧','gen-elbo-bound'],
  [82,83,'训练编码','输入 x 后编码器输出分布参数','训练初始状态与编码器展开，是同一条固定计算图','gen-vae-training'],
  [84,84,'正则与重参数化','计算先验 KL，再用独立标准高斯噪声构造 z，梯度经参数变换传播','原式 Sigma 若为方差不能直接乘噪声；统一 z=mu+sigma*epsilon','gen-vae-training'],
  [85,86,'解码与重建','同一个 z 输入解码器，预测均值并计算重建 NLL，反传更新两网络','保持 x、mu、sigma、epsilon、z、重建配对；补充小数值例仅用于检查计算','gen-vae-training'],
  [87,87,'目标之间的张力','重建保留个体信息，先验 KL 限制编码偏离；不能把极端写成严格必然','固定计算图上比较目标；方差趋零使高斯 KL 发散，需指出代价','gen-vae-tradeoff'],
  [88,88,'生成采样','训练完成后从先验抽 z，仅用解码器生成；均值显示与严格采样分开','编码器退出生成路径；p(x|z) 高斯时输出均值与再加观察噪声不同','gen-vae-sampling'],
  [89,89,'潜空间可视化','固定其他维度沿两个轴变化，观察实际数字网格的连续变化','完整保留数字网格和两个坐标箭头；独立先验不保证语义解耦','gen-vae-sampling'],
  [90,93,'复习与衔接','复习监督/无监督、三类分布和模型地图，以相同计算问题进入 Part II','致谢不是新主题；Part II 网页内容本轮不生成','gen-part1-recap'],
];
const expanded=facts.pages.map(p=>{
  const g=groups.find(([a,b])=>p.sourcePage>=a&&p.sourcePage<=b);
  const exampleStates=p.sourcePage>=13&&p.sourcePage<=21?{identity:['草地猫','黄色犬','猴','彩色噪声'],dataState:'样本身份保持；15–17 每个输入上对标签归一化，18–20 改为图像空间，21 固定 cat/dog 条件',numericValues:'柱高仅示意，未提供确切数值'}:p.sourcePage>=45&&p.sourcePage<=51?{identity:['同一个输入 x','其编码 z','其重建 x-hat'],operations:['编码','解码重建','与同一个 x 比较','换分类头迁移','追问如何采新 z'],parameters:'网络参数为可训练符号，来源没有给出数值'}:p.sourcePage>=71&&p.sourcePage<=81?{identity:['固定观测 x','潜变量 z','先验 p(z)','真实后验 p_theta(z|x)','近似后验 q_phi(z|x)'],operations:['贝叶斯恒等式','乘 q/q','拆对数','取 q 期望','识别两个 KL','利用非负差距得到下界'],conditions:'同一固定 x；对相同 q 取期望；原始公式疑点见 issues.md'}:p.sourcePage>=82&&p.sourcePage<=88?{identity:['固定训练输入 x','编码均值与尺度','独立噪声 epsilon','采样 z','解码均值'],operations:['编码','先验正则','重参数化','解码','重建损失','平衡两个目标','生成时从先验采样'],parameters:'来源只有符号；网页二维数值是明确标识的补充结构算例，不能当成原实验数据'}:null;
  return {...p,title:p.exactText.split('\n')[0],teachingRole:g[2],teachingIntent:g[3],visualStructure:g[4],contextLinks:{pageGroup:[g[0],g[1]],readingSection:g[5]},exampleStates,formulasAndData:'原始公式保留在 exactText / textLines；视觉公式核对及修正见 issues.md',assets:'PDF 页面图元的完整组合；保留范围见 source-crops.json',uncertainties:'PDF 无法恢复 PPTX 备注、动画与对象层级；以连续页和原页视觉核对解释渐进呈现'};
});
mkdirSync(build,{recursive:true});
writeFileSync(join(build,'facts.json'),JSON.stringify({...facts,pages:expanded,groups:groups.map(([a,b,role,intent,visual,section])=>({sourcePages:[a,b],role,intent,visual,section}))},null,2)+'\n');
const crops=[
  ['classification',5,[.48,.30,.43,.45],'猫图到 Cat 标签的完整示例'],
  ['captioning',6,[.57,.19,.41,.54],'行李箱上的猫与原英文描述'],
  ['detection',7,[.58,.19,.30,.59],'两犬一猫，保留边框与类别'],
  ['segmentation',8,[.59,.18,.29,.61],'天空、草地、猫、树的语义区域'],
  ['clustering',10,[.04,.20,.42,.69],'K-means 三色散点及标题'],
  ['pca',11,[.015,.23,.46,.66],'三维点投影到二维及箭头'],
  ['density',12,[.035,.18,.43,.71],'一维与二维密度图、坐标和色条'],
  ['discriminative',16,[.38,.16,.60,.75],'同一猫犬图分别归一化标签概率'],
  ['unusual-inputs',17,[.39,.16,.59,.75],'猴与噪声输入仍输出标签分布'],
  ['generative',20,[.34,.16,.64,.60],'猫犬猴噪声共享图像概率轴'],
  ['conditional',21,[.34,.18,.58,.67],'cat / dog 两个条件下的同一图像集合'],
  ['video',29,[.17,.47,.68,.42],'纸盒手部场景的输入与两个未来图像'],
  ['rgb-scan',40,[.59,.17,.35,.77],'课堂人物照片及 RGB 子像素放大示意'],
  ['reconstruction',47,[.74,.19,.24,.72],'输入图像与重建图像配对网格'],
  ['latent-grid',89,[.61,.22,.34,.64],'数字潜空间网格及两个变化方向'],
].map(([id,page,bounds,description])=>({id,sourcePage:page,boundsTopLeftNormalized:bounds,description,output:'media/generative/part1/'+id+'.png',decision:'保留完整观察对象；移除页面装饰与无关段落，图中英文与数据不改写'}));
writeFileSync(join(build,'source-crops.json'),JSON.stringify({sourceSha256:facts.sha256,coordinateSystem:'相对于 PDF mediaBox 的左上角归一化坐标 x,y,width,height；以 4x PDF point 渲染',crops},null,2)+'\n');
writeFileSync(join(build,'teaching-logic-review.md'),`# 第六讲：生成模型 Part I 教学整理

输入：ai-engineering-course/pdf/Part I-Generative.pdf，93 页，SHA-256 ${facts.sha256}。
Part II 与 Part I 共用生成模型一讲。本轮只核对 Part II 目录和衔接，不生成 GAN、扩散模型正文。
执行范围：已授权五阶段全流程，阅读与演示两种模式。来源只有 PDF；不能恢复未提供的 PPTX 信息。
既有要求：移除目录中的“已生成完整讲义”；沿用网站阅读、演示、锚点和下载模式。

## 教学目标与叙事链

先明确监督和无监督任务的输入输出，再区分三类分布及一对多生成动机。通过最大似然和链式分解建立可算的自回归模型，借图像序列成本引出不同生成路径。随后先讲普通自编码器的学习目的、重建训练和采样缺口，再用已知先验、潜变量边缘化和后验困难引入变分编码器。按原顺序完整推导 ELBO，最后把目标落到重参数化、训练、采样和潜空间网格。

## 页组与两种模式的定位

${groups.map(([a,b,role,intent,visual,section])=>`- ${a}–${b} / ${role}：${intent}。图证与关系：${visual}。阅读 #${section}；演示按同节步骤展开，精确页序由 teaching-coverage.json 记录。`).join('\n')}

## 关键过渡与深度

监督任务明确目标形式 → 无监督说明标签缺席不等于无目标 → 密度建模明确学习对象 → 生成需求说明单点预测不能表达多个可能结果 → 最大似然回答如何训练 → 链式分解回答如何参数化 → 长图像序列揭示生成成本 → 普通自编码器揭示表征与采样之间的缺口 → 先验提供可采样潜变量 → 积分和后验困难说明需要近似推断 → ELBO 给出可优化目标 → 重参数化令训练计算图可微 → 推断与生成路径分离。

GAN、扩散模型仅出现在路线和比较中；不添加其损失或采样算法。RNN 与 Transformer 只复用前课的因果参数化，不重复展开架构。ELBO 需独立展示贝叶斯起点、乘 q/q、拆对数、取期望、KL 分解、非负性和最终目标，不能只给结果。补充一个固定的二维数值计算用于检查 sigma 与方差的区别，明确它是结构算例。

## 图解与交互规格

保留 15 组 PDF 图证：四种监督任务、三种无监督任务、判别与异常输入、生成与条件分布、纸盒未来、RGB 扫描、输入/重建配对、数字潜空间网格。由 source-crops.json 确定区域和语义，渲染后逐一检查。
结构图用 960×440 固定坐标与蓝/绿/暖色语义：蓝色表示观察数据，绿色表示潜变量或推断，暖色表示随机噪声或目标。箭头明确生成方向与推断方向。公式以可访问的 KaTeX 块呈现，不把复杂推导塞入缩略图。
序列：自回归条件依次加入并累计联合概率；自编码器依次编码、重建、比较和迁移；VAE 固定 x、mu、sigma、epsilon，逐步计算 z、解码输出和损失。每个序列有播放、暂停、上一步、下一步、重播，减少动态偏好下不自动播放。阅读默认显示终态。

## 人工决策与交付

无阻塞歧义。网页标题为“生成模型”，当前内容为 Part I；保留可追加的 generative-models.html 地址。两份 PDF 都提供对应下载，课程目录保持一讲。内部逐项覆盖表记录原任务、图证、公式与两模式位置；最终验收记录来源与产物校验值、浏览器截图、数值和移动端结果。
`);
writeFileSync(join(build,'issues.md'),`# 公式与事实核查

原始提取保存在 source-review.json；下列修正仅进入教学层。核查日期：2026-10-15。

1. 14–21：连续密度的点值不等于点概率，密度可超过 1；归一化对象应是积分。离散图像用概率质量与求和。15/91 的分类图旁积分只作概率回顾，网页把分类归一化明确写为对 y 求和。
2. 17/20/26：普通判别输出需要外加拒识机制；生成密度可提供异常分数，但高似然不保证语义属于训练分布。只作原用途的条件限定，不扩写异常检测章节。证据：[Nalisnick et al.](https://arxiv.org/abs/1810.09136)。
3. 30/92：扩散放在“不能计算密度”分支过于绝对，某些扩散形式可估计似然或训练下界；网页比较的是典型目标与采样路径。Part II 再展开。证据：[Ho et al.](https://arxiv.org/abs/2006.11239) 使用加权变分界。
4. 35：最大化对数似然应梯度上升，或最小化负对数似然后梯度下降；网页统一最小化 NLL。
5. 39：masked Transformer 在此指因果遮罩自回归模型，不能泛指 BERT 的双向掩码建模。
6. 44/79–81：ELBO 下界作用于 log p_theta(x)，不是 p_theta(x) 本身；潜变量密度有明确数学定义，只是非线性解码器导致积分通常难精确计算。
7. 66–70：q_phi(z|x) 近似真实后验 p_theta(z|x)，原文 p_theta(x|z) 是变量顺序错误；x 为观测数据。把 q 直接代入贝叶斯比值不构成稳定、归一化、可训练的似然公式，不作为最终目标。
8. 68–69/84–87：统一 q=N(mu,diag(sigma²))；标准差 sigma>0，协方差不能直接逐元素乘标准正态噪声。z=mu+sigma*epsilon；若网络输出 log variance s，sigma=exp(s/2)。
9. 71–75：从完整贝叶斯式恢复 q/q 乘法，保留 p(z)，分母必须为 p_theta(z|x)q_phi(z|x)。三个对数项符号为 +重建、−先验比、+后验比；两个 KL 各自第二项不同。
10. 76–78：固定 z 的高斯对数似然可算，非线性解码器下对 q 的重建期望通常不能解析，需 Monte Carlo。q 与标准高斯 p 的 KL 有闭式；真实后验通常非高斯，后验 KL 难算。不能只说“for Gaussians”却把三者混为一谈。
11. 84/87：KL 鼓励逐样本后验接近先验；若每个都完全相同会丢失输入信息，不应把它写成必须逐样本严格相等的训练硬约束。重建偏好小噪声是趋势，不保证全局最优标准差必为 0；sigma→0 时 KL 发散。
12. 88：解码器输出高斯均值可作图像展示，严格采样还需从 p_theta(x|z) 抽样。
13. 89：对角高斯先验的独立维度不保证学得语义解耦；潜空间网格是变化的定性观察。证据：[Locatello et al.](https://arxiv.org/abs/1811.12359)。

上述 VAE 符号、下界和重参数化以 [Kingma & Welling, §2–3、附录 B](https://arxiv.org/html/1312.6114v11) 的定义核对，并由教学数据中的公式逐项代数检查。图像自回归顺序与离散通道预测以 [van den Oord et al.](https://arxiv.org/abs/1601.06759) 核对。网站不复制论文段落。

PDF 限制：没有音视频附件或可恢复的动画元数据；29 页仅保留实际可见输入与未来帧，不声称重建原视频。低分辨率的图内文字不人为编造，使用网页图注补充观察重点。
`);
console.log('Saved 93-page factual index, teaching review, issue log and 15 source crop specifications.');
