export const assetVersion='20261015-1';
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const E=(tex,explanation)=>({tex:tex.replaceAll('@',String.fromCharCode(92)),explanation});
const S=(id,title,caption,sourcePages,visual,note,reading=[],equations=[])=>({id,title,caption,sourcePages,visual,note,reading:[note,...reading],equations,evidence:id==='ae-reconstruction'?{url:'media/generative/part1/reconstruction.png?v='+assetVersion,alt:'下方输入图像与上方重建图像按位置配对；中间箭头表示重建方向。',caption:'输入与重建按网格位置一一对应，观察颜色、结构和细节的变化。'}:null});
const G=(id,title,topic,intro,steps)=>({id,title,topic,intro,steps});
export const topics={
  foundations:{label:'生成建模基础',target:'gen-learning-tasks'},
  autoregressive:{label:'自回归模型',target:'gen-likelihood'},
  vae:{label:'变分自编码器',target:'gen-autoencoder'},
};

export const sections=[
  G('gen-learning-tasks','先明确学习任务的输入与输出','foundations','学习方式取决于训练中能观察到什么，以及模型要输出什么。先从熟悉的图像任务建立这两个坐标。',[
    S('generative-route','本讲路线：Part I 与 Part II','Part I：概率建模、自回归与 VAE · Part II：GAN、连续生成与应用',range(1,3),'route','本讲分为两部分，按模型获得训练信号和生成样本的路径来划分。Part I 从概率建模出发，依次覆盖生成建模基础、最大似然与自回归、VAE；Part II 转向 GAN、Rectified Flow 与扩散、条件生成与 CFG，并以图像、视频和世界模型为应用实例。',['Part I 对应网页的第 1–47 个演示步骤；第 48 步起进入 Part II，首先讨论 GAN 怎样在不直接计算样本似然时获得训练信号。','两部分始终围绕同一组问题：怎样学习数据或条件数据的分布，怎样从模型生成新的样本？']),
    S('supervised-tasks','同样是图像，输出可以完全不同','类别、描述、边框与像素标签',range(4,8),['classification','captioning','detection','segmentation'],'监督学习（supervised learning）的训练数据为成对的输入 x 与目标 y。猫图分类输出 Cat；图像描述输出“地板上行李箱上的一只猫”；目标检测输出两只犬和一只猫的框与类别；语义分割给天空、草地、猫、树等像素区域赋类别。',['分类给整幅图的标签，描述生成文字，检测定位对象，分割逐像素分类。目标形式不同，所需标注也不同。回归同样使用输入与数值目标的配对。']),
  ]),
  G('gen-unsupervised','没有标签，仍可学习数据结构','foundations','当训练样本只有 x，任务可以围绕样本之间的组织、低维表示或整体分布来定义。',[
    S('unsupervised-tasks','聚类、降维与密度估计','从样本结构到 p(x)',range(9,12),['clustering','pca','density'],'无监督学习（unsupervised learning）不依赖外部任务标签。K-means 聚类按特征相近程度分组；主成分分析（Principal Component Analysis，PCA）把三维样本投影到二维；密度估计（density estimation）学习哪些区域更集中。',['聚类散点的颜色表示分组，PCA 的箭头表示降维前后对应关系。密度图进一步为不同位置分配非负数值；这条路线把问题引向数据分布 p(x)。']),
  ]),
  G('gen-distributions','判别与生成：概率分配给谁','foundations','先固定条件，再看哪些变量共享归一化约束，才能理解不同模型实际学习的对象。',[
    S('three-distributions','三种分布，三种问题','p(y|x)、p(x)、p(x|y)',[13,14],'distributions','判别模型（discriminative model）学习给定数据的标签分布 p(y|x)；无条件生成模型学习数据分布 p(x)；条件生成模型学习给定标签或其他条件的 p(x|y)。',['对连续变量，密度值本身不是单点概率，区间概率由积分给出，密度可以大于 1。对离散图像或类别，使用概率质量与求和。两种情形都要求非负且总量为 1。'],[
      E('p(x)@geq0,@qquad@int p(x)@,dx=1','连续 x 的密度在整个取值空间上积分为 1；某个区域 A 的概率为对 A 积分。离散 x 则改为求和。'),
    ]),
    S('discriminative-probabilities','固定图像，在类别之间分配概率','每张图像分别归一化',range(15,17),['discriminative','unusual-inputs'],'对猫图，Cat 和 Dog 两个候选标签竞争概率；换成犬图，就建立另一组类别分布。不同图像之间没有共同的标签概率总额。',['普通分类器即使面对猴或彩色噪声，也会在预设类别中输出归一化分布。要拒绝不适用的输入，还需要另外设计并验证拒识机制。图中的柱高用于解释归一化对象，不是模型评测数值。'],[
      E('@sum_{y@in@mathcal{Y}}p(y@mid x)=1','固定任一输入 x，在类别集合 𝒴 上求和。它不要求把不同输入的 p(y|x) 加起来等于 1。'),
    ]),
    S('generative-probabilities','固定模型，比较所有可能图像','对象、姿态与结构共同影响分布',range(18,20),['generative'],'生成模型把概率质量分配到所有可能的离散图像；连续建模时则分配密度。猫、犬、猴与噪声都位于同一个输入空间中。',['模型需要反映外观、结构、姿态及其组合的规律，例如犬坐着与站着的可能性。密度可以作为异常分析的信号，但高似然并不保证输入在语义上属于训练分布，异常检测需要独立检验。']),
  ]),
  G('gen-conditional','给定条件后生成什么','foundations','条件固定后仍可能有许多合理输出。贝叶斯公式进一步说明条件生成、判别和无条件生成之间的联系。',[
    S('conditional-probabilities','同一图像集合，不同条件分布','固定 cat 或 dog，分别比较可能图像',[21],['conditional'],'条件生成（conditional generation）固定 y 后，在所有可能的 x 之间分配概率。条件为 cat 时猫图更合理，条件改为 dog 后图像的相对概率会改变。',['两个条件对应两次独立归一化。条件也可以是一段提示词、一张参考图或上下文，输出则是与之相符的新数据。'],[
      E('@sum_x p(x@mid y)=1','离散情形下，对固定条件 y 的全部 x 求和；连续情形改为积分。'),
    ]),
    S('bayes-connection','贝叶斯公式连接三类分布','联合分布的两种分解',[22,23],'bayes','同一个联合分布可以写为 p(x,y)=p(y|x)p(x)，也可以写为 p(x|y)p(y)。因此，当标签先验为正时，可以把条件生成分布写成其他三项的组合。',['这个恒等式解释概念关系。实际建立条件生成模型通常直接参数化 p(x|y)，不必分别训练三个组件再相除。'],[
      E('p(x@mid y)=@frac{p(y@mid x)p(x)}{p(y)}','要求 p(y)>0。分子依次为判别条件分布与无条件数据分布，分母为标签先验；这些项必须来自一致的联合分布。'),
    ]),
    S('model-uses','分布决定可做的事情','预测标签、学习特征与生成样本',range(24,27),'uses','判别模型用于标签预测与有标签特征学习；生成模型可以从无标签数据学结构、支持密度分析并采样新数据；条件生成模型则按指定标签或条件产生样本。',['异常输入的拒识需要合适的分数和评价协议。这里的“生成模型”同时包含无条件和条件两种形式，是否有条件与模型是否依赖人工标签是不同维度。']),
  ]),
  G('gen-ambiguity','为什么需要输出分布','foundations','一个条件经常对应多个合理结果，生成建模要表达这种不确定性。',[
    S('language-ambiguity','一个诗歌提示，许多可能文本','输入提示 y，输出文本 x',[28],'poem','语言生成把提示作为条件 y，把后续文本作为输出 x。“写一首关于生成模型的押韵短诗”可以对应许多不同答案，模型学习 p(x|y)。',['例如：“它从学到的分布采样；每个词依上下文登场。”这保留了诗歌示例的意思：序列中的词依赖此前内容。单个示例只是一次输出，不能代表全部可能文本。']),
    S('video-ambiguity','给定一幅画面，接下来会发生什么','同一个手部与纸盒场景的多个未来',[29],['video'],'图像到视频（image-to-video）以当前图像为条件，产生未来帧序列。手持白色物体、打开纸盒的场景还可能继续发生多种动作。',['输入画面固定，右侧两帧展示未来输出的例子。仅靠当前画面通常无法唯一决定后续运动，条件分布需要容纳不同的合理未来。']),
  ]),
  G('gen-model-map','用训练目标和采样路径辨认方法','foundations','能否直接计算似然，以及怎样产生样本，是接下来比较生成模型的两个问题。',[
    S('generative-taxonomy','四类方法的路线图','本部分先研究自回归与 VAE',range(30,31),'taxonomy','自回归模型通过条件分布乘积计算似然，并按顺序采样；变分自编码器（Variational Autoencoder，VAE）引入潜变量，优化对数似然下界。',['生成对抗网络（Generative Adversarial Network，GAN）通常通过对抗目标学习采样器；扩散模型（diffusion model）通过学习去噪等目标迭代生成。扩散有不同的似然估计形式，不能仅用“绝对无法计算密度”概括。后两类留到 Part II。']),
  ]),
  G('gen-likelihood','最大似然：把分布拟合到数据','autoregressive','先写出可计算且归一化的 pθ(x)，再选择参数，让训练样本在模型下更可能出现。',[
    S('maximum-likelihood','独立样本的联合似然是乘积','数据集 → 概率函数 → 参数选择',range(32,33),'likelihood','最大似然估计（maximum likelihood estimation，MLE）假设训练集由 N 个独立同分布样本组成。模型参数 θ 决定每个样本的概率质量或密度，训练寻找使联合似然最大的参数。',[],[
      E('@theta^*=@arg@max_@theta@prod_{n=1}^{N}p_@theta(x^{(n)})','x⁽ⁿ⁾ 为第 n 个完整训练样本；θ 包含神经网络参数。模型必须先满足分布的归一化要求。'),
    ]),
    S('log-likelihood','取对数，把乘积变为求和','单调变换保持最优参数',[34],'log-likelihood','多个小概率相乘容易造成数值下溢。对数是严格单调递增函数，最大化似然等价于最大化对数似然，乘积由此变为和。',[],[
      E('@log@prod_{n=1}^{N}p_@theta(x^{(n)})=@sum_{n=1}^{N}@log p_@theta(x^{(n)})','在样本似然为正的参数范围内使用对数；模型输出为零时，对应对数似然为负无穷。'),
    ]),
    S('negative-log-likelihood','用负号接上梯度下降','最小化 NLL 与最大化对数似然等价',[35],'nll','负对数似然（negative log-likelihood，NLL）把最大化目标改成最小化目标。用小批量估计平均损失，沿负梯度方向更新参数。',[],[
      E('@mathcal{J}( @theta)=-@frac1N@sum_{n=1}^{N}@log p_@theta(x^{(n)}),@qquad@theta@leftarrow@theta-@eta@nabla_@theta@mathcal{J}','η>0 是学习率。若直接优化正的对数似然，则应使用梯度上升；两种写法的符号必须一致。'),
    ]),
  ]),
  G('gen-autoregressive','链式分解：每次预测下一个元素','autoregressive','把高维样本写成有序序列后，可以用一组条件分布精确表示联合分布。',[
    S('autoregressive-chain','由条件概率逐步累积联合概率','前缀固定后，预测当前元素',range(36,37),'chain','自回归模型（autoregressive model）把 x=(x₁,…,xT) 的联合分布按概率链式法则分解。每一项只以之前的元素为条件，乘起来得到整个序列的似然。',['结构算例固定三个事件的条件概率为 0.6、0.5、0.2，完整序列概率为 0.06。这里展示的是同一路径的累计概率；实际模型在每个前缀都输出覆盖所有候选的归一化分布。'],[
      E('p_@theta(x_1,@ldots,x_T)=@prod_{t=1}^{T}p_@theta(x_t@mid x_{<t})','x<t=(x₁,…,xt−1)，首项条件为空，可由起始标记实现。链式法则不要求前面变量之间独立。'),
      E('@log p_@theta(x)=@sum_{t=1}^{T}@log p_@theta(x_t@mid x_{<t})','训练时把每个位置的条件对数概率求和，再对数据集求平均；离散输出对应下一元素分类的交叉熵。'),
    ]),
    S('autoregressive-networks','RNN 和因果 Transformer 参数化同一分解','训练可见真前缀，生成使用已采样前缀',range(38,39),'ar-networks','循环神经网络（RNN）用隐藏状态积累前缀；因果 Transformer 用遮罩注意力读取此前位置。二者都能输出下一词的条件分布。',['训练时真实前缀已知，因果遮罩保证当前位置无法读取未来目标。生成时逐次采样，将新词追加到前缀，再预测下一词，直到结束标记或长度上限。']),
  ]),
  G('gen-image-ar','把图像排成序列','autoregressive','自回归不只用于语言。先为图像规定顺序，就能将图像生成转成连续的分类决策。',[
    S('image-autoregression','从扫描顺序到 256 类预测','按像素位置与 RGB 通道展开',[40],['rgb-scan'],'对 8 位 RGB 图像，先按行扫描像素，再按固定通道顺序依次预测 R、G、B 子像素值。每个值从 0 到 255，因此每一步是 256 路分类。',['输入是已经生成的子像素前缀，输出是下一个子像素的分布。图中的课堂照片、局部放大与箭头，把二维空间和通道顺序连接起来；模型可由 RNN、因果卷积或 Transformer 参数化。']),
    S('image-sequence-cost','高分辨率使生成路径很长','1024×1024 RGB 图像：3,145,728 步',range(41,42),'image-cost','逐子像素生成一幅 1024×1024 的 RGB 图像，需要 1024×1024×3=3,145,728 次顺序决策。问题来自很长的生成路径；训练与生成的并行能力也不同。',['一个改进方向是把图像表示为块或离散视觉 token 序列，缩短序列长度。这需要定义块表示、编码及解码方式，本部分只建立该方向，不提前展开具体视觉 tokenizer。']),
  ]),
  G('gen-autoencoder','先学会重建，再追问怎样生成','vae','自回归直接分解高维密度。另一条路线先学习潜在表示；从普通自编码器开始，才能看清 VAE 额外解决的采样问题。',[
    S('vae-transition','从显式条件乘积转向潜变量','似然有定义，精确计算可能困难',range(43,44),'vae-transition','PixelRNN、PixelCNN 一类自回归模型直接给出条件概率乘积。VAE 用未观测潜变量构造生成模型，边缘似然通常难以精确求值，因此转而优化可计算的对数似然下界。',['理解下界之前，先建立两个问题：无标签时怎样学习表示？学到表示之后，怎样产生新的样本？']),
    S('ae-encoder','编码器从输入中提取表示','x → 编码器 → z',[45],'ae-encoder','自编码器（autoencoder）的编码器将数据 x 映射为潜在表示 z，希望保留对象、外观或场景等有用信息。编码器可以采用 MLP、CNN 或 Transformer。',['只有编码器还没有训练信号；如果没有类别标签，需要从数据自身建立可比较的目标。']),
    S('ae-reconstruction','解码器重建输入，形成训练信号','编码 → 解码 → 与同一输入比较',range(46,47),'ae-reconstruction','解码器从 z 预测重建 x̂，把原输入 x 作为目标。训练通过减小输入与重建之间的平方误差，同时更新编码器与解码器。',['输入图像和重建图像网格按位置一一配对；重建保留了整体颜色与结构，一些细节更模糊。重建质量本身不能保证特征对所有下游任务都有用。'],[
      E('z=f_@phi(x),@quad@hat{x}=g_@theta(z),@quad@mathcal{J}_{@mathrm{AE}}=@|x-@hat{x}@|_2^2','x 与 x̂ 维度相同；z 可为较紧凑的表示。目标来自输入自身，预训练不需要人工类别标签。'),
    ]),
    S('ae-downstream','保留编码器，换成分类头','重建预训练 → 下游监督适配',[48],'ae-transfer','训练后保留编码器，移除重建解码器，再接分类头，把 z 用于标签预测。分类阶段的目标 y 来自下游标注数据。',['可冻结编码器或继续微调，分别检验固定表示质量和适配能力。无标签重建预训练与有标签分类属于两个不同阶段。']),
  ]),
  G('gen-latent-model','解码器需要一个可采样的潜空间','vae','会把 z 解码为数据还不够，还必须知道怎样获得合理的新 z。',[
    S('ae-sampling-gap','新潜变量从哪里来','普通自编码器的生成缺口',range(49,51),'latent-gap','普通自编码器学会了训练数据到潜表示的映射，却没有规定这些表示服从哪一个已知分布。随意取 z，可能落到解码器没有学好的区域。',['一种思路是为潜变量建立简单、可采样的先验，再学习从潜变量到数据的条件分布。这样生成时就有明确的取样起点。']),
    S('latent-generative-process','先采 z，再生成 x','标准高斯先验 → 条件生成分布',range(52,55),'latent-process','VAE 假设观测样本由潜在因素 z 生成。生成过程先从简单先验 p(z) 取样，再从解码器给出的 pθ(x|z) 取样。',['常用先验是 d 维标准高斯 N(0,I)。潜变量可以承载外观、方向等变化，但这些语义不会仅凭设定先验就自动获得。生成模型参数 θ 决定如何把潜变量转为观察分布。'],[
      E('z@sim p(z)=@mathcal{N}(0,I_d),@qquad x@sim p_@theta(x@mid z)','z∈ℝᵈ，Iᵈ 为 d×d 单位矩阵。先验固定时不包含待学习参数；观察量 x 可以是 D 维连续数据或离散数据。'),
    ]),
  ]),
  G('gen-inference','似然为什么难算','vae','训练集只给出观测数据，没有生成它的潜变量。最大似然因此需要把未观测因素消去。',[
    S('latent-marginalization','对未观测的潜变量积分','两个因子可算，整体积分仍可能困难',range(56,59),'marginalization','若每个训练样本都附有真实 z，就能直接训练条件生成器。实际只观察到 x，需要对所有可能的 z 边缘化。',['先验密度可以求值，解码器也能计算固定 z 下的条件密度；然而非线性解码器使高维积分通常没有解析解，直接优化边缘似然仍然困难。'],[
      E('p_@theta(x)=@int p_@theta(x,z)@,dz=@int p_@theta(x@mid z)p(z)@,dz','pθ(x,z)=pθ(x|z)p(z) 是联合分布。积分遍历整个潜空间，而非只挑一个最符合输入的 z。'),
    ]),
    S('true-posterior','贝叶斯改写仍需真实后验','pθ(z|x)：这个输入可能来自哪些潜变量',range(60,63),'posterior','真实后验（posterior）pθ(z|x) 描述观察到 x 后，对潜变量的更新认识。把边缘似然用贝叶斯公式改写，分母恰好是这个通常难算的后验。',['计算后验又需要边缘似然作归一化常数，因此改写公式没有消除困难。下一步引入一个能够快速计算和采样的近似后验。'],[
      E('p_@theta(z@mid x)=@frac{p_@theta(x@mid z)p(z)}{p_@theta(x)}','要求 pθ(x)>0；先验与条件生成器共同决定真实后验，后验一般不再是简单高斯。'),
      E('p_@theta(x)=@frac{p_@theta(x@mid z)p(z)}{p_@theta(z@mid x)}','在分母为正的 z 上成立。不能把难算的后验当成现成可用的数值。'),
    ]),
  ]),
  G('gen-variational','用编码器近似后验分布','vae','编码器的输出从确定向量变成潜变量分布的参数，解码器则继续描述数据生成过程。',[
    S('variational-encoder','学习 qφ(z|x)，近似 pθ(z|x)','推断方向 x → z；生成方向 z → x',range(64,66),'variational','变分推断（variational inference）引入可计算的 qφ(z|x)，近似真实后验 pθ(z|x)。编码器接收观测 x，输出潜变量的分布；解码器接收 z，输出数据的条件分布。',['φ 与 θ 分别属于编码器和生成模型，随后通过同一个训练目标联合优化。近似后验与解码条件分布的变量方向不同，不能混用。']),
    S('gaussian-parameters','网络输出分布参数，再从分布采样','均值向量、正标准差与对角协方差',range(67,68),'gaussian-parameters','常用编码器输出 d 维均值 μφ(x) 与对数方差 sφ(x)，令标准差 σφ(x)=exp(sφ(x)/2)，从而保持方差为正。各维条件独立构成对角高斯近似。',['解码器也输出分布参数。本部分以 D 维连续观察为例，让它输出均值 μθ(z)，并固定各向同性观察方差 τ²；离散或二值数据需要相应的观察分布。'],[
      E('q_@phi(z@mid x)=@mathcal{N}(@mu_@phi(x),@operatorname{diag}(@sigma_@phi^2(x)))','μ、σ、s 都是 d 维向量；协方差矩阵为 d×d，对角元素是方差 σⱼ²。标准差 σⱼ 与方差 σⱼ² 必须区分。'),
      E('p_@theta(x@mid z)=@mathcal{N}(@mu_@theta(z),@tau^2 I_D),@qquad@tau>0','μθ(z)∈ℝᴰ；τ 是观察噪声标准差，与潜变量标准差 σφ(x) 不同。此处固定 τ，后续平方误差解释才成立。'),
    ]),
    S('gaussian-reconstruction','固定高斯观察方差对应平方误差','条件对数似然的常数与可训练部分',range(69,70),'gaussian-loss','对固定观察方差的高斯解码器，最大化固定 z 下的条件对数似然等价于最小化输入与预测均值的平方误差。它给出了重建项的概率解释。',['若观察方差也要学习，归一化项随参数变化，不能只保留平方误差。现在还缺少一个同时训练编码器与解码器的完整目标。'],[
      E('@log p_@theta(x@mid z)=-@frac{D}{2}@log(2@pi@tau^2)-@frac{@|x-@mu_@theta(z)@|_2^2}{2@tau^2}','D 为观察维度。第一项在 τ 固定时是常数；第二项保留误差尺度。接下来还需对 qφ(z|x) 中的 z 取期望。'),
    ]),
  ]),
  G('gen-elbo-algebra','ELBO 推导：从恒等式到期望','vae','固定一个观测样本 x，保留完整的先验、真实后验和近似后验，逐步整理对数似然。',[
    S('elbo-bayes','第一步：写出贝叶斯恒等式','固定 x，对任意有效 z 成立',[71],'elbo-bayes','从生成模型的联合分布出发，将边缘似然写成条件似然、先验与真实后验的比。取自然对数后，仍是精确等式。',[],[
      E('@log p_@theta(x)=@log@frac{p_@theta(x@mid z)p(z)}{p_@theta(z@mid x)}','固定 pθ(x)>0 的 x；等式在相关密度和分母有效的潜变量位置成立。'),
    ]),
    S('elbo-insert-q','第二步：分子分母同乘近似后验','乘 qφ(z|x) / qφ(z|x)，数值不变',[72],'elbo-insert','引入 qφ 不需要先假设它已经等于真实后验。只要相关支持和可积条件满足，就能乘同一个非零因子，为下一步分组创造条件。',[],[
      E('@log p_@theta(x)=@log@frac{p_@theta(x@mid z)p(z)q_@phi(z@mid x)}{p_@theta(z@mid x)q_@phi(z@mid x)}','分母是 pθ(z|x)qφ(z|x)，分子保留先验 p(z)。常用非退化高斯近似在整个 ℝᵈ 为正。'),
    ]),
    S('elbo-split-logs','第三步：拆成三个对数项','重建项 − 先验比 + 后验比',[73],'elbo-split','利用乘积与商的对数规则，把先验 p(z) 与一个 qφ 配对，再把另一个 qφ 与真实后验配对。三个项的符号决定后续的上下界方向。',[],[
      E('@log p_@theta(x)=@log p_@theta(x@mid z)-@log@frac{q_@phi(z@mid x)}{p(z)}+@log@frac{q_@phi(z@mid x)}{p_@theta(z@mid x)}','第一项奖励重建；第二项带负号；第三项带正号。此时每项仍依赖 z，而它们的总和与 z 无关。'),
    ]),
    S('elbo-expectation','第四步：对 qφ(z|x) 取期望','左边不含 z，取期望后保持原值',[74],'elbo-expectation','固定 x 时，log pθ(x) 是关于 z 的常数。因 qφ(z|x) 归一化，可以在等式两侧对它取期望，并用期望的线性性拆开右侧三项。',[],[
      E('@log p_@theta(x)=@mathbb{E}_q[@log p_@theta(x@mid z)]-@mathbb{E}_q@!@left[@log@frac{q_@phi(z@mid x)}{p(z)}@right]+@mathbb{E}_q@!@left[@log@frac{q_@phi(z@mid x)}{p_@theta(z@mid x)}@right]','这里所有期望都对同一个 q=qφ(z|x) 计算。需要各项可积；并未把真实后验替换为近似后验。'),
    ]),
  ]),
  G('gen-elbo-bound','识别 KL，得到可优化的下界','vae','三个期望中，两个是分布之间的 KL 散度。区分它们的作用，就能看出哪些可算、哪一项构成差距。',[
    S('elbo-kl-identity','第五步：把两个比值期望识别为 KL','重建 − 先验 KL + 后验 KL',[75],'elbo-decomposition','KL 散度（Kullback–Leibler divergence）定义为对第一分布取对数密度比的期望。在满足支持条件时，它非负，但通常不对称。',[],[
      E('D_{@mathrm{KL}}(q@|r)=@mathbb{E}_{z@sim q}@!@left[@log@frac{q(z)}{r(z)}@right]@geq0','q、r 是同一变量空间上的归一化分布。q 有正密度而 r 为零的区域可能使 KL 为无穷。'),
      E('@log p_@theta(x)=@underbrace{@mathbb{E}_q[@log p_@theta(x@mid z)]-D_{@mathrm{KL}}(q_@phi(z@mid x)@|p(z))}_{@mathcal{L}_{@mathrm{ELBO}}(x)}+D_{@mathrm{KL}}(q_@phi(z@mid x)@|p_@theta(z@mid x))','先验 KL 的第二个分布是 p(z)，后验 KL 的第二个分布是 pθ(z|x)。只有最后一个 KL 是对数似然与 ELBO 的差距。'),
    ]),
    S('elbo-reconstruction-term','重建项：让样本在解码分布下更可能','固定 z 可计算；对 z 的期望通常靠采样',[76],'reconstruction-term','重建项让编码器为 x 选出的潜变量在解码器下能够解释同一个 x。固定 z 时，条件高斯对数似然可直接计算。',['非线性解码器下，对整个 q 的期望一般没有闭式。可从 q 取 L 个潜变量，计算各自的条件对数似然，再取平均。'],[
      E('@mathbb{E}_q[@log p_@theta(x@mid z)]@approx@frac1L@sum_{@ell=1}^{L}@log p_@theta(x@mid z^{(@ell)}),@quad z^{(@ell)}@sim q_@phi(z@mid x)','L≥1 是每个输入的 Monte Carlo 样本数。有限样本均值是期望的估计，不等于精确期望；单次估计不一定维持精确的下界关系。'),
    ]),
    S('elbo-prior-kl','先验 KL：限制编码分布的偏离','对角高斯与标准高斯的闭式正则',[77],'prior-kl','先验 KL 鼓励每个输入的近似后验接近可采样的先验，避免潜表示任意散布。对角高斯编码器与标准高斯先验的 KL 可以解析计算。',[],[
      E('D_{@mathrm{KL}}(q_@phi(z@mid x)@|@mathcal{N}(0,I))=@frac12@sum_{j=1}^{d}(@mu_j^2+@sigma_j^2-1-@log@sigma_j^2)','μⱼ、σⱼ 为当前 x 的编码均值和正标准差。μ=0 且所有 σⱼ=1 时 KL 为零；训练是在该正则与重建之间取得平衡。'),
    ]),
    S('elbo-gap','后验 KL：难算，但一定非负','去掉等式中的正项，保留下界',range(78,79),'gap','真实后验通常难算，因此不能直接求最后一项；但知道它非负，就足以确定界的方向。近似后验等于真实后验时，差距为零。',['优化 ELBO 会同时改变生成模型与近似推断，不能保证每次参数更新都使后验差距单调减小。'],[
      E('@log p_@theta(x)-@mathcal{L}_{@mathrm{ELBO}}(x)=D_{@mathrm{KL}}(q_@phi(z@mid x)@|p_@theta(z@mid x))@geq0','这是精确期望下的恒等式。若 q 无法表示真实后验，即使达到所选近似族的最优点，仍可能存在差距。'),
    ]),
    S('elbo-objective','联合最大化证据下界','期望重建对数似然 − 先验 KL',range(80,81),'objective','证据下界（Evidence Lower Bound，ELBO）是观测数据对数似然的可训练下界。编码器与解码器通过同一个目标共同学习。',[],[
      E('@log p_@theta(x)@geq@mathcal{L}_{@mathrm{ELBO}}(x)=@mathbb{E}_{q_@phi(z@mid x)}[@log p_@theta(x@mid z)]-D_{@mathrm{KL}}(q_@phi(z@mid x)@|p(z))','最大化 ELBO 等价于最小化它的负值。对数据集取平均后，第一项训练生成与推断，第二项正则化编码分布；真实后验 KL 不需要直接求值。'),
    ]),
  ]),
  G('gen-vae-training','把 VAE 目标落到一条计算图','vae','固定一个输入，依次编码、正则、采样、解码和比较。训练时的随机节点需要能够传回编码器梯度。',[
    S('vae-encode','输入经过编码器，得到潜分布参数','x → μφ(x)、log σφ²(x)',range(82,83),'vae-encode','训练开始于真实数据 x。编码器输出均值与对数方差，由此得到正标准差；这些量一起确定 qφ(z|x)。',['接下来的二维结构算例固定 x=(0.6,−0.2)、μ=(0.5,−1)、σ=(0.5,2)，仅用来跟踪采样和损失，不代表图像实验或已训练模型。']),
    S('vae-reparameterization','重参数化：随机性来自独立噪声','ε → μ + σ⊙ε → z',[84],'reparameterization','重参数化技巧（reparameterization trick）先抽与模型参数无关的标准高斯噪声 ε，再用可微变换构造 z。重建梯度可以沿 z 对 μ、σ 的依赖传回编码器。',['固定噪声 ε=(1,−0.5)，结构算例得到 z=(1,−2)。乘噪声的是标准差 σ；若使用方差会得到错误的采样尺度。先验 KL 在同一批编码参数上解析计算，为 1.75。'],[
      E('@epsilon@sim@mathcal{N}(0,I_d),@qquad z=@mu_@phi(x)+@sigma_@phi(x)@odot@epsilon','⊙ 是逐元素乘法，三个向量维度均为 d。对固定噪声，∂zⱼ/∂μⱼ=1，∂zⱼ/∂σⱼ=εⱼ；无需对抽噪声的操作求导。'),
    ]),
    S('vae-decode','把同一个 z 送入解码器','z → 观察分布的均值',[85],'vae-decode','解码器接收重参数化得到的 z，输出 μθ(z)。训练需要评估真实 x 在这个观察分布下的对数似然。',['结构算例使用固定线性解码 D(z)=(z₁/2,z₂/4)，故 z=(1,−2) 得预测均值 (0.5,−0.5)。实际神经解码器可以复杂得多，采样与条件概率的关系相同。']),
    S('vae-training-loss','重建与 KL 相加，再反向传播','固定输入、固定噪声，逐项核算',[86],'vae-training','对一个重参数化样本计算负重建对数似然，加上解析先验 KL，得到负 ELBO 的随机估计。梯度经过解码器、z 和编码器，联合更新 θ、φ。',['算例取观察方差 τ²=1。输入与均值的平方误差是 0.1，去掉固定高斯常数后的重建 NLL 为 0.05；加 KL 1.75，得到 1.80。训练优化的是批平均，采样噪声与样本通常随迭代变化。'],[
      E('@widehat{@mathcal{J}}(x)=-@log p_@theta(x@mid@mu_@phi(x)+@sigma_@phi(x)@odot@epsilon)+D_{@mathrm{KL}}(q_@phi(z@mid x)@|p(z))','ε 从标准高斯独立抽样；这里 L=1。固定观察方差时，第一项为缩放平方误差加常数；KL 不经过采样估计。'),
    ]),
  ]),
  G('gen-vae-tradeoff','重建与先验之间存在张力','vae','一个目标希望保留输入细节，另一个目标希望潜分布便于统一采样。两者共同决定表示。',[
    S('vae-objective-tradeoff','辨别样本的能力与潜空间约束','小重建误差 / 接近标准高斯',[87],'tradeoff','重建倾向保留不同输入的差异，并可能偏好较小的潜变量噪声；先验 KL 倾向让均值靠近零、标准差靠近一。完整目标需要兼顾两者。',['若每个输入都编码成完全相同的标准高斯，就无法由 z 区分输入；若标准差趋近零，KL 中的 −log σ² 会发散。两种极端揭示目标张力，不能把其中任一极端当成训练的必然结果。']),
  ]),
  G('gen-vae-sampling','训练后怎样生成新数据','vae','生成时从先验开始，编码器无需参与；潜空间网格帮助观察解码器学到的变化。',[
    S('vae-prior-sampling','从先验取 z，仅运行解码器','训练推断路径与新样本生成路径分开',[88],'sampling','生成新样本时先从 p(z)=N(0,I) 抽样，再计算 pθ(x|z)，最后从该条件分布抽出 x。无需给定真实输入，也不经过编码器。',['若高斯解码器只展示均值 μθ(z)，得到的是条件均值图像；严格从模型采样时还应加入观察噪声。两种输出要区分。'],[
      E('z@sim@mathcal{N}(0,I_d),@quad@xi@sim@mathcal{N}(0,I_D),@quad x=@mu_@theta(z)+@tau@xi','采用前面固定观察方差的高斯解码器；z 与 ξ 独立。τ 控制观察噪声，维度 D 与潜维度 d 可不同。'),
    ]),
    S('latent-space-grid','沿两个潜方向观察数字如何变化','固定其余坐标，分别改变 z₁ 与 z₂',[89],['latent-grid'],'数字网格的纵向改变 z₁，横向改变 z₂。邻近位置的数字形态逐渐变化，展示解码器如何把潜空间位置映射成观察外观。',['保持相同坐标比较轮廓、笔画和类别过渡。标准高斯先验的维度独立不保证某一维对应唯一的人类语义因素；语义解耦还依赖数据、归纳偏置与学习约束。']),
  ]),
  G('gen-part1-recap','用同一组问题复习 Part I','vae','回到输入、输出、目标和采样路径，把不同方法放到一张可比较的地图中。',[
    S('generative-part1-recap','从数据分布到两条生成路线','自回归：条件乘积；VAE：潜变量与下界',range(90,93),'recap','监督学习使用输入与目标配对，无监督学习从数据结构建立目标。判别模型预测标签，生成模型描述数据，条件生成模型在指定条件下描述可能输出。',['自回归将似然写为条件乘积并逐项生成；VAE 引入先验与潜变量，用近似后验和 ELBO 联合训练，再从先验经解码器生成。Part II 将沿着训练信号和采样路径继续比较 GAN 与扩散模型。']),
  ]),
];

export const chainExample={probabilities:[.6,.5,.2],events:['x₁','x₂','x₃']};
export const vaeExample={x:[.6,-.2],mu:[.5,-1],sigma:[.5,2],epsilon:[1,-.5],observationVariance:1,decoderScales:[.5,.25]};
export const sequences={
  'autoregressive-chain':{type:'chain',frames:[0,1,2,3],steps:['准备按顺序生成三个元素；每一步先得到条件分布。','固定第一步所选事件，p(x₁)=0.6。','在 x₁ 的条件下选 x₂，累计 0.6×0.5=0.3。','再选 x₃，完整路径概率为 0.6×0.5×0.2=0.06。']},
  'ae-reconstruction':{type:'autoencoder',frames:[0,1,2,3],steps:['输入 x；训练目标也来自这个输入。','编码器将 x 映射到潜表示 z。','解码器由 z 得到重建 x̂。','将同一输入与重建比较，误差沿解码器和编码器反传。']},
  'vae-training-loss':{type:'vae',frames:[0,1,2,3,4],steps:['固定结构算例：x=(0.6,−0.2)。','编码器给 μ=(0.5,−1)、σ=(0.5,2)；解析 KL=1.75。','固定 ε=(1,−0.5)，重参数化 z=μ+σ⊙ε=(1,−2)。','固定解码 D(z)=(z₁/2,z₂/4)，均值为 (0.5,−0.5)。','平方误差 0.1，重建 NLL 去常数为 0.05；加 KL 得 1.80，并联合反传。']},
};
export const slides=sections.flatMap((g,index)=>{g.index=index+1;return g.steps.map(s=>({...s,section:g.id,topic:g.topic}));}).map((s,index)=>({...s,page:index+1}));
