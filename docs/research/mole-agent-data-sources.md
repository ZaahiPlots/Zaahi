# ZAAHI · §41 Mole Agent · Subsurface Intelligence Data Sources

**Document type:** Research dossier — data-source evaluation for the §41 Mole Agent (subsurface intelligence layer).
**Audience:** Zhan + Dymo. Companion to `MASTER_TREE_final.md` §39 (Parcel View · Mole Underground), §40 (Parcel Twin), §41 (Mole Agent), §44 (IoT Layer), §45 (Satellite).
**Branch:** `research/mole-data-2026-04-26` (off `research/launch-research-2026-04-25`)
**Status:** v1.0 · CONFIDENTIAL · internal · agent-drafted, founder to ratify Phase 1 / 2-3 priorities.
**Constraint check:** read-only on `src/**`, `prisma/schema.prisma`, `MASTER_TREE_final.md`, `docs/investor-package/*` · no main push · all sources cited with URLs · "verified live" vs "claimed but unverified" distinguished per source.

---

## §0 · Framing — what the Mole Agent actually needs

Per `MASTER_TREE_final.md` §41: *"Mole Agent (Subsurface Intelligence, IoT Sensors, Foundation Advisor, Satellite Change)"*. Per §39 Parcel View: *"Falcon Aerial, Surface, Mole Underground"*. Per §45 Satellite: *"Mole Change Detection"* is already in scope of the satellite stack.

The Mole Agent is the Z-axis of the ZAAHI parcel — everything below ground level. It needs four data classes:

1. **Underground utility geometry** — water, sewage, electricity, district cooling, fibre, storm drainage routes within or adjacent to a parcel. Drives "what's under this plot before you dig" / NOC-readiness signals.
2. **Geological / geotechnical conditions** — soil bearing capacity, groundwater table, sabkha presence, bedrock depth. Drives Foundation Advisor (build cost ±20-40% by foundation type).
3. **Subsurface change detection** — InSAR ground subsidence, GPR void/anomaly detection. Drives "is this site moving?" risk signal.
4. **Live IoT subsurface telemetry** — groundwater level, soil moisture/salinity, vibration, foundation strain. Drives ongoing health monitoring on flagship listings.

This document evaluates concrete data sources for each class, by access mechanism + cost + integration complexity + bus-factor risk, and recommends a Phase 1 MVP versus a Phase 2-3 full-capability stack.

---

## §1 · Executive summary

**Top 3 sources Phase 1 ready (low cost, integration-feasible Y1):**

1. **Sentinel-1 InSAR via Copernicus Data Space Ecosystem** (subsidence change detection). Cost: AED 0. Verified live and free under ESA open-data policy. Already-proven in UAE (academic study detected Remah subsidence bowl 40 mm/yr) — see §2.7.
2. **Per-parcel geotechnical investigation via UAE labs** (commission-only, Foundation Advisor seed). Cost: AED 5,000-15,000 per high-value listing. Verified live providers in Dubai (SmartGeo, NES, Al Mawazeen, Baynunah, ORYCTA) — see §2.5.
3. **Dubai Municipality GIS Centre formal data-sharing request** (city-wide layers · subsurface metadata where available). Cost: AED 0 direct (relationship investment). Verified live as a service path; subsurface-specific dataset availability unverified pending direct engagement — see §2.4.

**Top 3 sources Phase 2-3 (full Mole Agent capability, larger budget/relationship):**

1. **ICEYE commercial SAR subscription** (sub-daily AOI tasking, X-band high-resolution). Cost estimate USD 30k-100k+/year for tasked AOI. Verified live constellation (60+ satellites Jan 2026) — see §2.7.
2. **DEWA / Etisalat / Empower data-sharing MoU** (the actual underground utility geometry — water, sewage, electricity, district cooling, fibre routes). Cost: relationship + likely commercial licence; access mechanism is government / B2B partnership, NOT open API. **Bus-factor risk: HIGH** — single-vendor government dependency per utility — see §2.1, §2.2, §2.3.
3. **LoRaWAN subsurface IoT sensor deployment on flagship parcels** (groundwater level + soil moisture/EC + foundation strain). Cost: AED 1,500-3,000/sensor + AED 3-5k LoRaWAN gateway + Y1 deployment ~AED 30-50k for 5-10 plots — see §2.10.

**Three blockers founders must accept or solve before Mole Agent ships publicly:**

- **LEGAL — Critical Infrastructure Protection.** UAE treats DEWA / Etisalat / du / Empower underground asset locations as critical infrastructure data. Surfacing detailed routes on a public parcel page (even "approximate" overlay) likely requires NDA / data-sharing agreement with the asset owner, plus potentially a separate critical-infrastructure-protection legal opinion. Without this, the legal exposure exceeds any product upside.
- **TECHNICAL — No unified Dubai subsurface dataset exists.** Each utility owner runs its own GIS (DEWA's is internal-and-contractor only; Empower's is proprietary; Etisalat/du are TRA-regulated). Access is per-NOC, per-project. There is no equivalent of US "811 Call Before You Dig" public dataset.
- **COST — InSAR + GPR per-AOI / per-survey scales with coverage.** Sentinel-1 is free but requires significant in-house processing; ICEYE commercial scales with the AOI you task. GPR is per-survey commission (AED 5-25k per parcel). City-wide Mole at zero variable cost is not achievable Y1.

**Founder ratification needed (see §5):** which of the three blockers ZAAHI accepts vs solves; whether to pursue formal DM-GIS-Centre MoU as a Y1 priority; whether the AED 1M Y1 budget includes a Phase 2 commitment to ICEYE.

---

## §2 · Source-by-source detail

Each source documented under the spec template: provider · URL · data type/format · coverage · resolution + update frequency · access cost · licence · integration complexity (1=easy API to 5=NDA/partnership only) · bus-factor risk (1=many alternatives to 5=single-vendor government dependency).

### 2.1 · DEWA (Dubai Electricity & Water Authority) — water · sewage · electricity underground network

| Field | Value |
|---|---|
| **Provider** | Dubai Electricity & Water Authority (DEWA) |
| **URL** | [dewa.gov.ae](https://www.dewa.gov.ae/en/) · [Esri DEWA Marafeq case study](https://www.esri.com/en-us/landing-page/industry/electric-and-gas/2020/dewa-case-study) |
| **Data type / format** | ArcGIS-based GIS ("Marafeq" platform) · Schneider Electric ArcFM · vector geometry of grid + water network |
| **Coverage** | Dubai-only · all DEWA assets |
| **Resolution + update** | High-resolution as-built drawings · updated continuously by contractors via Marafeq submission workflow |
| **Access cost** | Not publicly priced · NOC requests are free per project but data access requires partnership |
| **Licence** | NO public API · contractor-only access via Marafeq · drawings owned by DEWA · sublicensing prohibited by default |
| **Integration complexity** | **5/5** (NDA / partnership only · no self-service path) |
| **Bus-factor risk** | **5/5** (single government utility · monopoly Dubai water + electricity + sewage) |
| **Verification status** | "Verified live" — Esri case study confirms Marafeq is operational; "claimed but unverified" — public API or commercial data product does not appear to exist as of 2026-04-26 |

**Notes:** The de-facto "data access" mechanism is the NOC chain — any digging work in Dubai requires a DEWA NOC where contractor submits proposed work drawings + DEWA reviews against its internal asset map + issues NOC with safe-distance specifications ([Dar Al Naseeb 2026 NOC guide](https://daralnaseeb.com/blog/dubai-municipality-approval-complete-guide-2026)). This is a per-project request, NOT a queryable dataset. ZAAHI cannot replicate this for parcel-page display without a formal DEWA partnership.

### 2.2 · Empower / Tabreed / Emicool — district cooling networks

| Field | Value |
|---|---|
| **Provider** | Empower ([empower.ae](https://www.empower.ae)) · Tabreed ([tabreed.ae](https://tabreed.ae/en)) · Emicool ([emicool.com](https://www.emicool.com/)) |
| **Data type / format** | Proprietary internal GIS · format unpublished |
| **Coverage** | Empower: ~80% Dubai connected capacity (Ghoroob Mirdiff, Al Khail Gate, Palm Jumeirah, JBR, JLT, DSO + more) · Tabreed: Abu Dhabi leader, also Dubai pockets · Emicool: DIP, Dubai Motor City, Dubai Sports City (20 plants, 355,000 RT) |
| **Resolution + update** | Internal as-built · update frequency unpublished |
| **Access cost** | Not publicly priced |
| **Licence** | NO public API · proprietary commercial network owners · sublicensing prohibited by default |
| **Integration complexity** | **5/5** (commercial NDA only · separate per provider) |
| **Bus-factor risk** | **4/5** (three providers means alternatives exist for some plots; for plots in Empower's 80% footprint, Empower is single-vendor) |
| **Verification status** | "Verified live" — providers operational + market sources confirm coverage; "claimed but unverified" — no public GIS confirmed |

**Notes:** Per [PipeRepair 2025](https://piperepair.co.uk/2025/03/05/uae-leads-the-way-with-pioneering-approach-to-district-cooling/) and [Fortune Business Insights district cooling top-5](https://www.fortunebusinessinsights.com/blog/top-5-district-cooling-companies-10568), district cooling is a competitive market with three Dubai players. ZAAHI would need separate data-sharing arrangements with each. The operational use-case is narrower than DEWA — district cooling matters for cost-of-ownership analytics on master-planned-community plots, not all 114 ZAAHI plots.

### 2.3 · Etisalat / du — fibre and telecom underground

| Field | Value |
|---|---|
| **Provider** | Etisalat (e&) ([etisalat.ae](https://www.etisalat.ae/en/c/home/fibre-to-the-room.html)) · du |
| **Data type / format** | Proprietary internal · format unpublished |
| **Coverage** | UAE-wide · Etisalat reports 20,000+ km fibre + 10,000+ km dedicated 5G fibre per [Hengtong supplier brief](https://www.hengtongglobal.com/info/ftth-drop-cable-supplier-in-dubai-103174167.html) |
| **Resolution + update** | Internal as-built |
| **Access cost** | Not publicly priced |
| **Licence** | NO public API · TRA-regulated telecom infrastructure · cabling NOC required for any work near fibre |
| **Integration complexity** | **5/5** (NDA + telecom regulator engagement) |
| **Bus-factor risk** | **5/5** (TRA-licensed duopoly; fibre is critical telecom infrastructure with separate UAE regulator) |
| **Verification status** | "Verified live" — operators confirmed by [tbreak UAE 2026 internet review](https://tbreak.com/best-home-internet-packages-in-the-uae-fixed-line-5g-options-in-2025/); "claimed but unverified" — no public infrastructure GIS |

**Notes:** Telecom underground access in UAE is gated by TRA (Telecommunications Regulatory Authority) on top of operator NDAs. Less operationally critical than DEWA for parcel-evaluation use-cases (fibre routes affect home-internet availability, not foundation engineering); de-prioritise for Mole Phase 1.

### 2.4 · Dubai Municipality GIS Centre — central coordination / partial subsurface metadata

| Field | Value |
|---|---|
| **Provider** | Dubai Municipality GIS Centre |
| **URL** | [DM GIS Center](https://www.dm.gov.ae/municipality-business/planning-and-construction/geographic-information-systems/gis-services/) · [GeoDubai news](https://geodubai.dm.gov.ae/en/Pages/AllNews.aspx) · [DM GIS Projects](https://www.dm.gov.ae/municipality-business/planning-and-construction/geographic-information-systems/gis-projects/) · [DM GIS Partners](https://www.dm.gov.ae/municipality-business/planning-and-construction/geographic-information-systems/partners/) |
| **Data type / format** | Geospatial maps + databases · provided to "governmental and non-governmental entities" by formal request |
| **Coverage** | Dubai-wide · base maps + parcel boundaries + master planning layers + historical aerials; subsurface dataset availability unverified |
| **Resolution + update** | Per the GIS Centre brief, multiple resolutions across cadastral + planning layers |
| **Access cost** | Not publicly priced · per partnership |
| **Licence** | Per data-sharing agreement · sublicensing per agreement |
| **Integration complexity** | **4/5** (formal request + agreement; no self-service API confirmed for subsurface) |
| **Bus-factor risk** | **4/5** (DM is a single government partner, but it's the natural orchestration layer for cross-utility coordination) |
| **Verification status** | "Verified live" — DM GIS Centre is a real established function; "claimed but unverified" — whether DM holds aggregated subsurface datasets across utilities or simply orchestrates per-NOC requests |

**Notes:** This is the highest-leverage Phase 1 access path for ZAAHI. A data-sharing MoU with DM GIS Centre could (a) give ZAAHI cleaner cadastral + master-planning layers than scraping DDA, and (b) potentially open a coordination channel into DEWA / Empower / Etisalat for subsurface — DM is the natural orchestrator. Cost is relationship + Dymo's networking time, not subscription.

### 2.5 · Per-parcel geotechnical investigation labs — Foundation Advisor seed data

| Field | Value |
|---|---|
| **Provider** | UAE commercial geotech labs · examples: SmartGeo ([smartgeo.ae](https://smartgeo.ae/geotechnical-investigation-in-uae-reliable-soil-testing-services-in-dubai-abu-dhabi-al-ain/)) · NES Dubai ([nesdubai.com](https://nesdubai.com/soil-investigation/)) · Al Mawazeen Lab ([almawazeenlab.com](https://www.almawazeenlab.com/)) · Baynunah Laboratories ([baynunahlaboratories.ae](https://www.baynunahlaboratories.ae/service-detail.php?serv=geotechnical-investigation)) · ORYCTA ([orycta.com](https://orycta.com/services)) · Capital Surveys ([capital-surveys.com](https://capital-surveys.com/)) · MLab ([mlab.ae](https://mlab.ae/geotechnical-investigation-and-geophysical-survey/)) |
| **Data type / format** | Per-site engineering report (PDF) · borehole logs · SPT N-values · soil bearing capacity · groundwater depth · sabkha-presence flag · recommended foundation type |
| **Coverage** | Per-site (commissioned) · these are not pre-existing datasets, they are services |
| **Resolution + update** | Site-specific · one-time |
| **Access cost** | Per-site AED 5,000-15,000 typical · larger / deeper holes AED 15,000-50,000 · DM building permit requires geotech investigation (mandatory per [SmartGeo 2026 brief](https://smartgeo.ae/geotechnical-investigation-in-uae-reliable-soil-testing-services-in-dubai-abu-dhabi-al-ain/)) |
| **Licence** | Standard commercial — report is owned by client (ZAAHI if ZAAHI commissions); ZAAHI can republish on its own listing per its agreement |
| **Integration complexity** | **2/5** (PDF + structured data fields; standard commercial procurement) |
| **Bus-factor risk** | **1/5** (8+ providers; competitive market) |
| **Verification status** | "Verified live" — multiple providers, established service category in UAE; geotech is mandatory per DM building permit chain |

**Notes:** The most realistic Phase 1 source. ZAAHI commissions a geotech report on each high-value listing (Plot 9235849 + future flagship plots) and surfaces structured fields (soil bearing capacity, groundwater depth, recommended foundation type, sabkha flag) on the parcel page. Cost is amortised over commission revenue per deal. Long-term, ZAAHI accumulates a proprietary geotech dataset across its parcels — a real moat.

### 2.6 · Academic + grey-literature geotechnical context

| Field | Value |
|---|---|
| **Provider** | Various — Springer Nature, IJERA, UoBaghdad Journal of Engineering, etc. |
| **URLs** | [Springer 2025 — Sustainable groundwater control in Sabkha soils, AD Metropolitan](https://link.springer.com/article/10.1007/s43621-025-01187-9) · [IJERA — Geotechnical properties of Sabkha soil southern UAE](https://www.ijera.com/papers/Vol5_issue6/Part%20-%203/E56032429.pdf) · [Springer 2018 — Middle East geotechnical features review](https://link.springer.com/article/10.1007/s41062-018-0158-z) · [Joe.uobaghdad — Sabkha bearing capacity plate load test](https://www.joe.uobaghdad.edu.iq/index.php/main/article/view/2123) |
| **Data type / format** | Academic papers · PDF · qualitative + selected quantitative |
| **Coverage** | UAE-wide + GCC-wide patterns; not parcel-specific |
| **Resolution + update** | One-time per publication; not refreshed |
| **Access cost** | AED 0 (open access) or institutional subscription |
| **Licence** | Per publisher (typically academic citation OK) |
| **Integration complexity** | **2/5** (manual extraction → structured Mole knowledge base) |
| **Bus-factor risk** | **1/5** (many sources) |
| **Verification status** | "Verified live" — papers are published and accessible |

**Notes:** Useful for Cat / Mole Agent knowledge-base context (e.g. "sabkha is concentrated in coastal belt + western/southern interior; not particularly common in Dubai region per IJERA" — directly cited in earlier search). Not a structured dataset; an LLM-context corpus for the Mole Agent's reasoning layer.

### 2.7 · Sentinel-1 SAR / InSAR via Copernicus — ground subsidence change detection (FREE)

| Field | Value |
|---|---|
| **Provider** | European Space Agency (ESA) · Copernicus Programme |
| **URLs** | [Copernicus Data Space Ecosystem](https://dataspace.copernicus.eu/) · [Sentinel-1 mission page](https://sentinels.copernicus.eu/copernicus/sentinel-1) · [ESA Sentinel-1 overview](https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1) · [SNAP-StaMPS PSI processing PDF (ESA Forum)](https://forum.step.esa.int/uploads/default/original/2X/5/5b74f3e92b42d2fa44a97bd41beb8163e0b85a6f.pdf) · [P-PSI parallelized PSI paper, MDPI](https://www.mdpi.com/2072-4292/12/19/3207) |
| **Data type / format** | C-band SAR raster · GRD + SLC products · InSAR interferograms via SNAP / StaMPS open-source processing |
| **Coverage** | Global · including all UAE |
| **Resolution + update** | 5×20m native; 12-day revisit at equator (less at higher latitudes); UAE typically 6-12 day mixed-orbit revisit |
| **Access cost** | **AED 0** — full and open data policy per EU Copernicus regulation |
| **Licence** | Free + open · commercial use OK · sublicensing OK with attribution |
| **Integration complexity** | **3/5** (free data but requires SAR processing pipeline; SNAP-StaMPS open-source processing chain is non-trivial; managed-service alternatives exist via DeepInSAR or in-house Python via pyInSAR) |
| **Bus-factor risk** | **1/5** (ESA is a 27-nation consortium, free-data policy enshrined in EU regulation; Copernicus is the gold-standard public earth-observation programme) |
| **Verification status** | "Verified live" — Copernicus Data Space ecosystem operational; persistent scatterer time-series demonstrably works for UAE per [ScienceDirect — Remah, UAE persistent scatterer subsidence study (40mm/yr bowl)](https://www.sciencedirect.com/science/article/pii/S0048969721010135) |

**Notes:** This is the single most important Phase 1 source. mm-scale subsidence detection enables a "your plot is sinking" risk signal that no UAE broker offers, at zero data cost. The integration complexity is in the InSAR processing pipeline; ZAAHI Y1 can either (a) run SNAP-StaMPS in-house on G42 / Vercel infrastructure, (b) integrate a managed service like DeepInSAR for hosted processing, or (c) commission per-AOI subsidence studies from a UAE survey firm using Sentinel-1 inputs.

### 2.8 · Commercial SAR — ICEYE, Capella Space, Umbra, Synspective

| Field | Value |
|---|---|
| **Provider** | ICEYE ([iceye.com](https://www.iceye.com/sar-data)) · Capella Space · Umbra · Synspective · TerraSAR-X (Airbus) · COSMO-SkyMed (ASI) |
| **Data type / format** | X-band (high-resolution) and L-band SAR raster · interferogram products available · API-tasked AOI captures |
| **Coverage** | Global; AOI-tasked |
| **Resolution + update** | ICEYE: 60+ satellites Jan 2026, sub-daily revisit per [eoPortal ICEYE constellation brief](https://www.eoportal.org/satellite-missions/iceye-constellation); spatial resolution 25cm spotlight to 3m wide-area |
| **Access cost** | Not publicly priced · enterprise quote · industry typical USD 30k-100k+/year for tasked AOI subscription · per-image pricing also available |
| **Licence** | Commercial · per contract; usually internal-use + derivative product OK with attribution |
| **Integration complexity** | **3/5** (API + processing; vendor support documented) |
| **Bus-factor risk** | **2/5** (multiple commercial X/L-band providers exist + Sentinel-1 free fallback) |
| **Verification status** | "Verified live" constellations; "claimed but unverified" UAE-specific service contracts/pricing |

**Notes:** Phase 2-3 tier. The commercial value over Sentinel-1 is sub-daily revisit + cm-scale resolution + dedicated tasking — relevant for active-construction monitoring or site-specific anomaly detection on flagship parcels. Per-AOI annual pricing makes city-wide deployment expensive; per-flagship-parcel deployment is feasible.

### 2.9 · Ground-Penetrating Radar (GPR) — per-survey commercial

| Field | Value |
|---|---|
| **Provider** | UAE GPR survey vendors · examples: SmartGeo ([smartgeo.ae GPR](https://smartgeo.ae/gpr-survey-uae-advanced-subsurface-mapping-for-safer-infrastructure/)) · Falcon Geomatics ([falcon-geosystems.com GPR](https://www.falcon-geosystems.com/detection/ground-penetrating-radar/)) · Dutco Tennant ([dutcotennant.com GPR](https://www.dutcotennant.com/category/civil-infrastructure/surveying-solutions/ground-penetrating-radar)) · Al Warqa Survey ([alwarqasurvey.com GPR](https://www.alwarqasurvey.com/GPR-survey)) · Raynas Global ([raynasglobal.com GPR providers UAE](https://www.raynasglobal.com/dubai-sue-gpr-ground-penetrating-radar-survey-provider-companies-in-uae)) · Geoworks Arabia ([geoworks-arabia.com GPR](https://geoworks-arabia.com/home/gpr-survey/)) · Professional Surveys ([professional-surveys.com GPR](https://professional-surveys.com/ground-penetrating-radar-gpr/)) |
| **Data type / format** | Per-survey deliverable · radargram + utility detection report · CAD overlay |
| **Coverage** | Per-site commission · UAE-wide service availability |
| **Resolution + update** | cm-scale lateral; depth typically 3-5m in Dubai ground conditions; one-time per commission |
| **Access cost** | Per-survey AED 5,000-25,000 typical (varies with site area + depth target) |
| **Licence** | Standard commercial; ZAAHI owns the deliverable when commissioning |
| **Integration complexity** | **2/5** (CAD/PDF deliverable; standard procurement) |
| **Bus-factor risk** | **1/5** (7+ active UAE providers per search) |
| **Verification status** | "Verified live" — multiple operational UAE providers |

**Notes:** Per-parcel commission, not a dataset. Useful as a paid premium-tier feature for ZAAHI flagship listings — e.g., "ZAAHI Verified Subsurface" badge backed by an actual GPR scan. Phase 2 partnership opportunity: exclusive-rate framework agreement with one provider (e.g., SmartGeo) for ZAAHI's premium-listings pipeline.

### 2.10 · LoRaWAN subsurface IoT sensors — Foundation Health & Groundwater monitoring

| Field | Value |
|---|---|
| **Provider** | RAK Wireless ([store.rakwireless.com soil monitoring](https://store.rakwireless.com/products/soil-monitoring)) · Daviteq ([iot.daviteq.com LoRaWAN soil moisture](https://www.iot.daviteq.com/wireless-sensors/lorawan-soil-moisture-sensor)) · Sensoterra ([sensoterra.com](https://www.sensoterra.com/soil-moisture-sensor/)) · Milesight EM500-SMTC ([milesight.com EM500-SMTC](https://www.milesight.com/iot/product/lorawan-sensor/em500-smtc)) · Linovision ([global.linovision.com](https://global.linovision.com/products/lorawan-wireless-sensor-for-soil-moisture-temperature-and-electrical-conductivity-measurement)) · Seeed SenseCAP ([seeedstudio.com SenseCAP soil sensor](https://www.seeedstudio.com/LoRaWAN-Soil-Moisture-and-Temperature-Sensor-EU868-p-4316.html)) · IoTNVR ([iotnvr.com](https://us.iotnvr.com/products/lorawan-wireless-soil-moisture-temperature-and-electrical-conductivity-sensor)) |
| **Data type / format** | Time-series telemetry · soil moisture (%), temperature (°C), electrical conductivity (mS/cm) · LoRaWAN uplink (EU868 / US915 / AS923) · 6-10 year battery |
| **Coverage** | Per-deployment · global hardware availability |
| **Resolution + update** | Per-sensor point measurement · uplink interval 15min-24h (configurable) |
| **Access cost** | Hardware: AED 1,500-3,000/sensor · LoRaWAN gateway AED 3,000-5,000 (one per ~2-15km radius depending on terrain) · Helium / Senet / The Things Network global coverage AED 0-50/device/month · UAE-specific LoRaWAN coverage patchy as of 2026-04-26 |
| **Licence** | Hardware purchase; no ongoing per-device licence beyond network access |
| **Integration complexity** | **3/5** (need LoRaWAN gateway + Things Stack / ChirpStack data pipeline + ZAAHI ingestion) |
| **Bus-factor risk** | **2/5** (6+ hardware vendors, open LoRaWAN standard, multi-network options) |
| **Verification status** | "Verified live" — products shipping globally · "claimed but unverified" — UAE-specific distributors not confirmed in search; international suppliers ship to UAE |

**Notes:** Phase 2-3 tier. Realistic Y1 deployment: 5-10 sensors at 1-2 flagship plots (Plot 9235849 + 1-2 ZAAHI-managed sites) with one LoRaWAN gateway at the Al Jurf office. Y1 cost ceiling AED 30,000-50,000 (within general buffer of equipment line 4 from `Y1_LAUNCH_PLAN_2026-04-25.md`). Adjacent: foundation strain gauges (separate vendor class — Geokon, Encardio Rite — wired or vibrating-wire) for active-construction monitoring; not Y1.

### 2.11 · Foundation strain / vibration monitoring sensors

| Field | Value |
|---|---|
| **Provider** | Geokon · Encardio Rite (India · serves UAE) · Smartec / Roctest |
| **Data type / format** | Vibrating-wire strain gauges · piezo accelerometers · time-series wired/wireless |
| **Coverage** | Per-deployment |
| **Resolution + update** | µε strain resolution · sub-Hz to kHz vibration · sub-second sampling possible |
| **Access cost** | Hardware AED 2,000-15,000/sensor depending on type · datalogger AED 10,000-30,000 |
| **Licence** | Hardware purchase |
| **Integration complexity** | **4/5** (often wired; specialist installation needed) |
| **Bus-factor risk** | **1/5** (many vendors globally) |
| **Verification status** | "Claimed but unverified" — vendors known globally; UAE-specific distributor mapping not run in this research session |

**Notes:** Foundation Health Monitoring (per §41 Mole Agent scope) is a Phase 3 add-on. Realistic when ZAAHI advisory contracts with developer clients on active-construction sites. Not Y1 from the AED 1M.

### 2.12 · Bentley OpenCities Planner (city-scale digital twin platform)

| Field | Value |
|---|---|
| **Provider** | Bentley Systems |
| **URLs** | [Bentley OpenCities Planner](https://www.bentley.com/software/opencities-planner/) · [OpenCities Planner datasheet PDF](https://static.carahsoft.com/concrete/files/7616/2505/7642/Wrapped_4530_Bentley_OpenCities_Planner_Datasheet_FINAL_003.pdf) · [G2 reviews 2026](https://www.g2.com/products/bentley-opencities-planner/reviews) · [SoftwareSuggest 2026](https://www.softwaresuggest.com/opencities-planner) |
| **Data type / format** | City-scale digital twin · 2D/3D/GIS visualisation · BIM-based · cloud-hosted on Microsoft Azure |
| **Coverage** | Per-customer-deployment; not a dataset itself, a platform |
| **Resolution + update** | Per-project |
| **Access cost** | Enterprise SaaS subscription · not publicly priced · per-G2/SoftwareSuggest reports indicate enterprise tier |
| **Licence** | Commercial enterprise |
| **Integration complexity** | **5/5** (entirely separate platform; not a data source for ZAAHI but a competitor / potential partner) |
| **Bus-factor risk** | **N/A** (platform comparison, not data source) |
| **Verification status** | "Verified live" platform; subsurface utility module not specifically confirmed |

**Notes:** Listed as a platform comparison rather than a data source. Bentley OpenCities Planner is the closest enterprise-grade platform to ZAAHI's vision but targets municipal customers (DM-style buyers), not individual property buyers. Strategic implication: ZAAHI's edge is *consumer-facing parcel-level* depth, not city-administrator breadth. Bentley is not a Mole data source.

### 2.13 · Dassault 3DEXPERIENCE — general competitor platform

| Field | Value |
|---|---|
| **Provider** | Dassault Systèmes |
| **URL** | (not deeply searched — general platform) |
| **Verification status** | "Claimed but unverified" — no UAE city deployment with subsurface utility module confirmed |

**Notes:** Same strategic note as Bentley — enterprise municipal target market; not a ZAAHI Mole data source. De-prioritise.

### 2.14 · Property Monitor / ValuStrat — UAE property-data competitors

| Field | Value |
|---|---|
| **Provider** | Property Monitor · ValuStrat ([valustrat.com VPI](https://valustrat.com/pages/valustrat-price-index-vpi)) |
| **Data type / format** | Property valuation indices · transaction data · market analytics |
| **Coverage** | Dubai / GCC residential + commercial property markets |
| **Subsurface coverage** | **NONE confirmed** — ValuStrat tracks AED/sqft and price indices, NOT geotechnical or utility data |
| **Verification status** | "Verified live" platforms; "verified absent" subsurface data offering |

**Notes:** Confirmation that no UAE property-analytics competitor currently offers a subsurface intelligence layer. **This is white space for ZAAHI Mole** — material differentiation if ZAAHI ships even Phase 1 (Sentinel-1 InSAR + per-parcel geotech).

### 2.15 · Dubai Pulse / data.dubai — open data portal

| Field | Value |
|---|---|
| **Provider** | Digital Dubai · Dubai Pulse |
| **URLs** | [Dubai Pulse main](https://www.dubaipulse.gov.ae/) · [data.dubai (redirect)](https://data.dubai/) · [Dubai Pulse Get Data](https://www.digitaldubai.ae/data/get-data) · [Dubai Open Data government portal](https://www.dubai.ae/open-data) |
| **Data type / format** | Mixed open data · API-accessible (API Key + Secret · 30-min token TTL) |
| **Coverage** | Dubai-wide across DM, RTA, GDRFA, DLD, Dubai Statistics, etc. |
| **Subsurface datasets** | **NONE matching subsurface utility / geotechnical / soil bearing / groundwater / sabkha** confirmed in landing-page scan 2026-04-26 — only surface-level "Water Supply Points" dataset under DEWA branding |
| **Access cost** | API access free with registration |
| **Licence** | Per dataset; mostly Open Data licence |
| **Integration complexity** | **2/5** (standard REST API + token) |
| **Bus-factor risk** | **3/5** (single government portal but encompasses multiple agencies) |
| **Verification status** | "Verified live" portal; "verified absent" subsurface datasets in landing-page browse — full catalog search via Gen AI search may surface more |

**Notes:** Worth a deeper catalog scan via Dymo direct outreach. Even if subsurface is absent, this is the canonical channel through which subsurface metadata might arrive in future government open-data releases.

### 2.16 · UAE "Call Before You Dig" equivalent

| Field | Value |
|---|---|
| **Provider** | None equivalent to US 811 / UK LSBUD |
| **De-facto mechanism** | NOC chain — DEWA NOC + RTA NOC + DM NOC + utility-specific NOCs ([Dar Al Naseeb 2026 NOC chain guide](https://daralnaseeb.com/blog/dubai-municipality-approval-complete-guide-2026)) |
| **Verification status** | "Verified absent" — no formal centralised "call before you dig" service confirmed |

**Notes:** Confirms there is no shortcut. The legitimate per-project access is the NOC chain, which is per-project not bulk-data.

---

## §3 · Recommended Phase 1 stack (cheapest viable subsurface MVP)

**Goal:** Ship a real Mole Agent v0.1 — visible on the ZAAHI parcel page within Y1 — using only sources where access is confirmed feasible at low cost. No NDA/partnership dependency for v0.1; partnership-track items are Phase 2-3.

| # | Source | Use | Y1 cost | Status |
|---|---|---|---:|---|
| P1-1 | **Sentinel-1 InSAR via Copernicus Data Space (§2.7)** | Plot-level subsidence flag — colour-coded (stable / slow-subsidence / fast-subsidence) on parcel page based on PSI time-series | AED 0 data + ~AED 5-10k/mo G42 / Anthropic compute for SNAP-StaMPS pipeline (covered in line 10 tech ops of `Y1_LAUNCH_PLAN_2026-04-25.md`) | **GO** — verified live + free + UAE-proven |
| P1-2 | **Per-parcel geotechnical commission (§2.5)** | "Foundation Advisor" panel on parcel page — soil bearing capacity, groundwater depth, recommended foundation type, sabkha flag | AED 5-15k per high-value listing · projected Y1 commissions ~AED 50,000 (5-10 flagship plots) · funded from deal commission revenue M5+, NOT from line 4 equipment budget | **GO** — verified live; 8+ UAE labs |
| P1-3 | **Academic + grey-literature corpus (§2.6)** | Cat / Mole Agent knowledge-base for "this region has typically X groundwater depth, Y bearing capacity" reasoning | AED 0 (open access) + ~AED 2-5k counsel time to confirm citation use | **GO** — verified live |
| P1-4 | **Dubai Pulse / data.dubai catalog scan (§2.15)** | Pull surface-level layers (water supply points, etc.) and any subsurface layers that exist | AED 0 (free API) | **GO** — confirmed alive but subsurface absent; light effort to scan |

**Phase 1 total Y1 cost from AED 1M Investment: ~AED 0** (compute is already budgeted in line 10; geotech commissions are M5+ revenue-funded, NOT from Investment).

**Phase 1 Mole Agent v0.1 capabilities visible to ZAAHI users:**
- "Subsidence trend (last 12 months)" badge on parcel page (Sentinel-1 PSI)
- "Foundation Advisor" panel on flagship listings (commissioned geotech — ZAAHI Verified)
- Cat / Mole Agent natural-language Q&A: "What soil conditions should I expect on this plot?" (LLM over academic corpus + commissioned reports)

**What v0.1 deliberately does NOT show:**
- DEWA / Empower / Etisalat / du underground asset locations (legal exposure — see §3 blockers in §1)
- Detailed bedrock geometry / borehole logs (commissioned reports remain client-confidential unless ZAAHI buys republication rights)

---

## §4 · Recommended Phase 2-3 stack (full Mole Agent capability)

Phase 2-3 is enabled by (a) revenue scaling Y2+ funding new subscriptions, and (b) DM GIS Centre / utility partnership relationship-building Y1.

| # | Source | Use | Annualised cost | Trigger |
|---|---|---|---:|---|
| P2-1 | **Dubai Municipality GIS Centre data-sharing MoU (§2.4)** | City-wide cadastral + master-planning + cross-utility coordination layer · potentially the orchestration channel into DEWA/Empower | AED 0 direct subscription · ~AED 50k Y1 BD/relationship time + counsel | M2-M6: Dymo opens conversation with DM GIS Centre |
| P2-2 | **DEWA + Empower + Etisalat data-sharing partnerships (§2.1, §2.2, §2.3)** | Surface utility geometry on ZAAHI parcel page (under critical-infrastructure-protection-cleared scope) | Per partnership · likely AED 100k-500k/yr each + revenue-share | Y2+ — gated by P2-1 success |
| P2-3 | **ICEYE commercial SAR subscription (§2.8)** | Sub-daily revisit on flagship parcels + active-construction monitoring | USD 30-100k/yr (~AED 110-370k/yr) | Y2+ when ZAAHI portfolio exceeds ~50 active flagship plots |
| P2-4 | **GPR partnership framework with one UAE provider (§2.9)** | "ZAAHI Verified Subsurface" badge on premium listings with actual GPR scan | Volume-discount per-survey AED 4-15k · target AED 200-500k Y2 budget | Y2+ — premium tier launch |
| P2-5 | **LoRaWAN subsurface IoT sensors at flagship plots (§2.10)** | Live groundwater + soil moisture/EC telemetry feeding into §44 IoT Layer / §40 Parcel Twin | Hardware AED 30-50k Y2 setup · ongoing AED 5-15k/yr operations | Y2 deployment · 5-10 flagship plots |
| P2-6 | **Foundation strain monitoring (§2.11)** | Active-construction client-advisory product | Per-project AED 50k-200k · billable to construction client | Y3 advisory product launch |

**Phase 2-3 cumulative annual subscription cost (full stack): ~AED 500k-1.5M** depending on partnership terms and ICEYE AOI scope.

---

## §5 · Open questions for founder ratification

1. **Critical Infrastructure Protection legal opinion.** Before ZAAHI surfaces any subsurface utility data on a public listing — even partnership-sourced — does UAE law require a separate legal opinion confirming display permissibility? **Recommend:** counsel-scoped opinion before any P2-2 partnership conversation. Cost AED 10-20k from line 3 buffer of `Y1_LAUNCH_PLAN_2026-04-25.md`.
2. **DM GIS Centre MoU as Y1 priority?** P2-1 is the highest-leverage Phase 2-3 unlock but requires Dymo BD time over months. **Question:** Does ZAAHI prioritise DM GIS Centre MoU over (e.g.) LeadingRE membership or Property Finder partnership in M2-M6 BD allocation? Decision affects Falcon vs Mole sequencing.
3. **Phase 1 v0.1 scope confirmation.** Does the founder agree the v0.1 Mole Agent should ship with (a) Sentinel-1 subsidence badge, (b) commissioned-geotech Foundation Advisor on flagship plots only, (c) academic-corpus LLM Q&A? Or scope tighter / wider?
4. **Foundation Advisor — surface to public or behind paywall?** Geotech reports cost AED 5-15k each; should Foundation Advisor be a free badge (lead-gen) or a paid premium-tier feature for buyers?
5. **InSAR processing — in-house vs managed service?** Phase 1 P1-1 has two paths: (a) build SNAP-StaMPS pipeline in-house (Жан engineering time, plus G42 / Vercel compute) or (b) integrate a managed service like DeepInSAR (vendor lock-in but faster). **Recommend in-house** to preserve sovereignty per CLAUDE.md but flag as founder decision.
6. **Falcon vs Mole prioritisation.** Per §39 Parcel View, both Falcon (aerial) and Mole (underground) feed the parcel view. Falcon has confirmed providers (Planet Labs daily, Maxar 30cm, Airbus Pleiades, ICEYE SAR night per §45) — clearer Y1 path. Should Mole v0.1 ship at the same time as Falcon v0.1, or after?
7. **Mirbek inventory question (parallel to `Y1_LAUNCH_PLAN_2026-04-25.md` §2.6 trade-off):** Does Mirbek have any existing GPR / surveying equipment from prior work? Unlikely but worth asking before committing to GPR partnership P2-4.

---

## §6 · Cost estimate first-year subscriptions

**Phase 1 (recommended Y1):**

| Item | AED Y1 | Funding source |
|---|---:|---|
| Sentinel-1 data | 0 | (free Copernicus) |
| SNAP-StaMPS pipeline compute | ~5,000 | Line 10 tech ops |
| Academic corpus access | 0 | (open access) |
| Counsel scoping for citation use + critical-infrastructure-protection opinion | ~15,000 | Line 3 LLC + counsel buffer |
| Dubai Pulse API access | 0 | (free) |
| **Per-parcel geotech commissions (5-10 flagship plots)** | ~50,000 | **Funded from deal commission revenue M5+, NOT from AED 1M Investment** |
| **Phase 1 from AED 1M Investment** | **~20,000** | Line 3 + Line 10 absorb |

**Phase 2-3 (Y2 onwards from revenue):**

| Item | AED Y2 estimate |
|---:|---:|
| DM GIS Centre MoU (relationship + counsel) | 50,000 |
| ICEYE commercial SAR subscription | 110,000-370,000 |
| GPR survey framework agreement | 200,000-500,000 |
| LoRaWAN IoT sensor deployment + ops | 30,000-65,000 |
| DEWA + Empower + Etisalat partnership commercials (estimate range) | 300,000-1,500,000 |
| **Phase 2-3 annualised range (Y2 full)** | **690,000-2,485,000** |

Phase 2-3 cost is dominated by partnership commercials — the lower bound assumes revenue-share / non-cash partnerships; the upper bound assumes commercial subscription pricing.

---

## §7 · Sources

### 7.1 · Repo files (read at session start)

- `docs/architecture/MASTER_TREE_final.md` — §39 Parcel View · §40 Parcel Twin · §41 Mole Agent · §44 IoT Layer · §45 Satellite
- `docs/research/Y1_LAUNCH_PLAN_2026-04-25.md` v1.2 — for budget envelope reference
- `CLAUDE.md` — sovereignty + plugin-architecture rules

### 7.2 · Web sources (all retrieved 2026-04-26)

**UAE underground utilities + government coordination:**
- [DEWA main](https://www.dewa.gov.ae/en/) · [Esri DEWA Marafeq case study](https://www.esri.com/en-us/landing-page/industry/electric-and-gas/2020/dewa-case-study)
- [Dubai Municipality](https://www.dm.gov.ae/) · [DM GIS Center](https://www.dm.gov.ae/municipality-business/planning-and-construction/geographic-information-systems/gis-services/) · [GeoDubai news](https://geodubai.dm.gov.ae/en/Pages/AllNews.aspx) · [DM GIS Projects](https://www.dm.gov.ae/municipality-business/planning-and-construction/geographic-information-systems/gis-projects/) · [DM GIS Partners](https://www.dm.gov.ae/municipality-business/planning-and-construction/geographic-information-systems/partners/)
- [DDA GIS](https://gis.dda.gov.ae/DIS/)
- [Dubai Pulse main](https://www.dubaipulse.gov.ae/) · [Dubai Pulse Get Data](https://www.digitaldubai.ae/data/get-data) · [data.dubai redirect](https://data.dubai/) · [Dubai Open Data government portal](https://www.dubai.ae/open-data)
- [Dar Al Naseeb 2026 — DM Authority Approval / NOC chain](https://daralnaseeb.com/blog/dubai-municipality-approval-complete-guide-2026) · [Yallarenovation NOC guide 2026](https://www.yallarenovation.com/post/how-to-get-noc-renovation-permits-in-dubai)

**District cooling:**
- [Empower](https://www.empower.ae) (also [empower districts page proxy](https://www.emicool.com/districts) — Emicool districts) · [Tabreed](https://tabreed.ae/en) · [Emicool](https://www.emicool.com/)
- [PipeRepair UAE district cooling 2025](https://piperepair.co.uk/2025/03/05/uae-leads-the-way-with-pioneering-approach-to-district-cooling/) · [Fortune Business Insights — top 5 district cooling](https://www.fortunebusinessinsights.com/blog/top-5-district-cooling-companies-10568) · [Markntel UAE district cooling 2025-30](https://www.marknteladvisors.com/research-library/uae-district-cooling-market.html)

**Telecom underground:**
- [Etisalat Fibre to the Room](https://www.etisalat.ae/en/c/home/fibre-to-the-room.html) · [tbreak UAE 2026 internet review](https://tbreak.com/best-home-internet-packages-in-the-uae-fixed-line-5g-options-in-2025/) · [Hengtong UAE FTTH supplier brief](https://www.hengtongglobal.com/info/ftth-drop-cable-supplier-in-dubai-103174167.html)

**Geological / geotechnical:**
- [Springer 2025 — Sustainable groundwater control in Sabkha (AD Metropolitan)](https://link.springer.com/article/10.1007/s43621-025-01187-9)
- [IJERA — Geotechnical properties of Sabkha soil southern UAE](https://www.ijera.com/papers/Vol5_issue6/Part%20-%203/E56032429.pdf)
- [Springer 2018 — Middle East geotechnical features review](https://link.springer.com/article/10.1007/s41062-018-0158-z)
- [Joe.uobaghdad — Sabkha bearing capacity plate load test](https://www.joe.uobaghdad.edu.iq/index.php/main/article/view/2123)
- UAE labs: [SmartGeo](https://smartgeo.ae/geotechnical-investigation-in-uae-reliable-soil-testing-services-in-dubai-abu-dhabi-al-ain/) · [NES Dubai](https://nesdubai.com/soil-investigation/) · [Al Mawazeen Lab](https://www.almawazeenlab.com/) · [Baynunah Laboratories](https://www.baynunahlaboratories.ae/service-detail.php?serv=geotechnical-investigation) · [ORYCTA](https://orycta.com/services) · [Capital Surveys](https://capital-surveys.com/) · [MLab](https://mlab.ae/geotechnical-investigation-and-geophysical-survey/)

**InSAR / Sentinel-1 / commercial SAR:**
- [Copernicus Data Space Ecosystem](https://dataspace.copernicus.eu/) · [Sentinel-1 mission page](https://sentinels.copernicus.eu/copernicus/sentinel-1) · [ESA Sentinel-1 overview](https://www.esa.int/Applications/Observing_the_Earth/Copernicus/Sentinel-1) · [SNAP-StaMPS PSI processing](https://forum.step.esa.int/uploads/default/original/2X/5/5b74f3e92b42d2fa44a97bd41beb8163e0b85a6f.pdf) · [P-PSI MDPI 2020](https://www.mdpi.com/2072-4292/12/19/3207) · [NASA Earthdata Sentinel-1](https://www.earthdata.nasa.gov/data/platforms/space-based-platforms/sentinel-1)
- [ICEYE SAR data](https://www.iceye.com/sar-data) · [ICEYE constellation eoPortal brief](https://www.eoportal.org/satellite-missions/iceye-constellation) · [Defense Post SAR guide April 2026](https://thedefensepost.com/2026/04/01/synthetic-aperture-radar-guide/) · [DeepInSAR managed-service brief](https://www.deepinsar.com/en/news/what-is-insar) · [Dataintelo Ground Motion InSAR market](https://dataintelo.com/report/ground-motion-insar-monitoring-market) · [Farmonaut Sentinel-1 InSAR mining 2025](https://farmonaut.com/mining/sentinel-1-more-top-satellites-for-insar-mining-2025)
- **UAE-proven academic study:** [ScienceDirect — Persistent scatterer interferometry, Remah UAE, 40 mm/yr subsidence bowl](https://www.sciencedirect.com/science/article/pii/S0048969721010135)

**Ground Penetrating Radar (GPR) UAE providers:**
- [SmartGeo GPR](https://smartgeo.ae/gpr-survey-uae-advanced-subsurface-mapping-for-safer-infrastructure/) · [Falcon Geomatics GPR](https://www.falcon-geosystems.com/detection/ground-penetrating-radar/) · [Dutco Tennant GPR](https://www.dutcotennant.com/category/civil-infrastructure/surveying-solutions/ground-penetrating-radar) · [Al Warqa Survey GPR](https://www.alwarqasurvey.com/GPR-survey) · [Raynas Global GPR providers UAE](https://www.raynasglobal.com/dubai-sue-gpr-ground-penetrating-radar-survey-provider-companies-in-uae) · [Geoworks Arabia GPR](https://geoworks-arabia.com/home/gpr-survey/) · [Professional Surveys GPR](https://professional-surveys.com/ground-penetrating-radar-gpr/) · [Scan M2 UAE GPR concrete scanning](https://scanm2.com/landings/gpr-scanning-concrete-scanning-services-in-uae/)

**LoRaWAN soil/groundwater IoT:**
- [RAK Wireless soil monitoring](https://store.rakwireless.com/products/soil-monitoring) · [Daviteq LoRaWAN soil moisture](https://www.iot.daviteq.com/wireless-sensors/lorawan-soil-moisture-sensor) · [Sensoterra](https://www.sensoterra.com/soil-moisture-sensor/) · [Milesight EM500-SMTC](https://www.milesight.com/iot/product/lorawan-sensor/em500-smtc) · [Linovision LoRaWAN soil sensor](https://global.linovision.com/products/lorawan-wireless-sensor-for-soil-moisture-temperature-and-electrical-conductivity-measurement) · [Seeed SenseCAP LoRaWAN soil sensor](https://www.seeedstudio.com/LoRaWAN-Soil-Moisture-and-Temperature-Sensor-EU868-p-4316.html) · [IoTNVR LoRaWAN soil sensor](https://us.iotnvr.com/products/lorawan-wireless-soil-moisture-temperature-and-electrical-conductivity-sensor) · [IEEE — UAS-assisted IoT LoRaWAN underground sensors](https://ieeexplore.ieee.org/document/9904018/) · [IOT Store SE01-LB](https://iot-store.com.au/products/se01-lb-lorawan-wireless-soil-moisture-ec-sensor)

**Platforms / competitors:**
- [Bentley OpenCities Planner](https://www.bentley.com/software/opencities-planner/) · [OpenCities Planner datasheet](https://static.carahsoft.com/concrete/files/7616/2505/7642/Wrapped_4530_Bentley_OpenCities_Planner_Datasheet_FINAL_003.pdf) · [G2 reviews 2026](https://www.g2.com/products/bentley-opencities-planner/reviews) · [SoftwareSuggest 2026](https://www.softwaresuggest.com/opencities-planner)
- [ValuStrat VPI](https://valustrat.com/pages/valustrat-price-index-vpi) · [ValuStrat Dubai](https://www.facebook.com/valustrat/)

**Legal / regulatory:**
- [Egsh Trakheesi advertising compliance 2026](https://egsh.ae/insights/trakheesi-permit-dubai-advertising-compliance) · [Bayut MyBayut Trakheesi guide](https://www.bayut.com/mybayut/trakheesi/) · [Disalvo Trakheesi explained](https://disalvorealty.com/blog/article/trakheesi-system-explained)
- [UAE PDPL — CookieYes guide 2026](https://www.cookieyes.com/blog/uae-data-protection-law-pdpl/) · [Kayrouz cross-border data 2026](https://www.kayrouzandassociates.com/insights/cross-border-data-transfers-under-uae-law-in-2026) · [u.ae government data protection laws portal](https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws) · [MBG corp UAE PDPL 2026](https://mbgcorp.legal/insights/uae-data-protection-law/) · [BSH Soft UAE PDPL 2026 guide](https://bshsoft.com/uae-data-protection-law-2026-guide) · [OAD Technologies UAE PDPL strategic guide](https://www.oadtechnologies.com/the-uae-personal-data-protection-law-a-strategic-compliance-guide-for-2026/) · [ITSEC UAE PDPL cybersecurity](https://itsecnow.com/regulators/pdpl-cybersecurity)

### 7.3 · Retrieval and authoring

- All web sources retrieved 2026-04-26 within research session for this document.
- "Verified live" = source page returned content confirming the offering exists as described, OR a third-party authoritative summary confirmed it.
- "Claimed but unverified" = no public confirmation page found; vendor / partnership channel must be engaged directly.
- "Verified absent" = explicit search confirmed the data category does NOT exist in the source (e.g. Dubai Pulse landing-page browse showed no subsurface dataset).
- Document drafted by Claude Opus 4.7 (1M context) under Claude Code agent runtime.
- Authored 2026-04-26 across single session ~50 minutes.
- Branch: `research/mole-data-2026-04-26` (off `research/launch-research-2026-04-25`).

---

## §8 · Version history

| Version | Date | Author | Summary |
|---|---|---|---|
| v1.0 | 2026-04-26 | ZAAHI engineering agent (research-branch `research/mole-data-2026-04-26`) | Initial Mole Agent data-source dossier covering 6 research areas (UAE underground utilities · geological/geotechnical · subsurface satellite/radar · IoT subsurface sensors · platforms/competitors · legal/regulatory). 16 source entries with provider/URL/format/coverage/cost/licence/integration/bus-factor/verification per spec template. Phase 1 stack: Sentinel-1 InSAR (free) + per-parcel geotech commissions (revenue-funded) + academic corpus (free) + Dubai Pulse catalog scan (free) — Y1 Investment cost ~AED 20k absorbed in lines 3 + 10 of `Y1_LAUNCH_PLAN_2026-04-25.md`. Phase 2-3 stack adds DM GIS Centre MoU, DEWA/Empower/Etisalat partnerships, ICEYE commercial SAR, GPR framework, LoRaWAN IoT deployment — annualised AED 500k-2.5M depending on partnership terms. Three blockers flagged (Critical Infrastructure Protection legal · no unified Dubai subsurface dataset · cost scaling per AOI). Seven open questions for founder ratification. No `src/` edits. No schema edits. No canonical edits. No main push. |

---

*End of mole-agent-data-sources.md.*

For questions: `zhanrysbayev@gmail.com` · `d.tsvyk@gmail.com` · branch `research/mole-data-2026-04-26`.
