/** 러브포티 클럽 로고 (원형, 투명 배경) — public/logo.png */
export default function AppLogo({
  size = 24,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 정적 로고, 크기 고정이라 최적화 불필요
    <img
      src="/logo.png"
      alt="러브포티 테니스 클럽"
      width={size}
      height={size}
      className={`rounded-full flex-shrink-0 ${className}`}
    />
  );
}
