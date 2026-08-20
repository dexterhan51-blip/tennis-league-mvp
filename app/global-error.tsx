'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 bg-surface">
          <div className="w-16 h-16 rounded-full bg-down/10 flex items-center justify-center">
            <span className="text-2xl font-bold text-down">!</span>
          </div>
          <h2 className="text-xl font-bold text-ink">심각한 오류가 발생했습니다</h2>
          <p className="text-sm text-ink-mute">앱을 다시 시작해주세요.</p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-strong"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
