'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart3, CalendarDays, User, Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TabItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  /** 이 탭에 속하는 경로 접두사 (없으면 href와 정확히 일치할 때만 활성) */
  matchPaths?: string[];
  adminOnly?: boolean;
}

// 회원 4탭(오늘·랭킹·경기·나) + 관리자 전용 「운영」.
// 대진·선수·회원 관리는 운영 허브(/admin) 안으로, 설정은 나(/me) 아래로 들어간다.
const tabs: TabItem[] = [
  { href: '/', icon: <Home className="w-[22px] h-[22px]" />, label: '오늘' },
  { href: '/rankings', icon: <BarChart3 className="w-[22px] h-[22px]" />, label: '랭킹', matchPaths: ['/rankings'] },
  { href: '/live', icon: <CalendarDays className="w-[22px] h-[22px]" />, label: '경기', matchPaths: ['/live', '/videos'] },
  { href: '/me', icon: <User className="w-[22px] h-[22px]" />, label: '나', matchPaths: ['/me', '/settings'] },
  {
    href: '/admin',
    icon: <Wrench className="w-[22px] h-[22px]" />,
    label: '운영',
    matchPaths: ['/admin', '/session', '/import', '/league', '/players'],
    adminOnly: true,
  },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const { isAdmin, isConfigured } = useAuth();
  // 서버 미설정(로컬 개발)에서는 로그인 자체가 없으므로 운영 탭도 열어 둔다
  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin || !isConfigured);

  const isActive = (tab: TabItem) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
    }
    return pathname === tab.href;
  };

  // 전체 화면 페이지와 로그인 화면에서는 숨긴다
  if (pathname === '/scoreboard' || pathname === '/referee' || pathname === '/login') {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-line"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="하단 내비게이션"
    >
      <div className="max-w-md mx-auto h-16 flex">
        {visibleTabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 transition-colors ${
                active ? 'text-ink' : 'text-ink-faint hover:text-ink-mute'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {tab.icon}
              <span className="text-[11px] font-bold">{tab.label}</span>
              <span className={`w-5 h-[3px] rounded-full ${active ? 'bg-accent' : 'bg-transparent'}`} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
