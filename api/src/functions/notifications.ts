import { app, HttpRequest, HttpResponseInit, InvocationContext, Timer } from '@azure/functions';
import webpush from 'web-push';

// VAPID keys - set these as Azure Function App Settings (environment variables)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@pharma-finder.il';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// In-memory store for local dev; in production, use Azure Table Storage
const subscriptions: Map<string, {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  catCode: number;
  drugName: string;
  cityCode?: number;
  cityName?: string;
  lastStock?: number;
}> = new Map();

export async function subscribeNotifications(
  req: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  if (!VAPID_PUBLIC_KEY) {
    return { status: 501, body: JSON.stringify({ error: 'התראות לא מוגדרות בשרת' }) };
  }

  let body: {
    endpoint?: string;
    keys?: { p256dh: string; auth: string };
    catCode?: number;
    drugName?: string;
    cityCode?: number;
    cityName?: string;
  } = {};

  try {
    body = await req.json() as typeof body;
  } catch {
    return { status: 400, body: JSON.stringify({ error: 'גוף הבקשה אינו תקין' }) };
  }

  if (!body.endpoint || !body.keys || !body.catCode) {
    return { status: 400, body: JSON.stringify({ error: 'נתונים חסרים' }) };
  }

  const key = `${body.endpoint}-${body.catCode}-${body.cityCode}`;
  subscriptions.set(key, {
    endpoint: body.endpoint,
    keys: body.keys,
    catCode: body.catCode,
    drugName: body.drugName || String(body.catCode),
    cityCode: body.cityCode,
    cityName: body.cityName,
  });

  context.log(`Subscription added: ${body.drugName} in ${body.cityName}`);

  return {
    status: 201,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ success: true, message: 'נרשמת בהצלחה להתראות' }),
  };
}

// Timer trigger: runs every hour to check stock and send notifications
export async function checkStockForAlerts(timer: Timer, context: InvocationContext): Promise<void> {
  if (subscriptions.size === 0) return;
  context.log(`Checking stock alerts for ${subscriptions.size} subscriptions`);

  // Group by catCode+city to avoid duplicate checks
  const groups = new Map<string, typeof subscriptions extends Map<string, infer V> ? V[] : never>();
  for (const [, sub] of subscriptions) {
    const gkey = `${sub.catCode}-${sub.cityCode}`;
    if (!groups.has(gkey)) groups.set(gkey, []);
    groups.get(gkey)!.push(sub as never);
  }

  for (const [, subs] of groups) {
    const sub = subs[0];
    if (!sub.cityCode) continue;

    try {
      // Check current stock
      const res = await fetch(
        `${process.env.WEBSITE_HOSTNAME || 'http://localhost:7071'}/api/stock/check`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ catCode: sub.catCode, cityCode: sub.cityCode }),
        }
      );
      if (!res.ok) continue;
      const data = await res.json() as { pharmaciesList?: { medicationsList?: { kodStatusMlay: number }[] }[] };
      const newStock = data.pharmaciesList?.[0]?.medicationsList?.[0]?.kodStatusMlay;

      // If stock changed to available (30 = in stock, 20 = limited)
      if ((newStock === 30 || newStock === 20) && sub.lastStock !== newStock) {
        const label = newStock === 30 ? 'במלאי' : 'מלאי מוגבל';
        for (const s of subs) {
          if (s.lastStock === newStock) continue;
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: s.keys },
            JSON.stringify({
              title: `מחפש תרופות: ${s.drugName} ${label}`,
              body: `${s.drugName} זמינה ${label} ב${s.cityName || 'עירך'}`,
              icon: '/icons/icon-192.png',
              url: `/search?q=${encodeURIComponent(s.drugName)}&catCode=${s.catCode}`,
            })
          );
          (s as { lastStock?: number }).lastStock = newStock;
        }
      }
    } catch (err) {
      context.error(`Alert check failed for catCode=${sub.catCode}:`, err);
    }
  }
}

app.http('subscribe-notifications', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'notifications/subscribe',
  handler: subscribeNotifications,
});

app.timer('check-stock-alerts', {
  schedule: '0 0 * * * *', // Every hour
  handler: checkStockForAlerts,
});
