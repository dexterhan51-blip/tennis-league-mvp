'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Check, FileUp, FolderUp } from 'lucide-react';
import AdminOnly from '@/components/auth/AdminOnly';
import { FullError, FullLoading } from '@/components/ui/DataState';
import { useToast } from '@/contexts/ToastContext';
import { useClubData } from '@/hooks/useClubData';
import { knownGuests } from '@/lib/clubView';
import { longDate } from '@/lib/date';
import { EVENT_LABEL, FcpxmlImportError, parseFcpxml, tallyEvents, type ImportedMatch } from '@/lib/fcpxmlImport';
import { upsertFriendlyMatch, upsertLeagueMatch } from '@/lib/seasonApi';
import { createNamedGuest } from '@/utils/tennisLogic';
import { teamLabel, teamMembers } from '@/utils/playerInsights';
import type { Gender, Match, Player, RallyEventKind, Team } from '@/types';

const eyebrow = 'text-[11px] font-extrabold tracking-[0.08em] text-ink-mute';

interface Item {
  key: string;
  fileName: string;
  parsed: ImportedMatch;
  date: string;
  saved: boolean;
}

/** A·B 팀을 뒤집는다 (이미 등록된 경기와 팀 순서가 반대일 때) */
function flip(p: ImportedMatch): ImportedMatch {
  const swap = (t: 'A' | 'B') => (t === 'A' ? 'B' : 'A');
  return {
    ...p,
    teamA: p.teamB,
    teamB: p.teamA,
    scoreA: p.scoreB,
    scoreB: p.scoreA,
    pointLog: p.pointLog.map((x) => ({
      ...x,
      winner: swap(x.winner),
      pointA: x.pointB,
      pointB: x.pointA,
      gameA: x.gameB,
      gameB: x.gameA,
      ...(x.gameWon ? { gameWon: swap(x.gameWon) } : {}),
    })),
    events: p.events.map((e) => ({ ...e, team: swap(e.team) })),
  };
}

const sameSet = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

function ImportContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data, status, isDemo, reload } = useClubData();
  const [items, setItems] = useState<Item[]>([]);
  const [guestGender, setGuestGender] = useState<Record<string, Gender>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const folderRef = useRef<HTMLInputElement>(null);

  const people = useMemo(() => {
    const map = new Map<string, Player>();
    if (data) {
      for (const g of knownGuests(data)) map.set(g.name, g);
      for (const m of data.members) map.set(m.name, m);
    }
    return map;
  }, [data]);

  if (status === 'loading') return <FullLoading />;
  if (status === 'error' || !data) return <FullError message="회원 명단을 불러올 수 없습니다. 네트워크를 확인해주세요." />;

  const resolve = (name: string): Player => people.get(name) ?? createNamedGuest(name, guestGender[name] ?? 'MALE');
  const toTeam = (names: string[]): Team => {
    const [x, y = x] = names.map(resolve);
    // 혼복은 남자를 앞 칸에 두는 기존 저장 규칙을 따른다
    return x.gender === 'FEMALE' && y.gender === 'MALE' ? { id: uuidv4(), man: y, woman: x } : { id: uuidv4(), man: x, woman: y };
  };

  /** 같은 날 같은 선수 구성으로 이미 등록된 경기 찾기 (팀 순서가 반대여도 찾는다) */
  const findExisting = (p: ImportedMatch, date: string) => {
    const ids = (names: string[]) => names.map((n) => resolve(n).id);
    const a = ids(p.teamA);
    const b = ids(p.teamB);
    const check = (m: Match) => {
      const ma = teamMembers(m.teamA).map((x) => x.id);
      const mb = teamMembers(m.teamB).map((x) => x.id);
      if (sameSet(ma, a) && sameSet(mb, b)) return 'same' as const;
      if (sameSet(ma, b) && sameSet(mb, a)) return 'flipped' as const;
      return null;
    };
    for (const s of data.seasons) {
      for (const m of s.matches) {
        const how = m.date === date ? check(m) : null;
        if (how) return { match: m, seasonId: s.season.id as string | null, flipped: how === 'flipped' };
      }
    }
    for (const f of data.friendly) {
      const how = f.match_date === date ? check(f.match) : null;
      if (how) return { match: f.match, seasonId: null, flipped: how === 'flipped' };
    }
    return null;
  };

  const readFiles = async (list: FileList | null) => {
    if (!list) return;
    // .fcpxmld 는 폴더라 그 안의 Info.fcpxml 을 읽는다
    const files = [...list].filter((f) => /\.fcpxml$/i.test(f.name));
    if (files.length === 0) {
      showToast('FCPXML 파일을 찾지 못했습니다. (.fcpxml 파일 또는 .fcpxmld 폴더)', 'warning');
      return;
    }
    const next: Item[] = [];
    for (const file of files) {
      const label = (file.webkitRelativePath || file.name).replace(/\/Info\.fcpxml$/i, '');
      try {
        const parsed = parseFcpxml(await file.text());
        next.push({ key: uuidv4(), fileName: label, parsed, date: parsed.date ?? '', saved: false });
      } catch (e) {
        showToast(`${label}: ${e instanceof FcpxmlImportError ? e.message : '읽지 못했습니다.'}`, 'error');
      }
    }
    setItems((prev) => [...next, ...prev]);
  };

  const save = async (item: Item) => {
    if (!item.date) {
      showToast('날짜를 골라주세요.', 'warning');
      return;
    }
    const existing = findExisting(item.parsed, item.date);
    const p = existing?.flipped ? flip(item.parsed) : item.parsed;
    const base: Match = existing?.match ?? {
      id: uuidv4(),
      date: item.date,
      teamA: toTeam(p.teamA),
      teamB: toTeam(p.teamB),
      scoreA: 0,
      scoreB: 0,
      isFinished: false,
    };
    const match: Match = {
      ...base,
      scoreA: p.scoreA,
      scoreB: p.scoreB,
      isFinished: true,
      pointLog: p.pointLog,
      detail: { source: 'fcpxml', importedAt: new Date().toISOString(), events: p.events, ...(p.place ? { place: p.place } : {}) },
    };
    setBusy(item.key);
    try {
      if (isDemo) {
        showToast('예시 모드라 저장되지 않습니다.', 'info');
      } else if (existing?.seasonId) {
        await upsertLeagueMatch(existing.seasonId, match);
      } else {
        await upsertFriendlyMatch(match);
      }
      setItems((prev) => prev.map((x) => (x.key === item.key ? { ...x, saved: true } : x)));
      showToast(existing ? '이미 등록된 경기에 상세 기록을 붙였습니다.' : '새 경기로 등록했습니다.', 'success');
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '저장에 실패했습니다.', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface px-5 pt-4 pb-24">
      <header className="flex items-center gap-1 -ml-2">
        <button onClick={() => router.push('/admin')} className="w-11 h-11 flex items-center justify-center rounded-full text-ink-mute" aria-label="운영 화면으로">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink">편집 파일로 기록 올리기</h1>
      </header>
      <p className="mt-2 text-sm text-ink-mute leading-relaxed">
        파이널컷 편집본(FCPXML)의 점수판·기록용 자막을 읽어 포인트 흐름과 득점·에러 기록을 경기에 붙입니다. 맥에서 올리세요.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button onClick={() => folderRef.current?.click()} className="h-14 rounded-[14px] bg-accent text-accent-ink text-sm font-extrabold flex items-center justify-center gap-1.5">
          <FolderUp size={18} /> .fcpxmld 고르기
        </button>
        <button onClick={() => fileRef.current?.click()} className="h-14 rounded-[14px] bg-card text-ink text-sm font-bold flex items-center justify-center gap-1.5">
          <FileUp size={18} /> .fcpxml 파일
        </button>
      </div>
      <p className="mt-2 text-[11px] text-ink-faint">.fcpxmld 는 폴더 형태라 왼쪽 버튼으로 고릅니다. 여러 경기가 든 상위 폴더를 골라도 됩니다.</p>
      <input
        ref={folderRef}
        type="file"
        multiple
        hidden
        onChange={(e) => {
          void readFiles(e.target.files);
          e.target.value = '';
        }}
        {...({ webkitdirectory: '' } as Record<string, string>)}
      />
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        accept=".fcpxml,text/xml,application/xml"
        onChange={(e) => {
          void readFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="mt-5 space-y-3">
        {items.map((item) => {
          const p = item.parsed;
          const unknown = [...p.teamA, ...p.teamB].filter((n) => !people.has(n));
          const existing = item.date ? findExisting(p, item.date) : null;
          const tally = tallyEvents(p.events);
          return (
            <article key={item.key} className="rounded-[14px] bg-card p-3.5">
              <div className={`${eyebrow} truncate`}>{item.fileName}</div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[15px] font-extrabold text-ink truncate">{p.teamA.join(' · ')}</div>
                  <div className="text-[15px] font-extrabold text-ink truncate">{p.teamB.join(' · ')}</div>
                </div>
                <div className="num shrink-0 text-right text-[22px] font-black leading-[1.36] text-ink">
                  <div className={p.scoreA > p.scoreB ? 'text-accent' : ''}>{p.scoreA}</div>
                  <div className={p.scoreB > p.scoreA ? 'text-accent' : ''}>{p.scoreB}</div>
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2 border-t border-line pt-2">
                <span className="text-xs font-bold text-ink-soft truncate">
                  {item.date ? longDate(item.date) : '날짜 없음'}
                  {p.place ? ` · ${p.place}` : ''}
                </span>
                <input
                  type="date"
                  value={item.date}
                  onChange={(e) => setItems((prev) => prev.map((x) => (x.key === item.key ? { ...x, date: e.target.value } : x)))}
                  className="h-9 rounded-lg bg-surface border border-line px-1.5 text-xs font-bold text-ink"
                  aria-label="경기 날짜"
                />
              </div>

              <div className="mt-2 text-[11px] font-bold text-ink-mute num">포인트 {p.pointLog.length}개 · 기록 {p.events.length}개</div>
              <div className="mt-1">
                {(Object.keys(EVENT_LABEL) as RallyEventKind[]).map((kind) => (
                  <div key={kind} className="grid grid-cols-[40px_1fr_40px] items-center h-6 text-xs">
                    <span className="num font-extrabold text-ink">{tally.A[kind]}</span>
                    <span className="text-center font-bold text-ink-mute">{EVENT_LABEL[kind]}</span>
                    <span className="num text-right font-extrabold text-ink">{tally.B[kind]}</span>
                  </div>
                ))}
              </div>

              {unknown.map((name) => (
                <div key={name} className="mt-2 flex items-center justify-between rounded-xl bg-surface px-3 h-11">
                  <span className="text-xs font-bold text-ink-soft truncate">「{name}」은 명단에 없어 게스트로 넣습니다</span>
                  <div className="flex rounded-lg bg-card-soft p-0.5 text-xs font-bold">
                    {(['MALE', 'FEMALE'] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGuestGender((prev) => ({ ...prev, [name]: g }))}
                        aria-pressed={(guestGender[name] ?? 'MALE') === g}
                        className={`w-8 h-8 rounded-md ${(guestGender[name] ?? 'MALE') === g ? 'bg-card text-ink' : 'text-ink-mute'}`}
                      >
                        {g === 'MALE' ? '남' : '여'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {p.warnings.map((w) => (
                <p key={w} className="mt-2 text-xs font-bold text-down">
                  {w}
                </p>
              ))}

              <p className="mt-2 text-xs text-ink-mute">
                {existing
                  ? `같은 날 같은 선수 구성의 경기가 이미 있습니다(${teamLabel(existing.match.teamA)} ${existing.match.scoreA}:${existing.match.scoreB} ${teamLabel(existing.match.teamB)}). 그 경기에 상세 기록을 붙이고 점수를 편집본 기준으로 맞춥니다.`
                  : '이 날 같은 선수 구성의 경기가 없어 새 경기로 등록합니다.'}
              </p>
              <button
                onClick={() => void save(item)}
                disabled={item.saved || busy === item.key}
                className="mt-3 w-full h-12 rounded-[14px] bg-accent text-accent-ink text-sm font-extrabold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {item.saved ? (
                  <>
                    <Check size={16} /> 반영됨
                  </>
                ) : busy === item.key ? (
                  '저장 중...'
                ) : existing ? (
                  '기존 경기에 붙이기'
                ) : (
                  '새 경기로 등록'
                )}
              </button>
            </article>
          );
        })}
      </div>
    </main>
  );
}

// 영상 편집 파일(FCPXML) → 경기 상세 기록 (운영진)
export default function ImportPage() {
  return (
    <AdminOnly>
      <ImportContent />
    </AdminOnly>
  );
}
