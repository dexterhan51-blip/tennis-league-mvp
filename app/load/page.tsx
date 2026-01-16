"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Save, Clock, Users, Trash2, CheckCircle, Gamepad2 } from "lucide-react";

type LeagueData = { name: string; endDate: string; createdAt: string; players: any[]; };

export default function LoadPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<(LeagueData | null)[]>([null, null, null]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    const loadedSlots = [
      localStorage.getItem("league-slot-1"),
      localStorage.getItem("league-slot-2"),
      localStorage.getItem("league-slot-3"),
    ].map(item => item ? JSON.parse(item) : null);
    setSlots(loadedSlots);
  }, []);

  const handleSelectSlot = (index: number) => {
    if (!slots[index]) return;
    setSelectedIdx(index === selectedIdx ? null : index);
  };

  const handleLoadGame = () => {
    if (selectedIdx === null) return alert("불러올 슬롯을 선택해주세요.");
    const data = slots[selectedIdx];
    if (!data) return alert("비어있는 슬롯입니다.");

    // ⭐ 핵심: 몇 번 슬롯인지 저장해둡니다!
    localStorage.setItem("current-slot-index", (selectedIdx + 1).toString());
    localStorage.setItem("current-league", JSON.stringify(data));
    
    router.push("/league");
  };

  const handleDelete = (e: React.MouseEvent, slotIndex: number) => {
    e.stopPropagation();
    if (confirm(`슬롯 ${slotIndex + 1}의 데이터를 삭제하시겠습니까?`)) {
      localStorage.removeItem(`league-slot-${slotIndex + 1}`);
      const newSlots = [...slots]; newSlots[slotIndex] = null; setSlots(newSlots);
      if (selectedIdx === slotIndex) setSelectedIdx(null);
    }
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-900 text-white pb-24">
      <header className="flex items-center gap-4 p-6 mb-2">
        <Link href="/" className="p-2 hover:bg-slate-800 rounded-full"><ChevronLeft size={24} /></Link>
        <h1 className="text-xl font-bold flex items-center gap-2"><Gamepad2 className="text-blue-400"/> 리그 불러오기</h1>
      </header>
      <div className="px-6 space-y-4">
        {slots.map((slot, index) => {
          const isSelected = selectedIdx === index;
          return (
            <div key={index} onClick={() => handleSelectSlot(index)} className={`relative p-5 rounded-2xl border-2 cursor-pointer ${isSelected ? 'bg-slate-800 border-blue-500' : 'bg-slate-900/50 border-slate-700'}`}>
              <div className="flex justify-between items-start mb-2"><span className={`text-xs font-bold px-2 py-1 rounded ${isSelected ? 'bg-blue-600' : 'bg-slate-700'}`}>SLOT {index + 1}</span>{isSelected && <CheckCircle className="text-blue-500"/>}</div>
              {slot ? (<><div className="flex items-center gap-3"><Save size={28}/><div><h2 className="text-lg font-bold">{slot.name}</h2><div className="text-xs text-slate-400">{new Date(slot.createdAt).toLocaleDateString()}</div></div></div><button onClick={(e) => handleDelete(e, index)} className="absolute bottom-4 right-4 p-2 text-slate-600 hover:text-red-500"><Trash2 size={16}/></button></>) : (<div className="text-center py-6 text-slate-600">데이터 없음</div>)}
            </div>
          );
        })}
      </div>
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 max-w-md mx-auto">
        <button onClick={handleLoadGame} disabled={selectedIdx === null} className={`w-full py-4 rounded-xl font-bold text-lg ${selectedIdx !== null ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>선택한 리그 불러오기</button>
      </div>
    </main>
  );
}