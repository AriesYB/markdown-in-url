import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { marked } from 'marked';
import mermaid from 'mermaid';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import html from 'highlight.js/lib/languages/xml';
import css from 'highlight.js/lib/languages/css';
import bash from 'highlight.js/lib/languages/bash';
import json from 'highlight.js/lib/languages/json';
import sql from 'highlight.js/lib/languages/sql';
import 'highlight.js/styles/github-dark.css';
import './Preview.css';
import TableOfContents from './TableOfContents';

// 注册语言
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('html', html);
hljs.registerLanguage('css', css);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('json', json);
hljs.registerLanguage('sql', sql);

// HTML 转义函数
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export default function Preview({
  markdown,
  isDarkTheme,
  width,
  onScroll,
  onHeadingClick,
  isTocVisible,
  previewRef,
}) {
  const { t } = useTranslation();
  const [headings, setHeadings] = useState([]);
  const [activeHeadingId, setActiveHeadingId] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const contentRef = useRef(null);

  const closeImagePreview = () => {
    setPreviewImage(null);
  };

  // 初始化 Mermaid
  useEffect(() => {
    mermaid.initialize({
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
  }, [isDarkTheme]);

  // 初始化 Marked
  useEffect(() => {
    const renderer = new marked.Renderer();

    renderer.code = function (token) {
      const code = token.text || '';
      const language = token.lang || '';

      if (language === 'mermaid') {
        return `<div class="mermaid">${code}</div>`;
      }
      return `<pre><code class="language-${language || 'plaintext'}">${escapeHtml(code)}</code></pre>`;
    };

    // 自定义图片渲染器 - 使用默认渲染器并添加包装
    const defaultImage = new marked.Renderer().image;
    renderer.image = function (href, title, text) {
      try {
        const defaultHtml = defaultImage.call(this, href, title, text);
        // 检测是否为徽章图片（shields.io 或类似服务）
        // marked v5+ 中 href 可能是对象，需要提取实际的 URL 字符串
        const hrefStr = typeof href === 'string' ? href : href?.href || '';
        const titleStr = typeof title === 'string' ? title : '';
        const isBadge =
          hrefStr.includes('shields.io') ||
          hrefStr.includes('img.shields.io') ||
          titleStr.toLowerCase().includes('badge');
        const wrapperClass = isBadge
          ? 'markdown-badge-wrapper'
          : 'markdown-image-wrapper';
        return `<span class="${wrapperClass}">${defaultHtml}</span>`;
      } catch (error) {
        // 如果自定义渲染失败，回退到默认渲染
        console.warn('图片渲染失败，使用默认渲染:', error);
        return defaultImage.call(this, href, title, text);
      }
    };

    // 自定义段落渲染器 - 检测只包含徽章的段落，使用 inline 样式
    const defaultParagraph = new marked.Renderer().paragraph;
    renderer.paragraph = function (text) {
      try {
        // 确保 text 是字符串
        const textStr = typeof text === 'string' ? text : String(text);
        // 检测段落是否只包含徽章图片（可能多个）
        const badgePattern = /<span class="markdown-badge-wrapper">/g;
        const matches = textStr.match(badgePattern);
        const totalLength = textStr.replace(/<[^>]*>/g, '').trim().length;

        // 如果段落只包含徽章图片（没有其他文本内容）
        if (matches && matches.length > 0 && totalLength === 0) {
          return `<p class="markdown-badge-paragraph">${textStr}</p>`;
        }
        return defaultParagraph.call(this, text);
      } catch (error) {
        // 如果自定义渲染失败，回退到默认渲染
        console.warn('段落渲染失败，使用默认渲染:', error);
        return defaultParagraph.call(this, text);
      }
    };

    marked.setOptions({
      renderer,
      breaks: true,
      gfm: true,
    });

    // 扩展tokenizer以支持中文标点符号的加粗
    marked.use({
      extensions: [
        {
          name: 'chineseStrong',
          level: 'inline',
          start(src) {
            return src.indexOf('**');
          },
          tokenizer(src) {
            // 匹配 **...** 格式，支持中文标点符号
            const match = src.match(/^\*\*([^*]+?)\*\*/);
            if (match) {
              return {
                type: 'chineseStrong',
                raw: match[0],
                text: match[1],
              };
            }
          },
          renderer(token) {
            return `<strong>${token.text}</strong>`;
          },
        },
      ],
    });
  }, []);

  // 渲染 Markdown
  useEffect(() => {
    if (!contentRef.current) return;

    let html;
    try {
      // 预处理：将中文引号替换为英文引号，避免干扰加粗语法
      const processedMarkdown = markdown.replace(/"/g, '"').replace(/"/g, '"');
      html = marked.parse(processedMarkdown);
    } catch (e) {
      html = `<p style="color: #f14c4c;">Markdown 解析失败：${e.message}</p>`;
    }

    contentRef.current.innerHTML = html;

    // 生成目录
    const headingElements = contentRef.current.querySelectorAll(
      'h1, h2, h3, h4, h5, h6',
    );
    const newHeadings = Array.from(headingElements).map((heading, index) => {
      const id = `heading-${index}`;
      heading.id = id;
      return {
        id,
        level: parseInt(heading.tagName.charAt(1)),
        text: heading.textContent.trim(),
      };
    });
    setHeadings(newHeadings);

    // 渲染 Mermaid 图表（等待所有渲染完成）
    const mermaidElements = contentRef.current.querySelectorAll('.mermaid');
    const mermaidRenderPromises = [];
    if (mermaidElements.length > 0) {
      mermaidElements.forEach((element) => {
        const code = element.textContent.trim();
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const renderPromise = (async () => {
          try {
            const result = await mermaid.render(id, code);
            if (typeof result === 'string') {
              element.innerHTML = result;
            } else if (result && result.svg) {
              element.innerHTML = result.svg;
            } else {
              element.innerHTML = `<pre style="color: #f14c4c;">图表渲染失败：无法解析结果</pre>`;
            }
          } catch (err) {
            element.innerHTML = `<pre style="color: #f14c4c;">图表渲染失败：${err.message || err}</pre>`;
          }
        })();
        mermaidRenderPromises.push(renderPromise);
      });
    }

    // 等待所有Mermaid渲染完成后再进行代码高亮和样式设置
    Promise.all(mermaidRenderPromises).then(() => {
      // 代码高亮
      contentRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block);
      });

      // 为所有图片添加cursor样式
      const allImages = contentRef.current.querySelectorAll('img');
      allImages.forEach((img) => {
        img.style.cursor = 'pointer';
      });

      // 为所有SVG添加cursor样式
      const svgs = contentRef.current.querySelectorAll(
        '.markdown-image-wrapper svg, .mermaid svg',
      );
      svgs.forEach((svg) => {
        svg.style.cursor = 'pointer';
      });
    });
  }, [markdown, isDarkTheme]);

  // 处理图片和SVG点击预览 - 使用独立的useEffect管理事件监听器
  useEffect(() => {
    if (!contentRef.current) return;

    const handleClick = (e) => {
      const target = e.target;

      // 处理img标签点击
      if (target.tagName === 'IMG') {
        e.preventDefault();
        e.stopPropagation();
        setPreviewImage(target.src);
        return;
      }

      // 处理内嵌SVG点击 - 使用closest查找SVG元素（因为点击的可能是SVG内部的子元素）
      const svgElement = target.closest('svg');
      if (svgElement) {
        const wrapper = svgElement.closest('.markdown-image-wrapper');
        const mermaidContainer = svgElement.closest('.mermaid');

        if (wrapper || mermaidContainer) {
          e.preventDefault();
          e.stopPropagation();
          // 将SVG转换为data URL用于预览
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const svgBlob = new Blob([svgData], {
            type: 'image/svg+xml;charset=utf-8',
          });
          const url = URL.createObjectURL(svgBlob);
          setPreviewImage(url);
          return;
        }
      }
    };

    // 添加事件监听器
    contentRef.current.addEventListener('click', handleClick);

    // cleanup函数：移除事件监听器
    return () => {
      if (contentRef.current) {
        contentRef.current.removeEventListener('click', handleClick);
      }
    };
  }, [markdown, isDarkTheme]);

  // 处理滚动
  const handleScroll = useCallback(() => {
    if (!previewRef.current) return;
    onScroll(previewRef.current.scrollTop);

    // 更新激活的目录项
    const scrollPosition = previewRef.current.scrollTop + 100;
    let activeIndex = -1;

    headings.forEach((heading, index) => {
      const element = document.getElementById(heading.id);
      if (element && element.offsetTop <= scrollPosition) {
        activeIndex = index;
      }
    });

    if (activeIndex >= 0 && headings[activeIndex]) {
      const newActiveId = headings[activeIndex].id;
      setActiveHeadingId(newActiveId);
    }
  }, [headings, onScroll, onHeadingClick, previewRef]);

  return (
    <div className="preview-container">
      <div className="panel-header">
        <button
          className="btn btn-secondary toc-toggle"
          onClick={() => onHeadingClick('toggle')}
          title="显示/隐藏目录"
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
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
        <div className="width-control">
          <span className="width-label">{width}%</span>
          <input
            type="range"
            className="width-slider"
            min="50"
            max="100"
            value={width}
            step="5"
            title="调节预览宽度"
            onChange={(e) => onHeadingClick(`width:${e.target.value}`)}
          />
        </div>
      </div>
      <div className="preview-wrapper">
        <TableOfContents
          headings={headings}
          activeId={activeHeadingId}
          onHeadingClick={onHeadingClick}
          isVisible={!isTocVisible}
        />
        <div ref={previewRef} className="preview" onScroll={handleScroll}>
          <div
            ref={contentRef}
            className="preview-content"
            style={{ maxWidth: `${width}%` }}
          />
        </div>
      </div>

      {/* 图片预览模态框 */}
      {previewImage && (
        <div className="image-preview-modal" onClick={closeImagePreview}>
          <button className="image-preview-close" onClick={closeImagePreview}>
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            src={previewImage}
            alt="预览"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
