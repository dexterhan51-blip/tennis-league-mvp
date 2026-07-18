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
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-clay-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/icon.png" alt="러브포티" width={72} height={72} className="mx-auto rounded-2xl mb-4" unoptimized />
          <h1 className="text-2xl font-bold text-slate-800">러브포티 테니스</h1>
          <p className="text-sm text-slate-500 mt-1">회원 전용 리그 서비스입니다</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-600 mb-1">
              아이디 (이메일)
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-clay-500 focus:outline-none text-slate-800"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-600 mb-1">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-clay-500 focus:outline-none text-slate-800"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-clay-600 text-white font-semibold hover:bg-clay-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          계정은 리그 관리자에게 문의해 발급받을 수 있습니다.
        </p>
      </div>
    </div>
  );
}
