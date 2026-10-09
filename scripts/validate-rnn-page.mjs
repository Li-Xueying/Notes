import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {dirname, extname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {slides, sections, sequences, embeddingVectors} from './rnn-course-data.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const build=join(root,'..','AI工程学','.course-build','03-rnns-lstms');
const hash=data=>createHash('sha256').update(data).digest('hex');
const facts=JSON.parse(readFileSync(join(build,'source-review.json')));
assert.equal(facts.sha256,hash(readFileSync(join(root,'..','AI工程学','PPT材料','RNNs and LSTMs.pptx'))));
assert.deepEqual(slides.flatMap(item=>item.sourcePages),Array.from({length:136},(_,i)=>i+1),'Source pages must occur once in their teaching order');
assert.equal(new Set(slides.map(item=>item.id)).size,slides.length);
const manifest=JSON.parse(readFileSync(join(build,'diagram-manifest.json')));
assert.deepEqual(manifest.diagrams.map(item=>item.id),slides.map(item=>item.id));
for(const asset of manifest.assets)assert.equal(hash(readFileSync(join(root,'media','rnn',asset.name))),asset.sha256);
assert.ok(!manifest.assets.some(asset=>['image167.png','image180.png','image94.GIF','image109.GIF'].includes(asset.name)));
for(const item of slides.filter(item=>Array.isArray(item.visual))) {
  const displayed=facts.slides.filter(page=>item.sourcePages.includes(page.sourcePage)).flatMap(page=>page.objects.flatMap(object=>object.imageRelationships.map(id=>page.assets.find(asset=>asset.relationshipId===id)?.part.split('/').pop())));
  for(const name of item.visual)assert.ok(displayed.includes(name),`${item.id}: ${name} must be a displayed source object`);
}
const reading=readFileSync(join(build,'reading-content.md'),'utf8');
assert.ok(reading.indexOf('<!-- figure: motivation -->')<reading.indexOf('### 2.'));
assert.ok(reading.indexOf('<!-- figure: attention-process -->')<reading.indexOf('e_{t,i}=s_t'));
assert.ok(reading.indexOf('<!-- figure: smt-decoding -->')<reading.indexOf('<!-- figure: seq2seq -->'));
assert.ok(reading.includes('0.0316')&&reading.includes('2km')&&reading.includes('A_tA_{t-1}'));
// Independent numerical checks for the corrected negative sign and the memory example.
const sigmoid=x=>1/(1+Math.exp(-x));
const loss=(positive,negative)=>-Math.log(sigmoid(positive))-Math.log(sigmoid(-negative));
assert.ok(loss(1,-1)<loss(0,-1));assert.ok(loss(1,-2)<loss(1,-1));
assert.ok(Math.abs(Math.pow(0.01,0.75)-0.0316227766)<1e-9);
const c=[0.75*0.8+0.5*0.2,0.25*(-0.4)+0.8*0.3];
assert.ok(Math.abs(c[0]-0.7)<1e-12&&Math.abs(c[1]-0.14)<1e-12);
assert.ok(Math.abs(0.5*Math.tanh(c[0])-0.3021838886)<1e-9);
assert.equal(sequences['beam-example'].files.length,13);assert.equal(sequences['attention-process'].files.length,12);

const output='/private/tmp/rnn-courseware-validation';mkdirSync(output,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(request,response)=>{
  try {const path=resolve(root,`.${decodeURIComponent(new URL(request.url,'http://localhost').pathname)}`);if(!path.startsWith(root+'/')){response.writeHead(403);response.end();return;}const body=await readFile(path);response.writeHead(200,{'Content-Type':mime[extname(path)]||'application/octet-stream','Content-Length':body.length});response.end(body);}
  catch {response.writeHead(404);response.end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const base=`http://127.0.0.1:${server.address().port}/rnn-lstm-sequence-modeling.html`;
const port=9243;
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
  const evaluate=async expression=>{const value=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(value.exceptionDetails)throw new Error(JSON.stringify(value.exceptionDetails));return value.result.value;};
  const ready=async expression=>{for(let i=0;i<150;i++){if(await evaluate(expression))return;await pause(30);}throw new Error(`Not ready: ${expression}`);};
  const navigate=async suffix=>{const loaded=new Promise(resolve=>loads.push(resolve));await send('Page.navigate',{url:base+suffix});await loaded;await ready('document.readyState==="complete" && !!document.querySelector("#rnn-course-data")');await evaluate('document.fonts.ready');};
  const screenshot=async name=>{const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});writeFileSync(`${output}/${name}.png`,Buffer.from(shot.data,'base64'));};
  await send('Page.enable');await send('Runtime.enable');await send('Log.enable');
  const checks=[],animationChecks=[];
  const captures=new Set(['motivation','lookup','skipgram-window','rnn-forward','bptt','lstm-equations','fertility','beam-example','mt-progress','attention-process','soft-alignment']);
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
          const stage=document.querySelector('#slide-sequence .rnn-sequence-stage');let img=stage.querySelector('img');const svg=stage.querySelector('svg');
          if(svg){img=new Image();img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))));await img.decode();}
          const canvas=document.createElement('canvas');canvas.width=960;canvas.height=417;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,960,417);const pixels=ctx.getImageData(0,90,960,310).data;
          let fingerprint=0;for(let n=0;n<pixels.length;n+=4)fingerprint=(fingerprint+pixels[n]*(n+1)+pixels[n+1]*(n+2)+pixels[n+2]*(n+3))%1000000007;
          return {step:Number(stage.dataset.step),caption:document.querySelector('#slide-sequence .rnn-sequence-caption').textContent,fingerprint,playing:document.querySelector('#slide-sequence [data-sequence-action="play"]').getAttribute('aria-pressed')};
        })()`);
        assert.equal(result.step,i);assert.equal(result.caption,config.steps[i]);assert.equal(result.playing,'false');fingerprints.add(result.fingerprint);animationChecks.push({id,width,...result});
        if(width!==1024&&[0,1,config.steps.length-1].includes(i))await screenshot(`${width}-${id}-step-${i}`);
      }
      assert.equal(fingerprints.size,config.steps.length,`${id} states must change graph content`);
      assert.equal(await evaluate('document.querySelector("#slide-sequence [data-sequence-action=next]").disabled'),true);
      await evaluate('document.querySelector("#slide-sequence [data-sequence-action=previous]").click()');
      assert.equal(await evaluate('Number(document.querySelector("#slide-sequence .rnn-sequence-stage").dataset.step)'),config.steps.length-2);
      await evaluate('document.querySelector("#next-slide").click()');
      assert.equal(await evaluate('document.querySelector("#slide-sequence").children.length'),0);
    }
    await navigate('#rnn-embeddings');
    const readCheck=await evaluate(`(async()=>{await Promise.all([...document.querySelectorAll('#read-mode img')].map(async img=>{img.loading='eager';await img.decode();}));return {sections:document.querySelectorAll('.rnn-topic').length,errors:[...document.querySelectorAll('.katex-error')].map(el=>el.textContent),scrollWidth:document.documentElement.scrollWidth,leaked:document.querySelector('#read-mode').textContent.includes('<!-- figure:')};})()`);
    assert.equal(readCheck.sections,sections.length);assert.deepEqual(readCheck.errors,[]);assert.ok(readCheck.scrollWidth<=width+1);assert.equal(readCheck.leaked,false);
    if(width!==1024)await screenshot(`${width}-reading`);
    await evaluate('document.querySelector("[data-word-pair=hotel-conference]").click()');
    const u=embeddingVectors.hotel,v=embeddingVectors.conference;const cosine=u.reduce((sum,x,i)=>sum+x*v[i],0)/(Math.hypot(...u)*Math.hypot(...v));
    assert.equal(await evaluate('document.querySelector("#embedding-score").textContent'),cosine.toFixed(3));
    await evaluate('document.querySelector("[data-present-section=rnn-lstm-steps]").click()');
    assert.equal(await evaluate('document.querySelector("#slides-mode").dataset.slideId'),'forget');
    await evaluate('document.querySelector("#read-current").click()');
    assert.equal(await evaluate('location.hash'),'#rnn-lstm-steps');
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
  await navigate(`?mode=slides&page=${slides.findIndex(slide=>slide.id==='skipgram-window')+1}`);
  await ready('document.querySelector("#slide-sequence .rnn-sequence-stage").dataset.moving==="true"');
  const mid=await evaluate('document.querySelector("#slide-sequence [data-window-band]").getAttribute("transform")');
  assert.notEqual(mid,'translate(48 128)');assert.notEqual(mid,'translate(192 128)');
  await evaluate('document.querySelector("#slide-sequence [data-sequence-action=play]").click()');
  const frozen=await evaluate('document.querySelector("#slide-sequence [data-window-band]").getAttribute("transform")');await pause(200);
  assert.equal(await evaluate('document.querySelector("#slide-sequence [data-window-band]").getAttribute("transform")'),frozen);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await navigate(`?mode=slides&page=${slides.findIndex(slide=>slide.id==='attention-process')+1}`);
  assert.equal(await evaluate('document.querySelector("#slide-sequence [data-sequence-action=play]").getAttribute("aria-pressed")'),'false');
  await send('Emulation.setEmulatedMedia',{features:[]});
  // SVG text bounds detect clipped labels that page overflow checks cannot see.
  const clipped=await evaluate(`(async()=>{const all=JSON.parse(document.querySelector('#rnn-course-data').textContent).slides;const failures=[];for(const item of all){const markup=await fetch('diagrams/rnn/'+item.id+'.svg').then(r=>r.text());const host=document.createElement('div');host.style.cssText='position:absolute;left:-2000px;width:960px';host.innerHTML=markup;document.body.append(host);for(const el of host.querySelectorAll('text')){const b=el.getBBox();if(b.x<0||b.x+b.width>960||b.y<0||b.y+b.height>417)failures.push({id:item.id,text:el.textContent,bounds:[b.x,b.y,b.width,b.height]});}host.remove();}return failures;})()`);
  assert.deepEqual(clipped,[],'SVG text must fit its canvas');
  const loadedFile=new Promise(resolve=>loads.push(resolve));
  await send('Page.navigate',{url:new URL(`../rnn-lstm-sequence-modeling.html?mode=slides&page=${slides.findIndex(slide=>slide.id==='beam-example')+1}`,import.meta.url).href});
  await loadedFile;
  await ready('document.querySelector("#slides-mode")?.dataset.slideId==="beam-example" && document.querySelector("#slide-sequence img")?.naturalWidth>0');
  assert.ok((await evaluate('location.protocol'))==='file:','The static HTML must also open directly');
  assert.equal(await evaluate('document.querySelectorAll(".katex-error").length'),0);
  assert.deepEqual(errors,[],'Browser must not log errors');
  const report={sourceSha256:facts.sha256,presentationChecks:checks.length,animationChecks:animationChecks.length,sourceAssets:manifest.assets.length,checks,animationStates:animationChecks,errors};
  writeFileSync(join(build,'browser-validation.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({presentationChecks:checks.length,animationChecks:animationChecks.length,sourceAssets:manifest.assets.length,errors:errors.length,screenshots:output},null,2));
} finally {socket?.close();chrome.kill('SIGTERM');await new Promise(resolve=>server.close(resolve));}
