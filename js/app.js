// 全局变量
let currentUrl = '';
let debounceTimer;
let charCountDebounceTimer;
let isSyncingScroll = false;
let isPreviewMode = true;

// 自动补全相关变量
let autocompleteVisible = false;
let autocompleteItems = [];
let activeAutocompleteIndex = -1;
let autocompleteTrigger = '';

// 撤销/重做相关变量
let undoStack = [];
let redoStack = [];
let maxHistorySize = 50;
let isUndoRedoOperation = false;

// DOM 元素
const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const lineNumbers = document.getElementById('lineNumbers');
const charCount = document.getElementById('charCount');
const themeToggle = document.getElementById('themeToggle');
const modeToggle = document.getElementById('modeToggle');
const modeText = document.getElementById('modeText');
const loadTemplateBtn = document.getElementById('loadTemplate');
const clearBtn = document.getElementById('clearBtn');
const shareLinkBtn = document.getElementById('shareLink');
const exportHtmlBtn = document.getElementById('exportHtml');
const toast = document.getElementById('toast');
const templateModal = document.getElementById('templateModal');
const closeModalBtn = document.getElementById('closeModal');
const templateList = document.getElementById('templateList');
const autocomplete = document.getElementById('autocomplete');
const tocToggle = document.getElementById('tocToggle');
const toc = document.getElementById('toc');
const tocClose = document.getElementById('tocClose');
const tocContent = document.getElementById('tocContent');
const widthSlider = document.getElementById('widthSlider');
const widthLabel = document.getElementById('widthLabel');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  // 检查依赖库是否加载
  if (typeof marked === 'undefined') {
    preview.innerHTML =
      '<p style="color: #f14c4c;">错误：marked.js 库未加载，请检查网络连接</p>';
    return;
  }

  initMermaid();
  initMarked();
  loadFromUrl();
  loadFromLocalStorage();
  bindEvents();
  updatePreview();

  // 保存初始状态到撤销栈
  saveToUndoStack();
});

// 初始化 Mermaid
function initMermaid() {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    themeVariables: {
      darkMode: true,
      background: '#252526',
      primaryColor: '#007acc',
      primaryTextColor: '#d4d4d4',
      primaryBorderColor: '#3e3e42',
      lineColor: '#858585',
      secondaryColor: '#2d2d30',
      tertiaryColor: '#1e1e1e',
    },
  });
}

// 初始化 Marked
function initMarked() {
  const renderer = new marked.Renderer();

  // 自定义代码块渲染器
  renderer.code = function (code, language) {
    if (language === 'mermaid') {
      return `<div class="mermaid">${code}</div>`;
    }
    return `<pre><code class="language-${language || 'plaintext'}">${escapeHtml(code)}</code></pre>`;
  };

  marked.setOptions({
    renderer: renderer,
    breaks: true,
    gfm: true,
  });
}

// HTML 转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 数据编码：使用 LZString 专为 URL 优化的压缩方法
function encodeData(markdown) {
  try {
    // 直接使用 LZString 的 URL 优化压缩方法
    // 这个方法内部已经处理了 URL 安全编码，无需额外 Base64
    return LZString.compressToEncodedURIComponent(markdown);
  } catch (e) {
    return null;
  }
}

// 数据解码：使用 LZString 的 URL 优化解压方法
function decodeData(encoded) {
  try {
    // 直接使用 LZString 的 URL 优化解压方法
    return LZString.decompressFromEncodedURIComponent(encoded);
  } catch (e) {
    return null;
  }
}

// 从 URL 加载内容
function loadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const data = params.get('data');
  const source = params.get('source');

  // 优先处理 source 参数（远程 markdown 文件）
  if (source) {
    loadFromSource(source);
    return;
  }

  if (data) {
    const markdown = decodeData(data);
    if (markdown) {
      editor.value = markdown;
      showToast('已从 URL 加载内容');
    } else {
      showToast('解码失败，请检查链接', 'error');
    }
  } else {
    // 显示默认欢迎内容
    editor.value = `# 欢迎使用 Markdown 在线预览

这是一个支持 **Mermaid 图表** 的 Markdown 在线编辑器。

[关于本项目的更多介绍](https://markdown-in-url.pages.dev/?source=https://raw.githubusercontent.com/AriesYB/markdown-in-url/refs/heads/master/README.md)

## 功能特点

- 📝 在线编辑 Markdown
- 👁️ 实时预览渲染结果
- 🔗 **生成分享链接（无需传输markdown文件）**
- 🎨 支持 Mermaid 图表

## Mermaid 图表示例

### 流程图

\`\`\`mermaid
graph TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作A]
    B -->|否| D[执行操作B]
    C --> E[结束]
    D --> E
\`\`\`

### 时序图

\`\`\`mermaid
sequenceDiagram
    participant 用户
    participant 系统
    participant 数据库
    
    用户->>系统: 发起请求
    系统->>数据库: 查询数据
    数据库-->>系统: 返回结果
    系统-->>用户: 响应结果
\`\`\`

## 开始使用

1. 在左侧编辑器输入 Markdown 内容
2. 右侧实时预览渲染结果
3. 点击"生成分享链接"按钮
4. 分享链接给他人，打开即可查看

---
点击右上角的 **模板** 按钮可以加载更多示例！
`;
  }
}

// 从远程 URL 加载 markdown 内容
async function loadFromSource(sourceUrl) {
  try {
    showToast('正在加载远程内容...', 'success');

    const response = await fetch(sourceUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const markdown = await response.text();
    editor.value = markdown;
    showToast('已从远程 URL 加载内容');

    // 更新预览
    updatePreview();
  } catch (error) {
    console.error('加载远程内容失败:', error);
    editor.value = `# 加载失败

无法从以下 URL 加载内容：

\`${sourceUrl}\`

**错误信息：** ${error.message}

## 可能的原因

1. URL 不正确或文件不存在
2. 服务器不支持 CORS（跨域资源共享）
3. 网络连接问题

## 解决方案

- 确认 URL 是否正确
- 确保服务器允许跨域访问（CORS）
- 对于 GitHub 文件，使用 raw.githubusercontent.com 域名
- 检查网络连接

---

您可以手动复制 Markdown 内容到编辑器中。`;
    showToast('加载失败，请检查 URL', 'error');
  }
}

// 从本地存储加载
function loadFromLocalStorage() {
  const saved = localStorage.getItem('markdown-preview-content');
  if (saved && !editor.value) {
    editor.value = saved;
  }
}

// 保存到本地存储
function saveToLocalStorage() {
  localStorage.setItem('markdown-preview-content', editor.value);
}

// 更新预览
function updatePreview() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const markdown = editor.value;

    // 更新字符统计（使用轻量级估算）
    updateCharCount(markdown);

    // 更新行号
    updateLineNumbers(markdown);

    // 保存到本地存储（使用防抖）
    clearTimeout(charCountDebounceTimer);
    charCountDebounceTimer = setTimeout(saveToLocalStorage, 1000);

    // 使用 requestAnimationFrame 优化渲染
    requestAnimationFrame(() => {
      // 保存当前滚动百分比（而不是绝对像素值）
      const scrollPercentage =
        preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
      const savedScrollLeft = preview.scrollLeft;

      // 渲染 Markdown
      let html;
      try {
        html = marked.parse(markdown);
      } catch (e) {
        html = `<p style="color: #f14c4c;">Markdown 解析失败：${e.message}</p>`;
      }
      preview.innerHTML = html;

      // 生成目录
      generateTableOfContents();

      // 渲染 Mermaid 图表（延迟执行，避免阻塞）
      setTimeout(() => {
        const mermaidElements = preview.querySelectorAll('.mermaid');
        let mermaidPromises = [];

        if (mermaidElements.length > 0) {
          mermaidElements.forEach((element) => {
            const code = element.textContent.trim();
            const id =
              'mermaid-' +
              Date.now() +
              '-' +
              Math.random().toString(36).substr(2, 9);

            const promise = mermaid
              .render(id, code)
              .then((result) => {
                // mermaid.render 返回 { svg: string }
                if (typeof result === 'string') {
                  element.innerHTML = result;
                } else if (result && typeof result === 'object') {
                  if (result.svg) {
                    element.innerHTML = result.svg;
                  } else {
                    element.innerHTML = `<pre style="color: #f14c4c;">图表渲染失败：无法解析结果</pre>`;
                  }
                } else {
                  element.innerHTML = `<pre style="color: #f14c4c;">图表渲染失败：未知错误</pre>`;
                }
              })
              .catch((err) => {
                element.innerHTML = `<pre style="color: #f14c4c;">图表渲染失败：${err.message || err}</pre>`;
              });
            mermaidPromises.push(promise);
          });
        }

        // 代码高亮（延迟执行，避免阻塞）
        if (typeof hljs !== 'undefined') {
          preview.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
          });
        }

        // 等待所有 Mermaid 渲染完成后恢复滚动位置
        Promise.all(mermaidPromises).then(() => {
          requestAnimationFrame(() => {
            // 恢复滚动位置（使用百分比计算）
            preview.scrollTop =
              scrollPercentage * (preview.scrollHeight - preview.clientHeight);
            preview.scrollLeft = savedScrollLeft;
          });
        });
      }, 0);
    });
  }, 300);
}

// 更新字符统计
function updateCharCount(markdown) {
  const count = markdown.length;

  // 计算压缩后的URL长度
  const encoded = encodeData(markdown);
  const baseUrl = `${window.location.origin}${window.location.pathname}?data=`;
  const urlLength = encoded ? baseUrl.length + encoded.length : 0;

  // 不同浏览器的URL限制（单位：字符）
  const urlLimits = {
    chrome: 8182,
    firefox: 65536,
    safari: 80000,
    edge: 8182,
  };

  // 构建浏览器状态显示
  let browserHtml = '';
  if (encoded) {
    const browsers = [
      { name: 'Chrome/Edge', limit: urlLimits.chrome },
      { name: 'Firefox', limit: urlLimits.firefox },
      { name: 'Safari', limit: urlLimits.safari },
    ];

    const browserStatus = browsers.map((browser) => {
      const isOverLimit = urlLength > browser.limit;
      const colorClass = isOverLimit ? 'url-over-limit' : 'url-ok';
      return `<span class="${colorClass}">${browser.name}(${urlLength}/${browser.limit})</span>`;
    });

    browserHtml = ` | ${browserStatus.join(' ')}`;
  }

  charCount.innerHTML = `${count} 字符 | URL: ${urlLength} 字符${browserHtml}`;
}

// 更新行号（优化：使用DocumentFragment减少DOM操作）
function updateLineNumbers(markdown) {
  const lines = markdown.split('\n').length;
  const currentLineCount = lineNumbers.childElementCount;

  // 如果行数没有变化，不更新
  if (lines === currentLineCount) {
    return;
  }

  // 使用DocumentFragment批量更新
  const fragment = document.createDocumentFragment();
  for (let i = 1; i <= lines; i++) {
    const span = document.createElement('span');
    span.className = 'line-number';
    span.textContent = i;
    fragment.appendChild(span);
  }
  lineNumbers.innerHTML = '';
  lineNumbers.appendChild(fragment);
}

// 生成并复制分享链接
function shareLink() {
  const markdown = editor.value.trim();
  if (!markdown) {
    showToast('请先输入 Markdown 内容', 'error');
    return;
  }

  const encoded = encodeData(markdown);
  if (!encoded) {
    showToast('编码失败，内容可能过大', 'error');
    return;
  }

  const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;

  // 检查 URL 长度
  if (url.length > 8000) {
    showToast('警告：链接较长，某些浏览器可能无法正常访问', 'error');
  }

  // 复制到剪贴板
  navigator.clipboard
    .writeText(url)
    .then(() => {
      showToast('分享链接已复制到剪贴板！');
    })
    .catch(() => {
      // 降级方案
      prompt('请复制以下链接：', url);
    });
}

// 导出 HTML
async function exportHtml() {
  const markdown = editor.value.trim();
  if (!markdown) {
    showToast('没有可导出的内容', 'error');
    return;
  }

  // 检测当前主题
  const isLightTheme = document.body.classList.contains('light-theme');

  // 根据主题设置样式变量
  const themeStyles = isLightTheme
    ? {
        bgPrimary: '#ffffff',
        bgSecondary: '#f6f8fa',
        bgTertiary: '#eaeef2',
        textPrimary: '#24292f',
        textSecondary: '#57606a',
        accentColor: '#0969da',
        accentHover: '#218bff',
        accentBg: 'rgba(9, 105, 218, 0.1)',
        borderColor: '#d0d7de',
        preBg: '#f6f8fa',
        codeBg: 'rgba(9, 105, 218, 0.1)',
        codeColor: '#0969da',
      }
    : {
        bgPrimary: '#0d1117',
        bgSecondary: '#161b22',
        bgTertiary: '#21262d',
        textPrimary: '#e6edf3',
        textSecondary: '#8b949e',
        accentColor: '#58a6ff',
        accentHover: '#79c0ff',
        accentBg: 'rgba(88, 166, 255, 0.15)',
        borderColor: '#30363d',
        preBg: '#161b22',
        codeBg: 'rgba(88, 166, 255, 0.15)',
        codeColor: '#58a6ff',
      };

  // 先解析 Markdown
  let html = marked.parse(markdown);

  // 创建临时容器来处理 Mermaid 图表和图片
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // 处理图片路径：将相对路径转换为绝对路径
  const images = tempDiv.querySelectorAll('img');
  images.forEach((img) => {
    const src = img.getAttribute('src');
    if (
      src &&
      !src.startsWith('http://') &&
      !src.startsWith('https://') &&
      !src.startsWith('data:')
    ) {
      // 相对路径转换为绝对路径
      img.setAttribute(
        'src',
        new URL(src, window.location.origin + window.location.pathname).href,
      );
    }
  });

  // 查找所有 mermaid 代码块
  const mermaidElements = tempDiv.querySelectorAll('.mermaid');

  if (mermaidElements.length > 0) {
    showToast('正在渲染图表...', 'success');

    // 渲染所有 Mermaid 图表
    const renderPromises = Array.from(mermaidElements).map(
      async (element, index) => {
        const code = element.textContent.trim();
        const id = `mermaid-export-${Date.now()}-${index}`;

        try {
          const result = await mermaid.render(id, code);
          if (typeof result === 'string') {
            element.innerHTML = result;
          } else if (result && result.svg) {
            element.innerHTML = result.svg;
          }
        } catch (err) {
          element.innerHTML = `<pre style="color: #f14c4c;">图表渲染失败：${err.message || err}</pre>`;
        }
      },
    );

    // 等待所有图表渲染完成
    await Promise.all(renderPromises);
  }

  // 获取处理后的 HTML
  html = tempDiv.innerHTML;

  const exportHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown 导出</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 24px 32px;
            line-height: 1.6;
            background-color: ${themeStyles.bgPrimary};
            color: ${themeStyles.textPrimary};
        }
        .content-wrapper {
            max-width: ${parseInt(localStorage.getItem('markdown-preview-width')) || 70}%;
            margin: 0 auto;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 28px;
            margin-bottom: 16px;
            font-weight: 600;
            line-height: 1.25;
            color: ${themeStyles.textPrimary};
        }
        h1 {
            font-size: 2em;
            padding-bottom: 10px;
            border-bottom: 1px solid ${themeStyles.borderColor};
        }
        h2 {
            font-size: 1.5em;
            padding-bottom: 8px;
            border-bottom: 1px solid ${themeStyles.borderColor};
        }
        h3 {
            font-size: 1.25em;
        }
        h4 {
            font-size: 1.1em;
        }
        p {
            margin-bottom: 16px;
            color: ${themeStyles.textPrimary};
        }
        a {
            color: ${themeStyles.accentColor};
            text-decoration: none;
            transition: color 0.2s ease;
        }
        a:hover {
            color: ${themeStyles.accentHover};
            text-decoration: underline;
        }
        code {
            background-color: ${themeStyles.codeBg};
            color: ${themeStyles.codeColor};
            padding: 2px 6px;
            border-radius: 4px;
            font-family: 'SF Mono', 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 0.9em;
        }
        pre {
            background-color: ${themeStyles.preBg};
            padding: 16px;
            border-radius: 10px;
            overflow-x: auto;
            margin-bottom: 20px;
            border: 1px solid ${themeStyles.borderColor};
        }
        pre code {
            background-color: transparent;
            padding: 0;
            color: ${themeStyles.textPrimary};
        }
        blockquote {
            border-left: 3px solid ${themeStyles.accentColor};
            padding-left: 16px;
            margin: 20px 0;
            color: ${themeStyles.textSecondary};
            font-style: italic;
        }
        ul, ol {
            margin-bottom: 16px;
            padding-left: 24px;
        }
        li {
            margin-bottom: 6px;
            color: ${themeStyles.textPrimary};
        }
        table {
            border-collapse: collapse;
            width: 100%;
            margin-bottom: 20px;
            border-radius: 10px;
            overflow: hidden;
        }
        th, td {
            border: 1px solid ${themeStyles.borderColor};
            padding: 10px 14px;
            text-align: left;
        }
        th {
            background-color: ${themeStyles.bgSecondary};
            font-weight: 600;
            color: ${themeStyles.textPrimary};
        }
        tr:nth-child(even) {
            background-color: ${themeStyles.bgSecondary};
        }
        img {
            max-width: 100%;
            height: auto;
            border-radius: 10px;
        }
        hr {
            border: none;
            border-top: 1px solid ${themeStyles.borderColor};
            margin: 28px 0;
        }
        .mermaid {
            text-align: center;
            margin: 24px 0;
            background-color: ${themeStyles.bgSecondary};
            padding: 20px;
            border-radius: 10px;
            border: 1px solid ${themeStyles.borderColor};
        }
        .mermaid svg {
            max-width: 100%;
            height: auto;
        }
    </style>
</head>
<body>
    <div class="content-wrapper">
        ${html}
    </div>
</body>
</html>`;

  const blob = new Blob([exportHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'markdown-export.html';
  a.click();
  URL.revokeObjectURL(url);

  showToast('HTML 文件已导出');
}

// 显示 Toast 提示
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = 'toast show';
  if (type === 'error') {
    toast.classList.add('error');
  }

  setTimeout(() => {
    toast.className = 'toast';
  }, 3000);
}

// 切换模式
function toggleMode() {
  isPreviewMode = !isPreviewMode;
  document.body.classList.toggle('preview-mode', isPreviewMode);

  // 更新按钮图标
  if (isPreviewMode) {
    modeToggle.querySelector('.icon').innerHTML = `
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    `;
  } else {
    modeToggle.querySelector('.icon').innerHTML = `
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    `;
  }

  // 保存模式偏好
  localStorage.setItem(
    'markdown-preview-mode',
    isPreviewMode ? 'preview' : 'edit',
  );
}

// 加载模式
function loadMode() {
  const params = new URLSearchParams(window.location.search);
  const hasData = params.get('data');

  const savedMode = localStorage.getItem('markdown-preview-mode');

  // 从链接进入时，默认预览模式
  if (hasData) {
    isPreviewMode = true;
    document.body.classList.add('preview-mode');
    modeToggle.querySelector('.icon').innerHTML = `
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    `;
  } else if (savedMode === 'preview') {
    // 非链接进入，但保存了预览模式
    isPreviewMode = true;
    document.body.classList.add('preview-mode');
    modeToggle.querySelector('.icon').innerHTML = `
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
    `;
  } else {
    // 默认编辑模式
    isPreviewMode = false;
    document.body.classList.remove('preview-mode');
    modeToggle.querySelector('.icon').innerHTML = `
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    `;
  }
}

// 切换主题
function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const isLight = document.body.classList.contains('light-theme');

  // 更新 Mermaid 主题
  mermaid.initialize({
    theme: isLight ? 'default' : 'dark',
    themeVariables: {
      darkMode: !isLight,
      background: isLight ? '#ffffff' : '#252526',
      primaryColor: '#007acc',
      primaryTextColor: isLight ? '#333333' : '#d4d4d4',
      primaryBorderColor: isLight ? '#d4d4d4' : '#3e3e42',
      lineColor: isLight ? '#666666' : '#858585',
      secondaryColor: isLight ? '#f3f3f3' : '#2d2d30',
      tertiaryColor: isLight ? '#e8e8e8' : '#1e1e1e',
    },
  });

  // 重新渲染预览
  updatePreview();

  // 保存主题偏好
  localStorage.setItem('markdown-preview-theme', isLight ? 'light' : 'dark');

  // 更新按钮图标（显示将要切换到的主题）
  if (isLight) {
    themeToggle.querySelector('.icon').innerHTML = `
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    `;
  } else {
    themeToggle.querySelector('.icon').innerHTML = `
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2"/>
      <path d="M12 20v2"/>
      <path d="m4.93 4.93 1.41 1.41"/>
      <path d="m17.66 17.66 1.41 1.41"/>
      <path d="M2 12h2"/>
      <path d="M20 12h2"/>
      <path d="m6.34 17.66-1.41 1.41"/>
      <path d="m19.07 4.93-1.41 1.41"/>
    `;
  }
}

// 加载主题
function loadTheme() {
  const savedTheme = localStorage.getItem('markdown-preview-theme');
  // 默认使用白天主题
  if (savedTheme !== 'dark') {
    document.body.classList.add('light-theme');
    themeToggle.querySelector('.icon').innerHTML = `
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
    `;
  }
}

// 显示模板选择器
function showTemplateModal() {
  templateList.innerHTML = '';

  templates.forEach((template, index) => {
    const item = document.createElement('div');
    item.className = 'template-item';
    item.innerHTML = `
            <h3>${template.name}</h3>
            <p>${template.description}</p>
        `;
    item.addEventListener('click', () => loadTemplate(index));
    templateList.appendChild(item);
  });

  templateModal.classList.add('show');
}

// 加载模板
function loadTemplate(index) {
  const template = templates[index];
  editor.value = template.content;
  updatePreview();
  templateModal.classList.remove('show');
  showToast(`已加载模板：${template.name}`);
}

// 清空内容
function clearContent() {
  if (confirm('确定要清空所有内容吗？')) {
    editor.value = '';
    updatePreview();
    showToast('内容已清空');
  }
}

// 绑定事件
function bindEvents() {
  // 编辑器输入事件
  editor.addEventListener('input', (e) => {
    // 如果不是撤销/重做操作，保存到撤销栈
    if (!isUndoRedoOperation) {
      saveToUndoStack();
    }
    updatePreview(e);
  });

  // 编辑器滚动同步到预览区和行号
  editor.addEventListener('scroll', () => {
    if (!isSyncingScroll) {
      isSyncingScroll = true;
      const scrollPercentage =
        editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
      preview.scrollTop =
        scrollPercentage * (preview.scrollHeight - preview.clientHeight);
      // 同步行号滚动
      lineNumbers.scrollTop = editor.scrollTop;
      setTimeout(() => {
        isSyncingScroll = false;
      }, 50);
    }
  });

  // 预览区滚动同步到编辑器（仅在预览模式下启用）
  preview.addEventListener('scroll', () => {
    // 编辑模式下禁用预览区到编辑器的滚动同步
    if (isPreviewMode && !isSyncingScroll) {
      isSyncingScroll = true;
      const scrollPercentage =
        preview.scrollTop / (preview.scrollHeight - preview.clientHeight);
      editor.scrollTop =
        scrollPercentage * (editor.scrollHeight - editor.clientHeight);
      setTimeout(() => {
        isSyncingScroll = false;
      }, 50);
    }
  });

  // 快捷键
  editor.addEventListener('keydown', (e) => {
    // Tab键阻止默认行为，防止焦点移出编辑器
    if (e.key === 'Tab') {
      e.preventDefault();
      // 插入两个空格
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      const value = editor.value;
      editor.value = value.substring(0, start) + '  ' + value.substring(end);
      editor.selectionStart = editor.selectionEnd = start + 2;
      updatePreview();
      return;
    }
    // Ctrl+Z 撤销
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    // Ctrl+Y 或 Ctrl+Shift+Z 重做
    if (
      (e.ctrlKey && e.key === 'y') ||
      (e.ctrlKey && e.shiftKey && e.key === 'Z')
    ) {
      e.preventDefault();
      redo();
    }
    // Ctrl+S 保存到本地
    if (e.ctrlKey && e.key === 's') {
      e.preventDefault();
      saveToLocalStorage();
      showToast('已保存到本地');
    }
    // Ctrl+Enter 刷新预览
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      updatePreview();
    }
  });

  // 主题切换
  themeToggle.addEventListener('click', toggleTheme);

  // 加载模板
  loadTemplateBtn.addEventListener('click', showTemplateModal);

  // 清空内容
  clearBtn.addEventListener('click', clearContent);

  // 分享链接
  shareLinkBtn.addEventListener('click', shareLink);

  // 导出 HTML
  exportHtmlBtn.addEventListener('click', exportHtml);

  // 关闭模态框
  closeModalBtn.addEventListener('click', () => {
    templateModal.classList.remove('show');
  });

  // 点击模态框外部关闭
  templateModal.addEventListener('click', (e) => {
    if (e.target === templateModal) {
      templateModal.classList.remove('show');
    }
  });

  // 模式切换
  modeToggle.addEventListener('click', toggleMode);

  // 目录切换
  tocToggle.addEventListener('click', toggleToc);
  tocClose.addEventListener('click', toggleToc);

  // 预览区滚动时更新激活的目录项
  preview.addEventListener('scroll', () => {
    if (!isSyncingScroll) {
      updateActiveTocItem();
    }
  });

  // 加载保存的主题
  loadTheme();

  // 加载保存的模式
  loadMode();

  // 加载目录显示状态
  loadTocState();

  // 加载预览宽度设置
  loadPreviewWidth();

  // 初始化自动补全
  initAutocomplete();
}

// ==================== 自动补全功能 ====================

// Markdown 语法补全数据
const markdownSuggestions = {
  // 代码块触发器
  '```': {
    group: '代码块',
    items: [
      {
        icon: '📝',
        title: 'JavaScript',
        desc: 'JavaScript 代码块',
        insert: 'javascript\n// 在此输入代码\n```',
      },
      {
        icon: '🐍',
        title: 'Python',
        desc: 'Python 代码块',
        insert: 'python\n# 在此输入代码\n```',
      },
      {
        icon: '🌐',
        title: 'HTML',
        desc: 'HTML 代码块',
        insert: 'html\n<!-- 在此输入代码 -->\n```',
      },
      {
        icon: '🎨',
        title: 'CSS',
        desc: 'CSS 代码块',
        insert: 'css\n/* 在此输入代码 */\n```',
      },
      {
        icon: '☕',
        title: 'Java',
        desc: 'Java 代码块',
        insert: 'java\n// 在此输入代码\n```',
      },
      {
        icon: '🔷',
        title: 'TypeScript',
        desc: 'TypeScript 代码块',
        insert: 'typescript\n// 在此输入代码\n```',
      },
      {
        icon: '📊',
        title: 'Mermaid',
        desc: 'Mermaid 图表',
        insert: 'mermaid\ngraph TD\n    A[开始] --> B[结束]\n```',
      },
      {
        icon: '📄',
        title: 'JSON',
        desc: 'JSON 数据',
        insert: 'json\n{\n  "key": "value"\n}\n```',
      },
      {
        icon: '🔧',
        title: 'Bash',
        desc: 'Bash 脚本',
        insert: 'bash\n# 在此输入命令\n```',
      },
      {
        icon: '📋',
        title: 'Markdown',
        desc: 'Markdown 代码块',
        insert: 'markdown\n# 在此输入 Markdown\n```',
      },
      {
        icon: '🔤',
        title: '纯文本',
        desc: '纯文本代码块',
        insert: 'text\n在此输入文本\n```',
      },
      {
        icon: '📊',
        title: 'SQL',
        desc: 'SQL 查询',
        insert: 'sql\nSELECT * FROM table;\n```',
      },
    ],
  },
  // 标题触发器
  '#': {
    group: '标题',
    items: [
      { icon: 'H1', title: '一级标题', desc: '# 标题', insert: '# ' },
      { icon: 'H2', title: '二级标题', desc: '## 标题', insert: '## ' },
      { icon: 'H3', title: '三级标题', desc: '### 标题', insert: '### ' },
      { icon: 'H4', title: '四级标题', desc: '#### 标题', insert: '#### ' },
      { icon: 'H5', title: '五级标题', desc: '##### 标题', insert: '##### ' },
      { icon: 'H6', title: '六级标题', desc: '###### 标题', insert: '###### ' },
    ],
  },
  // 列表触发器
  '-': {
    group: '列表',
    items: [
      { icon: '•', title: '无序列表', desc: '- 项目', insert: '- ' },
      { icon: '1.', title: '有序列表', desc: '1. 项目', insert: '1. ' },
      { icon: '✓', title: '任务列表', desc: '- [ ] 任务', insert: '- [ ] ' },
      { icon: '✓', title: '已完成任务', desc: '- [x] 任务', insert: '- [x] ' },
    ],
  },
  // 文本格式触发器
  '*': {
    group: '文本格式',
    items: [
      { icon: 'B', title: '粗体', desc: '**粗体**', insert: '**粗体**' },
      { icon: 'I', title: '斜体', desc: '*斜体*', insert: '*斜体*' },
      { icon: 'S', title: '删除线', desc: '~~删除线~~', insert: '~~删除线~~' },
      { icon: 'C', title: '行内代码', desc: '`代码`', insert: '`代码`' },
      { icon: 'H', title: '高亮', desc: '==高亮==', insert: '==高亮==' },
    ],
  },
  // 引用触发器
  '>': {
    group: '引用',
    items: [
      { icon: '❝', title: '引用', desc: '> 引用内容', insert: '> ' },
      { icon: '❝❝', title: '嵌套引用', desc: '> > 嵌套引用', insert: '> > ' },
    ],
  },
  // 链接和图片触发器
  '[': {
    group: '链接与图片',
    items: [
      { icon: '🔗', title: '链接', desc: '[文本](url)', insert: '[文本](url)' },
      { icon: '🖼️', title: '图片', desc: '![alt](url)', insert: '![alt](url)' },
      {
        icon: '📎',
        title: '引用链接',
        desc: '[文本][ref]',
        insert: '[文本][ref]',
      },
    ],
  },
  // 表格触发器
  '|': {
    group: '表格',
    items: [
      {
        icon: '📊',
        title: '表格',
        desc: 'Markdown 表格',
        insert:
          '| 列1 | 列2 | 列3 |\n|-----|-----|-----|\n| 内容 | 内容 | 内容 |',
      },
    ],
  },
  // 分隔线触发器
  '-': {
    group: '分隔线',
    items: [
      { icon: '—', title: '分隔线', desc: '---', insert: '---' },
      { icon: '***', title: '分隔线', desc: '***', insert: '***' },
    ],
  },
  // 其他触发器
  '!': {
    group: '其他',
    items: [
      { icon: '🖼️', title: '图片', desc: '![alt](url)', insert: '![alt](url)' },
    ],
  },
};

// 初始化自动补全
function initAutocomplete() {
  // 监听输入事件
  editor.addEventListener('input', handleEditorInput);

  // 监听键盘事件
  editor.addEventListener('keydown', handleEditorKeydown);

  // 监听点击事件，点击外部关闭补全
  document.addEventListener('click', (e) => {
    if (
      autocompleteVisible &&
      !autocomplete.contains(e.target) &&
      e.target !== editor
    ) {
      hideAutocomplete();
    }
  });
}

// 处理编辑器输入
function handleEditorInput(e) {
  const cursorPosition = editor.selectionStart;
  const textBeforeCursor = editor.value.substring(0, cursorPosition);

  // 检查是否触发补全
  const trigger = checkAutocompleteTrigger(textBeforeCursor);

  if (trigger) {
    autocompleteTrigger = trigger;
    showAutocomplete(trigger, cursorPosition);
  } else {
    hideAutocomplete();
  }
}

// 检查是否触发补全
function checkAutocompleteTrigger(text) {
  // 检查代码块触发器 ```
  if (text.endsWith('```')) {
    return '```';
  }

  // 检查标题触发器 #
  const hashMatch = text.match(/(^|\n)#{1,6}$/);
  if (hashMatch) {
    return '#';
  }

  // 检查列表触发器 - 或 *
  const listMatch = text.match(/(^|\n)[\-\*]$/);
  if (listMatch) {
    return '-';
  }

  // 检查数字列表触发器
  const numListMatch = text.match(/(^|\n)\d+\.$/);
  if (numListMatch) {
    return '-';
  }

  // 检查文本格式触发器 * 或 _
  const formatMatch = text.match(/(^|\s)[\*_]{1,2}$/);
  if (formatMatch) {
    return '*';
  }

  // 检查引用触发器 >
  const quoteMatch = text.match(/(^|\n)>$/);
  if (quoteMatch) {
    return '>';
  }

  // 检查链接触发器 [
  if (text.endsWith('[')) {
    return '[';
  }

  // 检查表格触发器 |
  if (text.endsWith('|')) {
    return '|';
  }

  // 检查图片触发器 !
  if (text.endsWith('!')) {
    return '!';
  }

  return null;
}

// 显示自动补全
function showAutocomplete(trigger, cursorPosition) {
  const suggestions = markdownSuggestions[trigger];
  if (!suggestions || !suggestions.items || suggestions.items.length === 0) {
    hideAutocomplete();
    return;
  }

  autocompleteItems = suggestions.items;
  activeAutocompleteIndex = -1;

  // 构建补全列表HTML
  let html = `<div class="autocomplete-group">${suggestions.group}</div>`;

  autocompleteItems.forEach((item, index) => {
    html += `
      <div class="autocomplete-item" data-index="${index}">
        <span class="autocomplete-item-icon">${item.icon}</span>
        <div class="autocomplete-item-content">
          <div class="autocomplete-item-title">${item.title}</div>
          <div class="autocomplete-item-desc">${item.desc}</div>
        </div>
        <span class="autocomplete-item-preview">${escapeHtml(item.insert.substring(0, 20))}${item.insert.length > 20 ? '...' : ''}</span>
      </div>
    `;
  });

  autocomplete.innerHTML = html;

  // 计算位置
  const position = getCursorPositionPosition(cursorPosition);
  autocomplete.style.top = `${position.top + 20}px`;
  autocomplete.style.left = `${position.left}px`;

  // 显示补全框
  autocomplete.classList.remove('hidden');
  autocompleteVisible = true;

  // 绑定点击事件
  autocomplete.querySelectorAll('.autocomplete-item').forEach((item) => {
    item.addEventListener('click', () => {
      const index = parseInt(item.dataset.index);
      insertAutocompleteItem(index);
    });
  });
}

// 隐藏自动补全
function hideAutocomplete() {
  autocomplete.classList.add('hidden');
  autocompleteVisible = false;
  autocompleteItems = [];
  activeAutocompleteIndex = -1;
}

// 获取光标在编辑器中的像素位置
function getCursorPositionPosition(cursorPosition) {
  const textBeforeCursor = editor.value.substring(0, cursorPosition);
  const lines = textBeforeCursor.split('\n');
  const currentLine = lines.length - 1;
  const currentColumn = lines[lines.length - 1].length;

  // 计算行高和字符宽度
  const lineHeight = 20.8; // 1.6 * 13px
  const charWidth = 7.8; // 近似值

  const top = currentLine * lineHeight - editor.scrollTop;
  const left = currentColumn * charWidth + 68; // 68px 是行号宽度 + padding

  return { top, left };
}

// 处理键盘事件
function handleEditorKeydown(e) {
  if (!autocompleteVisible) {
    return;
  }

  // 上下箭头选择
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeAutocompleteIndex = Math.min(
      activeAutocompleteIndex + 1,
      autocompleteItems.length - 1,
    );
    updateActiveAutocompleteItem();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeAutocompleteIndex = Math.max(activeAutocompleteIndex - 1, 0);
    updateActiveAutocompleteItem();
  } else if (e.key === 'Enter') {
    // 回车确认选择
    e.preventDefault();
    if (activeAutocompleteIndex >= 0) {
      insertAutocompleteItem(activeAutocompleteIndex);
    } else {
      hideAutocomplete();
    }
  } else if (e.key === 'Escape') {
    // ESC 关闭补全
    e.preventDefault();
    hideAutocomplete();
  } else if (e.key === 'Tab') {
    // Tab 确认选择
    e.preventDefault();
    if (activeAutocompleteIndex >= 0) {
      insertAutocompleteItem(activeAutocompleteIndex);
    } else {
      insertAutocompleteItem(0);
    }
  }
}

// 更新激活的补全项
function updateActiveAutocompleteItem() {
  const items = autocomplete.querySelectorAll('.autocomplete-item');
  items.forEach((item, index) => {
    if (index === activeAutocompleteIndex) {
      item.classList.add('active');
      item.scrollIntoView({ block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
}

// 插入补全项
function insertAutocompleteItem(index) {
  const item = autocompleteItems[index];
  if (!item) return;

  const cursorPosition = editor.selectionStart;
  const textBeforeCursor = editor.value.substring(0, cursorPosition);
  const textAfterCursor = editor.value.substring(cursorPosition);

  // 计算需要删除的触发器长度
  let triggerLength = 0;
  let keepTrigger = false;

  if (autocompleteTrigger === '```') {
    // 代码块：保留反引号，只插入语言类型
    triggerLength = 0;
    keepTrigger = true;
  } else if (autocompleteTrigger === '#') {
    const hashMatch = textBeforeCursor.match(/#{1,6}$/);
    triggerLength = hashMatch ? hashMatch[0].length : 1;
  } else if (autocompleteTrigger === '-') {
    const listMatch = textBeforeCursor.match(/[\-\*]$/);
    triggerLength = listMatch ? 1 : 0;
  } else if (autocompleteTrigger === '*') {
    const formatMatch = textBeforeCursor.match(/[\*_]{1,2}$/);
    triggerLength = formatMatch ? formatMatch[0].length : 1;
  } else if (autocompleteTrigger === '>') {
    triggerLength = 1;
  } else if (autocompleteTrigger === '[') {
    triggerLength = 1;
  } else if (autocompleteTrigger === '|') {
    triggerLength = 1;
  } else if (autocompleteTrigger === '!') {
    triggerLength = 1;
  }

  // 删除触发器并插入补全内容
  let newText;
  if (keepTrigger) {
    // 保留触发器，只插入内容
    newText = textBeforeCursor + item.insert + textAfterCursor;
  } else {
    newText =
      textBeforeCursor.substring(0, textBeforeCursor.length - triggerLength) +
      item.insert +
      textAfterCursor;
  }
  editor.value = newText;

  // 设置新的光标位置
  const newCursorPosition =
    textBeforeCursor.length - triggerLength + item.insert.length;
  editor.setSelectionRange(newCursorPosition, newCursorPosition);

  // 隐藏补全框
  hideAutocomplete();

  // 更新预览
  updatePreview();

  // 聚焦编辑器
  editor.focus();
}

// ==================== 撤销/重做功能 ====================

// 保存到撤销栈
function saveToUndoStack() {
  const currentState = {
    value: editor.value,
    selectionStart: editor.selectionStart,
    selectionEnd: editor.selectionEnd,
  };

  // 避免重复保存相同状态
  if (undoStack.length > 0) {
    const lastState = undoStack[undoStack.length - 1];
    if (
      lastState.value === currentState.value &&
      lastState.selectionStart === currentState.selectionStart &&
      lastState.selectionEnd === currentState.selectionEnd
    ) {
      return;
    }
  }

  undoStack.push(currentState);

  // 限制栈大小
  if (undoStack.length > maxHistorySize) {
    undoStack.shift();
  }

  // 清空重做栈
  redoStack = [];
}

// 撤销
function undo() {
  if (undoStack.length <= 1) {
    showToast('没有可撤销的操作', 'error');
    return;
  }

  // 保存当前状态到重做栈
  const currentState = {
    value: editor.value,
    selectionStart: editor.selectionStart,
    selectionEnd: editor.selectionEnd,
  };
  redoStack.push(currentState);

  // 弹出当前状态
  undoStack.pop();

  // 恢复上一个状态
  const previousState = undoStack[undoStack.length - 1];
  isUndoRedoOperation = true;
  editor.value = previousState.value;
  editor.setSelectionRange(
    previousState.selectionStart,
    previousState.selectionEnd,
  );
  isUndoRedoOperation = false;

  updatePreview();
  showToast('已撤销');
}

// 重做
function redo() {
  if (redoStack.length === 0) {
    showToast('没有可重做的操作', 'error');
    return;
  }

  // 弹出重做栈顶的状态
  const nextState = redoStack.pop();

  // 保存到撤销栈
  undoStack.push(nextState);

  // 恢复状态
  isUndoRedoOperation = true;
  editor.value = nextState.value;
  editor.setSelectionRange(nextState.selectionStart, nextState.selectionEnd);
  isUndoRedoOperation = false;

  updatePreview();
  showToast('已重做');
}

// ==================== 目录功能 ====================

// 生成目录
function generateTableOfContents() {
  const headings = preview.querySelectorAll('h1, h2, h3, h4, h5, h6');

  if (headings.length === 0) {
    tocContent.innerHTML =
      '<div style="padding: 16px; color: var(--text-muted); font-size: 13px;">暂无目录</div>';
    return;
  }

  let tocHtml = '';
  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent.trim();
    const id = `heading-${index}`;

    // 为标题添加 ID
    heading.id = id;

    // 生成目录项
    tocHtml += `
      <a class="toc-item toc-level-${level}" data-target="${id}" title="${escapeHtml(text)}">
        ${escapeHtml(text)}
      </a>
    `;
  });

  tocContent.innerHTML = tocHtml;

  // 绑定目录项点击事件
  tocContent.querySelectorAll('.toc-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.dataset.target;
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// 切换目录显示/隐藏
function toggleToc() {
  toc.classList.toggle('hidden');

  // 保存目录显示状态
  const isHidden = toc.classList.contains('hidden');
  localStorage.setItem('markdown-preview-toc-hidden', isHidden);
}

// 加载目录显示状态
function loadTocState() {
  const isHidden =
    localStorage.getItem('markdown-preview-toc-hidden') === 'true';
  if (isHidden) {
    toc.classList.add('hidden');
  }
}

// 更新当前激活的目录项
function updateActiveTocItem() {
  const headings = preview.querySelectorAll('h1, h2, h3, h4, h5, h6');
  const tocItems = tocContent.querySelectorAll('.toc-item');

  if (headings.length === 0 || tocItems.length === 0) return;

  let activeIndex = -1;
  const scrollPosition = preview.scrollTop + 100; // 偏移量，提前激活

  headings.forEach((heading, index) => {
    if (heading.offsetTop <= scrollPosition) {
      activeIndex = index;
    }
  });

  // 更新激活状态
  tocItems.forEach((item, index) => {
    if (index === activeIndex) {
      item.classList.add('active');
      // 确保激活项在可视区域内
      item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      item.classList.remove('active');
    }
  });
}

// ==================== 预览宽度控制 ====================

// 更新预览宽度
function updatePreviewWidth(width) {
  preview.style.maxWidth = `${width}%`;
  widthLabel.textContent = `${width}%`;
  widthSlider.value = width;

  // 保存宽度设置
  localStorage.setItem('markdown-preview-width', width);
}

// 加载预览宽度设置
function loadPreviewWidth() {
  const savedWidth = localStorage.getItem('markdown-preview-width');
  const width = savedWidth ? parseInt(savedWidth) : 70;
  updatePreviewWidth(width);
}

// 绑定宽度滑块事件
widthSlider.addEventListener('input', (e) => {
  const width = parseInt(e.target.value);
  updatePreviewWidth(width);
});
