'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getDrugInfo, getDrugGenerics } from '@/lib/api';
import type { MedicationDetail, Medication } from '@/types';

function DrugPageContent() {
  const searchParams = useSearchParams();
  const catCode = searchParams.get('catCode') || '';
  const router = useRouter();
  const [drug, setDrug] = useState<MedicationDetail | null>(null);
  const [generics, setGenerics] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'sideEffects' | 'generics'>('info');

  useEffect(() => {
    const code = Number(catCode);
    if (isNaN(code) || !catCode) { setError('קוד תרופה לא תקין'); setIsLoading(false); return; }

    Promise.all([getDrugInfo(code), getDrugGenerics(code)])
      .then(([info, gen]) => {
        setDrug(info);
        setGenerics(gen);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [catCode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`skeleton h-${i === 0 ? '8' : '16'} rounded-xl`} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => router.back()} className="text-blue-600 underline">חזרה</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-blue-600 p-1 hover:bg-blue-50 rounded-lg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l7 7-7 7" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-slate-900 truncate">{drug?.omryName || 'פרטי תרופה'}</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">

        {/* Drug overview card */}
        {drug && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">{drug.omryName}</h2>
                {drug.genericName && (
                  <p className="text-sm text-slate-500">שם גנרי: <span className="font-medium text-slate-700">{drug.genericName}</span></p>
                )}
              </div>
              {drug.isGeneric !== undefined && (
                <span className={`text-xs font-semibold rounded-full px-2.5 py-1 flex-shrink-0 ${
                  drug.isGeneric
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {drug.isGeneric ? "ג'נריקה" : 'מקורי'}
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {drug.manufacturer && (
                <div>
                  <span className="text-slate-400">יצרן</span>
                  <p className="font-medium text-slate-700">{drug.manufacturer}</p>
                </div>
              )}
              {drug.activeIngredient && (
                <div>
                  <span className="text-slate-400">חומר פעיל</span>
                  <p className="font-medium text-slate-700">{drug.activeIngredient}</p>
                </div>
              )}
              {drug.dosageForm && (
                <div>
                  <span className="text-slate-400">צורת מינון</span>
                  <p className="font-medium text-slate-700">{drug.dosageForm}</p>
                </div>
              )}
              {drug.registrationNumber && (
                <div>
                  <span className="text-slate-400">מספר רישום</span>
                  <p className="font-medium text-slate-700">{drug.registrationNumber}</p>
                </div>
              )}
            </div>

            <button
              onClick={() => router.push(`/search/?q=${encodeURIComponent(drug.omryName)}&catCode=${catCode}`)}
              className="mt-4 w-full rounded-xl bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              🔍 חפש בבתי מרקחת קרובים
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white rounded-t-xl overflow-hidden">
          {[
            { key: 'info', label: 'מידע' },
            { key: 'sideEffects', label: 'תופעות לוואי' },
            { key: 'generics', label: `ג'נריקות (${generics.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as typeof activeTab)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="bg-white rounded-b-xl border border-t-0 border-slate-200 p-5">

          {activeTab === 'info' && drug && (
            <div className="space-y-4">
              {drug.indications && (
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">אינדיקציות</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{drug.indications}</p>
                </div>
              )}
              {drug.contraindications && (
                <div>
                  <h3 className="font-semibold text-slate-700 mb-2">התוויות נגד</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{drug.contraindications}</p>
                </div>
              )}
              {!drug.indications && !drug.contraindications && (
                <p className="text-slate-400 text-sm text-center py-4">מידע נוסף לא זמין</p>
              )}
            </div>
          )}

          {activeTab === 'sideEffects' && (
            <div>
              {drug?.sideEffects && drug.sideEffects.length > 0 ? (
                <ul className="space-y-2">
                  {drug.sideEffects.map((effect, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
                      {effect}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 text-sm text-center py-4">לא נמצאו תופעות לוואי ידועות</p>
              )}
              <p className="mt-4 text-xs text-slate-400 border-t border-slate-100 pt-3">
                מידע מ-OpenFDA. תמיד התייעץ עם רופא או רוקח.
              </p>
            </div>
          )}

          {activeTab === 'generics' && (
            <div>
              {generics.length > 0 ? (
                <div className="space-y-2">
                  {generics.map((g) => (
                    <button
                      key={g.catCode}
                      onClick={() => router.push(`/drug/?catCode=${g.catCode}`)}
                      className="w-full text-start rounded-xl border border-slate-100 p-3 hover:border-blue-200 hover:bg-blue-50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800 text-sm">{g.omryName}</span>
                        <span className="text-xs text-slate-400">{g.manufacturer}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm text-center py-4">לא נמצאו ג&apos;נריקות</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DrugPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-xl" />
          ))}
        </div>
      </div>
    }>
      <DrugPageContent />
    </Suspense>
  );
}
