'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createRequest } from '@/lib/api';
import { REASONS } from '@/lib/constants';
import { ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function NewRequestPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    order_id: '',
    item_name: '',
    item_sku: '',
    quantity: 1,
    reason: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!formData.reason) {
      setError({ message: 'Please select a reason for the return.' });
      return;
    }

    try {
      setLoading(true);
      const payload = {
        customer_name: formData.customer_name.trim(),
        customer_email: formData.customer_email.trim(),
        order_id: formData.order_id.trim(),
        item_name: formData.item_name.trim(),
        item_sku: formData.item_sku?.trim() || undefined,
        quantity: parseInt(formData.quantity, 10) || 1,
        reason: formData.reason,
      };

      const res = await createRequest(payload);

      // If initial note was entered, add it
      if (formData.notes?.trim() && res?.data?.id) {
        try {
          const { addNote } = await import('@/lib/api');
          await addNote(res.data.id, formData.notes.trim());
        } catch (noteErr) {
          console.warn('Note add failed:', noteErr);
        }
      }

      router.push(`/requests/${res.data.id}`);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Back to Requests + Header per Screenshot 1 */}
      <div className="flex items-start gap-4">
        <Link
          href="/requests"
          className="mt-1 p-2 rounded-xl text-gray-400 hover:text-gray-900 hover:bg-white border border-transparent hover:border-gray-200 transition-all"
          title="Back to Returns"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create Return Request</h1>
          <p className="text-sm text-gray-500 mt-1">Enter details to initiate a new return process manually.</p>
        </div>
      </div>

      {/* Main Request Details Form Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 md:p-8">
          <h2 className="text-base font-bold text-gray-900 mb-6">Request Details</h2>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{error.message || 'Failed to submit request.'}</p>
                {error.details && (
                  <ul className="list-disc pl-4 mt-1.5 space-y-0.5">
                    {error.details.map((d, i) => (
                      <li key={i}>{d.message}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Customer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) => handleChange('customer_name', e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Order ID */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Order ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.order_id}
                  onChange={(e) => handleChange('order_id', e.target.value)}
                  placeholder="ORD-12345-ABC"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
                />
              </div>

              {/* Contact Information */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Contact Information (Email) <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.customer_email}
                  onChange={(e) => handleChange('customer_email', e.target.value)}
                  placeholder="jane.doe@example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Item / Product */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Item / Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) => handleChange('item_name', e.target.value)}
                  placeholder="Search product name or SKU"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Quantity to Return */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Quantity to Return <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) => handleChange('quantity', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Reason for Return */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Reason for Return <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.reason}
                  onChange={(e) => handleChange('reason', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                >
                  <option value="">Select a reason...</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Item SKU (optional) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Item SKU <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={formData.item_sku}
                  onChange={(e) => handleChange('item_sku', e.target.value)}
                  placeholder="e.g. SKU-8839"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-mono"
                />
              </div>
            </div>

            {/* Additional Notes (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">
                Additional Notes <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                placeholder="Add any specific details provided by the customer..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
              />
            </div>

            {/* Form Footer Buttons matching Screenshot 1 */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <Link
                href="/requests"
                className="px-6 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-sm font-semibold transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-semibold shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
