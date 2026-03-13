import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { searchMedications } from '../services/clalit.js';

export async function drugsSearch(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const query = req.query.get('q') || '';

  if (!query || query.trim().length < 2) {
    return { status: 400, body: JSON.stringify({ error: 'שאילתה קצרה מדי' }) };
  }

  try {
    const results = await searchMedications(query.trim());
    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 min cache
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(results.slice(0, 20)),
    };
  } catch (err) {
    context.error('Drug search error:', err);
    return { status: 500, body: JSON.stringify({ error: 'שגיאה בחיפוש' }) };
  }
}

app.http('drugs-search', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'drugs/search',
  handler: drugsSearch,
});
