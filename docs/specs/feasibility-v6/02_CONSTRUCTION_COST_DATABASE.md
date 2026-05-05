# Feasibility v6.0 — Construction Cost Database

**Companion to:** `00_OVERVIEW.md` · `01_LAND_USE_ENGINES.md` · `03_UX_FULLSCREEN_AND_DIFF.md` · `04_DISTRIBUTION_LEGAL_MOAT.md`
**As of:** 5 May 2026

This file specifies the **database schema** that backs v6.0's
auto-fill behaviour and the **quarterly refresh mechanism** that
keeps default values current. Schema is Prisma-ready (the agent has
NOT modified `prisma/schema.prisma`; this is the spec only —
implementation is Phase B).

---

## §1 Database design — three concerns

The construction-cost database serves three distinct concerns that
must not be conflated:

1. **Auto-fill defaults** — single value per `(district × landUse × subClass × projectSizeBand × quarter)` tuple, used when the user opens the calculator before they override anything.
2. **Source attribution** — every default value carries (a) the source provider, (b) the sample count, and (c) the quarter the sample was drawn from. This drives the tooltip text.
3. **Tier gating** — the same numeric value exists at two freshness tiers: `currentQuarter` (paid subscribers) and `laggedPublic` (current minus 90 days). Public calculator reads `laggedPublic`; subscribers read `currentQuarter`.

The schema below makes all three first-class. Detail in §2.

---

## §2 Schema (Prisma-ready model)

> **Read-only constraint.** `prisma/schema.prisma` is canonical and
> NOT modified in Phase A. The blocks below are the **proposed**
> additions for Phase B; copy / paste verbatim into the schema once
> founder ratifies.

### §2.1 Cost categories — top-level enum

```prisma
enum CostCategory {
  STRUCTURAL          // concrete, rebar, foundations, columns, slabs
  MEP                 // mechanical, electrical, plumbing, HVAC, BMS, lift
  FINISHING           // floors, walls, ceilings, paint, tiles
  FFE                 // furniture, fittings, equipment (hospitality, office)
  SOFT_COSTS          // design, supervision, legal, marketing, permits
  CONTINGENCY         // reserve allocation
  REGULATORY_FEES     // DLD, RERA, Trakheesi, NOCs
  ENVELOPE            // façade, glazing, roofing, waterproofing
  MASONRY             // walls — block, brick, partition
}

enum FreshnessTier {
  CURRENT_QUARTER     // paid tier — most recent admin-published values
  LAGGED_PUBLIC       // public tier — current quarter minus 90 days
}
```

### §2.2 Material-level cost line

The unit of storage is one **material line** identified by a stable
slug. Each line has a current value, a lagged value, source
attribution, sample size, last-updated timestamp.

```prisma
model CostMaterial {
  id              String          @id @default(cuid())
  slug            String          @unique  // e.g. "concrete_m400"
  category        CostCategory
  displayName     String
  unit            String          // "m³", "ton", "sqm", "sqft", "key", "kVA", "stop"
  description     String?         // long-form for tooltip
  
  // Two-tier value storage
  currentValueAed       Float
  currentValueQuarter   String    // ISO "2026-Q2"
  laggedValueAed        Float
  laggedValueQuarter    String    // ISO "2025-Q4" (when current = 2026-Q2)
  
  // Source attribution
  sourceProvider        String    // "Faithful + Gould BCIS UAE", "Conmix supplier feed", "Turner & Townsend ICMS"
  sourceUrl             String?
  sampleCount           Int?      // e.g. 23 (projects), 156 (transactions)
  sampleScope           String?   // free-text: "Dubai Hills mid-rise apartments, Q1 2026"
  
  // Lifecycle
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  publishedAt           DateTime? // null = staged but not pushed; non-null = live in laggedPublic after 90 days
  
  // Audit
  lastEditedBy          String?   // User.id
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
  
  // Snapshot
  valueAed        Float
  quarter         String          // "2026-Q2"
  tier            FreshnessTier
  source          String
  sampleCount     Int?
  
  changedAt       DateTime        @default(now())
  changedBy       String          // User.id
  changeReason    String?         // free-text
  
  @@index([materialId])
  @@index([quarter])
}

model CostMaterialScope {
  id              String          @id @default(cuid())
  materialId      String
  material        CostMaterial    @relation(fields: [materialId], references: [id], onDelete: Cascade)
  
  district        String?         // null = all-Dubai average
  landUse         String?         // null = generic (e.g. concrete is land-use-agnostic)
  subClass        String?         // null = all sub-classes (e.g. "office_a", "warehouse_grade_a", "apartment_midrise")
  projectSizeBand String?         // "small" (<10k sqft), "medium" (10–50k), "large" (50–200k), "tower" (>200k)
  
  // If multiple scopes apply, the most-specific scope wins (district + landUse + subClass + size)
  // followed by district + landUse + subClass, etc.
  
  @@index([materialId, district, landUse, subClass])
}
```

### §2.3 Composite cost lookup (for engine pre-fill)

The engine layer in `01_LAND_USE_ENGINES.md` calls this lookup, not the
per-material rows directly:

```prisma
model CostPreset {
  id                    String          @id @default(cuid())
  // Scope
  district              String          // "Dubai Hills", "Dubai Marina", "Business Bay", ...
  landUse               String          // "residential", "commercial", "hospitality", ...
  subClass              String          // "apartment_midrise", "office_a", "5_star_hotel", ...
  projectSizeBand       String          // "small" | "medium" | "large" | "tower"
  
  // Two-tier composite values (per psf BUA, blended from underlying CostMaterial rows)
  // Engineering note: these are caches; recomputed when underlying CostMaterial changes.
  currentConstructionPsfBuaAed   Float    // construction core (concrete + rebar + envelope + masonry + roofing)
  currentMepPsfBuaAed            Float
  currentFinishingPsfBuaAed      Float
  currentFfePerKeyAed            Float?   // hospitality only
  currentFfePsfBuaAed            Float?   // commercial / residential fit-out
  currentSoftCostsPct            Float    // % of construction
  currentContingencyPct          Float    // 5 / 7.5 / 10
  
  // Lagged versions
  laggedConstructionPsfBuaAed    Float
  laggedMepPsfBuaAed             Float
  laggedFinishingPsfBuaAed       Float
  laggedFfePerKeyAed             Float?
  laggedFfePsfBuaAed             Float?
  laggedSoftCostsPct             Float
  laggedContingencyPct           Float
  
  // Provenance
  currentQuarter                 String   // "2026-Q2"
  laggedQuarter                  String   // "2025-Q4"
  underlyingMaterialIds          String[] // foreign-key array — materials that contributed
  
  publishedAt                    DateTime?
  updatedAt                      DateTime @updatedAt
  
  @@unique([district, landUse, subClass, projectSizeBand])
  @@index([district])
}
```

### §2.4 Quarterly snapshot (for tier promotion)

```prisma
model QuarterlySnapshot {
  id              String          @id @default(cuid())
  quarter         String          @unique  // "2026-Q2"
  
  // Snapshot of the entire CostPreset table at the moment of snapshot
  presetSnapshot  Json            // serialised CostPreset[] (Prisma Json column)
  
  publishedToPublic    Boolean    @default(false)
  publishedToPublicAt  DateTime?  // becomes non-null when this quarter promotes from CURRENT to LAGGED
  
  createdBy       String
  createdAt       DateTime        @default(now())
  
  notes           String?
}
```

The quarterly snapshot exists so that the lagged tier is auditable —
when public users dispute a default value, the snapshot is the
authoritative record of what was published 90 days prior.

---

## §3 Material-level cost categories — full inventory

For each material below, v6.0 must expose tooltip + source +
overridability. Pre-fill defaults are per district / land use /
sub-class / size band (see §2.3).

### §3.1 Structural — concrete

| Slug | Description | Unit | Indicative AED Q1 2026 | Source |
|---|---|---|---|---|
| `concrete_m250` | M250 grade — non-structural fill, low-rise foundations | m³ | 280 – 320 | Conmix supplier list / FOUNDER RATIFY |
| `concrete_m300` | M300 — light-load slabs, residential | m³ | 320 – 380 | Star Cement / FOUNDER RATIFY |
| `concrete_m400` | M400 — typical structural concrete (residential mid-rise to high-rise) | m³ | 380 – 440 | Conmix / FOUNDER RATIFY |
| `concrete_m500` | M500 — high-strength, towers, transfer slabs | m³ | 440 – 520 | Conmix / FOUNDER RATIFY |
| `concrete_self_compacting` | SCC — congested rebar, formwork-constrained zones | m³ | 480 – 560 | FOUNDER RATIFY |

**Sqft-conversion factors** (for tooltip "show your work"):

| Element | m³ per sqft BUA |
|---|---|
| Slab (200 mm thick + reinforcement allowance) | 0.018 |
| Column (typical mid-rise) | 0.005 |
| Foundation (raft, mid-rise tower) | 0.022 |
| Walls (RCC retaining) | 0.012 |

**FOUNDER RATIFY** — exact m³/sqft factors per element class.

### §3.2 Structural — rebar (reinforcement steel)

| Slug | Bar diameter / spec | Unit | Indicative AED Q1 2026 | Source |
|---|---|---|---|---|
| `rebar_8mm` | Ø 8 mm — stirrups, ties | ton | 2,800 – 3,200 | Star Cement market list / FOUNDER RATIFY |
| `rebar_10mm` | Ø 10 mm — secondary reinforcement | ton | 2,800 – 3,200 | FOUNDER RATIFY |
| `rebar_12mm` | Ø 12 mm — slab top steel | ton | 2,800 – 3,200 | FOUNDER RATIFY |
| `rebar_16mm` | Ø 16 mm — typical column / beam main steel | ton | 2,900 – 3,300 | FOUNDER RATIFY |
| `rebar_20mm` | Ø 20 mm — tower column main steel | ton | 2,900 – 3,300 | FOUNDER RATIFY |
| `rebar_25mm` | Ø 25 mm — transfer beams, mat foundation | ton | 3,000 – 3,400 | FOUNDER RATIFY |

**BBS factor** (Bar Bending Schedule rebar consumption per BUA tier):

| Tier | kg rebar / m² BUA | kg rebar / sqft BUA |
|---|---|---|
| Low-rise residential (≤4 floors) | 80 – 110 | 7.4 – 10.2 |
| Mid-rise (5 – 20 floors) | 110 – 150 | 10.2 – 13.9 |
| High-rise / tower (>20 floors) | 150 – 220 | 13.9 – 20.4 |

**FOUNDER RATIFY** — refine these BBS factors against recent ZAAHI
projects or external Q1 2026 contractor quotes.

### §3.3 Structural — aggregates

| Slug | Description | Unit | Indicative AED Q1 2026 |
|---|---|---|---|
| `sand_river` | River sand (sweet, masonry-grade) | m³ | 80 – 110 |
| `sand_desert_washed` | Washed desert sand (concrete-grade after washing) | m³ | 60 – 90 |
| `gravel_5_20mm` | Aggregate 5–20 mm | m³ | 90 – 130 |
| `gravel_20_40mm` | Aggregate 20–40 mm — sub-base | m³ | 80 – 110 |

FOUNDER RATIFY exact bands; supplier price lists shift weekly.

### §3.4 Masonry — wall block

| Slug | Description | Unit | Indicative AED Q1 2026 |
|---|---|---|---|
| `aac_block_4in` | AAC autoclaved aerated 4" — internal partition | m² wall area | 35 – 50 |
| `aac_block_6in` | AAC 6" — most common internal | m² | 45 – 65 |
| `aac_block_8in` | AAC 8" — external skin / shaft walls | m² | 60 – 85 |
| `red_brick` | Clay brick — heritage / decorative | m² | 70 – 110 |
| `hollow_block_4in` | Concrete hollow 4" | m² | 30 – 45 |
| `hollow_block_6in` | Concrete hollow 6" | m² | 40 – 60 |
| `hollow_block_8in` | Concrete hollow 8" | m² | 55 – 75 |

### §3.5 Roofing & waterproofing

| Slug | Description | Unit | Indicative AED Q1 2026 |
|---|---|---|---|
| `roof_bituminous_membrane` | 4 mm SBS modified bitumen, two-layer | m² | 80 – 110 |
| `roof_concrete_waterproof` | Crystalline / cement-based waterproof coating + insulation | m² | 70 – 100 |
| `roof_ceramic_tile` | Pitched-roof ceramic tile (villas) | m² | 130 – 180 |
| `roof_metal_sheet` | Standing-seam aluminium / Kalzip | m² | 220 – 320 |
| `roof_pv_array_capex` | Solar PV roof installation (10 kWp residential) | per kWp | 4,000 – 6,000 |

### §3.6 Façade & cladding

| Slug | Description | Unit | Indicative AED Q1 2026 |
|---|---|---|---|
| `facade_curtain_wall_low` | Stick-built curtain wall, low-end | m² | 1,400 – 1,800 |
| `facade_curtain_wall_mid` | Mid-spec unitised | m² | 1,800 – 2,400 |
| `facade_curtain_wall_premium` | Schüco / Reynaers / SAPA premium | m² | 2,400 – 3,500 |
| `facade_aluminium_cladding` | ACP — aluminium composite panel | m² | 350 – 550 |
| `facade_grc_panel` | Glass-fibre reinforced concrete | m² | 500 – 750 |
| `facade_stone_natural` | Granite / travertine cladding | m² | 700 – 1,200 |
| `facade_stone_engineered` | Engineered stone / porcelain large-format | m² | 400 – 650 |

### §3.7 Glazing

| Slug | Description | Unit | Indicative AED Q1 2026 |
|---|---|---|---|
| `glazing_single` | 6 mm tempered single-glaze | m² | 220 – 320 |
| `glazing_double` | 24 mm double-glaze, low-iron | m² | 450 – 650 |
| `glazing_low_e` | Low-E coated double-glaze | m² | 600 – 850 |
| `glazing_performance` | Triple silver / spectrally selective high-perf | m² | 850 – 1,250 |

### §3.8 MEP — mechanical, electrical, plumbing

| Slug | Description | Unit | Indicative AED Q1 2026 |
|---|---|---|---|
| `hvac_split_unit` | Split AC, residential apartment | per ton (12,000 BTU) | 3,500 – 5,500 |
| `hvac_vrv` | VRV (Variable Refrigerant Volume) system | per ton | 5,500 – 8,500 |
| `hvac_chiller` | Central chilled water, large project | per ton | 7,500 – 12,000 |
| `plumbing_fixture` | Per fixture (toilet, basin, shower) | each | 1,200 – 2,500 |
| `electrical_per_kva` | Distribution board + cabling allowance | per kVA installed | 600 – 1,100 |
| `bms_per_sqft_bua` | Building Management System | per sqft BUA | 25 – 55 |
| `lift_per_stop` | Passenger lift, mid-rise | per stop | 65,000 – 120,000 |
| `lift_per_stop_high_speed` | High-speed tower lift | per stop | 180,000 – 300,000 |

### §3.9 Finishing

| Slug | Description | Unit | Indicative AED Q1 2026 |
|---|---|---|---|
| `floor_ceramic` | Ceramic tile, mid-grade | m² | 130 – 200 |
| `floor_porcelain_largeformat` | 600 × 1200 mm porcelain | m² | 250 – 400 |
| `floor_marble_local` | Local marble (Oman, Egypt) | m² | 500 – 850 |
| `floor_marble_imported` | Imported (Italian, Spanish) | m² | 1,200 – 2,500 |
| `floor_engineered_wood` | Engineered hardwood | m² | 350 – 650 |
| `paint_emulsion_premium` | Premium acrylic emulsion | m² | 35 – 55 |
| `ceiling_gypsum_basic` | Suspended gypsum ceiling, basic | m² | 110 – 160 |
| `ceiling_gypsum_decorative` | Stretched / curved / decorative | m² | 200 – 400 |

### §3.10 FF&E

| Slug | Description | Unit | Indicative AED Q1 2026 |
|---|---|---|---|
| `ffe_hotel_3_star_per_key` | 3★ hotel furniture, fixtures, equipment | per key | 35,000 – 55,000 |
| `ffe_hotel_4_star_per_key` | 4★ FF&E | per key | 60,000 – 90,000 |
| `ffe_hotel_5_star_per_key` | 5★ FF&E | per key | 100,000 – 180,000 |
| `ffe_hotel_7_star_per_key` | 7★ ultra-luxury (Burj Al Arab tier) | per key | 250,000 – 500,000+ |
| `ffe_office_basic_psf` | Basic open-plan tenant fit-out | per sqft | 200 – 320 |
| `ffe_office_mid_psf` | Mid-spec corporate fit-out | per sqft | 400 – 700 |
| `ffe_office_premium_psf` | Boardroom / C-suite / hospitality fit-out | per sqft | 800 – 1,500 |

### §3.11 Soft costs (% of construction)

| Slug | Description | Typical % |
|---|---|---|
| `soft_design_architect` | Architect fee (lead consultant) | 5 – 7 % of construction |
| `soft_design_structural` | Structural engineering | 1 – 2 % |
| `soft_design_mep` | MEP engineering | 2 – 3 % |
| `soft_design_landscape` | Landscape & external works | 0.5 – 1 % |
| `soft_supervision` | Site supervision / project management | 2 – 3 % |
| `soft_marketing` | Pre-launch marketing budget | 1.5 – 3 % of projected revenue |
| `soft_legal_compliance` | UAE legal, structuring, NOCs | AED 100,000 – 500,000 lump |

### §3.12 Regulatory fees

| Slug | Description | Typical AED |
|---|---|---|
| `reg_dld_4_pct` | DLD 4 % of contract price | variable |
| `reg_trakheesi_per_listing` | Per advertising permit | 1,020 |
| `reg_trakheesi_project_register` | One-off project registration | 150,020 |
| `reg_oqood_per_unit` | Off-plan registration per unit | per DLD scale |
| `reg_dewa_capacity_charge` | DEWA distribution / connection | per kW installed |
| `reg_civil_defence_noc` | Fire / safety NOC | 3,000 – 25,000 lump |
| `reg_environmental_clearance` | Environmental NOC if applicable | 5,000 – 30,000 lump |

### §3.13 Contingency

| Slug | Trigger | % |
|---|---|---|
| `cont_low_risk` | Standard repeatable mid-rise residential | 5 % |
| `cont_medium_risk` | Mixed-use or first-of-type | 7.5 % |
| `cont_high_risk` | High-rise tower, complex MEP, novel site | 10 % |

These match the v5 contingency tiers — retained.

---

## §4 Auto-fill mechanism — how the engine pre-fills

When the user opens the calculator (or selects engine → district →
sub-class → project size band), the front-end fires a single GraphQL
query (or REST `/api/feasibility/preset`) to the database:

```
GET /api/feasibility/preset?
  district=Dubai+Hills&
  landUse=residential&
  subClass=apartment_midrise&
  projectSizeBand=medium

Response (public tier):
{
  "tier": "lagged",
  "asOf": "2025-Q4",
  "lockedQuarter": "2025-Q4",
  "constructionPsfBua": 480,
  "mepPsfBua": 110,
  "finishingPsfBua": 90,
  "ffePsfBua": 0,
  "softCostsPct": 11.5,
  "contingencyPct": 5,
  "underlying": {
    "concrete_m400": { value: 410, unit: "m³", source: "Conmix Q4 2025" },
    "rebar_16mm":    { value: 3050, unit: "ton", source: "Star Cement Q4 2025" },
    ...
  },
  "sourceProvider": "Faithful + Gould BCIS UAE",
  "sampleCount": 23,
  "sampleScope": "Dubai Hills mid-rise apartment, Q4 2025"
}
```

The front-end injects the response values into the `NumberInput`
defaults, populates each tooltip with the source attribution, and
binds the live diff badge to the auto-fill base. **First user
override of any field flips that field to user-supplied state** —
diff badge appears, tooltip disclaims source vs current value.

Authenticated subscribers (Developer / Broker / Architect tier per
existing pricing) get `tier: "current"` with `currentQuarter`
values. Same shape, different numbers.

---

## §5 Quarterly update mechanism — admin UI spec

### §5.1 Cron job

A cron job runs at 00:00 UTC on the **first day of each quarter**
(1 January, 1 April, 1 July, 1 October).

**Job sequence:**

1. **Pull from external sources**:
   - DLD transactions API for district medians
   - RERA index (where exposed)
   - Conmix / Star Cement / BMG supplier price lists (scrape or API)
   - CPI Dubai construction component (UAE FCSC)
   - Faithful + Gould BCIS UAE quarterly digest (manual upload by admin if not API-able)
   - Turner & Townsend market intelligence digest (manual upload)
2. **Compute weighted-average updates**:
   - Per material slug: weighted by sample count × scope match
   - Update `currentValueAed` and `currentValueQuarter` on `CostMaterial`
3. **Recompute `CostPreset` cache**:
   - For each (district × landUse × subClass × projectSizeBand) tuple, blend underlying material values per BBS factor + standard quantities
4. **Promote prior-quarter `currentQuarter` → `laggedPublic`**:
   - The quarter that was `currentQuarter` 90 days ago becomes `laggedPublic`
   - This is when public-tier users see the new data
5. **Email Zhan + Dymo** with summary diff: "Q2 2026 update — 14 materials moved >5 %, 3 districts moved >10 %, 1 outlier flagged for manual review"
6. **Stage `currentQuarter` for admin review** (does not publish until admin clicks "publish")

### §5.2 Admin UI — `/admin/feasibility-database`

Authenticated route, admin-role-gated (per existing CLAUDE.md security
rules — Zhan + Dymo via `getApprovedUserId` + role check).

**Layout:**

```
┌─ /admin/feasibility-database ──────────────────────────────────┐
│                                                                │
│  Quarter: [2026-Q2 (staged)]  ▼                               │
│  Status:  STAGED — review before publish                      │
│                                                                │
│  Auto-update summary (cron, 1 Apr 2026):                      │
│    14 materials moved >5 % since 2026-Q1                      │
│    3 districts moved >10 % (Dubai Hills, Marina, Downtown)    │
│    1 outlier flagged: rebar_16mm, +14.2 % — review            │
│                                                                │
│  ┌─ Categories ─────────────────────────────────────────────┐  │
│  │  ▸ Structural (12 materials)                            │  │
│  │  ▸ MEP (8 materials)                                    │  │
│  │  ▸ Finishing (8 materials)                              │  │
│  │  ▸ FF&E (7 lines)                                       │  │
│  │  ▸ Soft Costs (6 percentages)                           │  │
│  │  ▸ Regulatory Fees (6 lump sums)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Override panel (clicked from category):                      │
│    [concrete_m400]   Q1 2026: 405 → Q2 2026: 462 (+14.1%)    │
│       Source: Conmix Q2 2026 supplier list                    │
│       Sample: 12 quotes across 4 ready-mix plants             │
│       Manual override: [____ AED]  Reason: [_________]        │
│       Audit trail: 3 versions over 12 months · view diffs     │
│                                                                │
│  ┌─ Action ──────────────────────────────────────────────────┐ │
│  │  [ Save staged changes ]  [ Publish quarterly update ]   │ │
│  │  Publishing: promotes 2026-Q1 to laggedPublic;           │ │
│  │              sets 2026-Q2 as currentQuarter              │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
```

### §5.3 Audit trail

Every override creates a `CostMaterialVersion` row. The admin UI
shows version history per material as a chronological diff.

### §5.4 Publish workflow

The "Publish quarterly update" button is a two-step:

1. Confirm modal: "Promoting 2026-Q1 to laggedPublic exposes Q1 numbers to public calculator users. Q2 numbers remain in currentQuarter (paid tier only). Continue?"
2. On confirm:
   - `QuarterlySnapshot` row created with the prior quarter's full preset table
   - `publishedToPublicAt` set on the prior-quarter snapshot
   - Diff email to Zhan + Dymo

### §5.5 Public-side cache invalidation

After publish, the front-end Next.js ISR (Incremental Static
Regeneration) cache for `/feasibility` and the API
`/api/feasibility/preset` invalidates immediately so that the next
public visitor sees the new lagged values.

---

## §6 90-day lag — the moat layer 2 mechanic

This is the single most important commercial property of the
database. Repeating from `00_OVERVIEW.md` §7 with implementation
detail:

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
                  
                  Q1 2026 quarterly snapshot is preserved (audit) but
                  no longer surfaced in public tier.
```

**Why 90 days specifically:** Q1 prices revealed in April / May serve
as Q2 broker advice; by July they're stale. A scraper who copies the
public tier in April gets Q1 data; by July their cache is two
quarters behind. The subscription unlock = current-quarter access =
genuinely material differential.

**Edge case** — a scraper who polls every quarter sees a 90-day
lagging series. They can publish that as their own "free Dubai cost
index". The moat is layer 2 — they will always trail real-quarter
data by 90 days, which is a real cost for any commercial decision
maker. Plus the layer 3 AI advice is the actual differentiator.

---

## §7 Data sources to cite (per material category)

For tooltip source attribution, the database provider strings
should match these canonical references:

| Category | Source attribution string | Underlying source |
|---|---|---|
| Concrete, rebar, aggregates | `"Conmix Q[N] [YYYY]"`, `"Star Cement Q[N] [YYYY]"`, `"BMG supplier feed Q[N]"` | Direct supplier price lists (verified by site visit / phone quote) |
| Construction PSF aggregate | `"Faithful + Gould BCIS UAE Q[N] [YYYY]"` | Faithful + Gould BCIS UAE quarterly index (subscription, manual upload by admin if no API) [src 1, 2] |
| International benchmarks | `"Turner & Townsend ICMS / GCMI [YYYY]"` | Turner & Townsend International / Global Construction Market Survey [src 1, 2 in `01_LAND_USE_ENGINES.md`] |
| Cap Rates / yields | `"JLL UAE Q[N] [YYYY]"`, `"Knight Frank UAE Q[N]"`, `"CBRE UAE Q[N]"` | JLL Market Dynamics, Knight Frank Investment Yield Guide, CBRE UAE Real Estate Market Review [src 6, 17, and CBRE links via `01_LAND_USE_ENGINES.md`] |
| Hotel ADR / RevPAR | `"Knight Frank UAE Hospitality Market Review [YYYY]"` | Knight Frank UAE Hospitality Market Review [src 3] |
| Service charges | `"Driven Properties Service Charge Index [YYYY]"`, `"FAM Properties [YYYY]"`, `"LuxHabitat [YYYY]"` | Multiple Dubai service-charge aggregators [src 13–16] |
| Mortgage rates | `"CBUAE EIBOR + bank margin"`, `"LeoCompare UAE Mortgage Rates [YYYY]"` | CBUAE EIBOR feed [src 11], LeoCompare aggregator [src 12] |
| Regulatory fees | `"DLD official scale"`, `"Trakheesi regulation"` | DLD published fee schedule, Engel & Völkers + Oliva guides [src 7, 9] |
| District transactions | `"DLD transactions Q[N] [YYYY] · n=[N]"` | DLD transactions API (when available) [src 9] |
| Construction CPI | `"UAE FCSC Construction CPI Q[N]"` | UAE Federal Competitiveness and Statistics Centre |

All citations from the consolidated source table are in `04_DISTRIBUTION_LEGAL_MOAT.md` §99.

---

## §99 FOUNDER RATIFY items in this file

| # | Section | Item | Ask |
|---|---|---|---|
| CDB-1 | §3.1 | Concrete grade pricing Q1 2026 (M250–M500) | confirm or supply current Conmix / Star Cement quotes |
| CDB-2 | §3.1 | m³-per-sqft conversion factors per element | confirm or supply contractor BBS |
| CDB-3 | §3.2 | Rebar pricing Ø 8–25 mm Q1 2026 | confirm or supply current Star Cement market |
| CDB-4 | §3.2 | BBS factors per BUA tier | refine against ZAAHI project history |
| CDB-5 | §3.3 | Aggregate pricing Q1 2026 (sand, gravel) | confirm bands |
| CDB-6 | §3.4 | Masonry wall block pricing | confirm bands |
| CDB-7 | §3.5 | Roofing materials pricing | confirm bands |
| CDB-8 | §3.6 | Façade pricing tiers | confirm including premium-tier breakdown (Schüco vs others) |
| CDB-9 | §3.7 | Glazing pricing | confirm — performance-glass premium varies widely |
| CDB-10 | §3.8 | MEP pricing — chiller / VRV / lift per stop | confirm against recent Dubai project quotes |
| CDB-11 | §3.10 | FF&E AED per key per star band | confirm — must align with engine 3 (`01_LAND_USE_ENGINES.md`) §3.1 |
| CDB-12 | §3.11 | Soft costs % brackets per discipline | confirm |
| CDB-13 | §5.1 | Whether DLD transactions API is publicly available or admin scrape | resolve |
| CDB-14 | §5.1 | Whether RERA index is API-exposed | resolve |
| CDB-15 | §5.1 | Faithful + Gould BCIS UAE digest — does ZAAHI have a subscription? | confirm |
| CDB-16 | §5.2 | Admin UI access — confirm Zhan + Dymo are the only admin roles | confirm against existing CLAUDE.md SECURITY RULES |
| CDB-17 | §6 | 90-day lag — confirm 90 days is the right number (not 60, not 120) | confirm |
| CDB-18 | §3.12 | Regulatory fee schedule Q1 2026 | confirm or supply DLD current scale |

---

*End of construction cost database spec. Next: `03_UX_FULLSCREEN_AND_DIFF.md`.*
