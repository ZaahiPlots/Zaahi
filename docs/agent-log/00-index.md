# Agent log — index

One row per session file. Newest at the bottom.

| Date | File | Branch | Summary |
|---|---|---|---|
| 2026-09-12 | `2026-09-12-masterplans-phase-a.md` (on `feat/masterplans-viewer`, unmerged) | `feat/masterplans-viewer` | Phase A: JVC + JVT as sign-in-gated iframe pages; rebased onto `5561a9f`; dropped in favour of the map-layer approach. |
| 2026-09-12 | `2026-09-12-masterplans-phase-b1.md` (on `feat/masterplans-layer`, unmerged) | `feat/masterplans-layer` | Phase B.1 mapping design: `docs/specs/masterplans-layer-mapping.md`, decisions D1–D10 pending. |
| 2026-09-13 | [2026-09-13-admin-pause-subscription.md](2026-09-13-admin-pause-subscription.md) | `feat/admin-pause-subscription` | Phase 1 recon: access model (Supabase `user_metadata.approved` + Prisma `User` with no status field), same-day fallback = flip `approved=false` in the Supabase dashboard (API 401 immediately, shell ≤1 h), proposal for `accessStatus` + audit + `/admin/users`. **Phase 2 built the same day**: additive migration (not applied), single gate in `auth.ts`, `/api/me/access-status`, PauseGate + pause screen, `/admin/users` Pause/Resume with audit, e2e 45/45. Deployed: migration applied by founder, merged `d3ac718` (tag `pre-merge-2026-09-13` on `5561a9f`), pushed over HTTPS after the collaborator permission was granted; Vercel auto-deploys. |
| 2026-09-13 | [2026-09-13-admin-nav-users.md](2026-09-13-admin-nav-users.md) | `feat/admin-nav-users` | Shared admin nav (Queue / Users) in `src/app/admin/layout.tsx` so `/admin/users` is reachable from the queue; e2e 46/46; merged + pushed (pre-approved). |
| 2026-09-26 | [2026-09-26-dda-token-restore.md](2026-09-26-dda-token-restore.md) | none (Phase A only) | Vault DDA lookup 499 confirmed DDA-side (whole `/DDA/*` folder now token-walled); no public viewer/token path exists for `BASIC_LAND_BASE` (internal-only service per Esri metadata: SalesForce/Building Portal/MyLand) — STOPPED per task's own condition instead of building a token module. Full call-site table + founder decision pending. |
