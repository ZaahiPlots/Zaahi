# 2026-09-13 — Admin nav: reach /admin/users from the queue

Branch: `feat/admin-nav-users` (off `origin/main` @ `d3ac718`, HTTPS fetch).
Prompt: `~/Downloads/PROMPT_admin_nav_users_link.md`. Merge + push pre-approved.

## Problem
The map's Admin button (`src/app/parcels/map/page.tsx:8448-8455`) deep-links to `/admin/queue`,
so the `/admin` landing with the "Users" card was never seen. `/admin/*` pages had **no shared
nav**: `src/app/admin/layout.tsx` was only the `/api/admin/me` guard + gradient wrapper, and each
page carried its own heading.

## Change
- `src/app/admin/layout.tsx`: minimal `AdminNav` rendered by the layout on every `/admin/*` page —
  exactly two entries, Queue → `/admin/queue`, Users → `/admin/users`; same chrome as the queue
  `Tabs` (gold tint + gold text + 700 weight when active, uppercase 11 px, 150 ms transitions),
  active state from `usePathname()` (`aria-current="page"`), glass bar (`rgba(0,0,0,0.3)` + blur 16).
- `tests/e2e/admin-nav.spec.ts`: mocked admin on `/admin/queue` sees a "Users" link with
  `href="/admin/users"`, Queue current; clicking it lands on `/admin/users` with the roles swapped.
- No change to `src/app/page.tsx`, AuthGuard, admin API routes, or any other UI.

## Gates
| Gate | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `pnpm build` | exit 0 |
| `pnpm lint` | exit 0 — 0 errors, 12 pre-existing warnings |
| `pnpm test:e2e` (full, 12 spec files) | **46 passed** (45 + 1 new) |

## Merge + push (pre-approved)
See the outcome lines appended below by the same session.
