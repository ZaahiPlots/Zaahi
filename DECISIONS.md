# ZAAHI — Decision Log
Здесь агент записывает все архитектурные решения.

- **2026-09-26** — Vault DDA lookup ("This plot isn't in DDA" for 6489099 and every
  Dubai plot missing from our `Parcel` cache): confirmed DDA's `BASIC_LAND_BASE`
  ArcGIS layer answers HTTP 200 with a 499 "Token Required" body for every plot,
  including the control plot that worked tokenless on 2026-05-22 — same wall a
  parallel session hit on 2026-09-23 on `feat/plot-developer-registry`, now
  folder-wide (`/DDA/*` itself needs a token). Searched for how DDA's own public
  viewer gets a token: no such viewer exists for this layer — Esri's service
  metadata describes it as internal (SalesForce/Building Portal/MyLand); the one
  token-issuing page we already scrape (`getDdaToken()` for `DIS/MAIN_MAP`) is
  explicitly 403'd against this service. STOPPED per the task's own condition
  instead of building a token workaround — no `src/**` changes made. Founder
  decision open: ship an honest-error fix (map DDA 499/error-body to
  "unavailable", not "not_found", keep manual-entry fallback) vs. pursue real DDA
  API access. Full log: `docs/agent-log/2026-09-26-dda-token-restore.md`.
