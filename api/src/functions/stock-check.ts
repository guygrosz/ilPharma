import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';

const PHARMACY_STOCK_URL = 'https://e-services.clalit.co.il/PharmacyStock/';
const SEARCH_BASE = 'https://e-services.clalit.co.il/PharmacyStockCoreAPI/Search';

function encodeSearchText(str: string): string {
  return Buffer.from(encodeURIComponent(str)).toString('base64');
}

async function searchPost<T>(path: string, body: object): Promise<T> {
  const url = `${SEARCH_BASE}/${path}?lang=he-il`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Search API error: ${res.status}`);
  return res.json() as Promise<T>;
}

interface MedItem { catCode: number; omryName: string }
interface CityItem { cityCode: number; cityName: string }
interface PharmItem { deptCode: number; deptName: string }

async function resolveOmryName(catCode: number): Promise<string> {
  const prefixes = 'abcdefghijklmnopqrstuvwxyzאבגדהוזחטיכלמנסעפצקרשת'.split('');
  for (const prefix of prefixes) {
    const results = await searchPost<MedItem[]>('GetFilterefMedicationsList', {
      searchText: encodeSearchText(prefix),
      isPrefix: true,
    }).catch(() => []);
    const match = results.find((m) => m.catCode === catCode);
    if (match) return match.omryName;
  }
  return String(catCode);
}

async function stockCheckPuppeteer(
  omryName: string,
  cityName: string
): Promise<unknown> {
  // Dynamically import puppeteer (large dependency)
  let puppeteer: typeof import('puppeteer');
  let chromium: { executablePath: () => Promise<string>; args: string[] } | null = null;

  try {
    // Try @sparticuz/chromium for serverless environments (Azure Functions)
    const chromiumMod = await import('@sparticuz/chromium');
    chromium = chromiumMod.default;
    const { default: puppeteerCore } = await import('puppeteer-core');
    puppeteer = puppeteerCore as unknown as typeof import('puppeteer');
  } catch {
    // Fallback to regular puppeteer for local dev
    puppeteer = (await import('puppeteer')).default as unknown as typeof import('puppeteer');
  }

  const launchArgs = chromium
    ? { executablePath: await chromium.executablePath(), args: chromium.args, headless: true as const }
    : { headless: true as const, args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] };

  const browser = await (puppeteer as unknown as { launch: (opts: object) => Promise<import('puppeteer').Browser> }).launch(launchArgs);

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    );

    // Pre-fetch bundle (bypasses Imperva WAF)
    const bundleContent = await fetch(`${PHARMACY_STOCK_URL}index-bundle.js`).then((r) => r.text());

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('index-bundle.js')) {
        req.respond({ status: 200, contentType: 'application/javascript', body: bundleContent });
      } else if (url.includes('glassbox') || url.includes('gb.clalit')) {
        req.respond({ status: 200, contentType: 'application/javascript', body: '' });
      } else {
        req.continue();
      }
    });

    // Capture stock API response
    const responsePromise = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout')), 25000);
      page.on('response', async (res) => {
        if (!res.url().includes('GetPharmacyStock')) return;
        const ct = res.headers()['content-type'] || '';
        if (!ct.includes('application/json')) {
          clearTimeout(timer);
          reject(new Error(`WAF_BLOCKED:${res.status()}`));
          return;
        }
        try {
          clearTimeout(timer);
          resolve(await res.json());
        } catch (err) {
          clearTimeout(timer);
          reject(err);
        }
      });
    });

    await page.goto(PHARMACY_STOCK_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 800));

    // Switch to city tab
    const tabLinks = await page.$$('[class*="TabMenuItem__Link"]');
    for (const link of tabLinks) {
      const text = await link.evaluate((el) => el.textContent?.trim());
      if (text?.includes('יישוב')) { await link.click(); break; }
    }
    await new Promise((r) => setTimeout(r, 300));

    // Select medication
    await page.click('#downshift-0-input');
    await page.type('#downshift-0-input', omryName.split(' ')[0], { delay: 60 });
    await new Promise((r) => setTimeout(r, 1800));

    const medItems = await page.$$('[id^="downshift-0-menu"] li');
    for (const li of medItems) {
      const text = await li.evaluate((el) => el.textContent?.trim());
      if (text && (text === omryName || text.includes(omryName.split(' ')[0]))) {
        await li.click();
        break;
      }
    }
    if (medItems.length > 0 && !await page.$('[id^="downshift-0-menu"]')) {
      // already selected
    } else if (medItems.length > 0) {
      await medItems[0].click();
    }

    await new Promise((r) => setTimeout(r, 300));

    // Select city
    const cityWord = cityName.replace(/-/g, ' ').split(' ').find((w) => w.length > 1) ?? cityName;
    await page.click('#downshift-2-input');
    await page.type('#downshift-2-input', cityWord, { delay: 60 });
    await new Promise((r) => setTimeout(r, 1800));

    const cityItems = await page.$$('[id^="downshift-2-menu"] li');
    for (const li of cityItems) {
      const text = await li.evaluate((el) => el.textContent?.trim());
      if (text && text.includes(cityWord)) { await li.click(); break; }
    }
    if (cityItems.length > 0) await cityItems[0].click();

    await new Promise((r) => setTimeout(r, 300));

    // Click submit
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.evaluate((el) => el.textContent?.trim());
      if (text?.includes('בדיקת מלאי')) { await btn.click(); break; }
    }

    return await responsePromise;
  } finally {
    await browser.close();
  }
}

export async function stockCheck(req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let body: { catCode?: number; cityCode?: number; pharmacyCode?: number } = {};
  try {
    body = await req.json() as typeof body;
  } catch {
    return { status: 400, body: JSON.stringify({ error: 'גוף הבקשה אינו תקין' }) };
  }

  const { catCode, cityCode } = body;
  if (!catCode) {
    return { status: 400, body: JSON.stringify({ error: 'נדרש catCode' }) };
  }
  if (!cityCode) {
    return { status: 400, body: JSON.stringify({ error: 'נדרש cityCode' }) };
  }

  try {
    context.log(`Stock check: catCode=${catCode}, cityCode=${cityCode}`);

    const [omryName, allCities] = await Promise.all([
      resolveOmryName(catCode),
      searchPost<CityItem[]>('GetAllCitiesList', {}),
    ]);

    const city = allCities.find((c) => c.cityCode === cityCode);
    if (!city) {
      return { status: 404, body: JSON.stringify({ error: 'עיר לא נמצאה' }) };
    }

    const data = await stockCheckPuppeteer(omryName, city.cityName);

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'שגיאה';
    context.error('Stock check error:', msg);
    if (msg.startsWith('WAF_BLOCKED')) {
      return { status: 503, body: JSON.stringify({ error: 'שירות הכללית חסום כרגע, נסה שוב מאוחר יותר' }) };
    }
    return { status: 500, body: JSON.stringify({ error: 'שגיאה בבדיקת מלאי' }) };
  }
}

app.http('stock-check', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'stock/check',
  handler: stockCheck,
});
