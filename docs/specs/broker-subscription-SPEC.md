# Broker Subscription — Build-Ready Spec

**Status:** Design ratified by founder 2026-06-02. **Build paused** —
ZAAHI has no licensed legal entity to attach a payment processor to.
Stripe (or any other gateway) requires a UAE-incorporated company
with the relevant licence. A bridge through **HiGrow Realty**
(friendly agency, their licence) is under consideration; decision
expected **2026-06-09 (Tuesday)**. The architecture and code outline
below is correct and ready — once the legal base is resolved,
implementation follows the build-order checklist in §11 verbatim.

**Branches consulted:**
- `research/broker-subscription` — pricing recon, schema design,
  Stripe integration outline, paywall scope.

**Audience:** Future implementer (founder + agent), reading this
once HiGrow / own-licence path is decided. Single source of truth —
do not re-research competitor pricing or re-design schema unless
the broker pain model or UAE regulation changes materially.

---

## 1. Intent (founder ratified)

Begin ZAAHI monetisation with **one role first — BROKER** — and
build a tier system extensible to OWNER / DEVELOPER / ARCHITECT /
INVESTOR / etc. **as data**, not as new code paths. The first
paying broker should be onboarded within a week of legal base
going live.

### Why broker first

1. Brokers in Dubai already spend AED 5,000–10,000/mo on Instagram
   ads alone, plus separate CRM (~1,800 AED) and per-lead purchase
   (AED 30–120 CPL). Existing willingness-to-pay.
2. ZAAHI's 461K-plot Filter Panel + DDA Site Plan PDF + Archie
   tooling is most directly relevant to broker prospecting workflows.
3. RERA-licensed brokers are already first-class in the schema
   (`User.reraLicense`, `User.brnNumber`, `UserRole = BROKER`,
    PlotClaim verification flow, `/dashboard` "Financials" tab gated
    on `role === "BROKER"`).
4. Other roles plug in later as a JSON capability bundle (see §3).

---

## 2. Competitor pricing reality (2026-06-02 web search)

Property Finder, Bayut Pro, dubizzle Property Pro all withhold
broker-package pricing publicly — quotes are sales-call gated. This
is a deliberate UAE proptech B2B posture and explicit non-finding,
not an information gap to fill later.

Publicly available reference points:

| Source | Datum | Note |
|---|---|---|
| theprimeads.com | AED 5–10K/mo Instagram ad burn typical | broker willingness-to-pay |
| Owner Leads Dubai | min 4 hrs/day/area outbound calling | per-region pricing model |
| Propphy.com (2026) | AED 30–120 CPL for quality lead | benchmark for "value per reveal" |
| Behomes CRM | ~$500 (~AED 1,850) /mo basic | CRM-only baseline, no proptech data |
| Huspy | **free** to brokers (mortgage commission revenue) | only direct competitor with public model |

**Implication:** transparent pricing is a differentiator. Founder
ratified the tier numbers below as a market-entry posture; they
remain unvalidated against actual broker quotes — see §12 flags.

---

## 3. Architecture — single core principle

**Capabilities live in `SubscriptionPlan.features` JSON, not in
code.** Adding a new role (DEVELOPER, ARCHITECT, …) or a new tier
is a row INSERT, not a code change. Capability checks read the
JSON and return boolean / quota remaining.

```
┌────────────────────────────────────────────────────────────────┐
│  SubscriptionPlan (1 row per tier per role)                    │
│  • forRole: BROKER | DEVELOPER | … | null  (null = any role)   │
│  • priceFils, intervalMonths, trialDays                        │
│  • features: { ownerContactsPerMo: 20, archieUnlimited: true } │
│  • stripeProductId, stripePriceId                              │
└─────────────────┬──────────────────────────────────────────────┘
                  │ 1:N
                  ▼
┌────────────────────────────────────────────────────────────────┐
│  Subscription (1 per user-plan instance)                       │
│  • status: TRIALING | ACTIVE | PAST_DUE | CANCELED | EXPIRED   │
│  • currentPeriodStart / currentPeriodEnd                       │
│  • stripeCustomerId, stripeSubscriptionId (webhook recon)      │
└────┬────────────────────────────────────────────────┬──────────┘
     │ 1:N                                            │ 1:N
     ▼                                                ▼
┌──────────────────────────────┐  ┌────────────────────────────┐
│ SubscriptionUsage             │  │ Payment                    │
│ • metric (e.g. owner_contacts │  │ • amountFils, status       │
│   _revealed)                  │  │ • provider (stripe / telr) │
│ • count, periodStart/End      │  │ • providerPaymentId        │
└──────────────────────────────┘  └────────────────────────────┘

+ SubscriptionEvent (audit log: created / renewed / canceled / …)
```

### Why JSON features

- New tier "Broker Pro+" with 200 reveals/mo → insert a row.
- New role DEVELOPER with `{plotProposalsPerMo: 30}` → insert a row.
- Cross-role bundles, seasonal promos, grandfathered pricing →
  all data, no migrations.
- Capability checks (`userHasFeature("csvExport")`) work for every
  role transparently.

### What stays code, not data

- Whether a feature *exists at all* (`csvExport` is referenced from
  the CSV export route handler) — code.
- The shape of features JSON for each role — documented in §6
  feature dictionary so frontend cards and backend checks agree.

---

## 4. Schema (Prisma, ready to migrate)

⚠️ **CLAUDE.md rule:** never modify `prisma/schema.prisma` without
explicit founder approval. The block below is the **proposed** addition
— do not paste-merge it. Founder reviews then `npx prisma migrate dev
--name broker_subscription_v1`.

```prisma
// ── ENUM additions ────────────────────────────────────────────

enum SubscriptionStatus {
  TRIALING    // 7-day free trial, no payment yet
  ACTIVE      // paid, period valid
  PAST_DUE    // payment failed, Stripe grace period (~23 h)
  CANCELED    // user canceled, but currentPeriodEnd not yet reached
  EXPIRED     // period ended, no renewal
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
}

// ── New models ────────────────────────────────────────────────

model SubscriptionPlan {
  id              String   @id  // human-readable: "broker_essentials_v1"
  name            String        // "Broker Essentials"
  forRole         UserRole?     // null = any role, BROKER = role-restricted
  priceFils       BigInt        // 49900 = 499.00 AED
  currency        String   @default("AED")
  intervalMonths  Int      @default(1)
  trialDays       Int      @default(7)
  features        Json          // see §6 feature dictionary
  stripeProductId String?       // Stripe linkage (created in dashboard)
  stripePriceId   String?
  isActive        Boolean  @default(true)
  isPublic        Boolean  @default(true)  // false → hidden from /billing
  createdAt       DateTime @default(now())

  subscriptions   Subscription[]

  @@index([forRole, isActive])
}

model Subscription {
  id                    String   @id @default(cuid())
  userId                String
  user                  User     @relation(fields: [userId], references: [id])
  planId                String
  plan                  SubscriptionPlan @relation(fields: [planId], references: [id])
  status                SubscriptionStatus
  startedAt             DateTime @default(now())
  currentPeriodStart    DateTime
  currentPeriodEnd      DateTime
  cancelAt              DateTime?
  canceledAt            DateTime?
  stripeCustomerId      String?
  stripeSubscriptionId  String?  @unique
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  usage                 SubscriptionUsage[]
  payments              Payment[]
  events                SubscriptionEvent[]

  @@index([userId, status])
  @@index([currentPeriodEnd])     // cron sweeps for expiry
}

model SubscriptionUsage {
  id              String   @id @default(cuid())
  subscriptionId  String
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
  metric          String          // "owner_contacts_revealed", "siteplan_pdfs_downloaded"
  count           Int      @default(0)
  periodStart     DateTime
  periodEnd       DateTime

  @@unique([subscriptionId, metric, periodStart])
  @@index([subscriptionId, periodEnd])
}

model Payment {
  id                  String   @id @default(cuid())
  userId              String
  subscriptionId      String?  // null for future one-off (transaction fees, etc.)
  subscription        Subscription? @relation(fields: [subscriptionId], references: [id])
  amountFils          BigInt
  currency            String   @default("AED")
  status              PaymentStatus
  provider            String          // "stripe" (later: "telr", "paytabs", "tap")
  providerPaymentId   String?  @unique
  metadata            Json?
  createdAt           DateTime @default(now())

  @@index([userId, createdAt])
}

model SubscriptionEvent {
  id              String   @id @default(cuid())
  subscriptionId  String
  subscription    Subscription @relation(fields: [subscriptionId], references: [id])
  type            String          // "created", "renewed", "canceled", "tier_changed", "quota_consumed"
  payload         Json
  createdAt       DateTime @default(now())

  @@index([subscriptionId, createdAt])
}
```

### `User` model relations to add

```prisma
model User {
  // … existing fields …
  subscriptions   Subscription[]
}
```

### Migration command

```bash
npx prisma migrate dev --name broker_subscription_v1
# in prod: npx prisma migrate deploy
```

⚠️ Reference [[reference_db_envs]]: confirm prod `DIRECT_URL` with
founder before any prod migration apply. Local DB is **not** prod.

---

## 5. Capability helpers (`src/lib/subscription.ts`)

```ts
import { prisma } from "@/lib/prisma";

export async function getActiveSubscription(userId: string) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["TRIALING", "ACTIVE", "PAST_DUE"] },
      currentPeriodEnd: { gt: new Date() },
    },
    include: { plan: true },
  });
}

export async function userHasFeature(
  userId: string,
  feature: string,
): Promise<boolean> {
  const sub = await getActiveSubscription(userId);
  if (!sub) return false;
  return (sub.plan.features as Record<string, unknown>)[feature] === true;
}

export async function userQuotaRemaining(
  userId: string,
  metric: string,
  perMoKey: string,
): Promise<number> {
  const sub = await getActiveSubscription(userId);
  if (!sub) return 0;
  const limit =
    ((sub.plan.features as Record<string, unknown>)[perMoKey] as number) ?? 0;
  const usage = await prisma.subscriptionUsage.findFirst({
    where: {
      subscriptionId: sub.id,
      metric,
      periodStart: { gte: sub.currentPeriodStart },
    },
  });
  return Math.max(0, limit - (usage?.count ?? 0));
}

export async function consumeQuota(
  userId: string,
  metric: string,
): Promise<boolean> {
  const sub = await getActiveSubscription(userId);
  if (!sub) return false;
  await prisma.subscriptionUsage.upsert({
    where: {
      subscriptionId_metric_periodStart: {
        subscriptionId: sub.id,
        metric,
        periodStart: sub.currentPeriodStart,
      },
    },
    create: {
      subscriptionId: sub.id,
      metric,
      count: 1,
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
    },
    update: { count: { increment: 1 } },
  });
  return true;
}
```

Usage pattern at a paywall point (e.g. Reveal Owner Contact button):

```ts
const remaining = await userQuotaRemaining(
  userId,
  "owner_contacts_revealed",
  "ownerContactsPerMo",
);
if (remaining <= 0) {
  return NextResponse.json(
    { error: "quota_exhausted", upgradePath: "/billing" },
    { status: 402 },
  );
}
await consumeQuota(userId, "owner_contacts_revealed");
// … return contact payload …
```

---

## 6. Feature dictionary

The keys both the frontend tier cards AND the backend capability
checks reference. Adding a new key requires (a) defining it here,
(b) referencing it from the gating code path, (c) populating it in
every relevant plan row.

### Boolean features (read by `userHasFeature`)

| Key | Meaning |
|---|---|
| `archieUnlimited` | Skip the 10-queries/day free limit |
| `csvExport` | Download filter results as CSV |
| `verifiedBadge` | Show "ZAAHI Verified Broker" badge on public profile + directory |
| `plotAnalytics` | $/sqft trends, comparable sales, plot history |
| `priorityArchie` | Skip queue when Anthropic rate-limits |
| `teamWorkspace` | Multi-seat agency workspace |
| `whiteLabelLinks` | Custom-branded parcel share links for clients |

### Quota features (read by `userQuotaRemaining`, decremented by `consumeQuota`)

| Key | Metric (usage row `metric`) | Default per tier |
|---|---|---|
| `ownerContactsPerMo` | `owner_contacts_revealed` | 0 (free) / 20 (Essentials) / 100 (Pro) / 500 (Agency) |
| `siteplanPdfsPerMo` | `siteplan_pdfs_downloaded` | 3 / 10 / 50 / 200 |
| `savedSearchAlerts` | (limit, not metered) | 0 / 5 / 50 / unlimited |
| `teamSeats` | (account-level) | 1 / 1 / 1 / 5 |

---

## 7. Tier matrix (founder-ratified pricing, NOT market-validated)

| Tier | AED/mo | Annual AED | trialDays | Features JSON |
|---|---:|---:|---:|---|
| **Free** | 0 | 0 | — | *(no Subscription row; defaults via missing-sub branch in helpers)* |
| **Broker Essentials** | **499** | 4,990 (1 mo free) | 7 | `{ownerContactsPerMo: 20, siteplanPdfsPerMo: 10, savedSearchAlerts: 5, archieUnlimited: true, verifiedBadge: true}` |
| **Broker Pro** | **1,499** | 14,990 (2 mo free) | 7 | `{ownerContactsPerMo: 100, siteplanPdfsPerMo: 50, savedSearchAlerts: 50, archieUnlimited: true, verifiedBadge: true, csvExport: true, plotAnalytics: true, priorityArchie: true}` |
| **Broker Agency** | **5,999** | 59,990 | 14 | `{ownerContactsPerMo: 500, siteplanPdfsPerMo: 200, savedSearchAlerts: null, archieUnlimited: true, verifiedBadge: true, csvExport: true, plotAnalytics: true, priorityArchie: true, teamWorkspace: true, whiteLabelLinks: true, teamSeats: 5}` |

⚠️ **Numbers unvalidated.** See §12 flag Q3.

---

## 8. Paywall design (free vs paid surfaces)

### Free for any signed-in approved user

- Browse map, all 461K plots
- Filter Panel — status / land use / area / GFA / FAR
- Hover popup card (plotNumber, area, mainLandUse, status)
- Side Panel — plot details **except Owner Contact section**
- Archie chat — **10 queries/day** hard limit
- Add to Vault (private)
- Site Plan PDF — **3/month**

### Gated (Broker Essentials and above)

| Surface | Gate mechanism | Quota / boolean |
|---|---|---|
| **Reveal Owner Contact** button on SidePanel | Lock icon → click → `userQuotaRemaining("ownerContactsPerMo")` then `consumeQuota` on confirm | quota |
| **Saved Search alerts** | `savedSearches.create` checks `userHasFeature("savedSearchAlerts")` and `count < limit` | quota+boolean |
| **Archie unlimited** queries | `/api/archie` route: skip 10/day check when `userHasFeature("archieUnlimited")` | boolean |
| **Site Plan PDF batch** | Already on `/api/parcels/[id]/plot-guidelines`; add quota check on batch endpoint | quota |
| **Verified Broker badge** | `serializeUserPublic` adds field when `userHasFeature("verifiedBadge")` | boolean |
| **CSV export** | New `/api/parcels/export` route gated | boolean |
| **Plot Analytics** | New `/parcels/[id]/analytics` page gated | boolean |
| **Team workspace** | Agency-only; new admin surface | boolean |

### Soft vs hard paywall

- **Soft** for first interaction: show the locked surface with a
  blurred/lock-icon overlay + "Subscribe to reveal" CTA. Don't
  block navigation, let the user explore around the locked control.
- **Hard** on quota exhaustion: return HTTP 402 (Payment Required)
  with `{ error: "quota_exhausted", upgradePath: "/billing" }`. UI
  surfaces a modal upgrade prompt.

### Free trial

7-day TRIALING Subscription created automatically on first signin
*for users who selected role BROKER during /register* — no credit
card. Day 5 reminder email. Day 7: subscription auto-transitions
to EXPIRED unless they enter a card via Stripe Checkout.

---

## 9. Stripe integration outline

⚠️ Stripe currently **cannot be onboarded** — no licensed UAE entity
to attach. See §0 status, §11 build-order step 2, §12 flag Q1.

When the legal base is resolved:

### Provider abstraction

`Payment.provider` is a string (`"stripe"` initially). Later
providers (Telr, PayTabs, Tap) plug in via the same field and
parallel webhook handlers. The `Subscription.stripeCustomerId` and
`stripeSubscriptionId` fields are Stripe-specific; future providers
add their own optional ID columns. Migration cost when adding a
second provider: ~50 LOC + new env vars + new webhook route. No
schema breakage.

### Flow

```
1. User on /billing clicks "Subscribe Essentials"
   → POST /api/billing/checkout { planId: "broker_essentials_v1" }
2. Server:
   a. Resolve plan from DB
   b. Find-or-create Stripe Customer (stripeCustomerId on User?)
      — see §11 step 5 for where the column lives
   c. Create Stripe Checkout Session:
      mode: "subscription"
      line_items: [{ price: plan.stripePriceId, quantity: 1 }]
      success_url: ${SITE}/billing/success?session_id={CHECKOUT_SESSION_ID}
      cancel_url:  ${SITE}/billing
      subscription_data: { trial_period_days: plan.trialDays }
      metadata: { userId, planId }
   d. Return { url: session.url }
3. Client redirects to session.url (Stripe-hosted)
4. User pays → Stripe redirects to success_url
5. Stripe sends webhooks (in parallel — do not rely on success_url):
   • checkout.session.completed → create Subscription row
   • invoice.paid → set currentPeriodEnd = (Stripe subscription.current_period_end)
   • invoice.payment_failed → status = PAST_DUE
   • customer.subscription.deleted → status = CANCELED
6. /billing/success polls /api/me/subscription (or shows generic
   "you're subscribed" after a short delay)
```

### Webhook handler `/api/stripe/webhook`

```ts
import { stripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }
  // Idempotency: store event.id, skip if seen.
  const seen = await prisma.subscriptionEvent.findFirst({
    where: { payload: { path: ["stripeEventId"], equals: event.id } },
  });
  if (seen) return NextResponse.json({ ok: true });

  switch (event.type) {
    case "checkout.session.completed": /* … */ break;
    case "invoice.paid":                /* … */ break;
    case "invoice.payment_failed":      /* … */ break;
    case "customer.subscription.deleted": /* … */ break;
    default:                            /* log + ignore */
  }
  return NextResponse.json({ ok: true });
}
```

Security: middleware must NOT auth-gate `/api/stripe/webhook` —
Stripe signature is the auth boundary. Add to PUBLIC_API allow-list
with a top-of-file justification comment (see CLAUDE.md SECURITY
RULES).

### Env vars (Vercel)

| Key | Source |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys (live) |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Developers → Webhooks → endpoint signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard (only if using Stripe.js client-side; Checkout-only flows don't need it) |

⚠️ [[feedback_no_credential_commands]] — secrets are set via Vercel
dashboard or `vercel env add` from a clean shell. Never paste keys
into chat or commit messages.

---

## 10. Payment-gateway choice (founder-ratified)

**Stripe** primary. Reasons recap:

- Native recurring subscriptions, best-in-class webhooks
- Fastest UAE onboarding for tech businesses (24–48 h once the
  legal entity is set up)
- 2.9% + AED 1 per local card (competitive)
- No monthly base fee
- TypeScript SDK + dev tooling quality
- Stripe Tax handles UAE VAT 5% automatically

Stripe **does not support Mada** — non-issue for UAE-only launch.
When KSA expansion happens, add Tap or Telr as a secondary provider
through the `Payment.provider` abstraction. No re-architecture.

---

## 11. Build-order checklist (12 tasks)

Estimated ~1,400 LOC total, ~15–18 hours of focused work, realistic
**3–4 days** once unblocked. Острый minimum to take first payment
= tasks **1, 2, 3, 4, 5, 6, 7, 9, 12** (skip alerts + admin +
emails initially) = ~1,000 LOC, **2 days**.

| # | Task | Files | Approx LOC | Acute MVP |
|---:|---|---|---:|:---:|
| 1 | Schema migration: 5 models + 2 enums + User.subscriptions relation | `prisma/schema.prisma`, migration SQL | ~150 | ✅ |
| 2 | Stripe dashboard setup: 3 products × 2 prices (monthly/annual) | manual (Stripe dashboard) | — | ✅ |
| 3 | `src/lib/subscription.ts` — getActiveSubscription, userHasFeature, userQuotaRemaining, consumeQuota | NEW | ~150 | ✅ |
| 4 | `src/lib/stripe.ts` + `/api/billing/checkout` POST | NEW | ~100 | ✅ |
| 5 | `/api/stripe/webhook` POST — 4 events with idempotency + signature verify | NEW + middleware PUBLIC_API allow-list | ~150 | ✅ |
| 6 | `/billing` page — 3 tier cards, current sub panel, Subscribe buttons | NEW | ~250 | ✅ |
| 7 | Reveal Owner Contact paywall — `SidePanel.tsx` "Owner contact" section gate | `SidePanel.tsx` patch | ~80 | ✅ |
| 8 | Saved Search alerts — cron + email send (`SavedSearch` already in schema) | NEW route + cron | ~200 | — |
| 9 | Free trial logic — auto-create TRIALING on first signin where role===BROKER | `/api/users/sync` or signup hook | ~50 | ✅ |
| 10 | Email confirmations (subscribed / payment failed) | reuse existing email infra | ~80 | — |
| 11 | Admin view `/admin/subscriptions` — list / cancel / refund | NEW | ~150 | — |
| 12 | Verified Broker badge — `serializeUserPublic` adds field when `userHasFeature("verifiedBadge")` | `src/lib/serialize.ts` patch | ~30 | ✅ |

---

## 12. ⚠️ Flag-questions — must resolve BEFORE build

These are **founder decisions**, not agent questions. Build cannot
start cleanly until each has an answer.

| # | Flag | Why blocking | My recommendation (non-binding) |
|---|---|---|---|
| **Q1** | **Through whose licence do payments flow — HiGrow Realty (bridge) or future ZAAHI legal entity?** | Determines who is the Stripe account holder; tax/refund/AML responsibility; what name appears on broker invoices. Build cannot start until either route is committed (decision **2026-06-09 Tuesday**). | HiGrow bridge if their licence covers SaaS/proptech subscription revenue (counsel check); long-term own entity. |
| **Q2** | **RERA / DLD legal question: does selling access to plot owner contact information require a licence we don't have?** | Reveal Owner Contact is the highest-revenue paywall surface. If it requires DLD intermediary licence or a brokerage licence, this changes the product. | Founder consults counsel BEFORE we ship the paywall, even if Stripe is live. Same-day check. |
| **Q3** | **Tier prices 499 / 1,499 / 5,999 AED — confirmed by real broker conversations?** | Pricing was set against indirect signals only (competitor opacity, ad-spend benchmarks). 5 broker interviews would derisk it. | Founder asks 5 brokers ("would you pay 499 AED for [Essentials feature list]?") before Stripe products are created. Adjust JSON cheap if a number changes. |
| **Q4** | **VAT 5% — inclusive ("499 AED including VAT") or exclusive ("499 + 5% VAT")?** | UI display, Stripe Tax config, invoice generation. | Inclusive — looks cheaper, simpler invoice copy, standard for SaaS in the region. |
| **Q5** | **Final feature list for each tier?** | §7 matrix is a strong-default not a contract; some features (e.g. CSV export, analytics, white-label) may move tiers or be deferred. | Confirm §7 cell-by-cell on the day of build kickoff. Cheap to change before Stripe products exist; expensive after. |
| **Q6** | **Free trial — 7 days, 14, 30?** | Tradeoff: longer trial = more conversion but more cost-of-acquisition burned by tirekickers. | 7 for Essentials/Pro, 14 for Agency. |
| **Q7** | **Annual discount — 1 month free, 2 months, 3?** | Sets the implied monthly price for annual subscribers + signals confidence. | 2 months free (≈16.7% discount) — SaaS norm. |
| **Q8** | **Reveal Owner Contact quota numbers (20 / 100 / 500) — calibrated against what?** | Currently a guess based on CPL AED 30–120 maths. Should be informed by VaultEntry usage data + broker interviews. | Pick numbers at launch, instrument usage, adjust quarterly. Founder watches the first 5 paying brokers' actual usage. |
| **Q9** | **Public broker directory at `/brokers` — Verified Broker badge displays where?** | Verified badge is a key Essentials value-add. Where it surfaces (search results? plot SidePanel? a dedicated page?) determines visibility. | New `/brokers` directory + badge on SidePanel "Listed by" row when the listing's owner has an active Essentials+ sub. |

---

## 13. What's NOT in scope (avoid scope creep)

- **Transaction fee (0.25%)** — separate revenue stream per CLAUDE.md
  "Монетизация: SaaS подписки + 0.25% транзакция + API + Data reports".
  Plumbing for it exists (`Payment.subscriptionId` is nullable for
  one-off charges), but the actual deal-close flow is a separate
  Phase.
- **Other roles** — DEVELOPER / OWNER / INVESTOR tiers come AFTER
  broker-MVP ships and we have at least 5 paying brokers as a
  validation point. Architecture supports it; product timing not now.
- **API / Data reports** — third and fourth monetisation streams.
  Stripe Metered Billing is the right model; not building it now.
- **Mada / KSA cards** — Stripe doesn't support; addressed only
  when KSA expansion is actually scheduled.

---

## 14. Activation checklist (when legal base is live)

Run top-to-bottom on the day green-light arrives. **Do not skip
order** — each step blocks the next.

- [ ] **Q1 resolved** — HiGrow Realty OR own entity confirmed as
      payment account holder
- [ ] **Q2 resolved** — counsel confirms owner-contact paywall is
      legally sellable under the chosen entity's licence
- [ ] Stripe account created on the resolved entity's name
- [ ] Stripe Tax configured for UAE (5% VAT, inclusive per Q4)
- [ ] 3 Products created in Stripe dashboard: "Broker Essentials",
      "Broker Pro", "Broker Agency"
- [ ] 6 Prices created: each product × monthly + annual
- [ ] `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` set in Vercel
      env (production scope)
- [ ] Webhook endpoint `https://zaahi.io/api/stripe/webhook`
      registered in Stripe dashboard with these events:
      `checkout.session.completed`, `invoice.paid`,
      `invoice.payment_failed`, `customer.subscription.deleted`
- [ ] `prisma/schema.prisma` patched per §4
- [ ] Local `npx prisma migrate dev --name broker_subscription_v1`
      passes
- [ ] **Founder verifies prod `DIRECT_URL` is the real prod
      Supabase** (per [[reference_db_envs]] — 2026-05-29 incident)
- [ ] `npx prisma migrate deploy` against prod
- [ ] Build tasks 3 → 7 → 9 → 12 (acute MVP path)
- [ ] Manual test in Stripe test mode end-to-end
- [ ] Promo plan rows seeded in prod (DB seed or admin form)
- [ ] Switch Stripe keys to live mode (Vercel env update)
- [ ] First test subscription via own account (founder's BROKER
      role) — confirm Subscription row created, webhook
      idempotent, paywall toggles, owner contact revealed,
      quota decrements
- [ ] Soft-launch: invite first 3 brokers to subscribe
- [ ] After 7-day trial converts: monitor PAST_DUE rate, quota
      consumption patterns, support tickets
- [ ] Add build tasks 8, 10, 11 (alerts, emails, admin) once
      stable

---

## 15. Memory references

When this spec is picked up later, these auto-memory entries inform
build decisions:

- `[[reference_db_envs]]` — local DB ≠ prod DB; verify prod
  `DIRECT_URL` with founder before any migrate deploy. Critical
  for §11 step 1 and §14 migration step.
- `[[feedback_no_credential_commands]]` — never run CLI that prints
  Stripe secrets / DB URLs / payment provider tokens. Use Vercel
  dashboard or `vercel env add` from a clean shell.
- `[[feedback_page_tsx_review_before_edit]]` — paywall integration
  in `SidePanel.tsx` (task 7) requires explicit edit plan + full
  consolidated diff + invariant-confirmation table before any edit.
  This rule applies to `src/app/page.tsx` and the map page; verify
  whether `SidePanel.tsx` is in scope at build time.

---

## 16. Related docs

- `docs/specs/phase-1/spec-05-cohort-pilot-v1.md` — UserRole +
  RegistrationApplication + PlotClaim model that BROKER subscription
  builds on top of. Verified-broker badge in §6 ties to PlotClaim
  verification flow.
- `docs/specs/non-dda-plot-entry-DESIGN.md` — VaultEntry +
  ownerContact JSON, the schema-side counterpart to "Reveal Owner
  Contact" paywall surface.
- `CLAUDE.md` — Монетизация stream order (SaaS subs → tx fee →
  API → data reports); SECURITY RULES for `/api/stripe/webhook`
  PUBLIC_API allow-list justification.

---

*Spec finalised 2026-06-02. Awaiting 2026-06-09 (Tuesday) HiGrow
decision before build start.*
