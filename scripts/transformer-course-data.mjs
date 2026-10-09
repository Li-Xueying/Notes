export const assetVersion='20261009-2';
const range=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
export const topics={
  'tf-attention':{label:'自注意力',english:'SELF-ATTENTION',number:'01',target:'tf-qkv'},
  'tf-encoder':{label:'编码器',english:'ENCODER',number:'02',target:'tf-encoder-block'},
  'tf-decoder':{label:'解码器',english:'DECODER',number:'03',target:'tf-autoregressive'},
  'tf-encoder-decoder':{label:'编码器与解码器',english:'ENCODER–DECODER',number:'04',target:'tf-cross-attention'},
  'tf-models':{label:'语言与视觉模型',english:'NLP / VISION',number:'05',target:'tf-families'},
  'tf-moe':{label:'混合专家',english:'MIXTURE OF EXPERTS',number:'06',target:'tf-moe-intro'},
};
// Repeated source builds become controlled sequences, keeping the source order.
const groups=[
  ['从 Seq2Seq 到自注意力','tf-qkv','tf-attention',[
    ['transformer-task','Transformer：序列到序列','编码输入序列，再生成输出序列',[1,2],['image8.png','image9.png'],'示例将“深度学习”翻译成 Deep Learning；编码源输入，再根据源表示生成目标序列。'],
    ['transformer-origin','Attention Is All You Need','2017 年提出的 Transformer 架构',[3],['image10.png','image9.png'],'论文用注意力、逐位置前馈网络和位置编码组织序列模型。'],
    ['course-route','从机制到完整模型，再到专家层','自注意力 → 编码器 → 解码器 → 语言与视觉 → MoE',[4],'route'],
    ['attention-layer','用自注意力交换序列信息','输入或隐藏层中的向量，都可作为序列',[5,6],'attention-layer','每个位置输出一个上下文化向量；前馈层逐位置变换，自注意力连接位置之间。'],
    ['attention-relevance','生成 b₁，需要查看哪些 aᵢ？','从一个输出位置出发，寻找相关的输入向量',[7],'attention-relevance'],
    ['score-functions','两种相关性打分方式','点积与加性打分',[8],'score-functions','把两侧输入分别投影，比较 dot-product 与 additive；接下来采用点积。'],
    ['query-key','固定 q₁，与各位置的 kᵢ 匹配','q₁ = Wq a₁；kᵢ = Wk aᵢ',[9],'query-key','Q 表示查询角色，K 表示被查询角色；分数可以为负，还不是概率。'],
  ]],
  ['归一化权重与 Value 汇总','tf-weighted-sum','tf-attention',[
    ['attention-vector','从相关性分数生成一个输出','打分 → Softmax → Value 加权和',[10,11],'attention-vector','a₁ 也参与被查询；同一个查询对四个位置产生一组归一化权重。'],
    ['attention-next-query','换成 q₂，重新计算一组权重','同一 K、V；另一个查询，另一个输出',[12],'attention-next-query'],
    ['attention-parallel','所有位置可以并行聚合','a₁…a₄ → b₁…b₄',[13],'attention-parallel'],
  ]],
  ['矩阵计算与缩放点积注意力','tf-scaled-attention','tf-attention',[
    ['qkv-matrices','把所有投影写成矩阵','X → Q、K、V',[14],'qkv-matrices','统一采用每个位置占一行的记法，投影参数在各位置共享。'],
    ['attention-matrix','一行分数对应一个查询','QKᵀ → 逐行 Softmax → AV',[15,16,17],'attention-matrix','矩阵的行是查询，列是被查询位置；输出数量等于查询数量。'],
    ['scaled-attention','加入缩放，得到标准公式','Attention(Q,K,V) = softmax(QKᵀ/√dₖ)V',[18],'scaled-attention','在理解打分和汇总之后，引入 √dₖ 缩放，控制点积尺度。'],
    ['animal-it','it 指代 animal：关注上下文','The animal … because it was too tired',[19],['image225.png']],
  ]],
  ['多头注意力：多个相关性子空间','tf-multi-head','tf-attention',[
    ['multi-head-branches','两头示例：分别计算关系','每个头独立投影和聚合',[20,21],'multi-head-branches'],
    ['multi-head-merge','拼接各头，再做输出投影','Concat(head₁,…,headₕ)Wᴼ',[22],'multi-head-merge'],
    ['multi-head-it','it 同时关注 animal 和 tired','对比 2 个头与 7 个头的关注连线',[23],['image226.jpg','image227.jpg']],
  ]],
  ['位置编码补回顺序','tf-position','tf-attention',[
    ['position','给每个位置加入位置向量','内容向量 aᵢ + 位置向量 eᵢ',[24],['image252.png']],
  ]],
  ['自注意力与 CNN、RNN','tf-comparisons','tf-attention',[
    ['cnn-receptive-field','固定局部连接与内容相关连接','CNN 的局部共享核；注意力的输入相关权重',[25,26],'cnn-receptive-field'],
    ['attention-data','结构先验与数据规模','实验中，小数据和大数据条件下的表现不同',[27],['image257.png']],
    ['rnn-comparison','串行递推与并行交互','RNN 沿时间传递；注意力直接连接远处位置',[28],'rnn-comparison'],
  ]],
  ['编码器块的完整路径','tf-encoder-block','tf-encoder',[
    ['encoder-role','编码器：序列输入，序列表示输出','x₁…xₙ → h₁…hₙ',[29,30,31],['image260.png']],
    ['encoder-stack','逐层叠加编码器块','每层先交换信息，再逐位置变换',[32],'encoder-stack'],
  ]],
  ['残差、前馈网络与层归一化','tf-residual-norm','tf-encoder',[
    ['encoder-residual','把注意力子层补成完整块','Self-attention → Add & Norm → FFN → Add & Norm',[33],'encoder-residual'],
    ['encoder-bert','完整编码器也用于 BERT','注意力、FFN、残差和归一化重复堆叠',[34],['image260.png']],
  ]],
  ['Pre-LN、Post-LN 与归一化轴','tf-ln-variants','tf-encoder',[
    ['ln-order','归一化放在模块之前还是之后','Post-LN: LN(x+F(x))；Pre-LN: x+F(LN(x))',[35,36],'ln-order'],
    ['norm-axes','不同归一化方法统计哪些元素','Batch、Layer、Instance、Group Norm',[37],['image295.png']],
  ]],
  ['自回归解码与停止条件','tf-autoregressive','tf-decoder',[
    ['decoder-role','解码器预测下一个 token','输入条件 + 已有前缀 → 词表分布',[38,39],'decoder-role'],
    ['decoder-first','从 START 生成第一个字','分布示例：深 0.8；习 0.1',[40],'decoder-first'],
    ['autoregressive-feedback','将输出反馈为下一步输入','START → 深 → 度 → 学 → 习',[41,42],'autoregressive-feedback'],
    ['decoder-length','输出长度事先未知','生成完“深度学习”，仍可能继续',[43],'decoder-length'],
    ['decoder-stop','将 END 加入词表','生成 END 后结束当前序列',[44,45],'decoder-stop'],
  ]],
  ['因果遮罩怎样阻止未来泄漏','tf-causal-mask','tf-decoder',[
    ['decoder-block','先隔离解码器自身的路径','Masked self-attention + FFN',[46,47],'decoder-block'],
    ['causal-mask','第 i 个位置只读取 j ≤ i','屏蔽未来分数，再做 Softmax',[48,49],'causal-mask'],
    ['mask-patterns','因果、滑动窗口与分块遮罩','三种连接范围，三种信息约束',[50,51],['image298.jpeg']],
  ]],
  ['自回归与非自回归','tf-ar-nar','tf-decoder',[
    ['nar-length','并行预测多个位置，如何决定长度？','另设长度预测器，或保留足够输出槽位',[52,53],'nar-length'],
    ['nar-multimodality','并行速度与输出一致性的取舍','同一输入可能对应多种合理输出',[54],'nar-multimodality'],
  ]],
  ['交叉注意力连接输入与输出','tf-cross-attention','tf-encoder-decoder',[
    ['cross-role','编码器输出被解码器读取','Q 来自目标侧；K、V 来自源侧',[55,56],'cross-role'],
    ['cross-process','当前解码状态选择源序列信息','打分、归一化、汇总、预测；下一步重新查询',[57,58],'cross-process'],
    ['speech-alignment','语音与输出字符的软对齐','频谱时间片段 ↔ h、o、w 等字符',[59],['image317.png'],'Listen, Attend and Spell 的语音示例，用来说明跨序列注意力。'],
    ['cross-layers','交叉注意力可以连接不同层','同层、并行、细粒度、全连接与自适应连接',[60,61],['image324.png']],
  ]],
  ['训练、推理与 Teacher Forcing','tf-training-inference','tf-encoder-decoder',[
    ['training-loss','用真实下一词监督预测分布','深的目标概率为 1；最小化交叉熵',[62],'training-loss'],
    ['teacher-forcing','真实目标右移一位作为输入','输入 BOS 深 度 学 习；目标 深 度 学 习 EOS',[63],'teacher-forcing'],
  ]],
  ['束搜索：扩展、剪枝与回溯','tf-beam-search','tf-encoder-decoder',[
    ['greedy-tree','局部最优不保证整条路径最优','贪心：0.6×0.6×0.4；另一条：0.4×0.9×0.9',[64],'greedy-tree'],
    ['beam-example','束宽 2：保留两个高分前缀','he / I → 展开与剪枝 → he hit me with a pie',range(65,77),['image349.png'],'蓝色数字是累计对数概率，越大越好；最终示例分数 −4.3。'],
  ]],
  ['采样、BLEU 算例与评价优化','tf-generation','tf-encoder-decoder',[
    ['sampling','开放生成需要保留随机性','比较搜索与采样的文本输出',[78],['image350.png']],
    ['bleu-definition','BLEU：n-gram 精确率与短句惩罚','词串匹配 + Brevity Penalty',[79],'bleu-definition'],
    ['bleu-example','the cat sat on the mat 的算例','参考：the cat is on the mat',[80],'bleu-example','一元 5/6，二元 3/5，BP=1；二元等权 BLEU≈0.707。'],
    ['metric-optimization','训练目标能否直接对应评价指标？','离散生成使 BLEU 难以直接反向传播',[81],'metric-optimization'],
  ]],
  ['前缀分布差异与完整结构回顾','tf-exposure-bias','tf-encoder-decoder',[
    ['exposure-bias','模型生成“渡”，真实前缀却是“度”','训练读取真值，推理读取自己的输出',[82],'exposure-bias'],
    ['scheduled-sampling','尝试混合真实前缀与模型前缀','Scheduled Sampling 的三种相关方案',[83],['image356.png','image357.png']],
    ['transformer-summary','回到完整 Transformer','源编码 → 交叉读取 → 目标生成',[84],['image9.png','image358.png']],
  ]],
  ['Encoder-only、Encoder–Decoder、Decoder-only','tf-families','tf-models',[
    ['model-families','三种 Transformer 架构','BERT、T5、GPT',[85,86],'model-families'],
    ['bert','Encoder-only：上下文化表示','双向读取输入，用于理解与分类',[87],['image360.png']],
    ['t5','Encoder–Decoder：条件生成','理解源输入，再生成相关输出',[88],'t5','T5 对应编码器—解码器类型；原图是一般 Seq2Seq 角色示意。'],
    ['gpt','Decoder-only：前缀续写','因果注意力 + 下一词预测',[89],['image362.png']],
    ['decoder-choice','统一序列建模与 KV cache','训练目标、参数复用与推理缓存',[90],'decoder-choice'],
  ]],
  ['ViT：图像如何成为序列','tf-vit-tokens','tf-models',[
    ['vision-comparison','从局部图像结构到全局交互','CNN 的结构先验与 Transformer 的长距离连接',[91],'vision-comparison'],
    ['vit-overview','ViT：切块、投影、编码与分类','图像 → patch tokens → Transformer → 类别',[92],['image365.png']],
    ['patch-embedding','每个 patch 展平并线性投影','N = HW/P²；每块展平为 P²C 维',[93],'patch-embedding'],
    ['vit-position','二维图像也需要位置嵌入','无位置、一维、二维、相对位置',[94,95],['image368.png','image369.png']],
    ['class-token','在序列前加入可学习 class token','输出的 class 状态进入分类头',[96],['image370.png']],
    ['vit-encoder','对 patch 序列重复编码器块','Pre-LN → MSA / MLP → 残差',[97,98],['image371.png','image372.png']],
    ['vit-sizes','深度、隐藏维、MLP 与头数','Base / Large / Huge 的参数配置',[99],['image374.png']],
  ]],
  ['ViT 的实验结果与结构局限','tf-vit-limits','tf-models',[
    ['vit-results','在给定预训练设置下比较表现','JFT-300M、ImageNet-21k 与计算预算',[100,101],['image375.png','image376.png']],
    ['vit-learned-patches','观察学到的 patch 投影模式','线性投影矩阵的前 40 个主成分',[102],['image377.png']],
    ['vit-limitations','固定尺度与全局二次复杂度','密集预测需要多尺度、高分辨率表示',[103],'vit-limitations'],
  ]],
  ['Swin：层级结构与 Patch Merging','tf-swin','tf-models',[
    ['swin-hierarchy','层级特征与局部窗口','面向分类、检测和分割',[104],['image378.png']],
    ['swin-architecture','分阶段堆叠 Swin 块','Patch merging + Swin Transformer block',[105],['image379.png']],
    ['patch-merging','把相邻 2×2 token 合并','H×W×C → H/2×W/2×2C',[106],['image380.jpeg']],
  ]],
  ['窗口、移位与相对位置偏置','tf-swin-windows','tf-models',[
    ['swin-blocks','相邻块交替使用 W-MSA 与 SW-MSA','固定窗口 → 移位窗口',[107],['image381.png','image382.png']],
    ['window-cost','窗口注意力如何降低成本','固定 M×M 窗口：分数项约为 hwM²',[108],'window-cost'],
    ['shifted-window','移位后，原窗口的 token 能相遇','循环移位 → 分组 → 遮罩 → 逆移位',[109,110],'shifted-window'],
    ['relative-bias','把二维相对位置加入分数','softmax(QKᵀ/√d + B)V',[111],'relative-bias'],
    ['swin-specs','Swin-T、S、B、L 的结构配置','各阶段深度、通道、头数与输出尺度',[112],['image393.png']],
    ['swin-classification','分类实验：配置与表现一起读','ImageNet-1k 与 22k 预训练结果',[113],['image394.png','image395.png']],
    ['swin-dense-results','检测和分割展示层级特征的用途','COCO 与 ADE20K 的任务结果',[114],['image396.png','image398.png']],
  ]],
  ['MoE：专家与路由器','tf-moe-intro','tf-moe',[
    ['moe-components','一组专家，加一个路由器','Experts 处理输入；Router 选择路径',[115,116],['image399.png']],
    ['expert-meaning','专家针对 token 与上下文分工','标点、词形、语法和使用环境',[117,118],['image401.jpeg']],
    ['expert-submodel','每层选择一个或多个专家','专家是模型某层的子网络',[119],['image402.jpeg']],
  ]],
  ['稀疏参数为什么有吸引力','tf-moe-benefits','tf-moe',[
    ['moe-flops','相近激活 FLOPs 下扩大容量','实验中，更多参数可改善损失',[120],['image403.jpg']],
    ['moe-training-results','比较训练效率','Switch 与 OLMoE 的损失、速度曲线',[121],['image404.jpg','image405.jpg']],
    ['moe-dense-comparison','性能与激活参数的对照','MoE 与 dense 模型的实验比较',[122],['image406.png']],
  ]],
  ['从 Dense FFN 到专家路径','tf-moe-placement','tf-moe',[
    ['dense-ffn','先回顾 Transformer 的 FFN','注意力形成上下文，FFN 进一步变换',[123,124],['image407.png','image408.jpeg']],
    ['dense-sparse','dense 全部计算，sparse 选择计算','当前 token 只经过部分参数',[125,126],['image409.png','image411.png']],
    ['expert-evidence','专家学到了什么？看路由证据','细粒度分工表与 Mixtral token 着色',[127,128],['image412.png','image413.png']],
    ['expert-ffn','每个专家可是一整个 FFN','逐层路由，不等于多个完整 LLM',[129,130],['image414.png','image415.png']],
    ['expert-paths','不同 token 经过不同专家路径','同一句话、不同位置、不同层',[131],['image416.png']],
    ['expert-placement','在块中用 MoE 替换 FFN','常见：MLP；较少见：注意力头',[132,133],['image418.png']],
  ]],
  ['路由器：选择与加权组合','tf-moe-routing','tf-moe',[
    ['router-role','为当前 token 选择专家','路由概率 → 选中专家 → 加权输出',[134,135,136,137],['image420.png','image421.png']],
    ['dense-sparse-moe','Dense MoE 与 Sparse MoE','计算全部专家，或只计算所选专家',[138],['image422.png']],
    ['router-formula','输入经过路由权重与 Softmax','H(x)=xW；G(x)=softmax(H(x))',[139,140,141],['image423.png','image425.png']],
    ['router-flow','把路由和专家计算连起来','输入 x → 门控 → 专家 → 加权和',[142],['image426.png','image427.png']],
  ]],
  ['路由坍缩、Noisy Top-k 与分配方向','tf-moe-topk','tf-moe',[
    ['router-collapse','反复选择少数专家产生正反馈','热点过载；其他专家训练不足',[143,144],['image428.png']],
    ['noisy-topk','加入噪声，再保留 Top-k 分数','未选项置为 −∞，Softmax 后权重为 0',[145,146,147],'noisy-topk'],
    ['token-choice','Token Choice：每个 token 选专家','Top-1 与 Top-2 的计算与加权组合',[148,149],['image433.png','image434.png']],
    ['routing-directions','三种分配方向','token 选专家；专家选 token；全局匹配',[150],['image435.jpg']],
    ['routing-evidence','比较 Token / Expert Choice','查看损失与任务指标',[151],['image436.jpg']],
  ]],
  ['重要性、CV 与辅助损失','tf-moe-balance','tf-moe',[
    ['importance','汇总一个批次的专家重要性','Importanceᵢ = ∑ₓ Gᵢ(x)',[152],['image437.png']],
    ['importance-cv','用 CV 衡量重要性差异','CV = 标准差 / 均值',[153,154,155],'importance-cv'],
    ['cv-loss','CV² 构成重要性辅助损失','L = Ltask + wimportance · CV(Importance)²',[156],'cv-loss'],
  ]],
  ['专家容量与 token 溢出','tf-moe-capacity','tf-moe',[
    ['token-load','概率重要性之外，还要看实际 token 数','不同 token 可能集中送向同一专家',[157],['image443.png']],
    ['capacity-overflow','专家满员后，token 如何继续？','备选专家也满员时，跳过当前专家分支',[158,159],'capacity-overflow'],
    ['switch-top1','Switch 用 Top-1 路由','每个 token 计算一个专家',[160],['image446.png','image447.png']],
    ['capacity-factor','用容量因子控制缓冲区','6 个 token / 3 个专家 × 1.0 = 容量 2',[161,162,163],'capacity-factor'],
    ['switch-loss','Switch 的辅助损失有两种统计量','实际比例 fᵢ 与平均概率 pᵢ',[164],'switch-loss'],
  ]],
  ['均衡变体与批次效应','tf-moe-balancing-variants','tf-moe',[
    ['device-balance','均衡既可以按专家，也可以按设备','将同一设备上的专家统计量合并',[165],'device-balance'],
    ['expert-bias','用专家偏置调整分配倾向','按负载更新选择偏置',[166],['image457.jpg','image458.jpg']],
    ['balance-ablation','去掉均衡损失会发生什么？','损失曲线与专家负载分布',[167],['image459.jpg']],
    ['batch-effects','批次容量会影响同一 token 的路径','其他 token 占用槽位，可能改变溢出结果',[168],'batch-effects'],
  ]],
  ['路由变体、细粒度与共享专家','tf-moe-variants','tf-moe',[
    ['routing-variants','Top-k、哈希、RL 与匹配路由','不同选择规则形成不同条件计算',[169,170],'routing-variants'],
    ['fine-shared','更多细粒度专家与始终开启的共享专家','可组合路径 + 公共变换',[171],['image465.jpg']],
    ['deepseek-ablation','DeepSeek 消融：细粒度与共享专家','在该配置下，增加两类设计有收益',[172],['image466.png']],
    ['olmoe-ablation','OLMoE：细粒度有益，共享专家未见收益','保留与前一组实验不同的结论',[173],['image467.png','image468.jpg']],
  ]],
  ['视觉 MoE 与批优先路由','tf-vision-moe','tf-moe',[
    ['vision-moe-input','图像 patch 也能作为路由输入','图像 → patch tokens → 编码器',[174,175],['image469.jpeg','image472.png']],
    ['vision-moe-layer','V-MoE 用稀疏专家替换编码器 FFN','注意力保持，前馈层变为条件计算',[176],['image473.png']],
    ['patch-overflow','小容量会丢弃部分 patch 分支','原图只剩局部内容可被专家处理',[177],['image474.jpeg']],
    ['patch-priority','先处理重要 patch，再分配容量','Batch Priority Routing',[178],['image475.jpeg']],
    ['patch-retention','从全部 patch 到只保留 10%','比较保留 80%、50%、10% 时的位置',[179],['image476.jpeg']],
  ]],
  ['总参数、激活参数与计算账本','tf-moe-systems','tf-moe',[
    ['sparse-active','加载全部专家，每个 token 使用部分专家','总参数影响存储，激活参数影响计算',[180],['image477.png']],
    ['mixtral-parameters','Mixtral 8×7B 的真实参数账本','每专家约 5.6B；总量约 46.7B；激活约 12.8B',[181,182],['image478.png','image479.png']],
    ['moe-summary','稀疏性、路由和系统成本共同决定效果','容量、质量、激活计算、存储与通信',[183],'moe-summary'],
  ]],
];
export const sections=groups.map(([title,id,topic],i)=>({title,id,topic,index:i+1}));
export const slides=groups.flatMap(([,section,topic,items])=>items.map(([id,title,caption,sourcePages,visual,note])=>({id,section,topic,title,caption,sourcePages,visual,note:note||caption+'。'}))).map((item,i)=>({...item,page:i+1}));
const teachingNotes={
  'course-route':'先拆开注意力，再沿原章节组装两侧网络；随后转入语言、视觉和稀疏专家层。',
  'attention-relevance':'固定 b₁，问哪些 aᵢ 与当前位置相关；打分用于确定信息汇总的权重。',
  'attention-vector':'Q、K 决定匹配分数，Softmax 形成权重；V 提供被加权的内容。图中标量值是补充算例。',
  'attention-next-query':'换查询便需要重新打分；K、V 可以复用，b₂ 由自己的关注分布决定。',
  'attention-parallel':'全部输入已经可用，各查询独立计算，因此所有输出位置能并行更新。',
  'animal-it':'观察 it 指向 animal 的连线，把抽象的注意力权重对应到代词与指代对象。',
  'multi-head-branches':'每个头在不同投影子空间独立计算；两组输出随后共同参与当前位置的表示。',
  'multi-head-merge':'先拼接各头，再投影回 D 维；头数增加不代表每头必须对应预先命名的语言关系。',
  'multi-head-it':'同一个 it 同时纳入 animal 与 tired 的信息，原图比较两头与七头的连线。',
  'position':'每列是一个位置向量；将 eᵢ 加入 aᵢ，位置方案可以手工设计或从数据学习。',
  'cnn-receptive-field':'卷积以固定局部连接与共享核聚合；自注意力权重依赖输入内容。感受野是比较直觉。',
  'rnn-comparison':'RNN 沿时间串行传递，注意力直接访问远处位置；自回归生成依然依赖已有输出。',
  'encoder-role':'编码器输出与输入位置一一对应，各 hᵢ 结合源序列上下文，为后续任务提供表示。',
  'encoder-stack':'自注意力连接各位置，FFN 对每个位置应用同一变换；不同块通常具有各自参数。',
  'encoder-residual':'两个子层分别有残差和归一化；LayerNorm 对当前向量的特征统计，并有可学习缩放与偏移。',
  'ln-order':'沿主残差路径观察：Pre-LN 先处理模块输入，Post-LN 在相加之后归一化。',
  'norm-axes':'图示使用 N、C、H、W；语言模型通常对单个 token 的 D 维特征做 LayerNorm。',
  'decoder-first':'分布覆盖整个词表，已列出的 0.8 与 0.1 之外仍有其他候选；这里使用最大概率选择。',
  'autoregressive-feedback':'每个输出进入下一轮前缀；若生成“渡”，模型随后也会读取“渡”。',
  'decoder-stop':'EOS 是一次词表预测；生成它后停止，PAD 则用于批次补齐。',
  'causal-mask':'输入先右移，第 i 个输入位置预测下一词。遮挡未来分数使其 Softmax 权重严格为零。',
  'nar-multimodality':'一个输入的多个合理输出模式，可能被独立位置预测混合；任务决定速度与质量的取舍。',
  'cross-process':'源侧 K、V 保持可读；从 START 预测“机”后，目标侧新查询再次选择相关源信息。',
  'cross-layers':'先定位标准交叉注意力，再观察不同层之间的连接，读取来源随连接方案变化。',
  'teacher-forcing':'标签与输入错开一位：BOS 预测深，深预测度，直到习预测 EOS；所有损失可并行计算。',
  'metric-optimization':'完整输出的评价是序列级目标；离散 token 选择使直接反向传播困难，可考虑奖励式优化。',
  'exposure-bias':'训练读“深度”，推理可能读“深渡”，不同前缀分布会改变后续预测。',
  'scheduled-sampling':'三类相关方案尝试在训练中使用模型前缀，需分别理解其输入选择与并行计算路径。',
  'model-families':'理解三类架构的任务角色与注意力可见范围，再对应 BERT、T5、GPT。',
  'decoder-choice':'缓存历史 K、V 减少重复投影；当前查询仍读取可见历史，缓存也占用显存。',
  'patch-embedding':'224×224、16×16 patch 得到 196 个 token；RGB 每块展平为 768 维，再投影到 D 维。',
  'vit-position':'原始 ViT 用可学习的一维位置嵌入；原图展示位置方案与学到的二维邻近结构。',
  'class-token':'可学习 class token 加在最前，长度成为 N+1；最终读它的状态进入分类头。',
  'vit-learned-patches':'这 40 个小块是学到的线性嵌入滤波器主成分，展示局部纹理与颜色模式。',
  'patch-merging':'相邻 2×2 token 拼接到 4C，归一化与投影后为 2C，空间尺寸各减半。',
  'shifted-window':'数字是区域编号，每格才是一个 token；同区域可互读。查询区域 8 时，绕回的 6、2、0 必须遮挡。',
  'relative-bias':'每对 query/key 根据相对行列位移查表，将位置偏置加到兼容度分数。',
  'expert-meaning':'分工常发生在 token 与上下文层面；每个专家依然只是模型某层的前馈子网络。',
  'expert-placement':'常见做法将 FFN 替换成 MoE，注意力子层保留；先明确模块，再统计专家数量。',
  'router-formula':'路由概率决定路径和输出加权；选中集合内是否重新归一化，需要按具体方案区分。',
  'noisy-topk':'固定一次示例噪声以便核算；实际噪声用于探索，未选 logits 设为负无穷。',
  'importance-cv':'保留两组原始向量，统一按总体标准差重算：CV 约 1.005 与 0.188。',
  'capacity-overflow':'每个专家容量为 3。先尝试备选专家；两个候选都满员时，走残差而跳过当前专家分支。',
  'switch-loss':'fᵢ 是实际分配比例，pᵢ 是平均路由概率；不同统计量共同构成求和后的辅助损失。',
  'expert-bias':'选择偏置按负载在线调整；原 DeepSeek-V3 方案仍保留序列级辅助项。',
  'olmoe-ablation':'这一组实验没有显示共享专家收益，与前一组结果不同；设计效果需要按实验配置解释。',
  'patch-retention':'观察保留位置是否覆盖关键对象；减少的是专家分支处理量，不能等同于全部编码器计算。',
  'mixtral-parameters':'账本区分共享参数、8 个专家的总量与 Top-2 激活量；实际延迟还依赖通信和硬件。',
};
for(const slide of slides)if(teachingNotes[slide.id])slide.note=teachingNotes[slide.id];
for(const [topic,meta] of Object.entries(topics))meta.start=slides.findIndex(item=>item.topic===topic)+1;
export const visuals=Object.fromEntries(sections.map(section=>[section.id,slides.filter(slide=>slide.section===section.id).map(slide=>slide.id)]));
export const attentionExample={scores:[2,1,0,-1],values:[2,-1,1,0]};
export const expertExample={logits:[2.4,1.6,0.2,-0.4],noise:[0.1,-0.2,0.3,0]};
export const importanceExamples=[[0.8,0.2,0.1,0.05,0.2],[0.3,0.3,0.2,0.2,0.3]];
export const shiftedWindowExample={grid:[[0,1,1,2],[3,4,4,5],[3,4,4,5],[6,7,7,8]],windowSize:2};
export const videos={'patch-embedding':{file:'media1.mp4',poster:'image367.png',sourcePage:93,sourceCrop:{top:67407,right:1724},crop:{top:52000,right:1724},caption:'图像切块 → 顺序展开 → 共享线性投影；每块对应一个 token。'}};
export const sequences={
  'attention-vector':{kind:'frames',steps:['q₁ 对四个 kᵢ 打分：2、1、0、−1','Softmax：[0.644、0.237、0.087、0.032]','V 提供要汇总的内容：[2、−1、1、0]','逐项加权：[1.288、−0.237、0.087、0]','求和：b₁ ≈ 1.138']},
  'attention-matrix':{kind:'frames',steps:['将全部输入投影为 Q、K、V','第一行：q₁ 对所有 key 打分','所有查询并行形成 N×N 分数矩阵','逐行 Softmax，再乘 V，得到 N 个输出']},
  'autoregressive-feedback':{kind:'frames',steps:['BOS → 深','前缀 BOS 深 → 度','前缀 BOS 深 度 → 学','前缀 BOS 深 度 学 → 习']},
  'causal-mask':{kind:'frames',steps:['查询第 1 个位置：只读位置 1','查询第 2 个位置：只读位置 1、2','查询第 3 个位置：只读位置 1、2、3','查询第 4 个位置：可读全部已有位置']},
  'cross-process':{kind:'frames',steps:['目标 START 形成 q，读取源侧 K、V','加权源信息，预测“机”','加入“机”后，新的 q 重新读取源侧']},
  'beam-example':{kind:'images',files:['image325.png','image328.png','image331.png','image333.png','image335.png','image337.png','image338.png','image342.png','image343.png','image345.png','image346.png','image348.png','image349.png'],steps:['从 START 计算下一词分布','保留 he (−0.7) 与 I (−0.9)','分别扩展两个前缀','保留 I was (−1.6) 与 he hit (−1.7)','扩展第三个词','保留 he hit me (−2.5) 与 he hit a (−2.8)','扩展第四个词','保留 he hit me with (−3.3) 与 he hit a pie (−3.4)','扩展第五个词','保留 … with a (−3.7) 与 … with one (−4.3)','扩展第六个词','最高分示例路径为 −4.3','回溯：he hit me with a pie']},
  'shifted-window':{kind:'frames',steps:['4×4 个 token；0 至 8 是区域编号，同一区域可能有多个 token','循环左上移一格；四个窗口分别含 4、4、4、4 / 5、3、5、3 / 7、7、1、1 / 8、6、2、0','查询区域 8：同窗口的 6、2、0 来自绕回区域，必须屏蔽']},
  'noisy-topk':{kind:'frames',steps:['加固定示例噪声：[2.5、1.4、0.5、−0.4]','KeepTop2：[2.5、1.4、−∞、−∞]','Softmax：[0.750、0.250、0、0]，计算 E1、E2']},
  'capacity-overflow':{kind:'frames',steps:['What → E1，容量 1/3','is → E1，容量 2/3','Mixture → E1，容量 3/3','of：E1 已满，改投 E4','Experts → E4；? → E4，容量 3/3','Summarize：两个候选均已满，走残差到下一层']},
};
