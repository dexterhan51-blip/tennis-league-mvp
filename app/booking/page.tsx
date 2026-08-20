"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, MapPin, Trash2, ExternalLink, Clock, Info, Share2, Wifi, WifiOff, Loader2, Link2, LogOut, CalendarCheck } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";
import { useBookingSync } from "@/hooks/useBookingSync";
import AppLogo from "@/components/ui/AppLogo";

// --- Types ---
type BookingStatus = "trying" | "confirmed";

interface BookingEntry {
  member: string;
  status: BookingStatus;
}

interface Bookings {
  [key: string]: string; // "date|venue|hour" → "name:status"
}

interface CalendarCell {
  day: number;
  cur: boolean;
  mo: number;
}

// --- Venue Info ---
interface VenueInfo {
  name: string;
  label: string;
  url: string;
  bookingMethod: string;
  openSchedule: string;
  openDays: number[];
  rules: string[];
  phone: string;
  color: { bg: string; text: string; border: string; badge: string };
}

const VENUE_INFO: VenueInfo[] = [
  {
    name: "평촌",
    label: "안양시공공스포츠클럽",
    url: "https://www.absc.or.kr/sys/bbs/board.php?bo_table=0303",
    bookingMethod: "홈페이지 인터넷 접수 (absc.or.kr)",
    openSchedule: "매월 26일 15시 익월분 접수 개시",
    openDays: [26],
    rules: [
      "팀당 일일 1회 신청",
      "신청 다음날 18시까지 입금 (미입금 시 자동 취소)",
      "안양시민 및 안양시 소재 단체 대상",
    ],
    phone: "031-421-0877",
    color: { bg: "bg-tint-m-bg", text: "text-tint-m-fg", border: "border-tint-m-fg/30", badge: "bg-tint-m-fg" },
  },
  {
    name: "의왕",
    label: "경기도 공유재산 예약",
    url: "https://share.gg.go.kr/facilityListS11/view?instiCode=1250001&facilityId=F0023&searchArea=&searchArea2=&searchType=S1_1&searchType2=&searchDate=&searchFacilityNm=&curPage=1&reservAvailable=&pCode=&pCodeNm=",
    bookingMethod: "경기도 공유재산 예약시스템 (share.gg.go.kr)",
    openSchedule: "매월 25일 익월분 접수 개시",
    openDays: [25],
    rules: [
      "접속 시 대기열 통과 필요",
      "예약 오픈 시간에 접속 대기 발생 가능",
    ],
    phone: "031-8008-4114",
    color: { bg: "bg-up/10", text: "text-up", border: "border-up/30", badge: "bg-up" },
  },
  {
    name: "군포",
    label: "군포도시공사 시민체육광장",
    url: "https://www.gunpouc.or.kr/fmcs/157",
    bookingMethod: "군포도시공사 홈페이지 (gunpouc.or.kr)",
    openSchedule: "매월 1~3일 관내 추첨 신청 → 4일 추첨 → 14일 전부터 잔여 실시간",
    openDays: [1, 2, 3, 4],
    rules: [
      "관내 추첨: 1일 10시 ~ 3일 23:59 신청",
      "4일 09시 추첨, 당첨 후 24시간 내 결제",
      "잔여분: 사용일 14일 전 10시부터 실시간 예약",
      "온라인 예약 후 3시간 내 결제 필수",
    ],
    phone: "",
    color: { bg: "bg-accent-soft", text: "text-accent", border: "border-accent/30", badge: "bg-accent" },
  },
];

function getBookingOpenDays(day: number): VenueInfo[] {
  return VENUE_INFO.filter(v => v.openDays.includes(day));
}

// --- Pricing ---
// 평촌: 평일 주간 3,500 / 야간 6,500, 주말·공휴일 주간 5,000 / 야간 9,500 (1면 1시간)
// 의왕: 주말·공휴일 주간 4,000 / 야간 7,000 (야간 18시부터)
// 군포: 1시간 10,000원 고정
function getHourlyPrice(venue: string, date: string, hour: number): number {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0=일, 6=토
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (venue === "평촌") {
    // 하절기(3~10월) 야간 18시~, 동절기(11~2월) 야간 17시~
    const mo = d.getMonth() + 1;
    const nightStart = (mo >= 3 && mo <= 10) ? 18 : 17;
    const isNight = hour >= nightStart;
    if (isWeekend) return isNight ? 9500 : 5000;
    return isNight ? 6500 : 3500;
  }

  if (venue === "의왕") {
    const isNight = hour >= 18;
    if (isWeekend) return isNight ? 7000 : 4000;
    // 평일 요금 정보 없음 — 주말과 동일하게 적용
    return isNight ? 7000 : 4000;
  }

  if (venue === "군포") {
    return 10000;
  }

  return 0;
}

function calcTotalPrice(venue: string, date: string, hours: number[]): number {
  return hours.reduce((sum, h) => sum + getHourlyPrice(venue, date, h), 0);
}

function formatPrice(price: number): string {
  return price.toLocaleString() + "원";
}

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6);

const STORAGE_KEY = "tennis-booking-v2";
const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

// --- Helpers ---
const pad = (n: number) => String(n).padStart(2, "0");
const dateStr = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayStr = () => {
  const t = new Date();
  return dateStr(t.getFullYear(), t.getMonth(), t.getDate());
};
const formatHour = (h: number) =>
  h < 12 ? `오전 ${h}시` : h === 12 ? "오후 12시" : `오후 ${h - 12}시`;
const shortHour = (h: number) =>
  `${h < 12 ? h : h === 12 ? 12 : h - 12}${h < 12 ? "AM" : "PM"}`;

function parseBooking(val: string): BookingEntry {
  const idx = val.lastIndexOf(":");
  if (idx === -1) return { member: val, status: "confirmed" }; // legacy compat
  return { member: val.slice(0, idx), status: val.slice(idx + 1) as BookingStatus };
}

function encodeBooking(member: string, status: BookingStatus): string {
  return `${member}:${status}`;
}

function memberColor(name: string) {
  const palettes = [
    { bg: "bg-up/10", text: "text-up", dot: "bg-up", dotTrying: "bg-up/45" },
    { bg: "bg-tint-m-bg", text: "text-tint-m-fg", dot: "bg-tint-m-fg", dotTrying: "bg-tint-m-fg/45" },
    { bg: "bg-tint-f-bg", text: "text-tint-f-fg", dot: "bg-tint-f-fg", dotTrying: "bg-tint-f-fg/45" },
    { bg: "bg-accent-soft", text: "text-accent", dot: "bg-accent", dotTrying: "bg-accent/45" },
    { bg: "bg-violet-400/15", text: "text-violet-500", dot: "bg-violet-400", dotTrying: "bg-violet-400/45" },
    { bg: "bg-teal-500/15", text: "text-teal-600", dot: "bg-teal-500", dotTrying: "bg-teal-500/45" },
    { bg: "bg-down/10", text: "text-down", dot: "bg-down", dotTrying: "bg-down/45" },
    { bg: "bg-indigo-400/15", text: "text-indigo-500", dot: "bg-indigo-400", dotTrying: "bg-indigo-400/45" },
    { bg: "bg-cyan-600/15", text: "text-cyan-700", dot: "bg-cyan-600", dotTrying: "bg-cyan-600/45" },
    { bg: "bg-amber-400/15", text: "text-amber-600", dot: "bg-amber-400", dotTrying: "bg-amber-400/45" },
  ];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palettes[Math.abs(h) % palettes.length];
}

function calendarDays(year: number, month: number): CalendarCell[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();
  const rows: CalendarCell[][] = [];
  let week: CalendarCell[] = [];
  for (let i = firstDay - 1; i >= 0; i--) week.push({ day: prevDays - i, cur: false, mo: month - 1 });
  for (let d = 1; d <= daysInMonth; d++) {
    week.push({ day: d, cur: true, mo: month });
    if (week.length === 7) { rows.push(week); week = []; }
  }
  if (week.length > 0) {
    let nd = 1;
    while (week.length < 7) week.push({ day: nd++, cur: false, mo: month + 1 });
    rows.push(week);
  }
  return rows;
}

// --- Main Component ---
export default function BookingPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [bookings, setBookings] = useState<Bookings>({});
  const [sel, setSel] = useState<CalendarCell | null>(null);
  const [openVenue, setOpenVenue] = useState<string | null>(null);
  const [selectedHours, setSelectedHours] = useState<number[]>([]);
  const [member, setMember] = useState("");
  const [confirm, setConfirm] = useState<{ venue: string; hours: number[]; member: string; status: BookingStatus } | null>(null);
  const [shareModal, setShareModal] = useState<"publish" | "subscribe" | null>(null);
  const [pinInput, setPinInput] = useState("");

  // Supabase sync
  const handleRemoteUpdate = useCallback((remote: Bookings) => {
    setBookings(remote);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ bk: remote })); } catch { /* ignore */ }
  }, []);
  const sync = useBookingSync(bookings, handleRemoteUpdate);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.bk) setBookings(data.bk);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist last used member name
  useEffect(() => {
    try {
      const saved = localStorage.getItem("booking-last-member");
      if (saved) setMember(saved);
    } catch { /* ignore */ }
  }, []);

  const persist = useCallback((newBk: Bookings) => {
    setBookings(newBk);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ bk: newBk })); } catch { /* ignore */ }
  }, []);

  const getBooking = (d: string, venue: string, h: number): BookingEntry | null => {
    const val = bookings[`${d}|${venue}|${h}`];
    return val ? parseBooking(val) : null;
  };

  // Book selected hours
  const doBook = (status: BookingStatus) => {
    if (!member.trim() || !openVenue || !sel || selectedHours.length === 0) return;
    const name = member.trim();
    const d = dateStr(year, sel.mo, sel.day);
    const newBk = { ...bookings };
    for (const hour of selectedHours) {
      newBk[`${d}|${openVenue}|${hour}`] = encodeBooking(name, status);
    }
    persist(newBk);
    try { localStorage.setItem("booking-last-member", name); } catch { /* ignore */ }
    setSelectedHours([]);
    const label = status === "trying" ? "예약도전" : "예약확정";
    showToast(`${name} ${formatHour(Math.min(...selectedHours))}~${formatHour(Math.max(...selectedHours) + 1)} ${label}!`, "success");
  };

  const doCancel = () => {
    if (!confirm || !sel) return;
    const d = dateStr(year, sel.mo, sel.day);
    const newBk = { ...bookings };
    for (const h of confirm.hours) {
      delete newBk[`${d}|${confirm.venue}|${h}`];
    }
    persist(newBk);
    showToast(`${confirm.member}님 예약 취소됨`, "info");
    setConfirm(null);
  };

  const doConfirmBooking = () => {
    if (!confirm || !sel) return;
    const d = dateStr(year, sel.mo, sel.day);
    const newBk = { ...bookings };
    for (const h of confirm.hours) {
      newBk[`${d}|${confirm.venue}|${h}`] = encodeBooking(confirm.member, "confirmed");
    }
    persist(newBk);
    showToast(`${confirm.member}님 예약확정!`, "success");
    setConfirm(null);
  };

  const slotClick = (venue: string, hour: number) => {
    if (!sel) return;
    const d = dateStr(year, sel.mo, sel.day);
    const existing = getBooking(d, venue, hour);
    if (existing) {
      // Find all consecutive hours by this member with same status
      const contiguous = [hour];
      for (let h = hour - 1; h >= 6; h--) {
        const b = getBooking(d, venue, h);
        if (b && b.member === existing.member && b.status === existing.status) contiguous.unshift(h);
        else break;
      }
      for (let h = hour + 1; h <= 21; h++) {
        const b = getBooking(d, venue, h);
        if (b && b.member === existing.member && b.status === existing.status) contiguous.push(h);
        else break;
      }
      setConfirm({ venue, hours: contiguous, member: existing.member, status: existing.status });
    } else {
      // Toggle selection
      setSelectedHours(prev =>
        prev.includes(hour) ? prev.filter(h => h !== hour) : [...prev, hour].sort((a, b) => a - b)
      );
    }
  };

  // Navigation
  const nav = (dir: number) => {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setYear(y); setMonth(m); setSel(null); setOpenVenue(null); setSelectedHours([]);
  };

  const goToday = () => {
    const t = new Date();
    setYear(t.getFullYear()); setMonth(t.getMonth());
    setSel({ day: t.getDate(), cur: true, mo: t.getMonth() });
    setOpenVenue(null); setSelectedHours([]);
  };

  // Computed
  const rows = calendarDays(year, month);
  const today = todayStr();
  const selDateStr = sel ? dateStr(year, sel.mo, sel.day) : null;
  const isToday = selDateStr === today;
  const currentHour = new Date().getHours();

  // Monthly summary: all bookings for the displayed month
  const monthlySummary = useMemo(() => {
    const prefix = `${year}-${pad(month + 1)}-`;
    const entries: { date: string; day: string; venue: string; hours: number[]; member: string; status: BookingStatus }[] = [];
    const grouped: Record<string, { hours: number[]; member: string; status: BookingStatus; venue: string; date: string }> = {};

    for (const [key, val] of Object.entries(bookings)) {
      if (!key.startsWith(prefix)) continue;
      const parts = key.split("|");
      if (parts.length !== 3) continue;
      const [date, venue, hourStr] = parts;
      const hour = parseInt(hourStr);
      const { member: m, status } = parseBooking(val);
      const groupKey = `${date}|${venue}|${m}|${status}`;

      if (!grouped[groupKey]) {
        grouped[groupKey] = { date, venue, member: m, status, hours: [] };
      }
      grouped[groupKey].hours.push(hour);
    }

    for (const g of Object.values(grouped)) {
      g.hours.sort((a, b) => a - b);
      const d = new Date(g.date);
      entries.push({ ...g, day: DAYS[d.getDay()] });
    }

    entries.sort((a, b) => a.date.localeCompare(b.date) || a.venue.localeCompare(b.venue));
    return entries;
  }, [bookings, year, month]);

  return (
    <div className="max-w-md mx-auto min-h-screen bg-surface">

      {/* HEADER */}
      <div className="bg-card border-b border-line px-4 pt-3 pb-0 sticky top-0 z-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/")} className="p-1 -ml-1 text-ink-mute hover:text-ink-soft">
              <ArrowLeft size={20} />
            </button>
            <AppLogo size={24} />
            <span className="text-lg font-extrabold text-ink tracking-tight tabular-nums">{year}년 {month + 1}월</span>
          </div>
          <div className="flex items-center gap-1">
            {sync.isConfigured && (sync.isPublished || sync.isSubscribed) && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold ${
                sync.connectionStatus === 'connected' ? "bg-up/10 text-up"
                : sync.connectionStatus === 'connecting' ? "bg-amber-400/15 text-amber-600"
                : "bg-down/10 text-down"
              }`}>
                {sync.connectionStatus === 'connected' ? <Wifi size={12} /> :
                 sync.connectionStatus === 'connecting' ? <Loader2 size={12} className="animate-spin" /> :
                 <WifiOff size={12} />}
                {sync.isSyncing ? "동기화중" : sync.pinCode}
              </div>
            )}
            {sync.isConfigured && (
              <button
                onClick={() => { setPinInput(""); setShareModal("publish"); }}
                className={`border rounded-md w-8 h-8 flex items-center justify-center ${
                  sync.isPublished || sync.isSubscribed
                    ? "border-up/30 bg-up/10 text-up"
                    : "border-line-strong bg-card text-ink-mute hover:bg-card-soft"
                }`}
              >
                <Share2 size={15} />
              </button>
            )}
            <button onClick={goToday} className="border border-line-strong rounded-md bg-card px-2.5 py-1 text-xs font-semibold text-ink-soft hover:bg-card-soft">오늘</button>
            <button onClick={() => nav(-1)} className="border border-line-strong rounded-md bg-card text-ink-soft w-8 h-8 flex items-center justify-center hover:bg-card-soft"><ChevronLeft size={16} /></button>
            <button onClick={() => nav(1)} className="border border-line-strong rounded-md bg-card text-ink-soft w-8 h-8 flex items-center justify-center hover:bg-card-soft"><ChevronRight size={16} /></button>
          </div>
        </div>
        <div className="grid grid-cols-7 pb-1.5">
          {DAYS.map((d, i) => (
            <div key={d} className={`text-center text-[11px] font-semibold ${i === 0 ? "text-down" : i === 6 ? "text-tint-m-fg" : "text-ink-faint"}`}>{d}</div>
          ))}
        </div>
      </div>

      {/* CALENDAR */}
      <div className="bg-card pb-1">
        {rows.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-line">
            {week.map((cell, ci) => {
              const d = dateStr(year, cell.mo, cell.day);
              const isT = d === today;
              const isSel = sel && sel.day === cell.day && sel.mo === cell.mo && cell.cur;
              const dayBks = Object.entries(bookings).filter(([k]) => k.startsWith(`${d}|`));
              const parsed = dayBks.map(([, v]) => parseBooking(v));
              const names = [...new Set(parsed.map(p => p.member))].slice(0, 3);
              const hasConfirmed = parsed.some(p => p.status === "confirmed");
              const hasTrying = parsed.some(p => p.status === "trying");
              const openVenues = cell.cur ? getBookingOpenDays(cell.day) : [];

              return (
                <button
                  key={ci}
                  onClick={() => { if (cell.cur) { setSel(cell); setOpenVenue(null); setSelectedHours([]); } }}
                  className={`border-none min-h-[64px] flex flex-col items-center gap-0.5 pt-1.5 pb-1 px-0.5 transition-colors relative ${
                    cell.cur ? "cursor-pointer" : "cursor-default opacity-25"
                  } ${isSel ? "bg-accent-soft border-l-2 border-l-accent" : ""}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[13px] tabular-nums ${
                    isT ? "bg-ink text-card font-bold"
                    : ci === 0 ? "text-down" : ci === 6 ? "text-tint-m-fg" : "text-ink-soft"
                  } ${isT ? "" : "font-normal"}`}>
                    {cell.day}
                  </div>
                  {cell.cur && openVenues.length > 0 && (
                    <div className="flex gap-[2px] justify-center">
                      {openVenues.map((v) => (
                        <div key={v.name} className={`w-[5px] h-[5px] rounded-full ${v.color.badge}`} />
                      ))}
                    </div>
                  )}
                  {cell.cur && names.length > 0 && (
                    <div className="flex flex-col gap-[1.5px] w-full px-0.5">
                      {names.map((n, ni) => {
                        const c = memberColor(n);
                        const entry = parsed.find(p => p.member === n);
                        const isTrying = entry?.status === "trying";
                        return (
                          <div
                            key={ni}
                            className={`${isTrying ? c.dotTrying : c.dot} rounded-sm py-[1px] text-[8px] font-semibold text-white text-center overflow-hidden text-ellipsis whitespace-nowrap ${isTrying ? "border border-dashed border-white/50" : ""}`}
                          >
                            {isTrying ? `${n}?` : n}
                          </div>
                        );
                      })}
                      {dayBks.length > 3 && <div className="text-[8px] text-ink-faint text-center">+{dayBks.length - 3}</div>}
                    </div>
                  )}
                  {/* Status dot at corner */}
                  {cell.cur && (hasConfirmed || hasTrying) && (
                    <div className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${hasConfirmed ? "bg-up" : "bg-amber-400"}`} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="bg-card px-3.5 py-2 flex flex-wrap items-center gap-3 border-b border-line">
        <span className="text-[10px] text-ink-faint font-semibold">범례:</span>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-up" />
          <span className="text-[10px] text-ink-mute">확정</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="text-[10px] text-ink-mute">도전중</span>
        </div>
        {VENUE_INFO.filter(v => v.openDays.length > 0).map((v) => (
          <div key={v.name} className="flex items-center gap-1">
            <div className={`w-[6px] h-[6px] rounded-full ${v.color.badge}`} />
            <span className="text-[10px] text-ink-mute">{v.name} 오픈({v.openDays.map(d => `${d}일`).join("·")})</span>
          </div>
        ))}
      </div>

      {/* DAY DETAIL */}
      {sel && sel.cur ? (
        <div className="bg-card mt-2 px-3.5 pt-3.5 pb-5">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-[15px] font-bold text-ink tracking-tight tabular-nums">
              {sel.mo + 1}월 {sel.day}일 ({DAYS[new Date(year, sel.mo, sel.day).getDay()]})
            </h3>
            {selectedHours.length > 0 && (
              <button onClick={() => setSelectedHours([])} className="text-xs text-ink-faint hover:text-ink-mute">선택 초기화</button>
            )}
          </div>

          {VENUE_INFO.map((venue) => {
            const isOpen = openVenue === venue.name;
            const venueBkCount = selDateStr ? Object.keys(bookings).filter(k => k.startsWith(`${selDateStr}|${venue.name}|`)).length : 0;
            const isOpenDay = venue.openDays.includes(sel.day);

            return (
              <div key={venue.name} className={`mb-2.5 border rounded-xl overflow-hidden ${isOpenDay ? venue.color.border : "border-line"}`}>
                <button
                  onClick={() => { setOpenVenue(isOpen ? null : venue.name); setSelectedHours([]); }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 border-none cursor-pointer ${isOpen ? "bg-card-soft" : "bg-card"}`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${venue.color.badge}`} />
                    <span className="text-[15px] font-bold text-ink">{venue.name}</span>
                    {isOpenDay && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${venue.color.bg} ${venue.color.text}`}>예약 오픈</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {venueBkCount > 0 && (
                      <span className="text-[11px] font-semibold text-accent bg-accent-soft px-2 py-0.5 rounded-full tabular-nums">{venueBkCount}건</span>
                    )}
                    <ChevronDown size={16} className={`text-ink-faint transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-3.5 pb-3.5">
                    {/* Venue info */}
                    <div className={`rounded-lg p-3 mb-3 ${venue.color.bg} border ${venue.color.border}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className={`text-xs font-bold ${venue.color.text} mb-0.5`}>{venue.label}</div>
                          <div className="text-[11px] text-ink-mute">{venue.bookingMethod}</div>
                        </div>
                        <a href={venue.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className={`flex items-center gap-1 text-[11px] font-semibold ${venue.color.text} hover:underline shrink-0`}>
                          예약 사이트 <ExternalLink size={11} />
                        </a>
                      </div>
                      <div className="flex items-start gap-1.5 mb-1.5">
                        <Clock size={12} className={`${venue.color.text} mt-0.5 shrink-0`} />
                        <span className={`text-[11px] font-semibold ${venue.color.text}`}>{venue.openSchedule}</span>
                      </div>
                      {venue.rules.length > 0 && (
                        <div className="flex items-start gap-1.5">
                          <Info size={12} className="text-ink-faint mt-0.5 shrink-0" />
                          <ul className="text-[10px] text-ink-mute leading-relaxed space-y-0.5">
                            {venue.rules.map((rule, i) => <li key={i}>· {rule}</li>)}
                          </ul>
                        </div>
                      )}
                      {venue.phone && <div className="mt-1.5 text-[10px] text-ink-faint">문의: {venue.phone}</div>}
                    </div>

                    {/* Time slots */}
                    <div className="grid grid-cols-4 gap-1">
                      {HOURS.map((hour) => {
                        const entry = selDateStr ? getBooking(selDateStr, venue.name, hour) : null;
                        const past = isToday && hour < currentHour;
                        const isSelected = selectedHours.includes(hour);
                        const c = entry ? memberColor(entry.member) : null;
                        const isTrying = entry?.status === "trying";

                        return (
                          <button
                            key={hour}
                            onClick={() => { if (!past) slotClick(venue.name, hour); }}
                            disabled={past}
                            className={`rounded-lg py-1.5 px-0.5 text-center border-2 transition-all ${
                              past
                                ? "bg-card-soft border-line opacity-35 cursor-not-allowed"
                                : isSelected
                                ? "bg-accent-soft border-accent cursor-pointer ring-1 ring-accent/40"
                                : entry && c
                                ? isTrying
                                  ? `${c.bg} border-dashed border-amber-400/60 cursor-pointer hover:opacity-80`
                                  : `${c.bg} border-up/40 cursor-pointer hover:opacity-80`
                                : "bg-card border-line cursor-pointer hover:bg-card-soft"
                            }`}
                          >
                            <div className={`text-[10px] font-semibold mb-0.5 ${
                              isSelected ? "text-accent" : entry && c ? c.text : "text-ink-faint"
                            }`}>
                              {shortHour(hour)}
                            </div>
                            {entry && c ? (
                              <div className="flex flex-col items-center">
                                <div className={`text-[10px] font-bold ${c.text}`}>{entry.member}</div>
                                <div className={`text-[8px] font-semibold mt-0.5 px-1 rounded-full ${
                                  isTrying ? "bg-amber-400/15 text-amber-600" : "bg-up/15 text-up"
                                }`}>
                                  {isTrying ? "도전" : "확정"}
                                </div>
                              </div>
                            ) : isSelected ? (
                              <div className="text-[10px] text-accent font-bold">선택</div>
                            ) : (
                              <div className="text-[11px] text-ink-faint/50">—</div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Action bar when hours are selected */}
                    {selectedHours.length > 0 && (
                      <div className="mt-3 bg-card-soft rounded-xl p-3 border border-line">
                        <div className="text-xs font-semibold text-ink-mute mb-1">
                          {formatHour(Math.min(...selectedHours))} ~ {formatHour(Math.max(...selectedHours) + 1)} ({selectedHours.length}시간)
                        </div>
                        <input
                          type="text"
                          value={member}
                          onChange={(e) => setMember(e.target.value)}
                          placeholder="이름을 입력하세요"
                          className="w-full px-3 py-2.5 text-sm rounded-lg bg-card text-ink placeholder:text-ink-faint border border-line-strong outline-none focus:border-accent focus:ring-2 focus:ring-accent/40 mb-2"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedHours([])}
                            className="flex-1 py-2.5 rounded-lg border border-line bg-card text-xs font-semibold text-ink-mute hover:bg-card-soft"
                          >
                            취소
                          </button>
                          <button
                            onClick={() => doBook("trying")}
                            disabled={!member.trim()}
                            className={`flex-1 py-2.5 rounded-lg border-none text-xs font-bold ${
                              member.trim()
                                ? "bg-amber-500 text-white cursor-pointer hover:bg-amber-600"
                                : "bg-card-soft text-ink-faint cursor-not-allowed"
                            }`}
                          >
                            예약도전
                          </button>
                          <button
                            onClick={() => doBook("confirmed")}
                            disabled={!member.trim()}
                            className={`flex-1 py-2.5 rounded-lg border-none text-xs font-bold ${
                              member.trim()
                                ? "bg-up text-white cursor-pointer hover:opacity-90"
                                : "bg-card-soft text-ink-faint cursor-not-allowed"
                            }`}
                          >
                            예약확정
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : !sel && (
        <div className="px-5 py-10 text-center text-ink-faint text-sm">날짜를 선택하면 예약 현황이 나타납니다</div>
      )}

      {/* MONTHLY SUMMARY TABLE */}
      {monthlySummary.length > 0 && (
        <div className="bg-card mt-2 px-3.5 pt-3.5 pb-5">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck size={16} className="text-ink-mute" />
            <h3 className="text-[15px] font-bold text-ink tracking-tight">{month + 1}월 예약 현황</h3>
            <span className="text-xs text-ink-faint font-medium tabular-nums">{monthlySummary.length}건</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-line-strong">
                  <th className="text-left py-2 px-2 font-semibold text-ink-mute">날짜</th>
                  <th className="text-left py-2 px-2 font-semibold text-ink-mute">장소</th>
                  <th className="text-left py-2 px-2 font-semibold text-ink-mute">시간</th>
                  <th className="text-left py-2 px-2 font-semibold text-ink-mute">예약자</th>
                  <th className="text-center py-2 px-2 font-semibold text-ink-mute">상태</th>
                  <th className="text-right py-2 px-2 font-semibold text-ink-mute">금액</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummary.map((entry, i) => {
                  const c = memberColor(entry.member);
                  const dayNum = parseInt(entry.date.split("-")[2]);
                  return (
                    <tr key={i} className="border-b border-line hover:bg-card-soft">
                      <td className="py-2 px-2 font-medium text-ink-soft tabular-nums">
                        {dayNum}일({entry.day})
                      </td>
                      <td className="py-2 px-2">
                        <span className={`inline-flex items-center gap-1 ${VENUE_INFO.find(v => v.name === entry.venue)?.color.text || "text-ink-soft"}`}>
                          {entry.venue}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-ink-mute">
                        {formatHour(entry.hours[0])}~{formatHour(entry.hours[entry.hours.length - 1] + 1)}
                      </td>
                      <td className="py-2 px-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded ${c.bg} ${c.text} font-semibold`}>
                          {entry.member}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                          entry.status === "confirmed"
                            ? "bg-up/15 text-up"
                            : "bg-amber-400/15 text-amber-600"
                        }`}>
                          {entry.status === "confirmed" ? "확정" : "도전"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right font-medium text-ink-soft tabular-nums">
                        {entry.status === "confirmed" ? formatPrice(calcTotalPrice(entry.venue, entry.date, entry.hours)) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Total row for confirmed only */}
              {(() => {
                const confirmedTotal = monthlySummary
                  .filter(e => e.status === "confirmed")
                  .reduce((sum, e) => sum + calcTotalPrice(e.venue, e.date, e.hours), 0);
                return confirmedTotal > 0 ? (
                  <tfoot>
                    <tr className="border-t-2 border-line-strong">
                      <td colSpan={5} className="py-2.5 px-2 text-right font-bold text-ink-soft text-xs">합계</td>
                      <td className="py-2.5 px-2 text-right font-extrabold text-accent text-sm tabular-nums">{formatPrice(confirmedTotal)}</td>
                    </tr>
                  </tfoot>
                ) : null;
              })()}
            </table>
          </div>
        </div>
      )}

      <div className="h-20" />

      {/* CANCEL MODAL */}
      {confirm && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-[100] p-6 animate-fade-in" onClick={() => setConfirm(null)}>
          <div className="bg-card border border-line rounded-2xl shadow-xl px-5 py-6 w-full max-w-[320px] text-center animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2.5"><Trash2 size={32} className="text-down mx-auto" /></div>
            <h3 className="text-base font-bold text-ink tracking-tight mb-1.5">예약 취소</h3>
            <p className="text-sm text-ink-faint leading-relaxed mb-1">
              {confirm.member}님의
            </p>
            <p className="text-sm text-ink-mute font-semibold mb-1">
              <MapPin size={12} className="inline -mt-0.5" /> {confirm.venue}
            </p>
            <p className="text-sm text-ink-mute mb-1">
              {formatHour(Math.min(...confirm.hours))} ~ {formatHour(Math.max(...confirm.hours) + 1)}
            </p>
            <p className={`text-xs font-bold mb-4 ${confirm.status === "confirmed" ? "text-up" : "text-amber-600"}`}>
              ({confirm.status === "confirmed" ? "예약확정" : "예약도전"})
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-line bg-card-soft text-xs font-semibold text-ink-soft hover:bg-line">닫기</button>
              <button onClick={doCancel} className="flex-1 py-2.5 rounded-xl border-none bg-down text-white text-xs font-bold cursor-pointer hover:opacity-90">취소하기</button>
              {confirm.status === "trying" && (
                <button onClick={doConfirmBooking} className="flex-1 py-2.5 rounded-xl border-none bg-up text-white text-xs font-bold cursor-pointer hover:opacity-90">예약확정</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SHARE MODAL */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/45 flex items-end justify-center z-[100] animate-fade-in" onClick={() => setShareModal(null)}>
          <div className="bg-card border-t border-line rounded-t-2xl shadow-xl px-5 pt-6 pb-8 w-full max-w-md animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-8 h-1 rounded-full bg-line mx-auto mb-4" />
            {(sync.isPublished || sync.isSubscribed) ? (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-2.5 h-2.5 rounded-full ${sync.connectionStatus === 'connected' ? "bg-up" : "bg-amber-500"}`} />
                  <h3 className="text-[17px] font-extrabold text-ink tracking-tight">실시간 공유 {sync.connectionStatus === 'connected' ? '연결됨' : '연결 중...'}</h3>
                </div>
                <div className="bg-card-soft rounded-xl p-4 mb-4">
                  <div className="text-xs font-semibold text-ink-faint mb-1">PIN 코드</div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-extrabold text-ink tracking-widest tabular-nums">{sync.pinCode}</span>
                    <button onClick={() => { navigator.clipboard.writeText(sync.pinCode || ""); showToast("PIN 복사됨!", "success"); }} className="p-1.5 text-ink-faint hover:text-ink-mute"><Link2 size={16} /></button>
                  </div>
                  <p className="text-xs text-ink-faint mt-2">팀원에게 이 PIN을 공유하면 실시간으로 예약 현황을 함께 볼 수 있습니다.</p>
                </div>
                <button onClick={async () => { if (sync.isPublished) await sync.unpublish(); else sync.unsubscribe(); setShareModal(null); showToast("공유 연결이 해제되었습니다.", "info"); }}
                  className="w-full py-3 rounded-xl border border-down/30 bg-card text-sm font-semibold text-down hover:bg-down/10 flex items-center justify-center gap-2">
                  <LogOut size={16} /> 공유 해제
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-[17px] font-extrabold text-ink tracking-tight mb-1">실시간 공유</h3>
                <p className="text-sm text-ink-mute mb-5">팀원들과 코트 예약 현황을 실시간으로 공유합니다.</p>
                <div className="flex gap-1 bg-card-soft rounded-lg p-1 mb-4">
                  <button onClick={() => { setShareModal("publish"); setPinInput(""); }}
                    className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${shareModal === "publish" ? "bg-accent text-white" : "text-ink-mute"}`}>공유 시작</button>
                  <button onClick={() => { setShareModal("subscribe"); setPinInput(""); }}
                    className={`flex-1 py-2 rounded-md text-sm font-semibold transition-colors ${shareModal === "subscribe" ? "bg-accent text-white" : "text-ink-mute"}`}>참여하기</button>
                </div>
                {shareModal === "publish" ? (
                  <div>
                    <div className="text-xs font-semibold text-ink-mute mb-1.5">PIN 코드 설정 (4자리 숫자)</div>
                    <input type="text" inputMode="numeric" maxLength={4} value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="예: 1234"
                      className="w-full px-3.5 py-3 text-center text-2xl font-extrabold tracking-[0.3em] tabular-nums rounded-xl border-2 border-line-strong bg-card text-ink placeholder:text-ink-faint outline-none focus:border-accent focus:ring-2 focus:ring-accent/40" />
                    <button onClick={async () => { if (pinInput.length !== 4) { showToast("4자리 PIN을 입력하세요", "error"); return; } const r = await sync.publish(pinInput); if (r.success) showToast("공유가 시작되었습니다!", "success"); else showToast(r.error || "공유 실패", "error"); }}
                      disabled={pinInput.length !== 4 || sync.isSyncing}
                      className={`w-full mt-3 py-3 rounded-xl border-none text-sm font-bold ${pinInput.length === 4 ? "bg-accent text-white cursor-pointer hover:bg-accent-strong" : "bg-card-soft text-ink-faint cursor-not-allowed"}`}>
                      {sync.isSyncing ? "처리 중..." : "공유 시작하기"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-xs font-semibold text-ink-mute mb-1.5">공유 PIN 입력</div>
                    <input type="text" inputMode="numeric" maxLength={4} value={pinInput}
                      onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="PIN 코드 4자리"
                      className="w-full px-3.5 py-3 text-center text-2xl font-extrabold tracking-[0.3em] tabular-nums rounded-xl border-2 border-line-strong bg-card text-ink placeholder:text-ink-faint outline-none focus:border-accent focus:ring-2 focus:ring-accent/40" />
                    <button onClick={async () => { if (pinInput.length !== 4) { showToast("4자리 PIN을 입력하세요", "error"); return; } const r = await sync.subscribe(pinInput); if (r.success) showToast("참여 완료! 실시간 동기화 중", "success"); else showToast(r.error || "참여 실패", "error"); }}
                      disabled={pinInput.length !== 4}
                      className={`w-full mt-3 py-3 rounded-xl border-none text-sm font-bold ${pinInput.length === 4 ? "bg-up text-white cursor-pointer hover:opacity-90" : "bg-card-soft text-ink-faint cursor-not-allowed"}`}>참여하기</button>
                  </div>
                )}
                <button onClick={() => setShareModal(null)} className="w-full mt-2 py-3 rounded-xl border border-line bg-card-soft text-sm font-semibold text-ink-soft hover:bg-line">취소</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
