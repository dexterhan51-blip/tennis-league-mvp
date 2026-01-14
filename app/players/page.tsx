"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, UserPlus, Trash2, User } from "lucide-react";
import { Player, Gender } from "@/types";
import { v4 as uuidv4 } from "uuid";

export default function PlayersPage() {
  // 선수 목록 상태
  const [players, setPlayers] = useState<Player[]>([]);
  
  // 입력 폼 상태
  const [name, setName] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");

  // 1. 처음 켜졌을 때 저장된 데이터 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("tennis-players");
    if (saved) {
      setPlayers(JSON.parse(saved));
    }
  }, []);

  // 2. 선수가 바뀔 때마다 자동 저장
  useEffect(() => {
    localStorage.setItem("tennis-players", JSON.stringify(players));
  }, [players]);

  // 선수 추가 함수
  const handleAdd = () => {
    if (!name.trim()) return alert("이름을 입력해주세요.");
    
    const newPlayer: Player = {
      id: uuidv4(),
      name: name.trim(),
      gender: gender,
    };

    setPlayers([...players, newPlayer]);
    setName(""); // 입력창 초기화
  };

  // 선수 삭제 함수
  const handleDelete = (id: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      setPlayers(players.filter(p => p.id !== id));
    }
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-50 p-6">
      {/* 헤더 */}
      <header className="flex items-center gap-4 mb-8">
        <Link href="/" className="p-2 hover:bg-slate-200 rounded-full transition-colors bg-white shadow-sm">
          <ChevronLeft size={24} />
        </Link>
        <h1 className="text-xl font-bold text-slate-800">선수 관리</h1>
      </header>

      {/* 1. 선수 등록 폼 */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
        <h2 className="text-sm font-bold text-slate-500 mb-4 uppercase tracking-wider">새 멤버 등록</h2>
        <div className="flex gap-2 mb-3">
            <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력 (예: 한성종)"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all font-medium"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button 
                onClick={handleAdd}
                className="bg-slate-800 text-white px-5 rounded-xl font-bold hover:bg-slate-900 transition-colors"
            >
                추가
            </button>
        </div>
        
        {/* 성별 선택 */}
        <div className="flex gap-2">
            <button 
                onClick={() => setGender("MALE")}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${gender === 'MALE' ? 'border-blue-500 text-blue-600 bg-blue-50' : 'border-slate-100 text-slate-400 bg-slate-50'}`}
            >
                남자
            </button>
            <button 
                onClick={() => setGender("FEMALE")}
                className={`flex-1 py-2 rounded-lg text-sm font-bold border-2 transition-all ${gender === 'FEMALE' ? 'border-pink-500 text-pink-600 bg-pink-50' : 'border-slate-100 text-slate-400 bg-slate-50'}`}
            >
                여자
            </button>
        </div>
      </div>

      {/* 2. 선수 목록 리스트 */}
      <div className="space-y-3">
        <div className="flex justify-between items-end px-1">
            <h2 className="text-lg font-bold text-slate-800">등록된 선수 <span className="text-blue-600">{players.length}</span>명</h2>
        </div>

        {players.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-white rounded-2xl border border-slate-100 border-dashed">
                <UserPlus size={48} className="mx-auto mb-2 opacity-20" />
                <p>아직 등록된 선수가 없습니다.</p>
            </div>
        ) : (
            players.map((player) => (
                <div key={player.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${player.gender === 'MALE' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>
                            <User size={20} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800">{player.name}</div>
                            <div className="text-xs text-slate-400 font-medium">{player.gender === 'MALE' ? '남성' : '여성'}</div>
                        </div>
                    </div>
                    <button 
                        onClick={() => handleDelete(player.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            ))
        )}
      </div>
    </main>
  );
}