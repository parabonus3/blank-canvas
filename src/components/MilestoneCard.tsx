import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface MilestoneCardProps {
  id: string;
  name: string;
  description: string;
  hours: number;
  icon: string;
  isUnlocked: boolean;
  currentHours: number;
}

export function MilestoneCard({
  name,
  description,
  hours,
  icon,
  isUnlocked,
  currentHours
}: MilestoneCardProps) {
  const { t } = useTranslation();
  const progress = Math.min((currentHours / hours) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: isUnlocked ? 1.02 : 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all",
        isUnlocked 
          ? "bg-gradient-to-br from-primary/10 via-background to-primary/5 border-primary/30" 
          : "bg-muted/30 opacity-75"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-full text-2xl",
              isUnlocked 
                ? "bg-primary/20" 
                : "bg-muted/50 grayscale"
            )}>
              {icon}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  "font-semibold truncate",
                  !isUnlocked && "text-muted-foreground"
                )}>
                  {name}
                </h4>
          {isUnlocked ? (
                  <Badge variant="default" className="shrink-0 bg-primary">
                    <Check className="h-3 w-3 mr-1" />
                    {t('achievements.unlocked')}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="shrink-0">
                    <Lock className="h-3 w-3 mr-1" />
                    {hours}h
                  </Badge>
                )}
              </div>
              
              <p className={cn(
                "text-sm mt-1",
                isUnlocked ? "text-muted-foreground" : "text-muted-foreground/70"
              )}>
                {description}
              </p>

              {!isUnlocked && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{currentHours.toFixed(1)}h</span>
                    <span>{hours}h</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-primary/50 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {isUnlocked && (
            <motion.div
              className="absolute top-0 right-0 w-20 h-20 -mr-10 -mt-10"
              initial={{ opacity: 0, rotate: -45 }}
              animate={{ opacity: 0.1, rotate: 0 }}
            >
              <div className="w-full h-full bg-primary rounded-full blur-xl" />
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
