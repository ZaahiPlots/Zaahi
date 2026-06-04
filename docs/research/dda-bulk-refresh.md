# DDA Bulk Refresh — Recon (task 3/4 dashboard surfacing)

**Author:** agent
**Date:** 2026-06-04
**Branch:** `research/dda-bulk-refresh` (read-only, no code touched)
**Status:** recon — founder decides path before any code

---

## TL;DR (для founder, 30 секунд)

Founder говорит «обновить ВСЕ 461K участков карты кнопкой из админки».
На деле это ДВА совершенно разных «refresh», которые нужно
разделить:

| # | Что | Объём | Где живёт | Как «обновить» сейчас |
|---|---|---|---|---|
| **A** | ZAAHI listings (Parcel-таблица) | ~111 plot (LISTED+VERIFIED+IN_DEAL) | Postgres `Parcel` + `AffectionPlan` | `scripts/refresh-all-dda.ts` (CLI с прод-окружением, ~1 req/s, ~7 мин) |
| **B** | Карта (PMTiles) | **600K сырых plot → 1.2M tile-фич → ~352 MB .pmtiles** | R2 (`pub-eb19…r2.dev`), статичные файлы | `scripts/update-tiles.sh` — full fetch+inset+tippecanoe+R2 upload, **30–60 мин**, нужен native tippecanoe+python+wrangler |

**Кнопка из админки реальна ТОЛЬКО для A.**
B — нативные бинарники + долгий пайплайн, **не может** запускаться
из Vercel-функции. Это build-box операция, которую founder уже
запускает руками.

Ниже — детали по каждому пункту founder'а.

---

## 1. ТЕКУЩИЙ пайплайн DDA → карта

### A. Parcel-таблица (~111 ZAAHI listings)

**Источник свежих данных:** живые ArcGIS endpoint'ы:
- `https://gis.dda.gov.ae/server/rest/services/DDA/BASIC_LAND_BASE/MapServer/2/query` (polygon + attributes)
- `https://gis.dda.gov.ae/.../DIS` (affection plan HTML) — через `src/lib/dda.ts:fetchPlotInfoHtml`
- Building Limit endpoint (отдельный GeoJSON layer)

**Путь от DDA до строки в Parcel:**
```
ArcGIS REST  →  fetchFullDdaData (src/lib/dda-plot-lookup.ts)
             →  refreshDdaForParcel (src/lib/refresh-dda.ts)
             →  prisma.parcel.update    (geometry / lat / lon ТОЛЬКО)
             →  writeAffectionPlan       (новая строка в AffectionPlan, append-only)
```

**Сейчас обновляется через:**
1. `triggerDdaFetch` в `src/app/parcels/map/SidePanel.tsx:305` → POST `/api/parcels/seed-dda` (per-plot, в публичном sidepanel **выпилен** 2026-05-31 — комментарий line 1034-1037, функция оставлена «для админ-инструмента»).
2. `/api/parcels/[id]/affection-plan/refresh` POST (per-plot, gate `ownerId || verifiedOwnerUserId`).
3. **`scripts/refresh-all-dda.ts`** — CLI bulk, проходит по всем `LISTED/VERIFIED/IN_DEAL` parcel'ам с `--since=` staleness window (default 30 days). **Запускается руками с прод-окружением.**

> Из шапки `refresh-all-dda.ts:6-13`: «Founder spec 2026-05-31: one admin
> action to refresh DDA-derived data ... across the public ZAAHI
> listings catalogue.» **Founder уже специфицировал admin-bulk для пути
> A — но UI ещё не построен, только CLI.**

### B. Карта (1.2M tile-фич, 600K сырых plot)

**Источники свежих данных:**
- DDA: `gis.dda.gov.ae/server/.../BASIC_LAND_BASE/MapServer/2` (тот же что в A) — `scripts/fetch-dda-plots.ts` тянет 99,235 plot батчами по 2000.
- AD (Abu Dhabi): `onwani.abudhabi.ae/arcgis/.../MyLand/SMARTHUB/MapServer/0` — `scripts/fetch-ad-plots.ts` тянет ~410K plot.
- Oman (Muscat): `geoportal.mm.gov.om/.../MUSCAT.Plots` — `scripts/fetch-oman-plots.ts` тянет 94,640 plot.

**Путь от сырых данных до участка на карте:**
```
fetch-*.ts           →  data/layers/{dda,ad,oman}-plots/*.geojson   (per-district)
inset-geojson.py     →  data/layers-inset/...                         (3m setback, UTM 40N, shapely)
prepare-tiles.ts     →  data/tiles/*.geojson.nl                      (color/height/podium/body/crown)
tippecanoe           →  public/tiles/*.pmtiles                         (4 файла, z10-z18)
upload-tiles-r2.sh   →  R2 bucket «zaahi-tiles»                        (wrangler)
NEXT_PUBLIC_TILES_BASE_URL → клиент грузит с R2
```

**Файлы и объёмы (на момент чтения, 2026-06-04):**

| .pmtiles | Размер | Фич | Сырых plot |
|---|---|---|---|
| `dda-land.pmtiles` | 52 MB | 184,393 | ~99,235 |
| `ad-land-adm.pmtiles` | 134 MB | 434,186 | ~210K |
| `ad-land-other.pmtiles` | 166 MB | 419,603 | ~200K |
| `oman-land.pmtiles` | — | 160,199 | ~94,640 |
| **Итого** | **~352 MB** | **~1,198,381** | **~604K** |

**«461K»** в задаче founder'а — округление AD-доли (210K ADM + 200K Other ≈ 410K, + DDA 99K ≈ 510K, − Oman 94K = ~415K при счёте «без Oman»). Точно — **600K сырых plot**.

### Где «обновление через DDA» о котором говорит founder

Только в пути A (per-plot `triggerDdaFetch`, `/api/parcels/[id]/affection-plan/refresh`, CLI `refresh-all-dda.ts`). **Никакого «обновления тайлов» из работающей системы сегодня нет** — путь B запускается founder'ом руками через `./scripts/update-tiles.sh`. Per-plot инкрементального обновления тайлов **нет вообще** (tippecanoe строит monolithic .pmtiles, нельзя «обновить участок» точечно).

---

## 2. ИСТОЧНИК свежих данных

**Живой источник есть — три разных ArcGIS REST endpoint'а:**

| Source | URL | API quota | Полные обновления |
|---|---|---|---|
| DDA (Dubai) | `gis.dda.gov.ae` | публичный, batch 2000, лимита явно нет, но stays-out-of-trouble = ~1 req/s | Cadastral data — новые subdivision'ы редко (раз в месяц-два) |
| Onwani (Abu Dhabi) | `onwani.abudhabi.ae` | публичный, batch 2000 | Похоже редко (raw data столь же стабильна) |
| Muscat | `geoportal.mm.gov.om` | публичный | Не наблюдалось активного апдейта (Seeb contract, статика) |

**Данные не «статичны раз собрали», а «обновляются редко».** Раз в день не имеет смысла — DDA cadastre не меняется ежедневно. Раз в месяц достаточно, и так уже делается руками founder'а через update-tiles.sh.

**⚠️ Если founder спросил «есть ли источник свежих данных»** — да, есть, и он живой; но **частота изменений в источнике низкая**, а стоимость pull-rebuild-deploy высокая. «Обновлять кнопкой» имеет смысл точечно по запросу, а не как rolling auto-refresh.

---

## 3. ТЕХНИЧЕСКАЯ реальность кнопки

### Можно ли это запустить из Vercel-функции (браузерная кнопка)?

#### Путь A (Parcel-таблица, ~111 plot)
- **Сейчас**: CLI, потому что Vercel function timeout (Hobby 10s, Pro 60s, Fluid Functions 800s максимум) не покрывает 111 × ~4s round-trip × 1 req/s rate-limit = **~7-8 минут**.
- **С Fluid Functions (Pro plan)**: 800s = 13 минут — **на грани, но достаточно**. Был бы fragile при ретраях.
- **Реалистично**: фоновая задача с polling прогресса. Vercel Queue / Vercel Background Functions / внешний worker.
- **Простейший вариант**: admin POST'ит POST `/api/admin/dda-bulk-refresh` → endpoint **спавнит фоновый Promise** (не awaited), сразу возвращает `jobId`, пишет статус в БД (Postgres-row или `Notification`); UI polling каждые 3s. Endpoint не блокируется, ответ 200 OK моментально. Реальная работа крутится в фоне — но **Vercel kill'нёт функцию через 60-800s** в зависимости от плана. Для 8 минут работы нужно **разбить на батчи** или использовать настоящий worker.
- **Vercel Background Functions / Workflow DevKit** — официальный путь для long-running. Нужно отдельное обсуждение архитектуры.

#### Путь B (Tile pipeline, 600K plot)
- **Не может работать из Vercel-функции** — фундаментальные блокеры:
  - `tippecanoe` — native binary, не входит в Vercel runtime
  - `python3 + shapely` — native, не входит
  - `wrangler` — node CLI, можно как dep, но R2 credentials нужны
  - **352 MB output** — Vercel function memory + tmpfs не выдержит (макс ~512 MB tmp)
  - **30-60 минут runtime** — превышает любой Vercel timeout
- **Это build-box операция.** Founder уже запускает её руками.

### Архитектурные варианты для B

| Вариант | Кто запускает | Latency | Сложность |
|---|---|---|---|
| **Текущее** | Founder вручную (`./scripts/update-tiles.sh`) | 30-60 мин | 0 (уже работает) |
| GitHub Actions on workflow_dispatch | Кнопка триггерит API → GH webhook → Actions запускает скрипт → коммит в main → Vercel redeploy | 30-90 мин (Actions + Vercel build) | Средняя — нужна secrets storage, workflow file |
| Внешний worker (e.g. EC2/Fly.io) | Кнопка триггерит webhook → worker запускает скрипт → upload R2 → notify | 30-60 мин | Высокая — инфра, мониторинг |
| Cloudflare Worker queue + manual escalation | Кнопка ставит задачу → founder'у уведомление → founder подтверждает на своей машине | 0 (только постановка) + 30-60 мин | Низкая, но не «кнопка делает» |

Из этих вариантов **«founder вручную» — уже самое надёжное и быстрое** для частоты «раз в месяц». Кнопка-обёртка через GH Actions добавляет 30+ мин latency на сам workflow без выигрыша по контролю.

---

## 4. РИСКИ

### Общие риски массовой перезаписи

**A. Parcel-таблица (~111 plot)**
- ✅ `refresh-dda.ts` НЕ трогает: `currentValuation`, `status`, `ownerId`, `verifiedOwnerUserId`, `PlotClaim`, существующие `AffectionPlan` rows (append-only). Эти инварианты **уже защищены в коде** (`src/lib/refresh-dda.ts:14-20`).
- ✅ Прод-host guard: refuses to run если `DATABASE_URL` не содержит prod project id `sydmaxwjmwwnzbwvhrhn` (предотвращает повтор инцидента 2026-05-29 P2022).
- ✅ Per-parcel try/catch: одна неудачная фетча не убивает batch.
- ⚠️ Что **может** сломаться: если DDA endpoint вернёт перестроенный polygon (например, plot был subdivided) — geometry поменяется, центроид сместится. Это нормально. Но если visual smoke не сделать, никто не заметит.
- ⚠️ AreaSqft DDA может дрифтовать — `refresh-dda.ts` **намеренно НЕ обновляет** `area` (комментарий line 64: «Area is left alone because the seed pipelines are the canonical writer»).

**B. Tile pipeline (600K plot)**
- 🚨 **Atomic deploy риск**: tippecanoe пишет ПРЯМО в `public/tiles/*.pmtiles` (не `.new` → swap — `BACKLOG.md:101` past incident). Если build crashed mid-write — corrupt .pmtiles. Magic-byte check (`xxd -l 8` = `504d54696c657303`) уже стоит в `update-tiles.sh:128-141`, fails fast.
- 🚨 **Partial fetch риск**: если DDA endpoint flaky в середине fetch'а — часть districts не обновится, output mixed-version. Сейчас fetch-скрипты не atomic — они пишут per-district файлы сразу. Если упасть в середине — `data/layers/dda-plots/` будет частично старый, частично новый. **Founder должен видеть лог fetch до запуска prepare-tiles.**
- 🚨 **R2 upload partial**: 4 файла грузятся по очереди. Если один не доехал — на проде mixed (например, новый DDA + старый AD). Wrangler не делает atomic batch.
- 🚨 **Откат**: R2 bucket по умолчанию БЕЗ versioning'а. После рebuild-deploy старая версия .pmtiles **исчезает с R2**. Откат = git revert + повтор upload. Если потребуется быстрый откат — должна стоять R2 versioning (founder может включить в Cloudflare dashboard).

### Защита currentValuation = ТОЛЬКО вручную

- **Путь A**: уже защищено — `refresh-dda.ts:15` явно говорит «What this NEVER touches: currentValuation (price is owner-set, see CLAUDE.md)».
- **Путь B**: tile pipeline вообще не пишет в Parcel-таблицу. `currentValuation` не пересекается с тайлами. Цена живёт в БД, отображается в SidePanel при клике на ZAAHI plot — это другой code path.
- ✅ **Существующий refresh механизм уже не трогает цену.** Если строим новый — должно следовать тому же правилу (whitelist полей, явно НЕ включать `currentValuation`).

### Защита рабочих тайлов при пересборке

- Сейчас: magic-byte check после tippecanoe. **Этого достаточно** для defense-in-depth: corrupted .pmtiles НЕ комитится.
- Что нужно добавить **если строим автоматический triggered rebuild**:
  - Backup старых .pmtiles перед перезаписью (cp в `.bak`)
  - После upload R2 — HEAD-check каждый файл на доступность + проверка header
  - Только если все 4 файла верифицированы — git push / R2 promote

---

## 5. ВАРИАНТЫ реализации

### Вариант A0 — «Wire-up существующего» (рекомендую как Phase 1)

**Что**: Admin UI кнопка «Refresh ZAAHI Listings (DDA)» в `/admin` — обёртка над уже существующим `scripts/refresh-all-dda.ts`.
**Реальный объём**: ~111 plot, ~7-8 минут на батч.
**Архитектура**:
- POST `/api/admin/dda-refresh-listings` (gate `getAdminUserId`) → создаёт `RefreshJob` row в БД, спавнит работу через Vercel Background Function или **просто инлайн с warning** «UI close → continue background»
- UI poll GET `/api/admin/dda-refresh-listings/[jobId]` → progress {processed, total, ok, failed}
- Использует существующий `refreshDdaForParcel` — все защиты уже in-place
**Объём кода**: ~150 строк (route + UI + DB-table для job)
**Риск**: НИЗКИЙ — все safety-инварианты в `refresh-dda.ts` уже стоят
**Источник**: `refresh-all-dda.ts:6` — founder сам специфицировал это 2026-05-31
**Что НЕ покрывает**: 600K plot на карте

### Вариант A1 — Vercel Workflow / Background

Тоже самое что A0, но на правильном Vercel Workflow DevKit (durable, retry-friendly). Более robust, но overhead.
**Объём**: +1 день на освоение Workflow
**Риск**: НИЗКИЙ
**Когда выбрать**: если запускать чаще раза в неделю или нужна история запусков с retry.

### Вариант B0 — «Кнопка через GitHub Actions» (для tile pipeline)

**Что**: Admin UI кнопка «Rebuild Map Tiles» → POST `/api/admin/tiles-rebuild` → trigger GH Actions workflow_dispatch → Actions runner запускает `./scripts/update-tiles.sh` → коммит в main → Vercel auto-deploy.
**Архитектура**:
- GH Personal Access Token в Vercel env
- GH workflow file с `tippecanoe` + `python3+shapely` setup
- Storage R2 credentials в GH Secrets
- Progress polling через GH Actions API
**Объём кода**: ~200 строк (route + UI + workflow YAML)
**Latency end-to-end**: 30-90 мин (Actions + Vercel build)
**Риск**: СРЕДНИЙ — pipeline не атомарен (partial fetch / R2 partial upload могут случиться)
**Безопасность**: GH secrets + admin gate на endpoint достаточны
**Что НЕ покрывает**: ускорение pipeline'а — он останется 30-60 мин

### Вариант B1 — Status-only «Refresh requested» уведомление

**Что**: Кнопка не запускает rebuild сама, а ставит **запрос** в очередь (Notification к founder'у с timestamp) + показывает «next manual rebuild needed». Founder получает уведомление, дёргает скрипт у себя.
**Объём**: ~50 строк (admin notification + UI)
**Latency**: моментальная постановка + 30-60 мин когда founder запустит
**Риск**: МИНИМАЛЬНЫЙ
**Минус**: «кнопка не делает», founder в loop'е

### Вариант B2 — Per-plot incremental в БД, без пересборки тайлов

**Что**: Не пересобирать pmtiles вообще. Вместо этого — для тех plot'ов где founder/админ хочет fresh data, вызывать refresh **только в Parcel-таблице** (т.е. путь A для ZAAHI-листингов). Карта (тайлы) остаётся со старыми данными, но **клик на участок** показывает свежее (т.к. SidePanel грузит данные из Parcel-table, не из тайлов).
**Объём**: уже почти готово (= A0)
**Риск**: НИЗКИЙ
**Минус**: «холодные» данные на карте (high-zoom labels из pmtiles) могут расходиться с «горячими» в Parcel-table до следующего manual rebuild.

---

## 6. ВЫВОД (для founder'ского решения)

### Как сейчас устроено обновление DDA

**Два независимых пайплайна:**
- **Parcel-таблица (~111 ZAAHI listings)**: live ArcGIS → `refreshDdaForParcel` → DB. Per-plot через UI был (выпилен из публичной SidePanel), bulk CLI существует. **Защищён против перезаписи `currentValuation`.**
- **PMTiles (600K plot на карте)**: full pipeline (3 government fetch'а + shapely inset + tippecanoe + R2 upload), запускается founder'ом вручную ~раз в месяц через `update-tiles.sh`. **Не пишет в Parcel-таблицу вообще.**

### Есть ли источник свежих данных

**Да** — три живых ArcGIS REST endpoint'а. Но **частота изменений в источнике низкая** (DDA cadastre обновляется ~раз в месяц). Daily auto-refresh не имеет смысла.

### Реально ли «кнопкой из админки»

- **Для ZAAHI listings (~111)**: **ДА** — wire-up существующего `refresh-all-dda.ts` в admin UI. CLI уже работает, safety-инварианты на месте. Нужна обвязка: admin route + job-tracking table + progress UI. ~1-1.5 дня работы.
- **Для всех 600K plot карты (PMTiles)**: **НЕ КНОПКА** в чистом виде. Pipeline нативный (tippecanoe+python+wrangler), 30-60 минут, 352 MB output. Реалистичные опции:
  - **B0** — кнопка через GH Actions (latency 30-90 мин, atomic риск)
  - **B1** — кнопка-уведомление founder'у (моментальная постановка, founder руками)
  - **Текущее** — оставить как есть (founder ./scripts/update-tiles.sh каждый месяц)

### Защита `currentValuation` от затирания

- **A путь уже защищён** — `refresh-dda.ts:15` явно whitelisted, цена не трогается. **Не дублировать защиту**, она уже есть.
- **B путь** не пишет в Parcel-таблицу вообще, цена там не пересекается.

### Рекомендация

**Phase 1 (сделать сейчас, в рамках текущей итерации task 3/4):**
- **Вариант A0** — admin UI для bulk-refresh ZAAHI listings (~111 plot). Это то, что founder специфицировал 2026-05-31, к чему оставили `triggerDdaFetch` в SidePanel «для админ-инструмента», и для чего уже написан `refresh-all-dda.ts`. Реализуется поверх существующего кода с прозрачным progress UI.

**Phase 2 (отдельная задача, после согласования архитектуры):**
- Если founder хочет «кнопкой переcобрать все 600K тайлов» — **Вариант B0** (GH Actions) или **B1** (notification). Это отдельная инфра-задача, не часть dashboard surfacing.

**Что НЕ делать:**
- ❌ Пытаться запихнуть tippecanoe в Vercel-функцию — фундаментально невозможно.
- ❌ Писать новый bulk-CLI с нуля — `refresh-all-dda.ts` уже есть, надо только wire-up UI.
- ❌ Дублировать защиту `currentValuation` — она уже в `refresh-dda.ts`.
- ❌ Запускать tile rebuild чаще раза в месяц — DDA cadastre так часто не меняется, это сожжёт R2 egress и API квоты впустую.

---

## 7. Артефакты (что я НЕ менял)

Ничего не редактировал. Только читал:
- `scripts/prepare-tiles.ts`, `scripts/update-tiles.sh`, `scripts/upload-tiles-r2.sh`, `scripts/fetch-{dda,ad,oman}-plots.ts`, `scripts/refresh-all-dda.ts`
- `src/lib/refresh-dda.ts`, `src/lib/dda.ts`, `src/lib/dda-plot-lookup.ts`, `src/lib/auth.ts`
- `src/app/api/parcels/seed-dda/route.ts`, `src/app/api/parcels/[id]/affection-plan/refresh/route.ts`
- `src/app/parcels/map/SidePanel.tsx` (только grep)
- `data/tiles/*.geojson.nl` (wc-l + ls для объёмов), `public/tiles/*.pmtiles` (только ls)
- `docs/r2-migration-plan.md`, `BACKLOG.md` (только grep)

**Ветка**: `research/dda-bulk-refresh` от main. Без правок кода/пайплайна/тайлов.
