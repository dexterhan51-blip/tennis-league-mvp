'use client';

import { useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Handshake, Loader2, Plus, Trash2, Youtube } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { parseYouTube } from '@/lib/youtube';
import { safeGetAsync } from '@/lib/storage';
import { PlayersArraySchema } from '@/lib/schemas';
import { useToast } from '@/contexts/ToastContext';
import type { Player, Match, FriendlyMatchRow, Gender } from '@/types';

interface AdminFriendlyManagerProps {
  serverPlayers: Player[]; // 서버 리그 로스터 + 친선 스냅샷 병합 풀
  friendly: FriendlyMatchRow[];
  onChanged: () => void; // 저장/삭제 후 부모 데이터 재로드
}

type MatchType = 'singles' | 'doubles';

const EMPTY_SLOTS = { a1: '', a2: '', b1: '', b2: '' };

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function teamLabel(m: Match, side: 'A' | 'B'): string {
  const t = side === 'A' ? m.teamA : m.teamB;
  if (!t?.man) return '미정';
  return t.man.id === t.woman?.id ? t.man.name : [t.man?.name, t.woman?.name].filter(Boolean).join('·');
}

// 관리자용: 리그 밖 친선경기 입력/삭제 (행 단위 insert라 동시성 충돌 없음)
export default function AdminFriendlyManager({ serverPlayers, friendly, onChanged }: AdminFriendlyManagerProps) {
  const { showToast } = useToast();
  const [localPlayers, setLocalPlayers] = useState<Player[]>([]);
  const [extraPlayers, setExtraPlayers] = useState<Player[]>([]); // 이 세션에서 새로 만든 선수
  const [date, setDate] = useState(todayStr());
  const [matchType, setMatchType] = useState<MatchType>('doubles');
  const [slots, setSlots] = useState<Record<keyof typeof EMPTY_SLOTS, string>>({ ...EMPTY_SLOTS });
  const [scoreA, setScoreA] = useState('');
  const [scoreB, setScoreB] = useState('');
  const [videoInput, setVideoInput] = useState('');
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>('MALE');
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 관리자 기기의 전역 선수 풀 병합 (리그 미참가 선수 대응)
  useEffect(() => {
    safeGetAsync('tennis-players', PlayersArraySchema).then((p) => setLocalPlayers(p ?? []));
  }, []);

  const pool = useMemo(() => {
    const map = new Map<string, Player>();
    [...serverPlayers, ...localPlayers, ...extraPlayers].forEach((p) => {
      if (p?.id && !map.has(p.id)) map.set(p.id, p);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  }, [serverPlayers, localPlayers, extraPlayers]);

  const byId = (id: string) => pool.find((p) => p.id === id);

  const handleAddNewPlayer = () => {
    const name = newName.trim();
    if (!name) return;
    if (pool.some((p) => p.name === name)) {
      showToast('같은 이름의 선수가 이미 있습니다. 목록에서 선택해주세요.', 'warning');
      return;
    }
    setExtraPlayers((prev) => [...prev, { id: uuidv4(), name, gender: newGender }]);
    setNewName('');
    showToast(`${name} 선수를 추가했습니다. 슬롯에서 선택하세요.`, 'success');
  };

  const activeSlotKeys: (keyof typeof EMPTY_SLOTS)[] =
    matchType === 'singles' ? ['a1', 'b1'] : ['a1', 'a2', 'b1', 'b2'];

  const handleSave = async () => {
    const supabase = getSupabase();
    if (!supabase) return;

    const chosen = activeSlotKeys.map((k) => slots[k]);
    if (chosen.some((id) => !id)) {
      showToast('참가 선수를 모두 선택해주세요.', 'warning');
      return;
    }
    if (new Set(chosen).size !== chosen.length) {
      showToast('같은 선수가 중복 선택되었습니다.', 'warning');
      return;
    }
    const sA = parseInt(scoreA, 10);
    const sB = parseInt(scoreB, 10);
    if (isNaN(sA) || isNaN(sB) || sA < 0 || sB < 0) {
      showToast('점수를 입력해주세요.', 'warning');
      return;
    }
    let videoUrl: string | undefined;
    if (videoInput.trim()) {
      const yt = parseYouTube(videoInput.trim());
      if (!yt) {
        showToast('유튜브 링크 형식이 아닙니다.', 'error');
        return;
      }
      videoUrl = yt.watchUrl;
    }

    const pick = (k: keyof typeof EMPTY_SLOTS) => byId(slots[k])!;
    const teamA =
      matchType === 'singles'
        ? { id: uuidv4(), man: pick('a1'), woman: pick('a1') }
        : { id: uuidv4(), man: pick('a1'), woman: pick('a2') };
    const teamB =
      matchType === 'singles'
        ? { id: uuidv4(), man: pick('b1'), woman: pick('b1') }
        : { id: uuidv4(), man: pick('b1'), woman: pick('b2') };

    const matchId = uuidv4();
    const match: Match = {
      id: matchId,
      date,
      teamA,
      teamB,
      scoreA: sA,
      scoreB: sB,
      isFinished: true,
      ...(videoUrl ? { videoUrl } : {}),
    };

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('friendly_matches')
        .insert({ id: matchId, match_date: date, match });
      if (error) throw error;
      showToast('친선경기를 등록했습니다. 랭킹에 반영됩니다.', 'success');
      setSlots({ ...EMPTY_SLOTS });
      setScoreA('');
      setScoreB('');
      setVideoInput('');
      onChanged();
    } catch (e) {
      console.warn('[friendly] save failed:', e);
      showToast('등록에 실패했습니다. 관리자 권한과 네트워크를 확인해주세요. (테이블 미생성일 수 있음)', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    setDeletingId(id);
    try {
      const { error } = await supabase.from('friendly_matches').delete().eq('id', id);
      if (error) throw error;
      showToast('삭제했습니다.', 'success');
      onChanged();
    } catch {
      showToast('삭제에 실패했습니다.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const slotLabel: Record<keyof typeof EMPTY_SLOTS, string> = {
    a1: 'A팀 선수 1', a2: 'A팀 선수 2', b1: 'B팀 선수 1', b2: 'B팀 선수 2',
  };

  const sortedFriendly = [...friendly].sort((a, b) => (b.match_date || '').localeCompare(a.match_date || ''));

  return (
    <section className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-1.5">
          <Handshake size={15} className="text-green-600" /> 친선경기 등록
        </h2>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:border-clay-500 focus:outline-none"
          />
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
            {(['doubles', 'singles'] as MatchType[]).map((t) => (
              <button
                key={t}
                onClick={() => setMatchType(t)}
                className={`flex-1 py-2 transition-colors touch-target ${
                  matchType === t ? 'bg-clay-600 text-white' : 'bg-white text-slate-500'
                }`}
              >
                {t === 'doubles' ? '복식' : '단식'}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          {activeSlotKeys.map((k) => (
            <select
              key={k}
              value={slots[k]}
              onChange={(e) => setSlots((prev) => ({ ...prev, [k]: e.target.value }))}
              className="px-2 py-2 text-sm border border-slate-200 rounded-lg focus:border-clay-500 focus:outline-none bg-white"
            >
              <option value="">{slotLabel[k]}</option>
              {pool.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.gender === 'MALE' ? '남' : '여'})
                </option>
              ))}
            </select>
          ))}
        </div>

        {/* 목록에 없는 선수 즉석 추가 */}
        <div className="flex items-center gap-2 mb-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="목록에 없는 선수 이름"
            className="flex-1 px-3 py-2 text-xs border border-dashed border-slate-300 rounded-lg focus:border-clay-500 focus:outline-none"
          />
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-bold">
            {(['MALE', 'FEMALE'] as Gender[]).map((g) => (
              <button
                key={g}
                onClick={() => setNewGender(g)}
                className={`px-2.5 py-2 transition-colors touch-target ${
                  newGender === g ? 'bg-slate-700 text-white' : 'bg-white text-slate-400'
                }`}
              >
                {g === 'MALE' ? '남' : '여'}
              </button>
            ))}
          </div>
          <button
            onClick={handleAddNewPlayer}
            disabled={!newName.trim()}
            className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 touch-target"
            aria-label="선수 추가"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            inputMode="numeric"
            value={scoreA}
            onChange={(e) => setScoreA(e.target.value)}
            placeholder="A팀"
            className="w-20 px-2 py-2 text-center text-sm font-bold border border-slate-200 rounded-lg focus:border-clay-500 focus:outline-none"
          />
          <span className="text-slate-400 font-black">:</span>
          <input
            type="number"
            inputMode="numeric"
            value={scoreB}
            onChange={(e) => setScoreB(e.target.value)}
            placeholder="B팀"
            className="w-20 px-2 py-2 text-center text-sm font-bold border border-slate-200 rounded-lg focus:border-clay-500 focus:outline-none"
          />
          <div className="relative flex-1">
            <Youtube size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-red-400" />
            <input
              type="url"
              value={videoInput}
              onChange={(e) => setVideoInput(e.target.value)}
              placeholder="영상 링크 (선택)"
              className="w-full pl-8 pr-2 py-2 text-xs border border-slate-200 rounded-lg focus:border-clay-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-2.5 rounded-xl bg-clay-600 hover:bg-clay-700 text-white text-sm font-bold transition-colors disabled:bg-slate-300 touch-target flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : '등록'}
        </button>
      </div>

      {/* 기존 친선경기 목록 */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 mb-2">등록된 친선경기 {sortedFriendly.length}건</h3>
        {sortedFriendly.length === 0 ? (
          <p className="text-xs text-slate-400 bg-white rounded-xl border border-slate-100 p-4 text-center">
            아직 등록된 친선경기가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedFriendly.map((f) => (
              <div
                key={f.id}
                className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-slate-900 truncate">
                    {teamLabel(f.match, 'A')}
                    <span className="mx-1.5 font-black text-clay-600">
                      {f.match.scoreA}:{f.match.scoreB}
                    </span>
                    {teamLabel(f.match, 'B')}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {f.match_date}
                    {f.match.videoUrl ? ' · 영상 있음' : ''}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(f.id)}
                  disabled={deletingId === f.id}
                  className="shrink-0 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors touch-target"
                  aria-label="친선경기 삭제"
                >
                  {deletingId === f.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
