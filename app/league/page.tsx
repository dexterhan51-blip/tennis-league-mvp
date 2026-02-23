"use client";

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Player, Match, PlayerWithRank } from '@/types';
import {
    generateMixedDoublesSchedule, generateDoubles, generateSingles,
    calculateRanking, calculateDailyMvp, GUEST_M_ID, GUEST_F_ID
} from '@/utils/tennisLogic';
import { Trophy, Trash2, PlusCircle, XCircle, Calendar, Table, Save, X, Crown, Medal, Share2, Shuffle, Users, User, Edit3 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/contexts/ToastContext';
import { useUndo as useUndoContext } from '@/contexts/UndoContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import SwipeableItem from '@/components/ui/SwipeableItem';
import ScoreInput from '@/components/ui/ScoreInput';
import QuickDatePicker from '@/components/navigation/QuickDatePicker';
import RankingRow from '@/components/ranking/RankingRow';
import PlayerStatsModal from '@/components/ranking/PlayerStatsModal';
import ShareButton from '@/components/share/ShareButton';

const PREVIOUS_RANKINGS_KEY = 'previous-rankings';
const FINISHED_DATES_KEY = 'finished-dates';

export default function LeaguePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { pushAction } = useUndoContext();

  const [leagueName, setLeagueName] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isMatchViewOpen, setIsMatchViewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedForMatch, setSelectedForMatch] = useState<string[]>([]);
  const [matchDate, setMatchDate] = useState("");
  const [slotIndex, setSlotIndex] = useState<string | null>(null);

  // New state for modals
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const [showDeleteLeagueDialog, setShowDeleteLeagueDialog] = useState(false);
  const [showMvpDialog, setShowMvpDialog] = useState(false);
  const [mvpResult, setMvpResult] = useState<{ maleMvp: any; femaleMvp: any } | null>(null);

  // Player stats modal
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPlayerStats, setShowPlayerStats] = useState(false);

  // Previous rankings for rank change display
  const [previousRankings, setPreviousRankings] = useState<Record<string, number>>({});

  // Track finished dates (to prevent duplicate MVP awards)
  const [finishedDates, setFinishedDates] = useState<string[]>([]);

  // Confirm dialog for match creation
  const [pendingMixedMatches, setPendingMixedMatches] = useState<Match[] | null>(null);

  const guestMale: Player = { id: GUEST_M_ID, name: '게스트(남)', gender: 'MALE' };
  const guestFemale: Player = { id: GUEST_F_ID, name: '게스트(여)', gender: 'FEMALE' };

  useEffect(() => {
    const currentSlot = localStorage.getItem("current-slot-index");
    setSlotIndex(currentSlot);

    const savedLeague = localStorage.getItem("current-league");
    if (!savedLeague) {
        showToast("선택된 리그가 없습니다.", "error");
        router.push("/");
        return;
    }
    const data = JSON.parse(savedLeague);
    setLeagueName(data.name);
    setPlayers(data.players || []);
    setMatches(data.matches || []);
    const today = new Date().toISOString().split('T')[0];
    setMatchDate(today);

    // Load previous rankings
    const savedPreviousRankings = localStorage.getItem(PREVIOUS_RANKINGS_KEY);
    if (savedPreviousRankings) {
      setPreviousRankings(JSON.parse(savedPreviousRankings));
    }

    // Load finished dates
    const savedFinishedDates = localStorage.getItem(FINISHED_DATES_KEY);
    if (savedFinishedDates) {
      setFinishedDates(JSON.parse(savedFinishedDates));
    }
  }, [router, showToast]);

  useEffect(() => {
    if (leagueName) {
        const data = { name: leagueName, players, matches, savedAt: new Date().toISOString() };
        localStorage.setItem("current-league", JSON.stringify(data));
        if (slotIndex) localStorage.setItem(`league-slot-${slotIndex}`, JSON.stringify(data));
    }
  }, [matches, leagueName, players, slotIndex]);

  const rankings = useMemo(() => calculateRanking(players, matches), [players, matches]);

  // Enhanced rankings with rank change info
  const rankingsWithChange: PlayerWithRank[] = useMemo(() => {
    return rankings.map((r, idx) => {
      const currentRank = idx + 1;
      const previousRank = previousRankings[r.playerId];
      const rankChange = previousRank !== undefined ? previousRank - currentRank : 0;
      return {
        ...r,
        currentRank,
        previousRank,
        rankChange,
      };
    });
  }, [rankings, previousRankings]);

  // Get unique match dates for the quick date picker
  const matchDates = useMemo(() => {
    return [...new Set(matches.map(m => m.date))];
  }, [matches]);

  const toggleMatchPlayer = (id: string) => {
    if (selectedForMatch.includes(id)) setSelectedForMatch(selectedForMatch.filter(pid => pid !== id));
    else setSelectedForMatch([...selectedForMatch, id]);
  };

  const handleCreateMatch = (type: 'MIXED' | 'DOUBLES' | 'SINGLES' | 'MANUAL') => {
    if (!matchDate) {
      showToast("날짜를 선택해주세요.", "warning");
      return;
    }
    const pool = [guestMale, guestFemale, ...players].filter(p => selectedForMatch.includes(p.id));

    try {
        let newMatches: Match[] = [];
        if (type === 'MIXED') {
            const proposedMatches = generateMixedDoublesSchedule(pool, matchDate);
            if (proposedMatches.length === 0) {
              showToast("매칭 가능한 조합이 없습니다.", "error");
              return;
            }
            setPendingMixedMatches(proposedMatches);
            return;
        } else if (type === 'DOUBLES') newMatches = generateDoubles(pool, matchDate);
        else if (type === 'SINGLES') newMatches = generateSingles(pool, matchDate);
        else if (type === 'MANUAL') newMatches = [{ id: uuidv4(), date: matchDate, teamA: { id: uuidv4(), man: pool[0]||guestMale, woman: pool[1]||guestFemale }, teamB: { id: uuidv4(), man: pool[2]||guestMale, woman: pool[3]||guestFemale }, scoreA: 0, scoreB: 0, isFinished: false }];

        if (newMatches.length > 0) {
            setMatches([...matches, ...newMatches]);
            setIsMatchViewOpen(false);
            setSelectedForMatch([]);
            showToast(`${newMatches.length}개의 게임이 생성되었습니다.`, "success");
        }
    } catch (e: any) {
      showToast(e.message, "error");
    }
  };

  // Pending scores state for each match (not yet committed)
  const [pendingScores, setPendingScores] = useState<Record<string, { scoreA: number; scoreB: number }>>({});

  const updatePendingScore = useCallback((matchId: string, team: 'A' | 'B', score: number) => {
    const safeScore = Math.min(6, Math.max(0, score));
    setPendingScores(prev => {
      const current = prev[matchId] || { scoreA: 0, scoreB: 0 };
      return {
        ...prev,
        [matchId]: {
          ...current,
          scoreA: team === 'A' ? safeScore : current.scoreA,
          scoreB: team === 'B' ? safeScore : current.scoreB,
        }
      };
    });
  }, []);

  const commitScore = useCallback((matchId: string) => {
    const pending = pendingScores[matchId];
    if (!pending) return;

    setMatches(prev => {
      const oldMatches = [...prev];
      const matchIndex = prev.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return prev;

      const oldMatch = prev[matchIndex];
      const newMatch = {
        ...oldMatch,
        scoreA: pending.scoreA,
        scoreB: pending.scoreB,
        isFinished: true
      };

      // Push undo action
      pushAction('점수 입력', oldMatches, () => setMatches(oldMatches));

      return prev.map(m => m.id === matchId ? newMatch : m);
    });

    // Clear pending score after commit
    setPendingScores(prev => {
      const newPending = { ...prev };
      delete newPending[matchId];
      return newPending;
    });
  }, [pendingScores, pushAction]);

  const cancelFinished = useCallback((matchId: string) => {
    setMatches(prev => {
      const oldMatches = [...prev];
      const matchIndex = prev.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return prev;

      const oldMatch = prev[matchIndex];

      // Set pending scores to current scores for editing
      setPendingScores(p => ({
        ...p,
        [matchId]: { scoreA: oldMatch.scoreA, scoreB: oldMatch.scoreB }
      }));

      const newMatch = {
        ...oldMatch,
        isFinished: false
      };

      // Push undo action
      pushAction('점수 수정 취소', oldMatches, () => setMatches(oldMatches));

      return prev.map(m => m.id === matchId ? newMatch : m);
    });
  }, [pushAction]);

  const deleteMatch = useCallback((matchId: string) => {
    const matchToDelete = matches.find(m => m.id === matchId);
    if (!matchToDelete) return;

    setMatches(prev => prev.filter(m => m.id !== matchId));
    setDeleteMatchId(null);
    showToast("경기가 삭제되었습니다.", "success");

    // Push undo action
    pushAction('경기 삭제', matches, () => setMatches(matches));
  }, [matches, showToast, pushAction]);

  const handleManualSave = () => {
    // Save current rankings as previous for next session
    const currentRankingsMap: Record<string, number> = {};
    rankings.forEach((r, idx) => {
      currentRankingsMap[r.playerId] = idx + 1;
    });
    localStorage.setItem(PREVIOUS_RANKINGS_KEY, JSON.stringify(currentRankingsMap));

    if (slotIndex) {
        const data = { name: leagueName, players, matches, savedAt: new Date().toISOString() };
        localStorage.setItem(`league-slot-${slotIndex}`, JSON.stringify(data));
        showToast(`SLOT ${slotIndex}에 저장되었습니다!`, "success");
    } else {
        showToast("저장되었습니다.", "success");
    }
  };

  const handleFinishDailyGame = () => {
    if(!matchDate) {
      showToast("날짜가 선택되지 않았습니다.", "warning");
      return;
    }
    const result = calculateDailyMvp(players, matches, matchDate);
    if (!result.maleMvp && !result.femaleMvp) {
      showToast("완료된 경기 기록이 없습니다.", "warning");
      return;
    }
    setMvpResult(result);
    setShowMvpDialog(true);
  };

  const confirmMvpAward = () => {
    if (!mvpResult) return;

    const updatedPlayers = players.map(p => {
        let bonus = p.bonusPoints || 0;
        if (mvpResult.maleMvp && p.id === mvpResult.maleMvp.id) bonus += 2;
        if (mvpResult.femaleMvp && p.id === mvpResult.femaleMvp.id) bonus += 2;
        return { ...p, bonusPoints: bonus };
    });
    setPlayers(updatedPlayers);

    // Mark date as finished to prevent duplicate MVP awards
    const newFinishedDates = [...finishedDates, matchDate];
    setFinishedDates(newFinishedDates);
    localStorage.setItem(FINISHED_DATES_KEY, JSON.stringify(newFinishedDates));

    setShowMvpDialog(false);
    setMvpResult(null);
    showToast("MVP 보너스 점수가 반영되었습니다! 👑", "success");
  };

  const handleDeleteLeague = () => {
    localStorage.removeItem("current-league");
    if(slotIndex) localStorage.removeItem(`league-slot-${slotIndex}`);
    setShowDeleteLeagueDialog(false);
    showToast("리그가 삭제되었습니다.", "success");
    router.push("/");
  };

  const handlePlayerClick = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayer(player);
      setShowPlayerStats(true);
    }
  };

  const confirmMixedMatchCreation = useCallback(() => {
    if (!pendingMixedMatches) return;
    setMatches(prev => [...prev, ...pendingMixedMatches]);
    setIsMatchViewOpen(false);
    setSelectedForMatch([]);
    showToast(`${pendingMixedMatches.length}개의 게임이 생성되었습니다.`, "success");
    setPendingMixedMatches(null);
  }, [pendingMixedMatches, showToast]);

  const displayedMatches = matches.filter(m => m.date === matchDate);
  const selectedPlayerStats = selectedPlayer
    ? rankings.find(r => r.playerId === selectedPlayer.id) || null
    : null;

  return (
    <main className="max-w-md mx-auto min-h-screen bg-white pb-40 relative">
      <header className="p-4 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
            {slotIndex && <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded font-bold">SLOT {slotIndex}</span>}
        </div>
        <button
          onClick={() => setIsHistoryOpen(true)}
          className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-bold text-xs border border-green-200 touch-target cursor-pointer active:scale-[0.98] transition-transform"
          aria-label="경기 기록 보기"
        >
          <Table size={14}/> 기록
        </button>
      </header>

      <div className="px-4 space-y-6 pt-4">
        <div className="text-center">
          <h1 className="text-2xl font-black text-slate-800 flex justify-center items-center gap-2">
            <span className="text-blue-600">-</span> {leagueName} <span className="text-blue-600">-</span>
          </h1>
        </div>

        {/* Ranking Section */}
        <section>
          <h2 className="text-sm font-bold text-slate-500 mb-3 flex items-center gap-2">
            <Trophy size={16} /> 실시간 랭킹
          </h2>
          <div className="space-y-2">
            {rankingsWithChange.map((r) => (
              <RankingRow
                key={r.playerId}
                player={r}
                onClick={() => handlePlayerClick(r.playerId)}
              />
            ))}
            {rankingsWithChange.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Trophy size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm mb-3">아직 랭킹 데이터가 없습니다.</p>
                <button
                  onClick={() => setIsMatchViewOpen(true)}
                  className="text-sm text-blue-600 font-bold hover:underline cursor-pointer"
                >
                  + 게임 등록하기
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Game Registration Section */}
        <section>
          <button
            onClick={() => setIsMatchViewOpen(!isMatchViewOpen)}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-md touch-target ${isMatchViewOpen ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white'}`}
            aria-expanded={isMatchViewOpen}
          >
            {isMatchViewOpen ? <XCircle size={20}/> : <PlusCircle size={20}/>}
            {isMatchViewOpen ? '닫기' : '게임 등록'}
          </button>

          {isMatchViewOpen && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 animate-scale-in">
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-2">경기 날짜</label>
                <QuickDatePicker
                  selectedDate={matchDate}
                  onChange={setMatchDate}
                  matchDates={matchDates}
                />
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 mb-2">참가 선수 선택</label>
                <div className="grid grid-cols-3 gap-2">
                  {[guestMale, guestFemale, ...players].map(p => (
                    <button
                      key={p.id}
                      onClick={() => toggleMatchPlayer(p.id)}
                      className={`p-3 rounded-lg border text-center text-xs font-bold transition-all touch-target ${
                        selectedForMatch.includes(p.id)
                          ? 'bg-blue-100 border-blue-500 text-blue-700'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                      aria-pressed={selectedForMatch.includes(p.id)}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => handleCreateMatch('MIXED')}
                  className="w-full bg-blue-50 border-2 border-blue-200 text-blue-700 py-3 rounded-xl font-bold touch-target cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <Shuffle size={16} className="inline -mt-0.5" /> 혼복 풀리그
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleCreateMatch('DOUBLES')}
                    className="bg-white border text-slate-600 py-3 rounded-xl font-bold text-sm touch-target cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <Users size={14} className="inline -mt-0.5" /> 복식
                  </button>
                  <button
                    onClick={() => handleCreateMatch('SINGLES')}
                    className="bg-white border text-slate-600 py-3 rounded-xl font-bold text-sm touch-target cursor-pointer active:scale-[0.98] transition-transform"
                  >
                    <User size={14} className="inline -mt-0.5" /> 단식
                  </button>
                </div>
                <button
                  onClick={() => handleCreateMatch('MANUAL')}
                  className="w-full bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm touch-target cursor-pointer active:scale-[0.98] transition-transform"
                >
                  <Edit3 size={14} className="inline -mt-0.5" /> 수동
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Match List Section */}
        <section className="space-y-3">
          {displayedMatches.length === 0 && (
            <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-300">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm mb-3">{matchDate} 진행된 게임이 없습니다.</p>
              <button
                onClick={() => setIsMatchViewOpen(true)}
                className="text-sm text-blue-600 font-bold hover:underline cursor-pointer"
              >
                + 게임 등록하기
              </button>
            </div>
          )}

          {displayedMatches.map((m, idx) => {
            const pending = pendingScores[m.id];
            const displayScoreA = pending ? pending.scoreA : m.scoreA;
            const displayScoreB = pending ? pending.scoreB : m.scoreB;
            const hasPendingScore = !!pending;

            return (
              <SwipeableItem
                key={m.id}
                onDelete={() => setDeleteMatchId(m.id)}
              >
                <div className={`p-4 rounded-xl border shadow-sm transition-colors ${
                  m.isFinished ? 'bg-green-50/50 border-green-200' : 'bg-white border-slate-200'
                }`}>
                  {/* Header */}
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-blue-600">GAME {idx + 1}</span>
                    {m.isFinished && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">
                        경기종료
                      </span>
                    )}
                  </div>

                  {/* Team A */}
                  <div className="mb-3">
                    <div className="text-sm font-bold text-slate-700 mb-2">
                      {m.teamA.man.name}
                      {m.teamA.man.id !== m.teamA.woman.id && (
                        <span className="text-slate-400"> & {m.teamA.woman.name}</span>
                      )}
                    </div>
                    <ScoreInput
                      value={displayScoreA}
                      onChange={(score) => updatePendingScore(m.id, 'A', score)}
                      disabled={m.isFinished}
                    />
                  </div>

                  {/* VS */}
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 border-t border-slate-200" />
                    <span className="text-xs font-bold text-slate-400">VS</span>
                    <div className="flex-1 border-t border-slate-200" />
                  </div>

                  {/* Team B */}
                  <div className="mb-3">
                    <div className="text-sm font-bold text-slate-700 mb-2">
                      {m.teamB.man.name}
                      {m.teamB.man.id !== m.teamB.woman.id && (
                        <span className="text-slate-400"> & {m.teamB.woman.name}</span>
                      )}
                    </div>
                    <ScoreInput
                      value={displayScoreB}
                      onChange={(score) => updatePendingScore(m.id, 'B', score)}
                      disabled={m.isFinished}
                    />
                  </div>

                  {/* Complete/Cancel Button */}
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    {m.isFinished ? (
                      <button
                        onClick={() => cancelFinished(m.id)}
                        className="w-full py-2.5 rounded-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors touch-target"
                      >
                        수정하기
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (!hasPendingScore) {
                            // Initialize pending scores if not set
                            setPendingScores(p => ({
                              ...p,
                              [m.id]: { scoreA: displayScoreA, scoreB: displayScoreB }
                            }));
                          }
                          commitScore(m.id);
                        }}
                        disabled={!hasPendingScore}
                        className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors touch-target ${
                          hasPendingScore
                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        완료
                      </button>
                    )}
                  </div>
                </div>
              </SwipeableItem>
            );
          })}
        </section>

        {/* Daily MVP Button + Share Button */}
        {displayedMatches.length > 0 && (
          <section className="flex gap-2">
            {finishedDates.includes(matchDate) ? (
              <div className="flex-1 bg-slate-300 text-slate-500 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 cursor-not-allowed">
                <Medal size={20} /> [{matchDate}] 게임 종료 완료
              </div>
            ) : (
              <button
                onClick={handleFinishDailyGame}
                className="flex-1 bg-slate-800 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg hover:bg-slate-700 touch-target"
              >
                <Medal size={20} className="text-yellow-400" /> [{matchDate}] 게임 종료
              </button>
            )}
            <ShareButton
              leagueName={leagueName}
              matchDate={matchDate}
              matches={matches}
              rankings={rankingsWithChange}
            />
          </section>
        )}

        {/* Bottom Action Bar */}
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-slate-100 max-w-md mx-auto flex gap-2 z-30">
          <button
            onClick={handleManualSave}
            className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg touch-target"
          >
            <Save size={18}/> 저장하기
          </button>
          <button
            onClick={() => setShowDeleteLeagueDialog(true)}
            className="px-4 bg-slate-100 text-red-400 rounded-xl font-bold touch-target"
            aria-label="리그 삭제"
          >
            <Trash2 size={18}/>
          </button>
        </div>
      </div>

      {/* History Modal */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl animate-scale-in">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
              <h3 className="font-bold text-lg flex items-center gap-2">경기 히스토리 (전체)</h3>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-slate-200 rounded-full touch-target" aria-label="닫기">
                <X size={24}/>
              </button>
            </div>
            <div className="overflow-auto p-4 flex-1 space-y-3">
              {matches.slice(0).reverse().map((m) => {
                const winner = m.scoreA > m.scoreB ? 'A' : (m.scoreB > m.scoreA ? 'B' : null);
                return (
                  <div key={m.id} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-slate-500 font-medium">{m.date}</span>
                      {m.isFinished && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">완료</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex-1 text-right ${winner === 'A' ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                        <div className="text-sm">{m.teamA.man.name}</div>
                        {m.teamA.man.id !== m.teamA.woman.id && (
                          <div className="text-xs text-slate-400">{m.teamA.woman.name}</div>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-center">
                        <span className={`text-lg font-black ${winner === 'A' ? 'text-blue-600' : 'text-slate-800'}`}>{m.scoreA}</span>
                        <span className="text-slate-400 mx-1">:</span>
                        <span className={`text-lg font-black ${winner === 'B' ? 'text-blue-600' : 'text-slate-800'}`}>{m.scoreB}</span>
                      </div>
                      <div className={`flex-1 text-left ${winner === 'B' ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                        <div className="text-sm">{m.teamB.man.name}</div>
                        {m.teamB.man.id !== m.teamB.woman.id && (
                          <div className="text-xs text-slate-400">{m.teamB.woman.name}</div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {matches.length === 0 && (
                <div className="text-center py-8 text-slate-400">
                  경기 기록이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Match Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!deleteMatchId}
        title="경기 삭제"
        message="이 경기 기록을 삭제하시겠습니까?"
        confirmText="삭제"
        variant="danger"
        onConfirm={() => deleteMatchId && deleteMatch(deleteMatchId)}
        onCancel={() => setDeleteMatchId(null)}
      />

      {/* Delete League Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteLeagueDialog}
        title="리그 삭제"
        message="이 리그의 모든 데이터가 삭제됩니다."
        confirmText="삭제"
        variant="danger"
        requireDoubleConfirm
        onConfirm={handleDeleteLeague}
        onCancel={() => setShowDeleteLeagueDialog(false)}
      />

      {/* Mixed Match Creation Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!pendingMixedMatches}
        title="게임 생성"
        message={`총 ${pendingMixedMatches?.length || 0}개의 게임이 생성됩니다. 진행하시겠습니까?`}
        confirmText="생성"
        onConfirm={confirmMixedMatchCreation}
        onCancel={() => setPendingMixedMatches(null)}
      />

      {/* MVP Award Dialog */}
      {showMvpDialog && mvpResult && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 text-center">
              <Crown className="w-12 h-12 mx-auto text-white mb-2" />
              <h3 className="text-xl font-bold text-white">{matchDate} 게임 종료</h3>
            </div>
            <div className="p-6 space-y-4">
              {mvpResult.maleMvp && (
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Crown size={20} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-blue-600 font-medium">남자 MVP</div>
                    <div className="font-bold text-slate-900">{mvpResult.maleMvp.name}</div>
                    <div className="text-xs text-slate-500">
                      승률 {(mvpResult.maleMvp.winRate * 100).toFixed(0)}%
                    </div>
                  </div>
                  <span className="text-lg font-bold text-blue-600">+2점</span>
                </div>
              )}
              {mvpResult.femaleMvp && (
                <div className="flex items-center gap-4 p-4 bg-pink-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <Crown size={20} className="text-pink-600" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-pink-600 font-medium">여자 MVP</div>
                    <div className="font-bold text-slate-900">{mvpResult.femaleMvp.name}</div>
                    <div className="text-xs text-slate-500">
                      승률 {(mvpResult.femaleMvp.winRate * 100).toFixed(0)}%
                    </div>
                  </div>
                  <span className="text-lg font-bold text-pink-600">+2점</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowMvpDialog(false);
                  setMvpResult(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors touch-target"
              >
                취소
              </button>
              <button
                onClick={confirmMvpAward}
                className="flex-1 py-3 px-4 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors touch-target"
              >
                보너스 부여
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Player Stats Modal */}
      <PlayerStatsModal
        isOpen={showPlayerStats}
        player={selectedPlayer}
        matches={matches}
        stats={selectedPlayerStats}
        onClose={() => {
          setShowPlayerStats(false);
          setSelectedPlayer(null);
        }}
      />
    </main>
  );
}
