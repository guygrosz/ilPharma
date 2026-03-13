/**
 * Clalit Pharmacy API Service
 * Based on the clalit-pharm-search skill by tomron
 * API: https://e-services.clalit.co.il/PharmacyStockCoreAPI/Search/
 */
const SEARCH_BASE = 'https://e-services.clalit.co.il/PharmacyStockCoreAPI/Search';
const LANG = 'he-il';
function encodeSearchText(str) {
    return Buffer.from(str, 'utf8').toString('base64');
}
const BROWSER_HEADERS = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
    'Origin': 'https://e-services.clalit.co.il',
    'Referer': 'https://e-services.clalit.co.il/',
};
async function searchPost(path, body) {
    const url = `${SEARCH_BASE}/${path}?lang=${LANG}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: BROWSER_HEADERS,
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
