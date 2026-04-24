import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TreeStage } from "@/hooks/useAchievements";
import { Progress } from "@/components/ui/progress";
import { useTranslation } from "react-i18next";

interface GrowthTreeProps {
  totalHours: number;
  stage: TreeStage;
  stageName: string;
  progress: number;
  yearlyGoal?: number;
  size?: "sm" | "md" | "lg";
  showStats?: boolean;
}

export function GrowthTree({ 
  totalHours, 
  stage, 
  stageName,
  progress, 
  yearlyGoal = 1100,
  size = "md",
  showStats = true
}: GrowthTreeProps) {
  const { t } = useTranslation();
  
  const sizes = {
    sm: { width: 120, height: 160 },
    md: { width: 200, height: 280 },
    lg: { width: 300, height: 400 }
  };

  const { width, height } = sizes[size];
  const stageIndex = ['seed', 'sprout', 'seedling', 'tree', 'pine', 'decorating', 'almost_done', 'complete'].indexOf(stage);

  return (
    <div className={cn("flex flex-col items-center gap-4", size === "lg" && "gap-6")}>
      <svg 
        viewBox="0 0 200 280" 
        width={width} 
        height={height}
        className="drop-shadow-lg"
      >
        {/* Pot/Base */}
        <motion.g
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <rect x="70" y="250" width="60" height="25" rx="3" fill="#8B4513" />
          <rect x="65" y="245" width="70" height="8" rx="2" fill="#A0522D" />
          <ellipse cx="100" cy="250" rx="30" ry="4" fill="#654321" />
        </motion.g>

        {/* Dirt in pot */}
        <ellipse cx="100" cy="248" rx="25" ry="6" fill="#3D2914" />

        {/* Seed Stage */}
        {stageIndex >= 0 && (
          <motion.ellipse
            cx="100"
            cy="242"
            rx="8"
            ry="5"
            fill="#654321"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
          />
        )}

        {/* Sprout Stage - small green shoot */}
        {stageIndex >= 1 && (
          <motion.g
            initial={{ scaleY: 0, originY: 1 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <line x1="100" y1="240" x2="100" y2="220" stroke="#228B22" strokeWidth="3" />
            <ellipse cx="93" cy="218" rx="6" ry="3" fill="#32CD32" transform="rotate(-30 93 218)" />
            <ellipse cx="107" cy="218" rx="6" ry="3" fill="#32CD32" transform="rotate(30 107 218)" />
          </motion.g>
        )}

        {/* Seedling Stage - small tree */}
        {stageIndex >= 2 && (
          <motion.g
            initial={{ scale: 0, originY: 1 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <rect x="96" y="180" width="8" height="60" fill="#654321" />
            <polygon points="100,140 130,200 70,200" fill="#228B22" />
          </motion.g>
        )}

        {/* Tree Stage - medium pine */}
        {stageIndex >= 3 && (
          <motion.g
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <rect x="94" y="160" width="12" height="85" fill="#654321" />
            <polygon points="100,100 145,180 55,180" fill="#228B22" />
            <polygon points="100,80 140,160 60,160" fill="#2E8B2E" />
          </motion.g>
        )}

        {/* Pine Stage - larger pine */}
        {stageIndex >= 4 && (
          <motion.g
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <polygon points="100,60 155,160 45,160" fill="#228B22" />
            <polygon points="100,40 150,120 50,120" fill="#2E8B2E" />
            <polygon points="100,25 140,90 60,90" fill="#32CD32" />
          </motion.g>
        )}

        {/* Decorating Stage - lights */}
        {stageIndex >= 5 && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
          >
            {/* String lights */}
            <motion.circle cx="75" cy="140" r="4" fill="#FFD700" 
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <motion.circle cx="125" cy="140" r="4" fill="#FF4500"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            />
            <motion.circle cx="85" cy="110" r="4" fill="#00CED1"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
            <motion.circle cx="115" cy="110" r="4" fill="#FF69B4"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
            <motion.circle cx="100" cy="80" r="4" fill="#7CFC00"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1 }}
            />
            <motion.circle cx="90" cy="160" r="4" fill="#FF1493"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.3 }}
            />
            <motion.circle cx="110" cy="160" r="4" fill="#00FF00"
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            />
          </motion.g>
        )}

        {/* Almost Done Stage - ornaments and presents */}
        {stageIndex >= 6 && (
          <motion.g
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.9, type: "spring" }}
          >
            {/* Ornaments */}
            <circle cx="80" cy="130" r="6" fill="#FF0000" stroke="#FFD700" strokeWidth="1" />
            <circle cx="120" cy="130" r="6" fill="#0000FF" stroke="#FFD700" strokeWidth="1" />
            <circle cx="100" cy="100" r="6" fill="#FFD700" stroke="#FF0000" strokeWidth="1" />
            <circle cx="70" cy="160" r="5" fill="#FF69B4" stroke="#FFD700" strokeWidth="1" />
            <circle cx="130" cy="160" r="5" fill="#00CED1" stroke="#FFD700" strokeWidth="1" />
            
            {/* Presents */}
            <rect x="55" y="235" width="20" height="15" rx="2" fill="#FF0000" />
            <rect x="64" y="235" width="3" height="15" fill="#FFD700" />
            <rect x="55" y="240" width="20" height="3" fill="#FFD700" />
            
            <rect x="125" y="232" width="22" height="18" rx="2" fill="#4169E1" />
            <rect x="135" y="232" width="3" height="18" fill="#FFD700" />
            <rect x="125" y="239" width="22" height="3" fill="#FFD700" />
          </motion.g>
        )}

        {/* Complete Stage - star on top */}
        {stageIndex >= 7 && (
          <motion.g
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 1, type: "spring", stiffness: 200 }}
          >
            <motion.polygon
              points="100,5 103,18 117,18 106,26 110,40 100,32 90,40 94,26 83,18 97,18"
              fill="#FFD700"
              stroke="#FFA500"
              strokeWidth="1"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
            {/* Glow effect */}
            <motion.circle
              cx="100"
              cy="22"
              r="15"
              fill="url(#starGlow)"
              opacity="0.5"
              animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            />
          </motion.g>
        )}

        {/* Gradient definitions */}
        <defs>
          <radialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {showStats && (
        <div className="text-center space-y-2 w-full max-w-[200px]">
          <div className="text-lg font-semibold">{stageName}</div>
          <div className="text-2xl font-bold text-primary">
            {totalHours.toFixed(1)}h
            <span className="text-sm text-muted-foreground font-normal ml-1">
              / {yearlyGoal}h
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="text-xs text-muted-foreground">
            {progress.toFixed(1)}% {t('achievements.complete')}
          </div>
        </div>
      )}
    </div>
  );
}
