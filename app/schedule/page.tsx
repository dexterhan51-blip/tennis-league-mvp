'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import AdminOnly from '@/components/auth/AdminOnly';
import { FullError, FullLoading } from '@/components/ui/DataState';
import { useToast } from '@/contexts/ToastContext';
import { useClubData } from '@/hooks/useClubData';
import { countableMatches } from '@/lib/clubView';
import { longDate, todayLocal } from '@/lib/date';
import { deleteScheduleItem, saveScheduleItem } from '@/lib/seasonApi';
import type { ScheduleItem } from '@/types';

const eyebrow = 'text-[11px] font-extrabold tracking-[0.08em] text-ink-mute';
const field = 'h-12 w-full rounded-[14px] bg-card border border-line px-3 text-[15px] font-bold text-ink outline-none focus:border-accent';

/** 다가오는 토요일 (오늘이 토요일이면 오늘) — 새 일정의 기본 날짜 */
function nextSaturday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const EMPTY = (): ScheduleItem => ({ id: '', date: nextSaturday(), time: '', place: '', memo: '' });

function ScheduleContent() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data, status, isDemo, reload } = useClubData();
  const [form, setForm] = useState<ScheduleItem>(EMPTY);
  const [busy, setBusy] = useState(false);
  const today = todayLocal();

  // 장소 입력을 쉽게: 지난 일정과 편집본 기록에 나온 장소
  const places = useMemo(() => {
    const set = new Set<string>();
    for (const s of data?.schedule ?? []) set.add(s.place);
    if (data) for (const m of countableMatches(data)) if (m.detail?.place) set.add(m.detail.place);
    return [...set].filter(Boolean).slice(0, 12);
  }, [data]);

  if (status === 'loading') return <FullLoading />;
  if (status === 'error' || !data) return <FullError message="일정을 불러올 수 없습니다. 네트워크를 확인해주세요." />;

  const schedule = data.schedule ?? [];
  const upcoming = schedule.filter((s) => s.date >= today);
  const past = schedule.filter((s) => s.date < today).reverse().slice(0, 5);

  const submit = async () => {
    if (!form.place.trim()) {
      showToast('장소를 적어주세요.', 'warning');
      return;
    }
    const item: ScheduleItem = {
      id: form.id || uuidv4(),
      date: form.date,
      time: form.time,
      place: form.place.trim(),
      ...(form.memo?.trim() ? { memo: form.memo.trim() } : {}),
    };
    setBusy(true);
    try {
      if (isDemo) showToast('예시 모드라 저장되지 않습니다.', 'info');
      else await saveScheduleItem(item);
      showToast(form.id ? '일정을 고쳤습니다.' : '일정을 등록했습니다.', 'success');
      setForm(EMPTY());
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '저장에 실패했습니다.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: ScheduleItem) => {
    setBusy(true);
    try {
      if (!isDemo) await deleteScheduleItem(item.id);
      showToast('일정을 지웠습니다.', 'success');
      if (form.id === item.id) setForm(EMPTY());
      await reload();
    } catch (e) {
      showToast(e instanceof Error ? e.message : '삭제에 실패했습니다.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const row = (item: ScheduleItem, muted = false) => (
    <li key={item.id} className="flex items-center gap-3 min-h-[62px] py-2 border-b border-line">
      <div className={`min-w-0 flex-1 ${muted ? 'opacity-60' : ''}`}>
        <b className="block text-[15px] font-extrabold text-ink">
          {longDate(item.date)}
          {item.time && <span className="num ml-1.5 font-bold text-ink-soft">{item.time}</span>}
        </b>
        <span className="block text-xs font-bold text-ink-mute truncate">
          {item.place}
          {item.memo ? ` · ${item.memo}` : ''}
        </span>
      </div>
      <button
        onClick={() => setForm({ ...item, memo: item.memo ?? '' })}
        className="w-10 h-10 rounded-xl bg-card-soft text-ink-soft flex items-center justify-center"
        aria-label={`${longDate(item.date)} 일정 고치기`}
      >
        <Pencil size={16} />
      </button>
      <button
        onClick={() => void remove(item)}
        disabled={busy}
        className="w-10 h-10 rounded-xl bg-card-soft text-down flex items-center justify-center disabled:opacity-40"
        aria-label={`${longDate(item.date)} 일정 지우기`}
      >
        <Trash2 size={16} />
      </button>
    </li>
  );

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface px-5 pt-4 pb-24">
      <header className="flex items-center gap-1 -ml-2">
        <button onClick={() => router.push('/admin')} className="w-11 h-11 flex items-center justify-center rounded-full text-ink-mute" aria-label="운영 화면으로">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink">다음 모임 일정</h1>
      </header>
      <p className="mt-1 text-sm text-ink-mute">여기 적은 일정이 첫 화면 「다음 모임」에 날짜순으로 보입니다. 지난 날짜는 자동으로 내려갑니다.</p>

      <section className="mt-4 rounded-[14px] bg-card p-3.5">
        <div className={eyebrow}>{form.id ? '일정 고치기' : '새 일정'}</div>
        <div className="mt-2 grid grid-cols-[1.4fr_1fr] gap-2">
          <label className="block">
            <span className="sr-only">날짜</span>
            <input type="date" value={form.date} onChange={(e) => e.target.value && setForm({ ...form, date: e.target.value })} className={field} />
          </label>
          <label className="block">
            <span className="sr-only">시간</span>
            <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className={field} />
          </label>
        </div>
        <label className="mt-2 block">
          <span className="sr-only">장소</span>
          <input
            value={form.place}
            onChange={(e) => setForm({ ...form, place: e.target.value })}
            placeholder="장소 (예: 평촌 3번 코트)"
            maxLength={40}
            list="schedule-places"
            className={field}
          />
          <datalist id="schedule-places">
            {places.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
        <label className="mt-2 block">
          <span className="sr-only">메모</span>
          <input
            value={form.memo ?? ''}
            onChange={(e) => setForm({ ...form, memo: e.target.value })}
            placeholder="메모 (선택 · 예: 2면, 게스트 환영)"
            maxLength={60}
            className={`${field} font-semibold`}
          />
        </label>
        <div className={`mt-3 grid gap-2 ${form.id ? 'grid-cols-[1fr_1.4fr]' : ''}`}>
          {form.id && (
            <button onClick={() => setForm(EMPTY())} className="h-12 rounded-[14px] bg-card-soft text-ink-soft text-sm font-bold">
              취소
            </button>
          )}
          <button onClick={() => void submit()} disabled={busy} className="h-12 rounded-[14px] bg-accent text-accent-ink text-sm font-extrabold disabled:opacity-50">
            {busy ? '저장 중...' : form.id ? '고친 내용 저장' : '일정 등록'}
          </button>
        </div>
      </section>

      <section className="mt-6">
        <div className={eyebrow}>다가오는 모임 {upcoming.length}</div>
        {upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-ink-mute">등록된 일정이 없습니다.</p>
        ) : (
          <ul className="mt-1">{upcoming.map((s) => row(s))}</ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-6">
          <div className={eyebrow}>지난 일정 (최근 5개)</div>
          <ul className="mt-1">{past.map((s) => row(s, true))}</ul>
        </section>
      )}
    </main>
  );
}

// 다음 모임 일정 (운영진): 날짜·시간·장소를 적어 목록으로 관리한다
export default function SchedulePage() {
  return (
    <AdminOnly>
      <ScheduleContent />
    </AdminOnly>
  );
}
