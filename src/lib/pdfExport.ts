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
