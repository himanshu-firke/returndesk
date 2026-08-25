'use client';
import Link from 'next/link';
import { CloudOff, Info, RotateCcw, ArrowLeft } from 'lucide-react';

export default function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
  description = "We're having trouble connecting to the server to load this data. Our engineering team has been notified.",
}) {
  const errorCode = error?.code || (error?.status ? `HTTP_${error.status}` : '503_SERVICE_UNAVAILABLE');
  const errorMessage = error?.message || (typeof error === 'string' ? error : 'An unexpected error occurred.');
  const timestamp = new Date().toISOString();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center max-w-lg mx-auto animate-fade-in">
      {/* Icon with soft red rounded background */}
      <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500 mb-6 shadow-xs">
        <CloudOff className="w-8 h-8" />
      </div>

      {/* Heading & Subtext */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      <p className="text-sm text-gray-500 mb-8 leading-relaxed">{description}</p>

      {/* Structured Error Details Card */}
      <div className="w-full bg-gray-50/80 border border-gray-200/80 rounded-2xl p-5 mb-8 text-left text-xs font-mono text-gray-700 shadow-xs">
        <div className="flex items-start gap-2.5 mb-2.5">
          <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-gray-900">Error Code: </span>
            <span className="font-bold text-red-600">{errorCode}</span>
          </div>
        </div>
        <div className="pl-6.5 space-y-1.5 text-gray-600">
          <p><span className="font-medium text-gray-500">Timestamp: </span>{timestamp}</p>
          <p><span className="font-medium text-gray-500">Details: </span>{errorMessage}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-center gap-4 w-full">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-all shadow-sm active:scale-[0.98]"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        )}
        <Link
          href="/requests"
          className="flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors pt-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to Dashboard Home
        </Link>
      </div>
    </div>
  );
}
