import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'diagrams', 'intro');
const pageArgument = process.argv.find((argument) => argument.startsWith('--page='));
const selectedPage = pageArgument ? Number(pageArgument.slice(7)) : null;
if (selectedPage !== null && (!Number.isInteger(selectedPage) || selectedPage < 1 || selectedPage > 30)) {
  throw new Error('--page must be an integer between 1 and 30.');
}
const sourceAssets = {
  mangoPhoto: {
    sourcePage: 3,
    description: '芒果样本照片，用于说明从可观察特征到类别预测的任务。',
    mime: 'image/png',
    inputPath: join(root, '..', 'AI工程学', 'site', 'public', 'diagrams', 'elements', '1', 'image7.png'),
    outputPath: 'diagrams/intro/3.svg（生成时内嵌）',
  },
  autonomousDriving: {
    sourcePage: 7,
    description: '道路场景分割结果，用于说明自动驾驶中的环境感知。',
    mime: 'image/jpeg',
    inputPath: join(root, '..', 'AI工程学', '.course-build', 'redraw', 'original-elements', '1', 'image27.jpeg'),
    outputPath: 'diagrams/intro/7.svg（生成时内嵌）',
  },
  drugDiscovery: {
    sourcePage: 7,
    description: 'AlphaFold Server 界面，用于说明生物分子结构预测。',
    mime: 'image/png',
    inputPath: join(root, '..', 'AI工程学', '.course-build', 'redraw', 'original-elements', '1', 'image28.png'),
    outputPath: 'diagrams/intro/7.svg（生成时内嵌）',
  },
  humanoidRobot: {
    sourcePage: '7–8',
    description: '人形机器人连续运动，用于说明姿态反馈与动作控制。',
    mime: 'image/gif',
    inputPath: join(root, '..', 'AI工程学', '.course-build', 'redraw', 'original-elements', '1', 'image31.GIF'),
    outputPath: 'diagrams/intro/7.svg（生成时内嵌）',
  },
  languageModel: {
    sourcePage: 7,
    description: '大模型发布阶段的延迟与服务成本比较，用于说明部署指标。',
    mime: 'image/jpeg',
    inputPath: join(root, '..', 'AI工程学', '.course-build', 'redraw', 'original-elements', '1', 'image30.jpeg'),
    outputPath: 'diagrams/intro/7.svg（生成时内嵌）',
  },
};
const inlineAsset = (asset) => `data:${asset.mime};base64,${readFileSync(asset.inputPath).toString('base64')}`;
const mango = inlineAsset(sourceAssets.mangoPhoto);
const applicationImages = {
  autonomousDriving: inlineAsset(sourceAssets.autonomousDriving),
  drugDiscovery: inlineAsset(sourceAssets.drugDiscovery),
  humanoidRobot: inlineAsset(sourceAssets.humanoidRobot),
  languageModel: inlineAsset(sourceAssets.languageModel),
};

mkdirSync(output, { recursive: true });

const C = {
  ink: '#263f35', muted: '#667f72', green: '#176653', pale: '#e9f3ee',
  line: '#a8c2b4', warm: '#fbf0dd', orange: '#b47936', white: '#ffffff', bg: '#fbfdfb',
};

const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const lines = (items, x, y, options = {}) => {
  const { size = 17, color = C.ink, weight = 400, anchor = 'middle', gap = size * 1.45 } = options;
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${items.map((item, index) => `<tspan x="${x}" dy="${index ? gap : 0}">${esc(item)}</tspan>`).join('')}</text>`;
};
const box = (x, y, w, h, title, detail = [], options = {}) => {
  const { fill = C.pale, stroke = C.line, titleColor = C.ink, detailColor = C.muted, titleSize = 18 } = options;
  const detailLines = Array.isArray(detail) ? detail : [detail];
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="1.6"/>${lines([title], x + w / 2, y + 31, { size: titleSize, color: titleColor, weight: 600 })}${detailLines.length ? lines(detailLines, x + w / 2, y + 58, { size: 13, color: detailColor, gap: 20 }) : ''}`;
};
const arrow = (x1, y1, x2, y2, color = C.green, label = '', labelY = -8) => `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="2.2" fill="none" marker-end="url(#arrow-${color === C.orange ? 'orange' : 'green'})"/>${label ? lines([label], (x1 + x2) / 2, (y1 + y2) / 2 + labelY, { size: 13, color }) : ''}`;
const defs = `<defs><marker id="arrow-green" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="none" stroke="${C.green}" stroke-width="1.7"/></marker><marker id="arrow-orange" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10" fill="none" stroke="${C.orange}" stroke-width="1.7"/></marker></defs>`;
const svg = (title, description, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="417" viewBox="0 0 960 417" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><desc>${esc(description)}</desc>${defs}<rect width="960" height="417" fill="${C.bg}"/><g font-family="PingFang SC,Microsoft YaHei,Arial,sans-serif">${body}</g></svg>\n`;
const heading = (title, subtitle = '') => `${lines([title], 48, 43, { size: 22, color: C.ink, weight: 650, anchor: 'start' })}${subtitle ? lines([subtitle], 48, 69, { size: 13, color: C.muted, anchor: 'start' }) : ''}`;
const pill = (x, y, w, label, active = false) => `<rect x="${x}" y="${y}" width="${w}" height="38" rx="19" fill="${active ? C.green : C.white}" stroke="${active ? C.green : C.line}"/><text x="${x + w / 2}" y="${y + 25}" fill="${active ? C.white : C.green}" font-size="14" text-anchor="middle">${esc(label)}</text>`;

const diagrams = [];

diagrams[1] = svg('人工神经网络基础', '课程从智能问题出发，依次进入多层感知机、网络训练与案例分析。', `${heading('人工神经网络基础', 'Fundamentals of Artificial Neural Networks')}${box(65, 137, 180, 112, '引言与概览', ['智能从何而来？'], { fill: C.green, titleColor: C.white, detailColor: C.white })}${box(280, 137, 180, 112, '多层感知机', ['神经元如何连接？'])}${box(495, 137, 180, 112, '网络训练', ['参数如何更新？'])}${box(710, 137, 180, 112, '案例分析', ['模型如何应用？'])}${arrow(245, 193, 277, 193)}${arrow(460, 193, 492, 193)}${arrow(675, 193, 707, 193)}${lines(['贯穿全讲的问题：数据如何通过可学习参数变成有用的预测？'], 480, 321, { size: 18, color: C.muted })}`);
diagrams[2] = svg('课程内容路线', '四个部分从问题定义逐步推进到模型、训练和应用。', `${heading('课程内容路线', '从问题到模型，再到可验证的应用')}${arrow(162, 202, 315, 202)}${arrow(392, 202, 545, 202)}${arrow(622, 202, 775, 202)}${box(75, 153, 170, 98, '01 引言与概览', ['问题与边界'], { fill: C.warm })}${box(275, 153, 170, 98, '02 多层感知机', ['结构与表示'])}${box(475, 153, 170, 98, '03 网络训练', ['损失与优化'])}${box(675, 153, 210, 98, '04 案例分析', ['评价与应用'])}${lines(['每一步都回答一个可检查的问题，而不是孤立罗列模型名称。'], 480, 320, { size: 17, color: C.muted })}`);

diagrams[3] = svg('水果识别的训练闭环', '绿色模块和箭头表示从输入到预测的前向路径；橙色模块和箭头表示由真实标签、损失和优化器组成的训练反馈路径。', `${heading('水果识别：从预测到学习')}
  <image href="${mango}" x="35" y="112" width="190" height="140" preserveAspectRatio="xMidYMid slice"/>
  ${box(270, 126, 150, 88, '输入特征', ['颜色 · 形状'], { fill: C.pale })}
  ${box(475, 126, 150, 88, '模型 fθ', ['参数 θ'], { fill: C.pale })}
  ${box(680, 126, 150, 88, '预测 ŷ', ['芒果 / 其他'], { fill: C.pale })}
  ${arrow(225, 170, 267, 170)}${arrow(420, 170, 472, 170)}${arrow(625, 170, 677, 170)}
  ${box(680, 280, 150, 78, '真实标签 y', ['已知答案'], { fill: C.warm, stroke: '#d2af7d' })}
  ${box(475, 280, 150, 78, '损失 L(ŷ, y)', ['衡量预测误差'], { fill: C.warm, stroke: '#d2af7d' })}
  ${box(270, 280, 150, 78, '优化器', ['更新参数 θ'], { fill: C.warm, stroke: '#d2af7d' })}
  <path d="M755 217 L755 248 L605 248 L605 277" stroke="${C.orange}" stroke-width="2.2" fill="none" marker-end="url(#arrow-orange)"/>${lines(['预测'], 684, 240, { size: 13, color: C.orange })}
  ${arrow(677, 319, 628, 319, C.orange, '标签')}${arrow(472, 319, 423, 319, C.orange, '误差')}
  <path d="M345 277 L345 244 L550 244 L550 217" stroke="${C.orange}" stroke-width="2.2" fill="none" marker-end="url(#arrow-orange)"/>${lines(['更新参数'], 446, 235, { size: 13, color: C.orange })}
  <rect x="278" y="384" width="15" height="15" rx="3" fill="${C.pale}" stroke="${C.line}"/>${lines(['绿色模块与箭头：前向预测'], 304, 397, { size: 14, color: C.green, anchor: 'start' })}
  <rect x="568" y="384" width="15" height="15" rx="3" fill="${C.warm}" stroke="#d2af7d"/>${lines(['橙色模块与箭头：训练反馈'], 594, 397, { size: 14, color: C.orange, anchor: 'start' })}`);

diagrams[4] = svg('人工特征与自动学习表示', '传统机器学习依赖人工设计特征，深度学习联合学习表示和分类器。', `${heading('两种识别流程的差别', '差别在于特征由谁产生，而不在于输入图片本身')}${lines(['传统机器学习'], 52, 134, { size: 17, color: C.ink, weight: 600, anchor: 'start' })}${box(215, 104, 170, 78, '人工设计特征', ['颜色 · 纹理 · 形状'], { fill: C.warm })}${box(470, 104, 170, 78, '分类器', ['SVM / Boosting'])}${box(725, 104, 170, 78, '类别', ['芒果 / 苹果'])}${arrow(385, 143, 467, 143)}${arrow(640, 143, 722, 143)}${lines(['深度学习'], 52, 273, { size: 17, color: C.ink, weight: 600, anchor: 'start' })}${box(215, 243, 280, 78, '可学习的特征提取器', ['从像素中学习表示'])}${box(580, 243, 150, 78, '分类层', ['联合优化'])}${box(815, 243, 80, 78, '类别', [], { fill: C.green, titleColor: C.white })}${arrow(495, 282, 577, 282)}${arrow(730, 282, 812, 282)}${lines(['同一目标：在未见样本上做出可靠预测'], 480, 379, { size: 16, color: C.muted })}`);

diagrams[5] = svg('从预测误差到参数更新', '前向传播产生预测，损失函数衡量误差，反向传播计算调整方向，优化器更新权重。', `${heading('训练过程概览', '先预测并衡量误差，再把调整方向反馈给模型')}${box(50, 125, 145, 88, '输入样本', ['图像与标签'], { fill: C.warm })}${box(235, 125, 145, 88, '模型', ['可学习参数'])}${box(420, 125, 145, 88, '预测结果', ['前向传播'])}${box(605, 125, 145, 88, '预测误差', ['与标签比较'], { fill: C.warm })}${box(790, 125, 120, 88, '调整方向', ['反向传播'])}${arrow(195, 169, 232, 169)}${arrow(380, 169, 417, 169)}${arrow(565, 169, 602, 169)}${arrow(750, 169, 787, 169)}<path d="M850 216 L850 289 L308 289 L308 216" stroke="${C.orange}" stroke-width="2.4" fill="none" marker-end="url(#arrow-orange)"/>${lines(['优化器更新权重，进入下一轮'], 579, 278, { size: 16, color: C.orange, weight: 600 })}${lines(['训练反复进行，预测误差逐步反馈到模型参数。'], 480, 351, { size: 16, color: C.muted })}`);

diagrams[6] = svg('人工智能为何成为共同方法', '人工智能从可计算的智能问题发展为支持科学发现与工程系统的方法集合。', `${heading('从智能问题到科学与工程方法', '研究目标扩大，但核心仍是可定义、可学习、可评价的任务')}${box(65, 145, 200, 105, '可计算的问题', ['表示 · 推理 · 搜索'], { fill: C.warm })}${box(380, 145, 200, 105, '数据驱动学习', ['从样本中估计规律'])}${box(695, 145, 200, 105, '科学与工程', ['预测 · 生成 · 控制'])}${arrow(265, 198, 377, 198)}${arrow(580, 198, 692, 198)}${lines(['理论突破、算法设计、数据积累和计算资源共同推动能力提升。'], 480, 321, { size: 17, color: C.muted })}`);
diagrams[7] = svg('人工智能的应用', '自动驾驶、生物制药、人形机器人和大语言模型分别对应道路感知、结构预测、动作控制和文本生成任务。', `${heading('人工智能的应用')}
  <defs>${[['auto',42],['drug',272],['robot',502],['llm',732]].map(([id, x]) => `<clipPath id="app-${id}"><rect x="${x}" y="96" width="186" height="116" rx="5"/></clipPath>`).join('')}</defs>
  ${[['auto',42,applicationImages.autonomousDriving,'slice'],['drug',272,applicationImages.drugDiscovery,'slice'],['robot',502,applicationImages.humanoidRobot,'slice'],['llm',732,applicationImages.languageModel,'meet']].map(([id, x, href, fit]) => `<rect x="${x}" y="84" width="186" height="260" rx="6" fill="${C.white}" stroke="${C.line}"/><image href="${href}" x="${x}" y="96" width="186" height="116" preserveAspectRatio="xMidYMid ${fit}" clip-path="url(#app-${id})"/>`).join('')}
  ${lines(['自动驾驶'], 135, 243, { size: 17, color: C.ink, weight: 600 })}${lines(['道路图像', '目标识别与场景分割'], 135, 274, { size: 13, color: C.muted, gap: 21 })}
  ${lines(['生物制药'], 365, 243, { size: 17, color: C.ink, weight: 600 })}${lines(['生物分子信息', '结构预测与候选筛选'], 365, 274, { size: 13, color: C.muted, gap: 21 })}
  ${lines(['人形机器人'], 595, 243, { size: 17, color: C.ink, weight: 600 })}${lines(['传感器与关节状态', '姿态估计与动作控制'], 595, 274, { size: 13, color: C.muted, gap: 21 })}
  ${lines(['大语言模型'], 825, 243, { size: 17, color: C.ink, weight: 600 })}${lines(['文本与上下文', '理解、生成及部署效率'], 825, 274, { size: 13, color: C.muted, gap: 21 })}`);
diagrams[8] = svg('不同领域对应不同任务', '四类人工智能应用分别接收领域数据，学习特定映射，并输出结构、环境、动作或文本结果。', `${heading('从应用名称落到具体任务', '先明确输入和输出，才能选择数据、模型与评价方法')}
  ${lines(['领域'], 75, 111, { size: 14, color: C.muted, weight: 600, anchor: 'start' })}${lines(['输入'], 255, 111, { size: 14, color: C.muted, weight: 600, anchor: 'start' })}${lines(['核心任务'], 505, 111, { size: 14, color: C.muted, weight: 600, anchor: 'start' })}${lines(['输出'], 770, 111, { size: 14, color: C.muted, weight: 600, anchor: 'start' })}
  ${[['生物制药','序列与分子信息','结构预测','三维结构或候选评分'],['自动驾驶','摄像头与雷达数据','检测、分割与规划','环境表示或行驶动作'],['人形机器人','传感器与关节状态','状态估计与控制','稳定姿态或运动指令'],['大语言模型','文本与对话上下文','语言建模','回答、摘要或代码']].map((row, index) => { const y = 139 + index * 61; return `<rect x="50" y="${y}" width="860" height="49" rx="5" fill="${index % 2 ? C.white : C.pale}" stroke="${C.line}"/>${lines([row[0]], 75, y + 30, { size: 15, color: C.ink, weight: 600, anchor: 'start' })}${lines([row[1]], 255, y + 30, { size: 14, color: C.muted, anchor: 'start' })}${lines([row[2]], 505, y + 30, { size: 14, color: C.green, weight: 600, anchor: 'start' })}${lines([row[3]], 770, y + 30, { size: 13, color: C.muted, anchor: 'start' })}`; }).join('')}`);

diagrams[9] = svg('图灵与机器智能问题', '图灵的工作把可计算性、机器智能和可观察行为联系起来。', `${heading('Alan Turing：把“能否思考”改写为可讨论的问题')}${lines(['1931'], 90, 147, { size: 17, color: C.orange, weight: 600 })}${lines(['进入剑桥大学', '学习数学'], 90, 179, { size: 14, color: C.muted, gap: 21 })}${lines(['1938'], 250, 147, { size: 17, color: C.green, weight: 600 })}${lines(['普林斯顿大学', '获博士学位'], 250, 179, { size: 14, color: C.muted, gap: 21 })}${lines(['1939–1945'], 420, 147, { size: 17, color: C.green, weight: 600 })}${lines(['参与密码分析', '推进计算实践'], 420, 179, { size: 14, color: C.muted, gap: 21 })}${lines(['1950'], 590, 147, { size: 17, color: C.green, weight: 600 })}${lines(['提出模仿游戏', '讨论机器智能'], 590, 179, { size: 14, color: C.muted, gap: 21 })}<path d="M90 115 L590 115" stroke="${C.line}" stroke-width="3"/>${[90,250,420,590].map((x) => `<circle cx="${x}" cy="115" r="8" fill="${x === 90 ? C.orange : C.green}"/>`).join('')}${box(720, 99, 185, 145, '关键转变', ['不先定义“思考”', '而考察可观察表现'], { fill: C.warm })}${lines(['行为测试提供操作性标准，但不能单独回答意识或理解是否存在。'], 480, 326, { size: 16, color: C.muted })}`);

diagrams[10] = svg('图灵测试：电子通讯中的多轮问答', '人类询问者通过电子通讯设备与身份隐藏的人类和机器进行多轮文字问答，再根据回答判断身份；示例问题是你会下国际象棋吗。', `${heading('图灵测试：电子通讯中的多轮问答', '询问者看不到回答者，只根据文字回答判断对方是人类还是机器')}
  ${box(25, 110, 180, 155, '人类回答者 A', ['身份隐藏'], { fill: C.white, titleSize: 17 })}
  ${box(390, 110, 180, 155, '人类询问者', ['通过电子通讯设备', '比较多轮回答', '判断回答者身份'], { fill: C.warm })}
  ${box(755, 110, 180, 155, '机器回答者 B', ['身份隐藏'], { fill: C.white, titleSize: 17 })}
  ${[118, 174, 230].map((y) => arrow(390, y, 208, y, C.green)).join('')}
  ${[138, 194, 250].map((y) => arrow(208, y, 387, y, C.orange)).join('')}
  ${[118, 174, 230].map((y) => arrow(570, y, 752, y, C.green)).join('')}
  ${[138, 194, 250].map((y) => arrow(752, y, 573, y, C.orange)).join('')}
  ${[114, 170, 226].map((y, index) => lines([`${index + 1} 问：你会下国际象棋吗？`], 298, y, { size: 10.5, color: C.green, weight: 600 })).join('')}
  ${lines(['答：是的。'], 298, 134, { size: 10.5, color: C.orange, weight: 600 })}
  ${lines(['答：我不是已经说过了吗？'], 298, 190, { size: 9.5, color: C.orange, weight: 600 })}
  ${lines(['答：干嘛总问同样的问题？'], 298, 246, { size: 9.5, color: C.orange, weight: 600 })}
  ${[114, 170, 226].map((y, index) => lines([`${index + 1} 问：你会下国际象棋吗？`], 662, y, { size: 10.5, color: C.green, weight: 600 })).join('')}
  ${[134, 190, 246].map((y) => lines(['答：是的。'], 662, y, { size: 10.5, color: C.orange, weight: 600 })).join('')}
  ${lines(['绿色箭头：询问者提问　　橙色箭头：回答者回答'], 480, 291, { size: 11, color: C.muted })}
  <rect x="75" y="306" width="810" height="91" rx="8" fill="${C.warm}" stroke="#d2af7d" stroke-width="1.5"/>
  ${lines(['询问者依据多轮文字交互判断身份；结论取决于具体的受测条件。'], 480, 338, { size: 13, color: C.ink, weight: 650 })}
  ${lines(['自然的对话表现不能单独证明理解、意识或通用智能。'], 480, 368, { size: 12, color: C.muted })}`);

const dialog = (annotated) => svg('重复提问中的上下文', '两组回答都符合语法，但只有一组对重复提问作出变化，显示其利用了对话历史。', `${heading('同一句问题连续出现三次', '比较“固定映射”与“利用上下文”')}${box(45, 104, 405, 226, '回答 A：机械重复', ['问：你会下国际象棋吗？', '答：是的。', '', '问：你会下国际象棋吗？', '答：是的。', '', '问：你会下国际象棋吗？', '答：是的。'], { fill: C.white })}${box(510, 104, 405, 226, '回答 B：感知重复', ['问：你会下国际象棋吗？', '答：是的。', '', '问：你会下国际象棋吗？', '答：我刚才已经回答过。', '', '问：为什么又问同一个问题？'], { fill: C.pale })}${annotated ? `${pill(73, 348, 160, '固定规则输出')}${pill(254, 348, 160, '忽略对话历史')}${pill(538, 348, 160, '使用上下文', true)}${pill(719, 348, 160, '调整回答', true)}` : lines(['判断重点不是情绪化措辞，而是回答是否利用了此前的对话状态。'], 480, 377, { size: 15, color: C.muted })}`);
diagrams[11] = dialog(false);
diagrams[12] = dialog(true);

diagrams[13] = svg('大语言模型的表达多样性', '两个回答表达不同，但共享“可以介绍规则、策略并讨论棋局”的核心语义。', `${heading('表达不同，不等于目标不同', '大语言模型按上下文生成后续文本，可能给出多种等价表达')}${box(55, 112, 370, 180, '回答 1', ['我可以介绍国际象棋的规则、', '策略和技巧，也可以讨论具体棋局。'], { fill: C.white })}${box(535, 112, 370, 180, '回答 2', ['我能帮助学习开局、战术与规则，', '也能一起分析某个局面。'], { fill: C.white })}${arrow(425, 202, 532, 202, C.green, '语义相近', -12)}${lines(['可观察到：表述具有变化'], 260, 339, { size: 15, color: C.green, weight: 600 })}${lines(['仍需检验：事实性、推理稳定性和任务边界'], 700, 339, { size: 15, color: C.orange, weight: 600 })}`);

diagrams[15] = svg('人工智能主要流派的发展脉络', '沿一条时间线串联人工智能的早期基础、符号主义、联结主义、行为主义以及现代融合发展。', `${heading('人工智能主要流派的发展脉络', '沿时间线理解不同思想的兴起；各流派长期并存并相互借鉴')}
  <path d="M62 216 H916" stroke="${C.line}" stroke-width="3" fill="none" marker-end="url(#arrow-green)"/>
  ${[
    [112, C.muted],
    [294, C.green],
    [476, C.orange],
    [658, C.muted],
    [840, C.green],
  ].map(([x, color]) => `<circle cx="${x}" cy="216" r="9" fill="${color}" stroke="${C.white}" stroke-width="3"/>`).join('')}
  <path d="M112 207 V187 M294 225 V240 M476 207 V187 M658 225 V240 M840 207 V187" stroke="${C.line}" stroke-width="1.5" fill="none"/>
  ${box(30, 98, 164, 89, '1940s–50s', ['早期基础', '逻辑 · 控制论 · 形式神经元'], { fill: C.white, titleSize: 16 })}
  ${box(212, 240, 164, 89, '1950s', ['符号主义', '符号 · 规则 · 逻辑推理'], { fill: C.warm, titleSize: 16 })}
  ${box(394, 98, 164, 89, '1950s–60s', ['联结主义', '感知机 · 神经元连接'], { fill: C.pale, titleSize: 16 })}
  ${box(576, 240, 164, 89, '1980s–现在', ['行为主义', '感知—行动 · 环境反馈'], { fill: C.white, titleSize: 16 })}
  ${box(758, 98, 164, 89, '2010s–现在', ['融合发展', '深度学习 · 强化学习 · 规则'], { fill: C.pale, titleSize: 16 })}
  ${lines(['时间'], 916, 241, { size: 12, color: C.muted, anchor: 'end' })}
  ${lines(['三种流派并非依次取代：现代系统常把学习、反馈、知识与规则组合起来。'], 480, 382, { size: 14, color: C.muted })}`);

diagrams[16] = svg('Artificial Intelligence → Deep Learning', '三个自上而下嵌套的圆层分别表示人工智能、机器学习和深度学习；圆内标注各自目标，圈层之间说明方法与技术关系。', `${heading('Artificial Intelligence → Deep Learning', '从宽泛目标逐步进入具体技术')}
  <path d="M70 119 V346" stroke="${C.ink}" stroke-width="2" fill="none" marker-end="url(#arrow-green)"/>
  ${lines(['宽泛概念'], 70, 101, { size: 13, color: C.muted })}
  ${lines(['具体技术'], 70, 374, { size: 13, color: C.muted })}
  <circle cx="330" cy="235" r="165" fill="#edf3f0" stroke="${C.line}" stroke-width="1.6"/>
  <circle cx="330" cy="260" r="120" fill="#d6e9df" stroke="${C.line}" stroke-width="1.6"/>
  <circle cx="330" cy="295" r="72" fill="${C.green}" stroke="${C.green}" stroke-width="1.6"/>
  ${lines(['人工智能 AI'], 330, 100, { size: 17, color: C.ink, weight: 650 })}
  ${lines(['使计算机完成需要智能的任务'], 330, 126, { size: 13, color: C.muted })}
  ${lines(['机器学习 ML'], 330, 166, { size: 16, color: C.green, weight: 650 })}
  ${lines(['从数据中学习规律', '用于分析或预测'], 330, 191, { size: 12, color: C.muted, gap: 18 })}
  ${lines(['深度学习 DL'], 330, 285, { size: 15, color: C.white, weight: 650 })}
  ${lines(['用多层神经网络', '自动学习数据表示'], 330, 309, { size: 12, color: C.white, gap: 17 })}
  <path d="M442 255 C540 265 555 210 493 188" stroke="${C.green}" stroke-width="3" fill="none" marker-end="url(#arrow-green)"/>
  ${lines(['机器学习为实现人工智能提供方法'], 680, 147, { size: 15, color: C.green, weight: 650 })}
  <path d="M399 301 C470 320 505 293 449 272" stroke="${C.orange}" stroke-width="3" fill="none" marker-end="url(#arrow-orange)"/>
  ${lines(['深度学习为实现机器学习提供技术'], 680, 258, { size: 15, color: C.orange, weight: 650 })}`);

const developmentStops = [
  ['1943', 'M-P 神经元'],
  ['1958–69', '早期兴盛'],
  ['1976–82', '第一次低谷'],
  ['1986', '多层网络'],
  ['1990s', '沉寂期'],
  ['2006', '深度复兴'],
  ['2012', 'AlexNet'],
  ['2014–18', '结构突破'],
  ['2019–24', '生成与多模态'],
  ['未来', '通用表示'],
];
const developmentTimeline = (active) => {
  const axis = `<path d="M42 340 H930" stroke="${C.line}" stroke-width="2.5" fill="none" marker-end="url(#arrow-green)"/>`;
  const stops = developmentStops.map(([year], index) => {
    const x = 50 + index * 95;
    const fill = index < active ? C.green : index === active ? C.orange : C.white;
    const stroke = index === active ? C.orange : C.green;
    return `<circle cx="${x}" cy="340" r="${index === active ? 8 : 5}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>${lines([year], x, 369, { size: 10, color: index === active ? C.orange : C.muted, weight: index === active ? 650 : 400 })}`;
  }).join('');
  const activeX = 50 + active * 95;
  return `${lines([developmentStops[active][1]], activeX, 316, { size: 12, color: C.orange, weight: 650 })}${axis}${stops}`;
};
const developmentSlide = (title, subtitle, description, active, body) => svg(title, description, `${heading(title, subtitle)}${body}${developmentTimeline(active)}`);

diagrams[19] = developmentSlide('1943 · M-P 神经元模型', '形式神经元把生物启发转化为可计算的判断规则', '多个输入按连接权重汇总，结果超过阈值时神经元激活。', 0, `
  ${box(48, 105, 280, 156, 'McCulloch–Pitts', ['带权输入汇总', '与阈值 θ 比较', '输出激活或不激活'], { fill: C.warm })}
  ${lines(['x₁', 'x₂', 'x₃'], 420, 126, { size: 15, color: C.ink, gap: 50 })}
  ${arrow(445, 121, 548, 168)}${arrow(445, 171, 548, 177)}${arrow(445, 221, 548, 186)}
  <circle cx="585" cy="178" r="38" fill="${C.pale}" stroke="${C.green}" stroke-width="2"/>
  ${lines(['Σ'], 585, 188, { size: 25, color: C.green, weight: 650 })}
  ${arrow(623, 178, 712, 178)}
  ${box(715, 133, 195, 90, '阈值判断', ['超过 θ → 激活'], { fill: C.pale })}
  ${lines(['权重 ω 表示输入影响；阈值 θ 决定是否激活。'], 665, 272, { size: 14, color: C.muted })}`);

diagrams[20] = developmentSlide('1958–1969 · 感知机与早期兴盛', '连接权重开始能够从数据中调整', '感知机和 Adaline 推动早期发展，对单层模型能力边界的研究也揭示了局限。', 1, `
  ${box(48, 106, 260, 112, '1958 · Perceptron', ['感知机', '从样本调整连接权重'], { fill: C.pale })}
  ${box(350, 106, 260, 112, '1960 · Adaline', ['自适应线性神经元', '用误差改进权重'], { fill: C.pale })}
  ${box(652, 106, 260, 112, '1969 · Perceptrons', ['系统分析能力边界', '单层模型局限显现'], { fill: C.warm })}
  ${lines(['阶跃函数：给出 0 / 1 的硬判断'], 198, 269, { size: 14, color: C.ink })}
  ${lines(['Sigmoid：提供平滑的激活形式'], 665, 269, { size: 14, color: C.ink })}
  ${arrow(325, 264, 535, 264, C.orange, '激活函数逐步演进', -10)}`);

diagrams[21] = developmentSlide('1976–1982 · 第一次低谷', '能力设想与现实条件之间仍有明显落差', '计算能力、计算复杂度和工程实现难度共同限制了早期神经网络。', 2, `
  ${box(90, 112, 220, 124, '计算能力不足', ['硬件规模有限', '训练耗时过长'], { fill: C.warm })}
  ${box(370, 112, 220, 124, '计算复杂度高', ['多层模型难训练', '方法尚不成熟'], { fill: C.warm })}
  ${box(650, 112, 220, 124, '实现难度大', ['数据和工具有限', '效果未达预期'], { fill: C.warm })}
  ${lines(['研究投入与关注下降，神经网络进入第一次低谷。'], 480, 280, { size: 15, color: C.muted })}`);

diagrams[22] = developmentSlide('1986 · 神经网络重新受到关注', '简单单元通过可调整的连接组成多层网络', '神经网络由相互连接的自适应单元组成，能够通过调整权重学习输入到输出的映射。', 3, `
  ${[0,1,2].map((i) => `<circle cx="140" cy="${125 + i * 62}" r="15" fill="${C.warm}" stroke="${C.line}"/>`).join('')}
  ${[0,1,2].map((i) => `<circle cx="350" cy="${125 + i * 62}" r="17" fill="${C.pale}" stroke="${C.green}"/>`).join('')}
  ${[0,1].map((i) => `<circle cx="555" cy="${150 + i * 80}" r="17" fill="${C.green}"/>`).join('')}
  ${[0,1,2].flatMap((a) => [0,1,2].map((b) => `<path d="M155 ${125 + a * 62} L333 ${125 + b * 62}" stroke="${C.line}"/>`)).join('')}
  ${[0,1,2].flatMap((a) => [0,1].map((b) => `<path d="M367 ${125 + a * 62} L538 ${150 + b * 80}" stroke="${C.line}"/>`)).join('')}
  ${box(660, 113, 250, 142, 'Neural Network', ['连接权重可以调整', '多层组合形成表示', '整体映射由训练获得'], { fill: C.white })}
  ${lines(['输入'], 140, 286, { size: 12, color: C.muted })}${lines(['隐藏层'], 350, 286, { size: 12, color: C.muted })}${lines(['输出'], 555, 286, { size: 12, color: C.muted })}`);

diagrams[23] = developmentSlide('1986 · 反向传播推动多层训练', '误差能够逐层传回网络并用于更新连接权重', '反向传播使多层网络从结构设想转向可以训练的模型。', 3, `
  ${box(55, 122, 190, 90, '输入', ['样本数据'])}
  ${box(300, 122, 190, 90, '多层网络', ['连接权重'], { fill: C.pale })}
  ${box(545, 122, 190, 90, '输出', ['模型预测'])}
  ${box(780, 122, 130, 90, '误差', ['与目标比较'], { fill: C.warm })}
  ${arrow(245, 167, 297, 167)}${arrow(490, 167, 542, 167)}${arrow(735, 167, 777, 167)}
  <path d="M845 217 V266 H395 V217" stroke="${C.orange}" stroke-width="2.2" fill="none" marker-end="url(#arrow-orange)"/>
  ${lines(['反向传播误差并更新权重'], 620, 287, { size: 14, color: C.orange, weight: 650 })}`);

diagrams[24] = developmentSlide('1990s–2005 · 深层网络的沉寂期', '深层模型尚未在实际效果上形成稳定优势', '训练、计算、数据和效果共同构成瓶颈，SVM 与 Boosting 等方法得到更广泛应用。', 4, `
  ${box(48, 112, 190, 102, '训练困难', ['深层参数难优化'], { fill: C.warm })}
  ${box(272, 112, 190, 102, '计算不足', ['训练成本过高'], { fill: C.warm })}
  ${box(496, 112, 190, 102, '数据有限', ['难以覆盖变化'], { fill: C.warm })}
  ${box(720, 112, 190, 102, '效果不稳', ['优势不够明确'], { fill: C.warm })}
  ${box(270, 245, 420, 54, 'SVM、Boosting 与人工特征更受重视', [], { fill: C.white, titleSize: 16 })}`);

diagrams[25] = developmentSlide('2006 · 深度学习复兴', '深度信念网络重新激活深层模型研究', '更好的模型设计和训练方式，与计算能力和数据规模的增长逐步汇合。', 5, `
  ${box(48, 112, 250, 128, 'Deep Belief Network', ['深度信念网络', '改进深层模型训练'], { fill: C.pale })}
  ${box(355, 112, 250, 128, '计算能力提升', ['更强硬件', '更大训练规模'])}
  ${box(662, 112, 250, 128, '大规模数据', ['更多样本', '更丰富的变化'])}
  ${arrow(298, 176, 352, 176)}${arrow(605, 176, 659, 176)}
  ${lines(['模型、计算和数据开始形成相互促进的条件。'], 480, 282, { size: 15, color: C.muted })}`);

diagrams[26] = developmentSlide('2012 · AlexNet 的性能跃迁', '同一视觉基准上出现明显差距', 'AlexNet 在 ILSVRC 2012 将 top-5 错误率降至约 15.3%，第二名约为 26.2%。', 6, `
  ${lines(['AlexNet', '15.3%'], 75, 126, { size: 16, color: C.ink, gap: 25, weight: 650, anchor: 'start' })}
  <rect x="225" y="105" width="260" height="54" rx="4" fill="${C.green}"/>
  ${lines(['第二名', '26.2%'], 75, 223, { size: 16, color: C.ink, gap: 25, weight: 650, anchor: 'start' })}
  <rect x="225" y="202" width="445" height="54" rx="4" fill="${C.line}"/>
  ${lines(['相差约 10.9 个百分点'], 710, 137, { size: 14, color: C.orange, weight: 650, anchor: 'start' })}
  ${lines(['ImageNet：约 100 万张图像、1000 个类别'], 480, 292, { size: 14, color: C.muted })}`);

diagrams[27] = developmentSlide('2014–2018 · 模型结构持续突破', '深度学习从视觉识别扩展到序列、生成和预训练', 'Seq2Seq、GAN、ResNet、Transformer、BERT 和 GPT-1 构成这一阶段的代表节点。', 7, `
  ${box(45, 110, 190, 112, '2014', ['Seq2Seq', 'GAN'], { fill: C.pale })}
  ${box(272, 110, 190, 112, '2015', ['ResNet', '训练更深网络'], { fill: C.pale })}
  ${box(499, 110, 190, 112, '2017', ['Transformer', '注意力机制'], { fill: C.pale })}
  ${box(726, 110, 190, 112, '2018', ['BERT', 'GPT-1'], { fill: C.pale })}
  ${arrow(235, 166, 269, 166)}${arrow(462, 166, 496, 166)}${arrow(689, 166, 723, 166)}
  ${lines(['表示能力、可训练规模和任务范围同步扩展。'], 480, 278, { size: 15, color: C.muted })}`);

diagrams[28] = developmentSlide('2019–2024 · 生成与多模态扩展', '大模型把文本、图像和交互任务连接起来', 'GPT 系列、CLIP、DALL-E、扩散模型和 ChatGPT 推动生成式与多模态能力发展。', 8, `
  ${box(45, 105, 164, 94, '2019', ['GPT-2'], { fill: C.pale })}
  ${box(222, 105, 164, 94, '2020', ['GPT-3'], { fill: C.pale })}
  ${box(399, 105, 164, 94, '2021', ['CLIP', 'DALL-E'], { fill: C.pale })}
  ${box(576, 105, 164, 94, '2022', ['ChatGPT', '扩散模型'], { fill: C.pale })}
  ${box(753, 105, 164, 94, '2023–24', ['多模态', '推理模型'], { fill: C.warm })}
  ${arrow(209, 152, 219, 152)}${arrow(386, 152, 396, 152)}${arrow(563, 152, 573, 152)}${arrow(740, 152, 750, 152)}
  ${lines(['模型开始在统一表示基础上处理更广泛的输入与输出。'], 480, 266, { size: 15, color: C.muted })}`);

diagrams[29] = developmentSlide('2012–现在 · 成功条件逐步汇合', '深度学习的发展不是由单一算法推动的', '大规模数据、学习模型、计算能力和领域知识共同决定实际效果。', 8, `
  ${box(45, 112, 190, 112, '大规模数据', ['覆盖任务变化', '质量与代表性'])}
  ${box(272, 112, 190, 112, '学习模型', ['结构与训练目标', '可扩展优化'], { fill: C.pale })}
  ${box(499, 112, 190, 112, '计算能力', ['并行硬件', '训练规模'])}
  ${box(726, 112, 190, 112, '领域知识', ['任务约束', '评价标准'], { fill: C.warm })}
  ${lines(['数据 × 模型 × 计算 × 领域知识'], 480, 276, { size: 16, color: C.green, weight: 650 })}`);

diagrams[30] = developmentSlide('现在与未来 · 特征学习和通用表示', '表示与任务输出联合优化，并继续走向迁移与多模态', '深度学习减少对人工特征设计的依赖，并进一步发展可迁移、多模态和受约束的系统能力。', 9, `
  ${lines(['传统方法'], 48, 124, { size: 14, color: C.muted, weight: 650, anchor: 'start' })}
  ${box(160, 91, 205, 76, '人工设计特征', ['颜色 · 纹理 · 形状'], { fill: C.warm, titleSize: 16 })}
  ${arrow(365, 129, 424, 129)}${box(427, 91, 170, 76, '任务模型', ['单独学习'], { fill: C.white, titleSize: 16 })}
  ${lines(['深度学习'], 48, 230, { size: 14, color: C.green, weight: 650, anchor: 'start' })}
  ${box(160, 197, 205, 76, '可学习表示', ['逐层形成特征'], { fill: C.pale, titleSize: 16 })}
  ${arrow(365, 235, 424, 235)}${box(427, 197, 170, 76, '任务输出', ['与表示联合优化'], { fill: C.pale, titleSize: 16 })}
  ${pill(660, 97, 110, '迁移学习')}${pill(785, 97, 110, '多模态')}${pill(660, 211, 235, '受约束的系统能力', true)}
  ${arrow(600, 235, 657, 235)}`);

for (let page = 1; page <= 30; page += 1) {
  if (selectedPage !== null && page !== selectedPage) continue;
  const outputPath = join(output, `${page}.svg`);
  if (diagrams[page]) writeFileSync(outputPath, diagrams[page], 'utf8');
  else rmSync(outputPath, { force: true });
}

if (selectedPage !== null) {
  console.log(`Generated introduction diagram ${selectedPage}.svg.`);
  process.exit(0);
}

// These vectors are the verified redraws for the remaining sections of lecture one.
// Keeping the source-page mapping here makes the imported visuals reproducible without
// exposing source references in the student-facing page.
const annDiagramPages = [
  31, 32, 34, 36, 40, 41, 42, 45, 47, 48, 51, 54, 56, 58, 60, 65,
  66, 67, 69, 70, 72, 73, 81, 84, 86, 93, 95, 97, 98, 100, 103, 104,
  105, 106, 110, 115, 117, 118, 120, 127,
  129, 130, 132, 133, 135, 136, 138, 140, 142, 145, 146, 147, 148, 149, 150, 151,
  153, 154, 155, 156, 157, 160, 164, 165,
];
const annSource = join(root, '..', 'AI工程学', 'site', 'public', 'diagrams', '1');
const annOutput = join(output, 'ann');
mkdirSync(annOutput, { recursive: true });
for (const sourcePage of annDiagramPages) {
  copyFileSync(join(annSource, `${sourcePage}.svg`), join(annOutput, `${sourcePage}.svg`));
}

console.log(`Generated ${diagrams.filter(Boolean).length} introduction diagrams and copied ${annDiagramPages.length} neural-network diagrams.`);
