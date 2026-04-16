# LAYERS & RBAC PROPOSAL — ZAAHI

**Дата:** 2026-04-16
**Статус:** 🟡 RESEARCH ONLY. Никакого кода, никаких изменений. Требуется
founder approval перед любым этапом реализации.
**Автор:** Claude Code agent

---

## 0. Executive Summary

**Состояние сегодня:**

- На карте ~300 toggleable слоёв (по 4 странам / 7 эмиратам) + 114 ZAAHI
  listings. Все слои default OFF, один по одному включаются пользователем.
  Панель плоская — нет группировки по странам.
- Auth binary: `approved / not approved`. Prisma enum `UserRole` существует
  (`OWNER|BUYER|BROKER|INVESTOR|DEVELOPER|ARCHITECT|ADMIN`), но **ничем не
  enforced** — все approved users видят всё одинаково.
- Ambassador tiers (`SILVER|GOLD|PLATINUM`) живут в схеме, но **zero
  frontend enforcement** — ни один feature не привязан к tier'у.
- `/api/layers/*` жёстко публичный по CLAUDE.md — любое RBAC над слоями
  это UI-gate, не security boundary.

**Рекомендуемое направление:**

1. Сгруппировать панель слоёв по country → emirate → category (чисто UX,
   данные не трогаются).
2. Ввести два независимых измерения доступа:
   - **role** (кто ты: OWNER/BROKER/ARCHITECT/…) — уже есть в схеме.
   - **tier** (что купил: FREE/SILVER/GOLD/PLATINUM) — нужен новый поле на
     User, вычислимый из последней успешной `AmbassadorApplication`.
3. Начать с минимально монетизируемого gate: **site-plan PDF + master-plan
   слои** gated на GOLD+. Это уже обещано на `/join`, давно анонсировано —
   просто ещё не enforced.
4. `LayerGuard` + `useAccess()` hook — centralised, чтобы не плодить
   условия по компонентам.

**Риски / что нужно решить founder'у до любой работы:** см. §8 Open Questions.

---

## 1. Аудит текущих слоёв

### Итоги

| Метрика | Значение |
|---|---|
| Групп слоёв | 4 (Base, Master Plans, DDA Districts, Land Plots) |
| Toggleable layers | ~300+ |
| Покрытые страны | 4 (UAE, Saudi Arabia, Oman — плюс 3-й в бэклоге) |
| Base layers (user-visible) | 13 |
| Master plans | 8 |
| DDA districts | 206 |
| Land-plot tile sets | 4 PMTiles (DDA, AD-adm, AD-other, Oman) |
| Unconditional layers | 1 (ZAAHI listings) |
| Disk footprint | ~704 MB (`data/` + `public/tiles/`) |

### 1.1 UAE — DUBAI

| Layer / Group | Source | File / Endpoint | Data Type | Count | Default | Sensitivity |
|---|---|---|---|---|---|---|
| Communities | KML | `/data/layers/Community__1_.kml` → `/api/layers/communities` | communities | ~250 | OFF | Public |
| Major Roads | KML | `/data/layers/Major_Roads.kml` → `/api/layers/roads` | roads | ~300 | OFF | Public |
| Metro Lines | KML | `/api/layers/metro` | metro | 3 lines | OFF | Public |
| DDA Project Boundaries | GeoJSON | `/api/layers/dda-projects` | administrative | 209 | OFF | Public |
| DDA Free Zones | GeoJSON | `/api/layers/dda-freezones` | administrative | 209 | OFF | Public |
| DDA Land Plots | PMTiles | `/public/tiles/dda-land.pmtiles` | plots | ~99K | OFF | **Sensitive** — raw parcel grid, "дразнилка" для FREE tier |
| Dubai Islands | KML | `/api/layers/dubai-islands` | master-plan | ~80 | OFF | Medium |
| Meydan Horizon | KML | `/api/layers/masterplans/meydan-horizon` | master-plan | ~400 | OFF | Medium |
| Al Furjan | KML | `/api/layers/masterplans/al-furjan` | master-plan | ~2,200 | OFF | Medium |
| Intl City 2 & 3 | KML | `/api/layers/masterplans/intl-city-23` | master-plan | ~900 | OFF | Medium |
| Residential Phase I/II | KML | `/api/layers/masterplans/residential-12` | master-plan | ~1,500 | OFF | Medium |
| D11 Parcel L/D | KML | `/api/layers/masterplans/d11-parcel-ld` | master-plan | ~100 | OFF | Medium |
| Nad Al Hammer | KML | `/api/layers/masterplans/nad-al-hammer` | master-plan | ~250 | OFF | Medium |
| DDA Districts (206) | GeoJSON | `/api/layers/dda/{slug}` | plots | varies | OFF | Medium |
| ZAAHI Listings | Generated | `/api/parcels/map` (DB) | listings | 114 | **ON** | Controlled (price, owner via API) |

### 1.2 UAE — ABU DHABI

| Layer / Group | Source | File / Endpoint | Data Type | Count | Default | Sensitivity |
|---|---|---|---|---|---|---|
| AD Municipalities | GeoJSON | `/api/layers/abu-dhabi-municipalities` | administrative | 3 | OFF | Public |
| AD Districts | GeoJSON | `/api/layers/abu-dhabi-districts` | districts | 216 | OFF | Public |
| AD Communities | GeoJSON | `/api/layers/abu-dhabi-communities` | communities | 1,864 | OFF | Public |
| AD Land Plots (adm) | PMTiles | `/public/tiles/ad-land-adm.pmtiles` | plots | ~180K | OFF | Sensitive |
| AD Land Plots (other) | PMTiles | `/public/tiles/ad-land-other.pmtiles` | plots | ~182K | OFF | Sensitive |

### 1.3 UAE — Другие эмираты

| Layer / Group | Source | File / Endpoint | Data Type | Count | Default | Sensitivity |
|---|---|---|---|---|---|---|
| UAE Districts (все эмираты) | KML | `/api/layers/uae-districts` | districts | ~161 | OFF | Public |

### 1.4 SAUDI ARABIA

| Layer / Group | Source | File / Endpoint | Data Type | Count | Default | Sensitivity |
|---|---|---|---|---|---|---|
| Saudi Governorates | KML | `/api/layers/saudi-governorates` | administrative | 13 | OFF | Public |
| Riyadh Zones | KML | `/api/layers/riyadh-zones` | administrative | ~1 (zoning plan) | OFF | Public |

### 1.5 OMAN

| Layer / Group | Source | File / Endpoint | Data Type | Count | Default | Sensitivity |
|---|---|---|---|---|---|---|
| Oman Land Plots | PMTiles | `/public/tiles/oman-land.pmtiles` | plots | ~95K | OFF | Sensitive |

### 1.6 Что важно знать о "sensitivity"

- **Все layer API (`/api/layers/*`) public по CLAUDE.md** — любой человек с
  правильной URL может скачать GeoJSON. "Sensitive" в таблице означает
  "это то, что пользователь ожидает увидеть за paywall", а не
  "защищено технически".
- **ZAAHI Listings — единственные данные в БД** (не на диске как статика).
  Цена, контакт владельца, Site Plan PDF — это те поля, которые реально
  можно задизейблить server-side. Остальное — UX gate.
- Sensitivity категоризация ниже в таблице RBAC (§4.3) отражает UX-намерение,
  не security boundary.

---

## 2. Предложение иерархии панели слоёв

### 2.1 Mockup (collapsed by default, ZAAHI Listings единственная включённая)

```
🔎  [ filter layers ]

🌐  GLOBAL
  ✅ ZAAHI Listings (114)               ← всегда ON, неотключаемо

📍  UAE — DUBAI                         ⌄
  ├  Base
  │    ☐ Communities (250)
  │    ☐ Major Roads (300)
  │    ☐ Metro (3 lines)
  ├  DDA Layers
  │    ☐ DDA Project Boundaries (209)
  │    ☐ DDA Free Zones (209)
  │    ☐ DDA Land Plots (99K)           🔒 GOLD
  │    ☐ DDA Districts (206) ▸          ⌄ expand
  │         ├ ☐ Business Bay
  │         ├ ☐ Dubai Hills
  │         ├ ☐ Damac Hills 1
  │         └ … 203 more
  ├  Master Plans                        🔒 GOLD
  │    ☐ Meydan Horizon (400)
  │    ☐ Al Furjan (2,200)
  │    ☐ Dubai Islands (80)
  │    ☐ Nad Al Hammer (250)
  │    ☐ IC3 Phases 2 & 3 (900)
  │    ☐ D11 Parcel L/D (100)
  │    ☐ Residential Phase I/II (1,500)
  └  Heatmaps                            🔒 PLATINUM
       ☐ DLD Transactions                (planned, not shipped)
       ☐ Price heatmap                   (planned, not shipped)

📍  UAE — ABU DHABI                    ⌄
  ├  Base
  │    ☐ Municipalities (3)
  │    ☐ Districts (216)
  │    ☐ Communities (1,864)
  └  Land Plots
       ☐ AD Plots — Admin (~180K)        🔒 GOLD
       ☐ AD Plots — Other (~182K)        🔒 GOLD

📍  UAE — AL AIN                       ⌄
  └  (будущие ZAAHI Listings)

📍  UAE — OTHER EMIRATES               ⌄
  └  ☐ Emirate Districts (161)

📍  SAUDI ARABIA                       ⌄
  ├  ☐ Governorates (13)
  └  ☐ Riyadh Zones                     🔒 PLATINUM

📍  OMAN                               ⌄
  └  ☐ Muscat Land Plots (~95K)         🔒 GOLD
```

Правила:
- Country заголовки collapsible (⌄ / ▸). По умолчанию collapsed — кроме
  страны, в которой находится пользователь (определяется по текущему
  `map.getCenter()` в момент первого открытия панели).
- **"🔒 GOLD" / "🔒 PLATINUM"** — locked layers. Показываются disabled,
  hover даёт tooltip "Upgrade to GOLD to unlock". Click → открывает
  inline upgrade CTA (deep-link на `/join#GOLD`).
- **Search field** в топе фильтрует по всем уровням.
- Master Plans и DDA Land Plots (99K) — pitch'им как GOLD feature. Это
  единственный практически полезный UX-гейт в сегодняшнем состоянии
  слоёв (остальное — public data, gate чисто косметический).
- Все ZAAHI Listings остаются unconditional и для всех ролей — это
  наш revenue funnel; скрывать их = терять лиды.

### 2.2 Альтернатива (fork point)

Можно сделать **data-type-first**, не country-first:
```
🏛 Administrative (districts, municipalities)
🗺 Land Plots
🏗 Master Plans
🚆 Infrastructure (metro, roads)
📈 Analytics (heatmaps)
```

Плюсы: ровно 5 категорий, не 4 страны × 3 категории.
Минусы: пользователь ищет "Abu Dhabi" и должен кликать в 3 категории.

**Рекомендация:** country-first как основной, с search'ом в топе (дают оба).

---

## 3. Текущая модель доступа (baseline)

### 3.1 Что уже есть

| Компонент | Что делает | Файл |
|---|---|---|
| `getSessionUserId(req)` | Валидирует Supabase token, возвращает userId | `src/lib/auth.ts:30–37` |
| `getApprovedUserId(req)` | Выше + проверка `user_metadata.approved === true` | `src/lib/auth.ts:47–55` |
| `getAdminUserId(req)` | Выше + `UserRole.ADMIN` или founder email | `src/lib/auth.ts:67–84` |
| `AuthGuard.tsx` | Клиентский wrapper: sign out + redirect если не approved | `src/components/AuthGuard.tsx` |
| `middleware.ts` | Требует Bearer на всех `/api/*` кроме `PUBLIC_API` | `src/middleware.ts` |
| `prisma/schema.prisma` `UserRole` enum | `OWNER, BUYER, BROKER, INVESTOR, DEVELOPER, ARCHITECT, ADMIN` | `prisma/schema.prisma:80–110` |
| `PLAN_COMMISSION_RATES` | Tier → commission rates (L1/L2/L3) | `src/lib/ambassador.ts:28–41` |
| `AmbassadorApplication.plan` | `SILVER / GOLD / PLATINUM` | `prisma/schema.prisma` (Ambassador model) |

### 3.2 Чего НЕТ

- Никакого `useUser()` / `useRole()` / `useTier()` hook — компоненты фетчат
  из API по одному.
- Нет `LayerGuard` / `FeatureGuard` — нет механизма условного рендера.
- Нет `role` enforcement: approved user с `role = BUYER` и approved user с
  `role = ADMIN` видят одинаково всё, кроме `getAdminUserId`-routes.
- Нет tier-поля на `User`. Tier хранится только на
  `AmbassadorApplication` (может быть несколько заявок; какая "действующая"
  не формализовано).
- Нет "upgrade to unlock" UI паттерна нигде.

### 3.3 PUBLIC_API list (важно для проектирования)

Из `src/middleware.ts`:
```
PUBLIC_API          : /api/auth, /api/notify-admin, /api/ambassador/register
PUBLIC_READS (GET/HEAD): /api/layers/*, /api/ambassador/qr/*
```

**Локовое ограничение:** `/api/layers/*` запрещено закрывать auth'ом
(CLAUDE.md security rules). Значит RBAC над слоями — **только UI**.
Если нужно реально защитить данные (например цены на listings) — это
идёт через `/api/parcels/map` и его аналоги, которые **не в public list**.

---

## 4. Предложение ролей и матрица доступа

### 4.1 Две оси

Предлагаю ввести **две независимые оси** вместо одной плоской role:

**Ось A — `role` (кто ты):** уже в схеме. Описывает профессиональную
категорию: `OWNER | BUYER | BROKER | INVESTOR | DEVELOPER | ARCHITECT |
ADMIN`. Роль задаётся при signup или в профиле, меняется редко.

**Ось B — `tier` (что купил):** новое поле `accessTier` на User. Описывает
подписочный/ambassador уровень: `FREE | SILVER | GOLD | PLATINUM`.
Вычисляется из последней активной `AmbassadorApplication` со
`status = APPROVED`. Обновляется при активации.

**Плюс PUBLIC** (без аккаунта) — псевдо-tier для неавторизованных
пользователей. Физически не в enum, а отдельная ветка в `useAccess()`.

### 4.2 Сводная таблица ролей (как юзер попадает в роль)

| Роль/tier | Как попадает | Стоимость | Заметки |
|---|---|---|---|
| PUBLIC | Не залогинен | — | Сегодня вся платформа за AuthGuard — нужно решение про landing (§8) |
| FREE (approved) | Signup + admin approval | 0 | Дефолт для всех approved |
| SILVER | Покупка tier + verified USDT tx | 1,000 AED | Ambassador tier + референ CTAs |
| GOLD | Покупка tier | 5,000 AED | "Most Popular" на `/join` |
| PLATINUM | Покупка tier | 15,000 AED | Founder line access |
| OWNER | `role = OWNER` + владеет parcel(ами) | 0 | Доступ к своему участку всегда full |
| ARCHITECT | `role = ARCHITECT` | 0 | Отдельный pitch: feasibility / DCR |
| DEVELOPER | `role = DEVELOPER` | 0 | Аналогично ARCHITECT |
| BROKER | `role = BROKER` | ? (см. §7) | SaaS подписка (монетизация) |
| ADMIN | `role = ADMIN` | — | Жан, Дмитро |

### 4.3 Матрица доступа: роль/tier × feature

Легенда: ✅ full, 🔒 locked (показать upgrade CTA), ⚫️ hidden (не намёка),
🫥 blurred (данные есть, но частично скрыты).

| Feature | PUBLIC | FREE | SILVER | GOLD | PLATINUM | OWNER (own plot) | BROKER | ARCHITECT/DEV | ADMIN |
|---|---|---|---|---|---|---|---|---|---|
| **Map + base layers** (roads, metro, communities, districts) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **ZAAHI Listings — маркеры на карте** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Listing — price** | 🫥 "AED •••" | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Listing — plot details (sqft, land use, project)** | 🫥 частично | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Listing — owner contact** | ⚫️ | ⚫️ | 🔒 | 🔒 | ✅ | ✅ (свой) | ✅ (с rate-limit) | ⚫️ | ✅ |
| **Site Plan PDF download** | ⚫️ | ⚫️ | 🔒 | ✅ | ✅ | ✅ (свой) | ✅ | ✅ | ✅ |
| **Feasibility Calculator — basic** | ⚫️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Feasibility Calculator — advanced** | ⚫️ | 🔒 | 🔒 | ✅ | ✅ | ✅ (свой) | 🔒 | ✅ | ✅ |
| **DDA Land Plots layer (99K)** | ⚫️ | 🔒 | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AD Land Plots layers (~362K)** | ⚫️ | 🔒 | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Oman Land Plots layer (95K)** | ⚫️ | 🔒 | 🔒 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Master Plan layers (8)** | ⚫️ | 🔒 | 🔒 | ✅ | ✅ | ✅ | 🔒 | ✅ | ✅ |
| **DDA District layers (206)** | ⚫️ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DLD Transaction heatmap** (planned) | ⚫️ | ⚫️ | ⚫️ | 🔒 | ✅ | ⚫️ | 🔒 | 🔒 | ✅ |
| **Price heatmap** (planned) | ⚫️ | ⚫️ | ⚫️ | 🔒 | ✅ | ⚫️ | 🔒 | 🔒 | ✅ |
| **Ambassador dashboard** | — | — | ✅ | ✅ | ✅ | — | — | — | ✅ |
| **Referral link + QR** | — | — | ✅ | ✅ | ✅ | — | — | — | ✅ |
| **Founder direct line** | — | — | ⚫️ | ⚫️ | ✅ | ⚫️ | ⚫️ | ⚫️ | ✅ |
| **"Who viewed my plot" analytics** | — | — | — | — | — | ✅ (свой) | — | — | ✅ |
| **Broker CRM / client leads** | — | — | — | — | — | — | ✅ | — | ✅ |
| **Admin panel / moderation** | — | — | — | — | — | — | — | — | ✅ |

**Как читать:**

- PUBLIC колонка — гипотетическая, если мы откроем map публично (см. §8
  Q1). Сегодня весь `/parcels/map` за AuthGuard — PUBLIC физически не
  существует.
- OWNER даёт full access **по своему** участку. Общий доступ остальных
  участков определяется его tier'ом (чаще всего FREE, если не купил).
  OWNER "бесплатно full" = только для своих parcel'ов.
- BROKER и ARCHITECT — отдельные pitch'и; деталь feature list — §7.

### 4.4 Data masking patterns (конкретика)

| Что маскируем | Как выглядит для локированной роли |
|---|---|
| Price | `AED •••` (тот же шрифт/размер; click → upgrade CTA) |
| Owner contact | hidden секция с badge "Unlock contact with GOLD" |
| Site Plan PDF | кнопка download заменяется на "Unlock PDF with GOLD" |
| Locked layer toggle | disabled checkbox + 🔒 GOLD/PLATINUM badge + tooltip |
| "Who viewed my plot" | секция скрыта целиком для не-owner |

Blur должен быть **визуальный, не физический** — number в DOM не должен
быть настоящим. Сервер возвращает поле `price: null` + `priceMasked:
"AED •••"` для tier'ов без доступа. То же для контактов — никогда не
маскировать CSS-фильтром поверх настоящих данных.

---

## 5. Технический план реализации

### 5.1 Фазы (каждая — самостоятельно deploy'able)

#### Phase 1 — Layer panel hierarchy (UX only, zero access gates)
**Цель:** группировка по country → category в `Layers` панели.
**Файлы:** `src/app/parcels/map/page.tsx` (LayersState / LAYER_REGISTRY /
панель рендер). Дополнительный меташнип не нужен — описание country +
category добавляем на LAYER_REGISTRY entry.
**Риск:** низкий. Нет изменений в данных, нет в auth.
**Оценка:** 1–2 дня (плюс день на smoke-test по чеклисту CLAUDE.md).

#### Phase 2 — `useAccess()` hook + masking field на `/api/parcels/map`
**Цель:** один централизованный источник "какая у меня роль и tier".
Сервер возвращает цену как `null` + `priceMasked` для не-authed / FREE.
**Файлы:**
- `src/lib/access.ts` — новый. Функция `resolveAccess(userId)` → `{role, tier, permissions}`.
- `src/lib/access-hooks.ts` — `useAccess()` React hook (fetch + cache).
- `src/app/api/parcels/map/route.ts` — добавить masking в respond.
- `src/app/parcels/map/SidePanel.tsx` — показывать `priceMasked` если `price === null`.
**Риск:** средний — затрагивает серверные ответы по `/api/parcels/map`,
нужно осторожно проверить что Listed без цены не ломает карту.
**Оценка:** 3–4 дня.

#### Phase 3 — `LayerGuard` + lock badges в панели
**Цель:** locked toggles с upgrade CTA.
**Файлы:**
- `src/components/LayerGuard.tsx` — новый компонент `<LayerGuard requires="GOLD">…</LayerGuard>`.
- `src/app/parcels/map/page.tsx` — обернуть locked слои.
- `src/app/parcels/map/UpgradeCTA.tsx` — новый mini-modal "Upgrade to GOLD".
**Риск:** низкий (UI only). Данные по-прежнему доступны по URL — это
documented trade-off по CLAUDE.md.
**Оценка:** 2–3 дня.

#### Phase 4 — `User.accessTier` поле + активация при approve ambassador app
**Цель:** tier поле на User, обновляемое в момент admin approve
ambassador application.
**Файлы:**
- `prisma/schema.prisma` — добавить `accessTier: AccessTier @default(FREE)` + enum. **Требует founder approval.**
- migration `prisma/migrations/XXX_add_access_tier/migration.sql`.
- `src/app/api/ambassador/[id]/approve/route.ts` — обновить tier при approve.
**Риск:** средний — schema change. CLAUDE.md: "НИКОГДА не менять
prisma/schema.prisma без явного разрешения founder". Нужен explicit go.
**Оценка:** 1 день кода + 1 день ручной тестировки миграции.

#### Phase 5 — Gate site plan PDF + master plan layers
**Цель:** первый реально монетизируемый gate.
**Файлы:**
- `src/app/api/parcels/[id]/plot-guidelines/route.ts` — проверить
  `tier >= GOLD || userId === parcel.ownerId` до возврата PDF.
- `src/app/parcels/map/page.tsx` — master plan слои под `LayerGuard requires="GOLD"`.
**Риск:** низкий после Phase 4.
**Оценка:** 1 день.

#### Phase 6 — Broker / Architect / Developer pitches
**Цель:** role-specific features (CRM, advanced feasibility, 3D tools).
**Scope:** отдельный discovery — скоуп большой, лучше разбить на три
подпроекта. **Вне этого proposal'а — только упомянуть.**

### 5.2 Сводная оценка времени

| Phase | Описание | Days | Блокер |
|---|---|---|---|
| 1 | Layer hierarchy (UX) | 1–2 | — |
| 2 | `useAccess()` + masking | 3–4 | — |
| 3 | `LayerGuard` + locks | 2–3 | Phase 2 |
| 4 | `User.accessTier` field | 2 | **founder approval** (schema change) |
| 5 | First paid gate | 1 | Phase 4 |
| 6 | Role-specific pitches | large | отдельный proposal |
| **TOTAL до monetization** | **Phase 1–5** | **9–12 дней** | |

### 5.3 Технические развилки

**Fork T1: Role-check в middleware vs в route handler?**
- A) Middleware matcher для "GOLD+"-routes → быстрее, но жёстко
  статичный мэтчер.
- B) Route handler вызывает `requireTier(req, "GOLD")` → гибко, но
  повторяется в каждом handler'е.
- **Рекомендация:** B. Matcher'ов мало, а flexibility важнее.

**Fork T2: `accessTier` как enum на User или отдельная таблица
`UserAccess`?**
- A) Enum field — просто, атомарно.
- B) Отдельная таблица с `grantedAt`, `expiresAt`, `source` — богаче,
  но сегодня tier lifetime (см. CLAUDE.md: "One-time purchase → lifetime
  membership. No recurring fee, no renewals.").
- **Рекомендация:** A. Пока membership lifetime, overhead отдельной таблицы
  не оправдан. Если заведём подписочные broker fees (§7) — тогда добавим
  вторую сущность `Subscription`.

**Fork T3: `role` ставится пользователем в профиле или админом при
approve?**
- A) Пользователь сам выбирает при signup (radio: I'm a buyer / owner
  / broker / architect / developer).
- B) Админ ставит при approve.
- **Рекомендация:** A (signup) с возможностью admin override в profile
  edit. Role — это self-description, не verification. Для BROKER
  (который платит за подписку) добавить отдельный verification flow.

---

## 6. Data masking — конкретные паттерны

### 6.1 Price
```
Сервер: { price: null, priceMasked: "AED •••", accessRequired: "FREE" }
Фронт : если price == null → рендерим priceMasked
        на click → open <UpgradeCTA tier="FREE" reason="price"/>
```

### 6.2 Owner contact
```
Сервер: { contact: null, contactMasked: "+971 •• ••• ••••", accessRequired: "PLATINUM" }
Фронт : секция с lock-icon overlay, click → upgrade CTA
```

### 6.3 Layer toggle
```
<label className={locked ? "opacity-50 cursor-not-allowed" : ""}>
  <input disabled={locked} />
  {layer.name}
  {locked && <LockBadge tier="GOLD"/>}
</label>
```

### 6.4 Invariant
- **Серверные данные, которые скрываются, должны возвращаться как `null`
  на сервере.** Никогда не полагаться на CSS blur — пользователь откроет
  devtools и прочитает цену.
- Исключение — UI-only гейты на уже публичных данных (`/api/layers/*`).
  Для них ok: CSS disabled + server продолжает отдавать по URL. Это
  defensible как public geographic data.

---

## 7. Monetization angle

### 7.1 Сегодняшние revenue streams

По CLAUDE.md:
- Ambassador tier — one-time 1k/5k/15k AED → commission вперёд.
- ZAAHI service fee 2% на closed deal — распределяется L1/L2/L3 по tier'у
  амбассадора.

### 7.2 Что добавить через RBAC (новые pitch'и)

| Tier / Role | Paywall feature | Суть pitch'а | Price model |
|---|---|---|---|
| FREE → SILVER | Referral link + commission | Приведи друга → заработай | 1k one-time |
| SILVER → GOLD | Site plan PDF + master plans | Profession tools | 5k one-time |
| GOLD → PLATINUM | Heatmaps + founder line | Institutional-grade | 15k one-time |
| Any → BROKER | CRM + unlimited leads | SaaS | 500–1500 AED/mo subscription (новое) |
| Any → ARCHITECT | Advanced feasibility + DCR | SaaS | 300–800 AED/mo subscription (новое) |
| OWNER | "Who viewed my plot" analytics | Бесплатно для owners | 0 — owners are revenue source, not cost |

### 7.3 Upgrade triggers (конкретные события в UI)

- Клик на locked layer → inline tooltip + "Unlock master plans with GOLD" кнопка.
- Попытка скачать PDF из карточки участка (FREE/SILVER) → modal с sample
  preview первой страницы + upgrade CTA.
- Попытка открыть owner contact (FREE/SILVER/GOLD) → lock-state кнопка,
  click → modal "Platinum members get direct seller contact + founder line".
- 3-й просмотр участка за сессию (FREE) → subtle banner "Save your favourites
  — create an account". *(только если PUBLIC tier включим)*

### 7.4 Что НЕ монетизировать

- Базовая карта и ZAAHI Listings markers — всегда видно. Это funnel.
- Feasibility Calculator basic — fun to play, hooks users.
- Ambassador referral mechanics для SILVER+ — рост сети важнее
  микромонетизации.

### 7.5 Ожидаемый impact (hypothesis, не commitment)

Первый гейт (Phase 5 = Site Plan PDF) — кандидат на первую платящего
ambassador'а. У нас 114 parcels, у каждого site plan PDF — основной
value prop для застройщика/инвестора. Гейт: `FREE → GOLD` прыжок 5k AED,
conversion rate TBD.

---

## 8. Open Questions

Эти вопросы нужно решить **до** Phase 2. В большинстве есть развилки —
отметил мою рекомендацию, но решение за founder'ом.

### Q1. PUBLIC tier — показываем карту неавторизованным?

**Фон:** сегодня весь `/parcels/map` за AuthGuard. SEO, landing,
"дразнилка для Google" отсутствуют.

- **A)** Оставить. Signup первый, карта вторым. Плюс: меньше attack
  surface, меньше нагрузки. Минус: нулевой SEO, нет демо для холодного
  трафика.
- **B)** Сделать `/map/public` read-only: маркеры + blurred цены,
  signup CTA на каждом действии. Плюс: funnel + SEO. Минус: работа —
  нужны SSR-safe routes, AuthGuard split.

**Рекомендация:** B, но **после Phase 5**. Сначала закончить paid flow
для логинов, потом экспонировать funnel.

### Q2. Tier — lifetime или с TTL?

CLAUDE.md: "One-time purchase → lifetime membership". Подтверждаем?

- **A)** Lifetime навсегда (как сейчас в CLAUDE.md).
- **B)** Lifetime но "paused" если нет сделок в течение 12 мес.
- **C)** Annual renewal.

**Рекомендация:** A, не трогать. Ambassador program — recently approved
(CLAUDE.md 2026-04-15).

### Q3. Role ставит пользователь сам или admin?

См. §5.3 Fork T3. **Рекомендация:** user self-select при signup, admin
override возможен.

### Q4. "Who viewed my plot" — нужна новая таблица `ParcelView`?

- Да → implement как audit log с RLS (owner sees own, admin sees all).
- Нет → feature не шипится.

**Рекомендация:** **да, но в Phase 6** (вне этого proposal'а).

### Q5. Sub-district layers под DDA District (206 items)

Сейчас 206 plottable DDA districts plus ~99K plots в PMTiles. Нужен ли
нам третий уровень "Districts → sub-districts (communities)"?

- **A)** Нет — 206 уже достаточно. Коммуниты подгружаются через
  Communities слой.
- **B)** Да — добавить уровень вложенности, автогенерировать group-by.

**Рекомендация:** A. Плоский список 206 с search'ом решает UX-проблему
без усложнения.

### Q6. Как решаем конфликт "layer public URL vs locked UI"?

Всё в §4.3 "🔒" — это UX gate. Кто-то с DevTools увидит URL и скачает
public GeoJSON. Это **documented trade-off** (CLAUDE.md запрещает
закрывать `/api/layers/*` auth'ом).

- **A)** Принять. Gate — чисто UX + upgrade funnel.
- **B)** Создать второй контур "`/api/layers/private/*`" для будущих
  чувствительных слоёв (например heatmap с ZAAHI-data). Требует
  изменения PUBLIC_API allow-list → founder approval.

**Рекомендация:** A для сегодняшних public layers. B — когда реально
заведём heatmap из ZAAHI data (Phase 6+).

### Q7. Broker tier — subscription или tier purchase?

Сегодня все tier'ы — one-time lifetime. Broker pitch (§7.2) это
monthly CRM. Новый revenue stream.

- **A)** Отдельная `Subscription` модель, независимая от ambassador
  tier.
- **B)** Четвёртый tier BROKER за 3k/mo.
- **C)** Не в scope пока.

**Рекомендация:** C сейчас, **возвращаемся в Phase 6**. Сначала надо
выяснить реальный demand.

---

## 9. Риски и constraints

1. **Schema change требует founder approval** (CLAUDE.md). Phase 4
   блокирован до explicit go.
2. **`/api/layers/*` public — non-negotiable** (CLAUDE.md security
   rules). Layer RBAC = UX gate, не security.
3. **Нельзя удалять parcels или менять цены автоматом** (CLAUDE.md).
   Data masking — только read-path; write-path остаётся как есть.
4. **NEVER modify `src/app/page.tsx` auth flow без explicit
   permission** (CLAUDE.md). Если PUBLIC tier (Q1) выбран, нужна
   отдельная страница (`/public/map`), не правка auth.
5. **Perf risk Phase 2:** `/api/parcels/map` возвращает 114 features —
   добавление tier check на каждый вызов ок. Если переедем на
   10K+ listings — вернуться к perf.
6. **localStorage tier-cache не trust'им** — всегда server-side re-check.

---

## 10. Рекомендуемый next step (если принят)

1. Founder reviewing этого документа → решает Q1–Q7.
2. Agent начинает **Phase 1** (layer hierarchy UX) — безопасно, zero
   schema change, zero auth touch. Deliverable через 1–2 дня.
3. Параллельно готовим draft migration для Phase 4 (не коммитим до Q3
   approved).
4. Phase 2–3 — после sign-off на Q1 (публичный tier да/нет).
5. Phase 5 — первый paid gate. После него смотрим conversion → решаем
   scope Phase 6.

---

**End of Proposal.**

*Документ — результат research-only прохода. Никаких изменений в коде
не внесено. Ждёт founder decisions по §8 Open Questions.*
