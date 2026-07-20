'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Users, Settings, Smartphone, Radio, Video, Medal } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface TabItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  matchPaths?: string[];
  adminOnly?: boolean;
}

const tabs: TabItem[] = [
  {
    href: '/',
    icon: <Home className="w-6 h-6" />,
    label: '홈',
  },
  {
    href: '/league',
    icon: <Trophy className="w-6 h-6" />,
    label: '리그',
    matchPaths: ['/league', '/league/new'],
    adminOnly: true, // 회원의 리그 열람은 홈/라이브에서 서버 데이터로 제공
  },
  {
    href: '/live',
    icon: <Radio className="w-6 h-6" />,
    label: '라이브',
  },
  {
    href: '/videos',
    icon: <Video className="w-6 h-6" />,
    label: '영상',
  },
  {
    href: '/rankings',
    icon: <Medal className="w-6 h-6" />,
    label: '랭킹',
  },
  {
    href: '/scoreboard',
    icon: <Smartphone className="w-6 h-6" />,
    label: '스코어',
    adminOnly: true,
  },
  {
    href: '/players',
    icon: <Users className="w-6 h-6" />,
    label: '선수',
    adminOnly: true,
  },
  {
    href: '/settings',
    icon: <Settings className="w-6 h-6" />,
    label: '설정',
  },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  const { isAdmin } = useAuth();
  const visibleTabs = tabs.filter((tab) => !tab.adminOnly || isAdmin);

  const isActive = (tab: TabItem) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some((path) => pathname.startsWith(path));
    }
    return pathname === tab.href;
  };

  // Hide tab bar on full-screen pages and the login screen
  if (pathname === '/scoreboard' || pathname === '/referee' || pathname === '/login') {
    return null;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 px-4 pointer-events-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      role="navigation"
      aria-label="하단 내비게이션"
    >
      <div className="max-w-md mx-auto h-14 flex items-center justify-around bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] pointer-events-auto">
        {visibleTabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-xl transition-colors touch-target
                ${active
                  ? 'text-clay-600'
                  : 'text-slate-400 hover:text-slate-600'
                }
              `}
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
            >
              {tab.icon}
              <span className="text-[10px] font-medium whitespace-nowrap">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
