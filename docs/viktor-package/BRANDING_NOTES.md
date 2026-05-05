# Branding Notes — Investor Package PDF Generation

**Captured:** 2026-05-05 during Phase C of the Viktor package build.
**Audience:** Founder (Zhan / Dymo) + future agent sessions tasked
with regenerating or extending the package.

---

## 1. Toolchain decision

**Choice: weasyprint 68.1 + python-markdown 3.10.2 in a venv.**

| Option considered | Status | Why ruled in / out |
|---|---|---|
| **weasyprint** (Python, HTML+CSS → PDF) | **CHOSEN** | Already installable via pip, no apt sudo, no system-font management beyond Georgia which is widely available. CSS Paged Media 3 supports `@page`, `@top-right`, `@bottom-center`, named pages (`@page cover`), CSS counters for page numbers — covers every spec requirement directly. Renders in ~6 seconds for the 14-doc set. PDF v1.7 output, 19–188 KB per doc. |
| pandoc + xelatex | Ruled out | `pandoc` and `xelatex` are not installed on this dev box; `apt install texlive-xetex` requires sudo + multi-GB download; LaTeX template authoring is a separate skill the agent doesn't have on hand. Higher quality typography, but 4-hour install/learn-curve overhead vs the actual deadline (Tuesday investor meeting today). |
| wkhtmltopdf | Ruled out | Not installed; project unmaintained; less reliable than weasyprint for modern CSS @page rules. |
| Chromium headless | Ruled out | No chromium / google-chrome installed (verified 5 May 2026). The earlier package commit `9cbb52f docs(investor-package): PDF conversion for print via Chromium headless` referenced Chromium but the binary is not on this dev box; bringing it back would require snap or apt install with sudo. |
| Firefox headless | Ruled out | Available at `/snap/bin/firefox` but its PDF export is less faithful to CSS print specs than weasyprint, and snap's sandbox makes scripting it awkward. |

**One-time setup** (already done, env at `/tmp/zaahi-pdf-venv` —
recreate if removed):

```bash
python3 -m venv /tmp/zaahi-pdf-venv
/tmp/zaahi-pdf-venv/bin/pip install weasyprint markdown pygments
```

**Run** the renderer:

```bash
/tmp/zaahi-pdf-venv/bin/python docs/viktor-package/build_pdfs.py
```

Edits to `build_pdfs.py` are version-controlled; all 29 PDFs
regenerate in ~6 seconds.

---

## 2. Spec → CSS mapping (reference)

| Spec requirement | CSS / HTML mechanism |
|---|---|
| A4, 0.75 in margins | `@page { size: A4; margin: 0.95in 0.75in 0.95in 0.75in; }` (top/bottom slightly larger to accommodate header / footer margin boxes) |
| Body Georgia 11 pt justified | `body { font-family: Georgia, serif; font-size: 11pt; line-height: 1.55; text-align: justify; }` |
| Section headers Georgia bold + thin gold rule beneath | `h1, h2 { border-bottom: 0.5pt solid #C8A96E; padding-bottom: 0.05in; ... }` |
| Page numbers bottom-center "Page X of Y · ZAAHI · Confidential" | `@page { @bottom-center { content: "Page " counter(page) " of " counter(pages) " · ZAAHI · Confidential"; color: #C8A96E; } }` |
| Footer: "ZAAHI · 5 May 2026 · For discussion only — not a binding offer" | Placed in `@top-right` margin box (small, 0.4 opacity black). The bottom is reserved for the page counter, so the disclaimer goes top to keep it visible without colliding. |
| Cover: wordmark "ZAAHI" Georgia gold #C8A96E centered + title (Georgia bold black) + "Confidential — [DOC NAME]" subtitle + date + version | `<div class="cover-page">` injected at top of body; uses CSS `page: cover;` to switch to a named `@page cover` with `margin: 0` and suppressed margin boxes for a clean cover layout. Page-break-after enforces the cover lives on page 1 alone. |

ZAAHI palette used (mirrors `CLAUDE.md` UI Style Guide §Палитра):

- **GOLD** `#C8A96E` — wordmark, page counter, header rules, table-header background tint
- **NAVY** `#1A1A2E` — body text, headings, strong
- **TEAL** `#1B4965` — link color
- **SUBTLE** `#6B7280` — table borders, cover tagline / subtitle

---

## 3. Rendering quirks discovered (and how to avoid)

### 3.1 — `@page cover` margin boxes must be explicitly cleared

Without `@top-right { content: none; }` and `@bottom-center
{ content: none; }` inside the `@page cover` rule, the cover page
inherits the disclaimer / page-number margin boxes from the default
`@page` rule. That puts "Page 1 of N · ZAAHI · Confidential" directly
on top of the cover wordmark, which looks broken. Always clear
margin boxes when defining a new named page.

### 3.2 — Cover page height with `padding-top: 22vh`

The cover element uses `height: 100vh; padding-top: 22vh; box-sizing:
border-box` to centre the wordmark vertically without absolute
positioning. `vh` is honoured by weasyprint inside paged contexts
(referring to the page's content area). `flexbox` works too but is
overkill for a static layout; `padding-top` is more predictable.

### 3.3 — Markdown tables → CSS

Python-markdown's `tables` extension produces `<table><thead><tr>
<th>...</th></tr></thead><tbody>...</tbody></table>`. CSS `border-
collapse: collapse` + `border: 0.3pt solid #6B7280` on `th, td`
gives clean grids. Tables wider than the printable area DO NOT auto-
shrink in weasyprint — they overflow the right margin silently. None
of the 14 docs hit this in practice, but watch for new docs with
6+ wide columns of long text. Workaround: shrink `font-size: 9pt`
in body table CSS, or rotate to two-column layout in the markdown.

### 3.4 — `page-break-inside: avoid` on tables and `pre`

Without these, weasyprint will break a 4-row table across pages
mid-cell. The CSS is set on `table` and `pre` — works for our
document set. Long P&L tables (e.g. P_AND_L §3.1 Revenue, 18 rows)
do not fit on one page, but page-break-inside: avoid is best-effort
in CSS, so weasyprint splits them at row boundaries. Acceptable.

### 3.5 — YAML front-matter must be stripped before `markdown.markdown()`

Two of our docs (`COVER_LETTER_VIKTOR.md`, `DISCLOSURE_LOG_ENTRY_1.md`)
have YAML front-matter blocks. Python-markdown's `meta` extension
parses front-matter into `md.Meta` but does NOT strip it from the
HTML output — front-matter renders verbatim as a paragraph. The
helper `strip_yaml_frontmatter()` in `build_pdfs.py` handles this
cleanly: detects leading `---\n`, finds the next `\n---\n`, returns
the content after.

### 3.6 — `text-align: justify` + Georgia + body 11pt = predictable line lengths

No widow / orphan issues observed across the 14 docs. The `orphans:
2; widows: 2;` rule on `p` is included as a safety net.

### 3.7 — Smart quotes / em-dashes via the `smarty` extension

We pass `smarty` to `markdown.markdown(extensions=...)` to convert
`"..."` to typographic quotes and `--` / `---` to en/em-dashes.
Enable cautiously: it can over-correct in code blocks, but the
extension excludes `<code>` and `<pre>` automatically.

### 3.8 — UAE diacritic handling

Names like "Rodolphe Belin" and "Viktor Jordán" render correctly
with default Georgia. No font fallback issues seen. The Cyrillic /
Arabic locales used elsewhere in the codebase are not in this
package, so no extended font handling is required.

---

## 4. Reusable patterns (capture for next session)

### 4.1 — Structure-note banner pattern (F2 dependency)

When a structural pivot is ratified but final terms are pending
(e.g. the SAFE → loan transition between 5 May founder ratification
and the 6 May Rudi meeting), insert a **reversible** banner instead
of rewriting the seven affected documents. Pattern:

```markdown
---

> **STRUCTURE NOTE (DATE).** [Description of what is changing.]
> Final terms ratify [WHEN]. Numbers and mechanics in this document
> remain directionally accurate; [LABEL / MECHANICS] will be updated
> in the next revision.

---
```

Insert immediately after the document's top-of-document metadata
block (between the closing `---` of metadata and the opening of
§1 / Framing / first heading). Always wrap with horizontal rules
so the banner is visually contained and easy to find / remove.

To strip the banner in a follow-up commit, `grep -B2 -A2 "STRUCTURE
NOTE"` to locate, delete the banner + the surrounding rules.
Reverting commit 5 (`52da156`) is cleaner if the structure note
needs to come off all docs at once.

### 4.2 — Cover-letter framework (flag-areas-where-reviewer-helps)

Six-point flag pattern proved to work for the Viktor letter — keep
the structure for future reviewers / advisors. For each flag:

1. **What is the open question** (one sentence)
2. **Where it lives in the package** (specific doc / section pointer)
3. **Why their experience specifically matters** (calibrated to the
   reviewer's background — for Viktor it was senior CFO / fundraising
   network; for an SI lawyer it would be different)
4. **What kind of answer would resolve it** (concrete, e.g.
   "Reading (i) or Reading (ii)?", "first 3 names from your network")

Then close with an open-ended invitation: "where else does your
experience tell you this misses something an LP will ask for". This
prevents the cover letter from pre-empting the reviewer's most
valuable instinct.

Tone calibration: peer-to-peer, never subordinate. The cover letter
is asking for a review pass, not endorsement; signal that
explicitly ("If you believe the package belongs in front of LPs
as-is, we go. If you believe it needs three more weeks of work, we
listen and rebuild.").

### 4.3 — Two-tier output discipline

`internal/` (founder-only) vs `external/` (signed-NDA reviewer)
naming convention:

- **internal/** — full set, sequence numbers `01_..._15_`. Includes
  founder-protection addenda (DYMO_PROTECTIONS, ZHAN_PROTECTIONS)
  and operations / parked-research artifacts (PARKED_PROJECTS).
- **external/** — curated subset, sequence numbers `01_..._12_`,
  with `00_COVER_LETTER` as the prefixed first doc. Excludes the
  three founder-only files. Identical content to internal/01–12;
  just different filenames + cover letter prefix.

In `build_pdfs.py` this is implemented as a single render per source
file, copied via `shutil.copyfile` to both directories. **Do not
re-render** for the second tier — it doubles compute time and
risks accidental content drift between the two.

Disclosure log lives **outside** both folders at the package root:
`docs/viktor-package/DISCLOSURE_LOG_ENTRY_1.pdf`. It documents
what was disclosed to whom, signed separately by all parties.

### 4.4 — Naming conventions

- Use `NN_FILENAME.pdf` two-digit prefix for ordering (`01_`, `02_`,
  ..., `12_`, `13_`, `14_`, `15_`).
- Cover letter prefix `00_` reserves it as the first file Viktor
  opens regardless of alphabetical sort order.
- Filenames mirror the source markdown filename (without `.md`),
  uppercase preserved.

---

## 5. What did NOT need solving (note for future)

- **Font embedding.** Georgia is a Microsoft core font; weasyprint's
  default font discovery on Ubuntu 24.04 picks it up via fontconfig
  if installed. Not embedded explicitly. If a future render box
  doesn't have Georgia, add `@font-face { src: url(...); }` for a
  TTF fallback. Liberation Serif is the closest open-source
  fallback if Georgia is unavailable.
- **PDF/A archive compliance.** Not requested; weasyprint's default
  PDF v1.7 output is fine for investor-package electronic delivery.
  PDF/A-1b would require additional configuration if archive-grade
  compliance becomes a requirement (e.g. for ADGM submission).
- **Hyperlinks.** Markdown links auto-render as clickable PDF links
  in weasyprint. Tested with `[zaahi.io](https://www.zaahi.io)` —
  clicks through.

---

## 6. Quick-reference command palette

```bash
# Regenerate all 29 PDFs (idempotent, ~6 seconds)
/tmp/zaahi-pdf-venv/bin/python docs/viktor-package/build_pdfs.py

# Verify a single PDF integrity
pdfinfo docs/viktor-package/external/04_TERM_SHEET.pdf

# Spot-check a specific page text
pdftotext -layout -f 1 -l 1 docs/viktor-package/external/00_COVER_LETTER.pdf -

# Render a specific page to image for visual review (300 DPI)
pdftoppm -r 300 -f 1 -l 1 docs/viktor-package/external/04_TERM_SHEET.pdf /tmp/term_sheet_p1 -png
xdg-open /tmp/term_sheet_p1-1.png  # if a graphical session is available

# Recreate venv from scratch if /tmp is wiped
python3 -m venv /tmp/zaahi-pdf-venv \
  && /tmp/zaahi-pdf-venv/bin/pip install weasyprint markdown pygments
```

---

*End of branding notes. Update this file when the toolchain
changes, when spec evolves (e.g. new colour, additional cover-page
elements), or when a new rendering quirk is discovered.*
