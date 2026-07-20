'use client';

import { useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { UserCheck, Loader2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { isGuestPlayer } from '@/utils/tennisLogic';
import { safeGetAsync, safeSetAsync } from '@/lib/storage';
import { LeagueDataSchema } from '@/lib/schemas';
import { useToast } from '@/contexts/ToastContext';
import type { Player, Match, Gender } from '@/types';

interface LeagueForConvert {
  id: string;
  name: string;
  players: Player[];
  matches: Match[];
}

interface AdminGuestConverterProps {
  leagues: LeagueForConvert[];
  pool: Player[]; // 대상 선수 선택 목록 (서버 병합 풀)
  onConverted: () => void;
}

interface GuestGroup {
  key: string; // leagueId|date|guestId
  leagueId: string;
  leagueName: string;
  date: string;
  guestId: string;
  guestName: string;
  gender: Gender;
  matchCount: number;
}

const NEW_PLAYER = '__new__';

function replaceInTeam(team: Match['teamA'], guestId: string, target: Player): Match['teamA'] {
  if (!team?.man) return team;
  return {
    ...team,
    man: team.man.id === guestId ? { ...target } : team.man,
    woman: team.woman?.id === guestId ? { ...target } : team.woman,
  };
}

// 과거 경기의 게스트를 실명 선수로 전환 (리그+날짜+게스트 단위 — 게스트 id는 날짜 간 재사용되므로 전체 치환 금지)
export default function AdminGuestConverter({ leagues, pool, onConverted }: AdminGuestConverterProps) {
  const { showToast } = useToast();
  const [selection, setSelection] = useState<Record<string, string>>({}); // groupKey → playerId | __new__
  const [newNames, setNewNames] = useState<Record<string, string>>({});
  const [convertingKey, setConvertingKey] = useState<string | null>(null);

  const groups = useMemo<GuestGroup[]>(() => {
    const map = new Map<string, GuestGroup>();
    leagues.forEach((l) => {
      (l.matches || []).forEach((m) => {
        const slots = [m.teamA?.man, m.teamA?.woman, m.teamB?.man, m.teamB?.woman];
        const seen = new Set<string>();
        slots.forEach((p) => {
          if (!p?.id || !isGuestPlayer(p.id) || seen.has(p.id)) return;
          seen.add(p.id);
          const key = `${l.id}|${m.date}|${p.id}`;
          const g = map.get(key);
          if (g) g.matchCount++;
          else
            map.set(key, {
              key,
              leagueId: l.id,
              leagueName: l.name,
              date: m.date,
              guestId: p.id,
              guestName: p.name,
              gender: p.gender,
              matchCount: 1,
            });
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [leagues]);

  const handleConvert = async (group: GuestGroup) => {
    const supabase = getSupabase();
    if (!supabase) return;

    const chosen = selection[group.key];
    if (!chosen) {
      showToast('전환할 선수를 선택해주세요.', 'warning');
      return;
    }
    let target: Player;
    if (chosen === NEW_PLAYER) {
      const name = (newNames[group.key] || '').trim();
      if (!name) {
        showToast('새 선수 이름을 입력해주세요.', 'warning');
        return;
      }
      const existing = pool.find((p) => p.name === name);
      target = existing ?? { id: uuidv4(), name, gender: group.gender };
    } else {
      const found = pool.find((p) => p.id === chosen);
      if (!found) return;
      target = found;
    }

    setConvertingKey(group.key);
    try {
      // 서버 최신 상태를 읽어 해당 (날짜, 게스트)만 치환
      const { data: row, error: readErr } = await supabase
        .from('shared_leagues')
        .select('players, matches')
        .eq('id', group.leagueId)
        .single();
      if (readErr || !row) throw readErr ?? new Error('read failed');

      const newMatches = (row.matches as Match[]).map((m) => {
        if (m.date !== group.date) return m;
        return {
          ...m,
          teamA: replaceInTeam(m.teamA, group.guestId, target),
          teamB: replaceInTeam(m.teamB, group.guestId, target),
        };
      });
      const players = row.players as Player[];
      const newPlayers = players.some((p) => p.id === target.id) ? players : [...players, target];

      const { data: updated, error: writeErr } = await supabase
        .from('shared_leagues')
        .update({ players: newPlayers, matches: newMatches, updated_at: new Date().toISOString() })
        .eq('id', group.leagueId)
        .select('id, updated_at');
      if (writeErr || !updated || updated.length === 0) throw writeErr ?? new Error('write failed');

      // 이 기기가 편집 중인 리그라면 로컬에도 반영 후 잠금 기준값 갱신
      if (localStorage.getItem('shared-league-id') === group.leagueId) {
        try {
          const local = await safeGetAsync('current-league', LeagueDataSchema);
          if (local) {
            const localMatches = local.matches.map((m) => {
              if (m.date !== group.date) return m;
              return {
                ...m,
                teamA: replaceInTeam(m.teamA, group.guestId, target),
                teamB: replaceInTeam(m.teamB, group.guestId, target),
              };
            });
            const localPlayers = local.players.some((p) => p.id === target.id)
              ? local.players
              : [...local.players, target];
            await safeSetAsync('current-league', { ...local, matches: localMatches, players: localPlayers });
          }
          localStorage.setItem('shared-league-updated-at', updated[0].updated_at);
        } catch {
          // 로컬 반영 실패 시 기준값 미갱신 → 다음 동기화에서 충돌 감지로 안전 처리
        }
      }

      showToast(`${group.guestName} → ${target.name} 전환 완료 (${group.matchCount}경기)`, 'success');
      onConverted();
    } catch (e) {
      console.warn('[guest-convert] failed:', e);
      showToast('전환에 실패했습니다. 관리자 권한과 네트워크를 확인해주세요.', 'error');
    } finally {
      setConvertingKey(null);
    }
  };

  if (groups.length === 0) return null;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <h2 className="text-sm font-bold text-slate-700 mb-1 flex items-center gap-1.5">
        <UserCheck size={15} className="text-clay-600" /> 게스트 실명 전환
      </h2>
      <p className="text-xs text-slate-400 mb-3">
        과거 경기의 게스트를 실제 선수로 바꿔 종합 랭킹에 포함시킵니다. 날짜 단위로 전환됩니다.
      </p>

      <div className="space-y-3">
        {groups.map((g) => {
          const sel = selection[g.key] ?? '';
          const busy = convertingKey === g.key;
          return (
            <div key={g.key} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50">
              <div className="text-sm font-medium text-slate-800 mb-2">
                {g.guestName}
                <span className="text-xs text-slate-400 ml-1.5">
                  {g.leagueName} · {g.date} · {g.matchCount}경기
                </span>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={sel}
                  onChange={(e) => setSelection((prev) => ({ ...prev, [g.key]: e.target.value }))}
                  className="flex-1 px-2 py-2 text-sm border border-slate-200 rounded-lg focus:border-clay-500 focus:outline-none bg-white"
                >
                  <option value="">전환할 선수 선택</option>
                  {pool
                    .filter((p) => p.gender === g.gender)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  <option value={NEW_PLAYER}>+ 새 선수 이름 입력</option>
                </select>
                {sel === NEW_PLAYER && (
                  <input
                    value={newNames[g.key] ?? ''}
                    onChange={(e) => setNewNames((prev) => ({ ...prev, [g.key]: e.target.value }))}
                    placeholder="이름"
                    className="w-24 px-2 py-2 text-sm border border-slate-200 rounded-lg focus:border-clay-500 focus:outline-none"
                  />
                )}
                <button
                  onClick={() => handleConvert(g)}
                  disabled={busy}
                  className="shrink-0 text-xs font-bold text-white bg-clay-600 hover:bg-clay-700 disabled:bg-slate-300 px-3 py-2 rounded-lg transition-colors touch-target"
                >
                  {busy ? <Loader2 size={14} className="animate-spin" /> : '전환'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
