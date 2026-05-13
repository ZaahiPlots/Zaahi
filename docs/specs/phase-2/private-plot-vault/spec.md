# Private Plot Vault — Full Spec

**Status:** Draft 2026-05-13. **Revised 2026-05-13** with founder additions (affection-plan ingress, verification gates, conflict detection, attribution, price history). No code changes, no schema migrations, no production deploys.
**Author:** ZAAHI agent (Claude Opus 4.7).
**Reviewer:** Zhan (founder).

---

## 1. Concept assessment first — is this the right shape?

The brief framed it as "Vault." That's the right marketing word — it signals privacy, control, trust. But internally the data model should be **pipeline**, because that's the operational reality the feature is replacing.

A working broker's WhatsApp + Excel today has columns like:

- Plot number
- Land use, area, location
- Source (DDA scrape / cold call / referral / off-market lead)
- **Stage** (Cold lead / Spoke to owner / Sent NDA / Negotiating / Term sheet / Signed / Listed publicly / Lost to competitor)
- Owner contact (phone, email, agent name)
- Notes, follow-up date
- Documents (title deed scan, affection plan)

The "Vault" framing gets us only column 1–4 + 7. The "pipeline" framing also gets us **stage** — the column that defines what the broker does next every morning. If we don't have stages, we're a slightly better Excel; if we do, we're a CRM the broker doesn't have today.

**Recommendation:** brand externally as "Private Vault" (privacy/trust signal), model internally as **stage-aware private inventory**. The stages can be very simple in MVP — just a `stage` enum on the entry, displayed as a kanban-ish list.

### Where I'd push back if I were the architect

- **"Storage" framing risks low engagement.** Brokers won't open ZAAHI daily just to look at a list of plots they uploaded. Vault needs activity surfaces: stage changes, owner-replied notifications, share recipient viewed it, etc. **Mitigation:** even MVP should have a basic activity feed.
- **"Selective share" complexity creep.** Per-user permission grids, expiry, revocation are real-CRM features, not MVP. **Mitigation:** MVP ships one permission level (view-only) and one expiry option (never; revocable).

### Fundamental issue I want to flag

The most subtle risk is **Vault cannibalizing Public Listings revenue.** ZAAHI's current revenue path is 0.25 % platform fee on closed Deals. If a broker uploads to Vault, shares with a buyer, the deal closes off-platform via WhatsApp anyway, ZAAHI sees zero. Three structural mitigations:

1. **Vault → Deal conversion is the only way to move money.** Make the in-app Deal flow strictly better than off-platform.
2. **Promote to Public is a one-click action** *after* verification (see §14). With verification gates, the friction is at *upload* and *first promote*, not at every subsequent action.
3. **Pricing model that taxes scale.** See §9.

With these in place, Vault grows the pie rather than cannibalizing the slice.

---

## 2. Where it lives in Master Tree v3.0

Master Tree is frozen — 12 blocks A through L, 85 modules. Private Plot Vault is a **new module under Block A (Assets)** — `A.10 Private Asset Vault`.

Interlocks with:

- **Block B (Participants)** — brokers and developers are the primary actors.
- **Block C (Transactions)** — Promote-to-Public and Vault-direct-Deal flow terminate in the existing Deal engine.
- **Block D (Technology, AI subsystem)** — Affection Plan PDF parsing reuses the existing Claude-vision `parse-title-deed` pattern (D.3 AI).
- **Block G (Compliance)** — PDPL on shared plot data. Verification documents (Contract / Title Deed) in private Supabase bucket with signed URLs.
- **Block H (Growth)** — Vault is the hook for broker onboarding in Phase 2.
- **Block I (Intelligence)** — Phase 2.3 AI features sit here. **Conflict detection (§15) is the first I-block feature in MVP** — market intelligence layer.
- **Block J (Ecosystem)** — Broker office accounts (multi-user vault) is a J.7 adjacency.

The feature legitimately touches 7 of the 12 blocks — a sign it's a real platform feature, not a side surface.

---

## 3. Data model

### 3.1 Identity decision — VaultEntry vs Parcel.visibility

Today the `Parcel` model has `@@unique([emirate, district, plotNumber])`. Vault breaks that — three brokers may all be tracking DDA plot 6457940 privately. **Option A (recommended): separate `VaultEntry` model**, now expanded with verification, affection-plan, conflict, attribution fields.

```
model VaultEntry {
  id           String          @id @default(cuid())
  ownerId      String
  owner        User            @relation("VaultEntryOwner", fields: [ownerId], references: [id])

  // ── Attribution (§16) ─────
  // addedByUserId == ownerId for direct uploads; differs when the entry
  // was created via "Add to my vault" on a shared entry.
  addedByUserId       String?
  addedBy             User?           @relation("VaultEntryAddedBy", fields: [addedByUserId], references: [id])
  importedFromShareId String?
  provenanceChain     Json?           // append-only [{ userId, nickname, addedAt }, …]

  // Plot identity
  emirate         String
  district        String
  plotNumber      String
  publicParcelId  String?
  publicParcel    Parcel?         @relation("VaultEntryPublicParcel", fields: [publicParcelId], references: [id])

  // Snapshot
  area         Float?
  latitude     Float?
  longitude    Float?
  geometry     Json?
  landUse      String?

  // ── Affection-plan source (§13) ─────
  affectionPlanSource           String?     // "dda" | "uploaded" | "manual"
  affectionPlanData             Json?       // mirrors AffectionPlan fields
  affectionPlanDocPath          String?     // Supabase Storage path (uploaded only)
  affectionPlanParseConfidence  Float?      // 0..1, Claude self-rating

  // Broker's data
  askingPriceFils  BigInt?
  ownerContact     Json?
  brokerNotes      String?       @db.Text
  stage            VaultStage    @default(LEAD)
  source           String?
  nextFollowUpAt   DateTime?

  // ── Verification (§14) ─────
  verificationStatus       VaultVerificationStatus @default(NONE)
  verificationFlow         String?      // "broker" | "owner"
  verificationDocsJson     Json?        // [{ kind, path, name, size, contentType }]
  identityMatchScore       Float?       // 0..1 — owner-flow name match
  verificationSubmittedAt  DateTime?
  verifiedById             String?
  verifiedAt               DateTime?
  verificationRejection    String?

  // Promote-to-Public
  promotedAt       DateTime?
  promotedParcelId String?

  // ── Conflict detection (§15) ─────
  conflictsWithOthers Boolean   @default(false)
  conflictedFields    Json?     // [{ field, values: [{ userId, value }] }]

  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  shares       VaultShare[]
  activity     VaultActivity[]
  priceHistory VaultPriceHistory[]

  @@unique([ownerId, emirate, district, plotNumber])
  @@index([ownerId])
  @@index([stage])
  @@index([publicParcelId])
  @@index([nextFollowUpAt])
  @@index([emirate, district, plotNumber])     // drives conflict detection
  @@index([verificationStatus])
}

enum VaultStage { LEAD CONTACTED NEGOTIATING AGREEMENT_SIGNED PROMOTED LOST CLOSED }
enum VaultVisibility { PRIVATE SHARED }
enum VaultVerificationStatus { NONE PENDING VERIFIED REJECTED }
```

### 3.2 Sharing model — unchanged from original

```
model VaultShare {
  id              String                @id @default(cuid())
  vaultEntryId    String
  vaultEntry      VaultEntry            @relation(fields: [vaultEntryId], references: [id], onDelete: Cascade)
  ownerId         String
  recipientUserId String
  recipient       User                  @relation("VaultShareRecipient", fields: [recipientUserId], references: [id])
  permission      VaultSharePermission  @default(VIEW)
  expiresAt       DateTime?
  revokedAt       DateTime?
  revokedReason   String?
  createdAt       DateTime              @default(now())
  lastViewedAt    DateTime?
  @@unique([vaultEntryId, recipientUserId])
  @@index([recipientUserId, revokedAt])
}

enum VaultSharePermission { VIEW FEASIBILITY OFFER }
```

### 3.3 Activity log — extended `kind` enum

New kinds: `price_changed`, `verification_submitted`, `verification_approved`, `verification_rejected`, `conflict_detected`, `conflict_resolved`, `imported_from_share`.

### 3.4 New model — VaultPriceHistory (§16.2)

```
model VaultPriceHistory {
  id           String      @id @default(cuid())
  vaultEntryId String
  vaultEntry   VaultEntry  @relation(fields: [vaultEntryId], references: [id], onDelete: Cascade)
  priceFils    BigInt
  setByUserId  String
  source       String      // "manual" | "import" | "promote-sync"
  note         String?
  createdAt    DateTime    @default(now())
  @@index([vaultEntryId, createdAt])
}
```

### 3.5 Migration impact summary

- 1 new enum (`VaultVerificationStatus`) added (3 already specified)
- 1 new model (`VaultPriceHistory`) added to the original 3
- 9 new fields on `VaultEntry` (5 verification, 4 affection plan, 2 conflict, 2 attribution)
- 1 new compound index on `VaultEntry(emirate, district, plotNumber)` for conflict detection
- **Parcel table still untouched** — guarantee preserved

---

## 4. Permissions model integration

Vault adds a **fourth tier** to the existing Public / Auth / Deal-Room model:

- `/api/me/vault/*` — auth + `entry.ownerId === userId`
- `/api/vault/shared-with-me/*` — auth + active `VaultShare` row
- `/api/vault/entries/[id]` — auth + (owner **OR** active share)
- `/api/me/vault/entries/[id]/verification` — owner-only
- `/api/admin/vault-verification/*` — ADMIN-only (Жан / Dymo)
- `/api/me/vault/conflicts/*` — owner of at least one matching entry sees redacted comparison

`404` (not `403`) on access denial — preserves the Deal-Room pattern. PDPL: other users' `brokerNotes` and `ownerContact` NEVER leak via conflict views (server-side enforced).

---

## 5. API surface

### 5.1 Core vault routes (preserved)

| Method | Path | Purpose |
|---|---|---|
| GET    | `/api/me/vault/entries`               | List + filter + paginate |
| POST   | `/api/me/vault/entries`               | Create entry |
| GET    | `/api/me/vault/entries/[id]`          | Detail (owner) |
| PATCH  | `/api/me/vault/entries/[id]`          | Update — emits `price_changed` + `VaultPriceHistory` row on price change |
| DELETE | `/api/me/vault/entries/[id]`          | Hard delete |
| POST   | `/api/me/vault/entries/[id]/promote`  | Requires `verificationStatus = VERIFIED` |
| GET    | `/api/me/vault/map`                   | GeoJSON for owned-layer |
| POST   | `/api/me/vault/entries/[id]/shares`   | Share |
| GET    | `/api/me/vault/entries/[id]/shares`   | List shares |
| POST   | `/api/me/vault/shares/[id]/revoke`    | Revoke share |
| GET    | `/api/vault/shared-with-me`           | "Shared with me" list |
| GET    | `/api/vault/shared-with-me/map`       | GeoJSON for shared layer |
| GET    | `/api/vault/entries/[id]`             | Polymorphic GET (owner full / share-recipient redacted) |

### 5.2 NEW — Affection-plan ingress (§13)

| Method | Path | Purpose |
|---|---|---|
| POST   | `/api/me/vault/plot-lookup`           | `{ source: "dda" \| "not_found", existing: VaultEntrySummary? }` |
| POST   | `/api/me/vault/parse-affection-plan`  | Body: `{ pdfPath }`. Claude-vision extractor. Returns `{ parsed, confidence, warnings }` |

### 5.3 NEW — Verification gate (§14)

| Method | Path | Purpose |
|---|---|---|
| POST   | `/api/me/vault/entries/[id]/verification`     | Submit `{ flow, docs }` → status PENDING |
| GET    | `/api/me/vault/entries/[id]/verification`     | Status + signed URLs |
| DELETE | `/api/me/vault/entries/[id]/verification`     | Withdraw (only while PENDING) |
| GET    | `/api/admin/vault-verification/queue`         | Admin queue |
| POST   | `/api/admin/vault-verification/[id]/approve`  | Approve → VERIFIED + notification |
| POST   | `/api/admin/vault-verification/[id]/reject`   | Reject with reason → REJECTED + notification |

### 5.4 NEW — Conflict detection (§15)

| Method | Path | Purpose |
|---|---|---|
| GET    | `/api/me/vault/conflicts`                  | All caller's entries currently in conflict |
| GET    | `/api/me/vault/conflicts/[plotNumber]`     | Redacted detail: `{ entries: [{ addedByNickname, priceFils, area, landUse, addedAt }, …] }`. Excludes broker notes + owner contact. |

### 5.5 Modified existing route

`/api/parcels/submit` — adds optional `target: "vault" | "public"` (default `"public"`). When vault, creates VaultEntry instead.

No middleware changes. No `/api/layers/*` changes.

---

## 6. UX flow

### 6.1 Upload wizard — REVISED for plot-number-first + affection-plan path

```
Step 1 — Plot number (MANDATORY first input)
  → POST /api/me/vault/plot-lookup
  → branches:

  A) DDA hit
     Map preview from DDA scrape.
     Auto-filled: area, geometry, landUse.
     [Continue]

  B) Not in DDA
     "This plot isn't in DDA. To add it, upload its official
      Affection Plan PDF (NOT a Site Plan, NOT a DCR extract —
      the Affection Plan with coordinate table)."
     [Upload Affection Plan PDF]   [What's an Affection Plan?]
     → vault-affection-plans bucket via signed URL
     → POST /api/me/vault/parse-affection-plan
     → editable parsed result with confidence indicator
     [Continue]

Step 2 — Where?
  ◯ Public Listing — REQUIRES verification (§14)
  ◯ Private Vault  — only you (+ shared recipients)

  Note: Public still creates a VaultEntry FIRST. After
  verification, auto-promoted. (Single ingress path.)

Step 3 — Details
  Asking price, source, stage, follow-up date, owner contact,
  broker notes.

Step 4 — Verification (only if Step 2 was "Public")
  ◯ I'm the OWNER → upload Title Deed + ID (server runs
                    name-match against deed; admin verifies)
  ◯ I'm a BROKER  → upload Contract + ID + RERA permit
                    (admin verifies)

  OPTIONAL when target=Vault. Broker can submit later before
  promoting.

Step 5 — Confirm
  Side-by-side preview + 3D building projection.
  [Add to my vault]
```

After "Add", the 3D building appears on the map — only the uploader (and shared recipients) sees it. If conflict detected (§15), banner appears.

### 6.2 Vault tab on `/parcels/map` — unchanged structurally

Two new layer toggles ("My Vault" / "Shared with me"). Conflict banner appears in side panel when `conflictsWithOthers = true`.

### 6.3 Vault list view at `/vault` — REVISED with attribution + price edit

Columns: plot number, district, stage, asking price (**inline editable**), next follow-up, share count, **verification badge**, **conflict indicator**, **attribution badge** ("Added by you" / "From @nickname").

Inline price edit: click price cell → text field → Enter saves via PATCH → emits `price_changed` + `VaultPriceHistory` row.

New tab: **"Conflicts (N)"** — caller's entries currently in conflict.

### 6.4 Share flow — unchanged

Recipients see provenance chain — "Originally added by @nickname • shared with you by @other" in SidePanel header.

### 6.5 Promote to Public — REVISED with verification gate

```
[ Promote to Public Listing ]

  ⚠ Verification required.

  ◯ NOT submitted yet
    [ Submit Title Deed (owner) ]
    [ Submit Contract (broker) ]

  ◯ PENDING (submitted YYYY-MM-DD)
    Status: awaiting admin review.

  ◯ VERIFIED on YYYY-MM-DD
    [ Promote to Public Listing ] ← enabled
```

Click on "Promote" with status ≠ VERIFIED redirects to the verification submission UI.

### 6.6 Conflict detection UI (§15)

Banner in side panel when `conflictsWithOthers = true`:

```
⚠ Other users also have this plot in their vaults with different
  data. (2 other entries — see details)

  [ View conflicts ]
```

Detail modal shows redacted comparison:

```
Plot 6457940 — Al Barari
Your data:           AED 50 M    1,200 sqm    Residential
@aigerim (broker):   AED 48 M    1,200 sqm    Residential
@unknown_dev:        AED 65 M    1,400 sqm    Mixed Use

Note: other users' broker notes and owner contacts are private.
```

No automatic resolution in MVP. Phase 2.2 may add admin-resolved DISPUTED status.

---

## 7. Map rendering implications — unchanged from original spec

- Mine: dashed gold outline, `fill-extrusion-opacity: 0.85` (literal)
- Shared: dotted teal outline, `fill-extrusion-opacity: 0.55` (literal)
- **Conflict markers** — separate `symbol` layer (`vault-conflict-markers`) draws a small red corner-bug on polygons where `conflictsWithOthers = true`

PMTiles + ZAAHI Signature 3D unchanged.

---

## 8. Feasibility tools integration — unchanged

Feasibility calculator adapter accepts VaultEntry shape. For uploaded affection plans, feasibility reads `affectionPlanData` Json (mirrors AffectionPlan Prisma model).

---

## 9. Pricing model — unchanged

Four options (full table in original spec). Recommendation still **Option 3 (Freemium with AI features as paid)**. Conflict detection is borderline AI/intelligence — could either be free MVP or part of paid tier; founder picks.

---

## 10. Phasing + estimate — REVISED

| Phase | Scope | Estimate |
|---|---|---|
| **2.1 MVP+** | Core vault loop + **Affection-plan ingress for non-DDA + verification gate + attribution + price edit + price history + conflict lite (banner only)** | **17–21 days** |
| **2.2 Pipeline depth + Conflict full** | Kanban · stage automation · per-permission share · email digest · CSV import · **full conflict resolution (DISPUTED state, market intelligence dashboard)** | 10–14 days |
| **2.3 Intelligence** | AI smart-categorize · prospect scoring · market alerts · team accounts · paid tier launch | 3–4 weeks |
| **2.4 Mobile** | iOS / Android pipeline app | Separate spec |

**Total to ship Phases 2.1–2.3: 8–10 weeks** of focused work (was 6–8 in original; affection-plan parser + verification gate adds ~1 week to MVP). MVP demo-ready in week 3.

### MVP scope re-evaluation

Some pushback worth considering:

- **Affection Plan parsing IS feasible in MVP** because `parse-title-deed` already exists as a working Claude-vision template. Same pattern, different prompt. ~5 days. UNCERTAIN risk in extraction accuracy → mitigated by confidence score + user-review step (§13.4).
- **Verification gate IS feasible in MVP** because the admin queue + PlotClaim verification pattern already exists. ~3 days, LOW risk.
- **Attribution, price edit, price history** are cheap. ~2 days combined.
- **Conflict detection FULL is risky in MVP.** Design questions (DISPUTED semantics, admin flow, market dashboard) need more thought. **Recommend "lite" version in MVP** (informational banner only) ~2 days; full version in 2.2.

MVP+ = original (10–14) + ~7 days additions = **17–21 working days.** Realistic.

---

## 11. Risks & edge cases — REVISED

### High-risk

- **R1 — Public-listing cannibalization.** Unchanged. Mitigation: §1.
- **R2 — PDPL on shared owner-contact PII.** Unchanged.
- **R9 [NEW] — Affection Plan parsing accuracy.** Vision LLM can hallucinate. **Mitigation:** confidence score (§5.2 returns `confidence: number`); UI shows "verify these values" prompt when < 0.8; broker edits before confirming; PDF preserved in bucket for re-extraction. Phase 2.2 admin re-review queue.
- **R10 [NEW] — Owner-flow name match.** Title Deed name may not exactly match user-typed (Arabic transliteration, middle names). **Mitigation:** Levenshtein fuzzy match (0.85 threshold for auto-pass; below → admin manual review). Phase 2.2 may add Arabic normalisation.

### Medium-risk

- **R3 — Two brokers claim same plot.** Now FORMALLY supported via §15.
- **R4 — Plot not in DDA.** Handled via Step 1 wizard branch B (Affection Plan upload).
- **R5 — Vault → Deal commission attribution.** Default: original sharer is Deal broker.
- **R11 [NEW] — Conflict false positives.** Two brokers legitimately at AED 50 M and AED 50.5 M shouldn't trigger conflict. **Mitigation:** ≥ 5% relative tolerance on price, ≥ 2% on area, exact mismatch on land use.
- **R12 [NEW] — PII leak via conflict view.** MUST exclude `ownerContact` and `brokerNotes` from other users' entries. Server-enforced in conflict-detail handler.

### Low-risk

- R6 (UI clutter at scale), R7 (accidental promote), R8 (cohort role gating) — unchanged.
- **R13 [NEW] — Affection Plan PDF size.** Claude vision cap ~10 MB PDFs. Mitigation: client compression; 10 MB hard limit.

### Edge cases

- **Confidence 0.5 parse** → user sees in-line edit form pre-filled; submit emits `low_confidence_parse` flag for Phase 2.2 admin re-review queue.
- **Two users upload SAME Affection Plan PDF with different parsed values** → conflict detection catches it.
- **Broker uploads Affection Plan, plot later enters DDA scrape** → MVP keeps entry as-is. Phase 2.2 cron offers to sync.

---

## 12. Summary

Plot Vault with founder additions integrated has three differentiators:

1. **Non-DDA plot ingress via Affection Plan parsing** — covers Reem/Saadiyat/Maryah/off-plan inventory.
2. **Verification gates before public listing** — Contract for brokers, Title Deed for owners with name-match.
3. **Cross-user conflict detection** — unique market-intelligence layer. No UAE competitor does this.

MVP+ estimate: **17–21 working days**. Demo-ready week 3.

Founder decisions needed: 4 original + 4 new = **8 decisions** in `decisions.md`.

---

## 13. Affection Plan ingress design (NEW)

### 13.1 Why Affection Plan specifically

Founder explicitly distinguished:
- **Affection Plan** — official DLD/DDA document. Coordinate table, setbacks, FAR, max height, land use mix. Signed by surveying authority. **Only acceptable upload.**
- **Site Plan** — typically developer's proposed layout. Not authoritative. **Rejected.**
- **DCR (Detailed Construction Regulations)** — zoning ruleset. **Rejected.**

UI MUST surface this distinction. Upload widget copy: "Affection Plan PDF only — official DLD/DDA document with the plot's coordinate table. Not Site Plan or DCR extract." Plus a "What is an Affection Plan?" help modal with sample title-block image.

### 13.2 Parsing pipeline

1. **Client upload** → Supabase Storage signed URL → `vault-affection-plans/<userId>/<uuid>.pdf`
2. **Client invokes** `POST /api/me/vault/parse-affection-plan { pdfPath }`
3. **Server side** (Node runtime):
   - Verify caller owns the upload (path starts with their userId)
   - Generate signed read URL
   - Call Claude vision API (mirrors `/api/parcels/parse-title-deed`):
     - System prompt: "You are a Dubai Affection Plan extractor. Extract coordinate table, setbacks, FAR, max height, plot area, land use mix. Return JSON only."
     - Schema mirrors AffectionPlan Prisma model
     - Includes self-rated `confidence: number`
   - Validate: required fields present, geometry is valid GeoJSON Polygon, values in plausible ranges
   - Return `{ parsed, confidence, warnings }`
4. **Client reviews** parsed values in editable form (especially if confidence < 0.8)
5. **Client confirms** → POST creates VaultEntry with `affectionPlanData` embedded

### 13.3 Cost & latency

- ~$0.02–0.05 per parse (Claude vision call)
- 5–15 seconds per typical 2–3 page Affection Plan PDF
- Rate-limit: 10 parses per user per hour

### 13.4 Failure modes

- **PDF unreadable/corrupted** → 400 `{ error: "parse_failed", reason: "unreadable_pdf" }`
- **Wrong document type** (Site Plan, DCR) → LLM detects (no coord table) → 400 `wrong_document_type` + re-show help modal
- **Coords outside UAE bounds** → validation rejects (hallucination)
- **Self-intersecting geometry** → validation rejects

### 13.5 Storage

- `vault-affection-plans` private Supabase bucket, signed URLs only, TTL 7 days
- Path: `<userId>/<uuid>.pdf`
- PDPL: broker's plot inventory. Never world-readable. Admin can read for dispute resolution.

### 13.6 MVP scope cut

MVP supports happy path: Claude-vision extraction + client edit + confirm. Deferred to Phase 2.2:
- Manual entry fallback (broker types coords by hand)
- Admin re-review queue for low-confidence extractions
- Multi-page cross-page coordinate tables
- Active detection-and-block of non-Affection-Plan uploads (instead of error)

---

## 14. Verification gate design (NEW)

### 14.1 Two flows

**Broker flow:**
- Required: Contract (broker authorisation, RERA-stamped) + government-ID
- Optional: RERA permit number (often already in `User.reraLicense`)
- Admin checks: contract valid + current, identity matches User account, plot number on contract matches VaultEntry
- Target SLA: 24h

**Owner flow:**
- Required: Title Deed + government-ID
- Server-side automatic: name-match between `User.name` and Title-Deed-registered-name (extracted via existing `parse-title-deed` route)
- Match score (Levenshtein normalised 0..1):
  - ≥ 0.92 — auto-pass (admin sees "high confidence" badge, still has final call)
  - 0.85..0.92 — admin review with score
  - < 0.85 — admin review with "low confidence" flag
- Admin can override either way

### 14.2 Admin queue surface

New tab on existing `/admin/queue`: **"Vault Verifications (N)"**:
- VaultEntry summary (plot, district, asking price, owner)
- Flow type (broker/owner)
- Uploaded docs (signed URLs)
- Owner flow: side-by-side name-match + score
- [Approve] / [Reject with reason]

Reuses existing admin queue chrome — no new admin route shell.

### 14.3 Notifications

- On submit: in-app to admins ("New vault verification — @nickname")
- On approve: in-app + email to user ("You can now promote to public listing")
- On reject: in-app + email with reason ("Verification needs more info: <reason>")

### 14.4 Storage

- `vault-verification-docs` private Supabase bucket, signed URLs TTL 7 days
- Reuses signing helper from `registration-docs`
- PDPL: admin role check on every read

### 14.5 Re-submission

Rejected entries can re-submit. New `verificationDocsJson` array (history preserved in VaultActivity events). Status flips PENDING again.

### 14.6 Verification expiry

MVP: no auto-expire. Phase 2.2: 1-year for Contracts (RERA renews annually), 5-year for Title Deeds. Expired drops to NONE + notification.

---

## 15. Conflict detection design (NEW)

### 15.1 What triggers detection

A conflict exists between VaultEntry rows when:
1. **Same** `(emirate, district, plotNumber)` tuple
2. **Different** `ownerId`
3. **At least one** of these fields disagrees: `askingPriceFils`, `area`, `landUse`, significant `geometry`, `affectionPlanData.maxFloors`

### 15.2 Detection mechanism — MVP lite

`src/lib/vault-conflict.ts` exports `recomputeConflictsForPlot(emirate, district, plotNumber)`. Called from:
- POST `/api/me/vault/entries` after create
- PATCH `/api/me/vault/entries/[id]` if conflict-relevant field changed
- DELETE `/api/me/vault/entries/[id]` to clear conflicts

Recompute:
- Fetch all entries for tuple
- If count < 2 → all `conflictsWithOthers = false`
- If count ≥ 2 → pairwise field comparison; set flag + populate `conflictedFields`

Time complexity: O(N) per plot tuple, N typically 1–5. Compound index `[emirate, district, plotNumber]` makes lookup fast.

Activity: `conflict_detected` / `conflict_resolved`.

### 15.3 User-facing surface — MVP

Banner in side panel + /vault list page conflict indicator + "Conflicts" tab on /vault. Detail modal (§6.6) shows redacted comparison.

### 15.4 Deferred to Phase 2.2

- **Full DISPUTED status** — admin-flagged disputes blocking promotion until resolved
- **Market intelligence dashboard** — aggregate view of how often plots have conflicts, which districts have most disagreement, average price-spread
- **Owner-can-claim resolution** — verified owner's version takes precedence

### 15.5 False-positive tolerances

- Price: > 5% relative difference (50M vs 50.5M = 1% = no conflict)
- Area: > 2% relative difference
- Land use: exact-string mismatch
- Max floors: any integer difference

Tolerances live in `src/lib/vault-conflict.ts` as named constants — easy to tune.

---

## 16. Attribution + Price History (NEW)

### 16.1 Attribution

Three surfaces:
1. **Direct upload** — `addedByUserId === ownerId`. Label: "Added by you" (or omit if only attribution).
2. **Imported from share** — `addedByUserId !== ownerId`, set when user clicks "Add to my vault" on a shared entry. Label: "Added from share by @<addedBy.nickname>".
3. **Provenance chain** — if the source entry was itself imported, chain preserved in `provenanceChain`. Breadcrumb: "@first → @second → you".

MVP: surfaces 1 + 2. Surface 3 (multi-hop chains) is Phase 2.2.

### 16.2 Price edit + history

Every PATCH that changes `askingPriceFils`:
- Writes `VaultPriceHistory` row (new value, actor, source = "manual", optional note)
- Emits `price_changed` activity
- Refreshes conflict detection (price is conflict-relevant)

UI:
- **Inline edit** — click price in list/side panel → text input → Enter saves → toast
- **Price history** — expandable section in side panel: "Price history (3 changes)" → table of timestamps + values + notes
- **Sparkline** — Phase 2.2 polish: mini chart on list view

Edit is owner-only. Share recipients see current price, not history.

---

## 17. Constraints — verified

| Constraint | This spec |
|---|---|
| Master Tree v3.0 frozen | A.10 only; no other modifications |
| ZAAHI Signature 3D | Untouched |
| `fill-extrusion-opacity` literal | All three layers (mine 0.85, shared 0.55, conflict-markers symbol) — literal |
| Auth flow / `src/app/page.tsx` | Untouched |
| `/api/layers/*` | Untouched |
| `page.tsx` map page edits | Additive — new layers + tabs only |
| `schema.prisma` | 1 new enum + 4 new models + 9 new fields on VaultEntry + 4 back-relations. No existing field/index changed. |
| `prisma migrate deploy` in prod | Migration scripted; not applied |
| Cohort role gating | OWNER / BROKER / DEVELOPER get vault; verification flows are role-tagged |
| Reuses `parse-title-deed` Claude-vision pattern | Yes — parse-affection-plan is sibling route, same shape |
| Reuses PlotClaim admin queue pattern | Yes — vault verification queue is new tab in `/admin/queue` |
