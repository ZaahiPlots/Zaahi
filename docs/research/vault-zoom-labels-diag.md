# Vault кнопка отдаляет камеру + номера участков — Diagnostic

**Branch:** `research/vault-zoom-labels-diag` (от main)
**Date:** 2026-06-04
**Status:** recon — no code changed

Два независимых наблюдения на `/parcels/map`:

1. Нажатие кнопки **Vault** (toggle «Vault Only» в HeaderBar) роняет
   zoom с ~18 до ~11 — камера улетает на весь Дубай.
2. Номера участков не показываются после события #1.

**Спойлер**: #2 — прямое следствие #1. Фикс #1 решает оба.

---

## TL;DR (для founder, 60 секунд)

### #1 — кнопка Vault уводит камеру

**Корень**: `src/app/parcels/map/page.tsx:5300-5302` в useEffect c deps `[vaultOnlyMode]`:

```ts
map.fitBounds(
  [[minLng, minLat], [maxLng, maxLat]],
  { padding: 80, duration: 1500, maxZoom: 17 },
);
```

Когда юзер включает Vault-only mode, код:
1. Тянет `GET /api/me/vault/map` — все vault-плоты пользователя
2. Считает bounding box ВСЕХ их полигонов
3. `fitBounds` зумит камеру чтобы показать всё разом

Если у founder vault-плоты в **разных районах** (Business Bay + Marina + Al Barsha), bounding box покрывает весь Dubai → zoom падает до ~10-11. `maxZoom: 17` ограничивает только zoom-IN (не вылазить ближе 17 если плоты в одной точке), но zoom-OUT не ограничивает.

Поведение enabled **исторически by design** (комментарий в коде упоминает founder-spec). Сейчас founder требует противоположного: камера остаётся на месте.

**Фикс — удалить fitBounds блок** (~30 строк useEffect). Vault-only mode остаётся фильтром поверх существующего viewport.

### #2 — номера участков

**Корень**: символьный слой меток (`type: "symbol", text-field: PLOT_NUMBER`) живёт в `page.tsx:2944-2973` с **`minzoom: 15`**. Видны при zoom ≥ 15. На zoom 10.77 (после #1) — скрыты.

⚠️ Архитектурный нюанс (см. предыдущий recon `autorotate-zoom-labels-diag.md`): label-слой добавляется **только** для `def.kind === "dda"` GeoJSON-overlays (6 districts из `DDA_LAYERS`: Dubai Hills, Damac Hills 2, и т.п.). PMTiles 600K plot'ов своих меток не имеют.

**Founder подтвердил**: «слой УЖЕ есть и работал раньше при приближении». Значит у него был включён один из DDA district overlays, и на zoom ≥ 15 номера показывались. После Vault-фикса (#1) камера остаётся на zoom 18 → меток minzoom 15 проходит → номера возвращаются автоматически.

**Связь #1 ↔ #2 подтверждена**: #2 — побочный эффект #1. **После фикса #1 номера должны вернуться сами, без правки minzoom.**

Если же founder хочет видеть номера ТОЖЕ при меньшем zoom (например 13-14) — `minzoom` снизить (1 строка). Но это **отдельный вопрос UX**, не связанный с #1.

---

## 1. ПРОБЛЕМА #1 — кнопка Vault отдаляет камеру

### Где находится кнопка

`page.tsx:5644-5662` рендерит `<HeaderBar>` с пропсом `onToggleVaultOnly` (line 5658):
```tsx
<HeaderBar
  ...
  vaultOnlyMode={vaultOnlyMode}
  onToggleVaultOnly={() => setVaultOnlyMode((v) => !v)}
  ...
/>
```

Сам toggle живёт внутри `HeaderBar.tsx` (не показывал детально — просто кнопка с onClick={onToggleVaultOnly}).

### Что происходит на click

Click → `setVaultOnlyMode((v) => !v)` → флипает state.

Несколько useEffects реагируют на смену `vaultOnlyMode`:

| Строка | Что делает |
|---|---|
| 2043 | синхронизирует `vaultOnlyModeRef.current` (для closure handlers) |
| 5203-5210 | переключает visibility слоёв `vaultShared` |
| 5246-5263 | флипает visibility conflict markers, persist в localStorage |
| **5269-5309** | **фетчит /api/me/vault/map + fitBounds — ВОТ ОН** |

### Полный код useEffect #1 (5269-5309)

```tsx
useEffect(() => {
  if (!vaultOnlyMode) return;          // ← только на ENABLE, не на disable
  const map = mapRef.current;
  if (!map) return;
  let cancelled = false;
  (async () => {
    try {
      const r = await apiFetch("/api/me/vault/map");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const fc = (await r.json()) as GeoJSON.FeatureCollection<GeoJSON.Polygon>;
      if (cancelled) return;
      if (!fc.features || fc.features.length === 0) {
        setToast({ kind: "success", message: "No vault plots yet" });
        return;
      }
      let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
      for (const f of fc.features) {
        if (!f.geometry || f.geometry.type !== "Polygon") continue;
        for (const ring of f.geometry.coordinates) {
          for (const [lng, lat] of ring) {
            if (lng < minLng) minLng = lng;
            if (lat < minLat) minLat = lat;
            if (lng > maxLng) maxLng = lng;
            if (lat > maxLat) maxLat = lat;
          }
        }
      }
      if (!Number.isFinite(minLng)) {
        setToast({ kind: "success", message: "No vault plots with geometry yet" });
        return;
      }
      map.fitBounds(                                   // ← вот ОНО
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 80, duration: 1500, maxZoom: 17 },
      );
    } catch (err) {
      console.error("[vault map] flyTo bounds failed:", err);
    }
  })();
  return () => { cancelled = true; };
}, [vaultOnlyMode]);
```

Комментарий выше (5267-5268): «viewport when vault-only mode is turned off — the founder spec explicitly asked for that to stay where the user left it».

То есть **исходный спек был**: на ВКЛючении прыгаем к плотам, на ВЫКЛючении остаёмся на месте. Founder сейчас передумал — хочет «камера НЕ движется» **в обоих случаях**.

### Цифры объясняют 18→10.77

`fitBounds([[minLng,minLat],[maxLng,maxLat]], {padding:80, maxZoom:17})`:
- Если все vault-плоты в одном районе → bbox маленький → fitBounds стремится к z17 (cap), но обычно меньше из-за padding
- Если плоты в разных районах Дубая → bbox диагональ ~10-20 km → fitBounds зумит до z10-12 чтобы поместить всё
- **10.77 — типичный fitBounds-zoom для bbox размером с центр Дубая**

`maxZoom: 17` ограничивает только zoom IN, не OUT. Так что 10.77 — нормальный результат.

### Варианты фикса #1

#### A. Удалить fitBounds полностью (рекомендую)

```diff
-  useEffect(() => {
-    if (!vaultOnlyMode) return;
-    const map = mapRef.current;
-    if (!map) return;
-    let cancelled = false;
-    (async () => {
-      try {
-        const r = await apiFetch("/api/me/vault/map");
-        ...
-        map.fitBounds(
-          [[minLng, minLat], [maxLng, maxLat]],
-          { padding: 80, duration: 1500, maxZoom: 17 },
-        );
-      } catch (err) {
-        console.error("[vault map] flyTo bounds failed:", err);
-      }
-    })();
-    return () => { cancelled = true; };
-  }, [vaultOnlyMode]);
```

Целиком убрать useEffect. ~30 строк удалить.

**Плюсы:**
- Камера ровно на месте — то что просит founder
- Vault-only mode остаётся фильтром: ZAAHI слои + conflict markers + shared overlay уже переключаются через другие useEffects (5203, 5246)
- Минимальный код, нечего ломать

**Минусы:**
- Если у юзера vault-плоты вне текущего viewport — он их **не увидит** пока не отдалит вручную. Founder это ОК принимает (явно сказал «остаётся на текущей позиции»).
- Toast «No vault plots yet» тоже исчезнет (он был побочным фидбеком из этого useEffect). Можно оставить отдельным фетчем для проверки empty state, но это уже scope creep.

**Объём**: −30 строк, 1 useEffect удалён. **Риск**: НИЗКИЙ. Фильтр и слои не задеваются — у них свои useEffects.

#### B. Сделать fitBounds опциональным (отдельная кнопка)

Оставить логику, но триггерить только когда юзер нажимает отдельную кнопку «Show all my Vault plots». Vault-only toggle остаётся чистым фильтром, отдельный action «zoom to all».

**Плюсы**: оба сценария доступны.
**Минусы**: новая UI кнопка, новый state, ~50 строк. Founder не просил.

#### C. Smart fitBounds — только если плоты вне viewport

Условный fitBounds: если **хотя бы один** плот виден на текущем viewport, не двигаемся. Если все вне — fitBounds.

**Плюсы**: интеллект.
**Минусы**: новые edge cases (что если 90% плотов вне viewport — фит или нет?), сложнее тестировать. Не нужно founder'у.

### Рекомендация по #1

**A — удалить fitBounds полностью**. Founder явно сказал «камера НЕ движется». A соответствует. Vault-only mode останется чистым фильтром (показать только vault-плоты), без камера-операций.

---

## 2. ПРОБЛЕМА #2 — номера участков

### Где живёт слой меток

`page.tsx:2940-2973` (внутри `loadLayer`):

```tsx
if (def.kind === "dda" && def.lineId) {
  const labelId = ddaLabelId(def.srcId);          // = `${srcId}-label`
  if (!map.getLayer(labelId)) {
    map.addLayer({
      id: labelId,
      type: "symbol",
      source: def.srcId,
      minzoom: 15,                                // ← порог
      layout: {
        "text-field": ["coalesce", ["get", "PLOT_NUMBER"], ""],
        "text-size": 10,
        "text-font": ["Open Sans Regular"],
        "text-allow-overlap": false,
        "symbol-placement": "point",
        visibility: "none",                       // toggle через plotLabels
      },
      paint: {
        "text-color": isDark ? "#f5f1e8" : "#1A1A2E",
        "text-halo-color": isDark ? "rgba(10, 22, 40, 0.75)" : "rgba(255, 255, 255, 0.85)",
        "text-halo-width": 1.8,
        "text-halo-blur": 0.5,
      },
    });
  }
}
```

### Текущий порог

| Параметр | Значение |
|---|---|
| **minzoom** (показ) | **15** |
| **maxzoom** (скрытие) | не задан = MapLibre default ~24 → фактически нет верхнего предела |
| visibility starting | `"none"` — управляется toggle `plotLabels` |

В UI описание (`page.tsx:6408`): «Per-plot numeric labels. Visible at zoom 16+ to avoid clutter.» — текст говорит 16+, но **в коде 15**. Это маленькая косметика, не баг.

### К какому слою привязано

Только к `def.kind === "dda"` слоям. По коду:
- `page.tsx:1176-1183` — список `DDA_LAYERS` (6 entries): Dubai Hills, Damac Hills 2, Damac Lagoons, Damac Islands, The Valley, Al Jalila
- Это **лениво загружаемые GeoJSON-overlays** для конкретных коммьюнити

**Других символьных слоёв в коде нет:**
- amenities (point, generic) — `page.tsx:2925-2931`
- districtNames (community names) — `page.tsx:4276-4321`, minzoom 11

PMTiles 600K plot'ов (`addLandTileSource` :4035-4159) символьных слоёв НЕ имеют — только fill + line + 3D extrusion. ZAAHI листинги (`ZAAHI_PLOTS_*`) — тоже только fill/line/glow, без меток.

### Связь #1 ↔ #2 — ДА, прямая

**Цепочка**:
1. Юзер на zoom 18, с включённым DDA district overlay (например Dubai Hills) + toggle Plot Numbers ON → метки видны (15 ≤ 18 ≤ 24 ✓)
2. Юзер нажимает Vault → fitBounds улетает на zoom 10.77
3. На zoom 10.77 < minzoom 15 → метки **автоматически скрыты MapLibre'ом**
4. Юзер: «номера пропали»

**Hypothesis founder'а**: после фикса #1, камера остаётся на zoom 18 → метки сразу же возвращаются.

**Это правда**: при условии что:
- (a) Хотя бы один DDA-kind layer включён (Dubai Hills и т.п.)
- (b) toggle `plotLabels` = true
- (c) zoom ≥ 15

Если **все** три условия выполнены, метки видны. Фикс #1 сохраняет (c). (a)+(b) — состояние самого тоггла.

### Что делать с #2

#### X. Ничего (рекомендую если хочется минимума)

После фикса #1 метки вернутся сами. Founder тестит → подтверждает.

**Плюсы**: ноль работы, нулевой риск, никаких лишних изменений.
**Минусы**: остаётся ограничение — метки только для DDA districts, не для PMTiles. Но это **отдельный** архитектурный вопрос (recon `autorotate-zoom-labels-diag.md` §6 опция Y).

#### Y. Снизить minzoom до 14 (если founder хочет видеть номера раньше)

```diff
-          minzoom: 15,
+          minzoom: 14,
```

1 строка. Метки появятся на z14 вместо z15 → видны на zoom 14-15 (раньше скрыты).

**Плюсы**: метки видны раньше.
**Минусы**: clutter — на z14 в плотном районе сотни overlapping labels. `text-allow-overlap: false` cull-ит большинство, но визуально может быть мешанина. **Рекомендую тестить на Business Bay z14 перед мержем.**

**Объём**: 1 строка. **Риск**: НИЗКИЙ (визуальный, не функциональный).

#### Z. Добавить label-слой для PMTiles (тот же что в `autorotate-zoom-labels-diag.md` §6 Y)

Глубокая архитектурная правка. Не нужна для текущей проблемы — после фикса #1 метки уже возвращаются на DDA districts (если они включены). Отдельный проект.

### Рекомендация по #2

**X — ничего не менять.** Фикс #1 достаточен. Founder проверит на проде → если метки вернутся (что должно быть), вопрос закрыт. Если founder хочет тоньше порог или метки на PMTiles — это отдельная задача.

---

## 3. Объём + риск (сводка)

| Issue | Вариант | Файл | Строк | Риск |
|---|---|---|---|---|
| **#1** | **A — удалить fitBounds useEffect** | `src/app/parcels/map/page.tsx` | **−30 (1 useEffect целиком)** | НИЗКИЙ |
| #1 | B — отдельная кнопка «Show all» | `page.tsx` + `HeaderBar.tsx` | +50 | СРЕДНИЙ |
| #1 | C — smart fitBounds | `page.tsx` | +15 | СРЕДНИЙ (edge cases) |
| **#2** | **X — ничего (после #1 автоматически)** | — | 0 | НУЛЕВОЙ |
| #2 | Y — minzoom 15 → 14 | `page.tsx:2948` | 1 | НИЗКИЙ (визуальный) |
| #2 | Z — PMTiles labels | `page.tsx:4035-4159` | ~30-40 | СРЕДНИЙ (perf) |

**Минимальный пакет**: **#1 A + #2 X**. Один файл, −30 строк, оба вопроса закрыты.

Если делать **#1 A** на ветке `feat/vault-no-fitbounds`:
- `pnpm lint` → 0 errors (нет хуков, лишь удаление useEffect)
- `npx tsc --noEmit` → 0
- `pnpm build` → green
- `pnpm dev` + browser smoke: на /parcels/map → клик Vault → камера **не** двигается, видны только vault-плоты + conflict markers (если включены) на текущем viewport

---

## 4. ВЫВОД

| Вопрос | Ответ |
|---|---|
| #1 ТОЧНОЕ место zoom-drop | `src/app/parcels/map/page.tsx:5269-5309`, useEffect deps `[vaultOnlyMode]`, `map.fitBounds(bbox, {maxZoom:17})` на :5300-5302 |
| Что меняется при Vault: zoom/center/pitch? | **zoom + center** (через fitBounds → bbox vault плотов). Pitch не меняется. |
| Связь #1 ↔ #2 | **Да**. fitBounds зумит до z10-11 → labels (minzoom 15) скрываются. Это **единственная** причина пропадания меток. |
| Текущий minzoom меток | **15** (`page.tsx:2948`). UI текст говорит «16+» — мелкая косметика. |
| Вернутся ли метки после фикса #1 | **Да**, при условии что DDA-kind layer (Dubai Hills и т.п.) включён + toggle Plot Numbers ON + камера остаётся на zoom ≥ 15. |
| Нужно ли менять minzoom #2 | **Нет**, если #1 пофикшен. Опционально если founder хочет видеть метки раньше (z14). |
| Объём фикса | **#1 A**: −30 строк (1 useEffect). **#2 X**: 0 строк. |
| Риск | **#1 A**: НИЗКИЙ. **#2 X**: НУЛЕВОЙ. |

**Pre-merge per process diag**: `pnpm lint → tsc → build → dev browser smoke`.

---

## 5. Артефакты — что НЕ менял

Read-only:
- `src/app/parcels/map/page.tsx` (grep + Read многократно)
- `src/app/parcels/map/HeaderBar.tsx` (grep, не открывал — только подтверждал что onToggleVaultOnly proxy on)
- `src/lib/auto-rotate.ts` (perreading из предыдущего recon — для подтверждения что не связано)

Ветка `research/vault-zoom-labels-diag` от main. Без правок кода.
