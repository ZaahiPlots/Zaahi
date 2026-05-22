# ZAAHI Backlog — Future Work

Задачи отложенные на будущее. Не трогать без явного решения founder'а о том, что пора брать.

---

## Accumulated FK / default drift в schema.prisma (pre-existing)

**Задача:** исследовать накопленный schema drift между `prisma/schema.prisma`
и migration history, спланировать cleanup migration.

**Что обнаружено (2026-05-22, при создании vault_dda_snapshot migration):**
`prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`
вернул не только желаемое `ADD COLUMN VaultEntry.ddaSnapshot`, но и
**15 statement'ов drift** который существовал ДО vault MVP work:

| Drift item | Что значит |
|---|---|
| `ALTER TABLE ActivityLog DROP CONSTRAINT ActivityLog_userId_fkey` + re-ADD with `ON DELETE CASCADE` | Re-applies cascade semantics |
| Same DROP+ADD на: `Notification.userId`, `ParcelView.parcelId`, `ParcelView.userId` (SET NULL), `SavedParcel.userId`, `SavedParcel.parcelId`, `SavedSearch.userId` | 7 FK constraints с обновлёнными onDelete/onUpdate |
| `ALTER TABLE AmbassadorApplication ALTER COLUMN "updatedAt" DROP DEFAULT` | Колонка раньше имела default; теперь Prisma-managed `@updatedAt` |

**Origin:** кто-то редактировал `schema.prisma` (менял `onDelete` атрибуты FK,
драгнул default'ы), но миграции не создавались. Когда staging-v2 setup'или
сегодня — все 18 миграций применились (старые семантики), а schema.prisma
ушёл вперёд. Затрагивает таблицы из cohort-pilot / dashboards / ambassador
phase, не vault.

**Что проверить ПЕРЕД любым apply этого drift на prod:**
1. **Orphan rows на каждой FK** — например `Notification.userId` not in
   `User.id`. Если есть orphan → CASCADE recreate упадёт. Запрос:
   ```sql
   SELECT COUNT(*) FROM "Notification" n
   LEFT JOIN "User" u ON u.id = n."userId" WHERE u.id IS NULL;
   ```
   Repeat для всех 7 FK.
2. **AmbassadorApplication.updatedAt DROP DEFAULT** — проверить что нет rows
   с NULL updatedAt; иначе будущие `@updatedAt` writes могут не обновлять.
3. **Test на prod-replica или branch DB** прежде чем apply на prod.

**Что НЕ делать:**
- НЕ собирать "drift fix" в одну миграцию с vault или другой feature work.
  Должна быть отдельная commit + отдельный migrate deploy с явным согласием
  founder'а.
- НЕ применять автоматически — каждый FK recreate должен пройти orphan check.

**Текущее состояние (2026-05-22):**
- staging-v2: drift присутствует (как на prod). vault_dda_snapshot migration
  применён БЕЗ drift fix (surgical Option B per founder direction).
- prod: drift присутствует, известен, отложен.

**Приоритет:** post-Vault-UAT, post-Day-14-prod-vault-deploy. Отдельная
session с founder approval по каждому FK orphan-check результату.

**Context added:** 2026-05-22

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

---

## ZAAHI Signature landmark coverage check — Reem / Maryah / Saadiyat towers

**Задача:** убедиться что реальные high-rise landmarks в AD островах входят в 114-plot ZAAHI Signature curated set, либо запланировать добавление.

**Context:** AD heights fix (commit 77f7b6b, shipped 2026-05-13) корректно даёт mid-rise heights (~30m default commercial) для plots на Saadiyat / Reem / Maryah / Yas / Jubail islands, потому что AD ArcGIS не отдаёт `DevCode_FAR`/`MaxGFA` для этих new-development zones. Это означает: реальные landmark towers рендерятся под-tall во встроенных PMTiles. Решение по архитектуре — landmarks покрываются отдельно через ZAAHI Signature 114 curated plots в `loadZaahiPlots`.

**Что проверить:**
- **Al Reem Island:** Sun Tower (74 floors ≈ 263m), Sky Tower (74 floors ≈ 252m), Gate Towers (66 floors), Marina Sunset / Marina Bay (~280-310m в комплексе). Включены ли в 114 ZAAHI plots?
- **Al Maryah Island:** Burj Mohammed Bin Rashid (88 floors / 381m), Sky Tower Al Maryah, The Galleria, Cleveland Clinic Abu Dhabi (~120m).
- **Saadiyat Island:** Louvre Abu Dhabi (~40m), Guggenheim AD (planned), Manarat Al Saadiyat. Most low-mid rise (cultural district), not towers.
- **Yas Island:** Yas Marina Hotel (~50m, signature curved form), Ferrari World, Yas Mall — landmarks but mostly mid-rise.

**Если landmark отсутствует:** добавить как ZAAHI Signature plot через стандартный процесс (см. CLAUDE.md "Правила добавления участков"). Зданий ~10-15, по 1 за раз с подтверждением founder.

**Если landmark уже есть в 114 plots:** verify рендерится корректно с правильной геометрией footprint + height (через ZAAHI_BUILDINGS_3D layer с opacity=1, separate от PMTiles AD layer).

**Приоритет:** post-summit. Не блокер для AD summit demo — сегодня визуально AD area выглядит реалистично.

**Context added:** 2026-05-13

---

## Windows visual verification — scrollbar-gutter (3ec8bec)

Verify in a real Windows browser (Chrome / Edge / Firefox latest):
- No page-wide jitter on dashboard / plot detail / map pages
- F12 Console clean (no new errors from the CSS rule)
- 17 px gutter reserved cosmetically acceptable
- Smooth scroll on long pages (privacy / terms / disclaimer)

If verified: close out. If regression found: `git revert 3ec8bec && git push`
(2-3 min via Vercel CI).

**Context added:** 2026-05-13

---

## Auto-rotate camera — diagnostic pending

Controller code ready (`src/lib/auto-rotate.ts` 166 lines + `src/app/parcels/map/page.tsx` wiring +138/-1), tsc passed, NOT deployed. Earlier deploy attempt showed rotation не запускается visually. Need read-only diagnostic next session — likely pitch<30 на старте или plot detail panel оставил `map.isEasing()` true.

Resume: `git stash pop stash@{0}` restores both files exactly as parked.

**Context added:** 2026-05-13
