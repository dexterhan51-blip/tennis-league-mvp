import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Player, Match, SeasonArchive, PlayerStat } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useUndo } from '@/contexts/UndoContext';
import { safeGetAsync, safeSetAsync, safeRemoveAsync } from '@/lib/storage';
import { safeGetString, safeSetString, safeRemove } from '@/lib/storage';
import { LeagueDataSchema, PreviousRankingsSchema, FinishedDatesSchema, SeasonHistorySchema, PlayersArraySchema } from '@/lib/schemas';
import { calculateRanking } from '@/utils/tennisLogic';
import { updatePlayerCareerStats } from '@/utils/careerStats';
import { v4 as uuidv4 } from 'uuid';
import type { EndSeasonOption } from '@/components/season/EndSeasonDialog';

const PREVIOUS_RANKINGS_KEY = 'previous-rankings';
const FINISHED_DATES_KEY = 'finished-dates';

interface UseLeagueDataResult {
  leagueName: string;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  slotIndex: string | null;
  previousRankings: Record<string, number>;
  finishedDates: string[];
  setFinishedDates: React.Dispatch<React.SetStateAction<string[]>>;
  isLoading: boolean;
  handleManualSave: (rankings: { playerId: string }[]) => void;
  handleDeleteLeague: () => void;
  handleEndSeason: (option: EndSeasonOption) => void;
  handleRenameLeague: (newName: string) => void;
}

export function useLeagueData(): UseLeagueDataResult {
  const router = useRouter();
  const { showToast } = useToast();
  const { clearHistory } = useUndo();

  const [leagueName, setLeagueName] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [slotIndex, setSlotIndex] = useState<string | null>(null);
  const [previousRankings, setPreviousRankings] = useState<Record<string, number>>({});
  const [finishedDates, setFinishedDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initial load from IndexedDB
  useEffect(() => {
    const load = async () => {
      const currentSlot = safeGetString('current-slot-index') ?? null;
      setSlotIndex(currentSlot);

      const data = await safeGetAsync('current-league', LeagueDataSchema);
      if (!data) {
        showToast('선택된 리그가 없습니다.', 'error');
        router.push('/');
        return;
      }

      setLeagueName(data.name);

      // 리그 선수는 생성 시점 스냅샷이라 이후 선수 관리에서 등록한 사진이 없다.
      // 전역 선수 풀의 사진을 우선 적용해 최신 프로필 사진이 보이게 한다.
      const globalPlayers = (await safeGetAsync('tennis-players', PlayersArraySchema)) ?? [];
      const globalPhotoOf = new Map(globalPlayers.map(p => [p.id, p.photo]));
      const enrichedPlayers = (data.players || []).map(p => {
        const photo = globalPhotoOf.get(p.id) ?? p.photo;
        return photo === p.photo ? p : { ...p, photo };
      });
      setPlayers(enrichedPlayers);
      setMatches(data.matches || []);

      const savedPrev = await safeGetAsync(PREVIOUS_RANKINGS_KEY, PreviousRankingsSchema);
      if (savedPrev) setPreviousRankings(savedPrev);

      const savedFinished = await safeGetAsync(FINISHED_DATES_KEY, FinishedDatesSchema);
      if (savedFinished) setFinishedDates(savedFinished);

      setIsLoading(false);
    };
    load();
  }, [router, showToast]);

  // Auto-save to IndexedDB whenever matches/players change
  useEffect(() => {
    if (!leagueName || isLoading) return;
    const data = { name: leagueName, players, matches, savedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
    safeSetAsync('current-league', data);
    if (slotIndex) safeSetAsync(`league-slot-${slotIndex}`, data);
  }, [matches, leagueName, players, slotIndex, isLoading]);

  const handleManualSave = useCallback((rankings: { playerId: string }[]) => {
    const currentRankingsMap: Record<string, number> = {};
    rankings.forEach((r, idx) => {
      currentRankingsMap[r.playerId] = idx + 1;
    });
    safeSetAsync(PREVIOUS_RANKINGS_KEY, currentRankingsMap);

    if (slotIndex) {
      const data = { name: leagueName, players, matches, savedAt: new Date().toISOString(), createdAt: new Date().toISOString() };
      safeSetAsync(`league-slot-${slotIndex}`, data);
      showToast(`SLOT ${slotIndex}에 저장되었습니다!`, 'success');
    } else {
      showToast('저장되었습니다.', 'success');
    }
  }, [slotIndex, leagueName, players, matches, showToast]);

  const handleRenameLeague = useCallback((newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showToast('리그 이름을 입력하세요.', 'warning');
      return;
    }
    // 저장은 auto-save effect가 처리 (current-league + slot 동시 반영)
    setLeagueName(trimmed);
    showToast('시즌 이름이 변경되었습니다.', 'success');
  }, [showToast]);

  const handleDeleteLeague = useCallback(() => {
    safeRemoveAsync('current-league');
    if (slotIndex) safeRemoveAsync(`league-slot-${slotIndex}`);
    clearHistory(); // 삭제된 데이터를 가리키는 undo 항목 제거
    showToast('리그가 삭제되었습니다.', 'success');
    router.push('/');
  }, [slotIndex, clearHistory, showToast, router]);

  const handleEndSeason = useCallback(async (option: EndSeasonOption) => {
    clearHistory(); // 지난 시즌 데이터를 복원하는 undo 방지

    // Calculate final rankings
    const finalRankings = calculateRanking(players, matches);
    const champion = finalRankings.length > 0 ? finalRankings[0] : null;

    // Collect match dates for season range
    const matchDates = [...new Set(matches.map(m => m.date))].sort();
    const seasonStart = matchDates[0] || new Date().toISOString().split('T')[0];
    const seasonEnd = new Date().toISOString().split('T')[0];
    const totalMatchDays = matchDates.length;
    const totalMatches = matches.filter(m => m.isFinished && !m.isExhibition).length;

    // Create archive
    const archive: SeasonArchive = {
      id: uuidv4(),
      leagueName,
      slotIndex: slotIndex ? parseInt(slotIndex) : 0,
      players: [...players],
      matches: [...matches],
      finalRankings,
      championPlayerId: champion?.playerId,
      seasonStart,
      seasonEnd,
      totalMatchDays,
      totalMatches,
    };

    // Save to season history
    const existingHistory = (await safeGetAsync('season-history', SeasonHistorySchema)) ?? [];
    await safeSetAsync('season-history', [...existingHistory, archive]);

    // Update career stats
    await updatePlayerCareerStats(archive);

    // Handle option
    if (option === 'delete') {
      handleDeleteLeague();
      return;
    }

    if (option === 'archive-only') {
      safeRemoveAsync('current-league');
      if (slotIndex) safeRemoveAsync(`league-slot-${slotIndex}`);
      safeRemoveAsync(PREVIOUS_RANKINGS_KEY);
      safeRemoveAsync(FINISHED_DATES_KEY);
      safeRemoveAsync('current-season-peaks');
      showToast('시즌이 아카이브되었습니다.', 'success');
      router.push('/');
      return;
    }

    // archive-and-new: Reset matches, keep players, start fresh
    const resetPlayers = players.map(p => ({ ...p, bonusPoints: 0, mvpCount: 0 }));
    setPlayers(resetPlayers);
    setMatches([]);
    setFinishedDates([]);
    setPreviousRankings({});
    await safeRemoveAsync(PREVIOUS_RANKINGS_KEY);
    await safeRemoveAsync(FINISHED_DATES_KEY);
    await safeRemoveAsync('current-season-peaks');

    // Save the new clean state
    const newData = {
      name: leagueName,
      players: resetPlayers,
      matches: [],
      savedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await safeSetAsync('current-league', newData);
    if (slotIndex) await safeSetAsync(`league-slot-${slotIndex}`, newData);

    showToast('새 시즌이 시작되었습니다!', 'success');
  }, [players, matches, leagueName, slotIndex, handleDeleteLeague, clearHistory, showToast, router, setPlayers, setMatches, setFinishedDates]);

  return {
    leagueName,
    players,
    setPlayers,
    matches,
    setMatches,
    slotIndex,
    previousRankings,
    finishedDates,
    setFinishedDates,
    isLoading,
    handleManualSave,
    handleDeleteLeague,
    handleEndSeason,
    handleRenameLeague,
  };
}
