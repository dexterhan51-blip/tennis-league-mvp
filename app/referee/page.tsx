"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Undo2, Flag, Check } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { LiveSeasonCacheSchema } from "@/lib/schemas";
import { fetchMatchById } from "@/lib/seasonApi";
import { isDemoMode } from "@/lib/backend";
import { DEMO_MATCHES } from "@/lib/demoData";
import { safeGetAsync } from "@/lib/storage";
import { enqueue } from "@/lib/writeQueue";
import type { Match, Player, PointLogEntry } from "@/types";
import {
  addPoint,
  gameWinner,
  isGameOver,
  isDeuce,
  isGoldenPoint,
  displayScore,
  type ScoringConfig,
  type ScoringRule,
} from "@/lib/liveScoring";
import { getScoringConfig, saveScoringConfig } from "@/lib/scoringConfig";

type Phase = "loading" | "notfound" | "setup" | "play";

interface LoadedCtx {
  /** 리그전이면 소속 시즌 id, 친선경기면 null */
  seasonId: string | null;
  match: Match;
}

/** 매치 진행 상태: 현재 게임 포인트(pa/pb) + 누적 게임 수(ga/gb = 매치 스코어) */
interface Progress {
  pa: number;
  pb: number;
  ga: number;
  gb: number;
}

const ZERO: Progress = { pa: 0, pb: 0, ga: 0, gb: 0 };

// teamA.man/woman, teamB.man/woman 에서 중복(단식) 제거한 후보 선수
function getCandidates(m: Match): Player[] {
  const out: Player[] = [];
  const seen = new Set<string>();
  for (const p of [m.teamA.man, m.teamA.woman, m.teamB.man, m.teamB.woman]) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

function teamName(m: Match, team: "A" | "B"): string {
  const t = team === "A" ? m.teamA : m.teamB;
  return t.man.id === t.woman.id ? t.man.name : `${t.man.name} · ${t.woman.name}`;
}

export default function RefereePage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [phase, setPhase] = useState<Phase>("loading");
  const [ctx, setCtx] = useState<LoadedCtx | null>(null);

  // 설정
  const [config, setConfig] = useState<ScoringConfig>({ rule: "no-ad", winPoints: 4 });
  const [serveOrder, setServeOrder] = useState<string[]>([]);

  // 진행
  const [progress, setProgress] = useState<Progress>(ZERO);
  const [history, setHistory] = useState<Progress[]>([]);
  const [pointLog, setPointLog] = useState<PointLogEntry[]>([]);
  const [startTime, setStartTime] = useState<number>(0);
  const [showFinish, setShowFinish] = useState(false);

  // 마운트 시 URL의 ?id 로 경기 로드 (서버가 원본 — 리그 경기 → 친선경기 순으로 조회)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const id = new URLSearchParams(window.location.search).get("id");
      // 서버 미설정(로컬 개발): 예시 경기로 화면만 확인 (결과는 어디에도 저장되지 않는다)
      if (isDemoMode()) {
        const demo = DEMO_MATCHES.find((m) => m.id === id) ?? DEMO_MATCHES[DEMO_MATCHES.length - 1];
        setCtx({ seasonId: null, match: { ...demo, scoreA: 0, scoreB: 0, isFinished: false } });
        setServeOrder([demo.teamA.man.id, demo.teamB.man.id, demo.teamA.woman.id, demo.teamB.woman.id]);
        setPhase("setup");
        return;
      }
      if (!id) {
        setPhase("notfound");
        return;
      }

      let match: Match | null = null;
      let seasonId: string | null = null;

      // 서버가 원본 — 리그 경기 → 친선경기 순으로 찾는다. 오프라인이면 아래 캐시로 넘어간다
      try {
        const found = await fetchMatchById(id);
        if (found) {
          match = found.match;
          seasonId = found.seasonId;
        }
      } catch (e) {
        console.warn("[referee] 서버에서 경기를 읽지 못했습니다:", e);
      }

      // 방금 생성돼 아직 서버에 안 올라간 경기 대비: 오프라인 캐시에서 조회
      if (!match) {
        const cache = await safeGetAsync("live-season-cache", LiveSeasonCacheSchema);
        const cached = cache?.matches.find((m) => m.id === id);
        if (cached) {
          match = cached;
          seasonId = cached.isFriendly ? null : (cache!.season.id as string);
        }
      }

      if (cancelled) return;
      if (!match) {
        setPhase("notfound");
        return;
      }
      setCtx({ seasonId, match });
      setConfig(getScoringConfig());
      // 기본 서브 순서: A남 → B남 → A여 → B여 (중복 제거)
      const def = [match.teamA.man, match.teamB.man, match.teamA.woman, match.teamB.woman]
        .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
        .map((p) => p.id);
      setServeOrder(match.serveOrder && match.serveOrder.length ? match.serveOrder : def);
      setPhase("setup");
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const candidates = useMemo(() => (ctx ? getCandidates(ctx.match) : []), [ctx]);

  const setRule = useCallback((rule: ScoringRule) => {
    setConfig((c) => {
      const next = { ...c, rule };
      saveScoringConfig(next);
      return next;
    });
  }, []);

  const setWinPoints = useCallback((winPoints: number) => {
    setConfig((c) => {
      const next = { ...c, winPoints };
      saveScoringConfig(next);
      return next;
    });
  }, []);

  // 서브 순서: 후보를 탭한 순서대로 채움
  const toggleServe = useCallback((id: string) => {
    setServeOrder((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const startGame = useCallback(() => {
    if (serveOrder.length !== candidates.length) {
      showToast("서브 순서를 모두 정해주세요.", "warning");
      return;
    }
    setProgress(ZERO);
    setHistory([]);
    setPointLog([]);
    setStartTime(Date.now());
    setShowFinish(false);
    setPhase("play");
  }, [serveOrder.length, candidates.length, showToast]);

  // 현재 게임의 서버(게임마다 서브 순서대로 회전)
  const serverId = serveOrder.length
    ? serveOrder[(progress.ga + progress.gb) % serveOrder.length]
    : undefined;
  const servingTeam: "A" | "B" | null = useMemo(() => {
    if (!ctx || !serverId) return null;
    const inA = ctx.match.teamA.man.id === serverId || ctx.match.teamA.woman.id === serverId;
    return inA ? "A" : "B";
  }, [ctx, serverId]);

  const handleAddPoint = useCallback(
    (team: "A" | "B") => {
      if (showFinish) return;
      const cur = { a: progress.pa, b: progress.pb };
      const next = addPoint(cur, team, config);
      if (next.a === cur.a && next.b === cur.b) return;

      const over = isGameOver(next, config);
      const w = over ? gameWinner(next, config) : null;
      const nga = progress.ga + (w === "A" ? 1 : 0);
      const ngb = progress.gb + (w === "B" ? 1 : 0);

      const entry: PointLogEntry = {
        t: Math.round((Date.now() - startTime) / 1000),
        winner: team,
        pointA: next.a,
        pointB: next.b,
        gameA: nga,
        gameB: ngb,
        gameWon: w ?? undefined,
        serverId,
      };

      setHistory((h) => [...h, progress]);
      // 게임을 따냈으면 포인트 리셋, 게임 수 +1 (매치는 계속 진행)
      setProgress(
        over ? { pa: 0, pb: 0, ga: nga, gb: ngb } : { pa: next.a, pb: next.b, ga: progress.ga, gb: progress.gb },
      );
      setPointLog((l) => [...l, entry]);
    },
    [showFinish, progress, config, startTime, serverId],
  );

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setProgress(h[h.length - 1]);
      setPointLog((l) => l.slice(0, -1));
      return h.slice(0, -1);
    });
  }, []);

  const reflectResult = useCallback(async () => {
    if (!ctx) return;
    if (progress.ga === 0 && progress.gb === 0) {
      showToast("완료된 게임이 없습니다. 한 게임 이상 진행해주세요.", "warning");
      return;
    }
    const updated: Match = {
      ...ctx.match,
      scoreA: progress.ga,
      scoreB: progress.gb,
      isFinished: true,
      scoringRule: config.rule,
      serveOrder,
      pointLog,
    };
    if (isDemoMode()) {
      showToast("예시 경기라 결과는 저장되지 않습니다.", "info");
      router.push("/league");
      return;
    }
    // 전송 대기열 경유: 네트워크가 끊겨도 기록이 유실되지 않는다
    if (updated.isFriendly || !ctx.seasonId) {
      enqueue({ kind: "friendly-upsert", match: updated });
    } else {
      enqueue({ kind: "match-upsert", seasonId: ctx.seasonId, match: updated });
    }
    showToast("경기 결과가 반영되었습니다.", "success");
    // 그날 경기(친선)는 모임 기록 화면으로, 시즌 경기는 리그 화면으로 돌아간다
    router.push(updated.isFriendly || !ctx.seasonId ? `/session?date=${updated.date}` : "/league");
  }, [ctx, progress.ga, progress.gb, config.rule, serveOrder, pointLog, showToast, router]);

  // ───────────────────────── 렌더 ─────────────────────────
  // 코트 옆 햇빛 아래에서 한 손으로 쓰는 화면: 큰 숫자, 화면 절반이 통째로 버튼.

  if (phase === "loading") {
    return (
      <main className="min-h-screen bg-surface flex items-center justify-center text-sm text-ink-mute">
        불러오는 중...
      </main>
    );
  }

  if (phase === "notfound" || !ctx) {
    return (
      <main className="min-h-screen bg-surface flex flex-col items-center justify-center gap-4 text-ink-soft p-6">
        <p>경기를 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push("/admin")}
          className="h-12 px-5 rounded-[14px] bg-accent text-accent-ink font-bold"
        >
          운영 화면으로 돌아가기
        </button>
      </main>
    );
  }

  const { match } = ctx;
  const nameById = (id?: string) => (id ? candidates.find((p) => p.id === id)?.name ?? "?" : "?");
  const ruleLabel = config.rule === "no-ad" ? "노애드" : "듀스";
  const choice = (on: boolean) =>
    `h-12 rounded-[14px] font-bold transition-colors ${on ? "bg-ink text-surface" : "bg-card text-ink-soft"}`;
  const eyebrow = "text-[11px] font-extrabold tracking-[0.08em] text-ink-mute";

  // ── 설정 단계 ──
  if (phase === "setup") {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-surface text-ink flex flex-col px-5 pt-4 pb-5">
        <header className="flex items-center gap-1 -ml-2 mb-4">
          <button
            onClick={() => router.back()}
            className="w-11 h-11 flex items-center justify-center rounded-full text-ink-mute"
            aria-label="뒤로 가기"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-[22px] font-extrabold tracking-tight">점수 입력 준비</h1>
        </header>

        {/* 대진 */}
        <div className="border-y border-line py-3.5">
          <div className="text-[17px] font-extrabold tracking-tight">{teamName(match, "A")}</div>
          <div className="my-1 text-[11px] font-extrabold text-ink-faint">VS</div>
          <div className="text-[17px] font-extrabold tracking-tight">{teamName(match, "B")}</div>
        </div>

        {/* 규칙 */}
        <section className="mt-5">
          <div className={eyebrow}>승부 규칙 (리그 전체 적용)</div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {([["no-ad", "노애드"], ["deuce", "듀스"]] as const).map(([r, lbl]) => (
              <button key={r} onClick={() => setRule(r)} aria-pressed={config.rule === r} className={choice(config.rule === r)}>
                {lbl}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-mute mt-2">
            {config.rule === "no-ad"
              ? "40-40에서 다음 득점 팀이 게임 승리(골든포인트)"
              : "40-40 이후 2점차로 게임 승리"}
          </p>
        </section>

        {/* 게임당 목표 점수 */}
        <section className="mt-5">
          <div className={eyebrow}>게임당 목표 점수</div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {[3, 4, 5, 7].map((n) => (
              <button key={n} onClick={() => setWinPoints(n)} aria-pressed={config.winPoints === n} className={`num ${choice(config.winPoints === n)}`}>
                {n}점
              </button>
            ))}
          </div>
        </section>

        {/* 서브 순서 */}
        <section className="mt-5">
          <div className="flex items-center justify-between">
            <span className={eyebrow}>서브 순서 (누른 순서대로)</span>
            <button onClick={() => setServeOrder([])} className="h-8 px-2 text-xs font-bold text-ink-mute">
              초기화
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {candidates.map((p) => {
              const order = serveOrder.indexOf(p.id);
              const picked = order >= 0;
              return (
                <button
                  key={p.id}
                  onClick={() => toggleServe(p.id)}
                  aria-pressed={picked}
                  className={`h-12 px-3 rounded-[14px] font-bold text-sm transition-colors flex items-center gap-2 ${
                    picked ? "bg-accent text-accent-ink" : "bg-card text-ink-soft"
                  }`}
                >
                  <span className={`num w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold ${picked ? "bg-accent-ink/20" : "bg-card-soft text-ink-faint"}`}>
                    {picked ? order + 1 : "–"}
                  </span>
                  <span className="truncate">{p.name}</span>
                </button>
              );
            })}
          </div>
          {serveOrder.length > 0 && (
            <p className="text-xs text-ink-mute mt-2">
              {serveOrder.map((id) => nameById(id)).join(" → ")} · 게임마다 순서대로 교대
            </p>
          )}
        </section>

        <div className="flex-1 min-h-6" />

        <button
          onClick={startGame}
          className="w-full h-14 rounded-[14px] bg-accent text-accent-ink font-extrabold text-lg active:scale-[0.99] transition-transform"
        >
          경기 시작
        </button>
      </main>
    );
  }

  // ── 진행(채점) 단계 ──
  const disp = displayScore({ a: progress.pa, b: progress.pb }, config);
  const deuce = isDeuce({ a: progress.pa, b: progress.pb }, config);
  const golden = isGoldenPoint({ a: progress.pa, b: progress.pb }, config);
  const matchWinner = progress.ga > progress.gb ? "A" : progress.gb > progress.ga ? "B" : null;

  const half = (team: "A" | "B", point: string, games: number) => {
    const serving = servingTeam === team;
    return (
      <button
        onClick={() => handleAddPoint(team)}
        aria-label={`${teamName(match, team)} 득점. 현재 ${point}, ${games}게임`}
        className={`flex-1 min-h-0 rounded-[22px] bg-card px-5 py-[18px] grid grid-cols-[1fr_auto] grid-rows-[auto_1fr] text-left select-none active:bg-card-soft transition-colors ${
          serving ? "shadow-[inset_0_0_0_2px_var(--accent)]" : ""
        }`}
      >
        <span className="min-w-0">
          <span className="block text-lg font-extrabold tracking-tight text-ink truncate">{teamName(match, team)}</span>
          <span className={`block mt-0.5 text-xs font-bold ${serving ? "text-accent" : "text-ink-mute"}`}>
            {serving ? `● 서브 · ${nameById(serverId)}` : "리턴"}
          </span>
        </span>
        <span className="text-right">
          <span className="block text-[10px] font-extrabold tracking-[0.08em] text-ink-mute">GAMES</span>
          <span className="num block text-[40px] leading-none font-black text-ink-soft">{games}</span>
        </span>
        <span className={`num col-span-2 self-end text-[120px] leading-[0.85] font-black tracking-[-0.06em] ${serving ? "text-accent" : "text-ink"}`}>
          {point}
        </span>
      </button>
    );
  };

  return (
    // 루트 레이아웃의 탭바용 아래 여백(pb-16)에 밀려 스크롤이 생기지 않도록 화면에 고정한다
    <main
      className="fixed inset-0 z-30 max-w-md mx-auto bg-surface flex flex-col gap-2.5 px-3.5 pt-2"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 14px)" }}
    >
      <header className="flex items-center justify-between">
        <button
          onClick={() => setPhase("setup")}
          className="h-11 pr-3 flex items-center gap-1 text-[13px] font-bold text-ink-soft"
          aria-label="설정으로"
        >
          <ArrowLeft size={18} />
          <span className="num">
            {ruleLabel} · 게임당 {config.winPoints}점
          </span>
        </button>
        {golden || deuce ? (
          <span className="px-2 py-1 rounded-md bg-accent text-accent-ink text-[11px] font-extrabold">
            {golden ? "골든포인트" : "듀스"}
          </span>
        ) : (
          <span className="px-2 py-1 rounded-md bg-live text-white text-[11px] font-extrabold">기록 중</span>
        )}
      </header>

      {half("A", disp.a, progress.ga)}
      {half("B", disp.b, progress.gb)}

      <div className="grid grid-cols-[1fr_1.4fr] gap-2">
        <button
          onClick={undo}
          disabled={history.length === 0}
          className="h-[52px] rounded-[14px] bg-card-soft text-ink-soft text-sm font-extrabold flex items-center justify-center gap-1.5 disabled:opacity-40"
        >
          <Undo2 size={18} /> 되돌리기
        </button>
        <button
          onClick={() => setShowFinish(true)}
          className="h-[52px] rounded-[14px] bg-accent text-accent-ink text-sm font-extrabold flex items-center justify-center gap-1.5"
        >
          <Flag size={18} /> 경기 종료
        </button>
      </div>

      {/* 결과 반영 확인 (수동 종료) */}
      {showFinish && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center animate-fade-in" role="dialog" aria-modal="true" aria-labelledby="finish-title">
          <div className="bg-surface rounded-t-[22px] w-full max-w-md px-5 pt-6 pb-6">
            <div className="text-[11px] font-extrabold tracking-[0.08em] text-ink-mute">경기 종료</div>
            <h2 id="finish-title" className="mt-1 text-[22px] font-extrabold tracking-tight text-ink">
              {matchWinner ? `${teamName(match, matchWinner)} 승리` : "동점으로 종료"}
            </h2>
            <div className="num mt-3 text-[64px] leading-none font-black tracking-[-0.04em] text-ink">
              {progress.ga} : {progress.gb}
            </div>
            {(progress.pa > 0 || progress.pb > 0) && (
              <p className="mt-3 text-xs font-bold text-down">
                진행 중인 게임({disp.a}:{disp.b})은 집계되지 않습니다.
              </p>
            )}
            <p className="mt-2 text-sm text-ink-mute">이 게임 스코어를 경기 기록에 반영할까요?</p>
            <div className="grid grid-cols-[1fr_1.4fr] gap-2 mt-5">
              <button onClick={() => setShowFinish(false)} className="h-[52px] rounded-[14px] bg-card-soft text-ink-soft text-sm font-extrabold">
                계속 진행
              </button>
              <button
                onClick={reflectResult}
                className="h-[52px] rounded-[14px] bg-accent text-accent-ink text-sm font-extrabold flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> 결과 반영
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
