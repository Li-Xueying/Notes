import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sections, slides, sequences } from './rnn-course-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, '..', 'AI工程学', '.course-build', '03-rnns-lstms');
mkdirSync(output, { recursive: true });

const presentation = [
  '# RNNs and LSTMs：演示模式脚本',
  '',
  '状态：`teaching-logic-revised`',
  '',
  '学生界面不显示内部来源页；来源页只用于事实核对和回溯。',
  '',
];
for (const slide of slides) {
  presentation.push(`## ${slide.page}. ${slide.title}`);
  presentation.push('');
  presentation.push(`- 稳定标识：${slide.id}`);
  presentation.push(`- 章节：${slide.topic} / ${slide.section}`);
  presentation.push(`- 副标题：${slide.caption}`);
  presentation.push(`- 讲解备注：${slide.note}`);
  presentation.push(`- 图解：\`diagrams/rnn/${slide.id}.svg\``);
  if (sequences[slide.id]) presentation.push(`- 计算演示：${sequences[slide.id].steps.map((step,i)=>`${i+1}. ${step}`).join('；')}`);
  presentation.push(`- 内部来源页：${slide.sourcePages.join('、')}`);
  presentation.push('');
}
writeFileSync(join(output, 'presentation-script.md'), `${presentation.join('\n')}\n`);

const manifest = JSON.parse(readFileSync(join(output,'diagram-manifest.json'),'utf8'));
const sourceMapping = {
  schema: 'rnn-lstm-courseware-source-mapping/v2',
  sourceSha256: manifest.sourceSha256,
  sourceScope: { included: { start: 1, end: 136 }, excluded: { hiddenSupplement: [137, 157], closingPage: [158] } },
  readingSections: sections.map((section) => ({
    id: section.id,
    title: section.title,
    topic: section.topic,
    sourcePages: slides.filter(slide=>slide.section===section.id).flatMap(slide=>slide.sourcePages),
  })),
  presentationSlides: slides.map((slide) => ({
    id: slide.id,
    page: slide.page,
    title: slide.title,
    topic: slide.topic,
    sourcePages: slide.sourcePages,
  })),
};
writeFileSync(join(output, 'source-mapping.json'), `${JSON.stringify(sourceMapping, null, 2)}\n`);

const outline = [
  '# RNNs and LSTMs：教学思路核对', '',
  '状态：`teaching-logic-revised`。本文件、reading-content.md 与 source-mapping.json 共同维护当前课件；旧版 40 页结构已由 91 个步骤替代。', '',
  '## 原始教学链', '',
  '1. 从前馈图像分类转到有顺序、中间结果和变长输入的序列任务；先解决离散词如何表示。',
  '2. 按“向量方案 → 余弦比较 → 语义问题 → 独热局限 → 稠密查表与特征”的次序引出表示学习。',
  '3. 分布式语义提供训练信号；CBOW 与 Skip-gram 定义任务；窗口、似然、负对数、双向量和 Softmax 依次展开。先讲 SGD 参数，再讲词表成本、负采样、抽样和稀疏更新。',
  '4. 多义词暴露一词一向量的局限，提出上下文聚类与多向量；再进入下一词预测的任务与应用。固定窗口的局限引出共享参数的循环状态。',
  '5. RNN 按嵌入、递推和输出分布展开；训练逐词损失，沿时间反传并累加共享参数贡献。分别介绍消失、爆炸、裁剪和长期保留问题。',
  '6. LSTM 先比较单元、区分 c/h、解释动态门，再看完整图与等价公式。四步更新各有原图和公式，GRU 随后作为变体。',
  '7. 机器翻译先定义任务，再讲规则系统、统计分解、平行语料、各类对齐、潜变量学习、Viterbi 与工程复杂性；此后才引出 NMT。',
  '8. Seq2Seq 先看原例、通用任务、条件语言模型和训练；再按贪心失误、穷举成本、束搜索规则、13 帧原例、终止及长度校正展开。',
  '9. NMT 优势与限制在 BLEU 之前；历史性能图之后逐个保留常识/习语、偏差和异常行为的实际例子，再转入注意力。',
  '10. 注意力严格按“固定向量瓶颈 → 直接访问直觉 → 12 帧过程 → 公式 → 作用 → 软对齐 → 打分变体”推进。', '',
  '## 阅读与演示映射', '',
  '| 阅读小节 | 原始范围 | 演示步骤 |',
  '| --- | --- | --- |',
  ...sections.map(section=>{const items=slides.filter(slide=>slide.section===section.id);const pages=items.flatMap(slide=>slide.sourcePages);return `| ${section.index}. ${section.title} | ${pages[0]}–${pages.at(-1)} | ${items[0].page}–${items.at(-1).page} |`;}), '',
  '## 补充与边界', '',
  '- 补充变量含义、维度、负采样与裁剪的适用条件，以及 LSTM 的小型数值算例，服务现有讲解。',
  '- 不展开完整 SMT 实现、现代语言模型或下一讲 Transformer 的细节。',
  '- 读取全部 158 页作为事实层；公开内容为 1–136，隐藏 137–157 与结语 158 排除。',
  '- 学生界面隐藏来源信息；原图导入的页脚编号采用局部裁切，不删教学标签。',
  '- 阅读图示紧跟首次解释；节级入口、切换模式、分享链接与历史恢复均定位当前小节。',
  '- 动画只表现真实计算关系，不做无意义变色、闪烁或文字替换。', '',
];
writeFileSync(join(output,'teaching-outline.md'),outline.join('\n'));

const visualRequirements = [
  '# RNNs and LSTMs：视觉需求',
  '',
  '状态：`implemented`',
  '',
  '图解统一使用 960×417 稳定画布。完整的原始教学图直接使用 PPTX 嵌入素材；概念、公式与补充计算采用原生图解。动画只呈现窗口移动、状态传递、实际计算、候选扩展及关注路径变化。',
  '',
  '| 演示页 | 图解职责 | 来源页 | 决策 |',
  '| --- | --- | --- | --- |',
  ...slides.map((slide) => `| ${slide.page} / ${slide.id} | ${slide.caption} | ${slide.sourcePages.join('、')} | ${Array.isArray(slide.visual)?'保留原始教学图':'原生图解'}${sequences[slide.id]?'；计算过程演示':''} |`),
  '',
  '## 交互',
  '',
  '- 词向量实验：使用原三维表的数值计算余弦，不用虚构近邻数值替代原示例。',
  '- Skip-gram：窗口实际右移，中心与上下文词对同时改变。',
  '- RNN：原例 token 逐步进入同一共享计算图，状态路径逐步展开。',
  '- LSTM：补充固定门值的数值例子，依次产生保留项、写入项、细胞和输出。',
  '- 束搜索：保留来源 92–104 的 13 个候选树状态与原累计分数。',
  '- 注意力：保留来源 120–131 的 12 个图解状态，在公式之前展示。',
  '- 动画可播放、暂停、逐步前后和重播；阅读默认静止，减少动态偏好下演示也默认静止。',
  '',
  '## 无障碍与响应式',
  '',
  '- 每个 SVG 包含 `title`、`desc` 与稳定 `viewBox`。',
  '- 图中文字控制为短标签，详细解释由相邻正文和演示备注承担。',
  '- 390px 宽度下图解整体缩放，公式块允许内部横向滚动，页面本身不得横向滚动。',
];
writeFileSync(join(output, 'visual-requirements.md'), `${visualRequirements.join('\n')}\n`);

const audit = [
  '# RNNs and LSTMs：视觉审计',
  '',
  '状态：`implemented`',
  '',
  '| 内容组 | 独特教学作用 | 决策 | 语义检查 |',
  '| --- | --- | --- | --- |',
  '| 词表示与 Word2Vec | 原向量与上下文示例；窗口与抽样计算 | 原图 + 原生图解 | 两种角色、任务方向、负号与稀疏数量保持明确 |',
  '| RNN 与 BPTT | 展开时间、共享参数、累加梯度 | 原图 + 逐步展开 | 用原 token；避免以解释文字替代实际状态图 |',
  '| LSTM 四步 | 门、乘法、细胞加法、输出分路 | 原始四步图 + 完整图 + 数值演示 | 输出严格经过 tanh(c) 和输出门，不能把所有门直接连到细胞 |',
  '| 对齐与 Seq2Seq | 空对应、多对一、一对多、多对多 | 原始例图 | 保留 entarté 与后续 he hit me with a pie 的连续性 |',
  '| 束搜索 | 真实树的扩展、全局剪枝、回溯 | 原 13 帧逐步演示 | 累计分数完全沿用原例；结束列表单独说明 |',
  '| Attention | 打分、分布、上下文、下一步重算 | 原 12 帧逐步演示后接公式 | 先图后式；保留软对齐；修正维度与符号 |',
  '',
  `保留 ${manifest.assets.length} 个 PPTX 原始教学素材，输出到 media/rnn，并嵌入自包含 SVG。diagram-manifest.json 记录原资产哈希与来源。`,
  '排除白色/黄色覆盖块、品牌背景和不完整的 GIF 初始帧；不把辅助对象当成独立教学图。',
];
writeFileSync(join(output, 'visual-audit.md'), `${audit.join('\n')}\n`);

console.log(`Built the ${slides.length}-slide presentation script, source mapping, and visual specifications.`);
