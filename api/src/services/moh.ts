/**
 * Israeli Ministry of Health Drug Database
 * API: https://data.gov.il/api/3/action/datastore_search (CKAN)
 * Free, no API key required
 */

const CKAN_BASE = 'https://data.gov.il/api/3/action/datastore_search';
const DRUGS_RESOURCE_ID = 'ef82387a-d918-4207-a27c-f7ba847c7f7f'; // MoH drug registration dataset

interface CKANRecord {
  _id: number;
  [key: string]: unknown;
}

interface CKANResponse {
  success: boolean;
  result: {
    records: CKANRecord[];
    total: number;
  };
}

async function ckanSearch(
  resourceId: string,
  filters: Record<string, string>,
  limit = 10
): Promise<CKANRecord[]> {
  const params = new URLSearchParams({
    resource_id: resourceId,
    limit: String(limit),
    filters: JSON.stringify(filters),
  });
  const res = await fetch(`${CKAN_BASE}?${params}`);
  if (!res.ok) return [];
  const data: CKANResponse = await res.json();
  return data.success ? data.result.records : [];
}

async function ckanFreeSearch(
  resourceId: string,
  query: string,
  limit = 20
): Promise<CKANRecord[]> {
  const params = new URLSearchParams({
    resource_id: resourceId,
    q: query,
    limit: String(limit),
  });
  const res = await fetch(`${CKAN_BASE}?${params}`);
  if (!res.ok) return [];
  const data: CKANResponse = await res.json();
  return data.success ? data.result.records : [];
}

export interface MohDrug {
  catCode?: number;
  hebrewName?: string;
  englishName?: string;
  genericName?: string;
  activeIngredient?: string;
  manufacturer?: string;
  country?: string;
  registrationNumber?: string;
  dosageForm?: string;
  isGeneric?: boolean;
}

function mapRecord(r: CKANRecord): MohDrug {
  return {
    hebrewName: r['שם תרופה עברית'] as string,
    englishName: r['שם תרופה אנגלית'] as string,
    genericName: r['שם גנרי'] as string,
    activeIngredient: r['חומר פעיל'] as string,
    manufacturer: r['יצרן'] as string,
    country: r['מדינה'] as string,
    registrationNumber: r['מספר רישום'] as string,
    dosageForm: r['צורת מינון'] as string,
    isGeneric: (r['סוג'] as string)?.includes('ג') || false,
  };
}

export async function getDrugByName(name: string): Promise<MohDrug | null> {
  const records = await ckanFreeSearch(DRUGS_RESOURCE_ID, name, 5);
  if (records.length === 0) return null;
  return mapRecord(records[0]);
}

export async function getDrugGenerics(activeIngredient: string): Promise<MohDrug[]> {
  if (!activeIngredient) return [];
  const records = await ckanSearch(
    DRUGS_RESOURCE_ID,
    { 'חומר פעיל': activeIngredient },
    50
  );
  return records.map(mapRecord);
}
