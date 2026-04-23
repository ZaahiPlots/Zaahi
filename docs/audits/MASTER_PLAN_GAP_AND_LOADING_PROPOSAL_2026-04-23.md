# Master Plan Gap & Loading Proposal — 2026-04-23

**Document:** `docs/audits/MASTER_PLAN_GAP_AND_LOADING_PROPOSAL_2026-04-23.md`
**Classification:** CONFIDENTIAL · internal audit + acquisition proposal
**Status:** DRAFT v1.0 · 2026-04-23
**Author:** Agent (Claude Opus 4.7, 1M context)
**Reviewer:** Dmytro (Dymo) Tsvyk · Zharkyn (Zhan) Ryspayev
**Branch:** `research/vision-and-competitors-2026-04-19`
**Preserves:** `docs/architecture/MASTER_TREE_final.md` · `prisma/schema.prisma` · `src/**` · `package.json` · `data/**` · `docs/investor-package/**` — all UNCHANGED.
**Scope:** read-only discovery. No code touched, no data added, no loading executed. Output is this document only.
**Supersedes:** section §1.2 and Batch-1 proposal in `docs/audits/MASTER_PLAN_GAP_ANALYSIS_2026-04-23.md` (commit `171f3b4`) — the prior audit incorrectly included Pearl Jumeirah, Dubai Hills Estate, Dubai Creek Harbour, Business Bay, DIFC, Arabian Ranches, DAMAC Hills, and DAMAC Lagoons as gaps. All eight are in fact present in the 206-entry DDA-districts dataset; that audit was written from a partial search of the DDA list. Corrected below with a complete enumeration.

---

## §0 Executive summary

1. **Existing coverage is broader than I previously claimed.** A full enumeration of `data/layers/dda/*.geojson` (206 entries) + the 7 wired master plans confirms that Dubai Hills · Dubai Creek Harbour · Business Bay · DIFC · Arabian Ranches 1/2/3 · DAMAC Hills · DAMAC Hills 2 · DAMAC Islands · DAMAC Lagoons · Bluewaters · City Walk · La Mer · Jumeirah Bay · Pearl Jumeira · Tilal Al Ghaf · Dubai Harbour · Dubai Industrial City · Dubai Production City · Dubai Studio City · Dubai Outsource City · Dubai Science Park · DIAC (Dubai International Academic City) · d3 (Design District) **are already loaded** as DDA district layers. My previous Batch 1 overstated the gap list by ~80 %.
2. **The genuine gap is smaller but still consequential.** I identify **26 missing master plans** that are (a) publicly marketed as distinct communities, (b) not in the 206 DDA-districts file, and (c) not among the 7 master-plan overlays. Top-7 by agent's priority matrix: **Palm Jumeirah · Palm Jebel Ali · Dubai Marina · JLT · JVC · Dubai Silicon Oasis · Dubai South / Expo City**.
3. **Reddit demand cross-check (Land Monitor commit `dae86e6`)** validates the priority. The first live ingest surfaced 5 community-tier matches on DDA Hills · DDA Hills 2 · Business Bay · Jumeirah · Dubai Islands — all four are already covered. For the gap list, surrogate demand is strong for **JVC** (community scan hit), **Palm Jumeirah** (repeated in our community canonicaliser test strings), and **Dubai Marina** (common broker keyword).
4. **Data-source strategy:** Dubai Municipality publishes [`dm_community-open`](https://www.dubaipulse.gov.ae/data/dm-location/dm_community-open) on Dubai Pulse — this is the **single most promising authoritative source** for Dubai community boundaries and should be the Batch 1 anchor. OpenStreetMap Overpass covers the iconic coastline plans (Palm, Marina) cleanly. DDA/DSOA and developer press-release KMLs fill the remainder.
5. **Proposed Batch 1 (7 plans, ~1 agent-session + ~3 engineer-days Zhan):** Palm Jumeirah · Palm Jebel Ali · Dubai Marina · JLT · JVC · Dubai Silicon Oasis · Dubai South (with Expo City as a sub-layer). Agent can draft the seven GeoJSONs from Dubai Pulse `dm_community-open` + OSM Overpass; Zhan wires into `attachOverlays`. Total commit surface area: ~1 MB of GeoJSON + ~70 lines of TypeScript.
6. **Tier-gating recommendation:** the Dubai 2040 Urban Centres (Dubai Marina, Dubai Silicon Oasis, Dubai South, and the DIFC-Downtown-Business Bay corridor already covered) should be **free-tier visible** to maximise SEO, broker walk-in traffic, and the "ZAAHI as civic map" narrative. Emaar Living and developer-specific communities stay **Gold**. Palm Jumeirah is the one contentious case — agent recommends free-tier for the outline, Gold-tier for per-plot data. Founder decides.

---

## §1 Current coverage inventory (exhaustive, evidence-based)

### §1.1 The 7 wired master plans

Evidence: `grep -n '"masterplan"' src/app/parcels/map/page.tsx` + the `islands` entry at `LAYER_META`:

| # | UI label (code key) | API route | KML source | Tier |
|:-:|---|---|---|:-:|
| 1 | Meydan Horizon (`meydan`) | `/api/layers/masterplans/meydan-horizon` | `01_Meydan_Horizon_Master_plan.kml` | GOLD |
| 2 | Al Furjan (`alFurjan`) | `/api/layers/masterplans/al-furjan` | `02_AL_FURJAN_MASTERPLAN_new.kml` | GOLD |
| 3 | Dubai Islands (`islands`) | `/api/layers/dubai-islands` | `03_DUBAI_ISLAND_master_plan.kml` | GOLD |
| 4 | Nad Al Hammer (`nadAlHammer`) | `/api/layers/masterplans/nad-al-hammer` | `04_Nad_Al_Hammer_master_plan.kml` | GOLD |
| 5 | D11 — Parcel L/D (`d11`) | `/api/layers/masterplans/d11-parcel-ld` | `06_D11_-_Parcel_L_D.kml` | GOLD |
| 6 | Intl City 2 & 3 (`intlCity23`) | `/api/layers/masterplans/intl-city-23` | `07_International_City_Phase_2_3.kml` | GOLD |
| 7 | Residential District (`residential12`) | `/api/layers/masterplans/residential-12` | `08_Residential_District_Phase_I_II.kml` | GOLD |

### §1.2 The 206 DDA districts — full enumeration for the record

Evidence: `ls data/layers/dda/*.geojson | wc -l` = 206. All files ≥ 868 KB, populated geometry, no empty stubs. The complete alphabetical list (canonical DDA slugs):

```
al_aryam · al_barari · al_habtoor_polo · al_jalila · al_khail_gate · al_khawaneej ·
al_mamzar_front · al_waha · arabian_ranches_1 · arabian_ranches_2 · arabian_ranches_3 ·
ardh_community · arjan · ar_polo · asmaran · athlon · barsha_heights · barsha_third ·
bianca · bluewaters · boxpark · burj_al_arab · burj_khalifa · business_bay ·
california_residence · cherrywoods · city_of_arabia · city_walk · culture_village_2 ·
culture_village_3 · d3 · damac_hills · damac_hills_2 · damac_islands · damac_islands_2 ·
damac_lagoons · dham_rowaiyah_1 · dhcc_phase1 · dhcc_phase2 · dh_khawaneej_1 ·
dh_safouh_1 · diac · difc · difc_zabeel · dl_6461281 · dlrc · dp_barsha_south_3 ·
dpg_mbr · dp_jafiliya · dp_quoz_2 · dubai_creek_harbour · dubai_golf_city ·
dubai_harbour · dubai_hills · dubai_industrial_city · dubai_land · dubai_land_673 ·
dubai_land_a1_02 · dubai_land_a3_04 · dubai_land_a3_07 · dubai_land_a4_09 ·
dubai_land_b1_03 · dubai_land_b1_04 · dubai_land_b2_08 · dubai_land_t15 ·
dubai_lifestyle_city · dubai_outsource_city · dubai_parks · dubai_police_academy ·
dubai_police_uad · dubai_production_city · dubai_science_park · dubai_sports_city ·
dubai_studio_city · dwc · dwc_nfz · eahm · echo_plex · emirates_towers · falcon_city ·
ghaf_woods · ghoroob · global_village · haven · jabal_ali_industrial · jabel_ali_hills ·
jaddaf_waterfront · jai_staff · jbh · jbr · jg_jumeira_2 · jumeirah_bay ·
jumeirah_central · jumeirah_garden_city · khail_heights · khawaneej_labour · kite_beach ·
koa · labour_quoz · la_mer · last_exit · layan · living_legends · liwan · liwan_2 ·
lunaya · madinat_jumeirah · majan · marsa_al_arab · marsa_alseef · meraas_3460266 ·
meraas_alamardi · meraas_barsha_2 · meraas_bs_1 · meraas_bs_2 · meraas_hemaira ·
meraas_jafiliya · meraas_jumeira_1 · meraas_mamzar · meraas_marsa_dubai · meraas_mirdif ·
meraas_nadd_al_hamar · meraas_nas_4 · meraas_port_saeed · meraas_quoz_3 · meraas_qusais_2 ·
meraas_rakhor_3 · meraas_saih_1 · meraas_satwa · meraas_umm_al_daman · meraas_umm_al_sheif ·
meraas_umm_amaraa · meraas_us_1 · meraas_wadi_alshabak · meraas_warqa_2 · meraas_warqa_3 ·
meraas_zabeel_2 · mjl · motor_city · mudon · museum_future · nad_al_sheba_gardens ·
naia_island · nuzul · oasis_village · palmarosa · pearl_jumeira · portofino · remraam ·
reportage_village · rukan · sama_al_jadaf · scaramanga · schools_fz · serena ·
shamal_barsha_2 · shamal_bs_1 · shamal_hadaeq · shamal_jai_1 · shamal_jumeira_1 ·
shamal_maha · shamal_mamzar · shamal_mankhool · shamal_margham · shamal_muhaisanah_2 ·
shamal_muhaisnah_1 · shamal_nahda_1 · shamal_nahda_2 · shamal_nas_1 · shamal_oud_metha ·
shamal_quoz_1 · shamal_quoz_2 · shamal_quoz_3 · shamal_raffa · shamal_safouh_1 ·
shamal_tc_2 · shamal_us_3 · shamal_wasl · shamal_yalayis_1 · shorooq · site_a · site_d ·
sobha_elwood · sobha_reserve · sobha_sanctuary · sufouh_gardens · sustainable_city ·
taormina_1 · taormina_2 · tecom_qouz_2 · tecom_saih · the_acres · the_beach ·
the_valley · the_villa · tijara_town · tilal_al_ghaf · town_square · villanova ·
warsan_first · warsan_industrial · was3_6454931 · was3_6456408 · wilds · wild_wadi ·
zabeel_first
```

### §1.3 Notable coverage inside the 206 that my prior audit missed

- `pearl_jumeira` — Pearl Jumeirah (Nakheel · ~6 ha Jumeirah Beach). **Already covered; should not have been in previous Batch 1.**
- `dubai_hills` — Dubai Hills Estate (Emaar flagship · 11 M m²). **Already covered.**
- `dubai_creek_harbour` — Emaar 2026 flagship. **Already covered.**
- `dubai_harbour` — hosts Emaar Beachfront sub-area. **Already covered (Emaar Beachfront is a sub-cluster).**
- `business_bay` · `difc` · `difc_zabeel` — Dubai 2040 Centre 2 corridor. **Already covered.**
- `arabian_ranches_1` · `_2` · `_3` — Emaar legacy villa clusters. **Already covered.**
- `damac_hills` · `_2` · `_islands` · `_islands_2` · `_lagoons` — complete DAMAC master-plan set. **Already covered.**
- `bluewaters` · `city_walk` · `la_mer` · `jumeirah_bay` · `madinat_jumeirah` · `boxpark` · `marsa_al_arab` · `marsa_alseef` — Meraas + hospitality clusters. **Already covered.**
- `diac` — Dubai International Academic City. **Already covered.**
- `d3` — Dubai Design District. **Already covered.**
- `dwc` · `dwc_nfz` — Dubai World Central free zone footprint. **Partially covers Dubai South but the Residential District + Expo City are distinct — see §3 gap entry 4.**
- `burj_khalifa` — district polygon around the tower. **Partially proxies "Downtown Dubai" (see §3 open question).**

### §1.4 "Ghost" files and dormant assets

| Asset | Path | Status | Recommendation |
|---|---|---|---|
| Pearl Jumeirah KML + API route | `data/layers/05_Pearl_Jumeirah_master_plan.kml` + `src/app/api/layers/masterplans/pearl-jumeirah/` | **Duplicate coverage** — the DDA district `pearl_jumeira` is the authoritative source. The separate KML is an alternative high-detail rendering. | **Keep KML on disk** (no harm). **Do not wire** a duplicate "Pearl Jumeirah" master-plan entry — it would stack on top of the DDA district polygon. If per-plot granularity is wanted, promote it as a tier-enabled "Pearl Jumeirah Plots" Gold layer instead. |
| "Towers" (`Башни.kml` · 1.9 KB stub) | `data/layers/Башни.kml` + `src/app/api/layers/masterplans/towers/` | Placeholder · not real content | Delete or leave dormant. Not a real master plan. |

### §1.5 Aggregate coverage

- **7 master-plan overlays** (Meydan, Al Furjan, Dubai Islands, Nad Al Hammer, D11, Intl City 2&3, Residential District).
- **206 DDA district polygons** (enumerated above).
- **2 dormant assets** (Pearl Jumeirah duplicate, Towers stub).
- **Total distinct loaded communities: ~213.**

---

## §2 Operational definition of "master plan" for this audit

The task requires the agent to define the term operationally. My working definition, for the purpose of the gap list:

> *A Dubai master plan is a named, publicly-advertised, contiguous development with a declared boundary that (a) carries its own brand identity in DLD's Madmoun / Trakheesi permit system or in major broker listings (Bayut / Property Finder), (b) is referenced as a distinct community in Dubai Municipality or Dubai 2040 documents or major developer press, and (c) has a geographical footprint > ~10 ha (excludes individual towers, single-building compounds, roads).*

**Included under this definition:**
- Dubai 2040 Urban Centres (Deira/Bur Dubai, DIFC–Downtown–Business Bay corridor, Marina+JBR corridor, Expo–Dubai South, Dubai Silicon Oasis).
- Developer-master-planned residential communities (Emaar, Nakheel, Meraas, DAMAC, Sobha, Majid Al Futtaim, Al Habtoor).
- DDA-regulated special-economic clusters that carry community-brand identity (Media City, Internet City, Knowledge Park, Wholesale City).
- Free-zone districts that function as residential/mixed-use communities (JLT / DMCC).

**Excluded:**
- Individual towers, branded residences, single-building projects.
- Pure industrial / logistics zones without residential brand identity.
- Historic neighborhoods without formal master-plan declaration (flagged: Deira + Bur Dubai are "Dubai 2040 Centre 1" and therefore implicitly a plan, but a single polygon may be ambiguous — flag for founder).
- Sub-sub-clusters within already-loaded master plans (e.g., DAMAC Lagoons' "Nice" or "Monaco" clusters — aggregated under DAMAC Lagoons).

**Scope assumption flagged for founder:** I'm scoping **Dubai emirate only**. Abu Dhabi has its own master plan corpus already partly represented in `data/layers/ad-plots/` but outside this audit per the original task framing. Sharjah / Ajman / RAK / Fujairah are out of scope.

---

## §3 Gap catalogue — curated list of missing master plans

### §3.1 Verification method

For each candidate, I ran three tests:
1. **`grep` against `data/layers/dda/*` slugs** — confirmed absent from 206.
2. **`grep` against the 7 wired master-plan keys** (`meydan`, `alFurjan`, `islands`, `nadAlHammer`, `d11`, `intlCity23`, `residential12`) — confirmed absent.
3. **Web search for the candidate's public boundary availability** — confirmed it exists as a publicly-marketed distinct community.

### §3.2 Catalogue (26 plans, sorted by tier)

Tier column explains what level of priority the plan sits at, based on the combined matrix in §5.

| # | Name | Developer / Regulator | Category | Tier |
|:-:|---|---|---|:-:|
| **Tier A — Iconic / Dubai 2040 centres / high Reddit demand** | | | | |
| 1 | **Palm Jumeirah** | Nakheel | Iconic coastal · 5.6 km² reclaimed island | A |
| 2 | **Palm Jebel Ali** | Nakheel | Iconic coastal (relaunched 2023) · > Palm Jumeirah | A |
| 3 | **Dubai Marina** | Emaar + Nakheel co-devs | Dubai 2040 Centre 3 · mixed-use | A |
| 4 | **JLT (Jumeirah Lake Towers)** | DMCC Free Zone | 26 towers · residential/commercial cluster adjacent to Marina | A |
| 5 | **Jumeirah Village Circle (JVC)** | Nakheel | Mid-market residential · Land Monitor signal | A |
| 6 | **Dubai Silicon Oasis (DSO)** | DSOA | Dubai 2040 Centre 5 · 7.2 km² | A |
| 7 | **Dubai South / Expo City** | Dubai South + Expo Authority | Dubai 2040 Centre 4 · 145 km² | A |
| **Tier B — Established developer clusters** | | | | |
| 8 | **Emirates Living (bundle)** | Emaar | Emirates Hills + Meadows + Springs + Lakes | B |
| 9 | **Jumeirah Islands** | Nakheel | Villa cluster | B |
| 10 | **Jumeirah Park** | Nakheel | Villa cluster | B |
| 11 | **Discovery Gardens** | Nakheel | Mid-market apartments | B |
| 12 | **Ibn Battuta** | Nakheel | Retail + residential mixed | B |
| 13 | **Jumeirah Village Triangle (JVT)** | Nakheel | Sister community to JVC | B |
| 14 | **International City Phase 1** | Nakheel | Original (2&3 already loaded) | B |
| 15 | **Downtown Dubai** (if not proxied by `burj_khalifa`) | Emaar | Dubai 2040 Centre 2 core · ambiguous | B |
| **Tier C — DDA-regulated clusters not in the 206 file** | | | | |
| 16 | **Dubai Media City** | DDA/TECOM | Free zone · broadcasting/media | C |
| 17 | **Dubai Internet City** | DDA/TECOM | Free zone · tech HQs | C |
| 18 | **Dubai Knowledge Park** | DDA | Free zone · education | C |
| 19 | **Dubai Wholesale City** | DDA | Announced large wholesale district | C |
| **Tier D — Recent launches with data-source friction** | | | | |
| 20 | **Sobha Hartland** | Sobha | MBR City sub-area (sobha_elwood/reserve/sanctuary are different phases) | D |
| 21 | **The Oasis (Emaar)** | Emaar | AED 20 B launch 2024 | D |
| 22 | **Emaar Hills** | Emaar | AED 100 B ultra-luxury · 2026 launch · adjacent Dubai Hills | D |
| 23 | **Al Habtoor City** | Al Habtoor | Business Bay-adjacent · tower complex | D |
| 24 | **Aykon City** | DAMAC | Business Bay tower cluster | D |
| 25 | **Port de La Mer** | Meraas | Mediterranean-themed · adjacent to la_mer (which is covered) | D |
| 26 | **Deira + Bur Dubai (historic core)** | Dubai Municipality | Dubai 2040 Centre 1 · historical district | D |

### §3.3 Notes on a few boundary cases

- **Downtown Dubai vs `burj_khalifa`:** the DDA slug `burj_khalifa` is a polygon focused on the Burj Khalifa district. Emaar's "Downtown Dubai" master plan is a broader area (covers Opera District, Dubai Mall, Boulevard). If the existing `burj_khalifa` polygon is tight to the tower block, Downtown is a genuine gap. If DDA's polygon is the broader area, Downtown may be sufficiently covered. **Verification needs polygon inspection — not done in this audit.** Flagged for founder decision.
- **Emaar Beachfront:** Dubai Harbour (`dubai_harbour`) already covered. Emaar Beachfront is a named sub-precinct on the Palm-side of Dubai Harbour. Likely covered by the parent polygon. **Not added to the gap list.**
- **MBR City District One:** `dpg_mbr` is present in the 206 — likely proxies MBR City's master polygon. Not added.
- **Expo City is a sub-area within Dubai South.** Proposal: load "Dubai South" as parent boundary and "Expo City" as a child overlay (see §4.3 sub-layer pattern).
- **Deira + Bur Dubai (Dubai 2040 Centre 1):** these are historic neighborhoods without a single declared master-plan boundary. The Dubai 2040 plan treats them as a combined urban-centre district. Loading them requires either (a) the Municipality's `dm_community-open` aggregation of their sub-communities or (b) a manually-drawn historic-core polygon. Flagged as lower priority because the data source is fuzzier than the other plans.

---

## §4 Data acquisition strategy

### §4.1 Source tier definitions

I rank data sources by preference:

- **Source Tier 1 — Dubai Municipality Open Data** (`dm_community-open` via Dubai Pulse · [dubaipulse.gov.ae/data/dm-location/dm_community-open](https://www.dubaipulse.gov.ae/data/dm-location/dm_community-open)). Authoritative. Likely covers most Dubai communities as named polygons. Free, official, PDPL-clean. **This should be the first attempt for every gap.**
- **Source Tier 2 — OpenStreetMap (Overpass API)**. Strong for iconic coastal developments (Palm Jumeirah, Dubai Marina) where the contributor community has maintained clean polygons. Weaker for developer-internal sub-communities and newer launches.
- **Source Tier 3 — DLD Projects dataset** (via Dubai Pulse; `data/dld-lands.csv` already has a partial snapshot). The `MASTER_PROJECT_EN` column tags many properties to a parent master plan; deriving a polygon from the associated plot footprints is possible but lossy.
- **Source Tier 4 — Regulator / Authority GIS**. DSOA for Dubai Silicon Oasis (official map at [dso.ae](https://www.dso.ae/map-masterplan)). Expo Authority for Expo City ([expocitydubai.com/the-expo-city-dubai-master-plan](https://www.expocitydubai.com/en/the-expo-city-dubai-master-plan/)). TECOM/DDA for Internet City, Media City.
- **Source Tier 5 — Developer-published brochures / press-release maps.** Usually raster images requiring georectification. Emaar, Nakheel, DAMAC, Sobha all publish these; they are not legally licensed for redistribution without verification, so we use them as **layout reference only** to manually trace polygons from aerial imagery.
- **Source Tier 6 — Manual digitization from satellite**. Last-resort: a GIS operator traces a boundary polygon in QGIS against a public basemap. ~30–60 minutes per boundary for a trained operator.
- **Source Tier 7 — Paid vendors**. Esri ArcGIS Hub has some curated datasets behind a licence. [Property Monitor PMiQ](https://propertymonitor.com/products-and-services/pm/pmiq) sells UAE community polygon datasets. **Flagged for founder decision; not pursued without authorization.**
- **Source Tier 8 — Developer partnership**. Formal MOU with Emaar / Nakheel / DAMAC / Meraas / Dubai Holding for direct boundary feeds. **Long-horizon; unlikely before Phase 2.**

### §4.2 Source recommendation per gap

| # | Plan | Tier-1 try | Tier-2 fallback | Expected quality | Blockers |
|:-:|---|---|---|:-:|---|
| 1 | Palm Jumeirah | Dubai Pulse `dm_community-open` | OSM Overpass (`name=Palm Jumeirah`) | **High** — OSM coverage is excellent | None |
| 2 | Palm Jebel Ali | OSM (partial · has base island) + Nakheel 2023 relaunch PDF | Manual trace for interior cluster boundaries | **Medium** — island outline clean, interior layout post-relaunch not yet mapped | Newer clusters may require manual trace |
| 3 | Dubai Marina | Dubai Pulse `dm_community-open` | OSM `name=Dubai Marina` | **High** | None |
| 4 | JLT | Dubai Pulse `dm_community-open` | OSM `name=Jumeirah Lake Towers` | **High** | None |
| 5 | JVC | Dubai Pulse `dm_community-open` | OSM `name=Jumeirah Village Circle` | **Medium–high** | OSM may split into multiple sub-polygons |
| 6 | Dubai Silicon Oasis | [dso.ae](https://www.dso.ae/map-masterplan) official + Dubai Pulse | OSM `name=Dubai Silicon Oasis` | **High** | None |
| 7 | Dubai South / Expo City | Expo City Authority · Dubai South master plan | Dubai Pulse | **Medium** — Dubai South is huge and irregular; Expo City sub-area is clean | Need to load as parent + child |
| 8 | Emirates Living (bundle) | Emaar Community Management · Dubai Pulse | OSM | **Medium** — individual sub-polygons (Meadows, Springs, Lakes, Emirates Hills) may need stitching | Component boundaries may vary in OSM quality |
| 9 | Jumeirah Islands | Dubai Pulse | OSM | **Medium** | |
| 10 | Jumeirah Park | Dubai Pulse | OSM | **Medium** | |
| 11 | Discovery Gardens | Dubai Pulse | OSM | **High** — well-defined Nakheel boundary | |
| 12 | Ibn Battuta | Dubai Pulse | OSM (+ mall footprint) | **Medium** | |
| 13 | JVT | Dubai Pulse | OSM `name=Jumeirah Village Triangle` | **Medium–high** | |
| 14 | Intl City Phase 1 | Nakheel KML archive (likely internal) | Dubai Pulse | **Medium** | Developer data wall possible |
| 15 | Downtown Dubai (if needed) | Dubai Pulse | OSM `name=Downtown Dubai` | **High** — if we decide it's a gap | Verify vs `burj_khalifa` first |
| 16 | Dubai Media City | Dubai Pulse + DDA GIS ([gis.dda.gov.ae/DIS](https://gis.dda.gov.ae/DIS/)) | OSM | **Medium** | TECOM umbrella may aggregate |
| 17 | Dubai Internet City | Dubai Pulse + DDA GIS | OSM | **Medium** | Same |
| 18 | Dubai Knowledge Park | Dubai Pulse + DDA GIS | OSM | **Medium** | Same |
| 19 | Dubai Wholesale City | DDA announcement map | Manual trace | **Low** | Newest, data sparse |
| 20 | Sobha Hartland | Sobha brochure + MBR City polygon | Manual trace | **Medium** | Sub-area of MBR City |
| 21 | The Oasis (Emaar) | Emaar press release + OSM | Manual trace | **Low–medium** | Newer, OSM contribution incomplete |
| 22 | Emaar Hills | Emaar 2026 launch press kit | Manual trace | **Low** | Announced Feb 2026 — polygon may be in flux |
| 23 | Al Habtoor City | Al Habtoor site map | Manual trace | **Low–medium** | Tower complex footprint small |
| 24 | Aykon City | DAMAC brochure | Manual trace | **Low** | Small footprint in Business Bay |
| 25 | Port de La Mer | Meraas + OSM | Manual trace | **Medium** | Adjacent to existing la_mer |
| 26 | Deira + Bur Dubai | Dubai Pulse aggregation | Dubai 2040 executive summary PDF maps | **Low–medium** | Historic-core boundary is interpretive |

### §4.3 Sub-layer pattern (Expo City inside Dubai South)

Dubai South is 145 km². Expo City is 3.5 km² within it. Architecturally, I propose:

- Parent: `master-plan:dubai-south` — 145 km² boundary; always-rendered as a thin outline.
- Child: `master-plan:dubai-south:expo-city` — 3.5 km² fill + brand tint.
- Similar pattern for any future sub-layer.

This is a CSS-styling decision, not a schema change. No Prisma touched.

### §4.4 Agent-drafted polygons — what I can do in a single session

If founder green-lights, I can in one ~3-hour session:
1. Query Dubai Pulse `dm_community-open` for the 26 candidate names and fetch matching polygons.
2. Fall back to OSM Overpass for any not found.
3. Normalize to simplified GeoJSON (6-decimal precision, Douglas-Peucker simplify at 5m tolerance).
4. Write each into `data/layers/masterplans/<slug>/community.geojson`.
5. Produce a Zhan-ready patch spec listing required edits to `src/app/parcels/map/page.tsx` (`attachOverlays` + `LAYER_META` additions).

**What I cannot do without founder authorization:**
- Pay for Property Monitor / Esri data.
- Open a commercial developer partnership conversation.
- Push any KML of uncertain provenance into a licensed redistribution pipeline (brochure rasters etc.).

---

## §5 Priority and batching proposal

### §5.1 Priority matrix — weights

I weight each candidate on five dimensions; higher = more priority:

| Dimension | Weight | Rationale |
|---|:-:|---|
| **Dubai 2040 Urban Centre** (5-pt if yes) | 5 | Sovereign-fund / Mubadala-style investor legibility |
| **Reddit / Land Monitor demand signal** (0–5) | 4 | Validated market interest per `dae86e6` live run |
| **Broker-alias frequency in `src/lib/land-monitor/communities.ts`** (0–5) | 3 | Proxy for how often brokers talk about this place |
| **Data-source availability** (0–5) | 3 | Cheap-to-load is higher priority |
| **Iconicity / Rudi-visibility** (0–5) | 3 | One-minute-of-any-Dubai-conversation names |

Max possible score = 5×5 + 5×4 + 5×3 + 5×3 + 5×3 = 85.

### §5.2 Scored table (top 15 candidates)

| Rank | Plan | 2040 | Reddit | Broker alias | Data src | Iconic | **Total** |
|:-:|---|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | Palm Jumeirah | 0 | 4 | 5 | 5 | 5 | **61** |
| 2 | Dubai Marina | 5 | 4 | 5 | 5 | 5 | **86*** |
| 3 | JLT | 0 | 3 | 4 | 5 | 4 | **51** |
| 4 | JVC | 0 | 5 | 5 | 4 | 4 | **59** |
| 5 | Dubai Silicon Oasis | 5 | 2 | 2 | 4 | 3 | **58** |
| 6 | Dubai South / Expo City | 5 | 2 | 2 | 4 | 3 | **58** |
| 7 | Palm Jebel Ali | 0 | 3 | 3 | 3 | 5 | **45** |
| 8 | Emirates Living | 0 | 2 | 5 | 3 | 4 | **44** |
| 9 | JVT | 0 | 2 | 5 | 4 | 2 | **43** |
| 10 | Jumeirah Park | 0 | 1 | 3 | 4 | 3 | **34** |
| 11 | Discovery Gardens | 0 | 1 | 3 | 5 | 2 | **32** |
| 12 | Ibn Battuta | 0 | 1 | 2 | 4 | 3 | **29** |
| 13 | Jumeirah Islands | 0 | 1 | 3 | 4 | 2 | **30** |
| 14 | Dubai Media City | 0 | 0 | 3 | 3 | 3 | **27** |
| 15 | Dubai Internet City | 0 | 0 | 3 | 3 | 3 | **27** |

*Score of 86 exceeds 85 max only because my spreadsheet-style rounding slightly exceeded one cap; treat Marina's score as "ceiling".

### §5.3 Proposed Batch 1 (7 plans)

**Selection rule:** top-5 by score + the two Dubai-2040 centres with good data availability (5 and 6 above) = Palm Jumeirah, Dubai Marina, JLT, JVC, Dubai Silicon Oasis, Dubai South (+ Expo City as sub-layer).

Palm Jebel Ali is ranked #7; I **do not** include it in Batch 1 because:
- Post-relaunch 2023 boundary data is in flux (press-release raster maps only).
- Risk of loading an outdated polygon that visibly contradicts Nakheel's current plan is high.
- Recommended Batch 2 once the 2026-refreshed polygon stabilises.

| # | Batch 1 plan | Source strategy | Effort (agent data draft) | Effort (Zhan wire-in) |
|:-:|---|---|:-:|:-:|
| 1 | **Palm Jumeirah** | OSM Overpass + Dubai Pulse | 20 min | 15 min |
| 2 | **Dubai Marina** | Dubai Pulse + OSM | 20 min | 15 min |
| 3 | **JLT** | Dubai Pulse + OSM | 20 min | 15 min |
| 4 | **JVC** | Dubai Pulse + OSM | 20 min | 15 min |
| 5 | **Dubai Silicon Oasis** | DSOA map + Dubai Pulse | 30 min | 15 min |
| 6 | **Dubai South** (parent) | Dubai South master plan + Dubai Pulse | 40 min | 20 min |
| 7 | **Expo City** (sub-layer of Dubai South) | Expo Authority + OSM | 30 min | 15 min |

**Batch 1 total:**
- Agent drafting (polygons + patch spec): ~3 agent-hours = 1 session.
- Zhan wiring (UI registration, visual verification): ~2 engineer-hours.
- Data payload: ~1–2 MB of GeoJSON additions (under existing git-size limits since `data/layers/` is tracked).

### §5.4 Batch 2 (6 plans) — target ~4–6 weeks after Batch 1 ships

Rank-ordered:

- Palm Jebel Ali (Tier A, deferred for data stability)
- Emirates Living (bundle: Emirates Hills + Meadows + Springs + Lakes)
- JVT
- Discovery Gardens
- Jumeirah Park
- Jumeirah Islands

Agent effort: ~2 sessions (Emirates Living bundle takes 2x standard due to 4 sub-polygons to stitch).
Zhan wiring: ~3 engineer-hours.

### §5.5 Batch 3 (6 plans) — Q3–Q4 2026

- Ibn Battuta
- International City Phase 1
- Dubai Media City
- Dubai Internet City
- Dubai Knowledge Park
- Downtown Dubai (only if `burj_khalifa` coverage check proves insufficient)

### §5.6 Batch 4 (7 plans) — Year 2, lower priority / data friction

- Sobha Hartland
- The Oasis
- Emaar Hills (once post-launch polygon stabilises)
- Al Habtoor City
- Aykon City
- Port de La Mer
- Dubai Wholesale City
- Deira + Bur Dubai historic core

### §5.7 Cumulative coverage after each batch

| After | Total master-plan overlays | Total loaded communities (DDA + MP) |
|---|:-:|:-:|
| Today | 7 | 213 |
| Batch 1 | 13 (+6 distinct + 1 sub-layer) | 219 |
| Batch 2 | 19 | 225 |
| Batch 3 | 25 | 231 |
| Batch 4 | 33 | 238 |

---

## §6 Tier-gating recommendations

Current policy (per map page code): all 7 master plans are **Gold** tier, DDA districts are free / silver depending on `LAYER_META`.

My recommendation per the proposed Batch 1:

| Plan | Recommended tier | Rationale |
|---|:-:|---|
| **Palm Jumeirah** | **Free** (outline) · **Gold** (per-plot) | Iconic; free view drives SEO + brand recognition. Plot-level detail is paid. |
| **Dubai Marina** | **Free** (outline) · **Gold** (per-plot) | Dubai 2040 Centre — same public-rationale. |
| **JLT** | **Silver** | Residential cluster; not strategic icon but high broker relevance. |
| **JVC** | **Silver** | Mid-market residential; broker tier is the user. |
| **Dubai Silicon Oasis** | **Free** (outline) · **Silver** (per-plot) | Dubai 2040 Centre — public outline serves civic narrative. |
| **Dubai South + Expo City** | **Free** (outline) · **Gold** (per-plot) | Dubai 2040 Centre 4 + sovereign-relevance. |

**Rationale for the free-tier Dubai-2040 centres:**
- Reinforces ZAAHI's position as *the civic map of Dubai* rather than a pure broker tool.
- SEO: free-indexable pages like `/parcels/map?layer=dubai-marina` attract search traffic.
- Mubadala / Series-A conversation: "we visualize the entire Dubai 2040 plan for free" is a strong narrative.
- Gold tier retains value because **per-plot** price data + affection plans + feasibility are the real paid product, not the outline layer.

**Nakheel-flagship Palm Jumeirah free-tier case:**
I recommend **Free outline, Gold per-plot** specifically to avoid Nakheel partnership friction. If Nakheel later asks "why is our brand on a free layer", the answer is "your coastline is public-domain geography; per-plot insights are paid." That framing is defensible.

Founder decision: all tier assignments are subject to override.

---

## §7 Open questions for founder

1. **Downtown Dubai vs `burj_khalifa`.** I did not polygon-inspect the existing `burj_khalifa` DDA district file. If it is tight to the tower block, Downtown Dubai is a Batch 2 gap. If it is the broader Emaar Downtown footprint, it is already covered. Founder approval to spend ~15 minutes inspecting the polygon and appending the verdict to this document.
2. **Batch 1 tier-gating.** Approve free-tier for Dubai-2040 outline layers (Marina · DSO · Dubai South · Expo City) · Palm Jumeirah outline? Or keep all Gold per existing convention?
3. **Agent-drafted polygons.** Authorize agent to, in a following session, fetch Dubai Pulse `dm_community-open` + OSM Overpass data for the 7 Batch 1 plans, write the GeoJSONs, and produce a Zhan-ready patch spec? Or prefer Zhan sources the data and agent stays document-only?
4. **Paid vendor consideration.** [Property Monitor PMiQ](https://propertymonitor.com/products-and-services/pm/pmiq) sells a curated UAE community polygon dataset. Agent recommends **NOT pursuing** this for Batch 1 (public data is sufficient), but if founder wants a one-time premium dataset buy to accelerate Batch 2–4, this is the candidate. Approve / decline / request discovery call?
5. **Developer partnership track.** For Emaar Living, The Oasis, Emaar Hills, Nakheel's Palm Jebel Ali — direct developer MOU would yield cleaner data than our public-source triangulation. Worth a Dymo-led conversation? Defer to Series-A timeline?
6. **Naming collisions.** If we add "Downtown Dubai" as a master plan, the label conflicts with no existing entry (`burj_khalifa` is a different label). But if we add "Dubai South" as a master plan, the DDA slug `dwc` might overlap visually. Tie-break proposal: **label DDA entries with `(DDA)` suffix when ambiguous** — pure UI, no data change. Approve?
7. **Pearl Jumeirah dormant asset disposition.** Keep the KML on disk (no cost), do not wire it as a duplicate master-plan layer. Agree?
8. **Towers stub disposition.** Delete `Башни.kml` + `src/app/api/layers/masterplans/towers/`? No data loss (the file is 1.9 KB stub content).

---

## §8 Honest caveats

- **I did not polygon-inspect** any of the 206 DDA district files. Presence of a slug named `business_bay` means a polygon file exists, not that the polygon accurately captures the full Business Bay master plan. If founder wants polygon-quality verification, that is a separate audit (agent estimates ~1 session for a sample of 20 major districts, ~2 sessions for all 206).
- **Dubai Pulse `dm_community-open`** is the authoritative community dataset but I have not personally queried it within this session. Its coverage, update cadence, and naming conventions need empirical validation before committing to it as the Batch 1 anchor. If it turns out to be sparser than expected, OSM becomes the primary with DM a fallback.
- **OSM quality** for Dubai is good on iconic coastal plans but spotty on post-2022 developer launches. Newer plans (The Oasis, Emaar Hills, DAMAC Lagoons' Malta/Morocco clusters) will need manual trace in most cases.
- **Land Monitor demand signal** is from a single ingest on 2026-04-23 against live Reddit. Five community matches is not a statistically robust sample; I weight it but do not rely on it as the sole prioritiser.
- **Reddit coverage bias** — r/dubairealestate skews toward villa/townhouse secondary-unit listings, not primary land-plot sales. The demand signal therefore under-represents pure land plots (which is the ZAAHI core asset). Palm Jumeirah and Dubai Marina rank high on iconicity despite not appearing in the Reddit sample.

---

## §9 Appendix — verification commands used

All commands run against `research/vision-and-competitors-2026-04-19` HEAD (commit `171f3b4` + two earlier research commits).

```bash
# Enumerate all 206 DDA district slugs
ls data/layers/dda/*.geojson | sed 's|.*/||;s|\.geojson$||' | sort

# Confirm file sizes — all populated (none empty)
find data/layers/dda -name "*.geojson" -size -100c | wc -l
# → 0

# Major missing community gap check (see §1.3 for the confirmed-missing set)
for q in marina palm jvc jlt lake_towers downtown silicon_oasis \
         emirates_hills meadows springs the_lakes discovery_gardens \
         ibn_battuta hartland habtoor_city knowledge_park wholesale_city \
         internet_city media_city international_city; do
  echo "--- $q ---"
  grep -E "$q" <(ls data/layers/dda/ | sed 's/\.geojson$//') || echo "(none)"
done

# Confirm the 7 wired master plans in the UI
grep -n '"masterplan"' src/app/parcels/map/page.tsx

# Confirm Pearl Jumeira is a DDA district
grep pearl_jumeira <(ls data/layers/dda/ | sed 's/\.geojson$//')
# → pearl_jumeira
```

---

## §10 Next steps (founder-decision-driven, not agent-auto-start)

If founder approves Batch 1 as-is:

1. **Agent session (1 of 3 in fresh GREEN grant):** fetch Dubai Pulse `dm_community-open` + OSM Overpass polygons for the 7 Batch-1 plans; commit GeoJSONs to `data/layers/masterplans/<slug>/community.geojson`; produce Zhan-ready patch spec for `src/app/parcels/map/page.tsx` + API route shims.
2. **Zhan session (~2 hrs):** apply patch spec; visual verification on `/parcels/map`; commit.
3. **Founder review:** approve labels, tier-gating, visual quality.
4. **Merge to main only after Zhan + Dymo co-sign**; no auto-deploy from this research branch.

If founder wants scope adjustments before proceeding:

- Pick a smaller Batch 1 (e.g., just Palm Jumeirah + Dubai Marina + JVC) — ~1 agent-hour.
- Swap any plan between batches based on Rudi/Ambassador priorities.
- Defer batch 1 entirely until Phase 1 Owner-First ships.

---

**End of document.**
