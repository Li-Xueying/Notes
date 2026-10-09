import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sections, slides, assetVersion, topicForSection, topicTitles, windowAnimations } from './cnn-course-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = join(root, '..', 'AI工程学', '.course-build', '02-cnns', 'reading-content.md');
const source = readFileSync(sourcePath, 'utf8').replaceAll('\r\n', '\n');

const sectionByTitle = new Map(sections.map((entry, index) => [entry[0], { id: entry[1], topic: entry[2], index: index + 1 }]));
const chapterMeta = {
  'cnn-foundations': ['卷积神经网络', 'CONVOLUTIONAL NETWORKS', '01'],
  'cnn-training': ['CNN 训练', 'BACKPROPAGATION', '02'],
  'cnn-architectures': ['经典 CNN 架构', 'ARCHITECTURES', '03'],
};

const escapeHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const escapeAttr = (value) => escapeHtml(value).replaceAll('"', '&quot;');
const icon = name => readFileSync(join(root, 'vendor', 'lucide', 'icons', `${name}.svg`), 'utf8').replace('<svg', '<svg aria-hidden="true" focusable="false"');
const animationTemplates = Object.keys(windowAnimations).map(id => `<template id="cnn-window-${id}">${readFileSync(join(root, 'diagrams', 'cnn', `${id}.svg`), 'utf8')}</template>`).join('');
const windowButton = (action, label, name) => `<button type="button" class="cnn-animation-button" data-window-action="${action}" aria-label="${label}" data-tooltip="${label}">${icon(name)}</button>`;
const windowControls = `<div id="slide-window-controls" class="cnn-animation-controls" role="group" aria-label="窗口计算演示" hidden>${windowButton('previous', '上一个窗口', 'step-back')}<button type="button" class="cnn-animation-button" data-window-action="play" aria-label="暂停" data-tooltip="暂停"><span data-window-icon="play" hidden>${icon('play')}</span><span data-window-icon="pause">${icon('pause')}</span></button>${windowButton('next', '下一个窗口', 'step-forward')}${windowButton('replay', '从头重播', 'rotate-ccw')}<span id="slide-window-counter" class="cnn-window-counter">窗口 1 / 5</span></div>`;
const inline = (raw) => {
  const plain = value => escapeHtml(value).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const parts = [];
  let last = 0;
  for (const match of raw.matchAll(/\(([^()]*)\)/g)) {
    parts.push(plain(raw.slice(last, match.index)));
    const tex = match[1];
    parts.push(/[\\_^=]|\b(?:times|mathbb|text|operatorname|partial|Delta)\b/.test(tex)
      ? `<span class="cnn-inline-math" data-tex="${escapeAttr(tex)}">${escapeHtml(tex)}</span>`
      : plain(match[0]));
    last = match.index + match[0].length;
  }
  parts.push(plain(raw.slice(last)));
  return parts.join('');
};

const figureHtml = (id) => {
  const item = slides.find(slide => slide.id === id);
  if (!item) throw new Error(`Unknown figure: ${id}`);
  if (item.section !== activeSection?.id) throw new Error(`Figure ${id} is in the wrong section`);
  const src = `diagrams/cnn/${id}.svg?v=${assetVersion}`;
  const motion = item.motion ? `<details class="cnn-reading-motion"><summary>动态观察：${escapeHtml(item.caption)}</summary><img src="media/cnn/${escapeAttr(item.motion)}" loading="lazy" alt="${escapeAttr(item.note)}" /></details>` : '';
  return `<figure class="intro-visual"><a class="cnn-figure-link" href="${src}" target="_blank" rel="noopener" aria-label="放大：${escapeAttr(item.title)}"><img src="${src}" width="960" height="417" loading="lazy" alt="${escapeAttr(item.title+'。'+item.caption)}" /></a><figcaption>${escapeHtml(item.caption)}</figcaption>${motion}</figure>`;
};

const sizeLab = `<div class="cnn-lab" id="cnn-size-lab"><div class="cnn-lab-heading"><div><span>参数实验</span><h3>卷积输出尺寸</h3></div><output id="cnn-size-output">3</output></div><div class="cnn-size-controls"><label>输入 W<sub>in</sub><input type="number" min="1" max="64" value="5" data-size-input="input" /></label><label>核 K<input type="number" min="1" max="15" value="3" data-size-input="kernel" /></label><label>填充 P<input type="number" min="0" max="10" value="1" data-size-input="padding" /></label><label>步幅 S<input type="number" min="1" max="10" value="2" data-size-input="stride" /></label></div><div class="cnn-lab-formula" id="cnn-size-formula">⌊(5 + 2×1 − 3) / 2⌋ + 1 = 3</div><p id="cnn-size-message">窗口可以在扩展后的输入上产生 3 个有效位置。</p></div>`;
const gradientLab = `<div class="cnn-lab cnn-gradient-lab" id="cnn-gradient-lab"><div class="cnn-lab-heading"><div><span>四态推导</span><h3>步幅 2 的输入梯度</h3></div><b id="gradient-state-index">1 / 4</b></div><div class="cnn-segmented" role="group" aria-label="反向传播推导步骤"><button class="active" type="button" data-gradient-state="0">原梯度</button><button type="button" data-gradient-state="1">插零</button><button type="button" data-gradient-state="2">填充</button><button type="button" data-gradient-state="3">核旋转</button></div><div class="cnn-gradient-stage"><div><h4 id="gradient-state-title">原始输出梯度</h4><div class="cnn-matrix" id="gradient-state-matrix" aria-live="polite"></div></div><div class="cnn-gradient-copy"><p id="gradient-state-copy">输出是 2×2，每个位置对应一个步幅为 2 的前向窗口。</p><code id="gradient-state-formula">G ∈ R^(2×2)</code></div></div></div>`;

const lines = source.split('\n');
let html = '';
let paragraph = [];
let listType = '';
let inFormula = false;
let formulaLines = [];
let activeSection = null;
let activeChapter = '';
let sectionOpen = false;

const flushParagraph = () => {
  if (!paragraph.length) return;
  html += `<p>${inline(paragraph.join(' '))}</p>`;
  paragraph = [];
};
const closeList = () => {
  if (!listType) return;
  html += `</${listType}>`;
  listType = '';
};
const closeSection = () => {
  flushParagraph();
  closeList();
  if (!sectionOpen) return;
  if (activeSection.id === 'cnn-spatial') html += sizeLab;
  if (activeSection.id === 'cnn-stride-gradient') html += gradientLab;
  html += '</section>';
  sectionOpen = false;
};

for (let index = 1; index < lines.length; index += 1) {
  const line = lines[index];
  if (inFormula) {
    if (line.trim() === '$$') {
      const tex = formulaLines.join('\n').trim();
      html += `<div class="cnn-equation" data-tex="${escapeAttr(tex)}"><pre>${escapeHtml(tex)}</pre></div>`;
      formulaLines = [];
      inFormula = false;
    } else formulaLines.push(line);
    continue;
  }
  if (line.trim() === '$$') {
    flushParagraph();
    closeList();
    inFormula = true;
    continue;
  }
  if (line.startsWith('## ')) {
    closeSection();
    const label = line.replace(/^##\s+/, '').replace(/^[一二三]、/, '');
    const topic = Object.entries(chapterMeta).find(([, meta]) => meta[0] === label)?.[0];
    if (topic) activeChapter = topic;
    continue;
  }
  if (line.startsWith('### ')) {
    closeSection();
    const title = line.replace(/^###\s+\d+\.\s*/, '').trim();
    activeSection = sectionByTitle.get(title);
    if (!activeSection) throw new Error(`Unknown section heading: ${title}`);
    const chapter = chapterMeta[activeChapter];
    html += `<section class="intro-topic cnn-topic" id="${activeSection.id}" data-topic="${activeSection.topic}">`;
    html += `<div class="article-section-label"><span>${chapter[0]} / ${String(activeSection.index).padStart(2, '0')}</span><button type="button" data-present-section="${activeSection.id}">▷ 演示本节</button></div>`;
    html += `<h2>${escapeHtml(title)}</h2>`;
    sectionOpen = true;
    continue;
  }
  if (line.startsWith('#### ')) {
    flushParagraph();
    closeList();
    html += `<h3>${inline(line.slice(5).trim())}</h3>`;
    continue;
  }
  const ordered = line.match(/^\d+\.\s+(.+)/);
  const figure = line.match(/^<!-- figure: ([a-z0-9-]+) -->$/);
  if (figure) {
    flushParagraph();
    closeList();
    html += figureHtml(figure[1]);
    continue;
  }
  const unordered = line.match(/^-\s+(.+)/);
  if (ordered || unordered) {
    flushParagraph();
    const nextType = ordered ? 'ol' : 'ul';
    if (listType !== nextType) { closeList(); listType = nextType; html += `<${listType}>`; }
    html += `<li>${inline((ordered || unordered)[1])}</li>`;
    continue;
  }
  if (!line.trim()) {
    flushParagraph();
    closeList();
    continue;
  }
  paragraph.push(line.trim());
}
closeSection();

const courseData = {
  assetVersion, topicTitles, windowAnimations,
  sections: sections.map(([title,id,topic]) => ({title,id,topic})),
  slides: slides.map(({id,section,title,caption,note,motion}) => ({id,section,title,caption,note,motion,topic:topicForSection[section]})),
};
const sectionToc = sections.map(([title,id]) => `<a href="#${id}" data-section-link="${id}">${escapeHtml(title)}</a>`).join('');
const document = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="AI 工程学第二讲：卷积神经网络、CNN 训练与经典架构。" />
    <title>卷积神经网络与图像识别 · AI 工程学</title>
    <link rel="stylesheet" href="vendor/katex/katex.min.css" />
    <link rel="stylesheet" href="styles.css" />
    <link rel="stylesheet" href="cnn-content.css?v=${assetVersion}" />
  </head>
  <body class="intro-page cnn-page">
    <a class="skip-link" href="#main-content">跳转至正文</a>
    <header class="site-header">
      <a class="brand" href="index.html" aria-label="AI 工程学课程首页"><span class="brand-mark" aria-hidden="true">⌬</span><span>AI 工程学<small>AI ENGINEERING</small></span></a>
      <nav class="header-nav" aria-label="网站导航"><a href="index.html">课程概览</a><a class="current" href="lectures.html">课程讲义</a><a href="downloads.html">下载课件（PDF）</a><span class="institution">⌂　上海创智学院</span></nav>
      <button class="mobile-menu" type="button" aria-label="打开导航" aria-expanded="false">☰</button>
    </header>
    <div class="app-shell">
      <aside class="sidebar" aria-label="课程目录">
        <div class="sidebar-heading">课程讲义 <span>LECTURES</span></div>
        <a class="overview-link" href="lectures.html">◈　课程讲义目录</a>
        <div class="nav-part intro-sidebar-nav"><p>第二讲 <span>VISION</span></p><a href="intro-overview.html#topic-mango"><b>01</b>人工神经网络基础</a><a class="active" href="#cnn-classification"><b>02</b>CNN 与图像识别</a><a href="rnn-lstm-sequence-modeling.html#rnn-sequence-data"><b>03</b>RNN 与 LSTM</a><a href="transformer-models.html#tf-qkv"><b>04</b>Transformer 模型</a><a href="lectures.html#lecture-5"><b>05</b>自监督学习</a></div>
        <a class="sidebar-resource" href="index.html#assessment">课程考核</a><a class="sidebar-resource" href="index.html#faculty">授课团队</a><a class="sidebar-resource download-resource" href="downloads.html">↓　下载课件</a><div class="sidebar-footer">上海创智学院 <span>2026 秋季</span></div>
      </aside>
      <div class="site-body">
        <div class="breadcrumb"><span>AI 工程学　›　第二讲　›　卷积神经网络与图像识别</span><span>CNNs and Image Recognition</span></div>
        <main id="main-content" class="reading-layout intro-reading-layout">
          <div class="home-content">
            <header class="course-intro intro-lecture-header"><div class="eyebrow"><i></i>第二讲 · 卷积神经网络与图像识别</div><h1>卷积神经网络与图像识别</h1><p class="english-title">CNNs and Image Recognition</p><p class="intro-copy">从图像分类的任务与变换要求出发，理解全连接方案的困难；逐步学习卷积网络的组成、训练与经典架构。</p><div class="intro-modebar" role="tablist" aria-label="讲义模式"><button class="button primary" type="button" role="tab" aria-selected="true" data-mode-button="read">▣ 阅读模式</button><button class="button secondary" type="button" role="tab" aria-selected="false" data-mode-button="slides">▷ 演示模式</button><span class="intro-page-count">3 个章节 · ${sections.length} 个主题 · ${slides.length} 个演示步骤</span></div></header>
            <div id="read-mode" class="intro-mode-panel" role="tabpanel">${html}</div>
            <div id="slides-mode" class="intro-mode-panel intro-slides-panel" role="tabpanel" hidden>
              <header class="intro-slide-heading"><div><div class="eyebrow"><i></i><span id="slide-topic">卷积神经网络</span></div><h2 id="slide-title">CNNs and Image Recognition</h2><p id="slide-caption">从局部计算到深层视觉网络</p></div><div class="intro-slide-number"><b id="slide-page">01</b><span id="slide-total"> / ${slides.length}</span></div></header>
              <div class="intro-slide-image"><a class="cnn-figure-link" id="slide-image-link" href="diagrams/cnn/title.svg?v=${assetVersion}" target="_blank" rel="noopener" aria-label="放大当前图解"><img id="slide-image" src="diagrams/cnn/title.svg?v=${assetVersion}" width="960" height="417" alt="CNNs and Image Recognition。从局部计算到深层视觉网络" /><div id="slide-window-stage" hidden></div></a></div>
              ${windowControls}
              <p class="intro-slide-note" id="slide-note">本讲从前向结构进入反向传播，再比较经典网络的设计选择。</p>
              <div class="intro-source-media" id="slide-media" hidden></div>
              <div class="intro-slide-progress" aria-hidden="true"><span id="slide-progress"></span></div>
              <div class="intro-slide-controls"><button class="button secondary" id="previous-slide" type="button">← 上一页</button><span id="slide-counter">1 / ${slides.length}</span><button class="button primary" id="next-slide" type="button">下一页 →</button></div>
              <div class="intro-slide-footer"><button class="button secondary" id="read-current" type="button">▣ 阅读本节</button><button class="button secondary" id="copy-slide-link" type="button">复制当前位置</button></div>
            </div>
            <footer class="page-footer"><span>AI 工程学 · 第二讲</span><span><a href="pdf/CNNs%20and%20Image%20Recognition.pdf" download>↓ 下载原课件 PDF</a></span></footer>
          </div>
          <aside class="page-toc intro-toc"><p>本讲内容</p><a href="#cnn-classification" data-topic-link="cnn-foundations">卷积神经网络</a><a href="#cnn-kernel-gradient" data-topic-link="cnn-training">CNN 训练</a><a href="#cnn-architecture-map" data-topic-link="cnn-architectures">经典 CNN 架构</a><div></div><p>本节目录</p><div class="cnn-section-toc">${sectionToc}</div></aside>
        </main>
      </div>
    </div>
    <div class="toast" role="status" aria-live="polite"></div>
    <script type="application/json" id="cnn-course-data">${JSON.stringify(courseData).replaceAll("<", "\\u003c")}</script>
    ${animationTemplates}
    <script src="script.js"></script><script src="vendor/katex/katex.min.js"></script><script src="cnn-image-recognition.js?v=${assetVersion}"></script>
  </body>
</html>\n`;

writeFileSync(join(root, 'cnn-image-recognition.html'), document, 'utf8');

const katexSource = join(root, '..', 'AI工程学', 'site', 'node_modules', 'katex', 'dist');
const katexOutput = join(root, 'vendor', 'katex');
mkdirSync(katexOutput, { recursive: true });
copyFileSync(join(katexSource, 'katex.min.css'), join(katexOutput, 'katex.min.css'));
copyFileSync(join(katexSource, 'katex.min.js'), join(katexOutput, 'katex.min.js'));
cpSync(join(katexSource, 'fonts'), join(katexOutput, 'fonts'), { recursive: true });

console.log(`Built CNN page with ${sections.length} reading sections and local KaTeX assets.`);
