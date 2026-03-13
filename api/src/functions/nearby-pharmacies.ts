import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { findNearbyPharmacies } from '../services/osm.js';
import { searchPharmacies } from '../services/clalit.js';
import { haversineDistance } from '../services/geo.js';

export async function nearbyPharmacies(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const lat = Number(req.query.get('lat'));
  const lng = Number(req.query.get('lng'));
  const radiusKm = Number(req.query.get('r') || '5');

  if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
    return { status: 400, body: JSON.stringify({ error: 'נדרשים פרמטרים lat ו-lng' }) };
  }

  const radiusMeters = Math.min(radiusKm, 30) * 1000;

  try {
    // Get OSM private pharmacies and Clalit branches in parallel
    const [osmPharmacies, clalitBranches] = await Promise.allSettled([
      findNearbyPharmacies(lat, lng, radiusMeters),
      searchPharmacies('כללית'),
    ]);

    const results = [];

    // Add private pharmacies from OSM
    if (osmPharmacies.status === 'fulfilled') {
      for (const ph of osmPharmacies.value) {
        const dist = haversineDistance(lat, lng, ph.lat, ph.lng);
        results.push({
          id: ph.id,
          name: ph.name,
          address: ph.address,
          phone: ph.phone,
          lat: ph.lat,
          lng: ph.lng,
          type: 'private' as const,
          chain: ph.chain,
          openingHours: ph.openingHours,
          distance: dist,
        });
      }
    }

    // Add Clalit branches (need geocoding - using approximate coordinates from name)
    // In a real implementation, Clalit branches would have stored coordinates
    // For now, return OSM results which may include Clalit-labeled pharmacies
    if (clalitBranches.status === 'fulfilled') {
      // Clalit branches from OSM are already included in osmPharmacies
      // This is a placeholder for when Clalit provides coordinate data
    }

    // Sort by distance
    results.sort((a, b) => a.distance - b.distance);

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(results),
    };
  } catch (err) {
    context.error('Nearby pharmacies error:', err);
    return { status: 500, body: JSON.stringify({ error: 'שגיאה בחיפוש בתי מרקחת' }) };
  }
}

app.http('nearby-pharmacies', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'pharmacies/nearby',
  handler: nearbyPharmacies,
});
