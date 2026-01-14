"use client";

import { useState, useMemo } from 'react';
import { Player, Match } from '@/types';
import { generateMatches, calculateRanking } from '@/utils/tennisLogic';
import { Users, Shuffle, Trophy, CheckCircle } from 'lucide-react';

// 초기 더미 데이터
const INITIAL_PLAYERS: Player[] = [
  { id: '1', name: '김철수', gender: 'MALE' }, { id: '2', name: '이영희', gender: 'FEMALE' },
  { id: '3', name: '박민수', gender: 'MALE' }, { id: '4', name: '최지우', gender: 'FEMALE' },
  { id: '5', name: '정수현', gender: 'FEMALE' }, { id: '6', name: '강동원', gender: 'MALE' },
  { id: '7', name: '한지민', gender: 'FEMALE' }, // 3남 4여 상황
];

export default function Home() {
  const [players] = useState<Player[]>(INITIAL_PLAYERS);
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'MATCH' | 'RANK'>('MATCH');

  // 랭킹 실시간 계산
  const rankings = useMemo(() => calculateRanking(players, matches), [players, matches]);

  const handleGenerate = () => {
    if(confirm('새 대진표를 만드시겠습니까? 기존 점수는 유지되지만 매칭은 초기화됩니다.')) {
        try { setMatches(generateMatches(players)); } catch (e: any) { alert(e.message); }
    }
  };

  const updateScore = (matchId: string, scoreA: number, scoreB: number) => {
    setMatches(prev => prev.map(m => m.id === matchId ? { ...m, scoreA, scoreB, isFinished: true } : m));
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-slate-50 pb-20">
      <header className="bg-white p-4 sticky top-0 z-10 border-b border-slate-200 flex justify-between items-center">
        <h1 className="text-xl font-bold text-slate-800">🎾 테니스 리그 MVP</h1>
        <div className="flex gap-2">
            <button onClick={() => setActiveTab('MATCH')} className={`px-3 py-1 rounded-full text-sm font-bold ${activeTab === 'MATCH' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>매치</button>
            <button onClick={() => setActiveTab('RANK')} className={`px-3 py-1 rounded-full text-sm font-bold ${activeTab === 'RANK' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>랭킹</button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {activeTab === 'MATCH' ? (
          <>
            <button onClick={handleGenerate} className="w-full bg-slate-800 text-white py-3 rounded-xl font-semibold flex justify-center gap-2 items-center active:scale-95 transition-transform">
              <Shuffle size={18} /> 랜덤 매치 생성
            </button>
            
            {matches.length === 0 && <p className="text-center text-slate-400 py-10">생성 버튼을 눌러주세요.</p>}
            
            {matches.map((m, idx) => (
              <MatchCard key={m.id} match={m} index={idx} onUpdate={updateScore} />
            ))}
          </>
        ) : (
          <div className="space-y-2">
            {rankings.map((r, idx) => (
              <div key={r.playerId} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className={`font-bold w-6 text-center ${idx < 3 ? 'text-amber-500 text-lg' : 'text-slate-400'}`}>{idx + 1}</span>
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1">
                        {r.name}
                        {r.dailyBonus && <Trophy size={14} className="text-yellow-500" />}
                    </div>
                    <div className="text-xs text-slate-400">{r.wins}승 {r.losses}패 ({r.winRate.toFixed(0)}%)</div>
                  </div>
                </div>
                <div className="text-right">
                    <div className="text-lg font-bold text-blue-600">{r.avgPoints.toFixed(2)}점</div>
                    <div className="text-xs text-slate-400">총 {r.totalPoints}점</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

// 간단한 매치 카드 컴포넌트
function MatchCard({ match, index, onUpdate }: { match: Match, index: number, onUpdate: any }) {
    const [isEditing, setIsEditing] = useState(false);
    return (
        <div className={`bg-white rounded-xl p-4 shadow-sm border-2 ${match.isFinished ? 'border-blue-100 bg-blue-50/30' : 'border-transparent'}`}>
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-400">MATCH {index + 1}</span>
                {match.isFinished ? <CheckCircle size={16} className="text-green-500"/> : <span className="text-xs text-red-400 font-bold">진행중</span>}
            </div>
            <div className="flex justify-between items-center">
                <div className="text-center flex-1">
                    <div className="font-bold">{match.teamA.man.name} / {match.teamA.woman.name}</div>
                </div>
                {isEditing ? (
                    <div className="flex gap-1 items-center bg-slate-100 p-1 rounded-lg">
                        <input type="number" className="w-8 h-8 text-center border rounded font-bold" placeholder="A" id={`scoreA-${match.id}`} />
                        <span>:</span>
                        <input type="number" className="w-8 h-8 text-center border rounded font-bold" placeholder="B" id={`scoreB-${match.id}`} />
                        <button onClick={() => {
                            const sa = Number((document.getElementById(`scoreA-${match.id}`) as HTMLInputElement).value);
                            const sb = Number((document.getElementById(`scoreB-${match.id}`) as HTMLInputElement).value);
                            onUpdate(match.id, sa, sb);
                            setIsEditing(false);
                        }} className="bg-blue-600 text-white text-xs px-2 py-1 rounded ml-1">저장</button>
                    </div>
                ) : (
                    <div onClick={() => setIsEditing(true)} className="px-4 py-1 bg-slate-100 rounded-lg font-bold text-xl cursor-pointer hover:bg-slate-200">
                        {match.scoreA} : {match.scoreB}
                    </div>
                )}
                <div className="text-center flex-1">
                    <div className="font-bold">{match.teamB.man.name} / {match.teamB.woman.name}</div>
                </div>
            </div>
        </div>
    )
}