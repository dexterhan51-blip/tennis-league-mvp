"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Circle, Trophy, Play, User, Loader2 } from "lucide-react";
import { Player, SeasonRow } from "@/types";
import { useToast } from "@/contexts/ToastContext";
import { safeGetAsync } from "@/lib/storage";
import { PlayersArraySchema } from "@/lib/schemas";
import { fetchSeasons, createSeason, isMissingTableError } from "@/lib/seasonApi";

export default function NewSeasonPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [seasonName, setSeasonName] = useState("");
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<SeasonRow[] | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const liveSeason = seasons?.find((s) => s.status === "live") ?? null;
  const nextSeasonNo = seasons && seasons.length > 0 ? Math.max(...seasons.map((s) => s.season_no)) + 1 : 1;

  useEffect(() => {
    const load = async () => {
      const savedPlayers = await safeGetAsync("tennis-players", PlayersArraySchema);
      if (savedPlayers) setAllPlayers(savedPlayers);

      try {
        const rows = await fetchSeasons();
        setSeasons(rows);
        // 직전 시즌의 선수 명단을 기본 선택으로 물려받는다
        const lastSeason = rows[0];
        if (lastSeason?.players?.length) {
          setSelectedIds(lastSeason.players.map((p) => p.id));
        }
      } catch (e) {
        if (isMissingTableError(e)) {
          showToast("서버 마이그레이션이 필요합니다. 설정 > 데이터 이전을 먼저 진행해주세요.", "warning");
        } else {
          showToast("서버에 연결하지 못했습니다. 네트워크를 확인해주세요.", "error");
        }
        setSeasons([]);
      }
    };
    load();
  }, [showToast]);

  const togglePlayer = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((pid) => pid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedIds.length === allPlayers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allPlayers.map((p) => p.id));
    }
  };

  const handleCreateSeason = async () => {
    if (!seasonName.trim()) {
      showToast("시즌 이름을 입력해주세요!", "warning");
      return;
    }
    if (selectedIds.length < 2) {
      showToast("최소 2명 이상의 선수가 필요합니다.", "warning");
      return;
    }
    if (liveSeason) {
      showToast(`이미 진행 중인 시즌(${liveSeason.name})이 있습니다. 시즌 종료 후 새 시즌을 시작할 수 있어요.`, "warning");
      return;
    }

    setIsCreating(true);
    try {
      const seasonPlayers = allPlayers
        .filter((p) => selectedIds.includes(p.id))
        .map((p) => ({ ...p, bonusPoints: 0, mvpCount: 0 }));
      await createSeason({
        seasonNo: nextSeasonNo,
        name: seasonName.trim(),
        players: seasonPlayers,
      });
      showToast(`${seasonName.trim()} 시즌이 시작되었습니다!`, "success");
      router.push("/league");
    } catch (e) {
      console.warn("[season] create failed:", e);
      showToast("시즌 생성에 실패했습니다. 네트워크와 관리자 권한을 확인해주세요.", "error");
      setIsCreating(false);
    }
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface pb-32">
      <header className="bg-surface p-4 sticky top-0 z-10 border-b border-line">
        <h1 className="text-xl font-bold text-ink tracking-tight">새 시즌 시작</h1>
        <p className="text-xs text-ink-mute mt-0.5 tabular-nums">
          시즌 {nextSeasonNo} · 지난 시즌 기록은 자동으로 통산에 누적됩니다
        </p>
      </header>

      {liveSeason && (
        <div className="mx-6 mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-sm text-amber-600 font-medium">
            이미 진행 중인 시즌({liveSeason.name})이 있습니다. 리그 화면에서 시즌을 종료하면 새 시즌이 자동으로 이어집니다.
          </p>
          <Link href="/league" className="inline-block mt-2 text-sm font-bold text-accent hover:underline">
            리그 화면으로 →
          </Link>
        </div>
      )}

      <div className="p-6 space-y-8">
        <section>
          <label className="block text-sm font-bold text-ink-mute mb-2">시즌 이름</label>
          <div className="relative">
            <Trophy className="absolute left-4 top-3.5 text-ink-faint" size={20} />
            <input
              type="text"
              value={seasonName}
              onChange={(e) => setSeasonName(e.target.value)}
              placeholder={`예: 러브포티 시즌 ${nextSeasonNo}`}
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-card border border-line-strong placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/40 outline-none font-bold text-ink"
              aria-label="시즌 이름"
            />
          </div>
        </section>

        <section>
          <div className="flex justify-between items-end mb-3">
            <label className="text-sm font-bold text-ink-mute">선수 풀 (터치하여 참가)</label>
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="text-xs font-medium text-accent hover:opacity-80 touch-target">
                {selectedIds.length === allPlayers.length ? "전체 해제" : "전체 선택"}
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
                      isSelected ? "border-accent bg-accent-soft" : "border-line bg-card hover:bg-card-soft"
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
                        player.gender === "MALE" ? "bg-tint-m-bg text-tint-m-fg" : "bg-tint-f-bg text-tint-f-fg"
                      }`}>
                        <span className="text-xs font-bold">{player.name.charAt(0)}</span>
                      </div>
                    )}
                    <span className={`font-bold truncate ${isSelected ? "text-accent" : "text-ink-soft"}`}>
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
          onClick={handleCreateSeason}
          disabled={!seasonName.trim() || selectedIds.length < 2 || isCreating || !!liveSeason || seasons === null}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all touch-target ${
            seasonName.trim() && selectedIds.length >= 2 && !isCreating && !liveSeason && seasons !== null
              ? "bg-accent text-white hover:bg-accent-strong"
              : "bg-card-soft text-ink-faint cursor-not-allowed"
          }`}
        >
          {isCreating ? <Loader2 size={20} className="animate-spin" /> : <Play size={20} />}
          {isCreating ? "시작하는 중..." : "시즌 시작"}
        </button>
      </div>
    </main>
  );
}
