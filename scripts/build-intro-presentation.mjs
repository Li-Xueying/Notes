import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { slides, topicStarts, topicNames } from './intro-presentation-data.mjs';
import { renderView } from './intro-presentation-views.mjs';

const out = fileURLToPath(new URL('../../AI工程学/.course-build/01-neural-networks/', import.meta.url));
const htmlPath = fileURLToPath(new URL('../intro-overview.html', import.meta.url));
const html = readFileSync(htmlPath, 'utf8');
const readingFigures = [...html.matchAll(/data-reading-slide="([^"]+)"/g)].map((match) => {
  const slide = slides.find((item) => item.id === match[1]);
  if (!slide) throw new Error(`Unknown reading figure: ${match[1]}`);
  return { id: slide.id, readingTopic: slide.topic, sourcePages: slide.sourcePages, visual: slide.view.type };
});
mkdirSync(out, { recursive: true });
const mapping = slides.map((slide, index) => ({ page: index + 1, id: slide.id, readingTopic: slide.topic, sourcePages: slide.sourcePages, title: slide.title, visual: slide.view.type, visualAsset: slide.view.path || null }));
writeFileSync(`${out}source-mapping.json`, `${JSON.stringify({ topicStarts, readingFigures, slides: mapping }, null, 2)}\n`);
const countedHtml = html.replace(/(<span class="intro-page-count">)[^<]+/, (_, prefix) => `${prefix}${Object.keys(topicNames).length} 条线索 · ${slides.length} 个演示步骤`)
  .replace(/(<small id="slide-total">)[^<]+/, (_, prefix) => `${prefix} / ${slides.length}`)
  .replace(/(<span id="slide-counter">)[^<]+/, (_, prefix) => `${prefix}1 / ${slides.length}`);
if (countedHtml !== html) writeFileSync(htmlPath, countedHtml);
writeFileSync(`${out}presentation-script.md`, '# 第一讲演示脚本\n\n' + slides.map((slide, index) => `## ${index + 1}. ${slide.title}\n\n- 小节：${topicNames[slide.topic]}（${slide.topic}）\n- 聚焦：${slide.caption}\n- 讲解：${slide.note}\n- 视觉：${slide.view.type}${slide.view.path ? ` / ${slide.view.path}` : ''}\n- 内部来源：${slide.sourcePages.join(', ')}\n`).join('\n'));
const originalAssets = {
  'media/intro/presentation/mango.png': { sourcePage: 3, sourcePart: 'ppt/media/image7.png', disposition: '保留原图' },
  'media/intro/presentation/neuron-model.jpg': { sourcePage: 32, sourcePart: 'ppt/media/image94.jpg', disposition: '保留生物神经元与数学模型原图' },
  'media/intro/presentation/development-directions.png': { sourcePage: 29, sourcePart: 'ppt/media/image91.png', disposition: '保留层次表示、上下文与领域知识的发展关系图' },
  'media/intro/presentation/linear-input.jpg': { sourcePage: 36, sourcePart: 'ppt/media/image100.jpg', crop: { x: 0, y: 212, width: 289, height: 284 }, disposition: '保留输入照片，重绘数值计算' },
  'media/intro/presentation/linear-boundary.jpg': { sourcePage: 40, sourcePart: 'ppt/media/image104.jpg', disposition: '保留线性分数的几何解释原图' },
  'media/intro/presentation/commute-regression.png': { sourcePage: 60, sourcePart: 'ppt/media/image125.png', disposition: '保留通勤观测、地图与设计矩阵原图' },
  'media/intro/presentation/annotation.gif': { sourcePage: 153, sourcePart: 'ppt/media/image354.GIF', disposition: '保留原动画' },
  'media/intro/presentation/breast-ultrasound.png': { sourcePage: 151, sourcePart: 'ppt/media/image341.png', disposition: '保留乳腺超声原图' },
  'media/intro/presentation/breast-mask.png': { sourcePage: 151, sourcePart: 'ppt/media/image338.png', disposition: '保留与超声图配对的区域掩码' },
  'media/intro/media1.mp4': { sourcePage: 14, sourcePart: 'ppt/media/media1.mp4', disposition: '保留原视频' },
};
const manifest = slides.map((slide, index) => ({
  page: index + 1,
  id: slide.id,
  sourcePages: slide.sourcePages,
  teachingPurpose: slide.caption,
  observation: slide.note,
  renderingSource: 'ai-engineering-course/scripts/intro-presentation-views.mjs',
  view: slide.view.type,
  assets: [...renderView(slide.view).matchAll(/src="([^"?]+)(?:\?[^"]*)?"/g)].map((match) => ({ path: match[1], ...(originalAssets[match[1]] || { disposition: '复用已核对的阅读图解', renderingSource: 'ai-engineering-course/scripts/generate-intro-diagrams.mjs' }) })),
}));
writeFileSync(`${out}diagram-manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Built ${slides.length} presentation pages across ${Object.keys(topicStarts).length} reading topics.`);
