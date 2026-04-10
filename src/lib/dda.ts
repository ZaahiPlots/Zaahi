import proj4 from 'proj4';

// EPSG:3997 — WGS 84 / Dubai Local TM (central meridian 55°20')
proj4.defs(
  'EPSG:3997',
  '+proj=tmerc +lat_0=0 +lon_0=55.33333333333334 +k=1 +x_0=500000 +y_0=0 +ellps=WGS84 +units=m +no_defs',
);

function reprojectRing(ring: number[][]): number[][] {
  return ring.map(([x, y]) => proj4('EPSG:3997', 'EPSG:4326', [x, y]));
}

/**
 * DDA (Dubai Development Authority) GIS / DIS portal client.
 *
 * Endpoints used:
 *   - GET /DIS/                                     → HTML, scrape AGSToken
 *   - GET /DIS/?handler=PlotInfo&plotNumber=N       → HTML partial w/ affection plan
 *   - GET /DIS/?handler=GeneratePlotDetails&id=ID   → PDF binary (ID = OBJECTID)
 *   - GET DIS/MAIN_MAP/MapServer/8/query  (token)   → Building Limit polygon
 *   - GET DIS/MAIN_MAP/MapServer/13/query (token)   → Plot OBJECTID by PLOT_NUMBER
 */

const DIS_ROOT = 'https://gis.dda.gov.ae/DIS/';
const MAIN_MAP = 'https://gis.dda.gov.ae/server/rest/services/DIS/MAIN_MAP/MapServer';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) ZAAHI/1.0';

// ─── token ────────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number;
}
let tokenCache: TokenCache | null = null;

/** Scrape `var AppSettings = {...}.AGSToken` from /DIS/. Cached for 30 minutes. */
export async function getDdaToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const r = await fetch(DIS_ROOT, { cache: 'no-store' });
  if (!r.ok) throw new Error(`DIS root: HTTP ${r.status}`);
  const html = await r.text();
  const m = html.match(/var\s+AppSettings\s*=\s*(\{[^;]+?\})\s*;/);
  if (!m) throw new Error('AppSettings not found in DIS HTML');
  const settings = JSON.parse(m[1]) as { AGSToken?: string };
  if (!settings.AGSToken) throw new Error('AGSToken missing');
  tokenCache = { token: settings.AGSToken, expiresAt: Date.now() + 30 * 60_000 };
  return settings.AGSToken;
}

// ─── PlotInfo HTML + parser ───────────────────────────────────────────────

export interface AffectionPlan {
  plotNumber: string;
  oldNumber: string | null;
  projectName: string | null;
  community: string | null;
  masterDeveloper: string | null;
  plotAreaSqm: number | null;
  plotAreaSqft: number | null;
  maxGfaSqm: number | null;
  maxGfaSqft: number | null;
  maxHeightCode: string | null;     // "G+15"
  maxFloors: number | null;         // 16
  maxHeightMeters: number | null;   // floors × 4
  far: number | null;
  setbacks: Array<{ side: number; building: number | null; podium: number | null }>;
  landUseMix: Array<{ category: string; sub: string; areaSqm: number | null }>;
  sitePlanIssue: string | null;     // ISO date
  sitePlanExpiry: string | null;    // ISO date
  notes: string | null;
}

const STOREY_M = 4; // default storey height (m) when DDA gives only G+N

export async function fetchPlotInfoHtml(plotNumber: string): Promise<string> {
  const url = `${DIS_ROOT}?handler=PlotInfo&plotNumber=${encodeURIComponent(plotNumber)}`;
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`PlotInfo ${plotNumber}: HTTP ${r.status}`);
  return r.text();
}

function num(s: string | undefined | null): number | null {
  if (!s) return null;
  const cleaned = s.replace(/,/g, '').trim();
  if (cleaned === '' || /N\/A/i.test(cleaned)) return null;
  const v = parseFloat(cleaned);
  return Number.isFinite(v) ? v : null;
}

function dmyToIso(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})-(\w{3})-(\d{4})$/);
  if (!m) return null;
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const mo = months[m[2]];
  return mo ? `${m[3]}-${mo}-${m[1]}` : null;
}

export function parseAffectionPlan(html: string): AffectionPlan {
  // Strip tags & decode the few entities we care about.
  const text = html
    .replace(/&#x2B;/g, '+')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  function take(label: string, until: string | null = null): string | null {
    const re = until
      ? new RegExp(`${label}\\s+(.+?)\\s+${until}`, 'i')
      : new RegExp(`${label}\\s+(\\S+)`, 'i');
    const m = text.match(re);
    return m ? m[1].trim() : null;
  }

  const plotNumber = take('Plot Number') ?? '';
  const oldNumber = take('Old Numbers');
  const projectName = take('Project Name', 'Community Name');
  const community = take('Community Name', 'Master Developer');
  const masterDeveloper = take('Master Developer', 'Plot Area');

  const plotAreaMatch = text.match(/Plot Area\s+([\d,.]+)\s*M\s*2\s*\(\s*([\d,.]+)/i);
  const gfaMatch = text.match(/Maximum GFA\s+([\d,.]+)\s*M\s*2\s*\(\s*([\d,.]+)/i);

  const plotAreaSqm = plotAreaMatch ? num(plotAreaMatch[1]) : null;
  const plotAreaSqft = plotAreaMatch ? num(plotAreaMatch[2]) : null;
  const maxGfaSqm = gfaMatch ? num(gfaMatch[1]) : null;
  const maxGfaSqft = gfaMatch ? num(gfaMatch[2]) : null;

  const maxHeightCode = take('Maximum Height', 'Maximum Coverage');
  let maxFloors: number | null = null;
  if (maxHeightCode) {
    // Parse various DDA height formats:
    //   G+14        → 15 floors
    //   G+3P+9      → 1 (G) + 3 (podium) + 9 = 13 floors
    //   G+5P+20     → 1 + 5 + 20 = 26 floors
    //   G+M+20      → 1 + 1 (mezzanine) + 20 = 22 floors
    //   G+M (12m)   → explicit meters, parse separately
    //   G+1         → 2 floors
    const explicitM = maxHeightCode.match(/\((\d+)m\)/i);
    if (explicitM) {
      maxFloors = Math.round(parseInt(explicitM[1], 10) / STOREY_M);
    } else {
      // Sum all numeric parts after G: G+3P+9 → [3, 9], G+14 → [14], G+M+20 → [M, 20]
      const parts = maxHeightCode.replace(/^G\+?/i, '').split(/[+]/);
      let total = 1; // Ground floor
      for (const p of parts) {
        const trimmed = p.trim().toUpperCase();
        if (trimmed === 'M' || trimmed === 'P') total += 1; // mezzanine/podium = 1 floor
        else if (/^\d+P$/.test(trimmed)) total += parseInt(trimmed, 10); // "3P" = 3 podium floors
        else if (/^\d+$/.test(trimmed)) total += parseInt(trimmed, 10);
      }
      if (total > 1) maxFloors = total;
    }
  }
  const maxHeightMeters = maxFloors != null ? maxFloors * STOREY_M : null;

  const far =
    maxGfaSqm != null && plotAreaSqm != null && plotAreaSqm > 0
      ? Math.round((maxGfaSqm / plotAreaSqm) * 100) / 100
      : null;

  // Setbacks: "Side N <building> <podium>"
  const setbacks: AffectionPlan['setbacks'] = [];
  const sbRe = /Side\s+(\d+)\s+([\dN/A.]+)\s+([\dN/A.]+)/g;
  let sm: RegExpExecArray | null;
  while ((sm = sbRe.exec(text))) {
    setbacks.push({
      side: parseInt(sm[1], 10),
      building: num(sm[2]),
      podium: num(sm[3]),
    });
  }

  // Land use slice between "Land use" and "General Notes"
  const landBlock = text.match(/Land use\s+(.+?)\s+General Notes/i)?.[1] ?? '';
  const landUseMix: AffectionPlan['landUseMix'] = [];
  // Pattern: CATEGORY : SUB1 (12 m 2 ), SUB2 (34.5 m 2 ) ...
  const catRe = /([A-Z][A-Z ]+)\s*:\s*([^A-Z]+?)(?=\s+[A-Z][A-Z ]+\s*:|$)/g;
  let cm: RegExpExecArray | null;
  while ((cm = catRe.exec(landBlock))) {
    const category = cm[1].trim();
    const subList = cm[2].trim().replace(/\s+m\s*2\s*/g, ' ');
    const subRe = /([A-Z][A-Z ]+?)(?:\s*\(\s*([\d,.]+)\s*\))?(?:,|$)/g;
    let sm2: RegExpExecArray | null;
    while ((sm2 = subRe.exec(subList))) {
      const sub = sm2[1].trim();
      if (!sub) continue;
      landUseMix.push({ category, sub, areaSqm: num(sm2[2]) });
    }
  }

  const sitePlanIssue = dmyToIso(take('Site Plan Issue Date', 'Site Plan Expiry'));
  const sitePlanExpiry = dmyToIso(take('Site Plan Expiry Date', 'Setbacks'));
  const notes = text.match(/General Notes\s+(.+?)\s+Coordinates/i)?.[1].trim() ?? null;

  return {
    plotNumber,
    oldNumber,
    projectName,
    community,
    masterDeveloper,
    plotAreaSqm,
    plotAreaSqft,
    maxGfaSqm,
    maxGfaSqft,
    maxHeightCode,
    maxFloors,
    maxHeightMeters,
    far,
    setbacks,
    landUseMix,
    sitePlanIssue,
    sitePlanExpiry,
    notes,
  };
}

// ─── Building Limit (layer 8) ─────────────────────────────────────────────

interface EsriPolygonGeom {
  rings: number[][][];
}
interface EsriFeature {
  attributes: Record<string, unknown>;
  geometry: EsriPolygonGeom;
}

/**
 * Fetch the Building Limit polygon for a plot from MAIN_MAP layer 8.
 * The layer only serves native EPSG:3997, so we reproject to WGS84 ourselves.
 */
export async function fetchBuildingLimit(
  plotNumber: string,
): Promise<GeoJSON.Polygon | null> {
  const token = await getDdaToken();
  const where = encodeURIComponent(`PlotNumber='${plotNumber}'`);
  const url =
    `${MAIN_MAP}/8/query?where=${where}` +
    `&outFields=*&returnGeometry=true&f=json&token=${token}`;
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Building Limit ${plotNumber}: HTTP ${r.status}`);
  const j = (await r.json()) as { features?: EsriFeature[] };
  const feat = j.features?.[0];
  if (!feat?.geometry?.rings?.length) return null;
  return {
    type: 'Polygon',
    coordinates: feat.geometry.rings.map(reprojectRing),
  };
}

// ─── Plot OBJECTID + PDF ──────────────────────────────────────────────────

/** Minimal cookie jar — handles BIG-IP TS* cookies that rotate per response. */
class CookieJar {
  private store = new Map<string, string>(); // name → value
  absorb(res: Response) {
    const list = res.headers.getSetCookie?.() ?? [];
    for (const sc of list) {
      const [pair] = sc.split(';');
      const eq = pair.indexOf('=');
      if (eq < 0) continue;
      this.store.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }
  }
  toHeader(): string {
    return [...this.store.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

/**
 * Fetch the official Plot Details PDF.
 *
 * The DIS portal binds the encrypted "plot id" to the ASP.NET session, so the
 * PDF download requires a 3-step dance with shared cookies + Referer:
 *   1) GET /DIS/                 → establishes session, grab cookies
 *   2) GET ?handler=PlotInfo…    → server stores per-plot token in session,
 *                                   page also embeds the encrypted id in HTML
 *   3) GET ?handler=GeneratePlotDetails&id=<token>  → PDF binary
 *
 * Without (1) the session has no plot context and the server returns 404.
 */
export async function fetchPlotDetailsPdf(plotNumber: string): Promise<ArrayBuffer> {
  // The DDA backend races/load-balances badly enough that the third call
  // returns 404 ~30% of the time even with shared session+cookies. Retry up to 3x.
  let lastErr: unknown;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await fetchPlotDetailsPdfOnce(plotNumber);
    } catch (e) {
      lastErr = e;
      if (!(e instanceof Error) || !/HTTP 404/.test(e.message)) throw e;
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
    }
  }
  throw lastErr;
}

async function fetchPlotDetailsPdfOnce(plotNumber: string): Promise<ArrayBuffer> {
  const jar = new CookieJar();

  // Step 1: open the DIS portal to get a session cookie.
  const r1 = await fetch(DIS_ROOT, {
    headers: { 'user-agent': UA, accept: 'text/html' },
    cache: 'no-store',
  });
  jar.absorb(r1);

  // Step 2: fetch PlotInfo with the same session — server stores the plot in
  // session state and embeds an encrypted id token in the HTML.
  const r2 = await fetch(
    `${DIS_ROOT}?handler=PlotInfo&plotNumber=${encodeURIComponent(plotNumber)}`,
    {
      headers: {
        cookie: jar.toHeader(),
        referer: DIS_ROOT,
        'user-agent': UA,
        accept: 'text/html,application/pdf,*/*',
      },
      cache: 'no-store',
    },
  );
  jar.absorb(r2);
  if (!r2.ok) throw new Error(`PlotInfo (pdf) ${plotNumber}: HTTP ${r2.status}`);
  const html = await r2.text();
  const m = html.match(/DownloadPlotDetails\(this,\s*'(0x[0-9A-Fa-f]+)'\)/);
  if (!m) throw new Error(`PDF token not found for plot ${plotNumber}`);

  // Step 3: download the PDF, carrying the (possibly rotated) cookies + Referer.
  const r3 = await fetch(
    `${DIS_ROOT}?handler=GeneratePlotDetails&id=${encodeURIComponent(m[1])}`,
    {
      headers: {
        cookie: jar.toHeader(),
        referer: DIS_ROOT,
        'user-agent': UA,
        accept: 'text/html,application/pdf,*/*',
      },
      cache: 'no-store',
    },
  );
  if (!r3.ok) throw new Error(`PDF ${plotNumber}: HTTP ${r3.status}`);
  return r3.arrayBuffer();
}
