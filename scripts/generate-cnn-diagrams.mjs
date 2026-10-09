import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { slides, sections, topicForSection, topicTitles, windowAnimations } from './cnn-course-data.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(root, 'diagrams', 'cnn');
const mediaOutput = join(root, 'media', 'cnn');
const buildRoot = join(root, '..', 'AI工程学', '.course-build', '02-cnns');
const sourcePptx = join(root, '..', 'AI工程学', 'PPT材料', 'CNNs and Image Recognition.pptx');
const sourceReview = JSON.parse(readFileSync(join(buildRoot, 'source-review.json'), 'utf8'));
mkdirSync(output, { recursive: true });
mkdirSync(mediaOutput, { recursive: true });

const C = {
  ink: '#263f35', muted: '#667f72', green: '#176653', green2: '#4f8b75',
  pale: '#e9f3ee', pale2: '#f6faf7', line: '#a8c2b4', warm: '#fbf0dd',
  orange: '#b47936', blue: '#547a8a', red: '#a75d52', white: '#ffffff', bg: '#fbfdfb',
};
const esc = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const text = (value, x, y, options = {}) => {
  const { size = 16, color = C.ink, weight = 400, anchor = 'middle', family = 'sans-serif' } = options;
  return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" font-family="${family}">${esc(value)}</text>`;
};
const lines = (values, x, y, options = {}) => values.map((value, index) => text(value, x, y + index * (options.gap || 22), options)).join('');
const rect = (x, y, w, h, options = {}) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${options.r ?? 7}" fill="${options.fill || C.white}" stroke="${options.stroke || C.line}" stroke-width="${options.sw || 1.5}"${options.dash ? ` stroke-dasharray="${options.dash}"` : ''}/>`;
const box = (x, y, w, h, title, detail = '', options = {}) => `${rect(x, y, w, h, options)}${text(title, x + w / 2, y + (detail ? h / 2 - 7 : h / 2 + 6), { size: options.titleSize || 17, color: options.titleColor || C.ink, weight: 650 })}${detail ? text(detail, x + w / 2, y + h / 2 + 19, { size: options.detailSize || 13, color: options.detailColor || C.muted }) : ''}`;
const arrow = (x1, y1, x2, y2, options = {}) => `<path d="M${x1} ${y1} L${x2} ${y2}" fill="none" stroke="${options.color || C.green}" stroke-width="${options.sw || 2.2}" marker-end="url(#arrow)"/>${options.label ? text(options.label, (x1 + x2) / 2, (y1 + y2) / 2 - 9, { size: 13, color: options.color || C.green }) : ''}`;
const heading = (title, subtitle = '') => `${text(title, 48, 43, { size: 22, weight: 650, anchor: 'start' })}${subtitle ? text(subtitle, 48, 69, { size: 13, color: C.muted, anchor: 'start' }) : ''}`;
const formula = (value, x = 480, y = 345, width = 820) => `${rect(x - width / 2, y - 31, width, 53, { fill: C.pale2, stroke: '#d7e5dc', r: 5 })}${text(value, x, y + 3, { size: 18, color: C.green, family: "Georgia, 'Times New Roman', serif" })}`;
const chip = (x, y, w, label, active = false, color = C.green) => `${rect(x, y, w, 34, { fill: active ? color : C.white, stroke: active ? color : C.line, r: 17 })}${text(label, x + w / 2, y + 22, { size: 13, color: active ? C.white : color, weight: 600 })}`;
const grid = (x, y, rows, cols, cell = 34, options = {}) => {
  const values = options.values || [];
  const hot = new Set(options.hot || []);
  const zero = new Set(options.zero || []);
  let body = '';
  for (let r = 0; r < rows; r += 1) for (let c = 0; c < cols; c += 1) {
    const key = `${r},${c}`;
    const fill = hot.has(key) ? (options.hotFill || C.warm) : zero.has(key) ? '#edf1ee' : (options.fill || C.white);
    body += rect(x + c * cell, y + r * cell, cell, cell, { fill, stroke: hot.has(key) ? C.orange : C.line, r: 0, sw: hot.has(key) ? 2 : 1 });
    const value = values[r]?.[c];
    if (value !== undefined) {
      const label = text(value, x + c * cell + cell / 2, y + r * cell + cell / 2 + 5, { size: 12, color: zero.has(key) ? '#93a29a' : C.ink, weight: hot.has(key) ? 650 : 400 });
      body += options.output ? `<g data-output-cell="${options.output}" data-index="${r * cols + c}">${label}</g>` : label;
    }
  }
  if (options.label) body += text(options.label, x + cols * cell / 2, y - 11, { size: 13, color: C.muted, weight: 600 });
  return body;
};
const route = (items, y = 188, options = {}) => {
  const start = options.start || 55;
  const gap = options.gap || 16;
  const width = (options.end || 905) - start;
  const itemWidth = (width - gap * (items.length - 1)) / items.length;
  return items.map((item, index) => {
    const x = start + index * (itemWidth + gap);
    return `${box(x, y, itemWidth, options.height || 82, item[0], item[1] || '', { fill: item[2] || (index === 0 ? C.pale : C.white), titleSize: options.titleSize || 15 })}${index < items.length - 1 ? arrow(x + itemWidth, y + (options.height || 82) / 2, x + itemWidth + gap - 3, y + (options.height || 82) / 2) : ''}`;
  }).join('');
};
const matrixValues = (rows, cols, prefix) => Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => `${prefix}${r}${c}`));
const defs = `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10" fill="none" stroke="${C.green}" stroke-width="1.6"/></marker></defs>`;
const svg = (title, description, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="417" viewBox="0 0 960 417" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><desc>${esc(description)}</desc>${defs}<rect width="960" height="417" fill="${C.bg}"/><g font-family="PingFang SC,Microsoft YaHei,Arial,sans-serif">${body}</g></svg>\n`;

const sourceAssets = new Map();
const sourceBytes = (file) => {
  if (!sourceAssets.has(file)) {
    const bytes = execFileSync('unzip', ['-p', sourcePptx, `ppt/media/${file}`], { maxBuffer: 32 * 1024 * 1024 });
    writeFileSync(join(mediaOutput, file), bytes);
    sourceAssets.set(file, bytes);
  }
  return sourceAssets.get(file);
};
const sourceImage = (file, x, y, width, height) => {
  const ext = file.split('.').at(-1).toLowerCase();
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : ext;
  return `<image href="data:image/${mime};base64,${sourceBytes(file).toString('base64')}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`;
};

const diagrams = [];
const add = (page, title, subtitle, body, description = subtitle) => {
  diagrams[page] = svg(title, description, `${heading(title, subtitle)}${body}`);
};

add(1, 'CNNs and Image Recognition', '从局部计算到深层视觉网络', `${route([['卷积神经网络','局部结构'],['CNN 训练','空间梯度'],['经典架构','设计演进']],158,{height:100,titleSize:18})}${formula('图像结构 → 共享计算 → 可训练的深层网络',480,330,720)}`);
add(2, '本讲路线', '结构 → 训练 → 架构', `${route([['01 卷积网络','构造前向计算'],['02 CNN 训练','沿依赖关系求梯度'],['03 经典架构','组合组件解决问题']],150,{height:112,titleSize:17})}${text('三部分共享同一条主线：张量怎样变化，参数怎样共享，梯度怎样返回。',480,326,{size:17,color:C.muted})}`);
add(3, '用神经网络完成图像分类', '输入与输出、学习表示、作出判断，以及训练反馈', `${sourceImage('image9.jpg',45,118,125,100)}${text('输入图像',107,242,{size:14,color:C.muted})}${arrow(173,167,215,167)}${box(225,125,155,85,'神经网络','特征表示 h(x)',{fill:C.pale})}${arrow(380,167,418,167)}${box(428,125,150,85,'线性分类器','类别分数 z')}${arrow(578,167,617,167)}${box(627,125,125,85,'Softmax','类别概率 p')}${arrow(752,167,790,167)}${box(800,125,115,85,'预测：猫','概率最高',{fill:C.warm,titleSize:15})}${box(440,288,145,62,'真实标签','猫：1，其余：0',{titleSize:14,detailSize:12})}${box(660,288,160,62,'交叉熵损失','比较概率与标签',{fill:C.warm,titleSize:15,detailSize:12})}${arrow(585,320,655,320)}${arrow(690,210,690,283,{color:C.orange})}${pathLine(740,350,740,380,C.green)}${arrow(740,380,303,380,{label:'反向传播、更新参数'})}${arrow(303,380,303,213)}`);
add(4, '分类任务还要求什么', '同一对象的缩放、旋转与平移不改变类别', `${['原图','平移','缩放','旋转'].map((label,i)=>{const x=48+i*230;const dx=label==='平移'?25:0;const scale=label==='缩放'?0.65:1;return `${rect(x,112,174,170,{fill:C.white})}<g transform="translate(${x+87+dx} 192) ${label==='旋转'?'rotate(-25)':''} scale(${scale})">${sourceImage('image9.jpg',-60,-50,120,100)}</g>${text(label,x+87,306,{size:15,color:C.muted,weight:650})}${chip(x+34,325,106,'同一类别',true)}`}).join('')}`);
add(5, 'MLP 的参数规模', '32×32 RGB 已接近 2100 万参数', `${route([['3072 输入','32×32×3'],['4096 隐藏','12.6M'],['2048 隐藏','8.4M'],['10 输出','20.5k']],126,{height:92,start:55,end:905,gap:18})}${formula('(3072+1)×4096 + (4096+1)×2048 + (2048+1)×10 = 20,998,154 ≈ 21M',480,322,860)}`);
add(6, '全连接方案的困难来自哪里', '密集权重矩阵，没有直接编码二维邻域', `${grid(65,125,5,5,32,{hot:['1,1','1,2','2,1','2,2'],label:'二维像素邻域'})}${arrow(240,200,310,200,{label:'flatten'})}${grid(320,140,1,25,19,{hot:['0,6','0,7','0,11','0,12'],label:'按固定次序展平：像素值仍然保留'})}${text('相邻行的局部像素分布在不同向量索引',565,220,{size:15,color:C.orange})}${text('每个输出连接全部输入 → 需要独立的大型权重矩阵',565,268,{size:15,color:C.muted})}${formula('局部连接限制读取范围；权重共享复用同一检测器。',480,344,760)}`);
add(7, '局部感受野', '局部连接与权重共享', `${grid(92,115,6,6,36,{hot:['1,1','1,2','1,3','2,1','2,2','2,3','3,1','3,2','3,3'],label:'输入局部窗口'})}${arrow(316,222,425,222,{label:'同一组权重'})}${grid(460,145,3,3,50,{hot:['1,1'],label:'特征图'})}${arrow(620,222,730,222)}${box(745,172,150,100,'共享检测器','扫描全部位置',{fill:C.pale})}${formula('局部连接保留邻域；权重共享减少独立参数。',480,348,690)}`);

function pathLine(x1,y1,x2,y2,color=C.green){return `<path d="M${x1} ${y1} L${x2} ${y2}" stroke="${color}" stroke-width="2" fill="none"/>`;}

add(11, '填充与步幅共同决定输出尺寸', '先确定扩展输入，再数有效窗口', `${grid(65,112,7,7,26,{values:Array.from({length:7},(_,r)=>Array.from({length:7},(_,c)=>r===0||c===0||r===6||c===6?'0':'')),zero:Array.from({length:49},(_,i)=>[Math.floor(i/7),i%7]).filter(([r,c])=>r===0||c===0||r===6||c===6).map(x=>x.join(',')),hot:['0,0','0,1','0,2','1,0','1,1','1,2','2,0','2,1','2,2'],label:'5×5 输入，四周各补 1'})}${arrow(265,202,350,202,{label:'K=3, S=2'})}${grid(390,133,3,3,52,{hot:['0,0'],label:'3×3 输出'})}${lines(['P：边界外补值','S：窗口移动间隔','末端不足完整窗口时舍去'],665,142,{size:15,color:C.muted,anchor:'start',gap:35})}${formula('Wₒᵤₜ = ⌊(Wᵢₙ + 2P − K) / S⌋ + 1 = 3',480,350,720)}`);
add(12, '多通道卷积', '跨输入通道求和，多组核产生多个输出通道', `${[['R',C.red],['G',C.green2],['B',C.blue]].map(([label,color],i)=>`${rect(70+i*22,135-i*12,145,135,{fill:C.white,stroke:color})}${text(label,88+i*22,158-i*12,{size:15,color,weight:700})}`).join('')}${arrow(248,196,345,196)}${[['Kᴿ',C.red],['Kᴳ',C.green2],['Kᴮ',C.blue]].map(([label,color],i)=>`${rect(360+i*18,153-i*10,120,100,{fill:C.pale2,stroke:color})}${text(label,378+i*18,176-i*10,{size:13,color,weight:700})}`).join('')}${arrow(516,196,610,196,{label:'通道求和'})}${box(630,143,110,110,'输出 1','一个特征图',{fill:C.pale})}${box(785,143,110,110,'输出 Cₒᵤₜ','多组核',{fill:C.white})}${formula('K ∈ R^(Cout × Cin × Kh × Kw)',480,350,520)}`);
add(16, '等变、稳定与数据增强', '先明确任务希望保留什么', `${box(58,118,260,166,'等变','输入变化后，响应按规则变化',{fill:C.pale})}${box(350,118,260,166,'局部稳定','小扰动不显著改变预测',{fill:C.white})}${box(642,118,260,166,'数据增强','把允许的变化加入训练分布',{fill:C.warm})}${formula('增强方式必须保持标签语义。',480,350,520)}`);
add(22, '从前向计算到参数学习', '已知输出梯度，求核梯度与输入梯度', `${route([['输入 X','前一层输出'],['卷积 K','共享参数'],['特征图 Y','送入后续层'],['损失 L','标量']],125,{height:84,start:75,end:885,gap:18})}${pathLine(791,209,791,300,C.green)}${arrow(791,260,376,260,{label:'∂L/∂K：更新共享参数',color:C.orange})}${arrow(376,260,376,213,{color:C.orange})}${arrow(791,300,169,300,{label:'∂L/∂X：传回前一层'})}${arrow(169,300,169,213)}${formula('步幅 1：3×3 输入 → 2×2 核 → 2×2 输出',480,360,680)}`);
add(23, '共享核参数的梯度', 'K₀₀ 被四个输出使用，每条路径贡献一项', `${grid(58,123,3,3,42,{values:matrixValues(3,3,'x'),hot:['0,0','0,1','1,0','1,1'],label:'四个对应输入位置'})}${grid(303,147,2,2,46,{values:matrixValues(2,2,'k'),hot:['0,0'],label:'固定共享参数 K₀₀'})}${grid(555,140,2,2,46,{values:matrixValues(2,2,'g'),hot:['0,0','0,1','1,0','1,1'],label:'全部输出梯度'})}${arrow(430,193,520,193)}${box(750,135,150,110,'四条路径累加','共享参数的链式法则',{fill:C.warm,titleSize:17,detailSize:12})}${formula('∂L/∂K₀₀ = G₀₀X₀₀ + G₀₁X₀₁ + G₁₀X₁₀ + G₁₁X₁₁',480,355,840)}`);
add(24, '输入梯度：先找覆盖它的窗口', '中心参与四个输出，角点只参与一个', `${grid(65,125,3,3,46,{values:matrixValues(3,3,'x'),hot:['1,1'],label:'固定目标 X₁₁'})}${grid(350,142,2,2,48,{values:matrixValues(2,2,'k'),label:'每条路径的核系数'})}${grid(600,142,2,2,48,{values:matrixValues(2,2,'g'),hot:['0,0','0,1','1,0','1,1'],label:'真正依赖它的输出'})}${formula('∂L/∂X₁₁ = G₀₀K₁₁ + G₀₁K₁₀ + G₁₀K₀₁ + G₁₁K₀₀',480,352,820)}`);
add(25, '步幅 2：先找依赖', '5×5 输入、3×3 核、2×2 输出联动', `${grid(55,112,5,5,34,{values:matrixValues(5,5,'x'),hot:['2,2'],label:'输入 X：选中中心 X₂₂'})}${grid(315,145,3,3,38,{values:matrixValues(3,3,'k'),label:'核 K'})}${grid(540,150,2,2,52,{values:matrixValues(2,2,'g'),hot:['0,0','0,1','1,0','1,1'],label:'四个依赖窗口'})}${lines(['窗口左上角','(0,0)  (0,2)','(2,0)  (2,2)'],745,142,{size:16,color:C.muted,gap:30})}${formula('∂L/∂X₂₂ = G₀₀K₂₂ + G₀₁K₂₀ + G₁₀K₀₂ + G₁₁K₀₀',480,352,820)}`);
add(26, '步幅 2：组织统一计算', '原梯度 → 插零 → 补边 → 与旋转核互相关', `${grid(40,155,2,2,35,{values:matrixValues(2,2,'g'),label:'① 2×2 梯度'})}${arrow(115,190,155,190)}${grid(170,141,3,3,33,{values:[['g00','0','g01'],['0','0','0'],['g10','0','g11']],zero:['0,1','1,0','1,1','1,2','2,1'],label:'② 插零为 3×3'})}${arrow(275,190,310,190)}${grid(325,112,7,7,23,{values:Array.from({length:7},(_,r)=>Array.from({length:7},(_,c)=>r===2&&c===2?'g00':r===2&&c===4?'g01':r===4&&c===2?'g10':r===4&&c===4?'g11':'0')),hot:['2,2','2,4','4,2','4,4'],label:'③ 四周补 2 → 7×7'})}${arrow(492,190,535,190)}${grid(555,145,3,3,31,{values:[['k22','k21','k20'],['k12','k11','k10'],['k02','k01','k00']],label:'④ 旋转 3×3 核'})}${arrow(655,190,730,190)}${grid(760,123,5,5,26,{label:'5×5 输入梯度'})}${formula('插零恢复步幅间隔，补边覆盖边缘，旋转核对应逆向系数。',480,350,840)}`);
add(27, '步幅 2 的核梯度', 'K₀₀ 读取的输入位置间隔为 2', `${grid(52,113,5,5,33,{values:matrixValues(5,5,'x'),hot:['0,0','0,2','2,0','2,2'],label:'K₀₀ 读取的输入坐标'})}${grid(310,153,3,3,37,{values:matrixValues(3,3,'k'),hot:['0,0'],label:'当前参数 K₀₀'})}${grid(530,153,2,2,52,{values:matrixValues(2,2,'g'),hot:['0,0','0,1','1,0','1,1'],label:'全部上游梯度'})}${box(755,125,155,150,'四项累加','对应四条输出路径',{fill:C.warm,detailSize:12})}${formula('∂L/∂K₀₀ = G₀₀X₀₀ + G₀₁X₀₂ + G₁₀X₂₀ + G₁₁X₂₂',480,353,850)}`);
add(28, '池化如何传回梯度', '最大值位置与均匀分配', `${grid(62,138,2,2,58,{values:[[1,3],[4,2]],hot:['1,0'],label:'前向窗口'})}${arrow(190,197,280,197)}${box(305,126,210,142,'Max Pool','g 只回到 argmax = 4',{fill:C.pale})}${box(605,126,265,142,'Average Pool','每个位置收到 g / 4',{fill:C.white})}${formula('窗口重叠时，同一输入收到的贡献仍需相加。',480,350,700)}`);
add(29, '小数据还能训练 CNN 吗', '复用大规模预训练表示', `${route([['大规模源数据','通用视觉模式'],['预训练主干','已学习参数'],['替换分类头','目标类别数'],['目标任务','少量标注']],140,{height:105,start:65,end:895,gap:18})}${formula('先复用表示，再用目标数据建立新的决策边界。',480,330,700)}`);
add(34, 'VGG', '重复使用 3×3 卷积', `${grid(78,128,5,5,30,{hot:Array.from({length:25},(_,i)=>`${Math.floor(i/5)},${i%5}`),label:'单层 5×5：25C²'})}${text('对比',286,210,{size:16,color:C.muted})}${grid(370,158,3,3,42,{hot:Array.from({length:9},(_,i)=>`${Math.floor(i/3)},${i%3}`),label:'第 1 个 3×3'})}${arrow(505,220,580,220)}${grid(610,158,3,3,42,{hot:Array.from({length:9},(_,i)=>`${Math.floor(i/3)},${i%3}`),label:'第 2 个 3×3'})}${formula('2×(3×3) ⇒ 5×5 感受野；参数比 18C² / 25C² = 18/25',480,352,800)}`);
add(35, '从加深到加宽', '参数、过拟合与优化难度带来结构选择', `${box(335,112,290,82,'深层网络的挑战','计算 · 参数 · 梯度传播',{fill:C.warm,titleSize:18})}${arrow(430,194,250,260,{label:'增加宽度'})}${arrow(530,194,710,260,{label:'增加捷径'})}${box(100,265,300,80,'Inception','并行多尺度分支',{fill:C.pale})}${box(560,265,300,80,'ResNet','跨层残差连接',{fill:C.white})}`);
add(36, 'Inception 模块', '多尺度分支、1×1 降维、通道拼接', `${box(50,172,110,70,'输入','H×W×C',{fill:C.pale})}${arrow(160,207,210,207)}${pathLine(210,118,210,328)}${[118,188,258,328].map(y=>arrow(210,y,240,y)).join('')}${[['1×1','直接'],['1×1 → 3×3','降维后卷积'],['1×1 → 5×5','降维后卷积'],['Pool → 1×1','汇总后投影']].map(([a,b],i)=>box(245,91+i*70,230,54,a,b,{fill:i%2?C.white:C.pale2,titleSize:14,detailSize:11})).join('')}${[118,188,258,328].map(y=>arrow(475,y,515,y)).join('')}${pathLine(515,118,515,328)}${arrow(515,207,625,207)}${box(630,157,270,100,'Concat axis = C','空间尺寸一致，沿通道拼接',{fill:C.warm,titleSize:18})}${formula('Y = Concat(Y₁×₁, Y₃×₃, Y₅×₅, Ypool)',480,365,680)}`);
add(38, 'ResNet', '学习残差，保留恒等或投影捷径', `${box(62,164,125,80,'输入 x','',{fill:C.pale})}${arrow(187,204,290,204)}${box(305,137,245,134,'残差分支 F(x)','Conv → Act → Conv',{fill:C.white,titleSize:18})}${arrow(550,204,670,204)}<circle cx="705" cy="204" r="25" fill="${C.pale}" stroke="${C.green}" stroke-width="2"/>${text('+',705,212,{size:25,color:C.green,weight:650})}${arrow(730,204,865,204)}${pathLine(125,164,125,102,C.orange)}${pathLine(125,102,705,102,C.orange)}${arrow(705,102,705,177)}${text('恒等 x；形状变化时使用 Ws x',415,91,{size:15,color:C.orange,weight:650})}${formula('y = F(x) + x      或      y = F(x) + Ws x',480,340,620)}`);

add('dilated', '空洞卷积：间隔采样', '增加覆盖范围，每个输出仍读取 9 个位置', `${grid(90,126,3,3,46,{hot:Array.from({length:9},(_,i)=>`${Math.floor(i/3)},${i%3}`),label:'d=1：覆盖 3×3'})}${arrow(255,190,375,190)}${grid(410,102,5,5,37,{hot:['0,0','0,2','0,4','2,0','2,2','2,4','4,0','4,2','4,4'],label:'d=2：覆盖 5×5'})}${lines(['同样的 3×3 核','采样点间隔变大','核权重数量保持 9'],715,142,{size:17,anchor:'start',gap:34})}${formula('Keff = d(K − 1) + 1 = 2(3 − 1) + 1 = 5',480,350,760)}`);
add('pool-1d', '池化：从多个激活汇总一个值', '窗口长度 2，步幅 2，无可学习的核参数', `${grid(70,113,1,10,48,{values:[[1,4,-4,0,2,-2,1,3,3,1]],hot:['0,0','0,1'],label:'一维输入：两个一组'})}${grid(70,223,1,5,48,{values:[[4,0,2,3,3]],hot:['0,0'],label:'最大池化'})}${grid(530,223,1,5,48,{values:[[2.5,-2,0,2,2]],hot:['0,0'],label:'平均池化'})}${formula('max(1,4) = 4；(1+4)/2 = 2.5',480,353,650)}`);
add('mnist', 'MNIST：把组件串成十分类网络', '28×28 灰度图，5×5 卷积，2×2 池化，10 类输出', `${route([['输入','1×28×28'],['Conv 1','10×24×24'],['Pool','10×12×12'],['Conv 2','20×8×8'],['Pool','20×4×4'],['Flatten + FC','320 → 10']],140,{height:105,start:40,end:920,gap:12,titleSize:14})}${text('每个卷积阶段使用 ReLU；两次池化逐步降低空间分辨率。',480,295,{size:17,color:C.muted})}${formula('两个 5×5 卷积学习特征，最后的全连接层输出类别分数。',480,354,830)}`);
add('mnist-cost', '同一 MNIST 任务的参数量', '按输入通道、输出通道与偏置完整计算', `${box(60,111,390,186,'全连接：784 → 128 → 10','约 101.8k 参数',{fill:C.white,titleSize:20})}${text('(784+1)×128 + (128+1)×10',255,247,{size:16,color:C.orange})}${box(510,111,390,186,'CNN：两个卷积阶段 + 分类头','8490 参数，约 8.5k',{fill:C.pale,titleSize:20})}${text('260 + 5020 + 3210',705,247,{size:18,color:C.green})}${formula('相同输入与输出；局部连接与共享权重减少参数。',480,350,790)}`);
for (const [id,target,hot,expression] of [
  ['stride-corner','X₀₀ / X₀₁',['0,0','0,1'],'∂L/∂X₀₀ = G₀₀K₀₀；∂L/∂X₀₁ = G₀₀K₀₁'],
  ['stride-edge','X₀₂',['0,2'],'∂L/∂X₀₂ = G₀₀K₀₂ + G₀₁K₀₀'],
  ['stride-center','X₂₂',['2,2'],'∂L/∂X₂₂ = G₀₀K₂₂ + G₀₁K₂₀ + G₁₀K₀₂ + G₁₁K₀₀'],
]) {
  const active = id==='stride-corner'?['0,0']:id==='stride-edge'?['0,0','0,1']:['0,0','0,1','1,0','1,1'];
  add(id, `步幅 2：固定 ${target}`, '只保留前向窗口真正覆盖的位置', `${grid(80,115,5,5,34,{values:matrixValues(5,5,'x'),hot,label:'被求导的输入位置'})}${arrow(275,200,365,200)}${grid(400,145,3,3,39,{values:matrixValues(3,3,'k'),label:'每条路径的核系数'})}${arrow(530,200,630,200)}${grid(675,151,2,2,52,{values:matrixValues(2,2,'g'),hot:active,label:'有效输出梯度'})}${formula(expression,480,352,880)}`);
}
add('stride-kernel-last', '步幅 2：固定右下角核参数 K₂₂', '四条输出路径保持不变，读取的输入坐标整体平移', `${grid(70,112,5,5,34,{values:matrixValues(5,5,'x'),hot:['2,2','2,4','4,2','4,4'],label:'K₂₂ 读取的位置'})}${grid(355,145,3,3,38,{values:matrixValues(3,3,'k'),hot:['2,2'],label:'当前核参数'})}${grid(655,150,2,2,50,{values:matrixValues(2,2,'g'),hot:['0,0','0,1','1,0','1,1'],label:'全部输出梯度'})}${formula('∂L/∂K₂₂ = G₀₀X₂₂ + G₀₁X₂₄ + G₁₀X₄₂ + G₁₁X₄₄',480,352,860)}`);
add('small-data', '数据不多，还能训练 CNN 吗', '已有模型学到的视觉表示能否迁移', `${route([['目标数据少','从头训练容易过拟合'],['其他任务的模型','已学到视觉特征'],['迁移学习','复用表示适应新类别']],155,{height:105,titleSize:17})}${formula('下一步：获得预训练主干，再决定训练哪些参数。',480,350,780)}`);
add('transfer-choice', '数据量 × 任务相似性', '较早层的特征较通用，靠近分类输出的特征更专门', `${rect(55,100,850,224,{fill:C.white})}${pathLine(230,100,230,324,C.line)}${pathLine(565,100,565,324,C.line)}${pathLine(55,151,905,151,C.line)}${pathLine(55,237,905,237,C.line)}${text('任务相似',398,131,{size:17,weight:650})}${text('任务差异大',735,131,{size:17,weight:650})}${text('数据少',142,198,{size:18,weight:650})}${text('数据多',142,283,{size:18,weight:650})}${lines(['冻结主干','训练末端分类器'],398,185,{size:16,gap:25})}${lines(['换更接近的预训练模型','或收集更多数据'],735,185,{size:16,gap:25,color:C.orange})}${text('微调更多层或全部层',398,286,{size:16})}${text('全面微调或从头训练',735,286,{size:16})}${text('根据验证集判断迁移收益与过拟合，再调整训练范围。',480,369,{size:17,color:C.muted})}`);

// Static reading diagrams and live presentation windows share the same numerical example.
for (const [id, config] of Object.entries(windowAnimations)) {
  const item = slides.find(slide => slide.id === id);
  const input = config.inputGrid;
  const marker = (key, position, height, width) => `<g data-window="${key}" transform="translate(${position.x} ${position.y})"><rect width="${width * position.cell}" height="${height * position.cell}" fill="none" stroke="${C.orange}" stroke-width="3"/></g>`;
  let body = grid(input.x, input.y, config.input.length, config.input[0].length, input.cell, { values: config.input, label: input.label });
  body += marker('input', input, ...config.window);
  if (config.kernel) {
    const kernel = config.kernelGrid;
    body += grid(kernel.x, kernel.y, config.window[0], config.window[1], kernel.cell, { values: config.kernel, label: kernel.label });
  }
  body += arrow(...config.arrow, { label: config.kernel ? '对应相乘、求和' : '局部汇总' });
  for (const output of config.outputGrids) {
    const values = Array.from({ length: config.rows }, (_, r) => Array.from({ length: config.cols }, (_, c) => config.steps[r * config.cols + c].results[output.key]));
    body += grid(output.x, output.y, config.rows, config.cols, output.cell, { values, label: output.label, output: output.key });
    body += marker(`output-${output.key}`, output, 1, 1);
  }
  body += `<g data-window-equation="">${formula(config.steps[0].calculation, 480, config.equation.y, config.equation.width)}</g>`;
  diagrams[item.visual.diagram] = svg(item.title, item.note, `${heading(item.title, item.caption)}${body}`);
}

const priorMapping = JSON.parse(readFileSync(join(buildRoot, 'source-mapping.json'), 'utf8'));
const sourceMapping = {
  ...priorMapping,
  schema: 'cnn-courseware-source-mapping/v2',
  status: 'revised-to-source-teaching-logic',
  readingSections: sections.map(([title,id],index) => ({
    ...priorMapping.readingSections[index], title, anchor: id,
    sourcePages: slides.filter(s=>s.section===id).flatMap(s=>s.sourcePages),
    presentationSlides: slides.flatMap((s,i)=>s.section===id?[i+1]:[]),
  })),
  presentationSlides: slides.map((s,index)=>({id:s.id,page:index+1,section:s.section,sourcePages:s.sourcePages})),
};
writeFileSync(join(buildRoot, 'source-mapping.json'), `${JSON.stringify(sourceMapping,null,2)}\n`);

const mediaManifest = [];
const slideManifest = slides.map((slide,index) => {
  let content;
  if (slide.visual.assets) {
    slide.visual.assets.forEach(file=>{
      if (!sourceReview.slides.some(s=>slide.sourcePages.includes(s.sourcePage)&&s.assets.some(a=>a.part===`ppt/media/${file}`))) throw new Error(`Asset ${file} does not belong to ${slide.id}`);
    });
    const count = slide.visual.assets.length;
    const width = (880 - (count-1)*24) / count;
    const body = slide.visual.assets.map((file,i)=>sourceImage(file,40+i*(width+24),96,width,285)).join('');
    content = svg(slide.title,slide.note,`${heading(slide.title,slide.caption)}${body}`);
  } else {
    content = diagrams[slide.visual.diagram];
    if (!content) throw new Error(`Missing visual for ${slide.id}`);
  }
  writeFileSync(join(output, `${slide.id}.svg`), content);
  if (slide.motion) {
    sourceBytes(slide.motion);
    const sourcePage = sourceReview.slides.find(s=>slide.sourcePages.includes(s.sourcePage)&&s.assets.some(a=>a.part===`ppt/media/${slide.motion}`))?.sourcePage;
    if (!sourcePage) throw new Error(`Animation does not belong to ${slide.id}`);
    mediaManifest.push({file:`media/cnn/${slide.motion}`,sourcePage,slide:slide.id,observation:slide.caption});
  }
  return {id:slide.id,page:index+1,file:`diagrams/cnn/${slide.id}.svg`,sourcePages:slide.sourcePages,decision:slide.visual.assets?'preserve-original-figure':'redraw',title:slide.title,caption:slide.caption,alt:`${slide.title}。${slide.caption}`,viewport:'0 0 960 417'};
});
const manifest = {
  schema: 'cnn-courseware-diagram-manifest/v1',
  status: 'revised-to-source-teaching-logic',
  sourceScope: { included: '1-118', excluded: [119, 120] },
  generator: 'ai-engineering-course/scripts/generate-cnn-diagrams.mjs',
  diagrams: slideManifest,
  media: mediaManifest,
  interactions: [
    { id: 'output-size-lab', section: 'cnn-spatial', purpose: '联动计算输入、核、填充和步幅对应的输出尺寸。' },
    { id: 'stride-2-gradient-lab', section: 'cnn-stride-gradient', purpose: '切换原梯度、插零、填充和旋转核四个推导状态。' },
    ...Object.entries(windowAnimations).map(([id, config]) => ({ id: `${id}-windows`, slide: id, steps: config.steps.length, purpose: '窗口位置、逐项计算与输出格对应；支持暂停、单步和重播。' })),
  ],
  externalAssets: [],
  originalAssets: [...sourceAssets.keys()].map(file=>({file:`media/cnn/${file}`,sourcePart:`ppt/media/${file}`,sourcePages:sourceReview.slides.filter(s=>s.assets.some(a=>a.part===`ppt/media/${file}`)).map(s=>s.sourcePage)})),
  unresolved: [],
};
writeFileSync(join(buildRoot, 'diagram-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const script = `# CNN 与图像识别：演示模式脚本\n\n本脚本共 ${slides.length} 页，按来源教学顺序展开。来源页仅供内部校对。\n\n` + slides.map((s,i)=>`## ${i+1}｜${s.title}\n\n章节：${topicTitles[topicForSection[s.section]]}\n\n副标题：${s.caption}\n\n讲解备注：${s.note}\n\n视觉：${s.visual.assets?'保留原图 '+s.visual.assets.join('、'):'重绘图解 '+s.id}${windowAnimations[s.id]?'；窗口移动、计算与输出同步，支持暂停/单步/重播':''}${s.motion?'；原始动态素材 '+s.motion:''}\n\n内部来源：${s.sourcePages.join('、')}\n`).join('\n');
writeFileSync(join(buildRoot, 'presentation-script.md'), script);
console.log(`Generated ${slides.length} teaching slides with ${sourceAssets.size} original assets, ${mediaManifest.length} source animations and ${Object.keys(windowAnimations).length} live window animations; updated source mapping and presentation script.`);
