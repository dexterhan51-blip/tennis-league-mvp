import { useState, useCallback, useMemo } from 'react';
import { Player, Match } from '@/types';
import {
  generateMixedDoublesSchedule, generateDoubles, generateSingles,
  calculateDailyMvp, recalculateMvpBonuses, isGuestPlayer,
} from '@/utils/tennisLogic';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '@/contexts/ToastContext';
import { useUndo as useUndoContext } from '@/contexts/UndoContext';
import { safeSetAsync } from '@/lib/storage';

const FINISHED_DATES_KEY = 'finished-dates';

function buildGuestPlayers(maleCount: number, femaleCount: number): Player[] {
  const guests: Player[] = [];
  for (let i = 1; i <= maleCount; i++) {
    guests.push({
      id: `guest-male-${i}`,
      name: maleCount === 1 ? '게스트(남)' : `게스트(남)${i}`,
      gender: 'MALE',
    });
  }
  for (let i = 1; i <= femaleCount; i++) {
    guests.push({
      id: `guest-female-${i}`,
      name: femaleCount === 1 ? '게스트(여)' : `게스트(여)${i}`,
      gender: 'FEMALE',
    });
  }
  return guests;
}

interface UseMatchManagementArgs {
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  matchDate: string;
  finishedDates: string[];
  setFinishedDates: React.Dispatch<React.SetStateAction<string[]>>;
  isExhibition?: boolean;
  courtMinutes?: number;
  gameMinutes?: number;
}

export function useMatchManagement({
  players,
  setPlayers,
  matches,
  setMatches,
  matchDate,
  finishedDates,
  setFinishedDates,
  isExhibition = false,
  courtMinutes = 120,
  gameMinutes = 20,
}: UseMatchManagementArgs) {
  const { showToast } = useToast();
  const { pushAction } = useUndoContext();

  const [pendingScores, setPendingScores] = useState<Record<string, { scoreA: number; scoreB: number }>>({});
  const [selectedForMatch, setSelectedForMatch] = useState<string[]>([]);
  const [pendingMixedMatches, setPendingMixedMatches] = useState<Match[] | null>(null);
  const [mvpResult, setMvpResult] = useState<{ maleMvp: any; femaleMvp: any } | null>(null);
  const [showMvpDialog, setShowMvpDialog] = useState(false);

  // Guest counter state
  const [maleGuestCount, setMaleGuestCount] = useState(0);
  const [femaleGuestCount, setFemaleGuestCount] = useState(0);

  // Match created dialog state
  const [createdMatches, setCreatedMatches] = useState<Match[] | null>(null);
  const [createdMatchType, setCreatedMatchType] = useState<'MIXED' | 'DOUBLES' | 'SINGLES' | 'MANUAL' | null>(null);

  // Manual match dialog state
  const [showManualDialog, setShowManualDialog] = useState(false);

  // Stamp exhibition flag on matches
  const stampExhibition = useCallback((matchList: Match[]): Match[] => {
    if (!isExhibition) return matchList;
    return matchList.map(m => ({ ...m, isExhibition: true }));
  }, [isExhibition]);

  // Dynamic guest players
  const guestPlayers = useMemo(
    () => buildGuestPlayers(maleGuestCount, femaleGuestCount),
    [maleGuestCount, femaleGuestCount]
  );

  // Keep guest players auto-selected when counter changes
  const syncGuestSelection = useCallback((newGuests: Player[]) => {
    setSelectedForMatch(prev => {
      const nonGuestSelected = prev.filter(id => !isGuestPlayer(id));
      const guestIds = newGuests.map(g => g.id);
      return [...nonGuestSelected, ...guestIds];
    });
  }, []);

  const handleSetMaleGuestCount = useCallback((count: number) => {
    const safeCount = Math.max(0, count);
    setMaleGuestCount(safeCount);
    const newGuests = buildGuestPlayers(safeCount, femaleGuestCount);
    syncGuestSelection(newGuests);
  }, [femaleGuestCount, syncGuestSelection]);

  const handleSetFemaleGuestCount = useCallback((count: number) => {
    const safeCount = Math.max(0, count);
    setFemaleGuestCount(safeCount);
    const newGuests = buildGuestPlayers(maleGuestCount, safeCount);
    syncGuestSelection(newGuests);
  }, [maleGuestCount, syncGuestSelection]);

  const toggleMatchPlayer = useCallback((id: string) => {
    // Don't allow toggling guest players manually (controlled by counter)
    if (isGuestPlayer(id)) return;
    setSelectedForMatch(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  }, []);

  const maxMatches = Math.floor(courtMinutes / gameMinutes);

  const handleCreateMatch = useCallback((type: 'MIXED' | 'DOUBLES' | 'SINGLES' | 'MANUAL') => {
    if (!matchDate) {
      showToast('날짜를 선택해주세요.', 'warning');
      return;
    }
    const pool = [...guestPlayers, ...players].filter(p => selectedForMatch.includes(p.id));

    try {
      let newMatches: Match[] = [];
      if (type === 'MIXED') {
        const proposedMatches = stampExhibition(generateMixedDoublesSchedule(pool, matchDate, maxMatches));
        if (proposedMatches.length === 0) {
          showToast('매칭 가능한 조합이 없습니다.', 'error');
          return;
        }
        setPendingMixedMatches(proposedMatches);
        setCreatedMatches(proposedMatches);
        setCreatedMatchType('MIXED');
        return;
      } else if (type === 'DOUBLES') newMatches = stampExhibition(generateDoubles(pool, matchDate));
      else if (type === 'SINGLES') newMatches = stampExhibition(generateSingles(pool, matchDate));
      else if (type === 'MANUAL') {
        setShowManualDialog(true);
        return;
      }

      if (newMatches.length > 0) {
        setMatches(prev => [...prev, ...newMatches]);
        setSelectedForMatch([]);
        setCreatedMatches(newMatches);
        setCreatedMatchType(type);
        setMaleGuestCount(0);
        setFemaleGuestCount(0);
      }
      return true;
    } catch (e: any) {
      showToast(e.message, 'error');
      return false;
    }
  }, [matchDate, players, guestPlayers, selectedForMatch, showToast, setMatches, stampExhibition, maxMatches]);

  const confirmMixedMatchCreation = useCallback(() => {
    if (!pendingMixedMatches) return;
    setMatches(prev => [...prev, ...pendingMixedMatches]);
    setSelectedForMatch([]);
    showToast(`${pendingMixedMatches.length}개의 게임이 생성되었습니다.`, 'success');
    setPendingMixedMatches(null);
    setCreatedMatches(null);
    setCreatedMatchType(null);
    // Reset guest counters after creation
    setMaleGuestCount(0);
    setFemaleGuestCount(0);
    return true;
  }, [pendingMixedMatches, showToast, setMatches]);

  const handleReshuffle = useCallback(() => {
    if (!matchDate) return;
    const pool = [...guestPlayers, ...players].filter(p => selectedForMatch.includes(p.id));

    try {
      const reshuffled = stampExhibition(generateMixedDoublesSchedule(pool, matchDate, maxMatches));
      if (reshuffled.length === 0) {
        showToast('매칭 가능한 조합이 없습니다.', 'error');
        return;
      }
      setPendingMixedMatches(reshuffled);
      setCreatedMatches(reshuffled);
    } catch (e: any) {
      showToast(e.message, 'error');
    }
  }, [matchDate, players, guestPlayers, selectedForMatch, showToast, stampExhibition, maxMatches]);

  const confirmManualMatch = useCallback((teamA: [Player, Player], teamB: [Player, Player]) => {
    if (!matchDate) return;
    const newMatch: Match = {
      id: uuidv4(),
      date: matchDate,
      teamA: { id: uuidv4(), man: teamA[0], woman: teamA[1] },
      teamB: { id: uuidv4(), man: teamB[0], woman: teamB[1] },
      scoreA: 0,
      scoreB: 0,
      isFinished: false,
      ...(isExhibition ? { isExhibition: true } : {}),
    };
    setMatches(prev => [...prev, newMatch]);
    setShowManualDialog(false);
    setSelectedForMatch([]);
    setMaleGuestCount(0);
    setFemaleGuestCount(0);
    showToast('경기가 생성되었습니다.', 'success');
  }, [matchDate, showToast, setMatches, isExhibition]);

  const closeCreatedDialog = useCallback(() => {
    setCreatedMatches(null);
    setCreatedMatchType(null);
  }, []);

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
        },
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
      const newMatch = { ...oldMatch, scoreA: pending.scoreA, scoreB: pending.scoreB, isFinished: true };
      pushAction('점수 입력', oldMatches, () => setMatches(oldMatches));
      return prev.map(m => m.id === matchId ? newMatch : m);
    });

    setPendingScores(prev => {
      const newPending = { ...prev };
      delete newPending[matchId];
      return newPending;
    });
  }, [pendingScores, pushAction, setMatches]);

  const cancelFinished = useCallback((matchId: string) => {
    setMatches(prev => {
      const oldMatches = [...prev];
      const matchIndex = prev.findIndex(m => m.id === matchId);
      if (matchIndex === -1) return prev;

      const oldMatch = prev[matchIndex];
      setPendingScores(p => ({
        ...p,
        [matchId]: { scoreA: oldMatch.scoreA, scoreB: oldMatch.scoreB },
      }));

      const newMatch = { ...oldMatch, isFinished: false };
      pushAction('점수 수정 취소', oldMatches, () => setMatches(oldMatches));
      return prev.map(m => m.id === matchId ? newMatch : m);
    });
  }, [pushAction, setMatches]);

  const deleteMatch = useCallback((matchId: string) => {
    const matchToDelete = matches.find(m => m.id === matchId);
    if (!matchToDelete) return;

    setMatches(prev => prev.filter(m => m.id !== matchId));
    showToast('경기가 삭제되었습니다.', 'success');
    pushAction('경기 삭제', matches, () => setMatches(matches));
  }, [matches, showToast, pushAction, setMatches]);

  const handleFinishDailyGame = useCallback(() => {
    if (!matchDate) {
      showToast('날짜가 선택되지 않았습니다.', 'warning');
      return;
    }
    const result = calculateDailyMvp(players, matches, matchDate);
    if (!result.maleMvp && !result.femaleMvp) {
      showToast('완료된 경기 기록이 없습니다.', 'warning');
      return;
    }
    setMvpResult(result);
    setShowMvpDialog(true);
  }, [matchDate, players, matches, showToast]);

  const confirmMvpAward = useCallback(() => {
    if (!mvpResult) return;

    const updatedPlayers = players.map(p => {
      let bonus = p.bonusPoints || 0;
      if (mvpResult.maleMvp && p.id === mvpResult.maleMvp.id) bonus += 2;
      if (mvpResult.femaleMvp && p.id === mvpResult.femaleMvp.id) bonus += 2;
      return { ...p, bonusPoints: bonus };
    });
    setPlayers(updatedPlayers);

    const newFinishedDates = [...finishedDates, matchDate];
    setFinishedDates(newFinishedDates);
    safeSetAsync(FINISHED_DATES_KEY, newFinishedDates);

    setShowMvpDialog(false);
    setMvpResult(null);
    showToast('MVP 보너스 점수가 반영되었습니다! 👑', 'success');
  }, [mvpResult, players, setPlayers, finishedDates, setFinishedDates, matchDate, showToast]);

  const handleRecalculateMvp = useCallback(() => {
    if (finishedDates.length === 0) {
      showToast('완료된 게임 날짜가 없습니다.', 'warning');
      return;
    }

    const { updatedPlayers, mvpLog } = recalculateMvpBonuses(players, matches, finishedDates);
    setPlayers(updatedPlayers);

    const totalMvps = mvpLog.filter(l => l.male || l.female).length;
    showToast(`${finishedDates.length}일치 MVP 보너스를 재계산했습니다. (${totalMvps}일 MVP 반영)`, 'success');
  }, [finishedDates, players, matches, setPlayers, showToast]);

  return {
    pendingScores,
    setPendingScores,
    selectedForMatch,
    setSelectedForMatch,
    pendingMixedMatches,
    setPendingMixedMatches,
    mvpResult,
    showMvpDialog,
    setShowMvpDialog,
    setMvpResult,
    // Guest system
    maleGuestCount,
    femaleGuestCount,
    setMaleGuestCount: handleSetMaleGuestCount,
    setFemaleGuestCount: handleSetFemaleGuestCount,
    guestPlayers,
    // Match created dialog
    createdMatches,
    createdMatchType,
    closeCreatedDialog,
    handleReshuffle,
    // Manual match dialog
    showManualDialog,
    setShowManualDialog,
    confirmManualMatch,
    // Actions
    toggleMatchPlayer,
    handleCreateMatch,
    confirmMixedMatchCreation,
    updatePendingScore,
    commitScore,
    cancelFinished,
    deleteMatch,
    handleFinishDailyGame,
    confirmMvpAward,
    handleRecalculateMvp,
  };
}
