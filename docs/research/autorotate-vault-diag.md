# Auto-rotate × Vault SidePanel — Diagnostic

**Branch:** `research/autorotate-vault-diag` (from main)
**Date:** 2026-06-04
**Status:** recon — no code changed
**Reported by:** founder

Symptom: on `/parcels/map` with **auto-rotate ON**, clicking a Vault
plot opens the panel but Feasibility и Documents sections **refuse to
expand**. Turn auto-rotate OFF → expand works.

---

## TL;DR (для founder, 60 секунд)

**Корень**: панель открывается нормально, но её внутренний accordion
state (`feasOpen` / `docsOpen` / `isFavorite` / `ddaPhase`) **ресетится
60 раз в секунду** пока auto-rotate крутит камеру.

**Почему 60 раз/с**: `map.on("rotate", () => setBearing(...))`
(`page.tsx:4349`) — слушает каждый кадр вращения, апдейтит React state
`bearing` → page.tsx ре-рендерится 60fps → `VaultSidePanelAdapter`
ре-рендерится → `mapEntryToParcelDetail(view)` создаёт **новый объект
directData каждый рендер** (`VaultSidePanelAdapter.tsx:297`) →
`SidePanel` видит `directData` с новой ссылкой → useEffect с deps
`[parcelId, directData]` (`SidePanel.tsx:303`) ре-фаерится → внутри
`setFeasOpen(false)`, `setDocsOpen(false)`, и т.д.

Юзер кликает «Feasibility» → `setFeasOpen(true)` → следующий кадр
ротации → directData меняет ссылку → effect ресетит → `setFeasOpen(false)`.
Снаружи: «не открывается».

**Только Vault** — обычные ZAAHI listings не задеваются (они идут через
`parcelId: string`, стабильный референс; directData у них `undefined`).

**Не связано со вчерашним leak-fix** (`ca7885c`). Bug структурный,
существовал с момента появления `VaultSidePanelAdapter` (Phase 3
unification, 2026-05-30). Вчерашний фикс мигрировал layer-handlers на
`bindLayerEvent`, но `map.on("rotate", setBearing)` на 4349 — raw
`map.on`, навешан один раз внутри `map.on("load")`, не лиkает и в
миграции не участвовал.

**Фикс — 1 строка**: `useMemo` на `directData` в VaultSidePanelAdapter.

---

## 1. AUTO-ROTATE (`src/lib/auto-rotate.ts`)

### Поведение

- `enable()` / `disable()` — флаг enabled, гейтит rAF tick.
- `tick()` — каждый кадр (`requestAnimationFrame`):
  - проверяет `shouldRotate(t)`: enabled, не paused, не isEasing, pitch ≥ 30, zoom ≥ 11
  - если OK, ставит `selfDriven = true`, вызывает `map.setBearing(map.getBearing() - step)`, потом `selfDriven = false`
- `setBearing()` синхронно фаерит `movestart` → `move` → `moveend` каждый кадр.

### Pause logic

- `bumpPause()` ставит `pauseUntil = now() + 5000` (5s).
- Pause бампается из:
  - `onMoveStart` / `onMoveEnd` (но gated `selfDriven` → собственные тики игнорируются)
  - `onUserInput` на `container.mousedown` / `touchstart` / `wheel` / `keydown` (preemptive — НЕ gated `selfDriven`).
- **Клик пользователя бампает паузу на 5s** до начала любой бизнес-логики, через `mousedown`. Так что клик GARANTEED доходит — auto-rotate не мешает физически событию.

### Что auto-rotate НЕ делает

- Не закрывает SidePanel.
- Не трогает `selectedParcelId` / `selectedVaultEntry`.
- Не вызывает `setState` напрямую в page.tsx.

✅ Auto-rotate сам по себе невиновен. Но его побочный эффект (continuous `setBearing` → fires `rotate` event каждый кадр) триггерит **другую** проблему.

---

## 2. Клик на Vault-участок

### Handler symmetry (vault vs public)

| Layer | Handler | Файл:строка |
|---|---|---|
| `VAULT_SHARED_3D` (share-side) | `bindLayerEvent(map, "click", VAULT_SHARED_3D, ...)` → `setSelectedVaultEntry({ id, mode: "share" })` | `page.tsx:4543-4548` |
| `ZAAHI_PLOTS_FILL` (owner Vault + public listings unified) | `bindLayerEvent(map, "click", ZAAHI_PLOTS_FILL, ...)` → если `props.isVault` → `setSelectedVaultEntry({ id, mode: "owner" })`, иначе → `setSelectedParcelId(props.id)` | `page.tsx:4721-4745` |

**Оба хендлера используют один и тот же helper `bindLayerEvent`** (registry-aware из вчерашнего leak-fix). Оба корректно ловят click даже во время auto-rotate (mousedown bumps pause БЕФОР клик-event firing).

### Где открывается Feasibility / Documents

Клик → `setSelectedVaultEntry(...)` → mount `<VaultSidePanelAdapter>` (`page.tsx:6860`) → fetch entry view → render `<SidePanel directData={mapEntryToParcelDetail(view)} ...>` (`VaultSidePanelAdapter.tsx:302-320`).

Внутри `SidePanel` — accordion sections с локальным state:
- `feasOpen` (line 240) — Feasibility Calculator
- `docsOpen` (line 239) — Documents
- `jvOpen` (line 241) — default true (поэтому юзер «не замечает» что ресетится — он и так открыт)
- `isFavorite` (line 246), `ddaPhase` (line 253) — тоже ресетятся

Click на accordion header → `setFeasOpen(true)` (или `setDocsOpen(true)`).

✅ Логика click и накопления state корректна.

---

## 3. КОНФЛИКТ: панель vs вращение

### useEffect-bomb в SidePanel

```tsx
// src/app/parcels/map/SidePanel.tsx:277-303
useEffect(() => {
  // Direct-data path (vault wrapper) bypasses the API fetch entirely.
  if (directData) {
    setData(directData);
    setLoading(false);
    setDocsOpen(false);     // ← ресет
    setFeasOpen(false);     // ← ресет
    setJvOpen(true);
    setIsFavorite(false);
    setDdaPhase("idle");
    setDdaErr(null);
    return;
  }
  if (!parcelId) return;
  setLoading(true);
  setData(null);
  setDocsOpen(false);
  setFeasOpen(false);
  setJvOpen(true);
  setIsFavorite(false);
  setDdaPhase("idle");
  setDdaErr(null);
  apiFetch(`/api/parcels/${parcelId}`)...
}, [parcelId, directData]);  // ← deps
```

Этот useEffect ресетит ВСЕ accordion-state на **любое изменение
референса `directData`** или `parcelId`.

### Где directData меняет ссылку

```tsx
// src/app/parcels/map/VaultSidePanelAdapter.tsx:297
const directData = mapEntryToParcelDetail(view);
```

`mapEntryToParcelDetail()` — обычная функция, **создаёт новый объект
каждый рендер**. Никакого `useMemo`. → `directData` имеет новую ссылку
на каждый рендер VaultSidePanelAdapter.

### Кто триггерит ре-рендер VaultSidePanelAdapter

`VaultSidePanelAdapter` ре-рендерится когда ре-рендерится parent (page.tsx). Page.tsx ре-рендерится когда меняется его state. Что меняется во время auto-rotate?

**`page.tsx:4347-4349`** (внутри `map.on("load")`, навешан один раз на mount):

```ts
map.on("mousemove", (e) => setCursor({ lng: e.lngLat.lng, lat: e.lngLat.lat }));
map.on("zoom", () => setZoom(map.getZoom()));
map.on("rotate", () => setBearing(map.getBearing()));   // ← вот ОН
```

Auto-rotate's `tick()` → `map.setBearing(...)` → `rotate` event синхронно → `setBearing(...)` → React schedule re-render. **60 раз в секунду пока крутит**.

### Куда тратится `bearing` state

```tsx
// src/app/parcels/map/page.tsx:6117 — compass icon
<span style={{
  display: "inline-block",
  transform: `rotate(${-bearing}deg)`,
  transition: "transform 250ms ease",
  fontSize: 14
}}>
  ⊕
</span>
```

Это единственный потребитель. Компас крутится синхронно с камерой. Эффектно визуально, дорого по rerender-ам.

### Полная цепочка bug'а

```
auto-rotate.tick (60fps)
  └─ map.setBearing()
       └─ MapLibre fires "rotate" event
            └─ map.on("rotate", () => setBearing(map.getBearing()))   page.tsx:4349
                 └─ React state change → page.tsx rerender
                      └─ <VaultSidePanelAdapter> rerender
                           └─ directData = mapEntryToParcelDetail(view)  // NEW ref each render
                                └─ <SidePanel directData={directData}> rerender
                                     └─ useEffect deps [parcelId, directData] → directData ref changed
                                          └─ setFeasOpen(false) ← Feasibility сброс
                                          └─ setDocsOpen(false) ← Documents сброс
                                          └─ setIsFavorite(false), setDdaPhase("idle"), etc.
```

Юзер видит: панель открыта, кликает Feasibility → state переключается на true на ОДИН кадр → следующий кадр ротации → ресет → false → невозможно "удержать" open.

---

## 4. Связь со вчерашним leak-fix (`ca7885c`)

**Не связано.**

### Что вчера мигрировано в bindLayerEvent / bindGlobalMapEvent

29 callsites (28 layer + 1 global) per commit message. Это раздел click/hover handler'ов на layer'ах + ambient layer.

### Что осталось RAW `map.on()`

Несколько слушателей в page.tsx — все НЕ в registry, но и НЕ leak'ают, потому что навешиваются **один раз** внутри однократного callback:

| Строка | Listener | Контекст |
|---|---|---|
| `page.tsx:1687` | `map.on("idle", onLoad)` + `map.off` cleanup | в useEffect, корректный teardown |
| `page.tsx:2091` | `map.on("moveend", debounced)` + cleanup | в useEffect, debounced compute (visibleCount) |
| `page.tsx:4347-4349` | `mousemove/zoom/rotate` → setCursor/setZoom/setBearing | внутри `map.on("load")` (4393), однократно |
| `page.tsx:4366-4369` | `moveend/zoomend/rotateend/pitchend` → scheduleSave | внутри `map.on("load")` |
| `page.tsx:5020-5022` | `map.on/off("zoomend", update)` | в useEffect, корректный teardown |

Ни один не аккумулирует слушателей — все либо один раз, либо с парным `map.off`.

### Сравнение ZAAHI vs VAULT click bindings

Оба переведены на `bindLayerEvent`:
- `bindLayerEvent(map, "click", VAULT_SHARED_3D, ...)` — `page.tsx:4543`
- `bindLayerEvent(map, "click", ZAAHI_PLOTS_FILL, ...)` — `page.tsx:4721`

**Идентичный паттерн**. Вчерашний фикс не сломал Vault click — он одинаково работает для обоих слоёв.

### Если убрать вчерашний фикс?

Bug остаётся. Корень — в `VaultSidePanelAdapter.tsx:297` (`directData` без memo) + `SidePanel.tsx:303` (useEffect deps) + `page.tsx:4349` (rotate listener). Ни одна из этих строк не редактировалась в `ca7885c`.

---

## 5. Vault vs обычные участки

### Гипотеза: bug ТОЛЬКО для Vault

**Обычные ZAAHI listings** (clicked через `ZAAHI_PLOTS_FILL`, `isVault === false`):
- `setSelectedParcelId(props.id)` — string id
- mount `<SidePanel parcelId="..." />` (без directData)
- SidePanel useEffect deps `[parcelId, directData]`:
  - `parcelId` — string, **стабильный референс** (одинаковая строка между рендерами)
  - `directData` — `undefined`, тривиально стабильный
- Effect фаерится **только при изменении `parcelId`** (т.е. при переключении на другой plot). Не на каждый рендер.
- → юзер открывает Feasibility → state остаётся true → ✅ работает с auto-rotate ON.

**Vault** (clicked через `VAULT_SHARED_3D` ИЛИ через `ZAAHI_PLOTS_FILL` с `isVault === true`):
- `setSelectedVaultEntry({ id, mode })`
- mount `<VaultSidePanelAdapter entryId mode />`
- VaultSidePanelAdapter fetches view, рендерит:
  ```tsx
  const directData = mapEntryToParcelDetail(view);  // fresh object each render
  return <SidePanel parcelId={null} directData={directData} ... />
  ```
- SidePanel useEffect deps `[null, directData(new ref)]`:
  - `parcelId` стабильно null
  - `directData` — **новая ссылка каждый рендер**
- Effect фаерится **на каждый рендер VaultSidePanelAdapter**.
- → юзер открывает Feasibility → effect ресетит state → ✗ не работает.

### Эмпирическое подтверждение

Founder может проверить за 10 секунд:
1. /parcels/map → auto-rotate ON
2. Клик **обычный ZAAHI plot** (не Vault, golden 3D) → SidePanel открыт → клик «Feasibility Calculator» → раскрывается и остаётся раскрытым. ✅ должно работать
3. Клик **Vault-участок** → панель открыта → клик «Feasibility» → не раскрывается. ✗ воспроизведёт bug

Если step 2 РАБОТАЕТ, а step 3 ЛОМАЕТСЯ — анализ верный.

---

## 6. План фикса (рекомендация)

### Опция A (РЕКОМЕНДУЮ) — `useMemo` на directData

**1 строка изменения** в `VaultSidePanelAdapter.tsx`:

```diff
-  const directData = mapEntryToParcelDetail(view);
+  const directData = useMemo(() => mapEntryToParcelDetail(view), [view]);
```

- `directData` стабилен пока не изменился `view`
- `view` меняется только при successful fetch / refetch — типично 1 раз на mount
- Effect в SidePanel перестаёт фаериться на каждый рендер
- Accordion state переживает auto-rotate

**Риск**: МИНИМАЛЬНЫЙ. Никаких новых зависимостей, никаких изменений в API/контракте. Чистая мемоизация для **референциальной стабильности** прокинутого пропа.

**Покрытие**: фиксит Feasibility + Documents + Favorite + DDA-phase
для Vault. Поведение для обычных listings не меняется (там
directData=undefined).

### Опция B — Throttle setBearing / setZoom / setCursor на page.tsx

Дополнительная (НЕ замена) к Опции A. Снижает rerender-rate page.tsx с
60fps до ~10fps:

```ts
let lastBearingUpdate = 0;
map.on("rotate", () => {
  const t = performance.now();
  if (t - lastBearingUpdate < 100) return;
  lastBearingUpdate = t;
  setBearing(map.getBearing());
});
```

- Уменьшает CPU нагрузку
- Компас по-прежнему крутится, но обновляется 10 раз в сек (визуально неотличимо)
- **НЕ необходимо** для фикса bug'а, если Опция A применена. Но хорошая perf-побочка.

**Риск**: НИЗКИЙ. Аналогично для `setCursor` (mousemove тоже частое) и `setZoom`.

### Опция C — Сузить SidePanel useEffect deps

```diff
-}, [parcelId, directData]);
+}, [parcelId, directData?.id]);
```

Сравнить по `directData.id` вместо референса.

- Решает проблему, но **меняет семантику** SidePanel: если directData переписан с другим контентом но тем же id (например, refresh share permissions), панель не обновится.
- **Опция A чище** — мемоизация решает на стороне Vault, SidePanel остаётся общим компонентом без изменений.

---

## 7. ВЫВОД

| Вопрос | Ответ |
|---|---|
| **Почему auto-rotate блокирует Feasibility/docs на Vault?** | Auto-rotate fires `rotate` events 60fps → page.tsx `setBearing` triggers rerender 60fps → VaultSidePanelAdapter creates new `directData` object each render → SidePanel's useEffect with `[parcelId, directData]` resets accordion state every render. |
| **Вращение закрывает панель ИЛИ клик не доходит?** | Ни то, ни другое. Панель открывается, клик доходит, accordion устанавливает state на `true` → но следующий кадр ротации ресетит state на `false`. |
| **Задел ли вчерашний leak-fix Vault click?** | Нет. Click handler ZAAHI и VAULT_SHARED_3D одинаково через `bindLayerEvent`. Bug в SidePanel useEffect + VaultSidePanelAdapter directData, не тронуто в `ca7885c`. Bug pre-existed (с Phase 3 2026-05-30). |
| **Только Vault или все участки?** | **Только Vault**. Обычные listings проходят через `parcelId: string` (стабильный референс), `directData=undefined` — useEffect не ре-фаерится. Можно эмпирически подтвердить за 10 сек (см. §5). |
| **План фикса + риск** | **Опция A**: `useMemo` на `directData` в `VaultSidePanelAdapter.tsx:297`. 1 строка, риск минимальный. **Опционально B**: throttle setBearing/setCursor/setZoom на 100ms — perf-побочка, не обязательна. |

---

## 8. Артефакты — что НЕ менял

Read-only, никаких правок:
- `src/lib/auto-rotate.ts` (только чтение, для разбора)
- `src/app/parcels/map/page.tsx` (grep + read)
- `src/app/parcels/map/SidePanel.tsx` (read 230-340)
- `src/app/parcels/map/VaultSidePanelAdapter.tsx` (read 1-360)
- `git show ca7885c` (yesterday's leak-fix, full diff)

**Ветка**: `research/autorotate-vault-diag` от main. Без правок кода.
