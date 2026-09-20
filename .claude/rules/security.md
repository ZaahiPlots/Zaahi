---
paths:
  - "src/app/api/**"
  - "src/middleware.ts"
  - "src/app/page.tsx"
  - "src/components/AuthGuard.tsx"
  - "src/lib/auth.ts"
  - "src/lib/api-fetch.ts"
---

## SECURITY RULES - DO NOT MODIFY
- Sign Up is allowed but every new account is created with `user_metadata.approved = false`
- After signup the client is signed out immediately and the "REQUEST SUBMITTED" pending screen is shown
- A user can only enter the app after an admin sets `user_metadata.approved = true` (Supabase dashboard)
- The auth page at `src/app/page.tsx` MUST keep both tabs as `(['signin', 'signup'] as Mode[]).map(...)` — no extra brackets, no JSX-text glitches
- NEVER modify `src/app/page.tsx` auth flow without explicit permission from the founder
- All protected pages MUST be wrapped in `<AuthGuard>` from `src/components/AuthGuard.tsx`
- NEVER remove `<AuthGuard>` from a protected page
- All sensitive API routes MUST call `getApprovedUserId(req)` from `src/lib/auth.ts` (NOT plain `getSessionUserId`)
- All NEW API routes MUST use `getApprovedUserId(req)` by default. The only exception is a route explicitly marked as public (e.g. `/api/notify-admin`) — and that requires a written justification in the route file's top comment
- Browser code MUST call protected APIs through `apiFetch` from `src/lib/api-fetch.ts` so the Bearer token is attached automatically
- Middleware `PUBLIC_API` allow-list is intentionally tiny: only `/api/auth` and `/api/notify-admin`. Do NOT add to it without a written reason
- Layers API (`/api/layers/*`) MUST remain public (no auth required). GET / HEAD requests to `/api/layers/*` are public-domain geographic data — community boundaries, road network, master plans, all 206 DDA districts. NEVER add auth checks to layer route handlers. NEVER remove the `/api/layers/` exception from `src/middleware.ts`
- NEVER expose user emails, phone numbers, or other personal data in API responses to non-admin users. Strip PII fields server-side before returning. Admin endpoints must be explicitly gated by a role check, not just by approval
- Do NOT modify auth pages without explicit permission
