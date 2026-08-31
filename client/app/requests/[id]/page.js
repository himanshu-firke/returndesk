'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchRequest, updateRequest, transitionStatus, removeRequest } from '@/lib/api';
import { REASONS, DECIDED_STATUSES, REMOVABLE_STATUSES, LEGAL_TRANSITIONS } from '@/lib/constants';
import StatusBadge from '@/components/StatusBadge';
import NotesSidebar from '@/components/NotesSidebar';
import StatusTransitionModal from '@/components/StatusTransitionModal';
import ErrorState from '@/components/ErrorState';
import {
  ArrowLeft,
  Save,
  Trash2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id;

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state for editable details
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    item_name: '',
    item_sku: '',
    quantity: 1,
    reason: '',
  });

  // Modal state
  const [modalTargetStatus, setModalTargetStatus] = useState(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadRequest() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchRequest(requestId);
        if (!isCancelled) {
          const data = res.data;
          setRequest(data);
          setFormData({
            customer_name: data.customer_name || '',
            customer_email: data.customer_email || '',
            item_name: data.item_name || '',
            item_sku: data.item_sku || '',
            quantity: data.quantity || 1,
            reason: data.reason || '',
          });
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

    loadRequest();

    return () => {
      isCancelled = true;
    };
  }, [requestId]);

  function handleInputChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaveSuccess(false);
  }

  async function handleSaveChanges(e) {
    if (e) e.preventDefault();
    if (isDecided || saving) return;

    try {
      setSaving(true);
      setError(null);
      const payload = {
        customer_name: formData.customer_name.trim(),
        customer_email: formData.customer_email.trim(),
        item_name: formData.item_name.trim(),
        item_sku: formData.item_sku?.trim() || null,
        quantity: parseInt(formData.quantity, 10) || 1,
        reason: formData.reason,
      };

      const res = await updateRequest(requestId, payload);
      setRequest((prev) => ({ ...prev, ...res.data }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusTransition(payload) {
    if (payload.action === 'remove') {
      await removeRequest(requestId);
      router.push('/requests');
      return;
    }

    const res = await transitionStatus(requestId, payload);
    setRequest((prev) => ({ ...prev, ...res.data }));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3500);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-400">
        <RotateCw className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-xs font-medium text-gray-500">Loading request details...</p>
      </div>
    );
  }

  if (error && !request) {
    return <ErrorState error={error} onRetry={() => router.refresh()} />;
  }

  const isDecided = DECIDED_STATUSES.includes(request?.status);
  const isRemovable = REMOVABLE_STATUSES.includes(request?.status);
  const legalNextStatuses = LEGAL_TRANSITIONS[request?.status] || [];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Top Breadcrumb & Title */}
      <div className="space-y-2">
        <Link
          href="/requests"
          prefetch={true}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Request
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isDecided ? 'View Return Request' : 'Edit Return Request'}
            </h1>
            <StatusBadge status={request.status} />
          </div>

          {/* Quick status actions header */}
          <div className="flex flex-wrap items-center gap-2">
            {legalNextStatuses.map((nextStatus) => (
              <button
                key={nextStatus}
                type="button"
                onClick={() => setModalTargetStatus(nextStatus)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-all active:scale-[0.98] cursor-pointer ${
                  nextStatus === 'Approved'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : nextStatus === 'Rejected'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <span>Move to {nextStatus}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ))}

            {isRemovable && (
              <button
                type="button"
                onClick={() => setModalTargetStatus('REMOVE')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 border border-red-200 transition-colors shadow-2xs cursor-pointer"
                title="Soft delete request"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Decided Banner / Locked Message (Rule 4) */}
      {isDecided && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-amber-950">
              Request Details Locked ({request.status})
            </p>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              Per business policy, once a return request is decided (Approved, Rejected, or Completed), customer and item details cannot be edited. Internal notes may still be appended.
            </p>
          </div>
        </div>
      )}

      {/* Resolution info for Approved / Completed */}
      {request.resolution && (
        <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-green-900 flex items-center justify-between gap-4 shadow-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-green-700 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-green-950">Approved Resolution: </span>
              <span className="font-semibold">{request.resolution}</span>
              {request.refund_amount && (
                <span className="ml-2 bg-green-200/70 text-green-950 font-bold px-2 py-0.5 rounded-md font-mono">
                  ${parseFloat(request.refund_amount).toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Feedback alerts */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-green-50 border border-green-200 text-xs font-semibold text-green-800 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          Changes saved successfully.
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{error.message || 'Action failed.'}</p>
            {error.details && (
              <ul className="list-disc pl-4 mt-1 space-y-0.5">
                {error.details.map((d, i) => (
                  <li key={i}>{d.message}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Details (2 Cols on lg) */}
        <div className="lg:col-span-2 space-y-6">
          <form id="edit-request-form" onSubmit={handleSaveChanges} className="space-y-6">
            {/* Customer Information Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-gray-900">Customer Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isDecided}
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed font-medium text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    required
                    disabled={isDecided}
                    value={formData.customer_email}
                    onChange={(e) => handleInputChange('customer_email', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed font-medium text-gray-900 font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Order & Item Details Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-gray-900">Order &amp; Item Details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Order ID
                  </label>
                  <input
                    type="text"
                    disabled
                    value={request.order_id}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-100 text-gray-600 font-mono cursor-not-allowed"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Order ID cannot be changed.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Item / Product Name
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isDecided}
                    value={formData.item_name}
                    onChange={(e) => handleInputChange('item_name', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed font-medium text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    disabled={isDecided}
                    value={formData.quantity}
                    onChange={(e) => handleInputChange('quantity', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed font-medium text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Reason for Return
                  </label>
                  <select
                    disabled={isDecided}
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed bg-white font-medium text-gray-900"
                  >
                    {REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Item SKU <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    disabled={isDecided}
                    value={formData.item_sku}
                    onChange={(e) => handleInputChange('item_sku', e.target.value)}
                    placeholder="e.g. SKU-1002"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Right Column: Actions Card & Internal Notes */}
        <div className="space-y-6">
          {/* Top Action Card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <span className="text-[11px] font-bold text-gray-500 tracking-wider uppercase">REQUEST ID</span>
              <span className="font-mono text-sm font-bold text-gray-900">{request.reference}</span>
            </div>

            {!isDecided && (
              <button
                type="submit"
                form="edit-request-form"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-900 hover:bg-black text-white text-sm font-bold rounded-xl transition-all shadow-xs active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}

            <Link
              href="/requests"
              prefetch={true}
              className="w-full block text-center py-2.5 px-4 border border-gray-300 text-gray-700 hover:bg-gray-50 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </Link>
          </div>

          {/* Internal Notes Card */}
          <NotesSidebar
            requestId={requestId}
            notes={request.notes || []}
          />
        </div>
      </div>

      {/* Status Transition & Removal Modal */}
      <StatusTransitionModal
        isOpen={Boolean(modalTargetStatus)}
        onClose={() => setModalTargetStatus(null)}
        targetStatus={modalTargetStatus}
        currentStatus={request.status}
        reference={request.reference}
        onConfirm={handleStatusTransition}
      />
    </div>
  );
}
