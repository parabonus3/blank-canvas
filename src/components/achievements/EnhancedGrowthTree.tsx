import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useEffect, useRef } from "react";
import { 
  getUnlockedMilestones,
  getCurrentPhase,
  LIGHT_COLORS, 
  ORNAMENT_COLORS,
  getLightPosition,
  getOrnamentPosition,
  getPresentPosition,
} from "@/lib/treeConfig";

// Planting phase images (levels 1-10)
import level01 from '@/assets/tree/planting/level-01.png';
import level02 from '@/assets/tree/planting/level-02.png';
import level03 from '@/assets/tree/planting/level-03.png';
import level04 from '@/assets/tree/planting/level-04.png';
import level05 from '@/assets/tree/planting/level-05.png';
import level06 from '@/assets/tree/planting/level-06.png';
import level07 from '@/assets/tree/planting/level-07.png';
import level08 from '@/assets/tree/planting/level-08.png';
import level09 from '@/assets/tree/planting/level-09.png';
import level10 from '@/assets/tree/planting/level-10.png';

const PLANTING_IMAGES: (string | null)[] = [
  null, level01, level02, level03, level04, level05,
  level06, level07, level08, level09, level10
];

// Sprout phase images (levels 11-30)
import sprout01 from '@/assets/tree/sprout/level-01.png';
import sprout02 from '@/assets/tree/sprout/level-02.png';
import sprout03 from '@/assets/tree/sprout/level-03.png';
import sprout04 from '@/assets/tree/sprout/level-04.png';
import sprout05 from '@/assets/tree/sprout/level-05.png';
import sprout06 from '@/assets/tree/sprout/level-06.png';
import sprout07 from '@/assets/tree/sprout/level-07.png';
import sprout08 from '@/assets/tree/sprout/level-08.png';
import sprout09 from '@/assets/tree/sprout/level-09.png';
import sprout10 from '@/assets/tree/sprout/level-10.png';

const SPROUT_IMAGES = [sprout01, sprout02, sprout03, sprout04, sprout05, sprout06, sprout07, sprout08, sprout09, sprout10];
const SPROUT_MILESTONE_LEVELS = [12, 14, 16, 18, 20, 22, 24, 26, 28, 30];

function getSproutImageIndex(level: number): number {
  for (let i = SPROUT_MILESTONE_LEVELS.length - 1; i >= 0; i--) {
    if (level >= SPROUT_MILESTONE_LEVELS[i]) return i;
  }
  return 0; // levels 11 or below show first image
}

import { playAchievementSound, playPhaseCompleteSound } from "@/lib/achievementSounds";

interface EnhancedGrowthTreeProps {
  level: number;
  totalHours: number;
  size?: "sm" | "md" | "lg";
  viewLevel?: number;
}

export function EnhancedGrowthTree({ level, totalHours, size = "lg", viewLevel }: EnhancedGrowthTreeProps) {
  const effectiveLevel = viewLevel !== undefined ? viewLevel : level;
  const phase = getCurrentPhase(effectiveLevel);
  const previousLevelRef = useRef(level);
  const unlockedMilestones = useMemo(() => getUnlockedMilestones(effectiveLevel), [effectiveLevel]);
  
  // Create a set of unlocked element IDs for quick lookup
  const unlockedElements = useMemo(() => {
    return new Set(unlockedMilestones.map(m => m.element));
  }, [unlockedMilestones]);
  
  const dimensions = {
    sm: { width: 150, height: 225 },
    md: { width: 220, height: 330 },
    lg: { width: 280, height: 420 }
  };
  
  const { width, height } = dimensions[size];
  
  // Play sound when level increases and new milestone is reached
  useEffect(() => {
    if (level > previousLevelRef.current) {
      const newMilestones = unlockedMilestones.filter(
        m => m.level > previousLevelRef.current && m.level <= level
      );
      
      if (newMilestones.length > 0) {
        const isPhaseComplete = newMilestones.some(
          m => m.element.endsWith('_done') || m.element === 'complete'
        );
        
        if (isPhaseComplete) {
          playPhaseCompleteSound();
        } else {
          playAchievementSound();
        }
      }
    }
    previousLevelRef.current = level;
  }, [level, unlockedMilestones]);

  // Calculate late-game elements
  const treeProgress = useMemo(() => {
    const l = effectiveLevel;
    const lightsCount = l >= 200 ? Math.min(l - 199, 67) : 0;
    const ornamentsCount = l >= 267 ? Math.min(l - 266, 66) : 0;
    const presentsCount = l >= 333 ? Math.min(l - 332, 10) : 0;
    const hasSnow = l >= 343;
    const snowIntensity = l >= 343 ? Math.min((l - 343) / 13, 1) : 0;
    const hasStar = l >= 356;
    
    return { lightsCount, ornamentsCount, presentsCount, hasSnow, snowIntensity, hasStar };
  }, [effectiveLevel]);

  // Generate late-game decorations
  const lights = useMemo(() => {
    return Array.from({ length: treeProgress.lightsCount }, (_, i) => ({
      ...getLightPosition(i, treeProgress.lightsCount),
      color: LIGHT_COLORS[i % LIGHT_COLORS.length],
      delay: i * 0.15
    }));
  }, [treeProgress.lightsCount]);

  const ornaments = useMemo(() => {
    return Array.from({ length: treeProgress.ornamentsCount }, (_, i) => ({
      ...getOrnamentPosition(i),
      color: ORNAMENT_COLORS[i % ORNAMENT_COLORS.length],
      size: 6 + (i % 3) * 2
    }));
  }, [treeProgress.ornamentsCount]);

  const presents = useMemo(() => {
    const presentColors = ['#FF0000', '#00AA00', '#0066FF', '#FFD700', '#9400D3'];
    return Array.from({ length: treeProgress.presentsCount }, (_, i) => ({
      ...getPresentPosition(i),
      color: presentColors[i % presentColors.length],
      ribbonColor: i % 2 === 0 ? '#FFD700' : '#FFFFFF'
    }));
  }, [treeProgress.presentsCount]);

  const snowParticles = useMemo(() => {
    if (!treeProgress.hasSnow) return [];
    const count = Math.floor(20 * treeProgress.snowIntensity);
    return Array.from({ length: count }, (_, i) => ({
      x: 50 + Math.random() * 200,
      delay: Math.random() * 3,
      duration: 2 + Math.random() * 2
    }));
  }, [treeProgress.hasSnow, treeProgress.snowIntensity]);

  // Helper to check if element is unlocked
  const has = (element: string) => unlockedElements.has(element);

  // For planting and sprout phases, render image directly without SVG
  // Use direct level ranges instead of phase.id to handle viewLevel correctly
  if (effectiveLevel >= 1 && effectiveLevel <= 10) {
    const imageSrc = PLANTING_IMAGES[Math.min(effectiveLevel, 10)]!;
    const imageKey = `planting-${effectiveLevel}`;

    const containerHeight = size === 'sm' ? 200 : size === 'md' ? 300 : 400;

    return (
      <div 
        className="w-full flex items-center justify-center"
        style={{ height: containerHeight }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={imageKey}
            src={imageSrc}
            alt={`${phase.id} stage ${level}`}
            className="max-w-full max-h-full object-contain rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          />
        </AnimatePresence>
      </div>
    );
  }

  // Sprout phase images (levels 11-30)
  if (effectiveLevel >= 11 && effectiveLevel <= 30) {
    const imageSrc = SPROUT_IMAGES[getSproutImageIndex(effectiveLevel)];
    const imageKey = `sprout-${getSproutImageIndex(effectiveLevel)}`;
    const containerHeight = size === 'sm' ? 200 : size === 'md' ? 300 : 400;

    return (
      <div 
        className="w-full flex items-center justify-center"
        style={{ height: containerHeight }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={imageKey}
            src={imageSrc}
            alt={`sprout stage ${effectiveLevel}`}
            className="max-w-full max-h-full object-contain rounded-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          />
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative w-full flex items-center justify-center overflow-hidden" style={{ maxWidth: Math.min(width, 280) }}>
      <svg viewBox="0 0 300 450" className="w-full h-auto overflow-visible">
        <defs>
          {/* Gradients */}
          <linearGradient id="potGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#CD853F" />
            <stop offset="50%" stopColor="#DEB887" />
            <stop offset="100%" stopColor="#8B4513" />
          </linearGradient>
          
          <linearGradient id="soilGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3D2817" />
            <stop offset="100%" stopColor="#2A1B0F" />
          </linearGradient>

          <linearGradient id="richSoilGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4A3020" />
            <stop offset="50%" stopColor="#5D3A2A" />
            <stop offset="100%" stopColor="#3D2817" />
          </linearGradient>
          
          <linearGradient id="stemGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#228B22" />
            <stop offset="50%" stopColor="#32CD32" />
            <stop offset="100%" stopColor="#228B22" />
          </linearGradient>

          <linearGradient id="trunkGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#8B4513" />
            <stop offset="50%" stopColor="#A0522D" />
            <stop offset="100%" stopColor="#6B3810" />
          </linearGradient>
          
          <linearGradient id="leafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#32CD32" />
            <stop offset="100%" stopColor="#228B22" />
          </linearGradient>

          <linearGradient id="foliageGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.7" />
          </linearGradient>

          <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFD700" />
            <stop offset="50%" stopColor="#FFF8DC" />
            <stop offset="100%" stopColor="#FFD700" />
          </linearGradient>
          
          {/* Filters */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <filter id="goldenGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur"/>
            <feFlood floodColor="#FFD700" floodOpacity="0.6"/>
            <feComposite in2="blur" operator="in"/>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          <filter id="shadow">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.3"/>
          </filter>

          <filter id="starGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="5" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Ground shadow */}
        <ellipse cx="150" cy="440" rx="80" ry="10" fill="hsl(var(--muted))" opacity="0.3" />
        
        {/* ====== SAPLING PHASE (Levels 35-60) ====== */}
        
        {/* Level 35: Trunk Forming */}
        {has('trunk_1') && (
          <motion.rect 
            x={144} 
            y={300} 
            width={12} 
            height={95} 
            fill="url(#trunkGradient)"
            rx="2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
        
        {/* Level 40: First Branch */}
        {has('branch_1') && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <path 
              d="M 150 330 Q 120 310 100 320" 
              stroke="url(#trunkGradient)" 
              strokeWidth="5" 
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="95" cy="318" rx="15" ry="25" fill="url(#foliageGradient)" transform="rotate(-20 95 318)" />
          </motion.g>
        )}
        
        {/* Level 45: Second Branch */}
        {has('branch_2') && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <path 
              d="M 150 340 Q 180 320 200 330" 
              stroke="url(#trunkGradient)" 
              strokeWidth="5" 
              strokeLinecap="round"
              fill="none"
            />
            <ellipse cx="205" cy="328" rx="15" ry="25" fill="url(#foliageGradient)" transform="rotate(20 205 328)" />
          </motion.g>
        )}
        
        {/* Level 50: Basic Foliage */}
        {has('foliage_1') && (
          <motion.polygon 
            points="150,260 100,340 200,340" 
            fill="url(#foliageGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
        
        {/* Level 55: Shape Emerging */}
        {has('shape') && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <polygon points="150,230 90,320 210,320" fill="url(#foliageGradient)" opacity="0.9" />
            <polygon points="150,270 105,340 195,340" fill="url(#foliageGradient)" opacity="0.95" />
          </motion.g>
        )}
        
        {/* Level 60: Sapling Complete */}
        {has('sapling_done') && (
          <motion.circle
            cx="150"
            cy="300"
            r="80"
            fill="none"
            stroke="#32CD32"
            strokeWidth="2"
            opacity={0.3}
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        
        {/* ====== TREE PHASE (Levels 70-120) ====== */}
        
        {/* Level 70+: Taller Trunk */}
        {has('trunk_2') && (
          <motion.rect 
            x={140} 
            y={260} 
            width={20} 
            height={135} 
            fill="url(#trunkGradient)"
            rx="3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
        
        {/* Level 80+: More Branches */}
        {has('branches') && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <path d="M 150 310 Q 110 280 80 290" stroke="url(#trunkGradient)" strokeWidth="6" fill="none" />
            <path d="M 150 310 Q 190 280 220 290" stroke="url(#trunkGradient)" strokeWidth="6" fill="none" />
            <path d="M 150 280 Q 125 260 100 270" stroke="url(#trunkGradient)" strokeWidth="4" fill="none" />
            <path d="M 150 280 Q 175 260 200 270" stroke="url(#trunkGradient)" strokeWidth="4" fill="none" />
          </motion.g>
        )}
        
        {/* Level 90+: Crown Forming */}
        {has('crown') && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <polygon points="150,180 70,300 230,300" fill="url(#foliageGradient)" filter="url(#shadow)" />
            <polygon points="150,210 85,310 215,310" fill="url(#foliageGradient)" opacity="0.9" />
            <polygon points="150,240 95,320 205,320" fill="url(#foliageGradient)" opacity="0.85" />
          </motion.g>
        )}
        
        {/* Level 100+: Young Tree */}
        {has('young_tree') && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <polygon points="150,150 60,290 240,290" fill="url(#foliageGradient)" filter="url(#shadow)" />
            <polygon points="150,180 75,300 225,300" fill="url(#foliageGradient)" opacity="0.95" />
            <polygon points="150,210 85,310 215,310" fill="url(#foliageGradient)" opacity="0.9" />
          </motion.g>
        )}
        
        {/* Level 110+: Strong Growth */}
        {has('strong') && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <polygon points="150,130 50,280 250,280" fill="url(#foliageGradient)" filter="url(#shadow)" />
            <polygon points="150,160 65,295 235,295" fill="url(#foliageGradient)" opacity="0.95" />
            <polygon points="150,190 80,310 220,310" fill="url(#foliageGradient)" opacity="0.9" />
          </motion.g>
        )}
        
        {/* Level 120: Tree Complete */}
        {has('tree_done') && (
          <motion.ellipse
            cx="150"
            cy="250"
            rx="100"
            ry="130"
            fill="hsl(var(--primary))"
            opacity={0.05}
            animate={{ opacity: [0.03, 0.08, 0.03], scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        
        {/* ====== PINE PHASE (Levels 140-200) ====== */}
        
        {/* Level 140+: Pine Shape */}
        {has('pine_shape') && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <rect x={142} y={250} width={16} height={145} fill="url(#trunkGradient)" rx="2" />
            <polygon points="150,100 60,250 240,250" fill="url(#foliageGradient)" filter="url(#shadow)" />
            <polygon points="150,140 70,280 230,280" fill="url(#foliageGradient)" opacity="0.95" />
            <polygon points="150,180 80,310 220,310" fill="url(#foliageGradient)" opacity="0.9" />
            <polygon points="150,220 90,340 210,340" fill="url(#foliageGradient)" opacity="0.85" />
          </motion.g>
        )}
        
        {/* Level 160+: Growing Pine */}
        {has('pine_growing') && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <polygon points="150,80 55,235 245,235" fill="url(#foliageGradient)" filter="url(#shadow)" />
            <polygon points="150,120 65,265 235,265" fill="url(#foliageGradient)" opacity="0.95" />
            <polygon points="150,160 75,295 225,295" fill="url(#foliageGradient)" opacity="0.9" />
            <polygon points="150,200 85,325 215,325" fill="url(#foliageGradient)" opacity="0.85" />
          </motion.g>
        )}
        
        {/* Level 180+: Dense Pine */}
        {has('dense') && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <polygon points="150,70 50,220 250,220" fill="url(#foliageGradient)" filter="url(#shadow)" />
            <polygon points="150,100 55,250 245,250" fill="url(#foliageGradient)" opacity="0.97" />
            <polygon points="150,130 60,280 240,280" fill="url(#foliageGradient)" opacity="0.94" />
            <polygon points="150,160 65,310 235,310" fill="url(#foliageGradient)" opacity="0.91" />
            <polygon points="150,190 70,340 230,340" fill="url(#foliageGradient)" opacity="0.88" />
          </motion.g>
        )}
        
        {/* Level 200: Pine Complete */}
        {has('pine_done') && (
          <motion.ellipse
            cx="150"
            cy="220"
            rx="110"
            ry="160"
            fill="hsl(var(--primary))"
            opacity={0.05}
            animate={{ opacity: [0.03, 0.08, 0.03], scale: [1, 1.05, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        
        {/* ====== LIGHTS PHASE (Levels 205-267) ====== */}
        {lights.map((light, i) => (
          <motion.circle
            key={`light-${i}`}
            cx={light.x}
            cy={light.y}
            r="4"
            fill={light.color}
            filter="url(#glow)"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ 
              scale: [1, 1.2, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{
              duration: 1.5,
              delay: light.delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
        
        {/* Level 267: Lights Complete */}
        {has('lights_done') && (
          <motion.circle
            cx="150"
            cy="200"
            r="120"
            fill="none"
            stroke="#FFD700"
            strokeWidth="2"
            opacity={0.3}
            filter="url(#glow)"
            animate={{ opacity: [0.2, 0.6, 0.2], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        
        {/* ====== ORNAMENTS PHASE (Levels 275-333) ====== */}
        {ornaments.map((ornament, i) => (
          <motion.g key={`ornament-${i}`}>
            <line 
              x1={ornament.x} 
              y1={ornament.y - ornament.size - 2} 
              x2={ornament.x} 
              y2={ornament.y - ornament.size - 8}
              stroke="#888"
              strokeWidth="1"
            />
            <motion.circle
              cx={ornament.x}
              cy={ornament.y}
              r={ornament.size}
              fill={ornament.color}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
            />
            <circle
              cx={ornament.x - ornament.size * 0.3}
              cy={ornament.y - ornament.size * 0.3}
              r={ornament.size * 0.25}
              fill="white"
              opacity="0.4"
            />
          </motion.g>
        ))}
        
        {/* Level 315: Ribbons */}
        {has('ribbons') && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <path d="M 100 280 Q 120 290 140 280" stroke="#FF0000" strokeWidth="3" fill="none" />
            <path d="M 160 280 Q 180 290 200 280" stroke="#FFD700" strokeWidth="3" fill="none" />
            <path d="M 80 320 Q 100 330 120 320" stroke="#00AA00" strokeWidth="3" fill="none" />
          </motion.g>
        )}
        
        {/* Level 325: Garland */}
        {has('garland') && (
          <motion.g
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          >
            <path 
              d="M 70 250 Q 110 270 150 250 Q 190 230 230 250" 
              stroke="#FFD700" 
              strokeWidth="4" 
              fill="none"
              opacity="0.8"
            />
            <path 
              d="M 75 290 Q 115 310 150 290 Q 185 270 225 290" 
              stroke="#FFD700" 
              strokeWidth="4" 
              fill="none"
              opacity="0.8"
            />
          </motion.g>
        )}
        
        {/* Level 333: Ornaments Complete */}
        {has('ornaments_done') && (
          <motion.circle
            cx="150"
            cy="200"
            r="130"
            fill="none"
            stroke="#FF0000"
            strokeWidth="2"
            opacity={0.2}
            filter="url(#glow)"
            animate={{ opacity: [0.1, 0.4, 0.1], scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        
        {/* ====== COMPLETE PHASE (Levels 338-366) ====== */}
        
        {/* Presents */}
        {presents.map((present, i) => (
          <motion.g 
            key={`present-${i}`}
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <rect x={present.x - 12} y={present.y - 10} width="24" height="16" fill={present.color} rx="2" />
            <rect x={present.x - 2} y={present.y - 10} width="4" height="16" fill={present.ribbonColor} />
            <rect x={present.x - 12} y={present.y - 3} width="24" height="4" fill={present.ribbonColor} />
            <ellipse cx={present.x - 5} cy={present.y - 12} rx="5" ry="3" fill={present.ribbonColor} />
            <ellipse cx={present.x + 5} cy={present.y - 12} rx="5" ry="3" fill={present.ribbonColor} />
          </motion.g>
        ))}
        
        {/* Snow */}
        {snowParticles.map((snow, i) => (
          <motion.circle
            key={`snow-${i}`}
            cx={snow.x}
            r="2"
            fill="white"
            initial={{ cy: 50, opacity: 0 }}
            animate={{ 
              cy: [50, 450],
              opacity: [0, 1, 1, 0],
              x: [snow.x, snow.x + 20, snow.x - 10, snow.x + 15]
            }}
            transition={{
              duration: snow.duration,
              delay: snow.delay,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
        
        {/* Star */}
        {treeProgress.hasStar && (
          <motion.g
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.polygon
              points="150,50 156,70 178,70 160,82 168,102 150,90 132,102 140,82 122,70 144,70"
              fill="url(#starGradient)"
              filter="url(#starGlow)"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.9, 1, 0.9]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          </motion.g>
        )}
        
        {/* Level 366: Complete Tree Glow */}
        {has('complete') && (
          <motion.ellipse
            cx="150"
            cy="250"
            rx="150"
            ry="200"
            fill="url(#starGradient)"
            opacity={0.1}
            filter="url(#goldenGlow)"
            animate={{
              opacity: [0.05, 0.15, 0.05],
              scale: [1, 1.02, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        )}
      </svg>
    </div>
  );
}
