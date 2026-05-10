# Phase C Step 1 — Notification Smoke Endpoint
## Session pause: 2026-05-07 (Dubai time)

### Branch state
- `feat/cohort-pilot` at `03c5143`
- Last commit: `03c5143 fix(cohort): use founder Gmail as test-notify recipient fallback`
- Working tree: pre-existing untracked items only — `.gitignore` (M), `.env.local.backup-2026-04-28-rotation` (??), `data/land-monitor/` (??), `data/raw/` (??). None introduced this session.
- Push state: pushed to `origin/feat/cohort-pilot`

### What's done
- Spec 05 v1.1 written and committed on `research/cohort-pilot-spec` branch (1447 lines, 18 sections, ratifications + corrections + gap resolutions)
- Smoke endpoint `/api/test-notify` created (commit `01a529b` on `feat/cohort-pilot`)
- Endpoint renamed from spec-stated `_test-notify` (Next.js excludes underscore folders from routing) — spec drift documented for v1.2
- 4 notification env vars added to Vercel **Production + Preview** scopes (`RESEND_API_KEY`, `FROM_EMAIL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_IDS`)
- Anon key migration on **PREVIEW SCOPE ONLY** (scoped to git branch `feat/cohort-pilot`): replaced legacy 208-char JWT format with new 46-char publishable key (hash `668d33ec9bc93615` → `38b9e7a7086fee1c`). Production + Development still on legacy.
- Discovered: Supabase deprecated legacy 208-char anon keys server-side — `auth.getUser()` rejects them → 403
- Smoke curl returned HTTP 200, `email.ok=true`, `telegram.ok=true` (msgIds 13 + 14 delivered to both founder Telegram chat IDs)
- First email **bounced** at Resend — bug in recipient resolution (`FROM_EMAIL` fallback was the sender address `noreply@zaahi.io`, not a deliverable mailbox). Fixed in commit `03c5143`.

### What's pending (next session)
- [ ] Verify email delivery to `zhanrysbayev@gmail.com` Inbox post-fix (commit `03c5143` deployment)
- [ ] Re-run smoke curl on new preview deployment with fresh JWT + bypass
- [ ] **CRITICAL**: migrate Production + Development scopes anon key from legacy 208-char to new 46-char publishable. Risks: live user sessions invalidated — Жан + Dymo will need to re-login. Update local `.env.local` also.
- [ ] Spec 05 v1.2 amendment:
  - §11.5 path `/api/_test-notify` → `/api/test-notify`
  - §11.5 add note about Vercel CLI v53.2 bugs (workarounds documented below)
  - §11.5 recipient fallback (founder Gmail not `FROM_EMAIL`)
- [ ] Phase C Step 2: Ambassador cleanup (delete old `AmbassadorApplication` code per spec §9, replace with cohort registration flow)
- [ ] Phase C Steps 3-12 still ahead (~38h estimated)

### Vercel CLI v53.2 bugs encountered (workarounds)
1. **`vercel env add NAME ENV` via stdin pipe silently records empty string.** The CLI reports "Added" successfully but the value is `""`. Workaround: use `--value` flag.
   ```bash
   vercel env add NAME production --value "$VAL" --yes
   ```
2. **`vercel env rm NAME ENV` on a shared multi-environment entry deletes from ALL environments**, not just the named one. This deleted `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Production + Development when only Preview was targeted. Recovery required immediate re-add to Production + Development. Workaround: re-add the others immediately after rm, OR use git-branch-scoped Preview entries from the start.
3. **`vercel env add NAME preview ...` in agent mode fails with `git_branch_required`** when no branch is specified. Workaround: pass branch as third positional arg, e.g. `vercel env add NAME preview feat/cohort-pilot --value VAL --yes`.

### Key context for resuming
- Preview alias URL: `https://zaahi-git-feat-cohort-pilot-zaahiplots-projects.vercel.app`
- Vercel deployment-protection bypass token: stored in founder password manager as "ZAAHI Phase C testing"
- JWT acquisition method: incognito browser → preview URL → login → DevTools Console →
  ```js
  copy(JSON.parse(localStorage.getItem('sb-sydmaxwjmwwnzbwvhrhn-auth-token')).access_token)
  ```
- Smoke curl pattern (saved for re-use):
  ```bash
  curl -X POST '<PREVIEW_URL>/api/test-notify' \
    -H 'x-vercel-protection-bypass: <BYPASS>' \
    -H 'Authorization: Bearer <JWT>' \
    -H 'Content-Type: application/json' \
    -d '{}'
  ```

### Files committed this session
- `docs/specs/phase-1/spec-05-cohort-pilot-v1.md` (v1.1, on `research/cohort-pilot-spec` branch — NOT pushed yet)
- `src/app/api/test-notify/route.ts` (commit `01a529b` — endpoint added, env-flag gated)
- `src/app/api/test-notify/route.ts` (commit `03c5143` — recipient fallback fix)

### Vercel state
- Production deployment: Sprint 9d feasibility-v6 (commit `e647288`, pre-cohort-pilot) — UNCHANGED
- Preview deployment latest: post-`03c5143` redeploy in progress OR Ready (check at session resume via `vercel inspect https://zaahi-git-feat-cohort-pilot-zaahiplots-projects.vercel.app`)
- Production env vars: 4 notification vars populated (sensitive, not pullable). Anon key still legacy 208-char.
- Preview env vars (branch `feat/cohort-pilot`): 4 notification vars + new 46-char publishable anon key.

### When founder returns, do this in order
1. Read this file
2. `git log -3 --oneline` (verify HEAD)
3. `git status` (verify clean tree modulo pre-existing untracked items)
4. Check Vercel preview Ready for commit `03c5143`:
   `vercel inspect https://zaahi-git-feat-cohort-pilot-zaahiplots-projects.vercel.app`
5. Founder regenerates `/tmp/jwt.txt` + `/tmp/bypass.txt` (one-line each, no quotes)
6. Re-run smoke curl (pattern above)
7. Verify email Inbox at `zhanrysbayev@gmail.com` + Telegram delivery to both chat IDs
8. If all green → propose Phase C Step 2 prompt (Ambassador cleanup per spec §9)
