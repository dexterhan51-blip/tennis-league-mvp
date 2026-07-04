"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AppLogo from "@/components/ui/AppLogo";
import {
  Sparkles,
  Zap,
  Flame,
  ShieldAlert,
  Copy,
  Heart,
  Trophy,
  Info,
  Users,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { copyToClipboard } from "@/utils/shareUtils";
import {
  PERSONA_SCHEMA_VERSION,
  encode,
  decode,
  type PersonaInputs,
  type Mbti,
  type Gender,
  type CalendarType,
  type PersonaCodeError,
} from "@/lib/personaCode";
import { buildPersona, type Persona } from "@/lib/personaDerive";
import { combinedCompat, type CompatBreakdown, type Tier } from "@/lib/sajuCompat";
import { getPersonaInputs, savePersonaInputs } from "@/lib/personaProfile";
import {
  STEM_ELEMENT,
  BRANCH_ELEMENT,
  EARTHLY_BRANCHES,
  hourToBranchIndex,
  type Element,
  type Pillar,
} from "@/lib/saju";

// ─────────────────────────── 정적 데이터 ───────────────────────────

const ELEMENT_STYLE: Record<
  Element,
  { label: string; tile: string; bar: string; text: string }
> = {
  목: { label: "목(木)", tile: "bg-green-50 text-green-700", bar: "bg-green-400", text: "text-green-600" },
  화: { label: "화(火)", tile: "bg-red-50 text-red-700", bar: "bg-red-400", text: "text-red-600" },
  토: { label: "토(土)", tile: "bg-amber-50 text-amber-700", bar: "bg-amber-400", text: "text-amber-600" },
  금: { label: "금(金)", tile: "bg-slate-100 text-slate-700", bar: "bg-slate-400", text: "text-slate-600" },
  수: { label: "수(水)", tile: "bg-blue-50 text-blue-700", bar: "bg-blue-400", text: "text-blue-600" },
};
const ELEMENT_ORDER: Element[] = ["목", "화", "토", "금", "수"];

const MBTI_AXES = [
  { key: "ei", left: "E", right: "I", leftLabel: "E 외향", rightLabel: "I 내향" },
  { key: "sn", left: "S", right: "N", leftLabel: "S 감각", rightLabel: "N 직관" },
  { key: "tf", left: "T", right: "F", leftLabel: "T 사고", rightLabel: "F 감정" },
  { key: "jp", left: "J", right: "P", leftLabel: "J 계획", rightLabel: "P 인식" },
] as const;
type AxisKey = (typeof MBTI_AXES)[number]["key"];

const TIER_GRADIENT: Record<Tier, string> = {
  천생연분: "from-pink-500 to-rose-500",
  찰떡궁합: "from-blue-500 to-indigo-500",
  좋은짝: "from-green-500 to-emerald-500",
  무난: "from-slate-500 to-slate-600",
  도전적: "from-amber-500 to-orange-500",
  상극주의: "from-red-500 to-rose-600",
};

const YEARS = Array.from({ length: 2026 - 1920 + 1 }, (_, i) => 2026 - i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const SELECT_CLASS =
  "w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-clay-500";

// ─────────────────────────── 보조 컴포넌트 ───────────────────────────

function PillarTile({ label, pillar }: { label: string; pillar: Pillar | null }) {
  if (!pillar) {
    return (
      <div className="flex-1 rounded-xl bg-slate-100 p-2 text-center">
        <div className="text-[10px] text-slate-400 mb-1">{label}</div>
        <div className="text-2xl font-black text-slate-300 leading-tight">—</div>
        <div className="text-[10px] text-slate-400 mt-1">미상</div>
      </div>
    );
  }
  const stemEl = STEM_ELEMENT[pillar.stemIndex];
  const branchEl = BRANCH_ELEMENT[pillar.branchIndex];
  return (
    <div className={`flex-1 rounded-xl p-2 text-center ${ELEMENT_STYLE[stemEl].tile}`}>
      <div className="text-[10px] opacity-70 mb-1">{label}</div>
      <div className="text-2xl font-black leading-tight">{pillar.stem}</div>
      <div className="text-2xl font-black leading-tight">{pillar.branch}</div>
      <div className="text-[10px] opacity-70 mt-1">{stemEl}·{branchEl}</div>
    </div>
  );
}

function OhaengBars({ counts }: { counts: Record<Element, number> }) {
  const max = Math.max(1, ...ELEMENT_ORDER.map((e) => counts[e] ?? 0));
  return (
    <div className="space-y-1.5">
      {ELEMENT_ORDER.map((e) => {
        const c = counts[e] ?? 0;
        const st = ELEMENT_STYLE[e];
        return (
          <div key={e} className="flex items-center gap-2">
            <span className={`text-xs font-bold w-12 shrink-0 ${st.text}`}>{st.label}</span>
            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${(c / max) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-500 w-4 text-right">{c}</span>
          </div>
        );
      })}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
      <h2 className="text-sm font-bold text-slate-700 flex items-center gap-1.5 mb-3">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

// ─────────────────────────── 메인 페이지 ───────────────────────────

interface MyResult {
  inputs: PersonaInputs;
  persona: Persona;
  code: string;
}
interface CompatState {
  breakdown: CompatBreakdown;
  friend: Persona;
  friendMbti: string;
}

export default function SajuPage() {
  const { showToast } = useToast();

  // 입력 폼 상태
  const [axes, setAxes] = useState<Record<AxisKey, string>>({ ei: "", sn: "", tf: "", jp: "" });
  const [gender, setGender] = useState<Gender>("male");
  const [calendarType, setCalendarType] = useState<CalendarType>("solar");
  const [birthYear, setBirthYear] = useState(1995);
  const [birthMonth, setBirthMonth] = useState(1);
  const [birthDay, setBirthDay] = useState(1);
  const [hour, setHour] = useState<number | "unknown">("unknown");

  // 결과/궁합 상태
  const [result, setResult] = useState<MyResult | null>(null);
  const [friendCode, setFriendCode] = useState("");
  const [friendError, setFriendError] = useState<PersonaCodeError | null>(null);
  const [compat, setCompat] = useState<CompatState | null>(null);

  // 마운트 시 저장된 프로필 복원.
  // localStorage 읽기는 동기지만, repo의 비동기 로드 컨벤션(usePlayerManagement)을 따라
  // setState를 effect 바디 밖(.then)에서 호출 → 마운트 후 1회 복원, hydration 안전.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(getPersonaInputs()).then((saved) => {
      if (cancelled || !saved) return;
      setAxes({ ei: saved.mbti[0], sn: saved.mbti[1], tf: saved.mbti[2], jp: saved.mbti[3] });
      setGender(saved.gender);
      setCalendarType(saved.calendarType);
      setBirthYear(saved.birthYear);
      setBirthMonth(saved.birthMonth);
      setBirthDay(saved.birthDay);
      setHour(saved.birthHour === null ? "unknown" : saved.birthHour);
      try {
        setResult({ inputs: saved, persona: buildPersona(saved), code: encode(saved) });
      } catch {
        /* 손상된 저장값은 무시하고 폼만 채움 */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const mbti = `${axes.ei}${axes.sn}${axes.tf}${axes.jp}`;

  function setAxis(key: AxisKey, pole: string) {
    setAxes((prev) => ({ ...prev, [key]: pole }));
  }

  function handleSubmit() {
    if (mbti.length !== 4) {
      showToast("MBTI 4가지를 모두 선택해 주세요.", "warning");
      return;
    }
    const inputs: PersonaInputs = {
      schemaVersion: PERSONA_SCHEMA_VERSION,
      mbti: mbti as Mbti,
      gender,
      calendarType,
      birthYear,
      birthMonth,
      birthDay,
      birthHour: hour === "unknown" ? null : hour,
    };
    try {
      const persona = buildPersona(inputs);
      const code = encode(inputs);
      savePersonaInputs(inputs);
      setResult({ inputs, persona, code });
      setCompat(null);
      setFriendError(null);
      setFriendCode("");
    } catch {
      showToast("결과 계산 중 문제가 발생했어요. 입력을 확인해 주세요.", "error");
    }
  }

  async function handleCopy() {
    if (!result) return;
    const ok = await copyToClipboard(result.code);
    showToast(
      ok ? "내 페르소나 코드가 복사되었습니다." : "복사에 실패했습니다.",
      ok ? "success" : "error",
    );
  }

  function handleCompat() {
    if (!result) return;
    const trimmed = friendCode.trim();
    if (!trimmed) {
      setFriendError({ kind: "FORMAT", message: "친구의 코드를 입력해 주세요." });
      setCompat(null);
      return;
    }
    const r = decode(trimmed);
    if (!r.ok) {
      setFriendError(r.error);
      setCompat(null);
      return;
    }
    try {
      const friend = buildPersona(r.inputs);
      const breakdown = combinedCompat(
        result.persona.saju.elementCounts,
        result.inputs.mbti,
        friend.saju.elementCounts,
        r.inputs.mbti,
      );
      setCompat({ breakdown, friend, friendMbti: r.inputs.mbti });
      setFriendError(null);
    } catch {
      setFriendError({ kind: "FORMAT", message: "코드를 해석하는 중 문제가 발생했어요." });
      setCompat(null);
    }
  }

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-50 p-4 pb-24">
      <header className="mb-5">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <AppLogo size={26} /> 테니스 페르소나 &amp; 궁합
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          MBTI와 사주로 보는 내 혼복 스타일 · 닮은 프로 · 궁합 — 재미로 보는 콘텐츠예요 🎾
        </p>
      </header>

      <div className="space-y-4">
        {/* 우리 리그 궁합 관계도 진입 */}
        <Link
          href="/saju/relations"
          className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-clay-600 text-white shadow-sm active:scale-[0.99] transition-transform"
        >
          <Users className="w-6 h-6 shrink-0" />
          <div className="flex-1">
            <div className="font-bold">우리 리그 궁합 관계도</div>
            <div className="text-xs text-white/80">멤버 코드를 모아 서로의 궁합을 한눈에</div>
          </div>
          <ChevronRight className="w-5 h-5 shrink-0" />
        </Link>

        {/* ───────── (A) 입력 폼 ───────── */}
        <SectionCard title="내 정보 입력" icon={<Sparkles className="w-4 h-4 text-clay-500" />}>
          <div className="space-y-4">
            {/* MBTI 4축 토글 */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">MBTI</label>
              <div className="space-y-2">
                {MBTI_AXES.map((axis) => {
                  const val = axes[axis.key];
                  return (
                    <div key={axis.key} className="grid grid-cols-2 gap-2">
                      {([
                        [axis.left, axis.leftLabel],
                        [axis.right, axis.rightLabel],
                      ] as const).map(([pole, poleLabel]) => {
                        const active = val === pole;
                        return (
                          <button
                            key={pole}
                            type="button"
                            onClick={() => setAxis(axis.key, pole)}
                            aria-label={poleLabel}
                            aria-pressed={active}
                            className={`py-2.5 rounded-xl text-sm font-bold transition-colors touch-target ${
                              active
                                ? "bg-clay-600 text-white"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                          >
                            {poleLabel}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              {mbti.length === 4 && (
                <p className="text-xs text-clay-600 font-bold mt-2">선택: {mbti}</p>
              )}
            </div>

            {/* 성별 / 달력 */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">성별</label>
                <div className="grid grid-cols-2 gap-2">
                  {([["male", "남"], ["female", "여"]] as const).map(([g, lbl]) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGender(g)}
                      aria-pressed={gender === g}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-colors touch-target ${
                        gender === g ? "bg-clay-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">양력/음력</label>
                <div className="grid grid-cols-2 gap-2">
                  {([["solar", "양력"], ["lunar", "음력"]] as const).map(([c, lbl]) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCalendarType(c)}
                      aria-pressed={calendarType === c}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-colors touch-target ${
                        calendarType === c ? "bg-clay-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 생년월일 */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">생년월일</label>
              <div className="grid grid-cols-3 gap-2">
                <select className={SELECT_CLASS} value={birthYear} aria-label="출생연도"
                  onChange={(e) => setBirthYear(Number(e.target.value))}>
                  {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
                </select>
                <select className={SELECT_CLASS} value={birthMonth} aria-label="출생월"
                  onChange={(e) => setBirthMonth(Number(e.target.value))}>
                  {MONTHS.map((m) => <option key={m} value={m}>{m}월</option>)}
                </select>
                <select className={SELECT_CLASS} value={birthDay} aria-label="출생일"
                  onChange={(e) => setBirthDay(Number(e.target.value))}>
                  {DAYS.map((d) => <option key={d} value={d}>{d}일</option>)}
                </select>
              </div>
            </div>

            {/* 태어난 시 */}
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">태어난 시 (시주)</label>
              <select
                className={SELECT_CLASS}
                aria-label="출생시"
                value={hour === "unknown" ? "unknown" : String(hour)}
                onChange={(e) => setHour(e.target.value === "unknown" ? "unknown" : Number(e.target.value))}
              >
                <option value="unknown">시간 모름</option>
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}시 · {EARTHLY_BRANCHES[hourToBranchIndex(h)]}시
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              className="w-full py-3.5 px-4 rounded-xl font-bold text-base bg-clay-600 hover:bg-clay-700 text-white shadow-md transition-colors touch-target"
            >
              결과 보기
            </button>
          </div>
        </SectionCard>

        {/* ───────── (B) 결과 카드 ───────── */}
        {result && (
          <>
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
              {/* 다크 그라데이션 헤더 */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-4 py-4 text-white">
                <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-lime-300 uppercase mb-1">
                  <Sparkles className="w-3.5 h-3.5" /> 내 테니스 페르소나
                </div>
                <div className="text-xl font-black leading-tight">{result.persona.mbtiProfile.nickname}</div>
                <div className="text-sm font-bold text-lime-300 mt-0.5">
                  {result.inputs.mbti} · {result.persona.mbtiProfile.courtRole}
                </div>
                <div className="text-xs text-slate-300 mt-1.5">
                  일간 {result.persona.saju.dayMaster}({result.persona.saju.dayMasterElement}) · 닮은 프로{" "}
                  {result.persona.proMatch.best.player.name}
                </div>
              </div>
              {/* 화이트 바디 */}
              <div className="bg-white p-4 space-y-3">
                <div className="flex gap-2.5">
                  <Zap className="w-4 h-4 text-clay-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-clay-600 mb-0.5">플레이스타일</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{result.persona.mbtiProfile.playstyle}</p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <Flame className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-orange-600 mb-0.5">강점</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{result.persona.mbtiProfile.strength}</p>
                  </div>
                </div>
                <div className="flex gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold text-slate-500 mb-0.5">약점</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{result.persona.mbtiProfile.weakness}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 사주 4주 */}
            <SectionCard title="내 사주 (네 기둥)" icon={<Sparkles className="w-4 h-4 text-purple-500" />}>
              <div className="flex gap-2">
                <PillarTile label="년주" pillar={result.persona.saju.year} />
                <PillarTile label="월주" pillar={result.persona.saju.month} />
                <PillarTile label="일주" pillar={result.persona.saju.day} />
                <PillarTile label="시주" pillar={result.persona.saju.hour} />
              </div>
              <div className="mt-4">
                <div className="text-xs font-bold text-slate-500 mb-2">오행 분포</div>
                <OhaengBars counts={result.persona.saju.elementCounts} />
              </div>
              {result.persona.saju.notes.length > 0 && (
                <div className="mt-3 flex gap-2 p-2.5 bg-amber-50 rounded-xl">
                  <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-amber-700 leading-relaxed space-y-0.5">
                    {result.persona.saju.notes.map((n, i) => <p key={i}>{n}</p>)}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* 닮은 프로 */}
            <SectionCard title="닮은 프로 선수" icon={<Trophy className="w-4 h-4 text-amber-500" />}>
              <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-700 rounded-xl text-white">
                <div className="flex items-baseline justify-between">
                  <div className="text-lg font-black">{result.persona.proMatch.best.player.name}</div>
                  <div className="text-sm font-bold text-lime-300">{result.persona.proMatch.best.score}점 닮음</div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {result.persona.proMatch.best.player.tags.map((t) => (
                    <span key={t} className="text-[10px] font-bold text-slate-200 bg-white/10 px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">{result.persona.proMatch.reason}</p>
              </div>
              <div className="mt-3 space-y-2">
                <div className="text-xs font-bold text-slate-500">라이벌 후보</div>
                {result.persona.proMatch.runnersUp.map((r) => (
                  <div key={r.player.key} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
                    <span className="text-sm font-bold text-slate-700">{r.player.name}</span>
                    <span className="text-xs text-slate-500">{r.score}점</span>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* ───────── (C) 내 코드 ───────── */}
            <SectionCard title="내 페르소나 코드" icon={<Heart className="w-4 h-4 text-rose-500" />}>
              <p className="text-xs text-slate-500 mb-2">이 코드를 친구에게 공유하면, 친구가 우리 궁합을 볼 수 있어요.</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={result.code}
                  aria-label="내 페르소나 코드"
                  className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl bg-slate-50 text-slate-800 font-mono text-sm tracking-wider text-center"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label="코드 복사하기"
                  className="px-4 py-2.5 rounded-xl font-bold text-sm bg-green-600 hover:bg-green-700 text-white shadow-sm transition-colors touch-target flex items-center gap-1.5 shrink-0"
                >
                  <Copy className="w-4 h-4" /> 복사
                </button>
              </div>
            </SectionCard>

            {/* ───────── (D) 친구 궁합 ───────── */}
            <SectionCard title="친구와 궁합 보기" icon={<Heart className="w-4 h-4 text-pink-500" />}>
              <p className="text-xs text-slate-500 mb-2">친구의 페르소나 코드를 입력하면 궁합 점수를 알려드려요.</p>
              <div className="flex gap-2">
                <input
                  value={friendCode}
                  onChange={(e) => setFriendCode(e.target.value)}
                  placeholder="SAJU1-XXXX-XXXX"
                  aria-label="친구 코드 입력"
                  className="flex-1 px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 font-mono text-sm tracking-wider focus:outline-none focus:ring-2 focus:ring-clay-500 focus:border-clay-500"
                />
                <button
                  type="button"
                  onClick={handleCompat}
                  aria-label="궁합 보기"
                  className="px-4 py-2.5 rounded-xl font-bold text-sm bg-clay-600 hover:bg-clay-700 text-white shadow-sm transition-colors touch-target shrink-0"
                >
                  궁합 보기
                </button>
              </div>
              {friendError && (
                <p className="text-xs text-red-500 mt-2">
                  {friendError.message}
                  {friendError.kind === "UNKNOWN_VERSION" && " (앱 업데이트 필요)"}
                  {(friendError.kind === "CHECKSUM" || friendError.kind === "FORMAT") && " 코드를 다시 확인해 주세요."}
                </p>
              )}

              {compat && (
                <div className="mt-4 space-y-3">
                  {/* 점수 배너 */}
                  <div className={`p-4 rounded-xl text-white text-center bg-gradient-to-r ${TIER_GRADIENT[compat.breakdown.tier]}`}>
                    <div className="text-xs font-bold uppercase tracking-widest opacity-90">{compat.breakdown.tier}</div>
                    <div className="text-4xl font-black mt-1">{compat.breakdown.total}<span className="text-lg">점</span></div>
                    <div className="text-xs mt-1.5 opacity-90">
                      나({result.inputs.mbti}) × 친구({compat.friendMbti}) · 닮은 프로 {compat.friend.proMatch.best.player.name}
                    </div>
                  </div>

                  {/* 사주/소통 점수 타일 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 bg-purple-50 rounded-xl text-center">
                      <div className="text-xs font-bold text-purple-600">사주(오행) 궁합</div>
                      <div className="text-2xl font-black text-slate-900">{compat.breakdown.ohaengScore}</div>
                    </div>
                    <div className="p-3 bg-clay-50 rounded-xl text-center">
                      <div className="text-xs font-bold text-clay-600">소통(MBTI) 궁합</div>
                      <div className="text-2xl font-black text-slate-900">{compat.breakdown.mbtiScore}</div>
                    </div>
                  </div>

                  {/* 이유 불릿 */}
                  <div className="space-y-1.5">
                    {compat.breakdown.reasons.map((reason, i) => (
                      <div key={i} className="flex gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-clay-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-slate-700 leading-relaxed">{reason}</p>
                      </div>
                    ))}
                  </div>

                  {/* 코트 위 시너지 */}
                  <div className="p-3 bg-slate-50 rounded-xl">
                    <div className="text-xs font-bold text-slate-500 mb-0.5">코트 위 시너지</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{compat.breakdown.courtSynergy}</p>
                  </div>
                </div>
              )}
            </SectionCard>
          </>
        )}

        <p className="text-[11px] text-slate-400 text-center px-4 leading-relaxed">
          ※ MBTI·사주 기반 분석은 과학적 예측이 아닌 재미를 위한 콘텐츠입니다.
          사주의 년·월주는 절기 경계에서 하루 정도 오차가 있을 수 있어요.
        </p>
      </div>
    </main>
  );
}
