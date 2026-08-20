'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';
import { LiveHeader } from '@/components/live/LiveHeader';
import { LiveRanking } from '@/components/live/LiveRanking';
import { LiveMatchList } from '@/components/live/LiveMatchList';
import { LiveDatePicker } from '@/components/live/LiveDatePicker';
import { LiveMvp } from '@/components/live/LiveMvp';
import { AlertTriangle, Loader2, Radio } from 'lucide-react';

// /live       → 진행 중(live) 시즌 자동 표시
// /live?id=…  → 특정 시즌(아카이브 포함) 열람
function LiveDashboardContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  return <LiveDashboardView seasonId={id} />;
}

function LiveDashboardView({ seasonId }: { seasonId: string | null }) {
  const dashboard = useLiveDashboard(seasonId);

  // 진행 중인 시즌 없음 (시즌 교체기)
  if (dashboard.noLiveSeason) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl border border-line p-8 max-w-sm w-full text-center">
          <Radio className="w-12 h-12 text-ink-faint mx-auto mb-4" />
          <h2 className="text-lg font-bold text-ink tracking-tight mb-2">진행 중인 시즌이 없습니다</h2>
          <p className="text-sm text-ink-mute">새 시즌이 시작되면 여기에서 실시간으로 볼 수 있어요.</p>
        </div>
      </div>
    );
  }

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
