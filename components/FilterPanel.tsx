'use client';

import type { SearchFilters } from '@/types';
import { RADIUS_OPTIONS } from '@/lib/location';

interface Props {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  totalResults: number;
}

export default function FilterPanel({ filters, onChange, totalResults }: Props) {
  const set = <K extends keyof SearchFilters>(key: K, val: SearchFilters[K]) =>
    onChange({ ...filters, [key]: val });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">

      {/* Radius */}
      <div>
        <label className="text-sm font-semibold text-slate-700 mb-2 block">
          רדיוס חיפוש
        </label>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r}
              onClick={() => set('radius', r)}
              className={`radius-btn rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                filters.radius === r
                  ? 'active border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              {r} ק"מ
            </button>
          ))}
        </div>
      </div>

      {/* Pharmacy type */}
      <div>
        <label className="text-sm font-semibold text-slate-700 mb-2 block">
          סוג בית מרקחת
        </label>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'הכל' },
            { value: 'clalit', label: 'כללית' },
            { value: 'private', label: 'פרטי' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => set('pharmacyType', value as SearchFilters['pharmacyType'])}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                filters.pharmacyType === value
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-blue-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Drug type */}
      <div>
        <label className="text-sm font-semibold text-slate-700 mb-2 block">
          סוג תרופה
        </label>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'הכל' },
            { value: 'original', label: 'מקור' },
            { value: 'generic', label: "ג'נריקה" },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => set('drugType', value as SearchFilters['drugType'])}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                filters.drugType === value
                  ? 'border-purple-600 bg-purple-600 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-purple-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort */}
      <div>
        <label className="text-sm font-semibold text-slate-700 mb-2 block">
          מיון
        </label>
        <div className="flex gap-2">
          {[
            { value: 'distance', label: 'מרחק' },
            { value: 'name', label: 'שם' },
            { value: 'stock', label: 'מלאי' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => set('sortBy', value as SearchFilters['sortBy'])}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                filters.sortBy === value
                  ? 'border-slate-700 bg-slate-700 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Stock only */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            checked={filters.stockOnly}
            onChange={(e) => set('stockOnly', e.target.checked)}
            className="sr-only"
          />
          <div className={`w-10 h-5 rounded-full transition-colors ${
            filters.stockOnly ? 'bg-green-500' : 'bg-slate-200'
          }`}>
            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
              filters.stockOnly ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </div>
        </div>
        <span className="text-sm font-medium text-slate-700">הצג רק עם מלאי</span>
      </label>

      {/* Results count */}
      <p className="text-sm text-slate-500 border-t border-slate-100 pt-3">
        נמצאו <span className="font-semibold text-slate-700">{totalResults}</span> בתי מרקחת
      </p>
    </div>
  );
}
