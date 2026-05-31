# Session state — 2026-05-31

Snapshot for the next-session pickup. Working tree is clean on `main`,
all feature work merged + deployed.

## Current HEAD (main)

```
8907cf2  fix: force tool calls on navigation intent + stricter prompt
```

Live on production via Vercel (deploy `zaahi-ri5gdn31q`, Ready).
Domain `zaahi.io` serves this build.

## What landed today

### Vault refactor — five phases shipped

| Phase | Commit | What |
|---|---|---|
| 1 | `91acf40` (earlier this session) | `VAULT_PRIVATE` value added to `ParcelStatus` enum + hand-crafted migration `20260530132036_add_vault_private_status` (founder applied separately to prod DB with Vercel `DIRECT_URL`) |
| 2 | `0058f16` | DDA fetch parity — `fetchFullDdaData` chains BASIC_LAND_BASE + PlotInfo + BuildingLimit. `ensureVaultPrivateParcel` upserts `Parcel(VAULT_PRIVATE)` + `AffectionPlan` |
| Wizard step1 | `379ed69` | AddPlotWizard simplified to Emirate + Plot only (district pulls from DDA) |
| 3 | `bc20d23` | **Vault unified rendering** — VAULT_PRIVATE plots flow through ZAAHI_BUILDINGS_3D, same source as listings. `loadVaultMine`/`VAULT_MINE_*` deleted (~270 lines). Click branches on `isVault`. Wizard passes plan + buildingLimit through to skip DDA round-trip |
| 3.5 | `bdd3d2e` | **Append AffectionPlan + backfill** — fixes the early-return bug in `ensureVaultPrivateParcel` where stale plans were inherited. Idempotent `maybeAppendAffectionPlan` helper + `scripts/backfill-vault-affection-plans.ts` one-shot |
| 3.6 | `54d5a85` | Tier features carry `isVault` so the vault-only filter doesn't hide the 3D extrusions |
| (reverted) | `485711e` → `02e837f` | "PPV hidden by default" was merged then **reverted** — needs re-discussion (see open tail) |

### Archibald migration — Anthropic → OpenAI gpt-4o with tools

| Phase | Commit | What |
|---|---|---|
| 1 | `2232f35` | Backend `/api/archie` route. OpenAI Chat Completions API direct fetch (no SDK dep). System prompt UAE-RE expert + 6 tools (`fly_to_district`, `open_plot`, `highlight_plot`, `filter_by_land_use`, `filter_by_status`, `toggle_vault_only`). `OPENAI_API_KEY` in Vercel env (Prod + Preview + Dev) |
| 2 | `37b0e66` | Client integration. `src/lib/archie-tools.ts` shared types + `executeArchieTool` dispatcher. `mapControls` bridge in `page.tsx` (9 imperative handles). `ArchibaldChat` tool dispatch loop. `/api/archie/resolve-district` DB-driven district resolver. Legacy `/api/chat` (Anthropic) deleted. `ANTHROPIC_API_KEY` retained — still used by `/api/parcels/parse-title-deed` |
| tool-fix | `8907cf2` | **Server-side fix for tool hallucination** — stricter system prompt + navigation-intent heuristic that promotes `tool_choice: "required"` for EN/RU/AR action verbs. Permanent `[archie] finish:` log per turn |

## Production state

zaahi.io (commit `8907cf2`) serves:

- Vault entries render through the unified ZAAHI listing layer (3D buildings, land-use colour, opacity 1). Click on a vault plot opens `VaultSidePanelAdapter`.
- Archibald chat widget uses OpenAI gpt-4o. Tools wired to mapControls (camera, search, filter, vault-only toggle). Navigation-intent heuristic forces tool calls on RU/EN/AR action verbs.
- `vaultOnlyMode` lock button: when ON, shows only the caller's VAULT_PRIVATE rows. When OFF, vault + public listings both visible (the "hide by default" variant was reverted).
- `scripts/backfill-vault-affection-plans.ts` is shipped but **not yet run by the founder**. Existing vault plots with stale plans still have incomplete data until backfill runs.

## Open tails — for next session

### 1. Archie map control — needs founder verification

Phase 2 + tool-fix are live, but founder hasn't visually verified the
end-to-end loop on prod yet:

- `"покажи Arjan"` → camera should fly to Arjan.
- `"open plot 1340498"` → SidePanel should open + camera fly to that plot.
- `"только residential"` → ZAAHI buildings filter to RESIDENTIAL only.

Monitor `vercel logs` for the line `[archie] finish: <reason> tools: <count>`.
If `tools: 0` keeps recurring for nav prompts, the navigation-intent
heuristic needs widening (see `NAV_INTENT_RE` in
`src/app/api/archie/route.ts`). If `tools: 1+` but the map stays put,
the issue is in the client dispatch / mapControls bridge (verified
correct by inspection — would need fresh diagnostic).

### 2. Draggable Archie icon — NOT STARTED

Prompt is queued (founder request). Today's chat widget has a fixed
`position: absolute; right: 10px; bottom: 10px;` launcher inside the
map page. Founder wants it draggable so it doesn't overlap content.

Code site: `src/app/parcels/map/ArchibaldChat.tsx` (`.archibald-launcher`
+ `.archibald-window`). Plan: pointer-down + drag + localStorage
persistence for position; clamp to viewport.

### 3. "Add to Vault (+)" button — NOT STARTED

Founder request. Convenience entry-point — currently vault add flows
through the existing wizard chooser modal. Needs a single-click "+"
adjacent to the lock button (or in chrome) that jumps straight to the
AddPlotWizard with vault flow pre-selected.

Code site: `src/app/parcels/map/page.tsx` HeaderBar area, near the
vault-only lock button + AddPlotWizardModal mount at `addFlow === "vault"`.

### 4. PPV hidden by default — reverted, needs re-design

Commit `485711e` made vault plots hidden when the lock is OFF
(filter direction flipped to `isVault !== true`). Founder reverted via
`02e837f` because the UX of vault-only being the ONLY way to see your
own plots felt wrong.

Open question: should vault plots:
- (a) stay visible alongside listings (current behaviour),
- (b) be hidden by default with a small toggle / chip indicating their
  presence,
- (c) be visible but visually distinct (e.g. gold-tinted outline)?

Needs founder decision before any code change. Don't reintroduce the
reverted logic without explicit go-ahead.

### 5. Backfill script — not yet run on prod

`scripts/backfill-vault-affection-plans.ts` exists but founder hasn't
run it. Until then, vault plots added before Phase 3.5 (commit
`bdd3d2e`) may still have incomplete AffectionPlans, leading to 3D
buildings rendering as flat blocks for those specific plots.

Run command (after `vercel env pull .env.local` for prod creds):

```bash
pnpm exec tsx scripts/backfill-vault-affection-plans.ts
```

Has prod-host guard — refuses to run unless `DATABASE_URL` contains
the prod Supabase project ref.

## Repo state

- Working tree on `main`, clean (only the long-standing
  `.gitignore` modified state and unrelated untracked research
  artifacts under `docs/research/3d-buildings-pilot/` — none of
  today's work).
- All feature branches from today merged to main via fast-forward.
  No dangling commits.
- Env vars in Vercel (all three scopes): `OPENAI_API_KEY` (added
  this session), `ANTHROPIC_API_KEY` (retained for title-deed parser).

## Active memories worth re-reading next session

- `[[feedback_page_tsx_review_before_edit]]` — always present
  consolidated diff + invariants table before editing
  `src/app/page.tsx` or `src/app/parcels/map/page.tsx`.
- `[[env_dev_server_map_page]]` — `pnpm dev` OOMs on /parcels/map
  first compile; use `pnpm build`/`start` or hand testing to founder.
- `[[feedback_no_credential_commands]]` — never run CLI that prints
  tokens/keys/passwords. `vercel env ls` (metadata only) is OK.
- `[[reference_db_envs]]` — local `.env.local` DIRECT_URL ≠ prod.
  Verify with founder before any `migrate deploy` against prod.
