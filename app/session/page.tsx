'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Check, Plus, Shuffle, Trash2, X } from 'lucide-react';
import AdminOnly from '@/components/auth/AdminOnly';
import { PlayerAvatar } from '@/components/live/PlayerAvatar';
import { FullError, FullLoading } from '@/components/ui/DataState';
import { useToast } from '@/contexts/ToastContext';
import { useClubData } from '@/hooks/useClubData';
import { knownGuests } from '@/lib/clubView';
import { longDate, todayLocal } from '@/lib/date';
import { enqueue, subscribePending } from '@/lib/writeQueue';
import {
  createNamedGuest,
  generateFromTemplate,
  generateSmartSchedule,
  getSinglesTemplateKey,
  getTemplateKey,
} from '@/utils/tennisLogic';
import { teamLabel, teamMembers } from '@/utils/playerInsights';
import type { Gender, Match, Player } from '@/types';

const eyebrow = 'text-[11px] font-extrabold tracking-[0.08em] text-ink-mute';

type DrawMode = 'formula' | 'singles' | 'auto';

/** 경기 id 를 새로 매기고 "그날 경기"로 표시한다 */
function asDaily(matches: Match[]): Match[] {
  return matches.map((m) => ({
    ...m,
    id: uuidv4(),
    teamA: { ...m.teamA, id: uuidv4() },
    teamB: { ...m.teamB, id: uuidv4() },
    isFriendly: true,
  }));
}

function SessionContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { showToast } = useToast();
  const { data, status, isDemo } = useClubData();

  const [date, setDate] = useState(() => params.get('date') || todayLocal());
  const [attendees, setAttendees] = useState<Player[]>([]);
  const [extraGuests, setExtraGuests] = useState<Player[]>([]);
  const [guestName, setGuestName] = useState('');
  const [guestGender, setGuestGender] = useState<Gender>('MALE');
  const [autoCount, setAutoCount] = useState(6);
  const [draft, setDraft] = useState<{ mode: DrawMode; matches: Match[] } | null>(null);
  // 서버에서 읽은 그날 경기 위에, 이 화면에서 고친 내용을 덮어쓴다 (전송은 대기열이 맡는다)
  const [local, setLocal] = useState<Map<string, Match | null>>(new Map());
  const [editing, setEditing] = useState<{ id: string; a: number; b: number } | null>(null);
  const [manual, setManual] = useState<{ a1: string; a2: string; b1: string; b2: string } | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => subscribePending(setPending), []);

  const members = useMemo(() => data?.members ?? [], [data]);
  const guests = useMemo(() => {
    const map = new Map<string, Player>((data ? knownGuests(data) : []).map((g) => [g.id, g]));
    for (const g of extraGuests) map.set(g.id, g);
    return [...map.values()];
  }, [data, extraGuests]);

  const dayMatches = useMemo(() => {
    const fromServer = (data?.friendly ?? [])
      .filter((f) => f.match_date === date)
      .map((f) => ({ ...f.match, isFriendly: true }) as Match);
    const out: Match[] = [];
    const seen = new Set<string>();
    for (const m of fromServer) {
      seen.add(m.id);
      const override = local.get(m.id);
      if (override === null) continue;
      out.push(override ?? m);
    }
    for (const [id, m] of local) if (m && !seen.has(id) && m.date === date) out.push(m);
    return out;
  }, [data, date, local]);

  if (status === 'loading') return <FullLoading />;
  if (status === 'error' || !data) return <FullError message="회원 명단을 불러올 수 없습니다. 네트워크를 확인해주세요." />;

  const men = attendees.filter((p) => p.gender === 'MALE');
  const women = attendees.filter((p) => p.gender === 'FEMALE');
  const formulaKey = getTemplateKey(men.length, women.length);
  const singlesKey = getSinglesTemplateKey(men.length, women.length);
  const canAuto = men.length >= 2 && women.length >= 2;

  const toggle = (p: Player) =>
    setAttendees((prev) => (prev.some((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]));

  const addGuest = () => {
    const name = guestName.trim();
    if (!name) return;
    if (members.some((m) => m.name === name)) {
      showToast(`「${name}」은 회원 명단에 있습니다. 위에서 골라주세요.`, 'warning');
      return;
    }
    const guest = createNamedGuest(name, guestGender);
    setExtraGuests((prev) => (prev.some((g) => g.id === guest.id) ? prev : [...prev, guest]));
    setAttendees((prev) => (prev.some((x) => x.id === guest.id) ? prev : [...prev, guest]));
    setGuestName('');
  };

  const makeDraw = (mode: DrawMode) => {
    try {
      let matches: Match[];
      if (mode === 'formula' && formulaKey) matches = generateFromTemplate(formulaKey, men, women, date);
      else if (mode === 'singles' && singlesKey) matches = generateFromTemplate(singlesKey, men, women, date);
      else matches = generateSmartSchedule({ maxMatches: autoCount, players: attendees, date });
      setDraft({ mode, matches: asDaily(matches) });
    } catch (e) {
      showToast(e instanceof Error ? e.message : '대진표를 만들지 못했습니다.', 'error');
    }
  };

  const save = (match: Match) => {
    setLocal((prev) => new Map(prev).set(match.id, match));
    if (!isDemo) enqueue({ kind: 'friendly-upsert', match });
  };

  const confirmDraw = () => {
    if (!draft) return;
    for (const m of draft.matches) save(m);
    showToast(`대진표 ${draft.matches.length}경기를 등록했습니다.`, 'success');
    setDraft(null);
  };

  const remove = (match: Match) => {
    setLocal((prev) => new Map(prev).set(match.id, null));
    if (!isDemo) enqueue({ kind: 'friendly-delete', matchId: match.id });
    setEditing(null);
  };

  const saveScore = (match: Match) => {
    if (!editing) return;
    save({ ...match, scoreA: editing.a, scoreB: editing.b, isFinished: true });
    setEditing(null);
  };

  const addManual = () => {
    if (!manual) return;
    const pick = (id: string) => attendees.find((p) => p.id === id);
    const a1 = pick(manual.a1);
    const b1 = pick(manual.b1);
    if (!a1 || !b1) {
      showToast('양 팀에 선수를 한 명 이상 골라주세요.', 'warning');
      return;
    }
    const a2 = pick(manual.a2) ?? a1;
    const b2 = pick(manual.b2) ?? b1;
    const ids = [a1.id, b1.id, ...(a2.id !== a1.id ? [a2.id] : []), ...(b2.id !== b1.id ? [b2.id] : [])];
    if (new Set(ids).size !== ids.length) {
      showToast('같은 선수가 두 번 들어갔습니다.', 'warning');
      return;
    }
    // 혼복은 남자를 앞 칸에 두는 기존 저장 규칙을 따른다
    const team = (x: Player, y: Player) =>
      x.gender === 'FEMALE' && y.gender === 'MALE' ? { id: uuidv4(), man: y, woman: x } : { id: uuidv4(), man: x, woman: y };
    save({
      id: uuidv4(),
      date,
      teamA: team(a1, a2),
      teamB: team(b1, b2),
      scoreA: 0,
      scoreB: 0,
      isFinished: false,
      isFriendly: true,
    });
    setManual(null);
  };

  const chip = (p: Player) => {
    const order = attendees.findIndex((x) => x.id === p.id);
    const on = order >= 0;
    return (
      <button
        key={p.id}
        onClick={() => toggle(p)}
        aria-pressed={on}
        className={`h-12 px-2.5 rounded-[14px] text-sm font-bold flex items-center gap-2 transition-colors ${
          on ? 'bg-accent text-accent-ink' : 'bg-card text-ink-soft'
        }`}
      >
        <PlayerAvatar photo={p.photo} gender={p.gender} name={p.name} sizeClass="w-7 h-7" emojiClass="text-xs" />
        <span className="truncate flex-1 text-left">{p.name}</span>
        {on && <span className="num text-xs font-extrabold opacity-80">{order + 1}</span>}
      </button>
    );
  };

  const finished = dayMatches.filter((m) => m.isFinished).length;
  const select = 'h-11 w-full rounded-xl bg-card border border-line px-2 text-sm font-bold text-ink';

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface px-5 pt-4 pb-24">
      <header className="flex items-center gap-1 -ml-2">
        <button
          onClick={() => router.push('/admin')}
          className="w-11 h-11 flex items-center justify-center rounded-full text-ink-mute"
          aria-label="운영 화면으로"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink">그날 모임 기록</h1>
      </header>
      {isDemo && <p className="mt-1 text-[11px] font-bold text-down">예시 모드 — 여기서 넣은 기록은 저장되지 않습니다</p>}

      <div className="mt-3 flex items-center justify-between border-y border-line py-3">
        <div>
          <div className={eyebrow}>날짜</div>
          <div className="mt-0.5 text-[17px] font-extrabold text-ink">{longDate(date)}</div>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="h-11 rounded-xl bg-card border border-line px-2 text-sm font-bold text-ink"
          aria-label="날짜 바꾸기"
        />
      </div>

      {/* 1. 온 사람 */}
      <section className="mt-5">
        <div className="flex items-baseline justify-between">
          <span className={eyebrow}>1. 온 사람 (누른 순서대로 번호)</span>
          <span className="num text-xs font-bold text-ink-mute">
            남 {men.length} · 여 {women.length}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">{members.map(chip)}</div>
        {guests.length > 0 && (
          <>
            <div className={`mt-4 ${eyebrow}`}>게스트</div>
            <div className="mt-2 grid grid-cols-2 gap-2">{guests.map(chip)}</div>
          </>
        )}
        <div className="mt-3 flex gap-2">
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addGuest()}
            placeholder="게스트 이름 직접 입력"
            maxLength={12}
            className="flex-1 min-w-0 h-11 rounded-xl bg-card border border-line px-3 text-sm text-ink outline-none focus:border-accent"
            aria-label="게스트 이름"
          />
          <div className="flex rounded-xl bg-card-soft p-0.5 text-xs font-bold">
            {(['MALE', 'FEMALE'] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGuestGender(g)}
                aria-pressed={guestGender === g}
                className={`w-9 rounded-[10px] ${guestGender === g ? 'bg-card text-ink' : 'text-ink-mute'}`}
              >
                {g === 'MALE' ? '남' : '여'}
              </button>
            ))}
          </div>
          <button onClick={addGuest} className="w-11 h-11 rounded-xl bg-ink text-surface flex items-center justify-center" aria-label="게스트 추가">
            <Plus size={18} />
          </button>
        </div>
        <p className="mt-2 text-[11px] text-ink-faint">같은 이름의 게스트는 다음에도 같은 사람으로 이어집니다. 게스트는 순위에는 들어가지 않습니다.</p>
      </section>

      {/* 2. 대진표 */}
      <section className="mt-6">
        <div className={eyebrow}>2. 대진표 만들기</div>
        {attendees.length < 2 ? (
          <p className="mt-2 text-sm text-ink-mute">온 사람을 먼저 골라주세요.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {formulaKey && (
              <button onClick={() => makeDraw('formula')} className="w-full h-12 rounded-[14px] bg-accent text-accent-ink text-sm font-extrabold">
                공식 대진 (남 {men.length} · 여 {women.length})
              </button>
            )}
            {singlesKey && (
              <button onClick={() => makeDraw('singles')} className="w-full h-12 rounded-[14px] bg-card text-ink text-sm font-bold">
                단식 섞은 공식 대진
              </button>
            )}
            {canAuto && (
              <div className="flex gap-2">
                <button
                  onClick={() => makeDraw('auto')}
                  className={`flex-1 h-12 rounded-[14px] text-sm font-bold ${formulaKey ? 'bg-card text-ink' : 'bg-accent text-accent-ink font-extrabold'}`}
                >
                  고르게 섞기 · 혼복 {autoCount}경기
                </button>
                <div className="flex items-center rounded-[14px] bg-card-soft">
                  <button onClick={() => setAutoCount((n) => Math.max(1, n - 1))} className="w-10 h-12 text-lg font-bold text-ink-soft" aria-label="경기 수 줄이기">
                    −
                  </button>
                  <button onClick={() => setAutoCount((n) => Math.min(20, n + 1))} className="w-10 h-12 text-lg font-bold text-ink-soft" aria-label="경기 수 늘리기">
                    +
                  </button>
                </div>
              </div>
            )}
            {!formulaKey && !singlesKey && !canAuto && (
              <p className="text-sm text-ink-mute">이 인원 구성은 자동 대진이 없습니다. 아래 「경기 직접 추가」로 넣어주세요.</p>
            )}
            {!formulaKey && canAuto && (
              <p className="text-[11px] text-ink-faint">
                남 {men.length} · 여 {women.length} 구성은 정해 둔 공식이 없어, 경기 수와 쉬는 순서가 고르게 돌아가도록 섞습니다.
              </p>
            )}
          </div>
        )}

        {draft && (
          <div className="mt-3 rounded-[14px] bg-card p-3.5">
            <div className="flex items-center justify-between">
              <b className="text-sm font-extrabold text-ink">미리 보기 · {draft.matches.length}경기</b>
              <button onClick={() => setDraft(null)} className="w-9 h-9 flex items-center justify-center text-ink-mute" aria-label="미리 보기 닫기">
                <X size={18} />
              </button>
            </div>
            <ol className="mt-1">
              {draft.matches.map((m, i) => (
                <li key={m.id} className="flex items-center gap-2 h-9 border-t border-line text-[13px] font-bold text-ink">
                  <span className="num w-5 text-ink-mute">{i + 1}</span>
                  <span className="flex-1 truncate">{teamLabel(m.teamA)}</span>
                  <span className="text-[10px] font-extrabold text-ink-faint">VS</span>
                  <span className="flex-1 truncate text-right">{teamLabel(m.teamB)}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 grid grid-cols-[1fr_1.4fr] gap-2">
              <button
                onClick={() => makeDraw(draft.mode)}
                disabled={draft.mode !== 'auto'}
                className="h-12 rounded-[14px] bg-card-soft text-ink-soft text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
              >
                <Shuffle size={16} /> 다시 섞기
              </button>
              <button onClick={confirmDraw} className="h-12 rounded-[14px] bg-accent text-accent-ink text-sm font-extrabold flex items-center justify-center gap-1.5">
                <Check size={16} /> 이 대진으로 등록
              </button>
            </div>
            {draft.mode !== 'auto' && (
              <p className="mt-2 text-[11px] text-ink-faint">공식 대진은 누른 순서(남 1·2…, 여 1·2…)대로 자리가 정해집니다. 바꾸려면 온 사람을 다시 눌러 순서를 바꾸세요.</p>
            )}
          </div>
        )}
      </section>

      {/* 3. 경기 기록 */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <span className={eyebrow}>3. 경기 기록</span>
          <span className="num text-xs font-bold text-ink-mute">
            {pending > 0 ? <span className="text-down">전송 대기 {pending}건</span> : `완료 ${finished}/${dayMatches.length}`}
          </span>
        </div>

        {dayMatches.length === 0 ? (
          <p className="mt-2 text-sm text-ink-mute">이 날 등록된 경기가 없습니다.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {dayMatches.map((m, i) => {
              const open = editing?.id === m.id;
              return (
                <div key={m.id} className="rounded-[14px] bg-card px-3.5 py-3">
                  <button
                    onClick={() => setEditing(open ? null : { id: m.id, a: m.scoreA, b: m.scoreB })}
                    aria-expanded={open}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between text-[11px] font-bold text-ink-mute">
                      <span>{i + 1}경기</span>
                      <span>{m.isFinished ? '완료 · 눌러서 고치기' : '눌러서 점수 입력'}</span>
                    </div>
                    {(['A', 'B'] as const).map((side) => {
                      const mine = side === 'A' ? m.scoreA : m.scoreB;
                      const other = side === 'A' ? m.scoreB : m.scoreA;
                      const won = m.isFinished && mine > other;
                      return (
                        <div key={side} className={`flex items-center justify-between h-[30px] ${won ? 'text-ink font-extrabold' : 'text-ink-soft font-semibold'}`}>
                          <span className="text-[15px] truncate">{teamLabel(side === 'A' ? m.teamA : m.teamB)}</span>
                          <span className={`num text-[22px] font-extrabold ${won ? 'text-accent' : ''}`}>{m.isFinished ? mine : '–'}</span>
                        </div>
                      );
                    })}
                  </button>

                  {open && editing && (
                    <div className="mt-2 border-t border-line pt-3">
                      {(['a', 'b'] as const).map((k) => (
                        <div key={k} className="mb-2">
                          <div className="text-[11px] font-bold text-ink-mute truncate">{teamLabel(k === 'a' ? m.teamA : m.teamB)}</div>
                          <div className="mt-1 grid grid-cols-7 gap-1">
                            {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                              <button
                                key={n}
                                onClick={() => setEditing({ ...editing, [k]: n })}
                                aria-pressed={editing[k] === n}
                                className={`num h-11 rounded-xl text-base font-extrabold ${editing[k] === n ? 'bg-ink text-surface' : 'bg-card-soft text-ink-soft'}`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="mt-3 grid grid-cols-[44px_1fr_1.4fr] gap-2">
                        <button onClick={() => remove(m)} className="h-12 rounded-[14px] bg-card-soft text-down flex items-center justify-center" aria-label="이 경기 삭제">
                          <Trash2 size={18} />
                        </button>
                        <Link href={`/referee?id=${m.id}`} className="h-12 rounded-[14px] bg-card-soft text-ink-soft text-sm font-bold flex items-center justify-center">
                          포인트 단위 입력
                        </Link>
                        <button onClick={() => saveScore(m)} className="h-12 rounded-[14px] bg-accent text-accent-ink text-sm font-extrabold">
                          {editing.a} : {editing.b} 저장
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 경기 직접 추가 */}
        {manual ? (
          <div className="mt-3 rounded-[14px] bg-card p-3.5">
            <b className="text-sm font-extrabold text-ink">경기 직접 추가</b>
            <p className="mt-0.5 text-[11px] text-ink-faint">둘째 칸을 비우면 단식입니다. 온 사람 중에서 고릅니다.</p>
            {(['a', 'b'] as const).map((t) => (
              <div key={t} className="mt-2 grid grid-cols-2 gap-2">
                {(['1', '2'] as const).map((n) => {
                  const key = `${t}${n}` as keyof typeof manual;
                  return (
                    <select key={key} value={manual[key]} onChange={(e) => setManual({ ...manual, [key]: e.target.value })} className={select} aria-label={`${t.toUpperCase()}팀 선수 ${n}`}>
                      <option value="">{t.toUpperCase()}팀 {n === '1' ? '선수' : '(파트너)'}</option>
                      {attendees.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  );
                })}
              </div>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => setManual(null)} className="h-12 rounded-[14px] bg-card-soft text-ink-soft text-sm font-bold">
                취소
              </button>
              <button onClick={addManual} className="h-12 rounded-[14px] bg-accent text-accent-ink text-sm font-extrabold">
                추가
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              if (attendees.length < 2) showToast('온 사람을 먼저 골라주세요.', 'warning');
              else setManual({ a1: '', a2: '', b1: '', b2: '' });
            }}
            className="mt-3 w-full h-12 rounded-[14px] bg-card-soft text-ink-soft text-sm font-bold flex items-center justify-center gap-1.5"
          >
            <Plus size={16} /> 경기 직접 추가
          </button>
        )}
      </section>

      <p className="mt-6 text-[11px] text-ink-faint leading-relaxed">
        여기서 기록한 경기는 시즌과 상관없이 개인 기록과 두 달 기간 순위·통산에 쌓입니다. 이 날 참가자{' '}
        {[...new Set(dayMatches.flatMap((m) => [...teamMembers(m.teamA), ...teamMembers(m.teamB)].map((p) => p.name)))].length}명.
      </p>
    </main>
  );
}

// 그날 모임 기록 (운영진): 온 사람 → 대진표 → 점수. 시즌이 없어도 쓴다.
export default function SessionPage() {
  return (
    <AdminOnly>
      <Suspense fallback={<FullLoading />}>
        <SessionContent />
      </Suspense>
    </AdminOnly>
  );
}
