import { useState, useRef, useEffect, useCallback } from 'react';
import { markdownSuggestions } from '../data/autocomplete';
import {
  uploadImage,
  fileToBase64,
  isImageUploadConfigured,
} from '../utils/imageUpload';
import Autocomplete from './Autocomplete';
import './Editor.css';

export default function Editor({
  value,
  onChange,
  onScroll,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onShowTemplateModal,
  onClear,
  onFileImport,
  editorRef,
  uploadManager,
  onShowImageUploadSettings,
}) {
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const [autocomplete, setAutocomplete] = useState({
    visible: false,
    items: [],
    group: '',
    activeIndex: -1,
    trigger: '',
    position: { top: 0, left: 0 },
  });

  // 插入自动补全项
  const insertAutocompleteItem = useCallback(
    (index) => {
      const item = autocomplete.items[index];
      if (!item) return;

      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPosition = textarea.selectionStart;
      const textBeforeCursor = value.substring(0, cursorPosition);
      const textAfterCursor = value.substring(cursorPosition);

      let triggerLength = 0;
      let keepTrigger = false;

      if (autocomplete.trigger === '```') {
        triggerLength = 0;
        keepTrigger = true;
      } else if (autocomplete.trigger === '#') {
        const hashMatch = textBeforeCursor.match(/#{1,6}$/);
        triggerLength = hashMatch ? hashMatch[0].length : 1;
      } else if (autocomplete.trigger === '-') {
        const listMatch = textBeforeCursor.match(/[-*]$/);
        triggerLength = listMatch ? 1 : 0;
      } else if (autocomplete.trigger === '*') {
        const formatMatch = textBeforeCursor.match(/[*_]{1,2}$/);
        triggerLength = formatMatch ? formatMatch[0].length : 1;
      } else if (autocomplete.trigger === '>') {
        triggerLength = 1;
      } else if (autocomplete.trigger === '[') {
        triggerLength = 1;
      } else if (autocomplete.trigger === '|') {
        triggerLength = 1;
      } else if (autocomplete.trigger === '!') {
        triggerLength = 1;
      } else if (autocomplete.trigger === '---') {
        triggerLength = 3;
      }

      let newText;
      if (keepTrigger) {
        newText = textBeforeCursor + item.insert + textAfterCursor;
      } else {
        newText =
          textBeforeCursor.substring(
            0,
            textBeforeCursor.length - triggerLength,
          ) +
          item.insert +
          textAfterCursor;
      }

      onChange(newText);

      const newCursorPosition =
        textBeforeCursor.length - triggerLength + item.insert.length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPosition;

      setAutocomplete((prev) => ({ ...prev, visible: false }));
      textarea.focus();
    },
    [autocomplete.items, autocomplete.trigger, value, onChange],
  );

  // 暴露 textarea ref 给父组件
  useEffect(() => {
    if (editorRef) {
      editorRef.current = textareaRef.current;
    }
  }, [editorRef]);

  // 更新行号
  useEffect(() => {
    const lines = value.split('\n').length;
    const currentLineCount = lineNumbersRef.current?.childElementCount || 0;

    if (lines !== currentLineCount) {
      const fragment = document.createDocumentFragment();
      for (let i = 1; i <= lines; i++) {
        const span = document.createElement('span');
        span.className = 'line-number';
        span.textContent = i;
        fragment.appendChild(span);
      }
      if (lineNumbersRef.current) {
        lineNumbersRef.current.innerHTML = '';
        lineNumbersRef.current.appendChild(fragment);
      }
    }
  }, [value]);

  // 检查自动补全触发器
  const checkAutocompleteTrigger = useCallback((text) => {
    if (text.endsWith('```')) return '```';
    const hashMatch = text.match(/(^|\n)#{1,6}$/);
    if (hashMatch) return '#';
    const listMatch = text.match(/(^|\n)[-*]$/);
    if (listMatch) return '-';
    const numListMatch = text.match(/(^|\n)\d+\.$/);
    if (numListMatch) return '-';
    const formatMatch = text.match(/(^|\s)[*_]{1,2}$/);
    if (formatMatch) return '*';
    const quoteMatch = text.match(/(^|\n)>$/);
    if (quoteMatch) return '>';
    if (text.endsWith('[')) return '[';
    if (text.endsWith('|')) return '|';
    if (text.endsWith('!')) return '!';
    if (text.endsWith('---')) return '---';
    return null;
  }, []);

  // 获取光标位置
  const getCursorPositionPosition = useCallback(
    (cursorPosition) => {
      const textBeforeCursor = value.substring(0, cursorPosition);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines.length - 1;
      const currentColumn = lines[lines.length - 1].length;

      const lineHeight = 20.8;
      const charWidth = 7.8;

      const top =
        currentLine * lineHeight - (textareaRef.current?.scrollTop || 0);
      const left = currentColumn * charWidth + 68;

      return { top, left };
    },
    [value],
  );

  // 处理输入
  const handleInput = useCallback(
    (e) => {
      const newValue = e.target.value;
      onChange(newValue);

      const cursorPosition = e.target.selectionStart;
      const textBeforeCursor = newValue.substring(0, cursorPosition);
      const trigger = checkAutocompleteTrigger(textBeforeCursor);

      if (trigger) {
        const suggestions = markdownSuggestions[trigger];
        if (suggestions && suggestions.items) {
          setAutocomplete({
            visible: true,
            items: suggestions.items,
            group: suggestions.group,
            activeIndex: -1,
            trigger,
            position: getCursorPositionPosition(cursorPosition),
          });
        }
      } else {
        setAutocomplete((prev) => ({ ...prev, visible: false }));
      }
    },
    [onChange, checkAutocompleteTrigger, getCursorPositionPosition],
  );

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e) => {
      if (!autocomplete.visible) {
        // Tab键处理（非自动补全时）
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = e.target.selectionStart;
          const end = e.target.selectionEnd;
          const newValue =
            value.substring(0, start) + '  ' + value.substring(end);
          onChange(newValue);
          e.target.selectionStart = e.target.selectionEnd = start + 2;
        }
        // Ctrl+Z 撤销
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          onUndo();
        }
        // Ctrl+Y 或 Ctrl+Shift+Z 重做
        if (
          (e.ctrlKey || e.metaKey) &&
          (e.key === 'y' || (e.key === 'z' && e.shiftKey))
        ) {
          e.preventDefault();
          onRedo();
        }
        // Ctrl+S 保存到本地
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          localStorage.setItem('markdown-preview-content', value);
        }
        return;
      }

      // 自动补全时的键盘处理
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocomplete((prev) => ({
          ...prev,
          activeIndex: Math.min(prev.activeIndex + 1, prev.items.length - 1),
        }));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocomplete((prev) => ({
          ...prev,
          activeIndex: Math.max(prev.activeIndex - 1, 0),
        }));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (autocomplete.activeIndex >= 0) {
          insertAutocompleteItem(autocomplete.activeIndex);
        } else {
          setAutocomplete((prev) => ({ ...prev, visible: false }));
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setAutocomplete((prev) => ({ ...prev, visible: false }));
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (autocomplete.activeIndex >= 0) {
          insertAutocompleteItem(autocomplete.activeIndex);
        } else {
          insertAutocompleteItem(0);
        }
      }
    },
    [
      autocomplete.visible,
      autocomplete.activeIndex,
      autocomplete.items,
      onUndo,
      onRedo,
      onChange,
      value,
      insertAutocompleteItem,
    ],
  );

  // 处理滚动
  const handleScroll = useCallback(
    (e) => {
      onScroll(e.target.scrollTop);
      if (lineNumbersRef.current) {
        lineNumbersRef.current.scrollTop = e.target.scrollTop;
      }
    },
    [onScroll],
  );

  // 点击外部关闭自动补全
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        autocomplete.visible &&
        !e.target.closest('.autocomplete') &&
        e.target !== textareaRef.current
      ) {
        setAutocomplete((prev) => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [autocomplete.visible]);

  // 粘贴图片处理
  const handlePaste = useCallback(
    (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      if (!clipboardData) return;

      const items = clipboardData.items;
      if (!items) return;

      // 查找剪贴板中的图片
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();

          // 检查图床是否已设置
          if (!isImageUploadConfigured()) {
            onShowImageUploadSettings?.();
            return;
          }

          const file = item.getAsFile();
          if (!file) return;

          const textarea = textareaRef.current;
          if (!textarea) return;

          const cursorPosition = textarea.selectionStart;
          const textBeforeCursor = value.substring(0, cursorPosition);
          const textAfterCursor = value.substring(cursorPosition);

          // 检查光标前是否有换行，如果没有则添加
          const needsNewline =
            textBeforeCursor && !textBeforeCursor.endsWith('\n');
          const prefix = needsNewline ? '\n' : '';

          // 使用图床上传
          if (uploadManager) {
            const uploadId = uploadManager.addUpload(file.name || '粘贴图片');

            uploadImage(file, (loaded, total) => {
              uploadManager.updateUploadProgress(uploadId, loaded, total);
            })
              .then(({ url, method, markdown }) => {
                // 如果是 Cloudflare Workers API，直接使用返回的 markdown
                let imageMarkdown;
                if (method === 'cf-worker' && markdown) {
                  imageMarkdown = `${prefix}${markdown}`;
                } else {
                  imageMarkdown = `${prefix}![粘贴图片](${url})`;
                }
                const newText =
                  textBeforeCursor + imageMarkdown + textAfterCursor;
                onChange(newText);
                uploadManager.completeUpload(uploadId, true);

                // 设置光标位置到图片后面
                const newCursorPosition = cursorPosition + imageMarkdown.length;
                textarea.selectionStart = textarea.selectionEnd =
                  newCursorPosition;
                textarea.focus();
              })
              .catch((error) => {
                // 上传失败，回退到 base64
                console.warn('图床上传失败，使用 base64:', error);
                fileToBase64(file).then((base64) => {
                  const imageMarkdown = `${prefix}![粘贴图片](${base64})`;
                  const newText =
                    textBeforeCursor + imageMarkdown + textAfterCursor;
                  onChange(newText);
                  uploadManager.completeUpload(
                    uploadId,
                    false,
                    '已回退到 Base64',
                  );

                  // 设置光标位置到图片后面
                  const newCursorPosition =
                    cursorPosition + imageMarkdown.length;
                  textarea.selectionStart = textarea.selectionEnd =
                    newCursorPosition;
                  textarea.focus();
                });
              });
          } else {
            // 没有上传管理器，直接使用 base64
            const reader = new FileReader();
            reader.onload = (event) => {
              const base64 = event.target?.result;
              if (!base64) return;

              const imageMarkdown = `${prefix}![粘贴图片](${base64})`;
              const newText =
                textBeforeCursor + imageMarkdown + textAfterCursor;

              onChange(newText);

              // 设置光标位置到图片后面
              const newCursorPosition = cursorPosition + imageMarkdown.length;
              textarea.selectionStart = textarea.selectionEnd =
                newCursorPosition;
              textarea.focus();
            };
            reader.readAsDataURL(file);
          }
          return;
        }
      }
    },
    [value, onChange, uploadManager, onShowImageUploadSettings],
  );

  // 图片上传处理
  const imageInputRef = useRef(null);
  const handleImageUploadClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件');
      return;
    }

    // 检查图床是否已设置
    if (!isImageUploadConfigured()) {
      onShowImageUploadSettings?.();
      // 重置 input
      e.target.value = '';
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const textAfterCursor = value.substring(cursorPosition);

    // 检查光标前是否有换行，如果没有则添加
    const needsNewline = textBeforeCursor && !textBeforeCursor.endsWith('\n');
    const prefix = needsNewline ? '\n' : '';

    // 使用图床上传
    if (uploadManager) {
      const uploadId = uploadManager.addUpload(file.name);

      uploadImage(file, (loaded, total) => {
        uploadManager.updateUploadProgress(uploadId, loaded, total);
      })
        .then(({ url, method, markdown }) => {
          // 如果是 Cloudflare Workers API，直接使用返回的 markdown
          let imageMarkdown;
          if (method === 'cf-worker' && markdown) {
            imageMarkdown = `${prefix}${markdown}`;
          } else {
            imageMarkdown = `${prefix}![${file.name}](${url})`;
          }
          const newText = textBeforeCursor + imageMarkdown + textAfterCursor;
          onChange(newText);
          uploadManager.completeUpload(uploadId, true);

          // 设置光标位置到图片后面
          const newCursorPosition = cursorPosition + imageMarkdown.length;
          textarea.selectionStart = textarea.selectionEnd = newCursorPosition;
          textarea.focus();
        })
        .catch((error) => {
          // 上传失败，回退到 base64
          console.warn('图床上传失败，使用 base64:', error);
          fileToBase64(file).then((base64) => {
            const imageMarkdown = `${prefix}![${file.name}](${base64})`;
            const newText = textBeforeCursor + imageMarkdown + textAfterCursor;
            onChange(newText);
            uploadManager.completeUpload(uploadId, false, '已回退到 Base64');

            // 设置光标位置到图片后面
            const newCursorPosition = cursorPosition + imageMarkdown.length;
            textarea.selectionStart = textarea.selectionEnd = newCursorPosition;
            textarea.focus();
          });
        });
    } else {
      // 没有上传管理器，直接使用 base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        if (!base64) return;

        const imageMarkdown = `${prefix}![${file.name}](${base64})`;
        const newText = textBeforeCursor + imageMarkdown + textAfterCursor;

        onChange(newText);

        // 设置光标位置到图片后面
        const newCursorPosition = cursorPosition + imageMarkdown.length;
        textarea.selectionStart = textarea.selectionEnd = newCursorPosition;
        textarea.focus();
      };
      reader.readAsDataURL(file);
    }

    // 重置 input 以便可以重复选择同一文件
    e.target.value = '';
  };

  const charCount = value.length;

  return (
    <div className="editor-container">
      <div className="panel-header">
        <span className="panel-title">编辑器</span>
        <div className="panel-actions">
          {/* 撤销按钮 */}
          <button
            className="btn-icon"
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销 (Ctrl+Z)"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 7v6h6" />
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
            </svg>
          </button>
          {/* 恢复按钮 */}
          <button
            className="btn-icon"
            onClick={onRedo}
            disabled={!canRedo}
            title="恢复 (Ctrl+Y)"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 7v6h-6" />
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
            </svg>
          </button>
          {/* 模板按钮 */}
          <button
            className="btn-icon"
            onClick={onShowTemplateModal}
            title="加载示例模板"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <line x1="3" x2="21" y1="9" y2="9" />
              <path d="m9 16 3-3 3 3" />
            </svg>
          </button>
          {/* 导入按钮 */}
          <button
            className="btn-icon"
            onClick={() => document.getElementById('editor-file-input').click()}
            title="导入 Markdown"
          >
            <svg
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
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" x2="12" y1="15" y2="3" />
            </svg>
          </button>
          {/* 图片上传按钮 */}
          <button
            className="btn-icon"
            onClick={handleImageUploadClick}
            title="插入图片"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </button>
          {/* 图床设置按钮 */}
          <button
            className="btn-icon"
            onClick={onShowImageUploadSettings}
            title="图床设置"
          >
            <svg
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
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleImageFileChange}
          />
          <input
            id="editor-file-input"
            type="file"
            accept=".md,.markdown,text/markdown"
            style={{ display: 'none' }}
            onChange={(e) => onFileImport(e.target.files[0])}
          />
          {/* 清空按钮 */}
          <button className="btn-icon" onClick={onClear} title="清空内容">
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
          <span className="char-count">{charCount} 字符</span>
        </div>
      </div>
      <div className="editor-wrapper">
        <div className="line-numbers" ref={lineNumbersRef}></div>
        <textarea
          ref={textareaRef}
          className="editor"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          onPaste={handlePaste}
          placeholder="在此输入 Markdown 内容..."
          spellCheck={false}
        />
        <Autocomplete
          visible={autocomplete.visible}
          items={autocomplete.items}
          group={autocomplete.group}
          activeIndex={autocomplete.activeIndex}
          onSelect={insertAutocompleteItem}
          position={autocomplete.position}
        />
      </div>
    </div>
  );
}
