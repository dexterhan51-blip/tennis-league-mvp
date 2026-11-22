'use client';

import { useState } from 'react';
import { ChevronDown, Play } from 'lucide-react';
import { displayPoint, DEFAULT_SCORING_CONFIG } from '@/lib/liveScoring';
import { EVENT_LABEL, tallyEvents } from '@/lib/fcpxmlImport';
import { shortDate } from '@/lib/date';
import PersonalEventTable from './PersonalEventTable';
import { teamLabel, teamMembers } from '@/utils/playerInsights';
import type { RallyEventKind } from '@/types';
import type { Match } from '@/types';

interface ScoreRowProps {
  match: Match;
  /** 왼쪽 위 라벨 (예: '3경기'). 없으면 날짜 */
  label?: string;
  /** 이 선수가 속한 팀 이름을 진하게 표시 */
  highlightPlayerId?: string;
}

/** 점수판 한 줄: 두 팀 이름과 게임 스코어. 진행 중이면 현재 포인트도 함께 보여준다. */
export default function ScoreRow({ match, label, highlightPlayerId }: ScoreRowProps) {
  const [open, setOpen] = useState(false);
  const detail = match.detail && match.detail.events.length > 0 ? match.detail : null;
  const started = (match.pointLog?.length ?? 0) > 0 || match.scoreA > 0 || match.scoreB > 0;
  const live = !match.isFinished && started;
  const pending = !match.isFinished && !started;
  const aWon = match.isFinished && match.scoreA > match.scoreB;
  const bWon = match.isFinished && match.scoreB > match.scoreA;
  const last = live ? match.pointLog?.[match.pointLog.length - 1] : undefined;
  // 게임을 막 따낸 직후에는 포인트가 0-0으로 돌아간 상태
  const points = last && !last.gameWon ? { a: last.pointA, b: last.pointB } : live && last ? { a: 0, b: 0 } : null;
  const cfg = { ...DEFAULT_SCORING_CONFIG, rule: match.scoringRule ?? DEFAULT_SCORING_CONFIG.rule };

  const mine = (side: 'A' | 'B') => {
    if (!highlightPlayerId) return false;
    const team = side === 'A' ? match.teamA : match.teamB;
    return team.man?.id === highlightPlayerId || team.woman?.id === highlightPlayerId;
  };

  const side = (key: 'A' | 'B', won: boolean, score: number, point: number | null, other: number | null) => (
    <div className={`flex items-center justify-between h-[30px] ${won || (live && mine(key)) ? 'text-ink font-extrabold' : 'text-ink-soft font-semibold'}`}>
      <span className="text-[15px] truncate">
        {teamLabel(key === 'A' ? match.teamA : match.teamB)}
        {mine(key) && <span className="ml-1.5 text-[10px] font-bold text-ink-mute align-middle">나</span>}
      </span>
      <span className="flex items-center gap-2.5 shrink-0">
        {point !== null && other !== null && (
          <span className="num text-[13px] font-extrabold text-ink-mute">{displayPoint(point, other, cfg)}</span>
        )}
        <span className={`num w-7 text-right text-[22px] font-extrabold ${won ? 'text-accent' : ''}`}>{pending ? '–' : score}</span>
      </span>
    </div>
  );

  return (
    <div className="bg-card rounded-[14px] px-3.5 py-3">
      <div className="flex items-center justify-between mb-2 text-[11px] font-bold text-ink-mute">
        <span>
          {match.matchNumber ? `${shortDate(match.date)} · ${match.matchNumber}경기` : label ?? shortDate(match.date)}
          {match.isFriendly && ' · 친선'}
          {match.isExhibition && ' · 시범'}
        </span>
        {live ? (
          <span className="px-1.5 py-0.5 rounded bg-live text-white text-[10px] font-extrabold">LIVE</span>
        ) : pending ? (
          <span className="text-[10px] font-extrabold text-ink-faint">예정</span>
        ) : match.videoUrl ? (
          <a
            href={match.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-ink-soft hover:text-ink"
            aria-label="경기 영상 보기"
          >
            <Play className="w-3 h-3 fill-live text-live" /> 영상
          </a>
        ) : null}
      </div>
      {side('A', aWon, match.scoreA, points?.a ?? null, points?.b ?? null)}
      {side('B', bWon, match.scoreB, points?.b ?? null, points?.a ?? null)}

      {/* 영상 편집본에서 가져온 상세 기록 (팀 단위) */}
      {detail && (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-1.5 -mb-1 w-full h-8 flex items-center justify-center gap-1 text-[11px] font-bold text-ink-mute border-t border-line"
          >
            상세 기록{detail.place ? ` · ${detail.place}` : ''}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          {open && (() => {
            const tally = tallyEvents(detail.events);
            return (
              <div className="mt-2 pb-1">
                <PersonalEventTable events={detail.events} players={[...teamMembers(match.teamA), ...teamMembers(match.teamB)]} />
                {(Object.keys(EVENT_LABEL) as RallyEventKind[]).map((kind) => (
                  <div key={kind} className="grid grid-cols-[40px_1fr_40px] items-center h-7 text-xs">
                    <span className="num text-left font-extrabold text-ink">{tally.A[kind]}</span>
                    <span className="text-center font-bold text-ink-mute">{EVENT_LABEL[kind]}</span>
                    <span className="num text-right font-extrabold text-ink">{tally.B[kind]}</span>
                  </div>
                ))}
                <p className="mt-1 text-center text-[10px] text-ink-faint">
                  왼쪽 {teamLabel(match.teamA)} · 오른쪽 {teamLabel(match.teamB)} · 포인트 {match.pointLog?.length ?? 0}개
                </p>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
