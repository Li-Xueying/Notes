export const assetVersion = '20261009-2';
export const topics = {
  'rnn-words': { label: '词表示', target: 'rnn-sequence-data' },
  'rnn-recurrence': { label: 'RNN 与 LSTM', target: 'rnn-fixed-window' },
  'rnn-seq2seq': { label: 'Seq2Seq 与注意力', target: 'rnn-translation' },
};
const range = (a,b) => Array.from({length:b-a+1},(_,i)=>a+i);
// Groups follow the source sequence; progressive examples retain their intermediate states.
const groups = [
  ['序列数据为什么需要新的表示','rnn-sequence-data','rnn-words',[
    ['opening','RNNs and LSTMs','词表示、循环网络、门控记忆与序列生成','从输入表示开始，逐步建立能够利用历史信息的序列模型。',[1],'route'],
    ['route','本讲路线','Word Representation → RNN → LSTM → Sequence to Sequence','词向量表示输入；RNN 传递历史；LSTM 管理记忆；Seq2Seq 生成另一段序列。',[2],'route'],
    ['motivation','从识别一张图到理解一段序列','one minus two plus three：顺序决定运算过程','前馈网络可以给图片分类；读取算式时，需要依次更新中间结果，最终得到 2。',[3,4],'motivation'],
  ]],
  ['从独热向量到词嵌入','rnn-embeddings','rnn-words',[
    ['word-vector','把词表示成向量','把离散符号转成可计算的输入','表示是否包含语义关系，取决于构造方法和训练目标。',[5],['image10.png','image11.png']],
    ['cosine','怎样比较两个词向量','余弦相似度比较方向','内积除以两个向量的长度：同向为 1，正交为 0，反向为 −1。',[6],'cosine'],
    ['semantic-question','词典索引能表示语义相近吗','hotel、motel 与 conference','希望 hotel 和 motel 的相关用法能体现为表示中的关系。',[7],'semantic'],
    ['one-hot','独热向量：一个词占一个位置','索引不同，向量内积仍为 0','词表可以超过 50 万项。独热表示既高维稀疏，也没有把语义关系编码进距离。',[8],'one-hot'],
    ['dense','词嵌入：低维稠密表示','通过可学习坐标建立词空间','二维投影用于观察，不代表真实表示只有两维；邻近关系来自训练。',[9],['image14.png']],
    ['lookup','从嵌入表取出一个词','独热选择与查表是同一计算','保留三维示例中的数值；示意坐标本身不保证 hotel 与 motel 接近。',[10],'lookup'],
    ['features','分布式表示共同刻画多种特征','多个坐标共同表示一个词','手工语义维度用于建立直觉；实际训练的坐标通常没有直接可命名的语义。词向量也可成为序列网络的输入。',[11],['image15.png','image16.png']],
  ]],
  ['分布式语义：意义来自上下文','rnn-distributional','rnn-words',[
    ['learn-vectors','这些词向量从哪里来','文本中的使用关系提供训练信号','提出如何学习表示，再观察 banking 的邻近词。',[12],['image17.png']],
    ['contexts','观察 banking 的上下文','debt、crises、regulation、system 提供线索','不同句子中的邻近词共同约束 banking 的表示。',[13],'contexts'],
  ]],
  ['Word2Vec 的两种预测任务','rnn-word2vec-tasks','rnn-words',[
    ['word2vec','CBOW 与 Skip-gram','上下文预测中心；中心预测上下文','同一局部窗口形成两个方向相反的任务，后续重点展开 Skip-gram。',[14],['image18.png']],
    ['training-loop','Word2Vec 怎样训练','扫描文本 → 预测邻词 → 调整词向量','随机初始化后从大量窗口产生训练词对，提高真实邻词的预测概率。',[15],'training-loop'],
    ['skipgram-window','窗口怎样产生训练词对','中心词从 into 移到 banking','半径 2 的完整窗口产生四个词对；中心移动，预测目标随之改变。',[16,17],'skipgram-window'],
  ]],
  ['Skip-gram 的概率目标','rnn-skipgram-objective','rnn-words',[
    ['likelihood','让真实上下文的概率变大','对位置和窗口偏移求乘积','在模型的条件独立假设下，把各真实上下文的条件概率相乘。',[18,19],'likelihood'],
    ['nll','把似然转为可优化的损失','取对数，再取负号','对数把乘积变成和；负号把最大化似然转为最小化平均负对数似然。',[20],'nll'],
    ['two-vectors','同一个词为什么有两套向量','中心角色 v；上下文角色 u','中心取 v_c，上下文候选取 u_w，用点积表示角色之间的兼容度。',[21,22,23],'two-vectors'],
    ['softmax','把点积分数变成条件概率','完整词表上的 Softmax','真实邻词在分子中；分母包含词表里所有可能的上下文词。',[24],'softmax'],
    ['sgd','优化哪些参数','θ 包含全部中心向量与上下文向量','两套各有 |V| 个 d 维向量，共 2d|V| 个参数；SGD 沿当前梯度的反方向更新。',[25],'sgd'],
  ]],
  ['负采样与稀疏更新','rnn-negative-sampling','rnn-words',[
    ['softmax-cost','完整 Softmax 的代价','每个词对都需要遍历整个词表','分母计算和输出向量更新昂贵，需要缩小一次更新的范围。',[26],'softmax-cost'],
    ['negative-task','改成真假词对判断','真实邻接为正样本；抽取噪声词对为负样本','负采样改变训练目标，不再每次归一化整个词表。',[27,28],'negative-task'],
    ['sigmoid','Sigmoid 给出二分类概率','点积越大，越倾向真实词对','正样本希望点积增大，负样本希望点积减小；输出介于 0 与 1 之间。',[29,30],'sigmoid'],
    ['negative-objective','负采样的损失','一个正样本与 k 个负样本','负项使用 σ(−u_nᵀv_c)，负号决定了压低噪声词对点积的优化方向。',[31,32],'negative-objective'],
    ['sampling','词频的 3/4 次幂抽样','高频仍更常见，低频获得相对更多机会','0.9 的 3/4 次幂约为 0.924，0.01 的约为 0.0316；再在整个词表上归一化。',[33],'sampling'],
    ['sparse-update','一个窗口只更新少量向量','最多 2m + 1 + 2km 个向量','一个中心、2m 个真实上下文、每对 k 个负样本；重复词会减少实际触达数量。',[34],'sparse-update'],
  ]],
  ['静态词向量的一词多义','rnn-polysemy','rnn-words',[
    ['polysemy','一个 pike，多个含义','不同语境共用一个固定向量','鱼、尖状武器、道路、跳水姿势等用法共用一个词表项，难以单独区分当前含义。',[35,36],'polysemy'],
    ['sense-clusters','聚类上下文，分别表示不同词义','bank1、bank2：不同窗口簇作为不同词项训练','把同一个词的上下文窗口聚类，再按簇分别训练向量；词义区分依赖簇划分。之后转向随当前序列变化的状态。',[37],['image55.png']],
  ]],
  ['从固定窗口到循环状态','rnn-fixed-window','rnn-recurrence',[
    ['lm-intro','语言模型要预测什么','根据前缀预测下一个词','给候选下一词一个概率，也通过链式法则给整段文本一个概率。',[38,39],'language-model'],
    ['autocomplete','下一词预测的应用','搜索补全与输入提示','前缀改变，候选下一词分布随之改变。',[40],['image58.png','image59.png']],
    ['fixed-window','固定窗口前馈语言模型','the students opened their → 下一词分布','拼接词嵌入送入前馈网络；更早信息不可见，扩大窗口会增加输入和参数。',[41],['image61.png']],
  ]],
  ['RNN 的递推计算','rnn-recurrence-cell','rnn-recurrence',[
    ['recurrence','用同一个网络反复更新状态','h_t 由 h_(t−1) 和 x_t 决定','展开图中的各单元复用相同参数；历史通过状态传递，参数量不随长度增长。',[42],['image66.png']],
    ['rnn-forward','词嵌入 → 隐藏状态 → 下一词分布','逐步读入 the students opened their exams','嵌入提供当前输入，状态汇总已读前缀，输出层预测下一词。',[43],'rnn-forward'],
    ['rnn-tradeoffs','RNN 的优势与限制','变长与共享；串行与长期遗忘','能够利用任意长度前缀，不等于可靠保存所有历史信息；时间步之间还有计算依赖。',[44],'rnn-tradeoffs'],
  ]],
  ['语言模型训练与 BPTT','rnn-bptt','rnn-recurrence',[
    ['lm-loss','训练时每一步都有真实下一词','汇总各位置的交叉熵','用文本中的下一词监督当前输出，把时间步损失求平均后训练共享参数。',[45,46],['image76.png']],
    ['bptt','沿时间展开图反向传播','各次参数使用的梯度贡献相加','共享参数接收各位置的贡献。实际训练可截断反传，例如约 20 步，以控制计算成本。',[47,48],['image77.png','image79.png']],
  ]],
  ['梯度消失、爆炸与裁剪','rnn-gradients','rnn-recurrence',[
    ['vanishing','梯度为什么越传越小','多个连续变换可能反复缩小梯度','远处监督难以改变早期计算，长期依赖因此难以学习。',[49],['image82.png']],
    ['exploding','过大梯度造成过大更新','θ_new = θ_old − ηg','更新可能跨到高损失区域，严重时出现 Inf 或 NaN。',[50],['image83.png']],
    ['clipping','梯度裁剪：同方向，小步长','超过阈值时按比例缩小范数','保持向量方向，限制更新幅度，用于控制爆炸梯度。',[51],'clipping'],
    ['memory-problem','怎样在多步之后仍保留信息','普通状态不断被整体改写','引入能够受控保留和写入的独立记忆通路，由此进入 LSTM。',[52],'memory-problem'],
  ]],
  ['LSTM 的状态与门','rnn-lstm-gates','rnn-recurrence',[
    ['rnn-lstm','从普通循环单元到 LSTM','时间结构相同，内部更新更丰富','增加细胞状态和门控操作，同时保留沿时间递推的结构。',[53,54],['image86.png','image85.png']],
    ['lstm-state','细胞状态 c 与隐藏状态 h','记忆通路与当前输出分开','两者都是等长向量；c 保存信息，h 对外输出并参与下一步门的计算。',[55],['image88.png']],
    ['lstm-gates','门决定擦除、写入和读出多少','各分量随当前上下文动态计算','门是向量，输出在 0 与 1 之间；不同维度可以采取不同保留比例。',[56],'lstm-gates'],
    ['lstm-equations','沿细胞通路读完整更新','线性相加与输入拼接两种写法等价','先生成门和候选，再进行逐元素乘法、细胞加法及隐藏状态输出。',[57,58],'lstm-cell'],
    ['lstm-memory','保留项和写入项怎样改变记忆','依次执行四个计算步骤','补充数值例子固定门值，隔离计算关系；实际门值由网络学习。',[59],'lstm-memory'],
  ]],
  ['LSTM 的四步更新','rnn-lstm-steps','rnn-recurrence',[
    ['forget','第一步：保留旧信息','f_t ⊙ c_(t−1)','遗忘门逐元素缩放旧细胞状态。',[60],['image99.png']],
    ['input','第二步：准备新内容','输入门 i_t 与候选 c̃_t','Sigmoid 决定写入量，tanh 生成正负候选；候选尚未成为最终细胞状态。',[61],['image101.png']],
    ['cell-update','第三步：合并保留项与写入项','c_t = f_t ⊙ c_(t−1) + i_t ⊙ c̃_t','两项经过逐元素乘法，在加法节点汇合。',[62],['image104.png']],
    ['output','第四步：从新记忆产生输出','h_t = o_t ⊙ tanh(c_t)','tanh 对数值作有界变换；幅度本身不等于语义重要性，输出门控制暴露多少。',[63],['image107.png']],
  ]],
  ['GRU：更紧凑的门控单元','rnn-gru','rnn-recurrence',[
    ['gru','GRU 合并两种状态','更新门与重置门控制一个状态','更新门控制旧状态和候选的混合，重置门控制候选使用多少旧信息。',[64],['image108.jpeg']],
    ['gru-update','GRU 的四项计算','门 → 候选 → 新状态','采用 h_t = (1−z_t)⊙h_(t−1) + z_t⊙h̃_t 的约定，z 越大写入候选越多。',[65,66],'gru-update'],
  ]],
  ['机器翻译、对齐与搜索','rnn-translation','rnn-seq2seq',[
    ['translation-task','机器翻译：源句到目标句','语言与长度都可以不同','保留源句意思，同时生成符合目标语言的表达；先看神经模型之前怎样做。',[67,68],'translation-task'],
    ['rule-mt','早期翻译依赖规则和词典','从逐词对应开始','早期俄译英使用双语词典与人工规则，难以覆盖歧义、词序和复杂对应。',[69],['image111.png']],
    ['smt','统计翻译分别建模忠实与流畅','P(x|y) × P(y)','翻译模型学源目标对应，语言模型评价目标句自然程度，解码器搜索共同高分结果。',[70],'smt'],
    ['parallel-data','从平行语料学习翻译','同一内容的两种语言版本','语料给出句子对应，通常不直接标出词级对应。',[71],['image116.png']],
    ['alignment','对齐：句子内部的词怎样对应','未知对应关系作为潜变量 a','引入 P(x,a|y)；有的词没有另一侧的直接对应。',[72,73],['image118.png','image120.png']],
    ['many-one','对齐可以多对一','多个源词共同表达一个目标词','语言表达习惯不同，不能要求两侧始终一词对一词。',[74],['image121.png']],
    ['one-many','对齐也可以一对多','一个源词生成多个目标词','implemented 的跨语言表达引出 fertility：一个词对应多少词。',[75],['image122.png']],
    ['fertility','entarté：一个词表达整个动作','he hit me with a pie','这个例子将延续到 Seq2Seq 与束搜索；逐词替换无法覆盖它。',[76],['image124.png','image123.png']],
    ['phrase-alignment','短语级对齐可以多对多','整个短语共同表达意义','poor、don’t、have、any、money 与另一侧的短语共同对应。',[77],['image125.png']],
    ['learn-alignments','没有对齐标签，怎样学习','同时估计对齐与模型参数','模型结合位置、翻译和 fertility 等因素，用 EM 等方法学习潜变量模型。',[78],'learn-alignments'],
    ['smt-decoding','学出概率之后，还要搜索译文','独立性假设使动态规划可用','满足模型假设时，Viterbi 复用子问题；不把结论推广到任意翻译系统。',[79,80],['image126.png']],
    ['smt-complexity','统计翻译的工程负担','多个子系统、特征和外部资源','各模块需要分别设计维护，端到端神经翻译由此成为下一步。',[81],'smt-complexity'],
  ]],
  ['编码器—解码器与条件语言模型','rnn-encoder-decoder','rnn-seq2seq',[
    ['seq2seq','用两个循环网络完成翻译','编码源句，按条件生成目标句','编码器形成源表示，解码器结合目标前缀逐词生成 he hit me with a pie。',[82,83],['image127.png']],
    ['seq2seq-tasks','Seq2Seq 不限于翻译','摘要、对话、解析与代码生成','都可以写成输入一个序列、输出另一个序列，长度不必相同。',[84],'seq2seq-tasks'],
    ['conditional-lm','解码器是条件语言模型','P(y|x) = ∏ P(y_t|y_<t,x)','目标前缀与源句共同决定下一词概率。',[85],'conditional-lm'],
    ['seq2seq-training','平行语料上的端到端训练','真实前缀 → 下一词交叉熵','沿编码器与解码器整条路径反向传播；推理前缀由模型自身产生。',[86],['image128.png']],
  ]],
  ['从贪心到束搜索','rnn-beam-search','rnn-seq2seq',[
    ['greedy','每一步选当前最可能的词','贪心沿单条路径前进','当前输出作为下一步输入，局部选择固定后续前缀。',[87],['image129.png']],
    ['greedy-failure','选了 he hit a，无法改回 me','早期选择限制完整译文','目标例句需要 he hit me with a pie；贪心选 a 后不能回到分叉处。',[88],'greedy-failure'],
    ['exhaustive','穷举所有完整序列太昂贵','固定长度有 |V|^T 种候选','完整序列最大概率，不保证每一步都是局部最高概率。',[89],'exhaustive'],
    ['beam-rule','束搜索保留 k 个高分前缀','扩展 → 累加分数 → 全局取前 k 个','累计对数分数通常为负，越大越好；更高效，但仍不保证全局最优。',[90,91],'beam-rule'],
    ['beam-example','束宽 2：展开、剪枝和回溯','从 he / I 到 he hit me with a pie','沿原候选树比较所有扩展结果，最终回溯分数为 −4.3 的示例路径。',range(92,104),['image155.png']],
    ['beam-stop','假设在不同时间产生结束符','完成列表与活动束分开维护','<END> 后进入完成列表，其他假设继续；长度与完成数量可作为停止上限。',[105],'beam-stop'],
    ['length-normalization','累计分数偏向短序列','用平均对数概率校正长度','更多小于 1 的条件概率相乘会降低分数，示例用分数除以长度比较完成假设。',[106],'length-normalization'],
  ]],
  ['翻译评价与系统边界','rnn-evaluation','rnn-seq2seq',[
    ['nmt-advantages','神经翻译一起优化整个系统','流畅、上下文利用与工程简化','统一优化译文概率，减少分立模块与人工特征。',[107],'nmt-advantages'],
    ['nmt-limitations','统一模型也有新的限制','解释、调试与显式控制较难','复杂翻译规则和安全约束仍需额外考虑。',[108],'nmt-limitations'],
    ['bleu','BLEU 怎样评价翻译','n-gram 匹配与短句惩罚','通常综合 1 至 4 元精确率；同义表达可能匹配低，指标不等于完整语义质量。',[109],'bleu'],
    ['mt-progress','统计翻译到神经翻译的进展','2013—2016 的实验和技术转变','历史图表展示性能变化，接着介绍 2014 年 Seq2Seq 与 2016 年转向 NMT 的节点。',[110,111],['image157.png']],
    ['mt-challenges','性能提高之后仍有难点','未知词、领域、长上下文与低资源','评估需关注数据和语言环境。',[112],'mt-challenges'],
    ['idioms','习语和常识不能靠字面对应','pelo en la lengua 的翻译错误','真实错误展示：译文可能流畅，却没有表达习语的意思。',[113],['image158.png']],
    ['bias','语料偏差也会进入译文','原文未指定性别，译文却补上性别','护士和程序员例子显示模型可能补入原文没有的信息。',[114],['image160.png']],
    ['strange-output','异常输入产生难解释的输出','重复字符被翻译成完整句子','重复字符却产生看似完整的译文，说明需要检查异常输入与失败模式。',[115],['image161.png']],
    ['attention-transition','继续改进：直接查看源句','从翻译的进展转入 Attention','回到网络结构，寻找普通编码器—解码器的传递瓶颈。',[116],'attention-transition'],
  ]],
  ['固定向量瓶颈与注意力','rnn-attention-bottleneck','rnn-seq2seq',[
    ['bottleneck','整段源句压到最后一个状态','固定表示承载全部源信息','句子越长，最终状态承担越多信息；注意力让解码器访问全部编码状态。',[117,118],'bottleneck'],
    ['attention-idea','每个解码步直接连接源状态','每轮选择相关源位置','先建立图解直觉：保留各编码状态，当前解码状态决定关注分布。',[119],'attention-idea'],
    ['attention-process','图解注意力：从打分到下一词','打分 → 归一化 → 汇总 → 预测；下一步重新计算','生成 he、hit、me 等词时，重新计算兼容度、分布和加权输出。',range(120,131),['image178.png']],
  ]],
  ['注意力的公式与打分变体','rnn-attention-formulas','rnn-seq2seq',[
    ['attention-scores','把图解写成打分与归一化','e_(t,i) = s_tᵀh_i；α_t = softmax(e_t)','每步得到 N 个源位置权重，非负且求和为 1。',[132],'attention-scores'],
    ['attention-context','加权汇总后一起预测','a_t = ∑ α_(t,i)h_i；[a_t;s_t]','上下文保持源状态维度，再拼接当前解码状态供输出层预测。',[133],'attention-context'],
    ['attention-benefits','直接访问源状态带来什么','绕过瓶颈，缩短梯度路径','改善信息访问，让远处位置更直接地接收监督；不保证解决所有长期依赖。',[134],'attention-benefits'],
    ['soft-alignment','关注分布提供软对齐','没有显式对齐标签，仍能观察对应关系','entarté 对多个目标词得到高关注；权重能辅助观察，但不等于完整因果解释。',[135],['image124.png','image179.png']],
    ['attention-variants','三种兼容度打分函数','点积、双线性与加性注意力','改变打分方式，后续 Softmax 和加权汇总步骤相同。',[136],'attention-variants'],
  ]],
];
export const sections = groups.map(([title,id,topic],i)=>({title,id,topic,index:i+1}));
export const slides = groups.flatMap(([,section,topic,items])=>items.map(([id,title,caption,note,sourcePages,visual])=>({id,section,topic,title,caption,note,sourcePages,visual}))).map((item,i)=>({...item,page:i+1}));
for (const [topic,meta] of Object.entries(topics)) meta.start = slides.findIndex(item=>item.topic===topic)+1;
export const visuals = Object.fromEntries(sections.map(section=>[section.id,slides.filter(slide=>slide.section===section.id).map(slide=>slide.id)]));
export const embeddingVectors = {motel:[0.234,-0.567,0.891],hotel:[-0.123,0.456,-0.789],conference:[0.678,-0.234,0.345]};
export const sequences = {
  'skipgram-window': {kind:'window',steps:['into → problems, turning, banking, crises','banking → turning, into, crises, as']},
  'rnn-forward': {kind:'forward',steps:['the','students','opened','their','exams']},
  'lstm-memory': {kind:'memory',steps:['旧细胞 c = [0.8, −0.4]','保留项 = [0.6, −0.1]','写入项 = [0.1, 0.24]','新细胞 c = [0.7, 0.14]','隐藏状态 h ≈ [0.302, 0.111]']},
  'beam-example': {kind:'images',files:['image136.png','image137.png','image140.png','image142.png','image143.png','image145.png','image147.png','image149.png','image151.png','image152.png','image153.png','image154.png','image155.png'],steps:['从 <START> 开始','保留 he (−0.7) 与 I (−0.9)','扩展为 he hit、he struck、I was、I got','保留 I was (−1.6) 与 he hit (−1.7)','继续扩展第三个词','保留 he hit me (−2.5) 与 he hit a (−2.8)','分别扩展两个前缀','保留 he hit me with (−3.3) 与 he hit a pie (−3.4)','继续扩展第五个词','保留 he hit me with a (−3.7) 与 … one (−4.3)','继续扩展第六个词','最高分完整示例路径为 −4.3','回溯：he hit me with a pie']},
  'attention-process': {kind:'images',files:['image166.png',...range(168,178).map(n=>`image${n}.png`)],steps:['当前状态与第一个源状态打分','计算第二个源位置分数','计算第三个源位置分数','计算第四个源位置分数','Softmax 得到关注分布','对源状态加权求和','拼接解码状态，生成 he','更新状态并重新关注，生成 hit','重新计算关注，生成 me','生成 with','生成 a','生成 pie']},
};
