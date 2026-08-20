import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Player, Match, SeasonArchive, SeasonRow } from '@/types';
import { useToast } from '@/contexts/ToastContext';
import { useUndo } from '@/contexts/UndoContext';
import { safeGetAsync, safeSetAsync, safeRemoveAsync } from '@/lib/storage';
import {
  PreviousRankingsSchema,
  FinishedDatesSchema,
  SeasonHistorySchema,
  PlayersArraySchema,
  LiveSeasonCacheSchema,
} from '@/lib/schemas';
import { calculateRanking } from '@/utils/tennisLogic';
import { updatePlayerCareerStats } from '@/utils/careerStats';
import {
  fetchLiveSeason,
  fetchSeasonMatches,
  fetchFriendlyMatchesSince,
  createSeason,
  archiveSeason,
  deleteSeason,
  isMissingTableError,
} from '@/lib/seasonApi';
import { enqueue, flushOrThrow, subscribePending } from '@/lib/writeQueue';
import type { EndSeasonOption } from '@/components/season/EndSeasonDialog';

const PREVIOUS_RANKINGS_KEY = 'previous-rankings';
const FINISHED_DATES_KEY = 'finished-dates';
const LIVE_SEASON_CACHE_KEY = 'live-season-cache';

interface UseLeagueDataResult {
  seasonId: string | null;
  seasonNo: number | null;
  leagueName: string;
  players: Player[];
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  previousRankings: Record<string, number>;
  finishedDates: string[];
  setFinishedDates: React.Dispatch<React.SetStateAction<string[]>>;
  isLoading: boolean;
  /** 진행 중(live) 시즌이 없음 — 시즌 시작 안내를 보여준다 */
  noLiveSeason: boolean;
  /** seasons 테이블이 아직 없음 — supabase-migration-seasons.sql 실행 필요 */
  needsMigration: boolean;
  /** 서버에 닿지 못해 오프라인 캐시로 동작 중 */
  isOffline: boolean;
  /** 아직 서버로 전송되지 않은 기록 수 */
  pendingWrites: number;
  handleManualSave: (rankings: { playerId: string }[]) => void;
  handleEndSeason: (option: EndSeasonOption) => void;
  handleRenameLeague: (newName: string) => void;
  startNewSeason: (name: string, players: Player[]) => Promise<boolean>;
}

export function useLeagueData(): UseLeagueDataResult {
  const router = useRouter();
  const { showToast } = useToast();
  const { clearHistory } = useUndo();

  const [season, setSeason] = useState<SeasonRow | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [previousRankings, setPreviousRankings] = useState<Record<string, number>>({});
  const [finishedDates, setFinishedDates] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noLiveSeason, setNoLiveSeason] = useState(false);
  const [needsMigration, setNeedsMigration] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingWrites, setPendingWrites] = useState(0);

  // 마지막으로 서버와 맞춘 상태 — 이후 변경분만 골라 전송한다
  const lastSyncedMatchesRef = useRef<Map<string, string>>(new Map());
  const lastSyncedPlayersRef = useRef<string>('');

  useEffect(() => subscribePending(setPendingWrites), []);

  // 전역 선수 풀의 최신 프로필 사진을 시즌 스냅샷에 입힌다
  const enrichPhotos = useCallback(async (base: Player[]): Promise<Player[]> => {
    const globalPlayers = (await safeGetAsync('tennis-players', PlayersArraySchema)) ?? [];
    const globalPhotoOf = new Map(globalPlayers.map((p) => [p.id, p.photo]));
    return base.map((p) => {
      const photo = globalPhotoOf.get(p.id) ?? p.photo;
      return photo === p.photo ? p : { ...p, photo };
    });
  }, []);

  const applySeason = useCallback(
    async (row: SeasonRow, seasonMatches: Match[]) => {
      const enriched = await enrichPhotos(row.players ?? []);
      setSeason(row);
      setPlayers(enriched);
      setMatches(seasonMatches);
      lastSyncedMatchesRef.current = new Map(seasonMatches.map((m) => [m.id, JSON.stringify(m)]));
      lastSyncedPlayersRef.current = JSON.stringify(enriched);
    },
    [enrichPhotos]
  );

  // 초기 로드: 서버의 live 시즌이 원본. 서버에 닿지 못하면 오프라인 캐시로 동작.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const live = await fetchLiveSeason();
        if (cancelled) return;
        if (!live) {
          setNoLiveSeason(true);
          setIsLoading(false);
          return;
        }
        // 시즌 경기 + 시즌 기간의 친선경기를 한 화면에서 입력/확인한다
        const since = live.starts_on ?? live.created_at.split('T')[0];
        const [seasonMatches, friendlyMatches] = await Promise.all([
          fetchSeasonMatches(live.id),
          fetchFriendlyMatchesSince(since).catch(() => [] as Match[]),
        ]);
        if (cancelled) return;
        const merged = [
          ...seasonMatches,
          ...friendlyMatches.map((m) => ({ ...m, isFriendly: true })),
        ];
        await applySeason(live, merged);
      } catch (e) {
        if (cancelled) return;
        if (isMissingTableError(e)) {
          setNeedsMigration(true);
          setIsLoading(false);
          return;
        }
        // 네트워크 실패 → 캐시 폴백 (원본은 서버, 캐시는 완충재)
        const cache = await safeGetAsync(LIVE_SEASON_CACHE_KEY, LiveSeasonCacheSchema);
        if (cache) {
          await applySeason(cache.season as SeasonRow, cache.matches);
          setIsOffline(true);
          showToast('서버에 연결하지 못해 이 기기의 캐시로 표시합니다. 기록은 연결되면 자동 전송됩니다.', 'warning');
        } else {
          setNoLiveSeason(true);
          showToast('서버에 연결하지 못했습니다. 네트워크를 확인해주세요.', 'error');
        }
      }

      const savedPrev = await safeGetAsync(PREVIOUS_RANKINGS_KEY, PreviousRankingsSchema);
      if (!cancelled && savedPrev) setPreviousRankings(savedPrev);
      const savedFinished = await safeGetAsync(FINISHED_DATES_KEY, FinishedDatesSchema);
      if (!cancelled && savedFinished) setFinishedDates(savedFinished);
      if (!cancelled) setIsLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [applySeason, showToast]);

  // 변경분 전송: 경기는 행 단위 upsert/delete, 선수 명단은 시즌 행 갱신
  useEffect(() => {
    if (isLoading || !season) return;

    const current = new Map(matches.map((m) => [m.id, JSON.stringify(m)]));
    for (const [id, json] of current) {
      if (lastSyncedMatchesRef.current.get(id) !== json) {
        const match = JSON.parse(json) as Match;
        // 친선경기는 friendly_matches로, 리그전은 league_matches로 라우팅
        if (match.isFriendly) enqueue({ kind: 'friendly-upsert', match });
        else enqueue({ kind: 'match-upsert', seasonId: season.id, match });
      }
    }
    for (const [id, prevJson] of lastSyncedMatchesRef.current) {
      if (!current.has(id)) {
        const wasFriendly = (JSON.parse(prevJson) as Match).isFriendly;
        enqueue(wasFriendly ? { kind: 'friendly-delete', matchId: id } : { kind: 'match-delete', matchId: id });
      }
    }
    lastSyncedMatchesRef.current = current;

    const playersJson = JSON.stringify(players);
    if (lastSyncedPlayersRef.current !== playersJson) {
      enqueue({ kind: 'season-players', seasonId: season.id, players });
      lastSyncedPlayersRef.current = playersJson;
    }

    // 오프라인 캐시 갱신
    safeSetAsync(LIVE_SEASON_CACHE_KEY, {
      season: { ...season, players },
      matches,
      cachedAt: new Date().toISOString(),
    });
  }, [matches, players, season, isLoading]);

  const handleManualSave = useCallback(
    (rankings: { playerId: string }[]) => {
      const currentRankingsMap: Record<string, number> = {};
      rankings.forEach((r, idx) => {
        currentRankingsMap[r.playerId] = idx + 1;
      });
      safeSetAsync(PREVIOUS_RANKINGS_KEY, currentRankingsMap);
      setPreviousRankings(currentRankingsMap);
      showToast(pendingWrites > 0 ? '순위 기준점을 저장했습니다. 서버 전송 대기 중인 기록이 있습니다.' : '저장되었습니다. 모든 기록이 서버에 반영된 상태입니다.', 'success');
    },
    [pendingWrites, showToast]
  );

  const handleRenameLeague = useCallback(
    (newName: string) => {
      const trimmed = newName.trim();
      if (!trimmed) {
        showToast('시즌 이름을 입력하세요.', 'warning');
        return;
      }
      if (!season) return;
      setSeason({ ...season, name: trimmed });
      enqueue({ kind: 'season-rename', seasonId: season.id, name: trimmed });
      showToast('시즌 이름이 변경되었습니다.', 'success');
    },
    [season, showToast]
  );

  const startNewSeason = useCallback(
    async (name: string, initialPlayers: Player[]): Promise<boolean> => {
      try {
        const latest = season?.season_no ?? 0;
        const row = await createSeason({
          seasonNo: latest + 1,
          name,
          players: initialPlayers,
        });
        await applySeason(row, []);
        setNoLiveSeason(false);
        showToast(`${name} 시즌이 시작되었습니다!`, 'success');
        return true;
      } catch (e) {
        console.warn('[season] Failed to create season:', e);
        showToast('시즌 생성에 실패했습니다. 네트워크와 관리자 권한을 확인해주세요.', 'error');
        return false;
      }
    },
    [season, applySeason, showToast]
  );

  const handleEndSeason = useCallback(
    async (option: EndSeasonOption) => {
      if (!season) return;
      clearHistory(); // 지난 시즌 데이터를 복원하는 undo 방지

      // '리그 완전 삭제' — 아카이브 없이 시즌과 경기를 서버에서 제거
      if (option === 'delete') {
        try {
          await deleteSeason(season.id);
        } catch {
          showToast('삭제에 실패했습니다. 네트워크를 확인해주세요.', 'error');
          return;
        }
        await safeRemoveAsync(LIVE_SEASON_CACHE_KEY);
        await safeRemoveAsync(PREVIOUS_RANKINGS_KEY);
        await safeRemoveAsync(FINISHED_DATES_KEY);
        await safeRemoveAsync('current-season-peaks');
        showToast('시즌이 완전 삭제되었습니다.', 'success');
        router.push('/');
        return;
      }

      // 아카이브: 밀린 기록을 먼저 서버에 반영해야 최종 순위가 어긋나지 않는다
      try {
        await flushOrThrow();
      } catch (e) {
        showToast(e instanceof Error ? e.message : '전송 대기 기록이 남아 있습니다.', 'error');
        return;
      }

      // 친선경기는 시즌 아카이브에서 제외 (friendly_matches에 독립적으로 남는다)
      const leagueMatches = matches.filter((m) => !m.isFriendly);
      const finalRankings = calculateRanking(players, leagueMatches);
      const champion = finalRankings.length > 0 ? finalRankings[0] : null;
      const matchDates = [...new Set(leagueMatches.map((m) => m.date))].sort();
      const seasonStart = season.starts_on || matchDates[0] || new Date().toISOString().split('T')[0];
      const seasonEnd = new Date().toISOString().split('T')[0];

      try {
        await archiveSeason(season.id, {
          endsOn: seasonEnd,
          finalRankings,
          championPlayerId: champion?.playerId,
        });
      } catch {
        showToast('시즌 아카이브에 실패했습니다. 네트워크를 확인해주세요.', 'error');
        return;
      }

      // 통산 기록(최고 순위·우승·시즌별 성적) 갱신 — 로컬 파생 데이터
      const archive: SeasonArchive = {
        id: season.id,
        leagueName: season.name,
        slotIndex: 0,
        players: [...players],
        matches: leagueMatches,
        finalRankings,
        championPlayerId: champion?.playerId,
        seasonStart,
        seasonEnd,
        totalMatchDays: matchDates.length,
        totalMatches: leagueMatches.filter((m) => m.isFinished && !m.isExhibition).length,
      };
      const existingHistory = (await safeGetAsync('season-history', SeasonHistorySchema)) ?? [];
      if (!existingHistory.some((h) => h.id === archive.id)) {
        await safeSetAsync('season-history', [...existingHistory, archive]);
      }
      await updatePlayerCareerStats(archive);

      // 시즌 단위 로컬 상태 초기화
      await safeRemoveAsync(PREVIOUS_RANKINGS_KEY);
      await safeRemoveAsync(FINISHED_DATES_KEY);
      await safeRemoveAsync('current-season-peaks');
      await safeRemoveAsync(LIVE_SEASON_CACHE_KEY);
      setPreviousRankings({});
      setFinishedDates([]);

      if (option === 'archive-only') {
        setSeason(null);
        setNoLiveSeason(true);
        showToast('시즌이 아카이브되었습니다.', 'success');
        router.push('/');
        return;
      }

      // archive-and-new: 선수 명단은 물려받고 시즌 카운터만 리셋
      const resetPlayers = players.map((p) => ({ ...p, bonusPoints: 0, mvpCount: 0 }));
      try {
        const next = await createSeason({
          seasonNo: season.season_no + 1,
          name: season.name,
          players: resetPlayers,
          startsOn: seasonEnd,
        });
        await applySeason(next, []);
        showToast('새 시즌이 시작되었습니다!', 'success');
      } catch (e) {
        console.warn('[season] Failed to start next season:', e);
        setSeason(null);
        setNoLiveSeason(true);
        showToast('아카이브는 완료됐지만 새 시즌 생성에 실패했습니다. 리그 화면에서 다시 시작해주세요.', 'warning');
      }
    },
    [season, players, matches, clearHistory, applySeason, showToast, router]
  );

  return {
    seasonId: season?.id ?? null,
    seasonNo: season?.season_no ?? null,
    leagueName: season?.name ?? '',
    players,
    setPlayers,
    matches,
    setMatches,
    previousRankings,
    finishedDates,
    setFinishedDates,
    isLoading,
    noLiveSeason,
    needsMigration,
    isOffline,
    pendingWrites,
    handleManualSave,
    handleEndSeason,
    handleRenameLeague,
    startNewSeason,
  };
}
