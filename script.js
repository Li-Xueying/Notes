const inputValues = [
  1, 1, 1, 1, 1,
  -1, 0, -3, 0, 1,
  2, 1, 1, -1, 0,
  0, -1, 1, 2, 1,
  1, 2, 1, 1, 1
];
const kernelValues = [-1, 0, 1, -1, 0, 1, -1, 0, 1];
let convStep = 0;

const networkDiagram = document.querySelector(".fcn-diagram");
const networkEdges = networkDiagram.querySelector(".fcn-edges");
const networkLayers = [...networkDiagram.querySelectorAll(".fcn-layer")];

function renderNetworkEdges() {
  const diagramBounds = networkDiagram.getBoundingClientRect();
  networkEdges.setAttribute("viewBox", `0 0 ${diagramBounds.width} ${diagramBounds.height}`);
  networkEdges.replaceChildren();

  function center(element) {
    const bounds = element.getBoundingClientRect();
    return [bounds.left + bounds.width / 2 - diagramBounds.left, bounds.top + bounds.height / 2 - diagramBounds.top];
  }

  function connect(from, to, className = "") {
    const [x1, y1] = center(from);
    const [x2, y2] = center(to);
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", x1);
    line.setAttribute("y1", y1);
    line.setAttribute("x2", x2);
    line.setAttribute("y2", y2);
    if (className) line.setAttribute("class", className);
    networkEdges.appendChild(line);
  }

  for (let index = 0; index < networkLayers.length - 1; index += 1) {
    const from = [...networkLayers[index].querySelectorAll(".fcn-nodes i")];
    const to = [...networkLayers[index + 1].querySelectorAll(".fcn-nodes i")];
    connect(from[0], to[0], "fcn-first-edge");
    from.slice(1).forEach((node) => connect(node, to[0]));
    to.slice(1).forEach((node) => connect(from[0], node));
    connect(networkLayers[index].querySelector(".fcn-nodes em"), to[0], "fcn-omitted-edge");
    connect(from[0], networkLayers[index + 1].querySelector(".fcn-nodes em"), "fcn-omitted-edge");
  }
}

renderNetworkEdges();
new ResizeObserver(renderNetworkEdges).observe(networkDiagram);

function makeMatrix(element, values) {
  values.forEach((value) => {
    const cell = document.createElement("span");
    cell.className = "matrix-cell";
    cell.textContent = value;
    element.appendChild(cell);
  });
}

function convolutionOutputs() {
  const outputs = [];
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      let sum = 0;
      for (let kr = 0; kr < 3; kr += 1) {
        for (let kc = 0; kc < 3; kc += 1) {
          sum += inputValues[(row + kr) * 5 + col + kc] * kernelValues[kr * 3 + kc];
        }
      }
      outputs.push(sum);
    }
  }
  return outputs;
}

const inputMatrix = document.querySelector("#input-matrix");
const kernelMatrix = document.querySelector("#kernel-matrix");
const outputMatrix = document.querySelector("#output-matrix");
const convOutputs = convolutionOutputs();
makeMatrix(inputMatrix, inputValues);
makeMatrix(kernelMatrix, kernelValues);
makeMatrix(outputMatrix, convOutputs);

function renderConvolution() {
  const row = Math.floor(convStep / 3);
  const col = convStep % 3;
  const inputCells = [...inputMatrix.children];
  inputCells.forEach((cell) => cell.classList.remove("window"));
  const products = [];
  for (let kr = 0; kr < 3; kr += 1) {
    for (let kc = 0; kc < 3; kc += 1) {
      const inputIndex = (row + kr) * 5 + col + kc;
      inputCells[inputIndex].classList.add("window");
      const kernelIndex = kr * 3 + kc;
      products.push(`${inputValues[inputIndex]}×${kernelValues[kernelIndex]}`);
    }
  }
  [...outputMatrix.children].forEach((cell, index) => cell.classList.toggle("active", index === convStep));
  document.querySelector("#conv-position").textContent = `窗口位置 (${row + 1}, ${col + 1})`;
  document.querySelector("#conv-calculation").textContent = `${products.join(" + ")} = ${convOutputs[convStep]}`;
  document.querySelector("#conv-step-count").textContent = `${convStep + 1} / 9`;
}

document.querySelector("#conv-next").addEventListener("click", () => {
  convStep = (convStep + 1) % 9;
  renderConvolution();
});
document.querySelector("#conv-prev").addEventListener("click", () => {
  convStep = (convStep + 8) % 9;
  renderConvolution();
});
document.querySelector("#conv-reset").addEventListener("click", () => {
  convStep = 0;
  renderConvolution();
});
renderConvolution();

const geometryInputs = ["input-size", "kernel-size", "stride", "padding"];
function updateGeometry() {
  const input = Number(document.querySelector("#input-size").value);
  const kernel = Number(document.querySelector("#kernel-size").value);
  const stride = Number(document.querySelector("#stride").value);
  const padding = Number(document.querySelector("#padding").value);
  const output = Math.floor((input + 2 * padding - kernel) / stride) + 1;
  geometryInputs.forEach((id) => {
    document.querySelector(`#${id}-output`).textContent = document.querySelector(`#${id}`).value;
  });
  document.querySelector("#geometry-result").textContent = output > 0 ? `${output} × ${output}` : "无有效输出";
  document.querySelector("#geometry-detail").textContent = `⌊(${input} + 2×${padding} − ${kernel}) / ${stride}⌋ + 1 = ${output}`;
}
geometryInputs.forEach((id) => document.querySelector(`#${id}`).addEventListener("input", updateGeometry));
updateGeometry();

const poolValues = [1, 3, 2, 4, 5, 6, 1, 2, 7, 2, 8, 3, 4, 1, 2, 9];
const poolInput = document.querySelector("#pool-input");
const poolOutput = document.querySelector("#pool-output");
makeMatrix(poolInput, poolValues);

function poolResults(mode) {
  const results = [];
  for (let row = 0; row < 4; row += 2) {
    for (let col = 0; col < 4; col += 2) {
      const windowValues = [
        poolValues[row * 4 + col], poolValues[row * 4 + col + 1],
        poolValues[(row + 1) * 4 + col], poolValues[(row + 1) * 4 + col + 1]
      ];
      results.push(mode === "max" ? Math.max(...windowValues) : windowValues.reduce((a, b) => a + b, 0) / 4);
    }
  }
  return results;
}

function renderPool(mode) {
  poolOutput.replaceChildren();
  makeMatrix(poolOutput, poolResults(mode));
  document.querySelector("#pool-output-label").textContent = mode === "max" ? "最大池化输出" : "平均池化输出";
  document.querySelectorAll("[data-pool]").forEach((button) => button.classList.toggle("active", button.dataset.pool === mode));
}
document.querySelectorAll("[data-pool]").forEach((button) => button.addEventListener("click", () => renderPool(button.dataset.pool)));
renderPool("max");

const sidebar = document.querySelector("#course-sidebar");
const sidebarScrim = document.querySelector("#sidebar-scrim");
const menuButton = document.querySelector("#mobile-menu");
function setSidebar(open) {
  sidebar.classList.toggle("open", open);
  sidebarScrim.classList.toggle("open", open);
  menuButton.setAttribute("aria-expanded", String(open));
}
menuButton.addEventListener("click", () => setSidebar(!sidebar.classList.contains("open")));
sidebarScrim.addEventListener("click", () => setSidebar(false));
sidebar.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setSidebar(false)));

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-mode]").forEach((item) => item.classList.toggle("active", item === button));
    if (button.dataset.mode === "demo") {
      document.querySelector("#convolution-demo").scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      document.querySelector("#main-content").scrollIntoView({ behavior: "smooth" });
    }
  });
});

const tocLinks = [...document.querySelectorAll(".page-toc a")];
const sections = tocLinks.map((link) => document.querySelector(link.getAttribute("href"))).filter(Boolean);
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      tocLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
    }
  });
}, { rootMargin: "-18% 0px -70%", threshold: 0 });
sections.forEach((section) => observer.observe(section));

function updateProgress() {
  const article = document.querySelector(".lecture-article");
  const available = article.scrollHeight - window.innerHeight;
  const progress = Math.max(0, Math.min(1, (window.scrollY - article.offsetTop + 190) / available));
  document.querySelector("#reading-progress").style.width = `${progress * 100}%`;
}
window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();
