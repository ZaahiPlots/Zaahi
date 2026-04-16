# USER DASHBOARDS RESEARCH — ZAAHI

**Дата:** 2026-04-16
**Статус:** 🟡 RESEARCH ONLY. Никакого кода, никаких изменений. Требуется
founder approval перед любым этапом реализации.
**Автор:** Claude Code agent
**Связанные документы:** `LAYERS_RBAC_PROPOSAL.md`, `ABU_DHABI_MIGRATION.md`

---

## 0. Executive Summary

**Текущее состояние:**
ZAAHI уже имеет **два работающих user-facing кабинета** — `/dashboard` (общий, 10 секций) и `/ambassador` (посвящённый). Пост-логин лендинг — `/parcels/map`, карта играет роль "home". Проблема: **`/dashboard` — 80% mock data.** Форма профиля не сохраняется, избранное не персистится, уведомления фейковые, recent activity фейковая. `/ambassador` персистится полностью — это единственный **production-ready** кабинет сегодня.

**Role-модель однооссевая + orthogonal:**
`User.role` — одно значение из `OWNER|BUYER|BROKER|INVESTOR|DEVELOPER|ARCHITECT|ADMIN`. `User.ambassadorActive` — независимый boolean. То есть multi-role уже работает в схеме (OWNER + Ambassador = `role=OWNER, ambassadorActive=true`). Третья ось — `tier` (FREE/SILVER/GOLD/PLATINUM) — живёт на `AmbassadorApplication.plan`, пока не отражена на User row (per RBAC proposal Phase 4).

**Рекомендуемое направление:**

1. **Phase 1 (fastest ROI):** Допилить существующий `/dashboard` — persist profile fields, persist favorites, persist notifications. Ноль новых схемных революций, одна новая миграция. 1-2 недели.
2. **Phase 2 (revenue-facing):** Построить OWNER dashboard с **analytics по своим parcel'ам** ("кто смотрел"). Owners — кто SELLит участки за деньги. Сегодня у нас 114 parcels. Если дать им данные — они активнее пушат листинги. 2-3 недели.
3. **Phase 3 (monetization prep):** BROKER dashboard (CRM + leads). Это будущий subscription revenue stream (см. RBAC Q7).
4. **Phase 4-6:** Investor / Developer / Architect — общая архитектура виджетов, shared layout, каждая роль добавляется за 1-1.5 недели.

**Не делаем:**
- Шесть одновременно. Это classic scope creep.
- Full-Stripe-клона admin panel (уже есть `/admin/ambassadors`, дополнения в плане).
- Сложные dual-role UX — в сегодняшнем коде нет такой потребности.

**Non-obvious insight:** карта (`/parcels/map`) уже сейчас играет роль "feed" — каждая сессия начинается с map. Это **Pinterest-модель**, не Stripe-модель. Правильный dashboard должен **дополнять карту**, не заменять её. Detail'и ниже.

**Что founder должен решить до старта:** §10 Q1-Q9.

---

## 1. Текущее состояние

### 1.1 Что есть (из аудита)

| URL | Auth | Состояние | Что работает |
|---|---|---|---|
| `/parcels/map` | AuthGuard | ✅ Live, polished | Map, layers, parcel selection, SidePanel, feasibility calculator |
| `/dashboard` | AuthGuard | 🟡 UI shell + mock data | Navigation structure ok; **profile form не сохраняет**, favorites=1 hardcoded mock, notifications=4 mock, recent activity=5 mock, "My Properties" reads real data но edit не работает |
| `/ambassador` | AuthGuard | ✅ Live, end-to-end | Activate flow, referral code + QR, downline tree, commission history, all DB-backed |
| `/admin/ambassadors` | Admin guard | ✅ Live (shipped today) | Applications list, approve/reject, email+telegram |
| `/deals/[id]` | AuthGuard | ✅ Live | Deal room with chat, audit trail, state machine |
| `/parcels/[id]` | Public | ✅ Live | Public parcel detail page |
| `/parcels/new` | AuthGuard | ✅ Live | Add parcel wizard (OWNER/BROKER) |
| `/join` | Public | ✅ Live | Marketing + ambassador registration |
| `/settings` | AuthGuard | ❌ Stub (redirects to /dashboard) | Redirect only |
| `/deals` | AuthGuard | ❌ Stub | Empty, redirects to /dashboard |

**Pages mentioned in brief that do NOT exist:** `/profile`, `/account`, `/my`, `/user`.

### 1.2 Что persists vs. mock

| Feature | UI present | DB-backed | Gap to close |
|---|---|---|---|
| Profile name / phone | ✅ | ✅ (via `/api/users/sync`) | none |
| Profile bio / avatar / timezone / language / currency | ✅ form | ❌ not persisted | **schema** (Phase 1) |
| Company name / RERA / BRN (for BROKER) | ✅ form | ❌ not persisted | **schema** (Phase 1) |
| Favorites (saved parcels) | ✅ UI (1 hardcoded) | ❌ | **schema + API** (Phase 1) |
| Notifications | ✅ UI (4 hardcoded) | ❌ | **schema + delivery** (Phase 1 / 2) |
| Recent activity | ✅ UI (5 hardcoded) | ❌ | **event log** (Phase 2) |
| Ambassador referral link / QR / stats | ✅ | ✅ | none |
| Ambassador downline tree | ✅ | ✅ | none |
| Commission history | ✅ | ✅ | none |
| My Properties list | ✅ | ✅ | none |
| Deal list + deal room | ✅ | ✅ | none |
| "Who viewed my plot" analytics | ❌ | ❌ | **both** (Phase 2) |
| Saved calculations (feasibility) | ❌ | ❌ | **both** (Phase 4) |
| Side-by-side comparison | ❌ | ❌ | UI only (Phase 4) |
| KYC / verification | ❌ | ❌ | future |
| 2FA / connected accounts | ❌ | ❌ (Supabase has it natively) | wire UI |

### 1.3 Что есть в schema сегодня

```
User { id, email, role, name, phone, createdAt,
       referralCode, referredById, referredAt, ambassadorActive }
```

Что нужно добавить для Phase 1+ (nullable, additive):
```
+ avatarUrl: String?
+ bio: String?
+ timezone: String?  (IANA, e.g. "Asia/Dubai")
+ language: String?  ("EN" | "AR" | "RU" | ...)
+ currency: String?  ("AED" | "USD" | "EUR")
+ companyName: String?
+ reraLicense: String?  (BROKER only)
+ brnNumber: String?   (BROKER only)
+ lastSeenAt: DateTime?
+ lastLoginAt: DateTime?
+ notificationPrefs: Json?  // {inAppX, emailX, pushX}
+ kycStatus: String?  ("NONE" | "PENDING" | "VERIFIED" | "REJECTED")
```

Plus new tables:
```
+ SavedParcel { id, userId, parcelId, createdAt } @@unique([userId, parcelId])
+ ParcelView  { id, userId, parcelId, viewedAt, userAgent, ipHash } 
+ Notification{ id, userId, kind, payload Json, readAt, createdAt }
+ ActivityLog { id, userId, kind, ref, payload Json, createdAt }
```

---

## 2. Multi-Role реальность

### 2.1 Текущая модель — orthogonal axes

```
┌─ Axis A: role (single) ──────────────────────────────────────┐
│  OWNER  BUYER  BROKER  INVESTOR  DEVELOPER  ARCHITECT  ADMIN │
└──────────────────────────────────────────────────────────────┘
┌─ Axis B: ambassadorActive (bool) — orthogonal ───────────────┐
│  false  ←→  true                                             │
└──────────────────────────────────────────────────────────────┘
┌─ Axis C: accessTier (future, RBAC Phase 4) ──────────────────┐
│  FREE   SILVER   GOLD   PLATINUM                             │
└──────────────────────────────────────────────────────────────┘
```

**Уже поддержано сегодня** (сочетания, которые работают):
- OWNER + Ambassador (владеет участками + приводит друзей)
- BROKER + Ambassador (торгует + растит сеть)
- BROKER + Buyer-for-self (редкий, но возможный)
- Investor без ambassador (просто смотрит)

**Не поддержано (осознанно):**
- User с двумя одновременными role (например, OWNER+BROKER). В коде нет if-ladders на это. Per `/api/parcels/submit`, роль инферится из контекста (OWNER submits own plot, BROKER submits client plot). Схема не нуждается в `roles: Role[]` — user может просто сменить primary role в Settings.

### 2.2 Tier как четвёртая ось

Tier (FREE/SILVER/GOLD/PLATINUM) пока приколочен к `AmbassadorApplication.plan` — на User.accessTier планируется в RBAC Phase 4. Для dashboards это означает: **сегодня tier-gated features — это "буду показывать после Phase 4".** В mockups ниже помечаю их как `🔒 GOLD` / `🔒 PLATINUM`.

---

## 3. Детальные dashboard предложения (с wireframes)

Все wireframes в ASCII. Layout consistent: левый sidebar (collapsible mobile), top bar, main canvas. Glass style из `globals.css` tokens.

### 3.0 Shared shell (layout.tsx)

```
┌────────────────────────────────────────────────────────────────┐
│  [Z] ZAAHI    [📍 Map] [🏠 Home] [💬 Deals(2)] [🏆 Ambassador]  │
│                                              [🔔 3] [ZR] │  ← top bar
├────────────┬───────────────────────────────────────────────────┤
│            │                                                   │
│  Sidebar   │                Main canvas                        │
│  (role-    │                                                   │
│   aware    │                                                   │
│   nav)     │                                                   │
│            │                                                   │
└────────────┴───────────────────────────────────────────────────┘
```

**Ключевое:** shared TopBar всегда показывает **Map link** — карта остаётся "feed". Dashboard = **справка и tools** над картой. Это key insight из аудита — карта уже играет роль home, дополняем, не заменяем.

---

### 3.1 OWNER Dashboard

**Кто:** собственник участка. Главный revenue stream сегодня (114 parcels; 111 listed).
**Основная задача:** понять кто интересуется его участком и общаться с покупателями.

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (OWNER)                                            │
│  ◆ Overview              (stats + recent activity)          │
│  ◆ My Plots (3)          (list + analytics per plot)        │
│  ◆ Inquiries (7 new)     ◀ key revenue signal              │
│  ◆ Offers (2 open)                                          │
│  ◆ Documents                                                │
│  ◆ Market Insights       🔒 GOLD                            │
│  ────                                                       │
│  ◆ Ambassador            (if active)                        │
│  ◆ Settings                                                 │
└─────────────────────────────────────────────────────────────┘
```

**Overview wireframe:**

```
┌── My Portfolio ──────────────────────────────────────────────┐
│ AED 324,500,000   ↑ 4.2% vs 30d                              │
│ across 3 plots    Dubai · Meydan · Business Bay              │
└──────────────────────────────────────────────────────────────┘

┌── This Week ──────────────┬── Open Inquiries ────────────────┐
│  142 views on listings    │  7 new  3 replied  2 ghosted     │
│  12 Site Plan downloads   │  [View all →]                    │
│  8 profile visits         │                                  │
│  → biggest: Plot 6817016  │                                  │
└───────────────────────────┴──────────────────────────────────┘

┌── Recent Activity ───────────────────────────────────────────┐
│ 🔍 Your plot 6817016 got 28 views today (+40% vs avg)        │
│ 💬 New inquiry from BuyerX on Plot 6812345                   │
│ 📄 Site Plan PDF downloaded 3 times today                    │
│ ✓ Your plot 6812345 was approved & listed                    │
│ 🤝 Offer 12M AED submitted on Plot 6817016                   │
└──────────────────────────────────────────────────────────────┘

┌── Quick Actions ─────────────────────────────────────────────┐
│  [+ Add New Plot] [Message Broker] [Export Report]           │
└──────────────────────────────────────────────────────────────┘
```

**"My Plots" section — per-plot card:**

```
┌──────────────────────────────────────────────────────────────┐
│ PLOT 6817016 · Meydan · Residential · 10,000 sqft            │
│                                                              │
│ Listed at: AED 50,000,000            Status: 🟢 LIVE         │
│ Per sqft:  AED 5,000/GFA                                    │
│                                                              │
│ ┌─Last 30 days──────────────────────────────────────────┐    │
│ │  142 map views      28 detail opens      12 PDF dl    │    │
│ │  ████████████░░░░░░░░░░░░░░░░░░░░░░░░   sparkline    │    │
│ └───────────────────────────────────────────────────────┘    │
│                                                              │
│ 🎯 Interest signal: HIGH (3 unique high-intent visitors)     │
│    Top visit sources: Dubai (67%) · Abu Dhabi (12%)          │
│    Top time: Thu 2-5pm                                       │
│                                                              │
│ 💬 3 inquiries · 1 active offer (12M AED pending)           │
│    [View inquiries] [Edit listing] [Delist]                  │
└──────────────────────────────────────────────────────────────┘
```

**Killer feature = "Who viewed my plot" analytics** (Airbnb Host Insights pattern). Not per-person leaks — aggregate: location, time, referrer. Privacy-preserving but makes owner feel *seen*.

### 3.2 BUYER Dashboard

**Кто:** ищет участок. Больший потенциал по volume (много потенциальных buyers), low value per-transaction относительно OWNER.
**Основная задача:** собрать shortlist, сравнить, следить за изменениями.

```
SIDEBAR (BUYER)
  ◆ Overview                (saved + recently viewed + alerts)
  ◆ Shortlist (14)          ◀ Pinterest pattern
  ◆ Compare (3 plots)       ◀ Zillow pattern
  ◆ Alerts (2 new)
  ◆ My Offers (1)
  ◆ Feasibility Lab         (saved calculations)  🔒 GOLD
  ◆ Dream Board             🔒 GOLD (visual moodboard)
  ────
  ◆ Ambassador (if active)
  ◆ Settings
```

**Overview — Pinterest-style masonry shortlist:**

```
┌── Good Morning, Ahmed ───────────────────────────────────────┐
│  3 new plots match your filters · 1 price drop on saved      │
│  [Review alerts →]                                           │
└──────────────────────────────────────────────────────────────┘

┌── Your Shortlist (14) ───────────────────────────────────────┐
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐                     │
│  │plot  │  │plot  │  │plot  │  │plot  │     (masonry grid)  │
│  │6817  │  │6812  │  │5912  │  │1010  │                     │
│  │50M   │  │28M   │  │88M   │  │68M   │                     │
│  │ ♥    │  │ ♥    │  │ ♥    │  │ ♥    │                     │
│  └──────┘  └──────┘  └──────┘  └──────┘   (+ more ↓)        │
│                                                              │
│  [+ Add to compare] [Filter] [Sort: price ↑]                 │
└──────────────────────────────────────────────────────────────┘

┌── Recently Viewed (last 7 days) ─────────────────────────────┐
│  5 plots · avg price 42M AED · median GFA 8,500 sqft         │
│  [View history →]                                            │
└──────────────────────────────────────────────────────────────┘
```

**Compare (3-4 plots side-by-side):**

```
              ┌─ Plot 6817 ─┬─ Plot 6812 ─┬─ Plot 5912 ─┐
Price         │ AED 50M     │ AED 28M     │ AED 88M     │
Price/sqft    │ 5,000       │ 3,500       │ 8,800       │
District      │ Meydan      │ Business Bay│ Al Furjan   │
Land use      │ Residential │ Commercial  │ Mixed       │
Area (sqft)   │ 10,000      │ 8,000       │ 10,000      │
Max GFA       │ 30,000      │ 48,000      │ 35,000      │
Max floors    │ 10          │ 16          │ 12          │
Status        │ LIVE        │ LIVE        │ LIVE        │
Inquiries (me)│ —           │ sent 2d ago │ —           │
              ├─────────────┼─────────────┼─────────────┤
              │ [Make offer]│ [Follow up] │ [Make offer]│
              └─────────────┴─────────────┴─────────────┘
```

### 3.3 BROKER Dashboard

**Кто:** посредник. Future revenue = subscription (RBAC Q7).
**Основная задача:** CRM, leads, pipeline, commissions tracking.

```
SIDEBAR (BROKER)
  ◆ Overview            (pipeline value + KPIs)
  ◆ Deals Pipeline      ◀ Stripe-style kanban
  ◆ Leads (inbox)
  ◆ Clients CRM         🔒 subscription
  ◆ My Listings         (plots I list for clients)
  ◆ Commissions         (from Ambassador + deal fees)
  ◆ Market Heatmaps     🔒 GOLD
  ◆ Bulk Export         🔒 subscription
  ◆ Team / Sub-agents   🔒 subscription  future
  ────
  ◆ Ambassador
  ◆ Settings
```

**Pipeline wireframe (Stripe-inspired kanban):**

```
┌─ INITIAL ─┬─ OFFER ─┬─ NEGOTIATION ─┬─ DEPOSIT ─┬─ DLD ─┬─ DONE ─┐
│           │         │               │           │       │        │
│ Plot 6817 │ Plot    │ Plot 5912     │ Plot      │       │ Plot   │
│ $50M      │ 6812    │ $88M          │ 1010      │       │ 3260   │
│ 3d ago    │ $28M    │ counter 85M   │ $68M      │       │ $40M   │
│           │ (today) │ 12d ago       │ 5d ago    │       │ closed │
│ Plot 6850 │         │               │           │       │ Mar 12 │
│ $25M      │         │ Plot 6117     │           │       │        │
│ 5d ago    │         │ $212M         │           │       │        │
│           │         │ waiting NOC   │           │       │        │
│           │         │               │           │       │        │
│ Total 75M │ 28M     │ 300M          │ 68M       │ —     │ 40M    │
└───────────┴─────────┴───────────────┴───────────┴───────┴────────┘
Pipeline total: AED 511M    ·    Expected commission (2%): AED 10.2M
```

**Commissions — dual-stream view:**

```
┌── Earnings This Month ──────────────────────────────────────┐
│ Platform commissions:  AED 204,000  (1 deal closed)         │
│ Ambassador downline:   AED  48,500  (7 commissions)         │
│ ─────                                                       │
│ Total:                 AED 252,500                          │
│                                                             │
│ ┌─Sparkline───────────────────────────────────────────┐     │
│ │ bar chart last 6 months                             │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                             │
│ Pending payout:        AED  80,000  [Request payout →]      │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 INVESTOR Dashboard

**Кто:** портфельный инвестор. Похож на BROKER + OWNER mix, но с фокусом на ROI.
**Позаимствовано:** Robinhood portfolio view.

```
SIDEBAR (INVESTOR)
  ◆ Portfolio           (total value + allocation donut)
  ◆ Positions           (list of owned plots)
  ◆ Watchlist           (plots to acquire)
  ◆ Alerts              (price drops, new opportunities)
  ◆ Projected Returns   🔒 GOLD
  ◆ Market Reports      🔒 PLATINUM
  ────
  ◆ Ambassador
  ◆ Settings
```

**Portfolio overview:**

```
┌── Portfolio ────────────────────────────────────────────────┐
│ AED 475,000,000                                              │
│ ↑ AED 18M (+3.9%) since acquisition                          │
│                                                              │
│ ┌─ Allocation ──────────────────┐  ┌─ Projected ROI ──────┐  │
│ │                               │  │ At market exit:      │  │
│ │   40% Residential             │  │   AED 45M profit     │  │
│ │   25% Commercial              │  │   (9.5% over 36mo)   │  │
│ │   20% Mixed                   │  │                      │  │
│ │   15% Hotel                   │  │ Break-even date:     │  │
│ │                               │  │   Dec 2026           │  │
│ └───────────────────────────────┘  └──────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 3.5 DEVELOPER Dashboard

**Кто:** девелопер — строит на своих/оптированных участках.

```
SIDEBAR (DEVELOPER)
  ◆ Projects            (plots with active construction)
  ◆ Pipeline            (options / pre-acquisitions)
  ◆ Compliance          (Trakhees, DM, DDA checklists per plot)
  ◆ Feasibility Lab     🔒 GOLD (advanced calculator)
  ◆ Construction Budget 🔒 PLATINUM
  ◆ Off-plan Sales      🔒 GOLD
  ────
  ◆ Ambassador
  ◆ Settings
```

Main content is per-project card with:
- 3D model thumbnail (already generated via loadZaahiPlots)
- Compliance status (traffic lights for DM, Trakhees, DDA)
- Timeline (foundation, structure, MEP, finishing)
- Budget variance
- Pre-sales % (for off-plan)

### 3.6 ARCHITECT Dashboard

**Кто:** архитектор — делает feasibility / design / DCR documents.
**Ключ:** архитектор — service provider. Dashboard = portfolio + templates.

```
SIDEBAR (ARCHITECT)
  ◆ My Projects         (plots I've worked on)
  ◆ Templates Library
  ◆ Feasibility Lab     🔒 GOLD
  ◆ DCR Documents       🔒 GOLD
  ◆ Client Proposals    (builder tool)
  ────
  ◆ Ambassador
  ◆ Settings
```

### 3.7 AMBASSADOR (overlay, not primary)

Ambassador — **это оверлей** на primary role. Не отдельная роль (см. §2.1). Уже работает. Что добавить:

- **Tier-specific perks:** на Silver tier — ничего extra; Gold tier разблокирует **Master Plans layers** + **Site Plan PDF downloads** (RBAC Phase 5); Platinum — **direct founder line** CTA + co-branding assets.
- **Leaderboard:** (§5 Gamification) top referrers by downline size / monthly commissions.
- **Mini-academy:** training materials (Gold+). Просто link к docs.

### 3.8 ADMIN — уже есть

`/admin/ambassadors` уже шипнут. Что доложить (не в scope этого отчёта, но упомяну):
- User management (promote to ADMIN, change role)
- Listing moderation (approve pending parcels — already есть `/api/parcels/pending`)
- Platform analytics (revenue, active users, conversion funnel)
- Broadcast announcements
- Feature flags management

---

## 4. Feature matrix — роль × фича

Легенда: ✅ есть сегодня, 🟡 planned Phase 1-2, 🔵 Phase 3+, 🔒 tier-gated, — не показываем.

| Feature | OWNER | BUYER | BROKER | INVESTOR | DEVELOPER | ARCHITECT | Ambassador overlay |
|---|---|---|---|---|---|---|---|
| Profile persistence | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | — |
| Avatar upload | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | — |
| My plots / My portfolio | ✅ | — | ✅ | 🟡 | 🟡 | 🟡 | — |
| "Who viewed my plot" | 🟡 | — | 🟡 | 🟡 | 🟡 | — | — |
| Inquiries inbox | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | — | — |
| Deals pipeline | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Shortlist (favorites) | — | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | — |
| Side-by-side compare | — | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | — |
| Price alerts | — | 🔵 | 🔵 | 🔵 | 🔵 | — | — |
| Feasibility Lab (saved) | 🔒 GOLD | 🔒 GOLD | 🔒 GOLD | 🔒 GOLD | 🔒 GOLD | 🔒 GOLD | — |
| Market heatmaps | 🔒 GOLD | 🔒 GOLD | 🔒 GOLD | 🔒 PLATINUM | 🔒 GOLD | 🔒 GOLD | — |
| CRM (clients) | — | — | 🔒 sub | — | 🔵 | 🔵 | — |
| Bulk export | — | — | 🔒 sub | 🔒 PLATINUM | 🔒 sub | 🔒 sub | — |
| Compliance tracker | — | — | — | — | 🔵 | — | — |
| Off-plan sales dash | — | — | 🔵 | — | 🔵 | — | — |
| Referral link / QR | — | — | — | — | — | — | ✅ |
| Downline tree | — | — | — | — | — | — | ✅ |
| Commission history | — | — | — | — | — | — | ✅ |
| Leaderboard | — | — | — | — | — | — | 🔵 |
| Notifications center | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 |
| Activity log | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 |
| Settings (language, currency) | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | 🟡 | — |
| 2FA | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | — |
| Data export (GDPR) | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | 🔵 | — |

---

## 5. Gamification

Принцип: **лёгкие touches, не grinding.** ZAAHI — enterprise real-estate, не games. Добавляем только то, что усиливает **product value**.

### 5.1 Badges (small, tasteful)

| Badge | Триггер | Для кого |
|---|---|---|
| 🏆 First Plot Listed | OWNER добавил первый parcel через Add Plot | OWNER |
| 📊 First Offer Sent | BUYER отправил первый оффер | BUYER |
| 💼 First Deal Closed | BROKER замкнул первый deal | BROKER |
| 🌱 First Referral | Ambassador привёл первого signup | Ambassador |
| 🔥 Top Ambassador (monthly) | топ-1 по downline growth в месяце | Ambassador |
| ⭐ Early Adopter | зарегистрирован до 2026-06-01 | все |
| 🎯 Platinum Member | купил Platinum tier | Ambassador |
| 🏗 First Project Live | DEVELOPER пустил off-plan sale | DEVELOPER |

**Как показывать:** на профиле + mini-badges в header. НЕ dedicated "Achievements" page — это space eater.

### 5.2 Leaderboards (ограниченные)

- **Top 10 Ambassadors this month** — на `/ambassador` странице, нижняя секция
- **Top Brokers by Pipeline Value** — на `/dashboard` для BROKER
- **НЕ публичные leaderboards** (фронт landing) — конкуренты увидят ранжирование

### 5.3 Progress bars (целевой UX)

- **Profile completion:** "Complete your profile to unlock X" — при 60% показываем checkmark на Settings nav
- **Tier upgrade progress** (ambassadors): "12 / 50 L1 referrals for Platinum Circle bonus"
- **Listing completeness** (OWNER): полная affection plan + Site Plan PDF + photos + pricing = 100%

### 5.4 Streaks

**Не делать.** Daily-login streaks уместны в consumer apps (Duolingo, Snapchat). ZAAHI — не ежедневный продукт. Unnatural fit.

---

## 6. Role switching UX

### 6.1 Три варианта из brief

**A. Role switcher в header (Google Accounts pattern)**
- Pro: явное разделение, mental model clear
- Con: современный user в реальности — OWNER *и* Ambassador одновременно, не либо-либо. Switcher создаёт iluziju choice где choice не нужен.

**B. Unified dashboard с секциями по ролям**
- Pro: всё в одном месте
- Con: длинные страницы, role-unrelated UI загрязняет view

**C. Primary role + secondary tabs**
- Pro: баланс A и B
- Con: требует product решения что primary, что secondary

### 6.2 Моё предложение — hybrid **D**

**Primary role = User.role** (single field). Drives sidebar main sections.
**Ambassador = orthogonal icon link** в top bar (не sidebar). Всегда видимый если `ambassadorActive`.
**Future multi-role (OWNER+BROKER)** — держим опцию через future `roles: Role[]` schema, но сегодня **не нужно**. В UX — это просто radio в Settings ("I am mainly: ...").

```
┌─────────────────────────────────────────────────────────────┐
│  [Z] ZAAHI    [📍 Map]   [🏠 Home]   [🏆 Ambassador]   [🔔][👤]│ ← top
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│ OWNER      │    Main content driven by role                 │
│  Overview  │                                                │
│  My Plots  │                                                │
│  Inquiries │                                                │
│  Offers    │                                                │
│  ...       │                                                │
│            │                                                │
└────────────┴────────────────────────────────────────────────┘
     ↑ sidebar = primary role (OWNER here)
     ↑ Ambassador icon in top bar — always-on overlay if active
```

Если пользователь сменит primary role в Settings (редкая operation), sidebar поменяется. **Переключение редкое** — не нужен fast-switch UI.

---

## 7. Технический план

### 7.1 File layout (Next.js App Router)

```
src/app/
├── (user)/                           ← route group, shared layout
│   ├── layout.tsx                    ← new: AuthGuard + role-aware sidebar + top bar
│   ├── dashboard/                    ← existing, refactor to thin shell
│   │   ├── page.tsx                  (redirects to role-specific overview)
│   │   ├── owner/
│   │   │   ├── page.tsx              overview
│   │   │   ├── plots/page.tsx
│   │   │   ├── inquiries/page.tsx
│   │   │   └── offers/page.tsx
│   │   ├── buyer/
│   │   │   ├── page.tsx
│   │   │   ├── shortlist/page.tsx
│   │   │   ├── compare/page.tsx
│   │   │   └── alerts/page.tsx
│   │   ├── broker/
│   │   │   ├── page.tsx
│   │   │   ├── pipeline/page.tsx
│   │   │   ├── leads/page.tsx
│   │   │   ├── clients/page.tsx
│   │   │   └── commissions/page.tsx
│   │   ├── investor/
│   │   ├── developer/
│   │   └── architect/
│   ├── ambassador/                   ← existing, unchanged
│   │   └── page.tsx
│   ├── profile/
│   │   └── page.tsx                  ← new: shared profile edit
│   └── settings/
│       ├── page.tsx                  ← new: shared settings
│       ├── notifications/page.tsx
│       ├── security/page.tsx
│       └── data-privacy/page.tsx
```

### 7.2 Shared components

```
src/components/dashboard/
├── Sidebar.tsx           (role-aware navigation — one component)
├── TopBar.tsx            (map link, ambassador icon, notifications bell, profile)
├── StatCard.tsx          (reusable KPI tile)
├── WidgetFrame.tsx       (draggable card shell — Phase 6)
├── ActivityFeed.tsx      (from ActivityLog table)
├── NotificationsBell.tsx (dropdown + unread count)
├── RoleSwitcher.tsx      (rarely used — Settings only)
└── ShortlistThumb.tsx    (used in BUYER dashboard)
```

### 7.3 Data layer

**New hooks (client-side):**

```typescript
useMe()              // { user, role, ambassadorActive, tier }
useNotifications()   // unread count + list, poll /api/me/notifications
useSavedParcels()    // shortlist for BUYER
useMyPlots()         // OWNER/BROKER's parcels
useDeals()           // user's deals (all statuses)
useActivityFeed()    // unified feed
```

Backed by `React Query` — caches, dedup, stale-while-revalidate. Keeps dashboard snappy.

### 7.4 Real-time (optional Phase 5)

Supabase Realtime для:
- New inquiries (OWNER)
- Deal status changes (all parties)
- Price alerts (BUYER)

Supabase RLS + channel per user. If we go UAE-migration (Abu Dhabi proposal), replace with server-sent events from self-hosted service.

### 7.5 Caching + Performance

- React Query 5-min staleTime для user data
- Skeleton loaders (not spinners) while query pending
- Prefetch на nav hover
- Mobile-first: collapsible sidebar, bottom-tab on <sm

---

## 8. Phased implementation plan

### Phase 1 — Foundation (2 weeks) 🟢 Start here

**Goal:** сделать существующий `/dashboard` production-real.

- [ ] Schema migration: add profile fields (avatarUrl, bio, timezone, language, currency, companyName, reraLicense, brnNumber, lastSeenAt, notificationPrefs)
- [ ] `PATCH /api/users/me` — profile update endpoint
- [ ] `SavedParcel` table + `POST/DELETE /api/me/favorites/:parcelId`
- [ ] Favorites heart button в SidePanel + map popup
- [ ] `Notification` table + `/api/me/notifications` list/markRead
- [ ] Notifications bell in map HeaderBar (already has shield pattern)
- [ ] Avatar upload (Supabase Storage, 2MB cap)

**Blocked by:** founder approval for schema change.
**Risk:** medium — schema touches User row used everywhere.

### Phase 2 — OWNER dashboard (3 weeks) 🟡

**Goal:** analytics для 111 owners. Revenue-facing.

- [ ] `ParcelView` table + `POST /api/parcels/:id/view` (debounced)
- [ ] Viewer tracking middleware на parcel detail page + SidePanel open
- [ ] OWNER `/dashboard/owner/page.tsx` with stat cards + recent activity
- [ ] Per-plot analytics widget (views, downloads, inquiry count)
- [ ] "Interest signal" aggregate (location + time patterns — pseudo-ML, just rule-based)
- [ ] Inquiries inbox — list of (UserX → ParcelY) events, link to deal room

### Phase 3 — BROKER dashboard (3 weeks) 🟡

**Goal:** подготовить ground для subscription monetization.

- [ ] BROKER `/dashboard/broker/page.tsx`
- [ ] Pipeline kanban view (5 columns from Deal status enum)
- [ ] Leads inbox (all active deals where broker=me)
- [ ] Commission view (already have `/ambassador`, add platform fees from Deal)
- [ ] Bulk export listings as CSV (Phase 3b — subscription gate)

### Phase 4 — BUYER dashboard (2 weeks) 🟢

**Goal:** retention + engagement для signup-but-not-buying users.

- [ ] BUYER `/dashboard/buyer/page.tsx`
- [ ] Shortlist (Pinterest-style grid из SavedParcel)
- [ ] Recently viewed (from ParcelView where userId=me)
- [ ] Alerts (price drop on saved, new matching plots) — requires saved-search schema

### Phase 5 — Investor + Developer + Architect (4 weeks combined)

**Goal:** покрыть остальные роли базовыми кабинетами. Shared widget system ускоряет.

- [ ] `WidgetFrame` component + simple grid layout (not full drag-drop; Phase 7)
- [ ] INVESTOR portfolio view
- [ ] DEVELOPER project cards (compliance + construction placeholders, real integrations later)
- [ ] ARCHITECT templates library (shared DCR PDFs from Supabase Storage)

### Phase 6 — Notifications delivery (2 weeks)

**Goal:** email + push уведомления.

- [ ] Email integration via existing `sendEmail()` — notification triggers
- [ ] Web push (PWA manifest + service worker)
- [ ] User preferences UI persisted
- [ ] Notification batching (digest mode)

### Phase 7 — Polish + Gamification (2 weeks)

- [ ] Badges (rendered on profile)
- [ ] Leaderboards для Ambassador + BROKER
- [ ] Profile completion progress
- [ ] Activity log UI
- [ ] Data export (GDPR)

### Phase 8 — Advanced / Future (TBD)

- Compliance tracking for DEVELOPER (integrate DDA/Trakhees APIs — separate discovery)
- Off-plan sales for DEVELOPER
- CRM for BROKER (subscription-gated)
- 2FA
- Connected accounts (Google / Apple — Supabase does this natively, needs UI wire-up)
- Widget drag-drop (low ROI)

### Totals

| Phase | Weeks | Cumulative | Value |
|---|---|---|---|
| 1 | 2 | 2 | Foundation — stops dashboard being 80% mock |
| 2 | 3 | 5 | OWNER analytics — revenue-facing |
| 3 | 3 | 8 | BROKER pipeline — subscription prep |
| 4 | 2 | 10 | BUYER retention |
| 5 | 4 | 14 | Coverage для остальных ролей |
| 6 | 2 | 16 | Notifications delivery |
| 7 | 2 | 18 | Gamification polish |

**Phase 1-3 = MVP user dashboards (8 weeks).** После этого у нас три рабочих кабинета, остальные роли видят shared shell с placeholder содержимым.

---

## 9. Inspiration — что брать и у кого

| Source | Что брать | Где применять |
|---|---|---|
| **Stripe Dashboard** | Clean KPI tiles; pipeline kanban; sparklines inline; 6-month bar chart | BROKER, INVESTOR |
| **Airbnb Host Insights** | "Your listing got X views from Y cities"; aggregate visitor demographics; weekly performance email | OWNER |
| **Pinterest** | Masonry grid для shortlist; save-button ubiquitous (map, detail, list); "For you" recommendations | BUYER shortlist |
| **Robinhood** | Portfolio total → single big number; allocation donut; gain/loss color coding; muted colors on decline | INVESTOR |
| **Notion** | Sidebar + main canvas shell; block-level editing (not needed here); database views (table/kanban/calendar) | All dashboards layout |
| **Linear** | Kbd shortcuts (Cmd+K for command palette); super-fast transitions; keyboard-first | Power users (BROKER, INVESTOR) |
| **Zillow** | Side-by-side compare mode; saved-search alerts; price history graphs | BUYER compare |
| **Salesforce** | CRM patterns (clients + activities + next action) | BROKER CRM (Phase 3b) |

**Не брать:**
- Duolingo streak shaming — unnatural fit
- Tinder-swipe (Airbnb tried, abandoned) — слишком casual для luxury real-estate
- Pinterest infinite scroll with no end — сбивает decision-making
- Figma-style collaboration — overkill for solo investors

---

## 10. Open Questions

### Q1. Post-login destination — карта или dashboard?

Сегодня → `/parcels/map`. Pinterest-style "feed first". Менять ли?

- **A. Карта как landing** (сейчас). Feed-first. Dashboard как tool на tool bar.
- **B. Role-specific dashboard как landing.** Stripe-style. Map на nav link.
- **C. Gradient** — OWNER landing = owner dashboard (где данные о их plots); BUYER landing = map (где они ищут).

**Моя рекомендация:** C — role-specific landing. Новый dashboard shell сам redirect'ит на правильную подстраницу.

### Q2. Profile completion / onboarding wizard?

Новый пользователь видит dashboard с пустыми stat cards. Показывать ли onboarding?

- A. Minimal onboarding — 3-шаг tour (Map, Dashboard, Ambassador)
- B. Role-specific wizard при первом визите dashboard
- C. Нет onboarding, только "Complete your profile" banner

**Моя рекомендация:** C сейчас. Пользователей всё равно одобряет admin — уже human-in-the-loop. Wizard добавляем после Phase 1.

### Q3. Multi-role schema — делать сейчас или потом?

Сегодня `User.role` = single. В LAYERS_RBAC_PROPOSAL.md Q3 founder выбрал A (user self-select + admin override). Это совместимо с single-role. Но реальность в 2027: OWNER-кто-стал-BROKER.

- A. Оставить single `role` навсегда
- B. Migrate к `roles: Role[]` в Phase 5+ когда появится реальная боль
- C. Добавить `roles: Role[]` сейчас, но в UI показывать только primary

**Моя рекомендация:** B. YAGNI до первого реального request.

### Q4. Saved searches — запускать в Phase 4 или позже?

Alert "new plot matches your filter" требует сохранённых фильтров. Фильтр сам — сложная штука (text, area range, price range, land use, district).

- A. Phase 4 простой saved search (district + price range)
- B. Phase 7 (после alerts foundation)
- C. Skip — использовать alerts на "price drop on saved" only

**Моя рекомендация:** C сначала (просто alert на saved), B для полноценного saved-search.

### Q5. Mobile-first или desktop-first?

Сегодняшний `/dashboard` — responsive но desktop-centric. Большие таблицы.

- A. Сохранить desktop-first. Mobile = wrapping stacked cards.
- B. Rebuild mobile-first. Desktop = widened cards.
- C. Separate mobile app.

**Моя рекомендация:** A. Real-estate dealmaking happens на desktop. Mobile = notifications + quick check. PWA (Phase 6) даст push notifications без native app.

### Q6. Widgets system — customisable dashboard?

Notion-style drag-drop widgets.

- A. Сделать в Phase 5
- B. Сделать в Phase 8 (если запрос будет)
- C. Никогда — rigid layouts быстрее shipping

**Моя рекомендация:** B. Customisable dashboards — classic time sink. Нет request'ов сегодня.

### Q7. Theme toggle (dark / light)?

Сегодня платформа фулл-dark. Landing page тоже dark.

- A. Сделать light theme (1-2 weeks work)
- B. Keep dark only (brand identity)
- C. Auto based on system preference

**Моя рекомендация:** B. Dark — brand. Light добавляет complexity без value.

### Q8. Data export (GDPR)?

UAE PDPL (ABU_DHABI_MIGRATION.md §4) требует ability для user скачать свои данные.

- A. Сделать Phase 7
- B. Скипнуть пока (< 1k users)
- C. Сделать stub "Email us at privacy@zaahi.io"

**Моя рекомендация:** C сейчас (правовое minimum), A когда > 500 approved users.

### Q9. API keys для DEVELOPER / BROKER?

Task brief упомянул API keys. Кому нужны? Зачем?

- A. Skip — use cases не определены
- B. Добавить в Phase 8 если конкретный customer попросит
- C. Сделать sooner как pre-revenue signal

**Моя рекомендация:** A сейчас, B later.

---

## 11. Ключевые риски

1. **Schema bloat** — добавить 8 полей к User + 4 новых таблицы за Phase 1-2 — значительный. Каждая миграция — risk. Mitigation: все поля nullable, все таблицы IF NOT EXISTS, 72h Supabase warm fallback при cutover (UAE migration proposal pattern).

2. **Notification spam** — если все триггеры настроены default-on, user получит 20 email/day. Mitigation: default = digest mode, NOT individual emails.

3. **"Who viewed my plot" privacy** — если OWNER видит *имя* viewer'а, это leak. Mitigation: aggregate-only (location + time, no PII), documented в CLAUDE.md.

4. **Role switching bugs** — если user сменит role в Settings, кеш dashboard покажет старый layout. Mitigation: invalidate React Query on role change, force reload.

5. **Ambassador + OWNER overlap** — user видит обе секции в sidebar. Может путать. Mitigation: явный separator "Ambassador" = top bar icon (not sidebar).

6. **Schema change ≠ data exists** — сразу после migration у всех `avatarUrl=null`, `bio=null`. UI должен gracefully fallback (initials avatar, "Complete your profile" CTA).

---

## 12. Рекомендуемый next step

1. **Founder review §10 Q1-Q9.**
2. **Phase 1 kickoff** (2 weeks): schema migration + profile persistence + favorites + notification shell. Deliverable: `/dashboard` больше не mock.
3. **Parallel:** design review для OWNER dashboard wireframe (§3.1). Founder feedback до старта Phase 2.
4. **Phase 2** (3 weeks): OWNER analytics. Demo-ready для investor follow-up.
5. **Reassess** после Phase 2 — какие другие роли приоритетные по reality-check (какие пользователи уже signed up?).

---

**End of Research Document.**

*Документ — результат research-only прохода. Никаких изменений в коде
или инфраструктуре не внесено. Ждёт founder decisions по §10 Open
Questions.*
