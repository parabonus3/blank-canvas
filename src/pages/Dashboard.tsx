import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useTimeEntries } from "@/hooks/useTimeEntries";
import { useProjects, useCategories } from "@/hooks/useProjects";
import { useGoalsWithProgress } from "@/hooks/useGoals";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Clock, Target, TrendingUp, Trophy, Timer, Filter, CalendarIcon, FileText, Loader2, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportDashboardStructuredPDF } from "@/lib/pdfExport";
import { toast } from "sonner";
import { useTimezone } from "@/hooks/useTimezone";
import { startOfDayInTz, endOfDayInTz, startOfWeekInTz, startOfMonthInTz } from "@/lib/timezone";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

type DateRange =
  | "today"
  | "yesterday"
  | "last_7_days"
  | "last_30_days"
  | "week"
  | "last_week"
  | "month"
  | "last_month"
  | "year"
  | "custom";

export default function Dashboard() {
  const { t } = useTranslation();
  const { formatInTz, locale: dateLocale, timezone } = useTimezone();
  const today = new Date();
  const [isExporting, setIsExporting] = useState(false);
  const [filter, setFilter] = useState<"all" | "normal" | "pomodoro">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("today");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const { data: allEntries, isLoading: entriesLoading } = useTimeEntries();
  const { data: projects } = useProjects();
  const { data: categories } = useCategories();
  const { data: goals } = useGoalsWithProgress();

  // Filter by type, category, and project
  const filteredEntries = (allEntries?.filter(e => {
    if (filter === "normal" && e.is_pomodoro) return false;
    if (filter === "pomodoro" && !e.is_pomodoro) return false;
    if (selectedCategory !== "all") {
      const project = projects?.find(p => p.id === e.project_id);
      if (project?.category_id !== selectedCategory) return false;
    }
    if (selectedProjectId !== "all" && e.project_id !== selectedProjectId) return false;
    return true;
  }) || []);

  const todayStartUtc = startOfDayInTz(today, timezone);
  const weekStartUtc = startOfWeekInTz(today, timezone);
  const monthStartUtc = startOfMonthInTz(today, timezone);

  // Compute current period range as { startUtc, endUtc, startLocal, endLocal }
  const periodRange = useMemo(() => {
    const endOfToday = endOfDayInTz(today, timezone);
    switch (dateRange) {
      case "today":
        return { start: todayStartUtc, end: endOfToday };
      case "yesterday": {
        const y = new Date(today); y.setDate(y.getDate() - 1);
        return { start: startOfDayInTz(y, timezone), end: endOfDayInTz(y, timezone) };
      }
      case "last_7_days": {
        const s = new Date(today); s.setDate(s.getDate() - 6);
        return { start: startOfDayInTz(s, timezone), end: endOfToday };
      }
      case "last_30_days": {
        const s = new Date(today); s.setDate(s.getDate() - 29);
        return { start: startOfDayInTz(s, timezone), end: endOfToday };
      }
      case "week":
        return { start: weekStartUtc, end: endOfToday };
      case "last_week": {
        const s = new Date(weekStartUtc); s.setDate(s.getDate() - 7);
        const e = new Date(weekStartUtc); e.setMilliseconds(e.getMilliseconds() - 1);
        return { start: s, end: e };
      }
      case "month":
        return { start: monthStartUtc, end: endOfToday };
      case "last_month": {
        const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const e = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
        return { start: startOfDayInTz(s, timezone), end: endOfDayInTz(e, timezone) };
      }
      case "year": {
        const s = new Date(today.getFullYear(), 0, 1);
        return { start: startOfDayInTz(s, timezone), end: endOfToday };
      }
      case "custom":
        if (customStartDate && customEndDate) {
          return { start: startOfDayInTz(customStartDate, timezone), end: endOfDayInTz(customEndDate, timezone) };
        }
        return { start: todayStartUtc, end: endOfToday };
      default:
        return { start: todayStartUtc, end: endOfToday };
    }
  }, [dateRange, customStartDate, customEndDate, timezone, today.toDateString()]);

  const rangeEntries = filteredEntries.filter(e => {
    const d = new Date(e.start_time);
    return d >= periodRange.start && d <= periodRange.end;
  });
  const rangeTotal = rangeEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

  const todayEntries = filteredEntries.filter(e => new Date(e.start_time) >= todayStartUtc);
  const weekEntries = filteredEntries.filter(e => new Date(e.start_time) >= weekStartUtc);
  const monthEntries = filteredEntries.filter(e => new Date(e.start_time) >= monthStartUtc);
  const todayTotal = todayEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
  const weekTotal = weekEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
  const monthTotal = monthEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

  const pomodoroEntries = rangeEntries.filter(e => e.is_pomodoro && e.pomodoro_type === 'work');
  const todayPomodoros = pomodoroEntries.filter(e => new Date(e.start_time) >= todayStartUtc);
  const weekPomodoros = pomodoroEntries.filter(e => new Date(e.start_time) >= weekStartUtc);

  // Pie chart - aggregated per project
  const projectTotals = projects?.map(project => {
    if (selectedCategory !== "all" && project.category_id !== selectedCategory) return null;
    if (selectedProjectId !== "all" && project.id !== selectedProjectId) return null;
    const projectEntries = rangeEntries.filter(e => e.project_id === project.id);
    const total = projectEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
    const color = project.color || project.category?.color || '#6366f1';
    return { id: project.id, name: project.name, value: total, color, sessions: projectEntries.length, category: project.category };
  }).filter((p): p is NonNullable<typeof p> => p !== null && p.value > 0).sort((a, b) => b.value - a.value) || [];

  const totalForPercent = projectTotals.reduce((s, p) => s + p.value, 0) || 1;

  const projectsTop5 = projectTotals.slice(0, 5);
  const barData = projectsTop5.map(p => ({ name: p.name.slice(0, 10), hours: +(p.value / 3600).toFixed(1), color: p.color }));

  const completedGoals = goals?.filter(g => g.status === "completed").length || 0;

  // Date range label + range string
  const dateRangeKey: Record<DateRange, string> = {
    today: "dashboard.today",
    yesterday: "dashboard.yesterday",
    last_7_days: "dashboard.last_7_days",
    last_30_days: "dashboard.last_30_days",
    week: "dashboard.this_week",
    last_week: "dashboard.last_week",
    month: "dashboard.this_month",
    last_month: "dashboard.last_month",
    year: "dashboard.this_year",
    custom: "dashboard.custom",
  };
  const periodLabel = t(dateRangeKey[dateRange]);
  const periodRangeText = `${formatInTz(periodRange.start, "dd/MM/yyyy")} — ${formatInTz(periodRange.end, "dd/MM/yyyy")}`;
  const periodDays = Math.max(1, Math.round((periodRange.end.getTime() - periodRange.start.getTime()) / (1000 * 60 * 60 * 24)));

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      // Build category totals
      const catMap = new Map<string, { name: string; color: string; seconds: number }>();
      rangeEntries.forEach(e => {
        const p = projects?.find(pp => pp.id === e.project_id);
        const cat = p?.category;
        const key = cat?.id || "__none__";
        const cur = catMap.get(key) || { name: cat?.name || t("dashboard.pdf_no_category"), color: cat?.color || "#9ca3af", seconds: 0 };
        cur.seconds += e.duration || 0;
        catMap.set(key, cur);
      });
      const totalCat = Array.from(catMap.values()).reduce((s, c) => s + c.seconds, 0) || 1;
      const byCategory = Array.from(catMap.values()).sort((a, b) => b.seconds - a.seconds).map(c => ({
        ...c, percentage: (c.seconds / totalCat) * 100,
      }));

      // Daily breakdown
      const dayMap = new Map<string, { seconds: number; sessions: number }>();
      rangeEntries.forEach(e => {
        const key = formatInTz(new Date(e.start_time), "yyyy-MM-dd");
        const cur = dayMap.get(key) || { seconds: 0, sessions: 0 };
        cur.seconds += e.duration || 0;
        cur.sessions += 1;
        dayMap.set(key, cur);
      });
      const byDay = Array.from(dayMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([k, v]) => ({ day: formatInTz(new Date(k + "T00:00:00"), "dd/MM/yyyy"), seconds: v.seconds, sessions: v.sessions }));

      const categoryLabel = selectedCategory === "all"
        ? t("dashboard.all_categories")
        : categories?.find(c => c.id === selectedCategory)?.name || "—";
      const typeLabel = filter === "all" ? t("dashboard.all") : filter === "normal" ? t("timer.normal") : t("timer.pomodoro");

      await exportDashboardStructuredPDF({
        generatedAt: formatInTz(new Date(), "dd/MM/yyyy HH:mm"),
        periodLabel,
        periodRange: `${periodRangeText} · ${t("dashboard.period_days", { count: periodDays })}`,
        categoryLabel,
        typeLabel,
        totals: {
          todayLabel: t("dashboard.today"), todayValue: formatDuration(todayTotal),
          weekLabel: t("dashboard.this_week"), weekValue: formatDuration(weekTotal),
          monthLabel: t("dashboard.this_month"), monthValue: formatDuration(monthTotal),
          completedGoalsLabel: t("dashboard.completed_goals"), completedGoalsValue: String(completedGoals),
        },
        byProject: projectTotals.map(p => ({
          name: p.name,
          categoryName: p.category?.name || "",
          sessions: p.sessions,
          seconds: p.value,
          percentage: (p.value / totalForPercent) * 100,
          color: p.color,
        })),
        byCategory,
        byDay,
        i18n: {
          title: t("dashboard.pdf_title"),
          generatedOn: t("dashboard.pdf_generated_at"),
          filterSummary: t("dashboard.pdf_filter_summary"),
          periodHeader: t("dashboard.period"),
          categoryHeader: t("dashboard.category_label"),
          typeHeader: t("dashboard.type_label"),
          byProject: t("dashboard.pdf_by_project"),
          byCategory: t("dashboard.pdf_by_category"),
          dailyBreakdown: t("dashboard.pdf_daily_breakdown"),
          sessions: t("dashboard.pdf_sessions"),
          percentage: t("dashboard.pdf_percentage"),
          projectCol: t("dashboard.pdf_project_col"),
          categoryCol: t("dashboard.pdf_category_col"),
          timeCol: t("dashboard.pdf_time_col"),
          dayCol: t("dashboard.pdf_day_col"),
          totalCol: t("dashboard.pdf_total_col"),
          noCategory: t("dashboard.pdf_no_category"),
          footer: t("dashboard.pdf_footer"),
          pageOf: (page, total) => t("dashboard.page_of", { page, total }),
        },
      }, "dashboard-charts");
      toast.success(t("common.success"));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t("common.error"));
    } finally {
      setIsExporting(false);
    }
  };

  if (entriesLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Filter projects shown in dropdown (respect category filter)
  const projectsForDropdown = projects?.filter(p => selectedCategory === "all" || p.category_id === selectedCategory) || [];

  return (
    <MainLayout>
      <div className="space-y-6" id="dashboard-content">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
            <p className="text-muted-foreground">{formatInTz(today, "EEEE, d 'de' MMMM")}</p>
          </div>
          <Button onClick={handleExportPDF} disabled={isExporting} variant="outline" className="w-full sm:w-auto">
            {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            {t('dashboard.export_pdf')}
          </Button>
        </div>

        {/* Period visible line */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-3 px-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold text-foreground">{t('dashboard.period')}:</span>
                <span className="text-muted-foreground">{periodLabel}</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-mono text-foreground">{periodRangeText}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{t('dashboard.period_days', { count: periodDays })}</span>
              </div>
              <div className="font-bold text-primary tabular-nums">{formatDuration(rangeTotal)}</div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('dashboard.period')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">{t('dashboard.today')}</SelectItem>
                <SelectItem value="yesterday">{t('dashboard.yesterday')}</SelectItem>
                <SelectItem value="last_7_days">{t('dashboard.last_7_days')}</SelectItem>
                <SelectItem value="last_30_days">{t('dashboard.last_30_days')}</SelectItem>
                <SelectItem value="week">{t('dashboard.this_week')}</SelectItem>
                <SelectItem value="last_week">{t('dashboard.last_week')}</SelectItem>
                <SelectItem value="month">{t('dashboard.this_month')}</SelectItem>
                <SelectItem value="last_month">{t('dashboard.last_month')}</SelectItem>
                <SelectItem value="year">{t('dashboard.this_year')}</SelectItem>
                <SelectItem value="custom">{t('dashboard.custom')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange === "custom" && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !customStartDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? formatInTz(customStartDate, "dd/MM/yyyy") : t('dashboard.from')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} initialFocus locale={dateLocale} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-[140px] justify-start text-left font-normal", !customEndDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEndDate ? formatInTz(customEndDate, "dd/MM/yyyy") : t('dashboard.to')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} initialFocus locale={dateLocale} />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedCategory} onValueChange={(v) => { setSelectedCategory(v); setSelectedProjectId("all"); }}>
              <SelectTrigger className="w-full sm:w-[170px]">
                <SelectValue placeholder={t('dashboard.all_categories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.all_categories')}</SelectItem>
                {categories?.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                      {c.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('dashboard.all_projects')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('dashboard.all_projects')}</SelectItem>
                {projectsForDropdown.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color || p.category?.color || '#6366f1' }} />
                      {p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
            {[
              { value: "all" as const, label: t('dashboard.all') },
              { value: "normal" as const, label: t('timer.normal') },
              { value: "pomodoro" as const, label: `🍅 ${t('timer.pomodoro')}` },
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setFilter(opt.value)}
                className={cn(
                  "py-2 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all text-center min-h-[44px]",
                  filter === opt.value ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/40"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="text-center">
            <CardContent className="pt-6 pb-4">
              <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold">{t('dashboard.today')}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatDuration(todayTotal)}</p>
              {filter === "all" && todayPomodoros.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">🍅 {todayPomodoros.length} {t('dashboard.pomodoros')}</p>
              )}
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6 pb-4">
              <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold">{t('dashboard.this_week')}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatDuration(weekTotal)}</p>
              {filter === "all" && weekPomodoros.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">🍅 {weekPomodoros.length} {t('dashboard.pomodoros')}</p>
              )}
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6 pb-4">
              <Trophy className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold">{t('dashboard.this_month')}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatDuration(monthTotal)}</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-6 pb-4">
              {filter === "pomodoro" ? <Timer className="h-6 w-6 text-primary mx-auto mb-2" /> : <Target className="h-6 w-6 text-primary mx-auto mb-2" />}
              <p className="text-sm font-semibold">{filter === "pomodoro" ? t('dashboard.cycles_today') : t('dashboard.completed_goals')}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{filter === "pomodoro" ? todayPomodoros.length : completedGoals}</p>
            </CardContent>
          </Card>
        </div>

        <FocusReportCard />


        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2" id="dashboard-charts">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.distribution_by_project')}</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {projectsTop5.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={projectsTop5} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name}>
                      {projectsTop5.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatDuration(v)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center mt-20">{t('dashboard.no_data')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.hours_by_project')}</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <XAxis dataKey="name" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-center mt-20">{t('dashboard.no_data')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
