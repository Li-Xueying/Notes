export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
export const equation = (value) => `<div class="ann-equation" data-tex="${escapeHtml(value)}">${escapeHtml(value)}</div>`;
export const statement = (value) => `<p class="ann-conclusion">${value}</p>`;
export const columns = (items) => `<div class="ann-columns">${items.map(([title, body]) => `<section><h3>${title}</h3>${body}</section>`).join('')}</div>`;
export const table = (headers, rows) => `<div class="ann-table-scroll" tabindex="0" role="region" aria-label="${escapeHtml(headers.join('、'))}"><table><thead><tr>${headers.map((value) => `<th scope="col">${value}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((value) => `<td>${value}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const eq = equation;
const f = String.raw;
const fmt = (value, digits = 5) => value === 0 ? '0' : Math.abs(value) < 0.0001 ? value.toExponential(3) : Number(value.toFixed(digits)).toString();
const scientificTex = (value) => {
  const [mantissa, exponent] = value.toExponential(5).split('e');
  return `${mantissa}\\times10^{${Number(exponent)}}`;
};
const matrix = (rows) => eq(`\\begin{bmatrix}${rows.map((row) => row.map((value) => typeof value === 'number' ? fmt(value) : value).join('&')).join('\\\\')}\\end{bmatrix}`);
const photo = (path, alt, extra = '') => `<img class="ann-photo" src="${escapeHtml(path)}" alt="${escapeHtml(alt)}" ${extra}>`;
const zoomablePhoto = (path, alt, extra = '') => `<figure class="ann-media-figure">${photo(path, alt, extra)}<button class="ann-zoom" type="button" data-zoom-image title="查看大图">查看大图</button></figure>`;
const node = (label, value, kind = '') => `<div class="ann-node ${kind}"><span>${label}</span><strong>${value}</strong></div>`;
const arrow = '<span class="ann-arrow" aria-hidden="true">→</span>';
const flow = (items) => `<div class="ann-flow">${items.join(arrow)}</div>`;
const slider = (name, label, min, max, step, value) => `<label class="ann-slider"><span>${label}</span><input data-control="${name}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output data-output="${name}">${value}</output></label>`;
const svg = (title, description, body, width = 600, height = 300) => `<svg class="ann-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(title)}"><title>${escapeHtml(title)}</title><desc>${escapeHtml(description)}</desc>${body}</svg>`;
let plotSequence = 0;

function plot(title, description, curves = [], dots = [], options = {}) {
  const clipId = `ann-plot-${++plotSequence}`;
  const { xmin = -5, xmax = 5, ymin = -1, ymax = 5, xLabel = 'z', yLabel = '响应' } = options;
  const x = (value) => 52 + (value - xmin) / (xmax - xmin) * 500;
  const y = (value) => 248 - (value - ymin) / (ymax - ymin) * 215;
  const xzero = x(Math.max(xmin, Math.min(xmax, 0)));
  const yzero = y(Math.max(ymin, Math.min(ymax, 0)));
  const axis = `<path d="M52 ${yzero}H560 M${xzero} 25V253" fill="none" stroke="#87938f" stroke-width="1.5"/><text x="556" y="277">${escapeHtml(xLabel)}</text><text x="12" y="18">${escapeHtml(yLabel)}</text><text x="52" y="276">${xmin}</text><text x="519" y="276">${xmax}</text><text x="10" y="39">${ymax}</text><text x="10" y="247">${ymin}</text>`;
  const paths = curves.map(({ fn, color = '#246c58', dashed = false }) => {
    const samples = Array.from({ length: 151 }, (_, i) => xmin + (xmax - xmin) * i / 150);
    const d = samples.map((v, i) => `${i ? 'L' : 'M'}${x(v).toFixed(2)} ${y(fn(v)).toFixed(2)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3" ${dashed ? 'stroke-dasharray="6 4"' : ''}/>`;
  }).join('');
  const points = dots.map(({ px, py, color = '#bd6540', label, hollow = false }) => `<circle cx="${x(px)}" cy="${y(py)}" r="6" fill="${hollow ? '#fff' : color}" stroke="${color}" stroke-width="2"/>${label ? `<text x="${x(px) + 9}" y="${y(py) - 10}">${escapeHtml(label)}</text>` : ''}`).join('');
  return svg(title, description, `<defs><clipPath id="${clipId}"><rect x="43" y="24" width="535" height="239"/></clipPath></defs>${axis}<g clip-path="url(#${clipId})">${paths}${points}</g>`);
}

export const exampleParameters = {
  x: [1, 2], y: 1,
  weights: [[[2, 1], [1, 3], [3, 2]], [[1, 1, 2], [3, 2, 2]], [[1, 3]]],
  biases: [[1, 2, 3], [2, 1], [2]],
};
const sigmoid = (z) => 1 / (1 + Math.exp(-z));

export function calculateExample(parameters = exampleParameters) {
  const { x, y, weights, biases } = parameters;
  const activations = [x];
  const zs = [];
  weights.forEach((w, layer) => {
    const z = w.map((row, index) => row.reduce((sum, value, col) => sum + value * activations[layer][col], biases[layer][index]));
    zs.push(z);
    activations.push(z.map(sigmoid));
  });
  const prediction = activations[3][0];
  const loss = 0.5 * (prediction - y) ** 2;
  const deltas = Array(3);
  deltas[2] = [(prediction - y) * prediction * (1 - prediction)];
  for (let l = 1; l >= 0; l -= 1) {
    deltas[l] = activations[l + 1].map((value, j) => weights[l + 1].reduce((sum, row, k) => sum + row[j] * deltas[l + 1][k], 0) * value * (1 - value));
  }
  const gradients = deltas.map((delta, l) => delta.map((value) => activations[l].map((input) => value * input)));
  return { zs, activations, prediction, loss, deltas, gradients };
}

export function gradientStep(weight, rate) {
  const gradient = 2 * (weight - 1);
  const next = weight - rate * gradient;
  return { gradient, next, beforeLoss: (weight - 1) ** 2, afterLoss: (next - 1) ** 2 };
}

export const caseRows = [
  [1, 45, '张三', 76, 165, 28.1, 6.8, 85, '是', '是'],
  [2, 29, '李四', null, 175, null, 5.1, 64, '否', '否'],
  [3, 61, '王五', 82, 160, 32, 15.3, 142, '是', '是'],
  [4, 35, '赵六', 71, 170, 24.5, 5.6, null, '否', '否'],
  [5, 52, '林七', 83, 166, 30.2, 6.2, 88, '是', '是'],
];

export function transformCase(step) {
  // The source introduces a missing-data scenario before deleting record 4.
  const qualityRows = caseRows.map((row) => row.map((value, col) => row[0] === 4 && col === 6 ? null : value));
  const retained = qualityRows.filter((row) => row[0] !== 4);
  const meanObserved = (col) => {
    const values = retained.map((row) => row[col]).filter((value) => value !== null);
    return values.reduce((a, b) => a + b, 0) / values.length;
  };
  const bmiMean = meanObserved(5);
  const insulinMean = meanObserved(7);
  const completed = retained.map((row) => row.map((value, col) => value ?? (col === 5 ? bmiMean : value)));
  const bmiStd = Math.sqrt(completed.reduce((sum, row) => sum + (row[5] - bmiMean) ** 2, 0) / completed.length);
  const insulinStd = Math.sqrt(completed.reduce((sum, row) => sum + (row[7] - insulinMean) ** 2, 0) / completed.length);
  const cleaned = ['clean', 'minmax', 'standard', 'discrete'].includes(step);
  const rows = (cleaned ? completed : step === 'missing' ? qualityRows : caseRows).map((row) => [...row]);
  if (['minmax', 'standard', 'discrete'].includes(step)) rows.forEach((row) => { row[1] = (row[1] - 29) / 32; });
  if (['standard', 'discrete'].includes(step)) rows.forEach((row) => {
    row[5] = (row[5] - bmiMean) / bmiStd;
    row[7] = (row[7] - insulinMean) / insulinStd;
  });
  if (step === 'discrete') rows.forEach((row) => { row[6] = row[6] < 6 ? '低值组' : row[6] < 10 ? '中值组' : '高值组'; });
  return { rows, bmiMean, insulinMean, bmiStd, insulinStd };
}

function renderCase(step) {
  const data = transformCase(step);
  const cols = step === 'raw' ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] : [0, 1, 5, 6, 7, 8, 9];
  const headers = ['记录 ID', '年龄', '姓名', '体重 kg', '身高 cm', 'BMI', step === 'discrete' ? '血糖分组' : '血糖 mmol/L', '胰岛素', '家族史', '是否患糖尿病'];
  const body = table(cols.map((col) => headers[col]), data.rows.map((row) => cols.map((col) => {
    const value = row[col];
    const content = value === null ? '<span class="ann-missing">缺失</span>' : escapeHtml(typeof value === 'number' ? fmt(value, 3) : value);
    const changed = caseRows.find((original) => original[0] === row[0])[col] !== value;
    return col === 9 ? `<strong class="ann-label-value">${content}</strong>` : changed ? `<strong class="ann-changed">${content}</strong>` : content;
  })));
  const details = {
    raw: statement('一行 = 一个样本；输入列 = 特征；最右列 = 标签'),
    selected: statement('ID 仅用于追踪记录；姓名、体重与身高退出输入特征集合'),
    missing: columns([['缺失情境', '<p>第 2 行缺 BMI；清洗示例把第 4 行血糖也视为未记录，与其缺失的胰岛素一起比较处理方案。</p>'], ['先追溯来源', '<p>血糖 15.3 是录入错误还是实际观测？需要核查记录，不能仅按大小删除。</p>']]),
    clean: columns([
      ['先删除记录 4', '<p>示例选择删除两个测量字段缺失的记录，保留 ID 1、2、3、5。删除需要结合任务与缺失原因判断。</p>'],
      ['再填补记录 2 的 BMI', '<p>剩余观测为 28.1、32.0、30.2。</p>' + eq(f`BMI_{fill}=(28.1+32.0+30.2)/3=30.1`)],
    ]),
    minmax: eq(f`Age'=\frac{Age-29}{61-29}`) + statement('只改变年龄的数值表示，复用训练范围 29–61'),
    standard: eq(`BMI'=\\frac{BMI-30.1}{${fmt(data.bmiStd, 4)}}`) + eq(`Insulin'=\\frac{Insulin-94.75}{${fmt(data.insulinStd, 4)}}`) + statement('保留年龄的缩放结果；两列分别使用自己的训练均值与标准差'),
    discrete: statement('只改变血糖列：<6 为低值组，6–10（不含 10）为中值组，≥10 为高值组') + '<p>这里的边界仅用于演示分箱编码，不是医学诊断界值。年龄、BMI 与胰岛素继续使用前一步的处理结果。</p>',
  };
  return `<p class="ann-context">糖尿病预测 · ${data.rows.length} 条教学病例 · ID 追踪记录，不作为输入特征</p>` + body + details[step];
}

function renderHistory(view) {
  const timeline = `<ol class="ann-history">${view.stops.map(([year, title], index) => `<li ${index === view.index ? 'aria-current="step"' : ''}><span>${year}</span><small>${title}</small></li>`).join('')}</ol>`;
  const body = {
    threshold: eq(f`s=\sum_i w_ix_i,\qquad a=\begin{cases}1&s\geq\theta\\0&s<\theta\end{cases}`) + table(['带权输入汇总 s', '阈值 θ', '激活输出'], [['0.6', '1', '0'], ['1.2', '1', '1']]),
    perceptron: columns([['可学习的连接', '<p>感知机（1958）、Adaline（1960）让权重从样本中调整。</p>'], ['能力边界', '<p>单层线性分隔面无法解决 XOR，1969 年的分析揭示这种局限。</p>']]),
    winter: table(['约束', '对实际模型的影响'], [['计算能力不足', '难以完成期望规模的计算'], ['复杂度较高', '模型和训练成本难以承受'], ['实现困难', '设想难以稳定落地']]),
    backprop: flow([node('前向', '输入 → 隐藏表示'), node('输出', '预测与损失'), node('反向', '梯度传回各层', 'feedback')]) + eq(f`\theta\leftarrow\theta-\eta\nabla_\theta L`),
    bottleneck: columns([['深层网络', '<ul><li>训练困难、资源不足</li><li>数据有限、效果不稳定</li></ul>'], ['同期方法', '<ul><li>支持向量机（SVM）</li><li>Boosting</li><li>传统特征工程</li></ul>']]),
    revival: table(['条件', '开始改善的环节'], [['深度信念网络等模型设计', '更有效地组织深层表示与训练'], ['更强计算能力', '支持更大模型与更多迭代'], ['大规模数据', '提供更丰富的学习样本']]),
    alexnet: `<div class="ann-bars"><div><span>AlexNet</span><i style="--bar:51%;--bar-color:#246c58"></i><b>15.3%</b></div><div><span>第二名</span><i style="--bar:87.33%;--bar-color:#497f9e"></i><b>26.2%</b></div></div><p>ImageNet top-5 错误率 · 共同刻度 0–30% · 越低越好</p>` + statement('约降低 10.9 个百分点'),
    architectures: table(['年份', '结构', '拓展方向'], [['2014', 'Seq2Seq / GAN', '序列生成 / 对抗生成'], ['2015', 'ResNet', '通过残差连接训练更深网络'], ['2017', 'Transformer', '注意力驱动序列处理'], ['2018', 'BERT / GPT-1', '大规模预训练']]),
    multimodal: table(['任务范围', '代表模型或系统'], [['文本生成', 'GPT 系列、ChatGPT'], ['文本与图像的共同表示', 'CLIP'], ['图像生成', 'DALL-E、扩散模型'], ['多模态交互', '可连接不同类型输入与输出的模型']]),
    future: zoomablePhoto('media/intro/presentation/development-directions.png', '丰富数据带来信息与容量需求：联合优化形成更深的层次表示，更大输入捕捉上下文；领域知识帮助约束容量并提高效率') + table(['方向', '为什么有帮助'], [['更深：层次化特征学习', '逐层组合低层模式，共同优化表示与输出'], ['更广：捕捉上下文信息', '扩大输入范围，让预测利用相关信息'], ['领域知识：提高学习效率', '约束合理表示与模型容量，减少无效搜索']]),
  };
  return timeline + `<div class="ann-history-detail">${body[view.key]}</div>`;
}

function renderExample(step) {
  const { weights, biases, x } = exampleParameters;
  const result = calculateExample();
  const strip = exampleNetwork(step, result);
  if (step === 0) return strip + columns(weights.map((w, i) => [`第 ${i + 1} 层参数`, `<p>W${i + 1}</p>${matrix(w)}<p>b${i + 1} = [${biases[i].join(', ')}]</p>`])) + eq(f`x=[1,2]^T,\quad y=1,\quad L=\tfrac12(\hat y-y)^2`);
  if (step === 1 || step === 2) {
    const l = step - 1;
    return strip + eq(`z^{(${step})}=W_${step}h^{(${step - 1})}+b_${step}`) + table(['单元', '加权求和', 'z', 'Sigmoid(z)'], weights[l].map((row, index) => [`${step === 1 ? index + 1 : index + 4}`, row.map((w, j) => `${w} × ${fmt(result.activations[l][j])}`).join(' + ') + ` + ${biases[l][index]}`, fmt(result.zs[l][index]), fmt(result.activations[l + 1][index], 7)]));
  }
  if (step === 3) return strip + eq(f`z_6=1h_4+3h_5+2`) + table(['h₄', 'h₅', 'z₆'], [[fmt(result.activations[2][0], 7), fmt(result.activations[2][1], 7), fmt(result.zs[2][0], 7)]]) + eq(`\\hat y=\\sigma(z_6)\\approx${fmt(result.prediction, 8)}`) + eq(`L=\\tfrac12(\\hat y-1)^2\\approx${scientificTex(result.loss)}`);
  if (step === 4) return strip + eq(f`\delta^{(3)}=(\hat y-1)\hat y(1-\hat y)`) + table(['反向顺序', '各单元 δ = ∂L / ∂z'], [["输出层", result.deltas[2].map((v) => fmt(v)).join(' / ')], ['第二层', result.deltas[1].map((v) => fmt(v)).join(' / ')], ['第一层', result.deltas[0].map((v) => fmt(v)).join(' / ')]]) + statement('同一路径乘局部导数；汇总后一层的全部依赖');
  const updates = weights[0].flatMap((row, i) => row.map((w, j) => [`W₁[${i + 1},${j + 1}]`, w, fmt(result.gradients[0][i][j]), fmt(-0.1 * result.gradients[0][i][j])]));
  const newParameters = { ...exampleParameters, weights: weights.map((w, l) => w.map((row, i) => row.map((value, j) => value - 0.1 * result.gradients[l][i][j]))), biases: biases.map((b, l) => b.map((value, i) => value - 0.1 * result.deltas[l][i])) };
  return strip + eq(f`\Delta W^{(l)}=-0.1\delta^{(l)}(h^{(l-1)})^T,\quad\Delta b^{(l)}=-0.1\delta^{(l)}`) + table(['第一层连接', '原值', '梯度', '更新增量'], updates) + `<p>偏置增量：[${result.deltas[0].map((value) => fmt(-0.1 * value)).join(', ')}]</p>` + table(['层', '更新后的权重 W', '更新后的偏置 b'], newParameters.weights.map((w, l) => [l + 1, w.map((row) => `[${row.map((v) => v.toPrecision(12)).join(', ')}]`).join('<br>'), newParameters.biases[l].map((v) => v.toPrecision(12)).join(', ')])) + `<p>全部层同时更新后，损失从 ${result.loss.toExponential(7)} 变为 ${calculateExample(newParameters).loss.toExponential(7)}。</p>`;
}

function exampleNetwork(step, result) {
  const points = [[125, 215], [75, 170, 265], [125, 215], [170]].map((ys, l) => ys.map((y) => [65 + 240 * l, y]));
  const labels = [['x₁', 'x₂'], ['h₁', 'h₂', 'h₃'], ['h₄', 'h₅'], ['ŷ = h₆']];
  const edges = points.slice(1).map((targets, l) => points[l].map(([x1, y1], i) => targets.map(([x2, y2], j) => `<path data-network-edge="${l}" data-from="${x1},${y1}" data-to="${x2},${y2}" d="M${x1 + 16} ${y1}L${x2 - 16} ${y2}" stroke="#a6bab1" fill="none"><title>W${l + 1}[${j + 1},${i + 1}] = ${exampleParameters.weights[l][j][i]}</title></path>`).join('')).join('')).join('');
  const nodes = points.map((list, l) => list.map(([x, y], i) => {
    const ready = l === 0 || step >= l;
    const value = ready ? fmt(result.activations[l][i], 6) : '待计算';
    const delta = l && step >= 4 ? `<text x="${x}" y="${y + 51}" text-anchor="middle" class="ann-delta">δ ${result.deltas[l - 1][i].toExponential(2)}</text>` : '';
    return `<circle cx="${x}" cy="${y}" r="16" fill="#fff" stroke="#246c58" stroke-width="2"/><text x="${x}" y="${y - 24}" text-anchor="middle">${labels[l][i]}</text><text x="${x}" y="${y + 31}" text-anchor="middle">${value}</text>${delta}`;
  }).join('')).join('');
  const loss = `<path data-network-edge="3" data-from="785,170" data-to="925,170" d="M801 170H900" stroke="#a6bab1"/><rect x="901" y="153" width="48" height="34" rx="4" fill="#eef4f7" stroke="#497f9e"/><text x="925" y="175" text-anchor="middle">L</text>`;
  const control = step > 0 && step < 5 ? `<button class="ann-process-play" type="button" data-network-play="${step}" title="${step === 4 ? '沿网络连接回传梯度' : '沿网络连接传递输入'}">▷ ${step === 4 ? '回传梯度' : '传递信号'}</button>` : '';
  return `<figure class="ann-media-figure"><div class="ann-network-scroll" tabindex="0" role="region" aria-label="完整数值网络">${svg('2 → 3 → 2 → 1 数值网络', '节点显示已计算的激活；连线对应各层权重，损失从输出取得预测结果', edges + nodes + loss, 980, 340)}</div><button class="ann-zoom" type="button" data-zoom-svg title="查看完整网络">查看大图</button></figure>${control}<p class="ann-context">连接：W₁、W₂、W₃；各层另加偏置。${step >= 4 ? 'δ 是损失对加权和的导数，蓝色信号沿依赖反向汇总。' : '绿色信号沿连接传递激活，下一层再加权求和。'}</p>`;
}

function networkDiagram(widths, title) {
  const xs = widths.map((_, l) => 65 + l * 460 / (widths.length - 1));
  const ys = widths.map((n) => Array.from({ length: n }, (_, i) => 150 + (i - (n - 1) / 2) * 42));
  const paths = widths.slice(1).map((_, l) => ys[l].map((y1) => ys[l + 1].map((y2) => `<path d="M${xs[l]} ${y1}L${xs[l + 1]} ${y2}" stroke="#a6bab1"/>`).join('')).join('')).join('');
  const nodes = ys.map((list, l) => list.map((y) => `<circle cx="${xs[l]}" cy="${y}" r="12" fill="${l === 0 ? '#fff' : '#e6f1ec'}" stroke="#246c58" stroke-width="2"/>`).join('') + `<text x="${xs[l]}" y="275" text-anchor="middle">${widths[l]}</text>`).join('');
  return svg(title, `各层单元数分别为 ${widths.join('、')}；相邻层全连接`, paths + nodes);
}

export function renderView(view) {
  switch (view.type) {
    case 'html': return view.content;
    case 'image': return zoomablePhoto(view.path, view.alt);
    case 'video': return `<video class="ann-video" controls playsinline preload="metadata" src="${view.path}" aria-label="${view.alt}"></video>`;
    case 'mango-tasks': return columns([
      ['观察对象', photo('media/intro/presentation/mango.png', '从芒果的可观察信息建立预测问题')],
      ['先回答两个问题', table(['问题', '需要判断的结果', '可观察的线索'], [['是不是芒果？', '芒果 / 其他', '颜色、形状、纹理'], ['这个芒果是否甜？', '甜 / 不甜', '成熟度等线索及带答案的经验']]) + '<p>观察线索构成特征（feature）；已确认的答案构成标签（label）。</p><p>延伸：若改问“甜度是多少”，连续甜度数值对应回归任务。</p>'],
    ]);
    case 'mango-loop': return flow([node('输入特征 x', '颜色、形状、纹理'), node('模型 fθ', '参数 θ'), node('预测 ŷ', '芒果 / 其他')]) + (view.training ? `<div class="ann-feedback">${flow([node('真实标签 y', '已确认的类别', 'feedback'), node('损失 ℓ(ŷ,y)', '比较预测与答案', 'feedback'), node('反向传播', '参数梯度 ∇θL', 'feedback'), node('优化器', '更新参数 θ', 'feedback')])}<p class="ann-return">↳ 更新同一模型 fθ 的参数 → 下一次前向预测</p></div>` : statement('新水果 → 训练好的模型 → 预测；推理无需提供标签'));
    case 'dialog': return columns([['固定映射', dialogRows(view.rounds, false)], ['使用对话历史', dialogRows(view.rounds, true)]]);
    case 'history': return renderHistory(view);
    case 'neuron-model': return zoomablePhoto('media/intro/presentation/neuron-model.jpg', '左侧生物神经元的树突、胞体与轴突，右侧数学模型的带权输入、加权求和与输出函数', 'width="1776" height="569"') + table(['生物结构', '计算模型中的对应关系'], [['树突与输入连接', '输入 xᵢ 与连接权重 wᵢ'], ['胞体汇总信号', '加权求和，再加入偏置 b'], ['轴突传递信号', '输出函数 f 处理汇总结果，再传向下一单元']]);
    case 'neuron': return eq(f`z=w^Tx+b=\sum_iw_ix_i+b`) + table(['输入分量', '输入 xᵢ', '权重 wᵢ', '贡献 wᵢxᵢ'], [['1', 2, 0.5, 1], ['2', '−1', 1, '−1']]) + eq(f`z=0.5\times2+1\times(-1)+1=1`) + '<p>偏置 b = 1。输出写作 y = φ(z)，φ 表示激活函数；当前先研究加权和这一线性部分。</p>';
    case 'linear-layer': return columns([['共享输入，分别计算', networkDiagram([4, 3], '4 个输入连接到 3 个输出单元') + '<p>同一个 x 输入每个单元，各单元使用不同的权重行。</p>'], ['用矩阵堆叠加权和', eq(f`z_j=\sum_iW_{ji}x_i+b_j`) + eq(f`z=Wx+b`) + table(['对象', '一般形状', '图中示例'], [['x', 'D × 1', '4 × 1'], ['W', 'C × D', '3 × 4'], ['b、z', 'C × 1', '3 × 1']])]]);
    case 'linear-image': return renderLinearImage(view.step);
    case 'linear-geometry': return columns([['几何视角', zoomablePhoto('media/intro/presentation/linear-boundary.jpg', '三个类别的线性零分数线与权重指示的分数增长方向', 'width="1113" height="809"')], ['分数与边界', eq(f`s_k=w_k^Tx+b_k`) + '<p>保持 sₖ 不变得到等分数线。沿 wₖ 的方向移动，分数增加。</p>' + eq(f`s_i=s_j`) + eq(f`(w_i-w_j)^Tx+(b_i-b_j)=0`) + statement('两类比较，得到线性决策边界')]]);
    case 'xor': return renderXor();
    case 'two-layer': return columns([['输入 → 隐藏层 → 输出', networkDiagram([3, 4, 2], '输入 3 维、隐藏层 4 个单元、输出 2 维的两层网络') + '<p>图中 D = 3，H = 4，C = 2。</p>'], ['两层的计算关系', eq(f`h=\phi(W_1x+b_1)`) + eq(f`f(x)=W_2h+b_2`) + table(['环节', '参数形状', '输出形状'], [['第一层', 'W₁：H × D；b₁：H × 1', 'H × 1'], ['第二层', 'W₂：C × H；b₂：C × 1', 'C × 1']]) + '<p>φ 标记隐藏层的激活环节。</p>']]);
    case 'networks': return columns([['较浅：2 → 3 → 1', networkDiagram([2, 3, 1], '较浅网络')], ['较深：2 → 3 → 3 → 1', networkDiagram([2, 3, 3, 1], '较深网络')]]) + statement('深度 = 连续变换层数；宽度 = 每层单元数');
    case 'activation': return eq(view.fn === 'relu' ? f`ReLU(z)=\max(0,z)` : view.fn === 'leaky-relu' ? f`LeakyReLU(z)=\begin{cases}z&z\geq0\\0.1z&z<0\end{cases}` : f`\sigma(z)=\frac{1}{1+e^{-z}},\quad\sigma'(z)=\sigma(z)(1-\sigma(z))`) + slider('z', '输入 z', -6, 6, 0.1, view.fn === 'leaky-relu' ? -2 : 1) + '<div data-live-view></div>';
    case 'commute-linear': return zoomablePhoto('media/intro/presentation/commute-regression.png', '距离与通勤时间的五组原始观测，以及含截距的线性回归设计矩阵', 'width="1896" height="438"') + eq(f`\hat y_i=\theta_0+\theta_1d_i`) + eq(f`L(\theta)=\frac{1}{2N}\sum_i(\hat y_i-y_i)^2`) + '<p>距离 d 的单位为 km，时间 y 的单位为 min。截距 θ₀ 与斜率 θ₁ 是待学习参数。</p>';
    case 'commute-update': return renderCommuteUpdate();
    case 'softmax': return eq(f`p_i=\frac{e^{z_i}}{\sum_j e^{z_j}}`) + slider('score', '类别 A 的分数', -2, 5, 0.1, 2) + '<div data-live-view></div>';
    case 'gradient': return eq(f`L(w)=(w-1)^2,\quad w_0=3,\quad g=2(w_0-1)=4`) + slider('rate', '学习率 η', 0.05, 1.2, 0.05, 0.25) + '<button class="ann-process-play" type="button" data-gradient-play title="逐步更新参数并重新计算梯度">▷ 连续更新</button><div data-live-view></div>';
    case 'variance': return eq(f`\operatorname{Var}(z)\approx n_{in}\operatorname{Var}(W)\operatorname{Var}(x)`) + eq(f`n_{in}\operatorname{Var}(W)\approx1`) + slider('gain', '每层方差倍率', 0.5, 1.5, 0.1, 1) + '<div data-live-view></div>';
    case 'backprop-example': return renderExample(view.step);
    case 'fit': return renderFits();
    case 'regularization': return columns([
      ['L1：绝对值惩罚', eq(f`L_{total}=L+\lambda\sum_j|w_j|`) + plot('L1 单参数惩罚', '绝对值惩罚在零点有尖角', [{ fn: Math.abs }], [], { xmin: -2, xmax: 2, ymin: 0, ymax: 4, xLabel: 'w', yLabel: '|w|' }) + '<p>零点尖角，倾向稀疏权重。</p>'],
      ['L2：平方惩罚', eq(f`L_{total}=L+\lambda\sum_jw_j^2`) + plot('L2 单参数惩罚', '平方惩罚随参数绝对值增大而平滑增加', [{ fn: (x) => x * x }], [], { xmin: -2, xmax: 2, ymin: 0, ymax: 4, xLabel: 'w', yLabel: 'w²' }) + '<p>连续收缩，较大权重受到较大惩罚。</p>'],
    ]);
    case 'dropout': return '<div class="ann-segment" role="group" aria-label="Dropout 状态"><button type="button" data-dropout="0">训练批次 A</button><button type="button" data-dropout="1">训练批次 B</button><button type="button" data-dropout="2">推理</button></div><div data-live-view></div>';
    case 'early-stop': return plot('训练和验证损失随轮次变化', '训练损失下降，验证损失在第 5 轮达到最低后回升', [{ fn: (x) => 0.9 * Math.exp(-x / 3) + 0.08 }, { fn: (x) => 0.3 + 0.022 * (x - 5) ** 2, color: '#497f9e', dashed: true }], [{ px: 5, py: 0.3, label: '最佳验证轮次', color: '#497f9e' }], { xmin: 0, xmax: 10, ymin: 0, ymax: 1, xLabel: '轮次', yLabel: '损失' }) + '<p class="ann-legend"><span>实线：训练</span><span>虚线：验证</span></p>' + statement('保存第 5 轮的参数；测试集保留到最终评价');
    case 'augmentation': return `<div class="ann-augmentations">${['原始观察', '水平翻转', '轻微旋转'].map((label, i) => `<figure>${photo('media/intro/presentation/mango.png', `${label}下的同一个芒果`, `style="transform:${['none', 'scaleX(-1)', 'rotate(8deg)'][i]}"`)}<figcaption>${label} → 芒果</figcaption></figure>`).join('')}</div>` + statement('增强的关键条件：变换后，原有标签仍然成立');
    case 'batches': return columns([['全批量', batchCells(12) + '<p>示例 12 / 12 条记录形成一次梯度。</p>'], ['单样本', batchCells(1) + '<p>示例 1 / 12 条记录形成一次梯度。</p>'], ['小批量', batchCells(4) + '<p>示例 4 / 12 条记录形成一次梯度。</p>']]) + statement('使用样本数增加：每步成本增加，梯度估计通常更稳定');
    case 'momentum': return renderMomentum();
    case 'case-table': return renderCase(view.step);
    case 'split': return `<div class="ann-split">${[[70, '训练', '学习参数'], [20, '验证', '选择方案'], [10, '测试', '独立评价']].map(([size, label, action]) => `<div style="--part:${size}"><b>${size}</b><span>${label}</span><small>${action}</small></div>`).join('')}</div>` + table(['环节', '拟合或选择来源', '其他集合怎样使用'], [['填补、缩放、特征筛选', '训练集', '应用已确定的规则'], ['参数更新', '训练集', '保持与训练隔离'], ['超参数、轮次、候选模型', '验证集', '不依据测试集调参'], ['最终评价', '测试集', '只评估已选方案']]) + statement('同一实体的相关记录也需避免跨集合泄漏');
    case 'granularity': return renderGranularity();
    case 'breast-task': return columns([
      ['输入：乳腺超声图像', zoomablePhoto('media/intro/presentation/breast-ultrasound.png', '乳腺超声图像，模型需要从影像中定位病变')],
      ['监督目标：病变区域', zoomablePhoto('media/intro/presentation/breast-mask.png', '与超声图像配对的标注掩码，白色表示病变区域，黑色表示背景')],
    ]) + statement('同一位置的图像与掩码配对，让模型学习影像特征到目标区域的映射');
    case 'annotation': return zoomablePhoto('media/intro/presentation/annotation.gif', '医生用标注工具逐步勾画目标区域') + table(['标注方式', '获得的信息'], [['诊断报告 / EMR', '良／恶性等图像级标签'], ['医生勾画 + 标注工具', '器官或病灶的轮廓与像素掩码']]) + statement('LabelMe · 3D Slicer · ITK-SNAP；细致标注提供空间监督');
    case 'supervision': return columns([['有监督', labelCells(8) + '<p>图像与目标标签直接定义训练目标。</p>'], ['半监督', labelCells(2) + '<p>少量标签 + 大量未标注图像。</p>'], ['无监督', labelCells(0) + '<p>从图像自身的结构与差异中寻找模式。</p>']]) + '<p class="ann-legend">✓ = 有标签；? = 未标注。数量仅表达学习设定。</p>';
    case 'ensemble': return columns([
      ['Bagging · 并行组合', `<div class="ann-ensemble-parallel">${[1, 2, 3].map((i) => node('相对独立的训练', `模型 ${i}`)).join('')}</div>${statement('↓ 投票或平均，组合多个预测')}`],
      ['Boosting · 串行改进', `<ol class="ann-ordered"><li>训练模型 1</li><li>依据前序误差调整关注重点</li><li>训练模型 2，再继续改进</li><li>组合各阶段模型</li></ol>`],
    ]);
    case 'deployment': return `<ol class="ann-deployment"><li><b>明确问题与输出</b><span>分类、定位还是分割？</span></li><li><b>获取与划分数据</b><span>监督粒度、实体隔离、训练/验证/测试</span></li><li><b>拟合处理规则与训练</b><span>仅在训练集拟合预处理并学习参数</span></li><li><b>验证选择 → 独立测试</b><span>比较候选模型与成本，评价已选方案</span></li><li><b>保存处理规则与模型</b><span>新样本 → 相同预处理 → 模型 → 输出</span></li><li><b>上线监测</b><span>观察数据分布、性能和失败模式</span></li></ol>`;
    default: throw new Error(`Unknown presentation view: ${view.type}`);
  }
}

function dialogRows(rounds, context) {
  const answers = context ? ['是的。', '是的，我已经回答过了。', '你已经连续问了三次，想了解什么棋局？'] : ['是的。', '是的。', '是的。'];
  return `<ol class="ann-dialog">${answers.slice(0, rounds).map((answer) => `<li><p><b>问</b>你会下国际象棋吗？</p><p><b>答</b>${answer}</p></li>`).join('')}</ol>`;
}

export const linearImageExample = {
  x: [56, 231, 24, 2],
  weights: [[0.2, -0.5, 0.1, 2], [1.5, 1.3, 2.1, 0], [0, 0.25, 0.2, -0.3]],
  biases: [1.1, 3.2, -1.2],
};
export const linearImageScores = () => linearImageExample.weights.map((row, i) => row.reduce((sum, w, j) => sum + w * linearImageExample.x[j], linearImageExample.biases[i]));
function renderLinearImage(step = 0) {
  const scores = linearImageScores();
  const labels = ['猫', '狗', '船'];
  const summary = columns([
    ['输入：2 × 2 像素', photo('media/intro/presentation/linear-input.jpg', '猫图像的四个像素值按行展开为 56、231、24、2') + eq(f`x=[56,231,24,2]^T`)],
    ['三类对应三行参数', table(['类别', '权重行', '偏置 b', '分数'], linearImageExample.weights.map((row, i) => [labels[i], `[${row.join(', ')}]`, linearImageExample.biases[i], step > i ? `<strong>${fmt(scores[i], 2)}</strong>` : '待计算']))],
  ]);
  if (!step) return summary + statement('同一个输入向量，分别与三组权重相乘');
  const row = step - 1;
  const products = linearImageExample.weights[row].map((w, i) => w * linearImageExample.x[i]);
  return summary + table(products.map((_, i) => `像素 ${i + 1} 的贡献`), [products.map((value, i) => `${linearImageExample.x[i]} × ${linearImageExample.weights[row][i]} = ${fmt(value, 2)}`)]) + eq(`s_{${row + 1}}=${products.map((v) => v < 0 ? `(${fmt(v, 2)})` : fmt(v, 2)).join('+')}+(${linearImageExample.biases[row]})=${fmt(scores[row], 2)}`) + (step === 3 ? statement('最高分为“狗”；当前预测与真实的“猫”标签不一致') : '');
}

function renderXor() {
  const points = [[0, 0, 0], [0, 1, 1], [1, 0, 1], [1, 1, 0]];
  return plot('异或输入的四个角点', '类别 0 位于 (0,0) 和 (1,1)，类别 1 位于 (0,1) 和 (1,0)', [], points.map(([x, y, label]) => ({ px: x, py: y, hollow: label === 0, color: label === 0 ? '#246c58' : '#497f9e', label: String(label) })), { xmin: -0.3, xmax: 1.3, ymin: -0.3, ymax: 1.3, xLabel: 'x₁', yLabel: 'x₂' }) + '<p class="ann-legend">空心：类别 0；实心：类别 1</p>' + table(['x₁', 'x₂', '类别'], points) + statement('单一线性边界不能分开这四个点；接下来引入隐藏层');
}

export const commuteSamples = [[10.1, 18], [2.9, 5], [19.3, 29], [14.5, 23], [35.2, 39.5]];
export function commuteStep(theta = [0, 0], rate = 0.001) {
  const loss = (parameters) => commuteSamples.reduce((sum, [d, y]) => sum + (parameters[0] + parameters[1] * d - y) ** 2, 0) / (2 * commuteSamples.length);
  const gradient = [0, 0];
  commuteSamples.forEach(([d, y]) => { const error = theta[0] + theta[1] * d - y; gradient[0] += error / commuteSamples.length; gradient[1] += error * d / commuteSamples.length; });
  const next = theta.map((value, i) => value - rate * gradient[i]);
  return { gradient, next, beforeLoss: loss(theta), afterLoss: loss(next) };
}
function renderCommuteUpdate() {
  const result = commuteStep();
  return eq(f`\frac{\partial L}{\partial\theta_0}=\frac1N\sum_i(\hat y_i-y_i)`) + eq(f`\frac{\partial L}{\partial\theta_1}=\frac1N\sum_i(\hat y_i-y_i)d_i`) + eq(f`\theta_j\leftarrow\theta_j-\eta\frac{\partial L}{\partial\theta_j}`) + table(['参数', '起点', '偏导数', 'η = 0.001 后的新值'], result.next.map((value, i) => [`θ${i}`, 0, fmt(result.gradient[i]), fmt(value, 6)])) + table(['更新前平均损失', '更新后平均损失'], [[fmt(result.beforeLoss), fmt(result.afterLoss)]]) + statement('用同一组观测重新计算损失，检查这次更新的效果');
}

export const fitSamples = [-0.8, -0.55, -0.3, 0, 0.25, 0.5, 0.8].map((x, j) => [x, x ** 2 + [0.07, -0.06, 0.05, -0.02, 0.08, -0.07, 0.03][j]]);
export function interpolateFit(x) {
  return fitSamples.reduce((sum, [xi, yi], i) => sum + yi * fitSamples.reduce((product, [xj], j) => j === i ? product : product * (x - xj) / (xi - xj), 1), 0);
}
function renderFits() {
  const models = [() => 0.5, (x) => x ** 2, interpolateFit];
  return columns(['欠拟合', '合适拟合', '过拟合'].map((title, i) => [title, plot(title, '相同观测点分别用常数、二次函数和经过全部训练点的高阶插值曲线拟合', [{ fn: models[i] }], fitSamples.map(([x, y]) => ({ px: x, py: y })), { xmin: -1, xmax: 1, ymin: -0.2, ymax: 1.2, xLabel: '输入', yLabel: '目标' }) + `<p>${['常数忽略了主要趋势', '二次函数抓住主要规律', '经过全部训练点，区间外却剧烈偏离'][i]}</p>`])) + '<p>同一组含噪训练点；高阶插值精确经过各点，但不能保证未见样本的预测质量。</p>';
}

function batchCells(n) {
  return `<div class="ann-batch-cells">${Array.from({ length: 12 }, (_, i) => `<span class="${i < n ? 'included' : ''}">${i < n ? '✓' : '·'}</span>`).join('')}</div>`;
}
function labelCells(n) {
  return `<div class="ann-label-cells">${Array.from({ length: 8 }, (_, i) => `<span class="${i < n ? 'labeled' : ''}">${i < n ? '✓' : '?'}</span>`).join('')}</div>`;
}

function renderMomentum() {
  const grads = [[2, 4], [2, -4], [2, 4], [2, -4]];
  let history = [0, 0];
  const rows = grads.map((g, i) => { history = history.map((v, j) => 0.8 * v + 0.2 * g[j]); return [i + 1, `[${g.join(', ')}]`, `[${history.map((v) => fmt(v, 4)).join(', ')}]`]; });
  return eq(f`m_t=0.8m_{t-1}+0.2g_t,\quad m_0=0`) + table(['更新时刻', '当前梯度 g', '历史平均 m'], rows) + statement('第二个方向来回切换；历史平均让它的幅度减小') + '<p>更新可写成 θ ← θ − ηm。不同实现可能把常数缩放并入学习率。</p>';
}

function renderGranularity() {
  const scene = '<rect x="85" y="42" width="430" height="200" fill="#f2f5f3" stroke="#bdcbc5"/><path d="M260 92Q335 60 368 126Q403 195 318 199Q245 211 233 153Q226 109 260 92Z" fill="#a7beb4"/>';
  return columns([
    ['图像级标签', svg('图像级分类标签示意', '整幅图像对应一个类别标签', scene + '<text x="300" y="278" text-anchor="middle">类别：包含目标</text>')],
    ['边界框', svg('边界框定位示意', '矩形框提供目标的空间范围', scene + '<rect x="221" y="74" width="171" height="139" fill="none" stroke="#497f9e" stroke-width="4"/><text x="300" y="278" text-anchor="middle">输出：框坐标</text>')],
    ['像素级掩码', svg('像素级分割标签示意', '目标轮廓覆盖的每个像素都有类别标记', scene + '<path d="M260 92Q335 60 368 126Q403 195 318 199Q245 211 233 153Q226 109 260 92Z" fill="#d6a25e" stroke="#8c6032" stroke-width="3"/><text x="300" y="278" text-anchor="middle">输出：逐像素类别</text>')],
  ]) + '<p>同一观察对象的标注粒度示意；标注越细，提供的空间监督越具体。</p>';
}

export function bindView(stage, view, renderMath) {
  const animations = new Set();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const move = async (element, frames) => {
    const animation = element.animate(frames, { duration: reducedMotion ? 0 : 550, easing: 'ease-in-out', fill: 'forwards' });
    animations.add(animation);
    try { await animation.finished; } catch {} finally { animations.delete(animation); }
  };
  const live = stage.querySelector('[data-live-view]');
  const update = (content) => { live.innerHTML = content; renderMath(live); };
  const bindSlider = (control, callback) => {
    const input = stage.querySelector(`[data-control="${control}"]`);
    const handle = () => { const value = Number(input.value); stage.querySelector(`[data-output="${control}"]`).textContent = fmt(value, 2); callback(value); };
    input.addEventListener('input', handle);
    handle();
  };
  if (view.type === 'activation') bindSlider('z', (z) => {
    const rectified = view.fn !== 'sigmoid';
    const leaky = view.fn === 'leaky-relu';
    const fn = rectified ? (x) => Math.max(leaky ? 0.1 * x : 0, x) : sigmoid;
    const derivative = rectified ? z > 0 ? '1' : z < 0 ? leaky ? '0.1' : '0' : '在零点不可导；实现使用约定值' : fmt(sigmoid(z) * (1 - sigmoid(z)), 6);
    const comparison = leaky ? [{ fn: (x) => Math.max(0, x), color: '#497f9e', dashed: true }] : [];
    update(plot(leaky ? 'Leaky ReLU 与 ReLU' : rectified ? 'ReLU 响应' : 'Sigmoid 响应', '输入对应曲线上的当前输出点', [{ fn }, ...comparison], [{ px: z, py: fn(z) }], { xmin: -6, xmax: 6, ymin: rectified ? -1 : 0, ymax: rectified ? 6 : 1, yLabel: 'φ(z)' }) + table(['输入 z', '当前输出', '局部导数'], [[fmt(z), fmt(fn(z), 6), derivative]]) + (leaky ? '<p class="ann-legend">实线：Leaky ReLU（负区间斜率 0.1）；虚线：ReLU</p>' : ''));
  });
  if (view.type === 'softmax') bindSlider('score', (score) => {
    const scores = [score, 1, 0];
    const exps = scores.map((s) => Math.exp(s - Math.max(...scores)));
    const total = exps.reduce((a, b) => a + b, 0);
    const probs = exps.map((v) => v / total);
    update(`<div class="ann-bars">${probs.map((p, i) => `<div><span>${['A', 'B', 'C'][i]} · 分数 ${scores[i]}</span><i style="--bar:${p * 100}%;--bar-color:${['#246c58', '#497f9e', '#b37a3f'][i]}"></i><b>${(p * 100).toFixed(2)}%</b></div>`).join('')}</div>` + statement(`概率总和 = ${fmt(probs.reduce((a, b) => a + b, 0))}`));
  });
  if (view.type === 'gradient') {
    const input = stage.querySelector('[data-control="rate"]');
    const button = stage.querySelector('[data-gradient-play]');
    const display = (weight, rate, iteration = 1) => {
      const result = gradientStep(weight, rate);
      stage.dataset.iteration = iteration;
      update(plot('梯度下降的参数更新', '参数点沿损失曲线移动，每一步重新计算当前位置的梯度', [{ fn: (x) => (x - 1) ** 2 }], [{ px: weight, py: result.beforeLoss, label: '更新前' }, { px: result.next, py: result.afterLoss, label: '更新后', color: '#497f9e' }], { xmin: -2, xmax: 4, ymin: 0, ymax: 10, xLabel: 'w', yLabel: 'L(w)' }) + eq(`w_{${iteration}}=${fmt(weight)}-${rate}\\times(${fmt(result.gradient)})=${fmt(result.next)}`) + table(['更新前损失', '更新后损失', '变化'], [[fmt(result.beforeLoss), fmt(result.afterLoss), result.afterLoss < result.beforeLoss ? '下降' : result.afterLoss === result.beforeLoss ? '持平' : '上升']]) + statement(result.afterLoss >= result.beforeLoss ? '方向正确，步长仍可能使损失不降；检查学习率' : '在新位置重新求梯度，再决定下一步'));
      return result;
    };
    bindSlider('rate', (rate) => display(3, rate));
    button.addEventListener('click', async () => {
      button.disabled = input.disabled = true;
      let weight = 3;
      try {
        for (let iteration = 1; iteration <= 8; iteration += 1) {
          if (!button.isConnected || !stage.getClientRects().length) break;
          const result = display(weight, Number(input.value), iteration);
          const dot = [...live.querySelectorAll('svg circle')].at(-1);
          const frames = Array.from({ length: 31 }, (_, i) => {
            const w = weight + (result.next - weight) * i / 30;
            return { transform: `translate(${(w - result.next) * 500 / 6}px, ${(result.afterLoss - (w - 1) ** 2) * 215 / 10}px)` };
          });
          await move(dot, frames);
          if (result.afterLoss >= result.beforeLoss) break;
          weight = result.next;
        }
      } finally { button.disabled = input.disabled = false; }
    });
  }
  if (view.type === 'variance') bindSlider('gain', (gain) => {
    const values = Array.from({ length: 7 }, (_, i) => gain ** i);
    update(plot('方差随层数传播', '输入方差为 1；每层乘上 fan-in 与权重方差的乘积', [{ fn: (x) => gain ** x }], values.map((value, i) => ({ px: i, py: value })), { xmin: 0, xmax: 6, ymin: 0, ymax: Math.max(2, values[6] * 1.15), xLabel: '层', yLabel: '方差' }) + table(['每层倍率', '第 0 层', '第 3 层', '第 6 层'], [[gain, 1, fmt(values[3]), fmt(values[6])]]) + statement(gain === 1 ? '倍率约为 1，前向方差保持稳定' : gain < 1 ? '倍率小于 1，方差逐层缩小' : '倍率大于 1，方差逐层放大'));
  });
  const networkPlay = stage.querySelector('[data-network-play]');
  if (networkPlay) networkPlay.addEventListener('click', async () => {
    const backward = view.step === 4;
    const layers = backward ? [3, 2, 1, 0] : view.step === 3 ? [2, 3] : [view.step - 1];
    networkPlay.disabled = true;
    try {
      for (const layer of layers) {
        if (!networkPlay.isConnected || !stage.getClientRects().length) break;
        await Promise.all([...stage.querySelectorAll(`[data-network-edge="${layer}"]`)].map(async (edge) => {
          const start = (backward ? edge.dataset.to : edge.dataset.from).split(',').map(Number);
          const end = (backward ? edge.dataset.from : edge.dataset.to).split(',').map(Number);
          const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          dot.setAttribute('r', '5');
          dot.setAttribute('cx', start[0]);
          dot.setAttribute('cy', start[1]);
          dot.setAttribute('fill', backward ? '#497f9e' : '#246c58');
          dot.setAttribute('class', 'ann-signal');
          edge.closest('svg').append(dot);
          try { await move(dot, [{ transform: 'translate(0,0)' }, { transform: `translate(${end[0] - start[0]}px,${end[1] - start[1]}px)` }]); } finally { dot.remove(); }
        }));
      }
    } finally { networkPlay.disabled = false; }
  });
  if (view.type === 'dropout') {
    const masks = [[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 1, 1]];
    const activation = [2, 4, 1, 3];
    const select = (index) => {
      stage.querySelectorAll('[data-dropout]').forEach((button) => button.setAttribute('aria-pressed', String(Number(button.dataset.dropout) === index)));
      update(table(['单元', '原激活', '屏蔽掩码', '实际传向下一层'], activation.map((value, i) => [i + 1, value, masks[index][i], index === 2 ? value : value * masks[index][i] / 0.5])) + statement(index === 2 ? '推理使用全部激活，无需再缩放' : '训练保留概率 q = 0.5；保留激活除以 q'));
    };
    stage.querySelectorAll('[data-dropout]').forEach((button) => button.addEventListener('click', () => select(Number(button.dataset.dropout))));
    select(0);
  }
  return () => animations.forEach((animation) => animation.cancel());
}
