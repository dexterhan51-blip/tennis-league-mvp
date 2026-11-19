import { AlertTriangle, Loader2 } from 'lucide-react';

/** 화면 전체를 차지하는 로딩 표시 */
export function FullLoading() {
  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-accent animate-spin" aria-label="로딩 중" />
    </main>
  );
}

/** 화면 전체를 차지하는 불러오기 실패 안내 */
export function FullError({ message }: { message: string }) {
  return (
    <main className="max-w-md mx-auto min-h-screen bg-surface flex flex-col items-center justify-center p-8 text-center">
      <AlertTriangle className="w-10 h-10 text-down mb-3" />
      <p className="text-sm text-ink-mute">{message}</p>
    </main>
  );
}
