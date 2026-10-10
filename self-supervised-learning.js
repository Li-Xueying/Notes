(() => {
  const {slides,sections,topics,sequences,assetVersion}=JSON.parse(document.querySelector('#ssl-course-data').textContent);
  const read=document.querySelector('#read-mode'),presentation=document.querySelector('#slides-mode');
  const starts=Object.fromEntries(sections.map(g=>[g.id,slides.findIndex(s=>s.section===g.id)+1]));
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const players=new Set();
  let page=1,mode='read',active=sections[0].id,player,scrollFrame;
  const imageUrl=(id,index=null)=>'diagrams/self-supervised/'+id+(index===null?'':'-step-'+index)+'.svg?v='+assetVersion;
  const math=host=>host.querySelectorAll('[data-tex]').forEach(el=>window.katex?.render(el.dataset.tex,el,{displayMode:true,throwOnError:false,strict:'ignore'}));
  function createPlayer(host,autoplay=false){
    const id=host.dataset.sequence,config=sequences[id],last=config.steps.length-1;
    let index=autoplay?0:last,playing=false,timer;
    const stage=host.querySelector('.tf-sequence-stage'),play=host.querySelector('[data-sequence-action="play"]');
    const zoom=document.createElement('a'),img=new Image();
    zoom.className='tf-sequence-zoom';zoom.target='_blank';zoom.rel='noopener';zoom.setAttribute('aria-label','放大当前图解');
    zoom.append(img);stage.replaceChildren(zoom);
    function draw(){
      img.src=imageUrl(id,index);zoom.href=img.src;img.alt=slides.find(s=>s.id===id).title+'。'+config.steps[index];
      stage.dataset.step=String(index);host.querySelector('.tf-sequence-counter').textContent=(index+1)+' / '+(last+1);
      host.querySelector('.tf-sequence-caption').textContent=config.steps[index];
      host.querySelector('[data-sequence-action="previous"]').disabled=index===0;
      host.querySelector('[data-sequence-action="next"]').disabled=index===last;
      play.querySelector('[data-play-icon]').hidden=playing;play.querySelector('[data-pause-icon]').hidden=!playing;
      const label=playing?'暂停':index===last?'重播':'播放';play.setAttribute('aria-label',label);play.dataset.tooltip=label;play.setAttribute('aria-pressed',String(playing));
    }
    function setPlaying(value){
      playing=value;clearTimeout(timer);draw();
      if(!playing)return;
      timer=setTimeout(()=>{
        const r=host.getBoundingClientRect();
        if(document.hidden||!host.getClientRects().length||r.bottom<=0||r.top>=innerHeight||index===last){setPlaying(false);return;}
        index++;setPlaying(index<last);
      },2200);
    }
    const click=e=>{
      const action=e.target.closest('[data-sequence-action]')?.dataset.sequenceAction;
      if(!action)return;
      if(action==='play'){if(!playing&&index===last)index=0;setPlaying(!playing);}
      else if(action==='replay'){index=0;setPlaying(!reduced.matches);}
      else{setPlaying(false);index=Math.max(0,Math.min(last,index+(action==='next'?1:-1)));draw();}
    };
    host.addEventListener('click',click);
    const observer=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting&&playing)setPlaying(false);});
    observer.observe(host);
    const item={pause:()=>setPlaying(false),destroy:()=>{clearTimeout(timer);observer.disconnect();host.removeEventListener('click',click);players.delete(item);}};
    players.add(item);draw();if(autoplay&&!reduced.matches)setPlaying(true);return item;
  }
  read.querySelectorAll('[data-sequence]').forEach(host=>createPlayer(host));
  math(read);
  const pauseAll=()=>players.forEach(p=>p.pause());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseAll();});
  reduced.addEventListener('change',()=>{if(reduced.matches)pauseAll();});
  function select(id){
    active=id;const topic=sections.find(g=>g.id===id).topic;
    document.querySelectorAll('[data-topic-link]').forEach(a=>a.classList.toggle('selected',a.dataset.topicLink===topic));
    document.querySelectorAll('[data-section-link]').forEach(a=>a.classList.toggle('selected',a.dataset.sectionLink===id));
  }
  function url(replace=false){
    const u=new URL(location.href);u.searchParams.set('mode',mode);u.searchParams.set('page',page);u.hash=mode==='read'?active:'';
    history[replace?'replaceState':'pushState']({},'',u);
  }
  function panels(){
    cancelAnimationFrame(scrollFrame);pauseAll();
    read.hidden=mode!=='read';presentation.hidden=mode!=='slides';
    document.querySelectorAll('[data-mode-button]').forEach(b=>{
      const chosen=b.dataset.modeButton===mode;b.classList.toggle('primary',chosen);b.classList.toggle('secondary',!chosen);b.setAttribute('aria-selected',String(chosen));
    });
  }
  function render(){
    player?.destroy();player=null;
    const host=document.querySelector('#slide-sequence');host.replaceChildren();
    const s=slides[page-1];select(s.section);presentation.dataset.slideId=s.id;
    document.querySelector('#slide-topic').textContent=topics[s.topic].label;
    for(const field of ['title','caption','note'])document.querySelector('#slide-'+field).textContent=s[field];
    document.querySelector('#slide-page').textContent=String(page).padStart(2,'0');
    document.querySelector('#slide-counter').textContent=page+' / '+slides.length;
    document.querySelector('#slide-progress').style.width=page/slides.length*100+'%';
    document.querySelector('#previous-slide').disabled=page===1;document.querySelector('#next-slide').disabled=page===slides.length;
    const img=document.querySelector('#slide-image');img.src=imageUrl(s.id);img.alt=s.title+'。'+s.caption;document.querySelector('#slide-link').href=img.src;
    const sequence=Boolean(sequences[s.id]);document.querySelector('#slide-static').hidden=sequence;host.hidden=!sequence;
    if(sequence){const copy=read.querySelector('[data-sequence="'+s.id+'"]').cloneNode(true);host.append(copy);player=createPlayer(copy,true);}
    const equations=document.querySelector('#slide-equations');equations.replaceChildren();
    for(const e of s.equations){
      const block=document.createElement('div'),explanation=document.createElement('p');
      block.className='cnn-equation';block.dataset.tex=e.tex;explanation.className='ssl-equation-explanation';explanation.textContent=e.explanation;
      equations.append(block,explanation);
    }
    math(equations);
  }
  function showSlides(n=page,push=true){
    mode='slides';page=Math.max(1,Math.min(slides.length,n));panels();render();if(push)url();
    document.querySelector('.intro-lecture-header').scrollIntoView({block:'start',behavior:'instant'});
  }
  function showRead(id,push=true){
    player?.destroy();player=null;document.querySelector('#slide-sequence').replaceChildren();
    mode='read';page=starts[id];panels();select(id);if(push)url();
    document.getElementById(id).scrollIntoView({block:'start',behavior:'instant'});
  }
  document.querySelectorAll('[data-mode-button]').forEach(b=>b.addEventListener('click',()=>b.dataset.modeButton==='slides'?showSlides(starts[active]):showRead(slides[page-1].section)));
  const tabs=[...document.querySelectorAll('[data-mode-button]')];
  tabs.forEach((tab,i)=>tab.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const target=tabs[1-i];target.focus();target.click();}));
  document.querySelectorAll('[data-present-section]').forEach(b=>b.addEventListener('click',()=>showSlides(starts[b.dataset.presentSection])));
  document.querySelectorAll('[data-section-link],[data-topic-link]').forEach(a=>a.addEventListener('click',e=>{
    e.preventDefault();const id=a.dataset.sectionLink||topics[a.dataset.topicLink].target;mode==='read'?showRead(id):showSlides(starts[id]);
  }));
  document.querySelector('#previous-slide').addEventListener('click',()=>{if(page>1)showSlides(page-1);});
  document.querySelector('#next-slide').addEventListener('click',()=>{if(page<slides.length)showSlides(page+1);});
  document.querySelector('#read-current').addEventListener('click',()=>showRead(slides[page-1].section));
  document.querySelector('#copy-slide-link').addEventListener('click',async e=>{
    url(true);const span=e.currentTarget.querySelector('span');try{await navigator.clipboard.writeText(location.href);span.textContent='已复制链接';}catch{span.textContent='请复制地址栏';}
    setTimeout(()=>{span.textContent='复制当前位置';},1800);
  });
  document.addEventListener('keydown',e=>{
    if(e.target.closest('input,textarea,select,button,[contenteditable]'))return;
    if(mode==='slides'&&e.key==='ArrowRight'&&page<slides.length){e.preventDefault();showSlides(page+1);}
    if(mode==='slides'&&e.key==='ArrowLeft'&&page>1){e.preventDefault();showSlides(page-1);}
  });
  function restore(){
    const u=new URL(location.href),n=Number(u.searchParams.get('page'));page=Number.isInteger(n)&&n>=1&&n<=slides.length?n:1;
    const hash=u.hash.slice(1);
    if(u.searchParams.get('mode')==='slides')showSlides(page,false);
    else if(starts[hash])showRead(hash,false);
    else if(u.searchParams.has('page'))showRead(slides[page-1].section,false);
    else{mode='read';panels();select(sections[0].id);}
  }
  window.addEventListener('popstate',restore);window.addEventListener('hashchange',restore);
  window.addEventListener('scroll',()=>{
    if(mode!=='read')return;cancelAnimationFrame(scrollFrame);
    scrollFrame=requestAnimationFrame(()=>{
      if(mode!=='read')return;const top=(document.querySelector('.site-header')?.getBoundingClientRect().bottom||0)+32;
      let id=sections[0].id;for(const g of sections)if(document.getElementById(g.id).getBoundingClientRect().top<=top)id=g.id;
      if(scrollY+innerHeight>=document.documentElement.scrollHeight-2)id=sections.at(-1).id;
      if(id!==active){select(id);page=starts[id];url(true);}
    });
  },{passive:true});
  restore();
})();
