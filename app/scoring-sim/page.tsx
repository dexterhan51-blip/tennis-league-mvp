'use client';

import { useState } from 'react';
import { Plus, Minus, Trash2, RotateCcw, Calculator, ShieldCheck, Scale } from 'lucide-react';

// ±점수제 시뮬레이션 — 새 시즌 승점 규칙 A안/B안 비교용 (팀원 의견 수렴 페이지)
//
// 공통 규칙:
//   참석 +2점/일, 승리 +1점, 패배 -1점. 하루 경기가 모두 끝난 뒤 승패를 정산한다.
//   그날 승패 정산이 마이너스여도 그날 참석점수 2점은 깎이지 않는다.
//
// A안 (하루 확정 보호): 하루가 끝나면 그날 얻은 점수(참석+승패)는 전부 확정.
//   다음날 아무리 져도 이전 날 점수는 깎이지 않는다.
//   → 그날 점수 = 2 + max(0, 그날 승 - 그날 패), 총점 = 매일 점수의 합
//
// B안 (참석점수만 보호): 승패점수는 시즌 내내 누적으로 상쇄된다.
//   오늘 패배(-1)가 지난날 승리(+1)로 딴 점수를 깎을 수 있다. 단 참석점수는 못 깎는다.
//   → 총점 = (참석 2 × 참석일수) + max(0, 시즌 누적 승 - 누적 패)

interface DayInput {
  wins: number;
  losses: number;
}

interface DayResult {
  day: number;
  wins: number;
  losses: number;
  net: number;
  aDayScore: number;   // A안 그날 확정 점수
  aTotal: number;      // A안 누적 총점
  bAttendance: number; // B안 누적 참석점수
  bMatchNet: number;   // B안 누적 승패점수 (원시값, 음수 가능)
  bTotal: number;      // B안 총점 (참석 + max(0, 승패누적))
  legacyTotal: number; // 참고: 현행 규칙 (참석1 + 승1, 패0)
}

const PRESETS: { label: string; desc: string; days: DayInput[] }[] = [
  {
    label: '역전 시나리오',
    desc: '1일차 3승1패 → 2일차 1승3패',
    days: [{ wins: 3, losses: 1 }, { wins: 1, losses: 3 }],
  },
  {
    label: '연패 후 반등',
    desc: '1일차 0승4패 → 2일차 4승0패',
    days: [{ wins: 0, losses: 4 }, { wins: 4, losses: 0 }],
  },
  {
    label: '꾸준한 상승',
    desc: '3승1패 · 2승2패 · 3승1패',
    days: [{ wins: 3, losses: 1 }, { wins: 2, losses: 2 }, { wins: 3, losses: 1 }],
  },
];

function simulate(days: DayInput[]): DayResult[] {
  const results: DayResult[] = [];
  let aTotal = 0;
  let bMatchNet = 0;
  let legacyTotal = 0;

  days.forEach((d, i) => {
    const net = d.wins - d.losses;

    // A안: 그날 정산 후 확정 (그날 마이너스는 참석점수를 못 깎으므로 최소 +2)
    const aDayScore = 2 + Math.max(0, net);
    aTotal += aDayScore;

    // B안: 승패점수는 시즌 누적으로 상쇄, 참석점수만 보호
    bMatchNet += net;
    const bAttendance = (i + 1) * 2;
    const bTotal = bAttendance + Math.max(0, bMatchNet);

    // 참고: 현행 규칙 (참석 1점/일 + 승리 1점, 패배 0점)
    legacyTotal += 1 + d.wins;

    results.push({
      day: i + 1,
      wins: d.wins,
      losses: d.losses,
      net,
      aDayScore,
      aTotal,
      bAttendance,
      bMatchNet,
      bTotal,
      legacyTotal,
    });
  });

  return results;
}

export default function ScoringSimPage() {
  const [days, setDays] = useState<DayInput[]>(PRESETS[0].days);

  const results = simulate(days);
  const last = results[results.length - 1];

  const updateDay = (index: number, field: keyof DayInput, delta: number) => {
    setDays(prev => prev.map((d, i) =>
      i === index ? { ...d, [field]: Math.max(0, d[field] + delta) } : d
    ));
  };

  const addDay = () => setDays(prev => [...prev, { wins: 2, losses: 2 }]);
  const removeDay = (index: number) => setDays(prev => prev.filter((_, i) => i !== index));

  const counter = (value: number, onDec: () => void, onInc: () => void) => (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onDec}
        className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="감소"
      >
        <Minus size={12} />
      </button>
      <span className="w-5 text-center font-bold text-slate-800 text-sm">{value}</span>
      <button
        onClick={onInc}
        className="w-7 h-7 rounded-full border border-slate-300 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
        aria-label="증가"
      >
        <Plus size={12} />
      </button>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <div className="max-w-md mx-auto px-4 pt-8">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Calculator className="text-clay-600" size={24} /> ±점수제 시뮬레이션
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
            새 시즌 승점 규칙 후보: <b>참석 +2</b> · <b>승리 +1</b> · <b>패배 -1</b>.
            하루 경기가 끝난 뒤 승패를 정산하며, 참석점수 2점은 깎이지 않습니다.
            아래 두 가지 안 중 어느 쪽이 좋은지 의견을 모아주세요.
          </p>
        </div>

        {/* 규칙 설명 */}
        <div className="space-y-3 mb-6">
          <div className="p-4 bg-white rounded-xl border-2 border-blue-200">
            <div className="flex items-center gap-1.5 text-blue-700 font-bold text-sm mb-1">
              <ShieldCheck size={15} /> A안 — 하루 점수 전부 보호
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              하루가 끝나면 그날 얻은 점수(참석 + 승패 정산)는 <b>전부 확정</b>됩니다.
              다음날 아무리 많이 져도 이전 날 점수는 깎이지 않습니다.
              그날 승패 정산이 마이너스면 0으로 처리되어 참석 2점만 남습니다.
            </p>
          </div>
          <div className="p-4 bg-white rounded-xl border-2 border-red-200">
            <div className="flex items-center gap-1.5 text-red-600 font-bold text-sm mb-1">
              <Scale size={15} /> B안 — 참석점수만 보호
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              승패점수(+1/-1)는 <b>시즌 내내 누적으로 상쇄</b>됩니다.
              오늘의 패배가 지난날 승리로 딴 점수를 깎을 수 있습니다.
              다만 참석점수만큼은 절대 깎이지 않아, 총점이 (참석일수 × 2점) 아래로 내려가지 않습니다.
            </p>
          </div>
        </div>

        {/* 프리셋 */}
        <div className="mb-4">
          <p className="text-xs font-bold text-slate-500 mb-2">예시 시나리오</p>
          <div className="grid grid-cols-3 gap-2">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => setDays(p.days.map(d => ({ ...d })))}
                className="p-2.5 bg-white rounded-lg border border-slate-200 hover:border-clay-400 transition-colors text-left"
              >
                <span className="block text-xs font-bold text-slate-700">{p.label}</span>
                <span className="block text-[10px] text-slate-400 mt-0.5 leading-tight">{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 날짜별 입력 */}
        <div className="mb-6 p-4 bg-white rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500">날짜별 전적 입력</p>
            <button
              onClick={() => setDays(PRESETS[0].days.map(d => ({ ...d })))}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
              aria-label="초기화"
            >
              <RotateCcw size={14} className="text-slate-400" />
            </button>
          </div>
          <div className="space-y-2.5">
            {days.map((d, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-12 text-xs font-bold text-slate-600 flex-shrink-0">{i + 1}일차</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-clay-600 font-bold">승</span>
                  {counter(d.wins, () => updateDay(i, 'wins', -1), () => updateDay(i, 'wins', 1))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-red-500 font-bold">패</span>
                  {counter(d.losses, () => updateDay(i, 'losses', -1), () => updateDay(i, 'losses', 1))}
                </div>
                <button
                  onClick={() => removeDay(i)}
                  disabled={days.length <= 1}
                  className="ml-auto p-1.5 text-slate-300 hover:text-red-400 disabled:opacity-30 transition-colors"
                  aria-label={`${i + 1}일차 삭제`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addDay}
            className="mt-3 w-full py-2 rounded-lg border border-dashed border-slate-300 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <Plus size={12} className="inline -mt-0.5" /> 날짜 추가
          </button>
        </div>

        {/* 날짜별 계산 과정 */}
        <div className="mb-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-500">날짜별 점수 변화</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="py-2 px-2 text-left font-medium">날짜</th>
                  <th className="py-2 px-2 text-center font-medium">전적</th>
                  <th className="py-2 px-2 text-center font-medium text-blue-600">A안 그날</th>
                  <th className="py-2 px-2 text-center font-bold text-blue-600">A안 누적</th>
                  <th className="py-2 px-2 text-center font-medium text-red-500">B안 승패누적</th>
                  <th className="py-2 px-2 text-center font-bold text-red-500">B안 총점</th>
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.day} className="border-b border-slate-50 last:border-0">
                    <td className="py-2 px-2 font-bold text-slate-600">{r.day}일차</td>
                    <td className="py-2 px-2 text-center text-slate-600">
                      {r.wins}승 {r.losses}패
                      <span className={`ml-1 font-bold ${r.net > 0 ? 'text-clay-600' : r.net < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                        ({r.net > 0 ? '+' : ''}{r.net})
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center text-slate-700">
                      +{r.aDayScore}
                      {r.net < 0 && <span className="block text-[9px] text-blue-400">마이너스 차단</span>}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-blue-700">{r.aTotal}</td>
                    <td className="py-2 px-2 text-center text-slate-700">
                      {r.bMatchNet > 0 ? '+' : ''}{r.bMatchNet}
                      {r.bMatchNet < 0 && <span className="block text-[9px] text-red-400">참석점수는 보호</span>}
                    </td>
                    <td className="py-2 px-2 text-center font-bold text-red-600">{r.bTotal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 최종 비교 */}
        {last && (
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200 text-center">
                <p className="text-xs font-bold text-blue-600 mb-1">A안 최종 점수</p>
                <p className="text-3xl font-black text-blue-700">{last.aTotal}점</p>
                <p className="text-[10px] text-blue-400 mt-1">하루 점수 전부 보호</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200 text-center">
                <p className="text-xs font-bold text-red-500 mb-1">B안 최종 점수</p>
                <p className="text-3xl font-black text-red-600">{last.bTotal}점</p>
                <p className="text-[10px] text-red-400 mt-1">참석점수만 보호</p>
              </div>
            </div>
            <div className="mt-3 p-3 bg-slate-100 rounded-xl text-center">
              <span className="text-xs text-slate-500">
                참고 — 현행 규칙(참석 1점 + 승리 1점, 패배 0점): <b className="text-slate-700">{last.legacyTotal}점</b>
              </span>
            </div>
            {last.aTotal !== last.bTotal ? (
              <p className="mt-3 text-xs text-slate-500 text-center leading-relaxed">
                이 시나리오에서 두 안의 차이는 <b className="text-slate-700">{Math.abs(last.aTotal - last.bTotal)}점</b>입니다.
                {last.aTotal > last.bTotal
                  ? ' A안이 이전 날 점수를 보호해주기 때문에 더 높습니다.'
                  : ''}
              </p>
            ) : (
              <p className="mt-3 text-xs text-slate-500 text-center">이 시나리오에서는 두 안의 결과가 같습니다.</p>
            )}
          </div>
        )}

        <p className="text-[11px] text-slate-400 text-center leading-relaxed">
          승/패 숫자를 바꾸거나 날짜를 추가해서 다양한 시나리오를 확인해보세요.<br />
          의견은 단톡방으로 남겨주세요 🎾
        </p>
      </div>
    </main>
  );
}
