(() => {
  const course = JSON.parse(document.querySelector('#cnn-course-data').textContent);
  const { slides, assetVersion } = course;
  const topics = Object.fromEntries(Object.keys(course.topicTitles).map(topic => [topic, slides.findIndex(slide => slide.topic === topic) + 1]));
  const sectionStarts = Object.fromEntries(course.sections.map(section => [section.id, slides.findIndex(slide => slide.section === section.id) + 1]));
  const topicTargets = { 'cnn-foundations': 'cnn-classification', 'cnn-training': 'cnn-kernel-gradient', 'cnn-architectures': 'cnn-architecture-map' };
  const topicForPage = current => slides[current - 1].topic;

  const readMode = document.querySelector('#read-mode');
  const slidesMode = document.querySelector('#slides-mode');
  const modeButtons = document.querySelectorAll('[data-mode-button]');
  const slideImage = document.querySelector('#slide-image');
  const slideTopic = document.querySelector('#slide-topic');
  const slideTitle = document.querySelector('#slide-title');
  const slideCaption = document.querySelector('#slide-caption');
  const slideNote = document.querySelector('#slide-note');
  const slidePage = document.querySelector('#slide-page');
  const slideTotal = document.querySelector('#slide-total');
  const slideCounter = document.querySelector('#slide-counter');
  const slideProgress = document.querySelector('#slide-progress');
  const slideMedia = document.querySelector('#slide-media');
  const previous = document.querySelector('#previous-slide');
  const next = document.querySelector('#next-slide');
  const readCurrent = document.querySelector('#read-current');
  const copyLink = document.querySelector('#copy-slide-link');
  const windowStage = document.querySelector('#slide-window-stage');
  const windowControls = document.querySelector('#slide-window-controls');
  const windowCounter = document.querySelector('#slide-window-counter');
  const windowPlay = windowControls.querySelector('[data-window-action="play"]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const windowInterval = 2400;
  const windowMoveDuration = 480;
  let windowAnimation;
  let page = 1;
  let mode = 'read';

  function stopWindowAnimation() {
    if (windowAnimation) cancelAnimationFrame(windowAnimation.frame);
    windowAnimation = null;
    windowStage.replaceChildren();
    windowStage.hidden = true;
    windowControls.hidden = true;
    slideImage.hidden = false;
  }

  function drawWindowAnimation() {
    const state = windowAnimation;
    const { config, svg } = state;
    const target = Math.min(config.steps.length - 1, Math.floor(state.time / windowInterval));
    const localTime = state.time - target * windowInterval;
    const moving = target > 0 && localTime < windowMoveDuration && !reducedMotion.matches;
    const index = moving ? target - 1 : target;
    const from = config.steps[moving ? target - 1 : target];
    const to = config.steps[target];
    const progress = moving ? localTime / windowMoveDuration : 1;
    const eased = progress * progress * (3 - 2 * progress);
    const row = from.row + (to.row - from.row) * eased;
    const col = from.col + (to.col - from.col) * eased;
    const input = config.inputGrid;
    svg.querySelector('[data-window="input"]').setAttribute('transform', `translate(${input.x + col * config.stride * input.cell} ${input.y + row * config.stride * input.cell})`);
    const current = config.steps[index];
    for (const output of config.outputGrids) {
      svg.querySelector(`[data-window="output-${output.key}"]`).setAttribute('transform', `translate(${output.x + current.col * output.cell} ${output.y + current.row * output.cell})`);
    }
    svg.querySelector('[data-window-equation]').setAttribute('visibility', moving ? 'hidden' : 'visible');
    windowStage.dataset.moving = String(moving);
    windowStage.dataset.step = String(index);
    state.index = index;
    if (state.ui === `${index}:${state.playing}`) return;
    state.ui = `${index}:${state.playing}`;
    svg.querySelector('[data-window-equation] text').textContent = current.calculation;
    svg.querySelectorAll('[data-output-cell]').forEach(cell => cell.setAttribute('visibility', Number(cell.dataset.index) <= index ? 'visible' : 'hidden'));
    svg.setAttribute('aria-label', `${slides[page - 1].title}。窗口 ${index + 1}：${current.calculation}`);
    windowCounter.textContent = `窗口 ${index + 1} / ${config.steps.length}`;
    windowControls.querySelector('[data-window-action="previous"]').disabled = index === 0;
    windowControls.querySelector('[data-window-action="next"]').disabled = index === config.steps.length - 1;
    windowControls.querySelector('[data-window-icon="play"]').hidden = state.playing;
    windowControls.querySelector('[data-window-icon="pause"]').hidden = !state.playing;
    const label = state.playing ? '暂停' : state.time >= state.end ? '重播' : '播放';
    windowPlay.setAttribute('aria-label', label);
    windowPlay.dataset.tooltip = label;
    windowPlay.setAttribute('aria-pressed', String(state.playing));
  }

  function tickWindowAnimation(timestamp) {
    const state = windowAnimation;
    if (!state?.playing || document.hidden || mode !== 'slides') return;
    state.time = Math.min(state.end, state.time + (state.lastTime === null ? 0 : Math.min(timestamp - state.lastTime, 100)));
    state.lastTime = timestamp;
    if (state.time === state.end) state.playing = false;
    drawWindowAnimation();
    if (state.playing) state.frame = requestAnimationFrame(tickWindowAnimation);
  }

  function setWindowPlaying(playing) {
    const state = windowAnimation;
    cancelAnimationFrame(state.frame);
    state.playing = playing;
    state.lastTime = null;
    drawWindowAnimation();
    if (playing && !document.hidden && mode === 'slides') state.frame = requestAnimationFrame(tickWindowAnimation);
  }

  function renderWindowAnimation(item) {
    stopWindowAnimation();
    const config = course.windowAnimations[item.id];
    if (!config) return;
    windowStage.append(document.querySelector(`#cnn-window-${item.id}`).content.cloneNode(true));
    windowStage.hidden = false;
    windowControls.hidden = false;
    slideImage.hidden = true;
    windowAnimation = { config, svg: windowStage.querySelector('svg'), time: 0, index: 0, end: (config.steps.length - 1) * windowInterval + windowMoveDuration + 1200, playing: false, lastTime: null, frame: null };
    setWindowPlaying(!reducedMotion.matches);
  }

  windowControls.addEventListener('click', event => {
    const action = event.target.closest('[data-window-action]')?.dataset.windowAction;
    const state = windowAnimation;
    if (!action || !state) return;
    if (action === 'play') {
      if (state.time >= state.end) state.time = 0;
      setWindowPlaying(!state.playing);
    } else if (action === 'replay') {
      state.time = 0;
      setWindowPlaying(true);
    } else {
      const index = Math.max(0, Math.min(state.config.steps.length - 1, state.index + (action === 'next' ? 1 : -1)));
      state.time = index * windowInterval + windowMoveDuration;
      setWindowPlaying(false);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!windowAnimation) return;
    cancelAnimationFrame(windowAnimation.frame);
    windowAnimation.lastTime = null;
    if (!document.hidden && windowAnimation.playing) windowAnimation.frame = requestAnimationFrame(tickWindowAnimation);
  });
  reducedMotion.addEventListener('change', () => {
    if (!windowAnimation || !reducedMotion.matches) return;
    windowAnimation.time = windowAnimation.index * windowInterval + windowMoveDuration;
    setWindowPlaying(false);
  });

  document.querySelectorAll('.cnn-equation, .cnn-inline-math').forEach((element) => {
    if (!window.katex) return;
    try {
      window.katex.render(element.dataset.tex, element, {
        displayMode: element.classList.contains('cnn-equation'),
        throwOnError: false,
        strict: 'ignore',
      });
    } catch {
      // The readable TeX fallback remains in place if a single expression cannot render.
    }
  });

  function updateModeButtons() {
    modeButtons.forEach((button) => {
      const active = button.dataset.modeButton === mode;
      button.classList.toggle('primary', active);
      button.classList.toggle('secondary', !active);
      button.setAttribute('aria-selected', String(active));
    });
  }

  function updateUrl(replace = false) {
    const url = new URL(window.location.href);
    url.searchParams.set('mode', mode);
    url.searchParams.set('page', String(page));
    url.hash = mode === 'read' ? slides[page - 1].section : '';
    window.history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }

  function selectTopic(topic) {
    document.querySelectorAll('[data-section-link]').forEach(link => link.classList.toggle('selected', link.dataset.sectionLink === slides[page - 1].section));
    document.querySelectorAll('[data-topic-link]').forEach((link) => link.classList.toggle('selected', link.dataset.topicLink === topic));
  }

  function showTopic(topic, section = topicTargets[topic]) {
    stopWindowAnimation();
    mode = 'read';
    if (slides[page - 1].section !== section) page = sectionStarts[section] || topics[topic] || page;
    readMode.hidden = false;
    slidesMode.hidden = true;
    updateModeButtons();
    selectTopic(topic);
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    updateUrl();
  }

  function renderMedia() {
    const item = slides[page - 1];
    if (!item.motion || course.windowAnimations[item.id]) {
      slideMedia.hidden = true;
      slideMedia.replaceChildren();
      return;
    }
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fallback = `diagrams/cnn/${item.id}.svg?v=${assetVersion}`;
    const source = `media/cnn/${item.motion}`;
    slideMedia.hidden = false;
    slideMedia.innerHTML = `<div class="intro-media-label"><strong>动态观察</strong><span>${item.caption}</span><button class="cnn-motion-button" type="button" data-motion-toggle>${reduceMotion ? '播放动态示意' : '暂停动态示意'}</button></div><img src="${reduceMotion ? fallback : source}" data-motion-source="${source}" data-motion-fallback="${fallback}" data-motion-playing="${String(!reduceMotion)}" alt="${item.caption}" />`;
  }

  function renderSlide() {
    const item = slides[page - 1];
    slidesMode.dataset.slideId = item.id;
    slideTopic.textContent = course.topicTitles[item.topic];
    slideTitle.textContent = item.title;
    slideCaption.textContent = item.caption;
    slideNote.textContent = item.note;
    slidePage.textContent = String(page).padStart(2, '0');
    slideTotal.textContent = ` / ${slides.length}`;
    slideCounter.textContent = `${page} / ${slides.length}`;
    slideProgress.style.width = `${(page / slides.length) * 100}%`;
    slideImage.src = `diagrams/cnn/${item.id}.svg?v=${assetVersion}`;
    slideImage.alt = `${item.title}。${item.caption}`;
    document.querySelector('#slide-image-link').href = slideImage.src;
    document.querySelector('#slide-image-link').setAttribute('aria-label', `放大：${item.title}`);
    previous.disabled = page === 1;
    next.disabled = page === slides.length;
    selectTopic(topicForPage(page));
    renderWindowAnimation(item);
    renderMedia();
  }

  function showSlides(startPage = page) {
    mode = 'slides';
    page = Math.min(slides.length, Math.max(1, startPage));
    readMode.hidden = true;
    slidesMode.hidden = false;
    updateModeButtons();
    renderSlide();
    updateUrl();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  modeButtons.forEach((button) => button.addEventListener('click', () => {
    if (button.dataset.modeButton === 'slides') showSlides(page);
    else showTopic(topicForPage(page), slides[page - 1].section);
  }));
  document.querySelectorAll('[data-present-section]').forEach(button => button.addEventListener('click', () => showSlides(sectionStarts[button.dataset.presentSection])));
  document.querySelectorAll('[data-section-link]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const section = link.dataset.sectionLink;
    if (mode === 'slides') showSlides(sectionStarts[section]);
    else showTopic(slides[sectionStarts[section] - 1].topic, section);
  }));
  document.querySelectorAll('[data-topic-link]').forEach((link) => link.addEventListener('click', (event) => {
    event.preventDefault();
    if (mode === 'slides') {
      page = topics[link.dataset.topicLink];
      renderSlide();
      updateUrl();
    } else showTopic(link.dataset.topicLink);
  }));
  previous.addEventListener('click', () => { if (page > 1) { page -= 1; renderSlide(); updateUrl(); } });
  next.addEventListener('click', () => { if (page < slides.length) { page += 1; renderSlide(); updateUrl(); } });
  readCurrent.addEventListener('click', () => showTopic(topicForPage(page), slides[page - 1].section));
  copyLink.addEventListener('click', async () => {
    updateUrl(true);
    try {
      await navigator.clipboard.writeText(window.location.href);
      copyLink.textContent = '已复制链接';
      setTimeout(() => { copyLink.textContent = '复制当前位置'; }, 1800);
    } catch {
      copyLink.textContent = '请复制地址栏';
    }
  });
  slideMedia.addEventListener('click', (event) => {
    const button = event.target.closest('[data-motion-toggle]');
    if (!button) return;
    const image = slideMedia.querySelector('img');
    const playing = image.dataset.motionPlaying === 'true';
    image.src = playing ? image.dataset.motionFallback : `${image.dataset.motionSource}?restart=${Date.now()}`;
    image.dataset.motionPlaying = String(!playing);
    button.textContent = playing ? '播放动态示意' : '暂停动态示意';
  });
  document.addEventListener('keydown', (event) => {
    if (event.target.matches('input, textarea, select, button')) return;
    if (event.key === 'ArrowRight' && mode === 'slides' && page < slides.length) { page += 1; renderSlide(); updateUrl(); }
    if (event.key === 'ArrowLeft' && mode === 'slides' && page > 1) { page -= 1; renderSlide(); updateUrl(); }
  });

  const sizeInputs = [...document.querySelectorAll('[data-size-input]')];
  const sizeOutput = document.querySelector('#cnn-size-output');
  const sizeFormula = document.querySelector('#cnn-size-formula');
  const sizeMessage = document.querySelector('#cnn-size-message');
  function updateSizeLab() {
    const values = Object.fromEntries(sizeInputs.map((input) => [input.dataset.sizeInput, Number(input.value)]));
    const numerator = values.input + 2 * values.padding - values.kernel;
    const output = numerator >= 0 ? Math.floor(numerator / values.stride) + 1 : 0;
    sizeOutput.textContent = output || '—';
    sizeFormula.textContent = `⌊(${values.input} + 2×${values.padding} − ${values.kernel}) / ${values.stride}⌋ + 1 = ${output || '无有效窗口'}`;
    sizeMessage.textContent = output ? `窗口可以在扩展后的输入上产生 ${output} 个有效位置。` : '卷积核大于填充后的输入，当前参数没有有效窗口。';
    sizeOutput.classList.toggle('invalid', !output);
  }
  sizeInputs.forEach((input) => input.addEventListener('input', updateSizeLab));

  const gradientStates = [
    { title: '原始输出梯度', rows: [['G₀₀', 'G₀₁'], ['G₁₀', 'G₁₁']], copy: '输出是 2×2，每个位置对应一个步幅为 2 的前向窗口。', formula: 'G ∈ R^(2×2)' },
    { title: '在相邻位置之间插零', rows: [['G₀₀', '0', 'G₀₁'], ['0', '0', '0'], ['G₁₀', '0', 'G₁₁']], copy: '步幅为 2，因此相邻梯度之间插入 S−1=1 个零。', formula: 'G↑2 ∈ R^(3×3)' },
    { title: '在四周填充 2 格', rows: Array.from({ length: 7 }, (_, r) => Array.from({ length: 7 }, (_, c) => (r >= 2 && r <= 4 && c >= 2 && c <= 4 ? [['G₀₀', '0', 'G₀₁'], ['0', '0', '0'], ['G₁₀', '0', 'G₁₁']][r - 2][c - 2] : '·'))), copy: 'K−1−P=2，填充让旋转核能够覆盖输入梯度的边缘位置。', formula: 'pad = K − 1 − P = 2' },
    { title: '与旋转核完成有效相关', rows: Array.from({ length: 5 }, (_, r) => Array.from({ length: 5 }, (_, c) => `d${r}${c}`)), copy: '将核旋转 180° 后滑动，最终得到与原输入同形状的 5×5 梯度。', formula: 'dX = corr(G↑2 padded, rot180(K))' },
  ];
  const gradientMatrix = document.querySelector('#gradient-state-matrix');
  function renderGradientState(index) {
    const state = gradientStates[index];
    document.querySelectorAll('[data-gradient-state]').forEach((button) => button.classList.toggle('active', Number(button.dataset.gradientState) === index));
    document.querySelector('#gradient-state-index').textContent = `${index + 1} / ${gradientStates.length}`;
    document.querySelector('#gradient-state-title').textContent = state.title;
    document.querySelector('#gradient-state-copy').textContent = state.copy;
    document.querySelector('#gradient-state-formula').textContent = state.formula;
    gradientMatrix.style.setProperty('--matrix-cols', state.rows[0].length);
    gradientMatrix.replaceChildren(...state.rows.flatMap((row) => row.map((value) => {
      const cell = document.createElement('span');
      cell.textContent = value;
      if (value === '0' || value === '·') cell.className = 'zero';
      if (value.startsWith('G')) cell.classList.add('source');
      return cell;
    })));
  }
  document.querySelectorAll('[data-gradient-state]').forEach((button) => button.addEventListener('click', () => renderGradientState(Number(button.dataset.gradientState))));
  renderGradientState(0);

  function restoreLocation() {
    const params = new URLSearchParams(window.location.search);
    const requestedPage = Number(params.get('page'));
    page = Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage <= slides.length ? requestedPage : 1;
    mode = params.get('mode') === 'slides' ? 'slides' : 'read';
    readMode.hidden = mode !== 'read';
    slidesMode.hidden = mode !== 'slides';
    updateModeButtons();
    if (mode === 'slides') renderSlide();
    else {
      stopWindowAnimation();
      const target = document.getElementById(window.location.hash.slice(1));
      if (target?.dataset.topic) page = sectionStarts[target.id] || page;
      selectTopic(topicForPage(page));
      if (target?.dataset.topic) requestAnimationFrame(() => target.scrollIntoView({ behavior: 'instant', block: 'start' }));
    }
  }
  window.addEventListener('popstate', restoreLocation);
  let scrollFrame;
  window.addEventListener('scroll', () => {
    if (mode !== 'read' || scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = null;
      const current = [...readMode.querySelectorAll('.cnn-topic')].filter(section => section.getBoundingClientRect().top <= 180).at(-1);
      if (!current || slides[page - 1].section === current.id) return;
      page = sectionStarts[current.id];
      selectTopic(topicForPage(page));
      updateUrl(true);
    });
  }, { passive: true });
  restoreLocation();
})();
