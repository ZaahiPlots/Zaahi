# ZAAHI — Автономная OS рынка недвижимости

## Идентификация

Ты — Senior Engineer и единственный разработчик-агент платформы ZAAHI.
Founder & CEO/CTO: **Zharkyn (Zhan) Ryspayev** — построил всю платформу ZAAHI, день-в-день инженерные и продуктовые решения.
Co-founder, Ambassador, Guardian Partner: **Dmytro (Dymo) Tsvyk** — стратегия, ambassador for Dubai market, право вето на стратегические решения. См. `FOUNDER CONTACTS` ниже.
Единственная метрика: **платящий пользователь**.

## Стек

- **Framework:** Next.js 15, React 19
- **Стили:** Tailwind CSS
- **3D:** Three.js + React Three Fiber (свой движок, НЕ Unity/Unreal)
- **БД:** Supabase (PostgreSQL) + Prisma ORM
- **Деплой:** Vercel (production, auto-deploy from `main`); Ubuntu 24.04 LTS + systemd + pm2 as a self-host fallback
- **Локальные модели:** Ollama (qwen2.5-coder:7b для утилит, qwen3:8b для чата)
- **Облачные модели:** Claude Opus 4.6 (мастер), Claude Sonnet 4.6 (Cat/Mole/Falcon)
- **Блокчейн:** Polygon (primary), Ethereum (NFT)
- **Языки UI:** EN, AR, RU, UK, SQ, FR

## Архитектура

- **85 модулей** в **12 блоках** (A–L)
- **Plugin-система:** новая страна = один конфиг-файл, core не меняется
- **Агенты изолированы:** Cat, RoboMole, Falcon не знают друг о друге
- **Все API к DLD/RERA** — через один gateway-модуль
- **Auth** проверяется на middleware, не в компонентах
- **RLS активна** для всех таблиц Supabase

## 12 блоков платформы

A — Assets (земля, жильё, коммерция, off-plan, distressed, digital, rental, страхование, управление)
B — Participants (собственники, покупатели, брокеры, девелоперы, банки, юристы, госорганы, оценщики)
C — Transactions (deal engine, escrow, JV, fractional, токенизация, аукцион, платежи, споры)
D — Technology (metaverse, digital twin, AI, blockchain, IoT, satellite, robotics, notification, search, translation)
E — Analytics (рынок, инвестиции, риски, сравнения)
F — Finance (revenue engine, ZAH token, DAO, sovereign bank, robotics fund 10%)
G — Compliance (DLD, RERA, KYC, AML, PDPL, GDPR)
H — Growth (referral, rating, gamification, education)
I — Intelligence (Falcon, RoboMole, Cat, Agent)
J — Ecosystem (brand marketplace, master developers, white-label, community, support, onboarding)
K — Platforms (web, mobile, desktop, VR/AR, API marketplace)
L — Operations (monitoring, CI/CD, data privacy, accessibility)

## Правила кода — IMPORTANT

1. **Рабочее > идеальное.** Минимально рабочее — деплой — итерация.
2. **Один модуль = одна ответственность.**
3. **Финансовые расчёты — ТОЛЬКО server-side.** Суммы хранить в fils (integer), НЕ в дирхамах.
4. **НИКОГДА не доверяй user input** без валидации.
5. **НЕ пиши PII в console.log** никогда.
6. **НЕ дублируй логику** — найди существующий модуль.
7. **НЕ строй "на будущее"** без конкретной задачи.
8. **Думай о 1000+ объектах** с первой строки (пагинация, индексы, кеш).
9. **Plugin-система:** код для новой страны НЕ меняет core.
10. **UI STYLE GUIDE — ОБЯЗАТЕЛЬНО** (см. секцию ниже). Любой новый/переработанный компонент должен следовать стилю landing page (Apple-like glassmorphism). Это не рекомендация — это требование.

## UI STYLE GUIDE — ОБЯЗАТЕЛЬНО ДЛЯ ВСЕХ КОМПОНЕНТОВ

Единый визуальный язык платформы ZAAHI. Landing page (`src/app/page.tsx`) —
эталон. Любой новый компонент должен выглядеть как часть landing page.

**Эстетика:** Apple-like glassmorphism поверх тёмной навигационной подложки. Высокий contrast для чисел и действий, минимум chrome, плавные переходы.

### Обязательные элементы

**Карточки / панели:**
- `background: rgba(10, 22, 40, 0.4)` (полупрозрачный navy)
- `backdrop-filter: blur(16px)` (glassmorphism — `backdrop-blur-xl` в Tailwind)
- `border: 1px solid rgba(255, 255, 255, 0.1)` (едва видимая окантовка)
- `border-radius: 12px`
- Мягкая тень: `box-shadow: 0 6px 20px rgba(0,0,0,0.2)`
- На светлых контекстах (dashboard в режиме light) — заменяй navy на `rgba(255,255,255,0.6)` с тем же blur

**Кнопки:**
- Background: полупрозрачный (`rgba(255,255,255,0.06)` на тёмном, `rgba(10,22,40,0.4)` над картой)
- Border: `1px solid rgba(200, 169, 110, 0.3)` (gold tint)
- `color: #C8A96E` (gold text/icons)
- Hover: `background: rgba(200, 169, 110, 0.25)`, `border-color: #C8A96E`
- Transition: `all 150ms ease` — не `transition: all`, укажи конкретные свойства (`border-color, background, transform`)
- Никаких native browser стилей

**Инпуты / селекты:**
- Background: `rgba(255, 255, 255, 0.04)` (еле заметный)
- Border: `1px solid rgba(255, 255, 255, 0.1)`
- Focus: `border-color: #C8A96E`, `outline: none`
- Типографика: inherit от родителя, не system default
- Никогда не использовать browser default `<input>` выглядящих по-разному на iOS/Android/desktop

**Слайдеры:**
- `accent-color: #C8A96E` (gold thumb)
- Track: `rgba(255, 255, 255, 0.1)`
- Smooth drag — не step-by-step

**Анимации:**
- `ease-in-out` или `cubic-bezier(0.4, 0, 0.2, 1)`
- Duration: 150-300ms (не больше)
- Плавные `fade-in`, `slide-in`, `scale` — не резкие toggles
- Предпочитай `transform` и `opacity` (GPU-accelerated) вместо `width/height/top/left`

**Числа / суммы:**
- Большие: `font-weight: 800`, `font-size: 22-32px`, `letter-spacing: -0.02em`
- Thousands separator: `toLocaleString("en-US")` или `.toFixed()` + regex для запятых
- AED префикс: отдельный меньший span с `opacity: 0.6`
- Никогда не рендерить raw bigint/number без форматирования

**Иконки:**
- Inline SVG или unicode-символы (◯ ⌄ × ↓)
- Минималистичные, монохромные, тонкий stroke
- Gold (#C8A96E) или textDim в зависимости от контекста
- Никаких emoji в production UI (кроме landing/dashboard hero-элементов где уместно)

**Типографика:**
- Georgia serif для заголовков (H1, H2, H3)
- `-apple-system, Segoe UI, Roboto, sans-serif` для body
- `letter-spacing: 0.04-0.08em` для секционных label'ов ("TOTAL REVENUE")
- `text-transform: uppercase` для category/status
- Size scale: 9 (micro), 10 (small label), 11 (label), 12 (body), 14 (emphasized), 18-32 (numbers/titles)

### Палитра ZAAHI (единая)

| Имя | Hex | Использование |
|---|---|---|
| GOLD | `#C8A96E` | Accent, hover, CTAs, active state |
| NAVY | `#1A1A2E` | Primary text, dark background |
| TEAL | `#1B4965` | Secondary accent (Total Investment, teal hover) |
| GREEN | `#2D6A4F` | Profitable, positive, PAID |
| RED | `#E63946` | Loss, negative, REVERSED |
| AMBER | `#E67E22` | Marginal, pending, warnings |
| SUBTLE | `#6B7280` | Secondary text, labels |
| LINE | `#E5E7EB` | Border subtle |
| BG | `#FAFAF9` | Light background |

**Не использовать:** чистый чёрный `#000`, чистый белый `#FFF` на больших поверхностях, нейтральный серый `#888` (используй `#6B7280`).

### Чеклист для каждого нового компонента

Перед commit проверь:
- [ ] Карточки имеют `backdrop-filter: blur(16px)` + полупрозрачный background
- [ ] Кнопки полупрозрачные с gold hover + border transition 150ms
- [ ] Инпуты не выглядят как browser default (кастомный border, padding, focus)
- [ ] Числа форматированы (AED prefix, thousands separator, bold, правильный size)
- [ ] Заголовки секций Georgia serif, uppercase, letter-spaced
- [ ] Нет резких появлений/исчезновений — плавные ease-in-out transitions
- [ ] Цвета из палитры выше — никаких custom hex
- [ ] Минималистичные иконки, не emoji (кроме dashboard hero)
- [ ] Responsive: работает на 320px (mobile) и 1440px (desktop)

### Примеры эталонов в коде

- **Landing page:** `src/app/page.tsx` — основной эталон
- **SidePanel над картой:** glassmorphism navy (прозрачный blur)
- **HeaderBar карты:** transparent, gold icons, gold hover
- **Кнопки карты (ChromeBtn):** см. `src/app/parcels/map/page.tsx` — `rgba(10,22,40,0.4)` bg, gold border, hover background change
- **Dashboard карточки (profile/deals):** белая версия glassmorphism на светлом фоне

### Что запрещено

- ❌ Browser default стили для `<input>` / `<button>` / `<select>`
- ❌ Яркие plain colors (`#FF0000`, `#00FF00`) — только из палитры
- ❌ `transition: all` — всегда конкретные свойства
- ❌ Резкие `display: none` → `display: block` toggles — используй opacity/transform + animation
- ❌ Emoji вместо иконок в кнопках действий
- ❌ Native `<select>` dropdown с system chrome — кастомизируй appearance
- ❌ Разные стили в разных частях UI — единство важнее вариативности

Когда сомневаешься — открой `src/app/page.tsx` и скопируй там стиль.

## Деплой — точные команды

# Production deploys automatically on push to main (Vercel pipeline).
# Local validation before pushing:
pnpm build                       # must pass clean — никогда не пушим красный билд
git add . && git commit -m "feat: [описание]" && git push

# Database migrations (run from local against the production DB):
npx prisma migrate deploy        # ТОЛЬКО migrate deploy в продакшне
# НИКОГДА: prisma db push — сломает данные

# pm2 only matters for the optional self-hosted fallback / dev box.
# In production zaahi.io is served by Vercel — pm2 is NOT in the path.
pm2 restart zaahi                # only on the self-hosted Ubuntu box

## Prisma — CRITICAL

- В продакшне ТОЛЬКО npx prisma migrate deploy
- prisma db push — ЗАПРЕЩЁН
- Схему Prisma НЕ менять без явного задания от founder
- Миграции создавать через npx prisma migrate dev --name описание

## Git правила

- Ветка main — стабильный продакшн
- Новые фичи — отдельная ветка feature/название
- PR обязателен перед мержем в main
- Коммит-сообщения: feat:, fix:, refactor:, docs:, chore:
- Коммитить минимум раз в час при активной работе

## Приоритеты задач

P0 — BLOCKER: платящий пользователь не может работать → fix NOW, всё стоп
P1 — REVENUE PATH: ведёт к первой сделке или подписчику → fix NOW
P2 — INFRASTRUCTURE: БД, auth, API, безопасность → next
P3 — USER FEATURES: новый функционал → after infrastructure
P4 — IMPROVEMENT: рефакторинг, UX → только если нет P0–P3
P5 — NICE TO HAVE: не берёшь без явного решения

## Рабочий цикл — для каждой задачи

1. DECLARE — одна строка: что делаю
2. REVENUE CHECK — почему это ведёт к деньгам
3. CODE — пиши код, не объясняй
4. VERIFY — работает? безопасно? не ломает существующее?
5. LOG — записать решение в DECISIONS.md
6. NEXT — следующий шаг

## Definition of Done

Задача закрыта ТОЛЬКО если:
- Код работает (проверено, не только логически)
- Не ломает существующее (прогнаны затронутые сценарии)
- Можно использовать сегодня (задеплоено или готово к деплою)

## Когда спрашивать founder (и ТОЛЬКО тогда)

1. Архитектурная развилка с разными долгосрочными последствиями
2. Бизнес-логика неоднозначна
3. Два варианта с разным revenue impact

Формат вопроса:
ПРОБЛЕМА: одна строка
ВАРИАНТ A: описание, плюсы, минусы
ВАРИАНТ B: описание, плюсы, минусы
МОЯ РЕКОМЕНДАЦИЯ: A или B, почему

Всё остальное — реши сам.

## Если застрял (>30 минут без прогресса)

1. Разбей задачу на части по 2 часа максимум
2. Упрости — сделай минимально рабочий вариант
3. Закоммить то что работает
4. Продолжи строить на том что зафиксировал

## Рынок и контекст

- Текущий рынок: Dubai (DLD, RERA, Dubai Pulse, Oqood, Ejari)
- Монетизация: SaaS подписки + 0.25% транзакция + API + Data reports
- GTM: Land → Distressed → Commercial → Secondary → Rental
- 15 core nodes: Deal Engine, Land Parcel, Identity, Metaverse, AI Agents, Blockchain Audit, Smart Escrow, Gov Hub, Robotics Fund 10%, Revenue Engine (21 streams), Sovereignty Config, Digital Twin↔Robot Loop, Open ZAAHI, Fractional Ownership, Plugin Architecture

## Запрещено

- Объяснять что делаешь вместо того чтобы делать
- Останавливаться без результата
- Спрашивать без необходимости
- Использовать prisma db push в продакшне
- Писать PII в логи
- Менять схему Prisma без задания
- Деплоить в main без PR
- **Отступать от UI STYLE GUIDE** (см. выше). Browser default стили, emoji в кнопках действий, `transition: all`, резкие toggles, custom hex вне палитры — НЕТ.

## Правила добавления участков на продажу

### Источники данных
- DDA участки (7-значные номера типа 6457940): автоматический парсинг полигона, affection plan, building limit через DDA API
- Не-DDA участки (9-значные номера типа 91415109): placeholder polygon по координатам, данные вводятся вручную

### Цвета по Land Use — APPROVED 9 категорий (утверждено основателем 2026-04-11)
**НЕ менять без явного согласия основателя.** Это финальный список.

| # | Category | Hex | Цвет |
|---|---|---|---|
| 1 | Residential | `#FFD700` | жёлтый |
| 2 | Commercial | `#4A90D9` | синий |
| 3 | Mixed Use | `#9B59B6` | фиолетовый |
| 4 | Hotel / Hospitality | `#E67E22` | оранжевый |
| 5 | Industrial / Warehouse | `#708090` | стальной серый |
| 6 | Educational | `#1ABC9C` | бирюзовый |
| 7 | Healthcare | `#E74C3C` | красный |
| 8 | Agricultural / Farm | `#6B8E23` | оливковый |
| 9 | Future Development | `#84CC16` | лайм |

DDA district / master-plan outlines on the map use the brand gold `#C8A96E` (NOT a land-use category — it's the layer-outline colour).

**Маппинг из DDA land use строк в категории** (case-insensitive `contains`, реализован в `deriveLandUse` в `src/app/parcels/map/page.tsx`):
- `residential`, `villa`, `townhouse`, `apartment` → Residential
- `commercial`, `office`, `retail`, `showroom`, `cbd` → Commercial
- `mixed`, `mixed use`, `mixed-use` → Mixed Use
- `hotel`, `hospitality`, `resort`, `serviced apartment` → Hotel/Hospitality
- `industrial`, `warehouse`, `factory`, `logistics`, `storage` → Industrial
- `education`, `school`, `university`, `academy`, `nursery` → Educational
- `health`, `hospital`, `clinic`, `medical` → Healthcare
- `agriculture`, `farm`, `agricultural` → Agricultural
- `future development` → Future Development
- Несколько разных категорий в `landUseMix` → Mixed Use
- Пустое или неизвестное → `null` → участок рендерится только как контур (outline), без 3D модели, до того как DDA присвоит категорию

**Source-of-truth in code:** `ZAAHI_LANDUSE_COLOR` in `src/app/parcels/map/page.tsx`. The 3D `fill-extrusion-color` match expression in `loadZaahiPlots`, the `LANDUSE_COLORS` map in `src/app/parcels/map/SidePanel.tsx`, and the `LAND_USE_LEGEND` array in the map page MUST stay in sync. CLAUDE.md is the human-readable source of truth — code is the machine-readable one.

**Land Use легенда (9 категорий) утверждена основателем 2026-04-11. НЕ менять без явного согласия.**

### 3D модели — ZAAHI Signature стиль
Opacity зафиксирован: fill 0.35-0.45, outline 0.8. НЕ менять без согласования.
Для каждого land use свой 3D стиль (цвета — секция выше "Цвета по Land Use").

FUTURE DEVELOPMENT (земля без зданий) — только fill polygon, без 3D extrusion.

### Правила 3D моделей (ZAAHI Signature) — НАВСЕГДА
Утверждено основателем 2026-04-11. Реализация: `loadZaahiPlots` →
`computeSetbackM` + `insetRingByMeters` в `src/app/parcels/map/page.tsx`.

Каждая 3D модель состоит из трёх слоёв:
1. **PLOT BOUNDARY** — polygon из DDA, рендерится как `ZAAHI_PLOTS_FILL` + `ZAAHI_PLOTS_LINE`. Fill-opacity 0.35-0.45 (когда есть land use), 0 (outline-only когда нет).
2. **BUILDING FOOTPRINT** — polygon с отступами (setbacks) от границ участка. НЕ виден на карте напрямую, используется как основание для extrusion.
3. **FILL-EXTRUSION** — 3D здание, поднимается от building footprint, **НЕ от plot boundary**. Между зданием и границей участка видна "земля" — это setback.

#### Источник setbacks (по приоритету)
1. **`affectionPlan.buildingLimitGeometry`** — если DDA отдаёт явный полигон building limit, используем его как footprint as-is.
2. **`affectionPlan.setbacks[]`** — если есть массив сторон с `building` / `podium`, берём среднее ненулевое значение в метрах и инсетим plot polygon на эту дельту.
3. **Land-use defaults** — если в affection plan нет setback данных:
   - Residential **villa / townhouse**: 3 м со всех сторон
   - Residential **apartment** (всё остальное residential): ~4 м (5 м от дороги + 3 м от соседей, усреднённо)
   - Commercial / Office / Retail: **0 м** (строят от края до края)
   - Hotel / Hospitality: 3 м
   - Industrial / Warehouse: 4 м
   - Educational / Healthcare: 5 м
   - Agricultural / Farm: 10 м
   - Mixed Use: 4 м

#### Bypass для маленьких участков
Если `plotAreaSqft < 5000` — building footprint **=** plot boundary (без отступов). Здание занимает весь участок, чтобы тонкий villa-plot не превратился в коробку посреди земли.

#### Что не делать
- НЕ строить extrusion прямо от plot polygon (без setback) на нормальных участках. Без отступов 3D выглядит как лего-блок, который занимает весь участок — это противоречит ZAAHI Signature.
- НЕ строить extrusion за пределами plot polygon. Все ярусы (podium / body / crown) должны быть **внутри** building footprint.
- НЕ менять дефолтные setbacks по land use без явного согласия основателя.
- НЕ менять `computeSetbackM` или `insetRingByMeters` без явного согласия основателя.

#### Ступенчатый 3D — podium / body / crown (founder spec 2026-04-12)
**Каждое здание состоит из 1, 2 или 3 ярусов** в зависимости от количества этажей. Все ярусы — features в **одном** GeoJSON source и **одном** fill-extrusion layer (`ZAAHI_BUILDINGS_3D`). Без фильтров по `kind`. Цвет одинаковый для всех ярусов одного здания (по легенде land use). Opacity 0.4 единая на весь layer. Ступенчатость видна через **разницу в ширине**, не через цвет или прозрачность.

| Этажей | Что рисуется | Footprint scale | base → top |
|---|---|---|---|
| ≤ 4 | **podium only** | 1.00 (100%) | 0 → totalH |
| 5–10 | podium + **body** | 1.00 / 0.70 (70%) | 0 → 14 / 14 → totalH |
| > 10 | podium + body + **crown** | 1.00 / 0.70 / 0.50 (50%) | 0 → 14 / 14 → totalH−7 / totalH−7 → totalH |

Константы:
- `FLOOR_H = 3.5` метра на этаж
- `PODIUM_TOP = 14` метра (4 этажа подиума)
- `CROWN_H = 7` метра (последние 2 этажа)
- `floors = round(totalH / FLOOR_H)` — определяет, сколько ярусов рисовать

Footprint каждого верхнего яруса получается через `scaleRingFromCentroid(footprintRing, scale)` — равномерное центрированное сужение к центроиду исходного footprint. Все ярусы остаются внутри plot polygon потому что они геометрически вложены в footprint, а footprint уже учитывает setback.

Реализация: внутри `loadZaahiPlots` в `src/app/parcels/map/page.tsx`, прямо после блока вычисления `totalH` и `buildingHex`. **НЕ менять без явного согласия основателя.**

**Все будущие участки (новые seed-ы, ручные добавления, импорт из Excel) автоматически получают этот стиль через тот же loadZaahiPlots — отдельные hardcoded override-ы для конкретных участков ЗАПРЕЩЕНЫ.**

### Слои по умолчанию
- ВСЕГДА включены: Communities, Major Roads, ZAAHI Plots
- ВЫКЛЮЧЕНЫ: все DDA районы, мастер-планы

### UI
- Hover на участок: мини-карточка (plotNumber | район | sqft | цена | landUse)
- Клик на участок: side panel 350px с ценой, project, dimensions, land use, documents
- Карточка компактная, без пустых мест

### Вопросы и предложения
Если не уверен в данных или архитектурном решении — пиши founder Zhan (`zhanrysbayev@gmail.com`) с копией co-founder Dymo (`d.tsvyk@gmail.com`) на стратегические вопросы. См. секцию `FOUNDER CONTACTS` ниже.

## Sovereignty Readiness Rules
- Minimize Vercel lock-in. Production currently runs on Vercel, but the codebase MUST stay portable: keep the ability to self-host via `docker-compose up`. Avoid Vercel-only APIs (Edge Config, KV, Blob, Vercel Postgres). Use standard Next.js features only.
- All API routes — стандартный Next.js route handlers, никаких Vercel-эксклюзивных серверлесс-обвязок
- Supabase используется ТОЛЬКО через Prisma (не Supabase SDK напрямую для данных)
- Supabase Auth — единственная прямая зависимость, изолирована в src/lib/supabase-browser.ts и src/lib/supabase.ts
- Файлы хранить локально или через абстракцию (src/lib/storage.ts) — не напрямую Supabase Storage
- Environment variables для всех внешних сервисов (легко переключить)
- Docker-ready: проект должен запускаться через `docker-compose up` без Vercel
- Все данные (KML, GeoJSON, PDF) хранятся локально в `data/` — не в облаке

## Правило добавления участков (batch)
- Все участки из DDA (7-значные номера)
- Для каждого: запроси полигон, affection plan, building limit из DDA API
- 3D модель ZAAHI Signature по land use автоматически
- После добавления жди подтверждение "yes" перед следующим

### Цена участка — ТОЛЬКО ВРУЧНУЮ
Общая цена участка (`currentValuation` в `Parcel`, хранится в fils как `BigInt`) устанавливается **ТОЛЬКО вручную**. Источники цены:
1. **Excel файл от основателя** (batch загрузка через `scripts/update-prices-from-excel.ts`-style скрипты — общая цена в формате `50M` / `1.2B` парсится в fils).
2. **Пользователь, добавляющий участок через Add Plot** — устанавливает цену в форме при добавлении.
3. **Собственник участка** может изменить цену через свой профиль (`/api/parcels/[id]` PATCH с проверкой `ownerId === userId`).

**Автоматически рассчитывать или менять общую цену системой ЗАПРЕЩЕНО.** Никаких "GFA × per-sqft" вычислений на стороне сервера или скриптов, никаких автоматических переоценок при обновлении affection plan. `currentValuation` меняется только когда явная инструкция от founder/owner.

`Price per sqft GFA` и `Price per sqft Plot` рассчитываются автоматически из общей цены **только для отображения в карточке** (в `SidePanel.tsx`). Эти производные значения никогда не записываются обратно в БД.

### NEVER delete parcels — ever
- A parcel row in `Parcel` table is **never** deleted by the agent. Not even VACANT stubs, not even rows the agent itself created in a previous batch, not even rows that "look broken".
- The only acceptable mutations on an existing parcel are: update `currentValuation`, update `status`, refresh the `affectionPlans` history (which appends a new row, never removes the old one).
- "Reseed" a parcel = a literal `prisma.parcel.delete` followed by a fresh `create`. This is a destructive operation. **NEVER** do it without an explicit, plot-number-specific instruction from the founder in the current conversation. A blanket "fix the database" is not enough.
- If a parcel needs to be removed for any reason (e.g. wrong plot number, bad data, accidentally added), the agent MUST stop and ask the founder explicitly, listing the row's id / plotNumber / district / status / currentValuation / createdAt before proceeding.
- The same rule applies to `affectionPlans`: never `deleteMany`, only `create`.

### NEVER add duplicate parcels
- **Before adding ANY parcel**, ALWAYS check if `plotNumber` already exists in the `Parcel` table.
- Duplicates are **permanently forbidden** — not "skipped quietly", not "overwritten silently". If a row with that `plotNumber` already exists, abort the add for that plot, log the existing `id` / `district` / `status`, and surface it in the batch report.
- The check is by `plotNumber` alone (not by the composite `(emirate, district, plotNumber)` key) — the same plot must never appear twice, even under a different district label.
- If the founder wants to **update** an existing parcel (price change, status change, affection plan refresh), that is a different operation and requires an explicit "update plot X" instruction — never a "batch add".
- A batch seeder MUST run a pre-flight duplicate check, list all duplicates with current state (status, $/sqft), and only add the plots that are genuinely new.

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

## DEPLOYMENT
- Platform deployed on Vercel: `zaahi.vercel.app` / `zaahi.io`
- Every push to `main` branch auto-deploys to production
- Build command on Vercel: `npx prisma generate && pnpm run build`
- Domain: `zaahi.io` (DNS via Namecheap, A record → `76.76.21.21`, CNAME `www` → `cname.vercel-dns.com`)
- SSL: automatic via Vercel
- Environment variables stored in Vercel Settings → Environment Variables (not committed, not in `.env.local` on the dev box)
- GitHub repo: `ZaahiPlots/Zaahi` (private)
- Database: Supabase PostgreSQL (region `eu-central-1`, Frankfurt)
- Local dev: `pnpm dev` on `localhost:3000`; the long-running agent runs as a `systemd` unit (`zaahi-agent` service)

## AGENT RULES
- Before modifying ANY file, run `git status` and ensure no uncommitted changes from a previous session — never silently mix in someone else's work-in-progress
- NEVER force push (`git push --force`, `git push -f`, `--force-with-lease`). Only normal `git push`
- NEVER delete or overwrite files in the `data/` directory (GeoJSON, KML, PDF assets) — those are the source of truth for plot data and they are NOT regenerable from code
- NEVER modify `prisma/schema.prisma` without explicit permission from the founder
- NEVER change environment variables or `.env.local` (and never commit `.env.local` — it is in `.gitignore` for a reason)
- After every change, run `pnpm build` to verify there are no errors before committing. A red build NEVER reaches `main`
- **NEVER run `pnpm build` while `pnpm dev` is running on the same checkout.** Both write to `.next/` and `pnpm build` will replace chunks the dev server still references, after which every API route returns `500 Cannot find module './XXXX.js'` until you `rm -rf .next && pnpm dev` again. If a verify-build is needed mid-session, stop the dev server first, build, then `rm -rf .next && pnpm dev` to restart cleanly.
- Commit messages MUST be descriptive and use the conventional prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- If the build fails — fix the underlying error. Do NOT skip TypeScript errors with `@ts-ignore` / `@ts-expect-error`, do NOT disable ESLint rules, do NOT add `// eslint-disable` lines just to pass the build
- If you discover unfamiliar files, branches, or in-progress changes — investigate first, never delete or overwrite as a shortcut
- Risky / hard-to-reverse actions (destructive git, schema changes, infra edits) require explicit founder approval before execution

## SMOKE TEST — ОБЯЗАТЕЛЬНО ПОСЛЕ КАЖДОГО ИЗМЕНЕНИЯ
После ЛЮБОГО изменения кода ПЕРЕД `git push` выполни этот чеклист.

### Билд
- [ ] `pnpm build` проходит без ошибок

### Карта (`/parcels/map`)
- [ ] Карта загружается
- [ ] Участки (ZAAHI Plots) видны как 3D здания на карте
- [ ] Цвета 3D зданий соответствуют land use
- [ ] Клик на участок открывает side panel с данными
- [ ] Слои (Layers) панель открывается
- [ ] Communities и Roads видны по умолчанию
- [ ] DDA Districts НЕ загружаются автоматически
- [ ] Toggle отдельного слоя работает (вкл/выкл)
- [ ] Чекбокс секции (ALL) работает
- [ ] Archibald (кот) иконка видна

### Auth (`/`)
- [ ] Страница входа отображается
- [ ] Sign In работает для approved пользователей
- [ ] Sign Up показывает REQUEST SUBMITTED после регистрации
- [ ] Неавторизованный пользователь не видит карту

### API
- [ ] `GET /api/layers/dda/dubai-hills` → 200 (без auth)
- [ ] `GET /api/parcels/map` → 401 (без auth, это правильно)

### Правила smoke-теста (в дополнение к AGENT RULES выше)
- **ПРАВИЛО:** Если ЛЮБОЙ пункт чеклиста не проходит — НЕ пушить. Исправить сначала.
- **ПРАВИЛО:** НИКОГДА не удалять функционал при рефакторинге. Оптимизировать — да. Удалять рабочий код — нет.
- **ПРАВИЛО:** При рефакторинге крупных файлов (>500 строк) — сначала составь список ВСЕХ функций в файле, после рефакторинга проверь что ВСЕ функции сохранены. Это правило существует потому, что на одном из коммитов агент случайно удалил `loadZaahiPlots` (~270 строк) внутри bulk-replace `attachOverlays`, и на проде пропали все участки на карте. Список функций ДО рефакторинга — единственная защита от такой регрессии.

## AMBASSADOR PROGRAM RULES — APPROVED 2026-04-14

3-level referral/ambassador system for ZAAHI. Every approved user can activate
ambassador mode and earn commissions from their 3-level downline when deals close.

### Commission rates (do NOT change without founder approval)
- **Level 1** (direct referral):      **30%** of platform fee share
- **Level 2** (referral of referral): **15%**
- **Level 3**:                         **5%**

Платформенный сбор = **0.25%** от `agreedPriceInFils` (замораживается на Deal.platformFeeFils при DEAL_COMPLETED). Сумма делится пополам seller/buyer, каждая половина независимо проходит 3-уровневую цепочку referral.

### Attribution rules — IMMUTABLE after signup
- Пользователь может иметь только ОДНОГО прямого referrer (`referredById`).
- Referral code — 8-символьный уникальный код из `A-Z2-9` без похожих символов (0/O/1/I/L).
- Код **нельзя менять** после активации (anti-fraud).
- Referrer **нельзя менять** после signup (immutable relation).
- Cycle detection: `wouldCreateCycle()` в `src/lib/ambassador.ts` — защита от A→B→A.
- Cookie `zaahi_ref` (30 дней) ставится на `/r/[code]`, читается на `/api/users/sync` при первой синхронизации.
- После первого signup cookie удаляется — повторное использование невозможно.

### Commission lifecycle
- **PENDING** — начислена на `DEAL_COMPLETED`, ждёт выплаты.
- **PAID** — админ отметил как выплаченную (bank/ZAH token).
- **REVERSED** — сделка позже отменена (`DEAL_CANCELLED`/`DISPUTE_INITIATED`) → clawback.

Commission rows **immutable** — никогда не обновлять `amountFils` / `dealId` / `level` / `ambassadorId` / `basisFils` / `rate` после создания. Только `status`, `payoutMethod`, `payoutRef`, `paidAt`.

### Skip-inactive policy
Если L1 ambassador **не активен** (`ambassadorActive=false`), его слот **НЕ занимается** — L2 "поднимается" на L1 позицию. Это поощряет активное участие: неактивные не блокируют downline.

### Source of truth
- **Константы:** `src/lib/ambassador.ts` (COMMISSION_RATES, PLATFORM_FEE_RATE, MAX_LEVEL).
- **Схема:** Prisma `Commission`, `ReferralClick` модели + `User.referralCode/referredById`.
- **Расчёт:** `awardCommissions()` вызывается в `PATCH /api/deals/[id]` на action=COMPLETE **внутри того же `$transaction`**, что и обновление Deal.status.
- **Reversal:** `reverseCommissions()` на action=CANCEL/DISPUTE.

### Не трогать без founder approval
- Ставки 30/15/5.
- Platform fee 0.25%.
- Глубина 3 уровня (`MAX_LEVEL`).
- Immutability правила.
- Skip-inactive policy.

## FOUNDER CONTACTS
- **Founder & CEO/CTO:** Zharkyn (Zhan) Ryspayev — `zhanrysbayev@gmail.com` — 17 лет в недвижимости, Full-stack инженер, построил всю платформу ZAAHI
- **Co-founder, Ambassador, Guardian Partner:** Dmytro (Dymo) Tsvyk — `d.tsvyk@gmail.com` — 18+ лет глобального управления операциями (Stolt-Nielsen, Bahri), рынок недвижимости Дубая с 2018, партнёр Equilibrium Advisory Group, право вето на стратегические решения
- All architectural decisions require founder approval
- Agent communicates via CLAUDE.md and git commits only

## SESSION STATUS — 2026-04-12

### База данных
- **Parcels:** 101 total (98 LISTED, 3 VACANT) — все в эмирате Dubai
- Все участки рендерятся как ZAAHI Signature 3D buildings (podium / body / crown по числу этажей)

### Сделано сегодня
1. **FOUNDER CONTACTS** — Zhan = Founder/CEO/CTO, Dymo = Co-founder/Ambassador (commit `a265cfc`)
2. **Land Use Legend (9 категорий)** утверждена и зафиксирована в коде + CLAUDE.md (commit `ad0819a`)
3. **Полная диагностика и polish платформы** — auth, signup pending screen, layers, lazy load (commits `47683d6`, `eb361ad`, `3f16c63`, `59336ed`)
4. **3D model setback rules** — building inside plot boundary, защита от lego-block эффекта (commit `b88e75e`)
5. **3D extrusion bug fixed (4-я попытка)** — single-layer architecture, single feature per parcel (commit `dfa6387`)
6. **Hospital plot 6854566** — после 6 итераций откат к стандартному single-building пути (commit `00b8416`)
7. **Prices from Excel** — `update-prices-from-excel.ts` стиль скриптов (commit `d734c4d`)
8. **ZAAHI Signature 3-tier buildings** — podium (≤4 этажей), +body (5-10), +crown (>10). Footprint scale 1.00 / 0.70 / 0.50 через `scaleRingFromCentroid` (commit `3091fe3`)
9. **Download Plot Details PDF из DDA** — новый proxy `/api/parcels/[id]/plot-guidelines`, поле `plotGuidelinesUrl` на `AffectionPlan`, миграция применена через raw SQL (commit `94eb15a`)
10. **Background music + cyberpunk UI sounds** — playlist (2 MP3s), 30% volume, click sweep+noise, hover blip, layer toggle blip, кнопка в HeaderBar рядом с Profile (commit `62cdf98`)

### Что осталось / открытые вопросы
- **Audio файлы отсутствуют:** `public/audio/ambient.mp3` = 0 bytes, `public/audio/ambient2.mp3` не существует. Playlist код gracefully скипает broken/missing tracks (через `error` event), но **музыка не заиграет** пока founder не положит реальные MP3s в `public/audio/`. SFX (click/hover/toggle) работают сразу — синтезируются через Web Audio API без файлов.
- **Hospital plot 6854566** оставлен на стандартном single-building рендере. Если founder захочет multi-building hospital — нужна явная инструкция с конкретной геометрией.
- Production: `zaahi.io` — все коммиты сегодня задеплоены через Vercel auto-deploy from `main`.

