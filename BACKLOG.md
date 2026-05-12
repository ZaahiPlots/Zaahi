# ZAAHI Backlog — Future Work

Задачи отложенные на будущее. Не трогать без явного решения founder'а о том, что пора брать.

---

## Vector basemap migration (label customization)

**Задача:** заменить текущий raster basemap (Esri / CARTO) на vector tiles для полного контроля над labels.

**Варианты:**
- **MapTiler** — managed, ~$25/mo, готовые стили, быстрый старт
- **Protomaps** — self-hosted PMTiles, 0$ hosting после единоразовой подготовки, полный sovereignty

**Что это даёт:**
- Полный контроль над всеми label'ами на карте (districts, streets, POIs, landmarks)
- Применить ZAAHI glassmorphism style ко всем текстовым layer'ам (Georgia serif для крупных, gold `#C8A96E` для emphasis, semi-transparent halos)
- Убрать ненужные labels, оставить только релевантные для недвижимости
- Убрать зависимость от чужого branding (Esri / CARTO watermarks)

**Риски / что проверить:**
- Совместимость с текущим PMTiles stack (DDA / AD / Oman overlays)
- 3D fill-extrusion поверх vector basemap — тестировать performance
- Size тайлов vs сегодняшний raster footprint
- Label collision с ZAAHI 3D buildings в zoom 16+

**Оценка времени:** 1-2 дня

**Приоритет:** после Phase 1 User Dashboards + Abu Dhabi migration. Не брать раньше.

**Context added:** 2026-04-16

---

## `scripts/update-tiles.sh` — stale AD paths + tippecanoe extension trap

**Задача:** обновить пути в `update-tiles.sh` чтобы соответствовали текущему output `prepare-tiles.ts` (split по municipality) И добавить guard против tippecanoe extension trap.

**Что не так:**
- Script Step 4 строит `public/tiles/ad-land.pmtiles` из `data/tiles/ad-plots.geojson.nl` (singular).
- `prepare-tiles.ts` давно пишет split: `ad-plots-adm.geojson.nl` + `ad-plots-other.geojson.nl`.
- Runtime в `src/app/parcels/map/page.tsx` (lines 2982-2983) ожидает `ad-land-adm.pmtiles` + `ad-land-other.pmtiles`.
- Поэтому `./scripts/update-tiles.sh` как есть НЕ обновляет реально задеплоенные AD PMTiles. Step 5 commit message также ссылается на несуществующий `data/tiles/ad-plots.geojson.nl` (wc -l fails silently).

**Tippecanoe extension trap (2026-05-13 incident):**
- Tippecanoe v2.49 выбирает формат **по расширению последнего сегмента имени файла**.
- `*.pmtiles` → PMTiles v3 native ✓ (что ожидает runtime protomaps/pmtiles JS loader)
- `*.mbtiles` или ЛЮБОЕ другое расширение (включая `.pmtiles.new`) → MBTiles SQLite (магия "SQLite format 3" — runtime отвергает с "Wrong magic number for PMTiles archive")
- Атомарный swap через `.new` суффикс НЕ работает с tippecanoe (написано в MBTiles, переименование не меняет байты).

**Что починить:**
- Заменить один `tippecanoe -o ad-land.pmtiles ... ad-plots.geojson.nl` на ДВА вызова (ADM + Other) с правильными парами вход/выход, пишущими **напрямую** в `.pmtiles` (без `.new`).
- Добавить magic-byte assertion после каждого tippecanoe: `xxd -l 8 file.pmtiles | head -1` MUST содержать `504d 5469 6c65 7303` (`PMTiles\x03`). Иначе fail-fast перед git commit.
- Обновить commit-message expansion: `wc -l < data/tiles/ad-plots-adm.geojson.nl` + `... -other.geojson.nl`.
- (Опционально) добавить Oman tippecanoe step — сейчас отсутствует в Step 4.

**Приоритет:** non-urgent, post-summit. Сегодня AD heights пересобраны вручную с правильными путями и magic-check.

**Context added:** 2026-05-13
