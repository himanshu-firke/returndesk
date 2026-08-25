'use client';
import { useState } from 'react';
import { RESOLUTIONS } from '@/lib/constants';
import { AlertCircle, CheckCircle2, XCircle, ArrowRight, Trash2, X } from 'lucide-react';

export default function StatusTransitionModal({
  isOpen,
  onClose,
  targetStatus, // 'In Review' | 'Approved' | 'Rejected' | 'Completed' | 'REMOVE'
  currentStatus,
  reference,
  onConfirm,
}) {
  const [resolution, setResolution] = useState('Refund');
  const [refundAmount, setRefundAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const isApproval = targetStatus === 'Approved';
  const isRemoval = targetStatus === 'REMOVE';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (isApproval) {
      if (!resolution) {
        setError('Please select a resolution.');
        return;
      }
      if (resolution === 'Refund') {
        const amt = parseFloat(refundAmount);
        if (isNaN(amt) || amt <= 0) {
          setError('A refund amount greater than 0 is required for refunds.');
          return;
        }
      }
    }

    try {
      setLoading(true);
      if (isRemoval) {
        await onConfirm({ action: 'remove' });
      } else if (isApproval) {
        await onConfirm({
          status: 'Approved',
          resolution,
          refund_amount: resolution === 'Refund' ? parseFloat(refundAmount) : null,
        });
      } else {
        await onConfirm({ status: targetStatus });
      }
      onClose();
    } catch (err) {
      setError(err?.message || 'Action failed. Please check business rules.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isRemoval ? (
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
            ) : isApproval ? (
              <div className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            ) : targetStatus === 'Rejected' ? (
              <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <ArrowRight className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                {isRemoval ? `Remove Request ${reference}` : `Transition to ${targetStatus}`}
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Current status: <span className="font-semibold text-gray-700">{currentStatus}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {isRemoval ? (
              <p className="text-sm text-gray-600 leading-relaxed">
                Are you sure you want to remove <span className="font-semibold text-gray-900">{reference}</span>?
                This will soft-delete the request and hide it from active returns.
              </p>
            ) : isApproval ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                    Select Resolution <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {RESOLUTIONS.map((res) => {
                      const isSelected = resolution === res;
                      return (
                        <button
                          key={res}
                          type="button"
                          onClick={() => setResolution(res)}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${
                            isSelected
                              ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs'
                              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {res}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {resolution === 'Refund' && (
                  <div>
                    <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider mb-2">
                      Refund Amount ($) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="e.g. 49.99"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                    />
                    <p className="text-[11px] text-gray-500 mt-1.5">
                      Enter the positive amount to refund to the original payment method.
                    </p>
                  </div>
                )}

                {resolution !== 'Refund' && (
                  <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600">
                    No refund amount will be recorded for <strong>{resolution}</strong> per store return policy.
                  </div>
                )}
              </div>
            ) : targetStatus === 'Rejected' ? (
              <p className="text-sm text-gray-600 leading-relaxed">
                Are you sure you want to reject request <strong className="text-gray-900">{reference}</strong>?
                This will finalize the request as Rejected.
              </p>
            ) : targetStatus === 'Completed' ? (
              <p className="text-sm text-gray-600 leading-relaxed">
                Mark request <strong className="text-gray-900">{reference}</strong> as Completed?
                This will close out the return cycle.
              </p>
            ) : (
              <p className="text-sm text-gray-600 leading-relaxed">
                Move request <strong className="text-gray-900">{reference}</strong> to <strong className="text-gray-900">{targetStatus}</strong> for support review?
              </p>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-100 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 ${
                isRemoval || targetStatus === 'Rejected'
                  ? 'bg-red-600 hover:bg-red-700'
                  : isApproval
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-900 hover:bg-black'
              }`}
            >
              {loading ? 'Processing...' : isRemoval ? 'Confirm Removal' : `Confirm ${targetStatus}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
