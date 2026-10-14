import { LEVEL_MILESTONES, MAX_LEVELS } from './treeConfig';

export const TREE_VISUAL_LEVELS = [0, ...LEVEL_MILESTONES.map(m => m.level)];

/** Between milestones retain the last earned appearance, including levels 31–34. */
export function getTreeVisualLevel(level: number): number {
  const safeLevel = Number.isFinite(level) ? Math.max(0, Math.min(level, MAX_LEVELS)) : 0;
  return [...TREE_VISUAL_LEVELS].reverse().find(value => value <= safeLevel) ?? 0;
}

export function getTreeVisualNeighbors(level: number) {
  const index = TREE_VISUAL_LEVELS.indexOf(getTreeVisualLevel(level));
  return TREE_VISUAL_LEVELS.slice(Math.max(0, index - 1), index + 2);
}