import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '새 리그 만들기',
};

export default function NewLeagueLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
