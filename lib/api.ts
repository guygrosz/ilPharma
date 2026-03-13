import type {
  ClalitCity,
  ClalitMedication,
  Medication,
  MedicationDetail,
  Pharmacy,
  PharmacyWithStock,
  StockResult,
} from '@/types';

const API_BASE = '/api';

// ── Drug Search ──────────────────────────────────────────────────────────────

export async function searchDrugs(query: string): Promise<ClalitMedication[]> {
  if (!query || query.trim().length < 2) return [];
  const res = await fetch(
    `${API_BASE}/drugs/search?q=${encodeURIComponent(query.trim())}`
  );
  if (!res.ok) throw new Error('שגיאה בחיפוש תרופות');
  return res.json();
}

export async function getDrugInfo(catCode: number): Promise<MedicationDetail> {
  const res = await fetch(`${API_BASE}/drugs/${catCode}/info`);
  if (!res.ok) throw new Error('שגיאה בטעינת פרטי תרופה');
  return res.json();
}

export async function getDrugGenerics(catCode: number): Promise<Medication[]> {
  const res = await fetch(`${API_BASE}/drugs/${catCode}/generics`);
  if (!res.ok) return [];
  return res.json();
}

// ── Pharmacies ───────────────────────────────────────────────────────────────

export async function getCities(): Promise<ClalitCity[]> {
  const res = await fetch(`${API_BASE}/pharmacies/cities`);
  if (!res.ok) throw new Error('שגיאה בטעינת רשימת ערים');
  return res.json();
}

export async function getNearbyPharmacies(
  lat: number,
  lng: number,
  radiusKm: number = 5
): Promise<Pharmacy[]> {
  const res = await fetch(
    `${API_BASE}/pharmacies/nearby?lat=${lat}&lng=${lng}&r=${radiusKm}`
  );
  if (!res.ok) throw new Error('שגיאה בחיפוש בתי מרקחת');
  return res.json();
}

// ── Stock Check ──────────────────────────────────────────────────────────────

export async function checkStock(
  catCode: number,
  cityCode?: number,
  pharmacyCode?: number
): Promise<StockResult> {
  const res = await fetch(`${API_BASE}/stock/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ catCode, cityCode, pharmacyCode }),
  });
  if (!res.ok) throw new Error('שגיאה בבדיקת מלאי');
  return res.json();
}

// ── Pharmacy Search Results ───────────────────────────────────────────────────

export async function searchPharmaciesWithStock(
  catCode: number,
  lat: number,
  lng: number,
  radiusKm: number,
  cityCode?: number
): Promise<PharmacyWithStock[]> {
  // Get nearby pharmacies and stock in parallel
  const [nearby, stockResult] = await Promise.allSettled([
    getNearbyPharmacies(lat, lng, radiusKm),
    cityCode ? checkStock(catCode, cityCode) : Promise.resolve(null),
  ]);

  const pharmacies: PharmacyWithStock[] = nearby.status === 'fulfilled'
    ? nearby.value
    : [];

  if (stockResult.status === 'fulfilled' && stockResult.value) {
    const stockData = stockResult.value;
    // Merge stock data with pharmacy info
    for (const ph of pharmacies) {
      if (ph.type === 'clalit' && ph.deptCode) {
        const stockPh = stockData.pharmaciesList?.find(
          (s) => s.pharmacyName?.includes(ph.name.split(' ').pop() || '')
        );
        if (stockPh) {
          const kod = stockPh.medicationsList?.[0]?.kodStatusMlay;
          ph.stock = kodToStatus(kod);
          ph.stockLabel = STOCK_LABELS[kod] ?? 'אין מידע';
          ph.isOpen = stockPh.ifOpenedNow;
        }
      }
    }
  }

  return pharmacies;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STOCK_LABELS: Record<number, string> = {
  30: 'במלאי',
  20: 'מלאי מוגבל',
  0: 'אין במלאי',
  10: 'אין מידע',
};

function kodToStatus(kod: number | undefined): PharmacyWithStock['stock'] {
  switch (kod) {
    case 30: return 'in_stock';
    case 20: return 'limited';
    case 0: return 'out_of_stock';
    default: return 'unknown';
  }
}

// ── Notifications ─────────────────────────────────────────────────────────────

export async function subscribeToAlert(
  subscription: PushSubscription,
  catCode: number,
  drugName: string,
  cityCode?: number,
  cityName?: string
) {
  const serialized = subscription.toJSON();
  const res = await fetch(`${API_BASE}/notifications/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoint: serialized.endpoint,
      keys: serialized.keys,
      catCode,
      drugName,
      cityCode,
      cityName,
    }),
  });
  if (!res.ok) throw new Error('שגיאה בהרשמה להתראות');
  return res.json();
}
