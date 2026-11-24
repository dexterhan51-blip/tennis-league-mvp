'use client';

import Link from 'next/link';
import {
  CalendarDays,
  ChevronRight,
  FileUp,
  FolderOpen,
  Smartphone,
  Trophy,
  Users,
  Video,
  Handshake,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AdminLink {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}

const GROUPS: { title: string; links: AdminLink[] }[] = [
  {
    title: '모임',
    links: [
      { href: '/schedule', icon: <CalendarDays className="w-5 h-5" />, label: '다음 모임 일정', hint: '날짜 · 시간 · 장소를 적으면 첫 화면에 보입니다' },
    ],
  },
  {
    title: '기록',
    links: [
      { href: '/import', icon: <FileUp className="w-5 h-5" />, label: '편집 파일로 기록 올리기', hint: '파이널컷 편집본에서 포인트·득점·에러 기록 가져오기' },
      { href: '/videos', icon: <Video className="w-5 h-5" />, label: '경기 영상 연결', hint: '유튜브 영상을 경기에 연결' },
      { href: '/scoreboard', icon: <Smartphone className="w-5 h-5" />, label: '스코어보드', hint: '코트 옆에 세워 두는 전체 화면 점수판' },
    ],
  },
  {
    title: '사람',
    links: [
      { href: '/players', icon: <Users className="w-5 h-5" />, label: '회원 관리', hint: '회원 추가 · 이름 · 사진' },
      { href: '/rankings', icon: <Handshake className="w-5 h-5" />, label: '게스트를 회원으로 전환', hint: '랭킹 화면의 관리 모드' },
    ],
  },
  {
    title: '시즌 (리그를 따로 돌릴 때)',
    links: [
      { href: '/league/new', icon: <Trophy className="w-5 h-5" />, label: '새 시즌 시작', hint: '참가 회원을 골라 시즌을 연다' },
      { href: '/league', icon: <Trophy className="w-5 h-5" />, label: '진행 중 시즌', hint: '시즌 대진 · 점수 입력 · 시즌 종료' },
      { href: '/rankings', icon: <FolderOpen className="w-5 h-5" />, label: '지난 시즌', hint: '랭킹 화면 아래의 지난 시즌 목록' },
    ],
  },
];

// 운영 허브 (관리자 전용): 흩어져 있던 관리 화면의 입구를 한곳에 모은다.
// 실제 쓰기 권한은 서버(/api/league)가 운영진 코드로 막고 있고, 이 화면의 차단은 안내 목적이다.
export default function AdminHubPage() {
  const { isAdmin, isConfigured } = useAuth();

  if (isConfigured && !isAdmin) {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-surface px-5 pt-6 pb-24">
        <h1 className="text-[22px] font-extrabold tracking-tight text-ink">운영</h1>
        <p className="mt-2 text-sm text-ink-mute">운영진 전용 화면입니다. 운영진 코드를 입력하면 열립니다.</p>
        <Link href="/login" className="mt-5 flex items-center justify-center h-12 rounded-[14px] bg-accent text-accent-ink text-sm font-extrabold">
          운영진 코드 입력
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface px-5 pt-6 pb-24">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">운영</h1>

      <Link
        href="/session"
        className="mt-4 flex items-center justify-between rounded-[14px] bg-accent text-accent-ink px-4 py-3.5 active:scale-[0.99] transition-transform"
      >
        <span>
          <b className="block text-[17px] font-extrabold tracking-tight">그날 모임 기록하기</b>
          <span className="block mt-0.5 text-xs font-bold opacity-75">온 사람 → 대진표 → 점수. 시즌 없이 개인 기록에 쌓입니다</span>
        </span>
        <ChevronRight className="w-5 h-5" />
      </Link>

      {GROUPS.map((group) => (
        <section key={group.title} className="mt-6">
          <h2 className="text-[11px] font-extrabold tracking-[0.08em] text-ink-mute">{group.title}</h2>
          <div className="mt-1">
            {group.links.map((link) => (
              <Link key={link.label} href={link.href} className="flex items-center gap-3 h-[58px] border-b border-line">
                <span className="text-ink-mute">{link.icon}</span>
                <span className="flex-1 min-w-0">
                  <b className="block text-sm font-bold text-ink">{link.label}</b>
                  <span className="block text-xs text-ink-mute truncate">{link.hint}</span>
                </span>
                <ChevronRight className="w-4 h-4 text-ink-faint" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
