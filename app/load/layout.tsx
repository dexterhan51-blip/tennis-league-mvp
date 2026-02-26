import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '리그 불러오기',
};

export default function LoadLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
