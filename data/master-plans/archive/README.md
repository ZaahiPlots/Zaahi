# Master-plan archive

This directory holds master-plan KMLs that arrived in the
`data/master-plans/kadastr/` drop but are byte-identical duplicates
of KMLs already tracked under `data/layers/`. They are kept purely
for provenance — the active layers are served from `data/layers/`
through `src/app/api/layers/masterplans/*/route.ts`.

## Files (all SHA-256 identical to the tracked counterpart)

| Archived file                                                        | Tracked counterpart                              |
| -------------------------------------------------------------------- | ------------------------------------------------ |
| `01_Meydan Horizon Master plan.kml`                                  | `data/layers/01_Meydan_Horizon_Master_plan.kml`  |
| `02_AL FURJAN MASTERPLAN new.kml`                                    | `data/layers/02_AL_FURJAN_MASTERPLAN_new.kml`    |
| `03_DUBAI_ISLAND_master_plan.kml`                                    | `data/layers/03_DUBAI_ISLAND_master_plan.kml`    |
| `05_Pearl Jumeirah master plan.kml`                                  | `data/layers/05_Pearl_Jumeirah_master_plan.kml`  |
| `06_D11 - Parcel L D.kml`                                            | `data/layers/06_D11_-_Parcel_L_D.kml`            |
| `07_Master Plan of IC3 - International City Phase 2 and 3.kml`       | `data/layers/07_International_City_Phase_2_3.kml` |
| `08_Residential District – Phase I, II Committed Plots.kml`          | `data/layers/08_Residential_District_Phase_I_II.kml` |

The sibling kadastr file `04_Nad Al Hammer - Master Plan.kml` had no
tracked counterpart and was ingested as a new layer at
`data/layers/04_Nad_Al_Hammer_master_plan.kml`, served by
`src/app/api/layers/masterplans/nad-al-hammer/route.ts`.

Do NOT delete — these are founder source material.
