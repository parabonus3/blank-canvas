import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useStreakFreeze } from "@/hooks/useStreakFreeze";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  useEnhancedAnnualProgress, 
  useTodayHours, 
  useDailyData,
  useEnhancedMonthlyBreakdown 
} from "@/hooks/useEnhancedAchievements";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Trophy, Target, Clock, TrendingUp, Calendar, Sparkles, Eye, ArrowLeft, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { EnhancedGrowthTree } from "@/components/achievements/EnhancedGrowthTree";
import { DailyProgressCard } from "@/components/achievements/DailyProgressCard";
import { TreePhaseIndicator } from "@/components/achievements/TreePhaseIndicator";
import { ConsistencyCalendar } from "@/components/achievements/ConsistencyCalendar";
import { UnlockedAchievements } from "@/components/achievements/UnlockedAchievements";
import { getCurrentMilestone, TREE_PHASES, LEVEL_MILESTONES } from "@/lib/treeConfig";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Lock } from "lucide-react";
import { Link } from "react-router-dom";

export default function Achievements() {
  const { t } = useTranslation();
   const { hasFeature } = useSubscription();
   const { data: progress, isLoading } = useEnhancedAnnualProgress();
   const { data: todayHours = 0 } = useTodayHours();
   const { data: monthlyData } = useEnhancedMonthlyBreakdown();
   const { data: dailyData = [] } = useDailyData();
   const [viewingPhase, setViewingPhase] = useState<string | null>(null);
   const [viewingMilestoneLevel, setViewingMilestoneLevel] = useState<number | null>(null);
   const { remaining, used, total, hasFreezes } = useStreakFreeze();
   const currentLevel = progress?.level || 0;

   // Navigation through unlocked milestones (must be before early return)
   const unlockedMilestones = useMemo(() => 
     LEVEL_MILESTONES.filter(m => m.level <= currentLevel), 
     [currentLevel]
   );

  if (!hasFeature("achievements")) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center">
          <Lock className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-2xl font-bold">{t('achievements.title')}</h2>
          <p className="text-muted-foreground max-w-md">{t('pricing.feature_locked_desc')}</p>
          <Button asChild>
            <Link to="/pricing">{t('rooms.upgrade_for_more')}</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  if (isLoading) {
    return (
      <MainLayout>
         <div className="space-y-6 p-4">
           <div className="flex justify-between items-center">
             <Skeleton className="h-10 w-48" />
             <Skeleton className="h-10 w-32" />
           </div>
           <div className="grid gap-6 lg:grid-cols-2">
             <Skeleton className="h-[500px]" />
             <div className="space-y-4">
               <Skeleton className="h-[200px]" />
               <Skeleton className="h-[280px]" />
             </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Calculate stats
  const currentDate = new Date();
  const dayOfYear = Math.floor((currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const avgHoursPerDay = progress?.totalHours && dayOfYear > 0 ? progress.totalHours / dayOfYear : 0;
  const hoursRemaining = (progress?.yearlyGoal || 1100) - (progress?.totalHours || 0);
  const daysToComplete = avgHoursPerDay > 0 ? Math.ceil(hoursRemaining / avgHoursPerDay) : null;
  // currentLevel already declared above
  const currentMilestone = getCurrentMilestone(currentLevel);

  // Calculate viewLevel - milestone click takes priority over phase click
  const viewLevel = viewingMilestoneLevel !== null 
    ? viewingMilestoneLevel
    : viewingPhase 
      ? TREE_PHASES.find(p => p.id === viewingPhase)?.maxLevel 
      : undefined;

  // Get viewing label
  const viewingMilestone = viewingMilestoneLevel !== null
    ? LEVEL_MILESTONES.find(m => m.level === viewingMilestoneLevel)
    : null;
  const viewingPhaseName = viewingPhase 
    ? TREE_PHASES.find(p => p.id === viewingPhase)?.nameKey 
    : null;
  const isViewing = viewingMilestoneLevel !== null || viewingPhase !== null;

  const handleMilestoneClick = (level: number) => {
    if (level === -1) {
      setViewingMilestoneLevel(null);
    } else {
      setViewingMilestoneLevel(level);
      setViewingPhase(null); // clear phase view when clicking milestone
    }
  };

  const handleClearView = () => {
    setViewingMilestoneLevel(null);
    setViewingPhase(null);
  };

  const handlePhaseClick = (phaseId: string) => {
    if (viewingPhase === phaseId) {
      setViewingPhase(null);
    } else {
      setViewingPhase(phaseId);
      setViewingMilestoneLevel(null);
    }
  };

  // unlockedMilestones already declared above
  const handlePrevMilestone = () => {
    if (unlockedMilestones.length === 0) return;
    const currentIdx = viewingMilestoneLevel !== null
      ? unlockedMilestones.findIndex(m => m.level === viewingMilestoneLevel)
      : unlockedMilestones.length - 1;
    const prevIdx = currentIdx <= 0 ? unlockedMilestones.length - 1 : currentIdx - 1;
    setViewingMilestoneLevel(unlockedMilestones[prevIdx].level);
    setViewingPhase(null);
  };

  const handleNextMilestone = () => {
    if (unlockedMilestones.length === 0) return;
    const currentIdx = viewingMilestoneLevel !== null
      ? unlockedMilestones.findIndex(m => m.level === viewingMilestoneLevel)
      : -1;
    const nextIdx = currentIdx >= unlockedMilestones.length - 1 ? 0 : currentIdx + 1;
    setViewingMilestoneLevel(unlockedMilestones[nextIdx].level);
    setViewingPhase(null);
  };

  return (
    <MainLayout>
       <div className="space-y-6 p-2 sm:p-4 max-w-full min-w-0">
         {/* Header */}
         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Trophy className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
              {t('achievements.title')}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              {currentMilestone && (
                <span className="inline-flex items-center gap-1">
                  <span>{currentMilestone.icon}</span>
                  <span>{t(currentMilestone.descriptionKey)}</span>
                </span>
              )}
            </p>
          </div>
         <div className="flex flex-wrap items-center gap-2 min-w-0">
            <Badge variant="secondary" className="text-xs sm:text-base px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap">
              <Sparkles className="h-3.5 w-3.5 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-primary" />
              {t('achievements.level')} {currentLevel}/366
            </Badge>
            <Badge variant="outline" className="text-xs sm:text-base px-2 sm:px-4 py-1 sm:py-2 whitespace-nowrap">
              {progress?.overallProgress.toFixed(1)}% {t('achievements.complete')}
            </Badge>
          </div>
        </div>

        {/* Phase Indicator */}
         <Card className="p-4 overflow-hidden">
          <TreePhaseIndicator 
            currentLevel={currentLevel} 
            totalHours={progress?.totalHours || 0}
            onPhaseClick={handlePhaseClick}
            activePhaseId={viewingPhase}
          />
        </Card>

        {/* Main Content - Tree and Progress */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tree Section */}
          <Card className="overflow-hidden">
            <CardContent className="p-4 sm:p-6 flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 overflow-hidden min-w-0">
              {isViewing && (
                <div className="w-full flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    <span>
                      {t('achievements.viewing')}: {viewingMilestone 
                        ? `${viewingMilestone.icon} ${t(viewingMilestone.descriptionKey)}` 
                        : viewingPhaseName 
                          ? t(viewingPhaseName) 
                          : ''}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearView}
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    {t('achievements.back_to_current')}
                  </Button>
                </div>
              )}
              <div className="w-full flex items-center justify-center gap-1 sm:gap-2 min-w-0">
                {unlockedMilestones.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full"
                    onClick={handlePrevMilestone}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}
                <motion.div
                  className="flex-1 flex items-center justify-center min-w-0 overflow-hidden"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <EnhancedGrowthTree
                    level={currentLevel}
                    totalHours={progress?.totalHours || 0}
                    size="lg"
                    viewLevel={viewLevel}
                  />
                </motion.div>
                {unlockedMilestones.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 rounded-full"
                    onClick={handleNextMilestone}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                )}
              </div>
              
              {/* Tree info below */}
              <div className="mt-4 text-center">
                <div className="text-lg font-bold text-foreground">
                  {viewingMilestone 
                    ? t(viewingMilestone.descriptionKey)
                    : viewingPhaseName 
                      ? t(viewingPhaseName) 
                      : progress?.phaseName}
                </div>
                <div className="text-sm text-muted-foreground">
                  {(progress?.totalHours || 0).toFixed(1)}h / 1100h
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Progress Cards */}
          <div className="space-y-4">
            {/* Daily Progress */}
            <DailyProgressCard
              todayHours={todayHours}
              totalHours={progress?.totalHours || 0}
              currentLevel={currentLevel}
            />

            {/* Stats Cards */}
            <div className="grid gap-3 grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">{t('achievements.total_hours')}</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(progress?.totalHours || 0).toFixed(1)}h</div>
                  <p className="text-xs text-muted-foreground">{t('achievements.this_year')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">{t('achievements.daily_average')}</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{avgHoursPerDay.toFixed(1)}h</div>
                  <p className="text-xs text-muted-foreground">{t('achievements.per_day')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">{t('achievements.remaining')}</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.max(0, hoursRemaining).toFixed(0)}h</div>
                  <p className="text-xs text-muted-foreground">{t('achievements.to_complete')}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">{t('achievements.projection')}</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {daysToComplete && daysToComplete > 0 ? `${daysToComplete}d` : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">{t('achievements.days_to_complete')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Unlocked Achievements Section */}
        <UnlockedAchievements 
          currentLevel={currentLevel} 
          onMilestoneClick={handleMilestoneClick}
          activeMilestoneLevel={viewingMilestoneLevel}
        />

        {/* Streak Freezes Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-blue-500" />
              {t("streak.freezes_title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasFreezes ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("streak.freezes_desc")}</span>
                  <Badge variant="secondary" className="text-sm">
                    <Shield className="h-3.5 w-3.5 mr-1" />
                    {remaining}/{total}
                  </Badge>
                </div>
                <div className="flex gap-1.5">
                  {Array.from({ length: total }).map((_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "h-8 flex-1 rounded-md transition-colors",
                        i < used
                          ? "bg-blue-500/30 border border-blue-500/50"
                          : "bg-blue-500/10 border border-blue-500/20"
                      )}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {used > 0 ? `${used} ${t("streak.freezes_remaining", { count: remaining })}` : t("streak.freezes_remaining", { count: remaining })}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("streak.no_freezes")}</p>
            )}
          </CardContent>
        </Card>

         {/* Bottom Section - Calendar and Chart */}
         <div className="grid gap-6 lg:grid-cols-2">
           {/* Consistency Calendar */}
           <ConsistencyCalendar dailyData={dailyData} />

            {/* Monthly Chart */}
            <Card className="overflow-hidden">
              <CardHeader className="px-3 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calendar className="h-5 w-5 text-primary" />
                  {t('achievements.monthly_progress')}
                </CardTitle>
              </CardHeader>
              <CardContent className="h-[220px] sm:h-[300px] px-1 sm:px-6 pb-3">
                {monthlyData && monthlyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <XAxis 
                        dataKey="month" 
                        fontSize={10} 
                        tickLine={false} 
                        axisLine={false} 
                        interval={0}
                        tickFormatter={(v: string) => (v ? v.slice(0, 3) : v)}
                      />
                      <YAxis fontSize={10} tickLine={false} axisLine={false} width={28} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          `${value}h`, 
                          name === 'hours' ? t('achievements.hours') : t('achievements.monthly_goal')
                        ]}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <ReferenceLine 
                        y={92} 
                        stroke="hsl(var(--muted-foreground))" 
                        strokeDasharray="3 3" 
                      />
                      <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                        {monthlyData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.hours >= 92 ? 'hsl(var(--primary))' : entry.hours > 0 ? 'hsl(var(--primary) / 0.6)' : 'hsl(var(--muted))'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                    {t('achievements.no_data')}
                  </div>
                )}
              </CardContent>
           </Card>
        </div>
      </div>
    </MainLayout>
  );
}