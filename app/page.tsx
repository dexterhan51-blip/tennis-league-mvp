"use client";

import TodayView from "@/components/home/TodayView";
import { FullError, FullLoading } from "@/components/ui/DataState";
import { useAuth } from "@/contexts/AuthContext";
import { useClubData } from "@/hooks/useClubData";
import { currentScope } from "@/lib/clubView";
import { DEMO_MY_PLAYER_ID } from "@/lib/demoData";

// 오늘(홈) — 진행 중 시즌이 있으면 그 시즌, 없으면 올해 전체 경기 기준으로 내 순위를 보여준다.
// 기록·관리 기능은 하단 「운영」 탭(/admin)에 모여 있다.
export default function Home() {
  const { profile } = useAuth();
  const { data, status, isDemo } = useClubData(true);

  if (status === "loading") return <FullLoading />;
  if (status === "error" || !data) {
    return <FullError message="기록을 불러올 수 없습니다. 네트워크를 확인해주세요." />;
  }

  return (
    <TodayView
      scope={currentScope(data)}
      myPlayerId={isDemo ? DEMO_MY_PLAYER_ID : profile.player_id}
      displayName={isDemo ? "한씨" : profile.name}
      isDemo={isDemo}
    />
  );
}
