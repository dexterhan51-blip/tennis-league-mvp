import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '리그 관리',
};

export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
