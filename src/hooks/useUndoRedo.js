import { useState, useCallback } from 'react';

/**
 * 撤销/重做 Hook
 * @param {any} initialValue - 初始值
 * @param {number} maxSize - 最大历史记录数量
 * @returns {object} - { value, setValue, undo, redo, canUndo, canRedo }
 */
export function useUndoRedo(initialValue, maxSize = 50) {
  const [history, setHistory] = useState([initialValue]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const value = history[currentIndex];
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const setValue = useCallback(
    (newValue) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, currentIndex + 1);
        newHistory.push(newValue);

        // 限制历史记录大小
        if (newHistory.length > maxSize) {
          newHistory.shift();
        } else {
          setCurrentIndex((prev) => prev + 1);
        }

        return newHistory;
      });
    },
    [currentIndex, maxSize],
  );

  const undo = useCallback(() => {
    if (canUndo) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [canRedo]);

  const reset = useCallback((newValue) => {
    setHistory([newValue]);
    setCurrentIndex(0);
  }, []);

  return {
    value,
    setValue,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}
