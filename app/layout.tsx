import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { UndoProvider } from "@/contexts/UndoContext";
import ToastContainer from "@/components/ui/Toast";
import BottomTabBar from "@/components/navigation/BottomTabBar";
import UndoButton from "@/components/match/UndoButton";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "러브포티 리그 매니저",
  description: "테니스 리그 관리 시스템",
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
              <main className="pb-16">
                {children}
              </main>
              <BottomTabBar />
              <UndoButton />
              <ToastContainer />
            </UndoProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}