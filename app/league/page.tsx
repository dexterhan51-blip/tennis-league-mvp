"use client";

import { useState } from 'react';
import { Player } from '@/types';
import { Table, Save, Medal, Flag } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import MatchCreatedDialog from '@/components/match/MatchCreatedDialog';
import ManualMatchDialog from '@/components/match/ManualMatchDialog';
import SlotAssignmentDialog from '@/components/match/SlotAssignmentDialog';
import PlayerStatsModal from '@/components/ranking/PlayerStatsModal';
import ShareButton from '@/components/share/ShareButton';
import { LiveShareControl } from '@/components/live/LiveShareControl';
import EndSeasonDialog from '@/components/season/EndSeasonDialog';
import RankingSection from '@/components/league/RankingSection';
import MatchRegistrationPanel from '@/components/league/MatchRegistrationPanel';
import MatchList from '@/components/league/MatchList';
import MatchHistoryModal from '@/components/league/MatchHistoryModal';
import MvpAwardDialog from '@/components/league/MvpAwardDialog';
import { useLeagueData } from '@/hooks/useLeagueData';
import { useLeagueRankings } from '@/hooks/useLeagueRankings';
import { useMatchManagement, type MatchCreationType } from '@/hooks/useMatchManagement';
import { useLeagueSync } from '@/hooks/useLeagueSync';
import { usePlayerCareerStats } from '@/hooks/usePlayerCareerStats';

export default function LeaguePage() {
  const {
    leagueName, players, setPlayers, matches, setMatches,
    slotIndex, previousRankings, finishedDates, setFinishedDates,
    isLoading, handleManualSave, handleEndSeason,
  } = useLeagueData();

  const [matchDate, setMatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isExhibition, setIsExhibition] = useState(false);
  const [courtMinutes, setCourtMinutes] = useState(120);
  const [gameMinutes, setGameMinutes] = useState(20);
  const [isMatchViewOpen, setIsMatchViewOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [deleteMatchId, setDeleteMatchId] = useState<string | null>(null);
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
    pendingScores,
    selectedForMatch, pendingMixedMatches, setPendingMixedMatches,
    mvpResult, showMvpDialog, setShowMvpDialog, setMvpResult,
    maleGuestCount, femaleGuestCount, setMaleGuestCount, setFemaleGuestCount,
    guestPlayers,
    createdMatches, createdMatchType, closeCreatedDialog, handleReshuffle,
    showManualDialog, setShowManualDialog, confirmManualMatch,
    slotAssignment, confirmSlotAssignment, cancelSlotAssignment,
    toggleMatchPlayer, handleCreateMatch, confirmMixedMatchCreation,
    updatePendingScore, commitScore, cancelFinished, deleteMatch,
    handleFinishDailyGame, confirmMvpAward, handleRecalculateMvp,
  } = useMatchManagement({
    players, setPlayers, matches, setMatches,
    matchDate, finishedDates, setFinishedDates,
    isExhibition,
    courtMinutes,
    gameMinutes,
  });

  const handlePlayerClick = (playerId: string) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayer(player);
      setShowPlayerStats(true);
    }
  };

  const onCreateMatch = (type: MatchCreationType) => {
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

        <RankingSection
          rankings={rankingsWithChange}
          players={players}
          showRecalculate={finishedDates.length > 0}
          onRecalculateMvp={handleRecalculateMvp}
          onPlayerClick={handlePlayerClick}
          onOpenRegistration={() => setIsMatchViewOpen(true)}
        />

        <MatchRegistrationPanel
          isOpen={isMatchViewOpen}
          onToggle={() => setIsMatchViewOpen(!isMatchViewOpen)}
          matchDate={matchDate}
          onChangeDate={setMatchDate}
          matchDates={matchDates}
          maleGuestCount={maleGuestCount}
          femaleGuestCount={femaleGuestCount}
          setMaleGuestCount={setMaleGuestCount}
          setFemaleGuestCount={setFemaleGuestCount}
          courtMinutes={courtMinutes}
          setCourtMinutes={setCourtMinutes}
          gameMinutes={gameMinutes}
          setGameMinutes={setGameMinutes}
          isExhibition={isExhibition}
          onToggleExhibition={() => setIsExhibition(!isExhibition)}
          players={players}
          guestPlayers={guestPlayers}
          selectedForMatch={selectedForMatch}
          onTogglePlayer={toggleMatchPlayer}
          onCreateMatch={onCreateMatch}
        />

        <MatchList
          matches={displayedMatches}
          matchDate={matchDate}
          pendingScores={pendingScores}
          onUpdateScore={updatePendingScore}
          onCommitScore={commitScore}
          onCancelFinished={cancelFinished}
          onRequestDelete={setDeleteMatchId}
          onOpenRegistration={() => setIsMatchViewOpen(true)}
        />

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

      <MatchHistoryModal
        isOpen={isHistoryOpen}
        matches={matches}
        onClose={() => setIsHistoryOpen(false)}
      />

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

      {/* Slot Assignment (고정 템플릿) Dialog */}
      {slotAssignment && (
        <SlotAssignmentDialog
          templateKey={slotAssignment.templateKey}
          men={slotAssignment.men}
          women={slotAssignment.women}
          onConfirm={(orderedMen, orderedWomen) => {
            confirmSlotAssignment(orderedMen, orderedWomen);
            setIsMatchViewOpen(false);
          }}
          onClose={cancelSlotAssignment}
        />
      )}

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

      <MvpAwardDialog
        isOpen={showMvpDialog && !!mvpResult}
        matchDate={matchDate}
        maleMvp={mvpResult?.maleMvp ?? null}
        femaleMvp={mvpResult?.femaleMvp ?? null}
        onConfirm={confirmMvpAward}
        onCancel={() => { setShowMvpDialog(false); setMvpResult(null); }}
      />

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
