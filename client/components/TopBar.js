'use client';
import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Bell, HelpCircle, User, X } from 'lucide-react';

export default function TopBar({ title = 'Return Portal' }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inputValue, setInputValue] = useState(searchParams.get('search') || '');
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef(null);

  // Sync input when url changes externally
  useEffect(() => {
    setInputValue(searchParams.get('search') || '');
  }, [searchParams]);

  function handleSearch(value) {
    setInputValue(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (value.trim()) {
          params.set('search', value.trim());
          params.set('page', '1');
        } else {
          params.delete('search');
        }
        router.push(`/requests?${params.toString()}`);
      });
    }, 250); // Faster 250ms debounce for snappier feedback
  }

  return (
    <header className="h-16 bg-white border-b border-gray-200/90 flex items-center px-6 md:px-8 gap-6 sticky top-0 z-20 shadow-2xs">
      <h2 className="text-base font-bold text-gray-900 shrink-0 tracking-tight">{title}</h2>

      {/* Global search */}
      <div className="flex-1 max-w-md relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={inputValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search orders, customer, reference ID..."
          className="w-full pl-10 pr-9 py-2 text-xs font-medium text-gray-900 border border-gray-200 rounded-xl bg-gray-50/80 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-400"
        />
        {inputValue && (
          <button
            onClick={() => handleSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 p-0.5 rounded cursor-pointer"
            title="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2.5 ml-auto">
        <button
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
        </button>
        <button
          className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          title="Help & FAQ"
        >
          <HelpCircle className="w-4.5 h-4.5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
          H
        </div>
      </div>
    </header>
  );
}
