import jsPDF from "jspdf";
import type { ExportColumn } from "./exportTable";

/** Canvas text uses browser Unicode shaping so non-Latin project names remain readable. */
export function exportTimesheetPDF<T>(rows: T[], columns: ExportColumn<T>[], title: string, subtitle: string, summary: string, note: string, filename: string, rtl = false) {
  const doc = new jsPDF();
  const canvas = document.createElement("canvas");
  canvas.width = 1240; canvas.height = 1754;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  const margin = 80;
  const colWidth = (canvas.width - margin * 2) / columns.length;
  let y = 0;
  let page = 1;
  const line = (value: string, x: number, position: number, width: number) => {
    context.direction = rtl ? "rtl" : "ltr";
    context.textAlign = rtl ? "right" : "left";
    let remaining = value;
    let count = 0;
    while (remaining && count < 8) {
      let length = remaining.length;
      while (length > 1 && context.measureText(remaining.slice(0,length)).width > width) length--;
      context.fillText(remaining.slice(0,length), rtl ? x + width : x, position + count*30);
      remaining = remaining.slice(length); count++;
    }
    return Math.max(1,count)*30;
  };
  const begin = () => {
    context.fillStyle = "#ffffff"; context.fillRect(0,0,canvas.width,canvas.height);
    context.fillStyle = "#111827"; context.font = "bold 34px sans-serif";
    line(title,margin,100,canvas.width-margin*2);
    context.font = "22px sans-serif";
    line(subtitle,margin,155,canvas.width-margin*2);
    line(summary,margin,200,canvas.width-margin*2);
    context.font = "bold 22px sans-serif";
    columns.forEach((c,i) => line(c.header, margin+i*colWidth,260,colWidth-15));
    y = 335;
  };
  const finish = () => {
    context.font = "18px sans-serif";
    line(`${page}`,margin,canvas.height-55,canvas.width-margin*2);
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297);
  };
  begin();
  for (const row of rows) {
    if (y > canvas.height-350) { finish(); doc.addPage(); page++; begin(); }
    context.font = "22px sans-serif";
    let height = 30;
    columns.forEach((c,i) => { height = Math.max(height, line(String(c.accessor(row) ?? ""),margin+i*colWidth,y,colWidth-15)); });
    y += height + 24;
    context.strokeStyle = "#d1d5db"; context.beginPath(); context.moveTo(margin,y-12); context.lineTo(canvas.width-margin,y-12); context.stroke();
  }
  if (y > canvas.height-200) { finish(); doc.addPage(); page++; begin(); }
  context.font = "18px sans-serif"; line(note,margin,y+30,canvas.width-margin*2);
  finish(); doc.save(`${filename}.pdf`);
}