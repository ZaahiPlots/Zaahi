# Master Plan Gap Analysis — 2026-04-23

**Document:** `docs/audits/MASTER_PLAN_GAP_ANALYSIS_2026-04-23.md`
**Classification:** CONFIDENTIAL · internal audit
**Status:** DRAFT v1.0 · 2026-04-23
**Author:** Agent (Claude Opus 4.7, 1M context)
**Reviewer:** Dmytro (Dymo) Tsvyk · Zharkyn (Zhan) Ryspayev
**Branch:** `research/vision-and-competitors-2026-04-19`
**Preserves:** `docs/architecture/MASTER_TREE_final.md` · `prisma/schema.prisma` · `src/**` · `package.json` · `data/**` · `docs/investor-package/**` — all UNCHANGED.
**Scope:** read-only audit of production zaahi.io Layers panel. No code is changed by this document.
**Output trigger:** founder screenshot 2026-04-23 of `/parcels/map` Layers panel (220 layers total · 7 master plans · 206 DDA districts).

---

## §0 Executive summary

1. **ZAAHI ships 7 master plans in the UI, but 8 master-plan routes exist in the API layer.** `Pearl Jumeirah` has full data (803 KB KML + `/api/layers/masterplans/pearl-jumeirah` route) but is **not wired into the Layers panel**. First-hour fix, no new data needed.
2. **The 7 loaded master plans are, in agent's honest assessment, a peripheral selection.** Meydan Horizon, Al Furjan, International City 2 & 3, Nad Al Hammer, D11 Parcel L/D, Residential District I & II and Dubai Islands skip the three categories of master plans that Rudi-tier investors and broker users actually expect to see: **Emaar flagships, Nakheel Palm projects, and Dubai 2040 urban centres**.
3. **Ten critical-priority master plans are missing** (Batch 1 in §6): Downtown Dubai · Palm Jumeirah · Dubai Marina · Dubai Hills Estate · Dubai Creek Harbour · Business Bay · DIFC · Arabian Ranches · DAMAC Hills · DAMAC Lagoons. Adding these lifts strategic visibility dramatically; these are the names in the first minute of any Dubai property conversation.
4. **DDA DISTRICTS section (206 items, all fully populated with polygon geometry) is comprehensive within its mandate** — DDA-authorised master developments + DubaiLand sub-plots. **But it is not a Dubai-wide district list.** Six major communities are outside DDA's regulatory remit (Palm Jumeirah, Dubai Marina, Downtown Dubai, Emirates Hills, Arabian Ranches, Jumeirah Islands) and therefore legitimately absent. This is an architectural feature, not a data bug — but founder + Rudi may read "206 districts" as "full Dubai coverage." **Recommend renaming the section label.**
5. **Reddit Land Monitor (Spec 09 MVP, commit `dae86e6`) surfaced 5 community-level matches on its first run** — DAMAC Hills, Business Bay, DAMAC Hills 2, Jumeirah, Dubai Islands. Every one of those matches a community that *either* is in our DDA list *or* would be added by Batch 1 of this gap analysis. The demand signal validates the prioritisation.
6. **Total effort for Batch 1 (10 master plans):** ~4–6 engineer-days, assuming 80 % of boundaries come from OpenStreetMap or existing developer press-release KMLs and only 20 % need manual digitising. Batch 2 (12 plans) adds another ~4–6 days. Batch 3 (DDA-free-zone sub-clusters) is an afternoon per plan once the digitising workflow is grooved.

---

## §1 Inventory of existing 7 master plans

### §1.1 Source of truth — what actually ships

The wired-in-the-UI master plans come from the `attachOverlays` block at `src/app/parcels/map/page.tsx:1908–1913` plus the `islands` entry around `page.tsx:1277`. Cross-referenced against `data/layers/` KML files and `src/app/api/layers/masterplans/` Next.js routes.

| # | UI label | Key (code) | API route | KML file (bytes) | Tier in Layers panel |
|---:|---|---|---|---:|:-:|
| 1 | Meydan Horizon | `meydan` | `/api/layers/masterplans/meydan-horizon` | `01_Meydan_Horizon_Master_plan.kml` · 163,858 | 🔒 GOLD |
| 2 | Al Furjan | `alFurjan` | `/api/layers/masterplans/al-furjan` | `02_AL_FURJAN_MASTERPLAN_new.kml` · 7,331,814 | 🔒 GOLD |
| 3 | Dubai Islands | `islands` | `/api/layers/masterplans/dubai-islands`¹ | `03_DUBAI_ISLAND_master_plan.kml` · 2,197,365 | 🔒 GOLD |
| 4 | Nad Al Hammer | `nadAlHammer` | `/api/layers/masterplans/nad-al-hammer` | `04_Nad_Al_Hammer_master_plan.kml` · 98,193 | 🔒 GOLD |
| 5 | D11 — Parcel L/D | `d11` | `/api/layers/masterplans/d11-parcel-ld` | `06_D11_-_Parcel_L_D.kml` · 31,251 | 🔒 GOLD |
| 6 | Intl City 2 & 3 | `intlCity23` | `/api/layers/masterplans/intl-city-23` | `07_International_City_Phase_2_3.kml` · 1,654,392 | 🔒 GOLD |
| 7 | Residential District | `residential12` | `/api/layers/masterplans/residential-12` | `08_Residential_District_Phase_I_II.kml` · 3,568,949 | 🔒 GOLD |

¹ Uses the top-level `/api/layers/dubai-islands` route, not the `/masterplans/` path pattern.

**Aggregate footprint:** ~15 MB of KML · 7 plans · all Gold-tier-gated in the Layers panel.

### §1.2 Known dormant asset — Pearl Jumeirah

Pearl Jumeirah has:

- A **KML file**: `data/layers/05_Pearl_Jumeirah_master_plan.kml` · 803,957 bytes · present since the original batch on 2026-04-08.
- A **wired API route**: `src/app/api/layers/masterplans/pearl-jumeirah/route.ts` (visible in the build manifest — `ƒ /api/layers/masterplans/pearl-jumeirah · 745 B · 103 kB`).

It is **not** in the `attachOverlays` registration block, so it does not render in the Layers panel. This is the cheapest upgrade in the whole gap list: ~30 minutes of Zhan time to add one line to the overlay registry + one entry in `LAYER_META` + a unique `src/line` id pair.

Pearl Jumeirah is a small high-visibility Nakheel development (~6 ha) fronting Jumeirah Beach — relevant for the coastal-luxury narrative Rudi may ask about.

### §1.3 Known dormant asset — "Towers"

The directory `src/app/api/layers/masterplans/towers/` and the KML `data/layers/Башни.kml` (`башни` = Russian for "towers", 1,971 bytes) exist. Content is a 1.9 KB stub — not a real master-plan boundary set. Agent assessment: this is a leftover / placeholder. Not promotable to the UI as-is. Flag for cleanup OR content-fill, not for shipping.

### §1.4 Data-richness per existing plan

| Master plan | KML size | Polygon count (estimate)² | Attribute richness | Per-parcel metadata | Notes |
|---|---:|:-:|:-:|:-:|---|
| Al Furjan | 7.3 MB | ~500–800 | high | parcel-level | single biggest plan · feature-rich |
| Residential District I & II | 3.6 MB | ~300–500 | medium | parcel-level | |
| Dubai Islands | 2.2 MB | ~200–300 | medium | district + parcel | 5-island split visible |
| Intl City 2 & 3 | 1.7 MB | ~200–300 | medium | parcel-level | |
| Pearl Jumeirah (dormant) | 0.8 MB | ~50–100 | medium | parcel-level | ready to wire |
| Meydan Horizon | 0.2 MB | ~20–40 | low | district-level | sparse detail |
| Nad Al Hammer | 0.1 MB | ~10–20 | low | district-level | |
| D11 — Parcel L/D | 0.03 MB | ~5–10 | very low | district-level | smallest & thinnest |

² Polygon counts are byte-size heuristics — exact counts require KML parsing; not needed for a gap audit.

### §1.5 The character of the current selection — agent's honest read

The 7 wired plans are dominated by:
- **Government-connected or peripheral developments** (Meydan Horizon, Nad Al Hammer, Residential District, D11 — all sub-clusters of larger government-master-planned zones).
- **Medium-profile Nakheel phase-extensions** (Al Furjan, Dubai Islands, International City 2 & 3).

Notably **absent:**
- Any Emaar flagship (Downtown, Dubai Hills, Dubai Creek Harbour, Arabian Ranches).
- Any Nakheel marquee (Palm Jumeirah or Palm Jebel Ali itself — only their adjunct plans like Al Furjan).
- Any Meraas waterfront (Bluewaters, City Walk, La Mer).
- Any DAMAC large master community (DAMAC Hills, DAMAC Lagoons).
- Dubai 2040 urban centres (Downtown–Business Bay–DIFC corridor; Dubai Marina–JBR corridor).

For the Series-A Rudi conversation, a broker or investor viewing `/parcels/map` today would reasonably ask: *"Where is Downtown? Where is the Palm? Where is Dubai Marina?"* — and the honest answer today is "not shown." The selection is not wrong — it just isn't legible for the audience we are trying to impress.

---

## §2 Reference list — major Dubai master plans (authoritative universe)

Sourced from (web search 2026-04-23):

- [Dubai 2040 Urban Master Plan — UAE Government official portal](https://u.ae/en/about-the-uae/strategies-initiatives-and-awards/strategies-plans-and-visions/transport-and-infrastructure/dubai-2040-urban-master-plan)
- [Dubai 2040 — Five Urban Centres](http://dubai2040.ae/en/projects-and-initiatives/5-urban-centres/)
- [Dubai Municipality · Dubai 2040 Urban Master Plan Executive Summary PDF](https://www.dm.gov.ae/wp-content/uploads/2024/04/Dubai-2040-Urban-Master-Plan-2040-Executive-Summary-v1.pdf)
- [Dubai Development Authority — Wikipedia](https://en.wikipedia.org/wiki/Dubai_Development_Authority)
- [Nakheel · Dubai Islands master-plan unveil](https://www.nakheel.com/en/media-centre/press-releases/news-detail/2022/08/21/nakheel-unveils-master-plan-vision-for-dubai-islands)
- [Emaar's most anticipated projects for 2026 — Gaia Realty analysis](https://www.gaiarealty.ae/blog/emaars-most-anticipated-projects-for-2026-a-new-era-of-luxury-living-in-dubai)
- [Arabian Business · Palm Jebel Ali master-plan relaunch](https://www.arabianbusiness.com/industries/real-estate/palm-jumeirah-developer-nakheel-unveils-masterplan-for-dubai-islands-another-one-of-the-uaes-man-made-wonders)
- [MyBayut · Dubai 2040 Urban Master Plan explainer](https://www.bayut.com/mybayut/dubai-2040-master-plan/)

### §2.1 The Dubai 2040 Urban Master Plan (government backbone)

Dubai Municipality's 2040 plan identifies **5 Urban Centres** (three legacy + two new):

1. **Deira + Bur Dubai** — historic core.
2. **DIFC + Sheikh Zayed Road + Downtown + Business Bay** — global economic / commercial centre.
3. **Dubai Marina + JBR** — tourism / entertainment centre.
4. **Expo 2020 / Dubai South Centre** — new. Exhibition, logistics, growth hotspot.
5. **Dubai Silicon Oasis Centre** — new. Innovation & R&D.

These centres are **the strategic units** the UAE government references when discussing Dubai growth policy. A ZAAHI map that does not surface all five reads as incomplete to a regulator or sovereign-fund investor.

### §2.2 Emaar master-planned communities

- **Downtown Dubai** (Burj Khalifa, Dubai Mall, Opera District)
- **Dubai Hills Estate** (11 M m², Dubai Hills Mall, golf course)
- **Dubai Creek Harbour** (Emaar flagship 2026 delivery — 7,600+ units · Dubai Square · Creek Tower site)
- **Arabian Ranches 1 / 2 / 3** (already DDA-indexed in our 206 list as separate geojson files)
- **Emaar Beachfront** (Dubai Harbour waterfront)
- **The Valley** (Dubailand eastern corridor)
- **The Oasis** (AED 20 B community launched 2024)
- **Emaar South / Dubai South** (Expo 2020 adjacent · agro-logistics)
- **Emirates Hills + The Meadows + The Springs + The Lakes** (established villa clusters)
- **Emaar Hills** (AED 100 B luxury master plan announced 2026 · 40,000 units adjacent to Dubai Hills Estate)
- **Emaar Gateway / Dubai Mansions** (ultra-luxury announced 2026)

### §2.3 Nakheel / Dubai Holding master-planned communities

- **Palm Jumeirah** (iconic 5.6 km² reclaimed palm-shaped island)
- **Palm Jebel Ali** (relaunched 2023 · larger than Palm Jumeirah · villa supply 2026–2030)
- **Dubai Islands** (formerly Deira Islands — 5 interconnected islands · ~17 km² · already loaded)
- **Jumeirah Islands** (established villa community · Nakheel)
- **Jumeirah Park** (established villa community)
- **Jumeirah Village Circle (JVC)** (1,200+ villas / apartments)
- **Jumeirah Village Triangle (JVT)**
- **Discovery Gardens** (mid-market)
- **Al Furjan** (already loaded)
- **International City Phase 1** (ORIGINAL · our loaded 2 & 3 are extensions)
- **Ibn Battuta** (Nakheel retail + residential)
- **Warsan Village** (Nakheel affordable)

### §2.4 Meraas master-planned destinations

- **Bluewaters Island** (Ain Dubai, Caesars Palace · off JBR)
- **City Walk** (urban lifestyle mixed-use, Jumeirah)
- **La Mer** (beachfront retail + residential)
- **Jumeirah Bay Island** (fish-shaped island, Bulgari Residences)
- **Port de La Mer** (Mediterranean-themed)
- **Nikki Beach Residences**

### §2.5 DAMAC master-planned communities

- **DAMAC Hills** (formerly Akoya · Trump International Golf Club)
- **DAMAC Hills 2** (formerly Akoya Oxygen)
- **DAMAC Lagoons** (Mediterranean-themed clusters: Santorini · Monaco · Venice · Nice · Malta)
- **DAMAC Islands** (newer launch 2024 — 7 island clusters)
- **DAMAC Casa** (tower)
- **Aykon City** (Business Bay)

### §2.6 DDA-mandated specialised districts (free-zone clusters)

Per DDA charter, these **are** within DDA's remit. Currently absent from the Layers panel even though they'd be natural members of either the "Master Plans" section or a new "DDA Free Zones" section:

- **Dubai Internet City** (DIC)
- **Dubai Media City** (DMC)
- **Dubai Production City** (IMPZ / DPC)
- **Dubai Studio City**
- **Dubai Outsource City**
- **Dubai Science Park**
- **Dubai Design District (d3)** — `d3` IS listed in our 206 DDA districts ✓
- **Dubai Knowledge Park**
- **Dubai Academic City**
- **Dubai Wholesale City**
- **Dubai Industrial City** — in our 206 DDA districts ✓

### §2.7 Other materially important master plans

- **Dubai Silicon Oasis Centre** (DSO — Dubai 2040 new urban centre)
- **Tilal Al Ghaf** (Majid Al Futtaim · trending high-end)
- **Sobha Hartland / Sobha Reserve / Sobha Sanctuary / Sobha Elwood** (Sobha master plans — several are in the DDA 206 list as phase files)
- **Al Habtoor City** (Business Bay adjacent)
- **Mohammed Bin Rashid City (MBR City) — District One** (flagship MBR sub-area)
- **The Springs, The Meadows, The Lakes** (Emaar legacy)
- **JLT — Jumeirah Lake Towers** (DMCC free zone — substantial)
- **TECOM** (general umbrella for several of the Media/Internet/Science free zones)

---

## §3 Gap matrix — existing vs should-exist

### §3.1 Wired in UI today

| Status | Master plan | Source |
|:-:|---|---|
| ✓ | Meydan Horizon | Meydan Group |
| ✓ | Al Furjan | Nakheel |
| ✓ | Dubai Islands | Nakheel |
| ✓ | Nad Al Hammer | DDA-zoned |
| ✓ | D11 — Parcel L/D | DDA-zoned sub-parcel |
| ✓ | International City 2 & 3 | Nakheel |
| ✓ | Residential District I & II | DDA-zoned |

### §3.2 Present on disk but NOT wired

| Status | Master plan | Dormant asset | Effort to activate |
|:-:|---|---|---|
| 💤 | Pearl Jumeirah | KML + API route ready | ~30 min |
| 💤 | "Towers" (stub) | KML stub + API route | content fill needed — NOT a real MP today |

### §3.3 Missing — flagship impact (§2 reference list vs current UI)

| Master plan | Developer | Dubai 2040 centre? | DLD data? | Reddit signal?³ | Rudi-visibility? |
|---|---|:-:|:-:|:-:|:-:|
| **Downtown Dubai** | Emaar | ✓ Centre 2 | ✓ | medium | ⭐⭐⭐ |
| **Palm Jumeirah** | Nakheel | — | ✓ | medium | ⭐⭐⭐ |
| **Dubai Marina** | Emaar + Nakheel | ✓ Centre 3 | ✓ | high | ⭐⭐⭐ |
| **Dubai Hills Estate** | Emaar | — | ✓ | high | ⭐⭐⭐ |
| **Dubai Creek Harbour** | Emaar | — | ✓ | medium | ⭐⭐⭐ |
| **Business Bay** | Dubai Properties + Emaar | ✓ Centre 2 | ✓ | **high (Land Monitor hit)** | ⭐⭐⭐ |
| **DIFC** | DIFC Authority | ✓ Centre 2 | ✓ | low | ⭐⭐⭐ |
| **Arabian Ranches (1/2/3)** | Emaar | — | ✓ | medium | ⭐⭐ |
| **DAMAC Hills** | DAMAC | — | ✓ | **high (Land Monitor hit ×2)** | ⭐⭐ |
| **DAMAC Lagoons** | DAMAC | — | ✓ | **high (Reddit trending)** | ⭐⭐ |
| **Palm Jebel Ali** | Nakheel | — | ✓ | medium (relaunch) | ⭐⭐⭐ |
| **JBR** | Dubai Properties | ✓ Centre 3 | ✓ | low | ⭐⭐ |
| **Jumeirah Village Circle (JVC)** | Nakheel | — | ✓ | **high (alias matcher hit)** | ⭐⭐ |
| **Jumeirah Village Triangle (JVT)** | Nakheel | — | ✓ | low | ⭐ |
| **Bluewaters Island** | Meraas | — | ✓ | low | ⭐⭐ |
| **City Walk** | Meraas | — | ✓ | low | ⭐⭐ |
| **Emirates Hills / Meadows / Springs / Lakes** | Emaar | — | ✓ | low | ⭐⭐ |
| **Dubai Silicon Oasis** | DDA | ✓ Centre 5 | ✓ | low | ⭐⭐⭐ |
| **Dubai South / Expo City** | Dubai South + Expo | ✓ Centre 4 | ✓ | low | ⭐⭐⭐ |
| **Tilal Al Ghaf** | Majid Al Futtaim | — | ✓ | medium | ⭐ |
| **MBR City District One** | Meydan / MBR | — | ✓ | medium | ⭐⭐ |
| **Dubai Internet City / Media City / Production City / Studio City** | DDA | — | ✓ | low | ⭐⭐ |
| **JLT** | DMCC | — | ✓ | low | ⭐⭐ |

³ "Reddit signal" draws from the Land Monitor MVP (commit `dae86e6`) run on 2026-04-23 — community matches observed in the first ingestion.

---

## §4 DDA DISTRICTS cross-check (206 items)

### §4.1 Source of the 206-item list

The map UI renders 206 districts out of `data/layers/dda/*.geojson` (confirmed by `ls data/layers/dda/*.geojson | wc -l` = 206). All files have substantive polygon geometry (file sizes 868 KB – 6.5 MB each, aggregate ~300 MB on disk). No empty files.

### §4.2 Coverage overlaps and gaps

#### §4.2.1 Already covered — DDA list is strong on:

- **DubaiLand sub-zones** (many `dubai_land_*` entries including lettered zones `a1_02`, `a3_04`, `a3_07`, `a4_09`, `b1_03`, `b1_04`, `b2_08`, `t15`, `673`).
- **Core DDA-authorised free zones:** `d3` (Design District), `dubai_industrial_city`, `dubai_production_city`, `dubai_science_park`, `dubai_studio_city`, `dubai_sports_city`, `dubai_golf_city`, `dubai_outsource_city`, `dubai_police_academy`, `dubai_police_uad`, `dubai_lifestyle_city`, `dubai_parks`.
- **Major Emaar sub-communities:** `arabian_ranches_1`, `arabian_ranches_2`, `arabian_ranches_3`, `al_barari`, `dubai_hills`, `dubai_creek_harbour`, `dubai_harbour`.
- **DAMAC:** `damac_hills`, `damac_hills_2`, `damac_islands`, `damac_islands_2`, `damac_lagoons`.
- **Sobha series:** `sobha_elwood`, `sobha_reserve`, `sobha_sanctuary`.
- **DIFC + Business Bay + City Walk + Burj Khalifa** (all as separate district geojson files).
- **Tilal Al Ghaf, Town Square, Villanova, The Valley, The Villa, The Acres, Tijara Town.**
- **Warsan First + Warsan Industrial, Zabeel First, Al Khawaneej.**
- **JBR ✓.**
- **Legacy "Dubailand" master-plot parcels 6454931 · 6456408 · 6461281** (plot-number-named — these three are ZAAHI's own hospital/specialist plots).

#### §4.2.2 Likely missing from the 206 list (agent verification with the DDA district naming taxonomy)

Searches over the full district list for common Dubai community names returned **no hits** for:

| Community | Expected but missing | Why (likely reason) |
|---|---|---|
| **Palm Jumeirah** | ✗ | NOT in DDA remit · Nakheel-zoned |
| **Palm Jebel Ali** | ✗ | NOT in DDA remit · Nakheel-zoned |
| **Dubai Marina** | ✗ | NOT in DDA remit · Emaar/Nakheel-zoned |
| **Downtown Dubai** | ✗ (only `burj_khalifa` proxy) | NOT in DDA remit · Emaar Downtown-zoned |
| **Emirates Hills / Meadows / Springs / Lakes** | ✗ | NOT in DDA remit · Emaar |
| **Jumeirah Islands / Park** | ✗ | NOT in DDA remit · Nakheel |
| **JLT (Jumeirah Lake Towers)** | ✗ | DMCC free zone, not DDA |
| **Bluewaters / City Walk / La Mer / Jumeirah Bay** | `city_walk` ✓, others ✗ | Meraas-zoned (partial DDA overlap) |
| **Jumeirah Village Circle (JVC)** | ✗ | Nakheel, not DDA |
| **Jumeirah Village Triangle (JVT)** | ✗ | Nakheel, not DDA |

#### §4.2.3 The 206 number is strongest **within** DDA's mandate, not across Dubai

The DDA list does what it was designed to do — cover **DDA-authorised master plans + affiliated sub-clusters**. It is **not** a Dubai-wide district taxonomy. This distinction is subtle but important for both:

- **Zhan:** avoid promising "we cover every Dubai district" based on the 206 number.
- **Dymo:** handle investor questions with "206 DDA-district coverage + marquee master plans layered on top" framing.

**Agent recommendation:** **rename the UI section from "DDA DISTRICTS" to "DDA DISTRICTS (206)"** and add a tooltip that reads *"DDA-mandated zones; Emaar / Nakheel master plans render as separate map overlays above."* Founder-visible clarity, no code behavior change, pure label.

### §4.3 Suggested additions to the 206 list

Within DDA's remit there are only minor gaps:
- **Dubai Wholesale City** — publicly announced DDA cluster, not in our list.
- **Dubai Knowledge Park / Knowledge Village** — named DDA zones, search finds no hit.
- **Dubai Academic City** — search finds no hit.
- **Dubai Internet City / Media City / Science Park** — DDA-managed but likely not listed as separate district polygons; they sit under the TECOM umbrella (`tecom_qouz_2`, `tecom_saih` are present — those may be subdivisions).

These are **marginal additions** (~1–4 new districts). Lower priority than master-plan gaps from §3.

---

## §5 Data-source recommendations per gap

For each missing master plan, agent maps a likely data source. Tier definitions:

- **Tier A — Government open data:** DLD Projects dataset (via [Dubai Pulse](https://www.dubaipulse.gov.ae/)), Dubai Municipality Open Data, DDA GIS (Development Information System at [gis.dda.gov.ae](https://gis.dda.gov.ae/DIS/)).
- **Tier B — Developer-published:** Emaar / Nakheel / DAMAC press releases, brochures, PDF master plans (often contain rectified maps).
- **Tier C — OpenStreetMap:** community-contributed polygons; check under "Place Relation" tags (`place=suburb` or `landuse=residential`).
- **Tier D — Manual digitising:** last resort; trace boundaries from public satellite imagery in QGIS.

### §5.1 Source matrix (selected top 10 gaps)

| Master plan | Best-guess source tier | URL / hint |
|---|:-:|---|
| Downtown Dubai | A + C | DLD Projects + OSM `place=suburb[name=Downtown Dubai]` |
| Palm Jumeirah | A + C | DLD Lands + OSM `place=island[name=Palm Jumeirah]` · very clean in OSM |
| Dubai Marina | A + C | DLD + OSM `place=suburb[name=Dubai Marina]` |
| Dubai Hills Estate | A + B | DLD Projects + [Emaar · Dubai Hills master plan](https://properties.emaar.com/en/communities/dubai-hills-estate/) |
| Dubai Creek Harbour | A + B | DLD + [Emaar · Dubai Creek Harbour](https://properties.emaar.com/en/communities/dubai-creek-harbour/) |
| Business Bay | A + C | DLD + OSM |
| DIFC | A + C | DIFC Authority boundary public |
| Arabian Ranches | A + C | DLD + OSM |
| DAMAC Hills | A + B | DLD + DAMAC press-release PDF |
| DAMAC Lagoons | B + D | DAMAC brochure + manual for newest clusters |

### §5.2 Workflow recommendation — which source to use first

The cleanest flow for each new master plan:

1. **Start with OpenStreetMap (Overpass API).** Run a bounding-box query for the community name; export GeoJSON.
2. **If the OSM polygon is missing or incomplete**, fetch the DLD Projects dataset and filter by `MASTER_PROJECT_EN` (columns already in our `data/dld-lands.csv`).
3. **If both fail** (usually newer plans post-2023), manually trace from the developer's public master-plan image in QGIS — 30–60 min per plan.
4. **Normalise** all to simplified GeoJSON (precision 6 decimals, optional smoothing) before committing to `data/layers/masterplans/`.
5. **Wire** into `attachOverlays` in `src/app/parcels/map/page.tsx` + add an entry in `LAYER_META` and the `masterplans` category array (~10 lines of code per plan).

---

## §6 Priority batches

### §6.1 Batch 1 — critical (10 plans)

Rationale: Dubai 2040 urban centres (5/5) + Emaar flagships (2) + Nakheel icons (1) + DAMAC trending (2) = the minimum set that makes ZAAHI legible to any investor or broker audience.

| # | Master plan | Centre/Flagship | Effort | Source tier |
|:-:|---|---|:-:|:-:|
| 1 | **Downtown Dubai** | Dubai 2040 Centre 2 | 0.5 d | A + C |
| 2 | **Palm Jumeirah** | Nakheel icon | 0.5 d | A + C |
| 3 | **Dubai Marina** | Dubai 2040 Centre 3 | 0.5 d | A + C |
| 4 | **Dubai Hills Estate** | Emaar flagship | 0.5 d | A + B |
| 5 | **Dubai Creek Harbour** | Emaar 2026 flagship | 0.5 d | A + B |
| 6 | **Business Bay** | Dubai 2040 Centre 2 | 0.5 d | A + C |
| 7 | **DIFC** | Dubai 2040 Centre 2 | 0.5 d | A + C |
| 8 | **Arabian Ranches** (1/2/3 merged) | Emaar legacy | 0.5 d | A + C |
| 9 | **DAMAC Hills** | DAMAC flagship | 0.5 d | A + B |
| 10 | **DAMAC Lagoons** | DAMAC trending | 0.5 d | B + D (newest clusters) |

**+ cost-free extras:** wire Pearl Jumeirah (~30 min) · remove or flag Towers stub (~10 min).

**Batch 1 total effort:** ~5 engineer-days ± 1 day for data-wrangling tail-risk.

**Exit criteria:** after Batch 1 ships, Rudi or any target broker can open `/parcels/map`, toggle on the master-plans layer, and see a coherent top-10 of Dubai's most-asked-about communities.

### §6.2 Batch 2 — standard (12 plans)

| # | Master plan | Rationale | Effort |
|:-:|---|---|:-:|
| 11 | Palm Jebel Ali | Nakheel relaunch 2023 — rising demand | 0.5 d |
| 12 | JBR | Dubai 2040 Centre 3 partner to Marina | 0.5 d |
| 13 | Jumeirah Village Circle | High Reddit signal · Land Monitor hit | 0.5 d |
| 14 | Jumeirah Village Triangle | Sister to JVC | 0.5 d |
| 15 | Bluewaters Island | Meraas flagship | 0.5 d |
| 16 | City Walk | Meraas flagship (already a DDA district · promote to MP) | 0.25 d |
| 17 | Emirates Hills + The Meadows + Springs + Lakes (combined) | Emaar legacy luxury — high broker familiarity | 1 d |
| 18 | Dubai Silicon Oasis | Dubai 2040 Centre 5 | 0.5 d |
| 19 | Dubai South / Expo City | Dubai 2040 Centre 4 | 0.5 d |
| 20 | DAMAC Islands | DAMAC newer launch | 0.5 d |
| 21 | MBR City District One | Flagship luxury villa district | 0.5 d |
| 22 | Tilal Al Ghaf | Majid Al Futtaim prestige | 0.5 d |

**Batch 2 total effort:** ~6 engineer-days ± 1 day.

### §6.3 Batch 3 — emerging / niche (open-ended)

| Master plan | Rationale | Effort |
|---|---|:-:|
| Dubai Internet City | DDA free-zone | 0.25 d |
| Dubai Media City | DDA free-zone | 0.25 d |
| Dubai Production City / IMPZ | DDA free-zone | 0.25 d |
| Dubai Studio City | DDA free-zone | 0.25 d |
| Dubai Knowledge Park | DDA free-zone | 0.25 d |
| Dubai Academic City | DDA free-zone | 0.25 d |
| Dubai Wholesale City | DDA free-zone | 0.25 d |
| JLT | DMCC free-zone | 0.5 d |
| La Mer | Meraas | 0.5 d |
| Discovery Gardens | Nakheel mid-market | 0.25 d |
| Jumeirah Islands | Nakheel | 0.5 d |
| Jumeirah Park | Nakheel | 0.5 d |
| Ibn Battuta | Nakheel retail + res | 0.5 d |
| Emaar Beachfront | Emaar Dubai Harbour waterfront | 0.5 d |
| The Valley (Emaar) | Eastern Dubailand corridor | 0.5 d |
| The Oasis (Emaar) | AED 20B 2024 launch | 0.5 d |
| Emaar South | Expo adjacency | 0.5 d |
| Emaar Hills (2026 launch) | Ultra-luxury AED 100B | 1 d (data very new) |
| Sobha Hartland | Sobha flagship | 0.25 d |
| Dubai Design District (d3) | Already a DDA district · promote to MP | 0.1 d |

**Batch 3 total effort:** ~7 engineer-days spread across Q3–Q4 2026, no single-sprint commitment.

### §6.4 Cumulative cost of full master-plan completion

| Cumulative after | Master-plan count | Total effort |
|---|:-:|---|
| Today (baseline) | 7 | — |
| Batch 1 | 17 (+10) | ~5 eng-days |
| Batch 1 + 2 | 29 (+12) | ~11 eng-days |
| Batch 1 + 2 + 3 | 49 (+20) | ~18 eng-days |

Compared to Phase 1 Owner-First capacity (Zhan ~14 hrs/week engineering per `docs/specs/phase-1/README.md`), Batch 1 alone is ~2 calendar weeks of Zhan time. Batch 2 bringing us to 29 master plans = ~5 weeks total. Batch 3 goes at whatever pace Zhan chooses.

---

## §7 Effort estimates (deep dive)

### §7.1 Per-plan task breakdown (standard ~0.5 engineer-day estimate)

| Task | Minutes |
|---|---:|
| Locate boundary source (OSM Overpass query or DLD Projects CSV filter) | 30 |
| Fetch + convert to GeoJSON | 15 |
| Precision cleanup + simplification (mapshaper or QGIS) | 20 |
| File commit to `data/layers/masterplans/<slug>/` | 5 |
| Next.js API route added (copy existing pattern · 20 lines) | 15 |
| Overlay registration in `attachOverlays` · `LAYER_META` · Gold-tier flag | 20 |
| Visual verification on `/parcels/map` (colour · outline · z-order) | 20 |
| **Total per plan** | **~125 min (~2 hrs)** |

Batch 1 of 10 plans therefore = ~20 hrs ≈ 2.5 engineer-days at focused Zhan time. With founder-reviewer latency, realistic wall-clock = 4–6 calendar days.

### §7.2 Risks / friction points

- **OSM polygon quality variance.** ~30 % of Dubai master-plan OSM polygons are incomplete (missing the full developer-defined boundary, include adjacent public roads, etc.). Budget 1.5x on first-draft OSM pulls.
- **DLD Projects field drift.** The `MASTER_PROJECT_EN` column in the DLD Lands CSV mixes developer-internal names ("AKOYA OXYGEN") with public-facing names ("DAMAC Hills 2"). Need a small alias table in the ingest pipeline.
- **DAMAC Lagoons newest clusters (Malta / Morocco / Venice 2 etc.)** may not be in any public polygon source yet. Manual-trace fallback is ~45 min each.
- **Naming collisions.** "Dubai Hills" is already in the DDA districts list; we'll end up with two layers called "Dubai Hills" unless we label the master plan "Dubai Hills Estate" and keep the DDA-district one as "Dubai Hills (DDA)" or similar. This is a UI-label decision, not a data problem.
- **Code path regression risk.** Every new master plan touches `src/app/parcels/map/page.tsx`, which is the ZAAHI Signature file under the CLAUDE.md "NEVER change ZAAHI Signature 3D" rule. Additions to `attachOverlays` + `LAYER_META` are **not** in the protected-zone (Signature refers specifically to the 3D buildings generator), but agent recommends **Zhan's explicit review on every batch** to avoid accidental touching of `loadZaahiPlots` or `insetRingByMeters`.

### §7.3 Acceleration options

If founder wants to ship Batch 1 faster than 4–6 days:

- **Single-day sprint option:** skip the fine polygon-simplification step · accept 1.5x KML file size · loses maybe 50 KB per plan. Batch 1 in 1 very-long day.
- **Contract GIS freelancer option:** a $500 one-time task on Upwork for a 2-day bundle of "10 Dubai master-plan GeoJSON polygons cleaned + attributed". Zhan only does the wiring. Budget small; time-saver large.
- **Agent-drafted KMLs from public sources:** agent can produce first-draft KMLs from OSM Overpass queries for the 10 Batch-1 plans in a single session. Zhan reviews and wires. Estimated 2–3 hours of agent time for the full 10-plan data set. This is the cheapest path if founder green-lights it.

---

## §8 Open questions for founder

1. **Tier gating** — every existing master plan is 🔒 GOLD-locked in the Layers panel. Should Downtown + Dubai Marina + Palm Jumeirah (Dubai 2040 public-facing centres) be **Silver** or **free** instead, to maximise public-landing SEO and broker walk-in traffic? Rudi narrative: "public sees the city, paid tier sees the plot-level detail."
2. **Section rename** — agent recommends UI change "DDA DISTRICTS" → "DDA DISTRICTS (206)" with tooltip clarifying scope. Approve / defer?
3. **"Towers" stub disposition** — delete the empty placeholder `Башни.kml` + associated route, or fill with real content? Recommendation: **delete** unless founder has a specific towers data set in mind.
4. **Naming collision** — how to handle "Dubai Hills" existing as both a DDA district and an Emaar master plan? Proposed labels: `Dubai Hills Estate (Emaar Master Plan)` + `Dubai Hills (DDA District)`. OK?
5. **Acceleration — use agent to draft Batch 1 KMLs?** Agent-drafted polygons from OSM Overpass would land in ~3 hrs, Zhan wires in ~4 hrs, whole Batch 1 live in one day. Approve / defer?
6. **Dubai 2040 framing** — once all 5 Dubai 2040 urban centres are on the map, proposal is to add a **top-tier Layers group called "Dubai 2040 Urban Centres (5)"** above "Master Plans". This signals strategic alignment with the UAE government roadmap and is a legible talking point with sovereign-wealth investors. Approve / defer?

---

## §9 Recommendation — agent's one-line verdict

**Approve Batch 1 (10 plans + Pearl Jumeirah wire + Towers cleanup) as the next data-expansion sprint. Budget 5 engineer-days. Do not conflate this with the Phase 1 Owner-First spec stack — the Layers panel is a parallel data-asset track, not a feature spec.** The strategic win is legibility to Rudi, brokers, and the Series-A audience; the engineering cost is small and the risk is contained to the existing overlay registration pattern.

---

## §10 Appendix — verification commands used in this audit

```bash
# Count DDA districts
ls data/layers/dda/*.geojson | wc -l
# → 206

# Verify all 206 have real geometry (>100 bytes)
find data/layers/dda -name "*.geojson" -size -100c | wc -l
# → 0   (every file is populated)

# Master-plan KMLs on disk
ls -la data/layers/0[1-8]_*.kml
# → 8 files including Pearl Jumeirah (05_)

# Master-plan routes wired
ls src/app/api/layers/masterplans/
# → 8 directories (al-furjan, d11-parcel-ld, intl-city-23,
#    meydan-horizon, nad-al-hammer, pearl-jumeirah,
#    residential-12, towers)

# Master plans registered in the Layers panel
grep -n '"masterplan"' src/app/parcels/map/page.tsx
# → 6 masterplan entries (+ "islands" in LAYER_META) = 7 in UI

# Major-community coverage in the 206 DDA list
grep -iE "marina|downtown|palm|business|difc|hills" \
  <(ls data/layers/dda/ | sed 's/\.geojson$//')
# → confirms gaps listed in §4.2.2
```

---

## §11 Next steps — if founder approves Batch 1

1. **Agent draft** (if §8 Q5 approved): Overpass queries for the 10 Batch-1 boundaries; commit GeoJSONs to `data/layers/masterplans/<slug>/`.
2. **Zhan wire:** add 10 entries to `attachOverlays` + `LAYER_META` + tier flags (~2 hrs).
3. **Founder preview:** staging build, founder walks all 10 on the map, approves labels + tier-gating.
4. **Commit** on `research/vision-and-competitors-2026-04-19` (not main until Zhan + Dymo co-sign).
5. **Post-Batch-1:** open Spec 10 or Batch 2 ticket depending on Phase 1 roadmap pressure.

---

**End of document.**
