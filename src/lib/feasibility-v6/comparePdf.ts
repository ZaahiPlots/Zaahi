// ZAAHI Feasibility v6.1 — the study comparison as ONE landscape PDF.
//
// Spec: docs/specs/feasibility-v6/SAVED_STUDIES_AND_COMPARE.md §Compare.
// Built on pdfKit so it reads as the same family of documents as the main
// feasibility report (pdf.ts): same colours, margins, table style, footer.
// Client-only (jsPDF).
//
// The numbers printed are the SAVED outputs of each version — the PDF never
// recalculates. Two things that are colour on screen are also text here, so a
// black-and-white print loses nothing: the best value in a row carries " *",
// and a differing assumption row is labelled "(differs)".

import { PDF_COLORS, createPdfKit, type PdfKit } from './pdfKit';
import { COMPARE_METRICS, assumptionRows, bestIndex } from './study';
import { formatMetric, stalenessLines, type CompareItemDto, type Staleness } from './studyRules';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (d: Date): string => `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const isoDay = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** "A", "B", … — the column letter used in every table of the comparison. */
export const columnLetter = (i: number): string => String.fromCharCode(65 + i);

export function columnTitle(item: CompareItemDto, i: number): string {
  return `${columnLetter(i)} · ${item.version.name} (v${item.version.version})`;
}

/** First column, then the studies sharing the rest equally. */
function widths(n: number): number[] {
  const first = n >= 5 ? 0.2 : 0.24;
  return [first, ...Array.from({ length: n }, () => (1 - first) / n)];
}

export interface ComparePdfArgs {
  items: CompareItemDto[];
  /** Same order as `items`. null = staleness not evaluated for that column. */
  staleness: Array<Staleness | null>;
  now?: Date;
}

export function buildComparePdf({ items, staleness, now = new Date() }: ComparePdfArgs): { kit: PdfKit; fileName: string } {
  const kit = createPdfKit('landscape');
  const { doc, M } = kit;
  const C = PDF_COLORS;
  const n = items.length;
  const outputs = items.map((it) => it.version.outputs);
  const head = items.map(columnTitle);

  kit.newPage();

  // ── Cover line ─────────────────────────────────────────────────────────
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...C.dark);
  doc.text('Feasibility study comparison', M, kit.y + 2);
  kit.y += 9;
  const plots = [...new Set(items.map((it) => it.study.plotNumber))];
  kit.para(`${day(now)} · ${n} saved versions side by side · ${plots.length === 1 ? `Plot ${plots[0]}` : `Plots ${plots.join(', ')}`}`, {
    size: 9.5,
    color: C.gray,
  });
  kit.gap(2);

  // ── What is being compared ─────────────────────────────────────────────
  kit.sectionTitle('Versions compared');
  kit.table({
    head: ['', 'Study', 'Version', 'Plot', 'Saved', 'Since saved'],
    widths: [0.04, 0.2, 0.2, 0.2, 0.1, 0.26],
    align: ['left', 'left', 'left', 'left', 'left', 'left'],
    rows: items.map((it, i) => {
      const s = staleness[i];
      const since = !s
        ? 'Not checked'
        : !s.stale
          ? s.plotChecked
            ? 'Nothing has changed'
            : 'Defaults and model unchanged; plot not checked'
          : [s.defaults.length > 0 ? 'defaults changed' : '', s.plot.length > 0 ? 'plot facts changed' : '', s.model ? 'model updated' : '']
              .filter(Boolean)
              .join(', ');
      return [
        columnLetter(i),
        it.study.name,
        `v${it.version.version} · ${it.version.name}`,
        `${it.study.plotNumber}${it.study.district ? ` · ${it.study.district}` : ''}`,
        day(new Date(it.version.createdAt)),
        since,
      ];
    }),
    boldCell: (_r, c) => c === 0,
    cellColor: (r, c) => (c === 5 && staleness[r]?.stale ? C.amber : c === 0 ? C.goldDark : undefined),
  });

  // ── Results ────────────────────────────────────────────────────────────
  kit.gap(2);
  kit.sectionTitle('Results');
  const best = COMPARE_METRICS.map((m) => bestIndex(m, outputs));
  kit.table({
    head: ['Metric', ...head],
    widths: widths(n),
    rows: COMPARE_METRICS.map((m, r) => [m.label, ...outputs.map((o, i) => `${formatMetric(m, o)}${best[r] === i ? ' *' : ''}`)]),
    boldCell: (r, c) => c > 0 && best[r] === c - 1,
    cellColor: (r, c) => (c > 0 && best[r] === c - 1 ? C.green : undefined),
  });
  kit.para('* Best value in the row. Rows without a mark have no better-or-worse direction, or the studies tie.', { size: 7.5, color: C.gray, italic: true });

  // ── Assumptions ────────────────────────────────────────────────────────
  kit.gap(3);
  kit.sectionTitle('Assumptions behind each version');
  const rows = assumptionRows(items.map((it) => it.version.inputs));
  const differing = rows.filter((r) => r.differs).length;
  kit.para(
    differing === 0
      ? 'All listed assumptions are identical across these versions.'
      : `${differing} of ${rows.length} assumptions differ between these versions. They are marked "(differs)" — read them before comparing the results above.`,
    { size: 8.5 },
  );
  kit.table({
    head: ['Assumption', ...head],
    widths: widths(n),
    align: ['left', ...head.map(() => 'left' as const)],
    rows: rows.map((r) => [r.differs ? `${r.label} (differs)` : r.label, ...r.values]),
    boldRows: rows.map((r, i) => (r.differs ? i : -1)).filter((i) => i >= 0),
    cellColor: (r, c) => (rows[r].differs && c === 0 ? C.amber : undefined),
  });

  // ── What changed since each was saved ──────────────────────────────────
  const staleCols = staleness.map((s, i) => ({ s, i })).filter((x): x is { s: Staleness; i: number } => !!x.s && x.s.stale);
  if (staleCols.length > 0) {
    kit.gap(3);
    kit.sectionTitle('Changed since saved');
    for (const { s, i } of staleCols) {
      kit.subhead(head[i]);
      for (const line of stalenessLines(s)) kit.para(`- ${line}`, { size: 8.5, color: C.amber });
    }
    kit.para('Each column above shows the result as calculated when that version was saved. A version is never rewritten.', { size: 8, color: C.gray });
  }

  // ── Disclaimer ─────────────────────────────────────────────────────────
  kit.gap(4);
  kit.sectionTitle('Disclaimer');
  kit.para(
    'This comparison sets saved feasibility estimates side by side; it is not a valuation or appraisal. Each column rests on its own assumptions, listed above, ' +
      'some of which are market-wide averages rather than figures verified for the plot. Investment decisions should be supported by an independent ' +
      'RICS-registered valuer and a quantity surveyor. ZAAHI bears no responsibility for outcomes derived from these estimates.',
    { size: 8.5 },
  );

  const models = [...new Set(items.map((it) => it.version.modelVersion))].join(' / ');
  kit.finish(`ZAAHI Feasibility - study comparison - model v${models} - ${isoDay(now)} - zaahi.io`);
  const plotTag = plots.slice(0, 2).join('-').replace(/[^A-Za-z0-9-]+/g, '_');
  return { kit, fileName: `ZAAHI-Feasibility-Compare-${plotTag}-${isoDay(now)}.pdf` };
}

export function downloadComparePdf(args: ComparePdfArgs): void {
  const built = buildComparePdf(args);
  built.kit.doc.save(built.fileName);
}
