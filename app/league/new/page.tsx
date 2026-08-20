"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Calendar, CheckCircle, Circle, Trophy, Save, User } from "lucide-react";
import { Player } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { safeGetAsync, safeSetAsync } from "@/lib/storage";
import { safeSetString } from "@/lib/storage";
import { PlayersArraySchema, LeagueDataSchema } from "@/lib/schemas";
import { idbGet } from "@/lib/idb";

export default function NewLeaguePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [leagueName, setLeagueName] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [targetSlot, setTargetSlot] = useState<number>(1);
  const [existingSlots, setExistingSlots] = useState<boolean[]>([false, false, false]);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);

  useEffect(() => {
    const load = async () => {
      const savedPlayers = await safeGetAsync('tennis-players', PlayersArraySchema);
      if (savedPlayers) setAllPlayers(savedPlayers);

      const slotChecks = await Promise.all([
        idbGet('league-slot-1'),
        idbGet('league-slot-2'),
        idbGet('league-slot-3'),
      ]);
      setExistingSlots(slotChecks.map(s => !!s));
    };
    load();
  }, []);

  const togglePlayer = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(pid => pid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === allPlayers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allPlayers.map(p => p.id));
    }
  };

  const createLeague = async () => {
    const leaguePlayers = allPlayers.filter(p => selectedIds.includes(p.id));

    const leagueData = {
      name: leagueName,
      endDate: endDate,
      players: leaguePlayers,
      matches: [],
      createdAt: new Date().toISOString(),
    };

    await safeSetAsync(`league-slot-${targetSlot}`, leagueData);
    await safeSetAsync('current-league', leagueData);
    safeSetString('current-slot-index', targetSlot.toString());

    showToast(`${leagueName} 리그가 생성되었습니다!`, "success");
    router.push("/league");
  };

  const handleCreateLeague = () => {
    if (!leagueName.trim()) {
      showToast("리그 이름을 입력해주세요!", "warning");
      return;
    }
    if (selectedIds.length < 2) {
      showToast("최소 2명 이상의 선수가 필요합니다.", "warning");
      return;
    }
    if (existingSlots[targetSlot - 1]) {
      setShowOverwriteDialog(true);
      return;
    }
    createLeague();
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface pb-32">
      <header className="bg-surface p-4 sticky top-0 z-10 border-b border-line">
        <h1 className="text-xl font-bold text-ink tracking-tight">새 리그 설정</h1>
      </header>

      <div className="p-6 space-y-8">
        <section>
          <label className="block text-sm font-bold text-ink-mute mb-2">리그 이름</label>
          <div className="relative">
            <Trophy className="absolute left-4 top-3.5 text-ink-faint" size={20} />
            <input
              type="text"
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="예: 2026 수요테니스"
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-card border border-line-strong placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/40 outline-none font-bold text-ink"
              aria-label="리그 이름"
            />
          </div>
        </section>

        <section>
          <label className="block text-sm font-bold text-ink-mute mb-2">저장할 슬롯 선택</label>
          <div className="flex gap-2" role="radiogroup" aria-label="저장 슬롯 선택">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                onClick={() => setTargetSlot(num)}
                className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all touch-target ${
                  targetSlot === num
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-card text-ink-faint'
                }`}
                role="radio"
                aria-checked={targetSlot === num}
              >
                <span className="font-bold text-lg">SLOT {num}</span>
                <span className={`text-xs ${existingSlots[num-1] ? 'text-amber-500' : 'text-ink-faint'}`}>
                  {existingSlots[num-1] ? '(데이터 있음)' : '(비어 있음)'}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <label className="block text-sm font-bold text-ink-mute mb-2">시즌 종료일 (옵션)</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-3.5 text-ink-faint" size={20} />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-card border border-line-strong text-ink focus:border-accent focus:ring-2 focus:ring-accent/40 outline-none font-medium"
              aria-label="시즌 종료일"
            />
          </div>
        </section>

        <section>
          <div className="flex justify-between items-end mb-3">
            <label className="text-sm font-bold text-ink-mute">선수 풀 (터치하여 참가)</label>
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="text-xs font-medium text-accent hover:opacity-80 touch-target">
                {selectedIds.length === allPlayers.length ? '전체 해제' : '전체 선택'}
              </button>
              <span className="text-accent font-bold text-sm bg-accent-soft px-2 py-1 rounded-lg tabular-nums">
                현재 {selectedIds.length}명
              </span>
            </div>
          </div>

          {allPlayers.length === 0 ? (
            <div className="text-center py-10 bg-card rounded-xl border border-dashed border-line-strong">
              <User size={40} className="mx-auto mb-2 text-ink-faint" />
              <p className="text-ink-mute text-sm">등록된 선수가 없습니다.</p>
              <Link href="/players" className="inline-block mt-3 text-accent font-medium text-sm hover:underline">
                선수 등록하러 가기 →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {allPlayers.map((player) => {
                const isSelected = selectedIds.includes(player.id);
                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 touch-target ${
                      isSelected ? 'border-accent bg-accent-soft' : 'border-line bg-card hover:bg-card-soft'
                    }`}
                    aria-pressed={isSelected}
                  >
                    {isSelected ? (
                      <CheckCircle className="text-accent flex-shrink-0" size={20} />
                    ) : (
                      <Circle className="text-ink-faint flex-shrink-0" size={20} />
                    )}
                    {player.photo ? (
                      <img src={player.photo} alt={player.name} className="w-8 h-8 rounded-full object-cover border border-line-strong flex-shrink-0" />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        player.gender === 'MALE' ? 'bg-tint-m-bg text-tint-m-fg' : 'bg-tint-f-bg text-tint-f-fg'
                      }`}>
                        <span className="text-xs font-bold">{player.name.charAt(0)}</span>
                      </div>
                    )}
                    <span className={`font-bold truncate ${isSelected ? 'text-accent' : 'text-ink-soft'}`}>
                      {player.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      <div className="fixed bottom-20 left-0 right-0 p-4 bg-card border-t border-line max-w-md mx-auto">
        <button
          onClick={handleCreateLeague}
          disabled={!leagueName.trim() || selectedIds.length < 2}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all touch-target ${
            leagueName.trim() && selectedIds.length >= 2
              ? 'bg-accent text-white hover:bg-accent-strong'
              : 'bg-card-soft text-ink-faint cursor-not-allowed'
          }`}
        >
          <Save size={20} />
          리그 생성 및 저장
        </button>
      </div>

      <ConfirmDialog
        isOpen={showOverwriteDialog}
        title="슬롯 덮어쓰기"
        message={`슬롯 ${targetSlot}에 이미 데이터가 있습니다. 덮어쓰시겠습니까?`}
        confirmText="덮어쓰기"
        variant="danger"
        onConfirm={() => { setShowOverwriteDialog(false); createLeague(); }}
        onCancel={() => setShowOverwriteDialog(false)}
      />
    </main>
  );
}
