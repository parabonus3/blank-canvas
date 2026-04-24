import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from "date-fns";
import { useTimezone } from "@/hooks/useTimezone";

interface DayData {
  date: string;
  hours: number;
}

interface ConsistencyCalendarProps {
  dailyData: DayData[];
}

function getColorClass(hours: number): string {
  if (hours === 0) return "bg-muted";
  if (hours < 1) return "bg-primary/20";
  if (hours < 2) return "bg-primary/40";
  if (hours < 3) return "bg-primary/60";
  if (hours < 4) return "bg-primary/80";
  if (hours < 5) return "bg-primary";
  return "bg-exceptional";
}

function getLevelLabelKey(hours: number): string {
  if (hours === 0) return "achievements.no_activity";
  if (hours < 1) return "achievements.little_progress";
  if (hours < 2) return "achievements.good_start";
  if (hours < 3) return "achievements.almost_there";
  if (hours < 4) return "achievements.goal_reached";
  if (hours < 5) return "achievements.excellent";
  return "achievements.exceptional_day";
}

export function ConsistencyCalendar({ dailyData }: ConsistencyCalendarProps) {
  const { t } = useTranslation();
  const { formatInTz } = useTimezone();
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDayOfWeek = monthStart.getDay();
  
  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    dailyData.forEach(d => {
      map.set(d.date, d.hours);
    });
    return map;
  }, [dailyData]);
  
  const previousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const nextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };
  
  const monthTotal = useMemo(() => {
    return daysInMonth.reduce((sum, day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return sum + (dataMap.get(dateStr) || 0);
    }, 0);
  }, [daysInMonth, dataMap]);
  
  const daysWithActivity = useMemo(() => {
    return daysInMonth.filter(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      return (dataMap.get(dateStr) || 0) > 0;
    }).length;
  }, [daysInMonth, dataMap]);
  
  const dayNames = [
    t('achievements.day_sun'),
    t('achievements.day_mon'),
    t('achievements.day_tue'),
    t('achievements.day_wed'),
    t('achievements.day_thu'),
    t('achievements.day_fri'),
    t('achievements.day_sat')
  ];
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg min-w-0 truncate">
            <CalendarIcon className="h-5 w-5 text-primary flex-shrink-0" />
            <span className="truncate">{t('achievements.consistency_calendar')}</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={previousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs sm:text-sm font-medium min-w-[90px] sm:min-w-[120px] text-center truncate">
              {formatInTz(currentDate, 'MMMM yyyy')}
            </span>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs text-muted-foreground font-medium">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <TooltipProvider>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDayOfWeek }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {daysInMonth.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const hours = dataMap.get(dateStr) || 0;
              const dayNumber = day.getDate();
              
              return (
                <Tooltip key={dateStr}>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "aspect-square rounded-md flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:ring-2 hover:ring-primary/50",
                        getColorClass(hours),
                        isToday(day) && "ring-2 ring-primary",
                        hours >= 3 && "text-primary-foreground"
                      )}
                    >
                      {dayNumber}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm">
                      <p className="font-bold">{formatInTz(day, 'd MMMM')}</p>
                      <p className="text-muted-foreground">{hours.toFixed(1)} {t('achievements.hours')}</p>
                      <p className="text-primary text-xs mt-1">{t(getLevelLabelKey(hours))}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
        
        {/* Legend */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 pt-3 border-t gap-2">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span>{t('achievements.less')}</span>
            <div className="w-3 h-3 rounded bg-muted" />
            <div className="w-3 h-3 rounded bg-primary/20" />
            <div className="w-3 h-3 rounded bg-primary/40" />
            <div className="w-3 h-3 rounded bg-primary/60" />
            <div className="w-3 h-3 rounded bg-primary/80" />
            <div className="w-3 h-3 rounded bg-primary" />
            <div className="w-3 h-3 rounded bg-exceptional" />
            <span>{t('achievements.more')}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">{daysWithActivity}</span> {t('achievements.active_days')} • 
            <span className="font-medium ml-1">{monthTotal.toFixed(1)}h</span> {t('achievements.total_label')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}