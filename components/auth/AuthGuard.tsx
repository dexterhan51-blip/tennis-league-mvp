'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

// 폐쇄형 사이트 가드: 로그인 없이는 /login 외 접근 불가.
// 환경변수(Supabase)가 없는 로컬 개발 환경에서는 가드를 끈다.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, isLoading, isConfigured } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!isConfigured || isLoading) return;
    if (!session && !isLoginPage) router.replace('/login');
    else if (session && isLoginPage) router.replace('/');
  }, [session, isLoading, isLoginPage, isConfigured, router]);

  if (!isConfigured) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-clay-600 border-t-transparent rounded-full animate-spin" aria-label="로딩 중" />
      </div>
    );
  }

  if ((!session && !isLoginPage) || (session && isLoginPage)) return null;

  return <>{children}</>;
}
