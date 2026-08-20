'use client';

import { useState } from 'react';
import { Calendar, Youtube, ExternalLink, Trash2, Radio } from 'lucide-react';
import SwipeableItem from '@/components/ui/SwipeableItem';
import ScoreInput from '@/components/ui/ScoreInput';
import type { Match } from '@/types';

interface MatchListProps {
  matches: Match[];
  matchDate: string;
  pendingScores: Record<string, { scoreA: number; scoreB: number }>;
  onUpdateScore: (matchId: string, team: 'A' | 'B', score: number) => void;
  onCommitScore: (matchId: string) => void;
  onCancelFinished: (matchId: string) => void;
  onSetVideoUrl: (matchId: string, url: string | undefined) => boolean;
  onStartLiveScoring: (matchId: string) => void;
  onRequestDelete: (matchId: string) => void;
  onOpenRegistration: () => void;
}

// 운영자용 경기 영상(유튜브) 링크 연결/수정/삭제 컨트롤. 완료된 경기에만 노출.
function MatchVideoControl({
  videoUrl,
  onSave,
  onRemove,
}: {
  videoUrl?: string;
  onSave: (url: string) => boolean;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');

  if (videoUrl && !editing) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-sm bg-down/10 text-down hover:bg-down/15 transition-colors touch-target"
        >
          <Youtube className="w-4 h-4" /> 영상 보기 <ExternalLink className="w-3 h-3" />
        </a>
        <button
          onClick={() => { setValue(videoUrl); setEditing(true); }}
          className="px-3 py-2 rounded-lg text-xs font-bold text-ink-soft bg-card-soft hover:bg-line transition-colors touch-target"
          aria-label="영상 링크 수정"
        >
          수정
        </button>
        <button
          onClick={onRemove}
          className="px-3 py-2 rounded-lg text-ink-mute bg-card-soft hover:bg-line transition-colors touch-target"
          aria-label="영상 링크 삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="유튜브 링크 붙여넣기 (youtu.be/... 등)"
          aria-label="유튜브 링크 입력"
          className="w-full px-3 py-2.5 bg-card border border-line-strong rounded-lg text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
        />
        <div className="flex gap-2">
          <button
            onClick={() => { if (onSave(value)) { setEditing(false); setValue(''); } }}
            className="flex-1 py-2 rounded-lg font-bold text-sm bg-accent text-white hover:bg-accent-strong transition-colors touch-target"
          >
            저장
          </button>
          <button
            onClick={() => { setEditing(false); setValue(''); }}
            className="px-4 py-2 rounded-lg font-bold text-sm text-ink-soft bg-card-soft hover:bg-line transition-colors touch-target"
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => { setValue(''); setEditing(true); }}
      className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-sm text-ink-mute bg-card-soft border border-dashed border-line-strong hover:bg-line transition-colors touch-target"
    >
      <Youtube className="w-4 h-4" /> 경기 영상 링크 추가
    </button>
  );
}

export default function MatchList({
  matches,
  matchDate,
  pendingScores,
  onUpdateScore,
  onCommitScore,
  onCancelFinished,
  onSetVideoUrl,
  onStartLiveScoring,
  onRequestDelete,
  onOpenRegistration,
}: MatchListProps) {
  return (
    <section className="space-y-3">
      {matches.length === 0 && (
        <div className="text-center py-10 text-ink-mute bg-card-soft rounded-xl border border-dashed border-line-strong">
          <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm mb-3">{matchDate} 진행된 게임이 없습니다.</p>
          <button onClick={onOpenRegistration} className="text-sm text-accent font-bold hover:underline cursor-pointer">
            + 게임 등록하기
          </button>
        </div>
      )}

      {matches.map((m, idx) => {
        const pending = pendingScores[m.id];
        const displayScoreA = pending ? pending.scoreA : m.scoreA;
        const displayScoreB = pending ? pending.scoreB : m.scoreB;
        const hasPendingScore = !!pending;
        const isSingles = m.teamA.man.id === m.teamA.woman.id;

        return (
          <SwipeableItem key={m.id} onDelete={() => onRequestDelete(m.id)}>
            <div className={`p-4 rounded-xl border transition-colors ${m.isFinished ? 'bg-up/5 border-up/30' : 'bg-card border-line'}`}>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-accent">GAME {idx + 1}</span>
                  {isSingles && <span className="bg-accent-soft text-accent px-1.5 py-0.5 rounded text-xs font-bold">단식</span>}
                  {m.isExhibition && <span className="bg-amber-500/15 text-amber-600 px-1.5 py-0.5 rounded text-xs font-bold">시범</span>}
                  {m.isFriendly && <span className="bg-accent-soft text-accent px-1.5 py-0.5 rounded text-xs font-bold">친선</span>}
                </div>
                {m.isFinished && <span className="bg-up/10 text-up px-2 py-0.5 rounded text-xs font-bold">경기종료</span>}
              </div>

              <div className="mb-3">
                <div className="text-sm font-bold text-ink-soft mb-2">
                  {m.teamA.man.name}
                  {m.teamA.man.id !== m.teamA.woman.id && <span className="text-ink-mute"> & {m.teamA.woman.name}</span>}
                </div>
                <ScoreInput value={displayScoreA} onChange={(score) => onUpdateScore(m.id, 'A', score)} disabled={m.isFinished} />
              </div>

              <div className="flex items-center gap-2 my-2">
                <div className="flex-1 border-t border-line" />
                <span className="text-xs font-bold text-ink-faint">VS</span>
                <div className="flex-1 border-t border-line" />
              </div>

              <div className="mb-3">
                <div className="text-sm font-bold text-ink-soft mb-2">
                  {m.teamB.man.name}
                  {m.teamB.man.id !== m.teamB.woman.id && <span className="text-ink-mute"> & {m.teamB.woman.name}</span>}
                </div>
                <ScoreInput value={displayScoreB} onChange={(score) => onUpdateScore(m.id, 'B', score)} disabled={m.isFinished} />
              </div>

              <div className="mt-4 pt-3 border-t border-line space-y-2">
                {m.isFinished ? (
                  <>
                    <MatchVideoControl
                      videoUrl={m.videoUrl}
                      onSave={(url) => onSetVideoUrl(m.id, url)}
                      onRemove={() => onSetVideoUrl(m.id, undefined)}
                    />
                    <button onClick={() => onCancelFinished(m.id)} className="w-full py-2.5 rounded-lg font-bold text-sm bg-card-soft text-ink-soft hover:bg-line transition-colors touch-target">
                      수정하기
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => onStartLiveScoring(m.id)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-bold text-sm bg-clay-800 text-white hover:bg-clay-900 transition-colors touch-target"
                    >
                      <Radio className="w-4 h-4" /> 실시간 스코어 입력
                    </button>
                    <button
                      onClick={() => onCommitScore(m.id)}
                      disabled={!hasPendingScore}
                      className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors touch-target ${hasPendingScore ? 'bg-accent text-white hover:bg-accent-strong' : 'bg-card-soft text-ink-faint cursor-not-allowed'}`}
                    >
                      완료
                    </button>
                  </>
                )}
              </div>
            </div>
          </SwipeableItem>
        );
      })}
    </section>
  );
}
