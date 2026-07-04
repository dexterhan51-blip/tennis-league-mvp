'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLiveDashboard } from '@/hooks/useLiveDashboard';
import { LiveHeader } from '@/components/live/LiveHeader';
import { LiveRanking } from '@/components/live/LiveRanking';
import { LiveMatchList } from '@/components/live/LiveMatchList';
import { LiveDatePicker } from '@/components/live/LiveDatePicker';
import { LiveMvp } from '@/components/live/LiveMvp';
import { AlertTriangle, Loader2 } from 'lucide-react';

function LiveDashboardContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-sm w-full text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">리그 ID가 필요합니다</h2>
          <p className="text-sm text-slate-500">공유받은 URL을 확인해주세요.</p>
        </div>
      </div>
    );
  }

  return <LiveDashboardView leagueId={id} />;
}

function LiveDashboardView({ leagueId }: { leagueId: string }) {
  const dashboard = useLiveDashboard(leagueId);

  // 에러 상태
  if (dashboard.error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 max-w-sm w-full text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">접근할 수 없습니다</h2>
          <p className="text-sm text-slate-500">{dashboard.error}</p>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (dashboard.connectionStatus === 'connecting' && !dashboard.leagueName) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">대시보드 연결 중...</p>
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
    <div className="min-h-screen bg-slate-50">
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
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
            <div className="grid grid-cols-3 text-center divide-x divide-slate-100">
              <div>
                <p className="text-2xl font-black text-slate-900">{displayTotal}</p>
                <p className="text-[10px] text-slate-400 font-medium">전체 경기</p>
              </div>
              <div>
                <p className="text-2xl font-black text-green-600">{displayFinished}</p>
                <p className="text-[10px] text-slate-400 font-medium">완료</p>
              </div>
              <div>
                <p className="text-2xl font-black text-yellow-500">{displayTotal - displayFinished}</p>
                <p className="text-[10px] text-slate-400 font-medium">진행 중</p>
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
        <p className="text-center text-[10px] text-slate-300 pb-4">
          러브포티 테니스 리그 매니저
        </p>
      </div>
    </div>
  );
}

export default function LiveDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    }>
      <LiveDashboardContent />
    </Suspense>
  );
}
