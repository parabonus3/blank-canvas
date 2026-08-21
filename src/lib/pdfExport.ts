import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';

interface HistoryPDFData {
  entries: Array<{
    projectName: string;
    categoryName: string;
    categoryColor: string;
    type: string;
    startTime: string;
    endTime: string;
    duration: string;
  }>;
  filters: { period: string; project: string; type: string };
  totalDuration: string;
  sessionCount: number;
  title: string;
  subtitle: string;
}

const COLORS = {
  primary: [79, 70, 229] as [number, number, number],
  primaryDark: [55, 48, 163] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  black: [17, 24, 39] as [number, number, number],
  gray600: [75, 85, 99] as [number, number, number],
  gray400: [156, 163, 175] as [number, number, number],
  gray100: [243, 244, 246] as [number, number, number],
  gray50: [249, 250, 251] as [number, number, number],
  tableAlt: [238, 242, 255] as [number, number, number],
};

function drawHeader(pdf: jsPDF, pageWidth: number, title: string) {
  pdf.setFillColor(...COLORS.primaryDark);
  pdf.rect(0, 0, pageWidth, 38, 'F');
  pdf.setFillColor(...COLORS.primary);
  pdf.rect(0, 28, pageWidth, 10, 'F');
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TimeZoni', 16, 20);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(title, 16, 34);
}

function drawFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, pageNumber: number, totalPages: number, footer: string, pageOf: string) {
  const y = pageHeight - 10;
  pdf.setDrawColor(...COLORS.gray400);
  pdf.setLineWidth(0.3);
  pdf.line(16, y - 4, pageWidth - 16, y - 4);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.gray400);
  pdf.text(footer, 16, y);
  pdf.text(pageOf, pageWidth - 16, y, { align: 'right' });
}

// ============================================================================
// HISTORY PDF (legacy / used by History page)
// ============================================================================
export async function exportHistoryToPDF(data: HistoryPDFData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm');

  drawHeader(pdf, pageWidth, 'Time Tracking Report');

  const boxY = 46;
  const boxH = 28;
  pdf.setFillColor(...COLORS.gray100);
  pdf.roundedRect(16, boxY, pageWidth - 32, boxH, 3, 3, 'F');

  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...COLORS.black);
  const col1 = 22;
  const col2 = pageWidth / 2 + 5;
  let infoY = boxY + 8;
  pdf.text(`${data.subtitle}:`, col1, infoY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(generatedAt, col1 + 28, infoY);
  infoY += 6;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Period:', col1, infoY);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.filters.period, col1 + 16, infoY);
  infoY += 6;
  if (data.filters.project !== '' && data.filters.project !== 'all') {
    pdf.setFont('helvetica', 'bold');
    pdf.text('Project:', col1, infoY);
    pdf.setFont('helvetica', 'normal');
    pdf.text(data.filters.project, col1 + 16, infoY);
  }
  let rightY = boxY + 8;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.primary);
  pdf.text(data.totalDuration, col2, rightY);
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.gray600);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Total Time', col2, rightY + 5);
  rightY += 13;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(...COLORS.primary);
  pdf.text(String(data.sessionCount), col2, rightY);
  pdf.setFontSize(7);
  pdf.setTextColor(...COLORS.gray600);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Sessions', col2, rightY + 5);

  const tableData = data.entries.map(e => ['', e.projectName, e.categoryName || '—', e.type, e.startTime, e.endTime, e.duration]);
  const categoryColors = data.entries.map(e => e.categoryColor || '#9ca3af');

  autoTable(pdf, {
    head: [['', 'Project', 'Category', 'Type', 'Start', 'End', 'Duration']],
    body: tableData,
    startY: boxY + boxH + 8,
    theme: 'plain',
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8, cellPadding: 4, halign: 'left' },
    styles: { fontSize: 8, cellPadding: 3, textColor: COLORS.black, lineColor: [229, 231, 235], lineWidth: 0.2 },
    alternateRowStyles: { fillColor: COLORS.tableAlt },
    columnStyles: {
      0: { cellWidth: 6, halign: 'center' },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 28 }, 3: { cellWidth: 22 }, 4: { cellWidth: 28 }, 5: { cellWidth: 28 },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 16, right: 16 },
    didDrawCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 0) {
        const color = categoryColors[hookData.row.index];
        if (color) {
          const hex = color.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16) || 156;
          const g = parseInt(hex.substring(2, 4), 16) || 163;
          const b = parseInt(hex.substring(4, 6), 16) || 175;
          pdf.setFillColor(r, g, b);
          pdf.circle(hookData.cell.x + hookData.cell.width / 2, hookData.cell.y + hookData.cell.height / 2, 2, 'F');
        }
      }
    },
  });

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(pdf, pageWidth, pdf.internal.pageSize.getHeight(), i, totalPages, `TimeZoni · ${generatedAt}`, `${i} / ${totalPages}`);
    if (i > 1) drawHeader(pdf, pageWidth, 'Time Tracking Report');
  }
  pdf.save(`timezoni-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// ============================================================================
// DASHBOARD PDF (structured, multilingual, professional)
// ============================================================================

export interface DashboardPDFData {
  generatedAt: string;
  periodLabel: string;
  periodRange: string;
  categoryLabel: string;
  typeLabel: string;
  totals: {
    todayLabel: string; todayValue: string;
    weekLabel: string; weekValue: string;
    monthLabel: string; monthValue: string;
    completedGoalsLabel: string; completedGoalsValue: string;
  };
  byProject: Array<{ name: string; categoryName: string; sessions: number; seconds: number; percentage: number; color: string }>;
  byCategory: Array<{ name: string; seconds: number; percentage: number; color: string }>;
  byDay: Array<{ day: string; seconds: number; sessions: number }>;
  i18n: {
    title: string;
    generatedOn: string;
    filterSummary: string;
    periodHeader: string;
    categoryHeader: string;
    typeHeader: string;
    byProject: string;
    byCategory: string;
    dailyBreakdown: string;
    sessions: string;
    percentage: string;
    projectCol: string;
    categoryCol: string;
    timeCol: string;
    dayCol: string;
    totalCol: string;
    noCategory: string;
    footer: string;
    pageOf: (page: number, total: number) => string;
  };
}

function formatDur(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export async function exportDashboardStructuredPDF(data: DashboardPDFData, chartsElementId?: string): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  drawHeader(pdf, pageWidth, data.i18n.title);

  // Filter summary box
  let y = 46;
  pdf.setFillColor(...COLORS.gray100);
  pdf.roundedRect(16, y, pageWidth - 32, 36, 3, 3, 'F');
  pdf.setTextColor(...COLORS.black);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(data.i18n.filterSummary, 22, y + 8);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.i18n.periodHeader}:`, 22, y + 16);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.periodLabel, 60, y + 16);
  pdf.setTextColor(...COLORS.gray600);
  pdf.text(data.periodRange, 60, y + 22);

  pdf.setTextColor(...COLORS.black);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.i18n.categoryHeader}:`, 22, y + 30);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.categoryLabel, 60, y + 30);

  pdf.setFont('helvetica', 'bold');
  pdf.text(`${data.i18n.typeHeader}:`, pageWidth / 2 + 5, y + 30);
  pdf.setFont('helvetica', 'normal');
  pdf.text(data.typeLabel, pageWidth / 2 + 25, y + 30);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...COLORS.gray600);
  pdf.text(`${data.i18n.generatedOn} ${data.generatedAt}`, pageWidth - 22, y + 8, { align: 'right' });

  // Totals cards
  y += 44;
  const cardW = (pageWidth - 32 - 9) / 4;
  const totals = [
    { l: data.totals.todayLabel, v: data.totals.todayValue },
    { l: data.totals.weekLabel, v: data.totals.weekValue },
    { l: data.totals.monthLabel, v: data.totals.monthValue },
    { l: data.totals.completedGoalsLabel, v: data.totals.completedGoalsValue },
  ];
  totals.forEach((c, i) => {
    const x = 16 + i * (cardW + 3);
    pdf.setFillColor(...COLORS.tableAlt);
    pdf.roundedRect(x, y, cardW, 22, 2, 2, 'F');
    pdf.setTextColor(...COLORS.gray600);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(c.l, x + cardW / 2, y + 8, { align: 'center' });
    pdf.setTextColor(...COLORS.primary);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(c.v, x + cardW / 2, y + 17, { align: 'center' });
  });
  y += 28;

  // Charts snapshot
  if (chartsElementId) {
    const el = document.getElementById(chartsElementId);
    if (el) {
      try {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', logging: false });
        const imgData = canvas.toDataURL('image/png');
        const imgW = pageWidth - 32;
        const imgH = (canvas.height * imgW) / canvas.width;
        const maxH = pageHeight - y - 20;
        const finalH = Math.min(imgH, maxH);
        const finalW = (canvas.width * finalH) / canvas.height;
        pdf.addImage(imgData, 'PNG', (pageWidth - finalW) / 2, y, finalW, finalH);
        y += finalH + 6;
      } catch (e) {
        console.warn('chart capture failed', e);
      }
    }
  }

  // By project table
  if (data.byProject.length > 0) {
    if (y > pageHeight - 60) { pdf.addPage(); drawHeader(pdf, pageWidth, data.i18n.title); y = 46; }
    pdf.setTextColor(...COLORS.black);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(data.i18n.byProject, 16, y);
    y += 4;
    autoTable(pdf, {
      head: [[data.i18n.projectCol, data.i18n.categoryCol, data.i18n.sessions, data.i18n.timeCol, data.i18n.percentage]],
      body: data.byProject.map(p => [p.name, p.categoryName || data.i18n.noCategory, String(p.sessions), formatDur(p.seconds), `${p.percentage.toFixed(1)}%`]),
      startY: y + 2,
      theme: 'plain',
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3, textColor: COLORS.black, lineColor: [229, 231, 235], lineWidth: 0.2 },
      alternateRowStyles: { fillColor: COLORS.tableAlt },
      columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'right' } },
      margin: { left: 16, right: 16 },
    });
    y = (pdf as any).lastAutoTable.finalY + 8;
  }

  // By category table
  if (data.byCategory.length > 0) {
    if (y > pageHeight - 60) { pdf.addPage(); drawHeader(pdf, pageWidth, data.i18n.title); y = 46; }
    pdf.setTextColor(...COLORS.black);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(data.i18n.byCategory, 16, y);
    y += 4;
    autoTable(pdf, {
      head: [[data.i18n.categoryCol, data.i18n.timeCol, data.i18n.percentage]],
      body: data.byCategory.map(c => [c.name || data.i18n.noCategory, formatDur(c.seconds), `${c.percentage.toFixed(1)}%`]),
      startY: y + 2,
      theme: 'plain',
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3, textColor: COLORS.black, lineColor: [229, 231, 235], lineWidth: 0.2 },
      alternateRowStyles: { fillColor: COLORS.tableAlt },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' }, 2: { halign: 'right' } },
      margin: { left: 16, right: 16 },
    });
    y = (pdf as any).lastAutoTable.finalY + 8;
  }

  // Daily breakdown
  if (data.byDay.length > 0) {
    if (y > pageHeight - 60) { pdf.addPage(); drawHeader(pdf, pageWidth, data.i18n.title); y = 46; }
    pdf.setTextColor(...COLORS.black);
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(data.i18n.dailyBreakdown, 16, y);
    y += 4;
    autoTable(pdf, {
      head: [[data.i18n.dayCol, data.i18n.sessions, data.i18n.timeCol]],
      body: data.byDay.map(d => [d.day, String(d.sessions), formatDur(d.seconds)]),
      startY: y + 2,
      theme: 'plain',
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 9, cellPadding: 3, textColor: COLORS.black, lineColor: [229, 231, 235], lineWidth: 0.2 },
      alternateRowStyles: { fillColor: COLORS.tableAlt },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', fontStyle: 'bold' } },
      margin: { left: 16, right: 16 },
    });
  }

  // Footers + headers on subsequent pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(pdf, pageWidth, pageHeight, i, totalPages, data.i18n.footer, data.i18n.pageOf(i, totalPages));
  }

  pdf.save(`timezoni-dashboard-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// Legacy fallback (kept for compatibility — uses html2canvas of whole element)
export async function exportDashboardToPDF(elementId: string, title: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;
  await new Promise(resolve => setTimeout(resolve, 300));
  const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  drawHeader(pdf, pageWidth, title);
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const yPosition = 42;
  if (imgHeight > pageHeight - 50) {
    const ratio = (pageHeight - 50) / imgHeight;
    pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth * ratio, pageHeight - 50);
  } else {
    pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);
  }
  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm');
  drawFooter(pdf, pageWidth, pageHeight, 1, 1, `TimeZoni · ${generatedAt}`, '1 / 1');
  pdf.save(`timezoni-dashboard-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// ============================================================================
// SINGLE NOTE PDF (clean, professional, markdown-aware)
// ============================================================================

export interface NotePDFData {
  title: string;
  content: string;
  projectName?: string | null;
  folderName?: string | null;
  createdAt: string;   // formatted
  updatedAt?: string;  // formatted (only if changed)
  i18n: {
    docTitle: string;       // e.g. "Anotação"
    project: string;
    folder: string;
    createdOn: string;
    updatedOn: string;
    empty?: string;         // e.g. "Esta anotação está vazia."
    footer: string;         // e.g. "TimeZoni · Gerado em ..."
    pageOf: (page: number, total: number) => string;
  };
}

interface ParsedBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'ul' | 'ol' | 'code' | 'quote' | 'hr' | 'spacer';
  text?: string;
  items?: string[];
}

function stripInline(s: string): string {
  // Strip bold/italic/code markers but keep link text
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1');
}

function parseMarkdown(md: string): ParsedBlock[] {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: ParsedBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (blocks.length && blocks[blocks.length - 1].type !== 'spacer') {
        blocks.push({ type: 'spacer' });
      }
      i++;
      continue;
    }

    // Code fence
    if (trimmed.startsWith('```')) {
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: 'code', text: buf.join('\n') });
      continue;
    }

    // Headings
    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (h) {
      const lvl = h[1].length;
      blocks.push({ type: lvl === 1 ? 'h1' : lvl === 2 ? 'h2' : 'h3', text: stripInline(h[2]) });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Quote
    if (trimmed.startsWith('>')) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        buf.push(stripInline(lines[i].trim().replace(/^>\s?/, '')));
        i++;
      }
      blocks.push({ type: 'quote', text: buf.join(' ') });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i].trim())) {
        items.push(stripInline(lines[i].trim().replace(/^[-*+]\s+/, '')));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(stripInline(lines[i].trim().replace(/^\d+\.\s+/, '')));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Paragraph (gather consecutive non-empty, non-special lines)
    const buf: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const t = lines[i].trim();
      if (!t) break;
      if (/^(#{1,3}\s|[-*+]\s|\d+\.\s|>|```|-{3,}$|\*{3,}$|_{3,}$)/.test(t)) break;
      buf.push(t);
      i++;
    }
    blocks.push({ type: 'p', text: stripInline(buf.join(' ')) });
  }
  return blocks;
}

// Brand palette — professional navy blue (Timezoni)
const NOTE_COLORS = {
  navy:    [11, 30, 63] as [number, number, number],     // #0B1E3F header
  accent:  [30, 64, 175] as [number, number, number],    // #1E40AF details
  ink:     [15, 23, 42] as [number, number, number],     // #0F172A body text
  muted:   [100, 116, 139] as [number, number, number],  // #64748B meta
  surface: [248, 250, 252] as [number, number, number],  // #F8FAFC cards/code
  border:  [226, 232, 240] as [number, number, number],  // #E2E8F0
  white:   [255, 255, 255] as [number, number, number],
};

function noteDrawHeader(pdf: jsPDF, pageWidth: number, docTitle: string, noteTitle: string, compact = false) {
  const h = compact ? 14 : 26;
  pdf.setFillColor(...NOTE_COLORS.navy);
  pdf.rect(0, 0, pageWidth, h, 'F');
  // accent hairline
  pdf.setFillColor(...NOTE_COLORS.accent);
  pdf.rect(0, h, pageWidth, 0.8, 'F');

  pdf.setTextColor(...NOTE_COLORS.white);
  if (compact) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('TimeZoni', 16, 9);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    const truncated = noteTitle.length > 60 ? noteTitle.slice(0, 57) + '…' : noteTitle;
    pdf.text(truncated, pageWidth - 16, 9, { align: 'right' });
  } else {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('TimeZoni', 16, 12);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(220, 230, 245);
    pdf.text(docTitle, 16, 20);
  }
}

function noteDrawFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, footerText: string, pageLabel: string) {
  const y = pageHeight - 10;
  pdf.setDrawColor(...NOTE_COLORS.border);
  pdf.setLineWidth(0.3);
  pdf.line(18, y - 5, pageWidth - 18, y - 5);
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...NOTE_COLORS.muted);
  pdf.text(footerText, 18, y);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(...NOTE_COLORS.accent);
  pdf.text(pageLabel, pageWidth - 18, y, { align: 'right' });
}

function drawMetaPill(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
): number {
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  const labelW = pdf.getTextWidth(label.toUpperCase());
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const valueW = pdf.getTextWidth(value);
  const padX = 4;
  const gap = 4;
  const w = labelW + gap + valueW + padX * 2;
  const h = 8;

  pdf.setFillColor(...NOTE_COLORS.surface);
  pdf.setDrawColor(...NOTE_COLORS.border);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, w, h, 1.5, 1.5, 'FD');

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7);
  pdf.setTextColor(...NOTE_COLORS.accent);
  pdf.text(label.toUpperCase(), x + padX, y + 5.2);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(...NOTE_COLORS.ink);
  pdf.text(value, x + padX + labelW + gap, y + 5.4);

  return w;
}

export async function exportNoteToPDF(data: NotePDFData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 20;
  const contentW = pageWidth - marginX * 2;
  const bottomLimit = pageHeight - 16;
  const noteTitle = (data.title || '—').normalize('NFC');
  const content = (data.content || '').normalize('NFC');

  noteDrawHeader(pdf, pageWidth, data.i18n.docTitle, noteTitle, false);

  let y = 38;

  // Title
  pdf.setTextColor(...NOTE_COLORS.ink);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(22);
  const titleLines = pdf.splitTextToSize(noteTitle, contentW);
  for (const line of titleLines) {
    pdf.text(line, marginX, y);
    y += 8.5;
  }
  y += 2;

  // Meta pills row (wrap if needed)
  const pills: Array<[string, string]> = [];
  if (data.projectName) pills.push([data.i18n.project, data.projectName]);
  if (data.folderName) pills.push([data.i18n.folder, data.folderName]);
  pills.push([data.i18n.createdOn.replace(/[:\s]+$/, ''), data.createdAt]);
  if (data.updatedAt) pills.push([data.i18n.updatedOn.replace(/[:\s]+$/, ''), data.updatedAt]);

  let px = marginX;
  for (const [label, value] of pills) {
    const w = drawMetaPill(pdf, px, y, label, value);
    if (px + w > pageWidth - marginX) {
      // wrap to next line
      y += 10;
      px = marginX;
      drawMetaPill(pdf, px, y, label, value);
      px += w + 4;
    } else {
      px += w + 4;
    }
  }
  y += 12;

  // Accent divider
  pdf.setDrawColor(...NOTE_COLORS.border);
  pdf.setLineWidth(0.3);
  pdf.line(marginX, y, pageWidth - marginX, y);
  pdf.setDrawColor(...NOTE_COLORS.accent);
  pdf.setLineWidth(0.9);
  pdf.line(marginX, y, marginX + 36, y);
  y += 7;

  const ensureSpace = (need: number) => {
    if (y + need > bottomLimit) {
      pdf.addPage();
      noteDrawHeader(pdf, pageWidth, data.i18n.docTitle, noteTitle, true);
      y = 22;
    }
  };

  const writeText = (text: string, opts: { size: number; bold?: boolean; italic?: boolean; color?: [number, number, number]; indent?: number; lineGap?: number }) => {
    const style = opts.bold && opts.italic ? 'bolditalic' : opts.bold ? 'bold' : opts.italic ? 'italic' : 'normal';
    pdf.setFont('helvetica', style);
    pdf.setFontSize(opts.size);
    pdf.setTextColor(...(opts.color || NOTE_COLORS.ink));
    const indent = opts.indent || 0;
    const wrapped = pdf.splitTextToSize(text, contentW - indent);
    const lineH = opts.size * 0.5 + (opts.lineGap || 0);
    for (const line of wrapped) {
      ensureSpace(lineH);
      pdf.text(line, marginX + indent, y);
      y += lineH;
    }
  };

  const blocks = parseMarkdown(content);
  if (blocks.length === 0 || (blocks.length === 1 && blocks[0].type === 'spacer')) {
    writeText(data.i18n.empty || '—', { size: 10.5, italic: true, color: NOTE_COLORS.muted });
  }

  for (const b of blocks) {
    switch (b.type) {
      case 'h1': {
        ensureSpace(14);
        y += 3;
        // accent left bar
        const startY = y - 5;
        pdf.setFillColor(...NOTE_COLORS.accent);
        pdf.rect(marginX - 2.5, startY, 1.5, 8, 'F');
        writeText(b.text!, { size: 16, bold: true, color: NOTE_COLORS.accent, lineGap: 1.5 });
        y += 2;
        break;
      }
      case 'h2':
        ensureSpace(11);
        y += 2;
        writeText(b.text!, { size: 13, bold: true, color: NOTE_COLORS.accent, lineGap: 1 });
        y += 1.5;
        break;
      case 'h3':
        ensureSpace(9);
        y += 1;
        writeText(b.text!, { size: 11, bold: true, color: NOTE_COLORS.ink, lineGap: 0.5 });
        y += 1;
        break;
      case 'p':
        writeText(b.text!, { size: 10.5, lineGap: 1.5 });
        y += 2;
        break;
      case 'ul':
        for (const item of b.items!) {
          ensureSpace(6);
          pdf.setFillColor(...NOTE_COLORS.accent);
          pdf.circle(marginX + 1.5, y - 1.4, 0.9, 'F');
          writeText(item, { size: 10.5, indent: 6, lineGap: 1.2 });
        }
        y += 2;
        break;
      case 'ol':
        b.items!.forEach((item, idx) => {
          ensureSpace(6);
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10.5);
          pdf.setTextColor(...NOTE_COLORS.accent);
          pdf.text(`${idx + 1}.`, marginX, y);
          writeText(item, { size: 10.5, indent: 8, lineGap: 1.2 });
        });
        y += 2;
        break;
      case 'code': {
        const codeLines = (b.text || '').split('\n');
        const lineH = 4.6;
        const boxH = codeLines.length * lineH + 6;
        ensureSpace(boxH);
        pdf.setFillColor(...NOTE_COLORS.surface);
        pdf.setDrawColor(...NOTE_COLORS.border);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(marginX, y - 1, contentW, boxH, 1.8, 1.8, 'FD');
        pdf.setFont('courier', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(...NOTE_COLORS.ink);
        let cy = y + 4;
        for (const line of codeLines) {
          const wrapped = pdf.splitTextToSize(line || ' ', contentW - 6);
          for (const w of wrapped) {
            if (cy + lineH > bottomLimit) {
              pdf.addPage();
              noteDrawHeader(pdf, pageWidth, data.i18n.docTitle, noteTitle, true);
              y = 22;
              cy = y + 4;
            }
            pdf.text(w, marginX + 3, cy);
            cy += lineH;
          }
        }
        y = cy + 3;
        break;
      }
      case 'quote': {
        const wrapped = pdf.splitTextToSize(b.text || '', contentW - 10);
        const blockH = wrapped.length * 5.2 + 6;
        ensureSpace(blockH);
        pdf.setFillColor(...NOTE_COLORS.surface);
        pdf.roundedRect(marginX, y - 2, contentW, blockH, 1.5, 1.5, 'F');
        pdf.setFillColor(...NOTE_COLORS.accent);
        pdf.rect(marginX, y - 2, 1.6, blockH, 'F');
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(10.5);
        pdf.setTextColor(...NOTE_COLORS.muted);
        let qy = y + 2.5;
        for (const line of wrapped) {
          pdf.text(line, marginX + 6, qy);
          qy += 5.2;
        }
        y = qy + 2;
        break;
      }
      case 'hr':
        ensureSpace(6);
        pdf.setDrawColor(...NOTE_COLORS.border);
        pdf.setLineWidth(0.3);
        pdf.line(marginX, y, pageWidth - marginX, y);
        y += 5;
        break;
      case 'spacer':
        y += 2;
        break;
    }
  }

  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    noteDrawFooter(pdf, pageWidth, pageHeight, data.i18n.footer, data.i18n.pageOf(i, totalPages));
  }

  const safeTitle = (data.title || 'note').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'note';
  pdf.save(`${safeTitle}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// ============================================================================
// KANBAN — ORDEM DE SERVIÇO (por cartão) e RELATÓRIO DE OPERAÇÃO (por quadro)
// ============================================================================

export interface WorkOrderMember { name: string; seconds: number; }
export interface WorkOrderChecklist { title: string; done: boolean; by?: string | null; at?: string | null; }
export interface WorkOrderActivity { who: string; what: string; when: string; }

export interface WorkOrderData {
  boardTitle: string;
  columnTitle?: string | null;
  taskTitle: string;
  description?: string | null;
  priority: string;
  status: string;
  dueDate?: string | null;
  createdAt: string;
  project?: string | null;
  labels: string[];
  members: WorkOrderMember[];
  checklists: WorkOrderChecklist[];
  comments: Array<{ who: string; when: string; text: string }>;
  attachments: string[];
  totalSeconds: number;
  estimatedMinutes?: number | null;
  activity: WorkOrderActivity[];
  labelsI18n: Record<string, string>;
}

function hm(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function sectionTitle(pdf: jsPDF, title: string, y: number): number {
  pdf.setFillColor(...COLORS.gray100);
  pdf.rect(14, y - 5, pdf.internal.pageSize.getWidth() - 28, 8, 'F');
  pdf.setTextColor(...COLORS.primaryDark);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title.toUpperCase(), 16, y);
  return y + 8;
}

function ensureSpace(pdf: jsPDF, y: number, needed = 30): number {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 18) {
    pdf.addPage();
    return 24;
  }
  return y;
}

export async function exportWorkOrderPDF(data: WorkOrderData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const L = data.labelsI18n;
  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm');

  drawHeader(pdf, pageWidth, `${L.work_order} — ${data.boardTitle}`);
  let y = 50;

  // Título do cartão
  pdf.setTextColor(...COLORS.black);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  const titleLines = pdf.splitTextToSize(data.taskTitle, pageWidth - 32);
  pdf.text(titleLines, 16, y);
  y += titleLines.length * 7 + 2;

  // Metadados
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.gray600);
  const meta = [
    `${L.status}: ${data.status}`,
    `${L.priority}: ${data.priority}`,
    data.columnTitle ? `${L.column}: ${data.columnTitle}` : null,
    data.project ? `${L.project}: ${data.project}` : null,
    data.dueDate ? `${L.due_date}: ${data.dueDate}` : null,
    `${L.created_at}: ${data.createdAt}`,
    `${L.total_tracked}: ${hm(data.totalSeconds)}${data.estimatedMinutes ? ` / ${hm(data.estimatedMinutes * 60)}` : ''}`,
    data.labels.length ? `${L.labels}: ${data.labels.join(', ')}` : null,
  ].filter(Boolean) as string[];
  meta.forEach((line) => {
    const wrapped = pdf.splitTextToSize(line, pageWidth - 32);
    pdf.text(wrapped, 16, y);
    y += wrapped.length * 4.6;
  });
  y += 4;

  if (data.description) {
    y = ensureSpace(pdf, y, 24);
    y = sectionTitle(pdf, L.description, y);
    pdf.setTextColor(...COLORS.black);
    pdf.setFontSize(9);
    const lines = pdf.splitTextToSize(data.description, pageWidth - 32);
    lines.forEach((line: string) => {
      y = ensureSpace(pdf, y, 10);
      pdf.text(line, 16, y);
      y += 4.6;
    });
    y += 4;
  }

  if (data.members.length) {
    y = ensureSpace(pdf, y, 30);
    y = sectionTitle(pdf, L.team, y);
    autoTable(pdf, {
      startY: y,
      head: [[L.member, L.time_logged]],
      body: data.members.map((m) => [m.name, hm(m.seconds)]),
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: COLORS.black },
      alternateRowStyles: { fillColor: COLORS.gray50 },
      margin: { left: 16, right: 16 },
    });
    y = (pdf as any).lastAutoTable.finalY + 8;
  }

  if (data.checklists.length) {
    y = ensureSpace(pdf, y, 30);
    y = sectionTitle(pdf, L.checklist, y);
    autoTable(pdf, {
      startY: y,
      head: [['', L.item, L.done_by]],
      body: data.checklists.map((c) => [c.done ? 'X' : '', c.title, c.done ? `${c.by || '—'}${c.at ? ` (${c.at})` : ''}` : '—']),
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: COLORS.black },
      columnStyles: { 0: { cellWidth: 8, halign: 'center' } },
      alternateRowStyles: { fillColor: COLORS.gray50 },
      margin: { left: 16, right: 16 },
    });
    y = (pdf as any).lastAutoTable.finalY + 8;
  }

  if (data.attachments.length) {
    y = ensureSpace(pdf, y, 20);
    y = sectionTitle(pdf, L.attachments, y);
    pdf.setFontSize(8);
    pdf.setTextColor(...COLORS.black);
    data.attachments.forEach((a) => {
      y = ensureSpace(pdf, y, 10);
      pdf.text(`• ${a}`, 16, y);
      y += 4.6;
    });
    y += 4;
  }

  if (data.comments.length) {
    y = ensureSpace(pdf, y, 30);
    y = sectionTitle(pdf, L.comments, y);
    autoTable(pdf, {
      startY: y,
      head: [[L.who, L.when, L.comment]],
      body: data.comments.map((c) => [c.who, c.when, c.text]),
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: COLORS.black },
      columnStyles: { 0: { cellWidth: 32 }, 1: { cellWidth: 28 } },
      alternateRowStyles: { fillColor: COLORS.gray50 },
      margin: { left: 16, right: 16 },
    });
    y = (pdf as any).lastAutoTable.finalY + 8;
  }

  if (data.activity.length) {
    y = ensureSpace(pdf, y, 30);
    y = sectionTitle(pdf, L.activity, y);
    autoTable(pdf, {
      startY: y,
      head: [[L.when, L.who, L.what]],
      body: data.activity.map((a) => [a.when, a.who, a.what]),
      theme: 'striped',
      headStyles: { fillColor: COLORS.primaryDark, textColor: COLORS.white, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: COLORS.black },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 32 } },
      margin: { left: 16, right: 16 },
    });
  }

  const total = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    drawFooter(pdf, pageWidth, pdf.internal.pageSize.getHeight(), i, total, `TimeZoni • ${generatedAt}`, `${i}/${total}`);
  }

  pdf.save(`${L.work_order}-${data.taskTitle.slice(0, 40).replace(/[^\w\s-]/g, '')}.pdf`);
}

export interface BoardReportData {
  boardTitle: string;
  generatedFor: string;
  totals: { tasks: number; done: number; open: number; overdue: number; seconds: number };
  byColumn: Array<{ column: string; total: number; done: number; seconds: number }>;
  byMember: Array<{ name: string; assigned: number; done: number; seconds: number; checkDone: number }>;
  tasks: Array<{ title: string; column: string; status: string; priority: string; due: string; members: string; progress: string; time: string }>;
  activity: WorkOrderActivity[];
  labelsI18n: Record<string, string>;
}

export async function exportBoardOperationPDF(data: BoardReportData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const L = data.labelsI18n;
  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm');

  drawHeader(pdf, pageWidth, `${L.board_report} — ${data.boardTitle}`);
  let y = 50;

  // Cards de resumo
  const cards = [
    { label: L.tasks, value: String(data.totals.tasks) },
    { label: L.done, value: String(data.totals.done) },
    { label: L.open, value: String(data.totals.open) },
    { label: L.overdue, value: String(data.totals.overdue) },
    { label: L.total_tracked, value: hm(data.totals.seconds) },
  ];
  const cardW = (pageWidth - 32 - 4 * 3) / 5;
  cards.forEach((c, i) => {
    const x = 16 + i * (cardW + 3);
    pdf.setFillColor(...COLORS.gray50);
    pdf.setDrawColor(...COLORS.gray400);
    pdf.roundedRect(x, y, cardW, 18, 2, 2, 'FD');
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...COLORS.primaryDark);
    pdf.text(c.value, x + cardW / 2, y + 8, { align: 'center' });
    pdf.setFontSize(6.5);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...COLORS.gray600);
    pdf.text(pdf.splitTextToSize(c.label, cardW - 3), x + cardW / 2, y + 13, { align: 'center' });
  });
  y += 26;

  y = sectionTitle(pdf, L.by_member, y);
  autoTable(pdf, {
    startY: y,
    head: [[L.member, L.assigned, L.done, L.checklist, L.time_logged]],
    body: data.byMember.map((m) => [m.name, String(m.assigned), String(m.done), String(m.checkDone), hm(m.seconds)]),
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.black },
    alternateRowStyles: { fillColor: COLORS.gray50 },
    margin: { left: 16, right: 16 },
  });
  y = (pdf as any).lastAutoTable.finalY + 8;

  y = ensureSpace(pdf, y, 30);
  y = sectionTitle(pdf, L.by_column, y);
  autoTable(pdf, {
    startY: y,
    head: [[L.column, L.tasks, L.done, L.time_logged]],
    body: data.byColumn.map((c) => [c.column, String(c.total), String(c.done), hm(c.seconds)]),
    theme: 'grid',
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: COLORS.black },
    alternateRowStyles: { fillColor: COLORS.gray50 },
    margin: { left: 16, right: 16 },
  });
  y = (pdf as any).lastAutoTable.finalY + 8;

  y = ensureSpace(pdf, y, 40);
  y = sectionTitle(pdf, L.tasks, y);
  autoTable(pdf, {
    startY: y,
    head: [[L.task, L.column, L.priority, L.due_date, L.member, L.checklist, L.time_logged]],
    body: data.tasks.map((tk) => [tk.title, tk.column, tk.priority, tk.due, tk.members, tk.progress, tk.time]),
    theme: 'striped',
    headStyles: { fillColor: COLORS.primaryDark, textColor: COLORS.white, fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: COLORS.black },
    columnStyles: { 0: { cellWidth: 42 }, 4: { cellWidth: 28 } },
    margin: { left: 16, right: 16 },
  });
  y = (pdf as any).lastAutoTable.finalY + 8;

  if (data.activity.length) {
    y = ensureSpace(pdf, y, 30);
    y = sectionTitle(pdf, L.activity, y);
    autoTable(pdf, {
      startY: y,
      head: [[L.when, L.who, L.what]],
      body: data.activity.map((a) => [a.when, a.who, a.what]),
      theme: 'striped',
      headStyles: { fillColor: COLORS.primaryDark, textColor: COLORS.white, fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5, textColor: COLORS.black },
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 32 } },
      margin: { left: 16, right: 16 },
    });
  }

  const total = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    drawFooter(pdf, pageWidth, pdf.internal.pageSize.getHeight(), i, total, `TimeZoni • ${data.generatedFor} • ${generatedAt}`, `${i}/${total}`);
  }

  pdf.save(`${L.board_report}-${data.boardTitle.slice(0, 40).replace(/[^\w\s-]/g, '')}.pdf`);
}
