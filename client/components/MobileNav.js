'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart2, Settings } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/requests', label: 'Returns', icon: LayoutDashboard },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

/**
 * Mobile bottom navigation bar — visible only on screens narrower than md (768px).
 * Replaces the left sidebar for small screens (down to 375px per PRD).
 */
export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 flex">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-1 text-[10px] font-semibold transition-colors ${
              isActive ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
