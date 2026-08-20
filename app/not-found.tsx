import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
      <h2 className="text-4xl font-black text-ink">404</h2>
      <p className="text-lg text-ink-mute">페이지를 찾을 수 없습니다.</p>
      <Link
        href="/"
        className="px-6 py-3 bg-accent text-white rounded-xl font-bold hover:bg-accent-strong transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
