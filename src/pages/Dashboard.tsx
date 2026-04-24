import { useState } from "react";
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
import { startOfDay, endOfDay, startOfWeek, startOfMonth } from "date-fns";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Clock, Target, TrendingUp, Trophy, Timer, Filter, CalendarIcon, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportDashboardToPDF } from "@/lib/pdfExport";
import { toast } from "sonner";
import { useTimezone } from "@/hooks/useTimezone";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { formatInTz, locale: dateLocale, toTz } = useTimezone();
  const today = new Date();
  const [isExporting, setIsExporting] = useState(false);
  const [filter, setFilter] = useState<"all" | "normal" | "pomodoro">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dateRange, setDateRange] = useState<"today" | "week" | "month" | "custom">("today");
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const { data: allEntries, isLoading: entriesLoading } = useTimeEntries();
  const { data: projects } = useProjects();
  const { data: categories } = useCategories();
  const { data: goals } = useGoalsWithProgress();

  // Filter by type and category
  const filteredEntries = allEntries?.filter(e => {
    // Filter by type
    if (filter === "normal" && e.is_pomodoro) return false;
    if (filter === "pomodoro" && !e.is_pomodoro) return false;
    
    // Filter by category
    if (selectedCategory !== "all") {
      const project = projects?.find(p => p.id === e.project_id);
      if (project?.category_id !== selectedCategory) return false;
    }
    
    return true;
  }) || [];

  // Filtrar entries por período selecionado
  const getEntriesByDateRange = () => {
    switch (dateRange) {
      case "today":
        return filteredEntries.filter(e => new Date(e.start_time) >= startOfDay(today));
      case "week":
        return filteredEntries.filter(e => new Date(e.start_time) >= startOfWeek(today, { weekStartsOn: 1 }));
      case "month":
        return filteredEntries.filter(e => new Date(e.start_time) >= startOfMonth(today));
      case "custom":
        if (customStartDate && customEndDate) {
          return filteredEntries.filter(e => {
            const date = new Date(e.start_time);
            return date >= startOfDay(customStartDate) && date <= endOfDay(customEndDate);
          });
        }
        return filteredEntries;
      default:
        return filteredEntries;
    }
  };

  const rangeEntries = getEntriesByDateRange();
  const rangeTotal = rangeEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

  const todayEntries = filteredEntries.filter(e => new Date(e.start_time) >= startOfDay(today));
  const weekEntries = filteredEntries.filter(e => new Date(e.start_time) >= startOfWeek(today, { weekStartsOn: 1 }));
  const monthEntries = filteredEntries.filter(e => new Date(e.start_time) >= startOfMonth(today));

  const todayTotal = todayEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
  const weekTotal = weekEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
  const monthTotal = monthEntries.reduce((sum, e) => sum + (e.duration || 0), 0);

  // Pomodoro specific stats (also respecting category filter and date range)
  const pomodoroEntries = rangeEntries.filter(e => e.is_pomodoro && e.pomodoro_type === 'work');
  const todayPomodoros = pomodoroEntries.filter(e => new Date(e.start_time) >= startOfDay(today));
  const weekPomodoros = pomodoroEntries.filter(e => new Date(e.start_time) >= startOfWeek(today, { weekStartsOn: 1 }));

  // Pie chart data - usando rangeEntries para respeitar filtro de período
  const projectTotals = projects?.map(project => {
    // Filter projects by selected category
    if (selectedCategory !== "all" && project.category_id !== selectedCategory) {
      return null;
    }
    
    const total = rangeEntries.filter(e => e.project_id === project.id).reduce((sum, e) => sum + (e.duration || 0), 0);
    const color = project.color || project.category?.color || '#6366f1';
    return { name: project.name, value: total, color };
  }).filter((p): p is NonNullable<typeof p> => p !== null && p.value > 0).sort((a, b) => b.value - a.value).slice(0, 5) || [];

  // Label do período para exibição
  const getDateRangeLabel = () => {
    switch (dateRange) {
      case "today": return t('dashboard.today');
      case "week": return t('dashboard.this_week');
      case "month": return t('dashboard.this_month');
      case "custom":
        if (customStartDate && customEndDate) {
          return `${formatInTz(customStartDate, "dd/MM")} - ${formatInTz(customEndDate, "dd/MM")}`;
        }
        return t('dashboard.custom');
      default: return t('dashboard.period');
    }
  };

  // Bar chart data
  const barData = projectTotals.map(p => ({ 
    name: p.name.slice(0, 10), 
    hours: +(p.value / 3600).toFixed(1),
    color: p.color,
  }));

  const completedGoals = goals?.filter(g => g.status === "completed").length || 0;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportDashboardToPDF('dashboard-content', t('dashboard.title'));
      toast.success(t('common.success'));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('common.error'));
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

  return (
    <MainLayout>
      <div className="space-y-6" id="dashboard-content">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
            <p className="text-muted-foreground">{formatInTz(today, "EEEE, d 'de' MMMM")}</p>
          </div>
          
          {/* Export Button */}
          <Button onClick={handleExportPDF} disabled={isExporting} variant="outline">
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            {t('dashboard.export_pdf')}
          </Button>
        </div>
          
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
            {/* Date range filter */}
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('dashboard.period')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">{t('dashboard.today')}</SelectItem>
                  <SelectItem value="week">{t('dashboard.this_week')}</SelectItem>
                  <SelectItem value="month">{t('dashboard.this_month')}</SelectItem>
                  <SelectItem value="custom">{t('dashboard.custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom date range pickers */}
            {dateRange === "custom" && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[130px] justify-start text-left font-normal",
                        !customStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? formatInTz(customStartDate, "dd/MM/yyyy") : t('dashboard.from')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                      locale={dateLocale}
                    />
                  </PopoverContent>
                </Popover>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[130px] justify-start text-left font-normal",
                        !customEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? formatInTz(customEndDate, "dd/MM/yyyy") : t('dashboard.to')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                      locale={dateLocale}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Category filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t('dashboard.all_categories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('dashboard.all_categories')}</SelectItem>
                  {categories?.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: c.color }} 
                        />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Type filter */}
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
                    "py-2 px-3 rounded-xl border text-xs sm:text-sm font-medium transition-all text-center",
                    filter === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        {/* Período personalizado - Card de resumo */}
        {dateRange === "custom" && customStartDate && customEndDate && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('dashboard.selected_period')}</p>
                  <p className="text-lg font-semibold">
                    {formatInTz(customStartDate, "d 'de' MMMM")} - {formatInTz(customEndDate, "d 'de' MMMM")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{t('dashboard.total_time')}</p>
                  <p className="text-2xl font-bold text-primary">{formatDuration(rangeTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4">
          <Card className="text-center">
            <CardContent className="pt-6 pb-4">
              <Clock className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold">{t('dashboard.today')}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatDuration(todayTotal)}</p>
              {filter === "all" && todayPomodoros.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  🍅 {todayPomodoros.length} {t('dashboard.pomodoros')}
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card className="text-center">
            <CardContent className="pt-6 pb-4">
              <TrendingUp className="h-6 w-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-semibold">{t('dashboard.this_week')}</p>
              <p className="text-xl sm:text-2xl font-bold mt-1">{formatDuration(weekTotal)}</p>
              {filter === "all" && weekPomodoros.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  🍅 {weekPomodoros.length} {t('dashboard.pomodoros')}
                </p>
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
              {filter === "pomodoro" ? (
                <Timer className="h-6 w-6 text-primary mx-auto mb-2" />
              ) : (
                <Target className="h-6 w-6 text-primary mx-auto mb-2" />
              )}
              <p className="text-sm font-semibold">
                {filter === "pomodoro" ? t('dashboard.cycles_today') : t('dashboard.completed_goals')}
              </p>
              <p className="text-xl sm:text-2xl font-bold mt-1">
                {filter === "pomodoro" ? todayPomodoros.length : completedGoals}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.distribution_by_project')}</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              {projectTotals.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={projectTotals} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={80} 
                      label={({ name }) => name}
                    >
                      {projectTotals.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
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
                      {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
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
