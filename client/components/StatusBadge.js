import { STATUS_STYLES } from '@/lib/constants';

export default function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES['Open'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${style.bg} ${style.text} ${style.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {status}
    </span>
  );
}
