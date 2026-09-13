# Agent log — index

One row per session file. Newest at the bottom.

| Date | File | Branch | Summary |
|---|---|---|---|
| 2026-09-12 | `2026-09-12-masterplans-phase-a.md` (on `feat/masterplans-viewer`, unmerged) | `feat/masterplans-viewer` | Phase A: JVC + JVT as sign-in-gated iframe pages; rebased onto `5561a9f`; dropped in favour of the map-layer approach. |
| 2026-09-12 | `2026-09-12-masterplans-phase-b1.md` (on `feat/masterplans-layer`, unmerged) | `feat/masterplans-layer` | Phase B.1 mapping design: `docs/specs/masterplans-layer-mapping.md`, decisions D1–D10 pending. |
| 2026-09-13 | [2026-09-13-admin-pause-subscription.md](2026-09-13-admin-pause-subscription.md) | `feat/admin-pause-subscription` | Phase 1 recon: access model (Supabase `user_metadata.approved` + Prisma `User` with no status field), same-day fallback = flip `approved=false` in the Supabase dashboard (API 401 immediately, shell ≤1 h), proposal for `accessStatus` + audit + `/admin/users`. Waiting for "go". |
