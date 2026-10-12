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
import { exportTimesheetPDF } from "@/lib/timesheetExport";

export function TimesheetDialog() {
  const { t, i18n } = useTranslation();
  const { timezone } = useTimezone();
  const { hasFeature } = useSubscription();
  const today = localDateKey(new Date(), timezone);
  const [start, setStart] = useState(today.slice(0,7)+"-01");
  const [end, setEnd] = useState(today);
  const chooseMonth = (month: string) => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    const [year, number] = month.split("-").map(Number);
    setStart(`${month}-01`);
    setEnd(`${month}-${String(new Date(Date.UTC(year,number,0)).getUTCDate()).padStart(2,"0")}`);
  };
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
    return [...items, { projectId: "", category, project: t("timesheet.subtotal"), seconds: items.reduce((s,r) => s+r.seconds,0), estimatedMinutes: items.reduce((s,r) => s+r.estimatedMinutes,0), sessions: 0, days: null, tasks: new Map<string,number>() }];
  });
  const csv = () => exportToCSV([...exportRows, { projectId: "", category: "", project: t("timesheet.total"), seconds: data?.seconds || 0, estimatedMinutes: 0, sessions: 0, days: data?.days || 0, tasks: new Map<string,number>() }], columns, `Timezoni-${start}-${end}`);
  const print = () => {
    if (!hasFeature("export_pdf")) return;
    exportTimesheetPDF(exportRows, columns, t("timesheet.title"), `Timezoni · ${start} – ${end} · ${timezone}`, `${t("timesheet.total")}: ${sheetDuration(data?.seconds || 0)} · ${t("timesheet.days")}: ${data?.days || 0}`, t("timesheet.estimate_note"), `Timezoni-${start}-${end}`, i18n.dir() === "rtl");
  };
  return <Dialog><DialogTrigger asChild><Button variant="outline" size="sm"><FileText className="h-4 w-4" />{t("timesheet.title")}</Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>{t("timesheet.title")}</DialogTitle></DialogHeader>
      <div><Label htmlFor="sheet-month">{t("timesheet.month")}</Label><Input id="sheet-month" type="month" onChange={e => chooseMonth(e.target.value)} /></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="min-w-0"><Label htmlFor="sheet-start">{t("timesheet.start")}</Label><Input id="sheet-start" type="date" value={start} onChange={e => setStart(e.target.value)} /></div><div className="min-w-0"><Label htmlFor="sheet-end">{t("timesheet.end")}</Label><Input id="sheet-end" type="date" value={end} onChange={e => setEnd(e.target.value)} /></div></div>
      {start > end || !start || !end ? <p role="alert">{t("timesheet.invalid")}</p> : isLoading ? <p>{t("common.loading")}</p> : isError ? <p role="alert" className="text-destructive">{t("timesheet.error")}</p> : <>
        <div className="flex flex-wrap justify-between gap-2 border-y py-3"><strong>{t("timesheet.total")}: {sheetDuration(data?.seconds || 0)}</strong><span>{t("timesheet.days")}: {data?.days || 0}</span></div>
        {!rows.length && <p className="text-muted-foreground">{t("timesheet.empty")}</p>}
        {categories.map(category => <section key={category} className="space-y-2"><h3 className="font-semibold">{category || t("timesheet.uncategorized")}</h3>{rows.filter(r => r.category === category).map(r => <div key={r.projectId} className="flex items-start justify-between gap-3 border-b py-2 text-sm"><div className="min-w-0"><p className="break-words">{r.project}</p><p className="text-xs text-muted-foreground">{t("timesheet.estimated")}: {r.estimatedMinutes ? sheetDuration(r.estimatedMinutes*60) : "—"}</p></div><span className="shrink-0 font-mono">{sheetDuration(r.seconds)}</span></div>)}<p className="text-right text-sm font-semibold">{t("timesheet.subtotal")}: {sheetDuration(rows.filter(r => r.category === category).reduce((s,r) => s+r.seconds,0))}</p></section>)}
        <p className="text-xs text-muted-foreground">{t("timesheet.estimate_note")}</p>
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" disabled={!rows.length || !hasFeature("export_pdf")} onClick={print}><FileText className="h-4 w-4" />PDF</Button><Button disabled={!rows.length || !hasFeature("export_csv")} onClick={csv}><Download className="h-4 w-4" />CSV</Button></div>
        {(!hasFeature("export_csv") || !hasFeature("export_pdf")) && <p className="text-xs text-muted-foreground">{t("timesheet.paid")}</p>}
      </>}
    </DialogContent></Dialog>;
}