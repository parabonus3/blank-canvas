import { describe, expect, it } from 'vitest';
import { aggregateAchievementYear } from './achievementProgress';
import { readEveryPage } from './paginatedRead';
import { getTreeVisualLevel } from './treeVisual';
import { calculateTreeLevel, YEARLY_GOAL_HOURS } from './treeConfig';

describe('achievement visuals preserve earned milestones', () => {
  it.each([[0,0],[1,1],[10,10],[11,10],[30,30],[31,30],[34,30],[35,35],[357,353],[358,358],[366,366]])('level %i uses milestone %i', (level, expected) => {
    expect(getTreeVisualLevel(level)).toBe(expected);
  });
  it('preserves the existing 1098-hour final level and separate 1100-hour goal', () => {
    expect(calculateTreeLevel(1097)).toBe(365);
    expect(calculateTreeLevel(1098)).toBe(366);
    expect(YEARLY_GOAL_HOURS).toBe(1100);
  });
});

describe('profile-local achievement totals', () => {
  it('excludes the next UTC year until it belongs to the profile year', () => {
    const data = aggregateAchievementYear([
      { start_time: '2027-01-01T02:59:59Z', duration: 3600 },
      { start_time: '2027-01-01T03:00:00Z', duration: 7200 },
    ], 2026, 'America/Sao_Paulo');
    expect(data.totalSeconds).toBe(3600);
    expect(data.dailyData).toEqual([{ date: '2026-12-31', hours: 1 }]);
    expect(data.monthlySeconds[11]).toBe(3600);
  });
  it('groups both repeated DST hours in the same local day', () => {
    const data = aggregateAchievementYear([
      { start_time: '2026-11-01T05:30:00Z', duration: 1800 },
      { start_time: '2026-11-01T06:30:00Z', duration: 1800 },
    ], 2026, 'America/New_York');
    expect(data.dailyData).toEqual([{ date: '2026-11-01', hours: 1 }]);
    expect(data.totalSeconds).toBe(3600);
  });
  it('reads and counts more than 1000 completed entries', async () => {
    const source = Array.from({ length: 1205 }, () => ({ start_time: '2026-06-01T12:00:00Z', duration: 60 }));
    const rows = await readEveryPage(async (from, to) => source.slice(from, to + 1));
    expect(rows.length).toBe(1205);
    expect(aggregateAchievementYear(rows, 2026, 'Asia/Tokyo').totalSeconds).toBe(72300);
  });
});