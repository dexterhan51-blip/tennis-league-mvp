'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, isDemoMode } from '@/lib/backend';
import { fetchEverything } from '@/lib/seasonApi';
import { DEMO_MATCHES, DEMO_PLAYERS, DEMO_SEASON } from '@/lib/demoData';
import type { ClubData } from '@/lib/clubView';

const DEMO_DATA: ClubData = {
  seasons: [{ season: DEMO_SEASON, matches: DEMO_MATCHES }],
  friendly: [],
  members: DEMO_PLAYERS,
};

const POLL_MS = 10_000;

export interface ClubDataState {
  data: ClubData | null;
  status: 'loading' | 'ready' | 'error';
  /** 예시 모드(로컬 개발) */
  isDemo: boolean;
  reload: () => Promise<void>;
}

/**
 * 클럽 전체 데이터(시즌·그날 경기·회원 명단)를 한 번에 읽는다.
 * @param live true 면 10초마다 서버의 변경 번호를 확인해 바뀌었을 때 다시 읽는다 (화면이 가려진 동안은 쉰다)
 */
export function useClubData(live = false): ClubDataState {
  const isDemo = isDemoMode();
  const [data, setData] = useState<ClubData | null>(isDemo ? DEMO_DATA : null);
  const [status, setStatus] = useState<ClubDataState['status']>(isDemo ? 'ready' : 'loading');
  const revRef = useRef<number | null>(null);

  const reload = useCallback(async () => {
    if (isDemo) return;
    try {
      setData(await fetchEverything());
      setStatus('ready');
    } catch {
      // 이미 보여 주던 데이터가 있으면 그대로 두고, 처음부터 실패했을 때만 오류로 표시한다
      setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
    }
  }, [isDemo]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 시 서버에서 읽어 오는 정상 흐름
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!live || isDemo) return;
    let stopped = false;
    const tick = async () => {
      if (stopped || document.hidden) return;
      try {
        const { rev } = await apiGet<{ rev: number }>('rev');
        if (stopped) return;
        if (revRef.current !== null && rev !== revRef.current) await reload();
        revRef.current = rev;
      } catch {
        // 잠깐 끊긴 것은 다음 확인 때 다시 시도한다
      }
    };
    void tick();
    const timer = setInterval(() => void tick(), POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [live, isDemo, reload]);

  return { data, status, isDemo, reload };
}
