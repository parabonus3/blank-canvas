import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { usePagination } from "@/hooks/usePagination";
import { PaginationControls } from "@/components/PaginationControls";
import { MainLayout } from "@/components/layout/MainLayout";
import { useTimeEntries, useDeleteTimeEntry } from "@/hooks/useTimeEntries";
import { useProjects } from "@/hooks/useProjects";
import { useTags } from "@/hooks/useTags";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Trash2, Download, Calendar, Timer, FileText, Loader2, Plus, Tag as TagIcon, Lock } from "lucide-react";
import { startOfDay, startOfWeek, startOfMonth, format } from "date-fns";
import { exportHistoryToPDF } from "@/lib/pdfExport";
import { toast } from "sonner";
import { useTimezone } from "@/hooks/useTimezone";
import { ManualTimeEntryDialog } from "@/components/ManualTimeEntryDialog";

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function History() {
  const { t } = useTranslation();
  const { formatInTz, timezone } = useTimezone();
  const { hasFeature } = useSubscription();
  const canExportCSV = hasFeature("export_csv");
  const canExportPDF = hasFeature("export_pdf");
  const [filter, setFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "normal" | "pomodoro">("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const { data: entries, isLoading } = useTimeEntries();
  const { data: projects } = useProjects();
  const { data: tags = [] } = useTags();
  const deleteEntry = useDeleteTimeEntry();

  // Fetch all entry-tag mappings
  const [entryTagMap, setEntryTagMap] = useState<Record<string, { id: string; name: string; color: string }[]>>({});

  useEffect(() => {
    if (!entries || entries.length === 0) return;
    const entryIds = entries.filter(e => e.end_time).map(e => e.id);
    if (entryIds.length === 0) return;

    supabase
      .from("time_entry_tags" as any)
      .select("time_entry_id, tag:tags(id, name, color)")
      .in("time_entry_id", entryIds)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, { id: string; name: string; color: string }[]> = {};
        (data as any[]).forEach((row: any) => {
          if (!map[row.time_entry_id]) map[row.time_entry_id] = [];
          if (row.tag) map[row.time_entry_id].push(row.tag);
        });
        setEntryTagMap(map);
      });
  }, [entries]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onManualEntry: () => setShowManualEntry(true),
  });

  const today = new Date();
  
  const filteredEntries = entries?.filter(e => {
    const entryDate = new Date(e.start_time);
    let dateMatch = true;
    
    if (filter === "today") dateMatch = entryDate >= startOfDay(today);
    else if (filter === "week") dateMatch = entryDate >= startOfWeek(today, { weekStartsOn: 1 });
    else if (filter === "month") dateMatch = entryDate >= startOfMonth(today);
    
    const projectMatch = projectFilter === "all" || e.project_id === projectFilter;
    
    // Type filter
    let typeMatch = true;
    if (typeFilter === "normal") typeMatch = !e.is_pomodoro;
    if (typeFilter === "pomodoro") typeMatch = e.is_pomodoro;

    // Tag filter
    let tagMatch = true;
    if (tagFilter !== "all") {
      const entryTags = entryTagMap[e.id] || [];
      tagMatch = entryTags.some(t => t.id === tagFilter);
    }
    
    return dateMatch && projectMatch && typeMatch && tagMatch && e.end_time;
  }) || [];

  const totalDuration = filteredEntries.reduce((sum, e) => sum + (e.duration || 0), 0);
  const pagination = usePagination(filteredEntries, 15);

  const getFilterLabel = () => {
    switch (filter) {
      case "today": return t('history.today');
      case "week": return t('history.this_week');
      case "month": return t('history.this_month');
      default: return t('history.all_period');
    }
  };

  const exportCSV = () => {
    const headers = [t('history.project'), t('history.category'), t('history.type'), t('history.start'), t('history.end'), t('history.duration')];
    const rows = filteredEntries.map(e => [
      e.project?.name || "",
      e.project?.category?.name || "",
      e.is_pomodoro ? `Pomodoro (${e.pomodoro_type || 'work'})` : t('history.normal'),
      formatInTz(new Date(e.start_time), "dd/MM/yyyy HH:mm"),
      e.end_time ? formatInTz(new Date(e.end_time), "dd/MM/yyyy HH:mm") : "",
      formatDuration(e.duration || 0),
    ]);
    
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `timetracker-${format(today, "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const exportPDF = async () => {
    setIsExporting(true);
    try {
      const pdfData = {
        entries: filteredEntries.map(e => ({
          projectName: e.project?.name || '',
          categoryName: e.project?.category?.name || '',
          categoryColor: e.project?.category?.color || '#9ca3af',
          type: e.is_pomodoro 
            ? (e.pomodoro_type === 'work' ? t('history.focus') : 
               e.pomodoro_type === 'short_break' ? t('history.break') : 
               e.pomodoro_type === 'long_break' ? t('history.long_break') : 'Pomodoro')
            : t('history.normal'),
          startTime: formatInTz(new Date(e.start_time), "dd/MM HH:mm"),
          endTime: e.end_time ? formatInTz(new Date(e.end_time), "dd/MM HH:mm") : '',
          duration: formatDuration(e.duration || 0),
        })),
        filters: {
          period: getFilterLabel(),
          project: projectFilter === "all" ? '' : projects?.find(p => p.id === projectFilter)?.name || '',
          type: typeFilter === "all" ? '' : typeFilter === "pomodoro" ? "Pomodoro" : t('history.normal')
        },
        totalDuration: formatDuration(totalDuration),
        sessionCount: filteredEntries.length,
        title: t('history.title'),
        subtitle: t('history.generated_at')
      };

      await exportHistoryToPDF(pdfData);
      toast.success(t('common.success'));
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error(t('common.error'));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 min-w-0 max-w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('history.title')}</h1>
            <p className="text-muted-foreground">{t('history.subtitle')}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setShowManualEntry(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 sm:me-2" />
              <span className="hidden sm:inline">{t('history.add_manual_entry')}</span>
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button onClick={exportPDF} disabled={filteredEntries.length === 0 || isExporting || !canExportPDF} variant="outline" size="sm">
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 sm:me-2 animate-spin" />
                      ) : !canExportPDF ? (
                        <Lock className="h-4 w-4 sm:me-2" />
                      ) : (
                        <FileText className="h-4 w-4 sm:me-2" />
                      )}
                      <span className="hidden sm:inline">{t('history.export_pdf')}</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canExportPDF && <TooltipContent>{t('pricing.feature_export_pdf')} — Premium</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button onClick={exportCSV} disabled={filteredEntries.length === 0 || !canExportCSV} size="sm">
                      {!canExportCSV ? (
                        <Lock className="h-4 w-4 sm:me-2" />
                      ) : (
                        <Download className="h-4 w-4 sm:me-2" />
                      )}
                      <span className="hidden sm:inline">{t('history.export_csv')}</span>
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canExportCSV && <TooltipContent>{t('pricing.feature_export_csv')} — Pro+</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:flex-wrap gap-3 sm:gap-4">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('history.all_period')}</SelectItem>
              <SelectItem value="today">{t('history.today')}</SelectItem>
              <SelectItem value="week">{t('history.this_week')}</SelectItem>
              <SelectItem value="month">{t('history.this_month')}</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder={t('history.project')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('history.all_projects')}</SelectItem>
              {projects?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger className="w-full sm:w-40">
              <Timer className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('history.all_types')}</SelectItem>
              <SelectItem value="normal">{t('history.normal')}</SelectItem>
              <SelectItem value="pomodoro">🍅 {t('timer.pomodoro')}</SelectItem>
            </SelectContent>
          </Select>

          {tags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <TagIcon className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('tags.all_tags')}</SelectItem>
                {tags.map(tag => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Summary Card */}
        {filteredEntries.length > 0 && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center justify-between min-w-0 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('history.total_time')}</p>
                  <p className="text-2xl font-bold text-primary">{formatDuration(totalDuration)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{t('history.sessions_count', { count: filteredEntries.length })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop Table */}
        <Card className="hidden sm:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('history.project')}</TableHead>
                  <TableHead>{t('history.type')}</TableHead>
                   <TableHead>{t('history.start')}</TableHead>
                   <TableHead>{t('history.end')}</TableHead>
                   <TableHead>{t('history.duration')}</TableHead>
                   <TableHead>{t('notes.title')}</TableHead>
                   <TableHead>{t('tags.title')}</TableHead>
                   <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagination.paginatedItems.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {entry.project?.category && (
                          <span 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: entry.project.category.color }} 
                          />
                        )}
                        {entry.project?.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.is_pomodoro ? (
                        <Badge variant="secondary" className="text-xs">
                          🍅 {entry.pomodoro_type === 'work' ? t('history.focus') : 
                              entry.pomodoro_type === 'short_break' ? t('history.break') : 
                              entry.pomodoro_type === 'long_break' ? t('history.long_break') : t('timer.pomodoro')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">{t('history.normal')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>{formatInTz(new Date(entry.start_time), "dd/MM HH:mm")}</TableCell>
                    <TableCell>{entry.end_time && formatInTz(new Date(entry.end_time), "dd/MM HH:mm")}</TableCell>
                    <TableCell className="font-mono">{formatDuration(entry.duration || 0)}</TableCell>
                    <TableCell>
                      {entry.notes && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-xs text-muted-foreground truncate block max-w-[120px] text-left hover:text-foreground transition-colors cursor-pointer">
                              📝 {entry.notes}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="max-w-xs sm:max-w-sm whitespace-pre-wrap text-sm">
                            {entry.notes}
                          </PopoverContent>
                        </Popover>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(entryTagMap[entry.id] || []).map(tag => (
                          <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0" style={{ borderLeft: `3px solid ${tag.color}` }}>
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteEntry.mutate(entry.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredEntries.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {t('history.no_sessions')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mobile Cards */}
        <div className="sm:hidden space-y-3">
          {pagination.paginatedItems.map(entry => (
            <Card key={entry.id}>
              <CardContent className="p-4 min-w-0">
                <div className="flex items-start justify-between mb-2 min-w-0 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {entry.project?.category && (
                      <span 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: entry.project.category.color }} 
                      />
                    )}
                    <span className="font-medium text-sm truncate">{entry.project?.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => deleteEntry.mutate(entry.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 mb-2 flex-wrap min-w-0">
                  {entry.is_pomodoro ? (
                    <Badge variant="secondary" className="text-xs">
                      🍅 {entry.pomodoro_type === 'work' ? t('history.focus') : 
                          entry.pomodoro_type === 'short_break' ? t('history.break') : 
                          entry.pomodoro_type === 'long_break' ? t('history.long_break') : t('timer.pomodoro')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">{t('history.normal')}</Badge>
                  )}
                  <span className="font-mono text-sm font-bold text-primary ml-auto">
                    {formatDuration(entry.duration || 0)}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span>{formatInTz(new Date(entry.start_time), "dd/MM HH:mm")}</span>
                  <span>→</span>
                  <span>{entry.end_time && formatInTz(new Date(entry.end_time), "dd/MM HH:mm")}</span>
                </div>
                {entry.notes && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-xs text-muted-foreground mt-1 truncate max-w-full text-left hover:text-foreground transition-colors cursor-pointer block">
                        📝 {entry.notes}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="max-w-[calc(100vw-2rem)] sm:max-w-sm whitespace-pre-wrap text-sm">
                      {entry.notes}
                    </PopoverContent>
                  </Popover>
                )}
                {(entryTagMap[entry.id] || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {entryTagMap[entry.id].map(tag => (
                      <Badge key={tag.id} variant="secondary" className="text-[10px] px-1.5 py-0" style={{ borderLeft: `3px solid ${tag.color}` }}>
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {filteredEntries.length === 0 && !isLoading && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t('history.no_sessions')}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pagination */}
        {filteredEntries.length > 0 && (
          <PaginationControls
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            setCurrentPage={pagination.setCurrentPage}
            setPageSize={pagination.setPageSize}
            pageSizeOptions={[15, 30, 50]}
          />
        )}

        <ManualTimeEntryDialog
          open={showManualEntry}
          onOpenChange={setShowManualEntry}
        />
      </div>
    </MainLayout>
  );
}
