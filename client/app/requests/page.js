'use client';

import { useState, useEffect, useTransition, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchRequests } from '@/lib/api';
import { STATUSES, REASONS } from '@/lib/constants';
import StatusBadge from '@/components/StatusBadge';
import EmptyState from '@/components/EmptyState';
import ErrorState from '@/components/ErrorState';
import {
  Plus,
  ChevronDown,
  X,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCw,
} from 'lucide-react';

function RequestsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const reason = searchParams.get('reason') || '';
  const sortBy = searchParams.get('sortBy') || 'created_at';
  const sortOrder = searchParams.get('sortOrder') || 'desc';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = 10;

  const [requests, setRequests] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchRequests({ search, status, reason, sortBy, sortOrder, page, limit });
        if (!isCancelled) {
          setRequests(res.data || []);
          setPagination(res.pagination || { page, limit, total: 0, totalPages: 1 });
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [search, status, reason, sortBy, sortOrder, page]);

  function updateParams(newParams) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    startTransition(() => {
      router.push(`/requests?${params.toString()}`);
    });
  }

  function clearAllFilters() {
    startTransition(() => {
      router.push('/requests');
    });
  }

  function toggleSort(field) {
    if (sortBy === field) {
      updateParams({ sortBy: field, sortOrder: sortOrder === 'asc' ? 'desc' : 'asc', page: '1' });
    } else {
      updateParams({ sortBy: field, sortOrder: 'desc', page: '1' });
    }
  }

  const hasActiveFilters = Boolean(search || status || reason);

  if (error) {
    return <ErrorState error={error} onRetry={() => router.refresh()} />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Return Requests</h1>
          <p className="text-sm text-gray-500 mt-1">Manage, review, and process customer returns.</p>
        </div>

        {/* Top Controls: Filter Dropdowns + New Return Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="relative">
            <select
              value={status}
              onChange={(e) => updateParams({ status: e.target.value, page: '1' })}
              className="appearance-none bg-white border border-gray-300 hover:border-gray-400 px-3.5 py-2 pr-8 rounded-xl text-xs font-semibold text-gray-800 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer transition-all"
            >
              <option value="">Status: All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>Status: {s}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reason Filter */}
          <div className="relative">
            <select
              value={reason}
              onChange={(e) => updateParams({ reason: e.target.value, page: '1' })}
              className="appearance-none bg-white border border-gray-300 hover:border-gray-400 px-3.5 py-2 pr-8 rounded-xl text-xs font-semibold text-gray-800 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer transition-all"
            >
              <option value="">Reason: All</option>
              {REASONS.map((r) => (
                <option key={r} value={r}>Reason: {r}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* New Return CTA */}
          <Link
            href="/requests/new"
            prefetch={true}
            className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-[0.98] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Return
          </Link>
        </div>
      </div>

      {/* Active Filters Chips Bar */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-1 animate-fade-in">
          <span className="text-xs font-medium text-gray-500 mr-1">Active Filters:</span>

          {search && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gray-100 border border-gray-200 text-xs font-semibold text-gray-800 shadow-2xs">
              Search: &ldquo;{search}&rdquo;
              <button
                onClick={() => updateParams({ search: '' })}
                className="hover:text-red-500 p-0.5 rounded transition-colors cursor-pointer"
                title="Remove search filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {status && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-800 shadow-2xs">
              Status: {status}
              <button
                onClick={() => updateParams({ status: '' })}
                className="hover:text-red-500 p-0.5 rounded transition-colors cursor-pointer"
                title="Remove status filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {reason && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 shadow-2xs">
              Reason: {reason}
              <button
                onClick={() => updateParams({ reason: '' })}
                className="hover:text-red-500 p-0.5 rounded transition-colors cursor-pointer"
                title="Remove reason filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="text-xs font-semibold text-gray-500 hover:text-gray-900 px-2 py-1 transition-colors underline underline-offset-2 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Main Table Card or Empty State */}
      <div className="bg-white border border-gray-200/90 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RotateCw className="w-7 h-7 animate-spin text-blue-600 mb-2.5" />
            <p className="text-xs font-medium text-gray-500">Loading return requests...</p>
          </div>
        ) : requests.length === 0 ? (
          hasActiveFilters ? (
            <EmptyState
              type="no-results"
              searchQuery={search}
              onClearFilters={clearAllFilters}
            />
          ) : (
            <EmptyState type="empty" />
          )
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                    <th className="py-3.5 px-5">Reference</th>
                    <th className="py-3.5 px-5">Customer</th>
                    <th className="py-3.5 px-5">Order &amp; Item</th>
                    <th
                      className="py-3.5 px-5 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => toggleSort('reason')}
                    >
                      <div className="flex items-center gap-1">
                        Reason
                        <ArrowUpDown className={`w-3 h-3 ${sortBy === 'reason' ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-5 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => toggleSort('status')}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        <ArrowUpDown className={`w-3 h-3 ${sortBy === 'status' ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    </th>
                    <th
                      className="py-3.5 px-5 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                      onClick={() => toggleSort('created_at')}
                    >
                      <div className="flex items-center gap-1">
                        Date Raised
                        <ArrowUpDown className={`w-3 h-3 ${sortBy === 'created_at' ? 'text-blue-600' : 'text-gray-400'}`} />
                      </div>
                    </th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {requests.map((req) => (
                    <tr
                      key={req.id}
                      className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      onClick={() => {
                        startTransition(() => {
                          router.push(`/requests/${req.id}`);
                        });
                      }}
                    >
                      {/* Reference */}
                      <td className="py-4 px-5 font-mono text-xs font-bold text-gray-900 group-hover:text-blue-700">
                        <Link href={`/requests/${req.id}`} prefetch={true} className="hover:underline">
                          {req.reference}
                        </Link>
                      </td>

                      {/* Customer */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-gray-900 leading-tight">{req.customer_name}</div>
                        <div className="text-xs text-gray-500 leading-tight mt-0.5 font-mono">{req.customer_email}</div>
                      </td>

                      {/* Order & Item */}
                      <td className="py-4 px-5">
                        <div className="font-medium text-gray-900 leading-tight">
                          {req.item_name} <span className="text-xs text-gray-500 font-normal">× {req.quantity}</span>
                        </div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">
                          Order: <span className="font-semibold text-gray-700">{req.order_id}</span>
                          {req.item_sku && <span className="text-gray-400"> · SKU: {req.item_sku}</span>}
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-4 px-5 text-xs text-gray-700 font-medium">
                        {req.reason}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <StatusBadge status={req.status} />
                        {req.resolution && (
                          <div className="text-[11px] text-gray-500 font-medium mt-1">
                            {req.resolution} {req.refund_amount ? `($${parseFloat(req.refund_amount).toFixed(2)})` : ''}
                          </div>
                        )}
                      </td>

                      {/* Date */}
                      <td className="py-4 px-5 text-xs text-gray-500 whitespace-nowrap" suppressHydrationWarning>
                        {new Date(req.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-5 text-right">
                        <Link
                          href={`/requests/${req.id}`}
                          prefetch={true}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 hover:text-gray-900 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-500" />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-600">
              <div>
                Showing <span className="font-semibold text-gray-900">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-semibold text-gray-900">{Math.min(page * limit, pagination.total)}</span> of{' '}
                <span className="font-semibold text-gray-900">{pagination.total}</span> requests
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={page <= 1 || isPending}
                  onClick={() => updateParams({ page: (page - 1).toString() })}
                  className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 transition-colors shadow-2xs cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="px-3 py-1.5 text-xs font-semibold text-gray-800 bg-white border border-gray-200 rounded-lg shadow-2xs">
                  Page {page} of {pagination.totalPages || 1}
                </div>

                <button
                  disabled={page >= pagination.totalPages || isPending}
                  onClick={() => updateParams({ page: (page + 1).toString() })}
                  className="p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-700 transition-colors shadow-2xs cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-medium text-gray-400">Loading Return Desk...</div>}>
      <RequestsContent />
    </Suspense>
  );
}
