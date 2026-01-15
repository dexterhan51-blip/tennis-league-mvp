"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar, Users, CheckCircle, Circle, Trophy } from "lucide-react";
import { Player } from "@/types";

export default function NewLeaguePage() {
  const router = useRouter();

  // 상태 관리
  const [leagueName, setLeagueName] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allPlayers, setAllPlayers] = useState<Player[]>([]); // 전체 선수풀
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // 선택된 선수 ID들

  // 1. 저장된 선수 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("tennis-players");
    if (saved) {
      setAllPlayers(JSON.parse(saved));
    }
  }, []);

  // 선수 선택/해제 토글 함수
  const togglePlayer = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(pid => pid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // 리그 생성 완료 (저장 후 이동)
  const handleCreateLeague = () => {
    if (!leagueName.trim()) return alert("리그 이름을 입력해주세요!");
    if (selectedIds.length < 2) return alert("최소 2명 이상의 선수가 필요합니다.");

    // 선택된 선수 데이터만 추출
    const leaguePlayers = allPlayers.filter(p => selectedIds.includes(p.id));

    // 리그 정보 저장 (나중에 게임 화면에서 이걸 불러다 씁니다)
    const leagueData = {
      name: leagueName,
      endDate: endDate,
      players: leaguePlayers,
      createdAt: new Date().toISOString(),
    };
    
    localStorage.setItem("current-league", JSON.stringify(leagueData));
    
    // 게임 화면으로 이동!
    router.push("/league");
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-50 pb-24">
      
      {/* 헤더 */}
      <header className="bg-white p-4 sticky top-0 z-10 border-b border-slate-200 flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-slate-100 rounded-full">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">새 리그 만들기</h1>
      </header>

      <div className="p-6 space-y-8">
        
        {/* 1. 리그 이름 입력 */}
        <section>
          <label className="block text-sm font-bold text-slate-500 mb-2">리그 이름</label>
          <div className="relative">
            <Trophy className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input 
              type="text" 
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="예: 2026 상반기 수요테니스"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all font-bold text-slate-800"
            />
          </div>
        </section>

        {/* 2. 시즌 일정 (종료일) */}
        <section>
          <label className="block text-sm font-bold text-slate-500 mb-2">시즌 종료일 (옵션)</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium text-slate-700 bg-white"
            />
          </div>
        </section>

        {/* 3. 선수 선택 (선수풀) */}
        <section>
          <div className="flex justify-between items-end mb-3">
            <label className="text-sm font-bold text-slate-500">선수 풀 (터치하여 참가)</label>
            <span className="text-blue-600 font-bold text-sm bg-blue-50 px-2 py-1 rounded-lg">
                현재 {selectedIds.length}명
            </span>
          </div>
          
          {allPlayers.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-300">
                <p className="text-slate-400 mb-2">등록된 선수가 없습니다.</p>
                <Link href="/players" className="text-blue-600 font-bold text-sm underline">
                    선수 등록하러 가기
                </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {allPlayers.map((player) => {
                const isSelected = selectedIds.includes(player.id);
                return (
                  <div 
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                        isSelected 
                        ? 'border-blue-500 bg-blue-50/50 shadow-sm' 
                        : 'border-transparent bg-white hover:bg-slate-100'
                    }`}
                  >
                    {/* 체크 표시 아이콘 */}
                    {isSelected 
                        ? <CheckCircle className="text-blue-500 fill-blue-100" size={20} /> 
                        : <Circle className="text-slate-300" size={20} />
                    }
                    
                    <div className="flex items-center gap-2 overflow-hidden">
                        {/* 프로필 사진 */}
                        {player.photo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={player.photo} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${player.gender === 'MALE' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                                {player.name.slice(0,1)}
                            </div>
                        )}
                        <span className={`font-bold truncate ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>
                            {player.name}
                        </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 max-w-md mx-auto">
        <button 
            onClick={handleCreateLeague}
            className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-lg hover:bg-slate-900 active:scale-95 transition-all shadow-lg shadow-slate-200"
        >
            리그 생성 완료
        </button>
      </div>
    </main>
  );
}