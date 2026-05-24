# Cesium + Google Photorealistic 3D Tiles — Spike

**Date:** 2026-05-24
**Branch:** `research/3d-city-spike`
**Predecessor research:** `docs/research/ai-generated-3d-city-2026-05-15.md` (verdict: consume Google 3D Tiles, do not capture our own)
**Scope:** thumbs-up/down on whether to build the 3D-city view on top of Google's Photorealistic 3D Tiles. Not a production integration.
**Constraint reminder:** no `src/app/parcels/map` edits, no main push, no DB / schema work. The API key never enters this file — it lives in `sessionStorage` in the founder's browser only.

---

## How to run the spike

1. Open `docs/research/cesium-spike-2026-05-24/cesium-3d-tiles-spike.html` directly in a browser. No build step. Chrome / Firefox / Safari latest — Cesium needs WebGL 2.
2. When prompted, paste the Google Maps API key (Map Tiles API must be enabled, billing on the project). The key is written to `sessionStorage` and never to disk.
3. Click each of the three location buttons in the sidebar — Business Bay, Burj Khalifa / Downtown, DIFC.
4. Hit **📸 Take screenshot (PNG)** on each location. Files land in your browser's download folder named `zaahi-cesium-<loc>-<ts>.png`.
5. Toggle the sample ZAAHI plot polygon on/off at Business Bay to verify that a Cesium-drawn 30 × 30 m gold extrusion lines up against Google's photoreal buildings (both use WGS84 — they should match within a metre).
6. While flying, watch the diagnostics panel: FPS, tiles loaded, tileset bytes streamed, camera height, camera pitch.

**Founder action:** paste the 3 screenshots into `docs/research/cesium-spike-2026-05-24/screenshots/` (create folder) and commit them on this branch separately. Agent cannot take screenshots without a browser.

---

## What this spike answers (vs. the 2026-05-15 research doc)

The earlier doc concluded "consume Google 3D Tiles, not capture our own." This spike is the cheapest possible test of that conclusion: a working Cesium viewer that actually pulls Google's tileset over real Dubai, with the ZAAHI parcel overlay primitive next to it.

Specifically:
- **Coverage** — does Dubai have dense, high-quality photoreal coverage at all three of our flagship locations?
- **Overlay registration** — does a Cesium polygon drawn from ZAAHI lat/lng coordinates land on the same surface as Google's buildings?
- **Performance ceiling** — does Cesium hit a usable FPS on a typical desktop GPU when streaming the dense centre of Dubai?
- **Architecture** — does this need to be a standalone Cesium viewer, or can we splice Google 3D Tiles into our existing MapLibre map?

If any of these is a hard "no", the integration plan changes.

---

## Diagnostics to record per location

For each of the three locations, fill in the table below from the on-screen panel during the spike run. Replace `—` with measured values.

| Location | Visual quality (1-5) | Coverage gaps observed | FPS (steady) | Tiles loaded (steady) | Tileset bytes streamed |
|---|---|---|---|---|---|
| Business Bay | — | — | — | — | — |
| Burj Khalifa / Downtown | — | — | — | — | — |
| DIFC | — | — | — | — | — |

**Polygon registration test** (Business Bay, sample 30 × 30 m gold plot at 55.2650, 25.1870):

- [ ] Gold polygon lands on a real plot footprint, not floating / sunken
- [ ] Top of 30 m extrusion is at roughly the same height as a neighbouring 10-storey block
- [ ] Sub-metre misalignment is acceptable; >5 m means we have a projection problem

---

## Viability report (architecture call)

### A. Coverage expectation — from Google's public coverage map

Google's Photorealistic 3D Tiles cover the centre of Dubai with high-density photogrammetry. Business Bay, Downtown (Burj Khalifa) and DIFC are all inside the core coverage zone — these were chosen precisely because they are the densest sections of our footprint. Outlying ZAAHI plots (Al Yalayis 3, Dubai Islands, parts of Abu Dhabi) are in lower-density or simplified mesh zones. The spike validates the centre; outlying areas will be a separate test if we commit to the integration.

If the spike's screenshots show clean buildings at all three locations, coverage is a thumbs-up. If even one location shows a hole or flat mesh, that's a "scoped 3D" decision — show 3D only inside the core coverage polygon, fall back to our ZAAHI Signature 3D extrusions outside.

### B. Polygon overlay — Cesium entities + WGS84

The spike draws one Cesium polygon entity at the same lat/lng we'd source from `Parcel.geometry`. Cesium's polygon hierarchy is fed via `Cesium.Cartesian3.fromDegreesArray`, which is straight WGS84 — the same coordinate system MapLibre uses on our existing map. No reprojection needed; the polygon should land within centimetres of where the same polygon shows on `/parcels/map`.

That validation is what makes the architecture decision: if Cesium overlays line up with no transform, our existing `loadZaahiPlots` data path can feed the Cesium viewer too, by adapting the GeoJSON → `Cesium.Cartesian3` call. Reuse of the geometry pipeline is the single biggest win.

### C. Performance — what to watch

The diagnostics panel surfaces FPS, tile count, and bytes streamed. Targets:

- **Steady-state FPS ≥ 30** on the founder's desktop after the initial fly-in
- **Tiles loaded < 600** per scene (lower is better; tile streaming is the bandwidth driver)
- **Cold-load tileset bytes ≤ 200 MB** per session (Google's billing model is per-session, not per-tile-byte, but bandwidth is the user-side cost)

If FPS drops below 20 while panning in any location, mobile is out of scope and we'd need to gate the 3D-city view behind a desktop-only check.

### D. Architecture decision — Cesium standalone vs. MapLibre integration

This is the central question. Two paths:

| Path | What it looks like | Verdict (a priori) |
|---|---|---|
| **Cesium standalone** | A new route, e.g. `/parcels/[id]/3d-city`, owned by a Cesium viewer. The existing 2D + ZAAHI Signature 3D map at `/parcels/map` stays untouched. Side panel + parcel data shared via React props. | **Realistic.** Cesium is the only mature consumer of Google 3D Tiles. ~40-60 hours of integration. |
| **MapLibre + Google 3D Tiles** | Splice Google's tileset into MapLibre's existing scene via a `Tile3DLayer` (deck.gl) or `maplibre-gl-3d-tiles` plugin. | **Risky.** deck.gl `Tile3DLayer` works but requires running deck.gl alongside MapLibre — third renderer in the page. `maplibre-gl-3d-tiles` is experimental. Either way, polygon overlay + camera sync gets complicated. ~80-120 hours, and ongoing maintenance against two upstream libraries. |

The spike's job is to validate path #1. Path #2 is documented as a known harder route in case the founder wants to merge 3D-city into the existing map page later.

Inside Cesium standalone, there are two sub-options:

- **(D1) Dedicated 3D-city route** — `/parcels/[id]/3d-city` or `/parcels/map-3d`. Clean separation. User clicks a "3D City" button on the side panel; we open a Cesium-only view focused on the selected plot. Pros: no MapLibre/Cesium z-fighting. Cons: two pages, two state stores.
- **(D2) Picture-in-picture** — embed a smaller Cesium viewer in a modal or a panel on the existing map. Pros: doesn't take over the screen. Cons: tiny viewport defeats the purpose of 3D-city detail.

Recommended path: **D1, dedicated route.** Cleaner story for the user ("explore in 3D city" → fly through Dubai), no rendering conflicts, easy rollback.

### E. Cost model — Google Maps Photorealistic 3D Tiles billing

As of 2025, Google's pricing for Photorealistic 3D Tiles is **per session** (~24h of usage by the same client), not per tile:

- First 1,000 sessions / month: **$5 per 1,000 sessions** ($0.005 / session)
- Volume tiers reduce after 100k / mo

For ZAAHI's expected scale (estimate: 1,000 page-views/day × 30% open 3D-city × 30 days = ~9,000 3D-city sessions/mo), that's about $45/mo in API cost — negligible. The dominant cost is bandwidth (user-side), not Google billing.

Risk: if we cache the tileset in a CDN to bypass Google's CDN, we violate Google's ToS. The integration must call Google's endpoint directly from the client every time. No edge caching.

### F. ToS implications

- **Attribution is mandatory.** Cesium's `showCreditsOnScreen: true` setting (used in the spike) prints "Google" credits on the canvas. Must stay on in production.
- **No long-term tile caching.** Sessions are 24h max; tiles must be re-requested after that.
- **No redistribution.** We cannot ship the tileset alongside our app. Always live-fetched from Google.

None of these are blockers, but they shape what kind of caching layer we can build.

### G. Estimated integration effort (if greenlit)

Path D1 (dedicated `/parcels/[id]/3d-city` route, Cesium standalone):

| Task | Hours |
|---|---:|
| New Next.js route + Cesium viewer scaffold | 4 |
| ZAAHI parcel polygon overlay (re-use `Parcel.geometry` from `/api/parcels/[id]`) | 4 |
| Fly-to-selected-parcel on mount, camera presets | 3 |
| API key plumbing — server-side env var `GOOGLE_MAPS_3D_TILES_KEY`, mint short-lived session token via an `/api/maps-key` route gated by `getApprovedUserId` so anonymous users can't scrape the key | 6 |
| "3D City" button on existing `/parcels/map` SidePanel → opens the new route in a new tab | 1 |
| Authentication wrapper (`AuthGuard`) | 1 |
| Mobile fallback (Cesium is heavy → desktop-only at first, show a banner on mobile) | 2 |
| Cost guardrails — soft rate-limit per user-session-id; admin override | 4 |
| Logging + Vercel analytics on sessions opened | 2 |
| Manual verification on 5 plots across all 3 locations + 2 edge-of-coverage areas | 4 |
| **Total** | **~31 hours** |

A more cautious estimate (40-60 hours) accounts for unknowns: Cesium camera-sync bugs, mobile detection edge cases, billing alerts in Google Cloud, etc.

### H. Risks

1. **Coverage gaps outside Dubai centre.** If we ever list plots in Saudi (we just dropped that), outer Sharjah, or rural Abu Dhabi, Google's 3D tiles may be flat-mesh or absent. Need a coverage-detection step that falls back to ZAAHI Signature 3D.
2. **Camera + polygon sync drift.** Cesium uses an Earth-centred camera; MapLibre uses a Web Mercator camera. The two viewers will never share a camera struct. If we want bi-viewer (mini MapLibre next to big Cesium), it's a custom sync loop. Path D1 (Cesium standalone) sidesteps this entirely.
3. **API key exposure.** A client-side Google key is by definition visible in the browser. Mitigations: restrict the key in Google Cloud Console to the production domain + Map Tiles API only. If the key is scraped, attacker can rack up bills only against our project's quota — set a hard daily quota cap.
4. **Bandwidth on cellular.** A 3D-city session can stream 100-200 MB of tiles. Block cellular by default; warn user before opening.
5. **Cesium bundle size.** Cesium core is ~3 MB gzipped. Code-split aggressively; only the `/parcels/[id]/3d-city` route ships it.
6. **Photogrammetry artifacts on iconic buildings.** Burj Khalifa renders, but the spire often comes out as a soft cone, not a sharp needle. ZAAHI's "tower listing" demo screenshots will need careful angle selection. Mitigation: pin the screenshot angle to a known-good orbit.

### I. Decision matrix for the founder

Mark each row Y/N after running the spike. Three Y's = greenlight integration.

- [ ] **Coverage:** All 3 locations show clean photoreal buildings, no holes
- [ ] **Overlay:** Sample ZAAHI plot polygon lands within ~1 m of where a real plot footprint should be
- [ ] **Performance:** Steady FPS ≥ 25 on the founder's desktop in the densest scene
- [ ] **Cost ceiling:** Comfortable with ~$0.005/session billing + bandwidth on the user

If 3+ are Y: proceed with Phase B (full integration, ~31-60 hours).
If 2 are N: descope to a static-render demo (server-pre-renders a single 3D frame per plot via Cesium running headless in CI; cheaper, fewer ToS knots).
If overlay misaligns > 5 m: abort. Reproject from CRS unknowns is its own multi-week project.

---

## Files in this spike

| File | Purpose |
|---|---|
| `cesium-3d-tiles-spike.html` | Standalone HTML, no build. Cesium 1.118 via CDN. Click the 3 location buttons + screenshot each. |
| `README.md` | This document. |
| `screenshots/` (founder-populated) | 3 screenshots after the spike run. |

No production code modified. No `src/**` edits. No main push.
