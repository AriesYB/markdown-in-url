import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  uploadImage,
  fileToBase64,
  isImageUploadConfigured,
} from '../utils/imageUpload';
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
  pendingPasteImage,
  cursorPosition,
  scrollPosition,
}) {
  const { t } = useTranslation();
  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);

  // 处理待粘贴的图片（配置完成后自动粘贴）
  useEffect(() => {
    if (pendingPasteImage && isImageUploadConfigured()) {
      processImageUpload(pendingPasteImage);
      // 清除待粘贴的图片
      onClearPendingPasteImage?.();
    }
  }, [pendingPasteImage, isImageUploadConfigured()]);

  // 处理图片上传的函数
  const processImageUpload = useCallback(
    (file) => {
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
              const imageMarkdown = `${prefix}![粘贴图片](${base64})`;
              const newText =
                textBeforeCursor + imageMarkdown + textAfterCursor;
              onChange(newText);
              uploadManager.completeUpload(uploadId, false, '已回退到 Base64');

              // 设置光标位置到图片后面
              const newCursorPosition = cursorPosition + imageMarkdown.length;
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
          const newText = textBeforeCursor + imageMarkdown + textAfterCursor;

          onChange(newText);

          // 设置光标位置到图片后面
          const newCursorPosition = cursorPosition + imageMarkdown.length;
          textarea.selectionStart = textarea.selectionEnd = newCursorPosition;
          textarea.focus();
        };
        reader.readAsDataURL(file);
      }
    },
    [value, onChange, uploadManager],
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

  // 恢复光标位置和滚动位置（在撤销/重做后）
  useEffect(() => {
    const textarea = textareaRef.current;
    if (
      textarea &&
      (cursorPosition !== undefined || scrollPosition !== undefined)
    ) {
      // 恢复光标位置
      if (cursorPosition !== undefined && cursorPosition !== null) {
        textarea.selectionStart = textarea.selectionEnd = cursorPosition;
      }
      // 恢复滚动位置
      if (scrollPosition !== undefined && scrollPosition !== null) {
        textarea.scrollTop = scrollPosition;
        // 同步行号滚动
        if (lineNumbersRef.current) {
          lineNumbersRef.current.scrollTop = scrollPosition;
        }
      }
    }
  }, [value, cursorPosition, scrollPosition]);

  // 处理输入
  const handleInput = useCallback(
    (e) => {
      const newValue = e.target.value;
      const textarea = e.target;
      // 保存当前光标位置和滚动位置
      const currentCursorPos = textarea.selectionStart;
      const currentScrollPos = textarea.scrollTop;
      onChange(newValue, currentCursorPos, currentScrollPos);
    },
    [onChange],
  );

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e) => {
      // Tab键处理
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        const newValue =
          value.substring(0, start) + '  ' + value.substring(end);
        onChange(newValue);
        e.target.selectionStart = e.target.selectionEnd = start + 2;
        return;
      }

      // Ctrl+Z 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const textarea = e.target;
        // 保存当前光标位置和滚动位置
        const currentCursorPos = textarea.selectionStart;
        const currentScrollPos = textarea.scrollTop;
        onUndo(currentCursorPos, currentScrollPos);
      }
      // Ctrl+Y 或 Ctrl+Shift+Z 重做
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'y' || (e.key === 'z' && e.shiftKey))
      ) {
        e.preventDefault();
        const textarea = e.target;
        // 保存当前光标位置和滚动位置
        const currentCursorPos = textarea.selectionStart;
        const currentScrollPos = textarea.scrollTop;
        onRedo(currentCursorPos, currentScrollPos);
      }
      // Ctrl+S 保存到本地
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        localStorage.setItem('markdown-preview-content', value);
      }
    },
    [onUndo, onRedo, onChange, value],
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

          const file = item.getAsFile();
          if (!file) return;

          // 检查图床是否已设置
          if (!isImageUploadConfigured()) {
            // 保存待粘贴的图片，配置完成后自动处理
            onSetPendingPasteImage?.(file);
            onShowImageUploadSettings?.();
            return;
          }

          // 直接处理图片上传
          processImageUpload(file);
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
      alert(t('editor.selectImageFile'));
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
        <span className="panel-title">{t('editor.title')}</span>
        <div className="panel-actions">
          {/* 撤销按钮 */}
          <button
            className="btn-icon"
            onClick={() => {
              const textarea = textareaRef.current;
              if (textarea) {
                const currentCursorPos = textarea.selectionStart;
                const currentScrollPos = textarea.scrollTop;
                onUndo(currentCursorPos, currentScrollPos);
              }
            }}
            disabled={!canUndo}
            title={t('editor.undo')}
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
            onClick={() => {
              const textarea = textareaRef.current;
              if (textarea) {
                const currentCursorPos = textarea.selectionStart;
                const currentScrollPos = textarea.scrollTop;
                onRedo(currentCursorPos, currentScrollPos);
              }
            }}
            disabled={!canRedo}
            title={t('editor.redo')}
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
            title={t('editor.loadTemplate')}
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
            title={t('editor.importMarkdown')}
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
            title={t('editor.insertImage')}
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
          <button
            className="btn-icon"
            onClick={onClear}
            title={t('editor.clearContent')}
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
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            </svg>
          </button>
          <span className="char-count">
            {t('editor.characterCount', { count: charCount })}
          </span>
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
          placeholder={t('editor.placeholder')}
          spellCheck={false}
        />
      </div>
    </div>
  );
}
