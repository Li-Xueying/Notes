import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { slides, sections, windowAnimations } from './cnn-course-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const build = join(root, '..', 'AI工程学', '.course-build', '02-cnns');
const source = JSON.parse(readFileSync(join(build, 'source-review.json')));
const hash = createHash('sha256').update(readFileSync(join(root, '..', 'AI工程学', 'PPT材料', 'CNNs and Image Recognition.pptx'))).digest('hex');
assert.equal(source.sha256, hash, 'Source review must match the current PPTX');
assert.deepEqual(slides.flatMap(s => s.sourcePages), Array.from({ length: 118 }, (_, i) => i + 1), 'Every included source page appears once and in order');
assert.equal(new Set(slides.map(s => s.id)).size, slides.length);
const manifest = JSON.parse(readFileSync(join(build, 'diagram-manifest.json')));
assert.equal(manifest.diagrams.length, slides.length);
assert.deepEqual(manifest.diagrams.map(s => s.id), slides.map(s => s.id));
const reading = readFileSync(join(build, 'reading-content.md'), 'utf8');
assert.ok(reading.indexOf('<!-- figure: classification -->') < reading.indexOf('#### 全连接方案的参数代价'));
assert.ok(reading.indexOf('<!-- figure: conv-1d -->') < reading.indexOf('y_0=1\\times1'));
assert.ok(reading.indexOf('<!-- figure: resnet-problem -->') < reading.indexOf('<!-- figure: residual -->'));
assert.ok(reading.includes('数据少、任务差异大'));
assert.equal((5 * 5 + 1) * 10 + (5 * 5 * 10 + 1) * 20 + 321 * 10, 8490);
assert.deepEqual(windowAnimations['conv-1d'].steps.map(step => step.results.convolution), [-1, 2, 1, 2, 0]);
assert.deepEqual(windowAnimations['conv-layer'].steps.map(step => step.results.convolution), [19, 25, 37, 43]);
assert.deepEqual(windowAnimations['pool-2d'].steps.map(step => [step.results.max, step.results.mean]), [[4, 2], [5, 3], [7, 5], [8, 6]]);

// Numerical derivatives independently check the coefficient routes used in the notes.
const objective = (x, k, stride, g) => g.reduce((sum,row,i) => sum + row.reduce((total,value,j) => total + value * k.reduce((acc,kr,m) => acc + kr.reduce((term,w,n) => term + w*x[i*stride+m][j*stride+n],0),0),0),0);
const derivative = (x,k,stride,g,target,r,c) => {
  const epsilon=1e-5;
  const matrix=target==='x'?x:k;
  matrix[r][c]+=epsilon;const upper=objective(x,k,stride,g);
  matrix[r][c]-=2*epsilon;const lower=objective(x,k,stride,g);
  matrix[r][c]+=epsilon;
  return (upper-lower)/(2*epsilon);
};
const g=[[1,2],[3,4]];
for(const [size,stride,expected] of [[3,1,[['x',1,1,20],['k',0,0,37]]],[5,2,[['x',0,0,1],['x',0,1,2],['x',0,2,5],['x',2,2,36],['k',0,0,92],['k',2,2,212]]]]) {
  const x=Array.from({length:size},(_,r)=>Array.from({length:size},(_,c)=>r*size+c+1));
  const kernelSize=size===3?2:3;
  const k=Array.from({length:kernelSize},(_,r)=>Array.from({length:kernelSize},(_,c)=>r*kernelSize+c+1));
  for(const [target,r,c,value] of expected) assert.ok(Math.abs(derivative(x,k,stride,g,target,r,c)-value)<1e-6, `Gradient route: stride=${stride}, ${target}[${r},${c}]`);
}

let base = process.env.CNN_PREVIEW_URL;
let previewServer;
if (!base) {
  const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
  // An isolated HTTP server avoids saturating the shared preview during repeated navigations.
  previewServer = createServer(async (request, response) => {
    try {
      const path = resolve(root, `.${decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname)}`);
      if (!path.startsWith(root + '/')) { response.writeHead(403); response.end(); return; }
      const body = await readFile(path);
      response.writeHead(200, { 'Content-Type': mime[extname(path).toLowerCase()] || 'application/octet-stream', 'Content-Length': body.length });
      response.end(body);
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise((resolve, reject) => { previewServer.once('error', reject); previewServer.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${previewServer.address().port}/cnn-image-recognition.html`;
}
const output = '/private/tmp/cnn-courseware-validation';
mkdirSync(output, { recursive: true });
const port = 9241;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${output}/chrome-${process.pid}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let chromeErrors = '';
chrome.stderr.on('data', data => { chromeErrors += data; });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let i = 0; i < 60; i++) {
    try { target = (await fetch(`http://127.0.0.1:${port}/json/list`).then(r => r.json())).find(t => t.type === 'page'); } catch {}
    if (target) break;
    await pause(100);
  }
  assert.ok(target, `Chrome debugging endpoint must start: ${chromeErrors}`);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  const loadWaiters = [];
  const errors = [];
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Page.loadEventFired') loadWaiters.splice(0).forEach(resolve => resolve());
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('/favicon.ico')) errors.push(message.params.entry);
    if (!message.id || !pending.has(message.id)) return;
    const item = pending.get(message.id);
    clearTimeout(item.timeout);
    pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message));
    else item.resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const ready = async expression => {
    for (let i = 0; i < 120; i++) { if (await evaluate(expression)) return; await pause(30); }
    throw new Error(`Page not ready: ${expression}`);
  };
  let navigation = 0;
  const navigate = async suffix => {
    const url = new URL(base + suffix);
    url.searchParams.set('_check', String(++navigation));
    const loaded = new Promise(resolve => loadWaiters.push(resolve));
    await send('Page.navigate', { url: url.href });
    await loaded;
    await ready('document.readyState === "complete" && !!document.querySelector("#cnn-course-data")');
    await evaluate('document.fonts.ready');
  };
  const screenshot = async name => {
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    writeFileSync(`${output}/${name}.png`, Buffer.from(result.data, 'base64'));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  const checks = [];
  const animationChecks = [];
  const screenshotIds = new Set(['classification', 'invariance', 'conv-1d', 'conv-2d', 'filters', 'normalize-axes', 'mnist-cost', 'rotate-kernel', 'stride-unified', 'transfer-choice', 'compare-performance', 'compare-runtime', 'senet']);
  for (const width of [1440, 1024, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 1100, deviceScaleFactor: 1, mobile: width === 390 });
    await navigate('?mode=slides&page=1');
    for (let i = 0; i < slides.length; i++) {
      if (i) await evaluate('document.querySelector("#next-slide").click()');
      await ready('document.querySelector("#slide-image").hidden ? !!document.querySelector("#slide-window-stage svg") : document.querySelector("#slide-image").complete && document.querySelector("#slide-image").naturalWidth > 0');
      const result = await evaluate(`(async () => {
        const title = document.querySelector('#slide-title').getBoundingClientRect();
        const number = document.querySelector('.intro-slide-number').getBoundingClientRect();
        let img = document.querySelector('#slide-image');
        if(img.hidden){img=new Image();img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(document.querySelector('#slide-window-stage svg')))));await img.decode();}
        const canvas = document.createElement('canvas'); canvas.width=960; canvas.height=417;
        const context = canvas.getContext('2d'); context.drawImage(img,0,0,960,417);
        const pixels=context.getImageData(30,90,900,290).data;
        let ink=0; for(let n=0;n<pixels.length;n+=4) if(Math.min(pixels[n],pixels[n+1],pixels[n+2])<180 && pixels[n+3]>0) ink++;
        return {id:document.querySelector('#slides-mode').dataset.slideId,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overlap:title.right>number.left+1&&title.bottom>number.top&&title.top<number.bottom,ink,naturalWidth:img.naturalWidth};
      })()`);
      assert.equal(result.id, slides[i].id);
      assert.ok(result.scrollWidth <= width + 1, `Page overflow: ${width}, ${result.id}`);
      assert.ok(!result.overlap, `Title overlap: ${width}, ${result.id}`);
      assert.ok(result.ink > 100, `Blank visual: ${result.id}`);
      if (width !== 1024 && screenshotIds.has(result.id)) await screenshot(`${width}-${result.id}`);
      checks.push(result);
    }
    assert.equal(await evaluate('document.querySelector("#next-slide").disabled'), true);
    for (const [id, config] of Object.entries(windowAnimations)) {
      await navigate(`?mode=slides&page=${slides.findIndex(slide => slide.id === id) + 1}`);
      assert.equal(await evaluate('document.querySelector("#slide-window-stage").hidden'), false);
      assert.equal(await evaluate('document.querySelector("#slide-image").hidden'), true);
      assert.equal(await evaluate('document.querySelector("#slide-media").hidden'), true);
      await evaluate('document.querySelector("[data-window-action=play]").click()');
      const fingerprints = new Set();
      for (let index = 0; index < config.steps.length; index++) {
        if (index) await evaluate('document.querySelector("[data-window-action=next]").click()');
        const live = await evaluate(`(async () => {
          const stage=document.querySelector('#slide-window-stage');
          const svg=stage.querySelector('svg');
          const img=new Image();img.src='data:image/svg+xml;base64,'+btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(svg))));await img.decode();
          const canvas=document.createElement('canvas');canvas.width=960;canvas.height=417;
          const context=canvas.getContext('2d');context.drawImage(img,0,0);
          const pixels=context.getImageData(0,0,960,417).data;
          let ink=0,fingerprint=0;for(let i=0;i<pixels.length;i+=4){if(Math.min(pixels[i],pixels[i+1],pixels[i+2])<180)ink++;fingerprint=(fingerprint+pixels[i]*(i+1)+pixels[i+1]*(i+2)+pixels[i+2]*(i+3))%1000000007;}
          return {step:Number(stage.dataset.step),calculation:svg.querySelector('[data-window-equation] text').textContent,inputTransform:svg.querySelector('[data-window=input]').getAttribute('transform'),visible:[...svg.querySelectorAll('[data-output-cell]')].filter(cell=>cell.getAttribute('visibility')==='visible').map(cell=>({key:cell.dataset.outputCell,index:Number(cell.dataset.index),value:Number(cell.textContent)})),clipped:[...svg.querySelectorAll('text')].filter(el=>{const b=el.getBBox();return b.x<0||b.x+b.width>960||b.y<0||b.y+b.height>417;}).map(el=>el.textContent),overflow:document.documentElement.scrollWidth>innerWidth+1,playing:document.querySelector('[data-window-action=play]').getAttribute('aria-pressed'),ink,fingerprint};
        })()`);
        assert.equal(live.step, index);
        assert.equal(live.calculation, config.steps[index].calculation);
        assert.equal(live.inputTransform, `translate(${config.inputGrid.x + config.steps[index].col * config.stride * config.inputGrid.cell} ${config.inputGrid.y + config.steps[index].row * config.stride * config.inputGrid.cell})`);
        assert.deepEqual(live.visible, config.outputGrids.flatMap(output => config.steps.slice(0, index + 1).map((step, i) => ({key:output.key,index:i,value:step.results[output.key]}))));
        assert.deepEqual(live.clipped, []);
        assert.equal(live.overflow, false);
        assert.equal(live.playing, 'false');
        assert.ok(live.ink > 100);
        fingerprints.add(live.fingerprint);
        animationChecks.push({ id, width, index, ink: live.ink, fingerprint: live.fingerprint });
        if (width !== 1024 && [0, 1, config.steps.length - 1].includes(index)) await screenshot(`${width}-${id}-window-${index + 1}`);
      }
      assert.equal(fingerprints.size, config.steps.length, `${id}: window frames must differ visually`);
      assert.equal(await evaluate('document.querySelector("[data-window-action=next]").disabled'), true);
      await evaluate('document.querySelector("[data-window-action=play]").click()');
      await ready('document.querySelector("[data-window-action=play]").getAttribute("aria-label")==="重播"');
      assert.equal(await evaluate('Number(document.querySelector("#slide-window-stage").dataset.step)'), config.steps.length - 1);
      await evaluate('document.querySelector("[data-window-action=previous]").click()');
      assert.equal(await evaluate('Number(document.querySelector("#slide-window-stage").dataset.step)'), config.steps.length - 2);
      await evaluate('document.querySelector("[data-window-action=replay]").click()');
      assert.equal(await evaluate('document.querySelector("#slide-window-stage").dataset.step'), '0');
      if (width === 1440 && id === 'conv-1d') {
        await ready('document.querySelector("#slide-window-stage").dataset.moving==="true"');
        await evaluate('document.querySelector("[data-window-action=play]").click()');
        const frozen = await evaluate('document.querySelector("#slide-window-stage [data-window=input]").getAttribute("transform")');
        await pause(150);
        assert.equal(await evaluate('document.querySelector("#slide-window-stage [data-window=input]").getAttribute("transform")'), frozen);
        await evaluate('document.querySelector("[data-window-action=play]").click()');
        await ready('document.querySelector("#slide-window-stage").dataset.step==="1"');
        await evaluate('document.querySelector("[data-window-action=play]").click()');
        await screenshot('1440-conv-1d-auto-window-2');
      }
      await evaluate('document.querySelector("#next-slide").click()');
      assert.equal(await evaluate('document.querySelector("#slide-window-stage").children.length'), 0);
      assert.equal(await evaluate('document.querySelector("#slide-window-controls").hidden'), true);
    }
    await navigate('#cnn-convolution');
    const imageErrors = await evaluate(`(async () => {
      const results=await Promise.all([...document.querySelectorAll('#read-mode img')].map(async img=>{
        img.loading='eager';
        for(let attempt=0;attempt<3;attempt++){
          try{await img.decode();if(img.naturalWidth>0)return null;}catch{}
          await new Promise(resolve=>setTimeout(resolve,100));
        }
        return {src:img.src,complete:img.complete,naturalWidth:img.naturalWidth};
      }));
      return results.filter(Boolean);
    })()`);
    assert.deepEqual(imageErrors, [], `Reading images must decode at ${width}`);
    const readingResult = await evaluate(`(() => ({sections:document.querySelectorAll('.cnn-topic').length,errors:[...document.querySelectorAll('.katex-error')].map(e=>e.textContent),broken:[...document.querySelectorAll('#read-mode img')].filter(img=>!img.naturalWidth).map(img=>img.src),width:document.documentElement.scrollWidth,leaked:document.querySelector('#read-mode').textContent.includes('<!-- figure:')}))()`);
    assert.equal(readingResult.sections, sections.length);
    assert.deepEqual(readingResult.errors, []);
    assert.deepEqual(readingResult.broken, []);
    assert.ok(readingResult.width <= width + 1, `Reading overflow at ${width}`);
    assert.equal(readingResult.leaked, false);
    await screenshot(`${width}-reading-convolution`);
  }

  // Inspect generated SVG text at native resolution, independent of page scaling.
  const clipped = await evaluate(`(async () => {
    const items=JSON.parse(document.querySelector('#cnn-course-data').textContent).slides;
    const issues=[];
    for(const item of items){
      const markup=await fetch('diagrams/cnn/'+item.id+'.svg').then(r=>r.text());
      const parsed=new DOMParser().parseFromString(markup,'image/svg+xml');
      if(parsed.querySelector('parsererror')){issues.push({id:item.id,invalidSVG:parsed.querySelector('parsererror').textContent});continue;}
      const node=parsed.documentElement;
      const host=document.createElement('div');host.style.cssText='position:absolute;left:0;top:0;width:960px;opacity:0;pointer-events:none';host.append(document.importNode(node,true));document.body.append(host);
      for(const el of host.querySelectorAll('text')){const b=el.getBBox();if(b.x<0||b.x+b.width>960||b.y<0||b.y+b.height>417)issues.push({id:item.id,text:el.textContent,bounds:[b.x,b.y,b.width,b.height]});}
      for(const el of host.querySelectorAll('image')){
        const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=el.getAttribute('href');});
        const canvas=document.createElement('canvas');canvas.width=160;canvas.height=160;
        const context=canvas.getContext('2d');context.drawImage(img,0,0,160,160);
        const pixels=context.getImageData(0,0,160,160).data;
        let ink=0;for(let n=0;n<pixels.length;n+=4)if(.2126*pixels[n]+.7152*pixels[n+1]+.0722*pixels[n+2]<180&&pixels[n+3]>0)ink++;
        if(ink<20)issues.push({id:item.id,blankEmbeddedImage:true,ink});
      }
      host.remove();
    }
    return issues;
  })()`);
  assert.deepEqual(clipped, [], 'SVG text must fit its viewport and embedded images must contain visible content');

  for (const [, id] of sections) {
    const index = slides.findIndex(s => s.section === id) + 1;
    await navigate(`?mode=slides&page=${index}`);
    await ready(`document.querySelector('#slides-mode').dataset.slideId === ${JSON.stringify(slides[index - 1].id)}`);
    await evaluate('document.querySelector("#read-current").click()');
    assert.equal(await evaluate('location.hash'), `#${id}`);
    await evaluate(`document.querySelector('[data-present-section="${id}"]').click()`);
    assert.equal(await evaluate('document.querySelector("#slides-mode").dataset.slideId'), slides[index - 1].id);
  }
  await navigate('?mode=slides&page=8');
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  assert.equal(await evaluate('document.querySelector("#slides-mode").dataset.slideId'), slides[8].id);
  await evaluate('history.back()');
  await ready(`document.querySelector('#slides-mode').dataset.slideId === ${JSON.stringify(slides[7].id)}`);
  await evaluate('history.forward()');
  await ready(`document.querySelector('#slides-mode').dataset.slideId === ${JSON.stringify(slides[8].id)}`);
  await navigate('#cnn-spatial');
  await evaluate('const input=document.querySelector("[data-size-input=input]");input.value="8";input.dispatchEvent(new Event("input",{bubbles:true}))');
  assert.equal(await evaluate('document.querySelector("#cnn-size-output").textContent'), '4');
  await navigate('#cnn-stride-gradient');
  for (const [index, count] of [[0, 4], [1, 9], [2, 49], [3, 25]]) {
    await evaluate(`document.querySelector('[data-gradient-state="${index}"]').click()`);
    assert.equal(await evaluate('document.querySelectorAll("#gradient-state-matrix span").length'), count);
  }
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await navigate('?mode=slides&page=8');
  assert.equal(await evaluate('document.querySelector("[data-window-action=play]").getAttribute("aria-pressed")'), 'false');
  await evaluate('document.querySelector("[data-window-action=next]").click()');
  assert.equal(await evaluate('document.querySelector("#slide-window-stage").dataset.step'), '1');
  assert.equal(await evaluate('document.querySelector("#slide-window-stage").dataset.moving'), 'false');
  await evaluate('document.querySelector("#read-current").click()');
  assert.equal(await evaluate('document.querySelector("#slide-window-stage").children.length'), 0);
  await send('Emulation.setEmulatedMedia', { features: [] });
  await navigate(`?mode=slides&page=${slides.findIndex(slide => slide.motion && !windowAnimations[slide.id]) + 1}`);
  await ready('!document.querySelector("#slide-media").hidden');
  await evaluate('document.querySelector("[data-motion-toggle]").click()');
  assert.equal(await evaluate('document.querySelector("#slide-media img").dataset.motionPlaying'), 'false');
  assert.deepEqual(errors, [], 'Browser runtime and resource errors');
  writeFileSync(`${output}/report.json`, JSON.stringify({sourcePages:118,readingSections:sections.length,presentationSlides:slides.length,viewports:[1440,1024,390],slideChecks:checks.length,animationChecks,browserErrors:errors,svgClipping:clipped,checks},null,2));
  console.log(`Passed source coverage, ${checks.length} slide/pixel checks, ${animationChecks.length} live window states, playback/pause/step/replay/reduced-motion, all reading sections, SVG bounds, formulas, mode switching, navigation, history and calculation controls. Screenshots: ${output}`);
} finally {
  socket?.close();
  chrome.kill();
  if (previewServer) { previewServer.closeAllConnections(); await new Promise(resolve => previewServer.close(resolve)); }
}
