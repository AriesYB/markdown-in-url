import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useDebounce } from './hooks/useDebounce';
import { useUploadManager } from './hooks/useUploadManager';
import { encodeData, decodeData } from './utils/encoding';
import { exportMarkdownAsZip, hasBase64Images } from './utils/exportHelper';
import { templates } from './data/templates';
import {
  createContentShortCode,
  getCloudflareConfig,
  isCloudflareConfigured,
  loadContentFromShortCode,
  API_CONFIG,
} from './utils/cloudflareAPI';
import {
  getShortLinkConfig,
  cacheShortLinkContent,
  getCachedShortLinkContent,
} from './components/Settings';
import Editor from './components/Editor';
import Preview from './components/Preview';
import TemplateModal from './components/TemplateModal';
import Settings from './components/Settings';
import UploadProgress from './components/UploadProgress';
import Toast from './components/Toast';
import LanguageSwitcher from './components/LanguageSwitcher';
import './App.css';
import iconSvg from '/img/icon.svg';

// HTML 转义函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 默认欢迎内容（将在组件内部使用 t() 函数动态生成）
const getDefaultContent = (t) => `# ${t('app.welcome')}

${t('app.welcomeDescription')}

[关于本项目的更多介绍](https://markdown-in-url.pages.dev/?source=https://raw.githubusercontent.com/AriesYB/markdown-in-url/refs/heads/master/README.md)

## ${t('app.features')}

- 📝 ${t('app.feature1')}
- 👁️ ${t('app.feature2')}
- 🔗 **${t('app.feature3')}**
- 🎨 ${t('app.feature4')}

## ${t('app.mermaidExamples')}

### ${t('app.flowchart')}

\`\`\`mermaid
graph TD
    A[开始] --> B{判断条件}
    B -->|是| C[执行操作A]
    B -->|否| D[执行操作B]
    C --> E[结束]
    D --> E
\`\`\`

### ${t('app.sequenceDiagram')}

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

## ${t('app.gettingStarted')}

1. ${t('app.gettingStarted1')}
2. ${t('app.gettingStarted2')}
3. ${t('app.gettingStarted3')}
4. ${t('app.gettingStarted4')}

---
${t('app.templateHint')}
`;

export default function App() {
  const { t, i18n } = useTranslation();

  // 动态更新网页标题
  useEffect(() => {
    const title = t('app.title');
    const suffix = t('app.titleSuffix');
    document.title = `${title} - ${suffix}`;
  }, [t, i18n.language]);

  // 生成默认欢迎内容
  const defaultContent = getDefaultContent(t);

  // 撤销/重做（作为主要状态，支持持久化）
  const {
    value: markdown,
    setValue: setMarkdown,
    undo,
    redo,
    canUndo,
    canRedo,
    isRestored,
    cursorPosition,
    scrollPosition,
  } = useUndoRedo(defaultContent, 50, 'markdown-undo-history');

  // 状态管理
  const [isDarkTheme, setIsDarkTheme] = useLocalStorage(
    'markdown-preview-theme',
    false,
  );
  const [isPreviewMode, setIsPreviewMode] = useLocalStorage(
    'markdown-preview-mode',
    false,
  );
  const [previewWidth, setPreviewWidth] = useLocalStorage(
    'markdown-preview-width',
    70,
  );
  const [isTocVisible, setIsTocVisible] = useLocalStorage(
    'markdown-preview-toc-hidden',
    false,
  );
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showImageUploadSettings, setShowImageUploadSettings] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toast, setToast] = useState(null);
  const [isGeneratingShortUrl, setIsGeneratingShortUrl] = useState(false);
  const [pendingPasteImage, setPendingPasteImage] = useState(null);

  // 滚动同步
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const isSyncingScroll = useRef(false);
  const editorScrollPosition = useRef(0);
  const previewScrollPosition = useRef(0);

  // 菜单 refs
  const exportMenuRef = useRef(null);
  const shareMenuRef = useRef(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(event.target)
      ) {
        setShowExportMenu(false);
      }
      if (
        shareMenuRef.current &&
        !shareMenuRef.current.contains(event.target)
      ) {
        setShowShareMenu(false);
      }
    };

    if (showExportMenu || showShareMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportMenu, showShareMenu]);

  // 防抖处理
  const debouncedMarkdown = useDebounce(markdown, 300);

  // 图床上传管理
  const uploadManager = useUploadManager();

  // 显示 Toast
  const showToast = useCallback(
    (message, type = 'success', duration = 3000) => {
      setToast({ message, type, duration });
    },
    [],
  );

  // 从远程 URL 加载
  const loadFromSource = useCallback(
    async (sourceUrl) => {
      try {
        showToast(t('app.loadingRemote'), 'success');

        const response = await fetch(sourceUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const content = await response.text();
        setMarkdown(content);
        showToast(t('app.loadedFromRemote'));
      } catch (error) {
        console.error('加载远程内容失败:', error);
        const errorContent = `# ${t('app.loadFailedTitle')}

${t('app.cannotLoadFromRemote')}

**${t('app.errorMessage')}** ${error.message}

## ${t('app.possibleCauses')}

1. ${t('app.cause1')}
2. ${t('app.cause2')}
3. ${t('app.cause3')}

## ${t('app.solutions')}

- ${t('app.solution1')}
- ${t('app.solution2')}
- ${t('app.solution3')}

---

${t('app.manualCopyHint')}`;
        setMarkdown(errorContent);
        showToast(t('app.loadFailed'), 'error');
      }
    },
    [showToast, t],
  );

  // 从短码加载内容
  const loadFromShortCode = useCallback(
    async (code) => {
      // 优先从本地缓存读取
      const cachedContent = getCachedShortLinkContent(code);
      if (cachedContent) {
        console.log('从本地缓存加载短链接内容:', code);
        setMarkdown(cachedContent);
        setIsPreviewMode(true);
        showToast(t('app.loadedFromCache'), 'success');
        return;
      }

      // 缓存不存在，调用后端接口
      try {
        showToast(t('app.loadingFromServer'), 'success');
        const content = await loadContentFromShortCode(code);

        // 缓存内容到本地存储
        cacheShortLinkContent(code, content);

        setMarkdown(content);
        setIsPreviewMode(true);
        showToast(t('app.loadedFromServer'));
      } catch (error) {
        console.error('从短码加载内容失败:', error);

        const errorContent = `# ${t('app.loadFailedTitle')}

${t('app.cannotLoadFromShortLink')}

**${t('app.errorMessage')}** ${error.message}

## ${t('app.possibleCauses')}

1. ${t('app.shortLinkCause1')}
2. ${t('app.shortLinkCause2')}
3. ${t('app.shortLinkCause3')}

## ${t('app.solutions')}

- ${t('app.shortLinkSolution1')}
- ${t('app.shortLinkSolution2')}
- ${t('app.shortLinkSolution3')}

---

${t('app.manualCopyHint')}`;
        setMarkdown(errorContent);
        showToast(t('app.shortLinkLoadFailed'), 'error');
      }
    },
    [showToast, t],
  );

  // 从 URL 加载内容
  useEffect(() => {
    // 检查是否是短链接路径 (例如: /s/aB3xY9)
    const pathname = window.location.pathname;
    const shortCodeMatch = pathname.match(/^\/s\/([a-zA-Z0-9]+)$/);

    if (shortCodeMatch) {
      const code = shortCodeMatch[1];
      loadFromShortCode(code);
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const data = params.get('data');
    const source = params.get('source');
    const content = params.get('content');

    if (source) {
      loadFromSource(source);
      setIsPreviewMode(true);
      return;
    }

    if (content) {
      // 从短链接重定向来的内容
      try {
        const decoded = decodeURIComponent(content);
        setMarkdown(decoded);
        setIsPreviewMode(true);
        showToast(t('app.loadedFromShortLink'));
      } catch (error) {
        showToast(t('app.loadFailed'), 'error');
      }
      return;
    }

    if (data) {
      const decoded = decodeData(data);
      if (decoded) {
        setMarkdown(decoded);
        setIsPreviewMode(true);
        showToast(t('app.loadedFromUrl'));
      } else {
        showToast(t('app.decodeFailed'), 'error');
      }
    } else {
      // 从本地存储加载（仅在未从 useUndoRedo 恢复时）
      if (!isRestored) {
        const saved = localStorage.getItem('markdown-preview-content');
        if (saved) {
          setMarkdown(saved);
          showToast(t('app.restoredFromStorage'));
        }
      } else {
        showToast(t('app.restoredFromStorageWithHistory'));
      }
    }
  }, [showToast, isRestored, loadFromShortCode, loadFromSource, t]);

  // 保存到本地存储
  useEffect(() => {
    localStorage.setItem('markdown-preview-content', markdown);
  }, [debouncedMarkdown]);

  // 处理编辑器内容变化
  const handleEditorChange = useCallback(
    (newValue, cursorPos, scrollPos) => {
      setMarkdown(newValue, cursorPos, scrollPos);
    },
    [setMarkdown],
  );

  // 处理编辑器滚动
  const handleEditorScroll = useCallback((scrollTop) => {
    if (!isSyncingScroll.current && editorRef.current && previewRef.current) {
      isSyncingScroll.current = true;

      // 计算滚动百分比
      const editor = editorRef.current;
      const scrollPercentage =
        scrollTop / (editor.scrollHeight - editor.clientHeight);

      // 同步到预览区
      const preview = previewRef.current;
      preview.scrollTop =
        scrollPercentage * (preview.scrollHeight - preview.clientHeight);

      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  }, []);

  // 处理预览区滚动
  const handlePreviewScroll = useCallback((scrollTop) => {
    if (!isSyncingScroll.current && previewRef.current && editorRef.current) {
      isSyncingScroll.current = true;

      // 计算滚动百分比
      const preview = previewRef.current;
      const scrollPercentage =
        scrollTop / (preview.scrollHeight - preview.clientHeight);

      // 同步到编辑器（移除 isPreviewMode 限制，始终同步）
      const editor = editorRef.current;
      editor.scrollTop =
        scrollPercentage * (editor.scrollHeight - editor.clientHeight);

      requestAnimationFrame(() => {
        isSyncingScroll.current = false;
      });
    }
  }, []);

  // 切换主题
  const toggleTheme = useCallback(() => {
    setIsDarkTheme((prev) => !prev);
  }, [setIsDarkTheme]);

  // 切换模式
  const toggleMode = useCallback(() => {
    // 保存当前滚动位置
    if (editorRef.current) {
      editorScrollPosition.current = editorRef.current.scrollTop;
    }
    if (previewRef.current) {
      previewScrollPosition.current = previewRef.current.scrollTop;
    }

    setIsPreviewMode((prev) => !prev);

    // 恢复编辑区滚动位置
    requestAnimationFrame(() => {
      if (editorRef.current && editorScrollPosition.current > 0) {
        editorRef.current.scrollTop = editorScrollPosition.current;
      }
    });
  }, [setIsPreviewMode]);

  // 加载模板
  const handleLoadTemplate = useCallback(
    (index) => {
      const template = templates[index];
      setMarkdown(template.content);
      setShowTemplateModal(false);
      showToast(t('app.templateLoaded', { name: template.name }));
    },
    [setMarkdown, t],
  );

  // 清空内容
  const handleClear = useCallback(() => {
    if (confirm(t('app.confirmClear'))) {
      setMarkdown('');
      showToast(t('app.contentCleared'));
    }
  }, [setMarkdown, t]);

  // 生成分享链接
  const handleShareLink = useCallback(() => {
    const trimmed = markdown.trim();
    if (!trimmed) {
      showToast(t('app.enterMarkdownFirst'), 'error');
      return;
    }

    const encoded = encodeData(trimmed);
    if (!encoded) {
      showToast(t('app.encodeFailed'), 'error');
      return;
    }

    const url = `${window.location.origin}${window.location.pathname}?data=${encoded}`;

    if (url.length > 8000) {
      showToast(t('app.linkTooLongWarning'), 'error');
    }

    navigator.clipboard
      .writeText(url)
      .then(() => {
        showToast(t('app.linkCopied'));
      })
      .catch(() => {
        prompt(t('app.copyLink'), url);
      });
  }, [markdown, showToast, t]);

  // 生成短链接
  const handleShortUrl = useCallback(async () => {
    const trimmed = markdown.trim();
    if (!trimmed) {
      showToast(t('app.enterMarkdownFirst'), 'error');
      return;
    }

    // 获取短链接配置
    const shortLinkConfig = getShortLinkConfig();

    setIsGeneratingShortUrl(true);
    try {
      // 先压缩数据
      const encoded = encodeData(trimmed);
      if (!encoded) {
        showToast(t('app.encodeFailed'), 'error');
        return;
      }

      const code = await createContentShortCode(encoded, shortLinkConfig.ttl); // 使用配置的过期时间
      // 使用前端域名生成短链接
      const shortUrl = `${API_CONFIG.allowedDomain}/s/${code}`;

      // 计算过期时间描述
      const ttlHours = shortLinkConfig.ttl;
      let ttlText = '';
      if (ttlHours >= 720) {
        ttlText = t('app.months', { count: Math.floor(ttlHours / 720) });
      } else if (ttlHours >= 168) {
        ttlText = t('app.weeks', { count: Math.floor(ttlHours / 168) });
      } else if (ttlHours >= 24) {
        ttlText = t('app.days', { count: Math.floor(ttlHours / 24) });
      } else {
        ttlText = t('app.hours', { count: ttlHours });
      }

      navigator.clipboard
        .writeText(shortUrl)
        .then(() => {
          // 根据有效期设置不同的显示时长
          const toastDuration = ttlHours >= 168 ? 5000 : 3000;
          showToast(
            t('app.shortLinkCopied', { ttl: ttlText }),
            'success',
            toastDuration,
          );
        })
        .catch(() => {
          prompt(t('app.copyShortLink'), shortUrl);
        });
    } catch (error) {
      console.error('生成短链接失败:', error);
      showToast(
        t('app.shortLinkGenerateFailed', { message: error.message }),
        'error',
      );
    } finally {
      setIsGeneratingShortUrl(false);
    }
  }, [markdown, showToast, t]);

  // 生成默认文件名
  const generateFileName = useCallback(
    (extension) => {
      // 尝试从 markdown 中提取第一个标题
      const titleMatch = markdown.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        const title = titleMatch[1].trim();
        // 清理文件名中的非法字符
        const cleanTitle = title.replace(/[<>:"/\\|?*]/g, '-');
        return `${cleanTitle}.${extension}`;
      }
      // 如果没有标题，使用日期时间
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      return `markdown-${dateStr}-${timeStr}.${extension}`;
    },
    [markdown],
  );

  // 导出 HTML
  const handleExportHtml = useCallback(async () => {
    const trimmed = markdown.trim();
    if (!trimmed) {
      showToast(t('app.nothingToExport'), 'error');
      return;
    }

    showToast(t('app.renderingCharts'), 'success');

    const themeStyles = isDarkTheme
      ? {
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
        }
      : {
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
        };

    const { marked } = await import('marked');
    const mermaid = await import('mermaid');

    // 初始化 mermaid
    mermaid.default.initialize({
      startOnLoad: false,
      theme: isDarkTheme ? 'dark' : 'default',
      securityLevel: 'loose',
      themeVariables: {
        darkMode: isDarkTheme,
        background: isDarkTheme ? '#252526' : '#ffffff',
        primaryColor: '#007acc',
        primaryTextColor: isDarkTheme ? '#d4d4d4' : '#333333',
        primaryBorderColor: isDarkTheme ? '#3e3e42' : '#d4d4d4',
        lineColor: isDarkTheme ? '#858585' : '#666666',
        secondaryColor: isDarkTheme ? '#2d2d30' : '#f3f3f3',
        tertiaryColor: isDarkTheme ? '#1e1e1e' : '#e8e8e8',
      },
    });

    // 自定义代码块渲染器
    const renderer = new marked.Renderer();
    renderer.code = function (token) {
      const code = token.text || '';
      const language = token.lang || '';

      if (language === 'mermaid') {
        return `<div class="mermaid">${code}</div>`;
      }
      return `<pre><code class="language-${language || 'plaintext'}">${escapeHtml(code)}</code></pre>`;
    };

    marked.setOptions({
      renderer,
      breaks: true,
      gfm: true,
    });

    // 先解析 Markdown
    let html = marked.parse(trimmed);

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
      // 渲染所有 Mermaid 图表
      const renderPromises = Array.from(mermaidElements).map(
        async (element, index) => {
          const code = element.textContent.trim();
          const id = `mermaid-export-${Date.now()}-${index}`;

          try {
            const result = await mermaid.default.render(id, code);
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

    const exportHtmlContent = `<!DOCTYPE html>
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
            max-width: ${previewWidth}%;
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

    const blob = new Blob([exportHtmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = generateFileName('html');
    a.click();
    URL.revokeObjectURL(url);

    showToast(t('app.htmlExported'));
  }, [markdown, isDarkTheme, previewWidth, generateFileName, t]);

  // 导出 Markdown
  const handleExportMarkdown = useCallback(async () => {
    const trimmed = markdown.trim();
    if (!trimmed) {
      showToast(t('app.nothingToExport'), 'error');
      return;
    }

    // 检查是否包含 base64 图片
    if (hasBase64Images(trimmed)) {
      // 导出为压缩包
      const fileName = generateFileName('md').replace('.md', '');
      await exportMarkdownAsZip(trimmed, fileName);
      setShowExportMenu(false);
      showToast(t('app.exportedAsZip'));
    } else {
      // 普通导出
      const blob = new Blob([trimmed], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = generateFileName('md');
      a.click();
      URL.revokeObjectURL(url);

      setShowExportMenu(false);
      showToast(t('app.markdownExported'));
    }
  }, [markdown, generateFileName, showToast, t]);

  // 处理文件导入
  const handleFileImport = useCallback(
    (file) => {
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        setMarkdown(content);
        showToast(t('app.fileImported', { name: file.name }));
      };
      reader.onerror = () => {
        showToast(t('app.fileReadFailed'), 'error');
      };
      reader.readAsText(file);
    },
    [setMarkdown, t],
  );

  // 处理拖拽上传
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        if (file.name.endsWith('.md') || file.type === 'text/markdown') {
          handleFileImport(file);
        } else {
          showToast(t('app.uploadMdFile'), 'error');
        }
      }
    },
    [handleFileImport, t],
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  // 处理目录点击
  const handleHeadingClick = useCallback(
    (action) => {
      if (action === 'toggle') {
        setIsTocVisible((prev) => !prev);
      } else if (action === null) {
        // 关闭目录
        setIsTocVisible(false);
      } else if (typeof action === 'string' && action.startsWith('width:')) {
        const width = parseInt(action.split(':')[1]);
        setPreviewWidth(width);
      } else if (action) {
        const element = document.getElementById(action);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    },
    [setIsTocVisible, setPreviewWidth],
  );

  return (
    <div
      className={`app ${isDarkTheme ? 'dark-theme' : 'light-theme'} ${isPreviewMode ? 'preview-mode' : ''}`}
    >
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <h1 className="logo">
            <img
              src={iconSvg}
              alt="logo"
              width="32"
              height="32"
              style={{ verticalAlign: 'middle', marginRight: '8px' }}
            />
            {t('app.title')}
          </h1>
        </div>
        <div className="header-right">
          <button
            className="btn btn-secondary"
            onClick={toggleMode}
            title={t('app.toggleMode')}
          >
            <svg
              className="icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isPreviewMode ? (
                <>
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </>
              ) : (
                <>
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </>
              )}
            </svg>
          </button>
          <button
            className="btn btn-secondary"
            onClick={toggleTheme}
            title={t('app.toggleTheme')}
          >
            <svg
              className="icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {isDarkTheme ? (
                <>
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </>
              )}
            </svg>
          </button>
          {/* 分享菜单 */}
          <div className="export-dropdown" ref={shareMenuRef}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowShareMenu(!showShareMenu)}
              title={t('app.share')}
            >
              <svg
                className="icon"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="url(#linkGradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <defs>
                  <linearGradient
                    id="linkGradient"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="100%"
                  >
                    <stop
                      offset="0%"
                      style={{ stopColor: '#22d3ee', stopOpacity: 1 }}
                    />
                    <stop
                      offset="100%"
                      style={{ stopColor: '#3b82f6', stopOpacity: 1 }}
                    />
                  </linearGradient>
                </defs>
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </button>
            {showShareMenu && (
              <div className="export-menu">
                <button
                  className="export-menu-item"
                  onClick={() => {
                    handleShareLink();
                    setShowShareMenu(false);
                  }}
                >
                  <svg
                    className="icon"
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                  {t('app.permanentLink')}
                </button>
                <button
                  className="export-menu-item"
                  onClick={() => {
                    handleShortUrl();
                    setShowShareMenu(false);
                  }}
                  disabled={isGeneratingShortUrl}
                >
                  {isGeneratingShortUrl ? (
                    <>
                      <svg
                        className="icon spinning"
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      {t('app.generating')}
                    </>
                  ) : (
                    <>
                      <svg
                        className="icon"
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1" />
                      </svg>
                      {t('app.temporaryLink')}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          {/* 导出按钮 */}
          <div className="export-dropdown" ref={exportMenuRef}>
            <button
              className="btn btn-secondary"
              onClick={() => setShowExportMenu(!showExportMenu)}
              title={t('app.export')}
            >
              <svg
                className="icon"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" x2="12" y1="3" y2="15" />
              </svg>
            </button>
            {showExportMenu && (
              <div className="export-menu">
                <button
                  className="export-menu-item"
                  onClick={handleExportMarkdown}
                >
                  <svg
                    className="icon"
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                  </svg>
                  {t('app.exportMarkdown')}
                </button>
                <button
                  className="export-menu-item"
                  onClick={() => {
                    handleExportHtml();
                    setShowExportMenu(false);
                  }}
                >
                  <svg
                    className="icon"
                    viewBox="0 0 24 24"
                    width="14"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" x2="8" y1="13" y2="13" />
                    <line x1="16" x2="8" y1="17" y2="17" />
                    <line x1="10" x2="8" y1="9" y2="9" />
                  </svg>
                  {t('app.exportHtml')}
                </button>
              </div>
            )}
          </div>
          <input
            id="file-input"
            type="file"
            accept=".md,.markdown,text/markdown"
            style={{ display: 'none' }}
            onChange={(e) => handleFileImport(e.target.files[0])}
          />
          {/* 设置按钮 */}
          <button
            className="btn btn-secondary"
            onClick={() => setShowImageUploadSettings(true)}
            title={t('app.settings')}
          >
            <svg
              className="icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
          <a
            href="https://github.com/AriesYB/markdown-in-url"
            target="_blank"
            className="btn btn-secondary github-link"
            title={t('app.githubRepo')}
          >
            <svg
              className="icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
            >
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`main ${isDragging ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Editor */}
        {!isPreviewMode && (
          <Editor
            value={markdown}
            onChange={handleEditorChange}
            onScroll={handleEditorScroll}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
            onShowTemplateModal={() => setShowTemplateModal(true)}
            onClear={handleClear}
            onFileImport={handleFileImport}
            editorRef={editorRef}
            uploadManager={uploadManager}
            onShowImageUploadSettings={() => setShowImageUploadSettings(true)}
            pendingPasteImage={pendingPasteImage}
            onClearPendingPasteImage={() => setPendingPasteImage(null)}
            onSetPendingPasteImage={setPendingPasteImage}
            cursorPosition={cursorPosition}
            scrollPosition={scrollPosition}
          />
        )}

        {/* Preview */}
        <Preview
          markdown={markdown}
          isDarkTheme={isDarkTheme}
          width={previewWidth}
          onScroll={handlePreviewScroll}
          onHeadingClick={handleHeadingClick}
          isTocVisible={!isTocVisible}
          previewRef={previewRef}
        />
      </main>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Template Modal */}
      <TemplateModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onSelect={handleLoadTemplate}
      />

      {/* Settings Modal */}
      <Settings
        isOpen={showImageUploadSettings}
        onClose={() => setShowImageUploadSettings(false)}
        onConfigChange={() => {
          // 配置更改后可以刷新相关状态
        }}
      />

      {/* Upload Progress */}
      <UploadProgress
        uploads={uploadManager.uploads}
        onCancelUpload={uploadManager.cancelUpload}
      />
    </div>
  );
}
