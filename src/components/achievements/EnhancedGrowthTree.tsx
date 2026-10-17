import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getCurrentPhase, getUnlockedMilestones } from '@/lib/treeConfig';
import { getTreeImage } from '@/lib/treeImages';
import { getTreeVisualLevel, getTreeVisualNeighbors } from '@/lib/treeVisual';
import { playAchievementSound, playPhaseCompleteSound } from '@/lib/achievementSounds';

interface EnhancedGrowthTreeProps {
  level: number;
  totalHours: number;
  size?: 'sm' | 'md' | 'lg';
  viewLevel?: number;
}

const decoded = new Map<string, Promise<void>>();
function prepareImage(src: string): Promise<void> {
  const existing = decoded.get(src);
  if (existing) return existing;
  const promise = new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.onload = () => { image.decode().then(() => resolve(), reject); };
    image.onerror = () => reject(new Error('Image unavailable'));
    image.src = src;
  }).catch(error => { decoded.delete(src); throw error; });
  decoded.set(src, promise);
  return promise;
}

export function EnhancedGrowthTree({ level, size = 'lg', viewLevel }: EnhancedGrowthTreeProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const visualLevel = getTreeVisualLevel(viewLevel ?? level);
  const [shown, setShown] = useState<{ src: string; level: number }>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const previousLevel = useRef(level);

  useEffect(() => {
    if (level > previousLevel.current) {
      const milestones = getUnlockedMilestones(level).filter(m => m.level > previousLevel.current);
      if (milestones.length) {
        if (milestones.some(m => m.element.endsWith('_done') || m.element === 'complete')) playPhaseCompleteSound();
        else playAchievementSound();
      }
    }
    previousLevel.current = level;
  }, [level]);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    const imageRequest = getTreeImage(visualLevel);
    if (!imageRequest) { setFailed(true); return; }
    imageRequest.then(async src => {
      await prepareImage(src);
      if (cancelled) return;
      setShown({ src, level: visualLevel });
      for (const neighbor of getTreeVisualNeighbors(visualLevel)) {
        const nextRequest = getTreeImage(neighbor);
        if (nextRequest) void nextRequest.then(prepareImage).catch(() => {});
      }
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [visualLevel, attempt]);

  return (
    <div className={`relative w-full aspect-[3/4] ${size === 'sm' ? 'max-w-[150px]' : size === 'md' ? 'max-w-[220px]' : 'max-w-[280px]'}`} aria-busy={!shown && !failed}>
      {shown ? (
        <motion.img
          src={shown.src}
          alt={`${t(getCurrentPhase(shown.level).nameKey)} · ${t('achievements.level')} ${shown.level}`}
          width={480}
          height={640}
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-contain rounded-lg"
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.15 }}
        />
      ) : <Skeleton className="absolute inset-0 rounded-lg" />}
      {failed && (
        <Button variant="secondary" size="icon" className="absolute bottom-2 right-2" title={t('common.retry')} aria-label={t('common.retry')} onClick={() => setAttempt(value => value + 1)}>
          <RotateCw className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
