import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "러브포티 리그 매니저",
  description: "테니스 리그 관리 시스템",
};

// 👇 이 부분이 빠져서 에러가 난 겁니다! (export default)
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
// 수정완료