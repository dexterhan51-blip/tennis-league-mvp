'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface UndoAction<T = unknown> {
  id: string;
  label: string;
  data: T;
  timestamp: number;
  undo: () => void;
}

interface UndoContextValue {
  canUndo: boolean;
  lastAction: UndoAction | null;
  pushAction: <T>(label: string, data: T, undoFn: () => void) => void;
  undo: () => void;
  clearHistory: () => void;
}

const UndoContext = createContext<UndoContextValue | undefined>(undefined);

const MAX_HISTORY = 10;
const UNDO_TIMEOUT = 5000; // 5 seconds

export function UndoProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<UndoAction[]>([]);

  const pushAction = useCallback(<T,>(label: string, data: T, undoFn: () => void) => {
    const action: UndoAction<T> = {
      id: `undo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      label,
      data,
      timestamp: Date.now(),
      undo: undoFn,
    };

    setHistory((prev) => {
      const newHistory = [action, ...prev].slice(0, MAX_HISTORY);
      return newHistory;
    });

    // Auto-clear after timeout
    setTimeout(() => {
      setHistory((prev) => prev.filter((a) => a.id !== action.id));
    }, UNDO_TIMEOUT);
  }, []);

  const undo = useCallback(() => {
    if (history.length > 0) {
      const [lastAction, ...rest] = history;
      lastAction.undo();
      setHistory(rest);
    }
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const lastAction = history.length > 0 ? history[0] : null;
  const canUndo = history.length > 0;

  return (
    <UndoContext.Provider value={{ canUndo, lastAction, pushAction, undo, clearHistory }}>
      {children}
    </UndoContext.Provider>
  );
}

export function useUndo() {
  const context = useContext(UndoContext);
  if (!context) {
    throw new Error('useUndo must be used within an UndoProvider');
  }
  return context;
}
