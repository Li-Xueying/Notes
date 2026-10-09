(() => {
  const course = JSON.parse(document.querySelector('#tf-course-data').textContent);
  const { slides, sections, topics, sequences, videos, assetVersion } = course;
  const videoHost=document.querySelector('#slide-video');
  const pauseVideos=()=>document.querySelectorAll('video').forEach(video=>video.pause());
  function bindVideo(element) {
    const video=element.querySelector('video'),button=element.querySelector('[data-video-action="play"]');
    const update=()=>{
      const playing=!video.paused&&!video.ended;
      button.setAttribute('aria-pressed',String(playing));button.setAttribute('aria-label',playing?'暂停':'播放');button.dataset.tooltip=playing?'暂停':'播放';
      button.querySelector('[data-play-icon]').hidden=playing;button.querySelector('[data-pause-icon]').hidden=!playing;
    };
    for(const event of ['play','pause','ended'])video.addEventListener(event,update);
    element.addEventListener('click',event=>{
      const control=event.target.closest('[data-video-action]');if(!control)return;
      if(control.dataset.videoAction==='expand'){
        if(document.fullscreenElement)document.exitFullscreen();else element.requestFullscreen?.();
      } else if(control.dataset.videoAction==='replay') {video.currentTime=0;video.play().catch(update);}
      else if(video.paused||video.ended)video.play().catch(update);else video.pause();
    });
    update();
  }
  document.querySelectorAll('[data-source-video]').forEach(bindVideo);
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

  function createPlayer(element,autoplay=false) {
    const id=element.dataset.sequence,config=sequences[id],end=config.steps.length-1;
    const stage=element.querySelector('.tf-sequence-stage'),counter=element.querySelector('.tf-sequence-counter'),caption=element.querySelector('.tf-sequence-caption'),playButton=element.querySelector('[data-sequence-action=play]');
    let index=autoplay?0:end,playing=false,timer;
    const zoom=document.createElement('a');zoom.className='tf-sequence-zoom';zoom.target='_blank';zoom.rel='noopener';zoom.setAttribute('aria-label','放大当前计算图');
    const img=new Image();img.alt=slides.find(slide=>slide.id===id).title;zoom.append(img);stage.append(zoom);
    function draw() {
      stage.dataset.step=String(index);counter.textContent=`${index+1} / ${end+1}`;caption.textContent=config.steps[index];
      element.querySelector('[data-sequence-action=previous]').disabled=index===0;
      element.querySelector('[data-sequence-action=next]').disabled=index===end;
      element.querySelector('[data-play-icon]').hidden=playing;element.querySelector('[data-pause-icon]').hidden=!playing;
      const label=playing?'暂停':index===end?'重播':'播放';playButton.setAttribute('aria-label',label);playButton.dataset.tooltip=label;playButton.setAttribute('aria-pressed',String(playing));
      img.src=`diagrams/transformer/${id}-step-${index}.svg?v=${assetVersion}`;zoom.href=img.src;
    }
    function schedule() {
      clearTimeout(timer);if(!playing)return;
      timer=setTimeout(()=>{
        const rect=element.getBoundingClientRect();
        if(document.hidden||!element.getClientRects().length||rect.bottom<=0||rect.top>=innerHeight||index===end){setPlaying(false);return;}
        index++;draw();schedule();
      },2400);
    }
    function setPlaying(value){playing=value;clearTimeout(timer);draw();schedule();}
    const handler=event=>{
      const action=event.target.closest('[data-sequence-action]')?.dataset.sequenceAction;if(!action)return;
      if(action==='play'){if(!playing&&index===end)index=0;setPlaying(!playing);}
      else if(action==='replay'){index=0;setPlaying(true);}
      else {setPlaying(false);index=Math.max(0,Math.min(end,index+(action==='next'?1:-1)));draw();}
    };
    element.addEventListener('click',handler);
    const player={pause:()=>setPlaying(false),destroy:()=>{clearTimeout(timer);element.removeEventListener('click',handler);players.delete(player);}};
    players.add(player);draw();if(autoplay&&!reducedMotion.matches)setPlaying(true);return player;
  }

  document.querySelectorAll('#read-mode [data-sequence]').forEach(element => createPlayer(element));
  document.addEventListener('visibilitychange', () => { if (document.hidden) {players.forEach(player => player.pause());pauseVideos();} });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) {players.forEach(player => player.pause());pauseVideos();} });
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
    players.forEach(player => player.pause());pauseVideos();
  }
  function renderSlide() {
    presentationPlayer?.destroy(); presentationPlayer = null; sequenceHost.replaceChildren();
    videoHost.replaceChildren();
    const item = slides[page - 1]; selectSection(item.section); slidesMode.dataset.slideId = item.id;
    document.querySelector('#slide-topic').textContent = topics[item.topic].label;
    for (const key of ['title', 'caption', 'note']) document.querySelector(`#slide-${key}`).textContent = item[key];
    document.querySelector('#slide-page').textContent = String(page).padStart(2, '0');
    document.querySelector('#slide-counter').textContent = `${page} / ${slides.length}`;
    document.querySelector('#slide-progress').style.width = `${page / slides.length * 100}%`;
    document.querySelector('#previous-slide').disabled = page === 1;
    document.querySelector('#next-slide').disabled = page === slides.length;
    slideImage.src = `diagrams/transformer/${item.id}.svg?v=${assetVersion}`;
    slideImage.alt = `${item.title}。${item.caption}`; slideLink.href = slideImage.src;
    sequenceHost.hidden = !sequences[item.id]; slideLink.hidden = Boolean(sequences[item.id]);
    videoHost.hidden=!videos[item.id];
    if(videos[item.id]){const original=readMode.querySelector(`[data-source-video="${item.id}"]`),element=original.cloneNode(true);videoHost.append(element);bindVideo(element);}
    if (sequences[item.id]) {
      const original = readMode.querySelector(`[data-sequence="${item.id}"]`);
      const element = original.cloneNode(true); element.dataset.presentation = 'true';
      element.querySelector('.tf-sequence-stage').replaceChildren(); sequenceHost.append(element);
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
    videoHost.replaceChildren();videoHost.hidden=true;
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

  const softmax=values=>{const m=Math.max(...values),exp=values.map(v=>Math.exp(v-m)),sum=exp.reduce((a,b)=>a+b,0);return exp.map(v=>v/sum);};
  function renderAttention(){
    const inputs=[...document.querySelectorAll('[data-attention-score]')],scores=inputs.map(input=>Number(input.value)),weights=softmax(scores);
    inputs.forEach((input,i)=>input.nextElementSibling.textContent=scores[i].toFixed(1));
    document.querySelector('#attention-weights').innerHTML=weights.map((w,i)=>'<div><span>k'+(i+1)+'</span><i style="--weight:'+w+'"></i><b>'+w.toFixed(3)+'</b></div>').join('');
    document.querySelector('#attention-output').textContent=weights.reduce((sum,w,i)=>sum+w*Number(inputs[i].dataset.value),0).toFixed(3);
  }
  function renderMask(index){
    const words=['BOS','深','度','学'];document.querySelectorAll('[data-mask-step]').forEach((button,i)=>{button.classList.toggle('active',i===index);button.setAttribute('aria-pressed',String(i===index));});
    document.querySelector('#mask-step').textContent='i = '+(index+1);
    document.querySelector('#mask-stage').innerHTML=words.map((word,i)=>'<div class="'+(i<=index?'visible':'masked')+'"><span>'+word+'</span><b>'+(i<=index?'可见':'−∞')+'</b></div>').join('');
    document.querySelector('#mask-message').textContent='位置 '+(index+1)+' 的输入为 '+words[index]+'，可读输入位置 1 至 '+(index+1)+'；预测标签是下一 token。';
  }
  function renderMoe(){
    const inputs=[...document.querySelectorAll('[data-expert-score]')],scores=inputs.map(input=>Number(input.value));inputs.forEach((input,i)=>input.nextElementSibling.textContent=scores[i].toFixed(1));
    const chosen=scores.map((score,i)=>({score,i})).sort((a,b)=>b.score-a.score||a.i-b.i).slice(0,2),weights=softmax(chosen.map(item=>item.score)),selected=new Map(chosen.map((item,i)=>[item.i,weights[i]]));
    document.querySelector('#expert-grid').innerHTML=scores.map((_,i)=>'<div class="'+(selected.has(i)?'selected':'')+'"><span>E'+(i+1)+'</span><b>'+(selected.has(i)?selected.get(i).toFixed(3):'0 · 跳过')+'</b></div>').join('');
    document.querySelector('#moe-output').textContent=chosen.map(item=>'E'+(item.i+1)).join(' + ');
  }
  document.querySelectorAll('[data-attention-score]').forEach(input=>input.addEventListener('input',renderAttention));
  document.querySelectorAll('[data-mask-step]').forEach((button,i)=>button.addEventListener('click',()=>renderMask(i)));
  document.querySelectorAll('[data-expert-score]').forEach(input=>input.addEventListener('input',renderMoe));
  renderAttention();renderMask(0);renderMoe();restore();
})();
