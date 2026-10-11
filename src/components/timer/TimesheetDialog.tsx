import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTimezone } from "@/hooks/useTimezone";
import { useTimesheet } from "@/hooks/useTimesheet";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { localDateKey, sheetDuration } from "@/lib/timesheet";
import { exportToCSV } from "@/lib/exportTable";

export function TimesheetDialog() {
  const { t } = useTranslation();
  const { timezone } = useTimezone();
  const { hasFeature } = useSubscription();
  const today = localDateKey(new Date(), timezone);
  const [start, setStart] = useState(today.slice(0,7)+"-01");
  const [end, setEnd] = useState(today);
  const { data, isLoading, isError } = useTimesheet(start, end, timezone);
  const rows = data?.rows || [];
  const columns = [
    { header: t("timesheet.category"), accessor: (r: typeof rows[number]) => r.category || t("timesheet.uncategorized") },
    { header: t("timesheet.project"), accessor: (r: typeof rows[number]) => r.project || "—" },
    { header: t("timesheet.actual"), accessor: (r: typeof rows[number]) => sheetDuration(r.seconds) },
    { header: t("timesheet.estimated"), accessor: (r: typeof rows[number]) => r.estimatedMinutes ? sheetDuration(r.estimatedMinutes*60) : "—" },
    { header: t("timesheet.days"), accessor: (r: typeof rows[number]) => r.days },
  ];
  const categories = [...new Set(rows.map(r => r.category))];
  const exportRows = categories.flatMap(category => {
    const items = rows.filter(r => r.category === category);
    return [...items, { projectId: "", category, project: t("timesheet.subtotal"), seconds: items.reduce((s,r) => s+r.seconds,0), estimatedMinutes: items.reduce((s,r) => s+r.estimatedMinutes,0), sessions: 0, days: 0, tasks: new Map<string,number>() }];
  });
  const csv = () => exportToCSV([...exportRows, { projectId: "", category: "", project: t("timesheet.total"), seconds: data?.seconds || 0, estimatedMinutes: 0, sessions: 0, days: data?.days || 0, tasks: new Map<string,number>() }], columns, `Timezoni-${start}-${end}`);
  const print = () => {
    // Browser print preserves all 12 scripts/fonts; users can save a paginated PDF.
    const win = window.open("", "_blank");
    if (!win) return;
    const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c));
    win.document.write(`<!doctype html><html><head><title>Timezoni ${start} ${end}</title><style>body{font:14px sans-serif;margin:30px}table{width:100%;border-collapse:collapse}td,th{padding:9px;text-align:start;border-bottom:1px solid #ddd}thead{display:table-header-group}tr{break-inside:avoid}@page{size:A4;margin:15mm}</style></head><body><h1>${escape(t("timesheet.title"))}</h1><p>Timezoni · ${start} – ${end} · ${escape(timezone)}</p><p>${escape(t("timesheet.total"))}: ${sheetDuration(data?.seconds || 0)} · ${escape(t("timesheet.days"))}: ${data?.days || 0}</p><table><thead><tr>${columns.map(c => `<th>${escape(c.header)}</th>`).join("")}</tr></thead><tbody>${exportRows.map(r => `<tr>${columns.map(c => `<td>${escape(String(c.accessor(r)))}</td>`).join("")}</tr>`).join("")}</tbody></table><p>${escape(t("timesheet.estimate_note"))}</p></body></html>`);
    win.document.close(); win.focus(); win.print();
  };
  return <Dialog><DialogTrigger asChild><Button variant="outline" size="sm"><FileText className="h-4 w-4" />{t("timesheet.title")}</Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{t("timesheet.title")}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="sheet-start">{t("timesheet.start")}</Label><Input id="sheet-start" type="date" value={start} onChange={e => setStart(e.target.value)} /></div><div><Label htmlFor="sheet-end">{t("timesheet.end")}</Label><Input id="sheet-end" type="date" value={end} onChange={e => setEnd(e.target.value)} /></div></div>
      {start > end || !start || !end ? <p role="alert">{t("timesheet.invalid")}</p> : isLoading ? <p>{t("common.loading")}</p> : isError ? <p role="alert" className="text-destructive">{t("timesheet.error")}</p> : <>
        <div className="flex flex-wrap justify-between gap-2 border-y py-3"><strong>{t("timesheet.total")}: {sheetDuration(data?.seconds || 0)}</strong><span>{t("timesheet.days")}: {data?.days || 0}</span></div>
        {!rows.length && <p className="text-muted-foreground">{t("timesheet.empty")}</p>}
        {categories.map(category => <section key={category} className="space-y-2"><h3 className="font-semibold">{category || t("timesheet.uncategorized")}</h3>{rows.filter(r => r.category === category).map(r => <div key={r.projectId} className="flex items-start justify-between gap-3 border-b py-2 text-sm"><div className="min-w-0"><p className="break-words">{r.project}</p><p className="text-xs text-muted-foreground">{t("timesheet.estimated")}: {r.estimatedMinutes ? sheetDuration(r.estimatedMinutes*60) : "—"}</p></div><span className="shrink-0 font-mono">{sheetDuration(r.seconds)}</span></div>)}<p className="text-right text-sm font-semibold">{t("timesheet.subtotal")}: {sheetDuration(rows.filter(r => r.category === category).reduce((s,r) => s+r.seconds,0))}</p></section>)}
        <p className="text-xs text-muted-foreground">{t("timesheet.estimate_note")}</p>
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" disabled={!rows.length || !hasFeature("export_pdf")} onClick={print}><FileText className="h-4 w-4" />PDF</Button><Button disabled={!rows.length || !hasFeature("export_csv")} onClick={csv}><Download className="h-4 w-4" />CSV</Button></div>
        {!hasFeature("export_csv") && <p className="text-xs text-muted-foreground">{t("timesheet.paid")}</p>}
      </>}
    </DialogContent></Dialog>;
}