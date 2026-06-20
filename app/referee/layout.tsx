import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '실시간 점수 입력',
};

export default function RefereeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
