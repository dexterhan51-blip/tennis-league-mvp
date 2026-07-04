'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Users, Settings, Smartphone, Sparkles } from 'lucide-react';

interface TabItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  matchPaths?: string[];
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
    matchPaths: ['/league', '/league/new', '/load'],
  },
  {
    href: '/scoreboard',
    icon: <Smartphone className="w-6 h-6" />,
    label: '스코어',
  },
  {
    href: '/players',
    icon: <Users className="w-6 h-6" />,
    label: '선수',
  },
  {
    href: '/saju',
    icon: <Sparkles className="w-6 h-6" />,
    label: '궁합',
    matchPaths: ['/saju'],
  },
  {
    href: '/settings',
    icon: <Settings className="w-6 h-6" />,
    label: '설정',
  },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  const isActive = (tab: TabItem) => {
    if (tab.matchPaths) {
      return tab.matchPaths.some((path) => pathname.startsWith(path));
    }
    return pathname === tab.href;
  };

  // Hide tab bar on full-screen pages
  if (pathname === '/scoreboard' || pathname === '/referee') {
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
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-xl transition-colors touch-target
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
              <span className="text-xs font-medium whitespace-nowrap">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
