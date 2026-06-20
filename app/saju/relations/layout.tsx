import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '우리 리그 궁합 관계도',
};

export default function RelationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
