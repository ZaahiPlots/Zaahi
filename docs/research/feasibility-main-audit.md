# Боевой Feasibility калькулятор на main — аудит + план докрутки

*2026-06-08 · research/feasibility-audit-main · NO code · NOT pushed*

Founder ratified: концепт C редизайна **отменён**. Production калькулятор
на `main` = база. Устраивает на 90%. Докручиваем 10%, не переделываем.

---

## 1. Что реально на main (на сегодня)

### Компонент и версия

| Что | Где | Размер |
|---|---|---|
| **Production calculator** | `src/components/feasibility/FeasibilityV6Calculator.tsx` | 2794 строки |
| **v5 fallback** | `src/app/parcels/map/FeasibilityCalculator.tsx` | 1001 строка |
| **v5 math kernel** | `src/lib/feasibility.ts` | 500 строк |
| **v6 lib** | `src/lib/feasibility-v6/*.ts` | 1742 строки (8 файлов) |
| **Feature flag** | `NEXT_PUBLIC_FEASIBILITY_V6_ENABLED="true"` (`.env.local`) | — |

**Production использует V6** (`SidePanel.tsx:870` — флаг включён).
v5 — fallback, никогда не загружается в live.

### Это ДО B1 — подтверждено

```bash
git log --oneline -3
c552d0b fix(map): mobile arrows fly camera without opening card
7ff9530 chore(3d): tune Atlantis hero — founder dev-panel values
5224915 feat(3d): add Atlantis The Palm hero
```

`feat/feasibility-power-b1` и `feat/feasibility-power-b2` НЕ слиты в
main. Это значит:

- `drawnMonthlyInterest()` функции на main **нет** —
  `results.ts:108-119` существует только в B1
- `peakEquity()` bucket-by-month исправление **отсутствует** — на main
  intra-month ordering даёт ложный пик ~97M вместо реального ~43M
- Loan drawdown на m1 **лампом +50M** — `irr.ts:148-156` на main, B1
  это исправил на линейную помесячную выборку
- IRR **раздут** на reference deal: 53% на main vs 17% после B1 fix
- 4-tier `amber-bold` 30-50% диапазон в `diffBadge.ts` **уже есть**
  (это было в коде до B1, B1 просто проверил)

### Структура SidePanel (порядок секций на main)

```
SidePanel (src/app/parcels/map/SidePanel.tsx)
├── ... (price, status, ownership)
├── line 837: General Notes (NotesBlock — raw text + plain rewrite toggle)
├── line 842: Feasibility Calculator (collapsible) ← FeasibilityV6Calculator
└── line 910: Documents (collapsible) ← Affection Plan + Plot Details PDFs
```

Founder хочет: General Notes → **Documents → Calculator** (Documents
поднять, поставить перед калькулятором).

### Структура V6 Calculator (порядок Panel в sidepanel mode)

V6 в sidepanel mode рендерит панели сверху вниз
(`FeasibilityV6Calculator.tsx:1822-2249`):

```
Sticky verdict block (top) — Net Profit / IRR / ROE / ROI band
├── Engine selector + tab strip (BtS / BtR / JV) ← это не табы layout'а,
│   а business modes (founder ОК с ними)
├── Panel "Area"          (line 1824) — Plot/FAR/GFA/BUA/Efficiency/SFA
├── Panel "Land"          (line 1868) — Land Cost / DLD / Payment Mode / installments
├── Panel "Construction"  (line 1919) — Construction/Brand/Consultancy/Infra/Contingency psf
├── Panel "Finance"       (line 1985) — Enable + Loan/Rate/Period
├── Panel "Escrow"        (line 2033) — BtS only, RERA Law 8/2007
├── Panel "Revenue"       (line 2146) — BtS: Sales psf / Commission / Marketing / Dev Services
├── Panel "Rental"        (line 2172) — BtR: Monthly Rent / Occupancy / Annual Increase / Operating
├── Panel "JV Structure"  (line 2204) — JV: Type / Land Contribution / Cash / Share
└── Panel "Detail"        (line 2251) — full result breakdown
```

8 свёрнутых Panel'ов + sticky verdict сверху + 3-mode tab strip. Это и
есть «90% устраивает» по словам founder — оставляем как есть.

### PDF generation на main

`FeasibilityV6Calculator.tsx:717-1297` — `downloadPDF` callback. 6
страниц A4: Cover · Inputs · Results step-by-step · Glossary ·
Optimization recs · Disclaimer + sources. Известная поломка `y += 8`
после "NET PROFIT" label на cover (line 910-916) — hero 36pt накладывается
на label.

### Affection Plan download flow

`SidePanel.tsx:912-1010` — два кнопки в Documents секции:

- **"Affection Plan (PDF)"** — `/api/parcels/[id]/pdf` proxy, DDA's
  "Plot Details" PDF. Всегда показывается.
- **"Plot Details (PDF)"** — `/api/parcels/[id]/plot-guidelines`,
  Salesforce DDA PDF. Рендерится только если `plan.plotGuidelinesUrl`
  не null (backfill'ed by script).

Бекенд: `downloadFile()` helper прикрепляет Bearer token (нельзя
просто `<a href>` — endpoint защищён `getApprovedUserId`). Flow
работает, founder подтвердил.

---

## 2. Gap-анализ — 7 пунктов докрутки + B1 математика

### Пункт 1 — Скролл сократить (панели оставить)

**Есть на main:** 8 свёрнутых Panel'ов + 1 sticky verdict + 1 tab strip.
По умолчанию все Panel'ы **закрыты** в sidepanel mode (`Panel.tsx:301-302`
"Default closed in sidepanel; default open in fullscreen"). Хедер
каждой Panel показывает primary metric inline, чтобы можно было
проверить без раскрытия.

**Что плохо:** Sticky verdict + Engine selector + tab strip + 8 Panel
headers = ~620px header'ов до того как пользователь начинает скроллить.
Это нормально на desktop sidepanel ~600-800px, но **выглядит длинным
в режиме просмотра**. Главный вклад в скролл — секции **Detail
breakdown** (полное разложение result'а, line 2251-2700, ~450 строк
JSX), которая разворачивается по умолчанию через
`<Panel ... defaultOpen>` mode = sidepanel.

**Что выбросить:** ничего фундаментально. Detail panel закрыть по
умолчанию в sidepanel mode (он уже свёрнут, но в момент первого
открытия сразу появляется в DOM). Plus можно скрыть Engine selector в
"More options" — он не каждый раз нужен.

**Severity:** 🟡 medium. Founder говорит "устраивает на 90%" — значит
скролл не главное.

### Пункт 2 — Documents поднять (после General Notes, ПЕРЕД калькулятором)

**Есть на main:** Documents секция В САМОМ НИЗУ SidePanel
(`SidePanel.tsx:910`), после Feasibility Calculator. Affection Plan
download flow в норме (две кнопки, Bearer auth).

**Founder хочет:**
```
General Notes (line 837)        ← остаётся
Documents (line 910)            ← переместить СЮДА (после Notes)
Feasibility Calculator (line 842) ← переместить ВНИЗ
```

**Сложность:** простая перестановка JSX блоков в SidePanel.tsx. Не
трогаем сами компоненты — только порядок.

**Severity:** 🟢 trivial — 10 минут.

### Пункт 3 — Brokerage commission (после DLD, default 0%, % field)

**Есть на main:** нет такого поля. В Land panel
(`FeasibilityV6Calculator.tsx:1868-1917`) только Land Cost / DLD Fee /
Payment Mode. Brokerage отсутствует в production.

**Есть в B2 (готово, можно cherry-pick):**
- `src/lib/feasibility-v6/results.ts` (B2 commit `36a146d`) —
  `applyLandBrokerageV6()` helper. Принимает `brokerageOnLandPct`,
  возвращает `{ land: с увеличенным totalLandCost, brokerageAed }`.
- `computeBtSV6/BtRV6/JvV6` принимают опцию `brokerageOnLandPct`,
  возвращают поля `brokerageOnLandPct` и `brokerageOnLandAed`.
- UI: Row "Brokerage on land (%)" в Land panel сразу после DLD
  (line ~2020 в B2 версии). Conditional reveal — Row "Brokerage fee
  (AED)" появляется когда % > 0.
- PDF: `+ Brokerage on land (X%)` line в Investment breakdown table.

**Сложность:** Cherry-pick `applyLandBrokerageV6` логики из
`results.ts`, добавить UI Row в Land panel, прокинуть state через
existing useState pattern. Math kernel **v5 untouched**, всё через
v6 wrapper — exactly соответствует founder constraint.

**Severity:** 🟢 small — 30 минут (готовый код в B2).

### Пункт 4 — Mixed-use ручной ввод долей

**Есть на main:** для MIXED USE плотов V6 использует **`mixeduse`
engine** с blended midpoints (`engines.ts:233-251`): construction 580,
sales 1900, rent 12 — усреднённые значения. **Пользователь не может
ввести %% по разрешённым видам**, он получает «среднюю температуру».

**Есть в B2 (готово):**
- `src/lib/feasibility-v6/mixedUse.ts` (B2 commit `36a146d`) — `computeMixedUseBtSV6()`. Slices BUA/SFA по share %, runs каждый engine на своей доле, sums results.
- `landUseMixToShares(mix)` — seed % из `areaSqm` если все заданы, иначе равные доли.
- `shareToEngine(share)` mapper:
  RESIDENTIAL→residential, COMMERCIAL+OFFICES→office,
  COMMERCIAL+RETAIL→retail, HOTEL→hospitality (founder ratified).
- UI: Panel "Mix breakdown" с rows per category. % editable, Σ=100%
  validation, "changed" badge.

**Сложность:** Cherry-pick `mixedUse.ts` lib + UI Panel из B2. **НЕ
тащить** `ParcelInput.landUseMix`/`notes` поля если они нужны (B2
их добавил в adapter). Проверить что v5 `feasibility.ts` core
untouched — да, всё через `deriveArea/deriveConstruction/deriveBtSRevenue`
v5 в композиции.

**Severity:** 🟡 medium — 60-90 мин (готовый код, нужна интеграция в
текущий V6 calculator).

### Пункт 5 — Описания полей простым языком

**Есть на main:** `src/lib/feasibility-v6/tooltips.ts` (111 строк, 36
полей покрыто). Жаргон уровня RICS / Brueggeman. Примеры:

> bua: `Built-Up Area = GFA × ~1.85 in Dubai (covers podiums, basements,
> terraces). Founder-ratified ratio 5 May 2026.`
>
> ratePct: `Annual interest rate %. Q1 2026 UAE benchmark 5.4–6.2% for
> development loans, +risk margin per project.`

**Есть в B2 (готово):** tooltips.ts B2 переписан в plain-language. Пример:

> bua: `Built-Up Area — GFA plus podiums, parking, basements, terraces.
> In Dubai, BUA is usually ~1.85 × GFA. You build (and pay) for BUA,
> you sell SFA.`
>
> ratePct: `Annual interest rate in %. Q2 2026 reference: 3M EIBOR
> ~4.8–5.0% + bank spread 1.5–3% = ~6.3–8.0% all-in.`

**Сложность:** Перезаписать `tooltips.ts` с B2 версией (single file replace).

**Severity:** 🟢 trivial — 5 минут (copy-paste B2 tooltips.ts).

### Пункт 6 — General Notes визуально + свернуть

**Есть на main:** `SidePanel.tsx:1300-1348` — `NotesBlock` component.
Просто `<div>` с `whiteSpace: "pre-wrap"` и raw DDA text. Toggle между
plain rewrite и original. **Стена текста**, никаких таблиц, никаких
checklist'ов.

**Есть в B2 (готово):** `src/components/feasibility/GeneralNotes.tsx`
(новый файл в B2 commit `36a146d`):
- **Таблица Parking provision** — Dubai Municipality regulations
  hardcoded (Residential ≤150m² 1 bay, >150m² 2 bays, Retail 1/70m²,
  Office 1/50m²)
- **Чек-лист Required NOCs** — динамически из landUseMix + district
  keywords: Civil Defence + DEWA + Etisalat всегда; Coastal Zone если
  waterfront; Civil Aviation если airport proximity; DHA/DHCC для
  health, KHDA для education, DET для hotel
- **Callout Design & reference** — `deriveDesignTheme(notes)` regex
  выдёргивает theme строку из DDA notes
- **Toggle** для full raw DDA notes

**Сложность:** Cherry-pick `GeneralNotes.tsx` файл целиком. Заменить
`NotesBlock` в SidePanel.tsx на новый `<GeneralNotes
landUseMix={plan.landUseMix} district={data.district}
community={plan.community} notes={plan.notes} />`. Свернуть по
умолчанию — `<Section title="General Notes" defaultClosed>` (current
NotesBlock уже свёрнут pattern, надо проверить).

**Severity:** 🟡 medium — 30-45 мин (готовый компонент, нужна
интеграция с SidePanel API).

### Пункт 7 — PDF починить (текст наезжает)

**Что сломано на main:** четыре бага (диагностированы в B2 discovery
`docs/research/feasibility-redesign.md` §1 нет, но был отдельный
discovery в B2 chat):

1. **Cover hero overlap** (`FeasibilityV6Calculator.tsx:910-916`):
   `y += 8` после "NET PROFIT" label слишком мало — 36pt hero font
   ascender ~12.7mm накладывается на label.
2. **Unicode Δ ≤ ≥ → мусор** (lines 978, 991, 1166, 1167, 1199): jsPDF
   default Helvetica WinANSI encoding не имеет этих глифов → "Δ%" → `"%`,
   "≤ 15%" → `"d 15%`.
3. **Right margin overflow**: long strings без `{ maxWidth }` — обрезаются
   справа.
4. **Letter-spacing artifact** в Glossary — production-side эффект Bug 2.

**Есть в B2 (готово):** все 4 фикса в B2 commit `36a146d`:
- `y += 16` для hero (Bug 1)
- ASCII rewrites: `Δ%` → `Diff %`, `≤ 15%` → `up to 15%`, `≥ 30%` →
  `30% or more` (Bug 2)
- `doc.splitTextToSize` на long strings (Bug 3)

**Сложность:** Cherry-pick 5-6 точечных правок в downloadPDF callback
из B2 версии. Изменения **только в строках 910-1010** примерно.

**Severity:** 🟢 small — 20 минут.

### B1 математика — DRAWN-MONTHLY interest + loan timing fix

**Что не на main:**
1. `drawnMonthlyInterest(loan, rate, drawMonths, holdMonths)` —
   `results.ts:108-119` в B1. Линейная помесячная выборка кредита
   per Brueggeman Ch.21. На main: simple interest на full principal
   весь период — overstates на ~50%.
2. `computeBtSV6/BtRV6/JvV6` принимают `ratePct` option, заменяют v5
   simple interest на drawn-monthly в `correctedFinance`. v5
   `deriveFinance()` **не трогается** — Strangler-Fig invariant
   соблюдён.
3. `buildBtSCashflows/BtRCashflows` — loan inflow **линейно
   помесячно** `loan/N`, не лампом на m1 (`irr.ts` B1 commit
   `c7f3167`).
4. `peakEquity()` — bucket-by-month перед накоплением (избегает
   intra-month phantom trough).
5. Result fields добавлены: `interestBasis`, `drawnInterestAed`,
   `v5InterestAed`, для прозрачности до/после.

**Эффект на reference deal** (Dubai Hills mid-rise, AED 50M @ 8% × 18mo):

| Метрика | На main (без B1) | После B1 fix |
|---|---:|---:|
| Construction interest | AED 6.00M | AED 3.17M (-47%) |
| Total Investment | AED 100.14M | AED 97.30M |
| Net Profit | AED 7.26M | AED 10.10M (+2.83M) |
| ROI | 7.25% | 10.38% |
| **IRR** | — | **17.43% p.a.** |
| Peak equity | — | AED 43.42M (real m17 trough) |
| ROE | — | 23.25% |

**Если оставить как есть** — все production PDF выдают **раздутую IRR
53%** на тестах (founder это знает, он называл это "IRR на проде
раздут"). Без фикса любая презентация инвестору — на дутых цифрах.

**Сложность:** Cherry-pick изменений из B1 commits `8eca702` и
`c7f3167` в файлы:
- `src/lib/feasibility-v6/results.ts` — добавить `drawnMonthlyInterest`
  + расширить `computeBtSV6/BtRV6/JvV6` options
- `src/lib/feasibility-v6/irr.ts` — поменять loan inflow на линейный
  per-month + bucket-by-month в peakEquity

v5 `feasibility.ts` **0 строк изменений** — это критически.

**Severity:** 🔴 high — math correctness. **С этого начинать.**

---

## 3. Что переиспользуем — карта B1/B2 → main

### Из B1 (commit `8eca702` + `c7f3167`)

| Файл | Что взять | Куда |
|---|---|---|
| `src/lib/feasibility-v6/results.ts` | `drawnMonthlyInterest()` + расширение `computeBtSV6/BtRV6/JvV6` options (`ratePct`, `financePeriodMonths`) + `interestBasis`/`drawnInterestAed`/`v5InterestAed` fields | replace на main |
| `src/lib/feasibility-v6/irr.ts` | loan drawdown per-month + peakEquity bucket-by-month | replace на main |
| `src/components/feasibility/FeasibilityV6Calculator.tsx` | передача `ratePct` через `compute*V6` опции (уже есть на main `loanAed`, нужен `ratePct` next to него) | 3-5 строк патча в `useMemo` блоках для btsResult/btrResult/jv |

**Что НЕ брать из B1:** `src/lib/feasibility-v6/verdict.ts` (IRR-primary
verdicts) — founder может хотеть оставить текущие verdicts на main.
Спросить отдельно.

### Из B2 (commit `36a146d`)

| Файл | Что взять | Куда |
|---|---|---|
| `src/lib/feasibility-v6/mixedUse.ts` | Целиком новый файл | cherry-pick |
| `src/components/feasibility/GeneralNotes.tsx` | Целиком новый файл | cherry-pick |
| `src/lib/feasibility-v6/results.ts` | `applyLandBrokerageV6()` + brokerage опции в `compute*V6` | merge с B1 changes |
| `src/lib/feasibility-v6/tooltips.ts` | plain-language rewrite | replace на main |
| `src/lib/feasibility-v6/parcelInput.ts` | `+landUseMix`, `+notes` поля в `ParcelInput` + adapters | replace, аккуратно с consumers (mockData.ts, SidePanel.tsx) |
| `src/components/feasibility/FeasibilityV6Calculator.tsx` | PDF fixes (lines 910-916, 978-1008, 1240-1303) + Land panel brokerage row + Mix Breakdown panel + landUseMix handling | селективный patch (NOT все B2 изменения — НЕ табы) |
| `src/app/parcels/map/SidePanel.tsx` | NotesBlock → GeneralNotes swap | 1 import + 1 JSX replace |

**Что КАТЕГОРИЧЕСКИ НЕ брать из B2:**
- **Top-level tab layout** (`view: 'inputs'/'results'/'notes'/'documents'`) —
  founder отверг
- Документ Panel внутри калькулятора (B2 положил Documents внутрь
  calculator card) — Documents остаются в SidePanel
- B2's GeneralNotes Panel внутри calculator — Notes остаются в
  SidePanel над/под Calculator (per founder layout)

### Стратегия cherry-pick

Не делать `git cherry-pick` коммитов B1/B2 целиком — там идут вперемешку
table layout правки. Делаем **тематические патчи**: открываем B1/B2
файл, копируем нужный helper/component, применяем на main вручную через
Read + Edit. Гарантируем что v5 core не трогаем.

---

## 4. План докрутки — подход / риск / усилие

### Рекомендуемый порядок (от больного к косметическому)

#### P0 — Math correctness (founder назвал "IRR раздут")
**Задача:** перенести B1 math (DRAWN-MONTHLY + loan timing + peakEquity bucket)
**Подход:**
1. Cherry-pick `drawnMonthlyInterest()` function в `results.ts`
2. Расширить `computeBtSV6/BtRV6/JvV6` опции `ratePct`,
   `financePeriodMonths`, добавить `correctedFinance` логику
3. `irr.ts` — loan inflow `loan/N` per-month + `peakEquity()` группировка по месяцам
4. Calculator: добавить `ratePct: dRate` в опции `compute*V6` вызовов
5. Smoke test: scripts/feasibility-smoke.ts из B1 (если он там был — есть в branch)

**Риск:** 🟢 low. v5 untouched, изменения только в v6 wrapper. Все
исторические PDF до B1 деплоя получат другой ROI/IRR — founder это
знает и ratified ("исторические PDF консистентны" фраза была в B1
constraint, имеется в виду v5 SidePanel calculator который production
не использует).

**Усилие:** 1-1.5 часа (включая smoke test).

#### P1 — PDF layout fix
**Задача:** 4 фикса в downloadPDF.
**Подход:** Edit на 5-6 локациях в `FeasibilityV6Calculator.tsx` lines
910-1303 — точечные правки из B2.
**Риск:** 🟢 low. Изменения только в PDF callback, runtime не
затрагивается.
**Усилие:** 20 минут.

#### P2 — Documents поднять (перед калькулятором)
**Задача:** перестановка JSX в SidePanel.tsx.
**Подход:** в `SidePanel.tsx` переместить JSX блок Documents
(line 910-1010) выше блока Feasibility Calculator (line 842-907) — либо
вырезать-вставить, либо переопределить порядок в общем wrapper.
**Риск:** 🟢 low. SidePanel — большой файл (per CLAUDE.md memory
"plan + diff before editing src/app/page.tsx OR src/app/parcels/map/page.tsx"
— ВНИМАНИЕ: SidePanel.tsx это отдельный файл от page.tsx, memory не
требует plan для SidePanel.tsx, но всё равно осторожно).
**Усилие:** 15 минут + проверка визуально.

#### P3 — Tooltips plain-language rewrite
**Задача:** replace `tooltips.ts` с B2 версией.
**Подход:** один файл replace.
**Риск:** 🟢 trivial. Tooltips — pure data.
**Усилие:** 5 минут.

#### P4 — Brokerage commission row
**Задача:** добавить % field в Land panel + math wrapper.
**Подход:**
1. `results.ts`: `applyLandBrokerageV6()` helper + опции в `compute*V6`
2. Calculator: Row "Brokerage on land (%)" в Land panel сразу после
   DLD; conditional reveal сoseчного фий "Brokerage fee" когда > 0;
   передать `brokerageOnLandPct` через `useDebounced`
3. PDF: добавить `+ Brokerage on land (X%)` line в Investment table
**Риск:** 🟢 low. Готовый код, v5 untouched.
**Усилие:** 30 минут.

#### P5 — Mixed-use ручной ввод
**Задача:** ввести Panel "Mix breakdown" для MIXED USE плотов.
**Подход:**
1. Cherry-pick `src/lib/feasibility-v6/mixedUse.ts` целиком
2. Calculator:
   - import `computeMixedUseBtSV6 / landUseMixToShares / shareToEngine`
   - state `mixShares` инициализируется из `parcel.landUseMix` (нужно
     прокинуть из SidePanel.tsx через `adaptSidePanelToInput`)
   - условный render Panel "Mix breakdown" между Area и Land когда
     `landUseMix.length > 1`
   - composite result отображается отдельно как «total construction»
     и «total net revenue» — НЕ заменяет основной BtS engine result,
     это вторая сводка
3. Тонкость: текущий V6 уже имеет engine `mixeduse` с blended midpoints
   — он должен оставаться как fallback when user не редактирует shares
**Риск:** 🟡 medium. Сложнее integration чем brokerage — нужно прокинуть
`landUseMix` поле от SidePanel API через adapter.
**Усилие:** 60-90 минут.

#### P6 — General Notes визуально
**Задача:** swap `NotesBlock` на `<GeneralNotes/>` в SidePanel.
**Подход:**
1. Cherry-pick `src/components/feasibility/GeneralNotes.tsx`
2. `SidePanel.tsx:837-840` — заменить `<NotesBlock rewritten={plan.notes}
   original={plan.notesOriginal} />` на:
   ```tsx
   <Section title="General Notes" collapsed>
     <GeneralNotes
       landUseMix={plan.landUseMix ?? []}
       district={data.district}
       community={plan.community}
       notes={plan.notes}
     />
   </Section>
   ```
3. Не забыть toggle "show original DDA wording" — он есть в GeneralNotes
**Риск:** 🟡 medium. Визуальный — нужно тестировать что DDA-notes
regex'ы работают на реальных плотах разных типов.
**Усилие:** 30-45 минут + smoke test на нескольких плотах.

#### P7 — Скролл сократить
**Задача:** убрать ~150-200px header'а в sidepanel mode.
**Подход:**
1. Engine selector — переместить в "More options" disclosure (или
   compact one-liner если уже там) — code говорит `compact one-liner in
   sidepanel mode (founder ...)`, надо посмотреть точно
2. Detail panel default closed — проверить что у него `defaultOpen`
   uses `mode === 'sidepanel'` правильно (на main эта логика есть)
3. Sticky verdict — оставить, founder ОК
**Риск:** 🟡 medium. Может потребовать tweak `Panel` `defaultOpen` logic.
**Усилие:** 30-45 минут.

### Сводная таблица

| # | Пункт | Severity | Усилие | Риск | Источник |
|---:|---|:---:|:---:|:---:|---|
| P0 | B1 math (DRAWN-MONTHLY + loan + peakEquity) | 🔴 high | 1-1.5h | 🟢 | B1 commits |
| P1 | PDF layout fix | 🟢 small | 20m | 🟢 | B2 commit |
| P2 | Documents поднять | 🟢 trivial | 15m | 🟢 | SidePanel reorder |
| P3 | Tooltips plain-language | 🟢 trivial | 5m | 🟢 | B2 tooltips.ts |
| P4 | Brokerage row | 🟢 small | 30m | 🟢 | B2 brokerage helper |
| P5 | Mixed-use ручной ввод | 🟡 medium | 60-90m | 🟡 | B2 mixedUse.ts |
| P6 | General Notes визуально | 🟡 medium | 30-45m | 🟡 | B2 GeneralNotes.tsx |
| P7 | Скролл сократить | 🟡 medium | 30-45m | 🟡 | inline tweak |

**Total:** ~4-5 часов работы кода + smoke test. Можно сделать одним
sprint'ом.

---

## 5. Рекомендация порядка

С чего начинать:

1. **P0 (math) первым** — самый больной, без него любая презентация
   на раздутых IRR. Также независим от UI — изолированные изменения в
   2 lib файлах + 5 строк в calculator вызовах. Smoke test
   подтверждает.

2. **P1 (PDF fix)** сразу после P0 — потому что после math fix PDF
   получит новые числа и founder захочет регенерировать. Лучше выйти
   на корректный layout сразу.

3. **P2 (Documents reorder) + P3 (tooltips)** — trivial cleanup,
   делается за 20 минут, ставит founder на чистую базу UX.

4. **P4 (brokerage)** — небольшая фича, готовый код. Сразу даёт founder
   видимое улучшение в Land panel.

5. **P5 + P6 (mixed-use + General Notes)** — большие feature add'ы.
   Лучше делать после стабильной базы (P0-P4). Можно отдельным
   commit'ом каждый.

6. **P7 (scroll сократить)** — последним. Это polish, после того как
   функциональная докрутка завершена. Founder увидит на чём именно
   решать (что свернуть, что в "More").

### Один большой commit или серия?

Рекомендую **серию из 3-4 commit'ов**:
- `feat(feasibility): port B1 math (DRAWN-MONTHLY + loan timing fix)`
- `fix(feasibility): PDF layout (hero overlap + ASCII chars + maxWidth)`
- `feat(feasibility): brokerage row + plain-language tooltips + Documents reorder`
- `feat(feasibility): mixed-use share input + visual General Notes`

Каждый commit изолирован, легко ревьюится, легко откатывается если
что-то идёт не так в production.

---

## 6. Что НЕ берём из B1/B2 (явный список выкидываемого)

Чтобы не было соблазна тащить лишнее:

- ❌ **B2 top-tab layout** (`view: 'inputs'/'results'/'notes'/'documents'`)
  в FeasibilityV6Calculator. Founder отверг табы как primary structure.
- ❌ **B1 IRR-primary verdict bands** (`verdict.ts`). Spec на main
  имеет ROI-based verdicts (`feasibility.ts:428-438`). Менять без
  founder OK = inertia.
- ❌ **B2 sensitivity removal** — sensitivity на main и не было, это N/A.
- ❌ **B2's adapter changes** to `ParcelInput` — только если они нужны
  для passed-through fields (landUseMix, notes). Если SidePanel
  адаптер просто прокидывает их inline, можно обойтись минимальным
  patch'ем.
- ❌ Tooltip 4-section structure (spec 03_UX §4 4-section) — переписать
  только text, не структуру UI элемента.
- ❌ `verdict.ts` (IRR-primary verdict из B1) — founder спрашивать
  отдельно если хочет.

---

## 7. Sign-off checklist для founder

Перед написанием кода — подтвердить:

- [ ] **P0 priority** — ОК что math fix первым? (~1.5h)
- [ ] **Verdict bands** — оставить ROI-based как сейчас на main, или
      переключить на IRR-primary из B1?
- [ ] **Mixed-use UI** — Panel "Mix breakdown" между Area и Land
      (как в B2), или другая позиция?
- [ ] **General Notes** — оставить parking + NOC + design callout
      hardcoded (как B2), или вынести в data? (B2 решил hardcoded —
      Dubai Municipality regulations не меняются)
- [ ] **PDF format** — оставить 6 страниц как на main, только фиксы
      layout? (B2 не менял структуру)
- [ ] **Scroll reduction** — Engine selector в "More options" — ОК?

После apprоval — пишу код в feat-ветке от main, серия 3-4 commit'ов,
без push, без merge до твоего ревью.

---

*Research only. Branch `research/feasibility-audit-main` от `main`. 0
code changes. Готов к Phase 2 после твоего apprоval.*
