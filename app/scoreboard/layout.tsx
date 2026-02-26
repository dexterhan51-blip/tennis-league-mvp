import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '스코어보드',
};

export default function ScoreboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
