import Link from 'next/link';
import { BarChart2, ArrowLeft } from 'lucide-react';

export default function AnalyticsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
          <BarChart2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Returns Analytics</h1>
          <p className="text-sm text-gray-500">Return desk metrics and summary.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center space-y-4">
        <p className="text-sm text-gray-600">
          Analytics dashboard overview. Use the Returns tab to manage and review active customer return cases.
        </p>
        <Link
          href="/requests"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-xs font-semibold rounded-xl hover:bg-black transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Return Desk
        </Link>
      </div>
    </div>
  );
}
