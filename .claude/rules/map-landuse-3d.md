---
paths:
  - "src/app/parcels/map/**"
  - "scripts/prepare-tiles.ts"
  - "src/lib/filter-state.ts"
  - "src/lib/keyboard-nav.ts"
---

# Правила добавления участков на продажу

### Источники данных
- DDA участки (7-значные номера типа 6457940): автоматический парсинг полигона, affection plan, building limit через DDA API
- Не-DDA участки (9-значные номера типа 91415109): placeholder polygon по координатам, данные вводятся вручную

### Цвета по Land Use — APPROVED 10 категорий (палитра пересмотрена; 1-в-1 с кодом 2026-06-15)
**НЕ менять без явного согласия основателя.** Это финальный список.

Эти hex приведены 1-в-1 к живому коду `ZAAHI_LANDUSE_COLOR` (`src/app/parcels/map/page.tsx`)
2026-06-15 (founder-санкция). Прежняя таблица (Residential `#FFD700` жёлтый и т.д.,
палитра 2026-04-11) была устаревшей — код перекрасили, а CLAUDE.md не обновили.

| # | Category | Hex | Цвет |
|---|---|---|---|
| 1 | Residential | `#2D6A4F` | зелёный |
| 2 | Commercial | `#1B3A5C` | тёмно-синий (navy) |
| 3 | Mixed Use | `#6B4C9A` | фиолетовый |
| 4 | Hotel / Hospitality | `#E8732A` | морковный оранжевый (founder 2026-06-15, был бордовый `#7B1E2B`) |
| 5 | Industrial / Warehouse | `#495057` | серый |
| 6 | Educational | `#0077B6` | небесно-синий |
| 7 | Healthcare | `#E63946` | красный |
| 8 | Agricultural / Farm | `#606C38` | оливковый |
| 9 | Future Development | `#A8926E` | песчаник (warm earth · отличается от бренд-золота) |
| 10 | Investment | `#14B8A6` | бирюзовый-teal (AD off-plan) |

DDA district / master-plan outlines on the map use the brand gold `#C8A96E` (NOT a land-use category — it's the layer-outline colour). Future Development = `#A8926E` намеренно ОТЛИЧАЕТСЯ от бренд-золота `#C8A96E`, чтобы участки под застройку не сливались с контурами районов.

**⚠️ Дрейф цвета FutureDev в коде (2026-06-15, частично закрыто):** `ZAAHI_LANDUSE_COLOR` + `LAND_USE_LEGEND` приведены к `#A8926E`. НЕ синхронизированы (хвост): `SidePanel.tsx` (`#C8A96E`), `filter-state.ts` (`#84CC16` — старый лайм), `scripts/prepare-tiles.ts` (`#C8A96E`, tile-build — менять только при ребилде тайлов). Привести при следующем заходе.

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
- AD `primaryUse="Investment"` без другого devCategory mapping → Investment (strategy B — added 2026-06-03; plots already classified via devCategory keep their existing category)
- Несколько разных категорий в `landUseMix` → Mixed Use
- Пустое или неизвестное → `null` → участок рендерится только как контур (outline), без 3D модели, до того как DDA присвоит категорию

**Source-of-truth in code:** `ZAAHI_LANDUSE_COLOR` in `src/app/parcels/map/page.tsx` AND `scripts/prepare-tiles.ts` (tile-build mirror — both must stay in sync). The 3D `fill-extrusion-color` match expression in `loadZaahiPlots`, the `LANDUSE_COLORS` map in `src/app/parcels/map/SidePanel.tsx`, the `LAND_USE_LEGEND` array in the map page, and `LAND_USE_OPTIONS` in `src/lib/filter-state.ts` MUST stay in sync. CLAUDE.md is the human-readable source of truth — code is the machine-readable one.

**Land Use легенда (10 категорий) — 9 утверждены основателем 2026-04-11, INVESTMENT добавлен 2026-06-03. НЕ менять без явного согласия.**

### 3D модели — ZAAHI Signature стиль
Opacity зафиксирован: fill 0.35-0.45, outline 0.8. НЕ менять без согласования.
Для каждого land use свой 3D стиль (цвета — секция выше "Цвета по Land Use").

**3D buildings opacity — два разных значения по типу слоя (founder spec 2026-04-15):**
- **ZAAHI listings 3D buildings (`ZAAHI_BUILDINGS_3D`, source `zaahi-plots-buildings`, наши 114 участков): `fill-extrusion-opacity: 1` — SOLID.** Это наши участки, должны выделяться на карте как сплошные объекты.
- **PMTiles 3D buildings (DDA / AD / Oman через `addLandTileSource`): `fill-extrusion-opacity: 0.35` — TRANSPARENT.** Это фоновые данные, не должны доминировать над листингами.
- `fill-extrusion-opacity` ДОЛЖЕН быть литеральное число, MapLibre не принимает data expressions. Любое выделение выбранного здания делается через `fill-extrusion-color` (brightness) или glow outline на plot layer, НЕ через opacity.

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
- ВСЕГДА включены: ZAAHI Plots (полигоны участков + 3D Signature здания)
- ВЫКЛЮЧЕНЫ по умолчанию: все DDA районы, мастер-планы, Communities, Major Roads, Metro и прочие overlays. Пользователь сам включает через Layers panel.

### Навигация по карте
- **Always-on keyboard nav** — без режимов, без UI-переключателя. W/A/S/D (через `e.code`, layout-independent) — движение в направлении камеры, Q/E — поворот bearing, Space/C — выше/ниже, R/F — pitch, Shift — ускорение. Работает всегда, параллельно со стандартной MapLibre-навигацией мышью.
  - Ignore keys когда фокус в input/textarea/contenteditable.
  - Реализация: `src/lib/keyboard-nav.ts` (controller pattern: `{ destroy }`), install в map-init useEffect. MapLibre собственный keyboard-handler отключён при конструировании карты (`keyboard: false`), чтобы стрелки / +/- не конфликтовали.

> **Drone mode удалён 2026-06-11.** FPS free-flight режим (`3bac358`) был
> отреверчен в тот же день (`6e87fd4`) и затем удалён целиком (`6d02f28`):
> `DroneHUD.tsx` и `src/lib/drone-controls.ts` больше не существуют, ключ
> `localStorage["zaahi-drone-mode"]` не читается. Замена — always-on
> keyboard nav выше (`be1bac2`). Постмортем:
> `docs/research/drone-fps-postmortem-2026-06-11.md`. Не восстанавливать
> без явного решения основателя.

### UI
- Hover на участок: мини-карточка (plotNumber | район | sqft | цена | landUse)
- Клик на участок: side panel 350px с ценой, project, dimensions, land use, documents
- Карточка компактная, без пустых мест

### Вопросы и предложения
Если не уверен в данных или архитектурном решении — пиши founder Zhan (`zhanrysbayev@gmail.com`) с копией co-founder Dymo (`d.tsvyk@gmail.com`) на стратегические вопросы. См. секцию `FOUNDER CONTACTS` в CLAUDE.md.
