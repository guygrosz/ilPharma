/**
 * Israeli Ministry of Health Drug Database
 * API: https://data.gov.il/api/3/action/datastore_search (CKAN)
 * Free, no API key required
 */
const CKAN_BASE = 'https://data.gov.il/api/3/action/datastore_search';
const DRUGS_RESOURCE_ID = 'ef82387a-d918-4207-a27c-f7ba847c7f7f'; // MoH drug registration dataset
async function ckanSearch(resourceId, filters, limit = 10) {
    const params = new URLSearchParams({
        resource_id: resourceId,
        limit: String(limit),
        filters: JSON.stringify(filters),
    });
    const res = await fetch(`${CKAN_BASE}?${params}`);
    if (!res.ok)
        return [];
    const data = await res.json();
    return data.success ? data.result.records : [];
}
async function ckanFreeSearch(resourceId, query, limit = 20) {
    const params = new URLSearchParams({
        resource_id: resourceId,
        q: query,
        limit: String(limit),
    });
    const res = await fetch(`${CKAN_BASE}?${params}`);
    if (!res.ok)
        return [];
    const data = await res.json();
    return data.success ? data.result.records : [];
}
function mapRecord(r) {
    return {
        hebrewName: r['שם תרופה עברית'],
        englishName: r['שם תרופה אנגלית'],
        genericName: r['שם גנרי'],
        activeIngredient: r['חומר פעיל'],
        manufacturer: r['יצרן'],
        country: r['מדינה'],
        registrationNumber: r['מספר רישום'],
        dosageForm: r['צורת מינון'],
        isGeneric: r['סוג']?.includes('ג') || false,
    };
}
export async function getDrugByName(name) {
    const records = await ckanFreeSearch(DRUGS_RESOURCE_ID, name, 5);
    if (records.length === 0)
        return null;
    return mapRecord(records[0]);
}
export async function getDrugGenerics(activeIngredient) {
    if (!activeIngredient)
        return [];
    const records = await ckanSearch(DRUGS_RESOURCE_ID, { 'חומר פעיל': activeIngredient }, 50);
    return records.map(mapRecord);
}
