'use client';

import { useMemo, useState } from 'react';
import { Youtube, Loader2, Check, Trash2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { parseYouTube } from '@/lib/youtube';
import { useToast } from '@/contexts/ToastContext';
import type { Match } from '@/types';

interface LeagueRowLite {
  id: string;
  name: string;
  matches: Match[];
}

interface AdminVideoManagerProps {
  leagues: LeagueRowLite[];
  /** 저장 성공 시 부모 상태 갱신용 */
  onSaved: (leagueId: string, matches: Match[]) => void;
}

interface MatchRef {
  leagueId: string;
  leagueName: string;
  match: Match;
}

function teamLabel(m: Match, side: 'A' | 'B'): string {
  const t = side === 'A' ? m.teamA : m.teamB;
  return [t?.man?.name, t?.woman?.name].filter(Boolean).join('·') || '미정';
}

// 관리자용: 지난 경기 목록에서 바로 유튜브 URL을 등록/수정한다.
// 저장은 서버 행을 다시 읽어(read-modify-write) 해당 경기만 갱신 — 다른 기기의
// 최신 변경을 덮어쓸 위험을 줄인다.
export default function AdminVideoManager({ leagues, onSaved }: AdminVideoManagerProps) {
  const { showToast } = useToast();
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const matchRefs = useMemo<MatchRef[]>(() => {
    return leagues
      .flatMap((l) =>
        (l.matches || [])
          .filter((m) => m.isFinished)
          .map((m) => ({ leagueId: l.id, leagueName: l.name, match: m }))
      )
      .sort((a, b) => (b.match.date || '').localeCompare(a.match.date || ''));
  }, [leagues]);

  const visible = onlyMissing ? matchRefs.filter((r) => !r.match.videoUrl) : matchRefs;

  const handleSave = async (ref: MatchRef, rawInput: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const trimmed = rawInput.trim();
    let normalized: string | undefined;
    if (trimmed) {
      const yt = parseYouTube(trimmed);
      if (!yt) {
        showToast('유튜브 링크 형식이 아닙니다. youtu.be 또는 youtube.com 링크를 붙여넣어주세요.', 'error');
        return;
      }
      normalized = yt.watchUrl;
    }

    setSavingId(ref.match.id);
    try {
      // 서버 최신 상태를 읽어 해당 경기만 수정
      const { data: row, error: readErr } = await supabase
        .from('shared_leagues')
        .select('matches')
        .eq('id', ref.leagueId)
        .single();
      if (readErr || !row) throw readErr ?? new Error('read failed');

      const matches = (row.matches as Match[]).map((m) => {
        if (m.id !== ref.match.id) return m;
        const next = { ...m };
        if (normalized) next.videoUrl = normalized;
        else delete next.videoUrl;
        return next;
      });

      const { data: updated, error: writeErr } = await supabase
        .from('shared_leagues')
        .update({ matches, updated_at: new Date().toISOString() })
        .eq('id', ref.leagueId)
        .select('id');
      if (writeErr || !updated || updated.length === 0) throw writeErr ?? new Error('write failed');

      onSaved(ref.leagueId, matches);
      setInputs((prev) => ({ ...prev, [ref.match.id]: '' }));
      showToast(normalized ? '영상을 등록했습니다.' : '영상 링크를 삭제했습니다.', 'success');
    } catch (e) {
      console.warn('[video] save failed:', e);
      showToast('저장에 실패했습니다. 관리자 권한과 네트워크를 확인해주세요.', 'error');
    } finally {
      setSavingId(null);
    }
  };

  let lastDate: string | null = null;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-700">
          영상 등록 <span className="text-clay-600">{visible.length}</span>경기
        </h2>
        <button
          onClick={() => setOnlyMissing(!onlyMissing)}
          className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors touch-target ${
            onlyMissing
              ? 'bg-clay-600 text-white border-clay-600'
              : 'bg-white text-slate-600 border-slate-200'
          }`}
        >
          {onlyMissing ? '미등록만 보기' : '전체 보기'}
        </button>
      </div>

      {visible.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
          <Check className="w-8 h-8 text-green-400 mx-auto mb-2" />
          <p className="text-sm text-slate-500">
            {onlyMissing ? '모든 경기에 영상이 등록되어 있습니다.' : '완료된 경기가 없습니다.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((ref) => {
            const showDateHeader = ref.match.date !== lastDate;
            lastDate = ref.match.date || null;
            const inputValue = inputs[ref.match.id] ?? ref.match.videoUrl ?? '';
            const isSaving = savingId === ref.match.id;
            return (
              <div key={ref.match.id}>
                {showDateHeader && (
                  <div className="text-xs font-bold text-slate-400 mt-4 mb-2">
                    {ref.match.date || '날짜 미정'}
                  </div>
                )}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="text-sm text-slate-900 min-w-0 truncate">
                      <span className={ref.match.scoreA > ref.match.scoreB ? 'font-bold' : ''}>
                        {teamLabel(ref.match, 'A')}
                      </span>
                      <span className="mx-1.5 font-black text-clay-600">
                        {ref.match.scoreA}:{ref.match.scoreB}
                      </span>
                      <span className={ref.match.scoreB > ref.match.scoreA ? 'font-bold' : ''}>
                        {teamLabel(ref.match, 'B')}
                      </span>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-400">{ref.leagueName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Youtube size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-400" />
                      <input
                        type="url"
                        inputMode="url"
                        value={inputValue}
                        onChange={(e) => setInputs((prev) => ({ ...prev, [ref.match.id]: e.target.value }))}
                        placeholder="유튜브 링크 붙여넣기"
                        className="w-full pl-8 pr-2 py-2 text-xs border border-slate-200 rounded-lg focus:border-clay-500 focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleSave(ref, inputValue)}
                      disabled={isSaving || (!inputValue.trim() && !ref.match.videoUrl)}
                      className="shrink-0 text-xs font-bold text-white bg-clay-600 hover:bg-clay-700 disabled:bg-slate-300 px-3 py-2 rounded-lg transition-colors touch-target"
                    >
                      {isSaving ? <Loader2 size={14} className="animate-spin" /> : '저장'}
                    </button>
                    {ref.match.videoUrl && (
                      <button
                        onClick={() => handleSave(ref, '')}
                        disabled={isSaving}
                        className="shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors touch-target"
                        aria-label="영상 링크 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
