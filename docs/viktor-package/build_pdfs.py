#!/usr/bin/env python3
"""ZAAHI investor-package branded-PDF generator.

Renders the 14 source markdown documents + cover letter + disclosure
log into branded PDFs using weasyprint.

Output:
  docs/viktor-package/internal/  — 15 PDFs (founder-only set)
  docs/viktor-package/external/  — 13 PDFs (00_COVER_LETTER + 12 docs)
  docs/viktor-package/DISCLOSURE_LOG_ENTRY_1.pdf

Toolchain: weasyprint 68.x + python-markdown 3.x. CSS-driven branding.
Run from a venv that has weasyprint and markdown installed.
"""

import re
import shutil
from pathlib import Path

import markdown
from weasyprint import CSS, HTML

ROOT = Path('/home/zaahi/zaahi')
PKG = ROOT / 'docs/investor-package'
PARKED = ROOT / 'docs/research/PARKED_PROJECTS.md'
COMPETITOR = ROOT / 'docs/research/COMPETITOR_DEEP_DIVE_2026.md'
VIKTOR = ROOT / 'docs/viktor-package'
OUT_INTERNAL = VIKTOR / 'internal'
OUT_EXTERNAL = VIKTOR / 'external'

DATE_AS_OF = '5 May 2026'

# Document set:
# (markdown_source, internal_index, external_index_or_None, display_title, doc_label)
DOCS = [
    (PKG / 'README.md',                              1,  1, 'Investor Package Index',                       'Investor Package Index'),
    (PKG / 'EXECUTIVE_SUMMARY.md',                   2,  2, 'Executive Summary',                            'Executive Summary'),
    (PKG / 'PITCH_DECK_v1.md',                       3,  3, 'Pitch Deck — 18 Slides',                       'Pitch Deck'),
    (PKG / 'TERM_SHEET.md',                          4,  4, 'Term Sheet',                                   'Term Sheet'),
    (PKG / 'MOU_RUDI.md',                            5,  5, 'Memorandum of Understanding — Rudi',           'MOU — Rudi'),
    (PKG / 'FINANCIAL_MODEL_V1.md',                  6,  6, 'Financial Model V1',                           'Financial Model'),
    (PKG / 'LAUNCH_PLAN.md',                         7,  7, 'Launch Plan — Months 1–12',                    'Launch Plan'),
    (PKG / 'PROFIT_DISTRIBUTION_MECHANICS.md',       8,  8, 'Profit Distribution Mechanics',                'Profit Distribution Mechanics'),
    (PKG / 'P_AND_L_STATEMENT.md',                   9,  9, 'Profit & Loss Statement',                      'Profit & Loss Statement'),
    (PKG / 'Q_AND_A_PREP.md',                       10, 10, 'Q&A Preparation',                              'Q&A Preparation'),
    (PKG / 'research' / 'P_AND_L_RESEARCH.md',      11, 11, 'P&L Deep Research — Benchmarks + Sources',     'P&L Deep Research'),
    (COMPETITOR,                                    12, 12, 'Competitor Deep Dive — UAE PropTech 2026',     'Competitor Deep Dive'),
    (PKG / 'ZHAN_PROTECTIONS.md',                   13, None, 'Zhan Protections — Founder Addendum',        'Zhan Protections (founder-only)'),
    (PKG / 'DYMO_PROTECTIONS.md',                   14, None, 'Dymo Protections — Co-founder Addendum',     'Dymo Protections (founder-only)'),
    (PARKED,                                         15, None, 'Parked Projects',                             'Parked Projects (founder-only)'),
]

CSS_BRANDING = r"""
@page {
    size: A4;
    margin: 0.95in 0.75in 0.95in 0.75in;
    @top-right {
        font-family: Georgia, serif;
        font-size: 7pt;
        color: rgba(0, 0, 0, 0.4);
        content: "ZAAHI · 5 May 2026 · For discussion only — not a binding offer";
    }
    @bottom-center {
        font-family: Georgia, serif;
        font-size: 8pt;
        color: #C8A96E;
        content: "Page " counter(page) " of " counter(pages) " · ZAAHI · Confidential";
    }
}
@page cover {
    margin: 0;
    @top-right { content: none; }
    @bottom-center { content: none; }
    @bottom-right {
        font-family: Georgia, serif;
        font-size: 7pt;
        color: rgba(0, 0, 0, 0.35);
        content: "ZAAHI · zaahi.io";
        margin: 0.4in;
    }
}
.cover-page {
    page: cover;
    page-break-after: always;
    height: 100vh;
    width: 100%;
    background: #FAFAF9;
    text-align: center;
    padding-top: 22vh;
    box-sizing: border-box;
}
.cover-wordmark {
    font-family: Georgia, serif;
    font-size: 64pt;
    color: #C8A96E;
    letter-spacing: 0.32em;
    font-weight: normal;
    margin-bottom: 0.45in;
}
.cover-rule {
    border: 0;
    border-top: 0.6pt solid #C8A96E;
    width: 28%;
    margin: 0.35in auto;
}
.cover-tagline {
    font-family: Georgia, serif;
    font-size: 11pt;
    color: #6B7280;
    font-style: italic;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    margin-bottom: 0.55in;
}
.cover-title {
    font-family: Georgia, serif;
    font-size: 28pt;
    color: #1A1A2E;
    font-weight: bold;
    line-height: 1.2;
    padding: 0 1in;
    margin-bottom: 0.35in;
}
.cover-subtitle {
    font-family: Georgia, serif;
    font-size: 11pt;
    color: #6B7280;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    margin-bottom: 0.25in;
}
.cover-date {
    font-family: Georgia, serif;
    font-size: 12pt;
    color: #1A1A2E;
    margin-top: 0.55in;
}
body {
    font-family: Georgia, serif;
    font-size: 11pt;
    line-height: 1.55;
    text-align: justify;
    color: #1A1A2E;
}
h1 {
    font-family: Georgia, serif;
    font-size: 22pt;
    font-weight: bold;
    color: #1A1A2E;
    border-bottom: 0.5pt solid #C8A96E;
    padding-bottom: 0.08in;
    margin-top: 0.45in;
    margin-bottom: 0.2in;
    page-break-after: avoid;
}
h2 {
    font-family: Georgia, serif;
    font-size: 16pt;
    font-weight: bold;
    color: #1A1A2E;
    border-bottom: 0.5pt solid #C8A96E;
    padding-bottom: 0.05in;
    margin-top: 0.35in;
    margin-bottom: 0.15in;
    page-break-after: avoid;
}
h3 {
    font-family: Georgia, serif;
    font-size: 13pt;
    font-weight: bold;
    color: #1A1A2E;
    margin-top: 0.25in;
    margin-bottom: 0.08in;
    page-break-after: avoid;
}
h4, h5, h6 {
    font-family: Georgia, serif;
    font-size: 11.5pt;
    font-weight: bold;
    color: #1A1A2E;
    margin-top: 0.2in;
    margin-bottom: 0.05in;
    page-break-after: avoid;
}
p {
    margin-top: 0;
    margin-bottom: 0.12in;
    orphans: 2;
    widows: 2;
}
ul, ol {
    margin-top: 0.05in;
    margin-bottom: 0.15in;
    padding-left: 0.3in;
}
li { margin-bottom: 0.04in; }
table {
    border-collapse: collapse;
    width: 100%;
    margin: 0.15in 0;
    font-size: 9.5pt;
    page-break-inside: avoid;
}
th, td {
    border: 0.3pt solid #6B7280;
    padding: 4pt 6pt;
    text-align: left;
    vertical-align: top;
}
th {
    background-color: rgba(200, 169, 110, 0.14);
    color: #1A1A2E;
    font-weight: bold;
}
blockquote {
    border-left: 2pt solid #C8A96E;
    margin: 0.15in 0;
    background: rgba(200, 169, 110, 0.07);
    padding: 0.1in 0.2in;
    font-style: normal;
}
code {
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    background-color: rgba(200, 169, 110, 0.10);
    padding: 1pt 3pt;
    border-radius: 2pt;
    color: #1A1A2E;
}
pre {
    font-family: 'Courier New', monospace;
    font-size: 9pt;
    background-color: rgba(200, 169, 110, 0.06);
    border-left: 2pt solid #C8A96E;
    padding: 0.1in 0.15in;
    margin: 0.15in 0;
    page-break-inside: avoid;
    overflow-wrap: break-word;
    white-space: pre-wrap;
}
pre code { background: none; padding: 0; }
hr {
    border: 0;
    border-top: 0.3pt solid #C8A96E;
    margin: 0.22in 0;
}
a { color: #1B4965; text-decoration: underline; }
strong { font-weight: bold; color: #1A1A2E; }
em { font-style: italic; }
"""

COVER_HTML_TEMPLATE = """
<div class="cover-page">
    <div class="cover-wordmark">ZAAHI</div>
    <hr class="cover-rule">
    <div class="cover-tagline">Real Estate OS</div>
    <div class="cover-title">{title}</div>
    <div class="cover-subtitle">Confidential — {doc_label}</div>
    <hr class="cover-rule">
    <div class="cover-date">As of {date}</div>
</div>
"""


def strip_yaml_frontmatter(md_text: str) -> str:
    if md_text.startswith('---\n'):
        end = md_text.find('\n---\n', 4)
        if end != -1:
            return md_text[end + 5:]
    return md_text


def render_md_to_pdf(md_path: Path, out_pdf: Path, title: str, doc_label: str):
    md_text = md_path.read_text(encoding='utf-8')
    md_text = strip_yaml_frontmatter(md_text)

    md_html = markdown.markdown(
        md_text,
        extensions=[
            'tables',
            'fenced_code',
            'footnotes',
            'attr_list',
            'sane_lists',
            'smarty',
        ],
        output_format='html5',
    )

    cover = COVER_HTML_TEMPLATE.format(
        title=title,
        doc_label=doc_label,
        date=DATE_AS_OF,
    )

    html = (
        '<!DOCTYPE html><html><head>'
        f'<meta charset="utf-8"><title>{title}</title>'
        '</head><body>' + cover + md_html + '</body></html>'
    )

    HTML(string=html, base_url=str(md_path.parent)).write_pdf(
        target=str(out_pdf),
        stylesheets=[CSS(string=CSS_BRANDING)],
    )


def slug(idx: int) -> str:
    return f'{idx:02d}'


def main():
    OUT_INTERNAL.mkdir(parents=True, exist_ok=True)
    OUT_EXTERNAL.mkdir(parents=True, exist_ok=True)

    # Render cover letter
    cover_letter_pdf = OUT_EXTERNAL / '00_COVER_LETTER.pdf'
    render_md_to_pdf(
        VIKTOR / 'COVER_LETTER_VIKTOR.md',
        cover_letter_pdf,
        'Cover Letter',
        'Cover Letter — Viktor Jordán',
    )
    print(f'  external/00_COVER_LETTER.pdf  ✓')

    # Render disclosure log entry 1
    disclosure_pdf = VIKTOR / 'DISCLOSURE_LOG_ENTRY_1.pdf'
    render_md_to_pdf(
        VIKTOR / 'DISCLOSURE_LOG_ENTRY_1.md',
        disclosure_pdf,
        'Disclosure Log — Entry 1',
        'Disclosure Log Entry 1',
    )
    print(f'  DISCLOSURE_LOG_ENTRY_1.pdf  ✓')

    # Render each document and place in internal/ and (if external) external/
    for src, internal_idx, external_idx, title, doc_label in DOCS:
        if not src.exists():
            print(f'  MISSING: {src}', flush=True)
            continue

        # Slug from source filename minus extension
        stem = src.stem  # e.g. 'README'
        # Internal target
        internal_pdf = OUT_INTERNAL / f'{slug(internal_idx)}_{stem}.pdf'
        render_md_to_pdf(src, internal_pdf, title, doc_label)
        print(f'  internal/{internal_pdf.name}  ✓')

        # External target — same content, different filename if external_idx not None
        if external_idx is not None:
            external_pdf = OUT_EXTERNAL / f'{slug(external_idx)}_{stem}.pdf'
            shutil.copyfile(internal_pdf, external_pdf)
            print(f'  external/{external_pdf.name}  ✓ (copy)')

    # Summary
    print()
    print(f'internal/ count: {len(list(OUT_INTERNAL.glob("*.pdf")))}')
    print(f'external/ count: {len(list(OUT_EXTERNAL.glob("*.pdf")))}')
    print(f'DISCLOSURE_LOG_ENTRY_1.pdf: exists = {disclosure_pdf.exists()}')


if __name__ == '__main__':
    main()
