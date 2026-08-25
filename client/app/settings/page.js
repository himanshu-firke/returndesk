import Link from 'next/link';
import { Settings, ArrowLeft } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings &amp; Policies</h1>
          <p className="text-sm text-gray-500">Return desk configuration and store policies.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 space-y-4">
        <h2 className="text-base font-bold text-gray-900">Configured Business Rules</h2>
        <ul className="text-xs text-gray-600 space-y-2 list-disc pl-5">
          <li><strong>Rule 1:</strong> Legal status flow enforced: Open → In Review → Approved / Rejected → Completed.</li>
          <li><strong>Rule 2:</strong> Approvals require a resolution (Refund, Replacement, Store Credit) and positive refund amount.</li>
          <li><strong>Rule 3:</strong> One live request per item per order.</li>
          <li><strong>Rule 4:</strong> Requests are locked once decided.</li>
          <li><strong>Rule 5:</strong> Soft deletion only for Open or Rejected requests.</li>
        </ul>
        <div className="pt-4 border-t border-gray-100">
          <Link
            href="/requests"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-black transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Return Desk
          </Link>
        </div>
      </div>
    </div>
  );
}
