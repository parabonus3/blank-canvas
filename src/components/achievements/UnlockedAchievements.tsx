import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, Lock, Check, ArrowRight, Trophy } from "lucide-react";
import { 
  TREE_PHASES, 
  getMilestonesForPhase, 
  getCurrentPhase,
  LevelMilestone 
} from "@/lib/treeConfig";

interface UnlockedAchievementsProps {
  currentLevel: number;
  onMilestoneClick?: (level: number) => void;
  activeMilestoneLevel?: number | null;
}

export function UnlockedAchievements({ currentLevel, onMilestoneClick, activeMilestoneLevel }: UnlockedAchievementsProps) {
  const { t } = useTranslation();
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const currentPhase = getCurrentPhase(currentLevel);
  
  const togglePhase = (phaseId: string) => {
    setExpandedPhase(expandedPhase === phaseId ? null : phaseId);
  };
  
  const getPhaseStatus = (phase: typeof TREE_PHASES[number]) => {
    if (currentLevel >= phase.maxLevel) return 'complete';
    if (currentLevel >= phase.minLevel) return 'in_progress';
    return 'locked';
  };
  
  const getPhaseProgress = (phase: typeof TREE_PHASES[number]) => {
    if (currentLevel >= phase.maxLevel) return 100;
    if (currentLevel < phase.minLevel) return 0;
    const range = phase.maxLevel - phase.minLevel;
    const progress = currentLevel - phase.minLevel;
    return Math.round((progress / range) * 100);
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Trophy className="h-5 w-5 text-primary" />
          {t('achievements.unlocked_achievements')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {TREE_PHASES.map((phase) => {
          const status = getPhaseStatus(phase);
          const progress = getPhaseProgress(phase);
          const milestones = getMilestonesForPhase(phase.id);
          const unlockedCount = milestones.filter(m => m.level <= currentLevel).length;
          const isExpanded = expandedPhase === phase.id;
          const isCurrentPhase = currentPhase.id === phase.id;
          
          return (
            <div key={phase.id} className="rounded-lg border overflow-hidden">
              {/* Phase Header */}
              <button
                onClick={() => togglePhase(phase.id)}
                className={`w-full flex items-center justify-between p-3 text-left transition-colors ${
                  status === 'locked' 
                    ? 'bg-muted/30 cursor-not-allowed' 
                    : 'hover:bg-muted/50'
                } ${isCurrentPhase ? 'bg-primary/10 border-l-4 border-primary' : ''}`}
                disabled={status === 'locked'}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{phase.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{t(phase.nameKey)}</span>
                      {status === 'complete' && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                      {isCurrentPhase && (
                        <Badge variant="secondary" className="text-xs">
                          {t('achievements.current')}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {phase.minHours}h - {phase.maxHours}h
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {status !== 'locked' && (
                    <Badge variant={status === 'complete' ? 'default' : 'outline'}>
                      {unlockedCount}/{milestones.length}
                    </Badge>
                  )}
                  {status === 'locked' ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </button>
              
              {/* Progress bar for current phase */}
              {status === 'in_progress' && (
                <div className="px-3 pb-2">
                  <Progress value={progress} className="h-1.5" />
                </div>
              )}
              
              {/* Expanded milestones */}
              <AnimatePresence>
                {isExpanded && status !== 'locked' && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 pt-0 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {milestones.map((milestone) => {
                        const isUnlocked = milestone.level <= currentLevel;
                        const isCurrent = milestone.level === Math.floor(currentLevel);
                        const isActive = activeMilestoneLevel === milestone.level;
                        
                        return (
                          <motion.div
                            key={milestone.level}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.05 }}
                            onClick={() => {
                              if (isUnlocked && onMilestoneClick) {
                                onMilestoneClick(isActive ? -1 : milestone.level);
                              }
                            }}
                            className={`flex items-center gap-2 p-2 rounded-lg text-sm transition-all ${
                              isUnlocked 
                                ? 'bg-primary/10 cursor-pointer hover:bg-primary/20' 
                                : 'bg-muted/50 opacity-60'
                            } ${isCurrent ? 'ring-2 ring-primary' : ''} ${isActive ? 'ring-2 ring-primary bg-primary/20 shadow-md' : ''}`}
                          >
                            <span className={isUnlocked ? '' : 'grayscale'}>
                              {milestone.icon}
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className="truncate text-xs font-medium">
                                {t(milestone.descriptionKey)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t('achievements.level')} {milestone.level}
                              </div>
                            </div>
                            {isActive && (
                              <ArrowRight className="h-3 w-3 text-primary animate-pulse flex-shrink-0" />
                            )}
                            {!isActive && isUnlocked && (
                              <Check className="h-3 w-3 text-primary flex-shrink-0" />
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}