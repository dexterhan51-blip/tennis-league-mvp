"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Player, Match } from '@/types';
import { 
    generateMixedDoublesSchedule, generateDoubles, generateSingles, // 👈 함수 이름 변경됨
    calculateRanking, GUEST_M_ID, GUEST_F_ID 
} from '@/utils/tennisLogic';
import { ChevronLeft, Trophy, Trash2, PlusCircle, XCircle, CheckCircle, Circle, Shield, Calendar, Table, Save, X, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function LeaguePage() {
  const router = useRouter();
  
  const [leagueName, setLeagueName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isMatchViewOpen, setIsMatchViewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedForMatch, setSelectedForMatch] = useState<string[]>([]);
  const [matchDate, setMatchDate] = useState("");

  const guestMale: Player = { id: GUEST_M_ID, name: '게스트(남)', gender: 'MALE' };
  const guestFemale: Player = { id: GUEST_F_ID, name: '게스트(여)', gender: 'FEMALE' };

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
    setMatches(data.matches || []);
    const today = new Date().toISOString().split('T')[0];
    setMatchDate(today);
  }, [router]);

  useEffect(() => {
    if (leagueName) {
        const data = {
            name: leagueName,
            players: players,
            matches: matches,
            savedAt: new Date().toISOString()
        };
        localStorage.setItem("current-league", JSON.stringify(data));
    }
  }, [matches, leagueName, players]);

  const rankings = useMemo(() => calculateRanking(players, matches), [players, matches]);

  const toggleMatchPlayer = (id: string) => {
    if (selectedForMatch.includes(id)) {
        setSelectedForMatch(selectedForMatch.filter(pid => pid !== id));
    } else {
        setSelectedForMatch([...selectedForMatch, id]);
    }
  };

  const handleCreateMatch = (type: 'MIXED' | 'DOUBLES' | 'SINGLES' | 'MANUAL') => {
    if (!matchDate) return alert("날짜를 선택해주세요.");
    
    const pool = [guestMale, guestFemale, ...players].filter(p => selectedForMatch.includes(p.id));

    try {
        let newMatches: Match[] = [];
        let message = "";

        if (type === 'MIXED') {
            // 혼복은 미리 계산해서 물어봄
            const proposedMatches = generateMixedDoublesSchedule(pool, matchDate);
            const count = proposedMatches.length;
            
            if (count === 0) return alert("매칭 가능한 조합이 없습니다. 인원을 확인해주세요.");

            // ⚠️ 의사 확인 (Confirmation)
            const estimatedTime = count * 20; // 게임당 20분 잡음
            const confirmMsg = `총 ${count}개의 게임이 생성됩니다.\n(예상 소요시간: 약 ${estimatedTime}분)\n\n파트너를 모두 바꿔가며 진행하는 풀리그 방식입니다.\n이대로 생성하시겠습니까?`;
            
            if (!confirm(confirmMsg)) return;
            
            newMatches = proposedMatches;
            message = `${count}개의 혼복 풀리그 게임이 생성되었습니다.`;

        } else if (type === 'DOUBLES') {
            newMatches = generateDoubles(pool, matchDate);
            message = "복식 랜덤 게임이 생성되었습니다.";
        } else if (type === 'SINGLES') {
            newMatches = generateSingles(pool, matchDate);
            message = "단식 랜덤 게임이 생성되었습니다.";
        } else if (type === 'MANUAL') {
            newMatches = [{
                id: uuidv4(),
                date: matchDate,
                teamA: { id: uuidv4(), man: pool[0] || guestMale, woman: pool[1] || guestFemale },
                teamB: { id: uuidv4(), man: pool[2] || guestMale, woman: pool[3] || guestFemale },
                scoreA: 0, scoreB: 0, isFinished: false
            }];
        }

        if (newMatches.length > 0) {
            // 기존 매치 리스트 '뒤'에 추가하지 않고 '앞'에 추가하거나, 
            // 여기서는 최신 게임이 위로 오도록 설정 (Reverse)
            setMatches([...newMatches, ...matches]);
            setIsMatchViewOpen(false);
            setSelectedForMatch([]);
            if (message) alert(message);
        }

    } catch (e: any) {
        alert(e.message);
    }
  };

  const updateScore = (matchId: string, scoreA: number, scoreB: number) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, scoreA, scoreB, isFinished: true } : m));
  };

  const deleteMatch = (matchId: string) => {
    if (confirm("이 경기 기록을 삭제하시겠습니까? 랭킹도 다시 계산됩니다.")) {
        setMatches(prev => prev.filter(m => m.id !== matchId));
    }
  };

  const handleManualSave = () => {
    const data = {
        name: leagueName,
        players: players,
        matches: matches,
        savedAt: new Date().toISOString()
    };
    localStorage.setItem("current-league", JSON.stringify(data));
    alert("저장되었습니다.");
  };

  const handleDeleteLeague = () => {
    if (confirm(`'${leagueName}' 리그를 종료하고 삭제하시겠습니까?`)) {
        localStorage.removeItem("current-league");
        router.push("/");
    }
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-white pb-24 relative">
      {/* 헤더 */}
      <header className="p-4 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <ChevronLeft size={24} />
            </Link>
        </div>
        
        <button 
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-bold text-xs border border-green-200"
        >
            <Table size={14} className="text-green-600"/> 경기 히스토리
        </button>
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

            {isMatchViewOpen && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 animate-fade-in-down">
                    <div className="text-center font-bold text-slate-700 mb-4 border-b border-slate-200 pb-2">
                        - 게임 생성 -
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 mb-1">경기 날짜</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} />
                            <input 
                                type="date"
                                value={matchDate}
                                onChange={(e) => setMatchDate(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-300 font-bold text-sm bg-white"
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-xs font-bold text-slate-500">참가 선수 선택</label>
                            <span className="text-blue-600 font-bold text-xs">{selectedForMatch.length}명 선택됨</span>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2">
                            {[guestMale, guestFemale].map(guest => (
                                <div key={guest.id} onClick={() => toggleMatchPlayer(guest.id)}
                                    className={`p-2 rounded-lg border cursor-pointer text-center text-xs font-bold transition-all ${selectedForMatch.includes(guest.id) ? 'bg-amber-100 border-amber-500 text-amber-700' : 'bg-white border-slate-200 text-slate-400'}`}
                                >
                                    <Shield size={16} className="mx-auto mb-1 opacity-50"/>
                                    {guest.name}
                                </div>
                            ))}
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

                    <div className="space-y-2">
                        <button onClick={() => handleCreateMatch('MIXED')} className="w-full bg-blue-50 border-2 border-blue-200 hover:bg-blue-100 text-blue-700 py-4 rounded-xl font-bold text-md shadow-sm flex items-center justify-center gap-2">
                            👩‍❤️‍👨 혼복 풀리그 생성 (자동)
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => handleCreateMatch('DOUBLES')} className="bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs">
                                👥 복식 1게임
                            </button>
                            <button onClick={() => handleCreateMatch('SINGLES')} className="bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs">
                                👤 단식 1게임
                            </button>
                        </div>
                        <button onClick={() => handleCreateMatch('MANUAL')} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 py-3 rounded-xl font-bold text-xs">
                            ✍️ 수동 등록
                        </button>
                    </div>
                </div>
            )}
        </section>

        {/* 생성된 매치 리스트 (스크롤 형태) */}
        <section className="space-y-4">
             {matches.length === 0 && (
                <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p>생성된 게임이 없습니다.</p>
                </div>
             )}

             {/* 최신 게임이 위로 오도록 렌더링 */}
             {[...matches].map((m, idx) => {
                // 역순 인덱스 계산 (화면 표시용)
                const displayNum = matches.length - idx;
                
                return (
                <div key={m.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 right-0 bg-slate-100 px-3 py-1 flex justify-between items-center text-[10px] font-bold text-slate-500">
                        <span className="text-blue-600">GAME {displayNum}</span>
                        <span>{m.date}</span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-6">
                        <div className="text-center w-1/3">
                            <div className="font-bold text-slate-700 text-sm">{m.teamA.man.name}</div>
                            {m.teamA.man.id !== m.teamA.woman.id && <div className="font-bold text-slate-700 text-sm">{m.teamA.woman.name}</div>}
                        </div>
                        
                        <div className="flex items-center gap-1">
                            <input 
                                type="number" 
                                className={`w-10 h-10 text-center border rounded font-bold text-lg ${m.isFinished ? 'bg-slate-100 text-slate-400' : 'bg-white border-blue-500 shadow-sm'}`}
                                placeholder="0"
                                defaultValue={m.scoreA}
                                onBlur={(e) => updateScore(m.id, Number(e.target.value), m.scoreB)}
                            />
                            <span className="font-bold text-slate-300">:</span>
                            <input 
                                type="number" 
                                className={`w-10 h-10 text-center border rounded font-bold text-lg ${m.isFinished ? 'bg-slate-100 text-slate-400' : 'bg-white border-blue-500 shadow-sm'}`}
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

                    <button 
                        onClick={() => deleteMatch(m.id)}
                        className="absolute bottom-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            )})}
        </section>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 max-w-md mx-auto flex gap-2">
            <button onClick={handleManualSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                <Save size={18} /> 전체 저장하기
            </button>
            <button onClick={handleDeleteLeague} className="px-4 bg-slate-100 text-red-400 hover:text-red-500 rounded-xl font-bold">
                <Trash2 size={18} />
            </button>
        </div>
      </div>

      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-fade-in-up">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Table size={18} className="text-green-600"/> 경기 히스토리</h3>
                    <button onClick={() => setIsHistoryOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                
                <div className="overflow-auto p-4 flex-1">
                    <table className="w-full text-xs border-collapse border border-slate-300">
                        <thead className="bg-slate-100 sticky top-0">
                            <tr>
                                <th className="border border-slate-300 p-2 text-center">날짜</th>
                                <th className="border border-slate-300 p-2 text-center">팀 A</th>
                                <th className="border border-slate-300 p-2 text-center">스코어</th>
                                <th className="border border-slate-300 p-2 text-center">팀 B</th>
                                <th className="border border-slate-300 p-2 text-center">승자</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...matches].reverse().map((m) => { // 최신순 정렬
                                const winner = m.scoreA > m.scoreB ? 'A승' : (m.scoreB > m.scoreA ? 'B승' : '무');
                                return (
                                    <tr key={m.id} className="hover:bg-slate-50">
                                        <td className="border border-slate-300 p-2 text-center text-slate-500">{m.date.slice(5)}</td>
                                        <td className="border border-slate-300 p-2 text-center">
                                            {m.teamA.man.name}<br/>{m.teamA.woman.id !== m.teamA.man.id && m.teamA.woman.name}
                                        </td>
                                        <td className="border border-slate-300 p-2 text-center font-bold bg-slate-50">
                                            {m.scoreA} : {m.scoreB}
                                        </td>
                                        <td className="border border-slate-300 p-2 text-center">
                                            {m.teamB.man.name}<br/>{m.teamB.woman.id !== m.teamB.man.id && m.teamB.woman.name}
                                        </td>
                                        <td className={`border border-slate-300 p-2 text-center font-bold ${winner === 'A승' ? 'text-blue-600' : (winner === 'B승' ? 'text-red-600' : 'text-slate-400')}`}>
                                            {winner}
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </main>
  );
}