# Wall + Archibald — Unified System Design

**Status:** 🟡 RESEARCH ONLY. No code changes, no schema changes, no package installs.
Requires founder approval before any Sprint 1 work begins.

**Date:** 2026-04-16
**Branch:** `research/wall-archibald-system`
**Author:** Claude Code agent (desk research + read-only codebase audit)
**Related:** `LAYERS_RBAC_PROPOSAL.md`, `USER_DASHBOARDS_RESEARCH.md`, `ABU_DHABI_MIGRATION.md`

---

## 0. Executive summary

ZAAHI has two in-flight concepts — **Wall** (a Reddit-style feed for verified real-estate
professionals) and **Archibald** (the AI cat assistant already running on `/parcels/map`) —
that the founder framed as a single system. This document argues the framing is correct and
proposes a concrete architecture, rollout and risk map.

**Core thesis.** Wall is not "also" a content product. It is the live corpus that turns
Archibald from a generic chatbot into a defensible market-intelligence layer. Every verified
broker's post about a closed deal, every developer's price update, every architect's
feasibility note becomes a candidate fact that Archibald surfaces to future users with a
citation link back to the original post. Without Wall, Archibald has to scrape, buy, or
hand-author its facts. With Wall, the data collection cost is zero and the authority is
built on people the platform already trusts.

**What already exists (reusable).**
Archibald today is `src/app/parcels/map/ArchibaldChat.tsx` + `src/app/api/chat/route.ts` — a
glass floating-button widget that proxies the user message to Claude Sonnet 4.6 with a
~30-line system prompt and returns the reply as plain JSON. No streaming, no tools, no
persistence, no Anthropic SDK (raw `fetch`). Auth gate is `getApprovedUserId`. Rate limits
do not exist. 15 Prisma models cover parcels / deals / ambassadors / activity but **no
post / comment / message / knowledge / embedding tables**. No pgvector extension. No
Redis / KV for rate limiting. No cron. One Supabase Storage bucket (`documents`) is used
by the Add Plot modal. The FeasibilityCalculator is a React component, not a pure library.
DDA ingestion (`src/lib/dda.ts`) is a clean template the knowledge ingester can fork.

**What must be built.**
Nine new Prisma models (Post, Comment, Reaction, Media, Tag, PostTag, PostPlotLink,
ChatSession, ChatMessage) plus a knowledge stack (Developer, Project, KnowledgeDocument,
KnowledgeChunk with pgvector embeddings, KnowledgeGap). Anthropic SDK install + tool-use
rewrite of the chat route. Rate limiter (Upstash Redis is the pragmatic choice — Phase 4
of Abu Dhabi migration replaces it). Media upload abstraction backed by Cloudflare R2
(see §2.2). Full-text search on Postgres (`tsvector`) at launch; revisit Meilisearch
only at 50 k+ posts. Scheduled ingestion worker (Vercel cron → route handler → DDA-style
extractor → review queue). Admin "Teach Archibald" UI.

**Recommended order (dependency-aware).**

1. **Sprint 1 — read-mostly Wall MVP + tool-aware Archibald (3 weeks).**
   Post + Comment + Reaction + Tag models; post composer with image upload; chronological
   feed; Archibald gets `searchParcels` + `highlightOnMap` + `getDLDFees` tools and a
   persisted ChatSession. No extraction pipeline yet, no video, no realtime feed, no
   algorithmic ranking.
2. **Sprint 2 — social polish + knowledge bootstrap (3 weeks).**
   Nested comments (depth 3), HN-style trending sort, search on Postgres FTS, Supabase
   Realtime broadcast for "new post" pings, KnowledgeDocument + pgvector + seed ingestion
   of static legal corpus + top-10 developer profiles. Archibald can cite from static KB.
3. **Sprint 3 — Wall → KB extraction + moderation (2 weeks).**
   Post-publish extractor worker; confidence scoring; admin review queue; knowledge-gap
   logger; `/admin/archibald` teach UI.
4. **Sprint 4 — monetisation rails (2 weeks).**
   Per-tier rate limits (FREE/SILVER/GOLD/PLATINUM); Claude model routing (Haiku for
   trivial, Sonnet for normal, Opus for analytics); AI digest auto-posts; DLD auto-posts
   when the API lands.

10 weeks elapsed from approval to a Wall that talks back to a Claude agent with platform
context. Video, advanced ranking, multilingual polish, mobile PWA feed — V2 and later.

**Biggest risk.**
UAE regulatory exposure. As of **1 February 2026** every paid and unpaid real-estate
promotion on social platforms in the UAE requires an Advertiser Permit, and every Dubai
broker ad must display the RERA registration number and the agency permit under the
Trakheesi system — with fines up to AED 1 million and trading-licence suspension for
missing documentation ([Gulf News](https://gulfnews.com/uae/new-uae-law-advertiser-permit-now-mandatory-for-influencers-and-creators-for-social-media-1.500427938),
[Titan Digital UAE](https://titandigitaluae.com/real-estate/uae-real-estate-advertising-rules/)).
If Wall posts count as "advertisements" — and a post saying "this 10 M AED Meydan plot
is still available" almost certainly does — then ZAAHI inherits compliance burden for
every post. Posting must be **BROKER-verified + RERA-number-required + Trakheesi-
permit-reference-required** on deal posts, with a legal review before launch.
See §7.2 for the full risk set.

**Three founder decisions required before Sprint 1 starts.**

- **D1. Posting eligibility.** Any approved user, verified professionals only, or
  admin-invite-only? Strongest technical answer is **verified professionals only** for
  launch (RERA number + Trakheesi permit gate) to keep UAE compliance tractable. All
  other approved users can *read + react + comment*, not post.
- **D2. Primary LLM provider — Claude only, or add others?** The economics favour staying
  Anthropic (Claude Haiku 4.5 at $1 / $5 per million tokens with 90 % prompt-caching
  discount — see §5.1) and the tool-use ergonomics are mature. Adding OpenAI or Google
  triples the model-routing complexity. Recommend **Claude only** through Sprint 4.
- **D3. Media storage.** Supabase Storage is one API call away (zero new vendor);
  Cloudflare R2 has **no egress fees** vs Supabase's $0.09 / GB uncached and saves an
  order of magnitude at any real volume ([Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/),
  [Supabase Egress docs](https://supabase.com/docs/guides/platform/manage-your-usage/egress)).
  Wall video will push egress hard. Recommend **R2 with Cloudflare CDN in front**, with
  a small `src/lib/storage.ts` abstraction so the switch back to Supabase Storage is
  trivial if we need to centralise on one vendor during the Abu Dhabi migration.

Everything else in this document is detail. Read §1–§8 for the reasoning; read §7.2 at
minimum before committing to any start date.

---

## 1. Current architecture audit

Read-only snapshot as of commit `d73f0e0` on `main`. Nothing below was modified to
produce this document.

### 1.1 Archibald today

- **Widget:** `src/app/parcels/map/ArchibaldChat.tsx` — floating gold button (52×52 px)
  at bottom-right of `/parcels/map`, opens a 350×500 glassmorphic chat panel. Greeting
  is hard-coded. History is pure `useState<Msg[]>`, capped at 20 messages sent to the
  API. Cleared on page reload.
- **Route:** `src/app/api/chat/route.ts` (102 lines). Model `claude-sonnet-4-6`,
  `max_tokens: 500`, no `tools`, no streaming, no prompt caching. System prompt is
  33 lines covering DLD fees, NOC, Form F, Oqood, Ejari, Golden Visa, VAT, service
  charges, and a "respond in the same language" instruction. Auth gate is
  `getApprovedUserId(req)` at line 46. The Anthropic API key is read from
  `process.env.ANTHROPIC_API_KEY`, compared against `"REPLACE_ME"` sentinel, and the
  route 502s if missing.
- **SDK:** Anthropic SDK is **not** installed in `package.json`. The route uses raw
  `fetch` against `https://api.anthropic.com/v1/messages`.
- **Persistence:** none. No `ChatSession`, no `ChatMessage`, no analytics beyond what
  `ActivityLog` naturally captures on login.
- **Rate limits / quotas:** none. Any approved user can hit the endpoint as fast as
  they like. Middleware (`src/middleware.ts`) enforces Bearer token only; there is
  no Redis / KV / Upstash integration.
- **Other Anthropic consumer:** `src/app/api/parcels/parse-title-deed/route.ts`
  (Vision, Sonnet 4.6, `max_tokens: 600`, base64 image). Same auth pattern, same
  absence of rate limiting.

### 1.2 Prisma models (15 total)

User, Parcel, Deal, DealMessage, DealAuditEvent, AffectionPlan, Document, Commission,
AmbassadorApplication, ReferralClick, SavedParcel, ParcelView, Notification, ActivityLog,
SavedSearch.

Relevant shapes for Wall + Archibald:

- **User** has `avatarUrl`, `bio`, `language` (enum EN/AR/RU/UK/SQ/FR), `currency`,
  `reraLicense`, `brnNumber`, `notificationPrefs` (Json), `onboardingCompleted`,
  `ambassadorActive`, `referralCode`. Added in Phase 1 dashboards commit `8e4df1b`.
  `reraLicense` and `brnNumber` are free-text and **not validated** by any server
  code today — they are displayed but never gate behaviour.
- **ActivityLog** — `{ id, userId, kind, ref, payload, createdAt }` with
  `@@index([userId, createdAt])`. Writers for `USER_LOGIN`, `PLOT_VIEW`,
  `FAVORITE_ADDED`, `LISTING_CREATED` were added in commit `d73f0e0`. This is
  the right shape to extend with `POST_CREATED`, `COMMENT_CREATED`,
  `ARCHIBALD_MESSAGE`, `KB_CITED` and similar.
- **Notification** — `{ id, userId, kind, payload, readAt, createdAt }`. Extend with
  Wall kinds: `POST_REPLY`, `COMMENT_REPLY`, `POST_MENTIONED`, `POST_REACTED`.
- **AffectionPlan** — append-only, every refresh creates a new row. Exactly the
  pattern we want for `KnowledgeDocument` versioning (never mutate, supersede).

Nothing like `Post`, `Comment`, `Reaction`, `Media`, `Tag`, `KnowledgeDocument`,
`Developer`, `Project`, `ChatSession`, or an `embedding vector` column exists.

### 1.3 Map / SidePanel surface

`SidePanel.tsx` and `page.tsx` currently couple parcel selection tightly inside the map
component. There is **no public `selectParcelById(id)` or `flyTo` ref exposed** to outside
callers. A HeaderBar "Find by plot number" flow already exists (see
`CLAUDE.md` SidePanel/HeaderBar notes), which proves the surface can be built; we just
don't have the imperative handle an Archibald tool needs. Plan: extract a
`useMapController()` hook in Sprint 1 that exposes `selectParcel`, `highlightParcels`,
`flyTo`, `setBasemap`, backed by the existing map ref — a surgical change, zero new
data flow.

### 1.4 Auth and role gating

- `src/lib/auth.ts` exports `getSessionUserId`, `getApprovedUserId`, `getAdminUserId`.
- `FOUNDER_EMAILS` hard-coded to Zhan + Dymo; ADMIN role works in parallel.
- **There is no "verified professional" gate today.** The `reraLicense` and `brnNumber`
  fields are displayed in the dashboard Profile section but never checked. Wall's
  posting gate (D1 above) is new work.

### 1.5 Existing ingestion pattern — reusable

`src/app/api/parcels/[id]/affection-plan/refresh/route.ts` plus helpers in
`src/lib/dda.ts` (`fetchPlotInfoHtml`, `parseAffectionPlan`, `fetchBuildingLimit`)
are an excellent template. They fetch an external source, parse, validate, and append
an immutable row. Apply the same shape to `KnowledgeDocument` ingestion (markdown
files, developer pages, DLD transaction reports).

### 1.6 Top 5 reusable vs build-from-zero

**Reusable.** 1) Auth + approval gate. 2) Parcel selection UI + `useMapController`
hook extraction. 3) DDA ingestion shape for knowledge loaders. 4) Immutable append-only
pattern (AffectionPlan, Commission) for `KnowledgeDocument`. 5) ActivityLog / Notification
writer pattern.

**Build from zero.** 1) Post / Comment / Reaction / Tag / Media / PostPlotLink models
+ composer UI + feed renderer. 2) Claude tool-use rewrite of `/api/chat` + persisted
ChatSession. 3) Knowledge stack with pgvector embeddings. 4) Rate limiter (Upstash
Redis). 5) Moderation + extraction worker.

---

## 2. Wall — architectural design

### 2.1 Proposed Prisma schema

All additive. None of the existing 15 models are modified. Every row is immutable
after write except for the specific columns called out (e.g. `Post.editedAt`,
`Comment.deletedAt`). Every `userId` relation is `ON DELETE CASCADE` so a PDPL
right-to-be-forgotten request is a single `DELETE FROM User WHERE id = ?`.

```prisma
// ── Wall ────────────────────────────────────────────────────────────

enum PostVisibility { PUBLIC PROFESSIONAL ADMIN }   // Post audience
enum ModerationStatus { PENDING APPROVED REJECTED AUTO_OK }
enum ReactionKind { LIKE INSIGHT QUESTION DISAGREE }  // small set — decided up-front

model Post {
  id              String      @id @default(cuid())
  authorId        String
  author          User        @relation(fields: [authorId], references: [id])
  body            String      // markdown, ≤ 10 000 chars
  bodyFts         Unsupported("tsvector")?  // generated column, populated by trigger
  visibility      PostVisibility @default(PROFESSIONAL)
  moderation      ModerationStatus @default(PENDING)
  moderationNote  String?
  reraPermitRef   String?     // Trakheesi permit ref if post is a listing — see §7.2
  hotScore        Float       @default(0)  // recomputed by cron, see §2.7
  reactionCount   Int         @default(0)  // denormalised for sort
  commentCount    Int         @default(0)  // denormalised for sort
  viewCount       Int         @default(0)
  createdAt       DateTime    @default(now())
  editedAt        DateTime?                // null = never edited
  deletedAt       DateTime?                // soft delete — keep for moderation audit

  comments  Comment[]
  reactions Reaction[]
  media     Media[]
  tags      PostTag[]
  plotLinks PostPlotLink[]

  @@index([moderation, createdAt])   // moderation queue order
  @@index([visibility, hotScore])    // trending feed
  @@index([authorId, createdAt])     // author profile
}

model Comment {
  id        String    @id @default(cuid())
  postId    String
  post      Post      @relation(fields: [postId], references: [id], onDelete: Cascade)
  parentId  String?                            // null = top-level
  parent    Comment?  @relation("CommentThread", fields: [parentId], references: [id])
  replies   Comment[] @relation("CommentThread")
  depth     Int       @default(0)              // 0..3, enforced in API
  authorId  String
  author    User      @relation(fields: [authorId], references: [id])
  body      String                              // plain text, ≤ 2 000 chars
  moderation ModerationStatus @default(AUTO_OK) // comments auto-ok unless flagged
  createdAt DateTime  @default(now())
  editedAt  DateTime?
  deletedAt DateTime?

  @@index([postId, createdAt])
  @@index([parentId])
  @@index([authorId, createdAt])
}

model Reaction {
  id        String       @id @default(cuid())
  postId    String
  post      Post         @relation(fields: [postId], references: [id], onDelete: Cascade)
  userId    String
  user      User         @relation(fields: [userId], references: [id])
  kind      ReactionKind
  createdAt DateTime     @default(now())

  @@unique([postId, userId, kind])             // one kind per user per post
  @@index([postId, kind])
}

model Tag {
  id        String   @id @default(cuid())
  slug      String   @unique                    // lowercase, hyphenated
  label     String                              // display form
  kind      String   // "topic" | "deal" | "district" | "developer" | "custom"
  createdAt DateTime @default(now())

  posts PostTag[]
}

model PostTag {
  postId String
  tagId  String
  post   Post @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id])

  @@id([postId, tagId])
  @@index([tagId])
}

enum MediaKind { IMAGE VIDEO PDF DOCUMENT }

model Media {
  id          String    @id @default(cuid())
  postId      String?
  post        Post?     @relation(fields: [postId], references: [id], onDelete: Cascade)
  uploadedById String
  uploadedBy   User     @relation(fields: [uploadedById], references: [id])
  kind        MediaKind
  storageKey  String                            // R2 object key
  cdnUrl      String                            // Cloudflare CDN URL
  thumbUrl    String?                           // R2 key of generated thumbnail
  mime        String
  bytes       Int
  width       Int?
  height      Int?
  durationSec Int?                              // video only
  createdAt   DateTime  @default(now())

  @@index([postId])
  @@index([uploadedById, createdAt])
}

// One post can reference many plots; one plot can be referenced by many posts.
model PostPlotLink {
  postId   String
  parcelId String
  post     Post   @relation(fields: [postId], references: [id], onDelete: Cascade)
  parcel   Parcel @relation(fields: [parcelId], references: [id], onDelete: Cascade)
  context  String?  // optional caption ("sold at"/"listed at"/"benchmark for")

  @@id([postId, parcelId])
  @@index([parcelId])
}
```

Notes on fields and choices:

- **`Post.body` is markdown**, rendered with a strict sanitiser (DOMPurify-equivalent
  server-side) and a small whitelist — no raw HTML, no `<iframe>`, no `<script>`. No
  user-supplied CSS.
- **`bodyFts` is a generated tsvector** populated by a Postgres trigger, indexed with
  GIN. This gives BM25-style lexical search for free. See §2.5.
- **Reactions are a small fixed set (4 kinds).** Reddit's "upvote/downvote" doesn't fit
  the audience; Twitter-like hearts are too bland. LIKE / INSIGHT / QUESTION /
  DISAGREE lets Archibald's extractor weight posts differently (INSIGHT-heavy posts
  are higher-signal candidates for the knowledge base; DISAGREE-heavy posts are
  flagged for human review even if they got approved).
- **Comment depth cap = 3.** Reddit allows effectively infinite depth and UIs regret it
  at 6+; meta's thread UX caps at 3 and rarely hits it. For a professional UI with
  expected thread length of 5–20 messages, 3 levels is enough
  ([Reddit ranking explanation](https://medium.com/hacking-and-gonzo/how-reddit-ranking-algorithms-work-ef111e33d0d9)).
- **`Post.viewCount` is a simple integer, debounced** same as the ParcelView throttle
  (30 s per user per post). Not an append-only `PostView` table at launch — re-derive
  only if we need "who viewed my post" later.
- **Soft delete with `deletedAt`.** Hard-delete only on PDPL request via `User` cascade.
  Moderation keeps soft-deleted post rows so the audit trail survives.
- **`reraPermitRef` is nullable** but the API will require it when `tags` contains
  `deal` or `listing` (enforcement lives in API, not schema — keeps schema permissive).

### 2.2 Media storage

**Recommendation: Cloudflare R2 with Cloudflare CDN, hidden behind `src/lib/storage.ts`.**

| Dimension | Supabase Storage | Cloudflare R2 | Direct S3 |
|---|---|---|---|
| Storage $/GB/mo | $0.021 | $0.015 | ~$0.023 |
| Egress $/GB | $0.09 uncached / $0.03 cached | **$0** | ~$0.09 |
| Global CDN | Supabase CDN included | Cloudflare CDN free | separate product |
| SDK ergonomics | First-class Supabase SDK call | S3-compatible API | S3 SDK |
| UAE residency | Frankfurt (today) | 330+ PoPs incl. Dubai | region-dependent |
| Signed URL support | Yes | Yes | Yes |

Sources: [Supabase Storage pricing](https://supabase.com/docs/guides/storage/pricing),
[Supabase Egress management](https://supabase.com/docs/guides/platform/manage-your-usage/egress),
[Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/).

Egress is the decider. One 30-second 1080p video is ~50 MB. 500 weekly active professionals
watching 20 clips each = 500 GB / week = 2 TB / month. At Supabase's uncached rate that's
$180 / month on nothing but egress; at R2 it's $0 plus ~$30 storage. R2 also puts a CDN
in front for free, which matters for latency inside the UAE (Cloudflare has four PoPs
in the Emirates as of 2026).

**Trade-off acknowledged.** R2 means a second vendor contract. The abstraction in
`src/lib/storage.ts` (which the user dashboards research already called for — see
`USER_DASHBOARDS_RESEARCH.md` §7) makes the switch reversible: if the Abu Dhabi migration
(see `ABU_DHABI_MIGRATION.md`) ends up running Supabase self-hosted on Azure UAE Central
for sovereignty, `storage.ts` swaps one implementation for another.

**Uploads:** presigned PUT URLs issued by the server (R2 supports these). The client
uploads directly to R2, not through the Next.js route, so Vercel function body-size
caps (4.5 MB default) never matter. The server only writes the `Media` row after
the client reports success, and a nightly reaper deletes orphan R2 objects older
than 24 h.

**Video handling — split by type:**

- **Short clips ≤ 60 s, ≤ 100 MB:** direct upload to R2, `<video>` tag with R2 URL.
  Thumbnails via ffmpeg in a Cloudflare Worker on upload.
- **Long-form video, live capture, social-grade reels:** defer to V2. If we add it,
  **Mux** (`$0.005 / minute stored, $0.00096 / minute streamed`, real-time HLS,
  auto-thumbnails, DRM) is the recommended vendor. Cloudflare Stream is comparable,
  cheaper at low volume, slightly rougher SDK.
- **YouTube embed:** allowed as a first-class post type (store a `youtubeId` on
  `Media`) because it costs ZAAHI nothing. Oembed for title + thumb.

### 2.3 Real-time feed

**Recommendation: Supabase Realtime Broadcast, not Postgres Changes.**

The Supabase docs explicitly flag a scaling ceiling on Postgres Changes: *"every change
event must be checked to see if the subscribed user has access … Postgres Changes
process changes on a single thread to maintain order, which can create bottlenecks
at scale"* ([Supabase Realtime Benchmarks](https://supabase.com/docs/guides/realtime/benchmarks),
[Postgres Changes at scale](https://supabase.com/docs/guides/realtime/postgres-changes#postgres-changes-at-scale)).
Broadcast runs on Elixir/Phoenix (millions of concurrent connections benchmarked) and
has no single-thread chokepoint.

Design:

1. `POST /api/wall/posts` creates the `Post` row after moderation decides `APPROVED`
   or `AUTO_OK`.
2. The same handler publishes to a Broadcast channel `wall:global` with the post id.
3. Clients subscribe to `wall:global`; on receipt they optimistically insert a
   "new post available" pill at the top of the feed (Twitter-style "N new posts").
   The user clicks, the client fetches full post bodies.

Alternative considered: **Server-Sent Events (SSE)**. Works, but scales poorly on
Vercel because every connection consumes a serverless invocation slot. Only sensible
if we're on the self-hosted UAE VM — revisit in Abu Dhabi migration Phase 3.

Alternative rejected: **Polling**. Simplest but wastes money (500 users × poll-every-10s
= 50 req/s baseline, with auth overhead).

### 2.4 Pagination

**Cursor-based on `(hotScore, id)` or `(createdAt, id)`**, depending on sort order.
Offset pagination on an infinite-scroll feed is famously broken: insertions shift
pages mid-scroll and show duplicates. Cursor is the default pattern in every serious
social feed (Twitter, Instagram, Reddit's "API 2.0" all cursor-paginate). Return
`{ items, nextCursor }`; no total count (cheaper, and users don't read it anyway).

### 2.5 Full-text search

**Launch with Postgres FTS on the `bodyFts` tsvector column.**

Rationale: zero new infrastructure, zero new cost. Postgres BM25 via `ts_rank_cd` is
good enough for 10 k–50 k posts. Add a trigram index on author names for `@mentions`.

Reconsider only when:

- Corpus > 100 k posts **and** p95 query latency > 400 ms, **or**
- Business demand for typo tolerance / synonyms / facet UX beyond what `tsquery`
  supports.

At that point evaluate **Meilisearch** (self-hosted, strong typo tolerance, cheap)
or **Typesense** (similar). Algolia is excellent but per-query cost is hostile at
our margin. Elastic/OpenSearch is overkill.

### 2.6 Spam / moderation pipeline

Two-stage:

1. **On post submit, before write**, the API runs a lightweight Claude Haiku call
   with a single-shot prompt: *"Return JSON `{ spam: bool, confidence: 0-1,
   categories: [] }` for the following post: ..."*. Temperature 0, max 100 tokens,
   costs ~$0.0002 per call. If `spam=true && confidence>0.8` → `moderation=REJECTED`
   with reason, return 422 to author. If `spam=false && confidence>0.8` →
   `moderation=AUTO_OK`, row written, feed broadcast. Everything else →
   `moderation=PENDING`, row written hidden from feed, admin review queue entry.
2. **Admin review queue** lives at `/admin/wall/queue`. Shows post, author, why it
   was flagged, an Approve/Reject button. Rejection is soft — the row stays, just
   `deletedAt` gets set and `moderationNote` explains.

Comments default to `AUTO_OK` unless they contain URL patterns, blacklisted words,
or a reply to a PENDING post. Cheaper since comments are 5–10 × more frequent than
posts.

**Never auto-delete.** Soft delete always — admin can always see what was posted and
by whom, which matters for RERA audit (see §7.2).

### 2.7 Trending algorithm

**Recommendation: Hacker News formula, adapted.**

```
hotScore = (reactionCount - 1) × weight + log2(commentCount + 1)
         / (ageInHours + 4) ** gravity
```

with `gravity = 1.5` (a touch heavier decay than HN's 1.2 because real-estate news
ages faster than general tech news), `weight = 1` for LIKE and QUESTION, `weight = 2`
for INSIGHT (high-signal), `weight = -1` for DISAGREE (neutral, not punitive; a post
with 20 disagrees and 2 insights still ranks positive by magnitude but lower than
the insight-heavy counterpart).

Why HN, not Reddit: Reddit's algorithm lets scores grow unbounded; newer content
overtakes older content only because the epoch-timestamp addition scales with time
([Reddit ranking](https://medium.com/hacking-and-gonzo/how-reddit-ranking-algorithms-work-ef111e33d0d9)).
That's great for Reddit's corpus size but creates cold-start problems for feeds under
10 k posts (everything old looks relevant). HN's explicit `ageInHours` decay gives
a cleaner "what's happening right now" signal for a small professional feed. Switch
to Reddit's formula if the corpus ever exceeds 500 k posts and we need long-tail
surfacing; we are years from that.

Compute `hotScore` on a cron every 5 minutes (Vercel cron → `/api/cron/wall-rescore`
→ recompute the last 7 days of posts; older posts are quasi-frozen). Write into
`Post.hotScore`. Feed queries sort `ORDER BY hotScore DESC` with index. Zero
per-request cost.

### 2.8 Post-to-plot linking UX

Post composer has a "Link plots" button. Clicking opens the same plot-search modal
the HeaderBar already uses (`FindLauncher`) but in multi-select mode. Selected plots
appear as chips under the composer. On render, each linked plot shows as a click-to-
view pill in the post footer; clicking fires the new `useMapController` hook,
navigates to `/parcels/map?select=<id>`, flies to the plot, opens SidePanel. This is
the exact same flow Archibald's `highlightOnMap` tool will use — good reuse.

### 2.9 Reading vs writing eligibility

Per D1 in §0. The recommended default:

- **Anyone approved** can read the feed, react, and comment (moderated).
- **Posting requires either:**
  - `User.role` is OWNER, BROKER, INVESTOR, DEVELOPER, or ARCHITECT, **and**
  - a validated `reraLicense` **or** `brnNumber` on file (`User.verifiedProfessional=true`
    — new boolean added in Sprint 1).
- **Deal posts (tagged `deal` or `listing`) additionally require**
  `Post.reraPermitRef` (Trakheesi permit number) — mandatory per UAE regulation.

This keeps ZAAHI out of the "platform hosts unlicensed real-estate ads" category,
which is the single most expensive mistake we could make (see §7.2).

---

## 3. Archibald — knowledge system

### 3.1 Three layers of knowledge

| Layer | Latency | Volume | Storage | Refresh |
|---|---|---|---|---|
| **Static** — laws, procedures, RERA rules, DLD fees, visa rules | Query-time retrieval from embedded chunks | ~10 k–50 k chunks at steady state | `KnowledgeDocument` + `KnowledgeChunk (embedding vector)` | Manually edited; versioned |
| **Semi-dynamic** — developers, projects, master plans, price benchmarks | Same | 10 k–100 k chunks | Same + structured `Developer` / `Project` tables | Weekly ETL jobs + Wall extraction |
| **Live** — our 114 parcels, DLD transactions, Wall posts < 24 h | Tool-calls at conversation time | Unbounded | Existing Postgres tables | Real-time |

The three layers are architectural, not user-visible. Archibald responds with one
answer; the pipeline behind it composes from all three.

### 3.2 Proposed schema

```prisma
// ── Archibald ──────────────────────────────────────────────────────

enum KnowledgeSource { STATIC_MARKDOWN WALL_POST DLD_API DDA_API ADMIN_TEACH EXTERNAL_SCRAPE }
enum KnowledgeStatus { PENDING APPROVED SUPERSEDED OUTDATED REJECTED }

model KnowledgeDocument {
  id           String           @id @default(cuid())
  slug         String           @unique             // stable external ref
  title        String
  summary      String?                              // one-paragraph summary
  topics       String[]                             // ["dld.fees", "rera.brokerage"] etc.
  sourceKind   KnowledgeSource
  sourceRef    String?                              // postId / url / filename
  status       KnowledgeStatus  @default(PENDING)
  supersedesId String?
  supersedes   KnowledgeDocument? @relation("DocVersion", fields: [supersedesId], references: [id])
  supersededBy KnowledgeDocument[] @relation("DocVersion")
  languageCode String           @default("EN")       // EN | AR | RU | ...
  body         String                                // markdown
  citations    Json?                                 // [{ title, url, accessed }]
  createdAt    DateTime         @default(now())
  approvedAt   DateTime?
  approvedBy   String?
  expiresAt    DateTime?                             // soft expiry hint

  chunks       KnowledgeChunk[]

  @@index([status, topics])
  @@index([sourceKind, sourceRef])
}

model KnowledgeChunk {
  id          String   @id @default(cuid())
  documentId  String
  document    KnowledgeDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  ord         Int
  text        String                              // ≤ 2000 chars, overlap ~200
  embedding   Unsupported("vector(1024)")        // voyage-3 / Haiku embedder
  tokens      Int
  createdAt   DateTime @default(now())

  @@index([documentId, ord])
  // pgvector index added in migration, not expressible in Prisma:
  //   CREATE INDEX knowledge_chunk_embedding_idx
  //   ON "KnowledgeChunk" USING hnsw (embedding vector_cosine_ops);
}

model Developer {
  id            String  @id @default(cuid())
  slug          String  @unique                    // "emaar", "damac", "nakheel"
  name          String
  aliasJson     Json?                              // ["Emaar Properties", "Emaar"]
  websiteUrl    String?
  summary       String?
  foundedYear   Int?
  flagshipProjects String[]                        // project slugs
  logoUrl       String?
  lastSyncedAt  DateTime?
}

model Project {
  id            String   @id @default(cuid())
  slug          String   @unique
  name          String
  developerId   String?
  developer     Developer? @relation(fields: [developerId], references: [id])
  emirate       String
  district      String?
  latitude      Float?
  longitude     Float?
  launchYear    Int?
  statusText    String?                             // "Completed", "Under construction"
  summary       String?
  linksJson     Json?                               // [{ label, url }]
  lastSyncedAt  DateTime?
}

enum ChatRole { USER ARCHIBALD SYSTEM TOOL }
enum MessageFeedback { NONE HELPFUL UNHELPFUL }

model ChatSession {
  id          String        @id @default(cuid())
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  title       String?                                 // auto-summary first msg
  language    String?                                 // detected at session start
  startedAt   DateTime      @default(now())
  lastMessageAt DateTime    @default(now())

  messages    ChatMessage[]

  @@index([userId, lastMessageAt])
}

model ChatMessage {
  id          String   @id @default(cuid())
  sessionId   String
  session     ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  role        ChatRole
  content     String                                   // full text, user or model
  toolName    String?                                  // set when role = TOOL
  toolInput   Json?
  toolOutput  Json?
  citations   Json?                                    // [{ kind, ref, title }]
  modelUsed   String?                                  // claude-haiku-4-5, ...
  tokensIn    Int?
  tokensOut   Int?
  latencyMs   Int?
  feedback    MessageFeedback @default(NONE)
  createdAt   DateTime @default(now())

  @@index([sessionId, createdAt])
}

model KnowledgeGap {
  id          String   @id @default(cuid())
  sessionId   String?
  userId      String?
  question    String                                   // ≤ 500 chars
  detectedAt  DateTime @default(now())
  resolvedAt  DateTime?
  resolvedByDocId String?
  count       Int      @default(1)                     // merged duplicates

  @@index([resolvedAt, count])
}
```

### 3.3 Retrieval pipeline

On a user message:

1. **Intent classify (Haiku 4.5, 0 temp, ~50 tokens).** Output is a JSON tag:
   `{ intent: 'platform_help' | 'legal_question' | 'plot_search' | 'feasibility'
   | 'market_insight' | 'small_talk', language: 'EN'|'AR'|'RU'|... , confidence: 0-1 }`.
   Cost: ~$0.00005 per call ([Claude API pricing](https://platform.claude.com/docs/en/about-claude/pricing)).
2. **Route by intent.** See §3.4 for model choice per intent.
3. **Retrieve context (if needed):**
   - Semantic search over `KnowledgeChunk` via pgvector cosine similarity. HNSW index,
     `ef_search` tuned for recall > 0.9 ([pgvector 0.8 release notes](https://www.postgresql.org/about/news/pgvector-080-released-2952/)).
     Top-K = 6 chunks.
   - Keyword search on the same corpus via Postgres FTS on `KnowledgeChunk.text`
     (trigram / tsvector). Top-K = 4.
   - Merge + rerank with a tiny cross-encoder (deferred to V2 — at launch, simple
     reciprocal-rank fusion is fine).
4. **Build the assistant turn** with:
   - System prompt (~1000 tokens, cached with `cache_control: { type: "ephemeral" }`
     — 90% read discount after first call via Anthropic prompt caching,
     [Prompt Caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)).
   - Tools (list below, also cached).
   - Conversation history (last 20 messages, cached up to the most recent user turn).
   - User message.
5. **Stream the response.** Clients get tokens as they arrive.
6. **Persist** user + assistant turns in `ChatMessage` after completion.

### 3.4 Tool-use architecture

Exact tool list Claude will be given. Each tool maps to a server route.

| Tool | Purpose | Who uses it |
|---|---|---|
| `searchParcels` | "residential plots in JVC under 25 M AED with FAR ≥ 3" → list of parcel ids + brief | plot-search intent |
| `getParcelDetails` | id → full AffectionPlan + current valuation + owner contact mask | plot-search, feasibility |
| `highlightOnMap` | id(s) → triggers map fly-to + SidePanel via `useMapController` | plot-search |
| `calculateFeasibility` | { plotId, mode: BTS/BTR/JV, inputs } → ROI, verdict | feasibility |
| `getDeveloperInfo` | slug → Developer + top 3 Projects | market_insight |
| `getProjectInfo` | slug → Project + projects' linked parcels | market_insight |
| `getDLDFees` | { priceAed, transactionType } → fee breakdown | legal_question |
| `getRERARule` | topic slug → KnowledgeDocument citation | legal_question |
| `searchWallPosts` | { query, tags, author } → Post ids + summaries | market_insight |
| `getKnowledgeByTopic` | topic → KnowledgeDocument body (static docs) | legal_question, platform_help |
| `navigatePlatform` | { destination: "add-plot" / "favorites" / "ambassador" / ... } → URL + micro-copy | platform_help |
| `logKnowledgeGap` | q → append to KnowledgeGap | called internally when no good answer found |

All tools return structured JSON. All mutate nothing except `logKnowledgeGap`.
`calculateFeasibility` requires extracting the FeasibilityCalculator logic into
`src/lib/feasibility-engine.ts` in Sprint 1 (a ~400-line pure-function refactor of
the existing component math).

### 3.5 Model routing for cost

| Intent | Model | Why |
|---|---|---|
| `small_talk`, `platform_help` (FAQ), `intent_classify` | **Claude Haiku 4.5** ($1 / $5) | Short, formulaic, 90% cached system prompt |
| `plot_search`, `feasibility`, `market_insight` | **Claude Sonnet 4.6** ($3 / $15) | Tool-use, short-mid chain of thought |
| `legal_question`, deep analysis, long thread | **Claude Opus 4.6** ($5 / $25) | Highest accuracy, worth the premium |

Pricing verified: [Claude API pricing](https://platform.claude.com/docs/en/about-claude/pricing),
[Anthropic pricing 2026 breakdown — Finout](https://www.finout.io/blog/anthropic-api-pricing).
All 4.6 models ship with 1 M token context at standard pricing; Haiku 4.5 has 200 k.

Prompt caching used on:
- System prompt (~1000 tokens, rarely changes).
- Tool definitions (~800 tokens).
- Few-shot examples for intent classifier (~600 tokens).
- User's session history up to most recent turn.

Break-even math: 5-minute cache write costs 1.25 × base input price, 5-minute cache
read costs 0.1 × base input price — a cache read after a single write saves money
([Prompt Caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)).
Every session with 2+ turns benefits.

### 3.6 Hallucination guards

Specifically for legal and financial questions, where being wrong is expensive.

- **Retrieval-before-generation for legal intents.** If retrieval returns no chunk
  with similarity > 0.75, Archibald answers *"I don't have a confident answer. This
  looks like a legal question — please verify with a licensed Dubai real-estate
  lawyer. Admins have been notified."* and writes a `KnowledgeGap` row. **Never
  free-generate legal claims.** The Perplexity principle applies: *"you are not
  supposed to say anything that you didn't retrieve"*
  ([Vespa / Perplexity deep dive](https://vespa.ai/perplexity/)).
- **Mandatory disclaimer line on every legal-intent response**:
  *"Not legal advice. Consult a licensed UAE real-estate lawyer before acting."*
  Injected by the rendering layer, not requested from the model (the model can't
  forget).
- **Citation rendering.** Every sentence that came from a `KnowledgeChunk` is
  footnoted with a superscript citation linking to the source document or Wall post.
  UI shows inline [1][2] markers; hover reveals source title; click opens source.
  Model is instructed to emit `[doc:<slug>#chunk:<ord>]` markers in its draft;
  the server replaces those with numbered citations before the user sees the reply.
- **Temperature 0** for legal intents; **temperature 0.3** for small-talk and explain.

### 3.7 Knowledge versioning

When a law changes (e.g. DLD transfer fee adjustment), we **do not update** the
existing `KnowledgeDocument`. We create a new document with `supersedesId` pointing
to the old one, `status = APPROVED`, and the old document moves to `status = SUPERSEDED`.
Retrieval filters to `status = APPROVED` unless an explicit historical query is asked
("what was the fee in 2024?"). This matches the existing AffectionPlan append-only
pattern, so engineers already understand it.

`OUTDATED` status is set by a cron that scans `expiresAt < now()` monthly — no deletion,
just a hint for admins to refresh.

### 3.8 Multilingual

- **Detection** happens in the intent classifier (§3.3 step 1). One call, 0 extra cost.
- **Language preference** is persisted to `User.language` on first non-English message
  (see the field added in Phase 1 dashboards), and `ChatSession.language` for that
  session. User can override via a tiny language toggle in the chat widget.
- **Knowledge base is stored per-language.** Same `KnowledgeDocument.slug` can have
  multiple rows with different `languageCode`; retrieval filters by session language.
  If no matching-language doc, fall back to English + instruct the model to respond
  in the target language (acceptable for Sprint 1; professional AR/RU translation of
  the static corpus is a manual Sprint 2 task).

### 3.9 Admin "Teach Archibald" interface

`/admin/archibald` — admin-only route.

- **Left column:** topic tree (DLD / RERA / Developers / Projects / FAQ / Other).
- **Middle column:** list of `KnowledgeDocument` rows in selected topic, with status
  badge (PENDING / APPROVED / SUPERSEDED / OUTDATED).
- **Right column:** editor — title, summary, topics[], language, markdown body,
  citations. "Save draft" (PENDING) / "Approve and publish" (APPROVED + re-embed).
- **Bottom drawer:** "Knowledge gaps" — paginated list of `KnowledgeGap` rows sorted
  by `count DESC, detectedAt DESC`. Click → pre-fills a new document draft with the
  question as the title. "Mark resolved" closes the gap without creating a doc
  (useful when the question was misunderstood).

Re-embedding on approval re-runs the chunker + embedder (Voyage-3 or an Anthropic
embedding model if they release one) and replaces `KnowledgeChunk` rows for that doc.

### 3.10 Knowledge gap logger

Logged automatically by the pipeline in §3.3 step 4 when:
- Semantic retrieval returns no chunk > 0.75 similarity, **and**
- The intent is `legal_question`, `market_insight`, or `platform_help`.

Duplicates are merged by approximate string match (Levenshtein on the normalised
question, threshold 0.85) and `count` incremented — the popular-gaps UI surfaces
"5 users asked 'what is the rental yield cap in JVC?' this week".

---

## 4. Integration points — Wall ↔ Archibald

The single most important section of this document.

### 4.1 Post → Knowledge extractor worker

When a post reaches `moderation = APPROVED`:

1. Enqueue a background job (Vercel cron every 5 minutes picks up
   `Post WHERE moderation = APPROVED AND extractionState = NULL`).
2. Worker calls Claude Sonnet 4.6 with a strict extraction prompt:
   *"Given this post, extract factual claims about real-estate market data.
   Return JSON of shape `{ facts: [{ topic, claim, confidence }], notExtractable: reason? }`.
   Only extract claims that reference specific numbers (prices, rates, dates) or specific
   entities (project names, developers, districts). Skip opinions, jokes, questions."*
3. Each `fact` with `confidence > 0.7` becomes a draft `KnowledgeDocument` with
   `sourceKind = WALL_POST`, `sourceRef = postId`, `status = PENDING`, `supersedesId`
   set if an existing doc matches by embedding similarity > 0.9.
4. Admin review queue surfaces PENDING docs. Admin can Approve (promotes to APPROVED,
   re-embeds), Reject, or Edit-then-Approve.
5. `Post.extractionState` updated to `EXTRACTED` or `SKIPPED`.

Why not auto-approve high-confidence extractions? Because a broker's post can be
mistaken, self-serving, or even deliberately misleading (price pumping). Human review
is the cheapest defensible bar. Admin throughput is the bottleneck — see §7.1 T5.

### 4.2 Archibald citing Wall

When `searchWallPosts` tool returns a post whose text was the source for a retrieved
chunk, Archibald's response embeds *"as broker @ivan observed on 12 April: [link]"*.
The `[link]` is rendered by the client as a clickable pill that opens the post in
a drawer without leaving the chat. This is the same citation system as §3.6 —
Wall posts are just another `sourceKind`.

**Guardrail:** if the post author is the current user, do not cite (don't tell the
user back their own words). If the post is `deletedAt != null`, do not cite (do not
resurface soft-deleted content in chat).

### 4.3 Weekly Archibald digest post

Every Monday 09:00 UAE time, a Vercel cron invokes `/api/cron/archibald-digest`.
The route:

1. Queries the last 7 days of Wall posts, DLD transactions (if API live),
   high-activity ChatSession summaries.
2. Runs a Claude Opus 4.6 call with a 2-turn context (first turn: dump data; second
   turn: "write a 400-word weekly market digest for Dubai land professionals,
   citing specific posts or transactions where relevant").
3. Posts the output as a new `Post` with `authorId = <archibald-bot-user-id>`,
   `tags = ['digest', 'market-insight']`, `visibility = PUBLIC`,
   `moderation = APPROVED` (bypasses moderation queue — this is a trusted writer).

### 4.4 Market insights auto-posts (V2+)

When the DLD API is integrated (`ABU_DHABI_MIGRATION.md` §8 Phase 3 candidate), a
separate cron runs daily, detects unusual transactions (volume spike, price outlier,
new project launch), and posts a short factual "DLD snapshot" card. These posts are
tagged `dld-insight` and have a structured body (JSON block rendered as a nice
card, not freeform markdown) so they're distinguishable from human posts.

### 4.5 Cross-search

The `/api/wall/search` route (Postgres FTS) and `/api/archibald/search` route
(pgvector + FTS hybrid on `KnowledgeChunk`) share a front-end. User types a query
in the chat widget's search box → both routes fire → results are merged and
labelled "Wall" or "Knowledge Base" in the drop-down. Clicking jumps to the post
or opens a knowledge document modal. Keeps mental model simple: one search box.

---

## 5. Rate limiting + cost model

### 5.1 Claude cost projection

Assumptions for Sprint 4 steady state: 500 weekly active users, 5 Archibald messages
per user per day on average (light use is 2, power users are 20 — 5 is a conservative
average). Typical message shape with tool use: ~1000 tokens in (system + tools +
history + user), ~400 tokens out.

Per message:
- **Intent classify (Haiku):** 1200 tokens in, 50 tokens out = ($0.0012 + $0.00025) = **$0.00145**
- **Main turn (Sonnet, cached system/tools):** 1000 in (of which 600 cached = $0.06 × 0.1 + $0.012) +
  400 out ($0.006) = **~$0.007** per turn
- **Tool call resolution (1 round-trip, Sonnet):** 600 in + 200 out = **~$0.0048**
- **Total per message, average:** **~$0.013**

500 users × 5 msgs/day × 30 days × $0.013 = **~$975 / month** at steady state.

Scenario variations:
- **Opus-heavy (20 % of messages go to Opus):** +40 % cost → ~$1365 / month.
- **No prompt caching (worst case):** ~$2400 / month.
- **Light users (1.5 msgs/day instead of 5):** ~$290 / month.

Numbers stay < $3 k / month at 500 WAU — tolerable versus the revenue impact of a
working Archibald. Pricing sources:
[Claude API pricing](https://platform.claude.com/docs/en/about-claude/pricing),
[Prompt Caching docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching).

### 5.2 Rate limits by tier

Implemented via **Upstash Redis** (no infrastructure overhead, free tier covers
launch — ~10 k commands/day).

| Tier | Archibald msgs/day | Archibald msgs/hour | Wall posts/day | Wall comments/day | Media upload/day | Max video MB |
|---|---|---|---|---|---|---|
| FREE (approved) | 20 | 10 | 0 (read only) | 10 | 5 images | n/a |
| SILVER | 50 | 20 | 2 | 50 | 20 images / 2 videos | 100 |
| GOLD | 200 | 60 | 10 | 200 | 50 images / 10 videos | 250 |
| PLATINUM | 1000 | 200 | 50 | 1000 | unlimited | 1000 |
| ADMIN | unlimited | unlimited | unlimited | unlimited | unlimited | unlimited |

Rate-limited endpoint returns 429 with `{ retryAfter: <seconds>, tier: <current> }`.
The client shows a soft modal: *"You've hit your daily limit. Upgrade to GOLD for
10× more Archibald messages."*

### 5.3 Wall media constraints

- Images: max 15 MB, resized server-side to max 2560 px longest side, WebP for
  display + original retained in R2 (lifecycle-expired after 90 days to save cost).
- Videos: max per-tier cap (see above), max 60 s at launch. Transcoded to H.264
  720p via Mux or Cloudflare Stream in V2.
- PDFs: max 25 MB, preview via client-side PDF.js.
- One post can have up to **4 media** (Twitter-like). Keeps the UI focused and the
  moderation sane.

---

## 6. Phased rollout

### Sprint 1 — Wall MVP + Archibald tool-use (3 weeks) 🟢 Start here

**Goal:** a thin working Wall + Archibald that can actually talk to the platform.

- [ ] Prisma migration: all 9 Wall models + 5 Archibald models + pgvector extension.
      Add User field `verifiedProfessional: Boolean @default(false)`. (Schema change
      requires founder approval — mirrors `LAYERS_RBAC_PROPOSAL.md` Phase 4 pattern.)
- [ ] `src/lib/storage.ts` abstraction; R2 credentials provisioned.
- [ ] `src/lib/rate-limit.ts` wrapping Upstash Redis with a `limit(key, tier, op)`
      helper.
- [ ] `src/lib/feasibility-engine.ts` — extract pure calc from FeasibilityCalculator
      component (no UI change).
- [ ] `src/lib/map-controller.ts` + `useMapController()` hook for imperative map API.
- [ ] Wall API: `POST /api/wall/posts`, `GET /api/wall/posts` (feed, cursor),
      `POST /api/wall/posts/:id/comments`, `POST /api/wall/posts/:id/reactions`,
      `POST /api/wall/uploads` (signed R2 URL).
- [ ] Wall moderation: on-write Haiku spam check + admin review queue
      `/admin/wall/queue`.
- [ ] Wall UI at `/feed`: chronological feed only (no trending), post composer with
      image upload, reaction bar, comments panel (depth 1 only in Sprint 1).
- [ ] Archibald rewrite: Anthropic SDK installed; ChatSession + ChatMessage tables;
      tool-use for `searchParcels`, `highlightOnMap`, `getDLDFees`, `navigatePlatform`,
      `calculateFeasibility`; streaming SSE response.
- [ ] Archibald UI: persisted chat sidebar on `/parcels/map`, language toggle,
      inline citations rendered.
- [ ] Professional verification flow: admin-only form to flip
      `User.verifiedProfessional = true` after manual RERA number / BRN check.
- [ ] Rate limits enforced on all new endpoints.
- [ ] Telemetry: ActivityLog kinds `POST_CREATED`, `COMMENT_CREATED`, `REACTION_ADDED`,
      `ARCHIBALD_MESSAGE`, `ARCHIBALD_TOOL_CALLED`.

**Exit criteria.** Zhan and Dymo (ADMIN) can post a thread, react to each other's
comments, ask Archibald "find me a residential plot in Meydan under 30 M AED", see
matching plots highlighted on the map, and have the whole interaction persisted.

### Sprint 2 — Knowledge base bootstrap (3 weeks)

- [ ] Static knowledge ingester — markdown files in `docs/knowledge/**/*.md` are
      chunked, embedded (Voyage-3 via API), written to KnowledgeChunk.
- [ ] Seed 40-60 English documents: DLD fees, Oqood, Ejari, NOC, Form F, Golden Visa,
      VAT, service charges, 10 core developers, 20 flagship projects. Hand-authored
      + verified by Dymo (domain owner).
- [ ] Archibald retrieval tools wired: `getKnowledgeByTopic`, `getDeveloperInfo`,
      `getProjectInfo`, `getRERARule`.
- [ ] Wall: nested comments (depth 3), reaction counts denormalised, HN-style
      trending sort, Postgres FTS search at `/api/wall/search`.
- [ ] Supabase Realtime broadcast for new-post toast on feed.
- [ ] Hallucination guards (§3.6) implemented: disclaimer injection, temperature 0
      for legal intents, "I don't know" fallback on low similarity.
- [ ] `KnowledgeGap` logger; admin UI to browse gaps.

**Exit criteria.** Archibald can cite a specific knowledge document when asked
"what is the DLD transfer fee on a 50 M AED plot?", and the citation renders
inline in the chat with a click-through to the source.

### Sprint 3 — Wall → KB extraction + teach UI (2 weeks)

- [ ] Extraction worker (§4.1) — cron-based, Sonnet-powered, writes PENDING
      KnowledgeDocuments with `sourceKind = WALL_POST`.
- [ ] `/admin/archibald` full UI: doc tree, editor, re-embed on approval,
      gap drawer with merge + resolve.
- [ ] Notification kinds: `POST_REPLY`, `COMMENT_REPLY`, `POST_MENTIONED`.
- [ ] PDPL compliance checklist: post edit history retention (soft delete +
      editedAt already done), right-to-be-forgotten cascade test, author
      consent flow for photos of identifiable people (see §7.2).

**Exit criteria.** A broker posts "sold in Meydan 650/sqft"; 5 minutes later it
appears in the admin knowledge queue as a draft; admin approves; next user asking
"what's the Meydan price benchmark?" gets Archibald citing that post.

### Sprint 4 — Model routing + monetisation rails (2 weeks)

- [ ] Intent classifier (Haiku) gating model routing (Haiku / Sonnet / Opus).
- [ ] Tier-based rate limits enforced per §5.2.
- [ ] Upgrade CTA on 429 responses.
- [ ] Archibald weekly digest auto-post (§4.3).
- [ ] Cost dashboard at `/admin/archibald/costs` — tokens per day, per model,
      top users. Basic Anthropic usage export + aggregator.

**Exit criteria.** 90 % of cheap intents are served by Haiku; monthly LLM cost stays
under $1500 at 500 WAU in steady state.

### V2 and later (explicitly out of scope)

- Video uploads beyond 60 s / transcoding pipeline
- Live-capture video
- Multi-account cross-posting (e.g. LinkedIn bridge)
- Arabic + Russian full knowledge-base translation
- Mobile PWA with push notifications (overlaps with user-dashboards Phase 6)
- Facet search UI
- Collaborative moderation (community flagging with gamified reputation)
- DLD API auto-posts (dependency on API access)

### Dependency graph

```
Schema migration ─┬─> Wall models -> Wall API -> Wall UI -> Wall feed
                  ├─> Archibald models -> tool-use rewrite -> tool handlers
                  └─> pgvector -> KnowledgeChunk -> embedder -> retrieval
storage.ts -> R2 buckets -> media API -> composer
rate-limit.ts -> Redis -> all new endpoints
map-controller.ts -> highlightOnMap tool
feasibility-engine.ts -> calculateFeasibility tool
Sprint 1 exit  -> Sprint 2 (KB seed)
Sprint 2 exit  -> Sprint 3 (extractor uses Wall posts)
Sprint 3 exit  -> Sprint 4 (cost dashboards need populated ChatMessage table)
```

---

## 7. Risks and open questions

### 7.1 Top 5 technical risks

- **T1. pgvector index tuning at scale.** HNSW at 50 k chunks is fast (~30 ms p50);
  at 500 k chunks with 1024-dim embeddings, memory pressure on Supabase Small tier
  becomes real. Mitigation: plan to move to Medium tier when KnowledgeChunk > 100 k
  rows; IVFFlat as fallback if memory-bound
  ([pgvector HNSW vs IVFFlat](https://medium.com/@bavalpreetsinghh/pgvector-hnsw-vs-ivfflat-a-comprehensive-study-21ce0aaab931)).
- **T2. Realtime fan-out.** Supabase Realtime Broadcast scales, but the *client*
  also needs to absorb burst messages without re-renders. Mitigation: client batches
  incoming post IDs at 250 ms intervals, shows "N new posts" pill — don't render
  into the feed until user clicks.
- **T3. Moderation queue backlog.** One admin cannot review 200 posts/day manually.
  Mitigation: Sprint 1 caps posting to verified professionals only (volume will be
  low). Sprint 4 adds a second-admin-invite flow. V2 adds community flagging.
- **T4. Rate-limit bypass via concurrent sessions.** Same user in three browser tabs
  could race past the per-hour cap. Mitigation: Redis key is `rl:<userId>:<op>:<window>`
  so all tabs share one counter.
- **T5. Claude provider outage.** Anthropic had incidents in 2025. Mitigation:
  graceful degradation — Archibald UI shows *"I'm thinking slower than usual; please
  try again in a minute."* instead of erroring out; ChatMessage write happens
  regardless of model response success so session continuity survives. OpenAI as
  secondary is out-of-scope per D2 but worth revisiting if incidents become frequent.

### 7.2 Top 5 business / legal risks

- **B1. Advertiser Permit (starts 1 Feb 2026).** Every paid-or-unpaid real-estate
  promotion on a UAE social platform now requires an Advertiser Permit; non-compliance
  penalty up to AED 1 M
  ([Gulf News coverage](https://gulfnews.com/uae/new-uae-law-advertiser-permit-now-mandatory-for-influencers-and-creators-for-social-media-1.500427938)).
  Wall's "I just closed a deal at X price" posts are almost certainly promotions.
  **Mitigation:** Post composer is feature-detected by tag — posts tagged `deal`
  / `listing` trigger a mandatory `reraPermitRef` field (the Trakheesi permit number)
  before save. Legal opinion before Sprint 1 start on whether the platform itself
  needs an Advertiser Permit (likely yes — get it).
- **B2. Trakheesi & RERA broker registration.** Every Dubai broker ad must show the
  RERA registration number and agency permit; failure = AED 50 k minimum fine +
  trading-licence suspension
  ([Titan Digital UAE](https://titandigitaluae.com/real-estate/uae-real-estate-advertising-rules/)).
  **Mitigation:** Verified-professional flag gates posting; the author's RERA number
  is automatically appended to every deal-tagged post as a footer block.
- **B3. PDPL consent for photos.** Photos of identifiable persons are personal data
  under UAE PDPL; consent must be freely given and informed
  ([UAE PDPL guide — CookieYes](https://www.cookieyes.com/blog/uae-data-protection-law-pdpl/)).
  **Mitigation:** Upload flow displays a consent checkbox *"I confirm I have consent
  to publish any identifiable persons in this media"*. Stored on `Media.consentConfirmedAt`
  (add to schema in Sprint 3). PDPL enforcement is currently voluntary but this is
  moving quickly — budget for it now rather than retrofitting.
- **B4. Liability for advice Archibald gives.** If Archibald gives a legal-sounding
  answer and a user loses money, is ZAAHI liable? **Mitigation:** Hallucination
  guards in §3.6, mandatory disclaimer on every legal-intent response, `logKnowledgeGap`
  when unsure. Beyond technical: an engagement with a Dubai RE lawyer for a standard
  disclaimer on /parcels/map before Sprint 1 ships. This is cheap insurance.
- **B5. Wall becomes a price-pump vector.** A broker posts "I just sold at 800/sqft"
  to inflate the perceived benchmark, Archibald later cites it as market data, a
  buyer overpays based on the bot's synthesis. **Mitigation:** Extraction pipeline
  (§4.1) requires human review; extracted facts keep a `sourceKind = WALL_POST`
  badge on every citation; Archibald's response template explicitly prefixes user-
  generated content with *"one broker reported"* rather than *"the market rate is"*.

### 7.3 Open questions for founder

- **Q1. Professional verification process.** Who manually verifies RERA numbers?
  Zhan? Dymo? An ops hire? This bottlenecks Sprint 1 launch if no-one is named.
- **Q2. Advertiser Permit application.** Does ZAAHI (the platform) already hold one,
  or is this a Sprint 0 task? Legal counsel needed.
- **Q3. Moderation SLA.** Founders as sole moderators for launch — acceptable with
  reply-within-12h target, or hire a contractor? Cost trade-off: $600/mo contractor
  vs founder bandwidth.
- **Q4. Wall audience on launch.** All approved users can read, or just verified
  professionals? Leaning toward "all approved can read, only verified can post" —
  but this is a product call, not technical.
- **Q5. Opus vs Sonnet as the main model.** Sonnet 4.6 is 80 % of Opus quality for
  ~20 % of the cost. Start on Sonnet and escalate to Opus by intent, or start
  Opus-only for launch polish and optimise later?
- **Q6. Handling conflicts between Wall post + Archibald KB.** If a broker post
  contradicts a static document (e.g. post says "DLD fee is 3 %", KB says "4 %"),
  which wins in the reply? **Recommendation:** static KB wins for legal facts, Wall
  wins for current market data — encoded in tool priority.
- **Q7. Archibald-bot identity.** Is there an ADMIN user named "Archibald" that
  weekly digests post under, or do we fake the `authorId` somehow? **Recommendation:**
  real User row with `role = ADMIN, email = archibald@zaahi.io`, distinct avatar,
  banner in the Post card indicating "AI-authored".
- **Q8. Knowledge provenance for RERA audits.** If a regulator asks "where did you
  get that piece of advice", can we produce an audit trail from user answer → chunk
  → document → source (file or post)? **This is why every `ChatMessage.citations`
  row, every `KnowledgeChunk`, every `KnowledgeDocument.sourceRef` has to be
  preserved even after soft-delete.** Confirm retention policy with counsel.
- **Q9. Mobile Arabic RTL.** Archibald responses in Arabic render as LTR in the
  current chat widget. Sprint 2 worth a proper `dir="rtl"` pass, or V2?

### 7.4 Top 3 decisions founder must make *before* Sprint 1 codework starts

Repeating from §0 for scannability:

- **D1. Posting eligibility.** Verified professionals only (recommended)?
- **D2. LLM provider scope.** Claude only (recommended)?
- **D3. Media vendor.** Cloudflare R2 (recommended)?

If all three trend toward the recommendation, Sprint 1 starts immediately after
schema approval.

---

## 8. Competitive research — what to steal, what to avoid

### 8.1 Reddit
**Steal:** community-first identity ("u/username" as persistent handle is stickier
than a real name), upvote decay math for large corpora (useful when Wall crosses
500 k posts), subreddit-as-topic model (our Tag system is conceptually similar),
infinite-depth threads are actually useful in adjudicated contexts.
**Avoid:** anonymous accounts (kills professional signal), karma gaming (not relevant
to our audience), the toxic-comment class (moderation cost would kill us).
**Reference:** [Reddit ranking deep-dive](https://medium.com/hacking-and-gonzo/how-reddit-ranking-algorithms-work-ef111e33d0d9).

### 8.2 Perplexity
**Steal:** "cite everything or say nothing" principle — we apply this to Archibald
in §3.6. Transparent retrieval sources inline. Hybrid vector + lexical retrieval
is their proven pattern ([Vespa on Perplexity](https://vespa.ai/perplexity/)).
**Avoid:** the open-web fetching layer — Wall + DDA is our closed corpus; pulling
in random web results muddies our authority.

### 8.3 Character.ai
**Steal:** character personality (Archibald-as-cat has character capital we're not
using aggressively enough — exploit), persistent conversation history with
meaningful titles (our ChatSession.title pattern).
**Avoid:** roleplay-style open-ended chat (wrong vibe for professional tool), lack
of citations (Character.ai has no grounding; we must have it).

### 8.4 Intercom Fin
**Steal:** intent-triaged routing (trivial → Haiku, complex → Opus), explicit
"I don't know" fallback with human-handoff, precise-citation-from-owned-corpus
architecture, the "only answer from approved content" principle. Fin is effectively
the B2B SaaS version of what Archibald should be.
**Avoid:** the hand-off-to-human queue as the primary escape hatch (we don't have
human support staff) — our escape hatch is the knowledge-gap logger feeding the
admin teach UI.

### 8.5 Notion AI
**Steal:** context-aware tools ("summarise this page", "extract action items")
— relevant if we add `summariseThisPost` or `compareTheseTwoPlots` tools in V2.
**Avoid:** generic auto-complete UX — Archibald is a Q&A and tool agent, not a
writing assistant. Different mental model for users.

### 8.6 Zillow (best-in-class listing platform; no community feed)
**Steal:** "saved searches with alerts" (already in Phase 1 dashboards), map-centric
UX (we're already map-centric), compare plots side-by-side (on our roadmap).
**Avoid:** the absence of community — Zillow's omission is our opportunity. Wall
is the differentiator.

### 8.7 Hacker News
**Steal:** the ranking formula we chose in §2.7, flat comment UI with clear thread
indent, aggressive moderation norms, small fixed reaction set (their single upvote
≈ our 4-kind reactions).
**Avoid:** the text-only aesthetic — our audience expects media. Their minimalism
is not a virtue for us.

---

## 9. Sources

Every non-obvious claim in this document is backed by one of these. Accessed
2026-04-16.

**Anthropic / Claude API:**
- [Claude API pricing (official)](https://platform.claude.com/docs/en/about-claude/pricing)
- [Prompt caching documentation](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)
- [Anthropic API pricing 2026 — Finout breakdown](https://www.finout.io/blog/anthropic-api-pricing)
- [Claude API pricing 2026 — Metacto](https://www.metacto.com/blogs/anthropic-api-pricing-a-full-breakdown-of-costs-and-integration)

**Supabase:**
- [Realtime architecture](https://supabase.com/docs/guides/realtime/architecture)
- [Realtime benchmarks](https://supabase.com/docs/guides/realtime/benchmarks)
- [Realtime limits](https://supabase.com/docs/guides/realtime/limits)
- [Storage pricing](https://supabase.com/docs/guides/storage/pricing)
- [Egress usage management](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
- [Connection management](https://supabase.com/docs/guides/database/connection-management)

**Cloudflare:**
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [R2 vs S3 comparison 2026 — Vocal](https://vocal.media/futurism/cloudflare-r2-2026-pricing-features-and-aws-s3-comparison)

**pgvector:**
- [pgvector 0.8 release notes — postgresql.org](https://www.postgresql.org/about/news/pgvector-080-released-2952/)
- [pgvector on GitHub](https://github.com/pgvector/pgvector)
- [HNSW vs IVFFlat deep study — Medium (BavalpreetSinghh)](https://medium.com/@bavalpreetsinghh/pgvector-hnsw-vs-ivfflat-a-comprehensive-study-21ce0aaab931)
- [pgvector hybrid search — Instaclustr](https://www.instaclustr.com/education/vector-database/pgvector-hybrid-search-benefits-use-cases-and-quick-tutorial/)

**Ranking algorithms:**
- [How Reddit ranking algorithms work — Medium (Amir Salihefendic)](https://medium.com/hacking-and-gonzo/how-reddit-ranking-algorithms-work-ef111e33d0d9)
- [Reddit and HN ranking compared — Saturn Cloud](https://saturncloud.io/blog/how-are-reddit-and-hacker-news-ranking-algorithms-used/)
- [A better ranking algorithm — Herman's blog](https://herman.bearblog.dev/a-better-ranking-algorithm/)

**UAE regulation:**
- [RERA broker advertising rules 2026 — Titan Digital UAE](https://titandigitaluae.com/real-estate/uae-real-estate-advertising-rules/)
- [Dubai property marketing rule for brokers — builtenvironmentme.com](https://www.builtenvironmentme.com/dubai-reveals-new-property-marketing-rule-for-brokers)
- [Advertiser Permit from 1 Feb 2026 — Gulf News](https://gulfnews.com/uae/new-uae-law-advertiser-permit-now-mandatory-for-influencers-and-creators-for-social-media-1.500427938)
- [UAE PDPL overview — CookieYes](https://www.cookieyes.com/blog/uae-data-protection-law-pdpl/)
- [UAE data privacy AWS compliance page](https://aws.amazon.com/compliance/uae_data_privacy/)

**Competitive architecture:**
- [Perplexity on Vespa — Vespa.ai](https://vespa.ai/perplexity/)
- [Inside Perplexity — xfunnel](https://www.xfunnel.ai/blog/inside-perplexity-ai)
- [Perplexity architecture behind real-time web data — frugaltesting](https://www.frugaltesting.com/blog/behind-perplexitys-architecture-how-ai-search-handles-real-time-web-data)

---

**End of document.**

*Research only — no code or schema changes have been made to the project. Awaits
founder decisions on §7.4 D1–D3 before any Sprint 1 work begins.*
