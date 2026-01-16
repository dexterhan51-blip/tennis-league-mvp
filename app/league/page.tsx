"use client";

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Player, Match } from '@/types';
import { 
    generateMixedDoubles, generateDoubles, generateSingles, 
    calculateRanking, GUEST_M_ID, GUEST_F_ID 
} from '@/utils/tennisLogic';
import { ChevronLeft, Trophy, Trash2, PlusCircle, XCircle, CheckCircle, Circle, Shield, Calendar, Table, Save, X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function LeaguePage() {
  const router = useRouter();
  
  // 상태 관리
  const [leagueName, setLeagueName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  // UI 상태
  const [isMatchViewOpen, setIsMatchViewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false); // 히스토리 모달
  const [selectedForMatch, setSelectedForMatch] = useState<string[]>([]);
  
  // 날짜 상태 (기본값: 오늘)
  const [matchDate, setMatchDate] = useState("");

  // 게스트 데이터
  const guestMale: Player = { id: GUEST_M_ID, name: '게스트(남)', gender: 'MALE' };
  const guestFemale: Player = { id: GUEST_F_ID, name: '게스트(여)', gender: 'FEMALE' };

  // 1. 데이터 불러오기 및 초기화
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
    // 기존 매치 데이터에 날짜가 없을 경우를 대비해 방어 코드 추가 가능
    setMatches(data.matches || []); // 데이터 구조상 matches가 없을수도 있어서

    // 오늘 날짜 설정 (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];
    setMatchDate(today);
  }, [router]);

  // 2. 자동 저장 (매치나 정보가 바뀔 때마다)
  useEffect(() => {
    if (leagueName) {
        const data = {
            name: leagueName,
            players: players,
            matches: matches, // 매치 정보도 함께 저장해야 함! (기존엔 빠져있었을 수 있음)
            savedAt: new Date().toISOString()
        };
        localStorage.setItem("current-league", JSON.stringify(data));
        
        // 슬롯에도 업데이트 (현재 로드된 슬롯 찾아서 업데이트 - 여기선 간소화를 위해 current만 처리)
        // 실제로는 로드할 때 '어떤 슬롯에서 왔는지' 기억했다가 거기도 업데이트 해주는게 좋음.
        // 이번 MVP에서는 'current-league'를 메인으로 씁니다.
    }
  }, [matches, leagueName, players]);

  // 랭킹 계산
  const rankings = useMemo(() => calculateRanking(players, matches), [players, matches]);

  const toggleMatchPlayer = (id: string) => {
    if (selectedForMatch.includes(id)) {
        setSelectedForMatch(selectedForMatch.filter(pid => pid !== id));
    } else {
        setSelectedForMatch([...selectedForMatch, id]);
    }
  };

  // 3. 매치 생성
  const handleCreateMatch = (type: 'MIXED' | 'DOUBLES' | 'SINGLES' | 'MANUAL') => {
    if (!matchDate) return alert("날짜를 선택해주세요.");
    
    const pool = [guestMale, guestFemale, ...players].filter(p => selectedForMatch.includes(p.id));

    try {
        let newMatches: Match[] = [];
        
        // 날짜 파라미터 전달
        if (type === 'MIXED') newMatches = generateMixedDoubles(pool, matchDate);
        else if (type === 'DOUBLES') newMatches = generateDoubles(pool, matchDate);
        else if (type === 'SINGLES') newMatches = generateSingles(pool, matchDate);
        else if (type === 'MANUAL') {
            newMatches = [{
                id: uuidv4(),
                date: matchDate,
                teamA: { id: uuidv4(), man: pool[0] || guestMale, woman: pool[1] || guestFemale },
                teamB: { id: uuidv4(), man: pool[2] || guestMale, woman: pool[3] || guestFemale },
                scoreA: 0, scoreB: 0, isFinished: false
            }];
        }

        if (newMatches.length === 0) return alert("매칭 가능한 조합이 없습니다.");

        // 최신순이 위로 오게 추가
        setMatches([...newMatches, ...matches]);
        setIsMatchViewOpen(false);
        setSelectedForMatch([]);
        alert(`${newMatches.length}개의 게임이 생성되었습니다.`);

    } catch (e: any) {
        alert(e.message);
    }
  };

  // 4. 점수 수정
  const updateScore = (matchId: string, scoreA: number, scoreB: number) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, scoreA, scoreB, isFinished: true } : m));
  };

  // 5. 매치 삭제
  const deleteMatch = (matchId: string) => {
    if (confirm("이 경기 기록을 삭제하시겠습니까? 랭킹도 다시 계산됩니다.")) {
        setMatches(prev => prev.filter(m => m.id !== matchId));
    }
  };

  // 6. 전체 수동 저장 버튼
  const handleManualSave = () => {
    const data = {
        name: leagueName,
        players: players,
        matches: matches,
        savedAt: new Date().toISOString()
    };
    localStorage.setItem("current-league", JSON.stringify(data));
    alert("현재 리그 상태가 안전하게 저장되었습니다.");
  };

  const handleDeleteLeague = () => {
    if (confirm(`'${leagueName}' 리그를 정말 삭제(종료)하시겠습니까?`)) {
        localStorage.removeItem("current-league");
        router.push("/");
    }
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-white pb-24 relative">
      {/* 헤더 */}
      <header className="p-4 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-slate-100">
        <div className="flex items-center gap-2">
            <Link href="/" className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
                <ChevronLeft size={24} />
            </Link>
            <span className="font-bold text-slate-500">메인으로</span>
        </div>
        
        {/* 경기 히스토리 버튼 */}
        <button 
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-bold text-xs border border-green-200"
        >
            <Table size={14} /> 경기 기록
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
                        - 게임 등록 -
                    </div>

                    {/* 1. 날짜 선택 */}
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

                    {/* 2. 선수 선택 */}
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

                    {/* 3. 대진표 생성 버튼들 */}
                    <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => handleCreateMatch('MIXED')} className="bg-white border-2 border-blue-100 hover:bg-blue-50 text-blue-700 py-3 rounded-xl font-bold text-sm shadow-sm">
                                👩‍❤️‍👨 혼복 랜덤
                            </button>
                            <button onClick={() => handleCreateMatch('DOUBLES')} className="bg-white border-2 border-blue-100 hover:bg-blue-50 text-blue-700 py-3 rounded-xl font-bold text-sm shadow-sm">
                                👥 복식 랜덤
                            </button>
                            <button onClick={() => handleCreateMatch('SINGLES')} className="bg-white border-2 border-blue-100 hover:bg-blue-50 text-blue-700 py-3 rounded-xl font-bold text-sm shadow-sm">
                                👤 단식 랜덤
                            </button>
                        </div>
                        <button onClick={() => handleCreateMatch('MANUAL')} className="w-full bg-slate-200 hover:bg-slate-300 text-slate-600 py-3 rounded-xl font-bold text-sm">
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
                    {/* 상단 정보: 매치 번호 & 날짜 */}
                    <div className="absolute top-0 left-0 right-0 bg-slate-100 px-3 py-1 flex justify-between items-center text-[10px] font-bold text-slate-500">
                        <span>MATCH {matches.length - idx}</span>
                        <span>{m.date || '날짜없음'}</span>
                    </div>

                    {/* 점수판 */}
                    <div className="flex items-center justify-between gap-2 mt-6">
                        <div className="text-center w-1/3">
                            <div className="font-bold text-slate-700 text-sm">{m.teamA.man.name}</div>
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

                    {/* 삭제 버튼 (우측 하단) */}
                    <button 
                        onClick={() => deleteMatch(m.id)}
                        className="absolute bottom-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            ))}
        </section>

        {/* 하단 저장 버튼 */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 max-w-md mx-auto flex gap-2">
            <button onClick={handleManualSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
                <Save size={18} /> 전체 저장하기
            </button>
            <button onClick={handleDeleteLeague} className="px-4 bg-slate-100 text-red-400 hover:text-red-500 rounded-xl font-bold">
                <Trash2 size={18} />
            </button>
        </div>
      </div>

      {/* --- 경기 기록(History) 모달 (Excel 스타일) --- */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-lg flex items-center gap-2"><Table size={18} className="text-green-600"/> 경기 히스토리</h3>
                    <button onClick={() => setIsHistoryOpen(false)}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
                </div>
                
                <div className="overflow-auto p-4 flex-1">
                    <table className="w-full text-xs border-collapse border border-slate-300">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="border border-slate-300 p-2 text-center">날짜</th>
                                <th className="border border-slate-300 p-2 text-center">팀 A</th>
                                <th className="border border-slate-300 p-2 text-center">점수</th>
                                <th className="border border-slate-300 p-2 text-center">팀 B</th>
                                <th className="border border-slate-300 p-2 text-center">승자</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...matches].reverse().map((m) => {
                                const winner = m.scoreA > m.scoreB ? 'A승' : (m.scoreB > m.scoreA ? 'B승' : '무');
                                return (
                                    <tr key={m.id} className="hover:bg-slate-50">
                                        <td className="border border-slate-300 p-2 text-center text-slate-500">{m.date}</td>
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