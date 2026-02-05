import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * 撤销/重做 Hook（支持持久化）
 * @param {any} initialValue - 初始值
 * @param {number} maxSize - 最大历史记录数量
 * @param {string} storageKey - localStorage 存储键名
 * @returns {object} - { value, setValue, undo, redo, canUndo, canRedo, reset }
 */
export function useUndoRedo(
  initialValue,
  maxSize = 50,
  storageKey = 'markdown-undo-history',
) {
  // 从 localStorage 恢复历史记录
  const loadFromStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { history: savedHistory, index: savedIndex } = JSON.parse(saved);
        if (Array.isArray(savedHistory) && savedHistory.length > 0) {
          return { history: savedHistory, index: savedIndex };
        }
      }
    } catch (e) {
      console.warn('Failed to load undo history from localStorage:', e);
    }
    return null;
  }, [storageKey]);

  // 保存到 localStorage
  const saveToStorage = useCallback(
    (historyData, indexData) => {
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            history: historyData,
            index: indexData,
          }),
        );
      } catch (e) {
        console.warn('Failed to save undo history to localStorage:', e);
      }
    },
    [storageKey],
  );

  // 初始化状态
  const savedData = loadFromStorage();
  const initialHistory = savedData ? savedData.history : [initialValue];
  const initialIndex = savedData ? savedData.index : 0;
  const isRestored = savedData !== null;

  const [history, setHistory] = useState(initialHistory);
  const currentIndexRef = useRef(initialIndex);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const value = history[currentIndex];
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  // 持久化历史变化
  useEffect(() => {
    saveToStorage(history, currentIndex);
  }, [history, currentIndex, saveToStorage]);

  const setValue = useCallback(
    (newValue) => {
      const newHistory = history.slice(0, currentIndexRef.current + 1);
      newHistory.push(newValue);

      // 限制历史记录大小
      if (newHistory.length > maxSize) {
        newHistory.shift();
        currentIndexRef.current = maxSize - 1;
      } else {
        currentIndexRef.current = newHistory.length - 1;
      }

      setHistory(newHistory);
      setCurrentIndex(currentIndexRef.current);
    },
    [history, maxSize],
  );

  const undo = useCallback(() => {
    if (canUndo) {
      currentIndexRef.current = currentIndex - 1;
      setCurrentIndex(currentIndexRef.current);
    }
  }, [canUndo, currentIndex]);

  const redo = useCallback(() => {
    if (canRedo) {
      currentIndexRef.current = currentIndex + 1;
      setCurrentIndex(currentIndexRef.current);
    }
  }, [canRedo, currentIndex]);

  const reset = useCallback(
    (newValue) => {
      const newHistory = [newValue];
      setHistory(newHistory);
      currentIndexRef.current = 0;
      setCurrentIndex(0);
      saveToStorage(newHistory, 0);
    },
    [saveToStorage],
  );

  return {
    value,
    setValue,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    isRestored,
  };
}
