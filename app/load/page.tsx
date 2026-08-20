"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Trophy, ChevronRight, Loader2, Database, CloudUpload, AlertTriangle } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import AppLogo from "@/components/ui/AppLogo";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { SeasonRow, PlayerStat } from "@/types";
import { fetchSeasons, isMissingTableError } from "@/lib/seasonApi";
import { previewMigration, runMigration, type MigrationPreview } from "@/lib/migrateToSeasons";
import { useAuth } from "@/contexts/AuthContext";

// 지난 시즌 히스토리 + (관리자) 구버전 데이터 → 시즌 타임라인 이전 도구
export default function SeasonsPage() {
  const { showToast } = useToast();
  const { isAdmin } = useAuth();
  const [seasons, setSeasons] = useState<SeasonRow[] | null>(null);
  const [tableMissing, setTableMissing] = useState(false);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState<MigrationPreview | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [showMigrateConfirm, setShowMigrateConfirm] = useState(false);

  const load = useCallback(async () => {
    try {
      const rows = await fetchSeasons();
      setSeasons(rows);
      setTableMissing(false);
      if (isAdmin) {
        try {
          setPreview(await previewMigration());
        } catch {
          setPreview(null);
        }
      }
    } catch (e) {
      if (isMissingTableError(e)) setTableMissing(true);
      else setError(true);
      setSeasons([]);
    }
  }, [isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const handleMigrate = async () => {
    setShowMigrateConfirm(false);
    setIsMigrating(true);
    try {
      const result = await runMigration();
      showToast(
        `이전 완료: 시즌 ${result.seasons}개 · 경기 ${result.matches}건${
          result.skippedMatches > 0 ? ` (형식 오류 ${result.skippedMatches}건 제외)` : ""
        }`,
        "success"
      );
      await load();
    } catch (e) {
      console.warn("[migrate] failed:", e);
      showToast(e instanceof Error ? e.message : "이전에 실패했습니다.", "error");
    } finally {
      setIsMigrating(false);
    }
  };

  const championName = (s: SeasonRow): string | null => {
    const rankings = s.final_rankings as PlayerStat[] | null;
    if (!rankings || !s.champion_player_id) return null;
    return rankings.find((r) => r.playerId === s.champion_player_id)?.name ?? null;
  };

  if (seasons === null) {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" aria-label="로딩 중" />
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface pb-24">
      <header className="p-6 mb-2">
        <h1 className="text-xl font-bold text-ink tracking-tight flex items-center gap-2">
          <AppLogo size={26} /> 지난 시즌 · 데이터
        </h1>
      </header>

      {error && (
        <div className="mx-6 mb-6 bg-card rounded-2xl border border-line p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-down mx-auto mb-3" />
          <p className="text-sm text-ink-mute">서버에 연결하지 못했습니다. 네트워크를 확인해주세요.</p>
        </div>
      )}

      {/* 마이그레이션 전: 테이블 없음 안내 */}
      {tableMissing && (
        <div className="mx-6 mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <p className="text-sm text-amber-600 font-medium leading-relaxed">
            시즌 테이블이 아직 없습니다. Supabase SQL Editor에서{" "}
            <code className="font-bold text-xs">supabase-migration-seasons.sql</code>을 실행한 뒤
            이 화면에서 데이터 이전을 진행해주세요.
          </p>
        </div>
      )}

      {/* 구버전 데이터 이전 (관리자, seasons 테이블 준비된 후) */}
      {isAdmin && !tableMissing && preview && preview.existingSeasons === 0 && (
        <section className="mx-6 mb-8 bg-card rounded-2xl border border-line p-4">
          <h2 className="text-sm font-semibold text-ink tracking-tight mb-1 flex items-center gap-1.5">
            <Database size={15} className="text-accent" /> 구버전 데이터 이전
          </h2>
          <p className="text-xs text-ink-mute leading-relaxed mb-3">
            이 기기의 시즌 아카이브 <b className="text-ink tabular-nums">{preview.localArchives}개</b>와 서버의 구버전
            리그 <b className="text-ink tabular-nums">{preview.serverLeagues}개</b>를 시즌 타임라인으로 옮깁니다.
            원본 데이터는 지우지 않고 백업으로 남습니다.
          </p>
          <button
            onClick={() => setShowMigrateConfirm(true)}
            disabled={isMigrating || (preview.localArchives === 0 && preview.serverLeagues === 0)}
            className="w-full py-3 rounded-xl font-bold text-sm bg-accent hover:bg-accent-strong text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target flex items-center justify-center gap-2"
          >
            {isMigrating ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />}
            {isMigrating ? "이전하는 중..." : "서버로 이전 실행"}
          </button>
        </section>
      )}

      {/* 시즌 목록 */}
      <div className="px-6 space-y-3">
        {seasons.length === 0 && !tableMissing && !error ? (
          <div className="bg-card rounded-2xl border border-line p-8 text-center">
            <Trophy className="w-10 h-10 text-ink-faint mx-auto mb-3" />
            <p className="text-sm text-ink-mute mb-3">아직 시즌이 없습니다.</p>
            <Link href="/league/new" className="text-sm font-bold text-accent hover:underline">
              새 시즌 시작하기 →
            </Link>
          </div>
        ) : (
          [...seasons]
            .sort((a, b) => b.season_no - a.season_no)
            .map((s) => {
              const champ = championName(s);
              return (
                <Link
                  key={s.id}
                  href={s.status === "live" ? "/league" : `/live?id=${s.id}`}
                  className={`flex items-center justify-between rounded-2xl border p-4 transition-colors ${
                    s.status === "live"
                      ? "bg-accent-soft border-accent hover:bg-accent/15"
                      : "bg-card border-line hover:border-accent/40 hover:bg-card-soft"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink truncate">{s.name}</span>
                      {s.status === "live" ? (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-accent text-white">진행 중</span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-card-soft text-ink-mute tabular-nums">
                          시즌 {s.season_no}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-ink-mute mt-1 tabular-nums">
                      {champ && (
                        <span className="inline-flex items-center gap-0.5 text-amber-500 font-semibold mr-1.5">
                          <Trophy size={11} /> {champ}
                        </span>
                      )}
                      {s.starts_on ?? ""}{s.ends_on ? ` ~ ${s.ends_on}` : s.status === "live" ? " ~ 진행 중" : ""}
                      {" · "}선수 {s.players?.length ?? 0}명
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-ink-faint shrink-0" />
                </Link>
              );
            })
        )}
      </div>

      <ConfirmDialog
        isOpen={showMigrateConfirm}
        title="구버전 데이터 이전"
        message={`로컬 아카이브 ${preview?.localArchives ?? 0}개와 서버 리그 ${preview?.serverLeagues ?? 0}개를 시즌 타임라인으로 이전합니다. 원본은 삭제되지 않습니다.`}
        confirmText="이전 실행"
        onConfirm={handleMigrate}
        onCancel={() => setShowMigrateConfirm(false)}
      />
    </main>
  );
}
