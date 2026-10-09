# AI 工程学课程网站

上海创智学院 AI 工程学课程网站，提供课程概览、课程讲义目录及课件资源。

## 网站访问

课程网站地址：

<https://visionary-laboratory.github.io/ai-engineering-course/>

## 网站内容

| 页面 | 内容 |
| --- | --- |
| [课程概览](index.html) | 课程介绍、前五讲主题、考核方式与授课团队 |
| [课程讲义](lectures.html) | 前五讲讲义目录与上传状态；第一至第四讲已提供完整讲义 |
| [下载课件](downloads.html) | PDF 课件的预览、下载与上传状态 |

目前第一至第四讲的 PDF 课件与在线讲义均已提供；第五讲尚未上传，未上传的资源仍显示对应状态。

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

前四讲均提供阅读模式与演示模式：`intro-overview.html`、`cnn-image-recognition.html`、`rnn-lstm-sequence-modeling.html` 与 `transformer-models.html`。第四讲图解位于 `diagrams/transformer/`，正文、演示脚本和来源映射保存在 `AI工程学/.course-build/04-transformers/`。

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

新增或更换课件时，请同步更新首页及下载页中的文件链接与上传状态。讲义发布后，请同步更新讲义目录及相应入口。

讲义正文和演示图中的说明应以原课件明确表达的内容为准。除非原课件特别说明，否则不要主动添加时效性、免责性或来源性质的免责声明。
