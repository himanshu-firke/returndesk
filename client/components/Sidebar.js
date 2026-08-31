'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { RefreshCw, LayoutDashboard, BarChart2, Settings, User } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/requests', label: 'Returns', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white shadow-sm">
          <RefreshCw className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-base font-bold text-gray-900 leading-none">OpsCenter</h1>
          <p className="text-xs text-gray-500 mt-1 leading-none font-medium">Return Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-blue-700' : 'text-gray-500'}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Agent Profile (from UI screenshot) */}
      <div className="p-4 border-t border-gray-100 mt-auto">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 border border-gray-100">
          <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-semibold text-xs shrink-0">
            AD
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900 truncate leading-tight">Agent Davis</p>
            <p className="text-[11px] text-gray-500 truncate leading-tight">Support Tier 2</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
