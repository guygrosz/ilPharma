import type { PharmacyWithStock } from '@/types';

interface Props {
  stock: PharmacyWithStock['stock'];
  label?: string;
  size?: 'sm' | 'md';
}

const CONFIG = {
  in_stock: {
    label: 'במלאי',
    className: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500 stock-in-stock',
  },
  limited: {
    label: 'מלאי מוגבל',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  out_of_stock: {
    label: 'אין במלאי',
    className: 'bg-red-100 text-red-800 border-red-200',
    dot: 'bg-red-500',
  },
  unknown: {
    label: 'לא ידוע',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  },
  clalit_only: {
    label: 'בדוק בטלפון',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-400',
  },
};

export default function StockBadge({ stock, label, size = 'md' }: Props) {
  const key = stock ?? 'unknown';
  const config = CONFIG[key] ?? CONFIG.unknown;
  const displayLabel = label || config.label;

  const sizeClass = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${sizeClass} ${config.className}`}
    >
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {displayLabel}
    </span>
  );
}
