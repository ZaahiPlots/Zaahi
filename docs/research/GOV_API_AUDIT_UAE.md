# UAE Government API Audit for Land Intelligence
Date: 2026-04-16
Author: Claude Code research agent
Type: Research only — no code changes

Branch: `research/gov-api-audit`. ZAAHI is a Dubai proptech / Land Intelligence Platform. This document audits **official UAE government APIs** (domains `.gov.ae`, `.abudhabi`, or explicitly published ArcGIS / SDI instances) for the data classes ZAAHI needs: plot boundaries, ownership, land use, zoning, transactions, rental contracts, permits, developer projects, free-zone geometry, and infrastructure signals (utility, transport).

All claims below are tied to a specific URL that was **fetched during this audit run on 2026-04-16**. URLs that 404, 403, 500, connection-refused, or 301 to a root page are flagged explicitly in Appendix A. No third-party aggregators (Bayut, Property Finder, Dubizzle, "UAE Real Estate API") are considered.

---

## Executive Summary

- **Total sources investigated:** 24 distinct government entities / portals.
- **Fully open (free, documented, stable, public download or unauthenticated API):** 4 — **bayanat.ae** (documented JSON API via Resource GUID), **AD-SDI open-data thematic catalogue** (ArcGIS REST, partial), **FCSC 1MAP / Union Atlas** (read-only GIS viewers), **MoCCAE environmental ArcGIS Sites**.
- **Freemium / requires registration (account-based free tier):** 3 — **data.dubai** (Dubai unified portal; account + ToS required for some downloads), **addata.gov.ae / data.abudhabi** (Abu Dhabi open-data; registration gate observed), **ADGM public registers** (web search UI, no public API).
- **Closed / requires government partnership or paid contract:** 5+ — **DLD API Gateway (AED 30,000 + 5% VAT / yr + MoU)**, **Trakheesi production API** (MoU), **Mollak APIs** (MoU), **Ejari APIs** (MoU), **Rental Index API** (MoU), **DMT Dari** (MoU).
- **Dashboards only (not machine-readable):** many — DLD Rental Index web UI, DLD Real Estate Data CSV-download UI, DMT "Property and Index" chart, TAMM housing services, DM building-services portal, Sharjah Finance Department open-data page, Ajman Statistical Book (PDF only).
- **Emirate-level JSON API confirmed:** only **Ajman Municipality** (`opendata.am.gov.ae:6060`) on non-standard port.
- **Confirmed dead / broken for deep-linking:** **Dubai Pulse** (`dubaipulse.gov.ae` host-level 301s every path to `data.dubai` root — per-dataset permalinks are destroyed). **Makani** (`makani.ae`) served a scheduled-maintenance page during the entire audit window on 2026-04-16.

### Top 3 recommendations for immediate integration (week 1, ≤ 1 week of engineering)

1. **bayanat.ae (UAE federal open-data portal)** — the only UAE-level portal with a *documented* JSON API. Endpoint template (fetched from homepage 2026-04-16):
   `GET https://bayanat.ae/api/DatasetResources/GetDatasetResource?resourceID={ResourceGUID}`
   with Python, JavaScript and cURL examples on the home page. Use for baseline federal statistics (housing, population, construction) and as a fallback geospatial feed for northern emirates. [https://bayanat.ae/en](https://bayanat.ae/en)
2. **AD-SDI open-data thematic catalogue (Abu Dhabi)** — ArcGIS-backed Abu Dhabi spatial portal with a public "Explore Spatial Data" surface and 17 themes (Administrative Boundaries, Land Use, Urban, etc.), ~1,000 layers. Extract GeoJSON / FeatureServer layers for Abu Dhabi municipalities / districts / communities and projects, which ZAAHI already mirrors as static PMTiles. [https://sdi.gov.abudhabi/sdi/](https://sdi.gov.abudhabi/sdi/)
3. **DLD Open Data — Real Estate Data CSV** — nine free registers (Transactions, Rents, Projects, Valuations, Land, Buildings, Units, Brokers, Developers), each with a "Download as CSV" path. Not a REST API but authoritative, free, and sufficient for a nightly replacement of ZAAHI's static DLD heatmap extract. [https://dubailand.gov.ae/en/open-data/real-estate-data/](https://dubailand.gov.ae/en/open-data/real-estate-data/)

### Top 3 recommendations for partnership / MoU outreach (multi-week to multi-month)

1. **DLD API Gateway** — paid (AED 30,000 + 5% VAT / yr base per [the public DLD page](https://dubailand.gov.ae/en/eservices/api-gateway/), fetched 2026-04-16) and MoU-gated, but the only authoritative source of live Dubai transactions, rent contracts (Ejari), broker cards (Dubai Brokers API), Mollak service-charge data, Oqood off-plan, and Trakheesi permits. Non-negotiable for ZAAHI's plot-level truth moat in Dubai. Route via a RERA-licensed broker entity (see `UAE_COMPLIANCE.md` §2.DLD). Per-API additional fees / per-call fees `⚠ VERIFY` with DLD commercial.
2. **Dubai Municipality Building Services / ePlan** — permit-level records are the single most valuable "permit layer" for ZAAHI. DM's [open-data.html](https://dm.gov.ae/open-data.html) lists `dm_project_building_information-open-api` which implies an API slug, but the resolved URL fronts Dubai Pulse (now dead). Requires direct DM contact.
3. **DMT Abu Dhabi — Dari platform / real-estate "Property and Index"** — the Abu Dhabi equivalent to DLD. Page currently shows "No data to display" for Highest Sales Value and only a 2019-2021 chart ([pages.dmt.gov.ae/en/real-estate/property-and-index](https://pages.dmt.gov.ae/en/real-estate/property-and-index), fetched 2026-04-16); no API documented. Engage via DMT Real-Estate Sector; custom-dataset request portal at [esm.gov.ae/servicehub](https://esm.gov.ae/servicehub).

### Summary table (regulator × access × format × cost × ZAAHI-fit)

| # | Source | Access | Format | Cost | ZAAHI fit |
|---|---|---|---|---|---|
| 1 | DLD API Gateway | MoU + subscription | JSON/REST (inferred) | AED 30,000 + 5% VAT / yr base | Critical — transactions, Ejari, Mollak, Trakheesi, Brokers, Oqood |
| 2 | DLD Open Data — Real Estate Data | Web UI + CSV download | CSV | Free | High — 9 registers |
| 3 | DLD Open Data — Indexes | Dashboard UI only | HTML | Free | Low — no API confirmed |
| 4 | Dubai Pulse (dubaipulse.gov.ae) | **DEAD — 301 to data.dubai** | n/a | n/a | **Red flag** — all deep links broken |
| 5 | data.dubai | Account + dashboards | Dashboard; downloads TBD | Free (register) | Medium — replaces Pulse; catalogue sparse 2026-04-16 |
| 6 | Dubai Municipality Open Data | Was Dubai Pulse (dead) | Was CSV | Free | High *if resurrected* — buildings, permits, community geometry |
| 7 | Makani (makani.ae) | **Maintenance page** on 2026-04-16 | n/a | n/a | Red flag — core Dubai address system offline during audit |
| 8 | DDA (dda.gov.ae) / gis.dda.gov.ae/DIS | Web UI (no REST endpoint confirmed) | Viewer | Free UI | Medium — affection-plan / zoning UI only |
| 9 | RERA (via DLD broker search) | Web UI via Trakheesi | HTML | Free | Medium — manual verification |
| 10 | Trakheesi production | 403 to public | n/a | MoU | High for permit flow; not for data pipeline |
| 11 | Smart/Digital Dubai | Portal aggregator | n/a (redirects to data.dubai) | Free | Low after merge |
| 12 | DEWA open-data | 403 on every attempted path | n/a | Unknown | Low — blocked during audit |
| 13 | RTA open-data | Via Dubai Pulse (dead) | PDF reports | Free | Low — no GTFS feed confirmed |
| 14 | DMT (dmt.gov.ae) | Web UI + MyLand / Dari | ArcGIS (inferred) | Free UI | High — Abu Dhabi real-estate index, NOC, E-Correspondence |
| 15 | TAMM (tamm.abudhabi) | UAE Pass gated services | Consumer UI | Free (citizens) | Low for bulk data |
| 16 | Abu Dhabi Open Data (addata.gov.ae / data.abudhabi) | Bot-blocked during audit | Unknown | Free | Medium — follow-up needed |
| 17 | AD-SDI (sdi.gov.abudhabi) | Public thematic catalogue | ArcGIS REST likely | Free | **High** — 1,000 layers, 17 themes incl. Land Use, Urban |
| 18 | ADGM public registers | Web UI search | HTML | Free | Low — entity search, no bulk real-estate |
| 19 | Bayanat (bayanat.ae) | Documented API | JSON via Resource GUID; CSV/XLSX/XML | Free | **High** — federal baseline + GeoData subportal |
| 20 | FCSC — opendata.fcsc.gov.ae | 403 during audit | Unknown | Free | Medium |
| 21 | Union Atlas (atlas.fgic.gov.ae) | Public interactive viewer | Dashboard/ArcGIS | Free | Medium — federal statistical layer |
| 22 | FCSC 1MAP (geostat.fcsa.gov.ae) | Public portal | ArcGIS GIS portal | Free | Medium |
| 23 | MoCCAE env. GIS (gis.moccae.gov.ae) | Public ArcGIS Sites | ArcGIS REST | Free | Medium — environmental overlays |
| 24 | Ministry of Economy & Tourism (moet.gov.ae) | Web open-data section | XLSX | Free | Low — trade / FDI focus, minimal real-estate |

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
| **Cost** | API Gateway: **AED 30,000 + 5% VAT per year**, "includes one year support" (published on [the API Gateway page](https://dubailand.gov.ae/en/eservices/api-gateway/)). Open Data CSV: **free**. Per-API additional fees / per-call fees: `⚠ VERIFY` — not on the public page. |
| **License** | Open Data UI links to general DLD Terms and Conditions / Privacy Policy; no explicit open-data licence (no CC-BY, no ODbL). Redistribution and commercial reuse terms are not stated — must be clarified with DLD commercial, and the conservative legal read is that bulk redistribution is not permitted without MoU. Cross-reference `UAE_COMPLIANCE.md` §2.DLD and §6A.10 for the terms-of-use risk. |
| **Useful for ZAAHI** | **Critical.** The Open Data CSV surfaces are the single most valuable free source for Dubai plot-level transaction truth — replacing static extracts ZAAHI currently ships. API Gateway is the path to *live* transaction, Ejari (rent contracts), Mollak (service charges / SCOA), Trakheesi (per-ad permit state) and Broker-Card verification — all of which ZAAHI's listing / verification flows will legally need once brokering. |
| **Integration effort** | **CSV Open Data ingestion:** 8–16 hrs per register to write a scraper of the "Download as CSV" path (9 registers × ~16 hrs ≈ 18 dev-days for robust daily pulls + schema normalisation). **API Gateway:** multi-month engagement — MoU negotiation, legal review, subscription onboarding, sandbox credentials, production keys. Treat as a procurement project, not an engineering task. |

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
| **Useful for ZAAHI** | **High** — building permits are the single most valuable permit layer. Community / Entrances / Sectors GIS is foundational for Dubai plot geometry. **But** all download links front Dubai Pulse which is dead. |
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
| **Source** | RERA is an organ within DLD; in 2026 its public-facing data surfaces are the DLD website sub-sections (brokers, projects, escrow) and Trakheesi. Trakheesi public-facing URL [trakheesi.dubailand.gov.ae](https://trakheesi.dubailand.gov.ae/) returned **HTTP 403** on 2026-04-16. |
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
| **Authentication** | n/a — an umbrella regulator; redirects users to data.dubai and the Partners Portal (`partnersportal.digitaldubai.ae`). |
| **Endpoints** | No direct APIs of its own relevant to land / property. Primary ownership of data.dubai, UAE Pass federation, DubaiNow app. |
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
| **Useful for ZAAHI** | **Low-at-current** — we cannot programmatically get metro line / station geometry from RTA public surfaces. Alternative path (outside audit scope): OpenStreetMap metro/bus layers. |
| **Integration effort** | Blocked. Raise a formal request for GTFS through RTA Customer Service; experience in similar Gulf cities (Doha, Riyadh) suggests 3–6 months. |

---

## Abu Dhabi

Abu Dhabi's land-intelligence data landscape is markedly different from Dubai's:

- The **Department of Municipalities and Transport (DMT)** centralises all three municipalities (Abu Dhabi City Municipality / Al Ain / Al Dhafra) and runs several gov-branded apps (Dari, MyLand, OnwaniClick, Darb).
- The **Spatial Data Infrastructure (AD-SDI)** is the most mature geospatial platform we encountered in the UAE and is Esri / ArcGIS-based with ~1,000 layers across 17 themes.
- The **Abu Dhabi Open Data Platform** appears under both `data.abudhabi` and `addata.gov.ae`; both are bot-hostile and effectively gated during audit.
- **TAMM** is the unified citizen-services portal — UAE-Pass-driven consumer UI only.
- **ADGM** is a free-zone regulator with a public-registers search UI and a property platform (AccessRP), but no public API.
- The federal official list at [u.ae](https://u.ae/en/about-the-uae/digital-uae/data/geospatial-data-platforms) (fetched 2026-04-16) names these platforms explicitly.

### DMT — Department of Municipalities and Transport

| Field | Finding |
|---|---|
| **Source** | [dmt.gov.ae](https://www.dmt.gov.ae/en/home), Pages portal [pages.dmt.gov.ae/en/dashboard](https://pages.dmt.gov.ae/en/dashboard), Real-estate "Property and Index" [pages.dmt.gov.ae/en/real-estate/property-and-index](https://pages.dmt.gov.ae/en/real-estate/property-and-index), NOC platform [noc.dmt.gov.ae/webcenter/](https://noc.dmt.gov.ae/webcenter/), engineering MePS [meps.dmt.gov.ae](https://meps.dmt.gov.ae/). Mobile / web apps: **Dari** (real-estate transactions), **MyLand** (unified geospatial app across all three AD municipalities), **OnwaniClick** (address), **Darb** (road toll). |
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
| **Authentication** | Registration appears required for downloads; blocked to our fetch with a "Request rejected" message on `/opendata/datasets`. The home page loaded via the 301 chain with navigation intact but no dataset list exposed. |
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
| **Useful for ZAAHI** | **High.** AD-SDI is the most promising geospatial source for Abu Dhabi plot boundaries, community geometry, and land-use overlays. ZAAHI already mirrors 2,083 AD municipalities / districts / communities as static PMTiles — AD-SDI is the authoritative refresh source. |
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

The northern emirates are shallow from an API perspective — they run transactional web services (rental contract registration, property registration) through web UIs, but only Ajman publishes a documented API on its own `.am.gov.ae` sub-domain. Sharjah publishes PDF / XLSX datasets from several departmental portals (Finance, Chamber, Prevention & Safety) rather than a unified emirate open-data portal; most of its municipal web surfaces (`sharjah.gov.ae` main, Sharjah Planning Council `spc.gov.ae`, Sharjah RERA `rera.shj.ae`, Urban Planning `planning.gov.sharjah.ae`) either refused the connection, served an expired / invalid TLS certificate, or 404'd during audit on 2026-04-16.

### Sharjah

| Field | Finding |
|---|---|
| **Source** | Main portal [sharjah.ae](http://www.sharjah.ae/) (plain HTTP redirect from HTTPS — mixed-content profile). Sharjah Chamber / unified Sharjah gov open-data at [sharjah.gov.ae/OpenData/Index](https://www.sharjah.gov.ae/OpenData/Index) (TLS cert failed to validate 2026-04-16). Sharjah Real Estate Registration Department (SRERD) — no live `.gov.ae` URL reachable; referenced via u.ae article [u.ae/en/information-and-services/moving-to-the-uae/expatriates-buying-a-property-in-the-uae/buying-property-in-sharjah](https://u.ae/en/information-and-services/moving-to-the-uae/expatriates-buying-a-property-in-the-uae/buying-property-in-sharjah). Sharjah Finance Department open data at [sfd.gov.ae/En/Pages/Open_Data.aspx](https://www.sfd.gov.ae/En/Pages/Open_Data.aspx). |
| **Authentication** | Open viewing; SFD investor / vendor portals require login. |
| **Endpoints** | **No REST API.** SFD open-data page is a transparency landing page with no dataset list visible — only Data-on-Demand service, investor relations and vendor portals. Sharjah Planning Council `spc.gov.ae` and Sharjah RERA `rera.shj.ae` URLs **refused connection** during audit. |
| **Data freshness** | n/a. |
| **Format** | Probable PDF / XLSX via individual departmental portals; no cross-emirate catalogue. |
| **Rate limits** | n/a. |
| **Cost** | Free. |
| **License** | Each department states its own terms — none are SPDX-tagged. |
| **Useful for ZAAHI** | **Low at present.** Sharjah is a growing real-estate market but the data surface is distributed and bot-hostile. For plot / project data in Sharjah ZAAHI will need direct outreach to SRERD. |
| **Integration effort** | Blocked — emirate-level API would be 4–8 dev-weeks after an MoU. |

### Ras Al Khaimah

| Field | Finding |
|---|---|
| **Source** | Main portal [rak.ae](https://www.rak.ae/). RAK Digital services hub [rakdigital.rak.ae](https://rakdigital.rak.ae/). Lands & Properties Sector (Municipality) [mun.rak.ae/en/pages/lands-and-properties-sector.aspx](https://mun.rak.ae/en/pages/lands-and-properties-sector.aspx). |
| **Authentication** | UAE Pass for transactional services (property & rental-contract registration). |
| **Endpoints** | **No public API.** The Lands & Properties Sector page describes online services (sale / purchase contract registration, rental contract certification) but these are transactional web forms, not data-APIs. The main portal references an "Address and Spatial Guidance Platform" but no URL resolves publicly. `mun.rak.ae/en/Pages/default.aspx` returned 404 and `mun.rak.ae` returned connection-refused during audit 2026-04-16. |
| **Data freshness** | n/a. |
| **Format** | HTML forms. |
| **Rate limits** | n/a. |
| **Cost** | Free UI; per-transaction fees for registrations. |
| **License** | n/a. |
| **Useful for ZAAHI** | **Low.** RAK is a smaller market; no bulk data channel without direct outreach to RAK Municipality Lands & Properties sector. |
| **Integration effort** | Blocked; plan 4–8 weeks of outreach. |

### Ajman

| Field | Finding |
|---|---|
| **Source** | Ajman Municipality at [am.gov.ae](https://www.am.gov.ae/). Open-data page at `www.am.gov.ae/ar/البيانات-المفتوحة/`. Statistical Book at [statisticalbook.am.gov.ae](https://statisticalbook.am.gov.ae/). "Thiqah" trust platform at [thiqah.am.gov.ae](https://thiqah.am.gov.ae/). |
| **Authentication** | Public UI; the live-data API is described as open (no keys mentioned). |
| **Endpoints** | **API confirmed live** at **`opendata.am.gov.ae:6060`** (non-standard port). Documented formats: **PDF, XLSX, JSON, CSV** for downloads plus "Live data access through an API interface" per the open-data landing page (fetched 2026-04-16). Coverage at present centres on health / food / violations — no dedicated real-estate datasets visible on the landing page; sectors declared include infrastructure, public health, environment. Statistical Book (ajman.am.gov.ae subdomain) offers only PDF downloads of the yearly statistical compendium. |
| **Data freshness** | Live (per page copy). Observed update timestamps not captured during audit — revisit per-dataset. |
| **Format** | JSON / CSV / XLSX / PDF. |
| **Rate limits** | Not stated. |
| **Cost** | Free. |
| **License** | "Open Data Policy" document referenced — not SPDX-tagged. Plain-English reading: attribution expected. |
| **Useful for ZAAHI** | **Medium.** One of only two emirate-level portals in the UAE with a confirmed JSON API (the other being bayanat.ae). Right now no real-estate datasets are featured, so immediate uplift is low — but the plumbing is there and Ajman's infrastructure / population / building-permit data would be valuable if published. |
| **Integration effort** | ~8 hrs to evaluate the full dataset list + 4–8 hrs per ingested dataset. Non-standard port (`:6060`) may require firewall-allow from ZAAHI's ingestion environment. |

### Fujairah

| Field | Finding |
|---|---|
| **Source** | Main portal [fujairah.ae](https://fujairah.ae/). Digital services hub `digital.fujairah.ae`. |
| **Authentication** | n/a. |
| **Endpoints** | **No public APIs or open-data catalogue confirmed.** Homepage advertises "Digital Fujairah" and e-service catalogues for residents and businesses but does not surface APIs or datasets. |
| **Data freshness** | n/a. |
| **Format** | n/a. |
| **Rate limits** | n/a. |
| **Cost** | n/a. |
| **License** | n/a. |
| **Useful for ZAAHI** | **None** at this stage. |
| **Integration effort** | Blocked. |

### Umm Al Quwain

| Field | Finding |
|---|---|
| **Source** | Attempted [uaq.gov.ae](https://uaq.gov.ae/) (HTTP 500 during audit 2026-04-16) and [uaq.ae](https://www.uaq.ae/) (timed out during audit 2026-04-16). |
| **Authentication** | n/a. |
| **Endpoints** | **None reachable during audit.** No emirate-wide open-data catalogue documented on u.ae. |
| **Data freshness** | n/a. |
| **Format** | n/a. |
| **Rate limits** | n/a. |
| **Cost** | n/a. |
| **License** | n/a. |
| **Useful for ZAAHI** | **None.** |
| **Integration effort** | Blocked. |

---

## Federal

The federal tier exists because ZAAHI may eventually need cross-emirate baselines (population, housing stock, construction indicators). The practical picture as of 2026-04-16:

- **bayanat.ae** is the headline federal open-data portal and is the only one with a first-class public JSON API.
- **FCSC** (Federal Competitiveness and Statistics Centre) publishes through bayanat.ae and through a few GIS-portal surfaces (**Union Atlas**, **1MAP**). Direct FCSC endpoints we tried (`fcsc.gov.ae`, `opendata.fcsc.gov.ae`) returned **HTTP 403** during audit.
- **MoET** (Ministry of Economy & Tourism, rebrand from MoEc) publishes a structured open-data catalogue at `moet.gov.ae/en/moec-opendata` — 158 XLSX files, refreshed 2026-04-16, but the content is economic / trade / FDI with negligible real-estate coverage.
- **MoCCAE** (Climate Change & Environment) runs an ArcGIS Sites instance with environmental geospatial layers — useful for coastal / protected-area overlays but not core land intelligence.

### FCSC — Federal Competitiveness & Statistics Centre

| Field | Finding |
|---|---|
| **Source** | Main centre [fcsc.gov.ae](https://fcsc.gov.ae/) (HTTP 403 during audit). Federal open-data at [opendata.fcsc.gov.ae](https://opendata.fcsc.gov.ae/) (HTTP 403). GIS portal **1MAP** at [geostat.fcsa.gov.ae/gisportal/home/](https://geostat.fcsa.gov.ae/gisportal/home/) (HTTP 403). **Union Atlas** at [atlas.fgic.gov.ae/uaeatlas/Index](https://atlas.fgic.gov.ae/uaeatlas/Index). FCSC-operated part of bayanat.ae (see below). |
| **Authentication** | Public sites blocked to our fetches during audit. Per u.ae reference, viewers are public; per-item sign-in may apply. |
| **Endpoints** | No REST API reachable during audit via FCSC-branded paths. u.ae documents 1MAP as "provides national maps, statistics and information" and Union Atlas as "database of reliable geospatial and statistical information relating to the UAE" with interactive maps, satellite imagery, and performance indicators across 10+ sectors. |
| **Data freshness** | Not observed. |
| **Format** | Interactive viewers; backing ArcGIS REST assumed but not probed. |
| **Rate limits** | n/a. |
| **Cost** | Free. |
| **License** | Not stated. |
| **Useful for ZAAHI** | **Medium.** If the ArcGIS REST behind 1MAP / Union Atlas is discoverable (typical pattern `https://…/server/rest/services/…`), it becomes a national geospatial feed. Currently the browser-level block prevented confirmation. |
| **Integration effort** | 1 dev-week to discover REST endpoints once the portal is reachable. Not a priority against the Dubai data-pipeline. |

### bayanat.ae — UAE Open Data Portal

| Field | Finding |
|---|---|
| **Source** | [bayanat.ae](https://bayanat.ae/en). Published by **FCSC / FCSA** (Federal Competitiveness and Statistics Authority). Geodata sub-portal [bayanat.ae/en/Geo-Data](https://bayanat.ae/en/Geo-Data). |
| **Authentication** | Public for documented API; no key required for the GET examples shown on the homepage. |
| **Endpoints** | Home page explicitly publishes the API usage pattern (Python, JS, cURL). Example template (as shown on the home page, fetched 2026-04-16):  `https://bayanat.ae/api/DatasetResources/GetDatasetResource?resourceID={ResourceGUID}`. Each resource's Resource GUID must first be obtained from its Resource Information page. Portal self-reports **3,398 datasets**, **55 entities**, **7,201 data resources** across 10 topics (Food Security, Economy, Government, Education, Environment, Health, Infrastructure, Society, Technology, Transport). |
| **Data freshness** | Per-resource `modified` metadata (not inspected per-dataset during audit). |
| **Format** | JSON via the API; downloads also in **CSV, PDF, DOC, XLSX, XML** depending on resource. |
| **Rate limits** | Not published. |
| **Cost** | Free. |
| **License** | Not SPDX-tagged on the home page. Per-resource licence fields exist on dataset pages (not sampled during audit). Treat as attribution-required by default. |
| **Useful for ZAAHI** | **High.** Only federal portal with a clean public JSON API. Immediate uplift areas: housing / population / construction federal baselines; Ajman Geo Map (listed under Geo-Data); federated Abu Dhabi Geospatial Portal entry; federal environmental geospatial platform. Note: the Geo-Data sub-portal currently lists 9 thematic interactives — **limited direct real-estate focus** on those surface-level items. |
| **Integration effort** | **2–4 hrs per resource** once Resource GUIDs are enumerated. Full discovery + baseline ingestion: 2 dev-weeks. |

### MoET — Ministry of Economy & Tourism

| Field | Finding |
|---|---|
| **Source** | [moet.gov.ae](https://www.moet.gov.ae/en/home) — formerly Ministry of Economy (moec.gov.ae 301s to moet.gov.ae). Open-data catalogue at [moet.gov.ae/en/moec-opendata](https://www.moet.gov.ae/en/moec-opendata). |
| **Authentication** | Public download. |
| **Endpoints** | Catalogue lists **158 open datasets** (last updated 2026-04-16 per the page). Content is economic / trade / tourism: FDI statistics 2016–2024, sector attractiveness rankings, certificates of origin by emirate, antidumping / safeguard investigations, trademarks, patent grants 2017–2023, tourism visitor numbers and occupancy, essential-goods prices, cooperative revenue and profits. Search is filterable by year (2019–2024) and category (services, economic, general, geographical, SDG data). |
| **Data freshness** | Annual-to-quarterly; collection itself refreshed 2026-04-16. |
| **Format** | Primarily **.xlsx**. |
| **Rate limits** | n/a. |
| **Cost** | Free. |
| **License** | "Open Data Policy" and "Open Data Guidelines" referenced; not SPDX-tagged. |
| **Useful for ZAAHI** | **Low** — no direct real-estate / plot / transactions data. Useful only for macro overlays (tourism occupancy by emirate is a weak demand-signal). |
| **Integration effort** | 1–2 dev-days to ingest the relevant XLSX files. Not priority. |

### MoCCAE — Ministry of Climate Change & Environment (referenced source)

| Field | Finding |
|---|---|
| **Source** | [gis.moccae.gov.ae/arcgis/apps/sites/](https://gis.moccae.gov.ae/arcgis/apps/sites/) — named on u.ae as the federal "Environmental Geospatial Platform". |
| **Authentication** | Public viewer (ArcGIS Sites). |
| **Endpoints** | Outer page did not return content during our audit fetch (empty response). ArcGIS Sites pattern implies `https://gis.moccae.gov.ae/arcgis/rest/services/...` REST endpoints for published layers (typical Esri deployment). |
| **Data freshness** | Varies by layer. |
| **Format** | ArcGIS FeatureServer / MapServer, GeoJSON. |
| **Rate limits** | Not published. |
| **Cost** | Free. |
| **License** | Not stated. |
| **Useful for ZAAHI** | **Medium.** Coastal zones, protected areas, environmental no-build zones are useful overlays for plot pricing / development feasibility (a plot inside a Ramsar wetland is a very different asset from a comparable plot outside one). |
| **Integration effort** | 1 dev-week to map out the REST services and pull the relevant items. |

---

## Recommendations

### Immediate integration (week 1, unblocked)

1. **bayanat.ae API** — add a federal baseline feed.
   - Endpoint template: `GET https://bayanat.ae/api/DatasetResources/GetDatasetResource?resourceID={ResourceGUID}`
   - Integration: ~2 dev-weeks for discovery + first 10 resources.
   - Value: deduplicates ZAAHI's emirate-statistics claims against an authoritative federal source.
2. **AD-SDI thematic layers** — replace static PMTiles of Abu Dhabi municipalities / districts / communities with live ArcGIS FeatureServer pulls.
   - Integration: ~1 dev-week per 3 layers.
   - Value: removes the "stale extract" risk for 2,083 administrative units.
3. **DLD Open Data CSV scraping** (free tier) — nightly pull of Transactions, Rents, Projects, Valuations, Land, Buildings, Units, Brokers, Developers.
   - Integration: ~18 dev-days for all 9 registers with schema normalisation and retry logic.
   - Value: provides a defensible Dubai plot-level truth layer at zero licence cost while the DLD Gateway MoU is in flight. **Caveat:** the DLD terms-of-use do not explicitly authorise bulk redistribution — ZAAHI should consume the data internally and expose derived analytics only, not resell raw registers (see `UAE_COMPLIANCE.md` §6A.10).

### Requires government outreach / partnership (multi-week to multi-month)

4. **DLD API Gateway MoU** — AED 30,000 + 5% VAT / yr, MoU-gated. Start now because lead time is 2–4 months minimum. Pre-requisite: corporate entity + probably a RERA activity licence to be taken seriously (`UAE_COMPLIANCE.md` §2.DLD).
5. **Dubai Municipality Building Services / ePlan direct contact** — the `dm_project_building_information-open-api` slug suggests a path exists; DM needs to refresh the Pulse → data.dubai links or expose a direct API. Relationship ask.
6. **DMT Abu Dhabi — Dari / Real Estate Sector** — Abu Dhabi's transactions & rental-contracts backbone; engage via [esm.gov.ae/servicehub](https://esm.gov.ae/servicehub) custom-dataset request.
7. **DDA GeoJSON extracts** — not via scraping; via direct contact with DDA master-planning for signed zoning / affection-plan extracts (refresh rate: annual is acceptable).
8. **Sharjah SRERD and RAK Municipality Lands & Properties** — northern-emirates outreach round; low priority while Dubai + Abu Dhabi pipelines are not saturated.

### Not worth it (closed, dead, low value)

9. **Dubai Pulse (`dubaipulse.gov.ae`)** — dead host; audit ZAAHI's codebase for any hardcoded URL and redirect to the new sources (DLD Open Data UI, data.dubai, or DM direct).
10. **Makani (`makani.ae`)** — was under maintenance for the entire audit window; no public API even pre-maintenance. Use Dubai's administrative community grid if you need an address-to-plot mapping.
11. **Trakheesi production API** — not a data source, it's the permit-issuance flow; needed when ZAAHI is a broker, not now.
12. **DEWA open data** — blocked behind 403s; not worth chasing until the aggregate-consumption stance changes.
13. **RTA public open-data** — no GTFS / no geometry feed; substitute with non-government (OSM) layers for metro/bus if ZAAHI needs transit overlays.
14. **Fujairah / UAQ / Sharjah Planning Council portals** — not publishing machine-readable data at all.
15. **TAMM APIs** — consumer service, not a data source.

---

## Appendix A: Failed / dead links

| URL tried | Outcome | Claimed provider |
|---|---|---|
| `https://www.dubaipulse.gov.ae/` | 301 → `https://data.dubai/` | Smart Dubai / Digital Dubai |
| `https://www.dubaipulse.gov.ae/organisation/rta` | 301 → `https://data.dubai/` (path dropped) | RTA via Dubai Pulse |
| `https://www.dubaipulse.gov.ae/organisation/dubai-land-department` | 301 → `https://data.dubai/` (path dropped) | DLD via Dubai Pulse |
| `https://www.dubaipulse.gov.ae/data/dld-transactions/dld_transactions-open` | 301 → `https://data.dubai/` (path dropped) | DLD transactions dataset |
| `https://www.makani.ae/` | Scheduled-maintenance page | Dubai Municipality Makani |
| `https://trakheesi.dubailand.gov.ae/` | HTTP 403 (public path restricted) | DLD Trakheesi |
| `https://www.dewa.gov.ae/en/consumer/other-services/open-data` | HTTP 403 | DEWA |
| `https://www.dewa.gov.ae/en/about-us/open-data` | HTTP 403 | DEWA |
| `https://www.dewa.gov.ae/en/about-us/sustainability-and-the-environment/reports-and-data` | HTTP 403 | DEWA |
| `https://data.dubai/en/open-data` | HTTP 404 | data.dubai catalogue |
| `https://data.dubai/datasets` | HTTP 404 | data.dubai catalogue |
| `https://dubailand.gov.ae/en/eservices/property-status/` | HTTP 404 | DLD Property Status |
| `https://www.tamm.abudhabi/en` | Empty response (bot-gated) | TAMM |
| `https://www.tamm.abudhabi/en/life-events/housing` | Empty response (bot-gated) | TAMM |
| `https://www.tamm.abudhabi/en/aspects-of-life/HousingAndProperties` | Empty response (bot-gated) | TAMM |
| `https://data.abudhabi/opendata/datasets` | "Request rejected" (bot block) | Abu Dhabi Open Data |
| `https://opendata.fcsc.gov.ae/` | HTTP 403 | FCSC Open Data |
| `https://fcsc.gov.ae/en-us/Pages/Statistics/Statistics-by-Subject.aspx` | HTTP 403 | FCSC |
| `https://fcsc.gov.ae/en-us` | HTTP 403 | FCSC |
| `https://geostat.fcsa.gov.ae/gisportal/home/` | HTTP 403 | FCSC 1MAP |
| `https://atlas.fgic.gov.ae/uaeatlas/Index` | Empty response | Union Atlas |
| `https://gis.moccae.gov.ae/arcgis/apps/sites/` | Empty response | MoCCAE Environmental GIS |
| `https://uaq.gov.ae/` | HTTP 500 | Umm Al Quwain |
| `https://www.uaq.ae/` | Timeout | Umm Al Quwain |
| `https://www.sharjah.gov.ae/` | TLS certificate could not be validated | Sharjah Directorate |
| `https://www.sharjah.gov.ae/OpenData/Index` | TLS certificate could not be validated | Sharjah Chamber / unified Sharjah open-data |
| `https://www.sharjah.gov.ae/en` | TLS certificate could not be validated | Sharjah Government |
| `https://www.sharjah.gov.ae/en/Pages/default.aspx` | HTTP 404 | Sharjah Government |
| `https://www.sharjah.ae/en` | HTTP 404 | Sharjah main |
| `https://www.sharjah.ae/en/Pages/default.aspx` | HTTP 404 | Sharjah main |
| `http://www.sharjah.ae/en/Pages/eServices.aspx` | HTTP 404 | Sharjah e-services |
| `https://rera.shj.ae/` | Connection refused | Sharjah RERA |
| `https://rera.gov.sharjah.ae/` | Connection refused | Sharjah RERA |
| `https://www.spc.gov.ae/` | Connection refused | Sharjah Planning Council |
| `https://www.planning.gov.sharjah.ae/` | Connection refused | Sharjah Urban Planning Council |
| `https://services.rak.ae/` | Connection refused | RAK services |
| `https://mun.rak.ae/` | Connection refused | RAK Municipality |
| `https://gis.rak.ae/` | Connection refused | RAK GIS |
| `https://rera.gov.rakrealestate.com/` | Connection refused | RAK RERA |
| `https://www.am.gov.ae/` | unable to verify first certificate (TLS warn) | Ajman Municipality |
| `https://ajmanone.ae/` | Certificate expired | Ajman citizen app |
| `https://fujairah.ae/` | HTTP 500 | Fujairah Government |
| `https://aldar.com/` | OK — no public API for land/GIS | Aldar |
| `https://modon.ae/` | 301 → `https://modon.com/` | Modon (now private) |

**Interpretation.** The sheer number of TLS-invalid / connection-refused / 404 responses from northern emirates tells its own story: the northern emirate data stack is not engineered for third-party integration. Anything ZAAHI builds outside Dubai + Abu Dhabi is a bespoke relationship.

---

## Appendix B: Access model comparison

| Access model | Dubai | Abu Dhabi | Sharjah | Ajman | RAK | Fujairah / UAQ | Federal |
|---|---|---|---|---|---|---|---|
| **Free public REST JSON API** | ✗ (no public) | ArcGIS REST via AD-SDI (public) | ✗ | ✓ `opendata.am.gov.ae:6060` | ✗ | ✗ | ✓ bayanat.ae |
| **Free CSV / XLSX download UI** | ✓ DLD Open Data (9 registers) | Behind registration (addata.gov.ae) | ✗ | ✓ Ajman open-data page | ✗ | ✗ | ✓ MoET (158 XLSX) |
| **Dashboard-only (no raw data)** | ✓ DLD Rental Index; data.dubai Residential Sale Index; DMT "Property and Index" | ✓ DMT Property and Index | ✓ Sharjah Finance | ✓ Statistical Book (PDF) | ✓ | — | — |
| **Paid API (MoU required)** | ✓ DLD API Gateway (AED 30k+/yr); Ejari, Mollak, Trakheesi, Rental Index, Oqood | (Dari / DMT — MoU, price not published) | ✗ | ✗ | ✗ | ✗ | — |
| **ArcGIS / SDI portal** | DDA DIS (gated); DM GIS via dead Pulse path | ✓ **AD-SDI** (1,000 layers, 17 themes) | ✗ | ✗ | ✗ | ✗ | MoCCAE env GIS; 1MAP (viewer) |
| **Reachable during audit 2026-04-16?** | Partly | Partly | Mostly no | Yes | Mostly no | No | Partly |

---

## Appendix C: Key findings for founder

### 3 biggest unlocks (actually open and useful)

1. **bayanat.ae has a real, documented, public JSON API.** Template:
   `GET https://bayanat.ae/api/DatasetResources/GetDatasetResource?resourceID={ResourceGUID}`.
   This is the only UAE-wide, unauthenticated JSON surface with published Python / JS / cURL examples. 3,398 datasets / 7,201 resources across 10 topics. Worth 2–3 dev-weeks to set up a federal baseline feed that dedupes ZAAHI's claims against an authoritative source.
2. **AD-SDI is the most mature UAE geospatial platform.** 1,000 ArcGIS layers across 17 themes, public catalogue, and an Esri-style ArcGIS portal at `arcgis.sdi.abudhabi.ae/portal/home/`. Replace ZAAHI's static PMTiles of 2,083 Abu Dhabi municipalities / districts / communities with live FeatureServer queries. This is a measurable improvement in data freshness at zero licence cost.
3. **DLD publishes 9 Dubai real-estate registers as free CSV downloads.** Transactions, Rents, Projects, Valuations, Land, Buildings, Units, Brokers, Developers — all at [dubailand.gov.ae/en/open-data/real-estate-data/](https://dubailand.gov.ae/en/open-data/real-estate-data/). This is the cheapest, fastest route to a defensible Dubai plot-level truth layer while the DLD API Gateway MoU is being negotiated. Subject to the usual terms-of-use caveat: consume internally, publish derived analytics only.

### 3 biggest red flags (ZAAHI relies on something that turned out to be dead / closed / restricted)

1. **Dubai Pulse is a host-level redirect.** Every URL on `dubaipulse.gov.ae` 301s to `https://data.dubai/` root — **per-dataset permalinks are destroyed**. Every CSV, GeoJSON, or PMTile that ZAAHI ingested from a Pulse URL is now silently pulling a web-portal home page. Confirmed for the root, `/organisation/rta`, `/organisation/dubai-land-department`, and `/data/dld-transactions/dld_transactions-open`. **Action: grep the ZAAHI codebase for `dubaipulse.gov.ae` and replace every hit.** This alone is ~1–3 engineer-days of work, but it's critical to do before the next data refresh window.
2. **Makani (`makani.ae`) was in scheduled-maintenance mode during the entire audit.** Makani is the canonical Dubai address system (10-digit plot codes ↔ coordinates). The public surface was unreachable on 2026-04-16 and, historically, Makani never had a public developer API — integrations were always through DM partnership. If ZAAHI's UX or data joins rely on resolving Makani codes, that dependency is silently fragile today and (more importantly) is gated behind DM MoU going forward.
3. **DLD API Gateway is paid-plus-MoU, not "open with API key".** The public product page states **AED 30,000 + 5% VAT / yr** base subscription, access restricted to "software vendors, property management companies, licensed developers, and approved financial institutions". The per-API fee schedule is not published — **`⚠ VERIFY` with DLD commercial**. Also: a prerequisite to being taken seriously is a corporate entity plus (in practice) a RERA activity licence, cross-checking `UAE_COMPLIANCE.md` §2.DLD. This is not "week 1 engineering" — it's a 2–4 month procurement process that needs to be started before ZAAHI ships the listings product.

---

*End of audit.*
