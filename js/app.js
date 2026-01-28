// 全局变量
let currentUrl = '';
let debounceTimer;
let charCountDebounceTimer;
let isSyncingScroll = false;
let isPreviewMode = true;

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

## 功能特点

- 📝 在线编辑 Markdown
- 👁️ 实时预览渲染结果
- 🔗 生成分享链接
- 🎨 支持 Mermaid 图表
- 💻 代码语法高亮
- 🌙 深色/浅色主题

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
      // 渲染 Markdown
      let html;
      try {
        html = marked.parse(markdown);
      } catch (e) {
        html = `<p style="color: #f14c4c;">Markdown 解析失败：${e.message}</p>`;
      }
      preview.innerHTML = html;

      // 渲染 Mermaid 图表（延迟执行，避免阻塞）
      setTimeout(() => {
        const mermaidElements = preview.querySelectorAll('.mermaid');
        if (mermaidElements.length > 0) {
          mermaidElements.forEach((element) => {
            const code = element.textContent.trim();
            const id =
              'mermaid-' +
              Date.now() +
              '-' +
              Math.random().toString(36).substr(2, 9);

            mermaid
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
          });
        }

        // 代码高亮（延迟执行，避免阻塞）
        if (typeof hljs !== 'undefined') {
          preview.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
          });
        }
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
function exportHtml() {
  const markdown = editor.value.trim();
  if (!markdown) {
    showToast('没有可导出的内容', 'error');
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown 导出</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        pre {
            background: #f5f5f5;
            padding: 16px;
            border-radius: 4px;
            overflow-x: auto;
        }
        code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
        }
        table {
            border-collapse: collapse;
            width: 100%;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
        }
        blockquote {
            border-left: 4px solid #007acc;
            padding-left: 16px;
            color: #666;
        }
    </style>
</head>
<body>
${marked.parse(markdown)}
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
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

  // 更新按钮文本和图标
  if (isPreviewMode) {
    modeText.textContent = '编辑';
    modeToggle.querySelector('.icon').textContent = '✏️';
  } else {
    modeText.textContent = '预览';
    modeToggle.querySelector('.icon').textContent = '👁️';
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
    modeText.textContent = '编辑';
    modeToggle.querySelector('.icon').textContent = '✏️';
  } else if (savedMode === 'preview') {
    // 非链接进入，但保存了预览模式
    isPreviewMode = true;
    document.body.classList.add('preview-mode');
    modeText.textContent = '编辑';
    modeToggle.querySelector('.icon').textContent = '✏️';
  } else {
    // 默认编辑模式
    isPreviewMode = false;
    document.body.classList.remove('preview-mode');
    modeText.textContent = '预览';
    modeToggle.querySelector('.icon').textContent = '👁️';
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
  themeToggle.querySelector('.icon').textContent = isLight ? '🌙' : '☀️';
}

// 加载主题
function loadTheme() {
  const savedTheme = localStorage.getItem('markdown-preview-theme');
  if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    themeToggle.querySelector('.icon').textContent = '🌙';
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
  editor.addEventListener('input', updatePreview);

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

  // 预览区滚动同步到编辑器
  preview.addEventListener('scroll', () => {
    if (!isSyncingScroll) {
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

  // 加载保存的主题
  loadTheme();

  // 加载保存的模式
  loadMode();
}
