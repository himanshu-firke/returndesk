import { Suspense } from 'react';
import { Inter } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
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
        {/* Left Navigation */}
        <Sidebar />

        {/* Main Content Pane */}
        <div className="flex-1 flex flex-col min-w-0">
          <Suspense fallback={<div className="h-16 bg-white border-b border-gray-200" />}>
            <TopBar title="ReturnDesk" />
          </Suspense>
          <main className="flex-1 p-6 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
