import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { slides, topicStarts } from './intro-presentation-data.mjs';
import { renderView, calculateExample, exampleParameters, transformCase, caseRows, gradientStep, fitSamples, interpolateFit, linearImageScores, commuteStep } from './intro-presentation-views.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const html = readFileSync(`${root}intro-overview.html`, 'utf8');
const readingIds = [...html.matchAll(/data-reading-slide="([^"]+)"/g)].map((match) => match[1]);
for (const id of readingIds) assert.ok(slides.some((slide) => slide.id === id), `Reading diagram: ${id}`);
for (const id of ['linear-image-3', 'commute-linear', 'commute-update', 'matrix-calculus', 'chain-rule', 'output-delta', 'hidden-delta', 'backprop-example-5', 'nesterov', 'adagrad', 'rmsprop-adadelta', 'initialization-forward', 'initialization-backward', 'case-clean', 'case-discrete', 'coarse-labels', 'annotation-media', 'evaluation-methods', 'performance-metrics']) assert.ok(readingIds.includes(id), `Reading coverage: ${id}`);
assert.ok(html.includes(`${slides.length} 个演示步骤`));
assert.ok(!html.includes('超过 30%'));
assert.ok(!readFileSync(`${root}diagrams/intro/10.svg`, 'utf8').includes('30%'));

assert.equal(new Set(slides.map((slide) => slide.id)).size, slides.length);
assert.equal(Object.keys(topicStarts).length, 7);
for (const [topic, start] of Object.entries(topicStarts)) {
  assert.ok(html.includes(`id="${topic}"`));
  assert.equal(slides[start - 1].topic, topic);
}
for (const slide of slides) {
  assert.ok(slide.sourcePages.length);
  assert.ok(slide.sourcePages.every((p) => p >= 1 && p <= 165));
  assert.ok(slide.title && slide.note && slide.caption);
  const rendered = renderView(slide.view);
  assert.ok(rendered.length > 20);
  assert.ok(!/\b(?:undefined|NaN)\b/.test(rendered), slide.id);
  for (const match of rendered.matchAll(/src="([^"?]+)(?:\?[^"]*)?"/g)) assert.ok(existsSync(root + match[1]), match[1]);
}

// Classroom pages follow the source's first-introduction order; the recap is a retrospective.
const teachingSlides = slides.filter((slide) => slide.id !== 'recap');
teachingSlides.slice(1).forEach((slide, i) => assert.ok(Math.min(...slide.sourcePages) >= Math.min(...teachingSlides[i].sourcePages), `Source teaching order: ${slide.id}`));
const orderedBefore = (first, second) => assert.ok(slides.findIndex((slide) => slide.id === first) < slides.findIndex((slide) => slide.id === second), `${first} must precede ${second}`);
for (const [first, second] of [['ai-science', 'ai-applications'], ['neuron-model', 'neuron-sum'], ['linear-image', 'xor-input'], ['xor-input', 'two-layer-shapes'], ['two-layer-shapes', 'activation-question'], ['linear-collapse', 'relu'], ['relu', 'leaky-relu'], ['leaky-relu', 'sigmoid'], ['sigmoid', 'softmax'], ['commute-linear', 'commute-update'], ['commute-update', 'commute-features'], ['commute-features', 'commute-designed'], ['commute-designed', 'commute-mlp'], ['matrix-calculus', 'chain-rule'], ['chain-rule', 'gradient-step'], ['gradient-step', 'backprop-path'], ['forward-layers', 'output-delta'], ['output-delta', 'hidden-delta'], ['momentum', 'nesterov'], ['nesterov', 'adagrad'], ['adagrad', 'rmsprop-adadelta'], ['rmsprop-adadelta', 'adam-adamw'], ['initialization-assumptions', 'initialization-forward'], ['initialization-forward', 'initialization-backward'], ['evaluation-methods', 'performance-metrics'], ['performance-metrics', 'deployment']]) orderedBefore(first, second);
const beforeActivation = slides.slice(topicStarts['topic-mlp'] - 1, slides.findIndex((slide) => slide.id === 'activation-question'));
beforeActivation.forEach((slide) => assert.ok(!/ReLU|Sigmoid|Softmax|\\max\(/i.test(renderView(slide.view)), `No premature activation calculation: ${slide.id}`));
const assetIndex = JSON.parse(readFileSync(`${root}../AI工程学/.course-build/01-neural-networks/asset-index.json`, 'utf8'));
for (const [path, sourcePart] of [['neuron-model.jpg', 'ppt/media/image94.jpg'], ['development-directions.png', 'ppt/media/image91.png'], ['linear-boundary.jpg', 'ppt/media/image104.jpg'], ['commute-regression.png', 'ppt/media/image125.png'], ['breast-ultrasound.png', 'ppt/media/image341.png'], ['breast-mask.png', 'ppt/media/image338.png']]) {
  assert.equal(createHash('sha256').update(readFileSync(`${root}media/intro/presentation/${path}`)).digest('hex'), assetIndex.find((asset) => asset.part === sourcePart).sha256);
}
const commute = commuteStep();
assert.deepEqual(commute.gradient.map((value) => Number(value.toFixed(2))), [-22.9, -495.98]);
assert.ok(commute.afterLoss < commute.beforeLoss);

const result = calculateExample();
assert.deepEqual(result.zs[0], [5, 9, 10]);
assert.ok(Math.abs(result.zs[2][0] - 5.9964834878271764) < 1e-12);
assert.ok(Math.abs(result.prediction - 0.9975186881409559) < 1e-14);
assert.ok(Math.abs(result.deltas[0][0] + 2.2713057145264287e-10) < 1e-20);
assert.deepEqual(linearImageScores().map((value) => Number(value.toFixed(2))), [-96.8, 437.9, 60.75]);

// Check all analytic gradients against finite differences away from saturation.
const fixture = structuredClone(exampleParameters);
fixture.weights = fixture.weights.map((w) => w.map((row) => row.map((v) => v * 0.1)));
fixture.biases = fixture.biases.map((b) => b.map((v) => v * 0.1));
const analytic = calculateExample(fixture);
const epsilon = 1e-5;
let checked = 0;
for (let l = 0; l < fixture.weights.length; l += 1) {
  for (let i = 0; i < fixture.weights[l].length; i += 1) {
    for (let j = 0; j < fixture.weights[l][i].length; j += 1) {
      const plus = structuredClone(fixture), minus = structuredClone(fixture);
      plus.weights[l][i][j] += epsilon;
      minus.weights[l][i][j] -= epsilon;
      const numeric = (calculateExample(plus).loss - calculateExample(minus).loss) / (2 * epsilon);
      assert.ok(Math.abs(numeric - analytic.gradients[l][i][j]) < 1e-9, `W${l + 1}[${i},${j}]`);
      checked += 1;
    }
    const plus = structuredClone(fixture), minus = structuredClone(fixture);
    plus.biases[l][i] += epsilon;
    minus.biases[l][i] -= epsilon;
    const numeric = (calculateExample(plus).loss - calculateExample(minus).loss) / (2 * epsilon);
    assert.ok(Math.abs(numeric - analytic.deltas[l][i]) < 1e-9, `b${l + 1}[${i}]`);
    checked += 1;
  }
}
assert.equal(gradientStep(3, 0.25).next, 2);
assert.equal(gradientStep(3, 0.25).afterLoss, 1);
assert.ok(gradientStep(3, 1.2).afterLoss > 4);
fitSamples.forEach(([x, y]) => assert.ok(Math.abs(interpolateFit(x) - y) < 1e-12));
assert.ok(Math.abs(interpolateFit(1) - 1) > 0.5, 'Overfit interpolation must expose a real generalization difference');

assert.deepEqual(transformCase('clean').rows.map((row) => row[0]), [1, 2, 3, 5]);
assert.ok(Math.abs(transformCase('clean').bmiMean - 30.1) < 1e-12);
assert.ok(Math.abs(transformCase('clean').rows[1][5] - 30.1) < 1e-12);
assert.equal(transformCase('clean').insulinMean, 94.75);
assert.equal(transformCase('minmax').rows[0][1], 0.5);
for (const col of [5, 7]) {
  const standardized = transformCase('standard').rows.map((row) => row[col]);
  assert.ok(Math.abs(standardized.reduce((a, b) => a + b, 0)) < 1e-12);
  assert.ok(Math.abs(standardized.reduce((a, b) => a + b * b, 0) / standardized.length - 1) < 1e-12);
}
const standard = transformCase('standard').rows;
const discrete = transformCase('discrete').rows;
assert.deepEqual(discrete.map((row) => [row[1], row[5], row[7]]), standard.map((row) => [row[1], row[5], row[7]]), 'Discretization must preserve previous transforms');
assert.deepEqual(discrete.map((row) => row[6]), ['中值组', '低值组', '高值组', '中值组']);
for (const step of ['selected', 'missing', 'clean', 'minmax', 'standard', 'discrete']) {
  const rows = transformCase(step).rows;
  assert.deepEqual(rows.map((row) => [row[0], row[9]]), caseRows.filter((row) => rows.some((current) => current[0] === row[0])).map((row) => [row[0], row[9]]));
}
console.log(`Validated ${slides.length} slides, ${readingIds.length} shared reading diagrams, PPT teaching order, original media, ${checked} independent gradient checks, and cumulative dataset transforms.`);
