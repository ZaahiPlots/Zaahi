# Transactions data — LAND × DDA discovery

**Audience:** ZAAHI founders (Zhan + Dymo)
**Branch:** `feature/dubai-open-data-overlays`
**Status:** Discovery only. No code. No new routes. No layer construction.
**Source:** `docs/research/data-dubai/raw/transactions.json` (2.66 GB, 1,697,782 records)
**Date generated:** 2026-05-11

---

## TL;DR (90-second read)

The land-in-DDA subset is **55,934 transactions / 3.29% of the dump / 1998–2026**, but the *useful* subset is much smaller than that headline suggests. **77% of ZAAHI's DDA layers (159 of 206) have zero land transactions in the data.** The 47 layers with data are dominated by DAMAC's master-planned communities — top 5 layers carry 67% of all LAND∩DDA volume (DAMAC Hills 2 alone = 32%). Activity is **accelerating sharply**: 976 land tx in 2020 → 9,623 in 2025 (10× in 5 years), with 2026 already at 1,865 by mid-May. **Median land sale is 2.19M AED at 9,341 AED/sqm**; the mean (8.95M) is distorted by a handful of bulk/portfolio deals up to 13.79B.

The crucial join finding: **transactions has NO `parcel_id`** — the inventory doc's parcel_id story only applies to `land_registry`, not transactions. To attribute a transaction to a specific ZAAHI plot you must go through `land_registry` as a bridge, or live with area/master-project group-level matching (which is the standard DLD-style comparable-sales lookup anyway). For an MVP, **group-level comps per DDA master project is shippable in a week** and answers 90% of the "what did similar land sell for" question on parcel pages.

Three immediate gotchas to plan around:
1. **Naming mismatch undercount.** Business Bay (728 LAND tx), Arabian Ranches 3 (958), Falcon City (1,671) and ~100 other master_project values failed exact-match against ZAAHI's DDA layer names — easy fixable but currently silent. The true LAND∩DDA-attributable number is closer to **~65–70k once name normalization is done.**
2. **"Delayed Sell" is the dominant procedure, not "Sell".** 30,750 of the 55,934 LAND tx (55%) are `Delayed Sell` — DLD's installment-completion mechanism. We'll need to decide whether to treat these as the date of the final sale or the date of the initial commit (different price-time series).
3. **`property_sub_type_en` is NULL for 100% of land records.** Don't try to slice land by sub-type — that field is only meaningful for Unit / Villa / Building.

---

## 1. Schema

`transactions.json` is a top-level JSON array of 1,697,782 objects, each with **47 fields**. Streaming-parsed (top-level array can't be loaded into memory; full pass costs ~38s on this box).

| Field | Type | Sample | Notes |
|---|---|---|---|
| `transaction_id` | str | `"1-102-2015-9521"` | Unique. Format: `{trans_group_id}-{procedure_id}-{year}-{seq}` |
| `procedure_id` | int | `102` | → `lkp_transaction_procedures.json` (64 procedures) |
| `procedure_name_en` / `_ar` | str | `"Sell - Pre registration"` | DLD's transaction-type name |
| `trans_group_id` | int | `1` | → `lkp_transaction_groups.json` (3 groups) |
| `trans_group_en` / `_ar` | str | `"Sales"` | Sales / Mortgages / Gifts |
| `instance_date` | str | `"2015-10-20"` | ISO date, transaction registration date |
| `load_timestamp` | str | `"2026-04-12 21:13:42"` | When DLD dumped this row to the open-data file |
| `actual_worth` | str | `"560975.00"` | **Sale price in AED.** Stringified float. |
| `procedure_area` | str | `"60.90"` | **Subject area in sqm.** For Land = land area. For Unit = built-up area. |
| `meter_sale_price` | str | `"9211.43"` | **AED per sqm.** Pre-computed by DLD. |
| `rent_value` | null/str | `null` | Always null in Sales tx; populated only on rent procedures |
| `meter_rent_price` | null/str | `null` | Same |
| `property_type_en` / `_ar` / `_id` | str/int | `"Unit"` | **Top-level taxonomy.** 4 values only (see §2). |
| `property_sub_type_en` / `_ar` / `_id` | str/int | `"Flat"` | NULL for all Land records |
| `property_usage_en` / `_ar` | str | `"Residential"` | Residential / Commercial / Industrial / Multi-Use / Other / Storage / Hospitality |
| `reg_type_en` / `_ar` / `_id` | str/int | `"Off-Plan Properties"` | Existing vs Off-Plan. Land = 99.9% Existing. |
| `area_id` | int | `442` | DLD's internal area code |
| `area_name_en` / `_ar` | str | `"Al Barsha South Fifth"` | DLD-canonical community name |
| `master_project_en` / `_ar` | str | `"Jumeirah Village Triangle"` | Developer master project. **Best join key to ZAAHI's DDA layers.** |
| `project_name_en` / `_ar` | str | `"EDMONTON ELM"` | Sub-project / building |
| `project_number` | str | `"871.00"` | DLD's project ID (when applicable). Present on 70% of LAND tx. |
| `building_name_en` / `_ar` | str | `"EDMONTON ELM"` | NULL for 100% of LAND tx |
| `nearest_landmark_en` / `_ar` | str | `"Sports City Swimming Academy"` | DLD's hand-curated nearest-landmark string |
| `nearest_mall_en` / `_ar` | str | `"Marina Mall"` | Same |
| `nearest_metro_en` / `_ar` | str | `"Damac Properties"` | Same. Present on only 12% of LAND tx. |
| `rooms_en` / `_ar` | str | `"Studio"` | NULL for Land |
| `has_parking` | int | `1` | Boolean. Usually 0 for Land. |
| `no_of_parties_role_1/2/3` | int | `1` / `1` / `0` | Number of buyers / sellers / agents |

**Field families (counted, not just listed):** 47 fields = 12 "core" data fields + 18 bilingual (en/ar pairs) + 5 lookup IDs + 4 derived (load_timestamp, role counts, has_parking) + 8 nearby/locality strings.

---

## 2. Filter — what is "LAND"?

`property_type_en` is the canonical top-level taxonomy. **Exactly 4 distinct values exist across all 1.7M records**, and the picture is unambiguous:

| `property_type_en` | Count | % |
|---|---:|---:|
| Unit | 1,210,851 | 71.32% |
| Villa | 299,786 | 17.66% |
| **Land** | **150,930** | **8.89%** |
| Building | 36,215 | 2.13% |

**Verdict: `property_type_en == "Land"` is the filter.** No ambiguity. Case is consistent across the file. The Arabic equivalent is `أرض`.

(Earlier inventory speculated this might split into Land / Plot / Land plot. It does not — DLD uses the single label "Land".)

---

## 3. Filter — what is "DDA"?

DDA in ZAAHI is *operational*, not regulatory: it's whatever the founder has built as a `/api/layers/dda/<slug>` route. Reality check:

- **206 `/api/layers/dda/*` routes exist** (not 7 — the founder's mental model was outdated; see `src/app/api/layers/dda/` directory listing).
- Each backs a `data/layers/dda/<slug>.geojson` containing plot polygons (~99,126 plot features total across all 206 layers).
- Each geojson's `features[*].properties.PROJECT_NAME` carries the canonical name. All 206 geojsons have this field populated. All 206 PROJECT_NAME values are distinct (one project name per layer).

**The join key to transactions: `master_project_en` (case-insensitive exact match against PROJECT_NAME).**

Naming convention difference: ZAAHI's PROJECT_NAME is UPPERCASE ("TOWN SQUARE"); transactions' master_project_en is mixed case ("Jumeirah Village Triangle"). Normalize both to upper for matching.

---

## 4. Headline numbers

| Metric | Count | % of total |
|---|---:|---:|
| **Total transactions** | 1,697,782 | 100.00% |
| Land transactions | 150,930 | 8.89% |
| DDA-matched transactions (any property type) | 391,555 | 23.06% |
| **LAND ∩ DDA (the target market)** | **55,934** | **3.29%** |

**Cross-tab: property_type × DDA membership**

| | DDA | Non-DDA |
|---|---:|---:|
| Unit | 269,446 | 941,405 |
| Villa | 64,010 | 235,776 |
| **Land** | **55,934** | **94,996** |
| Building | 2,165 | 34,050 |

37% of all LAND tx are in DDA layers; 63% are in non-DDA areas (Furjan, JVC, Emirates Hills, Palm Jumeirah, etc.) — those would need separate map coverage to surface.

---

## 5. LAND ∩ DDA stats

### Date range
- Earliest: **1998-12-21**
- Latest: **2026-04-09**
- ~99% of activity is post-2014. Pre-2014 is sparse and probably backfill / historical reconciliation.

### Per-year transaction counts

```
2007     463   ████
2008   1,656   ████████████████
2014   1,044   ██████████
2015   2,305   ██████████████████████
2016   4,479   ████████████████████████████████████████████
2017   2,787   ███████████████████████████
2018   1,694   ████████████████
2019   1,022   ██████████
2020     976   █████████
2021   3,386   █████████████████████████████████
2022   6,975   ████████████████████████████████████████████████████████████
2023   6,568   ████████████████████████████████████████████████████████████
2024   9,283   ████████████████████████████████████████████████████████████
2025   9,623   ████████████████████████████████████████████████████████████
2026   1,865   ██████████████████ (partial year — through 9 Apr)
```

**The story:** post-2020 recovery rally is dramatic. 2025 is **10× 2020**. 2026 is on pace for ~10–12k LAND∩DDA tx if Q1 trend holds.

### Sale price (`actual_worth`, AED)
- n = 55,934 (100% non-null)
- min: **2** (yes, two AED — almost certainly an internal DLD reconciliation row; filter `< 10000` to clean)
- max: **13,786,936,424** (13.79B — bulk/portfolio sale)
- mean: **8,945,842** (distorted by outliers, do not surface)
- **median: 2,190,000** (the honest number for "typical sale")
- p25: 1,472,646
- p75: 4,742,000
- p95: 23,261,000

### AED per sqm (`meter_sale_price`)
- n = 55,934 (100% non-null)
- min: 0
- max: 4,114,960 (also an outlier)
- mean: 12,723
- **median: 9,341** (the headline number for "Dubai DDA land price")
- p25: 5,055
- p75: 13,158
- p95: 20,833

### Land area (`procedure_area`, sqm)
- n = 55,934
- min: 0.35 (suspect)
- max: 4,190,637 (whole-development sale)
- **median: 267 sqm** (about a 2,870 sqft plot — fits villa-plot scale)
- p25: 152, p75: 901

### Trans groups
| Group | Count | % |
|---|---:|---:|
| Sales | 44,454 | 79.5% |
| Mortgages | 9,645 | 17.2% |
| Gifts | 1,835 | 3.3% |

For "comparable sales" surfacing, filter to **`trans_group_en == "Sales"`** (44,454 rows).

### Procedures (top 10)
| Procedure | Count |
|---|---:|
| **Delayed Sell** | **30,750** |
| Sell | 12,567 |
| Mortgage Registration | 6,049 |
| Delayed Mortgage | 1,797 |
| Grant | 1,475 |
| Development Registration | 664 |
| Lease to Own Registration | 562 |
| Modify Mortgage | 504 |
| Portfolio Mortgage Registration | 348 |
| Grant on Delayed Sell | 314 |

**Surprise:** "Delayed Sell" is 55% of all LAND tx (and 69% of LAND Sales). This is DLD's term for transactions where the buyer pays in installments and the title transfers at completion. The `instance_date` is the *registration of the agreement*, not the completion. Important for comp-pricing: a 2024 "Delayed Sell" may reflect a 2024 *agreement* but the property might be still off-plan handover.

### Reg types
- `Existing Properties`: 55,889 (99.92%)
- `Off-Plan Properties`: 45 (0.08%)

Almost all land in this subset is existing (post-handover) — makes sense, land is what off-plan transitions *from*.

### Property usage breakdown (within LAND∩DDA)
| Usage | Count | % |
|---|---:|---:|
| Residential | 42,294 | 75.6% |
| Commercial | 7,748 | 13.9% |
| Other | 3,087 | 5.5% |
| Industrial | 1,705 | 3.0% |
| Multi-Use | 1,062 | 1.9% |
| Storage | 19 | 0.0% |
| Hospitality | 13 | 0.0% |
| Residential / Commercial | 6 | 0.0% |

Land carries the planned-usage tag from DLD. Useful for filtering parcel-page comps to "comparable land usage".

---

## 6. Top areas by transaction count

### Top 20 master projects (= ZAAHI DDA layers with data)

| Master project (transactions side) | ZAAHI layer | LAND tx count |
|---|---|---:|
| DAMAC HILLS 2 | damac_hills_2 | 17,802 |
| DAMAC Lagoons | damac_lagoons | 8,078 |
| JABEL ALI HILLS | jabel_ali_hills | 4,595 |
| Mudon | mudon | 3,367 |
| DAMAC HILLS | damac_hills | 3,104 |
| The Villa | the_villa | 3,038 |
| TILAL AL GHAF | tilal_al_ghaf | 2,488 |
| Nad Al Sheba Gardens | nad_al_sheba_gardens | 1,753 |
| Sama Al Jadaf | sama_al_jadaf | 1,250 |
| The Valley | the_valley | 1,167 |
| Al Barari | al_barari | 835 |
| Dubai Industrial City | dubai_industrial_city | 810 |
| Pearl Jumeira | pearl_jumeira | 723 |
| Jabal Ali Industrial Development | jabal_ali_industrial | 671 |
| Dubai Sports City | dubai_sports_city | 669 |
| Majan | majan | 602 |
| Dubai Land Residence Complex | dlrc | 528 |
| Living Legends | living_legends | 528 |
| Arjan | arjan | 473 |
| Al Khawaneej District | al_khawaneej | 446 |

**Top 5 = 67% of LAND∩DDA volume.** DAMAC's 4 communities together = 32,108 tx (57.4%).

### Top 20 area_name_en (DLD-canonical community names within LAND∩DDA)

| `area_name_en` | LAND tx |
|---|---:|
| Madinat Hind 4 | 11,968 |
| Al Hebiah Fifth | 8,093 |
| Al Hebiah Third | 5,580 |
| Saih Shuaib 1 | 4,595 |
| Al Yufrah 2 | 3,408 |
| Al Hebiah Fourth | 3,157 |
| Al Yufrah 3 | 2,426 |
| Al Ruwayyah | 1,818 |
| Nad Al Shiba First | 1,753 |
| Wadi Al Safa 5 | 1,745 |
| Wadi Al Safa 3 | 1,696 |
| Al Jadaf | 1,447 |
| Al Yufrah 1 | 1,167 |
| Jumeirah First | 953 |
| Al Hebiah Sixth | 891 |
| Jabal Ali Industrial First | 671 |
| Saih Shuaib 4 | 618 |
| Al Barshaa South Third | 473 |
| Al Khawaneej First | 446 |
| Hadaeq Sheikh Mohammed Bin Rashid | 445 |

This is a *parallel* attribution to the master-project view. Some communities map 1-1 to master projects (Madinat Hind 4 = DAMAC Hills 2); others span multiple master projects.

---

## 7. The DDA-layer coverage gap

**Of ZAAHI's 206 DDA layers:**
- **47 (23%) have at least one LAND transaction** in the data.
- **159 (77%) have ZERO LAND transactions.**

The 159 empty layers fall in three buckets:
1. **Non-residential plots / institutional**: Burj Al Arab, Al Jalila Children's Hospital, Dubai Police Academy, EAHM, BoxPark, La Mer, Global Village, schools-fz. These are operational facilities, not subdivided land for sale.
2. **Mature communities with no remaining land deals**: Arabian Ranches I, Business Bay (sort of — see §8), DIFC (7 land tx), Bluewaters. Land was sold long ago; only Unit/Villa tx happen now.
3. **Brand-new master plans, just launched**: Athlon, Damac Islands, Damac Islands 2, Asmaran, Bianca, Cherrywoods, Ghaf Woods, The Acres, Sobha Reserve / Sanctuary / Elwood, Taormina 1 / 2. These probably *will* generate land tx as developers sell plots, but haven't yet.

**Implication:** A "click DDA layer → recent land sales" feature shows empty state on 77% of layers unless we filter the layers list down to the 47 with data.

---

## 8. The naming-mismatch undercount

**101 distinct `master_project_en` values had LAND transactions but did not match any ZAAHI DDA PROJECT_NAME** (case-insensitive exact). Top offenders by tx count:

| Unmatched master_project | LAND tx | Probable cause |
|---|---:|---|
| Al Furjan | 6,223 | No ZAAHI DDA layer for Al Furjan (or it's under a different category) |
| Nad Al Shiba Villas | 3,300 | We have `nad_al_sheba_gardens` (DLD calls it differently) |
| Jumeirah Village Circle | 1,774 | No DDA layer |
| Jumeirah Golf Estates | 1,721 | No DDA layer |
| Falcon City | 1,671 | ZAAHI has `falcon_city` → "FALCON CITY OF WONDERS" — suffix mismatch |
| Palm Jabal Ali | 1,639 | No DDA layer |
| Emirates Hills | 1,614 | No DDA layer |
| Palm Jumeirah | 1,485 | No DDA layer |
| Dubai World Central | 1,374 | We have `dwc` / `dwc_nfz` — name mismatch |
| Jabal Ali Village | 1,215 | No DDA layer |
| Palm Deira | 1,208 | No DDA layer |
| Arabian Ranches 3 | 958 | ZAAHI has `arabian_ranches_3` → "ARABIAN RANCHES III" — Roman/Arabic numeral mismatch |
| DUBAI HILLS - SIDRA 3 | 874 | Sub-area of `dubai_hills` — DLD records the sub, ZAAHI only has the parent |
| Business Bay | 728 | ZAAHI has `business_bay` → "BUSINESS BAY PHASE 1 & 2" — suffix mismatch |
| MBR City - District 1 | 692 | No clean DDA layer match |

**Three different gap types:**
1. **True missing coverage** (Al Furjan, JVC, Emirates Hills, Palm Jumeirah, Palm Jabal Ali): real demand neighborhoods with no ZAAHI DDA layer. Either build the layer or live without comps for them.
2. **Roman / Arabic numeral mismatch**: `Arabian Ranches 3` (transactions) vs `ARABIAN RANCHES III` (ZAAHI). Trivial fix in a normalization function — but worth a one-time alias map.
3. **Suffix mismatch**: `Business Bay` vs `BUSINESS BAY PHASE 1 & 2`, `Falcon City` vs `FALCON CITY OF WONDERS`, `Nad Al Shiba Villas` vs `NAD AL SHEBA GARDENS`. Need a curated alias map. Probably 20–30 manual entries.

**If both fixes ship, the "true" LAND∩DDA-attributable number rises from 55,934 to an estimated 65–70k.** That recovery is the difference between Business Bay parcels looking "no comps" vs. "728 land comps" on the page.

---

## 9. Joinability to ZAAHI's 556k parcels

**Tested:** 5 random plots, one each from `damac_hills_2`, `damac_lagoons`, `jabel_ali_hills`, `mudon`, `town_square`.

| ZAAHI plot_number | ZAAHI layer | Transactions parcel_id field? | Master-project group match? |
|---|---|---|---|
| 91411794 | damac_hills_2 | **ABSENT** (field doesn't exist on this dataset) | ✓ "DAMAC HILLS 2" — 17,802 tx |
| 68311406 | damac_lagoons | ABSENT | ✓ "DAMAC Lagoons" — 8,078 tx |
| 5130428 | jabel_ali_hills | ABSENT | ✓ "JABEL ALI HILLS" — 4,595 tx |
| 6771831 | mudon | ABSENT | ✓ "Mudon" — 3,367 tx |
| 9220503 | town_square | ABSENT | ✓ "TOWN SQUARE" — 84 tx |

**Definitive finding:** `transactions.json` has **no `parcel_id` field at all**. The inventory doc's "parcel_id joins directly to ZAAHI plot_number" claim applies to `land_registry.json`, **not** to transactions. Different file, different schema.

**Available join granularity:**
- ✅ **Master-project group** (case-insensitive exact match on `master_project_en` ↔ ZAAHI DDA `PROJECT_NAME`) — verified on all 5 samples
- ✅ **Area community** (`area_name_en`) — useful for non-DDA neighborhoods or finer-grained sub-aggregation
- ❌ **Specific parcel** — not possible from transactions alone
- 🟡 **Specific parcel via land_registry bridge** — possible if we ingest land_registry first (it has parcel_id + master_project + area_name), giving us a parcel → group lookup table. Each ZAAHI plot then inherits the group's stats.

**Match rate:** 5/5 spot-checks succeeded at the group level. The realistic platform-wide match rate is 23% of DDA layers with any data (47/206), and within those layers every plot inherits the layer's tx stats by definition.

---

## 10. Surface candidates — every potentially useful field

For each field on LAND∩DDA records, what ZAAHI feature it enables, and build complexity (S/M/L):

| Field | Type | Sample | Surface use | Complexity |
|---|---|---|---|---|
| `actual_worth` | str→float | "560975.00" | Comp price label, AED formatted | S |
| `meter_sale_price` | str→float | "9211.43" | AED/sqm benchmark per layer | S |
| `procedure_area` | str→float | "60.90" | Comp size (sqm + sqft) | S |
| `instance_date` | str (ISO) | "2015-10-20" | "X months ago" relative date | S |
| `procedure_name_en` | str | "Sell - Pre registration" | Distinguish Sell / Delayed Sell | S |
| `trans_group_en` | str | "Sales" | Filter UI: Sales / Mortgages / Gifts toggle | S |
| `reg_type_en` | str | "Off-Plan Properties" | Tag: existing vs off-plan | S |
| `property_usage_en` | str | "Residential" | Filter UI: residential / commercial land toggle | S |
| `master_project_en` | str | "DAMAC HILLS 2" | Join key; not surfaced directly | — |
| `area_name_en` | str | "Wadi Al Safa 3" | Breadcrumb on detail page | S |
| `project_number` | str | "871.00" | Optional cross-link to projects.json (developer + escrow) | M |
| `nearest_landmark_en` | str | "Sports Academy" | Context line on comp card | S |
| `nearest_mall_en` | str | "Marina Mall" | Same | S |
| `nearest_metro_en` | str | "Damac Properties" | Same (only 12% populated) | S |
| `no_of_parties_role_1/2/3` | int | 1 / 1 / 0 | "buyer count" — niche, skip for MVP | L |
| `has_parking` | int | 0 | Usually 0 for land — skip | — |
| `transaction_id` | str | "1-102-2015-9521" | Stable key for de-dup + caching | — |

**Derived surfaces (pre-computed once, not raw fields):**

| Surface | Inputs | Complexity |
|---|---|---|
| Per-DDA-layer rolling-12-month median AED/sqm | meter_sale_price + instance_date | S |
| Per-DDA-layer Y/Y price change | meter_sale_price by year | S |
| Per-DDA-layer Sales velocity (tx/quarter) | trans_group + instance_date | S |
| Per-area-name choropleth tier (heat-map color) | meter_sale_price aggregated by area | M |
| Recent-5 land comps card (price, date, size, AED/sqm) | top fields above, sorted by instance_date desc | S |
| "Land deal heatmap" by time-period slider | per-month tx counts | M |

---

## 11. Three build candidates — ranked by impact

### Candidate 1 — "Recent land comps" widget on DDA layer click  (Complexity: S) ⭐ recommended

**What it shows:**
When the user clicks any DDA layer polygon on the map, the side panel surfaces a card:
> **DAMAC Hills 2 — recent land sales**
>   • 12 Mar 2026 — 2,341 sqm — AED 4.2M — AED 1,795/sqm (Delayed Sell)
>   • 28 Feb 2026 — 1,820 sqm — AED 3.1M — AED 1,703/sqm (Sell)
>   • 14 Feb 2026 — 5,610 sqm — AED 11.8M — AED 2,104/sqm (Delayed Sell)
>   • 01 Feb 2026 — 920 sqm — AED 1.65M — AED 1,793/sqm (Sell)
>   • 23 Jan 2026 — 1,540 sqm — AED 2.85M — AED 1,851/sqm (Delayed Sell)
> _Showing 5 most recent of 17,802 lifetime sales · median 2025 = AED 1,810/sqm_

**Fields needed:** instance_date, actual_worth, procedure_area, meter_sale_price, procedure_name_en, trans_group_en (filter to "Sales" only).

**Pre-compute:** a JSON file per DDA layer with the last 10 Sales-only LAND tx, plus rolling-12-month median. ~50 KB per layer × 47 active layers = **~2.4 MB total**, served as a 47-key map.

**Ship:** week after merge to main. Single new API route (`/api/dda/[slug]/land-comps`), single new component on the existing layer-click side panel.

**Caveats to call out in the UI:**
- "Showing land transactions registered with DLD. Delayed Sell entries date the agreement, not the completion."
- Empty state copy for the 159 layers with no data.

---

### Candidate 2 — Per-layer median AED/sqm choropleth tier  (Complexity: M)

**What it shows:**
Color-code the DDA polygons on the map by median land price tier (e.g., green = bottom third, amber = middle, red = top). Legend:
> 🟢 < 5,000 AED/sqm   🟡 5,000–10,000   🟠 10,000–15,000   🔴 > 15,000

**Fields needed:** meter_sale_price aggregated by master_project + rolling-12-month window.

**Pre-compute:** single 47-row JSON: `{slug, median_aed_per_sqm_12m, tx_count_12m}`. Refresh weekly via cron.

**Ship:** weeks 2–3. Needs a paint expression on the existing DDA polygon source + a new legend block + the pre-computed JSON.

**Caveats:**
- 12-month window means new master plans (Asmaran, Bianca, Damac Islands) have no color until first sales register. Could fall back to lifetime median for new layers.
- Outliers can pull the median — use median-of-Sales-only and clip price < 100K AED (data hygiene).

---

### Candidate 3 — Parcel detail page "land comps in {area}" section  (Complexity: M → L)

**What it shows:**
On every ZAAHI parcel detail page, **if the parcel falls in a DDA layer that has tx data**, show a "Comparable land sales nearby" section with the same comp card from Candidate 1, plus a price-time chart (median AED/sqm by quarter, last 8 quarters).

**Fields needed:** same as Candidate 1, plus pre-computed quarterly aggregates.

**Pre-compute:**
- Per-master-project: last 20 Sales LAND tx + quarterly medians (last 8 quarters).
- Per-parcel: which master_project they belong to. **This is the harder part** — needs either:
  - (a) Ingesting `land_registry.json` and joining parcel_id → master_project (proven 100% on inventory spot-checks)
  - (b) Spatial overlay: which ZAAHI plot polygon falls inside which DDA layer polygon (cheap but coarse; loses parcels not in any DDA layer)

**Ship:** month 2 — depends on (a) or (b) above.

**Why this is bigger than (1) and (2):** it touches the parcel detail page (high-traffic surface), needs a longer pre-compute pipeline, and the parcel→project mapping needs maintenance. But this is the surface that **closes the comparable-sales credibility gap with PropertyFinder / Bayut** at the parcel level, which is the centrepiece finding from the integration plan.

---

## 12. Things that surprised me (one-liners for the founder)

1. **77% of ZAAHI's 206 DDA layers have zero land transactions.** Empty state design is mandatory before this ships, or the "comps" feature looks broken on most of the map.
2. **DAMAC owns the dataset.** Four DAMAC communities = 57% of all LAND∩DDA volume. Anything we ship about "Dubai land" is mostly a story about DAMAC.
3. **"Delayed Sell" is 55% of land transactions.** Most "land sales" in DLD's data are installment-agreement registrations, not handover. This affects how we date and price comps.
4. **No `parcel_id` in transactions.** The integration plan's headline join is `land_registry → ZAAHI`, **not** `transactions → ZAAHI`. Surface mismatch in the planning doc.
5. **2025 land tx volume is 10× 2020.** Activity is genuinely accelerating, not just our perception.
6. **Median land sale is 2.19M AED at 9,341 AED/sqm.** Useful one-line citation for marketing.
7. **Mean (8.95M) is wildly distorted by bulk deals up to 13.79B AED.** Never use mean. Always median.
8. **`property_sub_type_en` is NULL for 100% of land.** Don't try to slice land by sub-type — the field is for Unit/Villa only.
9. **Business Bay's 728 land tx are silently lost** because ZAAHI calls it "BUSINESS BAY PHASE 1 & 2" while DLD calls it "Business Bay". One alias map fixes ~10k tx of undercount.
10. **Al Furjan has 6,223 land tx but no DDA layer at all.** Either build that layer or accept Al Furjan parcels show no comps.

---

## 13. Non-goals / not investigated this pass

- **Land transactions in non-DDA jurisdictions** (94,996 records). Out of scope; founder explicitly limited to DDA.
- **Mortgages and Gifts subsets within LAND∩DDA** (11,480 records). Useful for "asset-class signals" but not comparable-sales.
- **Cross-validation with `valuation.json`** (DLD's 89k property evaluations). Could spot-check our pre-computed medians against DLD's own valuations. Worth a separate pass.
- **Land transactions on Off-Plan reg type** (45 records). Edge case, ignore.
- **Currency outliers / data hygiene rules.** A cleaning pipeline (filter `< 10000 AED`, drop `meter_sale_price > 100000`) is needed before shipping but not designed here.

---

## 14. Open questions for the founder

1. **Do we want to fix the 101 naming-mismatch unmatched projects** via an alias map? +10–15k tx recovered, ~30 manual entries.
2. **Do we treat "Delayed Sell" entries as the agreement date or attempt to model completion date?** Big impact on comp recency.
3. **For the 159 empty DDA layers — empty state UI or hide them from the comp surface entirely?** Affects whether the layer toggle stays on the map or is filtered.
4. **`land_registry.json` import — do it now to enable per-parcel attribution, or stick with group-level for the MVP?** Group-level is shippable in a week; per-parcel adds 1–2 weeks.
5. **Non-DDA neighborhoods with high LAND volume (Al Furjan 6.2k, JVC 1.8k, Emirates Hills 1.6k) — build DDA layers for them, or expand the comp feature to area-level (`area_name_en`) which covers them without new layers?**

---

*Generated by streaming-parse over the full 2.66 GB `transactions.json`. Aggregator script: `/tmp/tx_aggregate.py`. Per-layer gap: `/tmp/dda_layer_gap.py`. Full raw aggregate: `/tmp/tx_aggregate_result.json` (5,000+ lines).*
