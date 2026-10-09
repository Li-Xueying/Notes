import { slides, topicNames, topicStarts } from './intro-presentation-data.mjs';
import { renderView, bindView } from './intro-presentation-views.mjs';

const readMode = document.querySelector('#read-mode');
const slidesMode = document.querySelector('#slides-mode');
const modeButtons = document.querySelectorAll('[data-mode-button]');
const previous = document.querySelector('#previous-slide');
const next = document.querySelector('#next-slide');
const pageCount = document.querySelector('.intro-page-count');
const readingPageCount = `${Object.keys(topicNames).length} 条线索 · ${slides.length} 个演示步骤`;
pageCount.textContent = readingPageCount;
const imageFrame = document.querySelector('#slide-image').closest('.intro-slide-image');
const stage = document.createElement('div');
stage.className = 'ann-presentation-stage';
stage.setAttribute('aria-live', 'polite');
stage.setAttribute('aria-atomic', 'true');
imageFrame.after(stage);
imageFrame.hidden = true;
document.querySelector('#slide-media').hidden = true;
const imageDialog = document.createElement('dialog');
imageDialog.className = 'ann-image-dialog';
imageDialog.setAttribute('aria-label', '图像查看');
imageDialog.innerHTML = '<div class="ann-image-toolbar"><button type="button" data-image-minus aria-label="缩小" title="缩小">−</button><output>100%</output><button type="button" data-image-plus aria-label="放大" title="放大">+</button><button type="button" data-image-close aria-label="关闭图像" title="关闭" autofocus>×</button></div><div class="ann-image-viewport"><img alt=""></div>';
document.querySelector('.home-content').append(imageDialog);
let imageScale = 1;
let imageBaseWidth = 0;
const updateImageScale = () => {
  imageDialog.querySelector('img').style.width = `${imageBaseWidth * imageScale}px`;
  imageDialog.querySelector('output').textContent = `${Math.round(imageScale * 100)}%`;
  imageDialog.querySelector('[data-image-minus]').disabled = imageScale === 1;
  imageDialog.querySelector('[data-image-plus]').disabled = imageScale === 4;
};
const openImage = (event) => {
  const button = event.target.closest('[data-zoom-image], [data-zoom-svg]');
  if (!button) return;
  const image = button.parentElement.querySelector('img, svg');
  const enlarged = imageDialog.querySelector('img');
  if (image instanceof SVGElement) {
    const copy = image.cloneNode(true);
    const texts = image.querySelectorAll('text');
    copy.querySelectorAll('text').forEach((text, index) => {
      const style = getComputedStyle(texts[index]);
      text.setAttribute('font-family', style.fontFamily);
      text.setAttribute('font-size', style.fontSize);
      text.setAttribute('fill', style.fill);
    });
    enlarged.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(copy))}`;
    enlarged.alt = image.querySelector('title')?.textContent || '数值网络';
  } else {
    enlarged.src = image.src;
    enlarged.alt = image.alt;
  }
  imageDialog.showModal();
  imageBaseWidth = imageDialog.querySelector('.ann-image-viewport').clientWidth;
  imageScale = 1;
  updateImageScale();
};
stage.addEventListener('click', openImage);
readMode.addEventListener('click', openImage);
imageDialog.querySelector('[data-image-plus]').addEventListener('click', () => { imageScale = Math.min(4, imageScale + 0.5); updateImageScale(); });
imageDialog.querySelector('[data-image-minus]').addEventListener('click', () => { imageScale = Math.max(1, imageScale - 0.5); updateImageScale(); });
imageDialog.querySelector('[data-image-close]').addEventListener('click', () => imageDialog.close());

function stylesheet(href) {
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some((link) => link.getAttribute('href') === href)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.append(link);
}
stylesheet('intro-presentation.css?v=20261010-1');
stylesheet('vendor/katex/katex.min.css');
await new Promise((resolve) => {
  if (window.katex) return resolve();
  const script = document.createElement('script');
  script.src = 'vendor/katex/katex.min.js';
  script.onload = resolve;
  script.onerror = resolve;
  document.head.append(script);
});

let page = 1;
let mode = 'read';
let cleanSlide = () => {};
const topicForPage = () => slides[page - 1].topic;
function fitFormulas(element) {
  element.querySelectorAll('[data-tex]').forEach((formula) => {
    formula.style.fontSize = '';
    if (formula.clientWidth && formula.scrollWidth > formula.clientWidth) {
      const fontSize = parseFloat(getComputedStyle(formula).fontSize);
      formula.style.fontSize = `${fontSize * formula.clientWidth / formula.scrollWidth * 0.98}px`;
    }
  });
}
const renderMath = (element) => {
  element.querySelectorAll('[data-tex]').forEach((formula) => {
    if (window.katex) window.katex.render(formula.dataset.tex, formula, { displayMode: true, throwOnError: false, strict: 'ignore' });
  });
  fitFormulas(element);
};
const readingViews = [...readMode.querySelectorAll('[data-reading-slide]')].map((element) => {
  const item = slides.find((slide) => slide.id === element.dataset.readingSlide);
  if (!item) throw new Error(`Unknown reading diagram: ${element.dataset.readingSlide}`);
  element.innerHTML = renderView(item.view);
  return [element, item.view];
});
renderMath(readMode);
const readingCleanups = readingViews.map(([element, view]) => bindView(element, view, renderMath));
const resize = new ResizeObserver(() => fitFormulas(mode === 'slides' ? stage : readMode));
resize.observe(stage);
resize.observe(readMode);
document.fonts.ready.then(() => fitFormulas(mode === 'slides' ? stage : readMode));
const selectTopic = (topic) => document.querySelectorAll('[data-topic-link]').forEach((link) => link.classList.toggle('selected', link.dataset.topicLink === topic));
const updateButtons = () => modeButtons.forEach((button) => {
  const active = button.dataset.modeButton === mode;
  button.classList.toggle('primary', active);
  button.classList.toggle('secondary', !active);
  button.setAttribute('aria-selected', String(active));
});

function updateUrl(replace = false) {
  const url = new URL(window.location.href);
  url.searchParams.set('mode', mode);
  url.searchParams.set('page', String(page));
  url.hash = mode === 'read' ? topicForPage() : '';
  window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
}

function renderSlide() {
  cleanSlide();
  const item = slides[page - 1];
  slidesMode.dataset.slideId = item.id;
  stage.dataset.view = item.view.type;
  document.querySelector('#slide-topic').textContent = topicNames[item.topic];
  document.querySelector('#slide-title').textContent = item.title;
  document.querySelector('#slide-caption').textContent = item.caption;
  document.querySelector('#slide-note').textContent = item.note;
  document.querySelector('#slide-page').textContent = String(page).padStart(2, '0');
  document.querySelector('#slide-total').textContent = ` / ${slides.length}`;
  document.querySelector('#slide-counter').textContent = `${page} / ${slides.length}`;
  const progress = document.querySelector('#slide-progress');
  progress.style.width = `${page / slides.length * 100}%`;
  progress.parentElement.setAttribute('role', 'progressbar');
  progress.parentElement.setAttribute('aria-label', '演示进度');
  progress.parentElement.setAttribute('aria-valuemin', '1');
  progress.parentElement.setAttribute('aria-valuemax', String(slides.length));
  progress.parentElement.setAttribute('aria-valuenow', String(page));
  stage.querySelectorAll('video').forEach((video) => video.pause());
  stage.innerHTML = renderView(item.view);
  renderMath(stage);
  cleanSlide = bindView(stage, item.view, renderMath);
  previous.disabled = page === 1;
  next.disabled = page === slides.length;
  selectTopic(item.topic);
}

function showSlides(startPage = page, replace = false, scroll = true) {
  readingCleanups.forEach((cleanup) => cleanup());
  mode = 'slides';
  page = Math.min(slides.length, Math.max(1, startPage));
  readMode.hidden = true;
  slidesMode.hidden = false;
  pageCount.textContent = `${Object.keys(topicNames).length} 条线索 · ${slides.length} 个演示步骤`;
  readMode.querySelectorAll('video').forEach((video) => video.pause());
  updateButtons();
  renderSlide();
  updateUrl(replace);
  if (scroll) slidesMode.scrollIntoView({ block: 'start', behavior: 'instant' });
}

function showTopic(topic, replace = false, resetPage = false, scroll = true) {
  cleanSlide();
  mode = 'read';
  if (resetPage || topicForPage() !== topic) page = topicStarts[topic];
  stage.querySelectorAll('video').forEach((video) => video.pause());
  readMode.hidden = false;
  slidesMode.hidden = true;
  fitFormulas(readMode);
  pageCount.textContent = readingPageCount;
  updateButtons();
  selectTopic(topic);
  updateUrl(replace);
  if (scroll) document.getElementById(topic)?.scrollIntoView({ block: 'start', behavior: 'instant' });
}

function visibleReadingTopic() {
  return [...readMode.querySelectorAll('[data-topic]')].find((section) => section.getBoundingClientRect().bottom > 135)?.dataset.topic || topicForPage();
}

function move(delta) {
  if (page + delta < 1 || page + delta > slides.length) return;
  page += delta;
  renderSlide();
  updateUrl();
  slidesMode.scrollIntoView({ block: 'start', behavior: 'instant' });
}

modeButtons.forEach((button) => button.addEventListener('click', () => {
  if (button.dataset.modeButton === 'slides') {
    const topic = visibleReadingTopic();
    showSlides(topic === topicForPage() ? page : topicStarts[topic]);
  } else showTopic(topicForPage());
}));
document.querySelectorAll('[data-present-topic]').forEach((button) => button.addEventListener('click', () => showSlides(topicStarts[button.dataset.presentTopic])));
document.querySelectorAll('[data-topic-link]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  const topic = link.dataset.topicLink;
  if (mode === 'slides') showSlides(topicStarts[topic]);
  else showTopic(topic, false, true);
}));
previous.addEventListener('click', () => move(-1));
next.addEventListener('click', () => move(1));
document.querySelector('#read-current').addEventListener('click', () => showTopic(topicForPage()));
document.querySelector('#copy-slide-link').addEventListener('click', async (event) => {
  updateUrl(true);
  const button = event.currentTarget;
  try {
    await navigator.clipboard.writeText(window.location.href);
    button.textContent = '已复制链接';
  } catch { button.textContent = '请复制地址栏'; }
  window.setTimeout(() => { button.textContent = '复制当前位置'; }, 1800);
});
document.addEventListener('keydown', (event) => {
  if (mode !== 'slides' || imageDialog.open || event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]') || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    event.preventDefault();
    move(event.key === 'ArrowRight' ? 1 : -1);
  }
});

function restoreLocation(initial = false) {
  const params = new URLSearchParams(window.location.search);
  const requested = Number(params.get('page'));
  page = Number.isInteger(requested) && requested > 0 && requested <= slides.length ? requested : 1;
  if (params.get('mode') === 'slides') showSlides(page, true);
  else {
    const hashTopic = window.location.hash.slice(1);
    const topic = topicStarts[hashTopic] ? hashTopic : topicForPage();
    // Keep the existing reading URL and scroll position unless a topic was requested.
    if (initial) {
      if (topicStarts[hashTopic]) page = topicStarts[hashTopic];
      selectTopic(topic);
      if (hashTopic) window.requestAnimationFrame(() => document.getElementById(topic)?.scrollIntoView({ block: 'start', behavior: 'instant' }));
    } else showTopic(topic, true, false, Boolean(hashTopic));
  }
}
window.addEventListener('popstate', () => restoreLocation());
restoreLocation(true);
