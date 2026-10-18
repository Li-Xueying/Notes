import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createServer} from 'node:http';
import {dirname,join,extname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {slides,sections,sequences,chainExample,vaeExample,ganStates,ganExample,flowExample,eulerStates,eulerExample,cfgExample} from './generative-course-data.mjs';
import * as part1 from './generative-part1-course-data.mjs';
import * as part2 from './generative-part2-course-data.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const build=join(root,'..','AI工程学','.course-build','06-generative','part2');
const output='/private/tmp/generative-courseware-validation';
mkdirSync(output,{recursive:true});
const hash=data=>createHash('sha256').update(data).digest('hex');
const factsByPart={},manifests={};
for(const [part,course,filename] of [['part1',part1,'Part I-Generative.pdf'],['part2',part2,'Part II-Generative.pdf']]){
  const dir=join(build,'..',part),facts=JSON.parse(readFileSync(join(dir,'facts.json'))),manifest=JSON.parse(readFileSync(join(dir,'diagram-manifest.json')));
  assert.equal(facts.sha256,hash(readFileSync(join(root,'pdf',filename))));
  const pages=course.slides.flatMap(s=>s.sourcePages);
  assert.deepEqual([...new Set(pages)],facts.pages.map(s=>s.sourcePage));
  assert.ok(pages.every((n,i)=>i===0||n>=pages[i-1]),part+': teaching order follows source');
  assert.equal(manifest.sourceSha256,facts.sha256);
  assert.deepEqual(manifest.diagrams.map(d=>d.id),course.slides.map(s=>s.id));
  const coverage=JSON.parse(readFileSync(join(dir,'teaching-coverage.json')));
  assert.ok(coverage.coverage.every(g=>g.locations.length>0));
  for(const s of course.slides){
    const ids=Array.isArray(s.visual)?s.visual:[s.visual];
    for(const id of ids){const a=manifest.assets.find(a=>a.id===id);if(a)assert.ok(s.sourcePages.includes(a.sourcePage),s.id+': evidence must occur in mapped pages');}
  }
  factsByPart[part]=facts;manifests[part]=manifest;
}
const facts={sha256:Object.fromEntries(Object.entries(factsByPart).map(([part,f])=>[part,f.sha256])),pages:Object.values(factsByPart).flatMap(f=>f.pages)};
assert.deepEqual(slides.slice(0,47).map(s=>s.id),part1.slides.map(s=>s.id),'Part I slide addresses must remain stable');
assert.equal(new Set(slides.map(s=>s.id)).size,slides.length);
assert.deepEqual([...new Set(sections.map(g=>g.part))],['part1','part2']);
const route=slides[0];
assert.equal(route.id,'generative-route');
assert.match(route.caption,/Part I.*Part II/);
assert.match(route.note,/Part I/);
assert.match(route.note,/Part II/);
const manifest={assets:Object.values(manifests).flatMap(m=>m.assets),diagrams:Object.values(manifests).flatMap(m=>m.diagrams)};
for(const a of manifest.assets)assert.equal(hash(readFileSync(join(root,a.output))),a.sha256);
const routeDiagram=readFileSync(join(root,'diagrams','generative','part1','generative-route.svg'),'utf8');
assert.match(routeDiagram,/Part I · 概率建模与潜变量/);
assert.match(routeDiagram,/Part II · 对抗、连续与条件生成/);
for(const s of slides.filter(s=>Array.isArray(s.visual)))for(const id of s.visual){
  const asset=manifest.assets.find(a=>a.id===id);assert.ok(asset,s.id+': unknown source asset');
  assert.ok(s.sourcePages.includes(asset.sourcePage),s.id+': evidence must occur in mapped source pages');
}
assert.equal(manifest.assets.length,45);
const ocr=JSON.parse(readFileSync(join(build,'embedded-evidence-ocr.json')));
assert.equal(ocr.sourceSha256,factsByPart.part2.sha256);
for(const a of manifests.part2.assets)assert.equal(ocr.evidence.find(e=>e.id===a.id).sha256,a.sha256);
const katex=createRequire(import.meta.url)(join(root,'vendor','katex','katex.min.js'));
for(const e of slides.flatMap(s=>s.equations))katex.renderToString(e.tex,{displayMode:true,throwOnError:true,strict:'ignore'});
assert.ok(!/PPT|幻灯片|原课件|如图所示/.test(slides.flatMap(s=>[s.title,s.caption,s.note,...s.reading,...s.equations.map(e=>e.explanation)]).join('\n')));
const close=(a,b,label)=>assert.ok(Math.abs(a-b)<1e-8,label+': '+a+' vs '+b);
close(chainExample.probabilities.reduce((p,v)=>p*v,1),.06,'chain probability');
assert.equal(1024*1024*3,3145728);
const e=vaeExample,z=e.mu.map((m,i)=>m+e.sigma[i]*e.epsilon[i]),mean=z.map((v,i)=>v*e.decoderScales[i]);
assert.deepEqual(z,[1,-2]);assert.deepEqual(mean,[.5,-.5]);
const kl=(mu,sigma)=>.5*mu.reduce((sum,m,i)=>sum+m*m+sigma[i]**2-1-Math.log(sigma[i]**2),0);
const loss=(mu,sigma)=>mu.reduce((sum,m,i)=>sum+(e.decoderScales[i]*(m+sigma[i]*e.epsilon[i])-e.x[i])**2,0)/(2*e.observationVariance)+kl(mu,sigma);
close(kl(e.mu,e.sigma),1.75,'prior KL');close(kl([0,0],[1,1]),0,'matching standard Gaussian');close(loss(e.mu,e.sigma),1.8,'negative ELBO without observation constant');
for(let j=0;j<2;j++){
  const delta=1e-5,muPlus=[...e.mu],muMinus=[...e.mu],sigmaPlus=[...e.sigma],sigmaMinus=[...e.sigma];
  muPlus[j]+=delta;muMinus[j]-=delta;sigmaPlus[j]+=delta;sigmaMinus[j]-=delta;
  const residual=mean[j]-e.x[j],gradMu=e.decoderScales[j]*residual/e.observationVariance+e.mu[j],gradSigma=e.decoderScales[j]*residual*e.epsilon[j]/e.observationVariance+e.sigma[j]-1/e.sigma[j];
  close((loss(muPlus,e.sigma)-loss(muMinus,e.sigma))/(2*delta),gradMu,'reparameterization mu gradient');
  close((loss(e.mu,sigmaPlus)-loss(e.mu,sigmaMinus))/(2*delta),gradSigma,'reparameterization sigma gradient');
}
const prior=[.4,.6],conditional=[.8,.3],qx=[.5,.5],px=prior.reduce((sum,p,i)=>sum+p*conditional[i],0),posterior=prior.map((p,i)=>p*conditional[i]/px);
const discreteKL=(q,p)=>q.reduce((sum,v,i)=>sum+v*Math.log(v/p[i]),0);
const reconstruction=qx.reduce((sum,q,i)=>sum+q*Math.log(conditional[i]),0),elbo=reconstruction-discreteKL(qx,prior),gap=discreteKL(qx,posterior);
close(Math.log(px),elbo+gap,'exact ELBO decomposition');assert.ok(elbo<=Math.log(px));
close(discreteKL(posterior,posterior),0,'exact posterior gap');
const gs=ganStates();assert.equal(gs.length,3);close(gs[0].fake,.2,'initial generator output');
assert.equal(gs[1].g,gs[0].g,'D update freezes G');assert.equal(gs[2].a,gs[1].a,'G update freezes D');assert.equal(gs[2].b,gs[1].b,'G update freezes D bias');
assert.ok(gs[2].fake>gs[1].fake&&gs[2].fakeScore>gs[1].fakeScore);
const sigmoid=n=>1/(1+Math.exp(-n)),step=1e-5;
const value=(a,b,g)=>Math.log(sigmoid(a*ganExample.real+b))+Math.log(1-sigmoid(a*g*ganExample.z+b));
close((value(1+step,0,.2)-value(1-step,0,.2))/(2*step),(gs[1].a-1)/ganExample.rate,'D finite-difference gradient a');
close((value(1,step,.2)-value(1,-step,.2))/(2*step),gs[1].b/ganExample.rate,'D finite-difference gradient b');
const generatorLoss=g=>-Math.log(sigmoid(gs[1].a*g*ganExample.z+gs[1].b));
close((generatorLoss(.2+step)-generatorLoss(.2-step))/(2*step),-(gs[2].g-.2)/ganExample.rate,'non-saturating G finite-difference gradient');
const dr=.01,logit=Math.log(dr/(1-dr)),sat=a=>Math.log(1-sigmoid(a)),ns=a=>-Math.log(sigmoid(a));
close((sat(logit+step)-sat(logit-step))/(2*step),-.01,'saturating logit gradient');
close((ns(logit+step)-ns(logit-step))/(2*step),-.99,'non-saturating logit gradient');
const flowVelocity=flowExample.z.map((v,i)=>v-flowExample.x[i]);assert.deepEqual(flowVelocity,[-3,3]);
for(const t of flowExample.times){const u=flowExample.x.map((v,i)=>(1-t)*v+t*flowExample.z[i]);for(let i=0;i<2;i++)close((u[i]+step*flowVelocity[i]-u[i])/step,flowVelocity[i],'linear-path derivative');}
const es=eulerStates();assert.equal(es.length,eulerExample.steps+1);assert.equal(es.at(-1).t,0);close(es.at(-1).x[0],-19/27,'Euler x0 coordinate 1');close(es.at(-1).x[1],8/27,'Euler x0 coordinate 2');
for(let i=1;i<es.length;i++)for(let j=0;j<2;j++)close(es[i].x[j],es[i-1].x[j]+(es[i].t-es[i-1].t)*es[i-1].velocity[j],'Euler negative time step');
for(const w of cfgExample.weights)assert.deepEqual(cfgExample.conditional.map((v,i)=>(1+w)*v-w*cfgExample.unconditional[i]),[-1-2*w,2]);
for(const a of [.0,.3,.8,1]){const b=Math.sqrt(1-a*a),x=1.7,noise=-.6,xt=a*x+b*noise,v=a*noise-b*x;close(a*xt-b*v,x,'VP data inverse');close(b*xt+a*v,noise,'VP noise inverse');}
const diagramFiles=['part1','part2'].flatMap(part=>readdirSync(join(root,'diagrams','generative',part)).filter(n=>n.endsWith('.svg')).map(n=>part+'/'+n));
for(const file of diagramFiles){const svg=readFileSync(join(root,'diagrams','generative',file),'utf8');assert.ok(svg.includes('<title')&&svg.includes('<desc'));assert.ok(!svg.includes('undefined'));}
assert.ok(!readFileSync(join(root,'diagrams','generative','part1','elbo-split-logs.svg'),'utf8').includes('先验 KL'),'The algebra step must precede KL identification');
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
  const captures=new Set(['vae-training-loss','elbo-split-logs','gan-minimax','gan-alternating','gan-nonsaturating','gan-stylegan','flow-linear-path','flow-training-code','flow-euler-trajectory','flow-cfg-combination','flow-endpoint-velocities','diffusion-prediction-targets','ldm-benchmark','dit-architecture-results','repa-component-results','cogvideox-frame-packing','videorepa-token-relations','worldforge-naive-alignment','h3-world-control-evidence','generative-perception-pipelines','generative-segmentation-results']);
  for(const width of [1920,1440,1024,390]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1050,deviceScaleFactor:1,mobile:width===390});
    await navigate('generative-models.html?mode=slides&page=1');
    for(let i=0;i<slides.length;i++){
      if(i)await evaluate('document.querySelector("#next-slide").click()');
      await ready('(()=>{const img=document.querySelector("#slide-static").hidden?document.querySelector("#slide-sequence img"):document.querySelector("#slide-image");return img?.complete&&img.naturalWidth>0;})()');
      const result=await evaluate('(async()=>{const host=document.querySelector("#slide-static").hidden?document.querySelector("#slide-sequence"):document.querySelector("#slide-static"),img=host.querySelector("img");await img.decode();const canvas=document.createElement("canvas");canvas.width=960;canvas.height=440;const ctx=canvas.getContext("2d");ctx.drawImage(img,0,0,960,440);const pixels=ctx.getImageData(0,70,960,350).data;let ink=0;for(let n=0;n<pixels.length;n+=4)if(.2126*pixels[n]+.7152*pixels[n+1]+.0722*pixels[n+2]<180)ink++;const title=document.querySelector("#slide-title").getBoundingClientRect(),number=document.querySelector(".intro-slide-number").getBoundingClientRect();return {id:document.querySelector("#slides-mode").dataset.slideId,scrollWidth:document.documentElement.scrollWidth,width:innerWidth,ink,mathErrors:document.querySelectorAll("#slides-mode .katex-error").length,overlap:title.left<number.right&&title.right>number.left&&title.top<number.bottom&&title.bottom>number.top,localScroll:host.scrollWidth>host.clientWidth,previous:document.querySelector("#previous-slide").disabled,next:document.querySelector("#next-slide").disabled};})()');
      assert.equal(result.id,slides[i].id);assert.ok(result.scrollWidth<=width+1,JSON.stringify(result));assert.ok(result.ink>300,JSON.stringify(result));assert.equal(result.mathErrors,0);assert.equal(result.overlap,false,JSON.stringify(result));
      assert.equal(result.previous,i===0);assert.equal(result.next,i===slides.length-1);
      assert.equal(await evaluate('document.querySelector("[data-section-link].selected").dataset.sectionLink'),slides[i].section);
      assert.equal(await evaluate('document.querySelector("[data-topic-link].selected").dataset.topicLink'),slides[i].topic);
      if(width>=1440){const position=await evaluate('(()=>{const host=document.querySelector(".page-toc"),toc=host.getBoundingClientRect(),link=document.querySelector("[data-section-link].selected").getBoundingClientRect();return {top:toc.top,bottom:toc.bottom,itemTop:link.top,itemBottom:link.bottom,scroll:host.scrollTop};})()');assert.ok(position.itemTop>=position.top-1&&position.itemBottom<=position.bottom+1,'Current section must be visible: '+slides[i].id+' / '+width+' / '+JSON.stringify(position));}
      if(width===390){
        const scroll=await evaluate('(()=>{const host=document.querySelector("#slide-static").hidden?document.querySelector("#slide-sequence .tf-sequence-stage"):document.querySelector("#slide-static");host.scrollLeft=10000;const end=host.scrollLeft;host.scrollLeft=0;return {end,width:host.clientWidth,scrollWidth:host.scrollWidth,zoomWidth:host.querySelector("a").getBoundingClientRect().width,overflow:getComputedStyle(host).overflowX,zoom:host.querySelector("a").href};})()');
        assert.ok(scroll.end>100,slides[i].id+': mobile diagram must scroll locally '+JSON.stringify(scroll));
        assert.ok(scroll.width<=width,slides[i].id+': scroll container must fit');
        const sourceImage=manifest.diagrams.find(d=>d.id===slides[i].id).sourceImage;
        assert.ok(scroll.zoom.includes(sourceImage||'/diagrams/generative/'+slides[i].part+'/'+slides[i].id));
      }
      assert.deepEqual(await evaluate('[...document.querySelectorAll("#slide-details p")].map(p=>p.textContent)'),slides[i].reading.slice(1),slides[i].id+': both modes must retain supporting explanations');
      assert.equal(await evaluate('document.querySelector("#slide-note").textContent'),slides[i].note);
      assert.equal(await evaluate('document.querySelector("#slide-evidence").hidden'),!slides[i].evidence);
      assert.equal(await evaluate('document.querySelector("#slide-details code")?.textContent||null'),slides[i].code||null);
      checks.push({mode:'slides',viewport:width,page:i+1,...result});
      if(captures.has(slides[i].id)&&(width===1440||width===390)){const name=slides[i].id+'-'+width;await screenshot(name);screenshots.push(name);}
    }
    await navigate('generative-models.html');
    assert.equal(await evaluate('document.querySelectorAll("#read-mode > section").length'),sections.length);
    assert.deepEqual(await evaluate('[...document.querySelectorAll("[data-toc-part]")].map(part=>({id:part.dataset.tocPart,topics:[...part.querySelectorAll("[data-topic-link]")].map(link=>link.dataset.topicLink),sections:[...part.querySelectorAll("[data-section-link]")].map(link=>link.dataset.sectionLink)}))'),[
      {id:'part1',topics:['foundations','autoregressive','vae'],sections:sections.filter(g=>g.part==='part1').map(g=>g.id)},
      {id:'part2',topics:['gan','flow','applications'],sections:sections.filter(g=>g.part==='part2').map(g=>g.id)},
    ]);
    await evaluate('Promise.all([...document.querySelectorAll("#read-mode img")].map(i=>{i.loading="eager";return i.decode();})).then(()=>true)');
    for(const g of sections){
      await evaluate('document.querySelector(\'[data-section-link="'+g.id+'"]\').click()');
      await evaluate('new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)))');
      const result=await evaluate('(()=>{const g=document.getElementById('+JSON.stringify(g.id)+');return {scrollWidth:document.documentElement.scrollWidth,width:innerWidth,section:g.id,mathErrors:g.querySelectorAll(".katex-error").length,title:g.querySelector("h2").textContent,broken:[...g.querySelectorAll("img")].filter(i=>i.complete&&!i.naturalWidth).length};})()');
      assert.ok(result.scrollWidth<=width+1,JSON.stringify(result));assert.equal(result.mathErrors,0);assert.equal(result.broken,0);assert.equal(result.title,g.title);
      assert.equal(await evaluate('document.querySelector("[data-section-link].selected").dataset.sectionLink'),g.id);
      assert.equal(await evaluate('document.querySelector("[data-topic-link].selected").dataset.topicLink'),g.topic);
      assert.equal(await evaluate('document.querySelector("[data-toc-part].selected").dataset.tocPart'),g.part);
      checks.push({mode:'read',viewport:width,...result});
      if(['gen-gan-objective','gen-flow-training','gen-flow-cfg','gen-repa','gen-h3-world'].includes(g.id)&&(width===1440||width===390)){const name=g.id+'-read-'+width;await screenshot(name);screenshots.push(name);}
    }
    assert.equal(await evaluate('document.querySelectorAll("#read-mode .katex").length'),slides.flatMap(s=>s.equations).length);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  for(const [id,config] of Object.entries(sequences)){
    const s=slides.find(s=>s.id===id);
    await navigate('generative-models.html?mode=slides&page='+s.page);
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
  const test=slides.find(s=>s.id==='vae-training-loss');
  await navigate('generative-models.html?mode=slides&page='+test.page);
  await ready('document.querySelector("#slide-sequence [data-sequence-action=play]").getAttribute("aria-pressed")==="true"');
  await pause(2400);
  assert.equal(await evaluate('document.querySelector("#slide-sequence .tf-sequence-stage").dataset.step'),'1');
  await evaluate('document.querySelector("#slide-sequence [data-sequence-action=play]").click()');
  await pause(2300);
  assert.equal(await evaluate('document.querySelector("#slide-sequence .tf-sequence-stage").dataset.step'),'1','Pause must stop progress');
  await evaluate('document.querySelector("#slide-sequence [data-sequence-action=play]").click();document.querySelector("#next-slide").click()');
  assert.equal(await evaluate('document.querySelector("#slide-sequence").children.length'),0,'Leaving sequence clears player');
  await navigate('generative-models.html?mode=slides&page=40');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
  assert.equal(await evaluate('document.querySelector("#slide-counter").textContent'),'41 / '+slides.length);
  await evaluate('history.back()');
  await ready('document.querySelector("#slide-counter").textContent==="40 / '+slides.length+'"');
  await evaluate('document.querySelector("#copy-slide-link").click()');
  assert.ok((await evaluate('location.href')).includes('mode=slides&page=40'));
  for(const file of ['index.html','lectures.html']){
    await navigate(file);await evaluate('document.querySelector(\'a[href="generative-models.html#gen-learning-tasks"]\').click()');
    await ready('location.pathname.endsWith("/generative-models.html")&&!!document.querySelector("#gen-course-data")');
  }
  await navigate('index.html');await evaluate('document.querySelector(\'#lesson-6 a[href*="mode=slides"]\').click()');
  await ready('!document.querySelector("#slides-mode")?.hidden&&!!document.querySelector("#gen-course-data")');
  await navigate('downloads.html');
  const pdfLinks=await evaluate('[...document.querySelectorAll("#pdf-6 a[download]")].map(a=>({url:a.href,missing:a.hasAttribute("data-missing")}))');
  assert.equal(pdfLinks.length,2);
  const downloadPath=join(output,'downloads-'+process.pid);mkdirSync(downloadPath,{recursive:true});
  await send('Page.setDownloadBehavior',{behavior:'allow',downloadPath});
  for(const [i,link] of pdfLinks.entries()){
    assert.equal(link.missing,false);const response=await fetch(link.url);assert.equal(response.status,200);
    const filename=i?'Part II-Generative.pdf':'Part I-Generative.pdf',expected=hash(readFileSync(join(root,'pdf',filename)));
    assert.equal(hash(Buffer.from(await response.arrayBuffer())),expected);
    await evaluate('document.querySelectorAll("#pdf-6 a[download]")['+i+'].click()');
    let downloaded=false;
    for(let attempt=0;attempt<100;attempt++){try{downloaded=hash(readFileSync(join(downloadPath,filename)))===expected;}catch{}if(downloaded)break;await pause(100);}
    assert.ok(downloaded,filename+': actual browser download must finish with matching bytes');
  }
  for(const file of ['index.html','lectures.html','downloads.html'])for(const width of [1440,1024,390]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width===390});await navigate(file);
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'),file+': directory page overflow at '+width);
    if(width===390){await evaluate('document.querySelector(".mobile-menu").click()');assert.equal(await evaluate('document.querySelector(".mobile-menu").getAttribute("aria-expanded")'),'true');await evaluate('document.querySelector(".mobile-menu").click()');}
    assert.equal(await evaluate('document.body.textContent.includes("已生成完整讲义")'),false);
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  await navigate('generative-models.html');
  for(const file of diagramFiles){
    const bounds=await evaluate('(async()=>{const xml=await fetch('+JSON.stringify('diagrams/generative/')+'+'+JSON.stringify(file)+').then(r=>r.text());const host=document.createElement("div");host.style.cssText="position:absolute;left:-10000px;top:0;width:960px";host.innerHTML=xml;document.body.append(host);const bad=[...host.querySelectorAll("text")].map(t=>({text:t.textContent,b:t.getBBox()})).filter(({b})=>b.x<0||b.x+b.width>961||b.y<0||b.y+b.height>441).map(({text,b})=>({text,x:b.x,y:b.y,width:b.width,height:b.height}));host.remove();return bad;})()');
    assert.deepEqual(bounds,[],file+': SVG text must fit');
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  const report={date:'2026-10-15',status:'passed',sourceSha256:facts.sha256,sourcePages:facts.pages.length,readingSections:sections.length,presentationSteps:slides.length,viewports:[1920,1440,1024,390],checks,sequenceChecks,screenshots: screenshots.map(n=>join(output,n+'.png')),resourceHashes:{html:hash(readFileSync(join(root,'generative-models.html'))),runtime:hash(readFileSync(join(root,'generative-models.js'))),css:hash(readFileSync(join(root,'generative-content.css'))),part2:hash(readFileSync(join(root,'pdf','Part II-Generative.pdf'))),part1Data:hash(readFileSync(join(root,'scripts','generative-part1-course-data.mjs'))),part2Data:hash(readFileSync(join(root,'scripts','generative-part2-course-data.mjs'))),pdf:hash(readFileSync(join(root,'pdf','Part I-Generative.pdf')))},browser:'Chrome DevTools Protocol, matching existing project validators',numericChecks:{chain:.06,subpixels:3145728,vaeSample:z,vaeMean:mean,priorKL:1.75,negativeELBOWithoutConstant:1.8,finiteDifferenceGradients:true,exactDiscreteELBO:true,ganStates:gs,ganFiniteDifferenceGradients:true,flowVelocity,eulerStates:es,cfgCombinations:true,vpInverse:true},pdfDownloads:pdfLinks,errors};
  writeFileSync(join(build,'validation-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PASS: '+checks.length+' reading/presentation viewport checks; all '+slides.length+' steps; '+sequenceChecks.length+' sequences; math, source hashes, numeric checks, navigation and PDF.');
}finally{
  socket?.close();chrome.kill('SIGTERM');
  await new Promise(ok=>server.close(ok));
}
