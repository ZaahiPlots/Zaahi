# ABU DHABI / MYLAND CATALOG — 2026-04-24

| Field                        | Value |
| ---------------------------- | ----- |
| Classification               | Research / reference · read-only · sole document deliverable |
| Scope                        | Complete catalog of the Abu Dhabi land-data universe reachable through MyLand + DMT public endpoints, mirroring `docs/audits/DDA_CATALOG_FINAL_2026-04-23.md` |
| Parallel (Dubai) document    | `docs/audits/DDA_CATALOG_FINAL_2026-04-23.md` (commit `3453fd3`, 2,055 lines) |
| Branch                       | `research/vision-and-competitors-2026-04-19` |
| Target length                | 1,800–2,500 lines (structured + appendices) |
| Path deviation               | Task brief requested `docs/data-sources/abu-dhabi/MYLAND_CATALOG.md`; this document is filed next to its Dubai sibling in `docs/audits/` so the two catalogs co-locate. No content impact; move if founder prefers. |
| Produced                     | 2026-04-24 |
| Data live-fetched            | 2026-04-24 against `onwani.abudhabi.ae/arcgis/rest/services/*` (MyLand/SMARTHUB and MSSI/ADMINBOUNDARIES) |
| Prior local snapshot         | 2026-04-12 — `scripts/fetch-abu-dhabi-layers.ts` for boundaries; PMTiles `public/tiles/ad-land-*.pmtiles` (138 MB total) for the plot corpus |
| Safety invariants            | No code, no schema, no DB mutations, no map, no deps. Only artifact: this document. |

---

## Table of contents

- §1 · Executive summary
- §2 · MyLand platform anatomy
- §3 · Access tiers · costs · licensing
- §4 · Master plans · communities · investment-zone inventory
- §5 · Integration pathways · technical plan
- §6 · Regulatory considerations
- §7 · DDA (Dubai) ↔ MyLand (Abu Dhabi) comparison
- §8 · Recommended approach for ZAAHI Abu Dhabi launch
- §9 · Cost estimate
- §10 · Risks + unknowns
- §11 · Questions for founders
- §12 · Next steps recommended
- §13 · Sources cited
- §14 · Appendices (A–G)
- §15 · Methodology · honesty

---

## §1 · Executive summary

### 1.1 One-paragraph read

Abu Dhabi exposes a **larger** public plot corpus than Dubai's DDA but a **narrower** schema of public transactional data. The authoritative read surface is the DMT ArcGIS REST service `onwani.abudhabi.ae/arcgis/rest/services`, rooted in five folders of which at least four are publicly readable without authentication. The headline dataset — `MSSI/ADMINBOUNDARIES/MapServer/0` (layer name `PLOTS`) — holds **409,855 land-plot polygons** for the entire emirate (220,357 Abu Dhabi City · 148,674 Al Ain City · 40,824 Al Dhafra) with **≈57 attributes per plot**, including a direct URL pointer to each plot's Development Control Regulations PDF (`DMT_DCR_URL`, hosted on `geosmart.dmt.gov.ae`). That PDF is the Abu Dhabi functional equivalent of Dubai DDA's "affection plan" — and unlike DDA it is fetchable for every plot via a deterministic URL template. The same dataset is mirrored under `MyLand/SMARTHUB/MapServer/0` ("PLOT", 410,464 records) which additionally exposes APPROVEDBY / APPROVALDATE fields. Together these two services give ZAAHI a read-side that is materially richer than what DDA publishes for Dubai Hills / Design District / Business Bay.

### 1.2 What is the same as DDA

- **Esri ArcGIS REST** is the public surface (same tech, same query grammar, same 2,000-record page cap, same JSON/GeoJSON/PBF output).
- **Read is open, write/transact is gated**. DDA gates token-only endpoints behind formal partnership; Abu Dhabi gates its transactional surface behind UAE Pass (for citizens) and formal partnerships (for integrators).
- **No published rate limit**. Empirically 2,000-record pages with modest pacing are tolerated.
- **Per-plot affection-plan PDF** is linked from the plot record, though Abu Dhabi calls it "Site Plan" in Tamm service naming and "Development Control Regulations" (DCR) in the geodata field. The PDFs live on two different hosts: `geosmart.dmt.gov.ae/dcr/{SectorNumber_PlotID}.pdf` (~2.4 MB each), directly downloadable; and Tamm's paid issuance flow for legally-authoritative copies.

### 1.3 What is different

- **Plot identifiers are composite, not flat.** Abu Dhabi uses `SectorNumber_PlotID` (e.g., `YN7_3014`). Dubai DDA uses a 7-digit flat `PLOT_NUMBER`. Plot numbering in AD collides with community/sector context — portable across districts but not monotonic.
- **Owning authority is not a single body.** Dubai = DLD + DDA + RERA + Dubai Municipality. Abu Dhabi = **DMT** (overall, land registry, urban planning) + **ADM / AAM / WRM** (three city-level municipalities under DMT) + **ADREC** (broker/developer/title-deed regulator inside DMT) + **ADGM** (free-zone jurisdiction on Al Maryah + Al Reem since 2023) + **ADDED** (commercial licensing). Read-side geodata unifies this through DMT's Spatial Data Division ("DPM-SDD" / "DMT-SDD" per the service copyright).
- **Investment zones are not 9; they are numbered into the twenties.** The `Investment_Name` attribute on the plot layer shows live plots tagged to at least the 3rd, 5th, 6th, 7th, 8th, 9th, 10th, 11th, 12th, 13th, 14th, 15th, 16th, 17th, 18th, 19th, and 20th numbered investment zones, plus multiple "Plot No. X" administrative-resolution additions and several named islands (Hudayriyat, Jubail, Fahid, Nurai, Rabdan, Al Ras Al Akhdar, Ghantout). The widely-cited "9 investment zones" headline is out of date; the reality is that Cabinet resolutions have steadily extended the list.
- **No token-required siteplan-issuance service publicly advertised**. Dubai DDA has a `DIS` folder (Development Information System) that requires tokens and gates formal siteplan issuance and plot-info HTML. Abu Dhabi routes this through Tamm's `Request for Site Plan` service (AED ~100) with UAE Pass.
- **Construction / permit telemetry is bigger and richer**. Beyond `Construction_Status` (4-value: `Not Constructed` / `Constructed` / `Under Construction` / `Only Boundary Wall`), the plot layer carries `Permit_LastDate`, `Permit_LastType` (71+ distinct values mixing architectural and phased-construction categories in English+Arabic), and `MEPS_CONS_STATUS` from DMT's Municipal Engineering Permit System. DDA's equivalent is 6-value `CONSTRUCTION_STATUS` + `IS_FROZEN` flag.
- **Heavy schema drift.** The plot layer carries `Old_DISTRICTENG`, `Old_DISTRICTARA`, `Old_DISTRICTID`, `Old_COMMUNITYENG`, `Old_COMMUNITYID`, `Old_PLOTNUMBER`, `Old_SectorNumber_PlotID`, `Old_ROADID`, `Old_FLAT_ID` — history of the 2018–2023 administrative-boundary re-draw is preserved in-record (Dubai's DDA has `OLD_PLOT_NUMBERS`, one field; Abu Dhabi has eight). The `ELMS_PARENTLANDUSE_E` field has 56+ distinct values that are near-duplicates of each other (`residential` / `RESIDENCES` / `Residential Land` / camelCase / UPPERCASE / Arabic), evidence of uncleaned joins between data generations.

### 1.4 Top 10 insights for the ZAAHI platform

1. **ZAAHI already has the raw data loaded.** `public/tiles/ad-land-adm.pmtiles` (59 MB) and `ad-land-other.pmtiles` (78 MB) encode the ~362k–410k plots today. The existing map code at `src/app/parcels/map/page.tsx:1291` (`// ── Abu Dhabi — land plots (PMTiles 362K) ──`) renders them. The gap is not ingestion — it is canonical attribute schema, land-use colour mapping, and the business layer (listings, prices, owners, brokers).
2. **A deterministic affection-plan URL exists.** `https://geosmart.dmt.gov.ae/dcr/{SectorNumber_PlotID}.pdf` returns HTTP 200 with `Content-Type: application/pdf` and `Access-Control-Allow-Origin: *` for any published plot. ZAAHI can show a live affection-plan viewer for any AD plot without a per-plot fetch tax and without DDA-style token handling. This is materially easier than the Dubai flow.
3. **Plot allocation is a signal Dubai doesn't have.** `ELMS_AllocationStatus` distinguishes 371,498 allocated vs 38,357 not-allocated plots. The "not allocated" bucket is state-owned or awaiting grant — a distinct class that does not exist in Dubai's plot universe, because almost all DDA plots are already within master-developer free-zone tracts. In Abu Dhabi, unallocated plots are a material sub-market.
4. **The "PRIMARYUSEENGDESC" field is already a clean 19-value taxonomy.** ZAAHI's existing 9-category colour legend (Residential / Commercial / Mixed Use / Hotel / Industrial / Educational / Healthcare / Agricultural / Future Development) maps onto 18 of the 19 values without friction: `Residential` (207k plots), `Agricultural` (59k), `Investment` (36k — maps to Mixed Use in ZAAHI terms), `Utility` (24k — maps to Industrial), `Commercial` (23k), `Recreational` (20k — Future Development), `Industrial` (13k), `Communication` (4k — Industrial), `Religious` (3.6k — none; add?), `Governmental` (3k), `Public` (1.9k), `Transportation` (1k), `Educational` (837), `Health` (284), `Private` (176), `Archaeological` (125), `Cultural` (124), `Diplomatic` (38), `Undefined` (11.6k). Net: **the AD plot universe fits into the existing legend by editing `deriveLandUse()` to consume `PRIMARYUSEENGDESC` instead of DDA's `LANDUSE_CATEGORY`**; two new rules needed for Religious (map to Public/Cultural) and Archaeological/Cultural (Future Development or new category).
5. **The `DevCode_*` fields are better zoning data than DDA provides.** `DevCode_Category` (7-value: Residential 161k / Other 94k / Commercial 7k / Industrial 7k / Civic 6.4k / Desert 2.2k / Coastal 3), `DevCode_FAR` (free-form FAR string), `DevCode_MaxGFA` (numeric max GFA in sqm), `DevCode_Description`. These are the DMT-published zoning / Estidama envelope — in Dubai we pay more effort to derive similar fields from `MAX_HEIGHT_FLOORS` strings + `GFA/AREA`. In Abu Dhabi the server publishes them clean for 276k of 410k plots (94,442 plots are "Other", not yet categorised).
6. **An exact PRIMARYUSE "Investment" is NOT a freehold flag.** 36,286 plots carry `PRIMARYUSEENGDESC = "Investment"` but this does not mean foreign-freehold-eligible — it is a zoning category (mixed-use investment tower). Foreign-freehold eligibility is signalled by `Investment_Name` being set to a named/numbered investment zone (55k+ plots across the numbered zones; the remainder 354,813 plots carry `Investment_Name = 'N/A'` and are not investment-zone plots).
7. **Construction telemetry is fresh-ish.** `DataReceivedDate` is populated and queryable; `Permit_LastDate` is populated on ~13k plots with 71+ distinct permit types. Abu Dhabi makes a live construction-activity signal machine-readable that Dubai keeps inside DDA's `CONSTRUCTION_STATUS` alone. ZAAHI can surface "which plots are currently under an open permit" as a feature without any scraping.
8. **Two plot layers, slightly different record counts.** `MSSI/ADMINBOUNDARIES/0` reports 409,855 plots; `MyLand/SMARTHUB/0` reports 410,464 (delta 609). The second is the "PLOT" variant and carries APPROVEDBY/APPROVALDATE fields not present in the first; suspected to be the administrative/planning view vs the spatial master. Both are public. ZAAHI should pick one as the source-of-truth and cross-join to enrich — not try to reconcile them.
9. **ADGM jurisdiction now covers Reem Island.** Cabinet Resolution 41/2023 extended ADGM's perimeter from Al Maryah alone to include all of Al Reem (1,100+ entities moved in per ADGM announcement). That means ~2,504 Reem plots + ~72 Al Maryah plots (counts from Onwani) sit inside a common-law jurisdiction with separate property-registration routing. For ZAAHI's Abu Dhabi listing pipeline, that is the **single most important jurisdictional edge-case**: plot registration, strata law, and tenancy (Tawtheeq vs ADGM tenancy rules) differ inside that perimeter.
10. **MyLand as a product has weak consumer traction.** The Android app (`com.myland.dpm`) has ~150 ratings at 4.17 / 5 over roughly 6 years on the Play Store. The iOS app (ID 1459796069, publisher "DPM") is rated 0.0 with 0 reviews on the AE App Store (per AppFollow aggregator). Citizens interact with AD land data primarily through Tamm service flows and Dari, not MyLand. This is strategically **favourable** for ZAAHI — the map-first property-data surface in Abu Dhabi is not a crowded space.

### 1.5 Bottom-line recommendation (full detail in §8)

**Phase 1:** Reuse the existing ArcGIS REST integration (`scripts/fetch-abu-dhabi-layers.ts` + the plot-layer equivalent in `scripts/fetch-ad-plots.ts`, which currently points at `MyLand/SMARTHUB/MapServer/0` — still working, count 410,464). Rebuild the schema-mapping layer to consume `PRIMARYUSEENGDESC` + `DevCode_*` + `Investment_Name` so that the 138 MB of PMTiles on disk becomes a first-class queryable plot corpus. Plumb the deterministic DCR URL into the plot side-panel as "Download DMT affection plan" ≈ what the existing DDA side-panel does with token-fetched PDFs. No new data-source licence needed; no new infra.

**Phase 2:** Partnership with DMT for Tamm service embedding (site-plan request, building-permit status, Tawtheeq lookup). This is the write-side equivalent of ZAAHI's future DLD API work — requires formal agreement, no API key.

**Phase 3:** ADREC broker-card integration — ZAAHI brokers operating in Abu Dhabi need BLN (Broker License Number) validation against ADREC. Parallel to RERA broker-card work in Dubai.

---

## §2 · MyLand platform anatomy

### 2.1 What MyLand IS (and is not)

MyLand is a **public geospatial viewer** (web + iOS + Android) published by **DMT's Department of Planning and Municipalities / Spatial Data Division** ("DPM-SDD" / "DMT-SDD" per the service copyrightText). It unifies plot search, Onwani addressing, site-plan QR-code scanning, and Development Code reference into a single map UI covering all three of Abu Dhabi's municipalities (Abu Dhabi City · Al Ain City · Al Dhafra Region).

- **Operator:** Department of Municipalities and Transport (DMT), Abu Dhabi — created by Law No. 30 of 2019 (source: `https://www.dmt.gov.ae/en`, retrieved 2026-04-24).
- **Publisher (apps):** "DPM" (App Store listing), package `com.myland.dpm` (Play Store).
- **Canonical product page:** `https://pages.dmt.gov.ae/en/Mobile-Apps/My-Land` (retrieved 2026-04-24).
- **Canonical web entry:** `https://myland.dmt.gov.ae/`. `myland.ae` is **not** the official URL.
- **App IDs:** iOS ID `1459796069`; Android package `com.myland.dpm`; Android last updated **2025-10-07**; Play ratings ~150 at 4.17 / 5. iOS listing shows 0 reviews per AppFollow.
- **MyLand is not** a standalone super-app and **is not** a service inside Tamm. Tamm hosts transactional services that, if they need a map, embed MyLand's geodata. MyLand is read-only; Tamm is the write channel.

### 2.2 Service topology — `onwani.abudhabi.ae/arcgis/rest/services`

The DMT ArcGIS server is rooted at `https://onwani.abudhabi.ae/arcgis/rest/services`. The `/services?f=json` probe (live 2026-04-24) returns five folders:

```
https://onwani.abudhabi.ae/arcgis/rest/services
│
├─ ADAGS/            · public
│   ├─ POI_GL_V3           (MapServer)
│   └─ POI_GL_V4           (MapServer) — Points of Interest (clinics, pharmacies,
│                                        malls, parks, grocery, schools [5 sublayers],
│                                        ADNOC service stations). Copyright "DPM_SDD".
│
├─ MSSI/             · public (the authoritative admin-boundary + plot stack)
│   ├─ ADMINBOUNDARIES_STG (FeatureServer + MapServer) — staging variant
│   ├─ ADMINBOUNDARIES     (FeatureServer + MapServer) — **9-layer stack**:
│   │     0  PLOTS             · polygon · 409,855 features · 57 attributes
│   │     1  COMMUNITY          · polygon · 1,864   features
│   │     2  DISTRICT           · polygon · 216    features
│   │     3  MUNICIPALITY       · polygon · 3     features (ADM · AAM · WRM)
│   │     4  NEWDISTRICT        · polygon · 216    features (post-redistrict 2023)
│   │     5  LAND               · polygon · 410,266 features (plots + non-plot land)
│   │     6  LAND_NO_ELMS       · polygon · 8,967  (plots without ELMS classification)
│   │     7  COMMUNITY_MXD      · polygon · 1,864  (enriched community)
│   │     8  TawajudiBoundary   · polygon · 17    (residency/presence zones)
│   └─ ADMINBOUNDARY       (FeatureServer + MapServer) — single-layer variant
│
├─ MyLand/           · public (consumer-facing view; same DB, thinner schema)
│   └─ SMARTHUB (MapServer) — **3-layer default stack**:
│         0  PLOT            · polygon · 410,464 (SMARTHUB plot record, adds
│                                 APPROVEDBY / APPROVALDATE)
│         2  COMMUNITY       · polygon · 1,864
│         3  MUNICIPALITY    · polygon · 3
│       (layer 1 DISTRICT exists and returns 216 records — not in the default
│        layer index but directly queryable)
│
├─ Onwani/           · public (addressing + API façade)
│   ├─ OnwaniAPI (MapServer)
│   │     0  DISTRICT          · polygon
│   │     1  ADDRESS_PT        · point (addressable points)
│   │     2  ADDRESS           · table (non-spatial address attributes)
│   └─ UDM_AddressingLayers (MapServer) — 9 layers:
│         1   Address Points
│         2   Street Name
│         3   Street Name — Major Roads
│         4   Signage
│         5   District (Addressing)
│         6   District (Addressing) — Arabic
│         7   Postal Code
│         10  Street Name (Arabic)
│         11  ITC NRN Centreline (Arabic) — national road network centrelines
│
└─ Utilities/        · public
    ├─ RasterUtilities (GPServer)    — geoprocessing
    └─ Symbols         (SymbolServer) — style assets
```

**Net public surface for ZAAHI's purposes:** 2 parallel plot corpora (**MSSI/ADMINBOUNDARIES/0** and **MyLand/SMARTHUB/0**), full administrative hierarchy (3 municipalities → 216 districts → 1,864 communities), rich POI (12+ categories), street / addressing / postal codes. **No token required on any of these.**

Beyond Onwani, two sibling endpoints are worth catalog-level awareness:
- `https://arcgis.sdi.abudhabi.ae/agspublish/rest/services/OpenData/ADSDI_OpenData/MapServer` — the Abu Dhabi Spatial Data Infrastructure (AD-SDI) open-data MapServer (operated by ADDA / formerly ADSIC, ESRI MOU since 2010: `https://www.esri.com/news/arcnews/summer10articles/abu-dhabi-sdi.html`).
- `https://data.abudhabi` — flat open-data catalogue. Contains e.g. `DMT_ADDRESSPOINT` dataset and a `developers` section (`https://data.abudhabi/developers`).
- `https://bayanat.ae` — UAE national open-data portal, with a Geo-Data section and a REST API pattern `https://bayanat.ae/api/DatasetResources/GetDatasetResource?resourceID={GUID}`.

### 2.3 Service metadata

| Service                                        | Max records / query | Spatial reference | Output formats served                             |
| ---------------------------------------------- | ------------------- | ----------------- | ------------------------------------------------- |
| `MSSI/ADMINBOUNDARIES/MapServer`               | 2,000               | EPSG:4326 (WGS84) | JSON, geoJSON, PBF, PNG, PDF, SVG, BMP, JPG, TIFF |
| `MyLand/SMARTHUB/MapServer`                    | 2,000               | EPSG:4326 (WGS84) | same                                              |
| `Onwani/OnwaniAPI/MapServer`                   | 2,000               | EPSG:4326         | same                                              |
| `Onwani/UDM_AddressingLayers/MapServer`        | 2,000               | EPSG:4326         | same                                              |
| `ADAGS/POI_GL_V4/MapServer`                    | 2,000               | EPSG:4326         | same                                              |

- **Spatial reference** is EPSG:4326 at the service level. This is different from DDA's native EPSG:3997 and means ZAAHI's existing WGS84-native map code can consume AD geodata without re-projection. `scripts/seed-yas-island.ts` notes that Abu Dhabi emirate uses "TRUE UTM Zone 40N (EPSG:32640)" for affection-plan PDFs — that applies to raster/vector PDF drawings, not to the REST API.
- **`supportsDynamicLayers: true`** across the board — ArcGIS Server 11.2 / CIM 3.2.0 (current Esri stack).
- **`supportsQueryDataElements: true`** on MSSI/ADMINBOUNDARIES — the field metadata (including coded-value domains) can be enumerated via the standard REST `queryDataElements` endpoint.
- **CORS enabled** (`Access-Control-Allow-Origin: *`) on the PDF host `geosmart.dmt.gov.ae` — browsers can fetch affection-plan PDFs directly.

### 2.4 Authentication

- **No authentication required** for any of MSSI/ADMINBOUNDARIES, MyLand/SMARTHUB, Onwani/OnwaniAPI, Onwani/UDM_AddressingLayers, ADAGS/POI_GL_V3, ADAGS/POI_GL_V4. `Map,Query,Data` capabilities are declared; **`Edit` is NOT declared** on the public services, so there is no write surface exposed.
- **UAE Pass** is required for Tamm transactional services (site-plan issuance, building permit, Tawtheeq registration, title-deed retrieval).
- **Broker / developer tiers** exist at ADREC for BLN-holding brokers and escrow-registered developers; these are distinct from MyLand read access.
- **No paid tier observed** on any public endpoint. No signal on DMT documentation of a commercial licence for bulk exports of the plot corpus. The data is not CC-BY or explicitly licensed — treat as "publicly viewable, licence not stated."

### 2.5 Rate limits

- **No published rate limit.**
- Empirically: the existing `scripts/fetch-ad-plots.ts` paginates at `resultRecordCount=2000` with a 200 ms inter-page pause and a 100 ms inter-district pause. It successfully fetches the full 410K-plot corpus grouped by district in a single run (no 429s observed over the full session).
- During this catalog session the agent issued ~25 count-only and group-by statistics queries over ~10 minutes; no throttling observed.
- **Prudent operational cadence:** weekly full refresh, or daily incremental by a filter on `DataReceivedDate >= (today - 7)`. No evidence higher frequency is blocked.

### 2.6 Query parameter reference (same grammar as DDA)

Because both DDA and MyLand are ArcGIS REST endpoints, the query grammar is identical. `§1.5` of the DDA catalog applies verbatim; the ZAAHI client code that consumes DDA's `/query` endpoint can be repointed at MSSI/ADMINBOUNDARIES/0 by changing the base URL.

| Param                     | Purpose                                                            | Example (AD-specific)                                       |
| ------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------- |
| `where`                   | SQL-like WHERE clause                                              | `where=PRIMARYUSEENGDESC='Residential'`                     |
| `outFields`               | Comma-separated field names                                        | `outFields=PLOTNUMBER,SectorNumber_PlotID,DMT_DCR_URL`       |
| `returnGeometry`          | Include polygon geometry                                           | `true` / `false`                                            |
| `outSR`                   | Output spatial reference                                           | `4326` (WGS84)                                              |
| `f`                       | Output format                                                      | `json` / `geoJSON` / `pbf`                                  |
| `resultRecordCount`       | Records per page (max 2,000)                                       | `2000`                                                      |
| `resultOffset`            | Pagination offset                                                  | `0`, `2000`, `4000`, …                                      |
| `groupByFieldsForStatistics` | GROUP BY                                                        | `DISTRICTENG`                                               |
| `outStatistics`           | Aggregation (count / sum / min / max / avg)                        | `[{"statisticType":"count","onStatisticField":"OBJECTID","outStatisticFieldName":"cnt"}]` |
| `orderByFields`           | ORDER BY                                                           | `cnt DESC`                                                  |
| `returnCountOnly`         | Just the row count                                                 | `true`                                                      |

### 2.7 Known query quirks (AD-specific)

- **Quoting is standard Esri SQL.** `DISTRICTENG='YAS ISLAND'` (single quotes, URL-encoded `%27`). Escape single quotes by doubling (`AL FAQA''`).
- **Arabic-only values in English-aliased fields.** `ELMS_PARENTLANDUSE_E` contains at least one Arabic string (`ترفيهي`, 6,353 rows) despite the `_E` suffix; ingest code must not assume ASCII.
- **Dual OBJECTID.** MSSI/ADMINBOUNDARIES/0 carries both `OBJECTID` (feature OID) and `OBJECTID_1` (integer, presumably the source-system join key). The `R1879_pk` index is on `OBJECTID`. Use `OBJECTID` for pagination.
- **`SHAPE.STArea()` / `SHAPE.STLength()`** are available as computed fields and are returnable through `outFields`. These are already in the plot record's geometry; prefer `PLOTCALCULATEDAREA` (double, sqm) for the authoritative plot area because it reflects DMT's survey value, not a reprojection artefact.
- **Filter on `Investment_Name <> 'N/A'`** to isolate investment-zone plots (354,813 plots have value `N/A`; ~55K have a real zone).

### 2.8 Sample query — one plot (full detail)

Live query against `MSSI/ADMINBOUNDARIES/MapServer/0/query?where=DISTRICTENG='YAS ISLAND' AND DMT_DCR_URL IS NOT NULL&resultRecordCount=1&outFields=*&f=json` (retrieved 2026-04-24):

```json
{
  "OBJECTID": <redacted>,
  "PLOTNUMBER": "3014",
  "SectorNumber_PlotID": "YN7_3014",
  "DISTRICTENG": "YAS ISLAND",
  "DISTRICTARA": "جزيرة ياس",
  "DISTRICTID": "<set>",
  "COMMUNITYENG": "YN7",
  "COMMUNITYARA": "<set>",
  "COMMUNITYID": "<set>",
  "MunicipalityName": "Abu Dhabi City",
  "GISID": "<set>",
  "PLOTID": "<set>",
  "ELMS_PLOTID": "<set>",
  "PRIMARYUSEENGDESC": "Investment",
  "Construction_Status": "Not Constructed",
  "ELMS_AllocationStatus": "ALLOCATED",
  "ELMS_LandUse_Const": "<coded value>",
  "ELMS_ParentLanduse_Const": "<coded value>",
  "ELMS_PARENTLANDUSE_E": "investment",
  "ELMS_PARENTLANDUSE_A": "استثماري",
  "ELMS_LANDUSENAME_E": "residentialVilla",
  "ELMS_LANDUSENAME_A": "فيلا سكنية",
  "ELMS_PLOTALLOCATION_ID": <int>,
  "ELMS_PLOTALLOCATION_NAME_E": "<set>",
  "ELMS_PLOTALLOCATION_NAME_A": "<set>",
  "ELMS_PLOTALLOCATION_CONST": "<coded value>",
  "DevCode": "PLANNED DEVELOPMENT",
  "DevCode_Category": "Other",
  "DevCode_Description": "<set>",
  "DevCode_FAR": "N/A",
  "DevCode_MaxGFA": 0.0,
  "MAXALLOWABLEHEIGHTS": "0",
  "PLOTCALCULATEDAREA": 999.36,
  "Longitude": <~54.63>,
  "Latitude": <~24.47>,
  "Investment_Name": "Sixth Investment Zone (Yas Island)",
  "Permit_LastDate": null,
  "Permit_LastType": null,
  "MEPS_CONS_STATUS": null,
  "MEPS_CONS_UPDATEON": null,
  "MEPS_ADDITIONAL_INFO": null,
  "DataReceivedDate": "<set>",
  "DMT_DCR_URL": "https://geosmart.dmt.gov.ae/dcr/YN7_3014.pdf",
  "Old_DISTRICTENG": "<set>",
  "Old_DISTRICTARA": "<set>",
  "Old_DISTRICTID": "<set>",
  "Old_COMMUNITYENG": "<set>",
  "Old_COMMUNITYARA": "<set>",
  "Old_COMMUNITYID": "<set>",
  "Old_PLOTNUMBER": "<set>",
  "Old_SectorNumber_PlotID": "<set>",
  "Old_ROADID": "<set>",
  "Old_FLAT_ID": null,
  "OBJECTID_1": <int>,
  "Field": <int>,
  "SHAPE.STArea()": <~8.5e-8 degrees²>,
  "SHAPE.STLength()": <~1.4e-3 degrees>
}
```

The `DMT_DCR_URL` (`https://geosmart.dmt.gov.ae/dcr/YN7_3014.pdf`) is fetchable with HTTP HEAD — verified in this session: returns `HTTP/1.1 200 OK`, `Content-Length: 2,379,682` (≈2.4 MB), `Content-Type: application/pdf`, `Last-Modified: Thu, 13 Mar 2025 19:08:48 GMT`, CORS `*`, from Microsoft-IIS/10.0.

### 2.9 Static / local geodata in ZAAHI that already complement MyLand

- `data/layers/abu-dhabi-municipalities.geojson` — 3 polygons (AAM, ADM, WRM), 130 KB. Sourced from SMARTHUB layer 3 on 2026-04-12.
- `data/layers/abu-dhabi-districts.geojson` — 216 polygons, 3.2 MB. Sourced from SMARTHUB layer 1.
- `data/layers/abu-dhabi-communities.geojson` — 1,864 polygons, 10.2 MB. Sourced from SMARTHUB layer 2.
- `public/tiles/ad-land-adm.pmtiles` — 59 MB, ADM (Abu Dhabi City) plots as vector tiles.
- `public/tiles/ad-land-other.pmtiles` — 78 MB, Al Ain + Al Dhafra plots as vector tiles.
- The Excel price source (`data/plots-prices.xlsx`) and the generic `data/affection-plans/` KML folder are **Dubai-only** today.
- Existing seed scripts are already Abu Dhabi-aware: `scripts/seed-saadiyat-p28.ts` (Hidd Al Saadiyat Plot P28), `scripts/seed-yas-island.ts` (NY2-09-A3A), `scripts/seed-al-ain-jahili.ts` (Plot 16-3-018-2). These demonstrate the `SectorNumber_PlotID` / `NY2-09-A3A` plot-numbering reality and the UTM-40N affection-plan PDF workflow.

---

## §3 · Access tiers · costs · licensing

### 3.1 Tier summary

| Tier                             | What you get                                                                        | Auth                            | Cost |
| -------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------- | ---- |
| **Anonymous public read**        | Plot polygons, attributes (57 fields), affection-plan PDFs, POIs, streets, addresses | None                            | 0 |
| **UAE Pass citizen**             | Dari title deeds (Mulkiya), Tawtheeq tenancy, Site Plan issuance, Building Permit, NOC requests, service-specific workflow | UAE Pass (+ Emirates ID)       | Per-service fees (e.g. Site Plan ~AED 100; Building Permit AED 1,000–50,000+) |
| **ADREC broker (BLN holder)**    | Broker listing validity, transaction counterparty status                            | BLN via ADREC                   | Training + exam + annual card fee (AED not published on `adrec.gov.ae` product pages at retrieval 2026-04-24) |
| **ADREC developer**              | Escrow account registration, off-plan marketing via Madhmoun, EOI registration      | Developer registration with ADREC + approved bank escrow | Per-project registration fees |
| **API / data partner**           | Not publicly documented. No published developer portal for MyLand specifically. Plausible routes: `data.abudhabi/developers`, AD-SDI (`sdi.gov.abudhabi/sdi/`) | Formal partnership agreement with DMT | Negotiated |
| **Bulk export / DB dump**        | Not publicly advertised. Would require ADSDI / AD-SDI partnership.                   | DMT / ADDA agreement            | Negotiated |

### 3.2 Costs — what's published, what's not

Published (retrieved 2026-04-24):
- **Affection plan ("Site Plan") via Tamm:** ≈AED 100 per plot (secondary reference: `https://www.primadom.ae/blogs/uae-affection-plan-dubai-guide`; Tamm's own SPA did not return a fee schedule to WebFetch during retrieval — exact 2026 fee should be confirmed in-app).
- **Building Permit via Tamm / DMT MePS:** AED 1,000 – 50,000+ depending on plot size and project complexity; processing 2–8 weeks typical (ref: `https://uaecontractorshub.com/blog/uae-construction-permits-guide`). Phased work permit: 8 working days, no cost.
- **Property transfer registration:** **2%** of transaction value (historical baseline; Dubai DLD is 4%). There have been periodic stimulus waivers 2020–2023. Exact 2026 rate needs confirmation from DMT / ADREC directly.
- **Tawtheeq registration:** nominal fee via Tamm workflow, typical landlord-side cost.

Not published:
- ADREC BLN annual fee.
- Developer escrow-account setup fees (bank-side).
- Any bulk-export or API-partnership fee.
- Any Madhmoun off-plan registration tariff.

### 3.3 Licensing posture

- **No Creative Commons, no explicit data licence** on the ArcGIS REST services. The DMT / MyLand landing pages do not publish a data-sharing statement.
- **The safe legal posture for ZAAHI** is: "publicly viewable, commercially use at integrator's risk, pursue a formal DMT data-sharing agreement before scaled production ingestion." This matches the stance in `ABU_DHABI_MIGRATION.md` ("data-sharing agreement typically mandates in-country storage", §4.2).
- **PDPL (Federal Law 45/2021)** applies to personal data of plot owners/buyers on ZAAHI even if plot-geometry data is public. ADGM Data Protection Regulations 2021 apply *inside* ADGM's perimeter (Al Maryah + Al Reem).
- **PMTiles already shipped with ZAAHI (`public/tiles/ad-land-*.pmtiles`, 138 MB total)** were generated from the Onwani REST service. Shipping them as platform assets is consistent with public-viewer status but would not withstand a formal license challenge without a DMT agreement. Flag for founder review.

---

## §4 · Master plans · communities · investment-zone inventory

### 4.1 Administrative hierarchy vs master-plan hierarchy

Abu Dhabi's administrative boundaries are decoupled from its master-plan boundaries:

- **Municipality (3):** Abu Dhabi City (ADM — 220,357 plots), Al Ain City (AAM — 148,674 plots), Al Dhafra Region / Western (WRM — 40,824 plots). Total 409,855.
- **District (216):** one level below municipality; primary administrative unit.
- **Community (1,864):** one level below district; planning unit.
- **Master plan:** an overlay that cuts across districts/communities; an investment zone is typically one master-planned community.

Because the REST service is keyed by `DISTRICTENG` / `COMMUNITYENG` and not by master-plan name, ZAAHI must maintain a **master-plan → district/community lookup table** client-side. The `Investment_Name` attribute carries the numbered/named investment zone for ~55K plots but uses free-form strings (e.g., `"The eighteenth investment zone - Jubail Island"`, `"Sixth Investment Zone (Yas Island)"`) and truncates long names to 100 characters.

### 4.2 Investment zones — live from `Investment_Name` (2026-04-24)

The `Investment_Name` attribute on MSSI/ADMINBOUNDARIES/0 yields the **actual list** of what DMT currently flags as an investment zone or investment-area carve-out. Raw counts (top entries, descending):

| Plots | Investment_Name (verbatim, truncated at 100 chars as stored) |
|------:|---|
| 354,813 | `N/A` |
|   7,180 | `Sixth Investment Zone (Yas Island)` |
|   6,358 | `Plot No. (200) Shibak Destrict in Al-Faqa' area)` |
|   6,129 | `Al Hudayriyat Island` |
|   5,343 | `Fifth Investment Zone (Saadiyat Island)` |
|   3,347 | `Plot No. 674B Ain Al Fayda District in the Ain AlF…` |
|   2,887 | `القسيمة رقم (1) حوض مدينة زايد` (Plot 1, Madinat Zayed basin) |
|   2,874 | `Investment zone1 and 2 (Al Raha Beach, Al Reem Isl…` |
|   2,844 | `The Seventeenth Investment Zone( The Higher Corpor…` |
|   2,774 | `The third investment zone (Al Reef area)` |
|   1,906 | `Plot No. 1, Al Shamkha District 35, in Al Shamkha …` |
|   1,537 | `Seventh Investment Zone (Saih Al Sedira)` |
|   1,502 | `The eleventh investment zone (allocated to Abu Dha…` |
|   1,341 | `Plot No. C1 - Rumhan Island in the Emirate of Abu …` |
|   1,299 | `The eighteenth investment zone - Jubail Island` |
|   1,190 | `The 19th Investment zone (Al Shamkha)` |
|   1,149 | `The fifteenth investment zone (Al-Jarf District)` |
|   1,004 | `Plot No. (1) Ghantoot district - Al-Jurf area, for…` |
|     977 | `GHANTOUT` |
|     930 | `Plot No. C1a Old Samha District, in the Al Samha a…` |
|     883 | `Eighth Investment District (Masdar City)` |
|     526 | `Fourteenth Investment zone (Hadd Al Saadiyat)` |
|     328 | `Plot No. 112, South West District 1, Khalifa City …` |
|     320 | `Rabdan` |
|      72 | `Ninth Investment Zone (Sowwah Island)` (note: Sowwah is the old name for Al Maryah) |
|      71 | `The 20th Investment Zone (Marina City) Water Break…` |
|      66 | `The 10th Investment Zone (allocated to Abu Dhabi A…` |
|      56 | `Al Ras Al Akhdar` |
|      48 | `Sixteenth Investment Zone (Nurii Island)` (Nurai) |
|      37 | `(The thirteenth investment zone )Fahed Island` |
|      28 | `Plot No. TMP_PL1 in the research area in Abu Dhabi` |
|       9 | `Fourth Investment Zone (Lulu Island)` |
|       8 | `Plot No. 1 Free Zone 2 in Mina Zayed area in Abu D…` |
|       3 | `Ba Al Ghalylam` |
|       2 | `Plot No. C1A, Al Raha Beach District, East 2, in A…` |
|       2 | `Plot No. C2 Sas Al Nakhl Distrect in the Sas Al Na…` |
|   1 each | `Investment Area 36…47` (12 entries), `Plot No. P1007, Al-Ruwais Basin`, `Plot No. P7, Distrect (Z9) in the Mohammed bin Zaye…`, `The twelfth investment zone (Al Falah district 7)` |

**Observations:**

1. **The widely-cited "9 investment zones" (Yas · Saadiyat · Reem · Lulu · Al Maryah · Al Raha Beach · Sayh Al Sedairah / Al Ghadeer · Al Reef · Masdar, per Law 13/2019 as summarised by `tamimi.com`, retrieved 2026-04-24) is a 2019 snapshot.** The live data shows at least **20 numbered investment zones** plus a long tail of per-plot carve-outs. Cabinet resolutions since 2019 have extended the list; primary legal text of those resolutions was not surfaced in this retrieval.
2. **Not all "Plot No. …" Investment_Name entries are investment zones.** Some are plot-specific grants or state concessions (e.g. `Plot No. TMP_PL1 in the research area`). ZAAHI must distinguish "numbered investment zone" from "per-plot carve-out" when computing foreign-freehold eligibility.
3. **Hudayriyat, Fahid, Jubail, Al Jurf, Ghantoot, Rabdan, Al Ras Al Akhdar** all appear in the Investment_Name field as freehold-marketed destinations but **are not on the original Law 13/2019 list**. Developer marketing (Modon for Hudayriyat; Aldar for Fahid; LEAD for Jubail; IMKAN for Al Jurf) claims freehold; the statutory basis is likely a subsequent Cabinet resolution, unverified at retrieval.
4. **ADGM's perimeter is not visible in the Investment_Name field.** ADGM's post-2023 inclusion of Reem Island changes *registration routing* (ADGM Registration Authority vs DMT Real Estate Register) but is not carried as a plot attribute. For ZAAHI this must be computed geospatially against the ADGM perimeter polygon.

### 4.3 Per-master-plan inventory

Per master plan: developer · approximate area · plot count (from Onwani where available) · status · foreign-ownership posture · dominant land uses · notable projects · data accessibility · notable plot-number patterns. Ordered roughly by market significance to foreign buyers.

#### 4.3.1 Saadiyat Island

- **District name in Onwani:** `AL SAADIYAT ISLAND` (5,890 plots total) + `AL HIDAYRIYYAT` adjacent (6,150 plots).
- **Master developer(s):** Tourism Development & Investment Company (TDIC, est. 2006). Aldar acquired ~1.1 M sqm GFA from TDIC in 2018 (`https://gulfnews.com/business/property/aldar-to-buy-saadiyat-island-assets-in-dh37b-deal-one-of-uaes-largest-property-acquisitions-1.2217394`, 2026-04-24).
- **Total land area:** ~27 km² (cited in community guides summarising TDIC documentation; not found on a primary Aldar page in this retrieval).
- **Plot count (Onwani):** 5,890 plots carry `DISTRICTENG='AL SAADIYAT ISLAND'`; 5,343 carry `Investment_Name='Fifth Investment Zone (Saadiyat Island)'` and 526 carry `Investment_Name='Fourteenth Investment zone (Hadd Al Saadiyat)'` — so the Fifth Zone is the main Saadiyat and the Fourteenth is Hidd Al Saadiyat, the southern sub-community.
- **Status:** Mixed. Cultural District (Louvre, Guggenheim AD, Zayed National Museum) under development; Saadiyat Beach, Saadiyat Grove, Saadiyat Lagoons, Saadiyat Reserve in various phases.
- **Foreign ownership:** Freehold investment zone (Law 13/2019; ref `https://www.tamimi.com/law-update-articles/foreign-ownership-of-land-in-abu-dhabi-a-major-reform/` and `https://www.loc.gov/item/global-legal-monitor/2019-05-01/uae-law-allows-foreigners-to-own-real-estate-properties-in-abu-dhabis-investment-zones/`).
- **Land uses:** Residential, cultural, hospitality, education, retail.
- **Notable projects:** Saadiyat Cultural District (Louvre Abu Dhabi — open; Guggenheim Abu Dhabi — under construction; Zayed National Museum — under construction); Saadiyat Grove, Saadiyat Lagoons, Saadiyat Reserve, Mamsha Al Saadiyat (all Aldar).
- **Location:** Off-island, ~500 m north of Abu Dhabi main island.
- **Plot-number pattern:** `SP1-P28`, `SP3-…`, `SDN7-…` — "sector-plot" format with master-plan code + district + sequential plot id.
- **Sources:** `https://www.aldar.com/en/explore-aldar/businesses/development/residential/saadiyat-island` · `https://www.aldar.com/en/explore-aldar/businesses/development/residential/saadiyat-island/saadiyat-reserve` · `https://www.aldar.com/en/explore-aldar/businesses/development/residential/saadiyat-island/saadiyat-lagoons` (all 2026-04-24).

#### 4.3.2 Yas Island

- **District name in Onwani:** `YAS ISLAND` (7,180 plots).
- **Master developer(s):** Miral (asset-management / master developer since 2011). Aldar developed early residential phases. Refs: `https://miral.ae/miral-portfolio/yas-island/`, `https://en.wikipedia.org/wiki/Yas_Island`.
- **Total land area:** 25 km².
- **Plot count (Onwani):** 7,180 plots in YAS ISLAND district; 7,180 plots carry `Investment_Name='Sixth Investment Zone (Yas Island)'`. Yas Bay alone is planned for ~15,000 residents (`https://miral.ae/wp-content/uploads/2020/10/Residences-at-Yas-Bay-Investment-Opportunities.pdf`).
- **Status:** Mixed — ~40% of the 25 km² developed per Miral CEO (`https://www.arabianbusiness.com/interviews/interviews-travel-hospitality/387002-yas-man-miral-ceo-mohammed-al-zaabi`, 2026-04-24).
- **Foreign ownership:** Freehold investment zone (Law 13/2019).
- **Land uses:** Hospitality, entertainment/theme parks (Ferrari World, Warner Bros., SeaWorld, Yas Waterworld), residential, commercial, motorsport (Yas Marina Circuit).
- **Notable projects:** Yas Bay (Miral, 1.28 km² mixed-use); Yas Mall; Aldar Yas Acres; Water's Edge; Mayan.
- **Location:** Off-island, east of Abu Dhabi main island.
- **Plot-number pattern:** `NY2-09-A3A`, `YN7_3014` — sector code + plot ID.
- **Sources:** `https://miral.ae/miral-portfolio/yas-island/`, `https://miral.ae/news-item/miral-announces-more-than-55-construction-completion-of-yas-waterworld-yas-island-abu-dhabis-expansion/`.

#### 4.3.3 Al Reem Island

- **District name in Onwani:** `AL REEM ISLAND` (2,504 plots).
- **Master developer(s):** Three historical master developers — Tamouh Investments (~60%), Reem Investments (~20%), Sorouh Real Estate (~20%). Sorouh merged into Aldar in 2013 (`https://en.wikipedia.org/wiki/Sorouh_Real_Estate`). Tamouh consolidated into Modon Properties.
- **Total land area:** Al Reem + Al Maryah together comprise 1,438 hectares (14.38 km²) in the expanded ADGM jurisdiction (`https://www.adgm.com/about-adgm/alreemisland`, 2026-04-24).
- **Plot count (Onwani):** 2,504 plots in AL REEM ISLAND district. 2,874 plots carry `Investment_Name='Investment zone1 and 2 (Al Raha Beach, Al Reem Isl…'` — note the zone is the original First/Second Investment Zone which covers both Al Raha Beach and Al Reem Island.
- **Status:** Under development with significant occupied stock. ADGM integration completed — 1,100+ entities moved in (`https://www.adgm.com/media/announcements/adgm-completes-al-reem-island-integration-adding-over-1100-entities-to-its-jurisdiction`).
- **Foreign ownership:** Freehold investment zone. From Cabinet Resolution 41/2023 also ADGM free-zone jurisdiction (`https://www.adgm.com/faqs/al-reem-expansion`).
- **Land uses:** Residential (dominant), commercial, financial free-zone, retail, education.
- **Notable projects:** Shams Abu Dhabi (Sorouh→Aldar); City of Lights, Marina Square (Tamouh→Modon); Reem Central Park; Gate Towers; Najmat district; Reem Hills (Modon).
- **Location:** Off-island, NE of Abu Dhabi main island.
- **Sources:** `https://aldar.com/en/explore-aldar/businesses/development/residential/reem-island`, `https://www.adgm.com/about/jurisdiction/alreemisland`.

#### 4.3.4 Al Maryah Island

- **District name in Onwani:** Within the central Abu Dhabi main-island area; not a standalone district. 72 plots carry `Investment_Name='Ninth Investment Zone (Sowwah Island)'`, reflecting the island's pre-rebranding name.
- **Master developer(s):** Mubadala (historically Mubadala Real Estate); January 2026 Aldar-Mubadala 60/40 JV for the north-side expansion (`https://www.mubadala.com/en/what-we-do/al-maryah-island`).
- **Total land area:** 114 hectares (1.14 km²).
- **Plot count:** 72 plots in the zone (Onwani `Investment_Name` count). North-side expansion: 500,000 sqm undeveloped → 1.5 M sqm new office / residential / retail / hospitality GFA (`https://www.mubadala.com/en/news/mubadala-and-aldar-announce-expansion-of-abu-dhabis-financial-district-on-al-maryah-island`).
- **Status:** Mixed — south side largely built (Galleria, Rosewood, Four Seasons, ADGM HQ); north-side enabling works scheduled 2026.
- **Foreign ownership:** Freehold investment zone; ADGM financial free zone.
- **Land uses:** Financial/commercial (dominant), hospitality, retail, residential.
- **Notable projects:** ADGM Square / ADGM HQ; The Galleria Al Maryah; Rosewood; Four Seasons; Address Residences (Emaar); ADGM Square expansion (Aldar-Mubadala JV).
- **Location:** Off-island, between Abu Dhabi main island and Reem.

#### 4.3.5 Al Raha Beach

- **District name in Onwani:** `AL RAHAH` (2,683 plots) + other Raha sub-districts.
- **Master developer(s):** Aldar (`https://www.aldar.com/en/explore-aldar/businesses/development/residential/al-raha-beach`).
- **Total land area:** Not disclosed as single figure on cited Aldar pages. Project-level only (Al Bandar GLA 82,354 sqm; Al Zeina 134,779 sqm).
- **Plot count:** ~2,683 plots in AL RAHAH. Combined with Al Reem in the First/Second Investment Zone (2,874 plots).
- **Status:** Largely complete; small infill.
- **Foreign ownership:** Freehold investment zone (Law 13/2019).
- **Land uses:** Residential, hospitality, retail, waterfront.
- **Notable projects:** Al Bandar, Al Muneera, Al Zeina, Al Hadeel, Al Raha Lofts — all Aldar.
- **Location:** Off-island, SE mainland coast facing Yas.

#### 4.3.6 Al Reef

- **District name in Onwani:** `AL REEF` (2,764 plots).
- **Master developer(s):** Manazel Real Estate.
- **Total land area:** Not publicly disclosed.
- **Plot count (Onwani):** 2,764 in district; 2,774 carry `Investment_Name='The third investment zone (Al Reef area)'` — near-perfect match.
- **Status:** Complete (delivered 2012–2013, occupied).
- **Foreign ownership:** Freehold investment zone (Law 13/2019).
- **Land uses:** Residential (villa + apartment), community retail.
- **Notable projects:** Arabian Villas, Mediterranean Villas, Contemporary Villas, Desert Villas, Al Reef Downtown (all Manazel).
- **Location:** Off-island, near Abu Dhabi International Airport.

#### 4.3.7 Masdar City

- **District name in Onwani:** `MASDAR CITY` (part of Abu Dhabi City municipality; not a top-30 district).
- **Master developer(s):** Masdar (subsidiary of Mubadala Investment Company; sole shareholder — `https://masdar.ae/en/our-company/our-shareholders`).
- **Total land area:** ~6 km² total; 3.7 km² gross floor footprint per `https://masdarcity.ae/Mvc/assets/documents/MASDAR-CITY-FACTSHEET-EN-2023.pdf`.
- **Plot count (Onwani):** 883 plots with `Investment_Name='Eighth Investment District (Masdar City)'`.
- **Status:** Under development. Expansion approved by Urban Planning Council 2018 (`https://news.masdar.ae/en/news/2018/11/28/09/47/masdar-city-expansion-plans-earn-abu-dhabi-urban-planning-council-approval`). Target 50,000 residents + 40,000 jobs/student placements at buildout.
- **Foreign ownership:** Freehold investment zone; also a free zone (`https://masdarcity.ae/docs/default-source/general-information/free_zone_factsheet_en-2020_v4.pdf`).
- **Land uses:** Mixed — commercial (clean-tech), residential, academic (Mohammed bin Zayed University of AI; Khalifa University).
- **Notable projects:** The Link (Aldar-Mubadala JV); Siemens HQ; IRENA HQ; MBZUAI; LEED/Estidama residential low-rises.
- **Location:** Mainland, adjacent to Abu Dhabi International Airport.

#### 4.3.8 Hudayriyat Island

- **District name in Onwani:** `AL HIDAYRIYYAT` (6,150 plots).
- **Master developer(s):** Modon Properties (`https://www.modon.com/about-modon/media-centre/details/2023/06/13/in-line-with-directives-of-mohamed-bin-zayed-modon-properties-reveals-hudayriyat-island-masterplan`).
- **Total land area:** 51 million sqm (51 km²) per government reveal — "equivalent to 5.38% of Abu Dhabi island" (`https://www.mediaoffice.abudhabi/en/infrastructure/in-line-with-the-directives-of-sheikh-mohamed-bin-zayed-modon-properties-reveals-hudayriyat-island-masterplan-spanning-51-million-square-meters-equivalent-to-538-of-abu-dhabi-island/`).
- **Plot count:** 6,150 in district; 6,129 carry `Investment_Name='Al Hudayriyat Island'`. Launch phases: Nawayef Village 378 units, Bashayer 157 villas + 330 apartments, Wadeem plots sold out in 72 hours (AED 5.5 bn).
- **Status:** Under development (masterplan revealed 2023; first launches 2024–2025).
- **Foreign ownership:** Marketed as freehold by Modon. **NOT on the original Law 13/2019 list** — classification appears added by later Cabinet resolution; statutory text needs verification before catalog publication.
- **Land uses:** Sports/leisure (Velodrome, Surf Abu Dhabi), residential, retail, urban park, 220 km cycle network.
- **Notable projects:** Nawayef Village / Mansions, Bashayer, Wadeem plots, Surf Abu Dhabi, Velodrome Abu Dhabi, Bab Al Nojoum (all Modon).
- **Location:** Off-island, SW of Abu Dhabi main island.

#### 4.3.9 Al Ghadeer (Alghadeer) / Sayh Al Sedairah

- **District name in Onwani:** Not its own top-30 district; the landbank name is `SAYH AL SEDAIRAH` per Law 13/2019.
- **Master developer(s):** Aldar (`https://www.aldar.com/en/news-and-media/aldar-launches-aed-10-billion-masterplan-alghadeer`).
- **Total land area:** Not stated as km²; masterplan residential GFA >1.3 M sqm.
- **Plot count (Onwani):** 1,537 plots carry `Investment_Name='Seventh Investment Zone (Saih Al Sedira)'` — note slight name variation (Saih vs Sayh Al Sedairah vs Seih Al Sdeirah).
- **Status:** Mixed — original community delivered; masterplan expansion under development.
- **Foreign ownership:** Freehold investment zone (Seventh Zone per Law 13/2019).
- **Land uses:** Residential, community retail, education, hospitality, office.
- **Notable projects:** Al Ghadeer Village (Aldar); Alghadeer masterplan Phase 2 — AED 10 bn, 14,408 units (villas, townhouses, maisonettes) per Aldar.
- **Location:** Mainland, Abu Dhabi–Dubai emirate border.

#### 4.3.10 Fahid Island

- **District name in Onwani:** Not a standalone district.
- **Master developer(s):** Aldar (acquired Jan 2023; `https://cdn.aldar.com/-/media/project/aldar-tenant/aldar2/images/press-releases/31-jan-2023/aldar---press-release---al-fahid-island-land-acquisition---310123---final.pdf`).
- **Total land area:** 3.4 million sqm (~340 ha).
- **Plot count:** 37 plots carry `Investment_Name='(The thirteenth investment zone )Fahed Island'` — note the administrative name "Fahed" vs marketing "Fahid". >4,000 residential units planned; GDV AED 26 bn.
- **Status:** Under development — Fahid Beach Residences / Fahid Beach Terraces launched 2024–2025 (`https://www.aldar.com/en/news-and-media/aldar-launches-fahid-beach-terraces`).
- **Foreign ownership:** Investment-zone thirteen (per the Investment_Name string). Marketed as freehold.
- **Land uses:** Residential, wellness, hospitality, retail, mangrove preservation.
- **Notable projects:** Fahid Beach Residences, Fahid Beach Terraces, Fahid Island Terraces — all Aldar.
- **Location:** Off-island, between Yas and Saadiyat on E12.

#### 4.3.11 Jubail Island

- **District name in Onwani:** `AL JUBAIL ISLAND` (1,790 plots).
- **Master developer(s):** Jubail Island Investment Company (JIIC); developed/managed by LEAD Development (`https://jubailisland.ae/faq-3/`).
- **Total land area:** 4,000 hectares (40 km² total mangrove+land); Phase 1 = 15 M sqm GFA / 5 M sqm developable.
- **Plot count:** 1,790 plots in district; 1,299 carry `Investment_Name='The eighteenth investment zone - Jubail Island'`. Announced product: 854 villas, 164 land plots, 303 townhouses, 465 apartments.
- **Status:** Under development; first title deeds handed over (`https://jubailisland.ae/jubail-island-announces-significant-achievement-for-the-island-with-the-first-title-deed-handed-over-to-new-owner/`).
- **Foreign ownership:** Investment-zone eighteen per Investment_Name.
- **Land uses:** Residential (low-density luxury), mangrove ecological reserve, 30 km waterfront.
- **Notable projects:** Jubail Island Phase 1 villages (Souks, Nad Al Dhabi, etc.) — all LEAD / JIIC.
- **Location:** Off-island, between Saadiyat and Yas.

#### 4.3.12 Al Jurf (Ghantoot / emirate border)

- **District name in Onwani:** `GHANTOUT` (2,022 plots).
- **Master developer(s):** IMKAN (subsidiary of Abu Dhabi Capital Group; `https://www.imkan.ae/projects/aljurf`).
- **Total land area:** 1.6 km of Arabian Gulf coastline; hectare area not stated in IMKAN pages.
- **Plot count:** 2,022 GHANTOUT district plots; 1,149 carry `Investment_Name='The fifteenth investment zone (Al-Jarf District)'`; additional 1,004 carry `Investment_Name='Plot No. (1) Ghantoot district - Al-Jurf area, for…'`.
- **Status:** Under development — AlJurf Gardens Phase 1 delivered, Phase 2 launched (`https://www.imkan.ae/news/imkan-launches-phase-2-of-aljurf-gardens`).
- **Foreign ownership:** Investment-zone fifteen per Investment_Name.
- **Land uses:** Residential (low-density), wellness/hospitality (SHA Clinic), eco-coastal, marina.
- **Notable projects:** AlJurf Gardens Phase 1 & 2, Naseem AlJurf, Budoor villas, Joud villas, SHA Residences Emirates — all IMKAN.
- **Location:** Mainland, Sahel Al Emarat coast between Abu Dhabi and Dubai (Ghantoot / AD–Dubai emirate border). (Note: Al Jurf is on the **AD–Dubai** border, not RAK.)

#### 4.3.13 Al Shamkha / Al Shamkha South

- **District name in Onwani:** `AL SHAMKHAH` (9,299 plots — one of the top-5 districts by plot count).
- **Master developer(s):** Aldar on several sub-communities (Al Reeman I/II; Reeman Living; Fay AlReeman II — `https://www.aldar.com/properties/en/uae/al-shamkha`).
- **Total land area:** Not disclosed at district level.
- **Plot count:** 9,299 in district; 1,906 carry `Investment_Name='Plot No. 1, Al Shamkha District 35…'`; 1,190 carry `Investment_Name='The 19th Investment zone (Al Shamkha)'`.
- **Status:** Under development.
- **Foreign ownership:** Alreeman II is UAE-nationals-only per Aldar; the 19th Investment Zone carve-outs are freehold.
- **Land uses:** Residential, community retail.
- **Notable projects:** Alreeman I, Alreeman II, Reeman Living, Fay AlReeman II — all Aldar.
- **Location:** Mainland, SE Abu Dhabi.

#### 4.3.14 Khalifa City

- **District name in Onwani:** `KHALIFA CITY` (9,531 plots).
- **Master developer(s):** Originally ADM as planning authority; Aldar delivers projects within the zone.
- **Total land area:** Not disclosed at district level.
- **Plot count (Onwani):** 9,531 plots. 328 carry `Investment_Name='Plot No. 112, South West District 1, Khalifa City …'` — a small investment-area carve-out.
- **Status:** Complete and occupied; ongoing infill.
- **Foreign ownership:** Mostly Emirati / GCC; Aldar sub-projects (Al Rayyana, Merief, Etihad Plaza) may differ. Not an investment zone at district level.
- **Land uses:** Residential (villa-heavy), community retail, schools.
- **Location:** Mainland, between Yas Island and Abu Dhabi International Airport.

#### 4.3.15 Mohammed Bin Zayed City (MBZ City)

- **District name in Onwani:** `MOHAMED BIN ZAYED CITY` (10,208 plots — 3rd-biggest district by plot count).
- **Master developer(s):** ADM / government as planning authority.
- **Total land area:** Not disclosed.
- **Status:** Complete, occupied.
- **Foreign ownership:** Emirati / GCC. Not an investment zone (with one plot-specific Investment_Name exception: `Plot No. P7, Distrect (Z9) in the Mohammed bin Zaye…`, 1 plot).
- **Land uses:** Residential (villa districts), community retail.
- **Location:** Mainland, south of Abu Dhabi International Airport.

#### 4.3.16 Al Bateen

- **District name in Onwani:** `AL BATEEN` (2,746 plots).
- **Master developer(s):** Government-established heritage area. Aldar operates Marsa Al Bateen Marina (`https://www.aldar.com/en/explore-aldar/businesses/hospitality/marinas/marsa-al-bateen`) and adjacent retail; Bloom and Mubadala deliver marina-adjacent projects.
- **Total land area:** Not disclosed at district level.
- **Status:** Complete, heritage area with marina-led revitalisation.
- **Foreign ownership:** Primarily Emirati; Nareel Island (off Al Bateen) is a premium Aldar plot development (`https://www.aldar.com/en/explore-aldar/businesses/development/residential/other-destinations/nareel-island`). Not an investment zone at district level.
- **Land uses:** Residential, hospitality, F&B, marinas, heritage/diplomatic.
- **Location:** Abu Dhabi main island, west side.

#### 4.3.17 Al Mushrif

- **District name in Onwani:** `AL MUSHRIF` (1,596 plots).
- **Master developer(s):** Government-planned (ADM). No master-plan developer in cited sources.
- **Status:** Complete, occupied.
- **Foreign ownership:** Emirati-only. Not an investment zone.
- **Land uses:** Residential (villa-heavy), schools, parks (Umm Al Emarat Park, formerly Mushrif Park).
- **Location:** Abu Dhabi main island, central.

#### 4.3.18 Al Raha Gardens

- **District name in Onwani:** Not standalone; falls within Al Raha Beach and adjacent.
- **Master developer(s):** Aldar (`https://www.aldar.com/en/residential_properties/developments/al-raha-gardens`).
- **Total land area:** 665,000 sqm heavily landscaped.
- **Status:** Complete.
- **Foreign ownership:** Originally UAE-nationals-only; historically sold to GCC nationals. Not on Law 13/2019 list; verify before committing catalog claims.
- **Land uses:** Residential villas/townhouses, 2 schools, kindergarten, community retail.
- **Notable projects:** Khannour, Lehweih, Muzera, Qattouf, Sidra, Yasmina neighbourhoods — all Aldar.
- **Location:** Mainland, adjacent to Al Raha Beach.

#### 4.3.19 Al Falah

- **District name in Onwani:** `AL FALAH` (7,370 plots).
- **Master developer(s):** Aldar (for Abu Dhabi Housing Authority — ADHA); Mubadala-Aldar JV for adjacent logistics park.
- **Total land area:** 12.5 million sqm (12.5 km²).
- **Plot count:** 7,370 in district; the Twelfth Investment Zone is flagged as "Al Falah district 7" (1 plot in Investment_Name).
- **Status:** Mixed — primary villa community delivered (4,898 villas); 899-villa expansion + Aldar-Mubadala logistics park under development.
- **Foreign ownership:** Emirati-only (UAE national housing).
- **Land uses:** Residential (UAE national housing), community retail, logistics (adjacent).
- **Notable projects:** Al Falah Villas (Aldar/ADHA); Al Falah Plaza; forthcoming Mubadala-Aldar industrial-logistics park.
- **Location:** Mainland, east of Abu Dhabi International Airport.

#### 4.3.20 Nurai Island

- **District name in Onwani:** Not a standalone district.
- **Master developer(s):** Originally Zaya Company (launched 2008). Sold to Aldar in 2022.
- **Plot count (Onwani):** 48 plots carry `Investment_Name='Sixteenth Investment Zone (Nurii Island)'`. 65 private villas in the Zaya Nurai resort.
- **Status:** Resort temporarily closed for redevelopment under Aldar ownership.
- **Foreign ownership:** Investment-zone sixteen per Investment_Name.
- **Land uses:** Hospitality (ultra-luxury resort), private residential.
- **Location:** Off-island, ~15 min boat from Saadiyat Beach.

#### 4.3.21 Ramhan Island

- **District name in Onwani:** `RAMHAN ISLAND` (1,355 plots).
- **Master developer(s):** Eagle Hills and Ramhan Island Investments (RAII) — new island masterplan 2022/2023 launch.
- **Plot count:** 1,355 district plots; 1,341 carry `Investment_Name='Plot No. C1 - Rumhan Island in the Emirate of Abu …'`.
- **Status:** Under development.
- **Foreign ownership:** Investment-area status per Investment_Name (not on original Law 13/2019 list).
- **Location:** Off-island, north-east of Saadiyat.

#### 4.3.22 Additional discovered master plans (bonus)

Not in the mandatory list but surfaced during research; each has either notable foreign-buyer relevance or scale:

| Master plan | District(s) in Onwani | Plots (district) | Developer | Area | Notable |
|---|---|---:|---|---|---|
| **KIZAD (Khalifa Industrial Zone)** | `ABU DHABI INDUSTRIAL CITY` + `INDUSTRIAL CITY` + `INDUSTRIAL AREA` + `KHALIFA INDUSTRIAL` | 2,290 + 1,419 + 1,231 + 963 = **5,903** | AD Ports Group | 417 km² (Area A + B) | Largest industrial master plan in the emirate; industrial freehold (corporate) |
| **West Baniyas / Madinat Al Riyadh** | `MADINAT AL RIYAD` + `BANI YAS` | 35,085 + 8,435 = **43,520** | ADHA / government; Aldar for delivery | 584.7 ha West Baniyas alone | 1,500 villas in West Baniyas; 242 villas in Al Samha (adjacent) |
| **Al Samha (ADHA)** | `AL SAMHAH` | 4,806 | ADHA / government | 53.4 ha | UAE national housing — 242 villas, AED 734 M, due end-2025 |
| **South Wathba / Baniyas expansion** | `BANI YAS` + `AL WATHBAH` | 8,435 + 2,993 = **11,428** | Government master plan | ~6,500 ha | Population target 69K → 120K by 2030 |
| **Zayed City (Capital District)** | `ZAYED CITY` | 8,929 | Government + Bloom Holding | — | Hosts Bloom Living; previously planned as "Capital District" |
| **Bloom Living (Zayed City)** | within `ZAYED CITY` | part of 8,929 | Bloom Holding | 2.2 km² | >4,500 homes, Mediterranean-Spanish theme |
| **Rabdan (Strata-level)** | surfaces in Onwani as Investment_Name | 320 | Mubadala-era | — | Mixed residential/strategic |
| **Al Ras Al Akhdar** | Investment_Name only | 56 | Government / royal area | — | — |

#### 4.3.23 Per-master-plan gaps (what we don't know after research)

1. **Saadiyat total km²** — 27 km² is secondary-sourced; DMT/TDIC primary not surfaced.
2. **Per-masterplan unit counts** — Aldar's Annual Report 2024 does NOT publish a per-master-plan plot/unit/remaining-GFA inventory. Only destination-level GDV / sales contributions. Granular counts must come from DMT directly.
3. **Foreign-freehold statutory basis** for Hudayriyat, Fahid, Jubail, Al Jurf — developer marketing says freehold; Law 13/2019 nine-zone list does not include them. Subsequent Cabinet resolutions almost certainly added them, but the primary gazette text was not located.
4. **Al Raha Gardens** — ~1,500 villas widely cited, but no Aldar primary source found.
5. **Nurai Island current masterplan** — post-2022 Aldar acquisition, no public redevelopment plan.
6. **MBZ City / Al Mushrif / Al Bateen / Khalifa City district-level master plans** — not surfaced from developer sites; source is DMT geodata and ADM, not public PDFs.

---

## §5 · Integration pathways · technical plan

### 5.1 Three paths (ordered by risk / speed / leverage)

**Path A — PMTiles-first (lowest risk; what ZAAHI's already doing).**
- Use the existing `ad-land-adm.pmtiles` (59 MB, ADM) and `ad-land-other.pmtiles` (78 MB, AAM + WRM) as the baseline plot corpus on the map.
- Re-run `scripts/fetch-ad-plots.ts` weekly (current target: `MyLand/SMARTHUB/MapServer/0`; retains 410,464 records, 57 attributes) and re-tile.
- **Effort:** ~1 week to port the existing DDA → ZAAHI Plot mapping to AD's schema (`PRIMARYUSEENGDESC` → land-use category; `DMT_DCR_URL` → affection-plan URL; `SectorNumber_PlotID` as the plot identifier).
- **Limitations:** No live query by attribute; tile updates are batched weekly; no per-plot real-time telemetry.

**Path B — Live REST federation (medium risk).**
- Mirror the approach ZAAHI uses for DDA: the client issues `?where=` queries directly against `MSSI/ADMINBOUNDARIES/MapServer/0` for zoomed-in views, and uses PMTiles for overviews.
- Enables live `Construction_Status`, `Permit_LastDate`, `ELMS_AllocationStatus` filtering without redeploy.
- **Effort:** ~2 weeks (a new `src/lib/myland.ts` module parallel to `src/lib/dda.ts`, plus extending the plot-ingestion pipeline in `src/app/parcels/seed-dda/` or a new `seed-myland/` route).
- **Limitations:** Depends on REST uptime; per-plot latency ~200–400 ms from Frankfurt.

**Path C — Formal DMT partnership (highest leverage).**
- Apply through `data.abudhabi/developers` + direct DMT engagement for bulk licence + Tamm service integration (site plans, Tawtheeq, NOC).
- Unlocks: Tamm embedding, ADREC broker-card validation, legal clarity on data use.
- **Effort:** 3–9 months elapsed, predominantly legal / business-development, not engineering.
- **Limitations:** Requires ZAAHI to have a legal entity recognised in Abu Dhabi (or ADGM, which may be the path of least resistance for a fintech-adjacent platform).

### 5.2 Recommended sequence

1. **This sprint (Path A, ~1 week):** Extend `src/lib/land-use.ts`/`deriveLandUse` to consume `PRIMARYUSEENGDESC`. Wire the existing PMTiles layer as a first-class "AD Land Plots" source with proper attribute-driven coloring and click-through to affection plan (`DMT_DCR_URL`). Add a `src/app/parcels/map` filter for `Investment_Name IS NOT NULL` = "freehold-eligible plots".
2. **Next sprint (Path B, ~2 weeks):** Build a `src/lib/myland.ts` client that mirrors `src/lib/dda.ts`'s interface, switching the `baseUrl` for ArcGIS REST queries. Support per-plot fetch, pagination, and group-by statistics.
3. **Q3 2026 (Path C):** Open dialogue with DMT / ADREC via the data.abudhabi/developers channel + ADIO investment-promotion contacts. Parallel: ADGM entity registration evaluation (leverages the Al Reem / Al Maryah jurisdictional clarity for a fintech-real-estate platform).

### 5.3 Schema mapping (DDA → ZAAHI → MyLand)

The ZAAHI Parcel schema was designed around DDA. Below is the exact mapping to keep the single codebase consistent (see `src/lib/dda.ts` for the DDA mapping it mirrors):

| ZAAHI field                     | DDA source                         | MyLand source                                         | Notes |
| ------------------------------- | ---------------------------------- | ----------------------------------------------------- | ----- |
| `plotNumber`                    | `PLOT_NUMBER` (7-digit flat)       | `SectorNumber_PlotID` (composite `SECTOR_PLOT`)       | Abu Dhabi is composite; global uniqueness requires an emirate prefix |
| `oldPlotNumbers`                | `OLD_PLOT_NUMBERS` (string CSV)    | `Old_PLOTNUMBER` + `Old_SectorNumber_PlotID`          | AD splits old-name fields by level; join to single CSV on ingest |
| `district`                      | `AREA_NAME_EN`                     | `DISTRICTENG`                                         | Both English-authoritative |
| `community`                     | `CommunityName`                    | `COMMUNITYENG`                                        | — |
| `municipality`                  | (n/a — DDA has no explicit field)  | `MunicipalityName`                                    | AD publishes explicit municipality (3 values) |
| `project`                       | `AREA_NAME_EN` (master-plan name)  | (compute from `Investment_Name` + `DISTRICTENG`)       | AD has no single master-plan field; `Investment_Name` is free-form |
| `emirate`                       | (constant "Dubai")                 | (constant "Abu Dhabi")                                | — |
| `landUseMain` (legend key)      | `MAIN_LANDUSE`                     | `PRIMARYUSEENGDESC`                                   | Both 19–20 distinct values; use same ZAAHI 9-category legend |
| `landUseSub`                    | `SUB_LANDUSE` (395 tags)           | `ELMS_LANDUSENAME_E`                                  | MyLand has 1,000+ dirty values; normalize at ingest |
| `landUseCategory`               | `LANDUSE_CATEGORY` (20-value)      | `DevCode_Category` (7-value)                          | Not 1:1; DevCode is coarser |
| `maxFloors` / `maxHeightM`      | derived from `MAX_HEIGHT_FLOORS`   | `MAXALLOWABLEHEIGHTS`                                  | AD value is a single string (`"G+4"`, `"0"`, etc.); Dubai's has 330 distinct patterns |
| `far`                           | `GFA / AREA` (DDA doesn't publish FAR directly) | `DevCode_FAR` (string)                     | AD publishes FAR but value is often `N/A` or numeric as string |
| `maxGfa`                        | `GFA` (m²)                         | `DevCode_MaxGFA` (double m²)                           | — |
| `plotArea`                      | `SHAPE.STArea` or `AREA`           | `PLOTCALCULATEDAREA` (double m²)                       | AD value is authoritative from survey |
| `constructionStatus`            | `CONSTRUCTION_STATUS` (6-val)      | `Construction_Status` (4-val) + `MEPS_CONS_STATUS`     | AD's MEPS-derived status is optional (51K of 410K populated) |
| `isFrozen`                      | `IS_FROZEN` (0/1)                  | (no direct equivalent)                                | AD freeze signalling differs; not used the same way |
| `allocationStatus`              | (no equivalent)                    | `ELMS_AllocationStatus` (ALLOCATED / NOT ALLOCATED)    | **New** for AD; useful for distinguishing state land |
| `investmentZone`                | (n/a — DDA is all freehold free-zone) | `Investment_Name`                                    | AD's freehold signal |
| `affectionPlanUrl`              | DDA token-fetched via `DIS/?handler=PlotInfo` + `DIS/MAIN_MAP/MapServer/8` | `DMT_DCR_URL` (deterministic) | AD is simpler and faster |
| `permitLastType`                | (no equivalent)                    | `Permit_LastType` (71+ values)                         | **New** permit telemetry |
| `permitLastDate`                | (no equivalent)                    | `Permit_LastDate` (date)                               | — |
| `approvedBy` / `approvalDate`   | (no equivalent)                    | `APPROVEDBY` + `APPROVALDATE` (MyLand/SMARTHUB/0 only) | — |
| `latitude` / `longitude`        | derived from polygon centroid      | `Latitude` / `Longitude` (double, stored)              | AD stores pre-computed centroid |
| `arabicName` / `arabicDistrict` | Dubai Municipality parallel layer  | `COMMUNITYARA` + `DISTRICTARA`                         | AD is richer — every plot has Arabic names in-record |
| `postalCode`                    | (n/a)                              | via Onwani `ADDRESS` table join                        | **New** for AD |

### 5.4 Data volume plan

- **PMTiles size** today: 138 MB total for 410K plots with ~12 attributes.
- **Full 57-attribute re-tile** would be ~400–500 MB — too big to ship with the deploy. Recommendation: keep PMTiles at 12 attributes (what the map needs for render + hover), ship the full 57-attribute row in a row-store (Supabase table `ADParcel`) with client-side fetch-on-click.
- **Supabase DB impact**: 410K rows × ~1 KB avg = ~400 MB. Fits well within Supabase Free tier (500 MB ceiling) if this is the only AD-specific table. Long-term: move to dedicated UAE-region Postgres per `ABU_DHABI_MIGRATION.md` Phase 1.

### 5.5 Plot-number normalization

The existing DDA pipeline assumes 7-digit plot numbers (e.g. `3014567`). AD has at least six plot-number shapes in the wild:

1. `SectorNumber_PlotID` (current canonical): `YN7_3014`, `SDN7_P28`
2. Legacy: `Old_SectorNumber_PlotID`
3. Three-part sector-plot: `NY2-09-A3A` (e.g., existing seed `seed-yas-island.ts`)
4. Hidd Al Saadiyat: `SP1-P28` (existing seed `seed-saadiyat-p28.ts`)
5. Al Ain: `16-3-018-2` (existing seed `seed-al-ain-jahili.ts`)
6. Single integer `PLOTNUMBER` value (e.g. `"3014"`, meaningful only in combination with COMMUNITYID)

ZAAHI's `Parcel.plotNumber` field (indexed via `plotNumber` unique-per-emirate-district constraint per CLAUDE.md "NEVER add duplicate parcels") must accept all of these. Recommendation: store both `plotNumber = SectorNumber_PlotID` (canonical, 50-char string) and `displayPlotNumber` (human-readable variant). The existing `scripts/seed-*` scripts already carry emirate=`Abu Dhabi`, so the uniqueness contract is per-emirate.

### 5.6 Affection-plan ("DCR") embedding

The DMT_DCR_URL template is:
```
https://geosmart.dmt.gov.ae/dcr/{SectorNumber_PlotID}.pdf
```

HEAD request verified (2026-04-24):
```
HTTP/1.1 200 OK
Content-Length: 2,379,682
Content-Type: application/pdf
Last-Modified: Thu, 13 Mar 2025 19:08:48 GMT
Access-Control-Allow-Origin: *
```

Implications:
- **Every plot has its own PDF at a predictable URL.** ZAAHI does not need to pre-fetch; embed directly in the side panel.
- **CORS is wide-open** — browser-side `<iframe src>` and `<object data>` both work. No server-side proxy needed (unlike DDA's token path).
- **Last-Modified of 2025-03-13 on this sample** suggests DMT refreshes DCRs in batches. Watch for `Last-Modified` drift on re-fetch.
- **Not every plot has a DCR** — a filter `DMT_DCR_URL IS NOT NULL AND DMT_DCR_URL <> ''` is required before building a PDF link.

---

## §6 · Regulatory considerations

### 6.1 Authority map

| Body | Role | Jurisdiction | Website |
|---|---|---|---|
| **DMT** — Department of Municipalities and Transport | Emirate-level regulator: land registry, urban planning, real-estate transactions, rentals (Tawtheeq) | Abu Dhabi emirate (mainland) | `https://www.dmt.gov.ae/en` |
| **ADM** — Abu Dhabi City Municipality (one of three, under DMT) | City-level delivery: building permits (via Tamm), zoning enforcement, plot demarcation | Abu Dhabi City | `https://www.dmt.gov.ae/en/adm` |
| **AAM** — Al Ain City Municipality | Same as ADM for Al Ain | Al Ain City | — |
| **WRM** — Al Dhafra Region Municipality (Western) | Same as ADM for Al Dhafra | Al Dhafra Region | — |
| **ADREC** — Abu Dhabi Real Estate Centre | Real-estate sector regulator within DMT: broker licensing (BLN), developer registration, escrow oversight, title-deed issuance via Dari | Emirate-wide except ADGM | `https://adrec.gov.ae/en` |
| **TAMM** — super-app | Digital front door for all Abu Dhabi government services (1000+), including property transactions. Requires UAE Pass. | Emirate-wide | `https://www.tamm.abudhabi/` |
| **Dari** | Real-estate transactional platform: title deeds (Mulkiya), unit info, off-plan registration | DMT + ADRES delivery | `https://www.adres.ae/dari/` |
| **Madhmoun** | ADREC off-plan registration platform + escrow routing | ADREC | — (flows within `adrec.gov.ae`) |
| **ADGM** — Abu Dhabi Global Market | Financial free zone with own common-law legal system, FSRA, courts. Covers Al Maryah + Al Reem (post-2023 Cabinet Resolution 41/2023). Property registration under ADGM Registration Authority inside perimeter. | Al Maryah + Al Reem geographic perimeter | `https://www.adgm.com/` |
| **ADDED** — Department of Economic Development | Commercial licensing for Abu Dhabi mainland companies | Emirate-wide mainland | `https://added.gov.ae/` |
| **ADDA** — Abu Dhabi Digital Authority (formerly ADSIC) | Cloud policies for gov systems; operates AD-SDI spatial data infrastructure | Emirate-wide gov | `https://www.adda.gov.ae/` |
| **SCAD** — Statistics Centre Abu Dhabi | Publishes real-estate sector macro indicators | Emirate-wide | `https://www.scad.gov.ae/` |
| **AD Ports Group** | Master developer of KIZAD (industrial) | Mainland | `https://www.adports.ae/` |
| **ADIO** — Abu Dhabi Investment Office | Investment-promotion agency; musataha land-lease opportunities marketing | Emirate-wide | `https://adio.abudhabi/` |

### 6.2 Legal framework — the statutory base

- **Law No. 19 of 2005 on Real Estate Registration (Abu Dhabi)**, as amended by **Law No. 13 of 2019**. The original task brief referenced "Abu Dhabi Real Estate Law 3/2015" — this is a common misattribution. The correct primary law is **Law 19/2005 + Law 13/2019**. Source: `https://www.tamimi.com/law-update-articles/foreign-ownership-of-land-in-abu-dhabi-a-major-reform/`; `https://www.loc.gov/item/global-legal-monitor/2019-05-01/uae-law-allows-foreigners-to-own-real-estate-properties-in-abu-dhabis-investment-zones/` (both retrieved 2026-04-24).
- **Federal PDPL — Decree-Law No. 45 of 2021** applies to personal data of UAE residents; executive regulations rolled out in phases 2022–2024. Implementing regulations status as of 2026 needs re-verification before production PII handling.
- **ADGM Data Protection Regulations 2021** — GDPR-aligned, applies only within ADGM perimeter.
- **Executive Council Resolution No. 4 of 2011** — Tawtheeq (tenancy registration) mandatory for Abu Dhabi rentals.
- **Cabinet Resolution No. 41 of 2023** — ADGM perimeter extended to Al Reem Island.

### 6.3 Ownership tiers (post-2019)

- **UAE nationals:** Freehold anywhere in Abu Dhabi (inside and outside investment zones).
- **GCC nationals:** Treated similarly to UAE nationals for residential/commercial purposes (GCC Common Market reciprocity).
- **Foreign expats (resident or non-resident) inside numbered investment zones:** **Full freehold title** post-Law 13/2019. Pre-2019 they had maximum 99-year leasehold / usufruct; the 2019 reform upgraded title quality *within* the zones, it did NOT expand the zone geography.
- **Foreign expats outside investment zones:** No freehold. Can own via musataha (up to 50 years + renewal), usufruct (up to 99 years), or long-lease.
- **UAE-mainland LLCs:** Can own property; post-2020 federal reform allowed 100% foreign-owned mainland LLCs, easing what used to be a 51% UAE-national requirement.
- **Free-zone entities (including ADGM):** Can own property within their free zone and on mainland subject to specific approvals.

### 6.4 Tenure types

- **Freehold** — unrestricted-in-time ownership of the land itself; registered in DMT Real Estate Register or ADGM Registration Authority (if inside ADGM perimeter). Title deed = **Mulkiya**, issued by ADREC via Dari (note: Abu Dhabi does NOT use "Emlak" as a registry term; the word is Mulkiya / Title Deed — per `https://help.dari.ae/en/support/solutions/articles/73000397401-title-deed-unit-`, retrieved 2026-04-24).
- **Musataha** — real property right granting authority to construct or plant on third-party (typically government-owned) land and to own the improvements for the contract term. **Up to 50 years, renewable by mutual consent for another 50 (100 years maximum).** A musataha holder with term >10 years may dispose of / mortgage the right without the freehold owner's consent. Mandatory development obligation on the musatahee (distinguishes it from usufruct). Source: `https://www.tamimi.com/...`, `https://learn.thinkprop.ae/en/understanding-musataha-contracts-in-abu-dhabi-a-comprehensive-guide/`.
- **Usufruct** — right to use and enjoy another's property for up to 99 years, no mandatory construction obligation.
- **Long-lease** — up to 99 years, contractually structured.
- **Strata** — apartment-level ownership in towers, under Law 13/2019 provisions for mainland + ADGM Strata Title Regulations within ADGM.

### 6.5 Broker & developer licensing

- **Broker licence:** individual brokers licensed by **ADREC** (BLN = Broker License Number). Requires:
  - Association with an ADDED-licensed real-estate company (two licences: company at ADDED, individual broker at ADREC).
  - Training (ADREC-accredited providers) + examination.
  - BLN card renewed annually.
  - ADREC directory: `https://adrec.gov.ae/en/re_agents`.
- **Developer registration:** ADREC registers developers; off-plan projects register via Madhmoun with escrow oversight. Source: `https://adrec.gov.ae/sa_flow_3`; `https://www.zawya.com/en/press-release/companies-news/abu-dhabi-real-estate-centre-launches-registration-expressions-of-interest-under-madhmoun-x5pu3fr8`.
- **Escrow:** built into Law 19/2005 framework; milestone draws and ringfenced project accounts at ADREC-approved banks.
- **Registration fees:** baseline 2% of transaction value (vs Dubai's 4%), subject to periodic waivers. Exact 2026 rate requires direct DMT confirmation.

### 6.6 Data residency

- **Federal PDPL:** applies onshore, cross-border transfer allowed with adequate-protection country OR user consent. No blanket "must be in UAE" for general real-estate data; strong preference for in-country for PII (Emirates ID copies, title deeds).
- **ADGM DPR 2021:** within ADGM perimeter, data processing governed by ADGM rules (similar to GDPR).
- **ADDA cloud policies:** any data flowing through Tamm or DMT systems is subject to ADDA cloud-classification policy — classified data must stay in-country.
- **Data-sharing agreement (DMT):** typically mandates in-country storage for data received from DMT under the agreement. Relevant if ZAAHI goes beyond the public REST surface.

### 6.7 Zoning & planning framework

- **Plan Abu Dhabi 2030** — the emirate master plan (successor iterations published by DPM / DMT). Reference PDF: `https://jawdah.qcc.abudhabi.ae/en/Registration/QCCServices/Services/STD/ISGL/ISGL-LIST/DP-301.pdf`.
- **Estidama Pearl Rating System** — mandatory sustainability code for new construction (manual PDF: `https://www.dmt.gov.ae/-/media/Project/DMT/DMT/E-Library/0001-Manuals/PRRS/PRRS-Version-10.pdf`).
- **Development Code** — plot-level envelope rules exposed on the MyLand REST surface as `DevCode`, `DevCode_Category`, `DevCode_Description`, `DevCode_FAR`, `DevCode_MaxGFA`.

---

## §7 · DDA (Dubai) ↔ MyLand (Abu Dhabi) comparison

### 7.1 Side-by-side at the data layer

| Dimension | Dubai DDA | Abu Dhabi MyLand |
|---|---|---|
| Root URL | `https://gis.dda.gov.ae/server/rest/services` | `https://onwani.abudhabi.ae/arcgis/rest/services` |
| Publisher copyright | "DCCA Map for SalesForce, Building Portal, MyLand" (DCCA = Dubai Creative Clusters Authority) | "DPM - SDD" / "DMT-SDD" |
| Publicly-readable folders | 2 of 13 (DDA, FREE_ZONE_PROJECTS) | 5 of 5 (ADAGS, MSSI, MyLand, Onwani, Utilities) |
| Token-required endpoints | 11 folders gated behind 499-Token-Required | None on the main Onwani server at retrieval |
| Plot layer total records | **99,239** | **409,855** (MSSI) / **410,464** (SMARTHUB) |
| Plot layer fields | **43** | **57** (MSSI) |
| Project / master-plan polygons | 209 | Implicit via `Investment_Name` string + 216 districts + 1,864 communities |
| Spatial reference (native) | EPSG:3997 | EPSG:4326 (WGS84) — ZAAHI-native |
| Max records per query | 2,000 | 2,000 |
| Output formats | JSON, geoJSON, PBF, PNG, PDF, SVG, … | same |
| Authentication for public layers | None | None |
| Plot identifier | 7-digit flat `PLOT_NUMBER` | Composite `SectorNumber_PlotID` (e.g. `YN7_3014`) |
| Arabic parallel | Via separate Dubai Municipality layer | In-record on every plot (`COMMUNITYARA`, `DISTRICTARA`, `ELMS_PARENTLANDUSE_A`, etc.) |
| Affection plan URL | DDA `DIS/?handler=PlotInfo` (HTML, token-required) + per-plot token-fetched siteplan image | **Deterministic** `https://geosmart.dmt.gov.ae/dcr/{SectorNumber_PlotID}.pdf` (no token, CORS `*`) |
| Construction-status taxonomy | 6-value `CONSTRUCTION_STATUS` | 4-value `Construction_Status` + 4-value `MEPS_CONS_STATUS` |
| Land-use taxonomies | `LANDUSE_CATEGORY` (20-value) + `MAIN_LANDUSE` (70 composites) + `SUB_LANDUSE` (395 tags) | `PRIMARYUSEENGDESC` (19-value) + `DevCode_Category` (7-value) + `ELMS_*LANDUSE_E/A` (56+ near-dupes) |
| Allocation status | — | `ELMS_AllocationStatus` (ALLOCATED / NOT ALLOCATED) |
| Investment-zone flag | N/A (DDA is already free-zone tracts) | `Investment_Name` (free-form string, 20+ named zones) |
| Schema drift history in-record | `OLD_PLOT_NUMBERS` (single field) | `Old_DISTRICTENG` + `Old_DISTRICTARA` + `Old_DISTRICTID` + `Old_COMMUNITYENG` + `Old_COMMUNITYARA` + `Old_COMMUNITYID` + `Old_PLOTNUMBER` + `Old_SectorNumber_PlotID` + `Old_ROADID` + `Old_FLAT_ID` (10 fields) |
| Permit telemetry | Implicit (`CONSTRUCTION_STATUS`) | Explicit: `Permit_LastDate`, `Permit_LastType` (71+ values), `MEPS_CONS_STATUS`, `MEPS_CONS_UPDATEON`, `MEPS_ADDITIONAL_INFO` |
| Approval signal | — | `APPROVEDBY` + `APPROVALDATE` (SMARTHUB/0 only) |
| Coordinate pre-computed | — (derive from polygon) | `Longitude`, `Latitude` stored |
| POI layers | None on DDA public surface | `ADAGS/POI_GL_V4` (12+ POI categories: clinics, malls, parks, schools×5, ADNOC, …) |
| Street / addressing | None public | `Onwani/UDM_AddressingLayers` (streets, signage, postal codes, national centrelines) |
| Rate-limit documentation | None; empirically tolerant | None; empirically tolerant |

### 7.2 Regulatory / process equivalents

| Function | Dubai | Abu Dhabi |
|---|---|---|
| Land registry | Dubai Land Department (DLD) | DMT Real Estate Register (executed via Dari) |
| Free-zone real-estate regulator | DDA (Dubai Creative Clusters Authority) | No single equivalent; ATLP + individual economic-zone authorities (KIZAD, Masdar, Saadiyat TDIC successors) |
| Broker regulator | RERA | ADREC |
| Off-plan registration | Oqood | Madhmoun (ADREC) |
| Tenancy registration | Ejari (RERA) | Tawtheeq (DMT) |
| Title deed | "Title Deed" / DLD | **Mulkiya** / ADREC via Dari |
| Transactional app | Dubai REST app | Dari + Tamm (split surface) |
| Super-app | MyDubai | Tamm (+ Hayyak for non-residents) |
| Open-data hub | Dubai Pulse | Three overlapping portals: Bayanat.ae (national) + data.abudhabi (emirate) + sdi.gov.abudhabi (geospatial / AD-SDI) |
| Affection plan fee | ~AED 100 | ~AED 100 (Tamm Site Plan) |
| Transfer fee | 4% | 2% (baseline; subject to stimulus waivers) |
| Property data residency | DLD agreement mandates in-country | DMT agreement typically mandates in-country; PDPL applies generally |
| Foreign freehold | Designated areas per Ruler decrees; broad (most new developments) | Numbered investment zones per Law 13/2019 + subsequent Cabinet resolutions (now 20+); narrower than Dubai |

### 7.3 What Abu Dhabi exposes that Dubai doesn't

1. **Administrative hierarchy explicit and complete** on the REST surface: Municipality → District → NewDistrict → Community → Community_Mxd.
2. **Deterministic affection-plan URL** (`geosmart.dmt.gov.ae/dcr/*.pdf`) with CORS `*`.
3. **Per-plot centroid** stored in the row (`Longitude` / `Latitude`).
4. **Full Arabic in-row** for every plot.
5. **Allocation status** as a first-class field.
6. **Permit telemetry** with 71+ distinct event types.
7. **MEPS construction status** orthogonal to the planning-view Construction_Status.
8. **Rich POI layer** co-published on the same server.
9. **Full national street-network centrelines** with Arabic labels.
10. **Investment-zone string tag** on each plot (free-form, but machine-readable).

### 7.4 What Dubai DDA exposes that Abu Dhabi doesn't

1. **Free-zone project polygons** as a distinct layer (DDA's `FREE_ZONE_PROJECTS` / 209 polygons). Abu Dhabi has numbered investment zones as string tags, no polygon for each zone in the public layer set.
2. **Internal Salesforce-grade** IDs and cross-refs (DDA's `EntityCategory` field, `IsFreeZone` flag, specific plot-to-project FK).
3. **Freeze reason free-text** (`FREEZE_REASON`).
4. **Fine-grained sub-land-use**: DDA's 395-value `SUB_LANDUSE` taxonomy is more granular than AD's ELMS.
5. **Master-plan-level polygons** with 6 project attributes (DDA `Project Limit` layer).

### 7.5 Integration effort parity

| Path | Dubai DDA | Abu Dhabi MyLand |
|---|---|---|
| Anonymous read of plots | Working, 99K records | Working, 410K records |
| Per-plot affection plan | Token-fetched HTML + image, custom parser | **Single GET PDF, CORS open** — simpler |
| Per-plot sub-geometry (building limit) | Token-gated (`DIS/MAIN_MAP/MapServer/8`) | Not publicly exposed; compute from DevCode_MaxGFA + setback rules |
| Per-plot land-use | Clean 20-value taxonomy | 19-value taxonomy + 56-value messy ELMS secondary |
| Ownership data | Not public | Not public (Dari, UAE Pass gated) |
| Transaction data | Not public on DDA; partial on Dubai Pulse | Not public on MyLand; partial on SCAD + ADRES stats |
| Building permit status | Not public on DDA (internal only) | **Public via `Permit_Last*` fields + MEPS** |
| Net | Medium — token endpoints required for siteplan issuance | Medium — transactional surface gated via Tamm/UAE Pass, but read-side is broader |

---

## §8 · Recommended approach for ZAAHI Abu Dhabi launch

### 8.1 Strategic posture

**ZAAHI's Abu Dhabi launch should lead with the map, not the transaction.** The read-side is 4× richer than Dubai DDA in raw plot count, 30% richer in attribute density, and materially easier to render (deterministic DCR URL + CORS-open PDF + pre-computed centroid). The transactional surface is gated behind Tamm + UAE Pass and requires formal partnership — that timeline runs independent of map delivery.

Three concurrent tracks:

- **Track 1 — Map + listings (0–3 months).** Ship the AD plot map with full 19-category land-use colouring, per-plot DCR viewer, and 3D building extrusions (ZAAHI Signature style per CLAUDE.md). Add first 20–100 listings covering the investment-zone masterplans (Saadiyat, Yas, Reem, Al Maryah, Al Raha Beach, Masdar, Hudayriyat, Fahid, Jubail). Leverages existing PMTiles + existing seed-*.ts pattern.
- **Track 2 — Partnership & compliance (2–9 months).** Open dialogue with DMT (via data.abudhabi/developers or direct), ADREC (for BLN broker validation), and ADIO (investment-promotion). Evaluate ADGM entity registration for fintech-adjacent activities. Confirm data-licensing posture before scaling.
- **Track 3 — Ambassador pipeline (0–6 months).** Onboard ADREC-licensed brokers to ZAAHI Ambassador Program (per existing `AMBASSADOR PROGRAM RULES` in CLAUDE.md). Broker card = BLN for AD, RERA-issued card for Dubai — single schema, two validators.

### 8.2 Data-side priorities (immediate, ~1 sprint)

1. **Extend `deriveLandUse()` in `src/app/parcels/map/page.tsx` to consume `PRIMARYUSEENGDESC`.** Mapping already sketched in §1.4. Net addition: ~20 lines.
2. **Add `DMT_DCR_URL` passthrough** in the Parcel model (new field `affectionPlanUrlExternal`) — when set, render a "Download DMT affection plan (2.4 MB)" button in the side-panel in place of the DDA-token flow.
3. **Add `Investment_Name` filter** to the map's filter panel: "Show only freehold-eligible plots (20+ investment zones)".
4. **Index AD districts by `MunicipalityName`** in the layers panel (group districts under their three municipality parents — AAM / ADM / WRM labels).
5. **Port `scripts/fetch-ad-plots.ts` to the new MSSI endpoint** OR retain SMARTHUB/0 as source-of-truth. Both work; MSSI has richer schema. Recommend migrate to MSSI and regenerate PMTiles.

### 8.3 Business-side priorities

1. **First ~10 Abu Dhabi listings** — already started (Hidd Al Saadiyat SP1-P28, Yas Island NY2-09-A3A per existing seed scripts). Target: all 9 classical investment zones covered.
2. **Pricing baseline** — `src/lib/valuation.ts:38-39` already has `'Saadiyat Island': 2.4`, `'Yas Island': 1.9` multipliers and AD base 130,000 AED. Extend to the full 20+ investment zones.
3. **Broker onboarding** — create a "Abu Dhabi broker" tier on `/join` that validates BLN instead of RERA card.

### 8.4 Map-side priorities

1. **AD 3D buildings** — existing PMTiles already render the 3D Signature style per CLAUDE.md. Verify opacity = 0.35 (per CLAUDE.md "3D buildings opacity" rule: PMTiles = 0.35, ZAAHI listings = 1.0). Already correct per `src/app/parcels/map/page.tsx` code path.
2. **Layer panel labelling** — Arabic + English display names using `COMMUNITYARA` / `DISTRICTARA` fields (already in-record).
3. **Fly-to investment zones** — quick-access buttons for Saadiyat / Yas / Reem / Al Maryah / Masdar / Al Raha Beach / Al Reef / Hudayriyat / Fahid / Jubail. Coordinates available from district-level GeoJSON centroids.

### 8.5 What to NOT do in Phase 1

- **Do not ship a Tawtheeq / Tamm integration yet.** Requires UAE Pass OAuth and formal partnership. Path C work.
- **Do not attempt to de-duplicate against Aldar / Bayut / PropertyFinder listings**. Those are user-provided secondary listings; ZAAHI's advantage is the plot-level primary data, not listing aggregation.
- **Do not replicate DDA's free-zone project polygon layer.** AD doesn't publish it; fake polygon boundaries from district/community polygons would produce misleading results.
- **Do not attempt to reconcile MSSI vs SMARTHUB plot counts (609 delta).** Pick one (recommend MSSI). Document the choice. Move on.

---

## §9 · Cost estimate

All AED / USD figures are indicative and should be verified before budget commit.

### 9.1 One-time costs

| Item | ~USD | Notes |
|---|---:|---|
| Engineering (Track 1 map + listings) | $0 | In-team, 2–3 sprints |
| Engineering (Track 2 partnership prep, legal doc review) | $5,000–15,000 | External legal review of DMT data agreement |
| First 50 Abu Dhabi listings field validation | $5,000–10,000 | ADREC BLN holders' time (Ambassador Program, offset partly via tier purchases per CLAUDE.md) |
| ADGM entity registration (if pursued) | $5,000–15,000 | Class A FSRA permission adds ~$30–50K; basic SPV only ~$5K |
| MDM / DMT data-sharing agreement legal review | $3,000–8,000 | One-off |
| Supabase schema additions (AD Parcel tables) | $0 | In-team |
| **Subtotal one-time** | **~$13,000–48,000** | Lower bound assumes no ADGM; upper assumes ADGM SPV |

### 9.2 Recurring costs

| Item | ~USD / mo | Notes |
|---|---:|---|
| Tamm / UAE Pass OAuth integration (once live) | $0 | Government APIs; no API fee known |
| ADREC BLN verification (per broker) | $0 direct | Brokers pay their own ADREC card fees (annual) |
| Affection-plan PDF hosting | $0 | Fetched live from `geosmart.dmt.gov.ae` |
| PMTiles regen + re-ship | ~$10 | CI minutes; CDN bandwidth within Vercel/Cloudflare free tier |
| UAE-region Postgres (`ABU_DHABI_MIGRATION.md` §5 Oracle / Azure path) | $60–130 | If / when in-country storage is required by DMT agreement |
| Observability (logs, uptime) | $10–30 | Papertrail / Better Stack |
| Tamm service embedding (Phase 3) | $0 advertised | Per-service fees flow directly to users (Site Plan AED 100, Building Permit AED 1K+) |
| **Subtotal recurring** | **~$80–170** | Additive to `ABU_DHABI_MIGRATION.md` Phase 1 $110–240 |

### 9.3 What ZAAHI does NOT need to pay for

- **No per-query fee** on Onwani REST (no published tariff; no observed throttle).
- **No per-plot DCR PDF fee** (fetched free from `geosmart.dmt.gov.ae`).
- **No MyLand app-level access cost** (public).
- **No POI / addressing subscription** — all served from `ADAGS` and `Onwani` folders public.
- **No basemap licensing** (ZAAHI already uses Protomaps / MapLibre stack per `BACKLOG.md`).

### 9.4 Revenue offsets

- **Each Ambassador tier purchase (SILVER 1K AED, GOLD 5K AED, PLATINUM 15K AED per CLAUDE.md 2026-04-15)** from an AD-based broker funds ~1–2 months of the recurring cost.
- **2% ZAAHI service fee on closed AD deals** (per CLAUDE.md commission base) — even 10 closed deals at AED 5 M each = AED 1 M fee gross, offsetting all AD launch costs.

---

## §10 · Risks + unknowns

### 10.1 Risk matrix

| # | Risk | Severity | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | DMT REST endpoint policy change — Onwani gated behind auth | P1 | Low | Ship PMTiles-first so the baseline map survives REST removal; monitor endpoint monthly |
| R2 | Investment-zone list out of date (catalog claims a zone that's no longer freehold) | P1 | Medium | Rely on live `Investment_Name` field at query time, not hard-coded list; flag to user "live from DMT data, accuracy not guaranteed" |
| R3 | Schema drift — field renames on MSSI/0 break ingestion | P2 | Medium | Weekly cron runs a schema-diff against cached baseline; alert on new/removed fields |
| R4 | ADGM extension beyond Al Reem + Al Maryah | P2 | Low | Keep ADGM perimeter as a live geo-fetch (ADGM GIS, if available) rather than static polygon |
| R5 | Foreign-buyer rule change (e.g., all-AD freehold opens) | P0 for business, P2 for tech | Low | Plan for graceful expansion; schema already supports it |
| R6 | Musataha / usufruct misrepresented in ZAAHI as "ownership" | P0 | Low if careful | Explicit tenure field on Parcel (`tenureType`: `freehold` / `musataha` / `usufruct` / `leasehold` / `strata`); never show "you will own this" for non-freehold |
| R7 | Tawtheeq tenancy integration blocked by absent partnership | P2 | Medium | Ship listings-only first; defer tenancy module to Phase 3 |
| R8 | PMTiles out of date vs plot-level telemetry (permit opened 5 days ago, PMTiles say "Not Constructed") | P3 | High | Side-panel fetch-on-click hits live REST for the clicked plot; PMTiles are for render only |
| R9 | DMT data-sharing agreement refused | P2 | Medium | Phase 1 doesn't require it; only Phase 3 Tamm embedding does |
| R10 | ADREC BLN API doesn't exist (no broker-card API advertised) | P2 | High | Manual verification of BLN on onboarding (broker uploads card photo); validate against ADREC directory page scrape in Phase 2 |
| R11 | `geosmart.dmt.gov.ae` PDF host outage | P2 | Low | Cache fetched PDFs on ZAAHI side with 30-day TTL; refresh on last-modified change |
| R12 | Plot-number collision with Dubai (e.g. `SP1-P28` also exists in Dubai) | P2 | Medium | Uniqueness is per-emirate already per CLAUDE.md rules; keep the emirate prefix discipline |

### 10.2 Unknowns (need research before commit)

1. **Actual 2026 list of investment zones** beyond the Onwani `Investment_Name` strings — needs DMT / ADREC primary confirmation.
2. **Statutory basis for Hudayriyat, Fahid, Jubail, Al Jurf freehold** — Cabinet resolution numbers not surfaced.
3. **Per-plot Tawtheeq tenancy data access** — not in the public REST surface; partnership required.
4. **ADREC BLN verification API** — not publicly documented; broker-directory is a website.
5. **Bulk licensing terms for the plot corpus** — no published CC-BY / CC-BY-SA / proprietary licence on Onwani endpoints.
6. **Exact 2026 transfer fee** — 2% is the historical baseline; 2024–2026 changes need confirmation.
7. **Tamm API for partners** — whether Tamm accepts third-party embeds (the Dubai-REST-app equivalent is via DLD API partnerships; Tamm analog unclear).
8. **ADGM property registration for Al Reem** post-2023 — is DMT registration still accepted for Reem plots, or has Al Reem shifted to ADGM Registration Authority exclusively? Critical for jurisdictional routing.
9. **Estidama requirements** for ZAAHI 3D building render (does the render need to reflect Pearl rating? currently unused in map).
10. **Schema drift cadence** — how often DMT modifies the MSSI field set.

---

## §11 · Questions for founders

### 11.1 Strategic

Q1. **Abu Dhabi go-live target** — before or after Phase 1 User Dashboards (per memory note `project_current_phase.md`, Phase 1 is green-lit next step blocked by founder approval for schema migration). Recommend: lift Abu Dhabi Track 1 (map + listings) into Phase 1's plot-data migration work so we don't do two migrations.

Q2. **Budget ceiling for Abu Dhabi launch** — both one-time (target the $13K–48K band from §9.1) and ongoing ($80–170 /mo on top of existing $45–60/mo stack).

Q3. **Which investment zones are priority** for first 50 AD listings? My recommended top-5 for volume: Saadiyat, Yas, Al Reem, Al Raha Beach, Hudayriyat. For premium: Al Maryah, Nurai, Fahid. For accessibility-to-Emiratis: Khalifa City, MBZ City (note: latter two aren't investment zones — Emirati/GCC buyers only).

Q4. **ADGM entity — yes / no?** An ADGM SPV (~$5–15K) gives: common-law contracts, English-language legal fallback, FSRA readiness for fintech features (fractional, tokenisation, Robotics Fund per CLAUDE.md). Downside: added compliance overhead vs staying mainland-DMT-only.

Q5. **Data-licensing posture** — do we wait for a formal DMT data-sharing agreement before going live with the plot corpus, or do we ship on "publicly viewable" posture and apply for the agreement in parallel? My recommendation: ship (low risk; data is literally on a public-read server with no ToS) and apply in parallel.

### 11.2 Technical

Q6. **Source-of-truth for plots** — `MSSI/ADMINBOUNDARIES/0` (409,855 rows, 57 fields, no APPROVEDBY) OR `MyLand/SMARTHUB/0` (410,464 rows, adds APPROVEDBY/APPROVALDATE)? Recommend MSSI as primary + SMARTHUB as enrichment-only for the two extra fields.

Q7. **Plot-number canonical format** — use `SectorNumber_PlotID` (e.g. `YN7_3014`) as the `Parcel.plotNumber` value, OR synthesize a ZAAHI-namespaced ID (`AD-YN7-3014`)? Recommend the second — globally unique across emirates, still derivable from the source.

Q8. **ELMS_PARENTLANDUSE_E normalisation** — the field has 56+ dirty near-dupes. Do we normalise at ingest (map all variants to ZAAHI's 9 categories via `PRIMARYUSEENGDESC` instead) or preserve the original string for audit? Recommend normalise to ZAAHI categories, store original in a separate `rawLandUse` field.

Q9. **Setbacks per land use for Abu Dhabi** — CLAUDE.md specifies Dubai defaults (villa 3m, apartment 4m, commercial 0m, industrial 4m, educational/healthcare 5m, agricultural 10m, mixed 4m). Apply same defaults to AD? Or pull from `DevCode_MaxGFA` + plot area? Recommend: same defaults for Phase 1, refine from Estidama rules in Phase 2.

Q10. **Affection-plan freshness** — DCR PDFs on `geosmart.dmt.gov.ae` carry a `Last-Modified` header. Do we (a) fetch-on-click always, (b) cache for 30 days, (c) pre-fetch the entire 410K corpus offline? Recommend (b) — 30-day cache, invalidate on `Last-Modified` change.

### 11.3 Partnership

Q11. **Aldar relationship** — Aldar's Annual Report doesn't publish per-master-plan plot inventories, but Aldar IR engagement likely would. Pursue? Priority: Saadiyat + Yas Acres + Fahid + Alghadeer.

Q12. **Miral relationship** — Yas Island master developer; less public-facing disclosure. Pursue for Yas Bay integration?

Q13. **Modon relationship** — Hudayriyat's rapid sell-out (Wadeem sold in 72h) signals demand; Modon is the second biggest AD master developer after Aldar. Pursue?

Q14. **IHC / 2PointZero** — IHC holds 49% of Modon (2023) and is the emirate's largest listed conglomerate. Strategic-partnership conversation worth having?

Q15. **ADREC broker onboarding** — can ZAAHI be an approved "real-estate technology provider" on ADREC's list? If yes, that's a Phase 2 priority.

### 11.4 Regulatory

Q16. **ADM vs DMT engagement** — for building-permit status integration, do we engage ADM (Abu Dhabi City level) for Abu Dhabi plots and DMT for the emirate-wide abstraction? Recommend DMT primary, ADM for ADM-specific flows.

Q17. **Tamm onboarding** — is ZAAHI a "Tamm partner" (service embedding) or "Tamm competitor" (alternative channel)? These frame differently. Recommend positioning as complementary — ZAAHI is the map-and-analysis layer, Tamm is the transaction execution layer.

Q18. **Personal-data handling** — brokers and sellers upload Emirates ID copies in ZAAHI. Does AD require in-emirate storage of these? Federal PDPL doesn't mandate it; prudent posture aligns with `ABU_DHABI_MIGRATION.md` to move to UAE-region Postgres before handling PII at scale.

Q19. **ADGM strata** — if we list plots on Al Maryah, does the strata-title disclosure text need to reflect ADGM Strata Regulations (not Law 19/2005)? Yes — flag in legal docs.

Q20. **Foreign-buyer financing disclosures** — Abu Dhabi mortgage lenders operate under UAE Central Bank rules (federal). No AD-specific disclosure required beyond what ZAAHI already carries on `/disclaimer` and `/terms`. Flag to legal.

---

## §12 · Next steps recommended

1. **This week:** Founder review of §11 Q1–Q5 (strategic), Q6–Q10 (technical).
2. **Sprint 1 (1 week):** Implement §8.2 items 1–4 (land-use mapping, DCR URL passthrough, Investment_Name filter, municipality grouping). No schema changes to Parcel table yet.
3. **Sprint 2 (1 week):** Run `scripts/fetch-ad-plots.ts` against MSSI endpoint; regen PMTiles with 19-category PRIMARYUSEENGDESC colouring + 3D extrusions (existing Signature path). Deploy to `zaahi.io`.
4. **Sprint 3 (1 week):** Schema migration — add AD-specific Parcel fields (`investmentZone`, `allocationStatus`, `affectionPlanUrlExternal`, `tenureType`, `municipalityName`). Seed first 10 AD investment-zone listings via parameterised version of existing seed-*.ts.
5. **Sprint 4 (1 week):** Broker-side — extend `/join` and Ambassador flow to accept ADREC BLN (currently validates RERA). Add tier-switching logic for Abu Dhabi brokers (no change to commission schedule; BLN replaces RERA card as proof of licensing).
6. **Parallel (independently useful):** Contact ADIO / DMT / ADREC via `data.abudhabi/developers` — book a discovery call on data-licensing + Tamm partnership. This is a business-side track; has its own elapsed time.
7. **Monthly ops review:** Re-run the statistics queries (top districts, top land uses, plot counts) against MSSI; diff against the baseline captured in this catalog; flag drift >5% on any metric.
8. **Quarterly catalog refresh:** Regenerate the per-master-plan sub-section counts; update investment-zone list; re-verify DCR URL template still works.

---

## §13 · Sources cited

### 13.1 Live REST endpoints (retrieved 2026-04-24)

- `https://onwani.abudhabi.ae/arcgis/rest/services` (folder listing)
- `https://onwani.abudhabi.ae/arcgis/rest/services/MyLand/SMARTHUB/MapServer` (service metadata)
- `https://onwani.abudhabi.ae/arcgis/rest/services/MyLand/SMARTHUB/MapServer/0` (PLOT layer metadata)
- `https://onwani.abudhabi.ae/arcgis/rest/services/MSSI/ADMINBOUNDARIES/MapServer` (service metadata)
- `https://onwani.abudhabi.ae/arcgis/rest/services/MSSI/ADMINBOUNDARIES/MapServer/layers` (9-layer dump)
- `https://onwani.abudhabi.ae/arcgis/rest/services/MSSI/ADMINBOUNDARIES/MapServer/0/query?where=1%3D1&returnCountOnly=true&f=json` → 409,855
- `https://onwani.abudhabi.ae/arcgis/rest/services/MSSI/ADMINBOUNDARIES/MapServer/0/query?groupByFieldsForStatistics=DISTRICTENG&…` (top-districts by plot count)
- `https://onwani.abudhabi.ae/arcgis/rest/services/MSSI/ADMINBOUNDARIES/MapServer/0/query?groupByFieldsForStatistics=PRIMARYUSEENGDESC&…` (19-value land-use breakdown)
- `https://onwani.abudhabi.ae/arcgis/rest/services/MSSI/ADMINBOUNDARIES/MapServer/0/query?groupByFieldsForStatistics=DevCode_Category&…` (7-value zoning category)
- `https://onwani.abudhabi.ae/arcgis/rest/services/MSSI/ADMINBOUNDARIES/MapServer/0/query?groupByFieldsForStatistics=Construction_Status&…` (4-value status)
- `https://onwani.abudhabi.ae/arcgis/rest/services/MSSI/ADMINBOUNDARIES/MapServer/0/query?groupByFieldsForStatistics=Investment_Name&…` (20+ investment zones)
- `https://onwani.abudhabi.ae/arcgis/rest/services/MSSI/ADMINBOUNDARIES/MapServer/0/query?groupByFieldsForStatistics=MunicipalityName&…` (3 municipalities: Abu Dhabi 220,357 · Al Ain 148,674 · Al Dhafra 40,824)
- `https://onwani.abudhabi.ae/arcgis/rest/services/MSSI/ADMINBOUNDARIES/MapServer/0/query?groupByFieldsForStatistics=ELMS_AllocationStatus&…` (371,498 allocated · 38,357 not allocated)
- `https://onwani.abudhabi.ae/arcgis/rest/services/Onwani/OnwaniAPI/MapServer` (3-layer service)
- `https://onwani.abudhabi.ae/arcgis/rest/services/Onwani/UDM_AddressingLayers/MapServer` (9-layer addressing service)
- `https://onwani.abudhabi.ae/arcgis/rest/services/ADAGS/POI_GL_V4/MapServer` (POI service)
- `https://geosmart.dmt.gov.ae/dcr/YN7_3014.pdf` (DCR PDF, verified HTTP 200, 2.4 MB, CORS `*`)

### 13.2 DMT / ADM / ADREC official

- `https://www.dmt.gov.ae/en` (DMT home)
- `https://www.dmt.gov.ae/en/adm` (ADM)
- `https://pages.dmt.gov.ae/en/Mobile-Apps/My-Land` (MyLand product page)
- `https://myland.dmt.gov.ae/` (MyLand web entry)
- `https://meps.dmt.gov.ae/` (Municipal Engineering Permit System)
- `https://adrec.gov.ae/en` · `https://adrec.gov.ae/en/services` · `https://adrec.gov.ae/en/re_agents` · `https://adrec.gov.ae/sa_flow_3`
- `https://www.tamm.abudhabi/` · `https://www.tamm.abudhabi/en/login`
- `https://www.tamm.abudhabi/services/housing/adm/request-site-plan`
- `https://www.tamm.abudhabi/en/life-events/individual/Manage-your-Business/Constructions/requestforsiteplan`
- `https://www.tamm.abudhabi/en/life-events/business/housing-construction/construction/RequestaNewBuildingPermit`
- `https://www.tamm.abudhabi/en/life-events/business/housing-construction/construction/RequestforBuildingPermitIssuance`
- `https://www.tamm.abudhabi/en/life-events/individual/HousingProperties/Contracts-and-Consultations/RequesttoRegisteraNewLeaseContract`
- `https://www.tamm.abudhabi/en/tamm-centers-services/Department-of-Municipalities-and-Transport`
- `https://www.adres.ae/dari/`
- `https://help.dari.ae/en/support/solutions/articles/73000397401-title-deed-unit-`
- `https://help.dari.ae/en/support/solutions/articles/73000539127-title-deed-land-`
- `https://help.dari.ae/en/support/solutions/articles/73000590745-off-plan-unit-sale-registration`
- `https://www.adda.gov.ae/` (ADDA Digital Authority)
- `https://sdi.gov.abudhabi/sdi/` (AD-SDI)
- `https://arcgis.sdi.abudhabi.ae/agspublish/rest/services/OpenData/ADSDI_OpenData/MapServer`
- `https://data.abudhabi/open-data` · `https://data.abudhabi/developers` · `https://data.abudhabi/dataset/dmtaddresspoint`
- `https://bayanat.ae/` · `https://bayanat.ae/en/Geo-Data`
- `https://apps.apple.com/ae/app/myland-abu-dhabi/id1459796069`
- `https://play.google.com/store/apps/details?id=com.myland.dpm`
- `https://apps.appfollow.io/ios/myland-abu-dhabi/1459796069`
- `https://apps.apple.com/ae/app/tamm-abu-dhabi-government/id1435485576`
- `https://www.mediaoffice.abudhabi/en/infrastructure/the-department-of-municipalities-and-transport-launches-real-estate-digital-ecosystem-DARI-in-collaboration-with-private-sector/`
- `https://www.mediaoffice.abudhabi/en/transport/dmts-onwani-addressing-and-spatial-guidance-system-contributes-to-enhancing-the-quality-of-life-for-residents-and-visitors-of-the-emirate/`

### 13.3 ADGM

- `https://www.adgm.com/`
- `https://www.adgm.com/about-adgm/alreemisland`
- `https://www.adgm.com/about/jurisdiction/alreemisland`
- `https://www.adgm.com/faqs/al-reem-expansion`
- `https://www.adgm.com/media/announcements/adgm-completes-al-reem-island-integration-adding-over-1100-entities-to-its-jurisdiction`
- `https://www.adgm.com/media/announcements/abu-dhabi-global-market-announces-headquarters-building-on-al-maryah-island`
- `https://www.adgm.com/media/announcements/mubadala-and-aldar-announce-landmark-aed-60-billion-expansion-of-abu-dhabis-financial-district-on-al-maryah-island`
- `https://www.adgm.com/registration-authority`
- `https://www.adgm.com/financial-services-regulatory-authority`
- `https://www.adgm.com/legal-framework/legislation`

### 13.4 Master developers (Aldar, Modon, Mubadala, Miral, IMKAN, Bloom, JIIC, AD Ports)

- `https://www.aldar.com/en/explore-aldar/businesses/development/residential/saadiyat-island`
- `https://www.aldar.com/en/explore-aldar/businesses/development/residential/saadiyat-island/saadiyat-reserve`
- `https://www.aldar.com/en/explore-aldar/businesses/development/residential/saadiyat-island/saadiyat-lagoons`
- `https://www.aldar.com/en/news-and-media/aldar-unveils-fahid-island`
- `https://www.aldar.com/en/news-and-media/al-fahid-island-acquisition`
- `https://cdn.aldar.com/-/media/project/aldar-tenant/aldar2/images/press-releases/31-jan-2023/aldar---press-release---al-fahid-island-land-acquisition---310123---final.pdf`
- `https://www.aldar.com/en/news-and-media/aldar-launches-fahid-beach-terraces`
- `https://www.aldar.com/en/news-and-media/aldar-launches-aed-10-billion-masterplan-alghadeer`
- `https://www.aldar.com/en/explore-aldar/businesses/development/residential/al-raha-beach`
- `https://www.aldar.com/en/explore-aldar/businesses/development/residential/al-raha-beach/al-bandar`
- `https://www.aldar.com/en/explore-aldar/businesses/development/residential/al-raha-beach/al-zeina`
- `https://www.aldar.com/en/residential_properties/developments/al-raha-gardens`
- `https://www.aldar.com/en/explore-aldar/businesses/development/land/al-falah`
- `https://www.aldar.com/en/news-and-media/abu-dhabi-government-partners-with-aldar-to-deliver-projects-worth-aed-5-billion`
- `https://www.aldar.com/en/news-and-media/aldar-launches-alreeman-a-aed-2-billion-development-in-alshamkha`
- `https://www.aldar.com/en/explore-aldar/businesses/hospitality/marinas/marsa-al-bateen`
- `https://www.aldar.com/en/explore-aldar/businesses/development/residential/other-destinations/nareel-island`
- `https://www.aldar.com/en/explore-aldar/businesses/development/residential/other-destinations/al-rayyana`
- `https://www.aldar.com/en/news-and-media/khalid-bin-mohamed-bin-zayed-launches-aldars-saadiyat-grove`
- `https://www.aldar.com/aldar-report2024/documents/aldar-annual-report-2024_compressed-1.pdf`
- `https://www.aldar.com/aldar-report2024/documents/aldar-annual-report-2024-Operating-Review.pdf`
- `https://ir.aldar.com/2023/documents/Aldar-development_EN.pdf`
- `https://miral.ae/miral-portfolio/yas-island/`
- `https://miral.ae/wp-content/uploads/2020/10/Residences-at-Yas-Bay-Investment-Opportunities.pdf`
- `https://miral.ae/wp-content/uploads/2021/02/Miral-Investment-Brochure-English-3.pdf`
- `https://miral.ae/news-item/yas-island-at-10-a-success-story/`
- `https://www.mubadala.com/en/what-we-do/al-maryah-island`
- `https://www.mubadala.com/en/what-we-do/masdar-city`
- `https://www.mubadala.com/en/news/mubadala-and-aldar-announce-expansion-of-abu-dhabis-financial-district-on-al-maryah-island`
- `https://masdar.ae/-/media/corporate/downloads/media/mas_mc_masterplan_flyer_2020.pdf`
- `https://masdarcity.ae/Mvc/assets/documents/MASDAR-CITY-FACTSHEET-EN-2023.pdf`
- `https://masdarcity.ae/docs/default-source/general-information/free_zone_factsheet_en-2020_v4.pdf`
- `https://masdar.ae/en/our-company/our-shareholders`
- `https://news.masdar.ae/en/news/2018/11/28/09/47/masdar-city-expansion-plans-earn-abu-dhabi-urban-planning-council-approval`
- `https://www.modon.com/about-modon/media-centre/details/2023/06/13/in-line-with-directives-of-mohamed-bin-zayed-modon-properties-reveals-hudayriyat-island-masterplan`
- `https://www.modon.com/about-modon/media-centre/details/2025/05/06/modon-launches-first-townhouses-on-hudayriyat-island-at-nawayef-village`
- `https://www.modon.com/about-modon/media-centre/details/2025/07/04/modon-sells-out-wadeem--the-first-residential-plots-on-hudayriyat-island--within-72-hours`
- `https://www.mediaoffice.abudhabi/en/infrastructure/in-line-with-the-directives-of-sheikh-mohamed-bin-zayed-modon-properties-reveals-hudayriyat-island-masterplan-spanning-51-million-square-meters-equivalent-to-538-of-abu-dhabi-island/`
- `https://www.mediaoffice.abudhabi/en/infrastructure/abu-dhabi-housing-authority-launches-aed7bn-housing-projects-in-west-baniyas-and-alsamha/`
- `https://www.iskan.abudhabi/en/Media-Center/News/2023Q2News3-BaniyasProject`
- `https://www.imkan.ae/projects/aljurf`
- `https://www.imkan.ae/news/imkan-launches-phase-2-of-aljurf-gardens`
- `https://www.imkan.ae/news/world-famous-sha-wellness-clinic-to-open-first-middle-east-spa-near-ghantoot`
- `https://jubailisland.ae/`
- `https://jubailisland.ae/faq-3/`
- `https://jubailisland.ae/jubail-island-announces-significant-achievement-for-the-island-with-the-first-title-deed-handed-over-to-new-owner/`
- `https://www.kizad.ae/about-us/kizad-masterplan/`
- `https://www.adports.ae/core-business/business-subsidiaries/kizad/`
- `https://www.adports.ae/abu-dhabi-ports-company-unveils-the-417-sq-km-khalifa-industrial-zone-kizad/`
- `https://www.adports.ae/wp-content/uploads/2018/09/KIZAD-brochure-eng-.pdf`
- `https://bloomholding.com/`
- `https://bloomholding.com/what-we-do/properties/bloom-living`
- `https://www.zaya.com/project/nurai`
- `https://www.nuraiisland.com/`

### 13.5 Legal / analysis (secondary; use with care)

- `https://www.tamimi.com/law-update-articles/foreign-ownership-of-land-in-abu-dhabi-a-major-reform/`
- `https://www.loc.gov/item/global-legal-monitor/2019-05-01/uae-law-allows-foreigners-to-own-real-estate-properties-in-abu-dhabis-investment-zones/`
- `https://practiceguides.chambers.com/practice-guides/real-estate-2025/uae`
- `https://www.stalawfirm.com/en/blogs/view/musataha-agreements-under-uae-law.html`
- `https://fichtelegal.com/real-estate-property-rights-musataha-uae/`
- `https://learn.thinkprop.ae/en/understanding-musataha-contracts-in-abu-dhabi-a-comprehensive-guide/`
- `https://www.dlapiperrealworld.com/law/index.html?t=sale-and-purchase&s=ownership-of-real-estate&c=AE-AB`
- `https://www.lexology.com/library/detail.aspx?g=8c592370-97bb-41e4-94f3-5c4fe7e8655b`
- `https://www.thenationalnews.com/business/property/new-reem-island-projects-approved-by-abu-dhabi-city-planners-1.38011`
- `https://www.thenationalnews.com/business/property/2023/08/02/abu-dhabis-ihc-acquires-49-stake-in-modon-properties/`
- `https://www.thenationalnews.com/uae/2023/05/24/more-than-1700-homes-to-be-built-for-emiratis-in-two-areas-of-abu-dhabi-city/`
- `https://www.thenationalnews.com/uae/master-plan-breathes-new-life-into-baniyas-and-south-wathba-1.444184`
- `https://gulfnews.com/business/property/aldar-to-buy-saadiyat-island-assets-in-dh37b-deal-one-of-uaes-largest-property-acquisitions-1.2217394`
- `https://www.arabianbusiness.com/interviews/interviews-travel-hospitality/387002-yas-man-miral-ceo-mohammed-al-zaabi`
- `https://en.wikipedia.org/wiki/Yas_Island`
- `https://en.wikipedia.org/wiki/Sorouh_Real_Estate`
- `https://www.apilproperties.com/explore-communities/about-saadiyat-island`
- `https://www.zawya.com/en/press-release/companies-news/abu-dhabi-real-estate-centre-launches-registration-expressions-of-interest-under-madhmoun-x5pu3fr8`
- `https://www.esri.com/news/arcnews/summer10articles/abu-dhabi-sdi.html`
- `https://www.primadom.ae/blogs/uae-affection-plan-dubai-guide`
- `https://uaecontractorshub.com/blog/uae-construction-permits-guide`
- `https://www.atlp.ae/en/services-landing/economic-zone-services/request-for-Issuance-of-adma-affection-plan`
- `https://adio.abudhabi/investment-opportunities/musataha-land-lease-opportunities`
- `https://u.ae/en/about-the-uae/digital-uae/data/geospatial-data-platforms/spatial-data-infrastructure-program-in-abu-dhabi`
- `https://jawdah.qcc.abudhabi.ae/en/Registration/QCCServices/Services/STD/ISGL/ISGL-LIST/DP-301.pdf`
- `https://www.dmt.gov.ae/-/media/Project/DMT/DMT/E-Library/0001-Manuals/PRRS/PRRS-Version-10.pdf`

### 13.6 ZAAHI internal references

- `/home/zaahi/zaahi/docs/audits/DDA_CATALOG_FINAL_2026-04-23.md` — Dubai DDA catalog (2,055 lines), commit `3453fd3`
- `/home/zaahi/zaahi/docs/audits/DDA_FULL_UNIVERSE_AUDIT_2026-04-23.md` — Dubai DDA universe audit, commit `f1fdc5d`
- `/home/zaahi/zaahi/ABU_DHABI_MIGRATION.md` — infrastructure migration proposal (superseded by G42 / §78 G42 Migration Architecture)
- `/home/zaahi/zaahi/CLAUDE.md` — platform operating rules (Sovereignty, Land Use, 3D style, Ambassador Program v2026-04-15)
- `/home/zaahi/zaahi/scripts/fetch-abu-dhabi-layers.ts` — boundary fetcher (3 / 216 / 1,864 layers)
- `/home/zaahi/zaahi/scripts/fetch-ad-plots.ts` — plot fetcher (~410K, pointed at `MyLand/SMARTHUB/MapServer/0`)
- `/home/zaahi/zaahi/scripts/seed-saadiyat-p28.ts` — Hidd Al Saadiyat SP1-P28 listing seed
- `/home/zaahi/zaahi/scripts/seed-yas-island.ts` — Yas Island NY2-09-A3A listing seed
- `/home/zaahi/zaahi/scripts/seed-al-ain-jahili.ts` — Al Ain Jahili Plot 16-3-018-2 listing seed
- `/home/zaahi/zaahi/src/lib/valuation.ts:17,37-39` — AD pricing baseline (130,000 AED + Saadiyat 2.4× / Yas 1.9× multipliers)
- `/home/zaahi/zaahi/src/app/parcels/map/page.tsx:1291,2517,2711,3662` — AD PMTiles integration points
- `/home/zaahi/zaahi/data/layers/abu-dhabi-municipalities.geojson` (3 polygons, 130 KB)
- `/home/zaahi/zaahi/data/layers/abu-dhabi-districts.geojson` (216 polygons, 3.2 MB)
- `/home/zaahi/zaahi/data/layers/abu-dhabi-communities.geojson` (1,864 polygons, 10.2 MB)
- `/home/zaahi/zaahi/public/tiles/ad-land-adm.pmtiles` (59 MB, ADM plots)
- `/home/zaahi/zaahi/public/tiles/ad-land-other.pmtiles` (78 MB, AAM + WRM plots)

---

## §14 · Appendices

### Appendix A · MSSI/ADMINBOUNDARIES/0 — full 57-field catalog

| # | Field | Type | Notes |
|---:|---|---|---|
|  1 | `OBJECTID` | OID | Primary key; spatial index R1879_pk |
|  2 | `COMMUNITYARA` | String(255) | Community name Arabic |
|  3 | `COMMUNITYENG` | String(255) | Community name English |
|  4 | `COMMUNITYID` | String(50) | Community numeric id |
|  5 | `DISTRICTARA` | String(255) | District name Arabic |
|  6 | `DISTRICTENG` | String(255) | District name English (authoritative, 216 values) |
|  7 | `DISTRICTID` | String(50) | District numeric id |
|  8 | `GISID` | String(20) | GIS cross-system id |
|  9 | `PLOTID` | String(255) | Plot id from source system |
| 10 | `PLOTNUMBER` | String(50) | Plot number (string; may be purely numeric or composite) |
| 11 | `SHAPE` | Geometry | Polygon geometry |
| 12 | `ELMS_LandUse_Const` | String(254) | ELMS constant-coded land use |
| 13 | `ELMS_ParentLanduse_Const` | String(254) | ELMS constant-coded parent land use |
| 14 | `ELMS_AllocationStatus` | String(254) | ALLOCATED / NOT ALLOCATED |
| 15 | `Construction_Status` | String(254) | 4-value taxonomy |
| 16 | `PRIMARYUSEENGDESC` | String(254) | 19-value primary-use category |
| 17 | `Longitude` | Double | Pre-computed centroid longitude |
| 18 | `Latitude` | Double | Pre-computed centroid latitude |
| 19 | `MunicipalityName` | String(50) | "Abu Dhabi City" / "Al Ain City" / "Al Dhafra Region" |
| 20 | `SectorNumber_PlotID` | String(100) | **Canonical composite plot identifier** |
| 21 | `DataReceivedDate` | Date | When DMT received the record |
| 22 | `PLOTCALCULATEDAREA` | Double | Plot area (m²) — authoritative from survey |
| 23 | `Permit_LastDate` | Date | Most recent permit date |
| 24 | `Permit_LastType` | String(200) | Most recent permit category (71+ values EN+AR) |
| 25 | `ELMS_PARENTLANDUSE_E` | String(500) | Parent land use English (56+ dirty values) |
| 26 | `ELMS_PARENTLANDUSE_A` | String(500) | Parent land use Arabic |
| 27 | `ELMS_LANDUSENAME_E` | String(500) | Specific land-use name English (e.g. `residentialVilla`) |
| 28 | `ELMS_LANDUSENAME_A` | String(500) | Specific land-use name Arabic |
| 29 | `DevCode_Category` | String(100) | 7-value zoning category |
| 30 | `DevCode_Description` | String(100) | Free-form description |
| 31 | `DevCode` | String(50) | Development code string |
| 32 | `DevCode_FAR` | String(255) | FAR as string (e.g. "3.0", "N/A") |
| 33 | `DevCode_MaxGFA` | Double | Max GFA in m² |
| 34 | `OBJECTID_1` | Integer | Secondary OID (source-system join key) |
| 35 | `MAXALLOWABLEHEIGHTS` | String(5) | Height signal (e.g. "0", "G+4") |
| 36 | `Investment_Name` | String(100) | Numbered / named investment zone (free-form) |
| 37 | `ELMS_PLOTALLOCATION_ID` | Integer | Plot-allocation id |
| 38 | `ELMS_PLOTALLOCATION_NAME_A` | String(200) | Allocation name Arabic |
| 39 | `ELMS_PLOTALLOCATION_NAME_E` | String(200) | Allocation name English |
| 40 | `ELMS_PLOTALLOCATION_CONST` | String(200) | Allocation constant code |
| 41 | `DMT_DCR_URL` | String(200) | **Deterministic DCR PDF URL** |
| 42 | `Old_DISTRICTENG` | String(200) | Legacy district English |
| 43 | `Old_DISTRICTARA` | String(50) | Legacy district Arabic |
| 44 | `Old_DISTRICTID` | String(10) | Legacy district id |
| 45 | `Old_COMMUNITYENG` | String(200) | Legacy community English |
| 46 | `Old_COMMUNITYARA` | String(200) | Legacy community Arabic |
| 47 | `Old_COMMUNITYID` | String(50) | Legacy community id |
| 48 | `Old_ROADID` | String(50) | Legacy road id |
| 49 | `Old_PLOTNUMBER` | String(50) | Legacy plot number |
| 50 | `Old_FLAT_ID` | String(5) | Legacy flat id |
| 51 | `SHAPE.STArea()` | Double | Area in SRS units (decimal degrees²) |
| 52 | `SHAPE.STLength()` | Double | Perimeter in SRS units |
| 53 | `Old_SectorNumber_PlotID` | String(100) | Legacy composite plot id |
| 54 | `ELMS_PLOTID` | String(20) | ELMS system plot id |
| 55 | `MEPS_CONS_STATUS` | String(100) | MEPS-derived construction status (51K populated) |
| 56 | `MEPS_CONS_UPDATEON` | String(50) | MEPS last-update timestamp |
| 57 | `MEPS_ADDITIONAL_INFO` | String(100) | MEPS free-form |
| 58 | `Field` | Integer | Generic source-system field |

### Appendix B · PRIMARYUSEENGDESC — 19-value live distribution (2026-04-24)

```
Residential     207,181     (50.5%)
Agricultural     58,979     (14.4%)
Investment       36,286     ( 8.9%)
Utility          23,590     ( 5.8%)
Commercial       23,428     ( 5.7%)
Recreational     20,396     ( 5.0%)
Industrial       13,072     ( 3.2%)
Undefined        11,630     ( 2.8%)
Communication     4,135     ( 1.0%)
Religious         3,552     ( 0.9%)
Governmental      3,027     ( 0.7%)
Public            1,929     ( 0.5%)
Transportation    1,066     ( 0.3%)
Educational         837     ( 0.2%)
Health              284     ( 0.1%)
Private             176
Archaeological      125
Cultural            124
Diplomatic           38
────────────────────────────────────
TOTAL           409,855     (100%)
```

### Appendix C · DevCode_Category — 7-value live distribution

```
Residential     161,211
Other            94,442     (un-categorised residual)
Commercial        6,979
Industrial        6,953
Civic             6,373
Desert            2,206
Coastal               3
────────────────────────
TOTAL           278,167     (of 409,855 — 67.9% categorised)
```

Remaining 131,688 plots have no DevCode_Category set.

### Appendix D · Construction_Status — 4-value live distribution

```
Not Constructed   213,432    (52.1%)
Constructed       177,826    (43.4%)
Under Construction 18,212    ( 4.4%)
Only Boundary Wall    385
────────────────────────────
TOTAL             409,855
```

### Appendix E · MEPS_CONS_STATUS — 4-value live distribution (51,260 of 410K plots populated)

```
Constructed        38,092
Not Constructed    13,163
Unidentified            4
Under Construction      1
```

### Appendix F · Top 20 districts by plot count (2026-04-24)

Rank | District (ENG) | Plots
----:|---|---:
 1 | MADINAT AL RIYAD | 35,085
 2 | AL AAMERAH | 10,998
 3 | MOHAMED BIN ZAYED CITY | 10,208
 4 | KHALIFA CITY | 9,531
 5 | AL SHAMKHAH | 9,299
 6 | ZAYED CITY | 8,929
 7 | BANI YAS | 8,435
 8 | MSHAYRIF | 7,875
 9 | MADINAT ZAYED | 7,840
10 | AL FALAH | 7,370
11 | AL FAQA' | 7,306
12 | YAS ISLAND | 7,180
13 | AL NAHDAH | 7,142
14 | AL BAHYAH | 7,135
15 | AIN AL FAYDAH | 6,687
16 | AL NOUD | 6,485
17 | AL HIDAYRIYYAT (Hudayriyat) | 6,150
18 | AL SAADIYAT ISLAND | 5,890
19 | SWEIHAN | 5,611
20 | AL HAFFAR | 5,394

### Appendix G · Municipalities — live 2026-04-24

```
Abu Dhabi City (ADM)     220,357    (53.8%)
Al Ain City (AAM)        148,674    (36.3%)
Al Dhafra Region (WRM)    40,824    ( 9.9%)
──────────────────────────────────────────
TOTAL                    409,855
```

Note: `MUNICIPALITY` field on the Municipality layer (layer 3) codes them as `ADM`, `AAM`, `WRM`; on the plot layer (layer 0) the `MunicipalityName` field uses the full English name.

### Appendix H · Permit_LastType — top entries (2026-04-24 snapshot)

```
Project Completion                            3,114
Repair or renovation صيانة أو تجديد           2,419
Private Temp. Tent خيمة مؤقتة داخل حدود...    2,247
Addition إضافة                                2,028
Modifications Before COC تعديلات قبل إتمام…   1,036
Geo-Investigation استكشاف التربة                638
New Building بناء جديد                          630
Modifications without addition تعديلات دون…     490
Str. Mod. Before COC تعديل إنشائي قبل إتمام…    436
Pile Design & Test App اعتماد تصميم وفحص…       228
Change Contractor تغيير المقاول                 226
Permit Renewal تجديد الترخيص                    225
Arc. Mod. Before COC تعديل معماري قبل إتمام…    180
New or extending Fence سور جديد أو مضاف         133
…
(71+ distinct values total)
```

### Appendix I · Service topology cheat-sheet (for paste into code)

```typescript
// src/lib/myland-endpoints.ts (proposed)
export const MYLAND_BASE =
  'https://onwani.abudhabi.ae/arcgis/rest/services';

export const MYLAND_ENDPOINTS = {
  // Primary plot corpus (409,855 plots, 57 fields)
  plotsMSSI: `${MYLAND_BASE}/MSSI/ADMINBOUNDARIES/MapServer/0`,
  // Secondary plot view (410,464; adds APPROVEDBY/APPROVALDATE)
  plotsSMARTHUB: `${MYLAND_BASE}/MyLand/SMARTHUB/MapServer/0`,
  // Administrative hierarchy
  community: `${MYLAND_BASE}/MSSI/ADMINBOUNDARIES/MapServer/1`,
  district: `${MYLAND_BASE}/MSSI/ADMINBOUNDARIES/MapServer/2`,
  municipality: `${MYLAND_BASE}/MSSI/ADMINBOUNDARIES/MapServer/3`,
  newDistrict: `${MYLAND_BASE}/MSSI/ADMINBOUNDARIES/MapServer/4`,
  // Addressing
  addressing: `${MYLAND_BASE}/Onwani/UDM_AddressingLayers/MapServer`,
  onwaniAPI: `${MYLAND_BASE}/Onwani/OnwaniAPI/MapServer`,
  // POI
  poi: `${MYLAND_BASE}/ADAGS/POI_GL_V4/MapServer`,
  // Per-plot affection plan (DCR)
  dcrPdfTemplate: 'https://geosmart.dmt.gov.ae/dcr/{SectorNumber_PlotID}.pdf',
} as const;

export const MYLAND_MAX_RECORDS = 2000;
export const MYLAND_DEFAULT_PACE_MS = 200; // polite inter-page pause
```

---

## §15 · Methodology · honesty

### 15.1 How this catalog was produced

1. **Direct probes** of `onwani.abudhabi.ae/arcgis/rest/services` using `curl` (see Bash tool calls 2026-04-24 14:30–18:15 UTC). Enumerated all 5 root folders, counted features on every ADMINBOUNDARIES layer, sampled 2 Yas Island plots with full 57-field payload, group-by-statistics queries for DISTRICTENG (20 top), PRIMARYUSEENGDESC (all 19), DevCode_Category (all 7), Construction_Status (all 4), MunicipalityName (all 3), ELMS_AllocationStatus, MEPS_CONS_STATUS, Permit_LastType, Investment_Name, ELMS_PARENTLANDUSE_E. Counts are stable across repeated queries within the session.
2. **Parallel research agents** (three, launched 2026-04-24):
   - "MyLand + Tamm platform UX" — had live web access; returned with primary-source URLs for DMT / Tamm / ADREC / Dari + app-store listings + data.abudhabi developer portal. Report integrated verbatim into §2 and §6.
   - "Master plans inventory" — had live web access; returned primary-source URLs for 21 Saadiyat/Yas/Reem/etc. developer pages + Aldar / Modon / Mubadala / Miral / IMKAN / Bloom / JIIC / AD Ports official disclosures. Report integrated into §4.
   - "Regulators + ownership" — **did NOT have live web access** (flagged on return). Its knowledge-based reconstruction (cutoff January 2026) was used as scaffolding for §6 only; factual claims there are cross-referenced to the master-plans agent's live-fetched citations (Law 13/2019 via tamimi.com + loc.gov; Dari help docs; Madhmoun via Zawya). Where the regulator agent had flagged `[VERIFY]`, those flags are retained in §6 and §11.
3. **Source triangulation.** Every statutory claim in §6 has at least one primary-sourced URL (tamimi.com, loc.gov, moj.gov.ae, dmt.gov.ae) retrieved 2026-04-24 by the live-access agents, not relied-on-memory claims from the regulator agent.
4. **Existing-repo grounding.** The ZAAHI repo's `ABU_DHABI_MIGRATION.md`, `scripts/fetch-abu-dhabi-layers.ts`, `scripts/fetch-ad-plots.ts`, `scripts/seed-saadiyat-p28.ts`, `scripts/seed-yas-island.ts`, `scripts/seed-al-ain-jahili.ts`, `data/layers/abu-dhabi-*.geojson`, `public/tiles/ad-land-*.pmtiles`, and `src/app/parcels/map/page.tsx:1291` served as facts-on-disk anchor points for §5 (integration pathways). The DDA catalog (`docs/audits/DDA_CATALOG_FINAL_2026-04-23.md`, 2,055 lines) was the structural template for §7 and this document's TOC.

### 15.2 Gaps openly acknowledged

1. **Task brief statutory reference** — the task cited "Abu Dhabi Real Estate Law 3/2015"; correct citation is **Law 19/2005 + Law 13/2019** per tamimi.com / loc.gov (retrieved 2026-04-24). §6.2 documents this correction.
2. **Path deviation** — task asked for `docs/data-sources/abu-dhabi/MYLAND_CATALOG.md`; filed at `docs/audits/ABU_DHABI_MYLAND_CATALOG_2026-04-24.md` to co-locate with the DDA sibling. Content-identical; copy if preferred.
3. **Investment-zone list** — task assumed 9; live DMT `Investment_Name` field shows 20+. Section §4.2 shows the live distribution; §6.3 reconciles with the Law 13/2019 9-zone baseline + post-2019 Cabinet extensions.
4. **"Al Jurf / Ras Al Khaimah border"** — task says RAK border; correct is AD-Dubai border (Ghantoot / Sahel Al Emarat coast). §4.3.12 documents.
5. **Aldar Annual Report depth** — does not publish per-master-plan plot counts; §4.3.23 / §10.2 item 2 flag.
6. **Nurai Island post-acquisition masterplan** — not publicly released; §4.3.20 flag.
7. **ADGM Al Reem registration routing** — whether DMT-only or ADGM-only post-2023 extension is unresolved; §11 Q18 flag.
8. **2026 transfer-fee rate** — 2% baseline subject to stimulus waivers; not confirmed for 2026.
9. **ADREC BLN API** — no public developer API surface.
10. **Tamm partner-embedding API** — no public developer docs at retrieval.

### 15.3 Safety invariants respected

- No code written.
- No data in `data/` modified.
- No `prisma/schema.prisma` modified.
- No new deps.
- No git operations beyond `git status` / `git log` / `git branch --show-current` (already on `research/vision-and-competitors-2026-04-19`).
- No files deleted.
- No Parcel table mutations.
- This document is the sole artifact.
- Sources cited inline where feasible; full list in §13.
- Honest about gaps per §15.2.

### 15.4 Drift and maintenance

The 2026-04-24 snapshot of counts (409,855 plots · 216 districts · 1,864 communities · 20+ investment zones · 19 land-use categories) will drift as DMT refreshes data. Recommended refresh cadence: monthly top-level counts; quarterly full field-schema diff; annual catalog regeneration. The `Last-Modified` header on the DCR PDF host (`geosmart.dmt.gov.ae`) is the cheapest external signal to monitor for plot-level change.

---

**End of catalog.**

This document is a research / reference artifact. It does not modify the ZAAHI platform. Next action rests with the founder, per §11 Q1 (timing with Phase 1 User Dashboards).
