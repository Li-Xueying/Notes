(() => {
  const course = JSON.parse(document.querySelector('#rnn-course-data').textContent);
  const { slides, sections, topics, sequences, assetVersion } = course;
  const sectionStarts = Object.fromEntries(sections.map(section => [section.id, slides.findIndex(slide => slide.section === section.id) + 1]));
  const readMode = document.querySelector('#read-mode');
  const slidesMode = document.querySelector('#slides-mode');
  const sequenceHost = document.querySelector('#slide-sequence');
  const slideLink = document.querySelector('#slide-link');
  const slideImage = document.querySelector('#slide-image');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const players = new Set();
  let presentationPlayer;
  let page = 1;
  let mode = 'read';
  let activeSection = sections[0].id;

  function createPlayer(element, autoplay = false) {
    const id = element.dataset.sequence;
    const config = sequences[id];
    const stage = element.querySelector('.rnn-sequence-stage');
    const counter = element.querySelector('.rnn-sequence-counter');
    const caption = element.querySelector('.rnn-sequence-caption');
    const playButton = element.querySelector('[data-sequence-action="play"]');
    const end = config.steps.length - 1;
    let index = !autoplay && config.kind === 'images' ? end : 0;
    let playing = false;
    let timer;
    let motion;
    let moving = false;
    let enlarged;
    const zoom = document.createElement('a'); zoom.className = 'rnn-sequence-zoom';
    zoom.target = '_blank'; zoom.rel = 'noopener'; zoom.setAttribute('aria-label', '放大当前计算图');
    stage.append(zoom);
    if (config.kind === 'images') {
      const img = new Image(); img.alt = slides.find(slide => slide.id === id).title;
      zoom.append(img);
    } else zoom.append(document.querySelector(`#rnn-live-${id}`).content.cloneNode(true));

    function draw() {
      stage.dataset.step = String(index);
      stage.dataset.moving = String(moving);
      counter.textContent = `${index + 1} / ${end + 1}`;
      caption.textContent = config.steps[index];
      element.querySelector('[data-sequence-action="previous"]').disabled = index === 0;
      element.querySelector('[data-sequence-action="next"]').disabled = index === end;
      element.querySelector('[data-play-icon]').hidden = playing;
      element.querySelector('[data-pause-icon]').hidden = !playing;
      const label = playing ? '暂停' : index === end ? '重播' : '播放';
      playButton.setAttribute('aria-label', label); playButton.dataset.tooltip = label;
      playButton.setAttribute('aria-pressed', String(playing));
      if (config.kind === 'images') {
        stage.querySelector('img').src = `diagrams/rnn/${id}-step-${index}.svg?v=${assetVersion}`;
      } else if (config.kind === 'window') {
        const band = stage.querySelector('[data-window-band]');
        band.setAttribute('transform', `translate(${48 + index * 144} 128)`);
        const texts = stage.querySelectorAll('[data-window-pairs] text');
        texts[0].textContent = index ? '中心 banking' : '中心 into';
        const words = index ? ['turning', 'into', 'crises', 'as'] : ['problems', 'turning', 'banking', 'crises'];
        words.forEach((word, i) => { texts[1 + i * 2].textContent = word; });
      } else {
        stage.querySelectorAll(config.kind === 'forward' ? '[data-forward-node]' : '[data-memory-node]').forEach((node, i) => node.setAttribute('visibility', i <= index ? 'visible' : 'hidden'));
      }
      if (config.kind === 'images') zoom.href = stage.querySelector('img').src;
      else {
        if (enlarged) URL.revokeObjectURL(enlarged);
        enlarged = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(stage.querySelector('svg'))], { type: 'image/svg+xml' }));
        zoom.href = enlarged;
      }
    }
    const visible = () => {
      const rect = element.getBoundingClientRect();
      return !document.hidden && element.getClientRects().length && rect.bottom > 0 && rect.top < innerHeight;
    };
    function schedule() {
      clearTimeout(timer);
      if (!playing) return;
      timer = setTimeout(() => {
        if (!visible()) { setPlaying(false); return; }
        if (index === end) { setPlaying(false); return; }
        advance(index + 1, true);
      }, 2400);
    }
    function cancelMotion() {
      if (motion) cancelAnimationFrame(motion);
      motion = null; moving = false;
    }
    function advance(next, animate = false) {
      clearTimeout(timer); cancelMotion();
      if (animate && config.kind === 'window' && !reducedMotion.matches) {
        const from = index; const start = performance.now(); moving = true;
        const pairs = stage.querySelector('[data-window-pairs]'); pairs.setAttribute('visibility', 'hidden');
        const tick = now => {
          const progress = Math.min(1, (now - start) / 540);
          const eased = progress * progress * (3 - 2 * progress);
          stage.querySelector('[data-window-band]').setAttribute('transform', `translate(${48 + (from + (next - from) * eased) * 144} 128)`);
          stage.dataset.moving = 'true';
          if (progress < 1 && playing) motion = requestAnimationFrame(tick);
          else { index = next; moving = false; pairs.setAttribute('visibility', 'visible'); draw(); schedule(); }
        };
        motion = requestAnimationFrame(tick);
      } else { index = next; draw(); schedule(); }
    }
    function setPlaying(value) {
      playing = value; clearTimeout(timer); cancelMotion();
      stage.querySelector('[data-window-pairs]')?.setAttribute('visibility', 'visible');
      draw(); schedule();
    }
    const handler = event => {
      const action = event.target.closest('[data-sequence-action]')?.dataset.sequenceAction;
      if (!action) return;
      if (action === 'play') { if (!playing && index === end) index = 0; setPlaying(!playing); }
      else if (action === 'replay') { index = 0; setPlaying(true); }
      else { setPlaying(false); advance(Math.max(0, Math.min(end, index + (action === 'next' ? 1 : -1)))); }
    };
    element.addEventListener('click', handler);
    const player = { pause: () => setPlaying(false), destroy: () => { setPlaying(false); if (enlarged) URL.revokeObjectURL(enlarged); element.removeEventListener('click', handler); players.delete(player); } };
    players.add(player); draw();
    if (autoplay && !reducedMotion.matches) setPlaying(true);
    return player;
  }

  document.querySelectorAll('#read-mode [data-sequence]').forEach(element => createPlayer(element));
  document.addEventListener('visibilitychange', () => { if (document.hidden) players.forEach(player => player.pause()); });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) players.forEach(player => player.pause()); });
  document.querySelectorAll('.cnn-equation, .cnn-inline-math').forEach(element => {
    if (window.katex) window.katex.render(element.dataset.tex, element, { displayMode: element.classList.contains('cnn-equation'), throwOnError: false, strict: 'ignore' });
  });
  function selectSection(id) {
    activeSection = id;
    const topic = sections.find(section => section.id === id).topic;
    document.querySelectorAll('[data-topic-link]').forEach(link => link.classList.toggle('selected', link.dataset.topicLink === topic));
    document.querySelectorAll('[data-section-link]').forEach(link => link.classList.toggle('selected', link.dataset.sectionLink === id));
  }
  function updateUrl(replace = false) {
    const url = new URL(location.href);
    url.searchParams.set('mode', mode); url.searchParams.set('page', String(page));
    url.hash = mode === 'read' ? activeSection : '';
    history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }
  function updateMode() {
    cancelAnimationFrame(scrollFrame);
    readMode.hidden = mode !== 'read'; slidesMode.hidden = mode !== 'slides';
    document.querySelectorAll('[data-mode-button]').forEach(button => {
      const active = button.dataset.modeButton === mode;
      button.classList.toggle('primary', active); button.classList.toggle('secondary', !active);
      button.setAttribute('aria-selected', String(active));
    });
    players.forEach(player => player.pause());
  }
  function renderSlide() {
    presentationPlayer?.destroy(); presentationPlayer = null; sequenceHost.replaceChildren();
    const item = slides[page - 1]; selectSection(item.section); slidesMode.dataset.slideId = item.id;
    document.querySelector('#slide-topic').textContent = topics[item.topic].label;
    for (const key of ['title', 'caption', 'note']) document.querySelector(`#slide-${key}`).textContent = item[key];
    document.querySelector('#slide-page').textContent = String(page).padStart(2, '0');
    document.querySelector('#slide-counter').textContent = `${page} / ${slides.length}`;
    document.querySelector('#slide-progress').style.width = `${page / slides.length * 100}%`;
    document.querySelector('#previous-slide').disabled = page === 1;
    document.querySelector('#next-slide').disabled = page === slides.length;
    slideImage.src = `diagrams/rnn/${item.id}.svg?v=${assetVersion}`;
    slideImage.alt = `${item.title}。${item.caption}`; slideLink.href = slideImage.src;
    sequenceHost.hidden = !sequences[item.id]; slideLink.hidden = Boolean(sequences[item.id]);
    if (sequences[item.id]) {
      const original = readMode.querySelector(`[data-sequence="${item.id}"]`);
      const element = original.cloneNode(true); element.dataset.presentation = 'true';
      element.querySelector('.rnn-sequence-stage').replaceChildren(); sequenceHost.append(element);
      presentationPlayer = createPlayer(element, true);
    }
  }
  function showSlides(start = page, push = true) {
    mode = 'slides'; page = Math.max(1, Math.min(slides.length, start));
    updateMode(); renderSlide(); if (push) updateUrl();
    document.querySelector('.intro-lecture-header').scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  function showSection(id, push = true) {
    presentationPlayer?.destroy(); presentationPlayer = null; sequenceHost.replaceChildren();
    mode = 'read'; page = sectionStarts[id]; updateMode(); selectSection(id);
    if (push) updateUrl(); document.getElementById(id).scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  document.querySelectorAll('[data-mode-button]').forEach(button => button.addEventListener('click', () => button.dataset.modeButton === 'slides' ? showSlides(sectionStarts[activeSection]) : showSection(slides[page - 1].section)));
  document.querySelectorAll('[data-present-section]').forEach(button => button.addEventListener('click', () => showSlides(sectionStarts[button.dataset.presentSection])));
  document.querySelectorAll('[data-section-link], [data-topic-link]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault(); const id = link.dataset.sectionLink || topics[link.dataset.topicLink].target;
    mode === 'slides' ? showSlides(sectionStarts[id]) : showSection(id);
  }));
  document.querySelector('#previous-slide').addEventListener('click', () => { if (page > 1) showSlides(page - 1); });
  document.querySelector('#next-slide').addEventListener('click', () => { if (page < slides.length) showSlides(page + 1); });
  document.querySelector('#read-current').addEventListener('click', () => showSection(slides[page - 1].section));
  document.querySelector('#copy-slide-link').addEventListener('click', async event => {
    updateUrl(true); const button = event.currentTarget;
    try { await navigator.clipboard.writeText(location.href); button.textContent = '已复制链接'; }
    catch { button.textContent = '请复制地址栏'; }
    setTimeout(() => { button.textContent = '复制当前位置'; }, 1800);
  });
  document.addEventListener('keydown', event => {
    if (event.target.closest('input,textarea,select,button,[contenteditable]')) return;
    if (mode === 'slides' && event.key === 'ArrowRight' && page < slides.length) { event.preventDefault(); showSlides(page + 1); }
    if (mode === 'slides' && event.key === 'ArrowLeft' && page > 1) { event.preventDefault(); showSlides(page - 1); }
  });
  function restore() {
    const url = new URL(location.href); const requested = Number(url.searchParams.get('page'));
    page = Number.isInteger(requested) && requested >= 1 && requested <= slides.length ? requested : 1;
    const hash = url.hash.slice(1);
    if (url.searchParams.get('mode') === 'slides') showSlides(page, false);
    else if (sectionStarts[hash]) showSection(hash, false);
    else if (url.searchParams.has('page')) showSection(slides[page - 1].section, false);
    else { mode = 'read'; updateMode(); selectSection(sections[0].id); }
  }
  window.addEventListener('popstate', restore);
  window.addEventListener('hashchange', restore);
  let scrollFrame;
  window.addEventListener('scroll', () => {
    if (mode !== 'read') return;
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      if (mode !== 'read') return;
      const position = (document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0) + 32;
      let id = sections[0].id;
      for (const section of sections) if (document.getElementById(section.id).getBoundingClientRect().top <= position) id = section.id;
      if (id !== activeSection) { selectSection(id); page = sectionStarts[id]; updateUrl(true); }
    });
  }, { passive: true });

  function showPair(pair) {
    const [a, b] = pair.split('-'); const u = course.embeddingVectors[a]; const v = course.embeddingVectors[b];
    const cosine = u.reduce((sum, value, i) => sum + value * v[i], 0) / (Math.hypot(...u) * Math.hypot(...v));
    document.querySelector('#embedding-score').textContent = cosine.toFixed(3);
    for (const [side, word, values] of [['a', a, u], ['b', b, v]]) {
      document.querySelector(`#vector-${side}-label`).textContent = word;
      document.querySelector(`#vector-${side}`).textContent = `[${values.join(', ')}]`;
    }
    document.querySelectorAll('[data-word-pair]').forEach(button => { const active = button.dataset.wordPair === pair; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  }
  document.querySelectorAll('[data-word-pair]').forEach(button => button.addEventListener('click', () => showPair(button.dataset.wordPair)));
  showPair('hotel-motel'); restore();
})();
