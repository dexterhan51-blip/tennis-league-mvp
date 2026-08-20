'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';
import { LiveHeader } from '@/components/live/LiveHeader';
import { LiveRanking } from '@/components/live/LiveRanking';
import { LiveMatchList } from '@/components/live/LiveMatchList';
import { LiveDatePicker } from '@/components/live/LiveDatePicker';
import { LiveMvp } from '@/components/live/LiveMvp';
import { AlertTriangle, Loader2, Radio, ChevronRight } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';

interface ActiveLeague {
  id: string;
  name: string;
  updated_at: string;
}

// id 없이 접속하면 진행 중인 리그 목록에서 선택
function LiveLeaguePicker() {
  const [leagues, setLeagues] = useState<ActiveLeague[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setError(true);
      return;
    }
    supabase
      .from('shared_leagues')
      .select('id, name, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(true);
        else setLeagues((data as ActiveLeague[]) ?? []);
      });
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-line p-8 max-w-sm w-full text-center">
          <AlertTriangle className="w-12 h-12 text-down mx-auto mb-4" />
          <h2 className="text-lg font-bold text-ink tracking-tight mb-2">리그 목록을 불러올 수 없습니다</h2>
          <p className="text-sm text-ink-mute">네트워크 상태를 확인해주세요.</p>
        </div>
      </div>
    );
  }

  if (!leagues) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" aria-label="로딩 중" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface p-4 pt-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-xl font-bold text-ink tracking-tight mb-1 flex items-center gap-2">
          <Radio className="w-5 h-5 text-accent" /> 라이브
        </h1>
        <p className="text-sm text-ink-mute mb-6">진행 중인 리그를 선택하세요.</p>

        {leagues.length === 0 ? (
          <div className="bg-card rounded-2xl border border-line p-8 text-center">
            <p className="text-sm text-ink-mute">아직 공개된 리그가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leagues.map((league) => (
              <Link
                key={league.id}
                href={`/live?id=${league.id}`}
                className="flex items-center justify-between bg-card rounded-2xl border border-line p-4 hover:border-accent/40 hover:bg-card-soft transition-colors"
              >
                <div>
                  <div className="font-bold text-ink">{league.name}</div>
                  <div className="text-xs text-ink-faint mt-0.5">
                    마지막 업데이트 {new Date(league.updated_at).toLocaleDateString('ko-KR')}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-ink-faint" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LiveDashboardContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return <LiveLeaguePicker />;
  }

  return <LiveDashboardView leagueId={id} />;
}

function LiveDashboardView({ leagueId }: { leagueId: string }) {
  const dashboard = useLiveDashboard(leagueId);

  // 에러 상태
  if (dashboard.error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-line p-8 max-w-sm w-full text-center">
          <AlertTriangle className="w-12 h-12 text-down mx-auto mb-4" />
          <h2 className="text-lg font-bold text-ink tracking-tight mb-2">접근할 수 없습니다</h2>
          <p className="text-sm text-ink-mute">{dashboard.error}</p>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (dashboard.connectionStatus === 'connecting' && !dashboard.leagueName) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-3" />
          <p className="text-sm text-ink-mute">대시보드 연결 중...</p>
        </div>
      </div>
    );
  }

  // 선택된 날짜에 경기가 없으면 자동으로 첫 번째 날짜 선택
  const effectiveDate = dashboard.todayTotal > 0
    ? dashboard.selectedDate
    : dashboard.matchDates[0] || dashboard.selectedDate;

  const displayMatches = dashboard.todayTotal > 0
    ? dashboard.todayMatches
    : dashboard.matches.filter(m => m.date === effectiveDate);

  const displayFinished = displayMatches.filter(m => m.isFinished).length;
  const displayTotal = displayMatches.length;

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-md mx-auto px-4 py-4 space-y-3">
        {/* 헤더 */}
        <LiveHeader
          leagueName={dashboard.leagueName}
          connectionStatus={dashboard.connectionStatus}
          updatedAt={dashboard.updatedAt}
        />

        {/* 날짜 선택 */}
        <LiveDatePicker
          dates={dashboard.matchDates}
          selectedDate={effectiveDate}
          onSelect={dashboard.setSelectedDate}
        />

        {/* 경기 요약 */}
        {displayTotal > 0 && (
          <div className="bg-card rounded-2xl border border-line p-4">
            <div className="grid grid-cols-3 text-center divide-x divide-line">
              <div>
                <p className="text-2xl font-black text-ink tabular-nums">{displayTotal}</p>
                <p className="text-[10px] text-ink-mute font-medium">전체 경기</p>
              </div>
              <div>
                <p className="text-2xl font-black text-up tabular-nums">{displayFinished}</p>
                <p className="text-[10px] text-ink-mute font-medium">완료</p>
              </div>
              <div>
                <p className="text-2xl font-black text-amber-500 tabular-nums">{displayTotal - displayFinished}</p>
                <p className="text-[10px] text-ink-mute font-medium">진행 중</p>
              </div>
            </div>
          </div>
        )}

        {/* MVP */}
        <LiveMvp
          players={dashboard.players}
          matches={dashboard.matches}
          date={effectiveDate}
        />

        {/* 랭킹 */}
        <LiveRanking rankings={dashboard.rankings} players={dashboard.players} />

        {/* 경기 목록 */}
        <LiveMatchList
          matches={displayMatches}
          finished={displayFinished}
          total={displayTotal}
          players={dashboard.players}
        />

        {/* 푸터 */}
        <p className="text-center text-[10px] text-ink-faint pb-4">
          러브포티 테니스 리그 매니저
        </p>
      </div>
    </div>
  );
}

export default function LiveDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    }>
      <LiveDashboardContent />
    </Suspense>
  );
}
