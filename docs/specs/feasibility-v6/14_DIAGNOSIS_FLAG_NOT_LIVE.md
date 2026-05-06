---
title: Feasibility v6.0 — Why v6 isn't visible despite the deploy
audience: Founder Dymo + Zhan
status: ROOT CAUSE IDENTIFIED — fix is one Vercel action
revision: rev-1
date: 2026-05-06
related: 13_DEPLOY_STATUS.md
classification: CONFIDENTIAL — internal
---

# Diagnosis — v6 not rendering on zaahi.io

**TL;DR:** the env var was not set on Vercel **at the moment Vercel built the deploy**. `NEXT_PUBLIC_*` env vars are inlined into the client bundle at **build time**, not read at runtime. Setting the env var afterwards doesn't retroactively change the bundle. **Fix: redeploy from Vercel dashboard (or push any commit) so a fresh build picks up the env var.**

---

## Evidence chain

### 1. Production chunk hash unchanged since post-merge build

Current `/parcels/map` references the chunk `parcels/map/page-a9c3e0f6a3d1e6db.js` — **the exact same hash as my Phase 2 detection** ~80 minutes ago, when the env var was definitely not set yet (founder hadn't added it).

If the env var had been set AND a new build had run, the hash would change because the build content changes (different code paths get compiled).

### 2. The flag is a runtime polyfill lookup, not an inlined constant

Inspecting the deployed `parcels/map/page-a9c3e0f6a3d1e6db.js`:

```js
let L="true"===t(75777).env.NEXT_PUBLIC_FEASIBILITY_V6_ENABLED;
```

`t(75777)` is webpack's `__webpack_require__(75777)`. Module 75777's body:

```js
75777:(e,t,r)=>{
  "use strict";
  var n,u;
  e.exports = (null==(n=r.g.process) ? void 0 : n.env) && "object"==typeof(...)
    ? r.g.process
    : r(68270)
}
```

That's the browser's `process` polyfill. In a browser, `globalThis.process` doesn't exist, so it falls back to module 68270 — an empty `process` shim with `env: {}`.

So at runtime: `L = "true" === undefined` → `L = false`. Calculator falls through to v5.

### 3. Local proof (compiled both ways)

I rebuilt `feature/feasibility-v6` locally twice with `pnpm build`:

| Build | Chunk size | Flag pattern in chunk |
|---|---|---|
| **Local with `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED=true`** | 208,626 bytes | String `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED` is **absent** — Next.js inlined the comparison to literal `true` and tree-shook the v5 path |
| **Local with env var UNSET** | 240,796 bytes | `let L="true"===t(75777).env.NEXT_PUBLIC_FEASIBILITY_V6_ENABLED;` (runtime polyfill lookup) |
| **Production deploy** | 240,796 bytes | `let L="true"===t(75777).env.NEXT_PUBLIC_FEASIBILITY_V6_ENABLED;` (identical to local-off) |

**Production matches the env-var-UNSET local build byte-for-byte.** The Vercel build was performed with `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED` unset.

### 4. Vercel cache headers

`/parcels/map` response carried:

```
x-vercel-cache: HIT
age: 3357
```

The response is being served from Vercel's edge cache, age ~56 minutes — matches the post-merge deploy timestamp. No new build has invalidated this cache.

---

## What probably happened

Three possibilities, ranked by likelihood:

1. **Env var added to Vercel after the build was already running, and Vercel's auto-redeploy didn't fire.** Some Vercel configurations only auto-redeploy on git push, not on env-var change. The env var save was silent on the build pipeline.
2. **Env var saved on the wrong scope** (e.g. Preview only, not Production). Production builds use Production scope vars; if it's missing there, the env var is effectively unset at build time.
3. **Env var not saved at all.** The dashboard save action might have been interrupted or the form value didn't commit.

All three resolve the same way: **trigger a fresh Vercel build with the env var present in the Production scope at build time.**

---

## Fix — pick one

### Option A — Vercel dashboard "Redeploy" (recommended)

1. Verify env var is set:
   - Vercel → ZaahiPlots/Zaahi → Settings → Environment Variables
   - Confirm `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED` exists with value `true`
   - Confirm scope includes **Production** (the row should show "Production" or "Production, Preview, Development" etc.)
   - If missing or wrong: add / edit, save
2. Force a fresh build:
   - Vercel → Deployments → top-of-list (most recent production deploy)
   - Click the `…` menu on the right of that row
   - Click **Redeploy**
   - In the dialog: **uncheck "Use existing Build Cache"** (so the env var change is picked up)
   - Click Redeploy
3. Wait ~3–5 min for the build → green
4. Confirm to me in the chat: `redeployed`

### Option B — Push a trivial commit (if dashboard redeploy is awkward)

Any commit to `main` triggers Vercel auto-deploy. If you'd like me to push a no-op commit (e.g. a comment update in `FeasibilityV6Calculator.tsx`), confirm and I will. But before pushing I still need the env var to be saved on Production scope; otherwise we'll just rebuild the same problem.

### Option C — I push a no-op commit AND you've already set the env var

If you've already set the env var and just need a build trigger, say `env var is set, push trigger commit`. I'll commit a calculator-scope no-op (one comment line) and push to `main`. Vercel rebuilds. Done.

---

## How to verify after the fix

After the redeploy completes, I'll:

1. Curl `https://www.zaahi.io/parcels/map` — confirm chunk hash changed (no longer `page-a9c3e0f6a3d1e6db.js`)
2. Fetch the new chunk — confirm `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED` is **absent** (proves env var inlined as `true` and v5 path was tree-shaken)
3. Confirm the bundle is smaller (~208 KB, down from 240 KB) — visible proof the v5 fallback was eliminated
4. Run the production smoke sweep (12 routes) one more time — sanity check
5. Final summary: "v6 LIVE on zaahi.io — calculator replaced"

Until then, production is on **v5 calculator** — exactly the same UX as before this whole effort. Zero user disruption.

---

## Why this isn't a code bug

The root cause is purely a **Vercel build-environment configuration**. The code is correct:

- `src/lib/feasibility-v6/featureFlag.ts` line 21:
  ```ts
  export const IS_FEASIBILITY_V6_ENABLED: boolean =
    process.env.NEXT_PUBLIC_FEASIBILITY_V6_ENABLED === 'true';
  ```
- Local build with the env var set inlines this correctly to `true` and ships v6.
- Local build with env var unset inlines to `false` and ships v5.
- Production matches the unset case.

No code changes needed. No commits needed (unless you want me to push a no-op to retrigger Vercel).

---

## Rollback safety unchanged

Even after we get v6 live, the rollback story is identical to before: flip the env var to `false`, force a redeploy, v5 returns within minutes. v5 calculator file (`src/app/parcels/map/FeasibilityCalculator.tsx`) has 0 lines changed in the entire feature branch, so the v5 path is byte-identical to today's production.
