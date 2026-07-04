import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
      <h2 className="text-4xl font-black text-slate-800">404</h2>
      <p className="text-lg text-slate-500">페이지를 찾을 수 없습니다.</p>
      <Link
        href="/"
        className="px-6 py-3 bg-clay-600 text-white rounded-xl font-bold hover:bg-clay-700 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
