import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { slides, topicStarts } from './intro-presentation-data.mjs';

const base = process.argv.find((argument) => argument.startsWith('--base='))?.slice(7) || 'http://127.0.0.1:8081/intro-overview.html';
const out = '/private/tmp/intro-presentation-check';
mkdirSync(out, { recursive: true });
const port = 9257;
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${out}/chrome-${process.pid}`, 'about:blank'], { stdio: 'ignore' });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
try {
  let target;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try { target = (await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json())).find((item) => item.type === 'page'); } catch {}
    if (target) break;
    await pause(100);
  }
  assert.ok(target, 'Chrome debugging endpoint must start');
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails);
    if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error' && !message.params.entry.url?.endsWith('/favicon.ico')) errors.push(message.params.entry);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject, timeout } = pending.get(message.id);
    clearTimeout(timeout);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const response = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  const ready = async (expression, attempts = 100) => {
    for (let i = 0; i < attempts; i += 1) { if (await evaluate(expression)) return; await pause(30); }
    throw new Error(`Page did not become ready: ${expression}`);
  };
  const navigate = async (page) => {
    await send('Page.navigate', { url: `${base}?mode=slides&page=${page}` });
    await ready(`document.querySelector('#slides-mode')?.dataset.slideId === ${JSON.stringify(slides[page - 1].id)}`);
    await ready('document.readyState === "complete"');
    await evaluate('document.fonts.ready');
    await evaluate('Promise.all([...document.querySelectorAll(".ann-presentation-stage img")].map(img => img.complete ? Promise.resolve() : new Promise(resolve => { img.onload=resolve; img.onerror=resolve; })))');
  };
  const screenshot = async (name) => {
    const result = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, fromSurface: true });
    writeFileSync(`${out}/${name}.png`, Buffer.from(result.data, 'base64'));
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  const checks = [];
  const readingChecks = [];
  for (const width of [1440, 1024, 390]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 1000, deviceScaleFactor: 1, mobile: width === 390 });
    await navigate(1);
    for (let page = 1; page <= slides.length; page += 1) {
      if (page > 1) await evaluate('document.querySelector("#next-slide").click()');
      await ready('[...document.querySelectorAll(".ann-presentation-stage img")].every(img => img.complete)');
      const result = await evaluate(`(() => {
        const panel = document.querySelector('#slides-mode');
        const stage = document.querySelector('.ann-presentation-stage');
        const header = document.querySelector('.intro-slide-heading');
        const errors = [...stage.querySelectorAll('.katex-error')].map(x=>x.textContent);
        const broken = [...stage.querySelectorAll('img')].filter(x=>x.complete && x.naturalWidth===0).map(x=>x.src);
        const title = document.querySelector('#slide-title').getBoundingClientRect();
        const number = document.querySelector('.intro-slide-number').getBoundingClientRect();
        const formulaOverflow=[...stage.querySelectorAll('[data-tex]')].filter(x=>x.scrollWidth>x.clientWidth+2).map(x=>x.dataset.tex);
        return {id:panel.dataset.slideId, width:innerWidth, scrollWidth:document.documentElement.scrollWidth, formulaErrors:errors, formulaOverflow, broken, overlap:title.right>number.left+1 && title.bottom>number.top && title.top<number.bottom, stageHeight:stage.offsetHeight, selected:document.querySelector('[data-topic-link].selected')?.dataset.topicLink};
      })()`);
      assert.equal(result.id, slides[page - 1].id);
      assert.equal(result.selected, slides[page - 1].topic);
      assert.ok(result.scrollWidth <= width + 1, `Horizontal page overflow: ${width}px, ${result.id}`);
      assert.ok(!result.overlap, `Heading overlap: ${width}px, ${result.id}`);
      assert.deepEqual(result.formulaErrors, [], `Formula rendering: ${result.id}`);
      assert.deepEqual(result.formulaOverflow, [], `Formula overflow: ${width}px, ${result.id}`);
      assert.deepEqual(result.broken, [], `Broken image: ${result.id}`);
      assert.ok(result.stageHeight >= 200);
      if (slides[page - 1].view.type === 'video') await ready('document.querySelector(".ann-presentation-stage video").readyState>=1');
      if (['mango-tasks', 'turing-test', 'neuron-model', 'neuron-sum', 'linear-image-3', 'linear-geometry', 'xor-input', 'two-layer-shapes', 'linear-collapse', 'relu', 'leaky-relu', 'commute-linear', 'commute-update', 'commute-mlp', 'matrix-calculus', 'gradient-step', 'backprop-example-3', 'backprop-example-4', 'initialization-forward', 'case-clean', 'case-standard', 'case-discrete', 'label-granularity', 'evaluation-methods'].includes(result.id) && width !== 1024) await screenshot(`${width}-${page}-${result.id}`);
      checks.push(result);
    }
    assert.equal(await evaluate('document.querySelector("#next-slide").disabled'), true);
    await evaluate('document.querySelector("#read-current").click()');
    await ready('[...document.querySelectorAll("#read-mode img")].every(img => img.complete)');
    const reading = await evaluate(`(() => {
      const root = document.querySelector('#read-mode');
      return {width:innerWidth, scrollWidth:document.documentElement.scrollWidth, figures:root.querySelectorAll('[data-reading-slide]').length,
        formulaErrors:[...root.querySelectorAll('.katex-error')].map(x=>x.textContent),
        formulaOverflow:[...root.querySelectorAll('[data-tex]')].filter(x=>x.scrollWidth>x.clientWidth+2).map(x=>x.dataset.tex),
        broken:[...root.querySelectorAll('img')].filter(x=>x.naturalWidth===0).map(x=>x.src),
        wrongTopics:[...root.querySelectorAll('[data-reading-slide]')].filter(x=>!x.closest('[data-topic]')).map(x=>x.dataset.readingSlide),
        pageCount:document.querySelector('.intro-page-count').textContent};
    })()`);
    assert.ok(reading.scrollWidth <= width + 1, `Reading overflow: ${width}px`);
    assert.ok(reading.figures >= 60);
    assert.deepEqual(reading.formulaErrors, []);
    assert.deepEqual(reading.formulaOverflow, []);
    assert.deepEqual(reading.broken, []);
    assert.deepEqual(reading.wrongTopics, []);
    assert.ok(reading.pageCount.includes(String(slides.length)));
    readingChecks.push(reading);
    await evaluate('document.querySelector("[data-reading-slide=\\"backprop-example-4\\"]").scrollIntoView({block:"start",behavior:"instant"})');
    await screenshot(`${width}-reading-backprop`);
    await evaluate('document.querySelector("[data-reading-slide=\\"case-standard\\"]").scrollIntoView({block:"start",behavior:"instant"})');
    await screenshot(`${width}-reading-case`);
  }

  await navigate(slides.findIndex((slide) => slide.id === 'neuron-model') + 1);
  assert.ok(await evaluate('document.querySelector(".ann-presentation-stage img").naturalWidth === 1776'));
  await evaluate('document.querySelector(".ann-presentation-stage [data-zoom-image]").click()');
  assert.equal(await evaluate('document.querySelector(".ann-image-dialog").open'), true);
  await evaluate('document.querySelector("[data-image-close]").click()');
  await navigate(slides.findIndex((slide) => slide.id === 'relu') + 1);
  await evaluate('const activation=document.querySelector(".ann-presentation-stage [data-control=z]");activation.value="-2";activation.dispatchEvent(new Event("input",{bubbles:true}))');
  assert.equal(await evaluate('document.querySelector(".ann-presentation-stage [data-live-view] tbody tr td:nth-child(2)").textContent'), '0');
  await navigate(slides.findIndex((slide) => slide.id === 'leaky-relu') + 1);
  assert.equal(await evaluate('document.querySelector(".ann-presentation-stage [data-live-view] tbody tr td:nth-child(2)").textContent'), '-0.2');

  await navigate(slides.findIndex((slide) => slide.id === 'gradient-step') + 1);
  const before = await evaluate('document.querySelector(".ann-presentation-stage [data-live-view]").textContent');
  await evaluate('const s=document.querySelector(".ann-presentation-stage [data-control=rate]");s.value="1.2";s.dispatchEvent(new Event("input",{bubbles:true}))');
  const after = await evaluate('document.querySelector(".ann-presentation-stage [data-live-view]").textContent');
  assert.notEqual(before, after);
  assert.ok(after.includes('上升'));
  await evaluate('const rate=document.querySelector(".ann-presentation-stage [data-control=rate]");rate.value="0.25";rate.dispatchEvent(new Event("input",{bubbles:true}));document.querySelector(".ann-presentation-stage [data-gradient-play]").click()');
  await ready('document.querySelector(".ann-presentation-stage").dataset.iteration==="8" && !document.querySelector(".ann-presentation-stage [data-gradient-play]").disabled', 200);
  assert.ok((await evaluate('document.querySelector(".ann-presentation-stage [data-live-view]").textContent')).includes('下降'));
  await navigate(slides.findIndex((slide) => slide.id === 'backprop-example-4') + 1);
  await evaluate('document.querySelector(".ann-presentation-stage [data-network-play]").click()');
  await ready('document.querySelectorAll(".ann-signal").length>0');
  const moving = await evaluate('(() => {const dot=document.querySelector(".ann-signal");return {x:dot.getAttribute("cx"),y:dot.getAttribute("cy"),animations:dot.getAnimations().length}})()');
  assert.ok(moving.animations > 0);
  await screenshot('390-gradient-signals');
  await ready('!document.querySelector(".ann-presentation-stage [data-network-play]").disabled');
  assert.equal(await evaluate('document.querySelectorAll(".ann-signal").length'), 0);
  await evaluate('document.querySelector(".ann-presentation-stage [data-zoom-svg]").click()');
  await ready('document.querySelector(".ann-image-dialog img").complete');
  assert.ok(await evaluate('document.querySelector(".ann-image-dialog img").naturalWidth>0'));
  await screenshot('390-network-enlarged');
  await evaluate('document.querySelector("[data-image-close]").click()');
  await navigate(slides.findIndex((slide) => slide.id === 'initialization-forward') + 1);
  const stable = await evaluate('document.querySelector(".ann-presentation-stage [data-live-view]").textContent');
  await evaluate('const gain=document.querySelector(".ann-presentation-stage [data-control=gain]");gain.value="1.5";gain.dispatchEvent(new Event("input",{bubbles:true}))');
  assert.notEqual(stable, await evaluate('document.querySelector(".ann-presentation-stage [data-live-view]").textContent'));
  assert.ok((await evaluate('document.querySelector(".ann-presentation-stage [data-live-view]").textContent')).includes('放大'));
  await navigate(slides.findIndex((slide) => slide.id === 'softmax') + 1);
  const softmaxBefore = await evaluate('document.querySelector(".ann-presentation-stage [data-live-view]").textContent');
  await evaluate('const s=document.querySelector(".ann-presentation-stage [data-control=score]");s.value="5";s.dispatchEvent(new Event("input",{bubbles:true}))');
  assert.notEqual(softmaxBefore, await evaluate('document.querySelector(".ann-presentation-stage [data-live-view]").textContent'));
  await navigate(slides.findIndex((slide) => slide.id === 'dropout') + 1);
  const dropoutBefore = await evaluate('document.querySelector(".ann-presentation-stage [data-live-view]").textContent');
  await evaluate('document.querySelector(".ann-presentation-stage [data-dropout=\\"1\\"]").click()');
  assert.notEqual(dropoutBefore, await evaluate('document.querySelector(".ann-presentation-stage [data-live-view]").textContent'));
  await evaluate('document.querySelector(".ann-presentation-stage [data-dropout=\\"2\\"]").click()');
  assert.ok((await evaluate('document.querySelector(".ann-presentation-stage [data-live-view]").textContent')).includes('无需再缩放'));
  await navigate(slides.findIndex((slide) => slide.id === 'ai-applications') + 1);
  await evaluate('document.querySelector(".ann-presentation-stage [data-zoom-image]").click()');
  assert.equal(await evaluate('document.querySelector(".ann-image-dialog").open'), true);
  const imageWidthBefore = await evaluate('document.querySelector(".ann-image-dialog img").getBoundingClientRect().width');
  await evaluate('document.querySelector("[data-image-plus]").click()');
  assert.ok(await evaluate(`document.querySelector('.ann-image-dialog img').getBoundingClientRect().width > ${imageWidthBefore}`));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await ready('!document.querySelector(".ann-image-dialog").open');

  for (const [topic, start] of Object.entries(topicStarts)) {
    await navigate(start);
    await evaluate('document.querySelector("#read-current").click()');
    assert.equal(await evaluate('document.querySelector("#read-mode").hidden'), false);
    assert.equal(await evaluate('location.hash'), `#${topic}`);
    await evaluate(`document.querySelector('[data-present-topic="${topic}"]').click()`);
    assert.equal(await evaluate('document.querySelector("#slides-mode").dataset.slideId'), slides[start - 1].id);
  }
  await navigate(1);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  assert.equal(await evaluate('document.querySelector("#slides-mode").dataset.slideId'), slides[1].id);
  await evaluate('history.back()');
  await ready(`document.querySelector('#slides-mode').dataset.slideId === ${JSON.stringify(slides[0].id)}`);
  await evaluate('history.forward()');
  await ready(`document.querySelector('#slides-mode').dataset.slideId === ${JSON.stringify(slides[1].id)}`);
  await send('Page.navigate', { url: `${base}#topic-mlp` });
  await ready('document.querySelector("[data-topic-link=\\"topic-mlp\\"]").classList.contains("selected")');
  await screenshot('390-reading-mlp');
  // Rapid page changes cancel reading-panel metadata downloads; check active video separately.
  const fatalErrors = errors.filter((error) => !(error.url?.endsWith('/media1.mp4') && error.text?.includes('ERR_CONNECTION_RESET')));
  await navigate(slides.findIndex((slide) => slide.id === 'ai-dialog-video') + 1);
  await ready('document.querySelector(".ann-presentation-stage video").readyState>=2');
  const media = await evaluate('(() => {const v=document.querySelector(".ann-presentation-stage video");return {duration:v.duration,error:v.error?.message||null,width:v.videoWidth,height:v.videoHeight}})()');
  assert.ok(media.duration>0 && media.width>0 && media.height>0);
  assert.equal(media.error, null);
  assert.deepEqual(fatalErrors, [], 'Browser runtime and resource errors');
  writeFileSync(`${out}/report.json`, JSON.stringify({ pages: slides.length, viewports: [1440, 1024, 390], checks: checks.length, readingChecks, browserErrors: fatalErrors, media, screenshots: out }, null, 2));
  console.log(`Passed ${checks.length} presentation checks and ${readingChecks.length} complete reading views; verified moving signals, repeated gradient updates, chapter switching, keyboard navigation and history. Screenshots: ${out}`);
} finally {
  socket?.close();
  chrome.kill();
}
