'use client';
import Link from 'next/link';
import { PackageOpen, SearchX, Plus, RotateCcw } from 'lucide-react';

export default function EmptyState({
  type = 'empty', // 'empty' | 'no-results'
  searchQuery = '',
  onClearFilters,
}) {
  if (type === 'no-results') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-gray-100/80 border border-gray-200/80 flex items-center justify-center text-gray-500 mb-6 shadow-xs">
          <SearchX className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No results found</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          Try adjusting your search or filters to find what you&apos;re looking for.
          {searchQuery && (
            <span> We couldn&apos;t find any return requests matching &ldquo;<span className="font-semibold text-gray-800">{searchQuery}</span>&rdquo;.</span>
          )}
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="px-6 py-2.5 bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-800 text-sm font-semibold rounded-xl transition-all shadow-xs"
          >
            Clear All Filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 px-6 text-center max-w-md mx-auto">
      <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 mb-6 shadow-xs">
        <PackageOpen className="w-10 h-10 text-gray-500" strokeWidth={1.5} />
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mb-2">No Return Requests</h3>
      <p className="text-sm text-gray-500 mb-8 leading-relaxed">
        Customer return requests will appear here once they are initiated.
      </p>
      <Link
        href="/requests/new"
        className="flex items-center gap-2 px-6 py-3 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98]"
      >
        <Plus className="w-4 h-4" />
        Create Return Request
      </Link>
    </div>
  );
}
