import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '테니스 페르소나 & 궁합',
};

export default function SajuLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
