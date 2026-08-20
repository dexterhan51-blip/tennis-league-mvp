'use client';

import { X, Youtube, ExternalLink } from 'lucide-react';
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
      <div className="bg-card border border-line rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-xl animate-scale-in">
        <div className="p-4 border-b border-line flex justify-between items-center bg-card-soft rounded-t-2xl">
          <h3 className="font-bold text-lg text-ink tracking-tight flex items-center gap-2">경기 히스토리 (전체)</h3>
          <button onClick={onClose} className="p-2 text-ink-mute hover:bg-line rounded-full transition-colors touch-target" aria-label="닫기">
            <X size={24}/>
          </button>
        </div>
        <div className="overflow-auto p-4 flex-1 space-y-3">
          {matches.slice(0).reverse().map((m) => {
            const winner = m.scoreA > m.scoreB ? 'A' : (m.scoreB > m.scoreA ? 'B' : null);
            return (
              <div key={m.id} className="bg-card-soft rounded-xl p-3 border border-line">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-ink-mute font-medium">{m.date}</span>
                    {m.isExhibition && <span className="text-xs bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded font-bold">시범</span>}
                  </div>
                  {m.isFinished && <span className="text-xs bg-up/10 text-up px-2 py-0.5 rounded font-bold">완료</span>}
                </div>
                <div className="flex items-center gap-3">
                  <div className={`flex-1 text-right ${winner === 'A' ? 'font-bold text-ink' : 'text-ink-soft'}`}>
                    <div className="text-sm">{m.teamA.man.name}</div>
                    {m.teamA.man.id !== m.teamA.woman.id && <div className="text-xs text-ink-faint">{m.teamA.woman.name}</div>}
                  </div>
                  <div className="flex-shrink-0 text-center">
                    <span className={`text-lg font-black tabular-nums ${winner === 'A' ? 'text-accent' : 'text-ink'}`}>{m.scoreA}</span>
                    <span className="text-ink-faint mx-1">:</span>
                    <span className={`text-lg font-black tabular-nums ${winner === 'B' ? 'text-accent' : 'text-ink'}`}>{m.scoreB}</span>
                  </div>
                  <div className={`flex-1 text-left ${winner === 'B' ? 'font-bold text-ink' : 'text-ink-soft'}`}>
                    <div className="text-sm">{m.teamB.man.name}</div>
                    {m.teamB.man.id !== m.teamB.woman.id && <div className="text-xs text-ink-faint">{m.teamB.woman.name}</div>}
                  </div>
                </div>
                {m.videoUrl && (
                  <a
                    href={m.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold bg-down/10 text-down hover:bg-down/15 transition-colors"
                  >
                    <Youtube className="w-3.5 h-3.5" /> 영상 보기 <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}
          {matches.length === 0 && <div className="text-center py-8 text-ink-mute">경기 기록이 없습니다.</div>}
        </div>
      </div>
    </div>
  );
}
