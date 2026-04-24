import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Sparkles, Target } from "lucide-react";
import { motion } from "framer-motion";
import { HOURS_PER_LEVEL, getNextUnlockDescriptionKey } from "@/lib/treeConfig";

interface DailyProgressCardProps {
  todayHours: number;
  totalHours: number;
  currentLevel: number;
}

export function DailyProgressCard({ todayHours, totalHours, currentLevel }: DailyProgressCardProps) {
  const { t } = useTranslation();
  
  const hoursToNextLevel = HOURS_PER_LEVEL - (totalHours % HOURS_PER_LEVEL);
  const dailyProgress = Math.min((todayHours / HOURS_PER_LEVEL) * 100, 100);
  const nextUnlockKey = getNextUnlockDescriptionKey(currentLevel);
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          {t('achievements.today_progress')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Today's progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t('achievements.today')}</span>
            <span className="font-medium">{todayHours.toFixed(1)}h / {HOURS_PER_LEVEL}h</span>
          </div>
          <Progress value={dailyProgress} className="h-3" />
          {dailyProgress >= 100 && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-1 text-sm text-primary font-medium"
            >
              <Sparkles className="h-4 w-4" />
              {t('achievements.daily_goal_reached')}
            </motion.div>
          )}
        </div>
        
        {/* Next level info */}
        <div className="rounded-lg bg-muted/50 p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{t('achievements.next_level_in')}:</span>
            <span className="font-bold text-foreground">{hoursToNextLevel.toFixed(1)}h</span>
          </div>
          
          <div className="flex items-start gap-2 text-sm">
            <Sparkles className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <span className="text-muted-foreground">{t('achievements.you_will_unlock')}: </span>
              <span className="font-medium text-foreground">{t(nextUnlockKey)}</span>
            </div>
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 rounded-lg bg-primary/10">
            <div className="text-2xl font-bold text-primary">{currentLevel}</div>
            <div className="text-xs text-muted-foreground">{t('achievements.current_level')}</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-primary/10">
            <div className="text-2xl font-bold text-primary">{(366 - currentLevel)}</div>
            <div className="text-xs text-muted-foreground">{t('achievements.remaining_levels')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}