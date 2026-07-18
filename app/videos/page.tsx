'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Youtube, Video, AlertTriangle } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { parseYouTube } from '@/lib/youtube';
import type { Player, Match } from '@/types';

interface LeagueRow {
  id: string;
  name: string;
  players: Player[];
  matches: Match[];
}

interface VideoEntry {
  leagueName: string;
  match: Match;
  date: string; // YYYY-MM-DD ('' 가능)
  playerNames: string[];
  watchUrl: string;
  thumbnailUrl: string | null;
}

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function matchPlayerNames(m: Match): string[] {
  return [m.teamA?.man?.name, m.teamA?.woman?.name, m.teamB?.man?.name, m.teamB?.woman?.name].filter(
    (n): n is string => !!n
  );
}

function teamLabel(m: Match, side: 'A' | 'B'): string {
  const t = side === 'A' ? m.teamA : m.teamB;
  return [t?.man?.name, t?.woman?.name].filter(Boolean).join('·') || '미정';
}

/** month: 0-11. 달력 그리드용 (앞뒤 빈칸 포함한 날짜 배열) */
function buildCalendar(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
  }
  return cells;
}

function VideoCard({ entry }: { entry: VideoEntry }) {
  const { match: m } = entry;
  return (
    <a
      href={entry.watchUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:border-clay-300 transition-colors active:scale-[0.99]"
    >
      {entry.thumbnailUrl && (
        <div className="relative aspect-video bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={entry.thumbnailUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-black/60 rounded-full p-3">
              <Youtube className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      )}
      <div className="p-3">
        <div className="text-sm text-slate-900">
          <span className={m.scoreA > m.scoreB ? 'font-bold' : ''}>{teamLabel(m, 'A')}</span>
          <span className="mx-1.5 font-black text-clay-600">
            {m.scoreA}:{m.scoreB}
          </span>
          <span className={m.scoreB > m.scoreA ? 'font-bold' : ''}>{teamLabel(m, 'B')}</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          {entry.leagueName}
          {entry.date ? ` · ${entry.date}` : ''}
        </div>
      </div>
    </a>
  );
}

export default function VideosPage() {
  const [leagues, setLeagues] = useState<LeagueRow[] | null>(null);
  const [error, setError] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calYear, setCalYear] = useState<number | null>(null);
  const [calMonth, setCalMonth] = useState<number | null>(null); // 0-11

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setError(true);
      return;
    }
    supabase
      .from('shared_leagues')
      .select('id, name, players, matches')
      .eq('is_active', true)
      .then(({ data, error: err }) => {
        if (err) setError(true);
        else setLeagues((data as LeagueRow[]) ?? []);
      });
  }, []);

  const videos = useMemo<VideoEntry[]>(() => {
    if (!leagues) return [];
    return leagues
      .flatMap((l) =>
        (l.matches || [])
          .filter((m) => m.videoUrl)
          .map((m) => {
            const yt = parseYouTube(m.videoUrl!);
            return {
              leagueName: l.name,
              match: m,
              date: m.date || '',
              playerNames: matchPlayerNames(m),
              watchUrl: yt?.watchUrl ?? m.videoUrl!,
              thumbnailUrl: yt?.thumbnailUrl ?? null,
            };
          })
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [leagues]);

  const playerNames = useMemo(
    () => Array.from(new Set(videos.flatMap((v) => v.playerNames))).sort((a, b) => a.localeCompare(b, 'ko')),
    [videos]
  );

  const videoDates = useMemo(() => {
    const counts = new Map<string, number>();
    videos.forEach((v) => {
      if (v.date) counts.set(v.date, (counts.get(v.date) ?? 0) + 1);
    });
    return counts;
  }, [videos]);

  // 최초 로드 시: 가장 최근 영상이 있는 달/날짜를 기본으로
  useEffect(() => {
    if (calYear !== null || videos.length === 0) return;
    const latest = videos.find((v) => v.date);
    const base = latest?.date ? new Date(latest.date) : new Date();
    setCalYear(base.getFullYear());
    setCalMonth(base.getMonth());
    if (latest?.date) setSelectedDate(latest.date);
  }, [videos, calYear]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-sm w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-sm text-slate-500">영상 정보를 불러올 수 없습니다. 네트워크를 확인해주세요.</p>
        </div>
      </div>
    );
  }

  if (!leagues) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-clay-600 animate-spin" aria-label="로딩 중" />
      </div>
    );
  }

  const year = calYear ?? new Date().getFullYear();
  const month = calMonth ?? new Date().getMonth();
  const cells = buildCalendar(year, month);

  const moveMonth = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
    setSelectedDate(null);
  };

  const playerVideos = selectedPlayer ? videos.filter((v) => v.playerNames.includes(selectedPlayer)) : [];
  const dayVideos = selectedDate ? videos.filter((v) => v.date === selectedDate) : [];

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Video className="w-5 h-5 text-clay-600" /> 경기 영상
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-5">
        {videos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
            <Youtube className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-500 leading-relaxed">
              아직 등록된 경기 영상이 없습니다.
              <br />
              관리자가 경기에 유튜브 링크를 등록하면 여기에 표시됩니다.
            </p>
          </div>
        ) : (
          <>
            {/* 선수 필터 */}
            <div className="-mx-4 px-4 overflow-x-auto">
              <div className="flex gap-2 w-max pb-1">
                <button
                  onClick={() => setSelectedPlayer(null)}
                  className={`shrink-0 text-xs font-bold px-3 py-2 rounded-full border transition-colors touch-target ${
                    selectedPlayer === null
                      ? 'bg-clay-600 text-white border-clay-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-clay-300'
                  }`}
                >
                  날짜별
                </button>
                {playerNames.map((name) => (
                  <button
                    key={name}
                    onClick={() => setSelectedPlayer(name === selectedPlayer ? null : name)}
                    className={`shrink-0 text-xs font-bold px-3 py-2 rounded-full border transition-colors touch-target ${
                      selectedPlayer === name
                        ? 'bg-clay-600 text-white border-clay-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-clay-300'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {selectedPlayer ? (
              /* 선수별 전체 영상 */
              <section>
                <h2 className="text-sm font-bold text-slate-700 mb-3">
                  {selectedPlayer} 선수의 영상 <span className="text-clay-600">{playerVideos.length}</span>편
                </h2>
                <div className="space-y-3">
                  {playerVideos.map((v) => (
                    <VideoCard key={v.match.id} entry={v} />
                  ))}
                </div>
              </section>
            ) : (
              <>
                {/* 달력 */}
                <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => moveMonth(-1)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg touch-target"
                      aria-label="이전 달"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <div className="font-bold text-slate-900">
                      {year}년 {month + 1}월
                    </div>
                    <button
                      onClick={() => moveMonth(1)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg touch-target"
                      aria-label="다음 달"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 mb-1">
                    {DAY_LABELS.map((d, i) => (
                      <div key={d} className={i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : ''}>
                        {d}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-y-1">
                    {cells.map((date, i) => {
                      if (!date) return <div key={`empty-${i}`} />;
                      const count = videoDates.get(date) ?? 0;
                      const isSelected = selectedDate === date;
                      const day = parseInt(date.slice(8), 10);
                      return (
                        <button
                          key={date}
                          onClick={() => count > 0 && setSelectedDate(isSelected ? null : date)}
                          disabled={count === 0}
                          className={`relative mx-auto w-9 h-9 rounded-full text-sm flex flex-col items-center justify-center transition-colors touch-target ${
                            isSelected
                              ? 'bg-clay-600 text-white font-bold'
                              : count > 0
                              ? 'text-slate-900 font-bold hover:bg-clay-50'
                              : 'text-slate-300'
                          }`}
                        >
                          {day}
                          {count > 0 && !isSelected && (
                            <span className="absolute bottom-0.5 w-1.5 h-1.5 rounded-full bg-clay-500" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* 선택한 날짜의 영상 */}
                {selectedDate ? (
                  <section>
                    <h2 className="text-sm font-bold text-slate-700 mb-3">
                      {selectedDate} 영상 <span className="text-clay-600">{dayVideos.length}</span>편
                    </h2>
                    <div className="space-y-3">
                      {dayVideos.map((v) => (
                        <VideoCard key={v.match.id} entry={v} />
                      ))}
                    </div>
                  </section>
                ) : (
                  <p className="text-xs text-slate-400 text-center">
                    영상이 있는 날짜(점 표시)를 누르면 해당 날짜의 경기 영상이 나옵니다.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
