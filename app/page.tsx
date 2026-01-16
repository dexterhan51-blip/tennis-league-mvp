"use client";

import Link from "next/link";
import { Trophy, PlayCircle, FolderOpen, Users } from "lucide-react";

export default function Home() {
  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col justify-center p-6">
      
      {/* 1. 로고 영역: [ MY TENNIS ] */}
      <div className="text-center mb-12 space-y-2">
        <div className="inline-flex justify-center items-center w-20 h-20 bg-blue-600 rounded-3xl shadow-lg shadow-blue-200 mb-4 transform rotate-3">
            <Trophy size={40} className="text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">L40 Rank </h1>
        <p className="text-slate-500 font-medium">러브포티 테니스 리그 매니저</p>
      </div>

      {/* 2. 메뉴 버튼 영역 */}
      <nav className="space-y-4 w-full">
        
        {/* 버튼 1: [ + 새 리그 만들기 ] (가장 강조) */}
        <Link href="/league/new" className="group block w-full">
            <div className="bg-blue-600 hover:bg-blue-700 text-white p-5 rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <PlayCircle size={24} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-lg">+ 새 리그 만들기</div>
                        <div className="text-blue-100 text-xs font-medium">새로운 매치 생성 및 시작</div>
                    </div>
                </div>
            </div>
        </Link>

        {/* 버튼 2: [ > 불러오기 ] */}
        <Link href="/Load" className="block w-full">
            <div className="bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 p-5 rounded-2xl transition-all active:scale-95 flex items-center gap-4">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                    <FolderOpen size={24} />
                </div>
                <div className="font-bold text-lg">불러오기</div>
            </div>
        </Link>

        {/* 버튼 3: [ & 선수 관리 ] */}
        <Link href="/players" className="block w-full">
            <div className="bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 p-5 rounded-2xl transition-all active:scale-95 flex items-center gap-4">
                <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                    <Users size={24} />
                </div>
                <div className="font-bold text-lg">선수 관리</div>
            </div>
        </Link>

      </nav>

      <footer className="mt-12 text-center text-xs text-slate-400 font-medium">
        v1.0.0 L40 by 한PD
      </footer>
    </main>
  );
}