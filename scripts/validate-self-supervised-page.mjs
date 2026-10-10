import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createServer} from 'node:http';
import {dirname,join,extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {slides,sections,sequences,maeExample,contrastiveExample} from './self-supervised-course-data.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const build=join(root,'..','AI工程学','.course-build','05-self-supervised');
const output='/private/tmp/self-supervised-courseware-validation';
mkdirSync(output,{recursive:true});
const hash=data=>createHash('sha256').update(data).digest('hex');
const facts=JSON.parse(readFileSync(join(build,'source-review.json')));
assert.equal(facts.sha256,hash(readFileSync(join(root,'..','AI工程学','PPT材料','Self-supervised Learning.pptx'))));
const pages=slides.flatMap(s=>s.sourcePages);
assert.deepEqual([...new Set(pages)],facts.slides.map(s=>s.sourcePage));
assert.ok(pages.every((n,i)=>i===0||n>=pages[i-1]),'Teaching order must follow the source');
assert.equal(new Set(slides.map(s=>s.id)).size,slides.length);
const manifest=JSON.parse(readFileSync(join(build,'diagram-manifest.json')));
assert.equal(manifest.sourceSha256,facts.sha256);
assert.deepEqual(manifest.diagrams.map(d=>d.id),slides.map(s=>s.id));
for(const a of manifest.assets)assert.equal(hash(readFileSync(join(root,'media','self-supervised',a.name))),a.sha256);
for(const s of slides.filter(s=>Array.isArray(s.visual))){
  const shown=facts.slides.filter(p=>s.sourcePages.includes(p.sourcePage)).flatMap(p=>p.assets.filter(a=>p.objects.some(o=>o.imageRelationships.includes(a.relationshipId))).map(a=>a.part.split('/').pop()));
  for(const name of s.visual)assert.ok(shown.includes(name),s.id+': wrong source image '+name);
}
const katex=createRequire(import.meta.url)(join(root,'vendor','katex','katex.min.js'));
for(const e of slides.flatMap(s=>s.equations))katex.renderToString(e.tex,{displayMode:true,throwOnError:true,strict:'ignore'});
assert.ok(!/PPT|幻灯片|原课件|如图所示/.test(slides.flatMap(s=>[s.title,s.caption,s.note,...s.reading,...s.equations.map(e=>e.explanation)]).join('\n')));
const softmax=values=>{const max=Math.max(...values),exps=values.map(v=>Math.exp(v-max)),sum=exps.reduce((a,b)=>a+b,0);return exps.map(v=>v/sum);};
const weights=softmax(contrastiveExample.scores);
assert.ok(Math.abs(weights[0]-0.6439142598879724)<1e-12);
assert.ok(Math.abs(-Math.log(weights[0])-0.4401896985611953)<1e-12);
assert.equal(maeExample.visible.length/maeExample.size,.25);
assert.equal(maeExample.size-maeExample.visible.length,12);
for(let i=0;i<6;i++){assert.notEqual(i,i^1);assert.equal((i^1)^1,i);}
assert.equal(2*(10-1),18,'DINO valid view-pair terms');
assert.deepEqual([1,2,3,4,5,6].slice(-4),[3,4,5,6]);
assert.ok(Math.abs(.9*2+.1*4-2.2)<1e-12,'EMA example');
assert.ok(softmax([2,1,0].map(v=>v/.5))[0]>softmax([2,1,0])[0]);
const diagramFiles=readdirSync(join(root,'diagrams','self-supervised')).filter(n=>n.endsWith('.svg'));
for(const file of diagramFiles){const svg=readFileSync(join(root,'diagrams','self-supervised',file),'utf8');assert.ok(svg.includes('<title')&&svg.includes('<desc'));assert.ok(!svg.includes('undefined'));}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpeg':'image/jpeg','.pdf':'application/pdf','.woff2':'font/woff2'};
const server=createServer((req,res)=>{
  try{
    const path=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if(!path.startsWith(root+'/')){res.writeHead(403);res.end();return;}
    const body=readFileSync(path);res.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404);res.end();}
});
await new Promise((ok,no)=>{server.once('error',no);server.listen(0,'127.0.0.1',ok);});
const base='http://127.0.0.1:'+server.address().port;
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+output+'/chrome-'+process.pid,'about:blank'],{stdio:['ignore','ignore','pipe']});
let chromeErrors='';chrome.stderr.on('data',chunk=>{chromeErrors+=chunk;});
const pause=ms=>new Promise(ok=>setTimeout(ok,ms));
let socket;
try{
  let browser;
  for(let i=0;i<100;i++){const match=chromeErrors.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){browser=match[1];break;}await pause(100);}
  assert.ok(browser,'Chrome must start: '+chromeErrors);
  const port=new URL(browser).port;
  const target=(await fetch('http://127.0.0.1:'+port+'/json/list').then(r=>r.json())).find(t=>t.type==='page');
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((ok,no)=>{socket.addEventListener('open',ok,{once:true});socket.addEventListener('error',no,{once:true});});
  let serial=0;const pending=new Map(),errors=[];
  socket.addEventListener('message',event=>{
    const m=JSON.parse(event.data);
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
    if(m.method==='Log.entryAdded'&&m.params.entry.level==='error'&&!m.params.entry.url?.endsWith('/favicon.ico'))errors.push(m.params.entry);
    const p=pending.get(m.id);if(!p)return;clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(new Error(m.error.message)):p.resolve(m.result);
  });
  const send=(method,params={})=>new Promise((ok,no)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);no(new Error('Timeout '+method));},20000);pending.set(id,{resolve:ok,reject:no,timer});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const ready=async expression=>{for(let i=0;i<180;i++){if(await evaluate(expression))return;await pause(25);}throw new Error('Not ready: '+expression);};
  const navigate=async path=>{await send('Page.navigate',{url:base+'/'+path});await ready('document.readyState==="complete" && location.href==='+JSON.stringify(base+'/'+path));await evaluate('document.fonts.ready.then(()=>true)');};
  const screenshot=async name=>{const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});writeFileSync(join(output,name+'.png'),Buffer.from(r.data,'base64'));};
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const checks=[],sequenceChecks=[],screenshots=[];
  const captures=new Set(['imagenet','relative-patches','video-weighted-color','video-results','video-results-second','inpainting-results','mae-decoder','mae-mask-ablation','mae-extreme','mae-extreme-water','mae-extreme-subjects','infonce-probability','simclr-affinity','moco-fifo','dino-views','dino-objective','dinov2']);
  for(const width of [1920,1440,1024,390]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1050,deviceScaleFactor:1,mobile:width===390});
    await navigate('self-supervised-learning.html?mode=slides&page=1');
    for(let i=0;i<slides.length;i++){
      if(i)await evaluate('document.querySelector("#next-slide").click()');
      await ready('(()=>{const img=document.querySelector("#slide-static").hidden?document.querySelector("#slide-sequence img"):document.querySelector("#slide-image");return img?.complete&&img.naturalWidth>0;})()');
      const result=await evaluate('(async()=>{const host=document.querySelector("#slide-static").hidden?document.querySelector("#slide-sequence"):document.querySelector("#slide-static"),img=host.querySelector("img");await img.decode();const canvas=document.createElement("canvas");canvas.width=960;canvas.height=440;const ctx=canvas.getContext("2d");ctx.drawImage(img,0,0,960,440);const pixels=ctx.getImageData(0,70,960,350).data;let ink=0;for(let n=0;n<pixels.length;n+=4)if(.2126*pixels[n]+.7152*pixels[n+1]+.0722*pixels[n+2]<180)ink++;const title=document.querySelector("#slide-title").getBoundingClientRect(),number=document.querySelector(".intro-slide-number").getBoundingClientRect();return {id:document.querySelector("#slides-mode").dataset.slideId,scrollWidth:document.documentElement.scrollWidth,width:innerWidth,ink,mathErrors:document.querySelectorAll("#slides-mode .katex-error").length,overlap:title.left<number.right&&title.right>number.left&&title.top<number.bottom&&title.bottom>number.top,localScroll:host.scrollWidth>host.clientWidth,previous:document.querySelector("#previous-slide").disabled,next:document.querySelector("#next-slide").disabled};})()');
      assert.equal(result.id,slides[i].id);assert.ok(result.scrollWidth<=width+1,JSON.stringify(result));assert.ok(result.ink>300,JSON.stringify(result));assert.equal(result.mathErrors,0);assert.equal(result.overlap,false,JSON.stringify(result));
      assert.equal(result.previous,i===0);assert.equal(result.next,i===slides.length-1);
      if(width===390){
        const scroll=await evaluate('(()=>{const host=document.querySelector("#slide-static").hidden?document.querySelector("#slide-sequence .tf-sequence-stage"):document.querySelector("#slide-static");host.scrollLeft=10000;const end=host.scrollLeft;host.scrollLeft=0;return {end,width:host.clientWidth,scrollWidth:host.scrollWidth,zoomWidth:host.querySelector("a").getBoundingClientRect().width,overflow:getComputedStyle(host).overflowX,zoom:host.querySelector("a").href};})()');
        assert.ok(scroll.end>100,slides[i].id+': mobile diagram must scroll locally '+JSON.stringify(scroll));
        assert.ok(scroll.width<=width,slides[i].id+': scroll container must fit');
        assert.ok(scroll.zoom.includes('/diagrams/self-supervised/'+slides[i].id));
      }
      checks.push({mode:'slides',viewport:width,page:i+1,...result});
      if(captures.has(slides[i].id)&&(width===1440||width===390)){const name=slides[i].id+'-'+width;await screenshot(name);screenshots.push(name);}
    }
    await navigate('self-supervised-learning.html');
    assert.equal(await evaluate('document.querySelectorAll("#read-mode > section").length'),sections.length);
    for(const g of sections){
      await evaluate('document.querySelector(\'[data-section-link="'+g.id+'"]\').click()');
      await evaluate('new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)))');
      const result=await evaluate('(()=>{const g=document.getElementById('+JSON.stringify(g.id)+');return {scrollWidth:document.documentElement.scrollWidth,width:innerWidth,section:g.id,mathErrors:g.querySelectorAll(".katex-error").length,title:g.querySelector("h2").textContent,broken:[...g.querySelectorAll("img")].filter(i=>i.complete&&!i.naturalWidth).length};})()');
      assert.ok(result.scrollWidth<=width+1,JSON.stringify(result));assert.equal(result.mathErrors,0);assert.equal(result.broken,0);assert.equal(result.title,g.title);
      assert.equal(await evaluate('document.querySelector("[data-section-link].selected").dataset.sectionLink'),g.id);
      assert.equal(await evaluate('document.querySelector("[data-topic-link].selected").dataset.topicLink'),g.topic);
      checks.push({mode:'read',viewport:width,...result});
      if(['ssl-mae','ssl-infonce','ssl-video-computation','ssl-dino-collapse'].includes(g.id)&&(width===1440||width===390)){const name=g.id+'-read-'+width;await screenshot(name);screenshots.push(name);}
    }
    assert.equal(await evaluate('document.querySelectorAll("#read-mode .katex").length'),slides.flatMap(s=>s.equations).length);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  for(const [id,config] of Object.entries(sequences)){
    const s=slides.find(s=>s.id===id);
    await navigate('self-supervised-learning.html?mode=slides&page='+s.page);
    const host='#slide-sequence';
    await ready('document.querySelector("'+host+' img")?.complete');
    const hashes=[];
    for(let i=0;i<config.steps.length;i++){
      if(i)await evaluate('document.querySelector("'+host+' [data-sequence-action=next]").click()');
      await ready('document.querySelector("'+host+' .tf-sequence-stage").dataset.step==="'+i+'" && document.querySelector("'+host+' img").complete');
      const pixels=await evaluate('(async()=>{const img=document.querySelector("'+host+' img");await img.decode();const c=document.createElement("canvas");c.width=960;c.height=440;const x=c.getContext("2d");x.drawImage(img,0,0,960,440);return c.toDataURL();})()');
      hashes.push(hash(pixels));
    }
    assert.equal(new Set(hashes).size,config.steps.length,id+': frames must actually change');
    const name=id+'-final-1440';await screenshot(name);screenshots.push(name);
    await evaluate('document.querySelector("'+host+' [data-sequence-action=replay]").click()');
    assert.equal(await evaluate('document.querySelector("'+host+' .tf-sequence-stage").dataset.step'),'0');
    assert.equal(await evaluate('document.querySelector("'+host+' [data-sequence-action=play]").getAttribute("aria-pressed")'),'false');
    await evaluate('document.querySelector("#read-current").click()');
    const reading=await evaluate('(()=>{const h=document.querySelector(\'#read-mode [data-sequence="'+id+'"]\');return {step:h.querySelector(".tf-sequence-stage").dataset.step,playing:h.querySelector("[data-sequence-action=play]").getAttribute("aria-pressed"),section:location.hash};})()');
    assert.equal(reading.step,String(config.steps.length-1));assert.equal(reading.playing,'false');assert.equal(reading.section,'#'+s.section);
    sequenceChecks.push({id,frames:config.steps.length,distinctFrames:true,reducedMotion:true,modeMapping:true});
  }
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  const test=slides.find(s=>s.id==='moco-fifo');
  await navigate('self-supervised-learning.html?mode=slides&page='+test.page);
  await ready('document.querySelector("#slide-sequence [data-sequence-action=play]").getAttribute("aria-pressed")==="true"');
  await pause(2400);
  assert.equal(await evaluate('document.querySelector("#slide-sequence .tf-sequence-stage").dataset.step'),'1');
  await evaluate('document.querySelector("#slide-sequence [data-sequence-action=play]").click()');
  await pause(2300);
  assert.equal(await evaluate('document.querySelector("#slide-sequence .tf-sequence-stage").dataset.step'),'1','Pause must stop progress');
  await evaluate('document.querySelector("#slide-sequence [data-sequence-action=play]").click();document.querySelector("#next-slide").click()');
  assert.equal(await evaluate('document.querySelector("#slide-sequence").children.length'),0,'Leaving sequence clears player');
  await navigate('self-supervised-learning.html?mode=slides&page=40');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  assert.equal(await evaluate('document.querySelector("#slide-counter").textContent'),'41 / '+slides.length);
  await evaluate('history.back()');
  await ready('document.querySelector("#slide-counter").textContent==="40 / '+slides.length+'"');
  await evaluate('document.querySelector("#copy-slide-link").click()');
  assert.ok((await evaluate('location.href')).includes('mode=slides&page=40'));
  for(const file of ['index.html','lectures.html']){
    await navigate(file);await evaluate('document.querySelector(\'a[href="self-supervised-learning.html#ssl-visual-tasks"]\').click()');
    await ready('location.pathname.endsWith("/self-supervised-learning.html")&&!!document.querySelector("#ssl-course-data")');
  }
  await navigate('index.html');await evaluate('document.querySelector(\'#lesson-5 a[href*="mode=slides"]\').click()');
  await ready('!document.querySelector("#slides-mode")?.hidden&&!!document.querySelector("#ssl-course-data")');
  await navigate('downloads.html');
  const pdf=await evaluate('(()=>{const a=document.querySelector("#pdf-5 a[download]");return {url:a.href,missing:a.hasAttribute("data-missing"),status:document.querySelector("#pdf-5 .file-status").textContent};})()');
  assert.equal(pdf.missing,false);assert.equal((await fetch(pdf.url)).status,200);
  await navigate('self-supervised-learning.html');
  for(const file of diagramFiles){
    const bounds=await evaluate('(async()=>{const xml=await fetch('+JSON.stringify('diagrams/self-supervised/')+'+'+JSON.stringify(file)+').then(r=>r.text());const host=document.createElement("div");host.style.cssText="position:absolute;left:-10000px;top:0;width:960px";host.innerHTML=xml;document.body.append(host);const bad=[...host.querySelectorAll("text")].map(t=>({text:t.textContent,b:t.getBBox()})).filter(({b})=>b.x<0||b.x+b.width>961||b.y<0||b.y+b.height>441).map(({text,b})=>({text,x:b.x,y:b.y,width:b.width,height:b.height}));host.remove();return bad;})()');
    assert.deepEqual(bounds,[],file+': SVG text must fit');
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  const report={date:'2026-10-10',status:'passed',sourceSha256:facts.sha256,sourcePages:facts.slides.length,readingSections:sections.length,presentationSteps:slides.length,viewports:[1920,1440,1024,390],checks,sequenceChecks,screenshots: screenshots.map(n=>join(output,n+'.png')),resourceHashes:{html:hash(readFileSync(join(root,'self-supervised-learning.html'))),runtime:hash(readFileSync(join(root,'self-supervised-learning.js'))),data:hash(readFileSync(join(root,'scripts','self-supervised-course-data.mjs'))),pdf:hash(readFileSync(join(root,'pdf','Self-supervised Learning.pdf')))},browser:'Chrome DevTools Protocol, matching existing project validators',errors};
  writeFileSync(join(build,'validation-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PASS: '+checks.length+' reading/presentation viewport checks; all '+slides.length+' steps; '+sequenceChecks.length+' sequences; math, source hashes, numeric checks, navigation and PDF.');
}finally{
  socket?.close();chrome.kill('SIGTERM');
  await new Promise(ok=>server.close(ok));
}
