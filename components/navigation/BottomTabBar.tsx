'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Users, Settings } from 'lucide-react';

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
    href: '/players',
    icon: <Users className="w-6 h-6" />,
    label: '선수',
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

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 pb-safe"
      role="navigation"
      aria-label="하단 내비게이션"
    >
      <div className="max-w-md mx-auto h-16 flex items-center justify-around">
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`
                flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-colors touch-target
                ${active
                  ? 'text-blue-600'
                  : 'text-slate-400 hover:text-slate-600'
                }
              `}
              role="tab"
              aria-selected={active}
              aria-label={tab.label}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
