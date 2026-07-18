// Toss Mini App: 기능스킴은 토스 개발자센터에서 등록
// 홈 바로가기: / (루트 URL)

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UndoProvider } from "@/contexts/UndoContext";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthGuard from "@/components/auth/AuthGuard";
import ToastContainer from "@/components/ui/Toast";
import BottomTabBar from "@/components/navigation/BottomTabBar";
import UndoButton from "@/components/match/UndoButton";
import StorageMigration from "@/components/StorageMigration";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "러브포티 테니스 리그 매니저",
    template: "%s | 러브포티 테니스",
  },
  description: "테니스 리그 관리, 매치 메이킹, 실시간 랭킹, MVP 시상까지 한 번에",
  openGraph: {
    title: "러브포티 테니스 리그 매니저",
    description: "테니스 리그 관리, 매치 메이킹, 실시간 랭킹, MVP 시상까지 한 번에",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <ToastProvider>
            <UndoProvider>
              <AuthProvider>
                <StorageMigration />
                <AuthGuard>
                  <main className="pb-16">
                    {children}
                  </main>
                  <BottomTabBar />
                </AuthGuard>
                <UndoButton />
                <ToastContainer />
              </AuthProvider>
            </UndoProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}