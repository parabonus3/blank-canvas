import { getTreeVisualLevel } from './treeVisual';

const images = import.meta.glob<string>('../assets/tree/stages/*.jpg', {
  eager: true,
  query: '?w=480&format=webp&quality=82',
  import: 'default',
});

export function getTreeImage(level: number): string | undefined {
  const milestone = getTreeVisualLevel(level);
  return images[`../assets/tree/stages/level-${String(milestone).padStart(3, '0')}.jpg`];
}