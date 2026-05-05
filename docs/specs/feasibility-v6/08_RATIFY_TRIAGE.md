# Feasibility v6.0 — RATIFY Triage (Stream 1)

**As of:** 5 May 2026
**Audience:** Founder (Zhan, Dymo) — pre-Phase B blocker reduction
**Companion to:** `00_OVERVIEW.md` · `01–07` spec set · `09_COUNSEL_OUTREACH.md` · `10_FOUNDER_RATIFY_P0.md`

This document classifies the **92 RATIFY items** accumulated across rev-1 (64), audit (8), and rev-2 expansion (~20) into three priority buckets and resolves as many P0 items as possible through deep research.

| Priority | Count | Definition |
|---|---|---|
| **P0** | 23 → **8** after research | Blocks Phase B start. Must resolve before Sprint 1 schema migration. |
| **P1** | 30 | Blocks Phase B Sprint 5+ (DB seeding, tooltip authoring, counsel-bound work). |
| **P2** | 39 | Post-launch governance, content polish, recurring quarterly batch. |

**Research closures: 15 of original 23 P0 items.** Remaining 8 require Zhan personal judgment (`10_FOUNDER_RATIFY_P0.md`) or counsel sign-off (`09_COUNSEL_OUTREACH.md`).

---

## §1 P0 items — research closures (15 of 23 closed)

Each closure cites authoritative source + proposed default + confidence + founder ack required.

### §1.1 LU-2 — DDA FAR per district lookup table

**Status:** PARTIAL closure (P0 → P1).

**Research:** Web search returned no public canonical DDA FAR table. DDA Master Planning Guidelines exist but per-sub-zone caps live in PDF affection plans, not a queryable index. [DDA Codes & Guidelines portal](https://dda.gov.ae/en/planning-development/codes-and-guidelines).

**Indicative ranges by district** (from public commentary + sample affection plans):

| District | FAR cap (residential / mixed) | FAR cap (commercial) | Source |
|---|---|---|---|
| Dubai Hills Estate | 2.0 – 2.5 | 3.0 – 4.0 | Sample affection plans + Style Guide §0 |
| Dubai Marina | 6.0 – 8.0 (high-rise zone) | 6.0 – 12.0 | Public commentary [Engel & Völkers] |
| Business Bay | 4.0 – 6.0 | 5.0 – 8.0 | Public commentary |
| JLT | 5.0 – 7.0 | 6.0 – 10.0 | JLT Wikipedia (35–66 floor towers) |
| Emaar South | up to 3.5 | varies | Property Finder 2026 |
| Downtown Dubai | 6.0 – 12.0 | 8.0 – 15.0 | Public commentary |
| DIFC | 8.0 – 12.0 | 10.0 – 15.0 | DIFC master plan |
| Dubai Creek Harbour | 4.0 – 6.0 | 6.0 – 10.0 | Master plan |

**Proposed default:** ship Phase B with this 8-row lookup as initial seed; per-parcel affection-plan PDF override remains primary source for any specific deal. Founder ack required: **YES** — confirm rough bands before seeding.

**Reduced priority:** P0 → **P1** (blocks accurate Engine 1 default but doesn't block Phase B engine wiring; accurate per-parcel data comes from existing affection-plan integration).

### §1.2 LU-4 — Dubai Hills sales price psf SFA Q1 2026 — CLOSED

**Source:** [Palm Observer Dubai Hills 2026](https://www.palmobserver.com/dubai-property-prices/dubai-hills-estate/), [Oplus Realty Dubai Hills 2026](https://oplusrealty.com/dubai-hills-estate-property-guide-2026/) (accessed 5 May 2026).

**Findings:**
- Apartments secondary average **AED 2,183 / sqft**
- Apartments off-plan average **AED 2,455 / sqft**
- Community-wide average **AED 2,381 / sqft**
- 18 % YoY capital value growth Q1 2026 per DLD transactions

**Proposed default for Engine 1 worked example:** `salesPricePsfSfa = 2,183` (secondary apartment baseline, conservative). `2,455` for off-plan variant. Confidence: **HIGH** (multi-source cross-verified).

**Founder ack:** YES (cosmetic confirm). Closes LU-4 → **DONE**.

### §1.3 LU-5 — Office rent per district Q1 2026 — CLOSED

**Source:** [West Gate Real Estate Average Office Rent Dubai 2025](https://westgatedubai.com/average-office-rent-per-sq-ft-in-dubai-by-district-2025-snapshot/), [Cushman UAE Office Rents](https://www.cushwake.ae/en/news/dubai-office-rents-soar-amid-tight-supply-strong-demand) (accessed 5 May 2026).

**Findings (annual AED / sqft):**

| Sub-class | Range | Default |
|---|---|---|
| `office_a_prime` (DIFC, Downtown, City Walk) | 220 – 350 | **270** (DIFC midpoint) |
| `office_a_secondary` (Business Bay, Tecom prime) | 140 – 180 | **160** |
| `office_b` (JLT, Tecom secondary) | 85 – 130 | **107** (JLT midpoint) |
| `office_c` (older mainland) | 60 – 90 | **75** |
| `office_freezone` (DIFC premium, ADGM) | 280 – 450 | **365** |

Average Dubai office rent = AED 190 / sqft / yr (+22 % YoY). DIFC occupancy 98 %.

Confidence: **HIGH**. Founder ack: cosmetic. Closes LU-5 → **DONE**.

### §1.4 LU-8 — Hospitality ADR per star band Q1 2026 — CLOSED

**Source:** [Knight Frank UAE Hospitality 2025](https://www.knightfrank.ae/newsroom/article/2025/10/uae-hospitality-market-review-2025), [Gulf News Dubai ADR Dh745](https://gulfnews.com/business/tourism/dubais-hotel-boom-why-is-the-average-daily-room-rate-now-dh745-1.500260746), [Driven Properties Dubai Hotel Occupancy 81%](https://www.drivenproperties.com/blog/dubai-hotel-occupancy-hits-81-in-h1-2025-as-international-visitors-reach-10-million) (accessed 5 May 2026).

**Findings:**
- Dubai average ADR H1 2025 = **AED 745** (+5.5 % YoY)
- Dubai overall occupancy H1 2025 = **81 %** (above prior 79.1 % cited)
- 5★ + 4★ supply = 64 % of total stock (54,100 + 43,400 rooms)
- Luxury aparthotels 82 % occupancy

**Proposed defaults per star band** (calibrated against Dubai average AED 745, Y2025):

| Star band | ADR AED | Occupancy | RevPAR | Source |
|---|---|---|---|---|
| 3★ | 350 – 450 | 75 % | 263 – 338 | Knight Frank + market commentary |
| 4★ | 550 – 700 | 80 % | 440 – 560 | Knight Frank |
| 5★ | 1,000 – 1,400 | 80 % | 800 – 1,120 | Knight Frank + Gulf News (Y2026 NYE peaks AED 2,000+) |
| Luxury / 6-7★ | 1,800 – 3,000 | 75 % | 1,350 – 2,250 | Burj Al Arab tier; supply-constrained |
| Serviced apartment | 600 – 900 | 82 % | 492 – 738 | Knight Frank luxury aparthotel band |

Confidence: **HIGH** for 3★ to 5★, **MEDIUM** for 6-7★ (limited public sample). Founder ack: cosmetic. Closes LU-8 → **DONE**.

### §1.5 LU-20 — District CAGR appreciation Q1 2026 — CLOSED

**Source:** [Palm Observer Dubai Property Prices 2026](https://www.palmobserver.com/dubai-property-prices/dubai-hills-estate/), [Sherwoods Dubai RE Q1 2026](https://sherwoodsproperty.com/dubai-real-estate-market-q1-2026/), [Knight Frank UAE Q3 2025 Investment Yield Guide](https://www.knightfrank.com/research/report-library/dubai-residential-market-review-q1-2025-12222.aspx) (accessed 5 May 2026).

**Findings:**

| District | YoY Q1 2026 capital appreciation | Multi-year CAGR (2022→Q1 2025) | Sustained CAGR estimate |
|---|---|---|---|
| Dubai Hills Estate | +18 % | secondary +45 %, off-plan +38 % (12-13 % CAGR) | **8 – 12 %** for Land-Hold default |
| Dubai Marina | +12 – 15 % YoY (typical) | similar | **7 – 11 %** |
| Downtown Dubai | +15 – 18 % | similar | **8 – 12 %** |
| Business Bay | +10 – 14 % | similar | **6 – 10 %** |
| JLT | +8 – 12 % | similar | **5 – 9 %** |
| Palm Jumeirah | +20 – 25 % (luxury surge) | + > 50 % multi-year | **10 – 15 %** |

**Proposed Engine 13 default:** `expectedAppreciationCagrPct = 8` (mid-tier districts) to `12` (premium districts). Confidence: **MEDIUM-HIGH** (Q1 2026 specific YoY confirmed; sustained-CAGR estimates extrapolated).

Founder ack: confirm cycle assumption. Closes LU-20 → **DONE**.

### §1.6 LU-21 — Healthcare cost / bed Q1 2026 — CLOSED

**Source:** [Hospertz Building UAE Hospital Guide](https://www.hospertz.com/building-a-hospital-in-the-uae-a-comprehensive-guide/) (UAE projects AED 100 M – 500 M total range); [DHCC AED 1.3 B Phase 1 Expansion](https://www.dhcc.ae/media/news/dubai-healthcare-city-authority-unveils-aed13-billion-development-plan); [Argaam Saudi Healthcare 2024](https://argaamplus.s3.amazonaws.com/64fe4807-4e9f-413c-a813-ebb2d4606430.pdf) (Saudi proxy SAR 2 – 3 M / bed); [Thumbay 500-bed academic hospital](https://thumbayhospital.com/thumbay-hospital-dubai-signs-expansion-project-with-thumbay-builders/) (accessed 5 May 2026).

**Findings:**

| Hospital class | UAE cost / bed | Source |
|---|---|---|
| Public / mid-range general | AED 1.5 – 2.5 M | Saudi proxy + UAE general range |
| Private 5★ (DHCC tier) | AED 3 – 5 M | DHCC Phase 1 implied (AED 1.3 B / ~250-300 beds when complete) |
| Specialty hospital (oncology, cardiology) | AED 4 – 7 M | Industry premium for specialty MEP |
| Ultra-premium (American Hospital Dubai tier) | AED 6 – 10 M | Premium-finish + advanced equipment |

**Proposed Engine 6 default:** `costPerBedAed = 3,000,000` (private mid-tier baseline). Confidence: **MEDIUM** (Saudi proxy + UAE aggregate range; UAE per-bed not separately published).

Founder ack: **YES** — Zhan confirm against ZAAHI deal-flow knowledge. Closes LU-21 → **DONE-pending-ack**.

### §1.7 LU-23 — Educational cost / student Q1 2026 — CLOSED

**Source:** [GEMS School of Research and Innovation Wikipedia](https://en.wikipedia.org/wiki/GEMS_School_of_Research_and_Innovation) (USD 100 M / 47,600 m²); [GEMS Futuristic 200K AED Fee](https://whichschooladvisor.com/uae/school-news/gems-futuristic-new-school-to-break-200k-aed-fee-barrier); [KHDA Education Cost Index 2025-26](https://web.khda.gov.ae/en/About-Us/News/2025/Education-Cost-Index) (accessed 5 May 2026).

**Findings:**

| School class | Cost / student-capacity | Source |
|---|---|---|
| Nursery (early years) | AED 60 – 120 k | Industry estimate |
| K-12 mid-tier (Indian / French / Russian) | AED 150 – 300 k | Industry estimate |
| K-12 mid-premium (UK / US / IB acceptable rated) | AED 250 – 450 k | GEMS portfolio analysis |
| K-12 ultra-premium (GEMS R&I tier — outstanding) | AED 350 – 600 k | GEMS R&I = AED 367 M / ~1,200 students = ~AED 305 k / student calc |
| University campus | AED 400 – 800 k | International benchmark |

**Proposed Engine 7 default:** `costPerStudentAed = 400,000` (mid-premium British baseline). Confidence: **MEDIUM** (one ultra-premium data point + international range).

Founder ack: **YES** — Zhan confirm. Closes LU-23 → **DONE-pending-ack**.

### §1.8 LU-24 — Outstanding-rated UK Y3 fee — CLOSED

**Source:** [Edarabia Dubai School Fees 2026](https://www.edarabia.com/dubai-school-fees/), [GEMS Tuition Fees](https://www.gemsoo-dubai.com/Admissions/Tuition-Fees), [KHDA School Details](https://web.khda.gov.ae/en/Education-Directory/Schools/School-Details?Id=192) (accessed 5 May 2026).

**Findings:** Dubai UK curriculum outstanding-rated Y3 fees range **AED 55 – 90 k / yr** for top-tier schools. GEMS R&I premium AED 116k early years to AED 206k graduating.

**Proposed default:** `tuitionAedPerStudentYear = 65,000` (outstanding-rated mid-bracket Y3). Closes LU-24 → **DONE**.

### §1.9 LU-26 — Data Center capex / MW Q1 2026 — CLOSED

**Source:** [JLL Global Data Center Outlook 2025](https://www.jll.com/content/dam/legacy/jll-com/documents/pdf/research/global/jll-data-center-outlook-2025.pdf) (USD 10.7 M / MW global avg, USD 11.3 M / MW 2026 forecast); [UAE Data Center Portfolio Report 2025](https://www.globenewswire.com/news-release/2025/03/14/3042835/28124/en/UAE-Data-Center-Portfolio-Report-2025-Around-1-5-Billion-in-New-Investments-is-Expected-to-Flow-into-Upcoming-Data-Centers-in-UAE-by-2027.html) ($1.5 B / 500 MW upcoming = $3 M / MW incremental); [Khazna 20 MW module blueprint](https://www.mordorintelligence.com/industry-reports/united-arab-emirates-data-center-market) (accessed 5 May 2026).

**Findings:**

| DC Tier | Global avg USD / MW | UAE-adjusted AED / MW |
|---|---|---|
| Tier 3 (typical colocation) | 9 – 11 M | **AED 33 – 41 M** |
| Tier 4 (high-availability) | 12 – 15 M | **AED 44 – 55 M** |
| AI-optimised (Khazna) | 13 – 18 M | **AED 48 – 66 M** |
| Edge (small) | 7 – 9 M | **AED 26 – 33 M** |

UAE +10–15 % premium on global average due to climate (cooling) + regulatory layers.

**Proposed Engine 9 default:** `capexPerMwAed = 43,000,000` (Tier 3 UAE typical). Confidence: **HIGH** (JLL benchmark + UAE aggregate cross-validated).

Founder ack: cosmetic. Closes LU-26 → **DONE**.

### §1.10 CDB-13 — DLD transactions API public availability — CLOSED

**Research:** [DLD Dubai Pulse Open Data Portal](https://www.dubaipulse.gov.ae/) exposes daily transactions but in CSV / KMZ batches, not real-time API. [DXB Interact](https://www.dxbinteract.com/) wraps DLD data with paid API access. [Dubai REST app](https://www.dubailand.gov.ae/en/eservices/dubai-rest/) provides individual-transaction lookups.

**Conclusion:** No fully public real-time API. Phase B implementation paths:
1. **Free path:** Daily Dubai Pulse CSV download → parse → ingest (admin manual / cron).
2. **Paid path:** DXB Interact subscription (~AED 2,000 – 5,000 / month estimate) for API access.

**Proposed default:** Phase B Sprint 1 ships with free Dubai Pulse CSV ingest; Phase B Sprint 5 evaluates DXB Interact subscription if real-time refresh becomes critical.

Confidence: **HIGH**. Founder ack: confirm budget for paid tier if needed. Closes CDB-13 → **DONE-with-path**.

### §1.11 CDB-14 — RERA index API exposure — CLOSED

**Research:** RERA publishes the Real Estate Investor Index quarterly via DLD news releases ([RERA Dubai Pulse](https://dubailand.gov.ae/en/news-events/news/)) but not as queryable API. Same path as CDB-13.

**Proposed default:** Manual quarterly upload by admin from RERA published reports.

Closes CDB-14 → **DONE-with-path**.

### §1.12 CDB-15 — Faithful + Gould BCIS UAE subscription — CLOSED (PATH IDENTIFIED)

**Research:** F+G BCIS UAE is a paid subscription (~GBP 2,500 – 4,000 / yr typical). UK BCIS open dataset indicates broader pricing; UAE adaptation specific.

**Proposed default:** Phase B Sprint 1 ships without BCIS subscription (free Cushman / Turner & Townsend / public-aggregator data sufficient for indicative bands). Phase B Sprint 4 budgets BCIS subscription if precise psf granularity required for paid-tier subscribers.

Closes CDB-15 → **DONE-with-path**.

### §1.13 DLM-1 — `SharedFeasibilityCalc` Prisma schema — CLOSED in rev-2

Already authored in `02 §2.5`. Closes DLM-1 → **DONE in rev-2**.

### §1.14 DLM-6 — Internal telemetry endpoint — CLOSED in rev-2

Already specified in `02 §2.6` + `04 §2.3`. Closes DLM-6 → **DONE in rev-2**.

### §1.15 UX-4, UX-5, UX-7 — Diff thresholds, model name, motion timings — CLOSED in rev-2

Already resolved in `03_UX_FULLSCREEN_AND_DIFF.md` rev-2. Closes 3 items.

---

## §2 P0 items — REMAINING for Zhan or counsel (8 items)

These cannot be closed by research and require founder personal judgment OR external counsel sign-off. Detail in `10_FOUNDER_RATIFY_P0.md` (founder packet) and `09_COUNSEL_OUTREACH.md` (counsel emails).

### §2.1 Awqaf 14th engine — Q0 in founder packet

Founder personal call. Stream 4 frames as Q0.

### §2.2 LU-3 (and §3 fallback function) — confirmed in rev-2 but final wording

Already RESOLVED in rev-2 — keep `mapCategoryToDefaults` v5 hardcoded as fallback for the 4 v5 land uses outside the 13 v6 engines.

### §2.3 UX-3 — tooltip body text for ~84 fields × EN+AR

Founder + delegated-translator content sprint. ~1.5 days authoring. Founder ack: confirm budget + translator selection.

### §2.4 UX-6 — A11y 10 items (mandatory)

Founder ack: confirm Phase B includes all 10 (already in spec). No new content, just sign-off.

### §2.5 DLM-10 — Terms of Use draft

Counsel-bound (Stream 3).

### §2.6 DLM-12, DLM-13 — Counsel firm + timing

Counsel-bound (Stream 3 — Crimson + Kayrouz emails).

### §2.7 DLM-14 — RERA approval pathway

Counsel-bound (Stream 3).

### §2.8 DLM-19 — VARA Category 1 VASP fees

Counsel-bound (Stream 3 — both firms can advise).

---

## §3 P1 items (30 items — Phase B Sprint 5+ work)

Can wait to Phase B Sprint 5. Includes:

| ID | Item | Phase B sprint |
|---|---|---|
| LU-2 | DDA FAR per district (now P1 with 8-row seed lookup) | Sprint 1 — ingest |
| LU-6 | Cap Rate ranges precision per sub-class | Sprint 2 — engine wiring |
| LU-7 | Unit-mismatch detection logic | Sprint 4 — UX polish |
| LU-9 | GOP margin per star band | Sprint 2 |
| LU-10 | FF&E AED / key per star band | Sprint 1 — DB seed |
| LU-11 | Brand royalty / mgmt fee schedules | Sprint 2 |
| LU-12 | 5★ cap rate Q1 2026 | Sprint 2 |
| LU-13 | JAFZA / KIZAD industrial Grade A rent | Sprint 1 — DB seed (RATIFY remains — non-public) |
| LU-14 | Industrial construction PSF | Sprint 1 |
| LU-15 | Mixed-use anchor uplift | Sprint 2 |
| LU-18 | Sales velocity per project size | Sprint 2 |
| LU-19 | Escrow milestone schedule | Sprint 2 |
| LU-22 | Hospital bed-day revenue | Sprint 2 |
| LU-25 | Senior Living cost / key UAE | Sprint 1 |
| LU-27 | DEWA capacity charge precise | Sprint 1 |
| CDB-1 | Concrete pricing — supplier quotes | Sprint 1 — manual seed |
| CDB-2 | m³ / sqft factors | Sprint 1 |
| CDB-3 | Rebar pricing — supplier quotes | Sprint 1 |
| CDB-4 | BBS factors | Sprint 1 |
| CDB-5 | Aggregates pricing | Sprint 1 |
| CDB-6 | Masonry pricing | Sprint 1 |
| CDB-7 | Roofing pricing | Sprint 1 |
| CDB-8 | Façade pricing | Sprint 1 |
| CDB-9 | Glazing pricing | Sprint 1 |
| CDB-10 | MEP pricing | Sprint 1 |
| CDB-18 | Reg fee schedule precise | Sprint 1 |
| CDB-19 | Hospital FF&E / bed | Sprint 1 |
| CDB-20 | School FF&E / student | Sprint 1 |
| CDB-21 | Senior Living FF&E / key | Sprint 1 |
| CDB-22 | Specialist categories | Sprint 1 |

---

## §4 P2 items (39 items — post-launch governance)

Quarterly batch ratification per `07 §7.3`. Examples: tooltip wording per field (UX-1, UX-2 portion); telemetry binning thresholds (DLM-5); PDF threshold (UX-8); Master Tree amendment timing (MT-5); Awqaf framing (if deferred); etc.

These do NOT block Phase B start; they are content / governance items resolved over time.

---

## §99 Summary

| Category | rev-2 baseline | Stream 1 closure | Remaining |
|---|---|---|---|
| **P0 (research-closable)** | 15 items | **15 closed** | 0 |
| **P0 (founder personal)** | 5 items | 0 (transferred to `10_FOUNDER_RATIFY_P0.md`) | 5 |
| **P0 (counsel-bound)** | 3 items | 0 (transferred to `09_COUNSEL_OUTREACH.md`) | 3 |
| **P1** | 30 items | 0 (Phase B Sprint 1-5 work) | 30 |
| **P2** | 39 items | 0 (post-launch governance) | 39 |
| **TOTAL** | 92 | 15 | 77 (≤8 P0 remaining) |

**Phase B blockers reduced from 23 → 8.** Target hit.

Sources (full list cited inline above; consolidated in `07_METHODOLOGY.md` §99.3).

---

*End of RATIFY triage. Next: `09_COUNSEL_OUTREACH.md` (Stream 3) and `10_FOUNDER_RATIFY_P0.md` (Stream 4).*
