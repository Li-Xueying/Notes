import {readFileSync, writeFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {sections, slides, topics, sequences, assetVersion, embeddingVectors} from './rnn-course-data.mjs';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const source=readFileSync(join(root,'..','AI工程学','.course-build','03-rnns-lstms','reading-content.md'),'utf8').replaceAll('\r\n','\n');
const esc=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const attr=value=>esc(value).replaceAll('"','&quot;');
const icon=name=>readFileSync(join(root,'vendor','lucide','icons',`${name}.svg`),'utf8').replace('<svg','<svg aria-hidden="true" focusable="false"');
const inline=raw=>{
  const plain=value=>esc(value).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  const parts=[];let last=0;
  for(const match of raw.matchAll(/\$([^$]+)\$/g)) {parts.push(plain(raw.slice(last,match.index)),`<span class="cnn-inline-math" data-tex="${attr(match[1])}">${esc(match[1])}</span>`);last=match.index+match[0].length;}
  parts.push(plain(raw.slice(last)));return parts.join('');
};
const src=id=>`diagrams/rnn/${id}.svg?v=${assetVersion}`;
const button=(action,label,name)=>`<button type="button" class="rnn-animation-button" data-sequence-action="${action}" aria-label="${label}" data-tooltip="${label}">${icon(name)}</button>`;
const controls=()=>`<div class="rnn-animation-controls" role="group" aria-label="计算步骤">${button('previous','上一步','step-back')}<button type="button" class="rnn-animation-button" data-sequence-action="play" aria-label="播放" data-tooltip="播放"><span data-play-icon>${icon('play')}</span><span data-pause-icon hidden>${icon('pause')}</span></button>${button('next','下一步','step-forward')}${button('replay','从头重播','rotate-ccw')}<output class="rnn-sequence-counter"></output></div><p class="rnn-sequence-caption" aria-live="polite"></p>`;
const sequenceHtml=(id,present=false)=>`<div class="rnn-sequence" data-sequence="${id}"${present?' data-presentation="true"':''}><div class="rnn-sequence-stage"></div>${controls()}</div>`;
let activeSection;
const usedFigures=new Set();
function figure(id) {
  const item=slides.find(slide=>slide.id===id);
  if(!item||item.section!==activeSection.id) throw new Error(`Invalid figure ${id} in ${activeSection.id}`);
  usedFigures.add(id);
  return `<figure class="intro-visual">${sequences[id]?sequenceHtml(id):`<a class="rnn-figure-link" href="${src(id)}" target="_blank" rel="noopener" aria-label="放大：${attr(item.title)}"><img src="${src(id)}" width="960" height="417" loading="lazy" alt="${attr(item.title+'。'+item.caption)}" /></a><figcaption>${esc(item.caption)}</figcaption>`}</figure>`;
}
const embeddingLab=`<div class="cnn-lab rnn-lab" id="embedding-similarity-lab"><div class="cnn-lab-heading"><h3>三维示意向量的余弦值</h3><output id="embedding-score"></output></div><div class="rnn-word-pairs" role="group" aria-label="比较词对">${['hotel-motel','hotel-conference','motel-conference'].map((pair,i)=>`<button type="button" data-word-pair="${pair}"${i===0?' class="active"':''}>${pair.replace('-',' · ')}</button>`).join('')}</div><div class="rnn-vector-comparison"><div><strong id="vector-a-label"></strong><code id="vector-a"></code></div><span>cos</span><div><strong id="vector-b-label"></strong><code id="vector-b"></code></div></div><p>这些坐标用于说明嵌入表结构，相似度不代表训练后的语义关系。</p></div>`;
let html='',paragraph=[],list=false,formula=null,sectionOpen=false;
const flush=()=>{if(paragraph.length){html+=`<p>${inline(paragraph.join(' '))}</p>`;paragraph=[];}if(list){html+='</ul>';list=false;}};
const close=()=>{flush();if(sectionOpen){if(activeSection.id==='rnn-embeddings')html+=embeddingLab;html+='</section>';sectionOpen=false;}};
for(const line of source.split('\n').slice(1)) {
  if(formula!==null) {if(line.trim()==='$$'){const tex=formula.join('\n');html+=`<div class="cnn-equation" data-tex="${attr(tex)}"><pre>${esc(tex)}</pre></div>`;formula=null;}else formula.push(line);continue;}
  if(line.trim()==='$$'){flush();formula=[];continue;}
  if(line.startsWith('## ')){close();continue;}
  if(line.startsWith('### ')) {
    close();const title=line.replace(/^###\s+\d+\.\s*/,'').trim();activeSection=sections.find(item=>item.title===title);
    if(!activeSection)throw new Error(`Unknown section ${title}`);
    html+=`<section class="intro-topic cnn-topic rnn-topic" id="${activeSection.id}" data-topic="${activeSection.topic}"><div class="article-section-label"><span>${topics[activeSection.topic].label} / ${String(activeSection.index).padStart(2,'0')}</span><button type="button" data-present-section="${activeSection.id}">▷ 演示本节</button></div><h2>${esc(title)}</h2>`;sectionOpen=true;continue;
  }
  if(line.startsWith('#### ')){flush();html+=`<h3>${inline(line.slice(5))}</h3>`;continue;}
  const marker=line.match(/^<!-- figure: ([a-z0-9-]+) -->$/);
  if(marker){flush();html+=figure(marker[1]);continue;}
  const bullet=line.match(/^-\s+(.+)/);
  if(bullet){if(paragraph.length){html+=`<p>${inline(paragraph.join(' '))}</p>`;paragraph=[];}if(!list){html+='<ul>';list=true;}html+=`<li>${inline(bullet[1])}</li>`;continue;}
  if(!line.trim()){flush();continue;}paragraph.push(line.trim());
}
close();if(formula!==null)throw new Error('Unclosed equation');
const templates=Object.entries(sequences).filter(([,item])=>item.kind!=='images').map(([id])=>`<template id="rnn-live-${id}">${readFileSync(join(root,'diagrams','rnn',`${id}-live.svg`),'utf8')}</template>`).join('');
const data={assetVersion,topics,sections,sequences,embeddingVectors,slides:slides.map(({id,section,topic,title,caption,note,page})=>({id,section,topic,title,caption,note,page}))};
const toc=Object.entries(topics).map(([id,topic])=>`<a href="#${topic.target}" data-topic-link="${id}">${topic.label}</a>`).join('');
const sectionToc=sections.map(section=>`<a href="#${section.id}" data-section-link="${section.id}">${String(section.index).padStart(2,'0')} ${section.title}</a>`).join('');
const first=slides[0];
const document=`<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="description" content="AI 工程学第三讲：词表示、RNN、LSTM、Seq2Seq 与注意力。" /><title>循环神经网络与长短期记忆 · AI 工程学</title><link rel="stylesheet" href="vendor/katex/katex.min.css" /><link rel="stylesheet" href="styles.css" /><link rel="stylesheet" href="rnn-content.css?v=${assetVersion}" /></head>
<body class="intro-page cnn-page rnn-page"><a class="skip-link" href="#main-content">跳转至正文</a>
<header class="site-header"><a class="brand" href="index.html" aria-label="AI 工程学课程首页"><span class="brand-mark" aria-hidden="true">⌬</span><span>AI 工程学<small>AI ENGINEERING</small></span></a><nav class="header-nav" aria-label="网站导航"><a href="index.html">课程概览</a><a class="current" href="lectures.html">课程讲义</a><a href="downloads.html">下载课件（PDF）</a><span class="institution">⌂　上海创智学院</span></nav><button class="mobile-menu" type="button" aria-label="打开导航" aria-expanded="false">☰</button></header>
<div class="app-shell"><aside class="sidebar" aria-label="课程目录"><div class="sidebar-heading">课程讲义 <span>LECTURES</span></div><a class="overview-link" href="lectures.html">◈　课程讲义目录</a><div class="nav-part intro-sidebar-nav"><p>第三讲 <span>SEQUENCES</span></p><a href="intro-overview.html#topic-mango"><b>01</b>人工神经网络基础</a><a href="cnn-image-recognition.html#cnn-classification"><b>02</b>CNN 与图像识别</a><a class="active" href="#rnn-sequence-data"><b>03</b>RNN 与 LSTM</a><a href="transformer-models.html#tf-qkv"><b>04</b>Transformer 模型</a><a href="lectures.html#lecture-5"><b>05</b>自监督学习</a></div><a class="sidebar-resource" href="index.html#assessment">课程考核</a><a class="sidebar-resource" href="index.html#faculty">授课团队</a><a class="sidebar-resource download-resource" href="downloads.html">↓　下载课件</a><div class="sidebar-footer">上海创智学院 <span>2026 秋季</span></div></aside>
<div class="site-body"><div class="breadcrumb"><span>AI 工程学　›　第三讲　›　循环神经网络与长短期记忆</span><span>RNNs and LSTMs</span></div><main id="main-content" class="reading-layout intro-reading-layout"><div class="home-content">
<header class="course-intro intro-lecture-header"><div class="eyebrow"><i></i>第三讲 · 序列建模</div><h1>循环神经网络与长短期记忆</h1><p class="english-title">RNNs and LSTMs</p><p class="intro-copy">词的表示与学习，历史状态的递推，门控记忆的更新，以及机器翻译中的序列生成、搜索和注意力。</p><div class="intro-modebar" role="tablist" aria-label="讲义模式"><button class="button primary" type="button" role="tab" aria-selected="true" data-mode-button="read">▣ 阅读模式</button><button class="button secondary" type="button" role="tab" aria-selected="false" data-mode-button="slides">▷ 演示模式</button><span class="intro-page-count">3 个章节 · ${sections.length} 个主题 · ${slides.length} 个演示步骤</span></div></header>
<div id="read-mode" class="intro-mode-panel" role="tabpanel">${html}</div>
<div id="slides-mode" class="intro-mode-panel intro-slides-panel" role="tabpanel" hidden><header class="intro-slide-heading"><div><div class="eyebrow"><i></i><span id="slide-topic">词表示</span></div><h2 id="slide-title">${first.title}</h2><p id="slide-caption">${first.caption}</p></div><div class="intro-slide-number"><b id="slide-page">01</b><span id="slide-total"> / ${slides.length}</span></div></header><div class="intro-slide-image"><a class="rnn-figure-link" id="slide-link" href="${src(first.id)}" target="_blank" rel="noopener" aria-label="放大当前图解"><img id="slide-image" src="${src(first.id)}" width="960" height="417" alt="${attr(first.title)}" /></a><div id="slide-sequence" hidden></div></div><p class="intro-slide-note" id="slide-note">${first.note}</p><div class="intro-slide-progress" aria-hidden="true"><span id="slide-progress"></span></div><div class="intro-slide-controls"><button class="button secondary" id="previous-slide" type="button">← 上一页</button><span id="slide-counter">1 / ${slides.length}</span><button class="button primary" id="next-slide" type="button">下一页 →</button></div><div class="intro-slide-footer"><button class="button secondary" id="read-current" type="button">▣ 阅读本节</button><button class="button secondary" id="copy-slide-link" type="button">复制当前位置</button></div></div>
<footer class="page-footer"><span>AI 工程学 · 第三讲</span><span><a href="pdf/RNNs%20and%20LSTMs.pdf" download>↓ 下载课件 PDF</a></span></footer></div><aside class="page-toc intro-toc"><p>本讲内容</p>${toc}<div class="rnn-section-toc">${sectionToc}</div></aside></main></div></div><div class="toast" role="status" aria-live="polite"></div>${templates}<script type="application/json" id="rnn-course-data">${JSON.stringify(data).replaceAll('<','\\u003c')}</script><script src="script.js"></script><script src="vendor/katex/katex.min.js"></script><script src="rnn-lstm-sequence-modeling.js?v=${assetVersion}"></script></body></html>\n`;
writeFileSync(join(root,'rnn-lstm-sequence-modeling.html'),document);
console.log(`Built ${sections.length} sections, ${usedFigures.size} adjacent figures, ${slides.length} presentation steps.`);
