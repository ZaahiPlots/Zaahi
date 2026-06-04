# Test Process — Diagnostic (после прод-крэша aefa842)

**Branch:** `research/test-process-diag` (от main)
**Date:** 2026-06-04
**Status:** recon — no code/config changed
**Context:** агент не имел рабочего способа браузер-теста локально, дважды
смержил непроверенное; `aefa842` (Rules of Hooks) уронил прод.

---

## TL;DR (для founder, 60 секунд)

**Три проблемы — три фикса (любой из трёх уже бы поймал прошлый крэш):**

1. **Нет eslint вообще** в проекте. `react-hooks/rules-of-hooks` —
   ровно тот lint-правило что отловило бы `useMemo` после early
   return СТАТИЧЕСКИ. Текущий tsc + build пропускают всё React-
   специфичное. **Фикс: 1 команда установки + 1 файл конфига.**

2. **«Dev OOM» больше не реален**. Memory note был для машины с
   **15 GiB RAM / 4 GiB swap**. Сейчас **31 GiB RAM / 8 GiB swap**.
   Hardware апгрейд между 2026-05-11 и сейчас. Но **Node default
   heap = 4 GB** (не system RAM!) — /parcels/map (8028 строк)
   пробивает default. **Фикс: `NODE_OPTIONS=--max-old-space-size=8192`
   перед `pnpm dev`.**

3. **Vercel preview-деплои не настроены под env vars**. Зато
   инфраструктура работала раньше (sessions/2026-05-07 / 08 / 21).
   Per-branch env vars через `vercel env add NAME preview <branch>`
   — это путь к **настоящему браузерному тесту до мержа в main**.

**Pre-merge чеклист (рекомендованный)**:
1. `pnpm lint` (react-hooks/rules-of-hooks)
2. `npx tsc --noEmit`
3. `pnpm build`
4. Push в feat-ветку → Vercel preview deploy → **браузерный smoke на preview URL**
5. Только после преbrowser-OK — merge в main

---

## 1. Почему `pnpm dev` OOM

### Системные ресурсы (СЕЙЧАС)

```
RAM total:     31 GiB
RAM available: 24 GiB
Swap:           8 GiB (на /swap.img)
CPU:            8 cores (i7-7700 @ 3.6 GHz)
Node:           v20.20.2
```

### Что говорил memory-note

`memory/env_dev_server_map_page.md` от 2026-05-11:
- "On this dev box (**15 GiB RAM, 4 GiB swap**), `pnpm dev` reliably
  crashes during the first on-demand compile of `/parcels/map`"
- Cause: "swap exhaustion (RAM stays ~70% free but swap hit 95%)"

**Memory-note устарел** — это было на железе вдвое слабее.

### Реальный лимит сейчас — Node default heap

```bash
node -e "console.log(require('v8').getHeapStatistics().heap_size_limit / 1024 / 1024)"
# → 4144 MB ≈ 4 GB
```

Node 20 default `--max-old-space-size = 4144 MB` — **не зависит от
system RAM**. /parcels/map это **8028 строк, 351 KB**, с deck.gl +
three.js + maplibre-gl модулями. Первый webpack-compile этого
монстра упирается в 4 GB heap **до** того как system swap начнёт
работать.

### Что именно жрёт

- `src/app/parcels/map/page.tsx` — 8028 строк (10× больше типичной
  страницы)
- 1.5 GB кэша в `.next/`
- Heavy deps в bundle: `@deck.gl/core` + `@deck.gl/mapbox` +
  `@deck.gl/mesh-layers` (9.3) + `maplibre-gl` (5.22) + `three`
  (0.184) — это самые жирные клиентские либы в проекте

### Можно ли поднять Node heap

✅ ДА. Эти оба варианта решают OOM:

```bash
# Вариант 1 — env переменная (рекомендую)
NODE_OPTIONS="--max-old-space-size=8192" pnpm dev

# Вариант 2 — добавить в package.json
"dev": "NODE_OPTIONS='--max-old-space-size=8192' next dev"
```

8 GB heap × 1 параллельный compile << 24 GB free + 8 GB swap. Запас
огромный. Аналогичный (а то и больший) лимит можно ставить для
build — но build УЖЕ работает (`pnpm build` проходит за ~13-20 сек).

### Swap

`/swap.img` 8 GB, чтение `swapon --show` показывает USED=0B сейчас.
Если поднять heap до 8 GB и compile занимает 5 GB — RAM 24 GB free →
swap всё равно не нужен. **Swap текущий нормальный, не блокер.**

---

## 2. Альтернативы dev-серверу

### `pnpm build && pnpm start` — prod режим локально

✅ Уже работает. Verified в этой сессии: `pnpm build → ✓ Compiled
successfully in 13.5s`, 289/289 страниц. Дает рабочий бинарник
которым можно стартовать `pnpm start` (порт 3000).

**Минусы**:
- Нет HMR — каждое изменение требует rebuild
- ~15 сек на полный build, ~3-5 сек на инкрементальный
- ⚠️ **CLAUDE.md AGENT RULE**: «NEVER run `pnpm build` while `pnpm
  dev` is running on the same checkout» — конфликт `.next/`. Если
  выбрать prod-режим — не миксовать с dev.

**Плюсы**:
- Минимизированный bundle = реальные пользовательские условия
- Single-thread compile уже отработан в этой сессии (фикс aefa842
  через build проходил)

### Тест ДРУГИХ страниц без /parcels/map

✅ Возможно — но требует `pnpm dev` с поднятым heap'ом. С default
heap dev мог упасть **только** при первом on-demand компиле тяжёлой
страницы. /dashboard, /admin, /vault значительно легче (~10× меньше
кода чем map). Они скомпилятся в пределах 4 GB heap.

Test:
```bash
NODE_OPTIONS="--max-old-space-size=8192" pnpm dev
# в браузере: http://localhost:3000/dashboard → не трогать /parcels/map
```

### Изолированный тест компонента (Storybook / Vitest)

❌ В проекте сейчас нет:
- Storybook
- Vitest / Jest
- React Testing Library
- никаких unit-тестов

Это самостоятельный proj (введение testing infra = ~день работы).
**Не рекомендую** как первоочередной фикс — pre-merge чеклист
(eslint + preview deploy) даст 80% защиты без введения нового стека.

---

## 3. Runtime-проверки без браузера

### Rules of Hooks — статически ловится eslint'ом

**`eslint-plugin-react-hooks`** содержит правило `react-hooks/rules-of-hooks`:

> Hooks can only be called at the top level of your React function.
> They can't be called from within nested functions, conditions, or
> loops.

**Это правило поймало бы прошлый крэш** напрямую. `useMemo` на :305
после `if (...) return` на :248 / :271 — классический pattern что
правило flag'ает с message типа:

```
React Hook "useMemo" is called conditionally. React Hooks must be
called in the exact same order in every component render.
```

### Что есть в проекте сейчас

❌ **ESLint вообще не установлен.** Проверено:
- `eslint.config.mjs` / `.eslintrc*` — отсутствует
- `node_modules/eslint*` — пусто
- `package.json` deps — ни `eslint`, ни `eslint-plugin-react-hooks`,
  ни `@next/eslint-plugin-next`

Next.js не запускает lint автоматически без `eslint`-конфига —
просто `pnpm build` его не вызывает.

### Что добавить

```bash
pnpm add -D eslint @eslint/js eslint-plugin-react eslint-plugin-react-hooks @next/eslint-plugin-next typescript-eslint
```

И минимальный `eslint.config.mjs`:

```js
import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";
import tseslint from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks, "@next/next": nextPlugin },
    rules: {
      ...reactHooks.configs.recommended.rules, // rules-of-hooks + exhaustive-deps
      ...nextPlugin.configs.recommended.rules,
    },
  },
];
```

Script в package.json:
```json
"lint": "eslint src/"
```

Затем pre-merge: `pnpm lint` — упадёт на rules-of-hooks нарушении
**ДО** build / push.

### Что ещё tsc/build пропускает что lint поймал бы

1. **react-hooks/exhaustive-deps** — упущенные зависимости useEffect /
   useMemo / useCallback. Это могло бы предотвратить тонкие баги
   синхронизации.
2. **@next/next/no-img-element** — если случайно используется `<img>`
   вместо `<Image>`.
3. **@typescript-eslint/no-floating-promises** — `await` забыт.
4. **react/jsx-key** — без `key` в map.
5. **@next/next/no-html-link-for-pages** — `<a href>` вместо `<Link>`.

Эти все runtime/UX-критичны но invisible для tsc.

---

## 4. Vercel Preview как тест-площадка

### Что есть на текущий момент

- `vercel` CLI v54.3.0 установлен (`which vercel` → `/usr/bin/vercel`)
- `vercel.json` отсутствует
- `.env.local` присутствует (founder rule: не читать, не модифицировать)

### Что работало раньше

Из `docs/sessions/2026-05-07-phase-c-step-1-status.md`, `08-phase-c-resume.md`,
`2026-05-21-resume.md`:

- Preview deploy создавался на каждый push в feat-ветку
- URL формата `https://zaahi-<hash>-zaahiplots-projects.vercel.app`
- Был статус «Ready» когда env vars были правильно настроены
- JWT acquisition: incognito browser → preview URL → login → DevTools

### Per-branch env vars

Команда из 2026-05-07 заметок:

```bash
vercel env add VAR_NAME preview feat/branch-name --value "X" --yes
```

С флагом `git_branch_required` Vercel требует имя ветки чтобы знать
куда class env var. Без branch — `vercel env add NAME preview` падает
с ошибкой.

### Почему "preview-деплои сейчас падают"

Скорее всего одно из:
- (a) Не все required env vars скопированы в preview environment
  (особенно после rotation секретов / изменений в Vercel UI)
- (b) `DATABASE_URL` для preview = staging Supabase project, который
  может быть остановлен или отключён
- (c) Build падает на runtime checks которые проходят в production

**Чтобы установить точно** — нужен следующий push в feat-ветку, после
которого founder зайдёт в Vercel dashboard, увидит "Build failed"
deployment'а, прочитает логи и подскажет какой именно env var
отсутствует.

### Идеальный workflow с preview

```
1. agent: создаёт feat-ветку, делает изменения
2. agent: pnpm lint && tsc && build (локальная зелёная триада)
3. agent: git push origin feat-branch
4. Vercel auto-deploy → preview URL
5. founder (или agent): открывает preview URL в браузере
6. browser smoke (рабочая страница! WAI runtime)
7. only after green: merge feat → main
8. Vercel auto-deploy prod
```

Это закрывает **самую большую дыру в текущем процессе** — отсутствие
браузерной проверки до prod.

---

## 5. Безопасный merge-процесс — pre-merge чеклист

### Минимально-необходимый чеклист (после фиксов 1-3)

| # | Шаг | Команда | Что ловит |
|---|---|---|---|
| 1 | Lint (rules of hooks + exhaustive deps) | `pnpm lint` | aefa842-class bugs |
| 2 | Type check | `npx tsc --noEmit` | TS errors |
| 3 | Production build | `pnpm build` | bundle / SSR errors |
| 4 | Browser smoke на preview URL | Push в feat → Vercel preview → клик в браузере | runtime crashes, UX |
| 5 | Targeted grep при касании React | `grep -nE "use(Memo\|Effect\|Callback\|State)" file.tsx` сверить что все ДО `return` | паранойя hook-ordering |
| 6 | Только тогда — merge feat → main | `git merge feat/...` + push | — |

Шаги 1-3 — локальный baseline.
Шаг 4 — единственный честный runtime-тест **до** прода.
Шаг 5 — manual paranoia для критичных файлов.
Шаг 6 — promote только когда 1-5 зелёные.

### Что НЕ делать (lessons learned)

- ❌ Polagal'sya только на `tsc + build`. Они не ловят:
  - Rules of Hooks
  - Missing dependencies in useEffect/useMemo
  - Runtime errors (undefined ref, null access)
  - UX regressions
- ❌ Меньжить feat в main без браузерного теста где-либо.
- ❌ Полагать что "1 строка не сломает". `useMemo` — это hook, hook
  order — runtime invariant, ломается тихо.

---

## 6. ВЫВОД — рекомендованный action plan

### Краткосрочно (1-2 часа работы):

1. **Поставить eslint + react-hooks plugin** — `pnpm add -D ...`,
   создать `eslint.config.mjs`, добавить `"lint": "eslint src/"` в
   package.json. **Это №1 потому что предотвращает повтор aefa842
   class бага. 100% статически. Бесплатно во время.**

2. **Поднять Node heap для dev** — добавить `NODE_OPTIONS` в скрипт
   `dev` в package.json: `"dev": "NODE_OPTIONS='--max-old-space-size=8192' next dev"`.
   /parcels/map скомпилится локально, агент сможет делать ad-hoc
   browser-проверки.

3. **Восстановить preview env vars в Vercel** — это require'ет
   founder'а (он в Vercel dashboard). После: каждый `git push origin
   feat/...` даст preview URL для smoke до мержа.

### Среднесрочно (если хочется глубже):

- Add `@typescript-eslint/no-floating-promises` — ловит забытые `await`
- Add Playwright (или Vitest + RTL) для критичных flow (Vault click,
  PriceEditCell save, admin DDA refresh)
- Pre-push hook (husky или manual): `pnpm lint && tsc && build` обязательны

### Не рекомендую:

- Storybook — слишком много времени для проекта где UI правится
  быстро
- Полное unit-tests покрытие — тот же argument
- Webpack → Turbopack миграция в `next dev` — Next 15 ещё имеет
  edge cases, добавит шума без явного выигрыша

---

## 7. Конкретно для прошлого крэша aefa842

| Проверка | Поймала бы? |
|---|---|
| `npx tsc --noEmit` | ❌ нет (TS не знает про hook ordering) |
| `pnpm build` | ❌ нет (Next.js / webpack компилируют код, runtime React-проверка идёт уже в браузере) |
| `pnpm lint` с react-hooks/rules-of-hooks | ✅ **ДА** — точная ошибка «React Hook "useMemo" is called conditionally» |
| Browser smoke на preview URL | ✅ ДА — первый клик на Vault и страница падает |
| Manual grep `use*` положение vs return | ✅ ДА если бы помнил выполнить |

**Из 5 защит — 0 работало.** Из 5 защит — после реализации §6 будут
работать как минимум 3 (lint + preview + grep), 4 если установить
heap-поднятие dev.

---

## 8. Что НЕ менял

Read-only, никаких правок:
- `package.json` (читал scripts + deps)
- `.env.local` (только `ls -la`, content не читал — founder rule)
- `next.config.ts` (читал)
- `memory/env_dev_server_map_page.md` (читал)
- `docs/sessions/2026-05-*` (grep)

Ветка `research/test-process-diag` от main. Без правок кода/конфигов.
