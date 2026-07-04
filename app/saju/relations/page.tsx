"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Plus, Trash2, Sparkles, AlertTriangle } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  getRoster,
  saveRoster,
  clearRoster,
  parseRosterText,
  mergeRoster,
  buildRosterPersonas,
  computeCompatMatrix,
  type RosterEntry,
} from "@/lib/personaRoster";
import type { Element } from "@/lib/saju";

// ─── 시각화 상수 ───
const SIZE = 340;
const C = SIZE / 2;
const R = 128;
const NODE_R = 20;

const ELEM_FILL: Record<Element, string> = {
  목: "#22c55e",
  화: "#ef4444",
  토: "#f59e0b",
  금: "#64748b",
  수: "#3b82f6",
};

interface EdgeStyle {
  stroke: string;
  width: number;
  opacity: number;
  dash?: string;
}
function edgeStyle(total: number): EdgeStyle {
  if (total >= 92) return { stroke: "#ec4899", width: 4, opacity: 0.95 };
  if (total >= 80) return { stroke: "#10b981", width: 3.5, opacity: 0.9 };
  if (total >= 68) return { stroke: "#3b82f6", width: 2.5, opacity: 0.75 };
  if (total >= 52) return { stroke: "#94a3b8", width: 1.5, opacity: 0.4 };
  if (total >= 38) return { stroke: "#f59e0b", width: 1.5, opacity: 0.6, dash: "4 3" };
  return { stroke: "#ef4444", width: 1.5, opacity: 0.7, dash: "4 3" };
}

const LEGEND: { label: string; color: string; range: string }[] = [
  { label: "천생연분/찰떡궁합", color: "#10b981", range: "80+" },
  { label: "좋은짝", color: "#3b82f6", range: "68-79" },
  { label: "무난", color: "#94a3b8", range: "52-67" },
  { label: "도전적/상극", color: "#f59e0b", range: "<52" },
];

function nodePos(i: number, n: number) {
  const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return { x: C + R * Math.cos(ang), y: C + R * Math.sin(ang) };
}

export default function RelationsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [strongOnly, setStrongOnly] = useState(false);
  const [showClear, setShowClear] = useState(false);

  useEffect(() => {
    Promise.resolve(getRoster()).then((r) => {
      setRoster(r);
      setLoaded(true);
    });
  }, []);

  const personas = useMemo(() => buildRosterPersonas(roster), [roster]);
  const valid = useMemo(() => personas.filter((p) => p.ok), [personas]);
  const invalid = useMemo(() => personas.filter((p) => !p.ok), [personas]);
  const edges = useMemo(() => computeCompatMatrix(valid), [valid]);
  const positions = useMemo(
    () => valid.map((_, i) => nodePos(i, valid.length)),
    [valid],
  );

  const selectedIdx = selected ? valid.findIndex((p) => p.name === selected) : -1;

  function persist(next: RosterEntry[]) {
    setRoster(next);
    saveRoster(next);
  }

  function handleAdd() {
    const parsed = parseRosterText(bulkText);
    if (parsed.length === 0) {
      showToast("코드를 인식하지 못했습니다. '이름 - SAJU1-...' 형식으로 입력해주세요.", "warning");
      return;
    }
    persist(mergeRoster(roster, parsed));
    setBulkText("");
    showToast(`${parsed.length}명을 추가했습니다.`, "success");
  }

  function handleRemove(name: string) {
    persist(roster.filter((e) => e.name !== name));
    if (selected === name) setSelected(null);
  }

  function handleClearAll() {
    setRoster([]);
    clearRoster();
    setSelected(null);
    setShowClear(false);
    showToast("명단을 모두 비웠습니다.", "success");
  }

  // 선택된 사람의 궁합 순위
  const selectedRanking = useMemo(() => {
    if (selectedIdx < 0) return [];
    return edges
      .filter((e) => e.i === selectedIdx || e.j === selectedIdx)
      .map((e) => {
        const other = e.i === selectedIdx ? valid[e.j] : valid[e.i];
        return { name: other.name, total: e.total, tier: e.breakdown.tier, synergy: e.breakdown.courtSynergy };
      })
      .sort((a, b) => b.total - a.total);
  }, [selectedIdx, edges, valid]);

  const topPairs = useMemo(
    () => [...edges].sort((a, b) => b.total - a.total).slice(0, 3),
    [edges],
  );

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-50 p-4 pb-24">
      <header className="flex items-center gap-2 mb-4">
        <button
          onClick={() => router.push("/saju")}
          className="p-2 hover:bg-slate-200 rounded-full text-slate-500"
          aria-label="뒤로 가기"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-clay-600" /> 우리 리그 궁합 관계도
        </h1>
      </header>

      {/* 명단 추가 */}
      <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
        <label className="block text-xs font-bold text-slate-500 mb-2">
          멤버 코드 추가 (한 줄에 한 명: 이름 - 코드)
        </label>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={3}
          placeholder={"지윤 - SAJU1-228C-TBR7\n빛나 - SAJU1-3A82-83W5"}
          className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-clay-500"
        />
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleAdd}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm bg-clay-600 text-white hover:bg-clay-700 transition-colors touch-target"
          >
            <Plus className="w-4 h-4" /> 명단에 추가
          </button>
          {roster.length > 0 && (
            <button
              onClick={() => setShowClear(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors touch-target"
            >
              전체 비우기
            </button>
          )}
        </div>
      </section>

      {/* 관계도 (로드 완료 후에만 — 저장된 명단 깜빡임 방지) */}
      {!loaded ? null : valid.length < 2 ? (
        <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-300">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">관계도를 보려면 2명 이상 등록해주세요.</p>
        </div>
      ) : (
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-slate-700">{valid.length}명 · 궁합 {edges.length}쌍</span>
            <label className="flex items-center gap-1.5 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={strongOnly}
                onChange={(e) => setStrongOnly(e.target.checked)}
                className="accent-clay-600"
              />
              좋은 궁합만
            </label>
          </div>
          <p className="text-[11px] text-slate-400 mb-2">선이 굵고 초록/파랑일수록 좋은 궁합 · 노드를 탭하면 그 사람 궁합만 강조</p>

          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-auto" role="group" aria-label="궁합 관계도">
            {/* 선(엣지) */}
            {edges.map((e) => {
              if (strongOnly && e.total < 68) return null;
              const st = edgeStyle(e.total);
              const touchesSel =
                selectedIdx < 0 || e.i === selectedIdx || e.j === selectedIdx;
              const p1 = positions[e.i];
              const p2 = positions[e.j];
              return (
                <line
                  key={`${e.i}-${e.j}`}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={st.stroke}
                  strokeWidth={st.width}
                  strokeOpacity={touchesSel ? st.opacity : 0.06}
                  strokeDasharray={st.dash}
                  strokeLinecap="round"
                />
              );
            })}
            {/* 노드 */}
            {valid.map((p, i) => {
              const pos = positions[i];
              const isSel = p.name === selected;
              const dim = selected && !isSel;
              const label = p.name.length > 4 ? p.name.slice(0, 4) : p.name;
              return (
                <g
                  key={`${p.name}-${i}`}
                  onClick={() => setSelected(isSel ? null : p.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(isSel ? null : p.name);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${p.name}${p.mbti ? ` ${p.mbti}` : ""}`}
                  className="cursor-pointer focus:outline-none"
                  opacity={dim ? 0.55 : 1}
                >
                  <title>{p.name}</title>
                  {/* 투명 히트 영역 (탭 정확도) */}
                  <circle cx={pos.x} cy={pos.y} r={NODE_R + 8} fill="transparent" />
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={NODE_R}
                    fill={p.dominant ? ELEM_FILL[p.dominant] : "#64748b"}
                    stroke={isSel ? "#0f172a" : "#fff"}
                    strokeWidth={isSel ? 3 : 2}
                  />
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="9"
                    fontWeight="bold"
                    fill="#fff"
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* 범례 */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
            {LEGEND.map((l) => (
              <div key={l.label} className="flex items-center gap-1 text-[10px] text-slate-500">
                <span className="inline-block w-4 h-0.5 rounded" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 선택 상세 또는 TOP 궁합 */}
      {loaded && valid.length >= 2 && (
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-4">
          {selectedIdx >= 0 ? (
            <>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-bold text-slate-700">{selected}의 궁합 순위</h2>
                <button onClick={() => setSelected(null)} className="text-xs text-slate-400 hover:text-slate-600">
                  전체 보기
                </button>
              </div>
              <div className="space-y-1.5">
                {selectedRanking.map((r, idx) => {
                  const st = edgeStyle(r.total);
                  return (
                    <div key={r.name} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                      <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                      <span className="flex-1 text-sm font-bold text-slate-700">{r.name}</span>
                      <span className="text-xs text-slate-500">{r.tier}</span>
                      <span className="text-base font-black" style={{ color: st.stroke }}>{r.total}</span>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-4 h-4 text-amber-500" /> 최고의 궁합 TOP 3
              </h2>
              <div className="space-y-1.5">
                {topPairs.map((e, idx) => {
                  const st = edgeStyle(e.total);
                  return (
                    <div key={`${e.i}-${e.j}`} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg">
                      <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                      <span className="flex-1 text-sm font-bold text-slate-700">
                        {valid[e.i].name} <span className="text-slate-400">×</span> {valid[e.j].name}
                      </span>
                      <span className="text-xs text-slate-500">{e.breakdown.tier}</span>
                      <span className="text-base font-black" style={{ color: st.stroke }}>{e.total}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>
      )}

      {/* 등록 명단 + 잘못된 코드 */}
      {loaded && roster.length > 0 && (
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-sm font-bold text-slate-700 mb-2">등록 명단 ({roster.length})</h2>
          <div className="flex flex-wrap gap-2">
            {personas.map((p, idx) => (
              <span
                key={`${p.name}-${p.code}-${idx}`}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold ${
                  p.ok ? "bg-slate-100 text-slate-700" : "bg-red-50 text-red-600"
                }`}
              >
                {!p.ok && <AlertTriangle className="w-3 h-3" />}
                {p.name}
                {p.ok && p.mbti && <span className="text-slate-400 font-medium">{p.mbti}</span>}
                <button onClick={() => handleRemove(p.name)} aria-label={`${p.name} 삭제`} className="text-slate-400 hover:text-red-500">
                  <Trash2 className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {invalid.length > 0 && (
            <p className="text-[11px] text-red-500 mt-2">잘못된 코드 {invalid.length}건 — 코드를 다시 확인해주세요.</p>
          )}
        </section>
      )}

      <ConfirmDialog
        isOpen={showClear}
        title="명단 비우기"
        message="등록된 모든 멤버 코드를 삭제할까요?"
        confirmText="비우기"
        variant="danger"
        onConfirm={handleClearAll}
        onCancel={() => setShowClear(false)}
      />
    </main>
  );
}
