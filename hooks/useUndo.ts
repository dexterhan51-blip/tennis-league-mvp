'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UndoItem<T> {
  id: string;
  data: T;
  timestamp: number;
}

interface UseUndoOptions {
  maxHistory?: number;
  timeout?: number;
}

export function useUndo<T>(options: UseUndoOptions = {}) {
  const { maxHistory = 10, timeout = 5000 } = options;

  const [history, setHistory] = useState<UndoItem<T>[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    setCanUndo(history.length > 0);
  }, [history]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const push = useCallback((data: T) => {
    const id = `undo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const item: UndoItem<T> = {
      id,
      data,
      timestamp: Date.now(),
    };

    setHistory((prev) => [item, ...prev].slice(0, maxHistory));

    // Auto-clear after timeout
    const timeoutId = setTimeout(() => {
      setHistory((prev) => prev.filter((i) => i.id !== id));
      timeoutRefs.current.delete(id);
    }, timeout);

    timeoutRefs.current.set(id, timeoutId);

    return id;
  }, [maxHistory, timeout]);

  const pop = useCallback((): T | undefined => {
    if (history.length === 0) return undefined;

    const [item, ...rest] = history;
    setHistory(rest);

    // Clear timeout for this item
    const timeoutId = timeoutRefs.current.get(item.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(item.id);
    }

    return item.data;
  }, [history]);

  const clear = useCallback(() => {
    timeoutRefs.current.forEach((t) => clearTimeout(t));
    timeoutRefs.current.clear();
    setHistory([]);
  }, []);

  const peek = useCallback((): T | undefined => {
    return history[0]?.data;
  }, [history]);

  return {
    canUndo,
    history,
    push,
    pop,
    clear,
    peek,
    count: history.length,
  };
}
