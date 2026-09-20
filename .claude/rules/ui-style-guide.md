---
paths:
  - "src/**/*.tsx"
---

# UI STYLE GUIDE — ОБЯЗАТЕЛЬНО ДЛЯ ВСЕХ КОМПОНЕНТОВ

Единый визуальный язык платформы ZAAHI. Landing page (`src/app/page.tsx`) —
эталон. Любой новый компонент должен выглядеть как часть landing page.

**Эстетика:** Apple-like glassmorphism поверх тёмной навигационной подложки. Высокий contrast для чисел и действий, минимум chrome, плавные переходы.

### Обязательные элементы

**Карточки / панели:**
- `background: rgba(10, 22, 40, 0.85)` (полупрозрачный navy) — **поднято с 0.4
  решением founder'а D-20, 2026-09-04.** Замер контраста текста над картой:
  при 0.4 золотая цифра (`#C8A96E`) над светлой подложкой давала **1.45** —
  цифра NET PROFIT была нечитаемой (баг PART 4, п.3). При 0.85 — **5.36**
  (золото) и **10.67** (текст `#f5f1e8`). Blur проблему не решает: размытие
  светлой карты оставляет её светлой.
  Источник истины в коде: `PANEL_BG` в `src/lib/design-tokens.ts`
- `backdrop-filter: blur(16px)` (glassmorphism — `backdrop-blur-xl` в Tailwind)
- `border: 1px solid rgba(255, 255, 255, 0.1)` (едва видимая окантовка)
- `border-radius: 12px`
- Мягкая тень: `box-shadow: 0 6px 20px rgba(0,0,0,0.2)`
- На светлых контекстах (dashboard в режиме light) — заменяй navy на `rgba(255,255,255,0.6)` с тем же blur

**Кнопки:**
- Background: `rgba(10, 22, 40, 0.92)` над картой (`CHROME_BTN_BG`) — **поднято
  с `rgba(0,0,0,0.35)` решением founder'а D-20, 2026-09-04.** Требование:
  фон не должен зависеть от подложки, контраст ≥ 4.5 над обеими.
  Замер: при 0.35 текст над светлой картой давал **2.20**, над тёмной — 13.89
  (разброс 11.69). При 0.92 — **13.25 / 15.85** (разброс 2.60), золото
  **6.65 / 7.96**. На тёмном фоне панелей — `rgba(255,255,255,0.06)`
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
