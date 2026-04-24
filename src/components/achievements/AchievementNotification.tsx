import { motion } from "framer-motion";
import { toast } from "sonner";
import { Trophy, Sparkles, Star } from "lucide-react";
import { LevelMilestone } from "@/lib/treeConfig";
import i18next from "i18next";

interface AchievementToastProps {
  milestone: LevelMilestone;
  isPhaseComplete?: boolean;
}

export function showAchievementToast({ milestone, isPhaseComplete }: AchievementToastProps) {
  const t = i18next.t.bind(i18next);
  
  toast.custom(
    () => (
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.8 }}
        className="pointer-events-auto w-full max-w-sm"
      >
        <div className={`rounded-lg border shadow-lg overflow-hidden ${
          isPhaseComplete 
            ? 'bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-primary' 
            : 'bg-background border-border'
        }`}>
          <div className="relative px-4 py-3">
            {isPhaseComplete && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
                animate={{ x: [-300, 300] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
            
            <div className="relative flex items-center gap-3">
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, -10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ duration: 0.5 }}
                className="text-4xl"
              >
                {milestone.icon}
              </motion.div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {isPhaseComplete ? (
                    <Trophy className="h-4 w-4 text-primary" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-primary" />
                  )}
                  <span className="font-bold text-foreground">
                    {isPhaseComplete ? t('achievements.phase_complete') : t('achievements.new_achievement')}
                  </span>
                </div>
                
                <p className="text-sm text-foreground mt-0.5">
                  {t(milestone.descriptionKey)}
                </p>
                
                <p className="text-xs text-muted-foreground mt-1">
                  {t('achievements.level')} {milestone.level}
                </p>
              </div>
            </div>
          </div>
          
          <motion.div 
            className="h-1 bg-primary"
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: 5, ease: "linear" }}
          />
        </div>
      </motion.div>
    ),
    {
      duration: 5000,
      position: "top-center",
    }
  );
}

export function checkAndShowAchievement(
  previousLevel: number, 
  currentLevel: number, 
  milestones: LevelMilestone[]
) {
  const newMilestones = milestones.filter(
    m => m.level > previousLevel && m.level <= currentLevel
  );
  
  newMilestones.forEach((milestone, index) => {
    const isPhaseComplete = milestone.element.endsWith('_done') || 
                           milestone.element === 'complete';
    
    setTimeout(() => {
      showAchievementToast({ milestone, isPhaseComplete });
    }, index * 1000);
  });
  
  return newMilestones;
}

export function showLevelUpCelebration(newLevel: number) {
  const t = i18next.t.bind(i18next);
  
  toast.custom(
    () => (
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.5 }}
        className="pointer-events-auto"
      >
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg px-6 py-4 shadow-lg">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{ 
                rotate: { duration: 1 },
                scale: { duration: 0.5, repeat: 2 }
              }}
            >
              <Star className="h-8 w-8 fill-current" />
            </motion.div>
            
            <div>
              <div className="font-bold text-lg">{t('achievements.level')} {newLevel}!</div>
              <div className="text-sm opacity-90">{t('achievements.keep_going')}</div>
            </div>
          </div>
        </div>
      </motion.div>
    ),
    {
      duration: 3000,
      position: "top-center",
    }
  );
}