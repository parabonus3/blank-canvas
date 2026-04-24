import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TREE_PHASES, getCurrentPhase } from "@/lib/treeConfig";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Check } from "lucide-react";

interface TreePhaseIndicatorProps {
  currentLevel: number;
  totalHours: number;
  onPhaseClick?: (phaseId: string) => void;
  activePhaseId?: string | null;
}

const PHASE_ICONS: Record<string, string> = {
  planting: "🌱",
  sprout: "🌿",
  sapling: "🌳",
  tree: "🎄",
  pine: "🌲",
  lights: "✨",
  ornaments: "🎀",
  complete: "⭐"
};

export function TreePhaseIndicator({ currentLevel, totalHours, onPhaseClick, activePhaseId }: TreePhaseIndicatorProps) {
  const { t } = useTranslation();
  const currentPhase = getCurrentPhase(currentLevel);
  
  return (
    <div className="w-full overflow-hidden">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">{t('achievements.tree_phases')}</h3>
      
      <div className="relative pb-2 overflow-hidden">
        <div className="min-w-0 relative">
          {/* Progress line */}
          <div className="absolute top-4 sm:top-5 left-0 right-0 h-1 bg-muted rounded-full" />
          <motion.div 
            className="absolute top-4 sm:top-5 left-0 h-1 bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentLevel / 366) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Phase nodes */}
          <div className="relative flex justify-between gap-1">
            <TooltipProvider>
              {TREE_PHASES.map((phase, index) => {
                const isCompleted = currentLevel >= phase.maxLevel;
                const isCurrent = phase.id === currentPhase.id;
                const isLocked = currentLevel < phase.minLevel;
                
                return (
                  <Tooltip key={phase.id}>
                    <TooltipTrigger asChild>
                      <motion.div
                        className={cn(
                          "flex flex-col items-center",
                          isCompleted && onPhaseClick && "cursor-pointer"
                        )}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          if (isCompleted && onPhaseClick) {
                            onPhaseClick(phase.id);
                          }
                        }}
                      >
                        <div
                          className={cn(
                            "w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs sm:text-lg border-2 transition-all",
                            isCompleted && "bg-primary border-primary text-primary-foreground",
                            isCurrent && !isCompleted && "bg-primary/20 border-primary animate-pulse",
                            isLocked && "bg-muted border-muted-foreground/30 opacity-50",
                            activePhaseId === phase.id && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                            isCompleted && onPhaseClick && "hover:scale-110 transition-transform"
                          )}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                          ) : (
                            PHASE_ICONS[phase.id]
                          )}
                        </div>
                        <span className={cn(
                          "hidden sm:block text-[10px] mt-1 font-medium text-center max-w-[50px]",
                          isCurrent ? "text-primary" : "text-muted-foreground"
                        )}>
                          {t(phase.nameKey)}
                        </span>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-sm">
                        <p className="font-bold">{t(phase.nameKey)}</p>
                        <p className="text-muted-foreground">
                          {phase.minHours}h - {phase.maxHours}h
                        </p>
                        {isCurrent && (
                          <p className="text-primary mt-1">
                            {t('achievements.you_are_here')} ({totalHours.toFixed(1)}h)
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}