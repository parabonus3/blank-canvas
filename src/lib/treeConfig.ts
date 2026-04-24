// Tree Configuration for 366 levels (1 level per 3 hours)
export const HOURS_PER_LEVEL = 3;
export const MAX_LEVELS = 366;
export const YEARLY_GOAL_HOURS = 1100;

// Phase definitions with level ranges
export const TREE_PHASES = [
  { id: 'planting', nameKey: 'achievements.phase_planting', name: 'Plantio', minLevel: 0, maxLevel: 10, minHours: 0, maxHours: 30, icon: '🌰' },
  { id: 'sprout', nameKey: 'achievements.phase_sprout', name: 'Broto', minLevel: 10, maxLevel: 30, minHours: 30, maxHours: 90, icon: '🌱' },
  { id: 'sapling', nameKey: 'achievements.phase_sapling', name: 'Mudinha', minLevel: 30, maxLevel: 60, minHours: 90, maxHours: 180, icon: '🌿' },
  { id: 'tree', nameKey: 'achievements.phase_tree', name: 'Árvore', minLevel: 60, maxLevel: 120, minHours: 180, maxHours: 360, icon: '🌳' },
  { id: 'pine', nameKey: 'achievements.phase_pine', name: 'Pinheiro', minLevel: 120, maxLevel: 200, minHours: 360, maxHours: 600, icon: '🌲' },
  { id: 'lights', nameKey: 'achievements.phase_lights', name: 'Luzes', minLevel: 200, maxLevel: 267, minHours: 600, maxHours: 800, icon: '💡' },
  { id: 'ornaments', nameKey: 'achievements.phase_ornaments', name: 'Enfeites', minLevel: 267, maxLevel: 333, minHours: 800, maxHours: 1000, icon: '🎄' },
  { id: 'complete', nameKey: 'achievements.phase_complete', name: 'Completa', minLevel: 333, maxLevel: 366, minHours: 1000, maxHours: 1100, icon: '⭐' }
] as const;

// Level milestones - specific achievements for each significant level
export interface LevelMilestone {
  level: number;
  description: string;
  descriptionKey: string;
  icon: string;
  element: string;
  phase: string;
}

export const LEVEL_MILESTONES: LevelMilestone[] = [
  // Fase Plantio (0-30h, levels 0-10)
  { level: 1, description: "Vaso de terracota vazio", descriptionKey: "achievements.milestone_pot", icon: "🪴", element: "pot", phase: "planting" },
  { level: 2, description: "Vaso com terra comum", descriptionKey: "achievements.milestone_soil", icon: "🟤", element: "soil", phase: "planting" },
  { level: 3, description: "Terra mais rica e escura", descriptionKey: "achievements.milestone_rich_soil", icon: "🌱", element: "rich_soil", phase: "planting" },
  { level: 4, description: "Pequeno buraco na terra", descriptionKey: "achievements.milestone_seed", icon: "🌰", element: "seed", phase: "planting" },
  { level: 5, description: "Semente visível no buraco", descriptionKey: "achievements.milestone_sprouting", icon: "🌿", element: "sprouting", phase: "planting" },
  { level: 6, description: "Semente parcialmente coberta", descriptionKey: "achievements.milestone_first_green", icon: "🌱", element: "first_green", phase: "planting" },
  { level: 7, description: "Semente totalmente coberta", descriptionKey: "achievements.milestone_growing", icon: "🌿", element: "growing", phase: "planting" },
  { level: 8, description: "Terra levemente úmida", descriptionKey: "achievements.milestone_leaf_1", icon: "🍃", element: "leaf_1", phase: "planting" },
  { level: 9, description: "Pequeno rachado na terra", descriptionKey: "achievements.milestone_leaf_2", icon: "🍃", element: "leaf_2", phase: "planting" },
  { level: 10, description: "Primeiro broto surgindo!", descriptionKey: "achievements.milestone_planting_done", icon: "✅", element: "planting_done", phase: "planting" },
  
  // Fase Broto (30-90h, levels 10-30)
  { level: 12, description: "Broto maior (2 cm)", descriptionKey: "achievements.milestone_stem_1", icon: "🌿", element: "stem_1", phase: "sprout" },
  { level: 14, description: "Broto mais firme", descriptionKey: "achievements.milestone_leaf_3", icon: "🍃", element: "leaf_3", phase: "sprout" },
  { level: 16, description: "Primeira folha pequena", descriptionKey: "achievements.milestone_leaf_4", icon: "🍃", element: "leaf_4", phase: "sprout" },
  { level: 18, description: "Primeira folha aberta", descriptionKey: "achievements.milestone_taller", icon: "🌱", element: "taller", phase: "sprout" },
  { level: 20, description: "Segunda folha surgindo", descriptionKey: "achievements.milestone_branch_start", icon: "🌿", element: "branch_start", phase: "sprout" },
  { level: 22, description: "Duas folhas abertas", descriptionKey: "achievements.milestone_more_leaves", icon: "🌿", element: "more_leaves", phase: "sprout" },
  { level: 24, description: "Caule mais grosso", descriptionKey: "achievements.milestone_robust", icon: "🌱", element: "robust", phase: "sprout" },
  { level: 26, description: "Broto mais alto", descriptionKey: "achievements.milestone_preparing", icon: "🌿", element: "preparing", phase: "sprout" },
  { level: 28, description: "Pequenas veias nas folhas", descriptionKey: "achievements.milestone_details", icon: "✨", element: "details", phase: "sprout" },
  { level: 30, description: "Broto jovem completo", descriptionKey: "achievements.milestone_sprout_done", icon: "✅", element: "sprout_done", phase: "sprout" },
  
  // Fase Mudinha (90-180h, levels 30-60)
  { level: 35, description: "Tronco formando", descriptionKey: "achievements.milestone_trunk_1", icon: "🪵", element: "trunk_1", phase: "sapling" },
  { level: 40, description: "Primeiro galho", descriptionKey: "achievements.milestone_branch_1", icon: "🌳", element: "branch_1", phase: "sapling" },
  { level: 45, description: "Segundo galho", descriptionKey: "achievements.milestone_branch_2", icon: "🌳", element: "branch_2", phase: "sapling" },
  { level: 50, description: "Folhagem básica", descriptionKey: "achievements.milestone_foliage_1", icon: "🌿", element: "foliage_1", phase: "sapling" },
  { level: 55, description: "Formato surgindo", descriptionKey: "achievements.milestone_shape", icon: "🌲", element: "shape", phase: "sapling" },
  { level: 60, description: "Mudinha completa!", descriptionKey: "achievements.milestone_sapling_done", icon: "✅", element: "sapling_done", phase: "sapling" },
  
  // Fase Árvore (180-360h, levels 60-120)
  { level: 70, description: "Tronco mais alto", descriptionKey: "achievements.milestone_trunk_2", icon: "🪵", element: "trunk_2", phase: "tree" },
  { level: 80, description: "Mais galhos", descriptionKey: "achievements.milestone_branches", icon: "🌳", element: "branches", phase: "tree" },
  { level: 90, description: "Copa formando", descriptionKey: "achievements.milestone_crown", icon: "🌲", element: "crown", phase: "tree" },
  { level: 100, description: "Árvore jovem", descriptionKey: "achievements.milestone_young_tree", icon: "🌳", element: "young_tree", phase: "tree" },
  { level: 110, description: "Crescimento forte", descriptionKey: "achievements.milestone_strong", icon: "💪", element: "strong", phase: "tree" },
  { level: 120, description: "Árvore completa!", descriptionKey: "achievements.milestone_tree_done", icon: "✅", element: "tree_done", phase: "tree" },
  
  // Fase Pinheiro (360-600h, levels 120-200)
  { level: 140, description: "Formato de pinheiro", descriptionKey: "achievements.milestone_pine_shape", icon: "🌲", element: "pine_shape", phase: "pine" },
  { level: 160, description: "Pinheiro crescendo", descriptionKey: "achievements.milestone_pine_growing", icon: "🌲", element: "pine_growing", phase: "pine" },
  { level: 180, description: "Galhos densos", descriptionKey: "achievements.milestone_dense", icon: "🌲", element: "dense", phase: "pine" },
  { level: 200, description: "Pinheiro completo!", descriptionKey: "achievements.milestone_pine_done", icon: "✅", element: "pine_done", phase: "pine" },
  
  // Fase Luzes (600-800h, levels 200-267)
  { level: 205, description: "Primeira luz amarela", descriptionKey: "achievements.milestone_light_1", icon: "💡", element: "light_1", phase: "lights" },
  { level: 210, description: "Luz vermelha", descriptionKey: "achievements.milestone_light_2", icon: "🔴", element: "light_2", phase: "lights" },
  { level: 220, description: "Luz azul", descriptionKey: "achievements.milestone_light_3", icon: "🔵", element: "light_3", phase: "lights" },
  { level: 230, description: "Luz verde", descriptionKey: "achievements.milestone_light_4", icon: "🟢", element: "light_4", phase: "lights" },
  { level: 240, description: "Mais luzes", descriptionKey: "achievements.milestone_more_lights", icon: "✨", element: "more_lights", phase: "lights" },
  { level: 250, description: "Luzes brilhantes", descriptionKey: "achievements.milestone_bright_lights", icon: "💫", element: "bright_lights", phase: "lights" },
  { level: 260, description: "Festival de luzes", descriptionKey: "achievements.milestone_festival", icon: "🎇", element: "festival", phase: "lights" },
  { level: 267, description: "Luzes completas!", descriptionKey: "achievements.milestone_lights_done", icon: "✅", element: "lights_done", phase: "lights" },
  
  // Fase Enfeites (800-1000h, levels 267-333)
  { level: 275, description: "Primeira bola vermelha", descriptionKey: "achievements.milestone_ornament_1", icon: "🔴", element: "ornament_1", phase: "ornaments" },
  { level: 285, description: "Bola dourada", descriptionKey: "achievements.milestone_ornament_2", icon: "🟡", element: "ornament_2", phase: "ornaments" },
  { level: 295, description: "Bola prateada", descriptionKey: "achievements.milestone_ornament_3", icon: "⚪", element: "ornament_3", phase: "ornaments" },
  { level: 305, description: "Bola azul", descriptionKey: "achievements.milestone_ornament_4", icon: "🔵", element: "ornament_4", phase: "ornaments" },
  { level: 315, description: "Laços decorativos", descriptionKey: "achievements.milestone_ribbons", icon: "🎀", element: "ribbons", phase: "ornaments" },
  { level: 325, description: "Festão dourado", descriptionKey: "achievements.milestone_garland", icon: "✨", element: "garland", phase: "ornaments" },
  { level: 333, description: "Enfeites completos!", descriptionKey: "achievements.milestone_ornaments_done", icon: "✅", element: "ornaments_done", phase: "ornaments" },
  
  // Fase Completa (1000-1100h, levels 333-366)
  { level: 338, description: "Primeiro presente", descriptionKey: "achievements.milestone_present_1", icon: "🎁", element: "present_1", phase: "complete" },
  { level: 343, description: "Mais presentes", descriptionKey: "achievements.milestone_presents", icon: "🎁", element: "presents", phase: "complete" },
  { level: 348, description: "Neve caindo", descriptionKey: "achievements.milestone_snow", icon: "❄️", element: "snow", phase: "complete" },
  { level: 353, description: "Neve intensa", descriptionKey: "achievements.milestone_snow_heavy", icon: "🌨️", element: "snow_heavy", phase: "complete" },
  { level: 358, description: "Estrela no topo", descriptionKey: "achievements.milestone_star", icon: "⭐", element: "star", phase: "complete" },
  { level: 363, description: "Estrela brilhante", descriptionKey: "achievements.milestone_star_bright", icon: "🌟", element: "star_bright", phase: "complete" },
  { level: 366, description: "Árvore perfeita!", descriptionKey: "achievements.milestone_complete_tree", icon: "🎄", element: "complete", phase: "complete" }
];

// Get milestones for a phase
export function getMilestonesForPhase(phaseId: string): LevelMilestone[] {
  return LEVEL_MILESTONES.filter(m => m.phase === phaseId);
}

// Get unlocked milestones
export function getUnlockedMilestones(currentLevel: number): LevelMilestone[] {
  return LEVEL_MILESTONES.filter(m => m.level <= currentLevel);
}

// Get next milestone
export function getNextMilestone(currentLevel: number): LevelMilestone | null {
  return LEVEL_MILESTONES.find(m => m.level > currentLevel) || null;
}

// Get current milestone (last unlocked)
export function getCurrentMilestone(currentLevel: number): LevelMilestone | null {
  const unlocked = getUnlockedMilestones(currentLevel);
  return unlocked.length > 0 ? unlocked[unlocked.length - 1] : null;
}
 
 // Light colors for decoration phase
 export const LIGHT_COLORS = [
   '#FFD700', // Gold
   '#FF4444', // Red
   '#4444FF', // Blue
   '#44FF44', // Green
   '#FF44FF', // Pink
   '#44FFFF', // Cyan
   '#FFA500', // Orange
   '#FF69B4', // Hot Pink
 ];
 
 // Ornament colors
 export const ORNAMENT_COLORS = [
   '#FF0000', // Red
   '#FFD700', // Gold
   '#C0C0C0', // Silver
   '#0066FF', // Blue
   '#9400D3', // Purple
   '#FF4500', // Orange Red
 ];
 
 // Calculate current level from total hours
 export function calculateTreeLevel(totalHours: number): number {
   const level = Math.floor(totalHours / HOURS_PER_LEVEL);
   return Math.min(level, MAX_LEVELS);
 }
 
 // Get current phase from level
 export function getCurrentPhase(level: number) {
   for (const phase of TREE_PHASES) {
     if (level >= phase.minLevel && level < phase.maxLevel) {
       return phase;
     }
   }
   return TREE_PHASES[TREE_PHASES.length - 1];
 }
 
 // Get progress to next level
 export function getNextLevelProgress(totalHours: number): {
   current: number;
   needed: number;
   percentage: number;
   hoursToNext: number;
 } {
   const hoursInCurrentLevel = totalHours % HOURS_PER_LEVEL;
   const hoursToNext = HOURS_PER_LEVEL - hoursInCurrentLevel;
   return {
     current: hoursInCurrentLevel,
     needed: HOURS_PER_LEVEL,
     percentage: (hoursInCurrentLevel / HOURS_PER_LEVEL) * 100,
     hoursToNext
   };
 }
 
 // Get phase progress (0-100)
 export function getPhaseProgress(level: number): number {
   const phase = getCurrentPhase(level);
   const phaseRange = phase.maxLevel - phase.minLevel;
   const progressInPhase = level - phase.minLevel;
   return Math.min((progressInPhase / phaseRange) * 100, 100);
 }
 
 // Get next unlock description key for i18n
 export function getNextUnlockDescriptionKey(level: number): string {
   const phase = getCurrentPhase(level);
   
   if (level < 10) {
     const keys = [
       'achievements.next_pot_details',
       'achievements.next_soil_richer',
       'achievements.next_seed_appear',
       'achievements.next_seed_germinate',
       'achievements.next_first_sprout'
     ];
     return keys[Math.min(Math.floor(level / 2), keys.length - 1)];
   }
   
   if (phase.id === 'sprout') return 'achievements.next_sprout_grow';
   if (phase.id === 'sapling') return 'achievements.next_new_branches';
   if (phase.id === 'tree') return 'achievements.next_tree_taller';
   if (phase.id === 'pine') return 'achievements.next_more_foliage';
   if (phase.id === 'lights') return 'achievements.next_new_light';
   if (phase.id === 'ornaments') return 'achievements.next_new_ornament';
   if (phase.id === 'complete') {
     if (level < 343) return 'achievements.next_present_added';
     if (level < 356) return 'achievements.next_snow_falling';
     return 'achievements.next_star_brighter';
   }
   
   return 'achievements.next_keep_going';
 }

 // Legacy function kept for backward compatibility
 export function getNextUnlockDescription(level: number): string {
   const phase = getCurrentPhase(level);
   
   if (level < 10) {
     const descriptions = [
       'O vaso vai ganhar mais detalhes',
       'A terra ficará mais rica',
       'Uma semente vai aparecer',
       'A semente começará a germinar',
       'O primeiro broto surgirá'
     ];
     return descriptions[Math.min(Math.floor(level / 2), descriptions.length - 1)];
   }
   
   if (phase.id === 'sprout') return 'O broto crescerá mais';
   if (phase.id === 'sapling') return 'Novos galhos aparecerão';
   if (phase.id === 'tree') return 'A árvore ficará mais alta';
   if (phase.id === 'pine') return 'O pinheiro ganhará mais folhagem';
   if (phase.id === 'lights') return 'Uma nova luz será adicionada ✨';
   if (phase.id === 'ornaments') return 'Um novo enfeite aparecerá 🎄';
   if (phase.id === 'complete') {
     if (level < 343) return 'Um presente será adicionado 🎁';
     if (level < 356) return 'Neve começará a cair ❄️';
     return 'A estrela brilhará mais ⭐';
   }
   
   return 'Continue progredindo!';
 }
 
 // Light positions on tree (pre-calculated for visual balance)
 export function getLightPosition(index: number, totalLights: number): { x: number; y: number } {
   const levels = 5;
   const levelHeight = 50;
   const baseY = 120;
   
   const level = index % levels;
   const indexInLevel = Math.floor(index / levels);
   
   const widthAtLevel = 30 + (level * 25);
   const offsetX = (indexInLevel % 3 - 1) * (widthAtLevel / 2);
   
   return {
     x: 150 + offsetX + (Math.random() - 0.5) * 20,
     y: baseY + (level * levelHeight) + (Math.random() - 0.5) * 15
   };
 }
 
 // Ornament positions
 export function getOrnamentPosition(index: number): { x: number; y: number } {
   const angle = (index * 137.5) * (Math.PI / 180);
   const radius = 20 + (index * 2) % 60;
   const baseY = 180;
   
   return {
     x: 150 + Math.cos(angle) * radius,
     y: baseY + (index % 5) * 45 + Math.sin(angle) * 10
   };
 }
 
 // Present positions
 export function getPresentPosition(index: number): { x: number; y: number } {
   const positions = [
     { x: 100, y: 420 },
     { x: 200, y: 420 },
     { x: 150, y: 425 },
     { x: 75, y: 415 },
     { x: 225, y: 415 },
     { x: 125, y: 430 },
     { x: 175, y: 430 },
     { x: 90, y: 425 },
     { x: 210, y: 425 },
     { x: 150, y: 435 },
   ];
   return positions[index % positions.length];
 }