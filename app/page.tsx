'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SearchBar from '@/components/SearchBar';
import { getSearchHistory, addToHistory } from '@/lib/history';
import { getCurrentLocation } from '@/lib/location';
import type { ClalitMedication, SearchHistoryItem } from '@/types';

export default function HomePage() {
  const router = useRouter();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    setHistory(getSearchHistory());
  }, []);

  const handleSelect = (med: ClalitMedication) => {
    addToHistory({ query: med.omryName, catCode: med.catCode });
    setHistory(getSearchHistory());
    router.push(`/search/?q=${encodeURIComponent(med.omryName)}&catCode=${med.catCode}`);
  };

  const handleSearch = (query: string) => {
    addToHistory({ query });
    setHistory(getSearchHistory());
    router.push(`/search/?q=${encodeURIComponent(query)}`);
  };

  const handleLocate = async () => {
    setIsLocating(true);
    setLocationError('');
    try {
      const loc = await getCurrentLocation();
      router.push(`/search?lat=${loc.lat}&lng=${loc.lng}`);
    } catch (err) {
      setLocationError(err instanceof Error ? err.message : 'שגיאה באיתור מיקום');
    } finally {
      setIsLocating(false);
    }
  };

  const handleHistoryClick = (item: SearchHistoryItem) => {
    const params = new URLSearchParams({ q: item.query });
    if (item.catCode) params.set('catCode', String(item.catCode));
    router.push(`/search?${params.toString()}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-slate-200 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💊</span>
            <div>
              <h1 className="text-lg font-bold text-blue-700">מחפש תרופות</h1>
              <p className="text-xs text-slate-400 hidden sm:block">PharmaFinder IL</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="hidden sm:inline">כללית • סופרפארם • ועוד</span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">

          {/* Title */}
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-slate-900 mb-3 leading-tight">
              מצא את התרופה שלך<br/>
              <span className="text-blue-600">בקרבת מקום</span>
            </h2>
            <p className="text-slate-500 text-lg">
              בדיקת מלאי בזמן אמת בכללית ובתי מרקחת פרטיים
            </p>
          </div>

          {/* Search box */}
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-6 mb-6">
            <SearchBar onSelect={handleSelect} onSearch={handleSearch} autoFocus />

            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 border-t border-slate-100" />
              <span className="text-xs text-slate-400">או</span>
              <div className="flex-1 border-t border-slate-100" />
            </div>

            <button
              onClick={handleLocate}
              disabled={isLocating}
              className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-blue-200 bg-blue-50 py-3.5 text-blue-700 font-semibold text-base hover:bg-blue-100 hover:border-blue-300 transition-colors disabled:opacity-60"
            >
              {isLocating ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4" />
                  </svg>
                  מאתר מיקום...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <circle cx="12" cy="12" r="3" />
                    <line x1="12" y1="2" x2="12" y2="5" />
                    <line x1="12" y1="19" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="5" y2="12" />
                    <line x1="19" y1="12" x2="22" y2="12" />
                  </svg>
                  השתמש במיקום שלי
                </>
              )}
            </button>

            {locationError && (
              <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{locationError}</p>
            )}
          </div>

          {/* Search history */}
          {history.length > 0 && (
            <div className="bg-white/70 rounded-2xl border border-slate-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-600 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12,6 12,12 16,14" />
                  </svg>
                  חיפושים אחרונים
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.slice(0, 8).map((item) => (
                  <button
                    key={item.timestamp}
                    onClick={() => handleHistoryClick(item)}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors"
                  >
                    {item.query}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          <div className="mt-8 grid grid-cols-3 gap-4 text-center">
            {[
              { emoji: '🔍', label: 'חיפוש חכם', desc: 'עברית ואנגלית' },
              { emoji: '📍', label: 'לפי מיקום', desc: 'GPS + מרחק' },
              { emoji: '🗺️', label: 'על המפה', desc: 'כולל ניווט' },
            ].map(({ emoji, label, desc }) => (
              <div key={label} className="bg-white/60 rounded-2xl p-4 border border-slate-100">
                <div className="text-2xl mb-1">{emoji}</div>
                <div className="text-sm font-semibold text-slate-700">{label}</div>
                <div className="text-xs text-slate-400">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-100">
        מידע על מלאי כללית מהאתר הרשמי של כללית • בתי מרקחת פרטיים מ-OpenStreetMap
      </footer>
    </main>
  );
}
