"use client";

import ClubHome from "@/components/home/ClubHome";
import { FullError, FullLoading } from "@/components/ui/DataState";
import { useAuth } from "@/contexts/AuthContext";
import { useClubData } from "@/hooks/useClubData";
import { DEMO_MY_PLAYER_ID } from "@/lib/demoData";

// 첫 화면 — 클럽 소식(최근 경기 띠·지난 모임·다음 모임·기간 상위 3·기록 리더·이전 모임).
// 내 순위·개인 기록은 「나」 탭, 기록·관리는 운영진의 「운영」 탭.
export default function Home() {
  const { profile, isAdmin } = useAuth();
  const { data, status, isDemo } = useClubData(true);

  if (status === "loading") return <FullLoading />;
  if (status === "error" || !data) {
    return <FullError message="기록을 불러올 수 없습니다. 네트워크를 확인해주세요." />;
  }

  return (
    <ClubHome data={data} myPlayerId={isDemo ? DEMO_MY_PLAYER_ID : profile.player_id} isAdmin={isAdmin} isDemo={isDemo} />
  );
}
