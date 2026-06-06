// Quick headless PDF generation to verify the page count compaction.
// Mirrors what FeasibilityV6Calculator.downloadPDF does, with the same
// sequence of newPage / sectionGap / checkPage calls but stubbed-out
// content so we can compare a "baseline defaults" run.

import { jsPDF } from 'jspdf';

const W = 210;
const H = 297;
const M = 15;

function buildPdf(opts: { recsCount: number }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const gold: [number, number, number] = [200, 169, 110];
  const goldDark: [number, number, number] = [148, 119, 71];
  const gray: [number, number, number] = [107, 114, 128];
  const dark: [number, number, number] = [26, 26, 46];

  let y = 0;
  let pageNum = 0;
  const dateStr = '2026-06-08';
  const headerBand = () => {
    doc.setFillColor(...gold);
    doc.rect(0, 0, W, 4, 'F');
  };
  const newPage = () => {
    if (pageNum > 0) doc.addPage();
    pageNum += 1;
    headerBand();
    y = 14;
  };
  const sectionGap = () => { y += 8; };
  const checkPage = (need: number) => {
    if (y + need > H - 14) newPage();
  };
  const sectionTitle = (t: string) => {
    doc.setFontSize(10);
    doc.setTextColor(...goldDark);
    doc.setFont('times', 'bold');
    doc.text(t.toUpperCase(), M, y);
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.3);
    doc.line(M, y + 1.5, W - M, y + 1.5);
    y += 7;
  };
  const tableRow = (label: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...gray);
    doc.text(label, M, y);
    doc.setTextColor(...dark);
    doc.text(value, W - M, y, { align: 'right' });
    y += 6;
  };

  // Cover
  newPage();
  y = 22;
  doc.setFontSize(28); doc.setTextColor(...goldDark);
  doc.setFont('times', 'bold'); doc.text('ZAAHI', M, y);
  y += 14;
  doc.setDrawColor(...gold);
  doc.line(M, y, W - M, y); y += 6;
  doc.setFontSize(13); doc.text('Plot 3260913', M, y); y += 5;
  doc.setFontSize(9); doc.setTextColor(...gray);
  doc.text('JADDAF WATERFRONT · Al Jadaf · JADDAF WATERFRONT', M, y); y += 4;
  doc.text('MIXED USE · 19,230 sqft · FAR 10.44 · Listed AED 100,000,000', M, y); y += 4;
  doc.setFontSize(8); doc.text('Engine: Residential · Build to Sell', M, y);
  y += 16;
  doc.text('NET PROFIT', M, y); y += 16;
  doc.setFontSize(36); doc.setTextColor(...goldDark);
  doc.text('AED 30,402,379', M, y); y += 14;
  doc.setFontSize(10); doc.setTextColor(...dark);
  doc.text('ROI 9.7% · IRR 9.8% · ROE 10.0% · Profit/sqft AED 189', M, y);

  // Inputs
  newPage();
  sectionTitle('Inputs');
  doc.setFontSize(8); doc.setTextColor(...gray);
  doc.text('Side-by-side intro line', M, y); y += 6;
  for (let i = 0; i < 17; i++) tableRow(`Input field ${i + 1}`, '0%');

  // Results
  newPage();
  sectionTitle('Results — step by step');
  for (let i = 0; i < 26; i++) tableRow(`Result row ${i + 1}`, `AED ${i}`);

  // Glossary (no forced newPage)
  sectionGap();
  checkPage(160);
  sectionTitle('Glossary');
  for (let i = 0; i < 14; i++) {
    doc.setFontSize(8.5);
    doc.setTextColor(...goldDark);
    doc.setFont('helvetica', 'bold');
    doc.text(`Term ${i + 1}`, M, y);
    doc.setTextColor(...dark);
    doc.setFont('helvetica', 'normal');
    doc.text('Definition body wrapped to fit.', M + 28, y);
    y += 8;
  }

  // Recommendations
  sectionGap();
  checkPage(50);
  sectionTitle('Optimisation recommendations');
  if (opts.recsCount === 0) {
    doc.setFontSize(9);
    doc.text('No material deviations from engine baseline.', M, y);
    y += 8;
  } else {
    for (let i = 0; i < opts.recsCount; i++) {
      tableRow(`Recommendation ${i + 1}`, 'AED 100K');
    }
  }

  // Disclaimer + Sources
  sectionGap();
  checkPage(70);
  sectionTitle('Disclaimer + sources');
  doc.setFontSize(9);
  doc.text('Disclaimer paragraph one line.', M, y); y += 5;
  doc.text('Disclaimer paragraph two line.', M, y); y += 5;
  doc.text('Disclaimer paragraph three line.', M, y); y += 5;
  doc.text('Disclaimer paragraph four line.', M, y); y += 8;
  doc.setFontSize(9); doc.setTextColor(...goldDark); doc.setFont('times', 'bold');
  doc.text('Sources', M, y); y += 5;
  for (let i = 0; i < 4; i++) {
    doc.setFontSize(8); doc.setTextColor(...dark); doc.setFont('helvetica', 'normal');
    doc.text(`• Source ${i + 1}`, M + 4, y); y += 5;
  }

  return doc.getNumberOfPages();
}

console.log('Reference deal (defaults — no recs):    ', buildPdf({ recsCount: 0 }), 'pages');
console.log('Reference deal (3 recommendations):     ', buildPdf({ recsCount: 3 }), 'pages');
console.log('Reference deal (8 recommendations):     ', buildPdf({ recsCount: 8 }), 'pages');
