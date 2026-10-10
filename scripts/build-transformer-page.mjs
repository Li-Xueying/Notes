import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sections, slides, topics, sequences, videos, assetVersion, attentionExample, expertExample} from './transformer-course-data.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(join(root,'..','AI工程学','.course-build','04-transformers','reading-content.md'),'utf8').replaceAll('\r\n','\n');
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const attr=value=>esc(value).replaceAll('"','&quot;');
const icon=name=>readFileSync(join(root,'vendor','lucide','icons',`${name}.svg`),'utf8').replace('<svg','<svg aria-hidden="true" focusable="false"');
const inline=raw=>{
  const plain=value=>esc(value).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  const parts=[];let last=0;
  for(const match of raw.matchAll(/\$([^$]+)\$/g)) {parts.push(plain(raw.slice(last,match.index)),`<span class="cnn-inline-math" data-tex="${attr(match[1])}">${esc(match[1])}</span>`);last=match.index+match[0].length;}
  parts.push(plain(raw.slice(last)));return parts.join('');
};
const src=id=>`diagrams/transformer/${id}.svg?v=${assetVersion}`;
const button=(action,label,name)=>`<button type="button" class="tf-animation-button" data-sequence-action="${action}" aria-label="${label}" data-tooltip="${label}">${icon(name)}</button>`;
const controls=()=>`<div class="tf-animation-controls" role="group" aria-label="计算步骤">${button('previous','上一步','step-back')}<button type="button" class="tf-animation-button" data-sequence-action="play" aria-label="播放" data-tooltip="播放"><span data-play-icon>${icon('play')}</span><span data-pause-icon hidden>${icon('pause')}</span></button>${button('next','下一步','step-forward')}${button('replay','从头重播','rotate-ccw')}<output class="tf-sequence-counter"></output></div><p class="tf-sequence-caption" aria-live="polite"></p>`;
const sequenceHtml=(id,present=false)=>`<div class="tf-sequence" data-sequence="${id}"${present?' data-presentation="true"':''}><div class="tf-sequence-stage"></div>${controls()}</div>`;
const videoHtml=id=>{const v=videos[id];return `<div class="tf-source-video" data-source-video="${id}"><div class="tf-video-stage"><video playsinline muted preload="metadata" poster="media/transformer/${v.poster}" aria-label="${attr(v.caption)}"><source src="media/transformer/${v.file}" type="video/mp4" /></video></div><div class="tf-animation-controls" role="group" aria-label="视频播放"><button type="button" class="tf-animation-button" data-video-action="play" aria-label="播放" data-tooltip="播放" aria-pressed="false"><span data-play-icon>${icon('play')}</span><span data-pause-icon hidden>${icon('pause')}</span></button><button type="button" class="tf-animation-button" data-video-action="replay" aria-label="从头重播" data-tooltip="从头重播">${icon('rotate-ccw')}</button><button type="button" class="tf-animation-button" data-video-action="expand" aria-label="放大视频" data-tooltip="放大视频">${icon('maximize')}</button></div><p>${esc(v.caption)}</p></div>`;};
const attentionLab=`<div class="cnn-lab tf-lab" id="attention-lab"><div class="cnn-lab-heading"><h3>匹配分数与加权结果</h3><output id="attention-output"></output></div><div class="transformer-slider-list">${attentionExample.scores.map((v,i)=>`<label>k${i+1}<input type="range" min="-4" max="4" value="${v}" step="0.1" data-attention-score data-value="${attentionExample.values[i]}" aria-label="对 k${i+1} 的匹配分数"><b>${v.toFixed(1)}</b></label>`).join('')}</div><div class="transformer-weight-row" id="attention-weights" aria-live="polite"></div><p>示例 Value：[2、−1、1、0]；输出为归一化权重与对应值的加权和。</p></div>`;
const maskLab=`<div class="cnn-lab tf-lab" id="causal-mask-lab"><div class="cnn-lab-heading"><h3>目标位置的可见前缀</h3><b id="mask-step"></b></div><div class="cnn-segmented transformer-mask-buttons" role="group" aria-label="选择查询位置">${['BOS','深','度','学'].map((w,i)=>`<button type="button" data-mask-step="${i}">${w}</button>`).join('')}</div><div class="transformer-mask-stage" id="mask-stage" aria-live="polite"></div><p id="mask-message"></p></div>`;
const moeLab=`<div class="cnn-lab tf-lab" id="moe-routing-lab"><div class="cnn-lab-heading"><h3>Top-2 的选择与权重</h3><output id="moe-output"></output></div><div class="transformer-slider-list moe-sliders">${expertExample.logits.map((v,i)=>`<label>E${i+1}<input type="range" min="-4" max="4" value="${v}" step="0.1" data-expert-score aria-label="E${i+1} 的路由分数"><b>${v.toFixed(1)}</b></label>`).join('')}</div><div class="transformer-expert-grid" id="expert-grid" aria-live="polite"></div><p>所选集合内重新归一化，未选专家权重为 0。</p></div>`;
let activeSection;
const usedFigures=new Set();
function figure(id) {
  const item=slides.find(slide=>slide.id===id);
  if(!item||item.section!==activeSection.id) throw new Error(`Invalid figure ${id} in ${activeSection.id}`);
  usedFigures.add(id);
  return `<figure class="intro-visual">${sequences[id]?sequenceHtml(id):`<a class="tf-figure-link" href="${src(id)}" target="_blank" rel="noopener" aria-label="放大：${attr(item.title)}"><img src="${src(id)}" width="960" height="417" loading="lazy" alt="${attr(item.title+'。'+item.caption)}" /></a><figcaption>${esc(item.caption)}</figcaption>`}${videos[id]?videoHtml(id):''}</figure>`;
}
let html='',paragraph=[],list=false,formula=null,sectionOpen=false;
const flush=()=>{if(paragraph.length){html+=`<p>${inline(paragraph.join(' '))}</p>`;paragraph=[];}if(list){html+='</ul>';list=false;}};
const close=()=>{flush();if(sectionOpen){if(activeSection.id==='tf-weighted-sum')html+=attentionLab;if(activeSection.id==='tf-causal-mask')html+=maskLab;if(activeSection.id==='tf-moe-topk')html+=moeLab;html+='</section>';sectionOpen=false;}};
for(const line of source.split('\n').slice(1)) {
  if(formula!==null) {if(line.trim()==='$$'){const tex=formula.join('\n');html+=`<div class="cnn-equation" data-tex="${attr(tex)}"><pre>${esc(tex)}</pre></div>`;formula=null;}else formula.push(line);continue;}
  if(line.trim()==='$$'){flush();formula=[];continue;}
  if(line.startsWith('## ')){close();continue;}
  if(line.startsWith('### ')) {
    close();const title=line.replace(/^###\s+\d+\.\s*/,'').trim();activeSection=sections.find(item=>item.title===title);
    if(!activeSection)throw new Error(`Unknown section ${title}`);
    html+=`<section class="intro-topic cnn-topic tf-topic" id="${activeSection.id}" data-topic="${activeSection.topic}"><div class="article-section-label"><span>${topics[activeSection.topic].label} / ${String(activeSection.index).padStart(2,'0')}</span><button type="button" data-present-section="${activeSection.id}">▷ 演示本节</button></div><h2>${esc(title)}</h2>`;sectionOpen=true;continue;
  }
  if(line.startsWith('#### ')){flush();html+=`<h3>${inline(line.slice(5))}</h3>`;continue;}
  const marker=line.match(/^<!-- figure: ([a-z0-9-]+) -->$/);
  if(marker){flush();html+=figure(marker[1]);continue;}
  const bullet=line.match(/^-\s+(.+)/);
  if(bullet){if(paragraph.length){html+=`<p>${inline(paragraph.join(' '))}</p>`;paragraph=[];}if(!list){html+='<ul>';list=true;}html+=`<li>${inline(bullet[1])}</li>`;continue;}
  if(!line.trim()){flush();continue;}paragraph.push(line.trim());
}
close();if(formula!==null)throw new Error('Unclosed equation');
if(usedFigures.size!==slides.length)throw new Error('Every presentation step needs an adjacent reading figure');
const data={assetVersion,topics,sections,sequences,videos,attentionExample,expertExample,slides:slides.map(({id,section,topic,title,caption,note,page})=>({id,section,topic,title,caption,note,page}))};
const toc=Object.entries(topics).map(([id,topic])=>`<a href="#${topic.target}" data-topic-link="${id}">${topic.label}</a>`).join('');
const sectionToc=sections.map(section=>`<a href="#${section.id}" data-section-link="${section.id}">${String(section.index).padStart(2,'0')} ${section.title}</a>`).join('');
const first=slides[0];
const document=`<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="description" content="AI 工程学第四讲：自注意力、Transformer、ViT、Swin 与混合专家。" /><title>Transformer 模型 · AI 工程学</title><link rel="stylesheet" href="vendor/katex/katex.min.css" /><link rel="stylesheet" href="styles.css" /><link rel="stylesheet" href="transformer-content.css?v=${assetVersion}" /></head>
<body class="intro-page cnn-page tf-page"><a class="skip-link" href="#main-content">跳转至正文</a>
<header class="site-header"><a class="brand" href="index.html" aria-label="AI 工程学课程首页"><span class="brand-mark" aria-hidden="true">⌬</span><span>AI 工程学<small>AI ENGINEERING</small></span></a><nav class="header-nav" aria-label="网站导航"><a href="index.html">课程概览</a><a class="current" href="lectures.html">课程讲义</a><a href="downloads.html">下载课件（PDF）</a><span class="institution">⌂　上海创智学院</span></nav><button class="mobile-menu" type="button" aria-label="打开导航" aria-expanded="false">☰</button></header>
<div class="app-shell"><aside class="sidebar" aria-label="课程目录"><div class="sidebar-heading">课程讲义 <span>LECTURES</span></div><a class="overview-link" href="lectures.html">◈　课程讲义目录</a><div class="nav-part intro-sidebar-nav"><p>第四讲 <span>ATTENTION</span></p><a href="intro-overview.html#topic-mango"><b>01</b>人工神经网络基础</a><a href="cnn-image-recognition.html#cnn-classification"><b>02</b>CNN 与图像识别</a><a href="rnn-lstm-sequence-modeling.html#rnn-sequence-data"><b>03</b>RNN 与 LSTM</a><a class="active" href="#tf-qkv"><b>04</b>Transformer 模型</a><a href="self-supervised-learning.html#ssl-visual-tasks"><b>05</b>自监督学习</a></div><a class="sidebar-resource" href="index.html#assessment">课程考核</a><a class="sidebar-resource" href="index.html#faculty">授课团队</a><a class="sidebar-resource download-resource" href="downloads.html">↓　下载课件</a><div class="sidebar-footer">上海创智学院 <span>2026 秋季</span></div></aside>
<div class="site-body"><div class="breadcrumb"><span>AI 工程学　›　第四讲　›　Transformer 模型</span><span>Transformer Models</span></div><main id="main-content" class="reading-layout intro-reading-layout"><div class="home-content">
<header class="course-intro intro-lecture-header"><div class="eyebrow"><i></i>第四讲 · 注意力架构</div><h1>Transformer 模型</h1><p class="english-title">Transformer Models</p><p class="intro-copy">从序列任务出发，逐步建立自注意力、编码器与解码器，再理解语言与视觉模型，以及专家路由与负载均衡。</p><div class="intro-modebar" role="tablist" aria-label="讲义模式"><button class="button primary" type="button" role="tab" aria-selected="true" data-mode-button="read">▣ 阅读模式</button><button class="button secondary" type="button" role="tab" aria-selected="false" data-mode-button="slides">▷ 演示模式</button><span class="intro-page-count">6 个章节 · ${sections.length} 个主题 · ${slides.length} 个演示步骤</span></div></header>
<div id="read-mode" class="intro-mode-panel" role="tabpanel">${html}</div>
<div id="slides-mode" class="intro-mode-panel intro-slides-panel" role="tabpanel" hidden><header class="intro-slide-heading"><div><div class="eyebrow"><i></i><span id="slide-topic">自注意力</span></div><h2 id="slide-title">${first.title}</h2><p id="slide-caption">${first.caption}</p></div><div class="intro-slide-number"><b id="slide-page">01</b><span id="slide-total"> / ${slides.length}</span></div></header><div class="intro-slide-image"><a class="tf-figure-link" id="slide-link" href="${src(first.id)}" target="_blank" rel="noopener" aria-label="放大当前图解"><img id="slide-image" src="${src(first.id)}" width="960" height="417" alt="${attr(first.title)}" /></a><div id="slide-sequence" hidden></div><div id="slide-video" hidden></div></div><p class="intro-slide-note" id="slide-note">${first.note}</p><div class="intro-slide-progress" aria-hidden="true"><span id="slide-progress"></span></div><div class="intro-slide-controls"><button class="button secondary" id="previous-slide" type="button">← 上一页</button><span id="slide-counter">1 / ${slides.length}</span><button class="button primary" id="next-slide" type="button">下一页 →</button></div><div class="intro-slide-footer"><button class="button secondary" id="read-current" type="button">▣ 阅读本节</button><button class="button secondary" id="copy-slide-link" type="button">复制当前位置</button></div></div>
<footer class="page-footer"><span>AI 工程学 · 第四讲</span><span><a href="pdf/Transformer%20Models.pdf" download>↓ 下载课件 PDF</a></span></footer></div><aside class="page-toc intro-toc"><p>本讲内容</p>${toc}<div class="tf-section-toc">${sectionToc}</div></aside></main></div></div><div class="toast" role="status" aria-live="polite"></div><script type="application/json" id="tf-course-data">${JSON.stringify(data).replaceAll('<','\\u003c')}</script><script src="script.js"></script><script src="vendor/katex/katex.min.js"></script><script src="transformer-models.js?v=${assetVersion}"></script></body></html>\n`;
writeFileSync(join(root,'transformer-models.html'),document);
console.log(`Built ${sections.length} sections, ${usedFigures.size} adjacent figures, ${slides.length} presentation steps.`);
