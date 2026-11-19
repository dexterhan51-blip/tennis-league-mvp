'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

/**
 * 운영진 전용 화면 가림막. 운영진 모드가 아니면 화면 대신 코드 입력 안내를 보여준다.
 * 주소를 직접 쳐서 들어온 사람이 입력 화면을 보고 헛수고하지 않게 하는 안내용이고,
 * 실제 쓰기 차단은 서버(/api/league)가 운영진 코드로 한다.
 */
export default function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading, isConfigured } = useAuth();

  if (!isConfigured) return <>{children}</>; // 예시 모드(로컬 개발)
  if (isLoading) return <div className="min-h-screen bg-surface" />;
  if (isAdmin) return <>{children}</>;

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface px-5 pt-6 pb-24">
      <h1 className="text-[22px] font-extrabold tracking-tight text-ink">운영진 전용</h1>
      <p className="mt-2 text-sm text-ink-mute">경기 입력·선수 관리는 운영진 코드를 입력한 기기에서만 할 수 있습니다.</p>
      <Link href="/login" className="mt-5 flex items-center justify-center h-12 rounded-[14px] bg-accent text-accent-ink text-sm font-extrabold">
        운영진 코드 입력
      </Link>
      <Link href="/" className="mt-2 flex items-center justify-center h-12 rounded-[14px] bg-card-soft text-ink-soft text-sm font-bold">
        오늘 화면으로
      </Link>
    </main>
  );
}
