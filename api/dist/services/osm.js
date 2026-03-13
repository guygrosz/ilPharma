/**
 * OpenStreetMap Services
 * Overpass API: Find pharmacies near a location (free, no API key)
 * Nominatim: Geocoding (free, no API key)
 */
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
function detectChain(name) {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('super pharm') || lowerName.includes('סופרפארם') || lowerName.includes('super-pharm'))
        return 'super-pharm';
    if (lowerName.includes('new pharm') || lowerName.includes('ניופארם'))
        return 'new-pharm';
    if (lowerName.includes('pharmacy one') || lowerName.includes('פארמסי וואן'))
        return 'pharmacy-one';
    return undefined;
}
export async function findNearbyPharmacies(lat, lng, radiusMeters) {
    // Overpass QL query for pharmacies
    const query = `
    [out:json][timeout:15];
    (
      node["amenity"="pharmacy"](around:${radiusMeters},${lat},${lng});
      way["amenity"="pharmacy"](around:${radiusMeters},${lat},${lng});
    );
    out center;
  `;
    try {
        const res = await fetch(OVERPASS_URL, {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        if (!res.ok)
            return [];
        const data = await res.json();
        return data.elements
            .filter((el) => {
            const elLat = el.lat ?? el.center?.lat;
            const elLng = el.lon ?? el.center?.lon;
            return elLat && elLng && el.tags.name;
        })
            .map((el) => {
            const elLat = (el.lat ?? el.center?.lat);
            const elLng = (el.lon ?? el.center?.lon);
            const tags = el.tags;
            const name = tags['name:he'] || tags.name || 'בית מרקחת';
            const addressParts = [
                tags['addr:street'],
                tags['addr:housenumber'],
                tags['addr:city'],
            ].filter(Boolean);
            return {
                id: `osm-${el.type}-${el.id}`,
                name,
                address: addressParts.join(' ') || tags['addr:full'] || '',
                lat: elLat,
                lng: elLng,
                phone: tags['phone'] || tags['contact:phone'],
                openingHours: tags['opening_hours'],
                chain: detectChain(name),
                type: 'private',
            };
        });
    }
    catch {
        return [];
    }
}
export async function reverseGeocode(lat, lng) {
    try {
        const params = new URLSearchParams({
            lat: String(lat),
            lon: String(lng),
            format: 'json',
            'accept-language': 'he',
        });
        const res = await fetch(`${NOMINATIM_URL}/reverse?${params}`, {
            headers: { 'User-Agent': 'PharmaFinderIL/1.0' },
        });
        if (!res.ok)
            return '';
        const data = await res.json();
        return data.address?.city || data.address?.town || data.address?.village || '';
    }
    catch {
        return '';
    }
}
