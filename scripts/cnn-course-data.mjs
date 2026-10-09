export const assetVersion = '20261009-kernel-3';
export const sections = [
  ['图像分类为什么需要卷积结构', 'cnn-classification', 'cnn-foundations'],
  ['卷积核如何生成特征图', 'cnn-convolution', 'cnn-foundations'],
  ['平移等变、填充与步幅', 'cnn-spatial', 'cnn-foundations'],
  ['多通道卷积与深度可分离卷积', 'cnn-channels', 'cnn-foundations'],
  ['三类卷积变体', 'cnn-variants', 'cnn-foundations'],
  ['池化、局部稳定性与数据增强', 'cnn-pooling', 'cnn-foundations'],
  ['归一化沿哪些维度统计', 'cnn-normalization', 'cnn-foundations'],
  ['从卷积块到分类结果', 'cnn-pipeline', 'cnn-foundations'],
  ['共享卷积核的梯度', 'cnn-kernel-gradient', 'cnn-training'],
  ['把梯度传回输入', 'cnn-input-gradient', 'cnn-training'],
  ['步幅为 2 的输入梯度', 'cnn-stride-gradient', 'cnn-training'],
  ['步幅为 2 的核梯度', 'cnn-stride-kernel', 'cnn-training'],
  ['池化层的反向传播', 'cnn-pool-gradient', 'cnn-training'],
  ['小数据集与迁移学习', 'cnn-transfer', 'cnn-training'],
  ['架构演进的比较维度', 'cnn-architecture-map', 'cnn-architectures'],
  ['LeNet：基本骨架', 'cnn-lenet', 'cnn-architectures'],
  ['AlexNet：大规模图像分类', 'cnn-alexnet', 'cnn-architectures'],
  ['VGG：重复小卷积核', 'cnn-vgg', 'cnn-architectures'],
  ['GoogLeNet：多尺度分支与辅助分类器', 'cnn-googlenet', 'cnn-architectures'],
  ['ResNet：残差学习', 'cnn-resnet', 'cnn-architectures'],
  ['网络比较与 Inception-ResNet', 'cnn-comparison', 'cnn-architectures'],
  ['DenseNet 与 SENet', 'cnn-densenet-senet', 'cnn-architectures'],
];
const range = (a, b = a) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const diagram = (key) => ({ diagram: key });
const originals = (...assets) => ({ assets });
const slide = (id, section, pages, title, caption, note, visual, motion) => ({ id, section, sourcePages: pages, title, caption, note, visual, ...(motion ? { motion } : {}) });

const subscript = value => String(value).replace(/\d/g, digit => '₀₁₂₃₄₅₆₇₈₉'[Number(digit)]);
const factor = value => value < 0 ? `(${value})` : String(value);
const windowAnimation = config => {
  const [height, width] = config.window;
  const rows = Math.floor((config.input.length - height) / config.stride) + 1;
  const cols = Math.floor((config.input[0].length - width) / config.stride) + 1;
  const steps = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const values = Array.from({ length: height }, (_, m) => Array.from({ length: width }, (_, n) => config.input[r * config.stride + m][c * config.stride + n])).flat();
    let results, calculation;
    if (config.kernel) {
      const weights = config.kernel.flat();
      const sum = values.reduce((total, value, i) => total + value * weights[i], 0);
      results = { convolution: sum };
      const index = rows === 1 ? subscript(c) : subscript(`${r}${c}`);
      calculation = `y${index} = ${values.map((value, i) => `${factor(value)}×${factor(weights[i])}`).join(' + ')} = ${sum}`;
    } else {
      const max = Math.max(...values);
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      results = { max, mean };
      calculation = `max(${values.join(',')}) = ${max}；(${values.map(factor).join('+')}) / ${values.length} = ${mean}`;
    }
    steps.push({ row: r, col: c, results, calculation });
  }
  return { ...config, rows, cols, steps };
};

export const windowAnimations = {
  'conv-1d': windowAnimation({
    input: [[1, 1, 2, -1, 1, -3, 1]], kernel: [[1, 0, -1]], window: [1, 3], stride: 1,
    inputGrid: { x: 80, y: 122, cell: 58, label: '输入 x' },
    kernelGrid: { x: 80, y: 230, cell: 58, label: '共享滤波器 w' },
    outputGrids: [{ key: 'convolution', x: 435, y: 230, cell: 58, label: '输出 y：每格对应一个窗口' }],
    arrow: [278, 256, 400, 256], equation: { y: 355, width: 850 },
  }),
  'conv-layer': windowAnimation({
    input: [[0, 1, 2], [3, 4, 5], [6, 7, 8]], kernel: [[0, 1], [2, 3]], window: [2, 2], stride: 1,
    inputGrid: { x: 72, y: 118, cell: 50, label: '输入 X' },
    kernelGrid: { x: 340, y: 144, cell: 48, label: '共享核 K' },
    outputGrids: [{ key: 'convolution', x: 595, y: 144, cell: 50, label: '输出特征图' }],
    arrow: [452, 194, 560, 194], equation: { y: 350, width: 820 },
  }),
  'pool-2d': windowAnimation({
    input: [[0, 1, 2], [3, 4, 5], [6, 7, 8]], window: [2, 2], stride: 1,
    inputGrid: { x: 75, y: 120, cell: 48, label: '输入与当前窗口' },
    outputGrids: [{ key: 'max', x: 355, y: 138, cell: 50, label: '最大池化' }, { key: 'mean', x: 670, y: 138, cell: 50, label: '平均池化' }],
    arrow: [238, 191, 315, 191], equation: { y: 350, width: 820 },
  }),
};

// Page groups preserve the original introduction, example, derivation and conclusion order.
export const slides = [
  slide('title', 'cnn-classification', [1], 'CNNs and Image Recognition', '卷积神经网络与图像识别', '从图像分类的任务要求出发，学习卷积网络的组成、训练方法和经典架构。', diagram(1)),
  slide('contents', 'cnn-classification', [2], '本讲路线', '卷积神经网络 → CNN 训练 → 经典架构', '先说明图像为什么需要不同的连接方式，再沿前向计算求梯度，最后观察经典网络如何组合这些组件。', diagram(2)),
  slide('classification', 'cnn-classification', [3], '用神经网络完成图像分类', '图像 → 特征表示 → 类别分数 → 概率 → 类别', '输入是一幅图像，输出是类别判断。神经网络提取表示，分类器产生各类分数，softmax 转为概率；训练时用真实标签计算损失并更新参数。', diagram(3)),
  slide('invariance', 'cnn-classification', [4], '分类任务还要求什么', '缩放、旋转、平移后仍属于同一类别', '同一对象的位置、大小或姿态变化后，分类器仍应识别它。先明确任务对变换稳定性的要求，后面再检查卷积和池化各自能提供什么。', diagram(4)),
  slide('mlp-cost', 'cnn-classification', range(5, 8), '如果用全连接网络分类', '低分辨率图像与浅层网络也需要约 2100 万参数', '把 32×32 RGB 图像展平为 3072 个输入，依次连接 4096、2048 个隐藏单元与 10 个输出。逐层计算矩阵与偏置，再考虑更大图像和更深网络的成本。', diagram(5)),
  slide('dense-connections', 'cnn-classification', range(9, 10), '全连接方案的困难来自哪里', '密集连接的成本，以及未被直接利用的空间结构', '每个输出连接全部输入，产生大矩阵；展平可逆，但全连接结构没有直接编码二维邻域，也没有在各位置共享同一检测器。', diagram(6)),
  slide('visual-cortex', 'cnn-classification', [11], '从视觉皮层的局部组织得到直觉', '相邻细胞对应视野中相邻区域', '观察视野与皮层的拓扑对应。它提供局部组织的直觉，随后用滑动窗口构造能在不同位置复用的计算。', originals('image23.png')),
  slide('conv-1d', 'cnn-convolution', [12], '卷积：让滤波器沿信号滑动', '一个窗口经过加权求和，产生一个输出', '先看输入、滤波器和输出之间的连线，再计算窗口。数学卷积会翻转核；深度学习常用不翻转的互相关，二者都复用同一组权重。', diagram('conv-1d')),
  slide('conv-2d', 'cnn-convolution', [13], '把滑动窗口扩展到二维图像', '局部图像块 × 卷积核 → 特征图中的一个位置', '一维窗口变为二维区域，逐元素乘法后求和。沿行列移动窗口，每次写入一个对应的输出位置，形成完整特征图。', originals('image31.png')),
  slide('network-overview', 'cnn-convolution', [14], '从特征提取器到分类器', '多个卷积阶段学习表示，再汇总类别证据', '先观察卷积主干和分类头的分工，不展开图中每层的参数。接下来识别网络中的主要组件。', originals('image32.jpg')),
  slide('components', 'cnn-convolution', [15], '卷积网络由哪些组件组成', '卷积、池化、归一化、激活与全连接层', '先认出各组件在网络中的位置：卷积提取特征，池化汇总局部响应，归一化调整统计，激活引入非线性，全连接层汇总类别证据。接下来逐项展开。', originals('image33.jpg')),
  slide('conv-layer', 'cnn-convolution', [16], '卷积层如何生成整张特征图', '移动输入窗口，复用相同的核参数', '用输入 0 到 8 和 2×2 核逐格算出 19、25、37、43。相邻输出对应相邻窗口，所有位置使用同一组参数。', diagram(9), 'image35.gif'),
  slide('filters', 'cnn-convolution', [17], '卷积核的权重决定响应', '边缘检测、锐化与高斯模糊', '对照同一张图像与三种滤波结果。权重既可突出局部差异，也可增强细节或平滑噪声；CNN 中的核通过训练学习。', originals('image37.jpg', 'image36.jpg')),
  slide('translation', 'cnn-spatial', [18], '卷积的平移等变性', '输入移动，特征响应也随之移动', '在输入与输出两侧观察对应位置。类别判断希望保持稳定，中间特征图则应保留目标在哪里的信息；边界和步幅会影响严格等变。', originals('image38.jpg'), 'image39.gif'),
  slide('rotation', 'cnn-spatial', [19], '普通卷积对旋转没有同样保证', '旋转后的局部模式会与原核产生不同响应', '比较旋转前后的响应。平移等变的结论不能直接推广到旋转；后面通过数据增强补充对几何变化的鲁棒性。', originals('image40.png'), 'image41.gif'),
  slide('padding', 'cnn-spatial', [20], '填充：让窗口覆盖图像边界', '在输入四周补值，再执行相同的乘加', '观察补零后的有效窗口。填充决定边界像素能以什么位置进入窗口，也影响输出尺寸。', originals('image43.jpg'), 'image45.gif'),
  slide('stride', 'cnn-spatial', [21], '步幅：窗口每次移动多少', '移动间隔越大，输出采样通常越稀疏', '把窗口左上角的位置与输出格对应起来。高度和宽度可以使用不同步幅，应分别计算两个方向。', originals('image46.png'), 'image6.gif'),
  slide('output-size', 'cnn-spatial', [22], '填充与步幅共同决定输出尺寸', '先数有效窗口，再归纳尺寸公式', '对照有无填充与步幅 1、2 的四种情况。末端不足一个完整窗口的位置舍去，所以公式必须向下取整。', diagram(11), 'image50.GIF'),
  slide('input-channels', 'cnn-channels', range(23, 24), '一个核如何读取多个输入通道', '分别乘加，再沿输入通道求和', 'RGB 有三个输入通道，一个输出核也需要三个对应切片。三个局部响应相加后形成一个输出通道，核深度必须匹配输入通道数。', diagram(12)),
  slide('output-channels', 'cnn-channels', [25], '多个卷积核产生多个特征图', '每组核读取全部输入通道，各自产生一个输出通道', '区分输入通道与输出通道：增加核组数会增加输出特征图数量，各组参数独立，但组内参数仍在空间位置上共享。', originals('image57.png')),
  slide('channel-patterns', 'cnn-channels', [26], '不同通道响应不同局部模式', '同一幅图像可以形成多种特征响应', '观察颜色、方向和纹理检测器的差异。输出通道是不同模式的响应，不必逐一对应最终类别。', originals('image58.jpg')),
  slide('standard-conv', 'cnn-channels', [27], '标准卷积的参数怎样分布', '同时处理空间信息与通道融合', '3 个输入通道、4 个输出通道，每组核含 3×3×3 个权重，共 108 个参数。每个输出通道都重复完整的空间与通道计算。', originals('image59.png')),
  slide('depthwise', 'cnn-channels', [28], '深度可分离卷积拆开两项工作', '逐通道空间卷积 → 1×1 通道混合', '先为每个输入通道单独学习空间核，再用 1×1 卷积混合通道。相同例子需要 27+12=39 个参数，对照标准卷积的 108。', originals('image60.jpeg')),
  slide('dilated', 'cnn-variants', [29], '空洞卷积', '间隔采样，扩大感受野', '3×3 核在膨胀率 2 时覆盖 5×5 区域，仍只读取 9 个位置。观察采样间隔与参数数目之间的区别。', diagram('dilated'), 'image61.GIF'),
  slide('transposed', 'cnn-variants', [30], '转置卷积', '把局部贡献写到更大的网格，重叠处相加', '观察输入如何向多个输出位置贡献数值。它提供可学习的上采样，常用于分割和生成；输出增大不保证恢复已丢失的信息。', originals('image62.png')),
  slide('deformable', 'cnn-variants', [31], '可变形卷积', '为规则采样位置学习二维偏移', '沿偏移场到采样位置的关系观察：核仍做加权汇总，改变的是从输入的哪些坐标读取特征。', originals('image63.png')),
  slide('pool-1d', 'cnn-pooling', [32], '池化：把一组响应汇总为一个值', '用低分辨率表示保留局部概况', '先看一维窗口的最大值与平均值。池化没有需要学习的核权重，压缩局部响应后继续送入下一层。', diagram('pool-1d')),
  slide('pool-2d', 'cnn-pooling', [33], '最大池化与平均池化', '在同一组 2×2 窗口上比较两种汇总', '对输入 0 到 8，左上窗口为 0、1、3、4：最大值为 4，平均值为 2。比较整张输出保留的信息。', diagram(15)),
  slide('pool-channels', 'cnn-pooling', [34], '池化在每个通道内独立进行', '空间尺寸减小，通道数保持不变', '与跨通道求和的卷积对照：池化没有混合通道，C 张输入特征图仍产生 C 张输出特征图。', originals('image68.png')),
  slide('pool-invariance', 'cnn-pooling', [35], '为什么池化提供局部稳定性', '同一窗口内重排数值，汇总结果不变', '最大值和平均值都不依赖窗口内元素顺序，所以某些局部平移不会改变结果。跨越窗口边界后，这种稳定性不再保证。', originals('image69.png')),
  slide('equivariance-invariance', 'cnn-pooling', [36], '卷积和池化如何回应分类要求', '卷积保留位置关系，池化缓解局部位置变化', '回到分类任务的变换要求：这两种操作分别提供等变与有限稳定性，对旋转、缩放和更大形变还需要补充训练样本。', diagram(16)),
  slide('augmentation', 'cnn-pooling', [37], '数据增强', '把任务允许的外观与几何变化加入训练', '观察同一对象经过裁剪、翻转和颜色变化后的多个版本。这些样本帮助网络学习稳定判断，变换必须保持标签语义。', originals('image70.jpg', 'image71.jpg')),
  slide('normalize-idea', 'cnn-normalization', [38], '归一化要解决什么问题', '把激活变为可比较的统计尺度', '先理解减均值、除以标准差的作用，再讨论哪些元素共同统计。归一化后通常还有可学习的缩放和平移。', originals('image72.jpg', 'image73.png')),
  slide('normalize-axes', 'cnn-normalization', [39], '比较归一化的统计范围', '同一张量，不同的分组方式', '读图中 N、C 与空间轴：蓝色区域使用同一组统计量。先区分 BN、LN、IN，图中的 GroupNorm 作为另一种分组方式辨认。', originals('image74.jpg')),
  slide('bn-train', 'cnn-normalization', [40], 'BatchNorm：训练时计算批次统计', '均值与方差 → 标准化 → 可学习仿射变换', '先用 N×D 特征矩阵理解：每个特征跨 N 个样本统计，再学习 γ 与 β。稍后将这一规则扩展到卷积特征。', originals('image75.jpg')),
  slide('bn-test', 'cnn-normalization', range(41, 42), 'BatchNorm：推理时使用累计统计', '训练中更新移动平均，推理中固定使用', '推理样本不能依赖临时批次来确定统计量。观察训练阶段如何累计均值与方差，推理时仍使用学习得到的 γ 与 β。', originals('image77.jpg')),
  slide('bn-conv', 'cnn-normalization', [43], '把 BatchNorm 扩展到卷积张量', '每个通道跨 N、H、W 统计', '对照全连接的 N×D 与卷积的 N×C×H×W。卷积中同一个通道在不同样本、不同空间位置共享统计量与仿射参数。', originals('image78.jpg')),
  slide('ln', 'cnn-normalization', [44], 'LayerNorm：在单个样本内部统计', '跨特征轴归一化，训练与推理使用同一规则', '在本例 N×C×H×W 布局中跨 C、H、W；对 N×D 则跨 D。具体统计轴应由张量含义和实现约定确定。', originals('image79.png', 'image80.png')),
  slide('in', 'cnn-normalization', [45], 'InstanceNorm：每个样本、每个通道单独统计', '跨 H、W 汇总空间位置', '与 BN 对照：IN 不把不同样本合在一起统计。统计量形状为 N×C×1×1，仿射参数通常按通道共享。', originals('image81.png')),
  slide('fully-connected', 'cnn-pipeline', [46], '全连接层如何完成最终判断', '卷积提取局部特征，分类器汇总全局证据', '回到开头的表示与分类器：卷积主干输出特征，全连接层组合这些特征并产生类别分数。', originals('image82.png')),
  slide('activation', 'cnn-pipeline', [47], '卷积后为什么需要激活函数', '线性乘加之后引入非线性', 'ReLU 保留正响应并把负响应截为零。多层卷积通过非线性才能获得更丰富的表达，不能只重复线性变换。', originals('image83.png')),
  slide('cnn-hierarchy', 'cnn-pipeline', [48], 'CNN 怎样逐层处理图像', '交替组合卷积、激活与下采样', '沿车的图像追踪特征图、空间尺寸与最后的类别分数。把已学组件放回同一条前向路径。', originals('image84.jpeg')),
  slide('cnn-constraints', 'cnn-pipeline', range(49, 50), '回顾局部连接与权重共享', '局部窗口减少连接，共享参数复用检测器', '分别指出每个输出读取多大的区域、哪些位置使用相同权重。两种约束共同降低全连接方案的参数成本。', diagram(7), 'image85.gif'),
  slide('hierarchical-features', 'cnn-pipeline', [51], '层级特征从局部模式走向类别', '低层特征 → 中层组合 → 高层语义', '对照不同深度的响应：早期偏向颜色和边缘，后续组合纹理、形状与部件，分类器使用这些表示完成判断。', originals('image87.png')),
  slide('mnist', 'cnn-pipeline', [52], '把组件用于 MNIST 十分类', '28×28 灰度图 → 两个卷积阶段 → 10 类输出', '两层 5×5 卷积之间使用池化与 ReLU，最后展平为 320 维并连接 10 个类别。逐步跟踪形状，再讨论参数量。', diagram('mnist')),
  slide('mnist-cost', 'cnn-pipeline', [53], '同一分类任务的参数量对比', '全连接约 101.8k，完整示例 CNN 约 8.5k', '先固定输入和输出，再分别数空间核、通道、偏置与分类头参数。卷积节省的是连接方式的成本，分类头仍需要参数。', diagram('mnist-cost')),
  slide('backprop', 'cnn-kernel-gradient', range(54, 56), '从前向计算进入 CNN 训练', '已知输出梯度，求核梯度与输入梯度', '沿同一计算图反向求导：核梯度用于学习参数，输入梯度用于继续训练前一层。先使用步幅 1 的 3×3 输入、2×2 核和 2×2 输出。', diagram(22)),
  slide('kernel-gradient', 'cnn-kernel-gradient', range(57, 59), '共享核参数的梯度', '同一参数在所有输出位置使用，贡献必须相加', '固定 K₀₀，按链式法则逐项写出四个输出的贡献，再把全部核梯度归纳成输入与输出梯度的有效互相关。', diagram(23), 'image97.gif'),
  slide('input-gradient', 'cnn-input-gradient', [60], '输入梯度先看哪些输出依赖它', '角点、边缘与中心的依赖数量不同', '固定输入位置，检查覆盖它的窗口与对应核系数。3×3 输入的中心参与四个输出，角点只参与一个。', diagram(24)),
  slide('rotate-kernel', 'cnn-input-gradient', [61], '把核沿两个方向翻转', '水平翻转 + 垂直翻转 = 旋转 180°', '核的逆向排列对应输入梯度中的系数顺序。先观察四个元素如何交换位置，再进入统一计算。', originals('image103.jpg')),
  slide('full-gradient', 'cnn-input-gradient', range(62, 65), '用完整空间范围计算输入梯度', '输出梯度补边 → 与旋转核互相关 → 恢复输入形状', '2×2 输出梯度四周补 1，再与旋转后的 2×2 核作有效互相关，得到 3×3 输入梯度。每一步都应与刚才的依赖式一致。', originals('image108.png'), 'image107.gif'),
  slide('stride-dependencies', 'cnn-stride-gradient', range(66, 69), '步幅 2：先重建前向窗口', '5×5 输入、3×3 核、2×2 输出', '四个窗口的左上角为 (0,0)、(0,2)、(2,0)、(2,2)。反向时先明确输入在哪些窗口出现。', diagram(25), 'image111.gif'),
  slide('stride-corner', 'cnn-stride-gradient', range(70, 71), '步幅 2：角点与邻点', 'X₀₀、X₀₁ 都只参与 Y₀₀', '移动被求导的输入位置，核系数随之变化。位置相邻并不意味着参与同样多的输出。', diagram('stride-corner')),
  slide('stride-edge', 'cnn-stride-gradient', [72], '步幅 2：两个窗口重叠的边缘', 'X₀₂ 同时参与 Y₀₀ 与 Y₀₁', '检查该输入在两个窗口内的相对位置，分别乘 K₀₂ 与 K₀₀ 后相加。', diagram('stride-edge')),
  slide('stride-center', 'cnn-stride-gradient', [73], '步幅 2：中心汇总四条路径', 'X₂₂ 被四个窗口共同覆盖', '四条路径分别对应核的四个角。逐项相加后，才能把位置规律归纳为统一计算。', diagram('stride-center')),
  slide('stride-unified', 'cnn-stride-gradient', range(74, 78), '步幅 2：插零、填充与核旋转', '2×2 → 插零为 3×3 → 填充为 7×7 → 输出 5×5', '相邻梯度间插一个零；本例 3×3 核、无前向填充，四周各补 2。用旋转核执行有效互相关，与逐位置推导核对。', diagram(26), 'image124.gif'),
  slide('stride-kernel-first', 'cnn-stride-kernel', range(79, 82), '步幅 2：共享核仍参与全部输出', '固定 K₀₀，读取输入坐标间隔为 2', '与输入梯度区别开：每个核参数被所有四个输出复用，所以要累加四个输出梯度与对应输入的乘积。', diagram(27)),
  slide('stride-kernel-last', 'cnn-stride-kernel', range(83, 85), '换到右下角核参数', 'K₂₂ 读取 X₂₂、X₂₄、X₄₂、X₄₄', '改变被求导的参数后，输入采样坐标整体平移，输出梯度仍来自同样四个位置。', diagram('stride-kernel-last')),
  slide('stride-kernel-unified', 'cnn-stride-kernel', range(86, 87), '把核梯度也组织成统一计算', '输出梯度插零，与输入作有效互相关', '插零后的 3×3 梯度保留步幅 2 的采样间隔，与 5×5 输入得到 3×3 核梯度；这里只需要插零，无需输入梯度中的核旋转。', originals('image130.png'), 'image131.gif'),
  slide('pool-gradient', 'cnn-pool-gradient', [88], '池化怎样继续传回梯度', '最大值路由与平均分配', '池化没有可学习参数。最大池化在前向记住 argmax，反向只送到该位置；平均池化把上游梯度均分给窗口中的所有元素。', diagram(28)),
  slide('small-data', 'cnn-transfer', [89], '数据不多，还能训练 CNN 吗', '已有表示能否用于新任务', '先提出从头训练面临的数据限制，再讨论如何利用其他任务学到的视觉特征。', diagram('small-data')),
  slide('pretrain', 'cnn-transfer', [90], '先在大规模数据上学习表示', '预训练模型提供已学习的特征提取主干', '底层通常偏向较通用的边缘与纹理，靠近输出的层更贴近源任务。保留主干，为目标任务替换分类头。', originals('image133.png')),
  slide('freeze', 'cnn-transfer', [91], '小数据：冻结主干，训练新分类头', '保留预训练参数，只学习目标类别的映射', '把原输出层替换为 C 类输出，随机初始化新层；冻结主干后，目标数据主要用于学习新的类别边界。', originals('image134.png')),
  slide('finetune', 'cnn-transfer', [92], '数据更多：微调更多网络层', '从预训练参数初始化，让特征适应新任务', '数据增多后可解冻后部或全部层，以较小学习率调整已有表示。对照冻结方案中哪些参数开始更新。', originals('image135.png')),
  slide('transfer-choice', 'cnn-transfer', range(93, 95), '迁移方案看数据量与任务相似性', '四种组合有不同的训练选择', '少量相似数据可训练分类器；较多相似数据可微调；少量差异很大的数据宜换更接近的模型或收集数据；较多不同数据可全面微调或从头训练。', diagram('transfer-choice')),
  slide('model-zoo', 'cnn-transfer', [96], '把预训练模型用于项目', '寻找相近源数据与现成模型，再验证迁移效果', '少于约百万张图像时优先评估迁移学习，但这只是经验提示。模型库提供可复用的预训练权重，实际训练范围由目标数据与验证效果决定。', diagram(29)),
  slide('architectures', 'cnn-architecture-map', range(97, 98), '经典 CNN 架构的设计路线', '基本骨架、小核堆叠、多分支、跨层连接与通道调整', '按原展开顺序学习 LeNet、AlexNet、VGG、GoogLeNet、ResNet，再比较性能与成本。路线图中的轻量化支线用于认识设计空间。', originals('image139.png')),
  slide('lenet', 'cnn-lenet', range(99, 100), 'LeNet：建立 CNN 的基本骨架', '卷积、激活、下采样与全连接分类器', '沿输入、特征图和输出读取结构。早期计算资源有限，网络主要服务手写字符识别，建立了后续重复使用的组件组合。', originals('image140.jpeg')),
  slide('alexnet', 'cnn-alexnet', range(101, 102), 'AlexNet：大规模图像分类', '5 个卷积层、3 个池化层、3 个全连接层', '2012 年以 16.4% 的显著优势赢得 ILSVRC；使用 dropout 与 GPU 加速，约 6000 万参数、模型大小约 240M。继续结合网络图讨论双 GPU 训练配置。', originals('image141.png')),
  slide('vgg-structure', 'cnn-vgg', [103], 'VGG-16：规则地重复小卷积', '13 个卷积层 + 3 个全连接层', '逐阶段观察重复的 3×3 卷积和 2×2 池化。网络命名计数包括可学习层，不把池化另计入 16。', originals('image143.png', 'image145.png')),
  slide('vgg-small-kernels', 'cnn-vgg', [104], '小卷积核怎样扩大感受野', '两层 3×3 覆盖 5×5，并增加非线性', '在等通道、步幅 1、忽略偏置时，两层小核的参数为 18C²，一层大核为 25C²。相同覆盖范围不表示两者是相同函数。', diagram(34)),
  slide('vgg-features', 'cnn-vgg', [105], 'VGG 的层级表示与性能', '从浅层局部模式到深层组合', '对照不同层的特征响应与识别错误率。约 1.38 亿参数带来较高存储成本，下一步需要考虑更有效的结构设计。', originals('image146.png', 'image147.png')),
  slide('depth-problem', 'cnn-googlenet', [106], '单纯增加深度遇到什么问题', '参数、过拟合与梯度传播促使结构改变', '保留两个改进方向：增加宽度，以及增加捷径连接。先展开多尺度分支，随后再介绍残差连接。', diagram(35)),
  slide('inception', 'cnn-googlenet', range(107, 108), 'GoogLeNet：Inception 多尺度分支', '并行卷积与池化，1×1 降维，沿通道拼接', '不同感受野分支同时处理输入。1×1 卷积控制通道与成本，padding 保持空间尺寸一致，Concat 合并各分支。', diagram(36)),
  slide('auxiliary', 'cnn-googlenet', [109], '深层 GoogLeNet 的辅助分类输出', '中间层也获得监督与梯度', '22 层主干在不同深度加入辅助 softmax 分类器。这些输出在训练期间提供额外损失，推理时使用主输出。', originals('image152.png')),
  slide('resnet-problem', 'cnn-resnet', [110], '更深的普通网络为何更难训练', '同时观察训练误差与测试误差', '更深普通网络的训练误差也更高，提示优化退化。仅用过拟合解释不足，需要让新增层更容易保持已有映射。', originals('image153.jpg', 'image154.jpg')),
  slide('residual', 'cnn-resnet', [111], 'ResNet：让网络学习残差', 'F(x) + x，保留恒等捷径', 'F(x) 为零时新增层仍能传递 x；梯度也可沿捷径传播。相加前核对形状，尺寸变化时使用投影捷径。', diagram(38)),
  slide('resnet-structure', 'cnn-resnet', [112], '把残差块组成更深网络', '按阶段读取分辨率、通道与重复次数', '对照不同深度的结构表与捷径位置。普通块和瓶颈块的内部组成不同，层数增加也需要控制计算成本。', originals('image158.png', 'image159.png')),
  slide('compare-performance', 'cnn-comparison', [113], '比较准确率、计算量与参数量', '实际模型同时有性能收益与资源成本', '左图比较 Top-1 准确率；右图横轴为 G-Ops、纵轴为准确率，气泡大小表示参数量。观察相近准确率下哪些模型成本更低。', originals('image160.jpeg')),
  slide('compare-structure', 'cnn-comparison', [114], '并排比较网络的连接结构', '相似深度可以有不同的跨层路径', '沿三种结构观察顺序堆叠、残差连接与卷积阶段的差别，把刚学的模块落实到完整网络。', originals('image161.jpeg')),
  slide('compare-runtime', 'cnn-comparison', [115], '批量大小怎样影响速度与功耗', '每图前向耗时与功率需要分别读取', '左图纵轴为每图前向耗时 ms，右图为净功率 W，横轴均为 batch size。增大批量通常改善每图吞吐，但功率变化不能直接当作能耗变化。', originals('image162.jpeg')),
  slide('inception-resnet', 'cnn-comparison', [116], 'Inception-ResNet：组合两种设计', '多尺度分支的输出再通过残差相加', '观察分支的卷积组合、通道映射与加法节点。组合前先让残差分支与输入具有相同形状。', originals('image163.png', 'image164.png')),
  slide('densenet', 'cnn-densenet-senet', [117], 'DenseNet：直接复用此前各层特征', '每层接收所有前层输出的通道拼接', '沿连线检查每层能看到哪些已有特征。Concat 保留各路通道，与 ResNet 的逐元素相加有不同的形状变化。', originals('image165.png')),
  slide('senet', 'cnn-densenet-senet', [118], 'SENet：学习各通道的重要程度', '全局汇总 → 生成通道权重 → 缩放特征', '在卷积特征上读取 Squeeze、Excitation 与 Scale 的位置。权重依赖当前输入；比较它嵌入 Inception 和残差模块的位置。', originals('image166.jpg', 'image167.jpg')),
];

export const topicForSection = Object.fromEntries(sections.map(([, id, topic]) => [id, topic]));
export const topicTitles = { 'cnn-foundations': '卷积神经网络', 'cnn-training': 'CNN 训练', 'cnn-architectures': '经典 CNN 架构' };
