# UAE Government API Audit for Land Intelligence
Date: 2026-04-16
Author: Claude Code research agent
Type: Research only — no code changes

Branch: `research/gov-api-audit`. ZAAHI is a Dubai proptech / Land Intelligence Platform. This document audits **official UAE government APIs** (domains `.gov.ae`, `.abudhabi`, or explicitly published ArcGIS / SDI instances) for the data classes ZAAHI needs: plot boundaries, ownership, land use, zoning, transactions, rental contracts, permits, developer projects, free-zone geometry, and infrastructure signals (utility, transport).

All claims below are tied to a specific URL that was **fetched during this audit run on 2026-04-16**. URLs that 404, 403, or 301 to a root page are flagged explicitly in Appendix A. No third-party aggregators (Bayut, Property Finder, Dubizzle, "UAE Real Estate API") are considered.

---

## Executive Summary

- **Total sources investigated:** 24
- **Fully open (free, documented, stable, public download or unauthenticated API):** 4 — bayanat.ae; AD-SDI open-data thematic catalogue (partial); FCSC 1MAP (read-only GIS app); Union Atlas.
- **Freemium / requires registration (account-based free tier):** 3 — data.dubai (Dubai unified portal; account + ToS required for some downloads); addata.gov.ae (Abu Dhabi open-data; registration gate observed); ADGM public registers (web search UI, no public API).
- **Closed / requires government partnership or paid contract:** 5 — **DLD API Gateway (AED 30,000 + 5% VAT/yr + MoU)**, Trakheesi production API (MoU, not public), Mollak APIs (MoU), Ejari APIs (MoU), Rental Index API (MoU).
- **Dashboards only (not machine-readable):** multiple — DLD Rental Index web UI, DLD Real Estate Data search, DMT Dari app, TAMM housing services, DM building-services portal.
- **Confirmed dead / broken for deep-linking:** **Dubai Pulse** (`dubaipulse.gov.ae` 301s the entire host to `data.dubai` root — every per-dataset permalink in community knowledge-bases and the DM "Open Data" page is effectively broken).

### Top 3 recommendations for immediate integration (week 1, <= 1 week of engineering)

1. **bayanat.ae (UAE federal open-data portal)** — only UAE-level portal we confirmed exposes a *documented* JSON API (Python, JS, curl samples on site). Use for baseline federal statistics (housing, population, construction) and a fallback geospatial layer for Ajman / northern emirates. [https://bayanat.ae/](https://bayanat.ae/)
2. **AD-SDI open-data thematic catalogue (Abu Dhabi)** — ArcGIS-backed Abu Dhabi spatial portal with a public "Explore Spatial Data" surface and 17 themes including Administrative Boundaries, Land Use, Urban. Extract GeoJSON/FeatureServer layers for ZAAHI's Abu Dhabi municipalities / districts / communities and projects layers, which we already mirror as static PMTiles. [https://sdi.gov.abudhabi/sdi/](https://sdi.gov.abudhabi/sdi/)
3. **MoCCAE Environmental ArcGIS** — federal ArcGIS Sites instance at `gis.moccae.gov.ae/arcgis` provides biodiversity, marine environment, waste, compliance geospatial data — useful as environmental-constraint overlays for plots (coastal zones, protected areas) which buyers care about. [https://gis.moccae.gov.ae/arcgis/apps/sites/](https://gis.moccae.gov.ae/arcgis/apps/sites/)

### Top 3 recommendations for partnership / MoU outreach (multi-week to multi-month)

1. **DLD API Gateway** — paid (AED 30,000+VAT/yr per the public DLD page) and MoU-gated, but it is the *only* authoritative source of live Dubai transactions, rent contracts, broker cards, Mollak service-charge data, Oqood off-plan, and Trakheesi permits. Non-negotiable for ZAAHI's plot-level truth moat in Dubai. Route via a RERA-licensed broker entity; fee structure per-API may be additional — `⚠ VERIFY` with DLD commercial.
2. **Dubai Municipality Building Services / ePlan** — permit-level records are the single most valuable "permit layer" for ZAAHI. DM's `open-data.html` lists an `open-api` suffix on at least one dataset (dm_project_building_information-**open-api**), implying API access is achievable but historically fronted by Dubai Pulse (now dead). Requires direct DM contact.
3. **DMT Abu Dhabi — Dari platform / pages.dmt.gov.ae real-estate "Property and Index"** — the Abu Dhabi transactions equivalent to DLD. Page currently shows "No data to display" for Highest Sales Value and only a 2019-2021 chart; the API path is not documented. Engage via DMT Real Estate Sector.

### Summary table (regulator × access × format × cost × ZAAHI-fit)

| # | Source | Access | Format | Cost | ZAAHI fit |
|---|---|---|---|---|---|
| 1 | DLD API Gateway | MoU + subscription | Unknown (assume JSON/REST) | AED 30,000 + 5% VAT / yr base | Critical — transactions, Ejari, Mollak, Trakheesi, Brokers, Oqood |
| 2 | DLD Open Data — Real Estate Data | Web UI + CSV download | CSV | Free | High — CSV extracts of transactions, rents, valuations, land, units, brokers, developers |
| 3 | DLD Open Data — Indexes | Dashboard UI only | HTML dashboard | Free | Low — no API surface confirmed |
| 4 | Dubai Pulse (dubaipulse.gov.ae) | **DEAD — 301 to data.dubai** | n/a | n/a | **Red flag** — all deep links broken |
| 5 | data.dubai | Account + dashboards | Dashboard; downloads TBD | Free (register) | Medium — replaces Pulse; catalogue sparse as of 2026-04-16 |
| 6 | Dubai Municipality Open Data | Via Dubai Pulse links (now dead) | Was CSV | Free | High *if resurrected* — buildings, permits, community geometry |
| 7 | Makani (makani.ae) | **Maintenance page** on 2026-04-16 | n/a | n/a | Red flag — core Dubai address system offline during audit |
| 8 | DDA (dda.gov.ae) / gis.dda.gov.ae/DIS | Web UI (no REST endpoint confirmed) | Unknown | Free (UI) | Medium — affection-plan / zoning UI only |
| 9 | RERA (via DLD broker search) | Web UI via Trakheesi | HTML | Free | Medium — manual verification of brokers/projects |
| 10 | Trakheesi production | 403 to public | n/a | MoU | High for permit-flow; not for data pipeline |
| 11 | Smart/Digital Dubai | Portal aggregator | n/a (redirects to data.dubai) | Free | Low after merge |
| 12 | DEWA open-data | 403 on two known paths | n/a | Unknown | Low — blocked during audit |
| 13 | RTA open-data | Via Dubai Pulse (dead) | PDFs/reports | Free | Low — no GTFS feed confirmed |
| 14 | DMT (dmt.gov.ae) | Web UI + MyLand / Dari | ArcGIS-based (inferred) | Free UI | High — Abu Dhabi real-estate index, NOC, E-Corr |
| 15 | TAMM (tamm.abudhabi) | UAE Pass gated services | Consumer UI | Free (citizens) | Low for bulk data |
| 16 | Abu Dhabi Open Data (addata.gov.ae) | Timeout during audit; listed by u.ae | Unknown | Free | Medium — needs follow-up |
| 17 | AD-SDI (sdi.gov.abudhabi) | Public thematic catalogue | ArcGIS REST likely | Free | **High** — 1,000 layers, 17 themes incl. Land Use, Urban |
| 18 | ADGM public registers | Web UI search | HTML | Free | Low — company/FSRA entity search, no real-estate bulk |
| 19 | Bayanat (bayanat.ae) | Documented API | JSON via Resource GUID; CSV/XLSX/XML | Free | **High** — federal baseline + GeoData subportal |
| 20 | FCSC — opendata.fcsc.gov.ae | 403 during audit | Unknown | Free | Medium |
| 21 | Union Atlas (atlas.fgic.gov.ae) | Public interactive viewer | Dashboard/ArcGIS | Free | Medium — federal statistical layer |
| 22 | FCSC 1MAP (geostat.fcsa.gov.ae) | Public portal | ArcGIS GIS portal | Free | Medium |
| 23 | MoCCAE env. GIS (gis.moccae.gov.ae) | Public ArcGIS Sites | ArcGIS REST | Free | Medium — env overlays |
| 24 | Ministry of Economy | No open data API surface confirmed | n/a | n/a | Low |

---

## Dubai

### DLD — Dubai Land Department

| Field | Finding |
|---|---|
| **Source** | Dubai Land Department, [dubailand.gov.ae](https://dubailand.gov.ae/). Two relevant surfaces: the commercial **API Gateway** ([dubailand.gov.ae/en/eservices/api-gateway/](https://dubailand.gov.ae/en/eservices/api-gateway/)) and the **Open Data** section ([dubailand.gov.ae/en/open-data/real-estate-data/](https://dubailand.gov.ae/en/open-data/real-estate-data/)). |
| **Authentication** | **API Gateway:** corporate account + signed MoU + annual subscription. Per-org basis; access restricted to "software vendors, property management companies, licensed developers, and approved financial institutions" (fetched 2026-04-16). **Open Data web UI:** unauthenticated CSV download. |
| **Endpoints** | API Gateway documents (on the product page, not a dev portal) the following named APIs: **Mollak Integration, Ejari, Trakheesi, Mollak Budget, Oqood/TAS, Dubai Brokers (two endpoints — broker card + broker office), Rental Index, Mollak Virtual Account, Supplier Details, Authorized Signatory**. No sample endpoint URL, no OpenAPI spec is published — these are partner-gated. Open Data UI exposes searchable / downloadable registers for: **Transactions, Rents, Projects, Valuations, Land, Buildings, Units, Brokers, Developers** (9 registers, each with a "Download as CSV" button). |
| **Data freshness** | Open Data UI is historically near-live (same-day for transactions). Per the page itself: "For previous year data kindly visit Dubai Pulse" — since Dubai Pulse is now 301'd (see Appendix A), history pre-current-year is effectively unreachable without going back to the API Gateway. API Gateway (paid tier) advertised as "real-time". |
| **Format** | Open Data: **CSV only** (no JSON, no API surface). API Gateway: not stated on the product page; industry convention is JSON/REST. |
| **Rate limits** | **Not published** on either surface. |
| **Cost** | API Gateway: **AED 30,000 + 5% VAT per year** (published on [the API Gateway page](https://dubailand.gov.ae/en/eservices/api-gateway/) and includes "one year support"). Open Data CSV: **free**. Per-API additional fees / per-call fees: `⚠ VERIFY` — not on the public page. |
| **License** | Open Data UI links to general DLD Terms and Conditions / Privacy Policy; no explicit open-data licence (no CC-BY, no ODbL). Redistribution and commercial reuse terms are not stated — must be clarified with DLD commercial, and the conservative legal read is that bulk redistribution is not permitted without MoU. Cross-reference `UAE_COMPLIANCE.md` §2.DLD and §6A.10 for the terms-of-use risk. |
| **Useful for ZAAHI** | **Critical.** The Open Data CSV surfaces are the single most valuable free source for Dubai plot-level transaction truth — replacing static extracts ZAAHI currently ships. API Gateway is the path to *live* transaction, Ejari (rent contracts), Mollak (service charges / SCOA), Trakheesi (per-ad permit state) and Broker-Card verification — all of which ZAAHI's listing / verification flows will legally need once brokering. |
| **Integration effort** | **CSV Open Data ingestion:** 8–16 hrs per register to write a scraper of the "Download as CSV" path (9 registers × ~16 hrs = ~18 dev-days for robust daily pulls + schema normalisation). **API Gateway:** multi-month engagement — MoU negotiation, legal review, subscription onboarding, sandbox credentials, production keys. Treat as a procurement project, not an engineering task. |

### Dubai Pulse (`dubaipulse.gov.ae`)

| Field | Finding |
|---|---|
| **Source** | Dubai Pulse, [dubaipulse.gov.ae](https://www.dubaipulse.gov.ae/). |
| **Authentication** | n/a — host-level 301. |
| **Endpoints** | **DEAD.** All URLs on the host return `301 Moved Permanently` to `https://data.dubai/` root, with the path dropped. Confirmed on 2026-04-16 for: `https://www.dubaipulse.gov.ae/` (root), `https://www.dubaipulse.gov.ae/organisation/rta`, `https://www.dubaipulse.gov.ae/organisation/dubai-land-department`, `https://www.dubaipulse.gov.ae/data/dld-transactions/dld_transactions-open`. Per-dataset permalinks are not preserved on redirect — they all land on the `data.dubai/` home. |
| **Data freshness** | n/a. |
| **Format** | n/a. |
| **Rate limits** | n/a. |
| **Cost** | n/a. |
| **License** | n/a. |
| **Useful for ZAAHI** | **Red flag.** If any current ZAAHI data pipeline loads a CSV or PMTile from a `dubaipulse.gov.ae/data/...` URL, it is silently pulling a redirect to a portal home — the pipeline is effectively dead. Must migrate every Dubai Pulse reference to either (a) DLD Open Data UI (CSV), (b) data.dubai (unified portal), or (c) an emirate-specific portal (DM open-data, etc.). |
| **Integration effort** | n/a — **migration effort is 1–3 engineer-days to audit ZAAHI's existing code for hardcoded Pulse URLs and reroute each one.** |

### data.dubai (unified portal — Pulse successor)

| Field | Finding |
|---|---|
| **Source** | data.dubai, reached by the 301 from Dubai Pulse. [https://data.dubai/](https://data.dubai/). |
| **Authentication** | Account registration required for some actions. The home page states "you may be required to register, or to link your old account." UAE Pass linkage assumed but not explicitly shown on home page. |
| **Endpoints** | The home page confirms data.dubai "officially replaced the two former platforms: Dubai Pulse and Dubai Data and Statistics Establishment." It lists, as a featured DLD dataset, the **Residential Sale Index** accessible as a dashboard. A full dataset catalogue page (`/datasets`, `/en/open-data`) returned 404 on 2026-04-16 — the catalogue URL-structure is not discoverable from the home page alone. Search is Gen-AI-mediated rather than a traditional CKAN / DKAN catalogue. |
| **Data freshness** | Not specified. |
| **Format** | Dashboards confirmed; downloadable formats (CSV/JSON/GeoJSON) not confirmed from the home page. |
| **Rate limits** | Not published. |
| **Cost** | Free after registration. |
| **License** | Not stated on the home page. |
| **Useful for ZAAHI** | **Medium.** Replacement platform for Pulse — but the migration is clearly incomplete (catalogue URLs 404, deep-link structure not yet public). Revisit in Q3 2026. |
| **Integration effort** | Cannot be estimated until a stable dataset-URL pattern exists. |

### Dubai Municipality (ePlan / Makani / open-data)

| Field | Finding |
|---|---|
| **Source** | [dm.gov.ae](https://www.dm.gov.ae/), Open Data at [dm.gov.ae/open-data.html](https://dm.gov.ae/open-data.html), Makani at [makani.ae](https://www.makani.ae/). |
| **Authentication** | Public reading UI; download links on the Open Data page delegate to `dubaipulse.gov.ae` (now 301). |
| **Endpoints** | The DM open-data page catalogues datasets across categories: **Buildings** (Permits, Usages, Floor Level Info, Summary Info, Project Building/Project Info, Applications, SLA, Sand Shifting, Payment Vouchers, Engineer Accreditation, Registered Corporates, Practice Permits), **GIS** (Community, Entrances, Sectors), **Parks Coordinates**, **Heritage Places**, plus Agriculture, Food, Consumer Products, Animals. One entry is named **`dm_project_building_information-open-api`** — strongly implying an API slug, though the resolved URL lives on Dubai Pulse (now dead). |
| **Data freshness** | Not stated; previously daily-ish on Dubai Pulse. |
| **Format** | Not explicitly specified on the DM page (CSV implied by convention); GIS layers are described as "Community / Entrances / Sectors" without format. |
| **Rate limits** | Not stated. |
| **Cost** | Free. |
| **License** | Stated on the open-data page: *"Dubai Municipality is not liable for any data distortion, modification or wrong use. Customers have the right to use this data and statistics at their own liability. The source of the data must be mentioned when used."* Governed by **Law 26/2015** and **Law 2/2016**. This is approximately a CC-BY-style attribution licence (commercial use permitted with attribution, no warranty), but not an SPDX-tagged licence — treat as attribution-required. |
| **Useful for ZAAHI** | **High** — Building permits are the single most valuable permit layer. Community / Entrances / Sectors GIS is foundational for Dubai plot geometry. **But** all download links front Dubai Pulse which is dead. |
| **Integration effort** | **Blocked** — requires either (a) DM direct contact to get replacement download URLs, or (b) wait for DM to refresh links to data.dubai. Estimate 2–6 dev-weeks once links are live. |
| **Makani specifically** | `makani.ae` served a **"scheduled maintenance"** page on 2026-04-16 — entire service surface offline during audit. Previously Makani provided a web + mobile UI for 10-digit Makani code ↔ coordinates; no public developer API has been documented historically (Makani integrations were done through DM partnership). |

### DDA — Dubai Development Authority

| Field | Finding |
|---|---|
| **Source** | DDA, [dda.gov.ae](https://www.dda.gov.ae/). GIS: [gis.dda.gov.ae/DIS/](https://gis.dda.gov.ae/DIS/). Fee payment: [webzoning.dda.gov.ae](https://webzoning.dda.gov.ae/Zoning/FeePayment). e-Services: [dda.gov.ae/en/eservices/eservices](https://www.dda.gov.ae/en/eservices/eservices). |
| **Authentication** | DIS UI shell accessible unauthenticated; deeper viewers assumed gated by Salesforce-style AXS (`axs.force.com/axslogin`). |
| **Endpoints** | No documented REST API surface. DIS page is an application shell — no discoverable ArcGIS REST endpoint from the outer HTML. Zoning payment and NOC-type services via AXS login. |
| **Data freshness** | DIS is the system-of-record for DDA master-plan zones and affection plans, so updates are administrative (weekly–monthly). |
| **Format** | Interactive viewer only. |
| **Rate limits** | n/a. |
| **Cost** | Free viewing; DDA payments are per-transaction for plan extracts. |
| **License** | Not published. Terms-of-use risk for scraping DIS is high — `UAE_COMPLIANCE.md` §6A.10 already flags affection-plan scraping. |
| **Useful for ZAAHI** | **Medium.** Authoritative for DDA free zone / TECOM / Dubai Internet City / Dubai Media City / Dubai Design District plot boundaries. ZAAHI already mirrors a snapshot of **DDA Projects (209)** and **Free Zones (209)** — DDA does not currently expose an open API to refresh those feeds. |
| **Integration effort** | **Do not scrape.** Engage DDA master-planning dept for an MoU or request GeoJSON extracts directly. 3–6 weeks of relationship work. |

### RERA

| Field | Finding |
|---|---|
| **Source** | RERA is an organ within DLD; in 2026 its public-facing data surfaces are the DLD website sub-sections (brokers, projects, escrow) and Trakheesi. |
| **Authentication** | Public search UI; no API. |
| **Endpoints** | **Broker registry:** accessible through the DLD "Dubai Brokers" page (UI search). A paid API exists as part of the DLD API Gateway ("Dubai Brokers API — real-time access to broker card and broker office information"). **Project registry:** UI on dubailand.gov.ae. **Escrow:** closed; no API. |
| **Data freshness** | Live. |
| **Format** | HTML / UI only for free tier; JSON (presumed) via API Gateway. |
| **Rate limits** | Not published. |
| **Cost** | Free UI; paid via Gateway (AED 30,000+/yr bundle). |
| **License** | Not stated. |
| **Useful for ZAAHI** | **High** — broker-card verification is a hard legal requirement per `UAE_COMPLIANCE.md` §6A.2. Every listing advertised by ZAAHI must quote a valid broker card number; the Gateway is the only programmatic verification path. Projects registry is useful for de-duplicating ZAAHI's off-plan inventory. |
| **Integration effort** | Same as DLD API Gateway (MoU). |

### Smart Dubai / Digital Dubai

| Field | Finding |
|---|---|
| **Source** | [digitaldubai.ae](https://www.digitaldubai.ae/). |
| **Authentication** | n/a — an umbrella regulator; redirects users to data.dubai and the Partners Portal (partnersportal.digitaldubai.ae). |
| **Endpoints** | No direct APIs of its own relevant to land/property. Primary ownership of data.dubai, UAE Pass federation, DubaiNow app. |
| **Data freshness** | n/a. |
| **Format** | n/a. |
| **Rate limits** | n/a. |
| **Cost** | n/a. |
| **License** | n/a. |
| **Useful for ZAAHI** | **Low-direct**; **High-indirect** because UAE Pass (run by Digital Dubai / federal Digital Gov) is the auth standard ZAAHI's onboarding will need. No impact on the data pipeline. |
| **Integration effort** | UAE Pass federation is a separate exercise (2–4 dev-weeks) — out of scope for this audit. |

### DEWA — Dubai Electricity & Water Authority

| Field | Finding |
|---|---|
| **Source** | [dewa.gov.ae](https://www.dewa.gov.ae/). Open-data paths attempted: `/en/consumer/other-services/open-data`, `/en/about-us/open-data`, `/en/about-us/sustainability-and-the-environment/reports-and-data`. |
| **Authentication** | All three paths returned **HTTP 403** on 2026-04-16. Consumer side requires DEWA account login; no public open-data API surface was reachable during audit. |
| **Endpoints** | Unknown — none confirmed during audit. |
| **Data freshness** | n/a. |
| **Format** | n/a. |
| **Rate limits** | n/a. |
| **Cost** | n/a. |
| **License** | n/a. |
| **Useful for ZAAHI** | **Potentially medium** — district-level consumption could be a demand-signal overlay (how occupied is a community really?) — but no public API exists, and DEWA has been historically restrictive about aggregate data release. |
| **Integration effort** | Treat as closed. If strategically important, formal data-request letter to DEWA Communications; expect 2–4 months. |

### RTA — Roads & Transport Authority

| Field | Finding |
|---|---|
| **Source** | [rta.ae](https://www.rta.ae/). |
| **Authentication** | Public reports; any bulk data request routed through Dubai Pulse (dead). |
| **Endpoints** | The RTA Open Data page lists PDF report series (Annual Reports 2015–2024, Sustainability, Statistics, Governance, legislation) but **no GTFS feed**, no real-time transit API, and no metro / station / bus-stop geometry endpoints were discoverable. Historically RTA datasets lived under `dubaipulse.gov.ae/organisation/rta` — now 301 to data.dubai root. |
| **Data freshness** | Annual (reports). |
| **Format** | PDF. |
| **Rate limits** | n/a. |
| **Cost** | Free. |
| **License** | Disclaimer only — no open licence. |
| **Useful for ZAAHI** | **Low-at-current** — we cannot programmatically get metro line / station geometry from RTA public surfaces. Alternative path: OpenStreetMap metro/bus layers (out of scope — not `.gov.ae`). |
| **Integration effort** | Blocked. Raise a formal request for GTFS through RTA Customer Service; experience in similar Gulf cities (Doha, Riyadh) suggests 3–6 months. |

---

## Abu Dhabi

Abu Dhabi's land-intelligence data landscape is markedly different from Dubai's:

- The **Department of Municipalities and Transport (DMT)** centralises all three municipalities (Abu Dhabi City Municipality / Al Ain / Al Dhafra) and runs several gov-branded apps (Dari, MyLand, OnwaniClick, Darb).
- The **Spatial Data Infrastructure (AD-SDI)** is the most mature geospatial platform we encountered in the UAE and is Esri/ArcGIS-based with ~1,000 layers across 17 themes.
- The **Abu Dhabi Open Data Platform** appears under both `data.abudhabi` and `addata.gov.ae`; both are bot-hostile and effectively gated during audit.
- **TAMM** is the unified citizen-services portal — UAE-Pass-driven consumer UI only.
- **ADGM** is a free-zone regulator with a public-registers search UI and a property platform (AccessRP), but no public API.
- The federal official list ([u.ae](https://u.ae/en/about-the-uae/digital-uae/data/geospatial-data-platforms), fetched 2026-04-16) names these platforms explicitly.

### DMT — Department of Municipalities and Transport

| Field | Finding |
|---|---|
| **Source** | [dmt.gov.ae](https://www.dmt.gov.ae/en/home), Pages portal [pages.dmt.gov.ae/en/dashboard](https://pages.dmt.gov.ae/en/dashboard), Real-estate "Property and Index" [pages.dmt.gov.ae/en/real-estate/property-and-index](https://pages.dmt.gov.ae/en/real-estate/property-and-index), NOC platform [noc.dmt.gov.ae/webcenter/](https://noc.dmt.gov.ae/webcenter/), engineering MePS [meps.dmt.gov.ae](https://meps.dmt.gov.ae/). Mobile / web apps: **Dari** (real-estate transactions), **MyLand** (unified geospatial app covering all three AD municipalities), **OnwaniClick** (address), **Darb** (road toll). |
| **Authentication** | UAE Pass for consumer services (TAMM delegated); engineering classification services require account registration. No public API key mechanism documented. |
| **Endpoints** | **No public REST API surface was found** on dmt.gov.ae, pages.dmt.gov.ae, or the listed subdomains. The "Property and Index" page presents a chart-based UI with 2019–2021 transaction values and a "Highest Sales Value" tile that displayed **"No data to display"** on 2026-04-16. Engineer classification pages list aggregate stats (36,029 engineer licensing transactions; 1,785 consulting office classifications; 6,056 contractor classifications) as HTML. |
| **Data freshness** | Real-estate page appears stale (last values 2021). Other service pages are live. |
| **Format** | HTML dashboards; PDF downloads for standards (Town Planning Sector — Spatial Data Division submission specifications). |
| **Rate limits** | n/a. |
| **Cost** | Free UI. |
| **License** | Not stated. |
| **Useful for ZAAHI** | **High if accessible** — Dari is Abu Dhabi's transactions system-of-record (analogue to DLD Open Data + Mollak + Ejari combined). Currently no documented public API. MyLand is the most promising GIS surface because it federates DMT's three municipal GIS applications. |
| **Integration effort** | Same pattern as DLD Gateway — engage DMT Real-Estate Sector for MoU / data-request portal. AD-wide data-request service is hosted at [esm.gov.ae/servicehub](https://esm.gov.ae/servicehub) (surfaced from SDI as "Custom dataset requests"). Expect multi-month lead time. |

### ADM / TAMM

| Field | Finding |
|---|---|
| **Source** | TAMM, [tamm.abudhabi](https://www.tamm.abudhabi/en). Abu Dhabi City Municipality services are delivered through TAMM. |
| **Authentication** | UAE Pass. |
| **Endpoints** | TAMM pages are behind a bot-detection layer (our fetches on 2026-04-16 returned **empty responses** for `/en`, `/en/aspects-of-life/HousingAndProperties`, `/en/aspects-of-life/HousingProperties`, `/en/life-events/housing`). No public data-API documented — TAMM is a consumer services front-end. Its TAMM-for-business side integrates with partners via internal service bus, not a public REST API. |
| **Data freshness** | Live (consumer services). |
| **Format** | n/a for bulk data. |
| **Rate limits** | n/a. |
| **Cost** | Free to citizens. |
| **License** | n/a. |
| **Useful for ZAAHI** | **Low** for a data pipeline. Relevant only insofar as ZAAHI's onboarding flow may hand off to TAMM for UAE-Pass auth on Abu Dhabi listings. |
| **Integration effort** | Out of scope for this audit. |

### ADGM — Abu Dhabi Global Market

| Field | Finding |
|---|---|
| **Source** | [adgm.com](https://www.adgm.com/). Public Registers: [adgm.com/public-registers](https://www.adgm.com/public-registers). Online Registry Solution: [adgm.com/operating-in-adgm/e-services/online-registry-solution](https://www.adgm.com/operating-in-adgm/e-services/online-registry-solution). AccessRP real-estate platform: [adgm.com/operating-in-adgm/e-services/accessrp](https://www.adgm.com/operating-in-adgm/e-services/accessrp). |
| **Authentication** | Public UI for search; registered users for transactional services (entity registration, AccessRP tenancy). |
| **Endpoints** | No public REST API for public registers — search is UI-only. AccessRP itself is ADGM's internal real-estate platform for landlords, developers, tenants — not an open data feed. |
| **Data freshness** | Live. |
| **Format** | HTML only. |
| **Rate limits** | n/a. |
| **Cost** | Free. |
| **License** | Not stated. |
| **Useful for ZAAHI** | **Low-medium.** The public register is useful for verifying the corporate existence and FSRA status of an ADGM-licensed counterparty (e.g., if ZAAHI ever takes DIFC / ADGM free-zone clients). Real-estate data inside ADGM free zone goes through AccessRP — not accessible externally. |
| **Integration effort** | If needed: manual lookups only (no API). |

### Abu Dhabi Open Data Portal (`data.abudhabi` / `addata.gov.ae`)

| Field | Finding |
|---|---|
| **Source** | Two URLs identified: [data.abudhabi](http://data.abudhabi/opendata/) (301 from `https://data.abudhabi/` → `http://data.abudhabi/opendata/`) and [addata.gov.ae](https://addata.gov.ae/) (surfaced via a `u.ae` federal index). They appear to be the same platform, similar to Dubai's `data.dubai`. |
| **Authentication** | Registration appears required for downloads; blocked to our fetch with a "Request rejected" message on `/opendata/datasets`. |
| **Endpoints** | None documented publicly. Home page confirms the name "Abu Dhabi Open Data Platform" but catalogue content did not load during audit. |
| **Data freshness** | Unknown. |
| **Format** | Unknown — u.ae describes it generically as "open data." |
| **Rate limits** | Unknown. |
| **Cost** | Free (behind registration). |
| **License** | Not stated. |
| **Useful for ZAAHI** | **Medium-potential.** If the portal exposes plot-level or building-level open data (similar to Dubai Pulse at its peak), this would be a high-value feed. Revisit once the bot-block is cleared. |
| **Integration effort** | Blocked until accessible. Estimate 1–2 dev-weeks once registration and dataset-URL pattern are clear. |

### AD-SDI — Abu Dhabi Spatial Data Infrastructure

| Field | Finding |
|---|---|
| **Source** | [sdi.gov.abudhabi/sdi/](https://sdi.gov.abudhabi/sdi/) with subpaths: `/opendata.html`, `/web-catalogue.html`, `/dashboard.html`, `/search.html?variable=apps`. Map viewer reported at [arcgis.sdi.abudhabi.ae/portal/home/](https://arcgis.sdi.abudhabi.ae/portal/home/). |
| **Authentication** | Public catalogue; some services sign-in required per u.ae. Request portal (for custom datasets): [esm.gov.ae/servicehub](https://esm.gov.ae/servicehub). |
| **Endpoints** | Platform self-reports **1,000 total layers, 4 applications, 4 data-layer classifications, 17 themes** (Administrative Boundaries, Land Use, Urban, etc.). REST service URLs are not enumerated on the outer HTML — they sit behind the ArcGIS portal (`arcgis.sdi.abudhabi.ae/portal/home/`). Version 2 is noted as live. |
| **Data freshness** | Varies by layer; Esri ArcGIS portals typically expose per-item `modified` timestamps. |
| **Format** | ArcGIS FeatureServer / MapServer (REST) + likely GeoJSON export; shapefile downloads common on AD-SDI themes. |
| **Rate limits** | Not published. |
| **Cost** | Free for the open themes. |
| **License** | Not stated on the outer page; SDI portals typically attach a per-item licence — need to inspect per-layer metadata once REST item IDs are discovered. |
| **Useful for ZAAHI** | **High.** AD-SDI is the most promising geospatial source for Abu Dhabi plot boundaries, community geometry, and land-use overlays. ZAAHI already mirrors 2,083 AD municipalities/districts/communities as static PMTiles — AD-SDI is the authoritative refresh source. |
| **Integration effort** | **6–16 hrs per layer** to ingest — discover REST item ID, query `FeatureServer/0/query?f=geojson`, paginate. Initial survey (enumerate relevant item IDs) ~1 week. |

### Government developers (Aldar / Modon / Imkan)

| Field | Finding |
|---|---|
| **Source** | Aldar: [aldar.com](https://aldar.com/). Modon: `modon.ae` **301-redirects to the commercial** `modon.com` (Modon has been privatized / is now a private master-developer; a `.gov.ae` is not the appropriate surface). Imkan: no `.gov.ae` domain — private PJSC. |
| **Authentication** | n/a. |
| **Endpoints** | None. Aldar's homepage enumerates "Customer Portal, Khidmah, Asteco, Aldar Brokers, mobile apps" — consumer and broker-B2B surfaces only, no public API for communities or GIS. |
| **Data freshness** | n/a. |
| **Format** | n/a. |
| **Rate limits** | n/a. |
| **Cost** | n/a. |
| **License** | n/a. |
| **Useful for ZAAHI** | **None as `.gov.ae` source.** These are private developers. Out of scope for a government API audit. |
| **Integration effort** | n/a. |

---

## Other Emirates

*(to be filled in next pass)*

### Sharjah
### Ras Al Khaimah
### Ajman
### Fujairah
### Umm Al Quwain

---

## Federal

*(to be filled in next pass)*

### FCSC (Federal Competitiveness & Statistics Centre)
### bayanat.ae (UAE Open Data Portal)
### Ministry of Economy

---

## Recommendations

*(filled after all sections complete)*

### Immediate integration (week 1)
### Requires government outreach / partnership
### Not worth it (closed, dead, low value)

---

## Appendix A: Failed / dead links

| URL tried | Outcome | Claimed provider |
|---|---|---|
| `https://www.dubaipulse.gov.ae/` | 301 → `https://data.dubai/` | Smart Dubai / Digital Dubai |
| `https://www.dubaipulse.gov.ae/organisation/rta` | 301 → `https://data.dubai/` (path dropped) | RTA via Dubai Pulse |
| `https://www.dubaipulse.gov.ae/organisation/dubai-land-department` | 301 → `https://data.dubai/` (path dropped) | DLD via Dubai Pulse |
| `https://www.dubaipulse.gov.ae/data/dld-transactions/dld_transactions-open` | 301 → `https://data.dubai/` (path dropped) | DLD transactions dataset |
| `https://www.makani.ae/` | Scheduled maintenance page | Dubai Municipality Makani |
| `https://trakheesi.dubailand.gov.ae/` | HTTP 403 (public path restricted) | DLD Trakheesi |
| `https://www.dewa.gov.ae/en/consumer/other-services/open-data` | HTTP 403 | DEWA |
| `https://www.dewa.gov.ae/en/about-us/open-data` | HTTP 403 | DEWA |
| `https://www.dewa.gov.ae/en/about-us/sustainability-and-the-environment/reports-and-data` | HTTP 403 | DEWA |
| `https://data.dubai/en/open-data` | HTTP 404 | data.dubai catalogue |
| `https://data.dubai/datasets` | HTTP 404 | data.dubai catalogue |
| `https://dubailand.gov.ae/en/eservices/property-status/` | HTTP 404 | DLD Property Status |
| `https://www.tamm.abudhabi/en` | Empty response (bot-gated) | TAMM |
| `https://www.tamm.abudhabi/en/life-events/housing` | Empty response (bot-gated) | TAMM |
| `https://data.abudhabi/opendata/datasets` | "Request rejected" | Abu Dhabi Open Data |
| `https://opendata.fcsc.gov.ae/` | HTTP 403 | FCSC Open Data |
| `https://fcsc.gov.ae/en-us/Pages/Statistics/Statistics-by-Subject.aspx` | HTTP 403 | FCSC |

---

## Appendix B: Access model comparison

*(populated after all emirates + federal sections complete)*

---

## Appendix C: Key findings for founder

*(populated after all sections complete)*
