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
