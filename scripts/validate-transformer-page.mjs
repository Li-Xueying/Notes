import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {slides, sections, sequences, attentionExample, expertExample, importanceExamples, videos, shiftedWindowExample} from './transformer-course-data.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const build=join(root,'..','AI工程学','.course-build','04-transformers');
const hash=data=>createHash('sha256').update(data).digest('hex');
const facts=JSON.parse(readFileSync(join(build,'source-review.json')));
assert.equal(facts.sha256,hash(readFileSync(join(root,'..','AI工程学','PPT材料','Transformer Models.pptx'))));
assert.deepEqual(slides.flatMap(item=>item.sourcePages),Array.from({length:183},(_,i)=>i+1),'Source pages must occur once in their teaching order');
assert.equal(new Set(slides.map(item=>item.id)).size,slides.length);
const manifest=JSON.parse(readFileSync(join(build,'diagram-manifest.json')));
assert.deepEqual(manifest.diagrams.map(item=>item.id),slides.map(item=>item.id));
for(const asset of manifest.assets)assert.equal(hash(readFileSync(join(root,'media','transformer',asset.name))),asset.sha256);
for(const item of slides.filter(item=>Array.isArray(item.visual))) {
  const displayed=facts.slides.filter(page=>item.sourcePages.includes(page.sourcePage)).flatMap(page=>page.objects.flatMap(object=>object.imageRelationships.map(id=>page.assets.find(asset=>asset.relationshipId===id)?.part.split('/').pop())));
  for(const name of item.visual)assert.ok(displayed.includes(name),`${item.id}: ${name} must be a displayed source object`);
}
for(const video of manifest.videos)assert.equal(hash(readFileSync(join(root,video.file))),video.sha256);
const forbidden=['image329.png','image299.png','image340.png','image397.png','image355.png','image439.png','image441.png'];
assert.ok(!manifest.assets.some(a=>forbidden.includes(a.name)));
const beam=sequences['beam-example'];
beam.files.forEach((name,i)=>assert.ok(facts.slides[64+i].assets.some(a=>a.part==='ppt/media/'+name&&facts.slides[64+i].objects.some(o=>o.imageRelationships.includes(a.relationshipId)))));
const reading=readFileSync(join(build,'reading-content.md'),'utf8');
assert.ok(reading.indexOf('<!-- figure: transformer-task -->')<reading.indexOf('q_1'));
assert.ok(reading.indexOf('<!-- figure: attention-vector -->')<reading.indexOf('Attention}(Q,K,V)'));
assert.ok(reading.indexOf('<!-- figure: exposure-bias -->')>reading.indexOf('<!-- figure: metric-optimization -->'));
assert.ok(reading.includes('5/6')&&reading.includes('3/5')&&reading.includes('0.7071'));
assert.ok(reading.includes('CV 约 1.005')&&reading.includes('CV 约 0.188')&&reading.includes('共享专家未显示'));
const softmax=values=>{const max=Math.max(...values),exp=values.map(v=>Math.exp(v-max)),sum=exp.reduce((a,b)=>a+b,0);return exp.map(v=>v/sum);};
const expectedWeights=softmax(attentionExample.scores),attentionOutput=expectedWeights.reduce((s,w,i)=>s+w*attentionExample.values[i],0);
assert.ok(Math.abs(attentionOutput-1.1380900204)<1e-9);
assert.ok(Math.abs(Math.exp(.5*Math.log(5/6)+.5*Math.log(3/5))-Math.sqrt(.5))<1e-12);
assert.ok(.4*.9*.9>.6*.6*.4);
for(let query=0;query<4;query++){const w=softmax(attentionExample.scores.map((v,i)=>i<=query?v:-Infinity));assert.ok(Math.abs(w.reduce((a,b)=>a+b,0)-1)<1e-12);assert.ok(w.slice(query+1).every(v=>v===0));}
assert.equal(224/16*224/16,196);assert.equal((4*196)**2/196**2,16);
assert.equal(Math.ceil(6/3),2);assert.equal(Math.ceil(1.5*6/3),3);
assert.equal(beam.files.length,13);
for(const [index,values] of importanceExamples.entries()){
  const mean=values.reduce((a,b)=>a+b,0)/values.length,std=Math.sqrt(values.reduce((s,v)=>s+(v-mean)**2,0)/values.length);
  assert.equal((std/mean).toFixed(3),index?'0.188':'1.005');
}
assert.equal(softmax(expertExample.logits.map((v,i)=>i<2?v+expertExample.noise[i]:-Infinity))[0].toFixed(3),'0.750');
const shifted=shiftedWindowExample.grid.map((row,y)=>row.map((_,x)=>shiftedWindowExample.grid[(y+1)%4][(x+1)%4]));
const windows=[];
for(let y=0;y<4;y+=2)for(let x=0;x<4;x+=2)windows.push([shifted[y][x],shifted[y][x+1],shifted[y+1][x],shifted[y+1][x+1]]);
assert.deepEqual(windows,[[4,4,4,4],[5,3,5,3],[7,7,1,1],[8,6,2,0]]);
assert.deepEqual(windows[0].map(k=>k===4),[true,true,true,true]);
assert.deepEqual(windows[3].map(k=>k===8),[true,false,false,false]);

const output='/private/tmp/transformer-courseware-validation';mkdirSync(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.mp4':'video/mp4','.jpg':'image/jpeg','.jpeg':'image/jpeg'};
const server=createServer(async(request,response)=>{
  try {
    const path=resolve(root,`.${decodeURIComponent(new URL(request.url,'http://localhost').pathname)}`);
    if(!path.startsWith(root+'/')){response.writeHead(403);response.end();return;}
    const body=await readFile(path),headers={'Content-Type':mime[extname(path)]||'application/octet-stream','Accept-Ranges':'bytes'};
    const range=request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    if(range){
      const start=range[1]?Number(range[1]):Math.max(0,body.length-Number(range[2]));
      const end=range[1]&&range[2]?Math.min(Number(range[2]),body.length-1):body.length-1;
      if(start> end||start>=body.length){response.writeHead(416,{'Content-Range':`bytes */${body.length}`});response.end();return;}
      const part=body.subarray(start,end+1);response.writeHead(206,{...headers,'Content-Length':part.length,'Content-Range':`bytes ${start}-${end}/${body.length}`});response.end(part);
    } else {response.writeHead(200,{...headers,'Content-Length':body.length});response.end(body);}
  }
  catch {response.writeHead(404);response.end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const base=`http://127.0.0.1:${server.address().port}/transformer-models.html`;
const port=9244;
const chrome=spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',['--headless=new','--disable-gpu','--hide-scrollbars','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${output}/chrome-${process.pid}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let chromeErrors='';chrome.stderr.on('data',chunk=>{chromeErrors+=chunk;});
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket;
try {
  let target;
  for(let i=0;i<60;i++){try{target=(await fetch(`http://127.0.0.1:${port}/json/list`).then(r=>r.json())).find(t=>t.type==='page');}catch{}if(target)break;await pause(100);}
  assert.ok(target,`Chrome must start: ${chromeErrors}`);
  socket=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  let serial=0;const pending=new Map();const loads=[];const errors=[];
  socket.addEventListener('message',event=>{
    const message=JSON.parse(event.data);
    if(message.method==='Page.loadEventFired')loads.splice(0).forEach(resolve=>resolve());
    if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);
    if(message.method==='Log.entryAdded'&&message.params.entry.level==='error'&&!message.params.entry.url?.endsWith('/favicon.ico'))errors.push(message.params.entry);
    if(!pending.has(message.id))return;const p=pending.get(message.id);clearTimeout(p.timer);pending.delete(message.id);message.error?p.reject(new Error(message.error.message)):p.resolve(message.result);
  });
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`Timeout ${method}`));},20000);pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));});
  const evaluate=async (expression,userGesture=false)=>{const value=await send('Runtime.evaluate',{expression,userGesture,awaitPromise:true,returnByValue:true});if(value.exceptionDetails)throw new Error(JSON.stringify(value.exceptionDetails));return value.result.value;};
  const ready=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await pause(30);}throw new Error(`Not ready: ${expression}`);};
  const navigate=async suffix=>{const loaded=new Promise(resolve=>loads.push(resolve));await send('Page.navigate',{url:base+suffix});await loaded;await ready('document.readyState==="complete" && !!document.querySelector("#tf-course-data")');await evaluate('document.fonts.ready');};
  const screenshot=async name=>{const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});writeFileSync(`${output}/${name}.png`,Buffer.from(shot.data,'base64'));};
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');
  const checks=[],animationChecks=[],videoChecks=[];
  const captures=new Set(['transformer-task','attention-vector','attention-matrix','animal-it','multi-head-it','encoder-residual','ln-order','autoregressive-feedback','causal-mask','cross-process','beam-example','bleu-example','patch-embedding','shifted-window','importance-cv','capacity-overflow','mixtral-parameters']);
  for(const width of [1440,1024,390]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:width===390?844:1100,deviceScaleFactor:1,mobile:width===390});
    await navigate('?mode=slides&page=1');
    for(let i=0;i<slides.length;i++) {
      if(i)await evaluate('document.querySelector("#next-slide").click()');
      await ready('document.querySelector("#slide-link").hidden ? !!document.querySelector("#slide-sequence svg") || (document.querySelector("#slide-sequence img")?.complete && document.querySelector("#slide-sequence img").naturalWidth>0) : document.querySelector("#slide-image").complete && document.querySelector("#slide-image").naturalWidth>0');
      const result=await evaluate(`(async()=>{
        const title=document.querySelector('#slide-title').getBoundingClientRect(),number=document.querySelector('.intro-slide-number').getBoundingClientRect();
        let img=document.querySelector('#slide-link').hidden?document.querySelector('#slide-sequence img'):document.querySelector('#slide-image');
        const svg=document.querySelector('#slide-sequence svg');
        if(svg){img=new Image();img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))));await img.decode();}
        const canvas=document.createElement('canvas');canvas.width=960;canvas.height=417;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,960,417);
        const pixels=ctx.getImageData(30,90,900,290).data;let ink=0;for(let n=0;n<pixels.length;n+=4)if(0.2126*pixels[n]+0.7152*pixels[n+1]+0.0722*pixels[n+2]<180)ink++;
        return {id:document.querySelector('#slides-mode').dataset.slideId,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overlap:title.right>number.left+1&&title.bottom>number.top&&title.top<number.bottom,ink};
      })()`);
      assert.equal(result.id,slides[i].id);assert.ok(result.scrollWidth<=width+1,`Overflow ${result.id} ${width}`);assert.ok(!result.overlap,`Overlap ${result.id}`);assert.ok(result.ink>50,`Blank figure ${result.id}`);
      checks.push(result);if(width!==1024&&captures.has(result.id))await screenshot(`${width}-${result.id}`);
    }
    assert.equal(await evaluate('document.querySelector("#next-slide").disabled'),true);
    for(const [id,config] of Object.entries(sequences)) {
      await navigate(`?mode=slides&page=${slides.findIndex(slide=>slide.id===id)+1}`);
      const prefix='#slide-sequence';
      await evaluate(`document.querySelector('${prefix} [data-sequence-action="play"]').click()`);
      const fingerprints=new Set();
      for(let i=0;i<config.steps.length;i++) {
        if(i)await evaluate(`document.querySelector('${prefix} [data-sequence-action="next"]').click()`);
        await ready('!document.querySelector("#slide-sequence img") || (document.querySelector("#slide-sequence img").complete && document.querySelector("#slide-sequence img").naturalWidth>0)');
        const result=await evaluate(`(async()=>{
          const stage=document.querySelector('#slide-sequence .tf-sequence-stage');let img=stage.querySelector('img');const svg=stage.querySelector('svg');
          if(svg){img=new Image();img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))));await img.decode();}
          const canvas=document.createElement('canvas');canvas.width=960;canvas.height=417;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,960,417);const pixels=ctx.getImageData(0,90,960,310).data;
          let fingerprint=0;for(let n=0;n<pixels.length;n+=4)fingerprint=(fingerprint+pixels[n]*(n+1)+pixels[n+1]*(n+2)+pixels[n+2]*(n+3))%1000000007;
          return {step:Number(stage.dataset.step),caption:document.querySelector('#slide-sequence .tf-sequence-caption').textContent,fingerprint,playing:document.querySelector('#slide-sequence [data-sequence-action="play"]').getAttribute('aria-pressed')};
        })()`);
        assert.equal(result.step,i);assert.equal(result.caption,config.steps[i]);assert.equal(result.playing,'false');fingerprints.add(result.fingerprint);animationChecks.push({id,width,...result});
        if(width!==1024&&[0,1,config.steps.length-1].includes(i))await screenshot(`${width}-${id}-step-${i}`);
      }
      assert.equal(fingerprints.size,config.steps.length,`${id} states must change graph content`);
      assert.equal(await evaluate('document.querySelector("#slide-sequence [data-sequence-action=next]").disabled'),true);
      await evaluate('document.querySelector("#slide-sequence [data-sequence-action=previous]").click()');
      assert.equal(await evaluate('Number(document.querySelector("#slide-sequence .tf-sequence-stage").dataset.step)'),config.steps.length-2);
      await evaluate('document.querySelector("#next-slide").click()');
      assert.equal(await evaluate('document.querySelector("#slide-sequence").children.length'),0);
    }
    await navigate('#tf-qkv');
    const readCheck=await evaluate(`(async()=>{await Promise.all([...document.querySelectorAll('#read-mode img')].map(async img=>{img.loading='eager';await img.decode();}));return {sections:document.querySelectorAll('.tf-topic').length,errors:[...document.querySelectorAll('.katex-error')].map(el=>el.textContent),scrollWidth:document.documentElement.scrollWidth,leaked:document.querySelector('#read-mode').textContent.includes('<!-- figure:')};})()`);
    assert.equal(readCheck.sections,sections.length);assert.deepEqual(readCheck.errors,[]);assert.ok(readCheck.scrollWidth<=width+1);assert.equal(readCheck.leaked,false);
    if(width!==1024)await screenshot(`${width}-reading`);
    const initial=await evaluate('document.querySelector("#attention-output").textContent');assert.equal(initial,attentionOutput.toFixed(3));
    await evaluate('document.querySelector("[data-attention-score]").value="-1";document.querySelector("[data-attention-score]").dispatchEvent(new Event("input"));');
    const changed=softmax([-1,...attentionExample.scores.slice(1)]).reduce((s,w,i)=>s+w*attentionExample.values[i],0);
    assert.equal(await evaluate('document.querySelector("#attention-output").textContent'),changed.toFixed(3));
    await evaluate('document.querySelector(\'[data-mask-step="2"]\').click()');assert.equal(await evaluate('document.querySelectorAll("#mask-stage .visible").length'),3);
    await evaluate('const e=document.querySelectorAll("[data-expert-score]")[2];e.value="4";e.dispatchEvent(new Event("input"));');
    assert.equal(await evaluate('document.querySelector("#moe-output").textContent'),'E3 + E1');
    await evaluate('document.querySelector("[data-present-section=tf-exposure-bias]").click()');assert.equal(await evaluate('document.querySelector("#slides-mode").dataset.slideId'),'exposure-bias');
    await evaluate('document.querySelector("#read-current").click()');assert.equal(await evaluate('location.hash'),'#tf-exposure-bias');
    await navigate('?mode=slides&page='+(slides.findIndex(s=>s.id==='patch-embedding')+1));
    await ready('document.querySelector("#slide-video video")?.readyState>=1');
    const duration=await evaluate('document.querySelector("#slide-video video").duration');
    assert.ok(duration>1);
    const fingerprints=new Set();
    // The source video opens with a fade from white; sample its first completed image.
    for(const time of [0.7,duration*.45,duration*.9]){
      const result=await evaluate(`(async()=>{const video=document.querySelector('#slide-video video');if(Math.abs(video.currentTime-${time})>.02){await new Promise(resolve=>{video.addEventListener('seeked',resolve,{once:true});video.currentTime=${time};});}if(video.readyState<2)await new Promise(resolve=>video.addEventListener('loadeddata',resolve,{once:true}));const canvas=document.createElement('canvas');canvas.width=800;canvas.height=269;const ctx=canvas.getContext('2d');ctx.drawImage(video,0,video.videoHeight*.52,video.videoWidth*.98276,video.videoHeight*.48,0,0,800,269);const p=ctx.getImageData(0,0,800,269).data;let ink=0,fingerprint=0;for(let i=0;i<p.length;i+=4){if((p[i]+p[i+1]+p[i+2])/3<180)ink++;fingerprint=(fingerprint+p[i]*(i+1)+p[i+1]*(i+2)+p[i+2]*(i+3))%1000000007;}const stage=document.querySelector('#slide-video .tf-video-stage').getBoundingClientRect();return {ink,fingerprint,paused:video.paused,time:video.currentTime,stageWidth:stage.width,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
      if(width!==1024)await screenshot(width+'-patch-video-'+Math.round(time));
      assert.ok(result.ink>1000,`Video ${width}, t=${time}: ${JSON.stringify(result)}`);assert.ok(result.stageWidth>=Math.min(width-40,500));assert.ok(!result.overflow);fingerprints.add(result.fingerprint);videoChecks.push({width,...result});
    }
    assert.ok(fingerprints.size>1,'The original video must show changing patch positions');
    await evaluate('document.querySelector(\'#slide-video [data-video-action="play"]\').click()');await pause(120);
    assert.equal(await evaluate('document.querySelector("#slide-video video").paused'),false);
    assert.equal(await evaluate('document.querySelector(\'#slide-video [data-video-action="play"]\').getAttribute("aria-pressed")'),'true');
    await evaluate('document.querySelector(\'#slide-video [data-video-action="play"]\').click()');
    assert.equal(await evaluate('document.querySelector("#slide-video video").paused'),true);
    await evaluate('document.querySelector(\'#slide-video [data-video-action="expand"]\').click()',true);
    await ready('!!document.fullscreenElement');
    assert.equal(await evaluate('document.fullscreenElement.dataset.sourceVideo'),'patch-embedding');
    await evaluate('document.exitFullscreen()');
    await evaluate('document.querySelector(\'#slide-video [data-video-action="replay"]\').click()');await pause(120);
    assert.ok(await evaluate('document.querySelector("#slide-video video").currentTime<1'));
    await evaluate('window.__oldVideo=document.querySelector("#slide-video video");document.querySelector("#next-slide").click()');
    assert.equal(await evaluate('window.__oldVideo.paused'),true);

  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await navigate(`?mode=slides&page=${slides.findIndex(slide=>slide.id==='attention-vector')+1}`);
  await ready('document.querySelector("#slide-sequence .tf-sequence-stage").dataset.step==="1"');
  await evaluate('document.querySelector("#slide-sequence [data-sequence-action=play]").click()');
  const frozen=await evaluate('document.querySelector("#slide-sequence .tf-sequence-stage").dataset.step');await pause(2600);
  assert.equal(await evaluate('document.querySelector("#slide-sequence .tf-sequence-stage").dataset.step'),frozen);
  await evaluate('document.querySelector("#slide-sequence [data-sequence-action=replay]").click()');
  assert.equal(await evaluate('document.querySelector("#slide-sequence .tf-sequence-stage").dataset.step'),'0');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await navigate(`?mode=slides&page=${slides.findIndex(slide=>slide.id==='attention-vector')+1}`);
  assert.equal(await evaluate('document.querySelector("#slide-sequence [data-sequence-action=play]").getAttribute("aria-pressed")'),'false');
  await send('Emulation.setEmulatedMedia',{features:[]});
  // SVG text bounds detect clipped labels that page overflow checks cannot see.
  const clipped=await evaluate(`(async()=>{const course=JSON.parse(document.querySelector('#tf-course-data').textContent),all=course.slides.map(s=>s.id).concat(Object.entries(course.sequences).flatMap(([id,s])=>s.steps.map((_,i)=>id+'-step-'+i)));const failures=[];for(const id of all){const markup=await fetch('diagrams/transformer/'+id+'.svg').then(r=>r.text());const host=document.createElement('div');host.style.cssText='position:absolute;left:-2000px;width:960px';host.innerHTML=markup;document.body.append(host);for(const el of host.querySelectorAll('text')){const b=el.getBBox();if(b.x<0||b.x+b.width>960||b.y<0||b.y+b.height>417)failures.push({id,text:el.textContent,bounds:[b.x,b.y,b.width,b.height]});}host.remove();}return failures;})()`);
  assert.deepEqual(clipped,[],'SVG text must fit its canvas');
  const loadedFile=new Promise(resolve=>loads.push(resolve));
  await send('Page.navigate',{url:new URL(`../transformer-models.html?mode=slides&page=${slides.findIndex(slide=>slide.id==='beam-example')+1}`,import.meta.url).href});
  await loadedFile;
  await ready('document.querySelector("#slides-mode")?.dataset.slideId==="beam-example" && document.querySelector("#slide-sequence img")?.naturalWidth>0');
  assert.ok((await evaluate('location.protocol'))==='file:','The static HTML must also open directly');
  assert.equal(await evaluate('document.querySelectorAll(".katex-error").length'),0);
  assert.deepEqual(errors,[],'Browser must not log errors');
  const fileHashes=Object.fromEntries(['transformer-models.html','transformer-models.js','transformer-content.css','scripts/transformer-course-data.mjs','scripts/generate-transformer-diagrams.mjs','../AI工程学/.course-build/04-transformers/diagram-manifest.json'].map(path=>[path,hash(readFileSync(join(root,path)))]));
  const report={sourceSha256:facts.sha256,fileHashes,presentationChecks:checks.length,animationChecks:animationChecks.length,sourceAssets:manifest.assets.length,videoChecks,checks,animationStates:animationChecks,errors};
  writeFileSync(join(build,'browser-validation.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({presentationChecks:checks.length,animationChecks:animationChecks.length,sourceAssets:manifest.assets.length,videoChecks:videoChecks.length,errors:errors.length,screenshots:output},null,2));
} finally {socket?.close();chrome.kill('SIGTERM');await new Promise(resolve=>server.close(resolve));}
