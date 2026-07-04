"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Undo2, Circle, Flag, Check, Trophy } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { safeGetAsync, safeSetAsync, safeGetString } from "@/lib/storage";
import { LeagueDataSchema } from "@/lib/schemas";
import AppLogo from "@/components/ui/AppLogo";
import type { LeagueData, Match, Player, PointLogEntry } from "@/types";
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
  league: LeagueData;
  slotIndex: string | null;
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
  return t.man.id === t.woman.id ? t.man.name : `${t.man.name} & ${t.woman.name}`;
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

  // 마운트 시 URL의 ?id 로 경기 로드 (클라이언트 전용)
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const id = new URLSearchParams(window.location.search).get("id");
      const league = await safeGetAsync("current-league", LeagueDataSchema);
      const slotIndex = safeGetString("current-slot-index") ?? null;
      if (cancelled) return;
      const match = id ? league?.matches.find((m) => m.id === id) : undefined;
      if (!league || !match) {
        setPhase("notfound");
        return;
      }
      setCtx({ league, slotIndex, match });
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
    const newMatches = ctx.league.matches.map((m) => (m.id === updated.id ? updated : m));
    const newData: LeagueData = { ...ctx.league, matches: newMatches };
    await safeSetAsync("current-league", newData);
    if (ctx.slotIndex) await safeSetAsync(`league-slot-${ctx.slotIndex}`, newData);
    showToast("경기 결과가 반영되었습니다.", "success");
    router.push("/league");
  }, [ctx, progress.ga, progress.gb, config.rule, serveOrder, pointLog, showToast, router]);

  // ───────────────────────── 렌더 ─────────────────────────

  if (phase === "loading") {
    return (
      <main className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">
        불러오는 중...
      </main>
    );
  }

  if (phase === "notfound" || !ctx) {
    return (
      <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-slate-300 p-6">
        <p>경기를 찾을 수 없습니다.</p>
        <button
          onClick={() => router.push("/league")}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold touch-target"
        >
          리그로 돌아가기
        </button>
      </main>
    );
  }

  const { match } = ctx;
  const nameById = (id?: string) => (id ? candidates.find((p) => p.id === id)?.name ?? "?" : "?");

  // ── 설정 단계 ──
  if (phase === "setup") {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-slate-900 text-white flex flex-col p-4">
        <header className="flex items-center gap-2 mb-5">
          <button
            onClick={() => router.push("/league")}
            className="p-2 hover:bg-slate-800 rounded-full text-slate-400"
            aria-label="뒤로 가기"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-lg flex items-center gap-2">
            <AppLogo size={22} /> 실시간 점수 입력 설정
          </h1>
        </header>

        {/* 대진 */}
        <div className="bg-slate-800 rounded-2xl p-4 mb-4 text-center">
          <div className="text-blue-300 font-bold">{teamName(match, "A")}</div>
          <div className="text-slate-500 text-xs my-1">VS</div>
          <div className="text-rose-300 font-bold">{teamName(match, "B")}</div>
        </div>

        {/* 규칙 */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-400 mb-2">승부 규칙 (리그 전체 적용)</div>
          <div className="grid grid-cols-2 gap-2">
            {([["no-ad", "노애드"], ["deuce", "듀스"]] as const).map(([r, lbl]) => (
              <button
                key={r}
                onClick={() => setRule(r)}
                className={`py-3 rounded-xl font-bold transition-colors touch-target ${
                  config.rule === r ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-500 mt-1.5">
            {config.rule === "no-ad"
              ? "40-40에서 다음 득점 팀이 게임 승리(골든포인트)"
              : "40-40 이후 2점차로 게임 승리"}
          </p>
        </div>

        {/* 게임당 목표 점수 */}
        <div className="mb-4">
          <div className="text-xs font-bold text-slate-400 mb-2">게임당 목표 점수</div>
          <div className="grid grid-cols-4 gap-2">
            {[3, 4, 5, 7].map((n) => (
              <button
                key={n}
                onClick={() => setWinPoints(n)}
                className={`py-2.5 rounded-xl font-bold transition-colors touch-target ${
                  config.winPoints === n ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {n}점
              </button>
            ))}
          </div>
        </div>

        {/* 서브 순서 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400">서브 순서 (탭한 순서대로)</span>
            <button onClick={() => setServeOrder([])} className="text-xs text-slate-500 hover:text-slate-300">
              초기화
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {candidates.map((p) => {
              const order = serveOrder.indexOf(p.id);
              const picked = order >= 0;
              return (
                <button
                  key={p.id}
                  onClick={() => toggleServe(p.id)}
                  className={`px-3 py-2.5 rounded-xl font-bold text-sm transition-colors touch-target flex items-center gap-1.5 ${
                    picked ? "bg-yellow-500 text-yellow-950" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {picked && <span className="text-xs bg-yellow-950/20 rounded-full w-5 h-5 flex items-center justify-center">{order + 1}</span>}
                  {p.name}
                </button>
              );
            })}
          </div>
          {serveOrder.length > 0 && (
            <p className="text-[11px] text-yellow-300 mt-2">
              서브: {serveOrder.map((id) => nameById(id)).join(" → ")} · 게임마다 순서대로 교대
            </p>
          )}
        </div>

        <div className="flex-1" />

        <button
          onClick={startGame}
          className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg touch-target"
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

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-900 flex flex-col">
      <header className="p-3 flex items-center justify-between bg-slate-800">
        <button
          onClick={() => setPhase("setup")}
          className="p-2 hover:bg-slate-700 rounded-full text-slate-400"
          aria-label="설정으로"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center text-[11px] text-slate-400">
          {config.rule === "no-ad" ? "노애드" : "듀스"} · 게임당 {config.winPoints}점
          {golden && <span className="ml-1 text-yellow-300 font-bold">· 골든포인트</span>}
          {deuce && <span className="ml-1 text-yellow-300 font-bold">· 듀스</span>}
        </div>
        <div className="flex gap-1">
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="p-2 hover:bg-slate-700 rounded-full text-slate-400 disabled:opacity-30"
            aria-label="되돌리기"
          >
            <Undo2 size={20} />
          </button>
          <button
            onClick={() => setShowFinish(true)}
            className="p-2 hover:bg-slate-700 rounded-full text-slate-400"
            aria-label="경기 종료"
          >
            <Flag size={20} />
          </button>
        </div>
      </header>

      {/* 매치 스코어(게임) */}
      <div className="bg-slate-800 py-2 flex items-center justify-center gap-3 text-white">
        <span className="text-xs text-slate-400">매치(게임)</span>
        <span className="text-2xl font-black text-blue-400">{progress.ga}</span>
        <span className="text-slate-500">:</span>
        <span className="text-2xl font-black text-rose-400">{progress.gb}</span>
      </div>

      <div className="flex-1 flex flex-col">
        {/* 팀 A */}
        <button
          onClick={() => handleAddPoint("A")}
          className="flex-1 flex flex-col items-center justify-center bg-blue-600 active:bg-blue-800 transition-colors relative"
        >
          {servingTeam === "A" && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5">
              <Circle size={16} className="text-yellow-300 fill-yellow-300" />
              <span className="text-yellow-300 text-xs font-bold">서브 {nameById(serverId)}</span>
            </div>
          )}
          <div className="text-white/70 text-base font-medium mb-1 px-4 text-center">{teamName(match, "A")}</div>
          <span className="text-8xl font-black text-white">{disp.a}</span>
          <span className="text-white/60 text-sm mt-2 font-bold">{progress.ga} 게임</span>
        </button>

        <div className="h-px bg-slate-700" />

        {/* 팀 B */}
        <button
          onClick={() => handleAddPoint("B")}
          className="flex-1 flex flex-col items-center justify-center bg-rose-600 active:bg-rose-800 transition-colors relative"
        >
          {servingTeam === "B" && (
            <div className="absolute top-4 left-4 flex items-center gap-1.5">
              <Circle size={16} className="text-yellow-300 fill-yellow-300" />
              <span className="text-yellow-300 text-xs font-bold">서브 {nameById(serverId)}</span>
            </div>
          )}
          <div className="text-white/70 text-base font-medium mb-1 px-4 text-center">{teamName(match, "B")}</div>
          <span className="text-8xl font-black text-white">{disp.b}</span>
          <span className="text-white/60 text-sm mt-2 font-bold">{progress.gb} 게임</span>
        </button>
      </div>

      {/* 결과 반영 오버레이 (수동 종료) */}
      {showFinish && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-scale-in text-center">
            <Trophy className="w-10 h-10 text-amber-500 mx-auto mb-2" />
            <h2 className="text-lg font-bold text-slate-800 mb-1">
              {matchWinner
                ? `${matchWinner === "A" ? teamName(match, "A") : teamName(match, "B")} 승리!`
                : "경기 종료"}
            </h2>
            <div className="text-3xl font-black text-slate-900 my-3">
              {progress.ga} : {progress.gb}
              <span className="text-sm font-medium text-slate-400 ml-1">게임</span>
            </div>
            {(progress.pa > 0 || progress.pb > 0) && (
              <p className="text-xs text-amber-600 mb-2">
                진행 중인 게임({disp.a}:{disp.b})은 집계되지 않습니다.
              </p>
            )}
            <p className="text-sm text-slate-500 mb-5">이 게임 스코어를 경기 기록에 반영할까요?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFinish(false)}
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 touch-target"
              >
                계속 진행
              </button>
              <button
                onClick={reflectResult}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 touch-target flex items-center justify-center gap-1.5"
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
