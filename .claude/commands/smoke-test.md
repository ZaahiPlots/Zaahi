# SMOKE TEST — MANDATORY AFTER EVERY CHANGE
After ANY code change, BEFORE `git push`, run this checklist.

### Build
- [ ] `pnpm build` passes with no errors

### Map (`/parcels/map`)
- [ ] Map loads
- [ ] Plots (ZAAHI Plots) are visible as 3D buildings on the map
- [ ] 3D building colors match land use
- [ ] Clicking a plot opens the side panel with data
- [ ] Layers panel opens
- [ ] Panel is grouped by country → category (Dubai/Abu Dhabi/Other UAE/Saudi/Oman)
- [ ] Only the country the user is in (by map center) is expanded by default (on first open)
- [ ] Lock badges (🔒 GOLD / 🔒 PLATINUM) are visible next to master plans + DDA 99K + AD PMTiles + Oman PMTiles + Riyadh Zones; click on the badge opens /join#gold (Phase 3 will make them actually disabled)
- [ ] Search in the top panel filters all countries, force-expand when there are matches
- [ ] "ZAAHI Listings (114) — ALWAYS ON" indicator at the top of the panel
- [ ] By default ONLY ZAAHI Plots are visible (other layers off)
- [ ] DDA Districts, master plans, Communities, Roads are NOT loaded automatically
- [ ] Keyboard nav always works: W/A/S/D movement, Q/E rotation, Space/C height, R/F pitch, Shift speed boost; keys are ignored when focus is in input/textarea
- [ ] Toggling an individual layer works (on/off)
- [ ] Section checkbox (ALL) works
- [ ] Archibald (cat) icon is visible

### Auth (`/`)
- [ ] Sign-in page is displayed
- [ ] Sign In works for approved users
- [ ] Sign Up shows REQUEST SUBMITTED after registration
- [ ] An unauthenticated user does not see the map

### API
- [ ] `GET /api/layers/dda/dubai-hills` → 200 (no auth)
- [ ] `GET /api/parcels/map` → 401 (no auth, this is correct)

### Smoke test rules (in addition to AGENT RULES in CLAUDE.md)
- **RULE:** If ANY checklist item fails — do NOT push. Fix it first.
- **RULE:** NEVER remove functionality during refactoring. Optimize — yes. Delete working code — no.
- **RULE:** When refactoring large files (>500 lines) — first make a list of ALL functions in the file, and after refactoring verify that ALL functions are preserved. This rule exists because in one commit the agent accidentally deleted `loadZaahiPlots` (~270 lines) inside a bulk-replace of `attachOverlays`, and all plots disappeared from the map in production. The list of functions BEFORE refactoring is the only protection against this kind of regression.
