import { useState, useRef, useEffect, useCallback } from 'react';
import { markdownSuggestions } from '../data/autocomplete';
import Autocomplete from './Autocomplete';
import './Editor.css';

export default function Editor({
  value,
  onChange,
  onScroll,
  onUndo,
  onRedo,
  editorRef,
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

  const charCount = value.length;

  return (
    <div className="editor-container">
      <div className="panel-header">
        <span className="panel-title">编辑器</span>
        <span className="char-count">{charCount} 字符</span>
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
