import { getTreeVisualLevel } from './treeVisual';

const images = import.meta.glob<string>('../assets/tree/stages/*.jpg', {
  query: '?w=480&format=webp&quality=82',
  import: 'default',
});

/** Loads only the requested milestone; neighboring images are warmed by the tree component. */
export function getTreeImage(level: number): Promise<string> | undefined {
  const milestone = getTreeVisualLevel(level);
  return images[`../assets/tree/stages/level-${String(milestone).padStart(3, '0')}.jpg`]?.();
}