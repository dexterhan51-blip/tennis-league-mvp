'use client';

import { X } from 'lucide-react';
import type { Match } from '@/types';

interface MatchHistoryModalProps {
  isOpen: boolean;
  matches: Match[];
  onClose: () => void;
}

export default function MatchHistoryModal({ isOpen, matches, onClose }: MatchHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-scale-in">
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
          <h3 className="font-bold text-lg flex items-center gap-2">경기 히스토리 (전체)</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full touch-target" aria-label="닫기">
            <X size={24}/>
          </button>
        </div>
        <div className="overflow-auto p-4 flex-1 space-y-3">
          {matches.slice(0).reverse().map((m) => {
            const winner = m.scoreA > m.scoreB ? 'A' : (m.scoreB > m.scoreA ? 'B' : null);
            return (
              <div key={m.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 font-medium">{m.date}</span>
                    {m.isExhibition && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">시범</span>}
                  </div>
                  {m.isFinished && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">완료</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 text-right ${winner === 'A' ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                    <div className="text-sm">{m.teamA.man.name}</div>
                    {m.teamA.man.id !== m.teamA.woman.id && <div className="text-xs text-slate-400">{m.teamA.woman.name}</div>}
                  </div>
                  <div className="flex-shrink-0 text-center">
                    <span className={`text-lg font-black ${winner === 'A' ? 'text-blue-600' : 'text-slate-800'}`}>{m.scoreA}</span>
                    <span className="text-slate-400 mx-1">:</span>
                    <span className={`text-lg font-black ${winner === 'B' ? 'text-blue-600' : 'text-slate-800'}`}>{m.scoreB}</span>
                  </div>
                  <div className={`flex-1 text-left ${winner === 'B' ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                    <div className="text-sm">{m.teamB.man.name}</div>
                    {m.teamB.man.id !== m.teamB.woman.id && <div className="text-xs text-slate-400">{m.teamB.woman.name}</div>}
                  </div>
                </div>
              </div>
            );
          })}
          {matches.length === 0 && <div className="text-center py-8 text-slate-400">경기 기록이 없습니다.</div>}
        </div>
      </div>
    </div>
  );
}
