"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, CheckCircle, Calendar, Users, CloudDownload, Loader2 } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import AppLogo from "@/components/ui/AppLogo";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { LeagueData, Player, Match } from "@/types";
import { safeGetAsync, safeSetAsync, safeRemoveAsync } from "@/lib/storage";
import { safeSetString, safeRemove } from "@/lib/storage";
import { LeagueDataSchema } from "@/lib/schemas";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface ServerLeague {
  id: string;
  name: string;
  players: Player[];
  matches: Match[];
  season_end: string | null;
  updated_at: string;
}

export default function LoadPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isAdmin } = useAuth();
  const [slots, setSlots] = useState<(LeagueData | null)[]>([null, null, null]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [deleteSlotIdx, setDeleteSlotIdx] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [serverLeagues, setServerLeagues] = useState<ServerLeague[] | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const loadedSlots = await Promise.all([
        safeGetAsync('league-slot-1', LeagueDataSchema),
        safeGetAsync('league-slot-2', LeagueDataSchema),
        safeGetAsync('league-slot-3', LeagueDataSchema),
      ]);
      setSlots(loadedSlots.map(s => s ?? null));
      setIsLoading(false);
    };
    load();
  }, []);

  // 관리자: 서버에 공개된 리그 목록 로드
  useEffect(() => {
    if (!isAdmin) return;
    const supabase = getSupabase();
    if (!supabase) return;
    supabase
      .from('shared_leagues')
      .select('id, name, players, matches, season_end, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .then(({ data }) => setServerLeagues((data as ServerLeague[]) ?? []));
  }, [isAdmin]);

  // 서버 리그를 이 기기의 편집 상태로 가져오고 동기화 연결까지 설정
  const handleImportServerLeague = async (league: ServerLeague) => {
    setImportingId(league.id);
    try {
      const data: LeagueData = {
        name: league.name,
        players: league.players || [],
        matches: league.matches || [],
        seasonEnd: league.season_end || undefined,
        createdAt: new Date().toISOString(),
      };
      await safeSetAsync('current-league', data);
      // 슬롯 바인딩 해제 (기존 슬롯 데이터를 덮어쓰지 않도록)
      safeRemove('current-slot-index');
      // 이 서버 리그와 동기화 연결 — 편집하면 자동으로 서버에 반영됨
      localStorage.setItem('shared-league-id', league.id);

      showToast(`${league.name} 리그를 서버에서 불러왔습니다. 편집 내용은 자동 동기화됩니다.`, 'success');
      router.push('/league');
    } catch {
      showToast('서버 리그를 불러오지 못했습니다.', 'error');
      setImportingId(null);
    }
  };

  const handleSelectSlot = (index: number) => {
    if (!slots[index]) return;
    setSelectedIdx(index === selectedIdx ? null : index);
  };

  const handleLoadGame = async () => {
    if (selectedIdx === null) {
      showToast("불러올 슬롯을 선택해주세요.", "warning");
      return;
    }
    const data = slots[selectedIdx];
    if (!data) {
      showToast("비어있는 슬롯입니다.", "error");
      return;
    }

    safeSetString("current-slot-index", (selectedIdx + 1).toString());
    await safeSetAsync("current-league", data);

    showToast(`${data.name} 리그를 불러왔습니다.`, "success");
    router.push("/league");
  };

  const handleDelete = async (slotIndex: number) => {
    await safeRemoveAsync(`league-slot-${slotIndex + 1}`);
    const newSlots = [...slots];
    newSlots[slotIndex] = null;
    setSlots(newSlots);
    if (selectedIdx === slotIndex) setSelectedIdx(null);
    setDeleteSlotIdx(null);
    showToast(`슬롯 ${slotIndex + 1} 데이터가 삭제되었습니다.`, "success");
  };

  if (isLoading) {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="text-slate-400 text-sm">불러오는 중...</div>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-900 text-white pb-32">
      <header className="p-6 mb-2">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <AppLogo size={26} /> 리그 불러오기
        </h1>
      </header>

      {/* 서버에서 불러오기 (관리자 전용) */}
      {isAdmin && (
        <div className="px-6 mb-8">
          <h2 className="text-sm font-bold text-slate-300 mb-1 flex items-center gap-1.5">
            <CloudDownload size={16} className="text-clay-400" /> 서버에서 불러오기
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            최신 데이터를 이 기기로 가져와 편집합니다. 편집 내용은 자동으로 서버에 반영됩니다.
            여러 기기에서 동시에 편집하면 마지막 저장만 남으니 주의하세요.
          </p>
          {!serverLeagues ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 text-clay-500 animate-spin" aria-label="로딩 중" />
            </div>
          ) : serverLeagues.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">서버에 공개된 리그가 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {serverLeagues.map((league) => {
                const total = league.matches?.length ?? 0;
                const finished = league.matches?.filter((m) => m.isFinished).length ?? 0;
                return (
                  <button
                    key={league.id}
                    onClick={() => handleImportServerLeague(league)}
                    disabled={importingId !== null}
                    className="w-full p-4 rounded-2xl border-2 border-slate-700 bg-slate-900/50 hover:border-clay-500 text-left transition-all touch-target disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold truncate">{league.name}</h3>
                        <div className="text-xs text-slate-400 mt-0.5">
                          선수 {league.players?.length ?? 0}명 · 경기 {finished}/{total} ·{' '}
                          {new Date(league.updated_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 업데이트
                        </div>
                      </div>
                      {importingId === league.id ? (
                        <Loader2 size={18} className="text-clay-400 animate-spin shrink-0" />
                      ) : (
                        <CloudDownload size={18} className="text-clay-400 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          <h2 className="text-sm font-bold text-slate-300 mt-8 mb-3">이 기기의 저장 슬롯</h2>
        </div>
      )}

      <div className="px-6 space-y-4">
        {slots.map((slot, index) => {
          const isSelected = selectedIdx === index;
          const hasData = !!slot;

          return (
            <button
              key={index}
              onClick={() => handleSelectSlot(index)}
              disabled={!hasData}
              className={`relative w-full p-5 rounded-2xl border-2 text-left transition-all touch-target ${
                isSelected
                  ? 'bg-slate-800 border-clay-500'
                  : hasData
                  ? 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                  : 'bg-slate-900/30 border-slate-800 cursor-not-allowed'
              }`}
              aria-pressed={isSelected}
            >
              <div className="flex justify-between items-start mb-3">
                <span className={`text-xs font-bold px-2 py-1 rounded ${isSelected ? 'bg-clay-600' : 'bg-slate-700'}`}>
                  SLOT {index + 1}
                </span>
                {isSelected && <CheckCircle className="text-clay-500" size={20} />}
              </div>

              {slot ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-700 rounded-xl flex items-center justify-center">
                      <Save size={24} className="text-clay-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-bold truncate">{slot.name}</h2>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(slot.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {slot.players?.length || 0}명
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteSlotIdx(index); }}
                    className="absolute bottom-4 right-4 p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors touch-target"
                    aria-label={`슬롯 ${index + 1} 삭제`}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-600">
                  <Save size={32} className="mx-auto mb-2 opacity-30" />
                  <p>데이터 없음</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 max-w-md mx-auto">
        <button
          onClick={handleLoadGame}
          disabled={selectedIdx === null}
          className={`w-full py-4 rounded-xl font-bold text-lg transition-all touch-target ${
            selectedIdx !== null
              ? 'bg-clay-600 text-white hover:bg-clay-700'
              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
          }`}
        >
          선택한 리그 불러오기
        </button>
      </div>

      <ConfirmDialog
        isOpen={deleteSlotIdx !== null}
        title="슬롯 데이터 삭제"
        message={`슬롯 ${(deleteSlotIdx ?? 0) + 1}의 리그 데이터를 삭제하시겠습니까?`}
        confirmText="삭제"
        variant="danger"
        onConfirm={() => deleteSlotIdx !== null && handleDelete(deleteSlotIdx)}
        onCancel={() => setDeleteSlotIdx(null)}
      />
    </main>
  );
}
