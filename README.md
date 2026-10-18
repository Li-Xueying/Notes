# AI 工程学课程网站

上海创智学院 AI 工程学课程网站，提供课程概览、课程讲义目录及课件资源。

## 网站访问

课程网站地址：

<https://visionary-laboratory.github.io/ai-engineering-course/>

## 网站内容

| 页面 | 内容 |
| --- | --- |
| [课程概览](index.html) | 课程介绍、前六讲主题、考核方式与授课团队 |
| [课程讲义](lectures.html) | 前六讲讲义目录，均提供阅读与演示模式 |
| [下载课件](downloads.html) | PDF 课件的预览、下载与上传状态 |

前六讲在线讲义均已提供。生成模型 Part I、Part II 共用第六讲，两部分均提供阅读与演示内容，两份 PDF 可分别下载。

## 本地预览

本站为静态网站，无需安装依赖。在仓库根目录运行：

```sh
python3 -m http.server 8080
```

在浏览器打开 <http://127.0.0.1:8080/>。结束预览时按 `Ctrl+C`。

如果当前目录是上一级工作区 `lesson_notes`，请明确指定课程目录：

```sh
python3 -m http.server 8080 --directory ai-engineering-course
```

如果已有服务从 `lesson_notes` 启动，完整课程位于 <http://127.0.0.1:8080/ai-engineering-course/>；工作区根首页也会自动跳转到此地址。旧 CNN 预览页保留在 `lesson_notes/cnn-preview.html`。

## 内容维护

课程概览、讲义目录和课件目录分别位于 `index.html`、`lectures.html` 与 `downloads.html`；第一讲页面位于 `intro-overview.html`，其翻页逻辑位于 `intro-overview.js`。页面样式和通用交互逻辑分别位于 `styles.css` 与 `script.js`。

前六讲均提供阅读模式与演示模式：`intro-overview.html`、`cnn-image-recognition.html`、`rnn-lstm-sequence-modeling.html`、`transformer-models.html`、`self-supervised-learning.html` 与 `generative-models.html`。第四讲图解位于 `diagrams/transformer/`，正文、演示脚本和来源映射保存在 `AI工程学/.course-build/04-transformers/`。

第六讲入口为 `generative-models.html`，覆盖 Part I 的 93 页和 Part II 的 100 页 PDF，共 43 个阅读小节、114 个演示步骤、7 组计算过程及 45 组原始图证。正文与公式分别维护于 `scripts/generative-part1-course-data.mjs`、`scripts/generative-part2-course-data.mjs`，由 `scripts/generative-course-data.mjs` 合并。Part I 的 47 个演示页和锚点保持稳定，Part II 从第 48 页开始。

两种模式共用解释、公式、代码与计算状态。Part I 完整展开 ELBO；Part II 按 GAN 目标与交替更新、速度回归、Euler 采样、条件生成、CFG、广义扩散、图像与视频实例展开。新增四组序列分别展示 GAN 实际参数更新、固定端点插值、三步 Euler 与 CFG 向量组合。复杂论文图和实验表可点击打开完整原图。

来源只有 PDF，使用 macOS PDFKit 提取文本与几何位置，并以 Vision 辅助索引嵌入图表；公式与图证经视觉核对。内部事实、教学审查、修正、覆盖及验收位于 `AI工程学/.course-build/06-generative/part1/` 和 `part2/`，路径相对于上一级工作区。原图和图解分别位于 `media/generative/{part1,part2}/`、`diagrams/generative/{part1,part2}/`。PDF 中无法恢复的视频仅保留实际可见静帧。

在课程仓库根目录重建第六讲（Swift 脚本需要 macOS AppKit/PDFKit/Vision）：

```sh
swift -module-cache-path /private/tmp/generative-swift-module-cache scripts/extract-generative-facts.swift
node scripts/prepare-generative-part1.mjs
swift -module-cache-path /private/tmp/generative-swift-module-cache scripts/render-generative-part1-assets.swift
node scripts/generate-generative-part1-diagrams.mjs
node scripts/build-generative-part1-artifacts.mjs
swift -module-cache-path /private/tmp/generative-swift-module-cache scripts/extract-generative-facts.swift part2
node scripts/prepare-generative-part2.mjs
swift -module-cache-path /private/tmp/generative-swift-module-cache scripts/render-generative-part1-assets.swift part2
swift -module-cache-path /private/tmp/generative-swift-module-cache scripts/index-generative-part2-evidence.swift
node scripts/generate-generative-part2-diagrams.mjs
node scripts/build-generative-page.mjs
node scripts/validate-generative-page.mjs
```

第五讲覆盖原文档全部 112 页，提供 31 个阅读小节、83 个演示步骤与 8 组分步过程。唯一正文维护入口是 `scripts/self-supervised-course-data.mjs`；阅读段落、公式、演示备注、图证和来源统一定义于该文件。逐页索引、教学覆盖、修正依据、派生正文与验收记录保存于 `AI工程学/.course-build/05-self-supervised/`。图解和原媒体分别位于 `diagrams/self-supervised/`、`media/self-supervised/`。

从工作区根目录重建第五讲：

```sh
python3 ai-engineering-course/scripts/extract-self-supervised-facts.py
node ai-engineering-course/scripts/build-self-supervised-artifacts.mjs
node ai-engineering-course/scripts/generate-self-supervised-diagrams.mjs
node ai-engineering-course/scripts/build-self-supervised-page.mjs
node ai-engineering-course/scripts/validate-self-supervised-page.mjs
```

第五讲的 MAE 掩码、可见块编码、补回位置和掩码损失共用固定块身份，其他过程包括正负视图、SimCLR 亲和矩阵、MoCo FIFO 队列与 DINO 教师更新。支持暂停、单步、重播、减少动态偏好和图解放大。手机端密集图解可局部横向滚动。PDF 为原文档导出版本，在线讲义应用经过论文与官方实现核对的事实修正。

第四讲按原 PPT 的 1–183 页维护，现有 33 个阅读小节和 122 个演示步骤。原图、计算、备注与来源统一定义于 `scripts/transformer-course-data.mjs`，正文中的稳定图示 ID 将图插入首次讲解处。可以从工作区根目录完整重建：

```sh
python3 ai-engineering-course/scripts/extract-transformer-facts.py
node ai-engineering-course/scripts/generate-transformer-diagrams.mjs
node ai-engineering-course/scripts/build-transformer-page.mjs
node ai-engineering-course/scripts/validate-transformer-page.mjs
node ai-engineering-course/scripts/build-transformer-artifacts.mjs
```

第四讲提供注意力加权、矩阵计算、自回归反馈、因果遮罩、交叉注意力、原例束搜索、Swin 移位、Noisy Top-k 和容量溢出的 9 组过程演示，并保留原稿的 ViT 切块视频。播放可暂停、单步、重播和放大，阅读模式默认静止。验证脚本自动启动并关闭临时服务，检查桌面、平板、手机的页面与动画、原素材关系/哈希、公式和数值；最终记录绑定当前文件哈希。页面构建不会覆盖独立脚本 `transformer-models.js`。

第二讲的正文位于 `AI工程学/.course-build/02-cnns/reading-content.md`，教学主线核对记录位于同目录的 `teaching-logic-review.md`。演示重点、备注、原图与来源映射统一维护于 `scripts/cnn-course-data.mjs`，阅读图示通过正文中的稳定 ID 插入对应解释处。

从工作区根目录重建第二讲：

```sh
python3 ai-engineering-course/scripts/extract-cnn-facts.py
node ai-engineering-course/scripts/generate-cnn-diagrams.mjs
node ai-engineering-course/scripts/build-cnn-page.mjs
```

一维卷积、二维卷积和池化使用可暂停、单步及重播的窗口动画；示例、位置与逐窗计算维护于 `cnn-course-data.mjs` 的 `windowAnimations`。播放只展示窗口位置与对应计算，走完一遍后停止。

运行 `node ai-engineering-course/scripts/validate-cnn-page.mjs` 检查来源顺序、数值梯度、桌面和手机版面、公式、图像、窗口动画与导航。检查脚本自动启动并关闭临时服务器，也可通过 `CNN_PREVIEW_URL` 指定已有预览地址。

第三讲同样按原始 PPT 教学顺序维护，正文与核对记录位于 `AI工程学/.course-build/03-rnns-lstms/`。`scripts/rnn-course-data.mjs` 定义 91 个演示步骤、原图和来源映射；正文中的稳定图解 ID 将图插入对应解释处。页面构建不覆盖独立的交互脚本 `rnn-lstm-sequence-modeling.js`。

从工作区根目录重建第三讲：

```sh
python3 ai-engineering-course/scripts/extract-rnn-facts.py
node ai-engineering-course/scripts/generate-rnn-diagrams.mjs
node ai-engineering-course/scripts/build-rnn-artifacts.mjs
node ai-engineering-course/scripts/build-rnn-page.mjs
node ai-engineering-course/scripts/validate-rnn-page.mjs
```

第三讲提供 Skip-gram 窗口移动、RNN 时间展开、LSTM 数值更新、原例束搜索和注意力逐步演示。播放一次后停止，可暂停、单步前后、重播和放大；阅读模式及减少动态偏好下默认静止。验收覆盖全部演示页在 1440、1024、390px 下的显示、动画实际图形变化、公式、原图哈希和来源对象、数值及阅读与演示导航。

已上传的 PDF 位于 `pdf/`：

- `Fundamentals of Artificial Neural Networks.pdf`
- `CNNs and Image Recognition.pdf`
- `RNNs and LSTMs.pdf`
- `Transformer Models.pdf`
- `Self-supervised Learning.pdf`
- `Part I-Generative.pdf`
- `Part II-Generative.pdf`

新增或更换课件时，请同步更新首页及下载页中的文件链接与上传状态。讲义发布后，请同步更新讲义目录及相应入口。

讲义正文和演示图中的说明应以原课件明确表达的内容为准。除非原课件特别说明，否则不要主动添加时效性、免责性或来源性质的免责声明。
