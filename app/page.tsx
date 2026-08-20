"use client";

import Link from "next/link";
import { PlayCircle, FolderOpen, Users, Smartphone, CalendarDays } from "lucide-react";
import AppLogo from "@/components/ui/AppLogo";
import MemberHome from "@/components/home/MemberHome";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { isAdmin, isConfigured, session } = useAuth();

  // 일반 회원은 서버 데이터 기반 홈 (리그 생성 등 관리 기능은 관리자 전용)
  if (isConfigured && session && !isAdmin) {
    return <MemberHome />;
  }

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface flex flex-col justify-center p-6">

      {/* 1. 로고 영역 */}
      <div className="text-center mb-12 space-y-2">
        <div className="inline-flex justify-center items-center mb-4">
            <AppLogo size={112} />
        </div>
        <h1 className="text-3xl font-extrabold text-ink tracking-tight">러브포티 테니스</h1>
        <p className="text-ink-mute font-medium">러브포티 테니스 리그 매니저</p>
      </div>

      {/* 2. 메뉴 버튼 영역 */}
      <nav className="space-y-4 w-full">
        
        {/* 버튼 1: [ + 새 리그 만들기 ] (가장 강조) */}
        <Link href="/league/new" className="group block w-full">
            <div className="bg-accent hover:bg-accent-strong text-white p-5 rounded-2xl transition-all active:scale-95 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <PlayCircle size={24} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-lg">+ 새 리그 만들기</div>
                        <div className="text-white/80 text-xs font-medium">새로운 매치 생성 및 시작</div>
                    </div>
                </div>
            </div>
        </Link>

        {/* 버튼 2: [ > 불러오기 ] */}
        <Link href="/load" className="block w-full">
            <div className="bg-card hover:bg-card-soft border border-line text-ink-soft p-5 rounded-2xl transition-all active:scale-95 flex items-center gap-4">
                <div className="bg-card-soft p-2 rounded-lg text-ink-mute">
                    <FolderOpen size={24} />
                </div>
                <div className="font-bold text-lg">불러오기</div>
            </div>
        </Link>

        {/* 버튼 3: [ & 선수 관리 ] */}
        <Link href="/players" className="block w-full">
            <div className="bg-card hover:bg-card-soft border border-line text-ink-soft p-5 rounded-2xl transition-all active:scale-95 flex items-center gap-4">
                <div className="bg-card-soft p-2 rounded-lg text-ink-mute">
                    <Users size={24} />
                </div>
                <div className="font-bold text-lg">선수 관리</div>
            </div>
        </Link>

        {/* 버튼 4: [ 스코어보드 ] */}
        <Link href="/scoreboard" className="block w-full">
            <div className="bg-card hover:bg-card-soft border border-line text-ink-soft p-5 rounded-2xl transition-all active:scale-95 flex items-center gap-4">
                <div className="bg-card-soft p-2 rounded-lg text-ink-mute">
                    <Smartphone size={24} />
                </div>
                <div className="font-bold text-lg">스코어보드</div>
            </div>
        </Link>

        {/* 버튼 5: [ 코트예약 도우미 ] */}
        <Link href="/booking" className="block w-full">
            <div className="bg-card hover:bg-card-soft border border-line text-ink-soft p-5 rounded-2xl transition-all active:scale-95 flex items-center gap-4">
                <div className="bg-card-soft p-2 rounded-lg text-ink-mute">
                    <CalendarDays size={24} />
                </div>
                <div className="text-left">
                    <div className="font-bold text-lg">코트예약 도우미</div>
                    <div className="text-ink-faint text-xs font-medium">팀원과 코트 예약 현황 공유</div>
                </div>
            </div>
        </Link>

      </nav>

      <footer className="mt-12 text-center text-xs text-ink-faint font-medium">
        v2.0 러브포티 테니스 리그 매니저
      </footer>
    </main>
  );
}