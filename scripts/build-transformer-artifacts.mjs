import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sections, slides, sequences, videos, assetVersion } from './transformer-course-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, '..', 'AI工程学', '.course-build', '04-transformers');
mkdirSync(output, { recursive: true });
const manifest = JSON.parse(readFileSync(join(output, 'diagram-manifest.json'), 'utf8'));
const facts = JSON.parse(readFileSync(join(output, 'source-review.json'), 'utf8'));
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const writeJson = (name, value) => writeFileSync(join(output, name), JSON.stringify(value, null, 2) + '\n');
const writeMd = (name, lines) => writeFileSync(join(output, name), lines.join('\n') + '\n');
const itemsFor = section => slides.filter(slide => slide.section === section.id);
const sourcePages = section => itemsFor(section).flatMap(slide => slide.sourcePages);
assert.deepEqual(slides.flatMap(slide => slide.sourcePages), Array.from({ length: 183 }, (_, i) => i + 1));
assert.equal(facts.sha256, manifest.sourceSha256);

const presentation = ['# Transformer Models：演示模式脚本', '', '状态：`teaching-logic-revised`', '',
  '来源页仅用于内部核对；重复展开页合并为可控制的过程演示，保留原例和原数值。', ''];
for (const slide of slides) {
  presentation.push(`## ${slide.page}. ${slide.title}`, '',
    `- 稳定标识：${slide.id}`, `- 章节：${slide.topic} / ${slide.section}`,
    `- 副标题：${slide.caption}`, `- 讲解备注：${slide.note}`,
    `- 图解：\`diagrams/transformer/${slide.id}.svg\``,
    `- 内部来源页：${slide.sourcePages.join('、')}`);
  if (sequences[slide.id]) presentation.push(`- 分步过程：${sequences[slide.id].steps.map((step, i) => `${i + 1}. ${step}`).join('；')}`);
  if (videos[slide.id]) presentation.push(`- 原稿视频：\`media/transformer/${videos[slide.id].file}\`；手动播放，切换页面时暂停。`);
  presentation.push('');
}
writeMd('presentation-script.md', presentation);
writeJson('source-mapping.json', {
  schema: 'transformer-courseware-source-mapping/v2', sourceSha256: facts.sha256, assetVersion,
  sourceScope: { included: { start: 1, end: 183 }, excluded: { closingPage: [184] } },
  readingSections: sections.map(section => ({ ...section, sourcePages: sourcePages(section), presentationIds: itemsFor(section).map(slide => slide.id) })),
  presentationSlides: slides.map(slide => ({ id: slide.id, page: slide.page, title: slide.title, section: slide.section, topic: slide.topic, sourcePages: slide.sourcePages,
    visual: slide.visual, sequence: sequences[slide.id] || null, video: videos[slide.id] || null })),
});

writeMd('teaching-outline.md', [
  '# Transformer Models：教学思路核对', '', '状态：`teaching-logic-revised`', '',
  `当前版本为 ${sections.length} 个阅读小节、${slides.length} 个演示步骤；来源 1–183 严格按顺序各映射一次，第 184 页招聘与联系信息不进入课件。`, '',
  '## 原始教学链', '',
  '1. Seq2Seq 先说明输入与输出任务，再介绍 Transformer 来源与课程路线。自注意力从位置之间的相关性出发，依次讲打分、Q/K、归一化、V 汇总、下一个查询及并行。',
  '2. 单个查询之后，才写矩阵投影、分数矩阵、逐行 Softmax、AV 和缩放公式；保留 animal/it 的原例，再讲多个头、拼接及位置编码。',
  '3. 先比较 CNN 的局部先验与数据实验、RNN 的递推路径，再组装编码器；残差、FFN、Layer Norm、Pre/Post-LN 及统计轴按原次序展开。',
  '4. 解码器沿 START → 词表分布 → 反馈输出 → 长度未知 → END 推进，再解释因果遮罩及三种连接范围，随后比较 AR 与 NAR。',
  '5. 交叉注意力从 Q/K/V 两侧来源与逐词过程开始，保留语音软对齐和层间连接变体；随后才讲损失、右移目标与 Teacher Forcing。',
  '6. 推理保留原贪心反例和 13 帧束搜索树，再讲采样、BLEU 定义与猫句算例、评价指标优化、错误前缀反馈及 Scheduled Sampling；以完整结构收束。',
  '7. NLP 三种架构按 BERT、T5、GPT 展开。ViT 从图像分类任务进入切块、线性投影、位置、CLS、编码器、配置、性能与学习到的嵌入投影，最后由成本和固定尺度引出 Swin。',
  '8. Swin 保留层级、Patch Merging、窗口成本、移位与遮罩、相对位置偏置、配置及分类/密集预测实验。',
  '9. MoE 先讲组成、上下文相关分工和规模/效果证据，再从 FFN 转向专家路径、门控、密集与稀疏公式；路由塌缩引出 Noisy Top-k 及三种分配方法。',
  '10. 负载均衡按 Importance → CV → CV² 辅助损失 → 容量与溢出 → Switch 因子与辅助损失推进。保留设备均衡、动态偏置与消融、批次容量依赖、路由变体、细分专家、共享专家的相反实验、视觉优先路由及 Mixtral 的参数核算。', '',
  '## 阅读与演示映射', '', '| 阅读小节 | 来源页 | 演示步骤 |', '| --- | --- | --- |',
  ...sections.map(section => { const items = itemsFor(section), pages = sourcePages(section); return `| ${section.index}. ${section.title} | ${pages[0]}–${pages.at(-1)} | ${items[0].page}–${items.at(-1).page} |`; }), '',
  '## 补充与边界', '',
  '- 增补维度、因果遮罩的右移前提、数值计算和性能结论的实验条件，服务原主线。',
  '- 阅读图示紧随首次解释；小节入口和阅读/演示切换均定位当前小节。',
  '- 注意力数值、Noisy Top-k 固定噪声与容量简例标为说明性算例；来源中的束搜索路径、BLEU 句子、CV 向量与实验图保留。',
  '- 确认的公式、统计值和结论边界修正在 source-audit.json 中记录；不把猜测的 GPT-4 架构当作容量依赖的证明。',
  '- 动画只展示计算、因果可见范围、反馈路径、搜索树扩展、空间排列和容量变化。',
]);

writeMd('visual-requirements.md', [
  '# Transformer Models：视觉需求', '', '状态：`implemented`', '',
  '使用稳定 960×417 画布。原始实验、热图与教学图直接保留 PPTX 嵌入素材；可编辑的概念关系和计算过程采用原生图解。', '',
  '| 演示步骤 | 图解职责 | 来源页 | 处理 |', '| --- | --- | --- | --- |',
  ...slides.map(slide => `| ${slide.page} / ${slide.id} | ${slide.caption} | ${slide.sourcePages.join('、')} | ${Array.isArray(slide.visual) ? '保留原始素材' : '原生图解'}${sequences[slide.id] ? '；分步计算' : ''}${videos[slide.id] ? '；原稿视频' : ''} |`), '',
  '## 交互', '',
  ...Object.entries(sequences).map(([id, sequence]) => `- ${id}：${sequence.steps.length} 步；${sequence.steps.join(' → ')}。`),
  '- ViT 视频保留原素材的切块、展开和投影过程；展示裁切扩大至顶部 52%，保留线性投影和 token 标签，原 PPT 裁切另行记录。',
  '- 三个小型实验分别验证四个匹配分数的 Softmax/加权和、目标位置的可见前缀和四专家 Top-2 的选择/归一化。',
  '- 播放一遍后停止；支持暂停、前后单步、重播和放大。阅读及减少动态偏好下默认静止，视频由用户手动播放。', '',
  '## 响应式与无障碍', '',
  '- SVG 包含 title、desc 和 viewBox；复杂原图可独立放大查看。',
  '- 工具按钮使用 Lucide 图标、悬停提示和可访问名称；帧数、图形画布与按钮保持固定尺寸。',
  '- 图像整体缩放，长公式在局部滚动；页面在 390px 下不横向溢出。',
]);
writeMd('visual-audit.md', [
  '# Transformer Models：视觉审计', '', '状态：`implemented`', '',
  '| 内容 | 教学作用 | 核对与处理 |', '| --- | --- | --- |',
  '| 自注意力 | 单个查询到全序列矩阵 | Q/K 匹配与 V 汇总分开；共享投影从 X 分成并行三路；逐行归一化 |',
  '| 多头与位置 | 独立子空间与序列顺序 | 保留 2 头/7 头 animal、tired 连线及原位置编码图 |',
  '| 编码器与解码器 | 模块路径、残差和前缀可见性 | 显式残差分支；右移目标避免自泄漏；输出反馈到下一步输入 |',
  '| 束搜索 | 真实候选扩展、剪枝和回溯 | 原 13 帧树，累计分数不改；用来源对象坐标固定根位置和比例 |',
  '| ViT | 图像切块与学习到的表示 | 修正 1600×1100 封面的像素裁切；保留原视频；PCA 图对应嵌入滤波器，非预测图像 |',
  '| Swin | 层级、局部成本、循环移位与遮罩 | 保留原排列与分组；查询 8 屏蔽绕回区域的 6、2、0；保留分类、检测、分割结果 |',
  '| MoE | 路由、均衡、容量和系统核算 | 原曲线、消融和两个共享专家实验保留；数值、实际 token 比例与概率分开 |', '',
  `保留 ${manifest.assets.length} 个原图素材和 ${manifest.videos.length} 个原视频；原素材 SHA-256、对象关系和来源页保存在 diagram-manifest.json。`, '',
  '| 排除的辅助或错误素材 | 原因 |', '| --- | --- |',
  ...manifest.excludedMedia.map(item => `| ${item.file} | ${item.reason} |`), '',
  '全部 184 页使用 PDF 接触表核对版面，素材单独查看；不将背景、空白覆盖物或独立标签当作完整教学图。',
]);

const issue = (id, pages, action) => ({ id, pages, status: 'resolved', action });
writeJson('source-audit.json', {
  schema: 'transformer-courseware-source-audit/v2', sourceSha256: facts.sha256, reviewedOn: '2026-10-09',
  sources: ['AI工程学/PPT材料/Transformer Models.pptx', 'ai-engineering-course/pdf/Transformer Models.pdf'],
  issues: [
    issue('courseware-range', [184], '来源 1–183 为完整教学内容，184 招聘与联系结语仅留在内部事实层。'),
    issue('attention-matrix-orientation', [14, 15, 16, 17, 18], '统一每个位置占一行：Q/K 为 N×d_k，V 为 N×d_v，分数 QK^T 逐行归一化，输出 AV。保留先单查询、后矩阵、再缩放的顺序。'),
    issue('attention-position', [24], '未加入位置或相关结构时，自注意力对排列等变；通过位置向量恢复序列顺序，避免把所有注意力一概说成没有位置信息。'),
    issue('cnn-comparison', [25, 26, 27], '保留局部连接类比与原数据量实验；限定简化前提，不将 CNN 与注意力视为一般等价结构。'),
    issue('pre-post-ln-and-axes', [35, 36, 37], '保留 Pre/Post 残差路径差异，不作普遍训练稳定性结论；图像 C/H/W 统计轴与文本每 token 的 D 维 Layer Norm 分开。'),
    issue('causal-right-shift', [48, 49, 63], '训练目标右移一位后再加 j≤i 遮罩；同位置输入为前一个目标，避免自泄漏。'),
    issue('speech-alignment', [59], '原语音软对齐是 Listen, Attend and Spell 的跨序列注意力示例，不标成 Transformer 实验。'),
    issue('greedy-and-beam', [64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77], '贪心 A→B→A：0.144，另一条 B→B→B：0.324。保留原 13 帧树，最终 he hit me with a pie 的累计分数 −4.3；image340 为 k⁴ 注释，真实候选树是 image342。'),
    issue('bleu-example', [80], '候选 the cat sat on the mat，参考 the cat is on the mat：p1=5/6、p2=3/5、BP=1，二元等权 BLEU=sqrt(0.5)=0.70710678；纠正原稿 0.549。'),
    issue('t5-architecture', [88], '重画源序列双向 Encoder、目标因果 Decoder 与交叉注意力；来源中的循环单元图只作历史类比。'),
    issue('decoder-only-claims', [90], '保留任务格式与 KV cache 的设计讨论，性能优劣需依据任务和训练条件，不作绝对排名。'),
    issue('vit-video-crop', [93], '原封面/视频为 1600×1100。静态图裁出实际建筑照片；视频展示裁切 t=52000、r=1724，保留 token 与线性投影标签，原稿 t=67407 裁切另外保存；视频原字节不变。'),
    issue('vit-pca-and-patch-size', [102, 103], 'PCA 为 learned embedding filters 的主成分，非模型生成图像；patch 大小同时改变表示和 token 计算。边长减半使 token 数×4、全局分数项×16。'),
    issue('swin-shift', [110], '恢复原图 4×4 token，0 至 8 是区域编号，不能把区域压缩成单 token。循环移位后的 2×2 窗口为 [4,4,4,4]、[5,3,5,3]、[7,7,1,1]、[8,6,2,0]；相同编号可互读，Q8 对绕回的 6、2、0 加 −∞。'),
    issue('vision-results', [100, 112, 113, 114], '保留配置与性能图，结论限定原任务、数据和预算；分类、检测、分割分别说明。'),
    issue('moe-specialization-and-cost', [117, 120, 122, 128, 181], '专家分工随 token 与上下文变化，不等同人工领域分类。总参数、激活参数、FLOPs、存储、通信、吞吐与延迟分别解释。'),
    issue('noisy-topk', [145, 146, 147, 148], '固定噪声仅用于算例；先加噪、KeepTopK，再 Softmax。未选者为 −∞，权重为 0；加噪不单独保证负载均衡。'),
    issue('importance-cv', [153, 154, 155, 156], '统一采用总体标准差。向量 [.8,.2,.1,.05,.2]：μ=.27、σ=.2712932、CV≈1.005；[.3,.3,.2,.2,.3]：μ=.26、σ=.0489898、CV≈.188。辅助损失采用 CV²，纠正原统计/舍入值。'),
    issue('switch-loss-sum', [164], '补全专家求和 Laux=αE∑i f_i p_i；f_i 是实际 token 分配比例，p_i 是平均路由概率。'),
    issue('auxiliary-loss-free-boundary', [166, 167, 168], '动态偏置按实际负载更新。DeepSeek-V3 的主均衡方案仍保留序列级辅助约束，不称为完全没有任何辅助项。'),
    issue('batch-capacity-dependence', [168], '按同批 token 占用有限槽位解释依赖性；删除未证实的 GPT-4 MoE 架构猜测。'),
    issue('shared-expert-comparison', [172, 173], '保留 DeepSeek 分离共享专家与 OLMoE 相反结果，实验条件不同，不推广为共享专家普遍有益或普遍无益。'),
    issue('mixtral-accounting', [180, 181, 182], '8x7B 含共享部分，不是八个完整独立 7B。每专家约 5.6B，总约 46.7B，Top-2 每 token 约激活 12.8B；速度结论限定实测硬件与实现。'),
  ],
  externalVerification: [
    { pages: [102], url: 'https://arxiv.org/html/2010.11929', reason: 'ViT 论文中 learned embedding filters 的主成分与位置嵌入解释。' },
    { pages: [173], url: 'https://arxiv.org/html/2409.02060v2', reason: 'OLMoE 共享专家消融的原始实验及与 DeepSeek 条件的区别。' },
  ],
});
writeJson('cross-page-relations.json', {
  schema: 'transformer-courseware-relations/v2', sourceSha256: facts.sha256,
  chains: [[5, 18, '单查询 → 全序列矩阵 → 缩放'], [38, 51, '预测与反馈 → 停止 → 因果可见性'],
    [65, 77, '同一束搜索树的 13 个渐进状态'], [91, 103, '图像任务 → token 化 → 组装 → 实验 → 成本'],
    [104, 114, '层级与窗口 → 跨窗口交互 → 实验'], [134, 164, 'FFN 替换 → 稀疏路由 → 塌缩 → 均衡 → 容量 → Switch']]
    .map(([start, end, relation]) => ({ sourcePages: [start, end], relation, presentationIds: slides.filter(s => s.sourcePages.some(p => p >= start && p <= end)).map(s => s.id) })),
});

let validation;
try { validation = JSON.parse(readFileSync(join(output, 'browser-validation.json'), 'utf8')); } catch { /* First build precedes browser validation. */ }
const validated = validation?.sourceSha256 === facts.sha256 && validation?.presentationChecks === slides.length * 3
  && Object.entries(validation.fileHashes || {}).length > 0
  && Object.entries(validation.fileHashes).every(([path, expected]) => hash(join(root, path)) === expected);
writeMd('implementation-report.md', [
  '# Transformer Models：实现报告', '', `状态：\`${validated ? 'validated' : 'implemented-validation-pending'}\``, '',
  `完整继承来源 1–183 的教学顺序，提供 ${sections.length} 个阅读小节、${slides.length} 个演示步骤、${Object.keys(sequences).length} 组过程演示、原稿切块视频和 3 个数值实验。`, '',
  '## 维护入口', '',
  '- reading-content.md：正文与紧随解释的图示标记。',
  '- scripts/transformer-course-data.mjs：步骤、备注、来源、原素材、计算与动画状态。',
  '- scripts/extract-transformer-facts.py：解析顺序、文字、备注、公式、对象、裁切、媒体关系及 SHA-256。',
  '- scripts/generate-transformer-diagrams.mjs：生成自包含图解和动画帧，提取原视频。',
  '- scripts/build-transformer-artifacts.mjs：生成当前来源映射、讲解脚本、审计及验证记录。',
  '- scripts/build-transformer-page.mjs：构建 HTML，保留独立 runtime 与样式。',
  '- transformer-models.js / transformer-content.css：播放、导航、实验与响应式布局。', '',
  '## 验收', '',
  validated ? `${validation.presentationChecks} 次页面、${validation.animationChecks} 个动画状态和 ${validation.videoChecks.length} 个视频采样检查通过；桌面、平板、手机均无页面溢出、空图或运行错误。详细记录见 browser-validation.json。` : '浏览器验收结果尚未匹配当前文件；运行验证脚本后重新生成记录。',
  '数值校验包含 Softmax、遮罩、BLEU、CV、贪心路径、patch 数与二次成本、容量和 Top-2 权重；另外检查节级导航、暂停/重播、减少动态偏好、图片放大及 file:// 直接打开。',
]);
writeMd('validation-report.md', [
  '# Transformer Models：验收记录', '', `状态：\`${validated ? 'passed' : 'pending-current-browser-run'}\``, '',
  `来源 SHA-256：\`${facts.sha256}\`。`, '',
  validated ? `122 步 × 3 种宽度（1440、1024、390px），共 ${validation.presentationChecks} 次显示检查；9 组共 45 个状态 × 3 种宽度，共 ${validation.animationChecks} 次动画检查；${validation.videoChecks.length} 次视频关键帧检查。` : '当前文件等待浏览器验证。', '',
  '- 来源顺序严格为 1–183，无遗漏或重排；184 为非教学结语。',
  '- 原素材逐项验证 SHA-256 与实际展示对象关系；束搜索逐帧对应正确来源。',
  '- 阅读/演示小节、URL 恢复、首末页、播放暂停、前后单步、重播及切页暂停。',
  '- 所有阅读图示、公式、演示图形像素、文字边界和页面宽度。',
  '- 注意力、因果遮罩、Top-2 三个实验与数值校验。',
  '- 原视频变化、展示宽度、裁切、暂停与移动显示；静态 HTML 直接打开。',
  '- 自定义绘图和原素材经人工视觉复核；浏览器结果与当前文件哈希绑定。',
]);
writeMd('README.md', [
  '# 第四讲构建记录', '', '来源：`PPT材料/Transformer Models.pptx`；PDF 只用于辅助视觉核对。', '',
  '当前权威来源层为 source-review.json；正文、数据、来源映射、脚本和审计组成维护源。旧 extract-facts.mjs / fact-index.json / asset-index.json 为首次构建存档，当前构建不依赖它们。', '',
  '从工作区根目录运行：', '', '```sh',
  'python3 ai-engineering-course/scripts/extract-transformer-facts.py',
  'node ai-engineering-course/scripts/generate-transformer-diagrams.mjs',
  'node ai-engineering-course/scripts/build-transformer-page.mjs',
  'node ai-engineering-course/scripts/validate-transformer-page.mjs',
  'node ai-engineering-course/scripts/build-transformer-artifacts.mjs', '```', '',
  '验证脚本启动并关闭临时服务与无头 Chrome，无需常驻服务器。学生页面也可直接以本地 HTML 打开。', '',
  `来源 1–183 映射为 ${sections.length} 节、${slides.length} 步；原素材 ${manifest.assets.length} 个、原视频 ${manifest.videos.length} 个。来源 184 只留在内部事实层。`,
]);
console.log(`Built current ${slides.length}-step mappings, ${sections.length} sections, source audit and ${validated ? 'validated' : 'pending'} verification records.`);
