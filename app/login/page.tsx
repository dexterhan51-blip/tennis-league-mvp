'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// 운영진 코드 입력. 순위·경기 기록은 누구나 볼 수 있고, 점수 입력 등 쓰기만 이 코드로 막는다.
export default function AdminCodePage() {
  const { signIn, signOut, isAdmin } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    const result = await signIn(code);
    setIsSubmitting(false);
    if (result.success) router.replace('/admin');
    else setError(result.error ?? '확인에 실패했습니다.');
  };

  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface px-5 pt-4">
      <button
        onClick={() => router.back()}
        className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-ink-mute"
        aria-label="뒤로 가기"
      >
        <ArrowLeft size={20} />
      </button>
      <h1 className="mt-2 text-[22px] font-extrabold tracking-tight text-ink">운영진 모드</h1>
      <p className="mt-2 text-sm text-ink-mute leading-relaxed">
        경기 입력·시즌 관리는 운영진만 할 수 있습니다. 코드는 이 기기에 저장되어 다음부터는 묻지 않습니다.
      </p>

      {isAdmin ? (
        <div className="mt-6">
          <p className="text-sm font-bold text-up">이 기기는 운영진 모드입니다.</p>
          <button
            onClick={() => signOut()}
            className="mt-4 w-full h-12 rounded-[14px] bg-card-soft text-ink-soft text-sm font-bold"
          >
            운영진 모드 끄기
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6">
          <label htmlFor="admin-code" className="block text-[11px] font-extrabold tracking-[0.08em] text-ink-mute">
            운영진 코드
          </label>
          <input
            id="admin-code"
            type="password"
            autoComplete="current-password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-2 w-full h-12 px-4 rounded-[14px] bg-card border border-line text-ink text-base outline-none focus:border-accent"
            required
          />
          {error && (
            <p className="mt-2 text-sm font-bold text-down" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 w-full h-14 rounded-[14px] bg-accent text-accent-ink font-extrabold text-base disabled:opacity-50"
          >
            {isSubmitting ? '확인 중...' : '확인'}
          </button>
        </form>
      )}
    </main>
  );
}
