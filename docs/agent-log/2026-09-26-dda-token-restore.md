# 2026-09-26 — Vault DDA lookup: token wall on BASIC_LAND_BASE

**Branch:** none created. Phase A only — stopped per the task's own STOP condition
before Phase B (token module). No `src/**` edits made.

## Symptom

Vault "Add a plot" wizard says "This plot isn't in DDA" for Dubai plot 6489099,
and for any Dubai plot not already cached in our `Parcel` table.

## Phase A.1 — raw curl bodies

Run 2026-09-26 from this box, against `DDA/BASIC_LAND_BASE/MapServer/2/query`:

```
Plot 6489099:  HTTP 200  {"error":{"code":499,"details":[],"message":"Token Required"}}
Plot 6731157:  HTTP 200  {"error":{"code":499,"details":[],"message":"Token Required"}}   (control plot, worked tokenless 2026-05-22)
```

Both plots — including the control that worked five months ago — now hit the same
wall. Confirms Butler's diagnosis: this is a DDA-side auth change, not a per-plot
miss. `src/lib/dda-plot-lookup.ts:fetchDdaPlotByNumber` only checks `res.ok` (which
is `true` — the error body comes back as HTTP 200), then sees an empty `features[]`
and returns `null`. The route caller reads `null` as "not_found" and the wizard
shows the DDA-miss copy instead of an outage message.

Also new: browsing the folder itself now needs a token —
`GET https://gis.dda.gov.ae/server/rest/services/DDA?f=json` → same 499 body. The
top-level services catalog (`.../services?f=json`, no folder) is still open. This
reads as a folder-level lockdown on `/DDA/*`, not a fix to one layer's query op.

## Phase A.2 — how DDA's own viewer gets its token

**No token values below — only the mechanism.**

Our own `src/lib/dda.ts:getDdaToken()` already does this for a *different* DDA
service: `GET https://gis.dda.gov.ae/DIS/` (the public Plot Info page our
AffectionPlan / Building Limit fetchers use) returns HTML containing
`var AppSettings = {...}`, which embeds a pre-issued `AGSToken` string — DDA's own
server hands this to any visitor of that page, no login. The same JSON also lists
`ARCGIS_TOKEN_URL: https://gis.dda.gov.ae/portal/sharing/rest/generateToken` — the
endpoint DDA's *own backend* calls with a username+password to mint that token in
the first place; it is not something we can call anonymously.

Diagnostic-only test (not wired into any code path): I took that scraped `AGSToken`
and tried it against both services it could plausibly cover:

| Target | Result with the DIS-page token |
|---|---|
| `DIS/MAIN_MAP/MapServer/8` (Building Limit — what we already use it for) | 200, valid feature — still works |
| `DDA/BASIC_LAND_BASE/MapServer/2` (the layer this bug is about) | `403 "User does not have permissions to access 'dda/basic_land_base.mapserver'"` |

So the one token-issuing page we know about is scoped to the DIS/MAIN_MAP service
and is explicitly *not* authorized for BASIC_LAND_BASE — this isn't an expired- or
wrong-token problem, it's a separate permission boundary.

I could not find a public viewer that queries BASIC_LAND_BASE at all:
- Esri's own service metadata (`.../MapServer?f=jsapi` listing, surfaced via search)
  describes BASIC_LAND_BASE as "a DCCA map designed for SalesForce, Building
  Portal, and MyLand" — i.e. built for DDA's internal CRM/back-office systems, not
  a public map.
- `https://gis.dda.gov.ae/dda_locator/` — the other front end living in the same
  `DDA` services folder — refuses without a `Searchkey` query param, and the one
  example found in search results is an 18-character Salesforce record id
  (`a0D6F00000...`), not a plot number. Not a tool a browser session could imitate.
- `https://gis.dda.gov.ae/portal/apps/mapviewer/index.html` (generic ArcGIS Map
  Viewer) opens a blank "Untitled map" with no DDA layers preloaded.
- The DIS page's own JS (`/DIS/js/index.js`) never references `BASIC_LAND_BASE`.
- Public portal search (`/portal/home/search.html`) returns Esri's generic global
  gallery, not DDA org content — no DDA-branded plot-search app turned up there
  either.

**Terms of use:** no disclaimer/terms link on the DIS page footer, and the
Enterprise Portal's default terms path (`/portal/home/termsofuse.html`) 404s. No
quote to give — nothing published to quote from.

**Conclusion:** there is no public viewer to imitate for BASIC_LAND_BASE. The only
credentialed consumers are DDA's own internal systems (SalesForce / Building
Portal / MyLand). Getting a working token here would mean DDA issuing us an actual
account/API credential — a registration/partnership ask, not something a browser
session or a scraped page hands out. **This trips the task's own STOP condition**
("getting the token needs a login, registration…") — I stopped here rather than
building a token module against a service we have no legitimate way to authenticate to.

## Phase A.3 — is 6489099 a DDA plot?

7-digit Dubai plot number, matching the DDA convention (`.claude/rules/map-landuse-3d.md`:
"DDA plots (7-digit numbers)"). Confirmed via read-only Prisma query: **not** in our
`Parcel` table, so the wizard always falls through to the broken live fetch for it.
Cannot independently confirm its live DDA record while BASIC_LAND_BASE is walled off.

## Phase A.4 — every call site, status

| File | Endpoint | Status |
|---|---|---|
| `src/lib/dda-plot-lookup.ts` (`fetchDdaPlotByNumber`) | `DDA/BASIC_LAND_BASE/2` | **Broken** — 499 misread as miss |
| `src/lib/dda.ts` (`fetchPlotInfoHtml`) | `DIS/?handler=PlotInfo` | Working — no token needed |
| `src/lib/dda.ts` (`fetchBuildingLimit`, via `getDdaToken`) | `DIS/MAIN_MAP/8` | Working — verified live |
| `src/lib/dda.ts` (`fetchPlotDetailsPdf`) | `DIS/?handler=GeneratePlotDetails` | Not exercised this session; uses session cookies, not `AGSToken` — likely unaffected |
| `src/app/api/parcels/submit/route.ts` | `DDA/BASIC_LAND_BASE/2` (inline) | **Broken**, but silent — best-effort try/catch, parcel still creates without geometry |
| `src/app/api/parcels/seed-dda/route.ts` | `DDA/BASIC_LAND_BASE/2` (inline) | **Broken** — returns misleading `plot_not_found_in_dda` (404) |
| `src/lib/parcel-create.ts` | `DDA/BASIC_LAND_BASE/2` (inline) | **Broken**, but silent, same pattern as `submit/route.ts` |
| `src/app/api/parcels/[id]/affection-plan/refresh/route.ts` | `fetchPlotInfoHtml` + `fetchBuildingLimit` only | Working — no BASIC_LAND_BASE call |
| `src/app/api/admin/dda-refresh-listings/route.ts` (+ `stats/route.ts`) via `src/lib/refresh-dda.ts` | `fetchFullDdaData` → `fetchDdaPlotByNumber` | **Broken** — same root cause |
| `scripts/build-*.ts` (~100+ one-off historical seed scripts) | `DDA/BASIC_LAND_BASE/2` | **Broken** too, but these are one-time scripts already run for their plots, not in the live request path |
| `/api/layers/dda/*` (~150+ routes) + `dda-projects`, `dda-freezones` | none — serve static `data/layers/dda/*.geojson` | Unaffected, no live DDA call |

## Test results

None written — Phase B (token module + tests) was not started, per the STOP above.

## Preview / screenshots

None — no branch pushed.

## Risks if we later build against the DIS-page token anyway

Not attempted, since it 403s on this exact layer. Noted for completeness: even if
DDA re-widened that specific 403 later, `AGSToken` is a 30-minute-cache, per-visit
token, not something with a documented SLA — DDA could re-scope or revoke it
without notice, and we would see the same 499/403 pattern again with no warning.
The `getDdaToken()` cache already re-fetches from `/DIS/` once it turns over.

## Open founder decision

See chat — this needs a call between shipping the honest-error fix now (no DDA
polygon prefill for uncached plots until DDA grants real access) vs. pursuing an
actual DDA API relationship for BASIC_LAND_BASE.
