"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Calendar, Users, CheckCircle, Circle, Trophy, Save } from "lucide-react";
import { Player } from "@/types";

export default function NewLeaguePage() {
  const router = useRouter();

  // 상태 관리
  const [leagueName, setLeagueName] = useState("");
  const [endDate, setEndDate] = useState("");
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // 저장 슬롯 선택 (기본 1번)
  const [targetSlot, setTargetSlot] = useState<number>(1);
  const [existingSlots, setExistingSlots] = useState<boolean[]>([false, false, false]);

  useEffect(() => {
    // 선수 불러오기
    const savedPlayers = localStorage.getItem("tennis-players");
    if (savedPlayers) setAllPlayers(JSON.parse(savedPlayers));

    // 이미 사용 중인 슬롯 확인
    setExistingSlots([
        !!localStorage.getItem("league-slot-1"),
        !!localStorage.getItem("league-slot-2"),
        !!localStorage.getItem("league-slot-3"),
    ]);
  }, []);

  const togglePlayer = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(pid => pid !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleCreateLeague = () => {
    if (!leagueName.trim()) return alert("리그 이름을 입력해주세요!");
    if (selectedIds.length < 2) return alert("최소 2명 이상의 선수가 필요합니다.");

    if (existingSlots[targetSlot - 1]) {
        if (!confirm(`슬롯 ${targetSlot}에 이미 데이터가 있습니다. 덮어쓰시겠습니까?`)) return;
    }

    const leaguePlayers = allPlayers.filter(p => selectedIds.includes(p.id));

    const leagueData = {
      name: leagueName,
      endDate: endDate,
      players: leaguePlayers,
      createdAt: new Date().toISOString(),
    };
    
    // 1. 선택한 슬롯에 영구 저장 (패미콤 세이브)
    localStorage.setItem(`league-slot-${targetSlot}`, JSON.stringify(leagueData));

    // 2. 현재 실행할 게임으로 설정 (RAM 로드)
    localStorage.setItem("current-league", JSON.stringify(leagueData));
    
    router.push("/league");
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-50 pb-32">
      <header className="bg-white p-4 sticky top-0 z-10 border-b border-slate-200 flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-slate-100 rounded-full">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">새 리그 설정</h1>
      </header>

      <div className="p-6 space-y-8">
        {/* 1. 리그 이름 */}
        <section>
          <label className="block text-sm font-bold text-slate-500 mb-2">리그 이름</label>
          <div className="relative">
            <Trophy className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input 
              type="text" 
              value={leagueName}
              onChange={(e) => setLeagueName(e.target.value)}
              placeholder="예: 2026 수요테니스"
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-bold text-slate-800"
            />
          </div>
        </section>

        {/* 2. 저장 슬롯 선택 (패미콤 스타일) */}
        <section>
            <label className="block text-sm font-bold text-slate-500 mb-2">저장할 슬롯 선택</label>
            <div className="flex gap-2">
                {[1, 2, 3].map((num) => (
                    <button
                        key={num}
                        onClick={() => setTargetSlot(num)}
                        className={`flex-1 py-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${
                            targetSlot === num 
                            ? 'border-blue-600 bg-blue-50 text-blue-700' 
                            : 'border-slate-200 bg-white text-slate-400'
                        }`}
                    >
                        <span className="font-bold text-lg">SLOT {num}</span>
                        <span className="text-xs">
                            {existingSlots[num-1] ? '(데이터 있음)' : '(비어 있음)'}
                        </span>
                    </button>
                ))}
            </div>
        </section>

        {/* 3. 시즌 일정 */}
        <section>
          <label className="block text-sm font-bold text-slate-500 mb-2">시즌 종료일 (옵션)</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 outline-none font-medium"
            />
          </div>
        </section>

        {/* 4. 선수 선택 */}
        <section>
          <div className="flex justify-between items-end mb-3">
            <label className="text-sm font-bold text-slate-500">선수 풀 (터치하여 참가)</label>
            <span className="text-blue-600 font-bold text-sm bg-blue-50 px-2 py-1 rounded-lg">
                현재 {selectedIds.length}명
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
              {allPlayers.map((player) => {
                const isSelected = selectedIds.includes(player.id);
                return (
                  <div 
                    key={player.id}
                    onClick={() => togglePlayer(player.id)}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-3 ${
                        isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-transparent bg-white'
                    }`}
                  >
                    {isSelected ? <CheckCircle className="text-blue-500" size={20} /> : <Circle className="text-slate-300" size={20} />}
                    <span className={`font-bold truncate ${isSelected ? 'text-blue-700' : 'text-slate-600'}`}>{player.name}</span>
                  </div>
                );
              })}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 max-w-md mx-auto">
        <button 
            onClick={handleCreateLeague}
            className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2"
        >
            <Save size={20} />
            리그 생성 및 저장
        </button>
      </div>
    </main>
  );
}