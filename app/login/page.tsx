'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    const result = await signIn(email.trim(), password);
    setIsSubmitting(false);
    if (result.success) {
      router.replace('/');
    } else {
      setError(result.error ?? '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-surface">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/icon.png" alt="러브포티" width={72} height={72} className="mx-auto rounded-2xl mb-4" unoptimized />
          <h1 className="text-2xl font-bold text-ink tracking-tight">러브포티 테니스</h1>
          <p className="text-sm text-ink-mute mt-1">회원 전용 리그 서비스입니다</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-line rounded-2xl p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-mute mb-1">
              아이디 (이메일)
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-card border border-line-strong text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-ink-mute mb-1">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-card border border-line-strong text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-down" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-accent text-white font-semibold hover:bg-accent-strong active:scale-95 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <p className="text-xs text-ink-faint text-center mt-6">
          계정은 리그 관리자에게 문의해 발급받을 수 있습니다.
        </p>
      </div>
    </div>
  );
}
