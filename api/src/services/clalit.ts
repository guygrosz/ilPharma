/**
 * Clalit Pharmacy API Service
 * Based on the clalit-pharm-search skill by tomron
 * API: https://e-services.clalit.co.il/PharmacyStockCoreAPI/Search/
 */

const SEARCH_BASE = 'https://e-services.clalit.co.il/PharmacyStockCoreAPI/Search';
const LANG = 'he-il';

function encodeSearchText(str: string): string {
  return Buffer.from(encodeURIComponent(str)).toString('base64');
}

async function searchPost<T>(path: string, body: object): Promise<T> {
  const url = `${SEARCH_BASE}/${path}?lang=${LANG}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Clalit API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export interface ClalitMedication {
  catCode: number;
  omryName: string;
}

export interface ClalitPharmacy {
  deptCode: number;
  deptName: string;
}

export interface ClalitCity {
  cityCode: number;
  cityName: string;
}

export async function searchMedications(query: string): Promise<ClalitMedication[]> {
  const results = await searchPost<ClalitMedication[]>('GetFilterefMedicationsList', {
    searchText: encodeSearchText(query),
    isPrefix: true,
  });
  return results ?? [];
}

export async function searchPharmacies(query: string): Promise<ClalitPharmacy[]> {
  const results = await searchPost<ClalitPharmacy[]>('GetFilterefPharmaciesList', {
    searchText: encodeSearchText(query),
    isPrefix: false,
  });
  return results ?? [];
}

export async function getAllCities(): Promise<ClalitCity[]> {
  const results = await searchPost<ClalitCity[]>('GetAllCitiesList', {});
  return results ?? [];
}
