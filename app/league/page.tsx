"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Player } from '@/types';
import { Table, Save, Medal, Flag, Film, Pencil, Radio, CloudOff, CloudUpload, CheckCircle2, Play, Database } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { copyToClipboard, generateBracketText } from '@/utils/shareUtils';
import { generateTimelineText, hasTimelineData } from '@/lib/timelineExport';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import AppLogo from '@/components/ui/AppLogo';
import MatchCreatedDialog from '@/components/match/MatchCreatedDialog';
import ManualMatchDialog from '@/components/match/ManualMatchDialog';
import SlotAssignmentDialog from '@/components/match/SlotAssignmentDialog';
import PlayerStatsModal from '@/components/ranking/PlayerStatsModal';
import ShareButton from '@/components/share/ShareButton';
import EndSeasonDialog from '@/components/season/EndSeasonDialog';
import RankingSection from '@/components/league/RankingSection';
import MatchRegistrationPanel from '@/components/league/MatchRegistrationPanel';
import MatchList from '@/components/league/MatchList';
import MatchHistoryModal from '@/components/league/MatchHistoryModal';
import MvpAwardDialog from '@/components/league/MvpAwardDialog';
import { useLeagueData } from '@/hooks/useLeagueData';
import { useLeagueRankings } from '@/hooks/useLeagueRankings';
import { useMatchManagement, type MatchCreationType } from '@/hooks/useMatchManagement';
import { usePlayerCareerStats } from '@/hooks/usePlayerCareerStats';

export default function LeaguePage() {
  const router = useRouter();
  const { showToast } = useToast();
  const {
    leagueName, seasonNo, players, setPlayers, matches, setMatches,
    previousRankings, finishedDates, setFinishedDates,
    isLoading, noLiveSeason, needsMigration, isOffline, pendingWrites,
    handleManualSave, handleEndSeason, handleRenameLeague,
  } = useLeagueData();

  const handleExportTimeline = async () => {
    const text = generateTimelineText(leagueName, matchDate, matches, players);
    if (!text) {
      showToast('내보낼 경기 타임라인이 없습니다.', 'warning');
      return;
    }
    const ok = await copyToClipboard(text);
    showToast(ok ? '경기 타임라인이 복사되었습니다.' : '복사에 실패했습니다.', ok ? 'success' : 'error');
  };

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
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameInput, setRenameInput] = useState('');

  const { careerStats, getPlayerCareer, reload: reloadCareerStats } = usePlayerCareerStats();
  const { rankings, rankingsWithChange, matchDates } = useLeagueRankings(players, matches, previousRankings, careerStats);

  const liveUrl = typeof window !== 'undefined' ? `${window.location.origin}/live` : '/live';

  const handleCopyLiveUrl = async () => {
    const ok = await copyToClipboard(liveUrl);
    showToast(ok ? '라이브 주소가 복사되었습니다. 단톡방에 공유하세요!' : '복사에 실패했습니다.', ok ? 'success' : 'error');
  };

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
    updatePendingScore, commitScore, cancelFinished, setMatchVideoUrl, deleteMatch,
    handleFinishDailyGame, confirmMvpAward, handleRecalculateMvp,
  } = useMatchManagement({
    players, setPlayers, matches, setMatches,
    matchDate, finishedDates, setFinishedDates,
    isExhibition,
    courtMinutes,
    gameMinutes,
  });

  const handleCopyBracket = async () => {
    const text = generateBracketText(
      leagueName,
      matchDate,
      createdMatches || [],
      liveUrl
    );
    const ok = await copyToClipboard(text);
    showToast(
      ok ? '대진표가 복사되었습니다. 단톡방에 붙여넣으세요!' : '복사에 실패했습니다.',
      ok ? 'success' : 'error'
    );
  };

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
      <main className="max-w-md mx-auto min-h-screen bg-surface flex items-center justify-center">
        <div className="text-ink-faint text-sm">불러오는 중...</div>
      </main>
    );
  }

  // 서버 마이그레이션 전: seasons 테이블 없음
  if (needsMigration) {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-surface flex flex-col items-center justify-center p-8 text-center gap-4">
        <Database size={40} className="text-accent" />
        <h1 className="text-lg font-bold text-ink tracking-tight">서버 준비가 필요합니다</h1>
        <p className="text-sm text-ink-mute leading-relaxed">
          시즌 타임라인 방식으로 전환되었습니다.<br />
          Supabase SQL Editor에서 <span className="font-mono text-xs bg-card-soft px-1.5 py-0.5 rounded">supabase-migration-seasons.sql</span>을 실행한 뒤,<br />
          데이터 이전을 진행해주세요.
        </p>
        <Link href="/load" className="px-5 py-3 bg-accent hover:bg-accent-strong text-white rounded-xl font-bold text-sm transition-colors touch-target">
          데이터 이전으로 가기
        </Link>
      </main>
    );
  }

  // 진행 중인 시즌 없음: 새 시즌 시작 안내
  if (noLiveSeason) {
    return (
      <main className="max-w-md mx-auto min-h-screen bg-surface flex flex-col items-center justify-center p-8 text-center gap-4">
        <AppLogo size={48} />
        <h1 className="text-lg font-bold text-ink tracking-tight">진행 중인 시즌이 없습니다</h1>
        <p className="text-sm text-ink-mute leading-relaxed">
          지난 시즌 기록은 통산 랭킹과 시즌 히스토리에 안전하게 보관되어 있어요.
        </p>
        <Link href="/league/new" className="flex items-center gap-2 px-5 py-3 bg-accent hover:bg-accent-strong text-white rounded-xl font-bold transition-colors touch-target">
          <Play size={18} /> 새 시즌 시작
        </Link>
        <Link href="/rankings" className="text-sm text-accent font-medium hover:underline">
          통산 랭킹 · 시즌 히스토리 보기 →
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface pb-40 relative">
      <header className="p-4 flex items-center justify-between sticky top-0 bg-surface z-10 border-b border-line">
        <div className="flex items-center gap-2">
          <AppLogo size={28} />
          {seasonNo !== null && <span className="bg-card-soft text-ink-mute text-xs px-2 py-1 rounded font-bold tabular-nums">시즌 {seasonNo}</span>}
          {/* 서버 반영 상태 */}
          {pendingWrites > 0 ? (
            <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500" title="네트워크 연결 시 자동 전송됩니다">
              <CloudUpload size={13} /> 전송 대기 {pendingWrites}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] font-medium text-up" title="모든 기록이 서버에 반영되었습니다">
              <CheckCircle2 size={13} /> 서버 반영됨
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyLiveUrl}
            className="flex items-center gap-1 bg-accent-soft text-accent px-3 py-1.5 rounded-lg font-bold text-xs border border-accent/20 touch-target cursor-pointer active:scale-[0.98] transition-transform"
            aria-label="라이브 주소 복사"
          >
            <Radio size={14}/> 라이브
          </button>
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1 bg-card-soft text-ink-soft px-3 py-1.5 rounded-lg font-bold text-xs border border-line touch-target cursor-pointer active:scale-[0.98] transition-transform"
            aria-label="경기 기록 보기"
          >
            <Table size={14}/> 기록
          </button>
        </div>
      </header>

      {/* 오프라인 캐시로 동작 중: 기록은 대기열에 쌓였다가 연결되면 자동 전송 */}
      {isOffline && (
        <div className="mx-4 mt-4 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <CloudOff size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-600 font-medium">
            서버에 연결되지 않아 이 기기의 캐시로 표시 중입니다.
            지금 입력하는 기록은 연결이 복구되면 자동으로 서버에 전송됩니다.
          </p>
        </div>
      )}

      <div className="px-4 space-y-6 pt-4">
        <div className="text-center">
          <h1 className="text-2xl font-black text-ink tracking-tight flex justify-center items-center gap-2">
            <span className="text-accent">-</span> {leagueName} <span className="text-accent">-</span>
            <button
              onClick={() => { setRenameInput(leagueName); setShowRenameDialog(true); }}
              className="p-1.5 text-ink-faint hover:text-accent transition-colors touch-target"
              aria-label="시즌 이름 변경"
            >
              <Pencil size={16} />
            </button>
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
          onSetVideoUrl={setMatchVideoUrl}
          onStartLiveScoring={(matchId) => router.push(`/referee?id=${matchId}`)}
          onRequestDelete={setDeleteMatchId}
          onOpenRegistration={() => setIsMatchViewOpen(true)}
        />

        {/* Daily MVP Button + Share Button */}
        {displayedMatches.length > 0 && (
          <section className="flex gap-2">
            {finishedDates.includes(matchDate) ? (
              <div className="flex-1 bg-card-soft text-ink-faint py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 cursor-not-allowed">
                <Medal size={20} /> [{matchDate}] 게임 종료 완료
              </div>
            ) : (
              <button
                onClick={handleFinishDailyGame}
                className="flex-1 bg-accent text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-accent-strong transition-colors touch-target"
              >
                <Medal size={20} className="text-amber-300" /> [{matchDate}] 게임 종료
              </button>
            )}
            <ShareButton leagueName={leagueName} matchDate={matchDate} matches={matches} rankings={rankingsWithChange} />
          </section>
        )}

        {/* 경기 타임라인 내보내기 (실시간 입력으로 기록된 포인트 로그가 있을 때) */}
        {hasTimelineData(matchDate, matches) && (
          <button
            onClick={handleExportTimeline}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm bg-accent-soft text-accent border border-accent/20 hover:bg-accent/15 transition-colors touch-target"
          >
            <Film size={18} /> 경기 타임라인 내보내기 (영상 편집용)
          </button>
        )}

        {/* Bottom Action Bar */}
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-card border-t border-line max-w-md mx-auto flex gap-2 z-30">
          <button onClick={() => handleManualSave(rankings)} className="flex-1 bg-accent hover:bg-accent-strong text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors touch-target">
            <Save size={18}/> 저장하기
          </button>
          <button onClick={() => setShowEndSeasonDialog(true)} className="px-4 bg-amber-500/10 text-amber-600 border border-amber-500/30 rounded-xl font-bold touch-target" aria-label="시즌 종료">
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

      {/* Rename Season Dialog */}
      {showRenameDialog && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rename-season-title"
        >
          <div className="bg-card border border-line rounded-2xl w-full max-w-sm shadow-xl animate-scale-in p-5">
            <h3 id="rename-season-title" className="font-bold text-lg text-ink tracking-tight mb-1">시즌 이름 변경</h3>
            <p className="text-xs text-ink-mute mb-4">진행 중인 시즌의 이름만 바뀌고 기록은 그대로 유지됩니다.</p>
            <input
              type="text"
              value={renameInput}
              onChange={(e) => setRenameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && renameInput.trim()) {
                  handleRenameLeague(renameInput);
                  setShowRenameDialog(false);
                }
              }}
              placeholder="예: 2026 7~8월 리그"
              autoFocus
              className="w-full px-4 py-3 bg-card border border-line-strong rounded-xl font-bold text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowRenameDialog(false)}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-ink-soft bg-card-soft hover:bg-line transition-colors touch-target"
              >
                취소
              </button>
              <button
                onClick={() => { handleRenameLeague(renameInput); setShowRenameDialog(false); }}
                disabled={!renameInput.trim()}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-accent hover:bg-accent-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors touch-target"
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Season Dialog */}
      <EndSeasonDialog
        isOpen={showEndSeasonDialog}
        leagueName={leagueName}
        totalMatchDays={seasonMatchDays}
        totalMatches={seasonTotalMatches}
        champion={seasonChampion}
        onConfirm={async (option) => {
          setShowEndSeasonDialog(false);
          await handleEndSeason(option);
          // 방금 아카이브된 시즌까지 반영된 통산 랭킹(ATP 배지)을 즉시 갱신
          reloadCareerStats();
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
        onCopyBracket={handleCopyBracket}
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
        onConfirm={(teamA, teamB, isFriendly) => {
          confirmManualMatch(teamA, teamB, isFriendly);
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
