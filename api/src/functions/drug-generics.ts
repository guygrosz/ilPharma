import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDrugByName, getDrugGenerics } from '../services/moh.js';

export async function drugGenerics(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const catCode = req.params.catCode;
  const drugName = req.query.get('name') || '';

  try {
    // First get the drug's active ingredient
    const drug = await getDrugByName(drugName || catCode);
    if (!drug?.activeIngredient) {
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify([]),
      };
    }

    // Then find all generics with same active ingredient
    const generics = await getDrugGenerics(drug.activeIngredient);

    const result = generics.map((g) => ({
      catCode: g.catCode,
      omryName: g.hebrewName || g.englishName,
      genericName: g.genericName,
      manufacturer: g.manufacturer,
      isGeneric: g.isGeneric,
    }));

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    };
  } catch (err) {
    context.error('Drug generics error:', err);
    return { status: 500, body: JSON.stringify({ error: 'שגיאה בטעינת ג\'נריקות' }) };
  }
}

app.http('drug-generics', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'drugs/{catCode}/generics',
  handler: drugGenerics,
});
