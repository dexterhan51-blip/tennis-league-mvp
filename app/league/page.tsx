"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Player, Match } from '@/types';
import { 
    generateMixedDoublesSchedule, generateDoubles, generateSingles, 
    calculateRanking, calculateDailyMvp, GUEST_M_ID, GUEST_F_ID 
} from '@/utils/tennisLogic';
import { ChevronLeft, Trophy, Trash2, PlusCircle, XCircle, CheckCircle, Circle, Shield, Calendar, Table, Save, X, Crown, Medal } from 'lucide-react';
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
  const [slotIndex, setSlotIndex] = useState<string | null>(null);

  const guestMale: Player = { id: GUEST_M_ID, name: '게스트(남)', gender: 'MALE' };
  const guestFemale: Player = { id: GUEST_F_ID, name: '게스트(여)', gender: 'FEMALE' };

  useEffect(() => {
    const currentSlot = localStorage.getItem("current-slot-index");
    setSlotIndex(currentSlot);

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
        const data = { name: leagueName, players, matches, savedAt: new Date().toISOString() };
        localStorage.setItem("current-league", JSON.stringify(data));
        if (slotIndex) localStorage.setItem(`league-slot-${slotIndex}`, JSON.stringify(data));
    }
  }, [matches, leagueName, players, slotIndex]);

  const rankings = useMemo(() => calculateRanking(players, matches), [players, matches]);

  const toggleMatchPlayer = (id: string) => {
    if (selectedForMatch.includes(id)) setSelectedForMatch(selectedForMatch.filter(pid => pid !== id));
    else setSelectedForMatch([...selectedForMatch, id]);
  };

  const handleCreateMatch = (type: 'MIXED' | 'DOUBLES' | 'SINGLES' | 'MANUAL') => {
    if (!matchDate) return alert("날짜를 선택해주세요.");
    const pool = [guestMale, guestFemale, ...players].filter(p => selectedForMatch.includes(p.id));

    try {
        let newMatches: Match[] = [];
        if (type === 'MIXED') {
            const proposedMatches = generateMixedDoublesSchedule(pool, matchDate);
            if (proposedMatches.length === 0) return alert("매칭 가능한 조합이 없습니다.");
            if (!confirm(`총 ${proposedMatches.length}개의 게임이 생성됩니다. 진행하시겠습니까?`)) return;
            newMatches = proposedMatches;
        } else if (type === 'DOUBLES') newMatches = generateDoubles(pool, matchDate);
        else if (type === 'SINGLES') newMatches = generateSingles(pool, matchDate);
        else if (type === 'MANUAL') newMatches = [{ id: uuidv4(), date: matchDate, teamA: { id: uuidv4(), man: pool[0]||guestMale, woman: pool[1]||guestFemale }, teamB: { id: uuidv4(), man: pool[2]||guestMale, woman: pool[3]||guestFemale }, scoreA: 0, scoreB: 0, isFinished: false }];

        if (newMatches.length > 0) {
            setMatches([...matches, ...newMatches]);
            setIsMatchViewOpen(false);
            setSelectedForMatch([]);
        }
    } catch (e: any) { alert(e.message); }
  };

  // ⭐ 점수 업데이트 (0~6점 제한 로직 추가)
  const updateScore = (matchId: string, scoreA: number, scoreB: number) => {
    // 0~6 사이로 강제 고정 (Clamp)
    const safeA = Math.min(6, Math.max(0, scoreA));
    const safeB = Math.min(6, Math.max(0, scoreB));
    
    // 점수가 하나라도 0 이상이면 경기 종료로 처리 (혹은 6점 도달시? 여기선 입력하면 종료로 간주)
    // 보통 테니스는 6선승제이므로 한쪽이 6이거나 합쳐서 결과가 나오면 finished
    // 편의상 입력값이 변경되면 finished로 처리
    const isFinished = true;

    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, scoreA: safeA, scoreB: safeB, isFinished } : m));
  };

  const deleteMatch = (matchId: string) => {
    if (confirm("경기 기록을 삭제하시겠습니까?")) setMatches(prev => prev.filter(m => m.id !== matchId));
  };

  const handleManualSave = () => {
    if (slotIndex) {
        const data = { name: leagueName, players, matches, savedAt: new Date().toISOString() };
        localStorage.setItem(`league-slot-${slotIndex}`, JSON.stringify(data));
        alert(`SLOT ${slotIndex}에 저장되었습니다!`);
    } else alert("저장되었습니다.");
  };

  const handleFinishDailyGame = () => {
    if(!matchDate) return alert("날짜가 선택되지 않았습니다.");
    const result = calculateDailyMvp(players, matches, matchDate);
    if (!result.maleMvp && !result.femaleMvp) return alert("완료된 경기 기록이 없습니다.");
    let msg = `[${matchDate} 게임 종료]\n\n`;
    if (result.maleMvp) msg += `🤴 남자 MVP: ${result.maleMvp.name} (승률 ${(result.maleMvp.winRate * 100).toFixed(0)}%)\n`;
    if (result.femaleMvp) msg += `👸 여자 MVP: ${result.femaleMvp.name} (승률 ${(result.femaleMvp.winRate * 100).toFixed(0)}%)\n`;
    msg += `\n보너스 점수 2점을 부여하고 저장하시겠습니까?`;
    if (confirm(msg)) {
        const updatedPlayers = players.map(p => {
            let bonus = p.bonusPoints || 0;
            if (result.maleMvp && p.id === result.maleMvp.id) bonus += 2;
            if (result.femaleMvp && p.id === result.femaleMvp.id) bonus += 2;
            return { ...p, bonusPoints: bonus };
        });
        setPlayers(updatedPlayers);
        alert("보너스 점수가 반영되었습니다! 👑");
    }
  };

  const handleDeleteLeague = () => {
    if (confirm("정말 삭제하시겠습니까?")) {
        localStorage.removeItem("current-league");
        if(slotIndex) localStorage.removeItem(`league-slot-${slotIndex}`);
        router.push("/");
    }
  };

  const displayedMatches = matches.filter(m => m.date === matchDate);

  return (
    <main className="max-w-md mx-auto min-h-screen bg-white pb-32 relative">
      <header className="p-4 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-full text-slate-400"><ChevronLeft size={24} /></Link>
            {slotIndex && <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded font-bold">SLOT {slotIndex}</span>}
        </div>
        <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-bold text-xs border border-green-200"><Table size={14}/> 기록</button>
      </header>

      <div className="px-6 space-y-8 pt-4">
        <div className="text-center"><h1 className="text-2xl font-black text-slate-800 flex justify-center items-center gap-2"><span className="text-blue-600">-</span> {leagueName} <span className="text-blue-600">-</span></h1></div>

        <section>
            <h2 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2"><Trophy size={16} /> 실시간 랭킹</h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                        <tr><th className="p-3 text-center">순위</th><th className="p-3">이름</th><th className="p-3 text-center">승/패</th><th className="p-3 text-right">점수</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {rankings.map((r, idx) => (
                            <tr key={r.playerId} className={`bg-white ${idx === 0 ? 'bg-yellow-50' : ''}`}>
                                <td className="p-3 text-center font-bold text-slate-600">{idx + 1}</td>
                                <td className="p-3 font-bold text-slate-800 flex items-center gap-1">
                                    {r.name}
                                    {idx === 0 && <Crown size={14} className="text-yellow-500 fill-yellow-500"/>} 
                                </td>
                                <td className="p-3 text-center text-slate-500">{r.wins}승 {r.losses}패</td>
                                <td className="p-3 text-right font-bold text-blue-600">{r.totalPoints}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>

        <section>
            <button onClick={() => setIsMatchViewOpen(!isMatchViewOpen)} className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-md ${isMatchViewOpen ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white'}`}>{isMatchViewOpen ? <XCircle size={20}/> : <PlusCircle size={20}/>}{isMatchViewOpen ? '닫기' : '게임 등록'}</button>
            {isMatchViewOpen && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border-2 border-slate-200">
                    <div className="mb-4"><label className="block text-xs font-bold text-slate-500 mb-1">경기 날짜</label><div className="relative"><Calendar className="absolute left-3 top-2.5 text-slate-400" size={16} /><input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="w-full pl-10 pr-3 py-2 rounded-lg border border-slate-300 font-bold text-sm bg-white"/></div></div>
                    <div className="mb-6"><div className="grid grid-cols-3 gap-2">{[guestMale, guestFemale, ...players].map(p => (<div key={p.id} onClick={() => toggleMatchPlayer(p.id)} className={`p-2 rounded-lg border cursor-pointer text-center text-xs font-bold ${selectedForMatch.includes(p.id) ? 'bg-blue-100 border-blue-500 text-blue-700' : 'bg-white border-slate-200'}`}>{p.name}</div>))}</div></div>
                    <div className="space-y-2">
                        <button onClick={() => handleCreateMatch('MIXED')} className="w-full bg-blue-50 border-2 border-blue-200 text-blue-700 py-3 rounded-xl font-bold">👩‍❤️‍👨 혼복 풀리그</button>
                        <div className="grid grid-cols-2 gap-2"><button onClick={() => handleCreateMatch('DOUBLES')} className="bg-white border text-slate-600 py-3 rounded-xl font-bold text-xs">👥 복식</button><button onClick={() => handleCreateMatch('SINGLES')} className="bg-white border text-slate-600 py-3 rounded-xl font-bold text-xs">👤 단식</button></div>
                        <button onClick={() => handleCreateMatch('MANUAL')} className="w-full bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-xs">✍️ 수동</button>
                    </div>
                </div>
            )}
        </section>

        <section className="space-y-4">
             {displayedMatches.length === 0 && (
                <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300"><p className="text-sm">오늘 진행된 게임이 없습니다.</p></div>
             )}

             {displayedMatches.map((m, idx) => (
                <div key={m.id} className={`p-3 rounded-lg border shadow-sm relative group transition-colors ${m.isFinished ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
                    <div className="absolute top-0 left-0 right-0 bg-slate-100 px-3 py-1 flex justify-between items-center text-[10px] font-bold text-slate-500">
                        <div className="flex items-center gap-2">
                            <span className="text-blue-600">GAME {idx + 1}</span>
                            {/* ⭐ 경기 종료 배지 */}
                            {m.isFinished && <span className="bg-slate-300 text-slate-600 px-1.5 py-0.5 rounded text-[9px]">경기종료</span>}
                        </div>
                        <span>{m.date}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-6">
                        <div className="text-center w-1/3">
                            <div className="font-bold text-slate-700 text-sm">{m.teamA.man.name}</div>
                            {m.teamA.man.id !== m.teamA.woman.id && <div className="font-bold text-slate-700 text-sm">{m.teamA.woman.name}</div>}
                        </div>
                        <div className="flex items-center gap-1">
                            {/* ⭐ 점수 입력 제한 (min=0, max=6) */}
                            <input type="number" min="0" max="6" className={`w-10 h-10 text-center border rounded font-bold text-lg ${m.isFinished ? 'bg-slate-200 text-slate-500' : 'bg-white border-blue-500'}`} placeholder="0" value={m.scoreA} onChange={(e) => updateScore(m.id, Number(e.target.value), m.scoreB)}/>
                            <span className="font-bold text-slate-300">:</span>
                            <input type="number" min="0" max="6" className={`w-10 h-10 text-center border rounded font-bold text-lg ${m.isFinished ? 'bg-slate-200 text-slate-500' : 'bg-white border-blue-500'}`} placeholder="0" value={m.scoreB} onChange={(e) => updateScore(m.id, m.scoreA, Number(e.target.value))}/>
                        </div>
                        <div className="text-center w-1/3">
                            <div className="font-bold text-slate-700 text-sm">{m.teamB.man.name}</div>
                            {m.teamB.man.id !== m.teamB.woman.id && <div className="font-bold text-slate-700 text-sm">{m.teamB.woman.name}</div>}
                        </div>
                    </div>
                    <button onClick={() => deleteMatch(m.id)} className="absolute bottom-2 right-2 p-1.5 text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                </div>
            ))}
        </section>
        
        {displayedMatches.length > 0 && (
            <section>
                <button onClick={handleFinishDailyGame} className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:bg-slate-700">
                    <Medal size={20} className="text-yellow-400" /> [{matchDate}] 게임 종료
                </button>
            </section>
        )}

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 max-w-md mx-auto flex gap-2">
            <button onClick={handleManualSave} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg"><Save size={18}/> 저장하기</button>
            <button onClick={handleDeleteLeague} className="px-4 bg-slate-100 text-red-400 rounded-xl font-bold"><Trash2 size={18}/></button>
        </div>
      </div>

      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
               <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl"><h3 className="font-bold text-lg flex items-center gap-2">경기 히스토리 (전체)</h3><button onClick={() => setIsHistoryOpen(false)}><X size={24}/></button></div>
               <div className="overflow-auto p-4 flex-1">
                   <table className="w-full text-xs border-collapse border border-slate-300">
                       <thead className="bg-slate-100 sticky top-0"><tr><th className="border p-2">날짜</th><th className="border p-2">A팀</th><th className="border p-2">점수</th><th className="border p-2">B팀</th><th className="border p-2">승자</th></tr></thead>
                       <tbody>
                           {matches.slice(0).reverse().map((m)=>(
                               <tr key={m.id} className="hover:bg-slate-50">
                                   <td className="border p-2 text-center text-slate-500">{m.date.slice(5)}</td>
                                   {/* ⭐ 히스토리: 팀원 2명 모두 표시 */}
                                   <td className="border p-2 text-center">
                                       <div className="font-bold">{m.teamA.man.name}</div>
                                       {m.teamA.man.id !== m.teamA.woman.id && <div className="text-slate-600">{m.teamA.woman.name}</div>}
                                   </td>
                                   <td className="border p-2 text-center font-bold">{m.scoreA}:{m.scoreB}</td>
                                   <td className="border p-2 text-center">
                                       <div className="font-bold">{m.teamB.man.name}</div>
                                       {m.teamB.man.id !== m.teamB.woman.id && <div className="text-slate-600">{m.teamB.woman.name}</div>}
                                   </td>
                                   <td className="border p-2 font-bold text-center">{m.scoreA>m.scoreB?'A':(m.scoreB>m.scoreA?'B':'-')}</td>
                               </tr>
                           ))}
                       </tbody>
                   </table>
               </div>
           </div>
        </div>
      )}
    </main>
  );
}