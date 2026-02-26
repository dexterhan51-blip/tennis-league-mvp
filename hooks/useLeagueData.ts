import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Player, Match } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { safeGetAsync, safeSetAsync, safeRemoveAsync } from '@/lib/storage';
import { safeGetString, safeSetString, safeRemove } from '@/lib/storage';
import { LeagueDataSchema, PreviousRankingsSchema, FinishedDatesSchema } from '@/lib/schemas';

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
}

export function useLeagueData(): UseLeagueDataResult {
  const router = useRouter();
  const { showToast } = useToast();

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
      setPlayers(data.players || []);
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

  const handleDeleteLeague = useCallback(() => {
    safeRemoveAsync('current-league');
    if (slotIndex) safeRemoveAsync(`league-slot-${slotIndex}`);
    showToast('리그가 삭제되었습니다.', 'success');
    router.push('/');
  }, [slotIndex, showToast, router]);

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
  };
}
