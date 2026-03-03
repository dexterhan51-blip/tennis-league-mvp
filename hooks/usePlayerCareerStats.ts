import { useState, useEffect, useCallback } from 'react';
import type { PlayerCareerStats } from '@/types';
import { loadCareerStats } from '@/utils/careerStats';

export function usePlayerCareerStats() {
  const [careerStats, setCareerStats] = useState<PlayerCareerStats[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadCareerStats().then(stats => {
      setCareerStats(stats);
      setIsLoaded(true);
    });
  }, []);

  const getPlayerCareer = useCallback(
    (playerId: string): PlayerCareerStats | undefined => {
      return careerStats.find(s => s.playerId === playerId);
    },
    [careerStats]
  );

  const reload = useCallback(async () => {
    const stats = await loadCareerStats();
    setCareerStats(stats);
  }, []);

  return { careerStats, isLoaded, getPlayerCareer, reload };
}
