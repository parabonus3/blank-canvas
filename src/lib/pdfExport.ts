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
  filters: {
    period: string;
    project: string;
    type: string;
  };
  totalDuration: string;
  sessionCount: number;
  title: string;
  subtitle: string;
}

const COLORS = {
  primary: [79, 70, 229] as [number, number, number],       // indigo-600
  primaryDark: [55, 48, 163] as [number, number, number],    // indigo-800
  white: [255, 255, 255] as [number, number, number],
  black: [17, 24, 39] as [number, number, number],           // gray-900
  gray600: [75, 85, 99] as [number, number, number],
  gray400: [156, 163, 175] as [number, number, number],
  gray100: [243, 244, 246] as [number, number, number],
  gray50: [249, 250, 251] as [number, number, number],
  tableAlt: [238, 242, 255] as [number, number, number],     // indigo-50
};

function drawHeader(pdf: jsPDF, pageWidth: number) {
  // Gradient-like header with two rects
  pdf.setFillColor(...COLORS.primaryDark);
  pdf.rect(0, 0, pageWidth, 38, 'F');
  pdf.setFillColor(...COLORS.primary);
  pdf.rect(0, 28, pageWidth, 10, 'F');

  // Brand name
  pdf.setTextColor(...COLORS.white);
  pdf.setFontSize(26);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TimeZoni', 16, 20);

  // Tagline
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Time Tracking Report', 16, 34);
}

function drawFooter(pdf: jsPDF, pageWidth: number, pageHeight: number, pageNumber: number, totalPages: number, generatedAt: string) {
  const y = pageHeight - 10;
  pdf.setDrawColor(...COLORS.gray400);
  pdf.setLineWidth(0.3);
  pdf.line(16, y - 4, pageWidth - 16, y - 4);

  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...COLORS.gray400);
  pdf.text(`TimeZoni  —  ${generatedAt}`, 16, y);
  pdf.text(`${pageNumber} / ${totalPages}`, pageWidth - 16, y, { align: 'right' });
}

export async function exportHistoryToPDF(data: HistoryPDFData): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm');

  drawHeader(pdf, pageWidth);

  // Info box
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

  // Left column - filters
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

  // Right column - totals
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

  // Table
  const tableData = data.entries.map(e => [
    '', // placeholder for color dot drawn in didDrawCell
    e.projectName,
    e.categoryName || '—',
    e.type,
    e.startTime,
    e.endTime,
    e.duration
  ]);

  const categoryColors = data.entries.map(e => e.categoryColor || '#9ca3af');

  autoTable(pdf, {
    head: [['', 'Project', 'Category', 'Type', 'Start', 'End', 'Duration']],
    body: tableData,
    startY: boxY + boxH + 8,
    theme: 'plain',
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 4,
      halign: 'left',
    },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      textColor: COLORS.black,
      lineColor: [229, 231, 235],
      lineWidth: 0.2,
    },
    alternateRowStyles: {
      fillColor: COLORS.tableAlt,
    },
    columnStyles: {
      0: { cellWidth: 6, halign: 'center' },
      1: { cellWidth: 'auto', fontStyle: 'bold' },
      2: { cellWidth: 28 },
      3: { cellWidth: 22 },
      4: { cellWidth: 28 },
      5: { cellWidth: 28 },
      6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 16, right: 16 },
    didDrawCell: (hookData) => {
      // Draw category color dot in first column of body rows
      if (hookData.section === 'body' && hookData.column.index === 0) {
        const color = categoryColors[hookData.row.index];
        if (color) {
          const hex = color.replace('#', '');
          const r = parseInt(hex.substring(0, 2), 16) || 156;
          const g = parseInt(hex.substring(2, 4), 16) || 163;
          const b = parseInt(hex.substring(4, 6), 16) || 175;
          pdf.setFillColor(r, g, b);
          pdf.circle(
            hookData.cell.x + hookData.cell.width / 2,
            hookData.cell.y + hookData.cell.height / 2,
            2,
            'F'
          );
        }
      }
      // Hide dot column text
      if (hookData.section === 'head' && hookData.column.index === 0) {
        // Clear the header text for dot column
      }
    },
    didDrawPage: () => {
      // Will add footer after we know total pages
    },
  });

  // Add footers to all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    drawFooter(pdf, pageWidth, pdf.internal.pageSize.getHeight(), i, totalPages, generatedAt);
    // Re-draw header on subsequent pages
    if (i > 1) {
      drawHeader(pdf, pageWidth);
    }
  }

  pdf.save(`timezoni-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

export async function exportDashboardToPDF(elementId: string, title: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  await new Promise(resolve => setTimeout(resolve, 500));

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff'
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  drawHeader(pdf, pageWidth);

  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let yPosition = 42;

  if (imgHeight > pageHeight - 50) {
    const ratio = (pageHeight - 50) / imgHeight;
    pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth * ratio, pageHeight - 50);
  } else {
    pdf.addImage(imgData, 'PNG', 10, yPosition, imgWidth, imgHeight);
  }

  const generatedAt = format(new Date(), 'dd/MM/yyyy HH:mm');
  drawFooter(pdf, pageWidth, pageHeight, 1, 1, generatedAt);

  pdf.save(`timezoni-dashboard-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
