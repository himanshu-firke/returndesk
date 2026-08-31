import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import MobileNav from '@/components/MobileNav';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'ReturnDesk — Return Management Desk',
  description: 'Enterprise Return Management Desk for support agents',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 text-slate-900 antialiased min-h-screen flex`} suppressHydrationWarning>
        {/* Left Navigation — hidden on mobile, shown md+ */}
        <Sidebar />

        {/* Main Content Pane */}
        <div className="flex-1 flex flex-col min-w-0">
          <Suspense fallback={<div className="h-16 bg-white border-b border-gray-200" />}>
            <TopBar title="ReturnDesk" />
          </Suspense>
          {/* pb-16 on mobile reserves space above the fixed bottom nav bar */}
          <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-20 md:pb-8">
            {children}
          </main>
        </div>

        {/* Bottom Navigation — only visible on mobile (< md) */}
        <MobileNav />
      </body>
    </html>
  );
}
