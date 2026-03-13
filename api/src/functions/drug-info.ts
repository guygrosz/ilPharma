import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDrugByName } from '../services/moh.js';
import { getDrugSideEffects } from '../services/openfda.js';

export async function drugInfo(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const catCode = req.params.catCode;
  const drugName = req.query.get('name') || '';

  if (!catCode && !drugName) {
    return { status: 400, body: JSON.stringify({ error: 'נדרש catCode או שם תרופה' }) };
  }

  try {
    // Get drug info from MoH and side effects from OpenFDA in parallel
    const [mohData, fdaData] = await Promise.allSettled([
      getDrugByName(drugName || catCode),
      getDrugSideEffects(drugName || catCode),
    ]);

    const moh = mohData.status === 'fulfilled' ? mohData.value : null;
    const fda = fdaData.status === 'fulfilled' ? fdaData.value : null;

    const result = {
      catCode: Number(catCode),
      omryName: moh?.hebrewName || moh?.englishName || drugName || catCode,
      genericName: moh?.genericName,
      activeIngredient: moh?.activeIngredient,
      manufacturer: moh?.manufacturer,
      registrationNumber: moh?.registrationNumber,
      dosageForm: moh?.dosageForm,
      isGeneric: moh?.isGeneric,
      sideEffects: fda?.sideEffects ?? [],
      interactions: fda?.interactions ?? [],
      indications: fda?.indications ?? '',
      contraindications: fda?.contraindications ?? '',
    };

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600', // 1 hour cache
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result),
    };
  } catch (err) {
    context.error('Drug info error:', err);
    return { status: 500, body: JSON.stringify({ error: 'שגיאה בטעינת פרטי תרופה' }) };
  }
}

app.http('drug-info', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'drugs/{catCode}/info',
  handler: drugInfo,
});
