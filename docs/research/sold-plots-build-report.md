# Sold plots build report

Built 2026-10-11 by `scripts/build-sold-plots.ts`. Every number is measured by that run.

## Inputs and freshness

- DXB sale dates up to **2026-08-11**; Intel kit deal dates up to **2024-08-30**.
- `land_registry` snapshot 2026-04-10 (local dump, 253659 rows). `projects.json` snapshot **2025-10-02**.
- **D6 refresh of projects.json: failed.** data.dubai / dubaipulse.gov.ae serve a JS portal; the dataset download needs an interactive session (HTTP 200 HTML, no file). The newer `~/Загрузки/projects_2026-05-11…json` is the same 2025-10-02 load (3,039 ids, identical). Built on the 2025-10 snapshot.

## Totals

- Plots with ≥1 sale: **11930** — pinned **5073** (dda 3671, mp 1290, geo 112; approx 112), unplaced **6857**.
- Sales on pinned plots: 7086; sales on unplaced plots: 8354.
- DXB plot rows read 25531: no usable area 281, no registry match 14271, ambiguous (>1 parcel) 470.
- Kit land deals with a municipality number: sales 5067, mortgages 2819, gifts 505, other procedures 1148 (not shown). Duplicate (date, price) rows dropped: 136.
- Projects-by-parcel entries: 69777.

## Files

- `data/sold-plots/pins.json` — 0.48 MB (505793 bytes)
- `data/sold-plots/cards.json` — 2.67 MB (2795666 bytes)
- `data/sold-plots/projects-by-parcel.json` — 2.08 MB (2183668 bytes)

## Placement by community

| community | sales | dda | mp | geo | approx | unplaced plots |
|---|---:|---:|---:|---:|---:|---:|
| JVC | 2093 | 0 | 887 | 0 | 0 | 55 |
| DAMAC Lagoons | 715 | 694 | 0 | 0 | 0 | 0 |
| Dubai Investment Park Second | 422 | 0 | 0 | 0 | 0 | 260 |
| Jumeirah Golf Estates | 422 | 0 | 0 | 0 | 0 | 398 |
| Meydan Horizon | 377 | 0 | 82 | 48 | 48 | 0 |
| Hor Al Anz | 346 | 0 | 0 | 0 | 0 | 264 |
| DAMAC HILLS | 346 | 333 | 0 | 0 | 0 | 1 |
| JVT | 346 | 0 | 94 | 64 | 64 | 9 |
| Dubai Investment Park First | 313 | 0 | 0 | 0 | 0 | 225 |
| Al Rashidiya | 299 | 0 | 0 | 0 | 0 | 236 |
| Dubai South | 292 | 0 | 227 | 0 | 0 | 8 |
| Arabian Ranches II | 273 | 253 | 0 | 0 | 0 | 0 |
| Arabian Ranches - 1 | 261 | 246 | 0 | 0 | 0 | 0 |
| Saih Shuaib 2 | 244 | 192 | 0 | 0 | 0 | 1 |
| Al Warsan Third | 239 | 0 | 0 | 0 | 0 | 204 |
| Nad Al Sheba Gardens | 225 | 206 | 0 | 0 | 0 | 0 |
| Um Al Sheif | 211 | 107 | 0 | 0 | 0 | 66 |
| Nad Al Hamar | 211 | 28 | 0 | 0 | 0 | 155 |
| DAMAC HILLS 2 | 201 | 198 | 0 | 0 | 0 | 1 |
| TILAL AL GHAF | 199 | 191 | 0 | 0 | 0 | 0 |
| DUBAI HILLS - SIDRA 1 | 197 | 171 | 0 | 0 | 0 | 0 |
| SOBHA HARTLAND | 197 | 0 | 0 | 0 | 0 | 156 |
| Al Satwa | 193 | 0 | 0 | 0 | 0 | 142 |
| Al Bada | 171 | 0 | 0 | 0 | 0 | 141 |
| Abu Hail | 169 | 0 | 0 | 0 | 0 | 128 |
| Dubai Industrial City | 167 | 108 | 0 | 0 | 0 | 1 |
| Pearl Jumeira | 164 | 112 | 0 | 0 | 0 | 1 |
| Al Waheda | 164 | 0 | 0 | 0 | 0 | 128 |
| Jumeirah Village Triangle | 154 | 0 | 0 | 0 | 0 | 147 |
| Al Karama | 151 | 0 | 0 | 0 | 0 | 109 |
| Al Merkadh | 150 | 0 | 0 | 0 | 0 | 139 |
| Al Barsha Second | 145 | 8 | 0 | 0 | 0 | 112 |
| Jumeirah Village Circle | 131 | 0 | 0 | 0 | 0 | 127 |
| Al Barari | 129 | 111 | 0 | 0 | 0 | 0 |
| Al Barsha Third | 124 | 15 | 0 | 0 | 0 | 93 |
| Mohammed Bin Rashid AL Maktoum City -District -1 Community | 121 | 0 | 0 | 0 | 0 | 97 |
| Jumeirah Islands | 121 | 0 | 0 | 0 | 0 | 106 |
| Jumeirah First | 119 | 0 | 0 | 0 | 0 | 104 |
| Al Goze First | 114 | 0 | 0 | 0 | 0 | 101 |
| Nad Al Shiba First | 113 | 0 | 0 | 0 | 0 | 106 |
| Al Mizhar First | 108 | 0 | 0 | 0 | 0 | 87 |
| Al Warqa First | 91 | 0 | 0 | 0 | 0 | 74 |
| Mirdif | 91 | 26 | 0 | 0 | 0 | 49 |
| Naif | 90 | 0 | 0 | 0 | 0 | 75 |
| Jumeirah Third | 87 | 0 | 0 | 0 | 0 | 75 |
| Al Khawaneej First | 85 | 1 | 0 | 0 | 0 | 70 |
| Al Mizhar Second | 83 | 0 | 0 | 0 | 0 | 65 |
| Al Warqa Third | 83 | 1 | 0 | 0 | 0 | 70 |
| Al Twar Fourth | 78 | 0 | 0 | 0 | 0 | 61 |
| Al Jafliya | 78 | 1 | 0 | 0 | 0 | 70 |
| Al Wasl | 78 | 0 | 0 | 0 | 0 | 62 |
| Jumeirah Park Package 1a | 77 | 0 | 0 | 0 | 0 | 1 |
| Ras Al Khor | 76 | 0 | 0 | 0 | 0 | 40 |
| Al Manara | 75 | 0 | 0 | 0 | 0 | 61 |
| Jumeirah Second | 72 | 0 | 0 | 0 | 0 | 63 |
| Al Muteena | 69 | 0 | 0 | 0 | 0 | 58 |
| Al Barsha First | 69 | 0 | 0 | 0 | 0 | 58 |
| Dubai Life Style City | 68 | 68 | 0 | 0 | 0 | 0 |
| Al Mararr | 67 | 0 | 0 | 0 | 0 | 56 |
| Al Suq Al Kabeer | 65 | 0 | 0 | 0 | 0 | 59 |
| Al Murqabat | 62 | 0 | 0 | 0 | 0 | 55 |
| Arjan | 60 | 43 | 0 | 0 | 0 | 13 |
| DUBAI HILLS - SIDRA 2 | 60 | 55 | 0 | 0 | 0 | 0 |
| Emirates Hills | 58 | 0 | 0 | 0 | 0 | 55 |
| Meydan Racecourse Community | 58 | 0 | 0 | 0 | 0 | 51 |
| Al Mamzer | 57 | 0 | 0 | 0 | 0 | 46 |
| Muhaisanah First | 56 | 0 | 0 | 0 | 0 | 49 |
| Al Twar First | 56 | 0 | 0 | 0 | 0 | 46 |
| Al Khawaneej Labour City | 55 | 49 | 0 | 0 | 0 | 0 |
| Jumeirah Park | 54 | 0 | 0 | 0 | 0 | 54 |
| Al Raffa | 52 | 0 | 0 | 0 | 0 | 46 |
| Meadows 9 | 51 | 0 | 0 | 0 | 0 | 46 |
| Al Twar Third | 50 | 0 | 0 | 0 | 0 | 44 |
| City Of Arabia | 48 | 41 | 0 | 0 | 0 | 2 |
| Al Khawaneej Second | 47 | 0 | 0 | 0 | 0 | 37 |
| Muhaisanah Third | 47 | 0 | 0 | 0 | 0 | 42 |
| DUBAI HILLS - SIDRA 3 | 44 | 40 | 0 | 0 | 0 | 0 |
| Jumeira Bay | 43 | 35 | 0 | 0 | 0 | 0 |
| Meadows 1 | 43 | 0 | 0 | 0 | 0 | 40 |
| JABAL ALI INDUSTRIAL DEVELOPMENT | 42 | 37 | 0 | 0 | 0 | 0 |
| Al Barshaa South First | 42 | 0 | 0 | 0 | 0 | 35 |
| Business Bay | 42 | 25 | 0 | 0 | 0 | 8 |
| Meadows 2 | 42 | 0 | 0 | 0 | 0 | 40 |
| Al Saffa Second | 41 | 0 | 0 | 0 | 0 | 37 |
| Al Baraha | 39 | 0 | 0 | 0 | 0 | 32 |
| Al Hamriya | 39 | 0 | 0 | 0 | 0 | 34 |
| DUBAI HILLS - GOLF PLACE | 39 | 33 | 0 | 0 | 0 | 0 |
| Palm Jumeirah | 39 | 0 | 0 | 0 | 0 | 39 |
| Al Warqa Second | 38 | 1 | 0 | 0 | 0 | 31 |
| Al Dhagaya | 38 | 0 | 0 | 0 | 0 | 33 |
| Wasl Gate | 37 | 0 | 0 | 0 | 0 | 32 |
| Um Suqaim Second | 36 | 0 | 0 | 0 | 0 | 30 |
| Al Ras | 35 | 0 | 0 | 0 | 0 | 28 |
| DUBAI HILLS - GOLF TERRACES | 34 | 31 | 0 | 0 | 0 | 0 |
| Al Nahda Second | 33 | 0 | 0 | 0 | 0 | 32 |
| Al Twar Second | 32 | 0 | 0 | 0 | 0 | 24 |
| Hor Al Anz East | 30 | 0 | 0 | 0 | 0 | 27 |
| Wadi Al Amardi | 29 | 1 | 0 | 0 | 0 | 23 |
| Dubai Water Canal | 29 | 0 | 0 | 0 | 0 | 22 |
| DUBAI HILLS - EMERALD HILLS | 29 | 29 | 0 | 0 | 0 | 0 |
| Al Warqa Fourth | 28 | 0 | 0 | 0 | 0 | 24 |
| Al Aweer Second | 28 | 0 | 0 | 0 | 0 | 22 |
| Al Aweer First | 27 | 0 | 0 | 0 | 0 | 19 |
| Liwan1 | 27 | 27 | 0 | 0 | 0 | 0 |
| Um Suqaim First | 27 | 0 | 0 | 0 | 0 | 21 |
| Al Garhoud | 25 | 0 | 0 | 0 | 0 | 21 |
| Port Saeed | 24 | 0 | 0 | 0 | 0 | 19 |
| Al Khabeesi | 22 | 0 | 0 | 0 | 0 | 20 |
| Motor City | 21 | 11 | 0 | 0 | 0 | 5 |
| Eyal Nasser | 21 | 0 | 0 | 0 | 0 | 17 |
| Ghadeer Al tair | 20 | 0 | 0 | 0 | 0 | 19 |
| Nad Al Shiba Villas | 20 | 0 | 0 | 0 | 0 | 20 |
| Meadows 5 | 19 | 0 | 0 | 0 | 0 | 18 |
| Al Saffa First | 18 | 0 | 0 | 0 | 0 | 16 |
| DUBAI HILLS - PARKWAYS | 18 | 15 | 0 | 0 | 0 | 0 |
| Lakes - Maeen | 18 | 0 | 0 | 0 | 0 | 18 |
| International Media Production Zone | 17 | 15 | 0 | 0 | 0 | 0 |
| Muhaisanah Fourth | 16 | 0 | 0 | 0 | 0 | 14 |
| Lehbab First | 16 | 0 | 0 | 0 | 0 | 10 |
| Al Goze Fourth | 16 | 0 | 0 | 0 | 0 | 13 |
| DUBAI HILLS - LAMBOURGHINI | 16 | 0 | 0 | 0 | 0 | 10 |
| Oud Metha | 15 | 0 | 0 | 0 | 0 | 15 |
| Trade Center First | 15 | 0 | 0 | 0 | 0 | 11 |
| Al Nahda First | 15 | 0 | 0 | 0 | 0 | 13 |
| Um Ramool | 14 | 0 | 0 | 0 | 0 | 14 |
| Living Legends | 14 | 11 | 0 | 0 | 0 | 0 |
| Um Suqaim Third | 14 | 0 | 0 | 0 | 0 | 12 |
| DUBAI HILLS | 14 | 14 | 0 | 0 | 0 | 0 |
| Al Barshaa South Third | 14 | 0 | 0 | 0 | 0 | 11 |
| DMCC Master Community | 13 | 0 | 0 | 0 | 0 | 13 |
| Meadows 8 | 13 | 0 | 0 | 0 | 0 | 12 |
| Um Hurair First | 12 | 0 | 0 | 0 | 0 | 9 |
| Jabal Ali Industrial First | 12 | 2 | 0 | 0 | 0 | 10 |
| Al Buteen | 12 | 0 | 0 | 0 | 0 | 12 |
| Meadows 6 | 12 | 0 | 0 | 0 | 0 | 11 |
| Nad Shamma | 11 | 0 | 0 | 0 | 0 | 10 |
| Al Qusais Industrial Fifth | 11 | 0 | 0 | 0 | 0 | 10 |
| Al Mizhar Third | 11 | 0 | 0 | 0 | 0 | 10 |
| Al Goze Third | 11 | 1 | 0 | 0 | 0 | 9 |
| DUBAI HILLS - HILLS VIEW | 11 | 11 | 0 | 0 | 0 | 0 |
| Al Thanayah Fourth | 11 | 0 | 0 | 0 | 0 | 10 |
| Jumeirah Bay | 10 | 0 | 0 | 0 | 0 | 9 |
| Lehbab Second | 9 | 0 | 0 | 0 | 0 | 8 |
| Al Qusais Industrial Fourth | 9 | 0 | 0 | 0 | 0 | 8 |
| Al Rega | 9 | 0 | 0 | 0 | 0 | 8 |
| THE SUSTAINABLE CITY | 9 | 9 | 0 | 0 | 0 | 0 |
| Meydan One Community | 9 | 0 | 0 | 0 | 0 | 9 |
| Al Goze Industrial Third | 8 | 0 | 0 | 0 | 0 | 7 |
| Trade Center Second | 8 | 1 | 0 | 0 | 0 | 4 |
| Ras Al Khor Industrial Second | 8 | 0 | 0 | 0 | 0 | 8 |
| Mohammed Bin Rashid AL Maktoum District 11 | 8 | 0 | 0 | 0 | 0 | 5 |
| Meadows 7 | 8 | 0 | 0 | 0 | 0 | 8 |
| Ras Al Khor Industrial Third | 7 | 0 | 0 | 0 | 0 | 7 |
| Al Goze Industrial Fourth | 7 | 0 | 0 | 0 | 0 | 6 |
| Muhaisanah Second | 7 | 1 | 0 | 0 | 0 | 4 |
| Al Lusaily | 7 | 0 | 0 | 0 | 0 | 5 |
| DUBAI HILLS - PARKWAY VISTAS | 7 | 6 | 0 | 0 | 0 | 0 |
| Nad Al Shiba Fourth | 7 | 0 | 0 | 0 | 0 | 6 |
| Meadows 3 | 7 | 0 | 0 | 0 | 0 | 7 |
| (unknown) | 7 | 0 | 0 | 0 | 0 | 7 |
| Lakes - Hattan II | 7 | 0 | 0 | 0 | 0 | 7 |
| DUBAI HILLS - FAIRWAY VISTAS | 7 | 5 | 0 | 0 | 0 | 0 |
| Majan | 6 | 5 | 0 | 0 | 0 | 0 |
| Dubai Marina | 6 | 0 | 0 | 0 | 0 | 6 |
| Al Goze Industrial Second | 5 | 1 | 0 | 0 | 0 | 4 |
| Nad Al Shiba Second | 5 | 0 | 0 | 0 | 0 | 5 |
| DUBAI HILLS - HILLS GROVE | 5 | 3 | 0 | 0 | 0 | 0 |
| Lakes - Deema 4 | 5 | 0 | 0 | 0 | 0 | 4 |
| Al Furjan | 5 | 0 | 0 | 0 | 0 | 5 |
| Dubai Land Residence Complex | 4 | 2 | 0 | 0 | 0 | 0 |
| Al Goze Industrial First | 4 | 0 | 0 | 0 | 0 | 4 |
| Al Qusais Industrial Second | 4 | 1 | 0 | 0 | 0 | 3 |
| Dubai Harbour | 4 | 4 | 0 | 0 | 0 | 0 |
| Al Safouh First | 4 | 1 | 0 | 0 | 0 | 2 |
| Al Qusais Industrial First | 4 | 0 | 0 | 0 | 0 | 4 |
| Al Rowaiyah First | 4 | 3 | 0 | 0 | 0 | 1 |
| Al Sabkha | 4 | 0 | 0 | 0 | 0 | 4 |
| Lakes - Deema 3 | 4 | 0 | 0 | 0 | 0 | 4 |
| Lakes - Deema 2 | 4 | 0 | 0 | 0 | 0 | 4 |
| Meadows 4 | 4 | 0 | 0 | 0 | 0 | 4 |
| Nadd Hessa | 3 | 0 | 0 | 0 | 0 | 3 |
| LA MER | 3 | 3 | 0 | 0 | 0 | 0 |
| Al Yelayiss 1 | 3 | 3 | 0 | 0 | 0 | 0 |
| Liwan2 | 3 | 1 | 0 | 0 | 0 | 0 |
| Madinat Hind 3 | 3 | 0 | 0 | 0 | 0 | 3 |
| Al Ttay | 3 | 0 | 0 | 0 | 0 | 3 |
| Grayteesah | 3 | 0 | 0 | 0 | 0 | 3 |
| Al Hudaiba | 3 | 0 | 0 | 0 | 0 | 3 |
| Al Eyas | 3 | 0 | 0 | 0 | 0 | 3 |
| Madinat Hind 4 | 3 | 0 | 0 | 0 | 0 | 2 |
| DUBAI HILLS - FAIRWAYS | 3 | 3 | 0 | 0 | 0 | 0 |
| Lakes - Deema 1 | 3 | 0 | 0 | 0 | 0 | 3 |
| Nad Al Sheba 1 | 3 | 0 | 0 | 0 | 0 | 3 |
| Rega Al Buteen | 2 | 0 | 0 | 0 | 0 | 2 |
| Saih Aldahal | 2 | 0 | 0 | 0 | 0 | 2 |
| Muragab | 2 | 0 | 0 | 0 | 0 | 2 |
| Um Hurair Second | 2 | 0 | 0 | 0 | 0 | 2 |
| Al Yufrah 4 | 2 | 2 | 0 | 0 | 0 | 0 |
| Wadi Al Safa 7 | 2 | 2 | 0 | 0 | 0 | 0 |
| Jabal Ali Industrial Second | 2 | 0 | 0 | 0 | 0 | 1 |
| Al Rowaiyah Third | 2 | 0 | 0 | 0 | 0 | 2 |
| Al Yelayiss 5 | 2 | 0 | 0 | 0 | 0 | 2 |
| Jumeirah Garden City | 2 | 2 | 0 | 0 | 0 | 0 |
| JABEL ALI HILLS | 2 | 2 | 0 | 0 | 0 | 0 |
| Al Maha | 2 | 0 | 0 | 0 | 0 | 2 |
| Nad Al Shiba Third | 2 | 0 | 0 | 0 | 0 | 2 |
| Lakes - Hattan III | 2 | 0 | 0 | 0 | 0 | 2 |
| Jabal Ali First | 1 | 0 | 0 | 0 | 0 | 1 |
| Dubai Health Care City Phase 1 | 1 | 1 | 0 | 0 | 0 | 0 |
| DUBAI HILLS - PALM HILLS | 1 | 0 | 0 | 0 | 0 | 1 |
| Remraam | 1 | 1 | 0 | 0 | 0 | 0 |
| Al Warsan Second | 1 | 0 | 0 | 0 | 0 | 1 |
| Al-Cornich | 1 | 0 | 0 | 0 | 0 | 1 |
| Business Park | 1 | 1 | 0 | 0 | 0 | 0 |
| Hatta | 1 | 0 | 0 | 0 | 0 | 1 |
| Dubai Studio City | 1 | 1 | 0 | 0 | 0 | 0 |
| Al Hebiah Fifth | 1 | 1 | 0 | 0 | 0 | 0 |
| Ras Al Khor Industrial First | 1 | 0 | 0 | 0 | 0 | 1 |
| Mena Jabal Ali | 1 | 0 | 0 | 0 | 0 | 1 |
| Wadi Al Safa 2 | 1 | 0 | 0 | 0 | 0 | 1 |
| Dubai International Airport | 1 | 0 | 0 | 0 | 0 | 1 |
| Madinat Hind 1 | 1 | 1 | 0 | 0 | 0 | 0 |
| Global Village | 1 | 1 | 0 | 0 | 0 | 0 |
| Wadi Al Safa 4 | 1 | 1 | 0 | 0 | 0 | 0 |
| Al Layan1 | 1 | 0 | 0 | 0 | 0 | 1 |
| TOWN SQUARE | 1 | 1 | 0 | 0 | 0 | 0 |
| Al Safouh Second | 1 | 0 | 0 | 0 | 0 | 1 |
| Madinat Dubai Almelaheyah | 1 | 0 | 0 | 0 | 0 | 1 |
| Mudon | 1 | 1 | 0 | 0 | 0 | 0 |
| Hessyan Second | 1 | 0 | 0 | 0 | 0 | 1 |
| WARSAN FIRST DEVELOPMENT | 1 | 1 | 0 | 0 | 0 | 0 |
| Mushrif | 1 | 0 | 0 | 0 | 0 | 1 |
| Al Qusais Industrial Third | 1 | 0 | 0 | 0 | 0 | 1 |
| Zaabeel Second | 1 | 0 | 0 | 0 | 0 | 1 |
| Al Yufrah 1 | 1 | 0 | 0 | 0 | 0 | 1 |
| Al Faga'A | 1 | 0 | 0 | 0 | 0 | 1 |
| The Greens | 1 | 0 | 0 | 0 | 0 | 1 |
| Wadi Al Safa 3 | 1 | 0 | 0 | 0 | 0 | 1 |
| Umm Addamin | 1 | 0 | 0 | 0 | 0 | 1 |
| Al Wasl District | 1 | 1 | 0 | 0 | 0 | 0 |
| Saih Shuaib 1 | 1 | 1 | 0 | 0 | 0 | 0 |
| Hadaeq Sheikh Mohammed Bin Rashid | 1 | 0 | 0 | 0 | 0 | 1 |
| AL Athbah | 1 | 0 | 0 | 0 | 0 | 1 |
| Dubai Hills Estate | 1 | 1 | 0 | 0 | 0 | 0 |
| Lakes - Hattan I | 1 | 0 | 0 | 0 | 0 | 1 |
| Emaar's Street Of Dreams | 1 | 0 | 0 | 0 | 0 | 1 |
| Meydan | 1 | 0 | 0 | 0 | 0 | 1 |
| Sobha Seahaven - Tower B | 1 | 0 | 0 | 0 | 0 | 1 |
| Emirates Living | 1 | 0 | 0 | 0 | 0 | 1 |
| Nad Al Shiba | 1 | 0 | 0 | 0 | 0 | 1 |
| **total** | 15440 | 3671 | 1290 | 112 | 112 | 6857 |

## DXB rows that never reached a plot (by DLD area, top 25)

- Saih Shuaib 1: 1593
- Jabal Ali First: 1379
- Nad Al Sheba Third: 979
- Dubai South: 638
- Palm Jumeirah: 626
- Al Jaddaf: 597
- Al Merkadh: 547
- Dubai Hills Estate: 474
- Me'Aisem First: 442
- Jumeirah Village Circle (JVC): 391
- Mirdif: 329
- Warsan Fourth: 322
- Dubai Islands: 312
- Wadi Al Safa 2: 292
- Madinat Hind 4: 283
- Saih Shuaib 3: 282
- Wadi Al Safa 5: 281
- (location truncated): 281
- Nad Al Sheba First: 246
- Al Hebiah Fifth: 213
- Wadi Al Safa 3: 204
- Jumeirah Islands: 183
- Jumeirah Bay Islands: 182
- Al Mamzer: 173
- Jumeirah Frst: 168

## D5 precision sample — harvested JVC pins vs master-plan polygons

Random 50 of 847 JVC plots that have both a harvested `gmaps_q` pin and a master-plan polygon (seed 20261011). Distances in metres, planar EPSG:3997.

- pin → polygon edge (0 = inside): median **0.0 m**, p90 **0.0 m**, inside polygon 45/50
- pin → polygon centroid: median **6.3 m**, p90 **16.1 m**

**Caveat — not independent.** The JVC master-plan polygons were fitted to these same harvested pins (`jvc-masterplan/jvc/align.py` aligns the plan to `coords`), so this measures the fit, not real-world pin accuracy. An independent check needs ground truth we do not hold (assumed: the true error is larger; the 2026 advert-link sample gave median 907 m). Pins are therefore kept `approx`.
