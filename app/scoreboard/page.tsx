"use client";

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, RotateCcw, Undo2 } from 'lucide-react';

type PointValue = 0 | 15 | 30 | 40;

interface GameState {
  pointsA: PointValue | 'AD';
  pointsB: PointValue | 'AD';
  gamesA: number;
  gamesB: number;
  isDeuce: boolean;
  server: 'A' | 'B';
}

const initialState: GameState = {
  pointsA: 0,
  pointsB: 0,
  gamesA: 0,
  gamesB: 0,
  isDeuce: false,
  server: 'A',
};

export default function ScoreboardPage() {
  const [state, setState] = useState<GameState>(initialState);
  const [history, setHistory] = useState<GameState[]>([]);

  const getNextPoint = (current: PointValue): PointValue | 'GAME' => {
    switch (current) {
      case 0: return 15;
      case 15: return 30;
      case 30: return 40;
      case 40: return 'GAME';
      default: return 0;
    }
  };

  const addPoint = useCallback((team: 'A' | 'B') => {
    setState(prev => {
      // Save to history for undo
      setHistory(h => [...h, prev]);

      const isA = team === 'A';
      const myPoints = isA ? prev.pointsA : prev.pointsB;
      const oppPoints = isA ? prev.pointsB : prev.pointsA;

      // Deuce situation
      if (prev.isDeuce) {
        // If I have AD, I win the game
        if (myPoints === 'AD') {
          const newGamesA = isA ? prev.gamesA + 1 : prev.gamesA;
          const newGamesB = isA ? prev.gamesB : prev.gamesB + 1;
          return {
            ...prev,
            pointsA: 0,
            pointsB: 0,
            gamesA: newGamesA,
            gamesB: newGamesB,
            isDeuce: false,
            server: prev.server === 'A' ? 'B' : 'A',
          };
        }
        // If opponent has AD, back to deuce
        if (oppPoints === 'AD') {
          return {
            ...prev,
            pointsA: 40,
            pointsB: 40,
          };
        }
        // Both at 40, I get AD
        return {
          ...prev,
          pointsA: isA ? 'AD' : 40,
          pointsB: isA ? 40 : 'AD',
        };
      }

      // Normal scoring
      const nextPoint = getNextPoint(myPoints as PointValue);

      // Check for game win
      if (nextPoint === 'GAME') {
        // Check if it's 40-40 (deuce)
        if (oppPoints === 40) {
          return {
            ...prev,
            isDeuce: true,
          };
        }
        // Win the game
        const newGamesA = isA ? prev.gamesA + 1 : prev.gamesA;
        const newGamesB = isA ? prev.gamesB : prev.gamesB + 1;
        return {
          ...prev,
          pointsA: 0,
          pointsB: 0,
          gamesA: newGamesA,
          gamesB: newGamesB,
          server: prev.server === 'A' ? 'B' : 'A',
        };
      }

      return {
        ...prev,
        pointsA: isA ? nextPoint : prev.pointsA,
        pointsB: isA ? prev.pointsB : nextPoint,
      };
    });
  }, []);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    setState(lastState);
    setHistory(h => h.slice(0, -1));
  }, [history]);

  const reset = useCallback(() => {
    if (confirm('점수를 초기화하시겠습니까?')) {
      setState(initialState);
      setHistory([]);
    }
  }, []);

  const displayPoint = (point: PointValue | 'AD') => {
    if (point === 'AD') return 'AD';
    return point.toString();
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between bg-slate-800">
        <Link href="/" className="p-2 hover:bg-slate-700 rounded-full text-slate-400">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-white font-bold">스코어보드</h1>
        <div className="flex gap-2">
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="p-2 hover:bg-slate-700 rounded-full text-slate-400 disabled:opacity-30"
            aria-label="실행취소"
          >
            <Undo2 size={20} />
          </button>
          <button
            onClick={reset}
            className="p-2 hover:bg-slate-700 rounded-full text-slate-400"
            aria-label="리셋"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      {/* Score Display */}
      <div className="flex-1 flex flex-col">
        {/* Team A - Top Half */}
        <button
          onClick={() => addPoint('A')}
          className="flex-1 flex flex-col items-center justify-center bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-colors relative"
        >
          {state.server === 'A' && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="text-yellow-300 text-2xl">🎾</span>
              <span className="text-yellow-300 text-sm font-bold">서브</span>
            </div>
          )}
          <div className="text-white/70 text-lg font-medium mb-2">팀 A</div>
          <div className="flex items-baseline gap-4">
            <span className="text-8xl font-black text-white">
              {displayPoint(state.pointsA)}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-white/80">
            <span className="text-2xl font-bold">{state.gamesA}</span>
            <span className="text-sm">게임</span>
          </div>
          {state.isDeuce && state.pointsA === 40 && state.pointsB === 40 && (
            <div className="absolute bottom-4 bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
              DEUCE
            </div>
          )}
        </button>

        {/* Divider */}
        <div className="h-1 bg-slate-900 flex items-center justify-center relative">
          <div className="absolute bg-slate-700 px-4 py-1 rounded-full text-slate-400 text-xs font-bold">
            VS
          </div>
        </div>

        {/* Team B - Bottom Half */}
        <button
          onClick={() => addPoint('B')}
          className="flex-1 flex flex-col items-center justify-center bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition-colors relative"
        >
          {state.server === 'B' && (
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="text-yellow-300 text-2xl">🎾</span>
              <span className="text-yellow-300 text-sm font-bold">서브</span>
            </div>
          )}
          <div className="text-white/70 text-lg font-medium mb-2">팀 B</div>
          <div className="flex items-baseline gap-4">
            <span className="text-8xl font-black text-white">
              {displayPoint(state.pointsB)}
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2 text-white/80">
            <span className="text-2xl font-bold">{state.gamesB}</span>
            <span className="text-sm">게임</span>
          </div>
          {state.isDeuce && state.pointsB === 40 && state.pointsA === 40 && (
            <div className="absolute bottom-4 bg-yellow-500 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
              DEUCE
            </div>
          )}
        </button>
      </div>
    </main>
  );
}
