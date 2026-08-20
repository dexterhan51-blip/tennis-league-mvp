'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
      <div className="w-16 h-16 rounded-full bg-down/10 flex items-center justify-center">
        <span className="text-2xl font-bold text-down">!</span>
      </div>
      <h2 className="text-xl font-bold text-ink">문제가 발생했습니다</h2>
      <p className="text-sm text-ink-mute text-center">{error.message || '예상치 못한 오류가 발생했습니다.'}</p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-strong transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}
