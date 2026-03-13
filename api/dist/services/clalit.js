/**
 * Clalit Pharmacy API Service
 * Based on the clalit-pharm-search skill by tomron
 * API: https://e-services.clalit.co.il/PharmacyStockCoreAPI/Search/
 */
const SEARCH_BASE = 'https://e-services.clalit.co.il/PharmacyStockCoreAPI/Search';
const LANG = 'he-il';
function encodeSearchText(str) {
    return Buffer.from(encodeURIComponent(str)).toString('base64');
}
async function searchPost(path, body) {
    const url = `${SEARCH_BASE}/${path}?lang=${LANG}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok)
        throw new Error(`Clalit API error: ${res.status} ${res.statusText}`);
    return res.json();
}
export async function searchMedications(query) {
    const results = await searchPost('GetFilterefMedicationsList', {
        searchText: encodeSearchText(query),
        isPrefix: true,
    });
    return results ?? [];
}
export async function searchPharmacies(query) {
    const results = await searchPost('GetFilterefPharmaciesList', {
        searchText: encodeSearchText(query),
        isPrefix: false,
    });
    return results ?? [];
}
export async function getAllCities() {
    const results = await searchPost('GetAllCitiesList', {});
    return results ?? [];
}
