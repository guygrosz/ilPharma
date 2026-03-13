/**
 * OpenFDA Drug Information API
 * Free, no API key required for basic usage (40 req/min)
 * https://open.fda.gov/apis/
 */

const FDA_BASE = 'https://api.fda.gov/drug';

interface FdaLabelResult {
  warnings?: string[];
  adverse_reactions?: string[];
  drug_interactions?: string[];
  indications_and_usage?: string[];
  contraindications?: string[];
  openfda?: {
    brand_name?: string[];
    generic_name?: string[];
    manufacturer_name?: string[];
  };
}

interface FdaResponse {
  results?: FdaLabelResult[];
  meta?: { results: { total: number } };
}

async function fdaSearch(endpoint: string, searchQuery: string, limit = 1): Promise<FdaLabelResult[]> {
  const params = new URLSearchParams({
    search: searchQuery,
    limit: String(limit),
  });
  try {
    const res = await fetch(`${FDA_BASE}/${endpoint}.json?${params}`);
    if (!res.ok) return [];
    const data: FdaResponse = await res.json();
    return data.results ?? [];
  } catch {
    return [];
  }
}

export interface DrugSideEffects {
  sideEffects: string[];
  interactions: string[];
  indications: string;
  contraindications: string;
}

function extractBullets(arr: string[] | undefined): string[] {
  if (!arr || arr.length === 0) return [];
  const text = arr[0];
  // Split on common bullet patterns or line breaks
  return text
    .split(/[\n\r•·]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5 && s.length < 300)
    .slice(0, 15);
}

export async function getDrugSideEffects(drugName: string): Promise<DrugSideEffects> {
  const encoded = encodeURIComponent(`"${drugName}"`);
  const results = await fdaSearch('label', `openfda.brand_name:${encoded}+openfda.generic_name:${encoded}`, 1);

  const r = results[0];
  return {
    sideEffects: extractBullets(r?.adverse_reactions),
    interactions: extractBullets(r?.drug_interactions),
    indications: r?.indications_and_usage?.[0]?.substring(0, 500) ?? '',
    contraindications: r?.contraindications?.[0]?.substring(0, 500) ?? '',
  };
}
