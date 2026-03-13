import type { PharmacyWithStock } from '@/types';
import StockBadge from './StockBadge';
import NavigationButtons from './NavigationButtons';
import { formatDistance } from '@/lib/location';

interface Props {
  pharmacy: PharmacyWithStock;
  selected?: boolean;
  onClick?: () => void;
  isLoadingStock?: boolean;
}

export default function PharmacyCard({ pharmacy, selected, onClick, isLoadingStock }: Props) {
  const isClalitBranch = pharmacy.type === 'clalit';

  const clalitAppointmentUrl = isClalitBranch && pharmacy.deptCode
    ? `https://portals.clalit.co.il/PharmacyAppointments/Default?deptCode=${pharmacy.deptCode}`
    : null;

  const privateWebsite: Record<string, string> = {
    'super-pharm': 'https://www.super-pharm.co.il',
    'new-pharm': 'https://www.newpharm.co.il',
    'pharmacy-one': 'https://www.pharmacyone.co.il',
  };
  const privateUrl = pharmacy.chain ? privateWebsite[pharmacy.chain] : null;

  return (
    <div
      className={`pharmacy-card rounded-xl border bg-white p-4 cursor-pointer ${
        selected ? 'selected border-blue-500' : 'border-slate-200'
      }`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${
              isClalitBranch ? 'bg-blue-500' : 'bg-green-500'
            }`} />
            <h3 className="font-semibold text-slate-900 text-sm leading-tight">{pharmacy.name}</h3>
            {isClalitBranch ? (
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-1.5 py-0.5">כללית</span>
            ) : (
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5">פרטי</span>
            )}
          </div>
        </div>
        {pharmacy.distance !== undefined && (
          <span className="text-sm font-medium text-blue-600 flex-shrink-0">
            {formatDistance(pharmacy.distance)}
          </span>
        )}
      </div>

      {/* Address & phone */}
      {pharmacy.address && (
        <p className="text-sm text-slate-500 mb-1">{pharmacy.address}</p>
      )}
      {pharmacy.phone && (
        <a
          href={`tel:${pharmacy.phone}`}
          className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          onClick={(e) => e.stopPropagation()}
        >
          {pharmacy.phone}
        </a>
      )}

      {/* Hours */}
      {pharmacy.openingHours && (
        <p className="text-xs text-slate-400 mb-2">{pharmacy.openingHours}</p>
      )}

      {/* Open/closed badge */}
      {pharmacy.isOpen !== undefined && (
        <span className={`text-xs font-medium rounded px-1.5 py-0.5 ${
          pharmacy.isOpen
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-600'
        }`}>
          {pharmacy.isOpen ? 'פתוח' : 'סגור'}
        </span>
      )}

      {/* Stock */}
      <div className="mt-3 mb-3">
        {isLoadingStock ? (
          <div className="skeleton h-6 w-24" />
        ) : isClalitBranch ? (
          <StockBadge stock={pharmacy.stock} label={pharmacy.stockLabel} />
        ) : (
          <StockBadge stock={undefined} label="בדוק בטלפון" />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        <NavigationButtons lat={pharmacy.lat} lng={pharmacy.lng} name={pharmacy.name} />

        {clalitAppointmentUrl && (
          <a
            href={clalitAppointmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            📅 קביעת תור
          </a>
        )}

        {!isClalitBranch && privateUrl && (
          <a
            href={privateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            🌐 אתר הרשת
          </a>
        )}
      </div>
    </div>
  );
}
