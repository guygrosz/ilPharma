import { app } from '@azure/functions';
import { getAllCities } from '../services/clalit.js';
let citiesCache = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
export async function citiesList(_req, context) {
    try {
        // Simple in-memory cache (resets on function restart)
        if (citiesCache && Date.now() - citiesCache.ts < CACHE_TTL) {
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'public, max-age=86400',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify(citiesCache.data),
            };
        }
        const cities = await getAllCities();
        citiesCache = { data: cities, ts: Date.now() };
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(cities),
        };
    }
    catch (err) {
        context.error('Cities list error:', err);
        return { status: 500, body: JSON.stringify({ error: 'שגיאה בטעינת ערים' }) };
    }
}
app.http('cities-list', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'pharmacies/cities',
    handler: citiesList,
});
