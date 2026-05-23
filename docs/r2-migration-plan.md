# Cloudflare R2 Migration Plan — PMTiles Land Tilesets

**Status:** RESEARCH — not yet executed. Draft prepared 2026-05-23.
**Branch:** `research/r2-pmtiles-migration`
**Triggers:** [[project_pmtiles_overzoom_band]] (z18 rebuild blocked by
GitHub 100MB file-size limit) and CLAUDE.md "Sovereignty Readiness"
(Cloudflare R2 is non-Vercel-lock-in storage, fits the docker-compose
fallback principle).

---

## Why

Current production state (commit `ca2cb21`):

- Land PMTiles live in the git repo at `public/tiles/*.pmtiles`
- Total 141MB (23M / 47M / 44M / 27M) — all under GitHub's 100MB limit
- Tippecanoe `--maximum-zoom=16` cap on the rebuild
- Camera/source maxZoom paired at 18 (2 levels of overzoom, safe)

The z18 rebuild attempt (commit `8f509f2`, reset, not pushed) produced
files at 51M / 134M / 166M / 35M — two files exceeded the GitHub
**hard limit** of 100MB and the push was rejected by pre-receive hook.

R2 lifts the limit and gives us:

- Native HTTP range-request support (PMTiles streams only the bytes
  it needs, not the whole file)
- CDN edge cache (faster first paint for far-from-Frankfurt users)
- Repo stays light (no LFS quota burn)
- Non-Vercel storage (sovereignty per CLAUDE.md)

## What founder must provide before run-day

| Item | How to get it | Notes |
|---|---|---|
| Cloudflare account | dash.cloudflare.com signup | Free tier covers our needs |
| R2 enabled on the account | Cloudflare dash → R2 → Enable | Requires payment method on file even for the free tier |
| R2 bucket | Cloudflare dash → R2 → Create bucket | Suggested name `zaahi-tiles` (lowercase, used in scripts) |
| Public access | Bucket → Settings → R2.dev subdomain → Allow Access **OR** Custom domain → Connect domain `cdn.zaahi.io` | r2.dev URL is fine for v1; cdn.zaahi.io is the cleaner long-term option (also dodges any "*.r2.dev" blockers some networks impose) |
| CORS rule on bucket | Bucket → Settings → CORS Policy | See exact JSON in §"CORS" below |
| API token | Cloudflare dash → My Profile → API Tokens → Create Token → "Edit R2 Storage" | Scope to single bucket. Used by `wrangler` and CI |
| `wrangler` CLI | `npm i -g wrangler && wrangler login` (founder runs this once) | Or use a project-local install — adjust upload script if needed |

Free-tier R2 limits relevant to us:
- 10GB storage/mo free → we use 0.4GB at z18 → easily fits
- 1M Class A operations/mo free (writes) → 4 PMTiles per rebuild → trivial
- 10M Class B operations/mo free (reads) → each map page hits 4×N range
  requests; capacity for ~2.5M map opens/mo → enough for v1

## What changes in the codebase

Single one-line edit in `src/app/parcels/map/page.tsx`, inside the
`addLandTileSource` function:

```diff
   function addLandTileSource(map: MLMap, srcId: string, fillId: string, lineId: string, extId: string, tilesUrl: string) {
     if (map.getSource(srcId)) return;
     // maxzoom: 18 — tippecanoe builds these tilesets with
     // --maximum-zoom=16 (see scripts/update-tiles.sh), so MapLibre
     // overzooms the z16 tile by 2 levels at most (4× stretch).
     // ...
-    map.addSource(srcId, { type: "vector", url: `pmtiles://${tilesUrl}`, maxzoom: 18 });
+    // NEXT_PUBLIC_TILES_BASE_URL routes the fetch through Cloudflare R2
+    // (e.g. https://cdn.zaahi.io). Unset → falls back to local /tiles/
+    // so dev + docker-compose self-host keep working unchanged.
+    const base = process.env.NEXT_PUBLIC_TILES_BASE_URL ?? "";
+    const fullUrl = tilesUrl.startsWith("http") ? tilesUrl : `${base}${tilesUrl}`;
+    map.addSource(srcId, { type: "vector", url: `pmtiles://${fullUrl}`, maxzoom: 18 });
```

**That's the only code change.** The 8 callsites at page.tsx:3569–3572
and 3940–3943 stay exactly as they are (they still pass
`/tiles/<name>.pmtiles`). No env var = current behavior. With the env
var set on Vercel, the fetch goes to R2.

Bonus: this edit is gated by the `feedback_page_tsx_review_before_edit`
rule — present this diff + invariants table before applying.

**Invariants for the page.tsx edit:**

| Invariant | Preserved by |
|---|---|
| Local dev / docker-compose still loads from `/tiles/` | `?? ""` fallback |
| Direct full-URL callsites work too | `startsWith("http")` short-circuit |
| Source maxzoom (18) unchanged | Only URL composition changes |
| All 4 land tile sources (DDA, AD_ADM, AD_OTHER, Oman) treated identically | Edit lives inside the shared helper |
| No new dependency | `process.env.*` is standard Next.js |

## Environment variable on Vercel

Settings → Environment Variables:

- Name: `NEXT_PUBLIC_TILES_BASE_URL`
- Value: `https://cdn.zaahi.io` (or the r2.dev URL)
- Environments: Production + Preview (NOT Development — keeps local
  dev on local files)

`NEXT_PUBLIC_` prefix is required because the value is read in browser
code (the map page is a client component).

## CORS policy on the R2 bucket

R2 bucket → Settings → CORS policy → JSON:

```json
[
  {
    "AllowedOrigins": [
      "https://zaahi.io",
      "https://*.zaahi.io",
      "https://zaahi.vercel.app",
      "https://*.vercel.app",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "If-Match", "If-None-Match"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

`Range` is the critical one — PMTiles fetches via byte ranges, not
full files. Without it the browser silently fails on tile reads.

## Execution plan (≈30–60 min on run-day)

| # | Step | Who | Time |
|---|---|---|---|
| 1 | Confirm R2 bucket exists, public access ON, CORS applied (§"CORS"), wrangler logged in | Founder | 10 min (one-time setup) |
| 2 | Agent: run `./scripts/rebuild-tiles-z18.sh` → 4 PMTiles in `/tmp/zaahi-tiles-z18/` | Agent | 5 min build time |
| 3 | Agent: 5-named-plot decode per [[feedback_pmtiles_verification]] on each `/tmp/*.pmtiles` | Agent | 1 min |
| 4 | Agent: present magic + decode report, **pause for founder approval** | Both | — |
| 5 | After OK: `cp /tmp/zaahi-tiles-z18/*.pmtiles public/tiles/` (overwrites local z16 files — these are NOT committed at this point) | Agent | 5 sec |
| 6 | `BUCKET=zaahi-tiles CDN_BASE=https://cdn.zaahi.io ./scripts/upload-tiles-r2.sh` (includes HEAD + Range smoke test) | Agent | 2-5 min depending on upload bandwidth |
| 7 | Verify range-request HTTP 206 + magic bytes from CDN (auto in the upload script) | Agent | — (already in step 6) |
| 8 | Apply the one-line page.tsx diff (§"What changes") | Agent | 30 sec |
| 9 | Set `NEXT_PUBLIC_TILES_BASE_URL` on Vercel (Prod + Preview env) | Founder | 1 min |
| 10 | `gitignore public/tiles/*.pmtiles` + remove the 4 .pmtiles from the repo's history via `git rm --cached` + commit page.tsx + update-tiles.sh (`--maximum-zoom=18`) + `.gitignore` | Agent | 2 min |
| 11 | Push → Vercel auto-deploy | Agent (with founder OK) | 1–3 min |
| 12 | Live check on zaahi.io: load /parcels/map, scroll-in past z16, confirm 3D buildings render | Founder | 2 min |

Rollback (any step before 11): `git reset --hard origin/main` + unset
the Vercel env var. The R2 upload is harmless if the env var isn't
set — production keeps loading from the local repo files.

If step 11 fails (deploy red): unset `NEXT_PUBLIC_TILES_BASE_URL` on
Vercel; the next request reads from `/tiles/` again. Then debug.

## Sovereignty note

Cloudflare R2 is a deliberate non-Vercel storage choice. Per CLAUDE.md:

> "Files хранить локально или через абстракцию (`src/lib/storage.ts`)
> — не напрямую Supabase Storage" and "All API routes — стандартный
> Next.js route handlers, никаких Vercel-эксклюзивных серверлесс-обвязок"

R2 is consumed via standard HTTPS; no Cloudflare-specific SDK is
needed by the running app. The docker-compose fallback can either
keep loading from `public/tiles/` (env var unset) or point at an
alternative CDN/MinIO instance just by changing the env var.

## Future work

- **Versioned paths** (`/tiles/v18-2026-05-23/dda-land.pmtiles`) so
  rebuilds don't need cache invalidation
- **Cache-Control: public, max-age=31536000, immutable** on R2 objects
  (set per-object via wrangler `--metadata` or via Transform Rules)
- **Smaller AD-Other** via `--coalesce-densest-as-needed` if the file
  ever grows past 200MB — R2 has no size limit but CDN egress cost
  scales with bytes served
- **Move other large assets** (Three.js models, HDR envmaps, Drone-HUD
  audio) to the same bucket once the pattern is proven

## Files in this branch

- `scripts/upload-tiles-r2.sh` — wrangler upload + HEAD + Range smoke
  test for the 4 PMTiles
- `scripts/rebuild-tiles-z18.sh` — tippecanoe rebuild at z18 into
  `/tmp/zaahi-tiles-z18/` (never touches `public/tiles/`)
- `docs/r2-migration-plan.md` — this document

No production code modified.
