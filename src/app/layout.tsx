import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DreamInsight",
  description: "AI Dream Interpretation App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <head>
        {/* ✅ PWA 관련 태그 */}
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {/* Global Glass Header */}
        <div className="sticky top-0 z-50 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="font-semibold tracking-tight">DreamInsight</Link>
              <nav className="hidden sm:flex items-center gap-4 text-sm subtle-muted">
                <Link href="/community" className="hover:opacity-100">커뮤니티</Link>
                <Link href="/encyclopedia" className="hover:opacity-100">백과</Link>
                <Link href="/about/terms" className="hover:opacity-100">이용약관</Link>
              </nav>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {/* Plus 버튼 제거 - 전체 무료 서비스 */}
            </div>
          </div>
        </div>

        <main>{children}</main>

        {/* Global Footer */}
        <footer className="mt-12 border-t border-zinc-200/60 dark:border-zinc-800/60 py-6">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-xs subtle-muted flex flex-col sm:flex-row items-center gap-2 sm:justify-between">
            <div>© {new Date().getFullYear()} DreamInsight</div>
            <div className="flex items-center gap-3">
              <Link href="/about/privacy" className="hover:opacity-100">개인정보처리방침</Link>
              <Link href="/about/refund" className="hover:opacity-100">환불정책</Link>
              <Link href="/about/terms" className="hover:opacity-100">이용약관</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
