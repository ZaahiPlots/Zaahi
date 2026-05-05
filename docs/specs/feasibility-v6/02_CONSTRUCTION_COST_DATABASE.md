# Feasibility v6.0 — Construction Cost Database (rev-2)

**Companion to:** `00_OVERVIEW.md` · `01_LAND_USE_ENGINES.md` · `03_UX_FULLSCREEN_AND_DIFF.md` · `04_DISTRIBUTION_LEGAL_MOAT.md` · `06_MASTER_TREE_ALIGNMENT.md` · `07_METHODOLOGY.md`
**As of:** 5 May 2026

This file specifies the **database schema** that backs v6.0's auto-fill behaviour, the **quarterly refresh mechanism**, the **RLS policies** (per CLAUDE.md security mandate — rev-2 fix to audit finding CL-5 / AUD-6), and the **material-level cost taxonomy** aligned with **RICS NRM 1** elemental classification + **ICMS 3** Levels 1–3 mandatory taxonomy.

> **rev-2 changes vs rev-1 (32fa932):**
> - Schema unchanged structurally — all rev-1 models survive.
> - **NEW: explicit RLS policies** for all 6 tables per CLAUDE.md mandate (resolves CL-5).
> - **NEW asset-class entries** in §3 for healthcare per-bed, educational per-student, senior-living per-key, data-center per-MW (aligned with new engines 6, 7, 8, 9).
> - **NEW** ICMS 3 Levels 1–3 alignment in §3.0 (institutional grade).
> - **DEWA capacity charge range** added (resolves audit 02-3).
> - **Cron job sequence tightened** (resolves audit 02-6).
> - **Quarterly snapshot publish atomicity** documented (resolves 02-2).

---

## §1 Database design — three concerns

The construction-cost database serves three distinct concerns that must not be conflated:

1. **Auto-fill defaults** — single value per `(district × landUse × subClass × projectSizeBand × quarter)` tuple, used when the user opens the calculator before they override anything.
2. **Source attribution** — every default value carries (a) the source provider, (b) the sample count, and (c) the quarter the sample was drawn from. This drives the tooltip text.
3. **Tier gating** — the same numeric value exists at two freshness tiers: `currentQuarter` (paid subscribers) and `laggedPublic` (current minus 90 days). Public calculator reads `laggedPublic`; subscribers read `currentQuarter`.

The schema makes all three first-class. RLS enforces the tier-gating + admin-only-mutation rules.

---

## §2 Schema (Prisma-ready, RLS-policied)

> **Read-only constraint.** `prisma/schema.prisma` is canonical and **NOT** modified in Phase A. The blocks below are the **proposed** additions for Phase B; copy / paste verbatim into the schema once founder ratifies.

### §2.1 Cost categories — top-level enum

```prisma
enum CostCategory {
  STRUCTURAL          // concrete, rebar, foundations, columns, slabs
  MEP                 // mechanical, electrical, plumbing, HVAC, BMS, lift
  FINISHING           // floors, walls, ceilings, paint, tiles
  FFE                 // furniture, fittings, equipment (hospitality, office, healthcare, education)
  SOFT_COSTS          // design, supervision, legal, marketing, permits
  CONTINGENCY         // reserve allocation
  REGULATORY_FEES     // DLD, RERA, Trakheesi, NOCs, DHA, KHDA, VARA
  ENVELOPE            // façade, glazing, roofing, waterproofing
  MASONRY             // walls — block, brick, partition
  SPECIALIST          // healthcare medical gas, education STEM lab, data-center power+cooling, senior-living care equipment
  // (rev-2: SPECIALIST category added for engines 6/7/8/9)
}

enum FreshnessTier {
  CURRENT_QUARTER     // paid tier — most recent admin-published values
  LAGGED_PUBLIC       // public tier — current quarter minus 90 days
}
```

### §2.2 Material-level cost line

```prisma
model CostMaterial {
  id              String          @id @default(cuid())
  slug            String          @unique  // e.g. "concrete_m400", "ffe_hotel_5_star_per_key", "datacenter_capex_per_mw"
  category        CostCategory
  displayName     String
  unit            String          // "m³", "ton", "sqm", "sqft", "key", "kVA", "stop", "bed", "student-capacity", "MW"
  description     String?         // long-form for tooltip
  ricsNrmCategory String?         // rev-2: explicit RICS NRM 1 elemental category (e.g. "2.A Substructure")
  icmsLevel1      String?         // rev-2: ICMS 3 Level 1 (Project Category)
  icmsLevel2      String?         // rev-2: ICMS 3 Level 2 (Sub-project category)
  icmsLevel3      String?         // rev-2: ICMS 3 Level 3 (Group)

  // Two-tier value storage
  currentValueAed       Float
  currentValueQuarter   String    // ISO "2026-Q2"
  laggedValueAed        Float
  laggedValueQuarter    String    // ISO "2025-Q4"

  // Source attribution
  sourceProvider        String    // "Faithful + Gould BCIS UAE", "Conmix supplier feed", "Turner & Townsend ICMS"
  sourceUrl             String?
  sampleCount           Int?
  sampleScope           String?

  // Lifecycle
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  publishedAt           DateTime?

  // Audit
  lastEditedBy          String?
  versions              CostMaterialVersion[]

  // District / sub-class scoping (many-to-many)
  scopes                CostMaterialScope[]

  @@index([category])
  @@index([slug])
}

model CostMaterialVersion {
  id              String          @id @default(cuid())
  materialId      String
  material        CostMaterial    @relation(fields: [materialId], references: [id], onDelete: Cascade)

  valueAed        Float
  quarter         String
  tier            FreshnessTier
  source          String
  sampleCount     Int?

  changedAt       DateTime        @default(now())
  changedBy       String          // User.id
  changeReason    String?

  @@index([materialId])
  @@index([quarter])
}

model CostMaterialScope {
  id              String          @id @default(cuid())
  materialId      String
  material        CostMaterial    @relation(fields: [materialId], references: [id], onDelete: Cascade)

  district        String?         // null = all-Dubai average
  landUse         String?         // null = generic
  subClass        String?         // null = all sub-classes
  projectSizeBand String?         // "small" | "medium" | "large" | "tower"
  engineId        Int?            // rev-2: explicit link to engines 1-13

  @@index([materialId, district, landUse, subClass])
}
```

### §2.3 Composite cost lookup (engine pre-fill)

```prisma
model CostPreset {
  id                    String          @id @default(cuid())
  // Scope
  district              String
  landUse               String
  subClass              String
  projectSizeBand       String
  engineId              Int             // rev-2: 1-13 per `01_LAND_USE_ENGINES.md`

  // Two-tier composite values (per psf BUA, blended from underlying CostMaterial rows)
  currentConstructionPsfBuaAed   Float
  currentMepPsfBuaAed            Float
  currentFinishingPsfBuaAed      Float
  currentFfePerKeyAed            Float?   // hospitality, senior living
  currentFfePsfBuaAed            Float?   // commercial / residential fit-out
  currentFfePerBedAed            Float?   // healthcare (rev-2 NEW)
  currentFfePerStudentAed        Float?   // educational (rev-2 NEW)
  currentCapexPerMwAed           Float?   // data center (rev-2 NEW)
  currentSoftCostsPct            Float
  currentContingencyPct          Float

  laggedConstructionPsfBuaAed    Float
  laggedMepPsfBuaAed             Float
  laggedFinishingPsfBuaAed       Float
  laggedFfePerKeyAed             Float?
  laggedFfePsfBuaAed             Float?
  laggedFfePerBedAed             Float?
  laggedFfePerStudentAed         Float?
  laggedCapexPerMwAed            Float?
  laggedSoftCostsPct             Float
  laggedContingencyPct           Float

  currentQuarter                 String
  laggedQuarter                  String
  underlyingMaterialIds          String[]

  publishedAt                    DateTime?
  updatedAt                      DateTime @updatedAt

  @@unique([district, landUse, subClass, projectSizeBand, engineId])
  @@index([district])
  @@index([engineId])
}
```

### §2.4 Quarterly snapshot (rev-2 — atomic publish documented)

```prisma
model QuarterlySnapshot {
  id              String          @id @default(cuid())
  quarter         String          @unique  // "2026-Q2"

  presetSnapshot  Json            // serialised CostPreset[]

  publishedToPublic    Boolean    @default(false)
  publishedToPublicAt  DateTime?

  createdBy       String
  createdAt       DateTime        @default(now())

  notes           String?

  // rev-2: application-level invariant
  // - publishedToPublic and publishedToPublicAt MUST flip atomically
  // - Enforce via transaction in admin "Publish quarterly update" handler
  // - publishedToPublic = (publishedToPublicAt IS NOT NULL)
}
```

### §2.5 Saved & shared feasibility calculations (rev-2 — model name unified)

> **rev-2 fix to audit finding 03-4.** The rev-1 spec referred to this concept as `SavedFeasibility` in `03_UX_FULLSCREEN_AND_DIFF.md` §4.3 and `SharedFeasibilityCalc` in `04_DISTRIBUTION_LEGAL_MOAT.md` §1.4. **rev-2 standardises on `SharedFeasibilityCalc`** — the broader name covers both anonymous-shared and authenticated-saved use cases.

```prisma
model SharedFeasibilityCalc {
  id              String          @id @default(cuid())
  slug            String          @unique // crypto.randomUUID() truncated to 8 chars

  // Snapshot
  engineId        Int             // 1-13
  inputsJson      Json            // all calculator inputs
  resultsJson     Json            // computed outputs at time-of-share
  diffBadgesJson  Json            // diff badges with median values + tones
  quarter         String          // ISO quarter at time-of-share
  tier            FreshnessTier   // public or paid (anonymous always public)

  // Ownership
  userId          String?         // nullable — anonymous shares have no userId
  user            User?           @relation(fields: [userId], references: [id], onDelete: SetNull)
  claimedByUserId String?         // rev-2: when anonymous calc is claimed by user signup
  claimedAt       DateTime?

  // Lifecycle
  createdAt       DateTime        @default(now())
  lastViewedAt    DateTime        @default(now())
  expiresAt       DateTime?       // anonymous: now + 180 days; authenticated: null

  // Telemetry
  viewCount       Int             @default(0)

  @@index([slug])
  @@index([userId])
  @@index([expiresAt])
}
```

### §2.6 Telemetry events

```prisma
model FeasibilityTelemetryEvent {
  id              String          @id @default(cuid())
  eventType       String          // "calc_start", "calc_complete", "field_override", "pdf_export", etc.
  engineId        Int?
  district        String?
  subClass        String?
  projectSizeBand String?
  tier            FreshnessTier
  viewport        String?         // "mobile", "tablet", "desktop"
  lang            String          // "en", "ar"
  payload         Json            // event-specific binned data per `04 §2.2`
  occurredAt      DateTime        @default(now())

  @@index([eventType])
  @@index([occurredAt])
  @@index([engineId])
}
```

---

## §2.7 RLS policies (rev-2 — NEW per CLAUDE.md mandate)

CLAUDE.md `Архитектура` requires "RLS активна для всех таблиц Supabase". Below are the proposed Postgres RLS policies for the 6 new tables. Phase B implementation must apply these via `prisma migrate dev` + `psql` for the RLS-specific statements (Prisma doesn't natively manage RLS):

### §2.7.1 `CostMaterial`, `CostPreset`, `QuarterlySnapshot` — read public, write admin only

```sql
ALTER TABLE "CostMaterial" ENABLE ROW LEVEL SECURITY;

-- Read: public for laggedValueAed (anonymous + all roles); read currentValueAed only if authenticated subscriber
CREATE POLICY "cost_material_read_public_lagged" ON "CostMaterial"
  FOR SELECT USING (true);
  -- Note: tier-gating happens at application layer — query selects laggedValueAed for anonymous,
  -- currentValueAed for authenticated subscribers. RLS allows row-read; column-read enforced
  -- in the API handler that constructs the JSON response per `02_CONSTRUCTION_COST_DATABASE.md` §4.

-- Write: only admin role (Zhan, Dymo per CLAUDE.md SECURITY RULES)
CREATE POLICY "cost_material_write_admin" ON "CostMaterial"
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMIN'
  );
```

(Identical pattern for `CostPreset` and `QuarterlySnapshot`.)

### §2.7.2 `CostMaterialVersion`, `CostMaterialScope` — read admin only, write admin only

```sql
ALTER TABLE "CostMaterialVersion" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cost_material_version_admin_only" ON "CostMaterialVersion"
  FOR ALL USING (
    auth.uid() IS NOT NULL
    AND (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMIN'
  );
```

(Identical for `CostMaterialScope`.)

### §2.7.3 `SharedFeasibilityCalc` — read public if anonymous, write only owner

```sql
ALTER TABLE "SharedFeasibilityCalc" ENABLE ROW LEVEL SECURITY;

-- Read: anyone can read by slug (public sharing); userId lookup by owner only
CREATE POLICY "shared_calc_read_by_slug" ON "SharedFeasibilityCalc"
  FOR SELECT USING (true);

-- Insert: anyone (anonymous or authenticated)
CREATE POLICY "shared_calc_insert_anyone" ON "SharedFeasibilityCalc"
  FOR INSERT WITH CHECK (true);

-- Update / Delete: only owner (or admin for cleanup)
CREATE POLICY "shared_calc_update_owner" ON "SharedFeasibilityCalc"
  FOR UPDATE USING (
    "userId" = auth.uid()
    OR (auth.uid() IS NOT NULL AND (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMIN')
  );

CREATE POLICY "shared_calc_delete_owner" ON "SharedFeasibilityCalc"
  FOR DELETE USING (
    "userId" = auth.uid()
    OR (auth.uid() IS NOT NULL AND (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMIN')
  );
```

### §2.7.4 `FeasibilityTelemetryEvent` — write public, read admin only

```sql
ALTER TABLE "FeasibilityTelemetryEvent" ENABLE ROW LEVEL SECURITY;

-- Insert: anyone (anonymous or authenticated) — telemetry capture
CREATE POLICY "telemetry_insert_anyone" ON "FeasibilityTelemetryEvent"
  FOR INSERT WITH CHECK (true);

-- Read: admin only (founder dashboard)
CREATE POLICY "telemetry_read_admin" ON "FeasibilityTelemetryEvent"
  FOR SELECT USING (
    auth.uid() IS NOT NULL
    AND (SELECT role FROM "User" WHERE id = auth.uid()) = 'ADMIN'
  );
```

---

## §3 Material-level cost categories — full inventory (rev-2 — engines 6/7/8/9 specialised entries added)

For each material below, v6.0 must expose tooltip + source + overridability. Pre-fill defaults are per district / land use / sub-class / size band.

### §3.0 RICS NRM 1 + ICMS 3 alignment (rev-2 NEW)

Each material in §3.1–§3.13 below is mapped to its **RICS NRM 1 elemental category** (UK construction quantity-surveying convention) and **ICMS 3 Level 1–3** (international cost-management standard). Mapping enables institutional reviewers (Big-4 QS, RICS-chartered surveyor) to verify the database against an authoritative taxonomy.

Per ICMS 3 (3rd Edition, 2021):
- **Level 1 — Project Category** (Building / Civil Engineering / Land Reclamation / etc.)
- **Level 2 — Sub-project Category** (e.g. Residential, Commercial, Hospitality within Building)
- **Level 3 — Group** (e.g. Substructure, Superstructure, MEP, External Works)
- **Level 4 — Sub-group** (optional; trade-specific or work-result-specific)

Per RICS NRM 1 §1.5 — UK conventions for elemental cost planning. UAE practice aligns with NRM 1 element headings via Faithful + Gould BCIS UAE adaptation.

### §3.1 Structural — concrete

| Slug | Description | Unit | RICS NRM 1 element | ICMS 3 L3 | Indicative AED Q1 2026 | Source |
|---|---|---|---|---|---|---|
| `concrete_m250` | M250 grade — non-structural fill | m³ | 2.A Substructure | Substructure | 280 – 320 | Conmix supplier list / RATIFY CDB-1 |
| `concrete_m300` | M300 — light-load slabs | m³ | 2.B Superstructure | Superstructure | 320 – 380 | Star Cement / RATIFY CDB-1 |
| `concrete_m400` | M400 — typical structural | m³ | 2.B | Superstructure | 380 – 440 | Conmix / RATIFY CDB-1 |
| `concrete_m500` | M500 — high-strength towers | m³ | 2.B | Superstructure | 440 – 520 | Conmix / RATIFY CDB-1 |
| `concrete_self_compacting` | SCC — congested rebar | m³ | 2.B | Superstructure | 480 – 560 | RATIFY CDB-1 |

**Sqft-conversion factors (m³ per sqft BUA — RATIFY CDB-2):**

| Element | m³ per sqft BUA |
|---|---|
| Slab (200 mm + reinforcement allowance) | 0.018 |
| Column (typical mid-rise) | 0.005 |
| Foundation (raft, mid-rise tower) | 0.022 |
| Walls (RCC retaining) | 0.012 |

### §3.2 Structural — rebar

| Slug | Bar diameter / spec | Unit | RICS NRM 1 | ICMS 3 L3 | Indicative AED Q1 2026 |
|---|---|---|---|---|---|
| `rebar_8mm` | Ø 8 mm — stirrups, ties | ton | 2.B Superstructure | Superstructure | 2,800 – 3,200 |
| `rebar_10mm` | Ø 10 mm — secondary | ton | 2.B | Superstructure | 2,800 – 3,200 |
| `rebar_12mm` | Ø 12 mm — slab top steel | ton | 2.B | Superstructure | 2,800 – 3,200 |
| `rebar_16mm` | Ø 16 mm — column / beam main | ton | 2.B | Superstructure | 2,900 – 3,300 |
| `rebar_20mm` | Ø 20 mm — tower column main | ton | 2.B | Superstructure | 2,900 – 3,300 |
| `rebar_25mm` | Ø 25 mm — transfer beams | ton | 2.B | Superstructure | 3,000 – 3,400 |

**BBS factor per BUA tier (RATIFY CDB-4):**

| Tier | kg / m² BUA | kg / sqft BUA |
|---|---|---|
| Low-rise residential (≤4 floors) | 80 – 110 | 7.4 – 10.2 |
| Mid-rise (5 – 20 floors) | 110 – 150 | 10.2 – 13.9 |
| High-rise / tower (>20 floors) | 150 – 220 | 13.9 – 20.4 |

### §3.3 Structural — aggregates

| Slug | Description | Unit | RICS NRM 1 | Indicative AED |
|---|---|---|---|---|
| `sand_river` | River sand | m³ | 2.A Substructure | 80 – 110 |
| `sand_desert_washed` | Washed desert sand | m³ | 2.A | 60 – 90 |
| `gravel_5_20mm` | 5–20 mm aggregate | m³ | 2.A | 90 – 130 |
| `gravel_20_40mm` | 20–40 mm sub-base | m³ | 2.A | 80 – 110 |

### §3.4 Masonry

| Slug | Description | Unit | RICS NRM 1 | Indicative AED |
|---|---|---|---|---|
| `aac_block_4in` | AAC 4" — internal partition | m² | 2.B.4 Internal Walls | 35 – 50 |
| `aac_block_6in` | AAC 6" — most common internal | m² | 2.B.4 | 45 – 65 |
| `aac_block_8in` | AAC 8" — external skin / shaft | m² | 2.B.3 External Walls | 60 – 85 |
| `red_brick` | Clay brick — heritage / decor | m² | 2.B.3 / 2.B.4 | 70 – 110 |
| `hollow_block_4in` | Concrete hollow 4" | m² | 2.B.4 | 30 – 45 |
| `hollow_block_6in` | Concrete hollow 6" | m² | 2.B.4 | 40 – 60 |
| `hollow_block_8in` | Concrete hollow 8" | m² | 2.B.3 | 55 – 75 |

### §3.5 Roofing & waterproofing

| Slug | Description | Unit | RICS NRM 1 | Indicative AED |
|---|---|---|---|---|
| `roof_bituminous_membrane` | 4 mm SBS bitumen, two-layer | m² | 2.B.5 Roofs | 80 – 110 |
| `roof_concrete_waterproof` | Crystalline + insulation | m² | 2.B.5 | 70 – 100 |
| `roof_ceramic_tile` | Pitched ceramic (villas) | m² | 2.B.5 | 130 – 180 |
| `roof_metal_sheet` | Standing-seam aluminium / Kalzip | m² | 2.B.5 | 220 – 320 |
| `roof_pv_array_capex` | Solar PV roof (10 kWp residential) | per kWp | 2.D Services (rev-2 — moved from roofing per audit 02-5) | 4,000 – 6,000 |

### §3.6 Façade & cladding

| Slug | Description | Unit | RICS NRM 1 | Indicative AED |
|---|---|---|---|---|
| `facade_curtain_wall_low` | Stick-built low-end | m² | 2.B.3 External Walls | 1,400 – 1,800 |
| `facade_curtain_wall_mid` | Mid-spec unitised | m² | 2.B.3 | 1,800 – 2,400 |
| `facade_curtain_wall_premium` | Schüco / Reynaers / SAPA | m² | 2.B.3 | 2,400 – 3,500 |
| `facade_aluminium_cladding` | ACP — aluminium composite | m² | 2.B.3 | 350 – 550 |
| `facade_grc_panel` | Glass-fibre reinforced concrete | m² | 2.B.3 | 500 – 750 |
| `facade_stone_natural` | Granite / travertine | m² | 2.B.3 | 700 – 1,200 |
| `facade_stone_engineered` | Engineered / large-format porcelain | m² | 2.B.3 | 400 – 650 |

### §3.7 Glazing

| Slug | Description | Unit | RICS NRM 1 | Indicative AED |
|---|---|---|---|---|
| `glazing_single` | 6 mm tempered single | m² | 2.B.3 (windows part) | 220 – 320 |
| `glazing_double` | 24 mm low-iron double | m² | 2.B.3 | 450 – 650 |
| `glazing_low_e` | Low-E coated double | m² | 2.B.3 | 600 – 850 |
| `glazing_performance` | Triple silver / spectrally selective | m² | 2.B.3 | 850 – 1,250 |

### §3.8 MEP

| Slug | Description | Unit | RICS NRM 1 | Indicative AED |
|---|---|---|---|---|
| `hvac_split_unit` | Split AC residential | per ton (12,000 BTU) | 2.D Services | 3,500 – 5,500 |
| `hvac_vrv` | VRV system | per ton | 2.D | 5,500 – 8,500 |
| `hvac_chiller` | Central chilled water | per ton | 2.D | 7,500 – 12,000 |
| `plumbing_fixture` | Per fixture | each | 2.D | 1,200 – 2,500 |
| `electrical_per_kva` | Distribution + cabling | per kVA | 2.D | 600 – 1,100 |
| `bms_per_sqft_bua` | BMS | per sqft BUA | 2.D | 25 – 55 |
| `lift_per_stop` | Passenger lift mid-rise | per stop | 2.D | 65,000 – 120,000 |
| `lift_per_stop_high_speed` | High-speed tower lift | per stop | 2.D | 180,000 – 300,000 |

### §3.9 Finishing

| Slug | Description | Unit | RICS NRM 1 | Indicative AED |
|---|---|---|---|---|
| `floor_ceramic` | Ceramic tile mid-grade | m² | 2.C Internal Finishes | 130 – 200 |
| `floor_porcelain_largeformat` | 600 × 1200 mm porcelain | m² | 2.C | 250 – 400 |
| `floor_marble_local` | Local marble | m² | 2.C | 500 – 850 |
| `floor_marble_imported` | Imported (Italian, Spanish) | m² | 2.C | 1,200 – 2,500 |
| `floor_engineered_wood` | Engineered hardwood | m² | 2.C | 350 – 650 |
| `paint_emulsion_premium` | Premium acrylic emulsion | m² | 2.C | 35 – 55 |
| `ceiling_gypsum_basic` | Suspended gypsum basic | m² | 2.C | 110 – 160 |
| `ceiling_gypsum_decorative` | Stretched / decorative | m² | 2.C | 200 – 400 |

### §3.10 FF&E

| Slug | Description | Unit | RICS NRM 1 | Indicative AED |
|---|---|---|---|---|
| `ffe_hotel_3_star_per_key` | 3★ FF&E | per key | 5 FF&E | 35,000 – 55,000 |
| `ffe_hotel_4_star_per_key` | 4★ FF&E | per key | 5 | 60,000 – 90,000 |
| `ffe_hotel_5_star_per_key` | 5★ FF&E | per key | 5 | 100,000 – 180,000 |
| `ffe_hotel_7_star_per_key` | 7★ ultra-luxury | per key | 5 | 250,000 – 500,000+ |
| `ffe_office_basic_psf` | Basic open-plan fit-out | per sqft | 5 | 200 – 320 |
| `ffe_office_mid_psf` | Mid-spec corporate | per sqft | 5 | 400 – 700 |
| `ffe_office_premium_psf` | Boardroom / C-suite | per sqft | 5 | 800 – 1,500 |
| `ffe_hospital_per_bed` | Hospital medical FF&E (rev-2 NEW) | per bed | 5 | 200,000 – 500,000 (RATIFY LU-21) |
| `ffe_clinic_basic_psf` | Clinic medical FF&E (rev-2 NEW) | per sqft | 5 | 300 – 600 |
| `ffe_school_per_student_capacity` | School FF&E (rev-2 NEW) | per student | 5 | 8,000 – 25,000 (RATIFY LU-23) |
| `ffe_senior_living_per_key` | Senior living FF&E (rev-2 NEW) | per key | 5 | 80,000 – 180,000 (RATIFY LU-25) |

### §3.11 Specialist categories (rev-2 NEW per engines 6/7/8/9)

| Slug | Description | Unit | RICS NRM 1 | Indicative AED |
|---|---|---|---|---|
| `specialist_medical_gas_per_bed` | Hospital medical gas distribution | per bed | 2.D + 5 | 50,000 – 120,000 |
| `specialist_isolation_room_per_unit` | Negative-pressure isolation room | per room | 2.D | 200,000 – 400,000 |
| `specialist_stem_lab_per_classroom` | School STEM / science lab fit-out | per classroom | 5 | 250,000 – 600,000 |
| `specialist_dc_power_per_kw` | Data center IT power infrastructure | per kW capacity | 2.D | 2,500 – 4,500 |
| `specialist_dc_cooling_per_kw` | Data center cooling system (CRAC/CRAH) | per kW heat-load | 2.D | 1,800 – 3,500 |
| `specialist_dc_battery_ups_per_kw` | UPS battery + power conditioning | per kW protected | 2.D | 1,200 – 2,200 |
| `specialist_senior_care_per_unit` | Senior-living care equipment | per unit | 5 | 30,000 – 80,000 |

### §3.12 Soft costs (% of construction)

| Slug | Description | Typical % | RICS NRM 1 |
|---|---|---|---|
| `soft_design_architect` | Architect lead | 5 – 7 % | 11 Other Project Costs |
| `soft_design_structural` | Structural | 1 – 2 % | 11 |
| `soft_design_mep` | MEP | 2 – 3 % | 11 |
| `soft_design_landscape` | Landscape | 0.5 – 1 % | 11 |
| `soft_supervision` | Site PM / supervision | 2 – 3 % | 11 |
| `soft_marketing` | Pre-launch marketing | 1.5 – 3 % of revenue | 13 Inflation / Risk |
| `soft_legal_compliance` | UAE legal / NOCs | AED 100k – 500k lump | 11 |

### §3.13 Regulatory fees

| Slug | Description | Typical AED | Source |
|---|---|---|---|
| `reg_dld_4_pct` | DLD 4 % of contract | variable | DLD official |
| `reg_trakheesi_per_listing` | Standard advertising permit | 1,020 | EGS Auditing 2026 [src 8] |
| `reg_trakheesi_launch_event` | Project-launch event permit (rev-2 NEW) | 5,020 | EGS Auditing 2026 [src 8] |
| `reg_trakheesi_project_register` | One-off project registration | 150,020 | EGS Auditing 2026 |
| `reg_oqood_per_unit` | Off-plan registration per unit | per DLD scale | DLD |
| `reg_dewa_capacity_charge` | DEWA distribution / connection (rev-2 — range added per audit 02-3) | **AED 1,500 – 3,500 per kW installed** for residential / commercial; **AED 4,500 – 7,000 per kW for high-density (data center, hospital with critical load)**; RATIFY LU-27 | DEWA tariff schedule |
| `reg_civil_defence_noc_small` | Civil Defence NOC (project ≤ AED 5 M build) | 3,000 – 5,000 | Dubai Civil Defence |
| `reg_civil_defence_noc_medium` | Civil Defence NOC (AED 5–50 M build) | 5,000 – 15,000 | Dubai Civil Defence |
| `reg_civil_defence_noc_large` | Civil Defence NOC (>AED 50 M) | 15,000 – 25,000+ | Dubai Civil Defence |
| `reg_environmental_clearance` | Environmental NOC | 5,000 – 30,000 lump | Dubai Municipality EHSMS |
| `reg_dha_clinic_licence` | DHA clinic licence (rev-2 NEW per Engine 6) | 5,000 – 25,000 / yr | DHA |
| `reg_dha_hospital_licence` | DHA hospital licence (rev-2 NEW) | 25,000 – 100,000+ / yr | DHA |
| `reg_dhcc_facility_licence` | DHCC free-zone facility licence | varies | DHCC |
| `reg_khda_school_licence` | KHDA school licence (rev-2 NEW per Engine 7) | 8,000 – 40,000 / yr | KHDA |
| `reg_khda_school_application` | KHDA new-school application + inspection | 50,000 – 150,000 lump | KHDA |
| `reg_vara_category_1_licence` | VARA Category 1 Virtual Asset issuer licence (rev-2 NEW per Fractional modifier) | RATIFY — substantial 6-figure setup + annual; Crypto Lawyers / VARA published guidance required | VARA Rulebook 2025 |
| `reg_dtcm_hotel_licence` | DTCM hotel classification licence (rev-2 NEW per Engine 4) | 5,000 – 15,000 per star band | DTCM |

### §3.14 Contingency

| Slug | Trigger | % |
|---|---|---|
| `cont_low_risk` | Standard repeatable mid-rise residential | 5 % |
| `cont_medium_risk` | Mixed-use or first-of-type | 7.5 % |
| `cont_high_risk` | High-rise tower, complex MEP, novel site | 10 % |
| `cont_specialist_high_risk` | Hospital / data center / educational with multiple regulatory layers (rev-2 NEW) | 12.5 % |

---

## §4 Auto-fill mechanism — how the engine pre-fills

When the user opens the calculator (or selects engine → district → sub-class → project size band), the front-end fires a single REST call to `/api/feasibility/preset`:

```
GET /api/feasibility/preset?
  engineId=1&
  district=Dubai+Hills&
  landUse=residential&
  subClass=apartment_midrise&
  projectSizeBand=medium

Response (public tier — anonymous user):
{
  "tier": "lagged",
  "asOf": "2025-Q4",
  "lockedQuarter": "2025-Q4",
  "engineId": 1,
  "constructionPsfBua": 480,
  "mepPsfBua": 110,
  "finishingPsfBua": 90,
  "ffePsfBua": 0,
  "softCostsPct": 11.5,
  "contingencyPct": 5,
  "underlying": {
    "concrete_m400":   { value: 410,  unit: "m³",   source: "Conmix Q4 2025",       sampleCount: 12 },
    "rebar_16mm":      { value: 3050, unit: "ton",  source: "Star Cement Q4 2025",  sampleCount: 8 },
    "facade_curtain_wall_mid": { value: 2000, unit: "m²", source: "Faithful+Gould BCIS UAE Q4 2025", sampleCount: 23 }
  },
  "sourceProvider": "Faithful + Gould BCIS UAE",
  "sampleCount": 23,
  "sampleScope": "Dubai Hills mid-rise apartment, Q4 2025",
  "ricsNrmAlignment": "NRM 1 elemental categories 2.A through 5; soft costs 11"
}
```

The front-end injects the response values into the `NumberInput` defaults, populates each tooltip with the source attribution (including RICS NRM category for institutional users), and binds the live diff badge to the auto-fill base. **First user override of any field flips that field to user-supplied state** — diff badge appears, tooltip updates.

Authenticated subscribers (Developer / Broker / Architect tier) get `tier: "current"` with `currentQuarter` values. Same shape, different numbers.

---

## §5 Quarterly update mechanism — admin UI spec

### §5.1 Cron job sequence (rev-2 — tightened atomic ordering per audit 02-6)

A cron job runs at 00:00 UTC on the **first day of each quarter** (1 January, 1 April, 1 July, 1 October).

**Job sequence (atomic — wrapped in single transaction):**

```
BEGIN TRANSACTION;

  -- Step 1: Snapshot prior-quarter currentQuarter → QuarterlySnapshot row (audit lock)
  INSERT INTO QuarterlySnapshot (quarter, presetSnapshot, ...)
  SELECT (currentQuarter), JSON_AGG(*) FROM CostPreset;

  -- Step 2: Promote currentQuarter columns → laggedPublic (atomic flip)
  UPDATE CostPreset
  SET laggedConstructionPsfBuaAed = currentConstructionPsfBuaAed,
      laggedMepPsfBuaAed         = currentMepPsfBuaAed,
      ...
      laggedQuarter              = currentQuarter,
      publishedAt                = NOW();

  -- Step 3: Mark snapshot as published-to-public
  UPDATE QuarterlySnapshot
  SET publishedToPublic = TRUE,
      publishedToPublicAt = NOW()
  WHERE quarter = (priorCurrentQuarter);

  -- Step 4: Stage NEW currentQuarter values — these come from external sources
  --         (DLD transactions API if available, RERA index, supplier feeds, manual upload)
  --         These are loaded SEPARATELY by the cron job's data-pull stage; the values
  --         remain "staged" (publishedAt=NULL on related CostMaterial rows) until admin
  --         clicks "Publish quarterly update" in the admin UI.
  --         Step 4 in this transaction only ensures schema integrity for next quarter.

COMMIT;
```

**External data sources loaded into staged currentQuarter (post-transaction, async):**

1. DLD transactions API for district medians (RATIFY CDB-13 — confirm public API exists or admin scrape).
2. RERA index (RATIFY CDB-14).
3. Conmix / Star Cement / BMG supplier price lists (scrape or admin manual upload).
4. CPI Dubai construction component (UAE FCSC — public).
5. Faithful + Gould BCIS UAE quarterly digest (subscription — RATIFY CDB-15 — confirm ZAAHI subscription).
6. Turner & Townsend GCMI / UAE Market Intelligence quarterly digest (manual upload).

**Compute:** weighted-average updates per material slug (weighted by sample count × scope match); recompute `CostPreset` cache for each (district × landUse × subClass × projectSizeBand × engineId) tuple by blending underlying material values per BBS factor + standard quantities.

**Admin notification:** email Zhan + Dymo with diff summary (e.g., "Q2 2026 update — 14 materials moved >5 %, 3 districts moved >10 %, 1 outlier flagged: rebar_16mm +14.2 % review").

**Cache invalidation:** post-publish, `/feasibility` and `/api/feasibility/preset` Next.js ISR caches invalidate immediately.

### §5.2 Admin UI — `/admin/feasibility-database`

Authenticated, admin-role-gated per CLAUDE.md `SECURITY RULES` and §2.7 RLS policies.

**Layout (rev-2 — engineId column added):**

```
┌─ /admin/feasibility-database ─────────────────────────────────┐
│                                                                │
│  Quarter: [2026-Q2 (staged)]  ▼     Engine filter: [All]  ▼   │
│  Status:  STAGED — review before publish                      │
│                                                                │
│  Auto-update summary (cron, 1 Apr 2026):                      │
│    14 materials moved >5 % since 2026-Q1                      │
│    3 districts moved >10 % (Dubai Hills, Marina, Downtown)    │
│    1 outlier flagged: rebar_16mm, +14.2 % — review            │
│                                                                │
│  ┌─ Categories ──────────────────────────────────────────────┐ │
│  │  ▸ Structural (12 materials)                            │ │
│  │  ▸ MEP (8 materials)                                    │ │
│  │  ▸ Envelope (10 materials)                              │ │
│  │  ▸ Finishing (8 materials)                              │ │
│  │  ▸ FF&E (10 lines — incl. healthcare, education, senior)│ │
│  │  ▸ Specialist (7 — DC power/cool/UPS, hospital med-gas) │ │
│  │  ▸ Soft Costs (7 percentages)                           │ │
│  │  ▸ Regulatory Fees (15 lump sums — incl. DHA / KHDA / VARA / DTCM) │ │
│  │  ▸ Contingency (4 tiers)                                │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                │
│  Override panel (clicked from category):                      │
│    [concrete_m400]   Q1 2026: 405 → Q2 2026: 462 (+14.1%)    │
│       Source: Conmix Q2 2026 supplier list                    │
│       Sample: 12 quotes across 4 ready-mix plants             │
│       RICS NRM 1: 2.B Superstructure  ICMS 3 L3: Superstructure│
│       Manual override: [____ AED]  Reason: [_________]        │
│       Audit trail: 3 versions over 12 months · view diffs     │
│                                                                │
│  ┌─ Action ───────────────────────────────────────────────────┐│
│  │  [ Save staged changes ]  [ Publish quarterly update ]   ││
│  │  Publishing: promotes 2026-Q1 to laggedPublic;           ││
│  │              sets 2026-Q2 as currentQuarter (atomic transaction) ││
│  └────────────────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

### §5.3 Audit trail

Every override creates a `CostMaterialVersion` row (per §2.2). Admin UI shows version history per material as chronological diff with diff arrow + change reason.

### §5.4 Publish workflow (rev-2 — atomic publish documented per audit 02-2)

The "Publish quarterly update" button is a two-step:

1. **Confirm modal:** "Promoting 2026-Q1 to laggedPublic exposes Q1 numbers to public calculator users. Q2 numbers remain in currentQuarter (paid tier only). Continue?"

2. **On confirm — single transaction (atomic):**
   - `QuarterlySnapshot` row created with the prior quarter's full preset table
   - `publishedToPublicAt` and `publishedToPublic` flip together (atomic)
   - Cache invalidation triggered for ISR
   - Diff email sent to Zhan + Dymo

**Application-layer invariant (rev-2):** `publishedToPublic === (publishedToPublicAt IS NOT NULL)`. Phase B handler enforces in the same transaction.

---

## §6 90-day lag — moat layer 2 mechanic

Implementation detail (per `04_DISTRIBUTION_LEGAL_MOAT.md` §3.2):

```
Time T          : Q2 2026 begins (1 April 2026)
                  Cron job runs.
                  CostPreset.currentQuarter ← Q2 2026 values
                  CostPreset.laggedPublic   ← Q1 2026 values (was current)

                  PAID subscribers query: receives Q2 2026 values
                  PUBLIC users query:     receives Q1 2026 values

                  Lag = 90 days (full quarter behind)

Time T + 90d    : Q3 2026 begins (1 July 2026)
                  Cron job runs.
                  CostPreset.currentQuarter ← Q3 2026 values
                  CostPreset.laggedPublic   ← Q2 2026 values

                  Q1 2026 quarterly snapshot is preserved (audit) but no longer surfaced
                  in public tier.
```

**Why 90 days specifically (rev-2 — clearer rationale per audit 02-4):** Q1 prices revealed in early April serve as broker advice for the Q2 deal pipeline. By July (Q3 begins), those Q1 numbers are 90 days old — a scraper polling the public tier in April cached Q1 data; by July they still have Q1, which is now two quarters behind the live market. Each subsequent quarter the scraper must re-poll to refresh, but it never escapes the 90-day lag.

**Edge case** — a scraper who polls every quarter sees a 90-day-lagging series. They can publish that as their own "free Dubai cost index" — but it's always 90 days behind reality, which is materially expensive for any commercial decision-maker. Combined with Tier 3 (Archibald AI commentary), the moat is deep enough that scraping ZAAHI's public tier is materially less valuable than subscribing.

---

## §7 Data-source providers (rev-2 — institutional sources promoted)

For tooltip source attribution, the database provider strings should match these canonical references:

| Category | Source attribution string | Underlying source |
|---|---|---|
| Concrete, rebar, aggregates | `"Conmix Q[N] [YYYY]"`, `"Star Cement Q[N] [YYYY]"`, `"BMG supplier feed Q[N]"` | Direct supplier price lists (verified via site visit / phone quote) |
| Construction PSF aggregate | `"Faithful + Gould BCIS UAE Q[N] [YYYY] · RICS NRM 1 [element]"` | Faithful + Gould BCIS UAE quarterly index (subscription, manual upload). Aligned with **RICS NRM 1** elemental classification per `07_METHODOLOGY.md` §2 |
| International benchmarks | `"Turner & Townsend GCMI [YYYY] / ICMS 3 L[N]"` | Turner & Townsend Global Construction Market Intelligence; cost taxonomy mapped to **ICMS 3** Levels 1–3 |
| Cap Rates / yields | `"JLL UAE Q[N] [YYYY] / IVS 105"`, `"Knight Frank UAE Q[N] / IVS 105"`, `"CBRE UAE Q[N] / IVS 105"` | JLL Market Dynamics, Knight Frank Investment Yield Guide, CBRE UAE Real Estate Market Review. **IVS 105 §50** Income Approach methodology |
| Hotel ADR / RevPAR / EBITDAR | `"Knight Frank UAE Hospitality Market Review [YYYY] / USALI 12th Ed."` | Knight Frank UAE Hospitality Market Review — applied via **USALI 12th Edition (July 2024)** P&L hierarchy per `01 §4.2` |
| Service charges | `"Driven Properties Service Charge Index [YYYY]"`, `"FAM Properties [YYYY]"`, `"LuxHabitat [YYYY]"` | Multiple Dubai service-charge aggregators |
| Mortgage rates | `"CBUAE EIBOR + bank margin"`, `"LeoCompare UAE Mortgage Rates [YYYY]"` | CBUAE EIBOR feed; LeoCompare aggregator |
| Regulatory fees | `"DLD official scale"`, `"Trakheesi regulation"`, `"DHA / DHCC"`, `"KHDA"`, `"VARA Rulebook 2025"`, `"DTCM"` | Each regulator's published fee schedule |
| District transactions | `"DLD transactions Q[N] [YYYY] · n=[N]"` | DLD transactions API (when available — RATIFY CDB-13) |
| Construction CPI | `"UAE FCSC Construction CPI Q[N]"` | UAE Federal Competitiveness and Statistics Centre |
| Hospital cost / bed | `"Saudi benchmark Argaam Sept 2024 (Middle East proxy)"`, `"DHCC AED 1.3 B Phase 1 announcement 2026"` | RATIFY LU-21 — UAE-specific pending |
| Educational cost / student | `"International benchmark + KHDA Education Cost Index [YYYY]"` | RATIFY LU-23 — UAE-specific pending |
| Senior Living cost / key | `"Knight Frank UK Seniors Housing Trading Performance Review 2025/26"` | RATIFY LU-25 — UAE-specific pending |
| Data Center capex / MW | `"JLL Global Data Center Outlook 2025 (USD 10.7M / MW)"` + UAE premium 10–15 % | RATIFY LU-26 — UAE-specific pending |

All citations from the consolidated source table are in `07_METHODOLOGY.md` §99.

---

## §99 FOUNDER RATIFY items — rev-2

Original items CDB-1 through CDB-18 from rev-1 are RETAINED. rev-2 adds:

| # | Section | Item | Status |
|---|---|---|---|
| CDB-19 | §3.10 | Hospital FF&E AED / bed | RATIFY LU-21 cross-ref |
| CDB-20 | §3.10 | School FF&E AED / student-capacity | RATIFY LU-23 cross-ref |
| CDB-21 | §3.10 | Senior Living FF&E AED / key | RATIFY LU-25 cross-ref |
| CDB-22 | §3.11 | Specialist categories — medical gas, isolation, STEM lab, DC power/cool/UPS | RATIFY — UAE-specific per-unit pricing |
| CDB-23 | §3.13 | DEWA capacity charge precise schedule | RATIFY LU-27 — initial range AED 1.5 – 7 k / kW added |
| CDB-24 | §3.13 | DHA / DHCC / KHDA / VARA Category 1 / DTCM regulatory fees | RATIFY — Phase B legal-budget allocation includes these confirmations |
| CDB-25 | §3.14 | New `cont_specialist_high_risk` 12.5 % contingency tier | RATIFY — confirm 12.5 % vs alternative |

---

*End of construction cost database spec rev-2. Next: `03_UX_FULLSCREEN_AND_DIFF.md`.*
