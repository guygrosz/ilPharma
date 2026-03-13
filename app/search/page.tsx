'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import SearchBar from '@/components/SearchBar';
import PharmacyCard from '@/components/PharmacyCard';
import FilterPanel from '@/components/FilterPanel';
import { getNearbyPharmacies, checkStock } from '@/lib/api';
import { getCurrentLocation, haversineDistance, RADIUS_OPTIONS } from '@/lib/location';
import { addToHistory } from '@/lib/history';
import type { PharmacyWithStock, SearchFilters, ClalitMedication } from '@/types';
import { DEFAULT_FILTERS } from '@/types';

// Dynamic import for Leaflet (no SSR)
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 rounded-xl animate-pulse" />,
});

function SearchPageInner() {
  const router = useRouter();
  const params = useSearchParams();

  const query = params.get('q') || '';
  const catCode = params.get('catCode') ? Number(params.get('catCode')) : null;
  const urlLat = params.get('lat') ? Number(params.get('lat')) : null;
  const urlLng = params.get('lng') ? Number(params.get('lng')) : null;

  const [pharmacies, setPharmacies] = useState<PharmacyWithStock[]>([]);
  const [userLat, setUserLat] = useState<number | null>(urlLat);
  const [userLng, setUserLng] = useState<number | null>(urlLng);
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingStock, setIsLoadingStock] = useState(false);
  const [error, setError] = useState('');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [showFilters, setShowFilters] = useState(false);
  const [cityCode, setCityCode] = useState<number | undefined>();

  // Get user location if not from URL
  useEffect(() => {
    if (userLat && userLng) return;
    getCurrentLocation()
      .then((loc) => {
        setUserLat(loc.lat);
        setUserLng(loc.lng);
      })
      .catch(() => {
        // Use Tel Aviv as fallback
        setUserLat(32.0853);
        setUserLng(34.7818);
      });
  }, []);

  // Load pharmacies when location or radius changes
  const loadPharmacies = useCallback(async () => {
    if (!userLat || !userLng) return;
    setIsLoading(true);
    setError('');
    try {
      const data = await getNearbyPharmacies(userLat, userLng, filters.radius);
      // Add distance
      const withDist = data.map((ph) => ({
        ...ph,
        distance: haversineDistance(userLat, userLng, ph.lat, ph.lng),
      }));
      setPharmacies(withDist);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת בתי מרקחת');
    } finally {
      setIsLoading(false);
    }
  }, [userLat, userLng, filters.radius]);

  useEffect(() => {
    loadPharmacies();
  }, [loadPharmacies]);

  // Load stock for Clalit when catCode available
  useEffect(() => {
    if (!catCode || !cityCode) return;
    setIsLoadingStock(true);
    checkStock(catCode, cityCode)
      .then((result) => {
        if (result?.pharmaciesList) {
          setPharmacies((prev) =>
            prev.map((ph) => {
              if (ph.type !== 'clalit') return ph;
              const stockPh = result.pharmaciesList.find(
                (s) =>
                  s.pharmacyName?.toLowerCase().includes(ph.name.toLowerCase().split(' ').pop() || '') ||
                  ph.name.toLowerCase().includes(s.pharmacyName?.toLowerCase().split(' ').pop() || '')
              );
              if (!stockPh) return ph;
              const kod = stockPh.medicationsList?.[0]?.kodStatusMlay;
              const statusMap: Record<number, PharmacyWithStock['stock']> = {
                30: 'in_stock', 20: 'limited', 0: 'out_of_stock', 10: 'unknown',
              };
              const labelMap: Record<number, string> = {
                30: 'במלאי', 20: 'מלאי מוגבל', 0: 'אין במלאי', 10: 'אין מידע',
              };
              return {
                ...ph,
                stock: statusMap[kod] ?? 'unknown',
                stockLabel: labelMap[kod] ?? 'אין מידע',
                isOpen: stockPh.ifOpenedNow,
              };
            })
          );
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingStock(false));
  }, [catCode, cityCode]);

  // Apply filters and sort
  const filtered = pharmacies
    .filter((ph) => {
      if (filters.pharmacyType === 'clalit' && ph.type !== 'clalit') return false;
      if (filters.pharmacyType === 'private' && ph.type !== 'private') return false;
      if (filters.stockOnly && ph.type === 'clalit' && ph.stock !== 'in_stock' && ph.stock !== 'limited') return false;
      return true;
    })
    .sort((a, b) => {
      if (filters.sortBy === 'distance') return (a.distance ?? 99) - (b.distance ?? 99);
      if (filters.sortBy === 'name') return a.name.localeCompare(b.name, 'he');
      if (filters.sortBy === 'stock') {
        const order: Record<string, number> = { in_stock: 0, limited: 1, unknown: 2, out_of_stock: 3 };
        return (order[a.stock ?? 'unknown'] ?? 2) - (order[b.stock ?? 'unknown'] ?? 2);
      }
      return 0;
    });

  const handleDrugSelect = (med: ClalitMedication) => {
    addToHistory({ query: med.omryName, catCode: med.catCode });
    const newParams = new URLSearchParams(params.toString());
    newParams.set('q', med.omryName);
    newParams.set('catCode', String(med.catCode));
    router.replace(`/search?${newParams.toString()}`);
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title: `מחפש ${query}`, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('הקישור הועתק!');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex-shrink-0 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:text-blue-800 p-1 rounded-lg hover:bg-blue-50 flex-shrink-0"
              aria-label="חזרה לדף הבית"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 5l7 7-7 7" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <SearchBar onSelect={handleDrugSelect} initialValue={query} />
            </div>
            <button
              onClick={handleShare}
              className="flex-shrink-0 p-2 rounded-lg border border-slate-200 hover:bg-slate-50"
              aria-label="שתף"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </button>
          </div>

          {/* Query + controls bar */}
          <div className="flex items-center gap-2 flex-wrap">
            {query && (
              <span className="text-sm font-semibold text-slate-700">
                {query}
              </span>
            )}
            {query && catCode && (
              <a
                href={`/drug/${catCode}`}
                className="text-xs text-blue-600 hover:underline"
              >
                פרטי תרופה →
              </a>
            )}
            <div className="flex-1" />

            {/* View toggle */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              {(['list', 'map'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    view === v
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {v === 'list' ? '📋 רשימה' : '🗺️ מפה'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                showFilters ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'
              }`}
            >
              🔽 פילטרים
            </button>
          </div>

          {/* Radius quick selector */}
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {RADIUS_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => setFilters((f) => ({ ...f, radius: r }))}
                className={`rounded-full border text-xs px-2.5 py-1 font-medium transition-colors ${
                  filters.radius === r
                    ? 'border-blue-600 bg-blue-600 text-white'
                    : 'border-slate-200 text-slate-500 hover:border-blue-300'
                }`}
              >
                {r} ק"מ
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full flex gap-4 p-4">

          {/* Filters sidebar */}
          {showFilters && (
            <div className="w-72 flex-shrink-0 overflow-y-auto">
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                totalResults={filtered.length}
              />
            </div>
          )}

          {/* List view */}
          {view === 'list' && (
            <div className="flex-1 overflow-y-auto space-y-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-40 rounded-xl" />
                ))
              ) : error ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                  <p className="text-red-600">{error}</p>
                  <button onClick={loadPharmacies} className="mt-3 text-sm text-red-700 underline">
                    נסה שוב
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                  <p className="text-2xl mb-2">🏥</p>
                  <p className="text-slate-500">לא נמצאו בתי מרקחת בטווח {filters.radius} ק"מ</p>
                  <button
                    onClick={() => setFilters((f) => ({ ...f, radius: Math.min(f.radius + 5, 30) }))}
                    className="mt-3 text-sm text-blue-600 underline"
                  >
                    הרחב חיפוש ל-{Math.min(filters.radius + 5, 30)} ק"מ
                  </button>
                </div>
              ) : (
                filtered.map((ph, i) => (
                  <div key={ph.id} className="slide-up" style={{ animationDelay: `${i * 30}ms` }}>
                    <PharmacyCard
                      pharmacy={ph}
                      selected={ph.id === selectedId}
                      onClick={() => setSelectedId(ph.id === selectedId ? undefined : ph.id)}
                      isLoadingStock={isLoadingStock && ph.type === 'clalit'}
                    />
                  </div>
                ))
              )}
            </div>
          )}

          {/* Map view */}
          {view === 'map' && (
            <div className="flex-1 min-h-0">
              <div className="h-full flex gap-3">
                <div className="flex-1 min-h-0">
                  <MapView
                    pharmacies={filtered}
                    userLocation={userLat && userLng ? { lat: userLat, lng: userLng } : undefined}
                    selectedId={selectedId}
                    onSelect={(ph) => setSelectedId(ph.id === selectedId ? undefined : ph.id)}
                  />
                </div>
                {/* Side list when map is shown */}
                <div className="w-80 overflow-y-auto space-y-2 hidden lg:block">
                  {filtered.map((ph) => (
                    <PharmacyCard
                      key={ph.id}
                      pharmacy={ph}
                      selected={ph.id === selectedId}
                      onClick={() => setSelectedId(ph.id === selectedId ? undefined : ph.id)}
                      isLoadingStock={isLoadingStock && ph.type === 'clalit'}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><p className="text-slate-400">טוען...</p></div>}>
      <SearchPageInner />
    </Suspense>
  );
}
