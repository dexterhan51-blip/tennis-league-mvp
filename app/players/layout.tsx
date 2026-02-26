import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '선수 관리',
};

export default function PlayersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
