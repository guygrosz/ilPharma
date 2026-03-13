/**
 * OpenFDA Drug Information API
 * Free, no API key required for basic usage (40 req/min)
 * https://open.fda.gov/apis/
 */
const FDA_BASE = 'https://api.fda.gov/drug';
async function fdaSearch(endpoint, searchQuery, limit = 1) {
    const params = new URLSearchParams({
        search: searchQuery,
        limit: String(limit),
    });
    try {
        const res = await fetch(`${FDA_BASE}/${endpoint}.json?${params}`);
        if (!res.ok)
            return [];
        const data = await res.json();
        return data.results ?? [];
    }
    catch {
        return [];
    }
}
function extractBullets(arr) {
    if (!arr || arr.length === 0)
        return [];
    const text = arr[0];
    // Split on common bullet patterns or line breaks
    return text
        .split(/[\n\r•·]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 5 && s.length < 300)
        .slice(0, 15);
}
export async function getDrugSideEffects(drugName) {
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
