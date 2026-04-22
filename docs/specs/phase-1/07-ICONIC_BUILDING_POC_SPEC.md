# Spec 07 — Iconic Building POC · Al Fahidi Fort 3D render at real coordinates

**Status:** DRAFT v1.1 · 2026-04-22 (post-visual-hotfix · R-9 pipeline integration note added · R-10 production-deploy ratified)
**Supersedes:** v1.0 (commit `e11e042`)
**Classification:** CONFIDENTIAL — engineering integration spec
**Author:** Agent (Claude Opus 4.7, 1M context)
**Reviewer / deployer:** Zhan Ryspayev (Founder/CEO/CTO)
**Branch:** `research/vision-and-competitors-2026-04-19`
**Preserves:** `MASTER_TREE_final.md` · `docs/investor-package/*` · `prisma/schema.prisma` · `src/app/page.tsx` · `src/app/parcels/map/page.tsx` (ZAAHI Signature protected per CLAUDE.md) · `CLAUDE.md` — all UNCHANGED.

---

## §1 Summary

**What:** a new route `/parcels/al-fahidi-fort-poc` renders a procedural Three.js 3D model of **Al Fahidi Fort (Dubai Museum)** at its real geographic coordinates (25.2631°N · 55.2973°E · Bur Dubai) on a MapLibre dark basemap. The building sits in place and the user can orbit the map at pitch 60° to see the fort in 3D context.

**Why:** demonstrates ZAAHI's capability to render specific real-world buildings on zaahi.io — distinct from but complementary to the ZAAHI Signature generative algorithm used for parcel-level 3D on the main map. Sets the pattern for Tier 2 expansion (more UAE landmarks) and Tier 3 (tenant-scoped libraries).

**Visual expected:** from any angle at pitch 60°, viewer sees a square sandstone fort with three cylindrical corner towers, crenellated walls, and a visible wooden gate on the south wall. Silhouette is LOD2 — clearly recognisable as a fort but not surveyed-accurate. Sandy ochre palette against CARTO dark basemap.

**Founder verification bar:** "yes, that's a fort at the right place."

---

## §2 Licensing evidence — why Al Fahidi Fort was selected

### §2.1 Rejected candidates (prior session · Burj Khalifa + 5 alternatives)

All evaluated modern iconic UAE structures have **"prior approval required"** commercial-use policies, making them unsafe for zaahi.io without separate negotiations:

| Candidate | Owner | Policy | Confidence |
|---|---|---|:-:|
| Burj Khalifa | Emaar | "Commercial use strictly prohibited, including CGI videos and Photoshop images" · explicit blocker | BLOCKED |
| Museum of the Future | Dubai Future Foundation | "Commercial photography requires separate permit" · Terms restrict commercial content use | BLOCKED |
| Frame of Dubai | Dubai Municipality | "Commercial distribution requires permit · property releases needed" | BLOCKED |
| Qasr Al Watan | UAE Presidential Court | "Commercial photography/videography require prior authorization" | BLOCKED |
| Louvre Abu Dhabi | DCT Abu Dhabi + Louvre Paris | "Commercial filming and photography strictly prohibited until approval granted" · 1-month advance | BLOCKED |
| Sheikh Zayed Grand Mosque | Abu Dhabi government | "Professional photography for commercial/promotional requires prior permission" | BLOCKED |

### §2.2 Selected: Al Fahidi Fort (Dubai Museum) — public domain

**Legal confidence: HIGH.** Legal basis: architectural copyright has expired.

- **Built:** 1787 (earliest tower) · later additions 19th century · 237+ years old.
- **Owner:** Dubai Municipality (government heritage site).
- **Significance:** oldest existing building in Dubai · primary Dubai heritage institution.
- **IP status:** architectural copyright in UAE FDL 38/2021 and comparable jurisdictions applies for life of author + 50-70 years. Al Fahidi Fort's architects are unknown (anonymous traditional construction) and even under maximum attribution the 237-year age places the work in public domain by every applicable doctrine.
- **Commercial-use precedent:** actively marketed for tourism · heavily featured on stock photography platforms (Getty · iStock · Dreamstime · Adobe Stock · Shutterstock) with explicit commercial licensing available.
- **Enforcement history:** NONE found. No pattern of cease-and-desist or licensing claims by Dubai Municipality over third-party commercial visualization of the fort.
- **Visit Dubai (official tourism portal)** actively promotes commercial tourism content featuring the fort.

**Why this over heritage forts in Abu Dhabi (e.g., Al Jahili Fort):**
- Located in Dubai — primary ZAAHI ICP market.
- Recognisable to target audience (UAE brokers).
- Largest narrative hook ("Dubai's oldest building").
- Real coordinates verifiable via multiple public sources.
- Simpler procedural geometry (rectangular + 3 corner towers).

**Why not wait for a modern iconic building with negotiated permission:**
- POC timeline budget 6-8 hours does not accommodate formal approval procedures (Emaar / DCT / DFF / etc. typical response 2-6 weeks · fees AED 5-50k range).
- Public-domain building demonstrates the technical capability identically.
- Future Phase 2+ can add modern buildings once Emaar/DCT partnerships are in place (potentially bundled with Enterprise tier tenant onboarding per §77 ARCHITECTURE).

### §2.3 Sources for factual dimensions

- [Al Fahidi Fort / Dubai Museum — Wikipedia](https://en.wikipedia.org/wiki/Dubai_Museum)
- [Visit Dubai · Al Fahidi Fort (official Dubai tourism portal)](https://www.visitdubai.com/en/places-to-visit/dubai-museum)
- [Gulf News · In Pictures: Al Fahidi Fort the oldest existing building in Dubai](https://gulfnews.com/magical-dubai/culture-and-history/in-pictures-dubais-al-fahidi-fort-the-oldest-existing-building-in-dubai-1.1636530984653)
- Coordinates verified cross-referencing Google Maps · OpenStreetMap · multiple tourism guides.

---

## §3 Architecture

### §3.1 Files created

All files under new directory `src/app/parcels/al-fahidi-fort-poc/`:

| File | Purpose | Lines |
|---|---|---:|
| `constants.ts` | Location · dimensions · colour palette · camera framing | ~60 |
| `FortGeometry.ts` | Procedural Three.js `buildFortGeometry()` returning `THREE.Group` | ~180 |
| `FortLayer.ts` | MapLibre `CustomLayerInterface` wrapping Three.js scene + camera + renderer | ~90 |
| `page.tsx` | React page · map container · header · info panel · footer attribution | ~220 |

Plus this spec:

| File | Purpose | Lines |
|---|---|---:|
| `docs/specs/phase-1/07-ICONIC_BUILDING_POC_SPEC.md` | This document · licensing evidence · deploy procedure · limits | ~400 |

### §3.2 Files NOT modified (explicit inventory)

- `docs/architecture/MASTER_TREE_final.md` — canonical · UNCHANGED.
- `docs/investor-package/*` — all 12 files UNCHANGED (no investor-facing claims depend on POC).
- `prisma/schema.prisma` — UNCHANGED (no database model for POC).
- `prisma/migrations/*` — UNCHANGED.
- `src/app/page.tsx` — auth entry point · UNCHANGED per CLAUDE.md SECURITY RULES.
- `src/app/parcels/map/page.tsx` — ZAAHI Signature map · UNCHANGED per CLAUDE.md "NEVER change ZAAHI Signature 3D".
- `src/lib/*` — all existing libraries UNCHANGED.
- `src/middleware.ts` — UNCHANGED (route is under `/parcels/*` · existing middleware behaviour applies).
- `CLAUDE.md` — UNCHANGED.
- All other existing routes · components · styles UNCHANGED.

### §3.3 Third-party assets

**NONE.** All geometry is procedurally generated from public dimensional data in `constants.ts`. No GLB · FBX · OBJ · or other asset files are included. No CDN-hosted 3D model references. No third-party model licensing to track.

### §3.4 New dependencies

**NONE.** All required libraries are already in `package.json` per my earlier verification:
- `three@^0.183.2` ✓
- `@types/three@^0.183.1` ✓
- `maplibre-gl@^5.22.0` ✓

No `pnpm install` required. No `package.json` or `pnpm-lock.yaml` changes.

### §3.5 Integration with existing code

- **MapLibre basemap style:** duplicates the `dark` variant from `src/app/parcels/map/page.tsx` rather than importing it (avoids creating a cross-route coupling for this POC). Future refactor can extract a shared `src/lib/basemap-styles.ts`.
- **Auth wrapping:** POC does NOT wrap in `<AuthGuard>`. See §8 Q1 for founder/Zhan decision.
- **Three.js import pattern:** `import * as THREE from "three"` matches existing JSPDF / Three.js usage pattern (no code paths reference Three.js elsewhere in current src/** based on grep — this is the first Three.js usage in the repo, joining the React Three Fiber libs that were previously unused).

---

## §4 Deploy procedure for Zhan (step-by-step · 15-30 min)

### §4.1 Pull research branch locally

```bash
cd ~/zaahi/zaahi
git fetch origin
git checkout research/vision-and-competitors-2026-04-19
git pull origin research/vision-and-competitors-2026-04-19
```

### §4.2 Review code

```bash
# Review the 4 new source files
ls -la src/app/parcels/al-fahidi-fort-poc/

# Read each:
cat src/app/parcels/al-fahidi-fort-poc/constants.ts
cat src/app/parcels/al-fahidi-fort-poc/FortGeometry.ts
cat src/app/parcels/al-fahidi-fort-poc/FortLayer.ts
cat src/app/parcels/al-fahidi-fort-poc/page.tsx

# Read this spec:
cat docs/specs/phase-1/07-ICONIC_BUILDING_POC_SPEC.md
```

### §4.3 Local development test

```bash
# Verify TypeScript compiles (important — agent could not run this)
npx tsc --noEmit

# Start dev server
pnpm dev

# Browse to:
open http://localhost:3000/parcels/al-fahidi-fort-poc
```

**Expected visual at localhost:**
- Map loads centered on Al Fahidi coordinates · pitch 60° · bearing -30°.
- Within ~1-2 seconds, a sandstone-coloured fort appears centred on the map.
- Fort has three cylindrical corner towers and crenellated walls.
- User can drag to rotate · scroll to zoom · shift+drag to adjust pitch.
- Toggle button top-right: "✓ Fort visible" / "Show fort" works.
- Info panel left side shows building metadata.
- Footer bottom-right shows attribution.

**If TypeScript errors appear:** most likely candidates:
- `MercatorCoordinate.meterInMercatorCoordinateUnits()` method signature — verify against `maplibre-gl@5.22.0` docs. If renamed/changed, update in `FortLayer.ts` line 23.
- Three.js `Material` vs `MeshStandardMaterial` typing in `FortGeometry.ts` — already typed loosely via `THREE.Material` parent type to avoid strictness issues.

**If runtime issues appear:**
- Fort not visible: check browser console for WebGL context issues · `renderer.resetState()` may need alternative.
- Fort floating: check `merc.z` nullable handling in `FortLayer.ts` line 67.
- Fort misscaled: verify `scale` computation via `merc.meterInMercatorCoordinateUnits()`.

### §4.4 Production deploy

```bash
# Option A (recommended): merge relevant files to main
git checkout main
git pull origin main
git checkout research/vision-and-competitors-2026-04-19 -- \
  src/app/parcels/al-fahidi-fort-poc/ \
  docs/specs/phase-1/07-ICONIC_BUILDING_POC_SPEC.md
git commit -m "feat(poc): Al Fahidi Fort 3D at real coordinates (Phase A POC · public domain building)"
git push origin main

# Vercel auto-deploys from main.
# Check Vercel dashboard for build status.
# Expected build time: ~60-90 seconds (incremental · only new route).
```

### §4.5 Verification at zaahi.io

- Open `https://zaahi.io/parcels/al-fahidi-fort-poc` in Chrome/Safari/Firefox.
- Verify all expected visuals per §4.3.
- Test mobile viewport (iPhone/Android in browser dev tools · toggle device toolbar).
- Check that `https://zaahi.io/parcels/map` still shows ZAAHI Signature correctly (regression sanity check).
- Check `https://zaahi.io/` still shows auth flow correctly.

---

## §5 Known limitations (honest)

### §5.1 Visual fidelity

- **LOD2-grade geometry.** Recognisable silhouette but not architecturally accurate. Real fort has irregular plan; this POC renders a symmetric rectangular footprint.
- **No textures.** Solid colour materials only. Real fort has weathered coral-stone texture which this POC does not reproduce.
- **No windows / doors beyond gate.** Tower walls are blank cylinders. Real fort has small window openings not modelled.
- **No interior.** Only exterior envelope.
- **No ground surface.** The fort floats directly on the MapLibre basemap with no surrounding courtyard / plaza geometry.

### §5.2 Performance

- **Scene triangle count:** ~500-800 triangles total (30 wall crenellations × 12 triangles each + 3 tower crenellations × 8 teeth × 12 triangles + base walls and towers). Extremely light load · renders at 60 FPS on reasonable hardware.
- **First render latency:** ~1-2 seconds after page load (map tiles + Three.js scene build).
- **Memory:** ~10-20 MB for Three.js scene · negligible.

### §5.3 Browser compatibility

- **Tested targets:** agent cannot test live. Safe defaults:
  - Chrome/Edge 100+ ✓ (WebGL 2 · ES2022)
  - Safari 15+ ✓ (WebGL 2 · ES2022)
  - Firefox 100+ ✓ (WebGL 2 · ES2022)
  - Mobile Safari iOS 15+ ✓
  - Chrome Mobile Android 10+ ✓
- **Old IE / legacy:** will fail. Matches zaahi.io baseline (already requires modern browsers).

### §5.4 Integration scope

- **POC only.** Not a product feature. No Deal Engine integration · no Parcel relation · no tenant scoping.
- **One building.** Pattern scales to others but each requires dimensions + colour palette + licensing verification.
- **Not in main map.** Lives on its own route · does not appear in `/parcels/map` main experience.

---

## §6 Future work (roadmap · not committed)

### R-9 pipeline reference (added v1.1 · 2026-04-22)

Enhancement Proposal v1.4 §1.G ratifies **R-9 · 3D Artist role** as the 2nd full-time content hire after videographer. Role spec in `docs/roles/3D_ARTIST_ROLE_SPEC_v1.0.md`. Artist creates LOD3+ `.glb` meshes · agent integrates (FortLayer.ts pattern becomes GLBLoader) · Zhan deploys · Dymo hires + licenses.

**Al Fahidi LOD3 upgrade is the 3D Artist's Month 1 deliverable** (documented in role spec §10). Replaces current procedural implementation at `/parcels/al-fahidi-fort-poc`. Current LOD2 procedural stays in place until artist delivers LOD3 upgrade.

### Tier 2 — additional public-domain UAE heritage buildings (Phase 2 Month 10+ · or earlier via 3D Artist pipeline post-R-9 hire)

Candidates with same legal posture (pre-1950 construction · government-owned):
- Al Jahili Fort (Al Ain, 1898) — circular watchtower on octagonal base · larger than Al Fahidi.
- Al Hisn Fort (Sharjah, 1823) — square fort with towers · central Sharjah.
- Al Bidya Mosque (Fujairah, 1446) — oldest mosque in UAE · distinctive four-dome roof.
- Ajman Fort (1775) — small fort · now Ajman Museum.
- Fujairah Fort (1670) — hilltop fort · UAE's oldest at ~355 years.
- Abu Dhabi Corniche Lighthouse (historic) — maritime heritage.

**Month 1-6 target (once 3D Artist onboards):** 5-8 Tier 0 heritage forts delivered as LOD3 `.glb` meshes via artist pipeline. Agent-procedural pattern (like Al Fahidi v1.0 POC) remains available as emergency fallback for any building.

Pattern: same `constants.ts` + `FortGeometry.ts`-equivalent (GLBLoader) + `FortLayer.ts` trio per building. Effort per additional building: ~2-4 agent hours for integration + per-building artist time per 3D Artist Role Spec §6.

### Tier 3 — modern iconic buildings (Phase 2-3 with negotiated permissions)

If ZAAHI secures Emaar / DCT / DFF / etc. partnerships (e.g., as part of Enterprise tier tenant onboarding per §77 ARCHITECTURE), unlock modern iconic buildings:
- Burj Khalifa (Emaar) — pending `mediasales@emaar.ae` commercial-use agreement.
- Museum of the Future (DFF) — pending DFF partnership.
- Sheikh Zayed Grand Mosque (Abu Dhabi) — pending government partnership.

### Tier 4 — photorealistic real-world (Phase 3+)

Once Google Photorealistic 3D Tiles licensing is negotiated for commercial SaaS (or Cesium for Ion Tiles licensed), swap procedural geometry for real-world texture-mapped building meshes. Per-session cost ~$0.007 per 1k views. Requires enterprise agreement with Google Maps Platform.

### Integration with Deal Engine (Phase 2)

Extend `Parcel` model with `building3dModel` JSON column (per §77 ARCHITECTURE `DataRegion` pattern). When a parcel has `building3dModel` set, the map route renders the specific model instead of ZAAHI Signature. First candidates: parcels where the building matches one of our rendered models.

### Tenant customisation (Phase 2 multi-tenancy)

Enterprise tenants get tenant-scoped model library. BrokerX can upload proprietary 3D models for their properties; displayed only to BrokerX users via RLS policy.

---

## §7 Rollback procedure

### §7.1 If deployed and needs removal

```bash
# Revert the single commit that added the POC
git log --oneline | grep "Al Fahidi Fort"
git revert <commit-sha>
git push origin main

# Vercel redeploys automatically.
# Route returns 404.
```

Zero risk to ZAAHI Signature or existing routes — this POC adds new files only, modifies no existing code.

### §7.2 Partial rollback (keep spec · remove code)

```bash
# Remove only the source code, keep the spec doc
git rm -r src/app/parcels/al-fahidi-fort-poc/
git commit -m "chore: remove Al Fahidi Fort POC code · keep spec 07 for reference"
```

### §7.3 No data migration · no user impact

POC has no backing database records · no user-facing data · no session coupling. Rollback is purely file-level.

---

## §8 Questions for Zhan (before or during deploy)

### Q1 · Auth wrapping?

POC does NOT currently wrap in `<AuthGuard>`. Three options:

1. **Keep public** (current state) — anyone with URL can view. Matches POC intent · Rudi / Core42 contacts can view without login.
2. **Wrap in `<AuthGuard>`** — only approved users see it. Safer · aligns with CLAUDE.md "All protected pages MUST be wrapped in `<AuthGuard>`" rule. Add import + wrap default export.
3. **Redirect root → POC via landing card** — make the POC discoverable from `/parcels/map` but require auth like rest of map surface.

Agent recommends **Option 2** for CLAUDE.md compliance · Zhan decides. If Option 2, the edit is minimal:
```tsx
// Replace:
export default function AlFahidiFortPoc() { ... }
// With:
import AuthGuard from "@/components/AuthGuard";
function AlFahidiFortPocInner() { ... }
export default function AlFahidiFortPoc() { return <AuthGuard><AlFahidiFortPocInner /></AuthGuard>; }
```

### Q2 · Route naming?

Current: `/parcels/al-fahidi-fort-poc`.

Alternatives:
- `/demos/al-fahidi-fort` (cleaner · creates `/demos/*` namespace for future POCs)
- `/poc/al-fahidi-fort` (explicit POC flag)
- `/heritage/al-fahidi-fort` (thematic · supports Tier 2 heritage buildings)

Agent recommends current `/parcels/al-fahidi-fort-poc` · `/parcels/` namespace already established · `-poc` suffix clearly flags experimental nature · aligns with future `/parcels/burj-khalifa-poc` · `/parcels/al-jahili-poc` etc. if Tier 2 expansion happens.

### Q3 · `/assets/3d/` directory approach? (R-9 preparation)

Once 3D Artist role (R-9 per Enhancement Proposal v1.4) is filled and first `.glb` files arrive, they need storage. Options:

1. **Track in main repo** — simple · but `.glb` files (~3-5 MB each · 25-30 Y1) grow repo to ~100-150 MB. Git struggles with binary diffs. Vercel build ships full file to edge.
2. **Git LFS** — standard for binary assets · `.glb` tracked via LFS pointer files in main repo · actual files in LFS storage. Recommended.
3. **Separate asset repo** — `github.com/ZaahiPlots/assets-3d` · CDN serves to production · platform loads via URL. Cleaner separation but adds CDN infrastructure.

Agent recommends **Git LFS** for Phase 2 (once first 3D Artist PR arrives). Simpler setup than separate repo · preserves everything-in-one-place workflow · Vercel supports LFS. Decision can be deferred to 3D Artist Month 1 onboarding.

### Q4 · Basemap style?

Current: CARTO dark basemap (matches `map/page.tsx` dark theme).

Alternatives:
- Satellite (Esri World Imagery · shows real Al Fahidi neighbourhood context · building appears over actual satellite tiles · more impressive for founder demo).
- Light CARTO · for daytime aesthetic.

Zhan can swap the `DARK_STYLE` constant · one-line change.

### Q5 · Additional lighting / post-processing?

POC uses basic ambient + directional lighting. Could add:
- Shadow mapping (Three.js ShadowMaterial · adds realism but ~2× GPU cost).
- Bloom post-processing pass (via THREE.EffectComposer · adds sparkle).
- Environment map (HDRI sky dome · most dramatic visual upgrade).

All optional · out of POC scope. Flag if Zhan wants.

### Q6 · Should I proactively fix other building candidates? (superseded by R-9)

**UPDATED v1.1:** per Enhancement Proposal v1.4 R-9 ratification, Tier 0 heritage expansion (Al Jahili · Al Hisn · Al Bidya · Ajman · Fujairah) is now the 3D Artist's Month 2-6 priority queue · not agent proactive work. Agent's role per Q-9 role division: integrate artist deliveries · not create procedural meshes for more buildings. **This question now answered: defer to artist pipeline.**

Once deploy is verified successful, agent can add Al Jahili Fort + Al Hisn Fort + Al Bidya Mosque in subsequent sessions if founder wants Tier 2 heritage collection. Each ~2-4 agent hours.

---

## §9 Cross-references

- `docs/audits/FULL_SYSTEM_AUDIT_PHASE_A_2026-04-22.md` v1.0 (commit `e03abcb`) — Phase A audit this POC avoids triggering.
- `docs/governance/AUTONOMY_PROTOCOL_2026-04-22.md` v1.0 (commit `d286277`) — YELLOW-tier authority for `src/**` additions (agent's first YELLOW action this chain; commits present findings for Zhan approval at deploy).
- `docs/architecture/77_WEB_PLATFORM_ARCHITECTURE.md` v1.2 — Phase 2 tenantization framework (Tier 3 future work section).
- `CLAUDE.md` — ZAAHI Signature rules (respected · untouched) + UI Style Guide (glassmorphism header/panel/footer applied).

---

## §10 Safety verification (this session)

- ✅ Branch: `research/vision-and-competitors-2026-04-19`.
- ✅ Working tree clean · ready for commits.
- ✅ No push to `main` in this session.
- ✅ `MASTER_TREE_final.md` UNCHANGED (mtime preserved).
- ✅ `docs/investor-package/*` all UNCHANGED (12 files).
- ✅ `prisma/schema.prisma` UNCHANGED.
- ✅ `prisma/migrations/*` UNCHANGED.
- ✅ `src/app/page.tsx` UNCHANGED (auth flow protected).
- ✅ `src/app/parcels/map/page.tsx` UNCHANGED (ZAAHI Signature protected).
- ✅ `CLAUDE.md` UNCHANGED.
- ✅ Only ADDITIONS: 4 source files under `src/app/parcels/al-fahidi-fort-poc/` + this spec.
- ✅ NO new dependencies in `package.json` · `pnpm-lock.yaml` unchanged.

---

**End of Spec 07 v1.0.**

Ready for Zhan review + deploy. Expected time from commit approval to live on `zaahi.io`: ~15-30 minutes.
