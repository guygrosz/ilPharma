import { app } from '@azure/functions';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// Load drug database once at startup
const __dirname = dirname(fileURLToPath(import.meta.url));
const drugsDb = JSON.parse(readFileSync(join(__dirname, '../../data/drugs.json'), 'utf8'));
function searchDrugs(query, limit = 20) {
    const q = query.toUpperCase();
    const starts = [];
    const contains = [];
    for (const drug of drugsDb) {
        const name = drug.omryName.toUpperCase();
        if (name.startsWith(q)) {
            starts.push(drug);
            if (starts.length + contains.length >= limit * 2)
                break;
        }
        else if (name.includes(q)) {
            contains.push(drug);
        }
    }
    return [...starts, ...contains].slice(0, limit);
}
export async function drugsSearch(req, context) {
    const query = req.query.get('q') || '';
    if (!query || query.trim().length < 2) {
        return { status: 400, body: JSON.stringify({ error: 'שאילתה קצרה מדי' }) };
    }
    try {
        const results = searchDrugs(query.trim());
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(results),
        };
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        context.error('Drug search error:', msg);
        return { status: 500, body: JSON.stringify({ error: 'שגיאה בחיפוש', detail: msg }) };
    }
}
app.http('drugs-search', {
    methods: ['GET'],
    authLevel: 'anonymous',
    route: 'drugs/search',
    handler: drugsSearch,
});
