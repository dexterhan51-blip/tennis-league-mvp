"use client";

import { useState } from 'react';
import { Player } from '@/types';
import { isGuestPlayer } from '@/utils/tennisLogic';
import { Trophy, Trash2, PlusCircle, XCircle, Calendar, Table, Save, X, Crown, Medal, Minus, Plus, Shuffle, Users, User, Edit3, Flag } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import MatchCreatedDialog from '@/components/match/MatchCreatedDialog';
import ManualMatchDialog from '@/components/match/ManualMatchDialog';
import SwipeableItem from '@/components/ui/SwipeableItem';
import ScoreInput from '@/components/ui/ScoreInput';
import QuickDatePicker from '@/components/navigation/QuickDatePicker';
import RankingRow from '@/components/ranking/RankingRow';
import PlayerStatsModal from '@/components/ranking/PlayerStatsModal';
import ShareButton from '@/components/share/ShareButton';
import { LiveShareControl } from '@/components/live/LiveShareControl';
import EndSeasonDialog from '@/components/season/EndSeasonDialog';
import { useLeagueData } from '@/hooks/useLeagueData';
import { useLeagueRankings } from '@/hooks/useLeagueRankings';
import { useMatchManagement } from '@/hooks/useMatchManagement';
import { useLeagueSync } from '@/hooks/useLeagueSync';
import { usePlayerCareerStats } from '@/hooks/usePlayerCareerStats';

export default function LeaguePage() {
  const {
    leagueName, players, setPlayers, matches, setMatches,
    slotIndex, previousRankings, finishedDates, setFinishedDates,
    isLoading, handleManualSave, handleDeleteLeague, handleEndSeason,
  } = useLeagueData();

  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isExhibition, setIsExhibition] = useState(false);
  const [isMatchViewOpen, setIsMatchViewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
  const [showDeleteLeagueDialog, setShowDeleteLeagueDialog] = useState(false);
  const [showEndSeasonDialog, setShowEndSeasonDialog] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [showPlayerStats, setShowPlayerStats] = useState(false);

  const { careerStats, getPlayerCareer } = usePlayerCareerStats();
  const { rankings, rankingsWithChange, matchDates } = useLeagueRankings(players, matches, previousRankings, careerStats);

  const {
    isConfigured: isSyncConfigured,
    isPublished,
    isSyncing,
    shareUrl,
    publish: publishLeague,
    unpublish: unpublishLeague,
  } = useLeagueSync({ leagueName, players, matches });

  const {
    pendingScores, setPendingScores,
    selectedForMatch, pendingMixedMatches, setPendingMixedMatches,
    mvpResult, showMvpDialog, setShowMvpDialog, setMvpResult,
    maleGuestCount, femaleGuestCount, setMaleGuestCount, setFemaleGuestCount,
    guestPlayers,
    createdMatches, createdMatchType, closeCreatedDialog, handleReshuffle,
    showManualDialog, setShowManualDialog, confirmManualMatch,
    toggleMatchPlayer, handleCreateMatch, confirmMixedMatchCreation,
    updatePendingScore, commitScore, cancelFinished, deleteMatch,
    handleFinishDailyGame, confirmMvpAward,
  } = useMatchManagement({
    players, setPlayers, matches, setMatches,
    matchDate, finishedDates, setFinishedDates,
    isExhibition,
  });

  const handlePlayerClick = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayer(player);
      setShowPlayerStats(true);
    }
  };

  const onCreateMatch = (type: 'MIXED' | 'DOUBLES' | 'SINGLES' | 'MANUAL') => {
    const result = handleCreateMatch(type);
    if (result === true) setIsMatchViewOpen(false);
  };

  const onConfirmMixedMatch = () => {
    const result = confirmMixedMatchCreation();
    if (result === true) setIsMatchViewOpen(false);
  };

  const displayedMatches = matches.filter(m => m.date === matchDate);
  const seasonMatchDays = [...new Set(matches.map(m => m.date))].length;
  const seasonTotalMatches = matches.filter(m => m.isFinished && !m.isExhibition).length;
  const seasonChampion = rankings.length > 0 ? rankings[0] : null;
  const selectedPlayerStats = selectedPlayer
    ? rankings.find(r => r.playerId === selectedPlayer.id) || null
    : null;

  if (isLoading) {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-white flex items-center justify-center">
        <div className="text-slate-400 text-sm">불러오는 중...</div>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto min-h-screen bg-white pb-40 relative">
      <header className="p-4 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-2">
          {slotIndex && <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded font-bold">SLOT {slotIndex}</span>}
        </div>
        <div className="flex items-center gap-2">
          <LiveShareControl
            isConfigured={isSyncConfigured}
            isPublished={isPublished}
            isSyncing={isSyncing}
            shareUrl={shareUrl}
            onPublish={publishLeague}
            onUnpublish={unpublishLeague}
          />
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-bold text-xs border border-green-200 touch-target cursor-pointer active:scale-[0.98] transition-transform"
            aria-label="경기 기록 보기"
          >
            <Table size={14}/> 기록
          </button>
        </div>
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
              <RankingRow key={r.playerId} player={r} onClick={() => handlePlayerClick(r.playerId)} />
            ))}
            {rankingsWithChange.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Trophy size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm mb-3">아직 랭킹 데이터가 없습니다.</p>
                <button onClick={() => setIsMatchViewOpen(true)} className="text-sm text-blue-600 font-bold hover:underline cursor-pointer">
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
            <div className={`mt-4 p-4 rounded-xl border-2 animate-scale-in ${isExhibition ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-2">경기 날짜</label>
                <QuickDatePicker selectedDate={matchDate} onChange={setMatchDate} matchDates={matchDates} />
              </div>

              {/* Guest Counter */}
              <div className="mb-4 p-3 bg-white rounded-lg border border-dashed border-slate-300">
                <label className="block text-xs font-bold text-slate-500 mb-2">게스트</label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">남자</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setMaleGuestCount(maleGuestCount - 1)}
                        disabled={maleGuestCount <= 0}
                        className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors touch-target"
                        aria-label="남자 게스트 감소"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-bold text-slate-800">{maleGuestCount}</span>
                      <button
                        onClick={() => setMaleGuestCount(maleGuestCount + 1)}
                        className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors touch-target"
                        aria-label="남자 게스트 증가"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">여자</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setFemaleGuestCount(femaleGuestCount - 1)}
                        disabled={femaleGuestCount <= 0}
                        className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors touch-target"
                        aria-label="여자 게스트 감소"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-bold text-slate-800">{femaleGuestCount}</span>
                      <button
                        onClick={() => setFemaleGuestCount(femaleGuestCount + 1)}
                        className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors touch-target"
                        aria-label="여자 게스트 증가"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Exhibition Toggle */}
              <div className="mb-4">
                <button
                  onClick={() => setIsExhibition(!isExhibition)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                    isExhibition
                      ? 'bg-amber-50 border-amber-400 text-amber-700'
                      : 'bg-white border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Flag size={16} />
                    <span className="font-bold text-sm">시범경기 모드</span>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-colors relative ${isExhibition ? 'bg-amber-400' : 'bg-slate-300'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isExhibition ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                  </div>
                </button>
                {isExhibition && (
                  <p className="text-xs text-amber-600 mt-1 ml-1">랭킹에 반영되지 않습니다</p>
                )}
              </div>

              {/* Player Selection */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-500 mb-2">참가 선수 선택</label>
                <div className="grid grid-cols-3 gap-2">
                  {[...guestPlayers, ...players].map(p => {
                    const isGuest = isGuestPlayer(p.id);
                    const isSelected = selectedForMatch.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleMatchPlayer(p.id)}
                        disabled={isGuest}
                        className={`p-3 rounded-lg border text-center text-xs font-bold transition-all touch-target ${
                          isSelected
                            ? isGuest
                              ? 'bg-blue-50 border-blue-400 border-dashed text-blue-600 cursor-default'
                              : 'bg-blue-100 border-blue-500 text-blue-700'
                            : 'bg-white border-slate-200 hover:bg-slate-50'
                        }`}
                        aria-pressed={isSelected}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                <button onClick={() => onCreateMatch('MIXED')} className="w-full bg-blue-50 border-2 border-blue-200 text-blue-700 py-3 rounded-xl font-bold touch-target cursor-pointer active:scale-[0.98] transition-transform">
                  <Shuffle size={16} className="inline -mt-0.5" /> 혼복 풀리그
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => onCreateMatch('DOUBLES')} className="bg-white border text-slate-600 py-3 rounded-xl font-bold text-sm touch-target cursor-pointer active:scale-[0.98] transition-transform">
                    <Users size={14} className="inline -mt-0.5" /> 복식
                  </button>
                  <button onClick={() => onCreateMatch('SINGLES')} className="bg-white border text-slate-600 py-3 rounded-xl font-bold text-sm touch-target cursor-pointer active:scale-[0.98] transition-transform">
                    <User size={14} className="inline -mt-0.5" /> 단식
                  </button>
                </div>
                <button onClick={() => onCreateMatch('MANUAL')} className="w-full bg-slate-200 text-slate-600 py-3 rounded-xl font-bold text-sm touch-target cursor-pointer active:scale-[0.98] transition-transform">
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
              <button onClick={() => setIsMatchViewOpen(true)} className="text-sm text-blue-600 font-bold hover:underline cursor-pointer">
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
              <SwipeableItem key={m.id} onDelete={() => setDeleteMatchId(m.id)}>
                <div className={`p-4 rounded-xl border shadow-sm transition-colors ${m.isFinished ? 'bg-green-50/50 border-green-200' : 'bg-white border-slate-200'}`}>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-blue-600">GAME {idx + 1}</span>
                      {m.isExhibition && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-xs font-bold">시범</span>}
                    </div>
                    {m.isFinished && <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-bold">경기종료</span>}
                  </div>

                  <div className="mb-3">
                    <div className="text-sm font-bold text-slate-700 mb-2">
                      {m.teamA.man.name}
                      {m.teamA.man.id !== m.teamA.woman.id && <span className="text-slate-400"> & {m.teamA.woman.name}</span>}
                    </div>
                    <ScoreInput value={displayScoreA} onChange={(score) => updatePendingScore(m.id, 'A', score)} disabled={m.isFinished} />
                  </div>

                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 border-t border-slate-200" />
                    <span className="text-xs font-bold text-slate-400">VS</span>
                    <div className="flex-1 border-t border-slate-200" />
                  </div>

                  <div className="mb-3">
                    <div className="text-sm font-bold text-slate-700 mb-2">
                      {m.teamB.man.name}
                      {m.teamB.man.id !== m.teamB.woman.id && <span className="text-slate-400"> & {m.teamB.woman.name}</span>}
                    </div>
                    <ScoreInput value={displayScoreB} onChange={(score) => updatePendingScore(m.id, 'B', score)} disabled={m.isFinished} />
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200">
                    {m.isFinished ? (
                      <button onClick={() => cancelFinished(m.id)} className="w-full py-2.5 rounded-lg font-bold text-sm bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors touch-target">
                        수정하기
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (!hasPendingScore) {
                            setPendingScores(p => ({ ...p, [m.id]: { scoreA: displayScoreA, scoreB: displayScoreB } }));
                          }
                          commitScore(m.id);
                        }}
                        disabled={!hasPendingScore}
                        className={`w-full py-2.5 rounded-lg font-bold text-sm transition-colors touch-target ${hasPendingScore ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
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
            <ShareButton leagueName={leagueName} matchDate={matchDate} matches={matches} rankings={rankingsWithChange} />
          </section>
        )}

        {/* Bottom Action Bar */}
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-slate-100 max-w-md mx-auto flex gap-2 z-30">
          <button onClick={() => handleManualSave(rankings)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg touch-target">
            <Save size={18}/> 저장하기
          </button>
          <button onClick={() => setShowEndSeasonDialog(true)} className="px-4 bg-amber-50 text-amber-600 border border-amber-200 rounded-xl font-bold touch-target" aria-label="시즌 종료">
            <Flag size={18}/>
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
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500 font-medium">{m.date}</span>
                        {m.isExhibition && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">시범</span>}
                      </div>
                      {m.isFinished && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">완료</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex-1 text-right ${winner === 'A' ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                        <div className="text-sm">{m.teamA.man.name}</div>
                        {m.teamA.man.id !== m.teamA.woman.id && <div className="text-xs text-slate-400">{m.teamA.woman.name}</div>}
                      </div>
                      <div className="flex-shrink-0 text-center">
                        <span className={`text-lg font-black ${winner === 'A' ? 'text-blue-600' : 'text-slate-800'}`}>{m.scoreA}</span>
                        <span className="text-slate-400 mx-1">:</span>
                        <span className={`text-lg font-black ${winner === 'B' ? 'text-blue-600' : 'text-slate-800'}`}>{m.scoreB}</span>
                      </div>
                      <div className={`flex-1 text-left ${winner === 'B' ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                        <div className="text-sm">{m.teamB.man.name}</div>
                        {m.teamB.man.id !== m.teamB.woman.id && <div className="text-xs text-slate-400">{m.teamB.woman.name}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {matches.length === 0 && <div className="text-center py-8 text-slate-400">경기 기록이 없습니다.</div>}
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
        onConfirm={() => { if (deleteMatchId) { deleteMatch(deleteMatchId); setDeleteMatchId(null); } }}
        onCancel={() => setDeleteMatchId(null)}
      />

      {/* End Season Dialog */}
      <EndSeasonDialog
        isOpen={showEndSeasonDialog}
        leagueName={leagueName}
        totalMatchDays={seasonMatchDays}
        totalMatches={seasonTotalMatches}
        champion={seasonChampion}
        onConfirm={(option) => {
          setShowEndSeasonDialog(false);
          handleEndSeason(option);
        }}
        onCancel={() => setShowEndSeasonDialog(false)}
      />

      {/* Match Created / Mixed Pending Dialog */}
      <MatchCreatedDialog
        isOpen={!!createdMatches && createdMatches.length > 0}
        matches={createdMatches || []}
        matchType={createdMatchType}
        isPending={!!pendingMixedMatches}
        onConfirm={onConfirmMixedMatch}
        onReshuffle={handleReshuffle}
        onClose={() => {
          if (pendingMixedMatches) {
            setPendingMixedMatches(null);
          }
          closeCreatedDialog();
        }}
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
                    <div className="text-xs text-slate-500">승률 {(mvpResult.maleMvp.winRate * 100).toFixed(0)}%</div>
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
                    <div className="text-xs text-slate-500">승률 {(mvpResult.femaleMvp.winRate * 100).toFixed(0)}%</div>
                  </div>
                  <span className="text-lg font-bold text-pink-600">+2점</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => { setShowMvpDialog(false); setMvpResult(null); }}
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

      {/* Manual Match Dialog */}
      <ManualMatchDialog
        isOpen={showManualDialog}
        players={players}
        guestPlayers={guestPlayers}
        onConfirm={(teamA, teamB) => {
          confirmManualMatch(teamA, teamB);
          setIsMatchViewOpen(false);
        }}
        onClose={() => setShowManualDialog(false)}
      />

      {/* Player Stats Modal */}
      <PlayerStatsModal
        isOpen={showPlayerStats}
        player={selectedPlayer}
        matches={matches}
        stats={selectedPlayerStats}
        onClose={() => { setShowPlayerStats(false); setSelectedPlayer(null); }}
        careerStats={selectedPlayer ? getPlayerCareer(selectedPlayer.id) ?? null : null}
        currentRank={selectedPlayer ? rankingsWithChange.find(r => r.playerId === selectedPlayer.id)?.currentRank : undefined}
      />
    </main>
  );
}
