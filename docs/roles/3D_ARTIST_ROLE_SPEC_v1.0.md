---
Document: 3D ARTIST ROLE SPEC
Version: v1.0 DRAFT
Status: DRAFT — founder review before recruitment begins
Author: Agent (Claude Opus 4.7, 1M context)
Reviewer: Dymo Tsvyk (hiring lead · role owner)
Approver: Zhan Ryspayev (final hiring authority per §9.2 Enhancement Proposal)
Branch: research/vision-and-competitors-2026-04-19
Classification: CONFIDENTIAL — hiring + pipeline spec
Parent ratification: `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md` v1.4 §1.G R-9 + §4.6 (commit `fc977a7`)
---

# 3D Artist Role Specification

---

## §1 Purpose — why ZAAHI needs this role

ZAAHI's platform includes real-world building visualisation at geographic coordinates alongside the **ZAAHI Signature** generative algorithm (podium / body / crown on 114 parcels · protected per CLAUDE.md "NEVER change ZAAHI Signature 3D").

The Al Fahidi Fort POC (commits `e11e042` · `ff2afea` · `98b49d7` · `b606765`) demonstrated:
1. Platform technical capability to render real buildings via MapLibre Custom Layer + Three.js is WORKING.
2. Procedural geometry works at **LOD2** quality — recognisable silhouette · not surveyed-accurate · acceptable for first demo.
3. To reach **LOD3+** quality (architectural accuracy · PBR materials · textures · iconic-level fidelity) requires a skilled 3D artist. Agent cannot produce this quality in reasonable time and procedurally-generated meshes hit a ceiling.

**This role unlocks:**
- LOD3+ UAE iconic buildings for Rudi demos and broker marketing materials.
- Tier 0 heritage collection (pre-1950 forts · public domain · clean legal path · 5-8 buildings Y1).
- Tier 1 modern iconic buildings as per-building licensing lands (Burj Khalifa · Emirates Towers · Museum of the Future · etc. · Dymo-negotiated).
- Tier 2 Enterprise tenant custom buildings (Phase 2+ · bundled into AED 22 000/mo Enterprise tier per §77 PRICING_FRAMEWORK).

**This role does NOT:**
- Replace ZAAHI Signature procedural algorithm (protected).
- Replace agent integration work (artist creates files · agent integrates into platform).
- Handle marketing / PR / sales — pure content production role.

---

## §2 Core responsibilities

### §2.1 Mesh production

- Produce architecturally-accurate 3D meshes of UAE buildings from priority queue (§6).
- Baseline quality: **LOD3** (recognisable in 2 seconds · key features accurate · correct proportions).
- Enterprise tier quality: **LOD4** (photorealistic textures · PBR materials · surveyed accuracy).
- Format: glTF 2.0 binary (`.glb`) · web-optimised single-file.
- Coordinate origin: building footprint centroid at (0, 0, 0) · Y-axis UP · 1 unit = 1 metre.

### §2.2 Architectural research

- Study publicly available photographs · architectural drawings · satellite imagery per building.
- Document key architectural features: proportions · fenestration pattern · setback geometry · material palette · iconic silhouette elements.
- Flag licensing questions to Dymo **before** starting a model on any Tier 1 modern building.

### §2.3 Texture + material work

- Create PBR (Physically Based Rendering) materials: albedo + normal + roughness + metallic maps.
- Maximum texture resolution: 2048×2048 per map.
- Use public-domain or licensed reference photography only.
- For Tier 1 buildings · use owner-provided brand assets when licensing includes them.

### §2.4 Licensing verification support

- For each Tier 1 building · provide Dymo with a 1-page licensing brief:
  - Owner identification
  - Reference photography sources used
  - Any trademark / copyright considerations flagged
  - Recommended approach (negotiate direct · avoid · proceed)
- Artist does NOT negotiate licensing (Dymo role) but supports the process with research.

### §2.5 Pipeline compliance

- Deliver files via GitHub PR to research branch: `assets/3d/<building-slug>/model.glb`.
- Respect polygon + texture budgets (§3).
- Document any LOD variants (e.g. LOD2 fallback + LOD3 full detail).
- Do NOT commit `.blend` / `.max` / `.ma` source files to main repo (use Git LFS or separate asset repo · see §8 Anti-patterns).

---

## §3 Technical deliverables (mandatory)

| Specification | Value | Rationale |
|---|---|---|
| Format | glTF 2.0 binary (`.glb`) | Web-optimal · single-file · industry-standard · Three.js native support |
| Polygon budget | ≤ 50 000 triangles per building | Mobile performance ceiling · zaahi.io serves iPhone / Android |
| Texture resolution | ≤ 2048×2048 per map | Bandwidth budget · 4 maps × 2K × 2K × 4 bytes ≈ 64 MB uncompressed · gzip to ~8-15 MB |
| Material system | PBR (albedo · normal · roughness · metallic) | Three.js MeshStandardMaterial native support · realistic lighting response |
| Coordinate origin | Footprint centroid at (0, 0, 0) | Matches FortLayer.ts integration · MercatorCoordinate anchoring |
| Scale | 1 Three.js unit = 1 metre | Matches real-world metric scale · MapLibre MercatorCoordinate expects metres |
| Up-axis | Y-axis UP (Three.js convention) | Matches existing `FortLayer.ts` rotation math |
| LOD tiers | LOD2 fallback + LOD3 primary | Bandwidth-conscious mobile fallback · higher quality on desktop |
| File size target | ≤ 5 MB per `.glb` post-compression | Acceptable first-load latency budget for `/parcels/<slug>-poc/` routes |

### §3.1 Handoff procedure

1. Artist completes mesh in preferred tool (Blender · Maya · 3ds Max).
2. Exports `.glb` using glTF 2.0 exporter (Blender has built-in since 2.8; Maya needs plugin).
3. Runs gltf-validator (or GLTF-Validator VSCode extension) · fixes any errors.
4. Opens GitHub PR on `research/vision-and-competitors-2026-04-19` branch:
   - Path: `assets/3d/<building-slug>/model.glb`
   - Additional: `assets/3d/<building-slug>/README.md` with dimensions · licensing notes · reference photo sources.
5. Agent reviews PR · integrates into platform via research-branch task (FortLayer.ts becomes GLBLoader or new loader module).
6. Zhan reviews integration · merges to main · Vercel auto-deploys.
7. Post-deploy · artist verifies rendering matches intent · flags any integration issues.

### §3.2 Iteration cycle

- Month 1: 1 building (Al Fahidi LOD3 upgrade over current procedural — reference integration pattern).
- Month 2-3: 1-2 buildings per week (5-8 Tier 0 heritage forts by Month 6).
- Month 4+: sustainable 1-2 buildings per week · Tier 1 as licensing lands.

---

## §4 Architectural accuracy standards

### §4.1 "Recognisable in 2 seconds" rule

A trained observer (Dubai broker · UAE resident · RERA professional) must recognise the building within 2 seconds of seeing the render. Test: show 3 unlabelled renders to 3 testers · if all 3 identify correctly · pass.

### §4.2 Key features that must be accurate

- **Silhouette** — the primary recognition hook · getting this wrong is fatal.
- **Proportions** — height-to-width · setback patterns · massing.
- **Fenestration** — window pattern · density · positioning.
- **Distinctive geometric elements** — Burj Khalifa's 27 setbacks · Museum of the Future's torus cutouts · Frame of Dubai's rectangular void.
- **Material palette** — steel/glass vs sandstone vs concrete differentiation.

### §4.3 Features that can be abstracted

- Interior geometry (not visible from exterior rendering).
- Ground-floor detail below typical viewing angle.
- Far-side facades rarely seen in reference photography.
- Decorative micro-elements if not visible at typical web render distance.

### §4.4 Reference photography sources

- **Owner-provided assets** (Emaar · DFF · DCT · Dubai Municipality press rooms · for Tier 1 buildings).
- **Public-domain / CC licensed** — Wikimedia Commons · Unsplash (check commercial-use flag).
- **Purchased stock** — Getty · iStock · Shutterstock (project Dymo budget · per-building ~AED 50-200 for reference pack).
- **Artist's own photography** — if artist visits Dubai · photographed from public streets.

**NOT acceptable:**
- Scraping copyrighted photos without licensing.
- Using Google Street View as texture source (Google terms violation).
- Using any photo marked "editorial use only" for commercial product.

---

## §5 Skill requirements

### §5.1 Essential

- **3D modelling proficiency** — Blender (preferred · free · industry-standard) OR Maya OR 3ds Max.
- **glTF 2.0 export pipeline** — must have demonstrable exports with materials + textures surviving roundtrip.
- **PBR texturing** — Substance Painter OR Mari OR Quixel · practical experience creating albedo + normal + roughness + metallic maps.
- **Archviz background** — 2+ years architectural visualisation work · portfolio demonstrating iconic buildings · landmarks · real-estate renders.
- **English professional level** — documentation · PR messages · research briefs.

### §5.2 Strongly preferred

- **UAE familiarity** — Dubai / Abu Dhabi architectural lexicon · regional style awareness.
- **Three.js rendering constraint awareness** — understanding of polygon budgets · texture sizes · mobile performance (helps optimise without requiring agent back-and-forth).
- **Git + GitHub workflow** — PR-based handoff · ability to self-serve on version control.
- **Blender Python scripting** — automation of repetitive export tasks.

### §5.3 Nice to have

- Real-time rendering experience (Unreal · Unity) — pipeline intuition transfers.
- Photogrammetry experience — alternative high-fidelity path.
- Arabic language skills — easier reference research for UAE buildings.

### §5.4 NOT required

- Agent knows coding · no programming expected.
- Business development · sales · marketing — pure content role.
- Office presence · remote-first acceptable.

---

## §6 Y1 output target + priority queue

**Y1 goal: 25-30 buildings delivered.** Cadence: 1-2 buildings / week sustainable.

### Priority queue (Dymo owns · revisions subject to licensing landings):

**Month 1 · onboarding + LOD3 upgrade (1 building):**
- Al Fahidi Fort LOD3 (replaces current procedural POC at `/parcels/al-fahidi-fort-poc`)

**Month 2-3 · Tier 0 heritage forts (5 buildings · public domain · no licensing delay):**
- Al Jahili Fort (Al Ain · 1898)
- Al Hisn Fort (Sharjah · 1823)
- Al Bidya Mosque (Fujairah · 1446 · oldest mosque in UAE)
- Ajman Fort (1775)
- Fujairah Fort (1670 · UAE's oldest fort)

**Month 3-4 · Tier 0 expansion (3-5 buildings · public domain):**
- Abu Dhabi Corniche Lighthouse (historic)
- Al Jahili Gate (Al Ain)
- Al Maqta Fort (Abu Dhabi · 1763)
- Selection of windtower (barjeel) heritage houses in Al Fahidi Historical Neighbourhood

**Month 4-12 · Tier 1 modern iconic (as licensing lands · Dymo-negotiated):**
- Priority based on licensing outcome · not fixed order
- Target 10-15 Tier 1 buildings Y1 if licensing permits

**Month 10+ · Tier 2 Enterprise tenant custom (Phase 2):**
- On-demand per tenant contract
- Bundled in AED 22 000/mo Enterprise tier

---

## §7 Compensation estimate (placeholder · Dymo finalises)

| Component | Estimate | Basis |
|---|---:|---|
| Base salary (Dubai archviz market 2026) | AED 18 000 – 25 000 / month | Mid-senior archviz artist · LinkedIn Salary · Dubai-based recruiters · own market survey |
| Employee benefits (visa · insurance · gratuity) | +30 % of base | UAE employment standard |
| Blender / Substance licences | AED 10 000 – 20 000 / year | Substance ~AED 1 000/mo · Blender free · optional Quixel Megascans |
| Laptop + monitor (one-time) | AED 20 000 – 30 000 | Decent GPU workstation class |
| Performance bonus per milestone (25 buildings · Tier 2 Enterprise custom) | Per negotiation | Not mandatory · aligns incentives |

**Total Y1 cost range:** AED 150 000 – 250 000 (6-9 months partial year · Month 3-12 assumed).

**CRITICAL:** this exceeds §4.3 Enhancement Proposal Y1 envelope buffer by ~AED 55 k. Funding path pending founder decision (see §4.6 of Enhancement Proposal v1.4 · agent recommends Platform Dev Fund per SV-14 precedent).

---

## §8 Anti-patterns — what NOT to do

### §8.1 Licensing-negligent modelling

- ❌ Creating a mesh of a Tier 1 modern building **before Dymo confirms licensing agreement**.
- ❌ Using copyrighted reference photos without clearance.
- ❌ Copying geometry from an existing third-party 3D model without verifying license.
- ❌ Downloading Sketchfab models and re-exporting as own work.

### §8.2 Budget violations

- ❌ Exceeding 50 000 triangle budget without LOD justification.
- ❌ Shipping 4K textures (4096×4096) without specific Enterprise-tier request.
- ❌ Delivering `.glb` files > 10 MB without negotiated exception.

### §8.3 Pipeline violations

- ❌ Committing `.blend` / `.max` / `.ma` source files to main `zaahi.io` repo (use Git LFS or a separate asset repo).
- ❌ Bypassing the GitHub PR workflow with direct uploads / email attachments.
- ❌ Modifying files outside `assets/3d/<building-slug>/` without agent coordination.
- ❌ Skipping gltf-validator.

### §8.4 Quality violations

- ❌ LOD2 or lower quality at "Tier 0 / Tier 1" delivery tiers (reserve LOD2 as mobile fallback only).
- ❌ Incorrect coordinate origin (not at building centroid).
- ❌ Inconsistent scale (non-metric units).
- ❌ Wrong up-axis (Z-up or X-up · must be Y-up).

---

## §9 Workflow detailed

### §9.1 Weekly cadence (sustainable)

| Day | Artist activity |
|:-:|---|
| Mon | Research + reference gathering for new building (if licensing confirmed for Tier 1 · else Tier 0 queue) |
| Tue-Wed | Base geometry + proportions |
| Thu | Detail pass + texturing |
| Fri | Export + validation + GitHub PR |

### §9.2 PR template

```markdown
# 3D Model: <Building Name>

**Tier:** [0 / 1 / 2]
**Licensing status:** [Public domain (pre-1950) / Licensed by Dymo dd-mm-yyyy / Tenant contractual]
**Licensing evidence:** [link to Dymo confirmation email OR public-domain basis]

## Technical
- Polygon count: N triangles (budget: ≤ 50 000)
- Texture maps: [list · resolution · PBR channels present]
- File size post-compression: N.N MB
- LOD variants: [LOD2 · LOD3]

## Architectural accuracy
- Reference photography sources: [list · with license flags]
- Key features preserved: [list]
- Features abstracted: [list with rationale]

## Validation
- [ ] gltf-validator pass
- [ ] "2-second recognition" test with 3 testers (attach names + pass/fail)
- [ ] Polygon budget met
- [ ] Texture budget met
- [ ] Coordinate origin at centroid
- [ ] Y-up · metric scale

## Integration notes (for agent)
- Suggested zoom level: [N]
- Any special lighting setup needed?
- Any material-specific rendering hints?
```

### §9.3 Agent integration steps (for each PR)

1. Agent reviews PR in research branch.
2. Agent creates integration branch (or updates FortLayer.ts pattern for new route `/parcels/<slug>-poc/`).
3. Agent swaps procedural geometry → GLBLoader · preserves MapLibre CustomLayer integration.
4. Agent commits + requests Zhan review.
5. Zhan runs `tsc --noEmit` + `pnpm build` + `pnpm dev` visual test.
6. Zhan merges to main · Vercel auto-deploys.
7. Artist verifies at `https://zaahi.io/parcels/<slug>-poc/`.

---

## §10 First 90 days deliverables

### Month 1 · onboarding + Al Fahidi LOD3

- [ ] Week 1: hardware + software setup · pipeline docs · GitHub access · first agent meeting.
- [ ] Week 2-3: Al Fahidi Fort LOD3 — replaces current procedural at `/parcels/al-fahidi-fort-poc`. Reference pattern for all future buildings.
- [ ] Week 4: pipeline validated · first PR merged · production deployment verified.

### Month 2 · Tier 0 heritage (3 buildings)

- [ ] Al Jahili Fort (Al Ain)
- [ ] Al Hisn Fort (Sharjah)
- [ ] Al Bidya Mosque (Fujairah)

### Month 3 · Tier 0 completion + Tier 1 kickoff

- [ ] Ajman Fort
- [ ] Fujairah Fort
- [ ] Begin first Tier 1 building if Dymo has secured licensing (e.g., Museum of the Future if DFF partnership lands)

**Month 3 review gate:** 5-6 buildings delivered · pipeline smooth · ready for sustained 1-2/week cadence.

---

## §11 Related documents

- `docs/architecture/MASTER_TREE_ENHANCEMENT_PROPOSAL.md` v1.4 §1.G (R-9 ratification) + §4.6 (pipeline budget)
- `docs/specs/phase-1/07-ICONIC_BUILDING_POC_SPEC.md` v1.0 (Al Fahidi capability demonstration · what R-9 scales from)
- `src/app/parcels/al-fahidi-fort-poc/` (reference integration · FortLayer.ts becomes GLBLoader pattern for artist deliverables)
- `CLAUDE.md` — ZAAHI Signature rules (protected · not affected by this role)
- Master Tree §76 Media · §44 3D Engine · §80 Content Ops

---

**End of 3D Artist Role Spec v1.0 DRAFT.**

Awaiting Dymo review + recruitment start. Agent available for pipeline technical questions during interviews.
