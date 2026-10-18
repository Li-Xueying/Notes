const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
const E=(tex,explanation)=>({tex:tex.replaceAll('@','\\'),explanation});
const S=(id,title,caption,sourcePages,visual,note,reading=[],equations=[],options={})=>({id,title,caption,sourcePages,visual,note,reading:[note,...reading],equations,evidence:null,...options});
const G=(id,title,topic,intro,steps)=>({id,title,topic,intro,steps});
export const topics={
  gan:{label:'生成对抗网络',target:'gen-gan-intro'},
  flow:{label:'扩散与 Rectified Flow',target:'gen-flow-intuition'},
  applications:{label:'图像、视频与世界模型',target:'gen-ldm'},
};
export const ganExample={real:1,z:1,g:.2,a:1,b:0,rate:.2};
export function ganStates(){
  const e=ganExample,sigmoid=x=>1/(1+Math.exp(-x));
  const states=[{...e,stage:'固定样本，计算真假分数'}];
  const dr=sigmoid(e.a*e.real+e.b),df=sigmoid(e.a*e.g*e.z+e.b);
  const a=e.a+e.rate*((1-dr)*e.real-df*e.g*e.z),b=e.b+e.rate*(1-dr-df);
  states.push({...e,a,b,stage:'冻结 G，更新 D'});
  const g=e.g+e.rate*(1-sigmoid(a*e.g*e.z+b))*a*e.z;
  states.push({...e,a,b,g,stage:'冻结 D，更新 G'});
  return states.map(s=>({...s,fake:s.g*s.z,realScore:sigmoid(s.a*s.real+s.b),fakeScore:sigmoid(s.a*s.g*s.z+s.b)}));
}
export const flowExample={x:[2,-1],z:[-1,2],times:[0,.25,.5,.75,1]};
export const eulerExample={initial:[-1,2],steps:3,field:(x,t)=>[x[0]+t,2*x[1]-t]};
export function eulerStates(){
  const e=eulerExample,states=[{t:1,x:[...e.initial],velocity:e.field(e.initial,1)}];
  for(let k=e.steps;k>0;k--){const last=states.at(-1),t=(k-1)/e.steps,x=last.x.map((v,i)=>v-last.velocity[i]/e.steps);states.push({t,x,velocity:e.field(x,t)});}
  return states;
}
export const cfgExample={unconditional:[1,2],conditional:[-1,2],weights:[0,1,2]};
const trainingCode=`for x in dataset:
    z = torch.randn_like(x)
    t = torch.rand(x.shape[0], device=x.device)
    tb = t.reshape(-1, *([1] * (x.ndim - 1)))
    xt = (1 - tb) * x + tb * z
    velocity = model(xt, t)
    loss = (velocity - (z - x)).square().mean()
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()`;
const samplingCode=`sample = torch.randn(sample_shape, device=device)
with torch.no_grad():
    for k in range(T, 0, -1):
        t = torch.full((sample.shape[0],), k / T, device=device)
        velocity = model(sample, t)
        sample = sample - velocity / T
return sample`;
export const sections=[
  G('gen-gan-intro','从似然走向对抗生成','gan','已有路线分别优化显式条件似然和变分下界。接下来考察只需提供样本的隐式生成分布，训练信号从何而来。',[
    S('gan-likelihood-bridge','生成样本需要显式密度吗','Part II · 从自回归、VAE 接到 GAN',range(1,5),'bridge','自回归模型把联合分布写成可计算的条件概率乘积；VAE 用潜变量构造生成过程，并最大化对数似然下界。GAN 选择另一条路线：先定义可采样的生成器，再通过对抗学习匹配数据分布。',['生成器仍然定义分布 pG，但通常无法直接计算某个样本的密度。训练不再要求为每个训练样本计算似然。'],[
      E('@log p_@theta(x)@ge @mathbb{E}_{q_@phi(z@mid x)}[@log p_@theta(x@mid z)]-D_{@mathrm{KL}}(q_@phi(z@mid x)@Vert p(z))','复习 VAE：下界作用于对数似然。GAN 将改用真假分类提供训练信号。'),
    ]),
    S('gan-generator','从简单噪声产生新样本','输入 z，输出与数据同形状的 G(z)',[6],'generator','已知真实样本 x 来自数据分布 pdata，希望生成器产生相同分布的新样本。先从简单先验 p(z) 抽取潜变量，例如标准高斯，再经过神经网络 Gθ 得到假样本。',['训练目标是生成分布接近真实分布，并不要求每个随机 z 对应某个指定真实样本。生成器输出可以与高维图像同形状。'],[
      E('z@sim p(z),@qquad @widetilde{x}=G_@theta(z),@qquad @widetilde{x}@sim p_G','z∈ℝᵈ、图像 x∈ℝᴰ；pG 是随机变量 Gθ(z) 的分布。训练后采样只需先验与 G。'),
    ]),
    S('gan-discriminator','让真假判别提供训练信号','真实与生成样本进入同一个 D',range(7,8),'discriminator','单有 G 的前向生成还没有学习标准。判别器 Dψ 接收真实样本或 G 产生的样本，输出来自真实数据一方的分类分数。D 学会区分，G 则学习让假样本被判为真。',['这构成两个相互影响的学习任务。训练时需要 G 和 D；生成新样本时只保留 G。联合训练能否稳定匹配分布，还取决于目标和优化过程。']),
  ]),
  G('gen-gan-objective','拆解 GAN 的极小极大目标','gan','先解释两条数据路径，再分别固定生成器和判别器，观察各自要优化的量。',[
    S('gan-minimax','两类样本组成一个价值函数','D 最大化，G 最小化',range(9,10),'minimax','真实项希望 D(x) 接近 1，生成项希望 D(G(z)) 接近 0，这两项共同训练判别器。生成器则试图提高假样本的真实分数，因此对同一个生成项采取相反优化方向。',['D 的分数是本训练任务中的真假分类概率估计，不能直接等同于图像的无条件密度。两种来源的采样比例也会影响其概率解释。'],[
      E('@min_@theta@max_@psi V(@theta,@psi),@quad V=@mathbb{E}_{x@sim p_{@mathrm{data}}}[@log D_@psi(x)]+@mathbb{E}_{z@sim p(z)}[@log(1-D_@psi(G_@theta(z)))]','此处真假来源等权。ψ 属于 D，θ 属于 G；两个期望分别用真实样本批次和噪声批次估计。'),
    ]),
    S('gan-update-d','固定 G：提高真假分类能力','真样本标签 1，假样本标签 0',[11],'update-d','更新判别器时，假样本由当前生成器给出并视作固定训练输入。D 增大真实项和生成项，使真实分数上升、生成分数下降。',['若实现为二元交叉熵最小化，就对价值函数取负。生成样本应切断通向 G 参数的梯度，避免这一步顺带改变生成器。'],[
      E('L_D=-@mathbb{E}_x@log D_@psi(x)-@mathbb{E}_z@log(1-D_@psi(G_@theta(z)))','最小化 LD 与固定 θ 后最大化 V 等价；这里假样本对 θ 停止梯度。'),
    ]),
    S('gan-update-g','固定 D：让假样本获得更高真实分数','真实项与生成器参数无关',[12],'update-g','更新生成器时，判别器的参数保持固定。G 改变输出图像，使 D(G(z)) 增大；真实数据项不含 θ，不会给生成器提供梯度。',['固定 D 的参数仍需允许梯度穿过 D 对输入求导，再传回 G。把整个判别前向过程关闭梯度会切断生成器需要的信号。'],[
      E('L_G^{@mathrm{minimax}}=@mathbb{E}_z@log(1-D_@psi(G_@theta(z)))','这是原始极小极大生成器目标；它与后面常用的非饱和目标有相同理想匹配点，但梯度不同。'),
    ]),
  ]),
  G('gen-gan-training','交替更新与梯度饱和','gan','两方轮流改变参数，训练目标持续移动；需要同时检查优化方向和传回生成器的有效梯度。',[
    S('gan-alternating','冻结一方，更新另一方','固定样本的一维结构算例',range(13,15),'alternating','每轮先更新 D，再更新 G，重复进行。对原始价值函数，D 沿梯度上升，G 沿梯度下降；两方没有一个共同单调下降、能直接代表图像质量的总损失。',['结构算例固定真实值 x=1、噪声 z=1，令 G(z)=gz、D(u)=sigmoid(au+b)，学习率 0.2，初始 g=0.2、a=1、b=0。先更新 D 的 a,b，再用非饱和目标更新 g；每个阶段的分数由当前参数重新计算。','双方损失曲线仍然有诊断价值，但应结合样本、多样性与合适的分布指标判断。'],[
      E('@psi@leftarrow@psi+@eta_D@nabla_@psi V,@qquad @theta@leftarrow@theta-@eta_G@nabla_@theta V','两式表示原始博弈的方向；使用非饱和 LG 时，第二式改为对该 LG 梯度下降。ηD、ηG 为正学习率。'),
    ]),
    S('gan-saturation','判别过强时，生成器为何学得慢','关键是损失经过 sigmoid 后的梯度',range(16,17),'saturation','训练初期假样本容易识别，D(G(z)) 可能接近 0。原始生成器目标在这一区域给判别 logit 的梯度很小，信号再通过判别器传到生成器，学习可能变慢。',['记假样本 logit 为 a、D=sigmoid(a)。log(1-D) 对 D 的导数并不趋零；必须把 sigmoid 的链式求导一起考虑，才能解释饱和。'],[
      E('@frac{@partial @log(1-@sigma(a))}{@partial a}=-@sigma(a)=-D','例如 D=0.01，logit 梯度为 −0.01。它只是传回 G 的链路中的一项，并非完整参数梯度。'),
    ]),
    S('gan-nonsaturating','用非饱和目标增强初期信号','生成器最小化 −log D(G(z))',[18],'non-saturating','生成器仍然希望假样本被判为真，可以直接最小化负的真实对数分数。D 接近 0 时，这一目标对 logit 的梯度绝对值接近 1，为早期学习提供更强信号。',['判别器继续使用真假分类目标。非饱和替代改变了生成器的训练梯度，不能把它写成原始极小极大价值函数的完全相同表达式。'],[
      E('L_G^{@mathrm{NS}}=-@mathbb{E}_{z}@log D_@psi(G_@theta(z)),@qquad @frac{@partial[-@log@sigma(a)]}{@partial a}=D-1','此式中的 sigmoid 记为 σ。若 D=0.01，梯度为 −0.99，与原始 −0.01 对比。'),
    ]),
  ]),
  G('gen-gan-theory','理想判别器与分布匹配','gan','先固定生成分布求判别器最优解，再讨论生成器的理想目标，最后回到有限网络的限制。',[
    S('gan-optimal-discriminator','固定 pG，逐点求最优 D','每个位置平衡两种来源的密度',range(19,20),'optimal-d','把两个期望写为积分后，对于每个位置 x，只需最大化 pdata(x)log D(x)+pG(x)log(1-D(x))。令对 D 的导数为零，得到真实来源的最优判别比例。',['分母大于 0 时公式有定义；只有真实分布有质量的位置最优分数为 1，只有生成分布有质量的位置为 0。'],[
      E('@frac{p_{@mathrm{data}}(x)}{D(x)}-@frac{p_G(x)}{1-D(x)}=0','内点条件；二阶导数非正，说明该点为最大值。边界情况按极限处理。'),
      E('D_G^*(x)=@frac{p_{@mathrm{data}}(x)}{p_{@mathrm{data}}(x)+p_G(x)}','分子和分母是同一位置的概率质量或密度。公式依赖等权真假采样假设。'),
    ]),
    S('gan-distribution-match','理想匹配时 D*=1/2','最优判别器也无法区分两种来源',[21],'match','把最优 D 代回价值函数，可将生成器的目标解释为缩小真实与生成分布的差异。理想全局解是 pG=pdata，此时在共同支撑上 D*=1/2。',['这是针对分布和任意容量函数的理想目标。某个训练批次上 D 输出 1/2，也可能只是判别器能力不足，不能独立证明生成器已经学好。'],[
      E('V(G,D_G^*)=-@log 4+2@,D_{@mathrm{JS}}(p_{@mathrm{data}}@Vert p_G)@ge-@log4','补充理论联系：JS 为 Jensen–Shannon 散度；等号在两分布相同时成立。它解释理想解，不构成实际收敛保证。'),
    ]),
    S('gan-theory-limits','理想最优解不保证训练收敛','容量、有限数据与博弈动态',[22],'limits','固定容量网络未必能表达最优 G 和 D；有限数据、优化误差和双方持续变化的目标进一步影响训练。交替梯度更新也可能振荡，或只覆盖少量数据模式。',['因此需要分别评价单个样本的逼真度和总体覆盖的多样性，防止把看起来很好的少数输出当作完整分布匹配。']),
  ]),
  G('gen-gan-architectures','DCGAN 与 StyleGAN','gan','对抗目标没有规定唯一网络结构。下面通过两类具体架构观察噪声如何变成图像，以及生成层如何接受控制。',[
    S('gan-dcgan','DCGAN：卷积生成自然图像','潜向量逐层扩展空间分辨率',[23],'dcgan','DCGAN 用卷积网络构建生成器和判别器。生成路径把低维潜向量逐层变成有空间结构的特征图，判别路径则逐层聚合图像信息作真假判断。',['完整架构与下方生成样本共同说明：目标负责提供学习信号，卷积结构负责表达图像中的局部与层级规律。样本展示自然场景的外观，不单独证明分布覆盖完整。']),
    S('gan-stylegan','StyleGAN：样式调制与独立噪声','映射网络控制风格，噪声支路补充随机细节',[24],'stylegan','StyleGAN 先把 z 映射到中间样式空间，再通过仿射变换在不同生成层控制特征的通道尺度与偏移。各层还注入独立随机噪声，用于局部随机细节。',['AdaIN 先在各通道的空间位置上归一化，再施加样式参数。样式和独立噪声来自两条不同支路；图中的 A 与 B 分别对应样式仿射和噪声缩放。'],[
      E('@operatorname{AdaIN}(h,s,b)_{c,u,v}=s_c@frac{h_{c,u,v}-@mu_c(h)}{@sqrt{@operatorname{Var}_c(h)+@epsilon}}+b_c','h∈ℝᶜˣᴴˣᵂ；μc、Varc 在空间轴上计算，sc、bc 按通道广播；ε>0 用于数值稳定。'),
    ]),
  ]),
  G('gen-gan-interpolation','沿潜空间插值','gan','训练得到的生成器可以连续改变输入潜变量。观察输出如何变化，有助于理解学习到的表示。',[
    S('gan-latent-interpolation','插值潜变量，再送入同一个 G','可见图像是插值视频的一帧',[25],'gan-interpolation','给定两个潜变量端点 z0、z1，在线段上取中间向量并送入同一个生成器，得到一系列图像。网络连续性使输出可以逐渐变化，但变化是否符合人类语义，需要实际观察。',['猫图展示了生成对象的外观。单个静帧无法展示整个插值过程；连续形变与语义可控也不能从这一帧直接推出。'],[
      E('z(\u03bb)=(1-\u03bb)z_0+\u03bb z_1,@quad x(\u03bb)=G(z(\u03bb)),@quad 0@le\u03bb@le1','此处 λ=0 对应 z0，λ=1 对应 z1；与时间变量 t 分开记号。线性插值不保证每个点都处在先验的高密度区域。'),
    ]),
  ]),
  G('gen-gan-summary','从一次生成走向逐步生成','gan','GAN 把难题放在对抗训练上；接下来用一个监督回归任务学习从噪声逐步走向数据。',[
    S('gan-summary','GAN 的能力与代价','训练靠两方博弈，采样只需生成器',range(26,28),'gan-summary','GAN 的构造直接，能够生成高质量图像，训练后通常一次生成器前向就能得到样本。代价是两方训练容易失衡，损失与质量之间缺少简单关系，扩大模型和数据也需要稳定训练设计。',['进入扩散模型时，本节采用 Rectified Flow 这一确定性流的表述来讲基本训练与采样。扩散与流匹配有多种数学形式，下面的时间、速度和更新公式针对所声明的线性路径，不能直接套到所有变体。']),
  ]),
  G('gen-flow-intuition','从图像到噪声，再反向生成','flow','同一图像在不同噪声级别下仍有共同身份。学习在每个级别如何移动，就能把简单噪声变成复杂数据。',[
    S('flow-noise-levels','用 t 表示数据与噪声的混合程度','t=0 为干净数据，t=1 为纯噪声',range(29,30),'noise-levels','先选简单噪声分布，通常是标准高斯。把同一张猫图逐步与噪声混合，低噪声时保留外观，高噪声时结构逐渐淹没。时间 t 用来告诉模型当前处在哪个级别。',['这里的 t 是生成建模的噪声时间，后面视频还有帧时间，两者应分别理解。端点约定在整段推导中保持一致。']),
    S('flow-iterative-intuition','一次预测局部变化，多次更新得到样本','训练看随机时刻，采样沿完整路径',[31],'iterative','网络接收当前含噪状态和 t，预测如何改变它。采样从 t=1 的噪声开始，重复预测并向较小 t 移动，直到 t=0。',['直觉上可以说逐步去噪；在 Rectified Flow 的具体形式中，网络预测的是速度向量，实际生成更新沿时间减少的方向进行。它不直接输出一个可随意重复调用的“干净图”。']),
  ]),
  G('gen-flow-training','Rectified Flow：构造监督回归','flow','每个训练样本都能与独立噪声配对，并在任意时刻构造已知输入和已知速度目标，因此无需观察真实的逐步去噪轨迹。',[
    S('flow-endpoint-pair','独立抽取数据、噪声与时间','x、z 与 t 共同确定一个训练样本',[32],'endpoints','每轮从数据集中抽 x，从简单噪声分布抽 z，再抽时间 t。基础设置中三者独立，t 在 [0,1] 均匀采样。',['这个配对是构造监督的工具，数据集中不需要预先存在与某张图一一对应的噪声。图像与噪声具有相同形状。']),
    S('flow-linear-path','沿直线构造 xₜ，导数给出目标速度','固定二维端点的结构算例',[33],'linear-path','把数据 x 与噪声 z 线性混合得到 xt。固定这对端点后，对 t 求导得到 z−x，它在这条训练直线上恒定。',['结构算例取 x=(2,−1)、z=(−1,2)，所以 v=(−3,3)。t 从 0 到 1 时，中间点依次为 (2,−1)、(1.25,−0.25)、(0.5,0.5)、(−0.25,1.25)、(−1,2)。','这一变化方向是数据到噪声。生成时从另一端开始，时间向下，移动方向相反。'],[
      E('x_t=(1-t)x+tz,@qquad @frac{d x_t}{dt}=z-x=v','x、z、xt、v 的张量形状相同；t 是标量，可按样本广播到空间、通道或视频维度。'),
    ]),
    S('flow-velocity-loss','回归速度，最小化平方误差','输入 xₜ,t；目标 z−x',[34],'velocity-loss','网络 fθ 接收 xt 与 t，输出同形状的速度预测。已知构造它的 x,z，所以可以直接用 z−x 作监督，以平方误差训练。',['一次迭代只需要随机时刻的前向计算，无需为了构造训练样本执行完整生成循环。训练目标对不同数据、噪声和时刻取期望。'],[
      E('L(@theta)=@mathbb{E}_{x,z,t}@left[@|f_@theta(x_t,t)-(z-x)@|_2^2@right]','平方范数对样本的元素求和，再对随机变量取期望；实现按元素平均时只改变固定的归一化尺度。'),
    ]),
    S('flow-training-code','把监督构造落到训练循环','重采样 → 插值 → 预测 → MSE → 更新',[35],'training-code','对一个批次抽取与数据同形状的高斯噪声，为每个样本抽 t，并将 t 广播到其余轴。网络输出与目标作均方误差，反向传播更新参数。',['下面给出 PyTorch 形式的训练核心。实际系统还需数据缩放、优化器与网络结构；这些不改变插值与监督目标的关系。'],[],{code:trainingCode}),
  ]),
  G('gen-flow-sampling','从噪声积分到数据','flow','训练完成后看不到真实端点 x。采样只能依靠当前状态、当前时间和学到的速度场逐步前进。',[
    S('flow-sampling-start','先定步数，再抽初始噪声','常用多步积分，步数决定计算预算',range(36,37),'sampling-start','选择正整数步数 T，从噪声分布抽 x1。可用 50 步作为一个示例设置；步数取值与模型、求解器和质量预算有关。',['训练端点 x 不参与采样。每一步的网络评估输入是当前生成状态，随着更新不断改变。']),
    S('flow-euler-step','先预测速度，再向较小 t 移动','负时间步长决定更新中的减号',range(38,39),'euler-step','生成过程求解 dxt/dt=fθ(xt,t)，从 t=1 向 t=0 积分。均匀 Euler 步长为 −1/T，所以用当前状态减去预测速度的 1/T。',['网络给出的是朝时间增加方向定义的速度；生成沿时间减少方向移动。减号来自时间步长，不能因示意箭头朝向数据就再翻转网络目标。'],[
      E('@Delta t=-1/T,@qquad x_{t-1/T}=x_t-@frac{1}{T}f_@theta(x_t,t)','右侧使用更新前的 xt 和 t。更一般的非均匀网格要用实际 Δt，不能仍固定除以 T。'),
    ]),
    S('flow-euler-trajectory','移动以后，重新计算速度','三步 Euler 结构算例与生成轨迹',range(40,43),'euler-trajectory','第一次移动后，必须在新的位置和时间重新计算速度，随后继续移动。学习到的是整个中间分布上的速度场，轨迹可以弯曲，不需要沿某个训练随机配对的直线返回。',['结构算例固定 x1=(−1,2)，取 T=3，并用已知场 f(u,t)=(u1+t,2u2−t) 检查更新。依次得到 x2/3=(−1,1)、x1/3=(−8/9,5/9)、x0=(−19/27,8/27)。这个场仅用于算术演示，不声称是训练好的图像模型。','几何示意中，三次更新依次连接噪声区与数据区，体现“求速度、移动、重算”的过程。'],[],{evidence:{url:'media/generative/part2/sampling-path.png',alt:'蓝色噪声、红色数据分布与三步生成轨迹，标出 x1、x2/3、x1/3、x0',caption:'三次更新连接噪声与数据区域；不同位置重新评估速度。',width:654,height:694}}),
    S('flow-sampling-code','恰好执行 T 次更新，返回 x₀','循环 k=T,…,1，不在 t=0 多走一步',range(44,46),'sampling-code','从 k=T 递减到 1，每次使用 t=k/T 求速度并更新一次，最后恰好到 t=0。整个采样循环在关闭梯度的环境下执行，训练网络参数保持固定。',['训练时独立抽时刻以并行构造监督，采样时则串行依赖上一步结果。一次模型评估的成本与总步数共同决定生成代价。'],[],{code:samplingCode}),
  ]),
  G('gen-flow-conditional','加入生成条件','flow','无条件生成学习整个数据分布。加入类别或文本 y 后，目标变为在指定条件下产生多种合理样本。',[
    S('flow-conditional-training','训练时让网络同时看到 y','从配对数据 (x,y) 构造同样的速度目标',range(47,48),'conditional-flow','从带条件的数据对中抽 x,y，噪声仍独立抽取。xt 的构造和 z−x 的监督保持相同，网络额外接收 y，从而学习不同条件对应的速度场。',['几何图用圆点与方块区分两个条件下的数据区域；两者共享噪声起点分布。文本条件通常先编码为特征，再注入网络。'],[
      E('L=@mathbb{E}_{(x,y),z,t}@|f_@theta(x_t,t,y)-(z-x)@|_2^2','条件是训练样本的 y，和混合后的 xt 配对；不改变真实端点 x 的身份。'),
    ]),
    S('flow-conditional-sampling','每一步采样使用同一个条件','y 在生成过程中保持固定',[49],'conditional-sampling','采样时先选条件 y，再抽初始噪声。在每个时间步将当前状态、时间和同一个 y 输入网络，沿对应条件速度场积分。',['不同噪声可在同一个条件下得到不同输出。条件并不唯一确定图像，它约束的是一组可能样本的分布。'],[
      E('x_{t-1/T}=x_t-@frac{1}{T}f_@theta(x_t,t,y)','网络接收固定的 y；不应只在第一步使用条件，而在后续更新中丢失它。'),
    ]),
  ]),
  G('gen-flow-cfg','Classifier-Free Guidance','flow','条件预测可以满足提示，也可能表现得不够强。CFG 在同一状态上比较有条件和无条件两种预测，以调节条件的影响。',[
    S('flow-cfg-dropout','随机丢弃条件，训练同一网络的两种能力','空条件支路仍学习数据分布',range(50,51),'cfg-dropout','训练时以一定概率将 y 替换为空条件 ∅，其余时候保留真实条件。xt 与速度监督不变，同一个网络由此既能作条件预测，也能作无条件预测。',['空条件可以是专门的空提示编码，不表示将数据、时间或目标速度设为零。丢弃概率是训练超参数。']),
    S('flow-cfg-directions','在同一个 xₜ,t 上计算两支速度','无条件 vu 与有条件 vc',range(52,53),'cfg-directions','采样时对同一个状态和时间，分别输入空条件和目标条件。两次预测的差反映条件引起的速度变化，比较时必须固定当前状态。',['由于本节将速度定义为朝噪声时间增加方向，图中的实际生成位移画为 −v。这样才能同时保持训练目标 z−x 和生成更新减号的一致性。'],[
      E('v_u=f_@theta(x_t,t,@varnothing),@qquad v_c=f_@theta(x_t,t,y)','两支来自同一个模型；c 表示 conditional，u 表示 unconditional。'),
    ]),
    S('flow-cfg-combination','沿条件差异外推，再反向积分','w=0 为普通条件预测，w>0 加强引导',range(54,55),'cfg-combination','组合速度为 vc+w(vc−vu)。当 w=0 时直接使用条件分支；w>0 时沿两支差异外推，使生成更偏向条件。实际更新仍用当前状态减去组合速度乘步长。',['结构算例取 vu=(1,2)、vc=(−1,2)。w=0、1、2 时组合分别为 (−1,2)、(−3,2)、(−5,2)；图示箭头画 −v，因此横向条件差异被放大。','更强引导不保证所有维度质量都更好，过大权重可能降低多样性或引入伪影。'],[
      E('v_{@mathrm{CFG}}=(1+w)v_c-wv_u,@qquad x_{t-1/T}=x_t-v_{@mathrm{CFG}}/T','此记号下 w=0 是条件预测；另一种常见记号用 s=1+w，其普通条件点为 s=1。不要混用两个权重零点。'),
    ]),
    S('flow-cfg-cost','无需额外分类器，通常需要两支网络评估','条件控制与采样计算的权衡',range(56,59),'cfg-cost','早期分类器引导使用额外的含噪分类器及其对输入的梯度。CFG 利用生成网络自己的有条件与无条件预测，省去独立分类器。',['标准实现每个时间步需要两支预测，网络计算量通常约为单支的两倍；可以合并批次，实际时延还受硬件和实现影响。相同组合必须用于整个积分过程。']),
  ]),
  G('gen-flow-optimal','网络应该预测哪个速度','flow','同一个含噪状态可能由不同的数据与噪声配对产生。网络只看到中间状态，无法知道训练时抽中了哪一对端点。',[
    S('flow-conditional-mean','平方误差的最优解是条件平均速度','对所有能产生当前状态的端点配对求平均',range(60,61),'conditional-mean','多条训练直线可以穿过同一个 xt，但对应的 z−x 不同。面对相同输入，确定性网络只能给一个预测；平方误差最小的选择是这些目标在条件分布下的平均。',['这解释了为什么学习到的速度场通常不会复现某个随机配对的完整直线。网络学的是不同配对共同诱导的中间分布如何变化。'],[
      E('f^*(u,t)=@mathbb{E}[z-x@mid x_t=u,t]','均值对与当前状态 u 一致的配对求条件期望，不能直接用全数据的无条件均值代替。'),
    ]),
    S('flow-endpoint-velocities','两端能推导出更简单的条件均值','独立标准高斯噪声下的端点公式',range(62,63),'endpoint-velocities','在 t=1 时 xt=z 已知，但数据端点仍独立，最优速度为 z−E[x]。在 t=0 时 xt=x 已知，而 E[z]=0，所以最优速度为 −x。',['这里的 t=0 是无噪声端点。公式仍包含当前状态，不能把最优速度简写成数据均值或噪声均值本身。'],[
      E('f^*(z,1)=z-@mathbb{E}[x],@qquad f^*(x,0)=@mathbb{E}[z]-x=-x','要求训练端点独立，且噪声均值为零。条件生成时数据均值应改成 E[x|y]。'),
    ]),
    S('flow-middle-ambiguity','中间噪声区域需要更多学习资源','从配对歧义引出时间采样设计',[64],'ambiguity','在中间噪声级别，数据结构与噪声混合，许多端点配对可能解释相同状态。对图像任务而言，网络常需在这里建立更复杂的语义判断。',['这是设计训练采样分布的动机，具体难度还依赖数据、路径和参数化；不能把所有问题的最难时刻固定为 t=0.5。']),
  ]),
  G('gen-flow-schedule','改变训练时刻的采样分布','flow','基础训练均匀抽 t，使相同长度的时间区间获得相同采样机会。可以调整这个分布，将训练资源分配到更有用的噪声尺度。',[
    S('flow-time-reweighting','从均匀抽样到非均匀抽样','时间采样改变训练目标的权重',range(65,67),'time-reweighting','将 t 的采样分布改为 pt，可以增加某些噪声级别出现的频率。若不做重要性校正，这等价于重新加权训练目标。',['时间采样分布与采样积分网格是两个选择：前者控制训练见到什么，后者控制生成时在哪里评估模型。密度 p(t) 描述训练时刻的采样偏好，接下来比较不同参数对应的分布形状。']),
    S('flow-logit-normal','logit-normal：把高斯变量映射到 (0,1)','均值与尺度控制训练时刻的分布',[68],'noise-schedule','先采实数 u，再经 sigmoid 映射成 t，得到 logit-normal 时间分布。合适参数可把更多概率放在中间噪声区域。',['增大高斯均值会偏向较高 t；尺度改变分布集中程度。图例中的不同参数对应不同形状，不能把所有 logit-normal 都描述为只集中在中点。'],[
      E('u@sim@mathcal{N}(m,s^2),@qquad t=@sigma(u)=@frac{1}{1+e^{-u}}','s>0 是标准差。这里 σ 是 logistic 函数，与前面 VAE 标准差和后面噪声调度的符号含义不同。'),
    ]),
    S('flow-high-resolution','高分辨率需要匹配噪声尺度与表示','从简单训练框架进入可扩展架构',range(69,71),'high-resolution','像素之间存在空间相关性，分辨率变化会影响同一噪声比例下的可感知信号。高分辨率训练可使用偏向较高噪声的时间策略，并结合更合适的压缩表示与网络。',['Rectified Flow 提供简洁的训练和积分框架；高质量高分辨率生成仍依赖路径、采样策略、模型容量和数据。接下来先整理更一般的扩散参数化，再看潜空间与 Transformer 实例。']),
  ]),
  G('gen-diffusion-general','广义扩散：输入路径与输出目标','flow','把“怎样混合数据与噪声”和“网络预测什么”分别表示，就能比较不同扩散形式，同时明确采样器必须与参数化匹配。',[
    S('diffusion-general-framework','用 a,b 描述输入，用 c,d 描述目标','四个时间函数分别承担两种职责',range(72,73),'general-framework','一般输入可写成 xt=a(t)x+b(t)z，回归目标可以是数据、噪声或二者的线性组合。为统一符号，这里把目标写成 y*=c(t)x+d(t)z。',['Rectified Flow 对应 a=1−t、b=t、c=−1、d=1，目标就是 z−x。更换目标后，模型输出未必仍是 dxt/dt，采样时需要对应的转换公式。'],[
      E('x_t=a(t)x+b(t)z,@quad y^*=c(t)x+d(t)z,@quad L=@mathbb{E}@|f_@theta(x_t,t)-y^*@|_2^2','同形状张量的线性组合；四个系数可随时间变化。y* 是回归目标，不是前面条件生成中的条件标签 y。'),
    ]),
    S('diffusion-variance-preserving','VP：用平方和控制边缘方差','独立单位方差时 a²+b²=1',[74],'vp','若 x,z 独立且每维方差均为 1，则混合状态的每维方差为 a²+b²。选择满足平方和为 1 的系数，就能保持边缘方差不变。',['令 s(t) 从 1 减到 0，可取 a=√s、b=√(1−s)。这与 RF 的 a=1−t、b=t 不同，RF 在中间时刻的方差通常更小。'],[
      E('@operatorname{Var}(x_t)=a(t)^2+b(t)^2,@qquad a(t)=@sqrt{s(t)},@quad b(t)=@sqrt{1-s(t)}','独立性消除了协方差项；若数据未标准化，方差表达式需包含 Var(x) 和 Var(z)。'),
    ]),
    S('diffusion-variance-exploding','VE：保留信号，增大噪声尺度','a=1，b=σ(t)',[75],'ve','VE 路径保留原信号系数，把噪声标准差随时间增大。单位方差且独立时，总方差为 1+σ(t)²。',['足够大的终点噪声会压过数据的相对影响，但有限尺度下 xt=x+σz 仍含信号。初始化的尺度、生成动力学与求解器都应匹配该路径。'],[
      E('x_t=x+@sigma(t)z,@qquad @operatorname{Var}(x_t)=1+@sigma(t)^2','这里 σ(t) 是噪声标准差调度；不能继续沿用 RF 的纯单位高斯终点与固定 z−x 更新而不作转换。'),
    ]),
  ]),
  G('gen-diffusion-targets','x、ε 与 v 预测','flow','相同含噪输入可以配不同监督目标。预测值的含义决定如何恢复数据、噪声以及后续生成更新。',[
    S('diffusion-prediction-targets','数据预测、噪声预测与 VP v 预测','先声明参数化，再解释网络输出',[76],'prediction-targets','x-prediction 直接回归干净数据；ε-prediction 回归标准噪声 z。对于 a²+b²=1 的 VP 路径，常用 v=a z−b x，将数据和噪声旋转组合。',['VP 的 v 与 RF 的 z−x 含义不同。RF 速度是线性路径对 t 的导数；VP 的 v 可以理解为 a=cosφ、b=sinφ 时对角度 φ 的导数。'],[
      E('y_x^*=x,@qquad y_@epsilon^*=z,@qquad y_v^*=a z-b x','在统一的 y*=cx+dz 下，系数分别为 (1,0)、(0,1)、(−b,a)。本式使用标准 VP v 定义。'),
    ]),
    S('diffusion-prediction-conversion','转换目标时检查系数与端点','VP 的旋转关系可以直接反解',[76],'prediction-conversion','VP 组合满足 xt=a x+b z、v=−b x+a z，因此可反解 x=a xt−b v、z=b xt+a v。若只预测噪声，则恢复 x 需要除以 a，a=0 的端点不可直接使用该除法。',['不同预测目标隐含不同的误差权重与数值行为。知道目标的名称还不够，必须同时知道输入路径、时间约定和采样转换。'],[
      E('x=a x_t-bv,@qquad z=b x_t+av,@quad (a^2+b^2=1)','此处为精确目标的代数反解；网络预测带有误差时，它们得到相应估计。'),
    ]),
  ]),
  G('gen-ldm','LDM：在潜空间迭代','applications','高分辨率像素上反复运行大模型成本很高。潜空间扩散先压缩图像，把主要迭代计算放在更小的表示上。',[
    S('ldm-architecture','编码、潜空间扩散、解码','像素空间与潜空间边界分明',[77],'ldm-architecture','图像经编码器 E 变成潜表示 z，在潜空间构造含噪状态并训练去噪网络。生成时从潜空间噪声出发反复更新，最后只需通过解码器 D 转回像素。',['右侧条件编码器 τθ 可以接文本、语义图等，交叉注意力把条件引入 U-Net。上方加噪方向和下方反向更新方向相反；生成时不需要待生成图像的编码结果。','这里 z 表示图像潜表示，与前面用 z 表示独立高斯噪声的局部记号不同，应按这张架构图的定义理解。']),
    S('ldm-benchmark','FID、精确率与召回率一起看','四个数据集，不能合并为一个排名',[78],'ldm-results','FID 越低表示特征分布距离越小；生成精确率与召回率分别反映样本质量和覆盖，表中均以越高为优。不同数据集上的分数需要分别比较。',['CelebA-HQ 256² 中 LDM-4 的 FID 为 5.11；FFHQ 中为 4.98，而 ProjectedGAN 为 3.08。LSUN-Churches 的 LDM-8* 为 4.02、ProjectedGAN 为 1.59，但召回率分别为 0.52 与 0.44。','这些行显示指标之间有取舍。模型后缀、采样步数、数据集与脚注共同决定比较条件，不能只挑一个数宣布整体优劣。']),
    S('ldm-text-samples','文本到图像：组合概念与文字细节','LAION 上的 1.45B 模型，七组提示',[79],'ldm-samples','七列提示分别涵盖路牌文字、绘画风格、鼠与章鱼混合体、抽象网络、进食场景、章鱼椅与 T 恤文字；每列两张图说明同一条件存在多种输出。',['图注设定为 LDM-8(KL)、200 个 DDIM 步、η=1.0、引导尺度 s=10.0。这里的 s 对应 CFG 的另一种权重记法，不能直接等同于前面 w。','观察对象组合与风格的同时，也要检查路牌和衣服上的拼写。视觉逼真、语义符合与准确文字生成是不同要求。']),
  ]),
  G('gen-dit','DiT：Transformer 预测扩散目标','applications','潜空间压缩降低分辨率后，可以将表示切成 token，用 Transformer 替代 U-Net 骨干。',[
    S('dit-architecture','潜表示切块，条件进入 DiT block','图像 token、时间与类别条件',[80],'dit-architecture','DiT 将含噪潜表示切块并嵌入为 token，加上位置表示，经多层 Transformer block 后还原成与预测目标同形状的输出。时间和类别条件控制每层计算。',['架构图并列比较普通条件方式、交叉注意力及 adaLN-Zero。后者用条件调制归一化，并通过接近零初始化的残差门控制初期更新。这些条件注入方式是后续结构消融的比较对象。']),
    S('dit-architecture-results','条件注入的消融与引导后的结果','同一 XL/2 设置先比训练曲线，再看表格',[81],'dit-results','左图横轴为训练步数、纵轴 FID-50K；同一 XL/2 规模下，adaLN-Zero 的蓝线在所示训练区间更低，体现条件注入与初始化的作用。',['右表在类别条件 ImageNet 256² 中列出不同引导设置：DiT-XL/2 无引导 FID 为 9.62，cfg=1.25 为 3.22，cfg=1.50 为 2.27。质量提升同时伴随精确率、召回率的变化。','结构消融和跨模型表承担不同证据作用；应在各自设置下读结论，避免将某一引导下的数值当成骨干架构单独带来的全部改进。']),
  ]),
  G('gen-repa','REPA：对齐预训练视觉表征','applications','去噪训练还要自行学习语义表示。利用已有自监督视觉编码器的特征，可以为扩散网络的中间表示提供额外监督。',[
    S('repa-alignment','干净视觉特征监督含噪中间表示','对齐损失与去噪损失共同训练',[82],'repa-method','干净图像输入预训练视觉编码器，含噪表示输入 DiT 或 SiT。通过投影 MLP 把扩散网络某层表示映射到目标特征空间，加入对齐目标，同时继续优化去噪目标。',['右图用 FID-50K 比较训练迭代，标出了达到相近 FID 的约 17.5 倍迭代差距。这是图内模型与设置下的收敛比较，不是每种任务、硬件或每次前向的固定加速倍数。']),
    S('repa-representation-analysis','表示探针、对齐程度与生成质量','三个图分别回答三个问题',[83],'repa-analysis','左图按层看 ImageNet 线性探针准确率，REPA 缩小与 DINOv2 表征的语义差距；中图以 CKNNA 比较层间表征对齐；右图把准确率与 FID 联系起来。',['同一个在第 8 层施加 REPA 的网络，在不同层接受评估。对齐较早层能提高语义表示，但不意味着所有层都应强制变成相同特征。右图展示所测训练过程中的共同改善，不能单靠相关性证明唯一因果。']),
    S('repa-component-results','用消融选择教师、深度与目标','ImageNet 256²，SiT-L/2，400K 迭代',[84],'repa-results','表格分块比较目标编码器、对齐深度和对齐损失。这里所有模型训练 400K 迭代，生成评估用 SDE Euler–Maruyama、NFE=250、无 CFG，对齐权重 λ=0.5。',['基线 FID 为 18.8；DINOv2-L、第 8 层、NT-Xent 为 10.0。深度改到 16 层时线性准确率为 71.1，但 FID 为 12.1，说明探针准确率与生成质量的最优设置未必相同。','保留完整表头和分组，比较时一次只改变一个因素；不能从这一表推断任意教师、任意层对齐都必然有效。']),
  ]),
  G('gen-cogvideox','CogVideoX：从图像扩展到视频','applications','视频增加了时间维，除了单帧外观，还要建模跨帧运动、文本对应和不同片长。压缩、注意力与数据打包需要一起设计。',[
    S('cogvideox-joint-tokens','文本与视频 token 联合建模','3D causal VAE 与 Expert Transformer',[85],'cogvideox-architecture','视频经 3D causal VAE 压缩成时空潜表示，文本经编码器得到文本 token。两类 token 进入联合注意力，借助时间条件和模态相关的归一化处理不同输入。',['图中的 3D full attention 允许时空 token 交互；文本与视觉的 Expert AdaLN 支路分别调制两种模态。它连接提示语义与连续视频变化，而非独立逐帧生成后拼接。']),
    S('cogvideox-compression','3D VAE 压缩空间与时间','空间 8×8，时间约 4 倍',[86],'cogvideox-vae','编码器与解码器在空间和时间轴上作分阶段下采样与上采样，KL 正则约束潜空间。图内结构从像素到潜变量达到 8×8×4 的压缩尺度。',['帧数边界采用 (4f+1)→(f+1)，首帧与后续时间块的处理有区别，不能把任意片长简单写成精确除以 4。','右侧上下文并行示意在不同 rank 之间传递卷积所需的历史帧，保持时间因果卷积的上下文；它是分布式计算安排，并非额外的生成时间步。']),
    S('cogvideox-frame-packing','不同分辨率和片长打包训练','图像、144 帧、72 帧、48 帧共存',[87],'cogvideox-packing','固定片长训练会裁剪长视频、丢弃短视频，并使图像与视频任务出现较大差别。多分辨率 frame packing 将不同长度序列装入同一批次，结合三维位置表示处理时空坐标。',['图中例子包括 1360×768 图像、768² 的 144 帧视频、1080×768 的 72 帧视频、768×960 的 48 帧视频。打包提高数据利用率，仍需要明确序列边界和 padding，不能把邻接打包理解为连续剧情。']),
    S('cogvideox-evaluation','视频质量包含多种不同指标','2B 与 5B 的收益并非逐项单调',[88],'cogvideox-results','结果分别衡量人物动作、场景、动态程度、多物体、外观风格、动态质量和 GPT4o-MT 分数。每列对应不同要求，应按列理解。',['CogVideoX-5B 的动态质量为 69.5、多物体为 70.95、GPT4o-MT 为 3.36；2B 的动态程度为 66.39，高于 5B 的 62.22。模型更大并不保证每项指标都提高。','这些指标也不能直接证明所有生成内容遵守物理规律；下一组研究单独检查物理关系和跨帧一致性。']),
  ]),
  G('gen-videorepa','VideoREPA：对齐时空关系','applications','图像表示对齐主要提供外观语义。视频还需要保持对象之间、帧之间的关系，才能支持更可信的运动与交互。',[
    S('videorepa-physical-evidence','把物理现象与表征评估分开观察','接球、倒糖浆、碎杯与接飞盘',[89],'videorepa-evidence','四组视频帧比较 CogVideoX、加图像 REPA 的版本与 VideoREPA。红框标出物理不合理现象，保留同一提示与连续帧的配对，便于检查对象接触、流体运动和碎裂。',['右图是在 Physion 的 contain 与 roll 子集上评估对象接触预测，比较模型表示中的物理理解差距。表示探针改善和生成案例改善是两类证据，不能合并成一个指标。']),
    S('videorepa-token-relations','蒸馏 token 之间的时空关系','TRD 比较成对相似度',[90],'videorepa-method','预训练自监督视频编码器处理视频，扩散 Transformer 的中间特征通过维度对齐后，与教师表示的 token 关系比较。TRD 对齐的是成对 token 相似度。',['同帧 token 间的联系表达空间关系，跨帧联系表达时间关系。与逐 token 强制复制特征相比，关系目标强调对象结构与运动之间的组织方式；去噪目标仍然保留。']),
    S('videorepa-videophy','语义符合与物理常识分别统计','VideoPhy 按固体与流体组合分组',[91],'videorepa-results','SA 衡量视频与文本的语义符合和保真，PC 衡量物理常识。结果分成固体—固体、固体—流体、流体—流体和总体，避免用单一外观分数代替物理评价。',['相同详细提示设置下，CogVideoX-5B* 的总体 SA/PC 为 70.0/32.3，VideoREPA-5B* 为 72.1/40.1。固体—固体 SA 则从 62.9 变为 58.0，说明改进并非所有分组逐项胜出。','表中 * 表示详细提示，† 表示转引结果；跨行比较必须保留这些设置差异。']),
  ]),
  G('gen-worldforge','WorldForge：联合多种世界知识','applications','进一步考虑语义、几何和运动等多种知识如何共同帮助视频生成，以及简单叠加对齐目标会带来什么问题。',[
    S('worldforge-multisource','多源特征融合与联合预测','架构图中的方法标识为 DreamWorld',[92],'worldforge-method','该组架构图把 DINOv2 的语义表示、VAE 潜变量、VGGT 的几何表示和光流特征加噪后融合，输入扩散网络，再投影到不同输出分支。图中的冻结与可训练标记区分知识教师和待学习模块。',['去噪、语义、时间与空间目标共同参与训练，CCA 调整一致性约束；推断图中的 Multi-Source Inner-Guidance 使用不同来源的内部特征引导预测，最后由 VAE 解码。','这一组采用 WorldForge 章节名，图内论文方法名为 DreamWorld。按图中定义理解具体模块，不凭名称推测额外版本关系。']),
    S('worldforge-naive-alignment','直接扩展视频对齐可能产生失真','浇水、搅汤、蜂蜜落入酸奶',[93],'worldforge-failures','每组图上排是 VideoREPA，下排是直接扩展多源知识的版本。红框标出了喷口、勺子或流体连接处的结构不合理变化。',['这一失败例说明，多种教师的特征约束可能相互牵制。加入更多知识来源需要控制对齐方式与生成保真之间的关系，不能只叠加损失就假设更好。']),
    S('worldforge-benchmarks','同时检查 VBench、VBench 2.0 和 VideoPhy','每张表回答不同层面的世界一致性',[94],'worldforge-results','VBench 把时间、语义和空间维度分别统计；VBench 2.0 进一步区分创造性、常识、可控性、人物保真与物理；VideoPhy 专门比较 SA 和 PC。',['图内 DreamWorld 的 VBench 总分为 80.97，基线 Wan2.1-T2V-1.3B 为 76.93；VideoPhy 总体 SA/PC 分别为 52.9/26.2 与基线 47.7/21.2。','VBench 2.0 中 DreamWorld 的总分为 52.97，但物理项 55.07 低于基线 55.85，常识与控制项也非全部最好。保留分项有助于识别能力边界。']),
    S('worldforge-qualitative-cases','按完整时间序列检查世界一致性','人物动作、物体、接触、流体与足迹',[95],'worldforge-samples','八组案例涵盖读书抬头、接电话、服饰中的动物、绘画、针压塑料膜、失重液体、玩具与飞盘、涉水足迹。每组保留基线和方法的连续帧，红框提示对照中的异常位置。',['观察身份和外观是否保持，手与物体是否正确接触，运动后的状态是否合理。挑选的定性帧补充了数值表，但不能证明未展示场景的全面物理正确性。']),
  ]),
  G('gen-h3-world','H3-World：用动作控制未来','applications','从按提示生成视频继续走向交互世界模型：同一起始画面在不同动作条件下，应产生协调的角色运动与相机变化。',[
    S('h3-world-packed-actions','把动作、初始观察与视频表示组成序列','时间对齐的动作提示与掩码注意力',[96],'h3-world-method','按时间把角色与相机控制转成动作提示，分别编码，并与静态语义、初始观察和视频潜变量打包。图中 H3 Encoder、token refiner 和视觉 VAE 分别处理动作与视觉信息。',['H3 block 使用单流自注意力；LoRA 注入可训练变化，掩码矩阵区分允许联系、动作—视频联系与禁止联系。关注矩阵行列的 token 身份，才能理解控制信号如何进入对应时段。']),
    S('h3-world-control-evidence','检查动作与相机是否同时响应','同一保留片段的控制接口比较',[97],'h3-world-actions','上排 GT 是记录的参考运动，后续各排使用相同控制序列。直接加偏置与 FiLM 在红框处出现运动或相机响应不一致，H3-World 的帧序列展示了更协调的变化。',['WASD 与相机键位覆盖在同一时间位置，比较时同时看角色位移、朝向和背景视角。这里验证的是所示保留片段的控制响应，不等于任意动作都可精确执行。']),
  ]),
  G('gen-generative-applications','生成模型与感知任务','applications','生成模型学习到的表示和迭代机制也能用于检测、分割等感知任务。最后区分这些任务的输出与评价，回顾整讲的生成路线。',[
    S('generative-perception-pipelines','检测框与分割图也可以迭代预测','左：框去噪；右：DiGSeg 类别条件分割',[98],'perception-pipelines','左图将随机框与图像特征送入检测头，多阶段细化类别和框位置。这里被迭代修改的是候选框，输出依然是检测结果。',['右图 DiGSeg 将图像、掩码及类别提示编码到潜空间，训练扩散网络预测目标噪声；推断在类别文本条件下迭代并解码，再汇聚得到分割。两条管线的输出空间不同，不能因都使用去噪就视作同一任务。']),
    S('generative-segmentation-results','开放词汇分割按数据集与骨干分组比较','A-847、PC-459、A-150、PC-59、Cityscapes',[99],'perception-results','表中比较不同视觉语言模型、骨干、训练数据与额外数据使用情况。评估跨五个分割数据集，数值应在相同模型规模和数据条件内解释。',['ViT-L/14 分组中 DiGSeg 五项为 19.9、29.2、43.2、68.4、38.5；ViT-B/16 分组为 17.5、23.1、37.2、62.7、36.5。绿色增量相对于表内对应的次优结果，不能直接跨两组相减。','分割指标检验的是预测区域与类别，图像生成的 FID、视频的 PC 则检验其他性质，三者不能直接换算。']),
    S('generative-full-recap','用训练信号与采样路径复习四类模型','自回归、VAE、GAN、扩散与流',[100],'full-recap','自回归学习条件似然并顺序生成；VAE 用潜变量和下界训练，先采潜变量再解码；GAN 通过真假博弈训练生成器；扩散与流把简单噪声经多步网络评估转成数据。',['比较时分别问：训练目标是什么，随机性从哪里来，如何生成一个样本，哪些计算与质量限制最突出。潜空间、Transformer 与表征对齐是可组合的表示和架构选择，不会自动消除这些基本取舍。']),
  ]),
];
export const slides=sections.flatMap((g,index)=>{g.index=index+1;return g.steps.map(s=>({...s,section:g.id,topic:g.topic}));}).map((s,index)=>({...s,page:48+index,part:'part2'}));
export const sequences={
  'gan-alternating':{type:'gan',frames:[0,1,2],steps:['固定真实值与噪声，计算初始真假分数','冻结生成器，沿判别目标更新 a、b','冻结判别器，用非饱和目标更新生成参数 g']},
  'flow-linear-path':{type:'interpolation',frames:[0,1,2,3,4],steps:flowExample.times.map(t=>'t='+t+'，xₜ=('+flowExample.x.map((v,i)=>Number(((1-t)*v+t*flowExample.z[i]).toFixed(2))).join(', ')+')；目标速度始终为 (−3, 3)')},
  'flow-euler-trajectory':{type:'euler',frames:[0,1,2,3],steps:['从 x₁=(−1,2) 开始，计算 v₁=(0,3)','减 v₁/3，得到 x₂/₃=(−1,1)，重新计算速度','再减当前速度的 1/3，得到 x₁/₃=(−8/9,5/9)','完成第三次更新，返回 x₀=(−19/27,8/27)']},
  'flow-cfg-combination':{type:'cfg',frames:[0,1,2,3],steps:['同一状态上先看无条件生成方向 −vᵤ','w=0：使用条件预测，−vCFG=(1,−2)','w=1：沿条件差异外推，−vCFG=(3,−2)','w=2：继续加强条件差异，−vCFG=(5,−2)']},
};
