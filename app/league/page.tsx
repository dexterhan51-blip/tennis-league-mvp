"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Player, Match } from '@/types';
import { 
    generateMixedDoubles, generateDoubles, generateSingles, 
    calculateRanking, GUEST_M_ID, GUEST_F_ID 
} from '@/utils/tennisLogic';
import { ChevronLeft, Trophy, Trash2, PlusCircle, XCircle, CheckCircle, Circle, UserPlus, Shield } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function LeaguePage() {
  const router = useRouter();
  
  // 상태 관리
  const [leagueName, setLeagueName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  // 게임 등록 화면 상태
  const [isMatchViewOpen, setIsMatchViewOpen] = useState(false);
  const [selectedForMatch, setSelectedForMatch] = useState<string[]>([]); // 게임에 참가할 선수 ID들

  // 게스트 데이터 (고정)
  const guestMale: Player = { id: GUEST_M_ID, name: '게스트(남)', gender: 'MALE' };
  const guestFemale: Player = { id: GUEST_F_ID, name: '게스트(여)', gender: 'FEMALE' };

  // 1. 데이터 불러오기
  useEffect(() => {
    const savedLeague = localStorage.getItem("current-league");
    if (!savedLeague) {
        alert("선택된 리그가 없습니다.");
        router.push("/");
        return;
    }
    const data = JSON.parse(savedLeague);
    setLeagueName(data.name);
    setPlayers(data.players || []);
  }, [router]);

  // 2. 랭킹 계산 (실시간)
  const rankings = useMemo(() => calculateRanking(players, matches), [players, matches]);

  // 선수 선택 토글 (게임 등록용)
  const toggleMatchPlayer = (id: string) => {
    if (selectedForMatch.includes(id)) {
        setSelectedForMatch(selectedForMatch.filter(pid => pid !== id));
    } else {
        setSelectedForMatch([...selectedForMatch, id]);
    }
  };

  // 3. 매치 생성 핸들러
  const handleCreateMatch = (type: 'MIXED' | 'DOUBLES' | 'SINGLES' | 'MANUAL') => {
    // 선택된 선수 객체 찾기 (게스트 포함)
    const pool = [guestMale, guestFemale, ...players].filter(p => selectedForMatch.includes(p.id));

    try {
        let newMatches: Match[] = [];
        
        if (type === 'MIXED') newMatches = generateMixedDoubles(pool);
        else if (type === 'DOUBLES') newMatches = generateDoubles(pool);
        else if (type === 'SINGLES') newMatches = generateSingles(pool);
        else if (type === 'MANUAL') {
            // 수동은 빈 매치 하나 생성
            newMatches = [{
                id: uuidv4(),
                teamA: { id: uuidv4(), man: pool[0] || guestMale, woman: pool[1] || guestFemale },
                teamB: { id: uuidv4(), man: pool[2] || guestMale, woman: pool[3] || guestFemale },
                scoreA: 0, scoreB: 0, isFinished: false
            }];
        }

        if (newMatches.length === 0) return alert("매칭 가능한 조합이 없습니다. 인원을 확인해주세요.");

        // 기존 매치 리스트에 추가 (위로 쌓임)
        setMatches([...newMatches, ...matches]);
        setIsMatchViewOpen(false); // 닫기
        setSelectedForMatch([]); // 선택 초기화

    } catch (e: any) {
        alert(e.message);
    }
  };

  // 4. 점수 입력
  const updateScore = (matchId: string, scoreA: number, scoreB: number) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, scoreA, scoreB, isFinished: true } : m));
  };

  // 5. 리그 삭제
  const handleDeleteLeague = () => {
    if (confirm(`'${leagueName}' 리그를 정말 삭제(종료)하시겠습니까?`)) {
        localStorage.removeItem("current-league");
        router.push("/");
    }
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-white pb-20">
      <header className="p-4 flex items-center gap-2 sticky top-0 bg-white z-10 border-b border-slate-100">
        <Link href="/" className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <ChevronLeft size={24} />
        </Link>
        <span className="font-bold text-slate-500">메인으로</span>
      </header>

      <div className="px-6 space-y-8 pt-4">
        
        {/* 리그 이름 */}
        <div className="text-center">
            <h1 className="text-2xl font-black text-slate-800 flex justify-center items-center gap-2">
                <span className="text-blue-600">-</span> {leagueName} <span className="text-blue-600">-</span>
            </h1>
        </div>

        {/* 랭킹 표 */}
        <section>
            <h2 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
                <Trophy size={16} /> 실시간 랭킹
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                            <th className="p-3 text-center">순위</th>
                            <th className="p-3">이름</th>
                            <th className="p-3 text-center">승/패</th>
                            <th className="p-3 text-right">점수</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rankings.map((r, idx) => (
                            <tr key={r.playerId} className="bg-white">
                                <td className="p-3 text-center font-bold text-slate-600">{idx + 1}</td>
                                <td className="p-3 font-bold text-slate-800">
                                    {r.name}
                                    {r.dailyBonus && <span className="text-xs text-amber-500 ml-1">👑</span>}
                                </td>
                                <td className="p-3 text-center text-slate-500">{r.wins}승 {r.losses}패</td>
                                <td className="p-3 text-right font-bold text-blue-600">{r.avgPoints.toFixed(1)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>

        {/* 게임 등록 섹션 */}
        <section>
            <button 
                onClick={() => setIsMatchViewOpen(!isMatchViewOpen)}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-md ${
                    isMatchViewOpen ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
            >
                {isMatchViewOpen ? <XCircle size={20}/> : <PlusCircle size={20}/>}
                {isMatchViewOpen ? '닫기' : '게임 등록'}
            </button>

            {/* --- 게임 등록 패널 (열림) --- */}
            {isMatchViewOpen && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 animate-fade-in-down">
                    <div className="text-center font-bold text-slate-700 mb-4 border-b border-slate-200 pb-2">
                        - 게임 등록 -
                    </div>

                    {/* 1. 선수 선택 (게스트 포함) */}
                    <div className="mb-6">
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-xs font-bold text-slate-500">참가 선수 선택 (터치)</label>
                            <span className="text-blue-600 font-bold text-xs">{selectedForMatch.length}명 선택됨</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {/* 게스트 버튼 */}
                            {[guestMale, guestFemale].map(guest => (
                                <div key={guest.id} onClick={() => toggleMatchPlayer(guest.id)}
                                    className={`p-2 rounded-lg border cursor-pointer text-center text-xs font-bold transition-all ${selectedForMatch.includes(guest.id) ? 'bg-amber-100 border-amber-500 text-amber-700' : 'bg-white border-slate-200 text-slate-400'}`}
                                >
                                    <Shield size={16} className="mx-auto mb-1 opacity-50"/>
                                    {guest.name}
                                </div>
                            ))}
                            {/* 실제 선수들 */}
                            {players.map(p => (
                                <div key={p.id} onClick={() => toggleMatchPlayer(p.id)}
                                    className={`p-2 rounded-lg border cursor-pointer text-center text-xs font-bold transition-all ${selectedForMatch.includes(p.id) ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                                >
                                    {selectedForMatch.includes(p.id) ? <CheckCircle size={16} className="mx-auto mb-1"/> : <Circle size={16} className="mx-auto mb-1 text-slate-300"/>}
                                    {p.name}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 2. 대진표 생성 버튼들 */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => handleCreateMatch('MIXED')} className="bg-white border-2 border-blue-100 hover:bg-blue-50 hover:border-blue-300 text-blue-700 py-3 rounded-xl font-bold text-sm transition-all shadow-sm">
                                👩‍❤️‍👨 혼복 랜덤
                            </button>
                            <button onClick={() => handleCreateMatch('DOUBLES')} className="bg-white border-2 border-blue-100 hover:bg-blue-50 hover:border-blue-300 text-blue-700 py-3 rounded-xl font-bold text-sm transition-all shadow-sm">
                                👥 복식 랜덤
                            </button>
                            <button onClick={() => handleCreateMatch('SINGLES')} className="bg-white border-2 border-blue-100 hover:bg-blue-50 hover:border-blue-300 text-blue-700 py-3 rounded-xl font-bold text-sm transition-all shadow-sm">
                                👤 단식 랜덤
                            </button>
                        </div>
                        <button onClick={() => handleCreateMatch('MANUAL')} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 py-3 rounded-xl font-bold text-sm transition-all">
                            ✍️ 대진표 수동 등록
                        </button>
                    </div>
                </div>
            )}
        </section>

        {/* 생성된 매치 리스트 */}
        <section className="space-y-4">
             {matches.map((m, idx) => (
                <div key={m.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 bg-slate-100 px-2 py-1 rounded-br-lg text-[10px] font-bold text-slate-500">
                        MATCH {matches.length - idx}
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-4">
                        <div className="text-center w-1/3">
                            <div className="font-bold text-slate-700 text-sm">{m.teamA.man.name}</div>
                            {/* 단식이 아닐 때만 파트너 표시 */}
                            {m.teamA.man.id !== m.teamA.woman.id && <div className="font-bold text-slate-700 text-sm">{m.teamA.woman.name}</div>}
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <input 
                                type="number" 
                                className={`w-10 h-10 text-center border rounded font-bold text-lg ${m.isFinished ? 'bg-slate-100 text-slate-400' : 'bg-white border-blue-500'}`}
                                placeholder="0"
                                defaultValue={m.scoreA}
                                onBlur={(e) => updateScore(m.id, Number(e.target.value), m.scoreB)}
                            />
                            <span className="font-bold text-slate-300">:</span>
                            <input 
                                type="number" 
                                className={`w-10 h-10 text-center border rounded font-bold text-lg ${m.isFinished ? 'bg-slate-100 text-slate-400' : 'bg-white border-blue-500'}`}
                                placeholder="0"
                                defaultValue={m.scoreB}
                                onBlur={(e) => updateScore(m.id, m.scoreA, Number(e.target.value))}
                            />
                        </div>

                        <div className="text-center w-1/3">
                            <div className="font-bold text-slate-700 text-sm">{m.teamB.man.name}</div>
                            {m.teamB.man.id !== m.teamB.woman.id && <div className="font-bold text-slate-700 text-sm">{m.teamB.woman.name}</div>}
                        </div>
                    </div>
                </div>
            ))}
        </section>

        {/* 리그 삭제 버튼 */}
        <section className="pt-8">
            <button onClick={handleDeleteLeague} className="w-full py-3 text-red-400 font-bold text-xs hover:text-red-500 flex items-center justify-center gap-1">
                <Trash2 size={14} /> 리그 삭제
            </button>
        </section>
      </div>
    </main>
  );
}