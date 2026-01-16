"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save, Clock, Users, Trash2, CheckCircle, Gamepad2 } from "lucide-react";

type LeagueData = {
  name: string;
  endDate: string;
  createdAt: string;
  players: any[];
};

export default function LoadPage() {
  const router = useRouter();
  
  // 슬롯 데이터 상태
  const [slots, setSlots] = useState<(LeagueData | null)[]>([null, null, null]);
  
  // ⭐ 선택된 슬롯 번호 (0, 1, 2) - 처음엔 선택 안 됨(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  // 1. 저장된 슬롯 데이터 불러오기
  useEffect(() => {
    const loadedSlots = [
      localStorage.getItem("league-slot-1"),
      localStorage.getItem("league-slot-2"),
      localStorage.getItem("league-slot-3"),
    ].map(item => item ? JSON.parse(item) : null);
    
    setSlots(loadedSlots);
  }, []);

  // 2. 슬롯 선택 함수
  const handleSelectSlot = (index: number) => {
    // 비어있는 슬롯은 선택 불가 (또는 선택해도 의미 없음)
    if (!slots[index]) return;
    
    if (selectedIdx === index) {
      setSelectedIdx(null); // 이미 선택된 거 누르면 해제
    } else {
      setSelectedIdx(index); // 선택
    }
  };

  // 3. 불러오기 (게임 시작)
  const handleLoadGame = () => {
    if (selectedIdx === null) return alert("불러올 슬롯을 선택해주세요.");
    
    const data = slots[selectedIdx];
    if (!data) return alert("비어있는 슬롯입니다.");

    // 현재 실행할 리그로 설정 (RAM에 로드)
    localStorage.setItem("current-league", JSON.stringify(data));
    
    // 리그 화면으로 이동
    router.push("/league");
  };

  // 4. 슬롯 삭제
  const handleDelete = (e: React.MouseEvent, slotIndex: number) => {
    e.stopPropagation(); // 부모 클릭 방지
    if (confirm(`슬롯 ${slotIndex + 1}의 데이터를 삭제하시겠습니까?`)) {
      localStorage.removeItem(`league-slot-${slotIndex + 1}`);
      
      const newSlots = [...slots];
      newSlots[slotIndex] = null;
      setSlots(newSlots);
      
      // 만약 선택된 걸 지웠으면 선택 해제
      if (selectedIdx === slotIndex) setSelectedIdx(null);
    }
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-900 text-white pb-24">
      <header className="flex items-center gap-4 p-6 mb-2">
        <Link href="/" className="p-2 hover:bg-slate-800 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
            <Gamepad2 className="text-blue-400"/>
            리그 불러오기
        </h1>
      </header>

      <div className="px-6 space-y-4">
        <p className="text-slate-400 text-sm mb-4">이어할 슬롯을 선택해주세요.</p>

        {slots.map((slot, index) => {
          const isSelected = selectedIdx === index;
          const isEmpty = !slot;

          return (
            <div 
              key={index}
              onClick={() => handleSelectSlot(index)}
              className={`
                relative p-5 rounded-2xl border-2 transition-all cursor-pointer group
                ${isSelected 
                  ? 'bg-slate-800 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] scale-[1.02]' 
                  : isEmpty 
                    ? 'bg-slate-900/50 border-slate-700 border-dashed opacity-70 hover:opacity-100 hover:border-slate-600'
                    : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-500'
                }
              `}
            >
              {/* 슬롯 번호 & 선택 표시 */}
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs font-bold px-2 py-1 rounded ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>
                    SLOT {index + 1}
                </span>
                {isSelected && <CheckCircle className="text-blue-500 animate-pulse" size={24} />}
              </div>

              {slot ? (
                // 데이터가 있을 때
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <Save className={isSelected ? "text-blue-400" : "text-slate-500"} size={28} />
                    <div>
                        <h2 className="text-lg font-bold text-white leading-tight">{slot.name}</h2>
                        <div className="text-xs text-slate-400 mt-1">
                            {new Date(slot.createdAt).toLocaleDateString()} 저장됨
                        </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 text-xs text-slate-300 bg-slate-900/50 p-2 rounded-lg">
                      <div className="flex items-center gap-1">
                          <Users size={12} /> 
                          <span>{slot.players.length}명 참가</span>
                      </div>
                      {slot.endDate && (
                        <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
                            <Clock size={12} /> 
                            <span>~{slot.endDate} 종료</span>
                        </div>
                      )}
                  </div>
                  
                  {/* 삭제 버튼 (우측 하단) */}
                  <button 
                      onClick={(e) => handleDelete(e, index)}
                      className="absolute bottom-4 right-4 p-2 text-slate-600 hover:text-red-500 hover:bg-slate-900 rounded-full transition-colors z-10"
                  >
                      <Trash2 size={16} />
                  </button>
                </>
              ) : (
                // 비어있을 때
                <div className="flex flex-col items-center justify-center py-6 text-slate-600 gap-2">
                  <span className="text-sm font-medium">데이터 없음</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 고정 버튼 (Load) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 max-w-md mx-auto">
        <button 
            onClick={handleLoadGame}
            disabled={selectedIdx === null}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg
                ${selectedIdx !== null
                    ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-blue-900/20 active:scale-95' 
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }
            `}
        >
            {selectedIdx !== null ? '선택한 리그 불러오기' : '슬롯을 선택해주세요'}
        </button>
      </div>
    </main>
  );
}