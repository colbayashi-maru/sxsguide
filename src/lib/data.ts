// Access layer over the generated datasets.
//
// The small datasets the dashboard always needs are imported statically. The
// large browse tables (relics alone is half a megabyte) are pulled in on
// demand so the first paint does not wait on them.

import classesJson from '../data/classes.json';
import seasonsJson from '../data/season-listing.json';
import milestonesJson from '../data/milestones.json';
import experienceJson from '../data/experience-table.json';
import ratingsJson from '../data/class-ratings.json';
import buildsJson from '../data/builds.json';
import communityBuildsJson from '../data/community-builds.json';
import dungeonsJson from '../data/dungeon-data.json';
import dungeonSetsJson from '../data/dungeon-sets.json';
import dropRatesJson from '../data/dungeon-drop-rate.json';
import gearPowerJson from '../data/gear-power.json';
import relicSetsJson from '../data/relic-sets.json';
import statsJson from '../data/game-statistics.json';

import type {
  BuildRow, ClassRatingRow, ClassRow, CommunityBuildRow, DungeonRow,
  DungeonSetRow, ExperienceRow, GearPowerRow, MilestoneRow, RelicSetRow,
  SeasonRow, StatRow,
} from './types';

export const classes = classesJson as ClassRow[];
export const seasons = seasonsJson as SeasonRow[];
export const milestones = milestonesJson as MilestoneRow[];
export const experienceTable = experienceJson as ExperienceRow[];
export const builds = buildsJson as BuildRow[];
export const communityBuilds = communityBuildsJson as CommunityBuildRow[];
export const dungeons = dungeonsJson as DungeonRow[];
export const dungeonSets = dungeonSetsJson as DungeonSetRow[];
export const dropRates = dropRatesJson as Record<string, string | number>[];
export const gearPower = gearPowerJson as GearPowerRow[];
export const relicSets = relicSetsJson as RelicSetRow[];
export const gameStats = statsJson as StatRow[];

// The ratings tab doubles as the survey's own scratch space: the leftmost
// column holds notes like "Add Review Here" and a form link rather than a
// count. Keep only rows that name a class.
export const classRatings = (ratingsJson as ClassRatingRow[])
  .filter((r) => typeof r.CLASS === 'string' && r.CLASS.trim() !== '');

// Total review count is stated once, on the first data row.
export const totalClassReviews =
  (ratingsJson as ClassRatingRow[]).map((r) => r['TOTAL REVIEWS'])
    .find((v): v is number => typeof v === 'number') ?? 0;

const lazy = {
  relics: () => import('../data/relics.json'),
  servers: () => import('../data/servers.json'),
  skills: () => import('../data/skills.json'),
  monsters: () => import('../data/monsters.json'),
  companions: () => import('../data/companions.json'),
  fantomon: () => import('../data/fantomon.json'),
  'fantomon-skills': () => import('../data/fantomon-skills.json'),
  glossary: () => import('../data/glossary.json'),
  skins: () => import('../data/skins.json'),
  'skin-details': () => import('../data/skin-details.json'),
  'event-relics': () => import('../data/event-relics.json'),
  'astral-pact': () => import('../data/astral-pact.json'),
  collaborations: () => import('../data/collaborations.json'),
  'bed-calculations': () => import('../data/bed-calculations.json'),
} as const;

export type LazyDataset = keyof typeof lazy;

const cache = new Map<LazyDataset, unknown[]>();

/** Loads a large dataset once and serves it from memory afterwards. */
export async function load<T>(name: LazyDataset): Promise<T[]> {
  const cached = cache.get(name);
  if (cached) return cached as T[];
  const mod = await lazy[name]();
  const rows = (mod.default ?? mod) as T[];
  cache.set(name, rows as unknown[]);
  return rows;
}

/** Class names in the order the workbook lists them, grouped by branch. */
export const classNames = classes
  .map((c) => c.Class)
  .filter((c): c is string => typeof c === 'string' && c !== '');

export function classByName(name: string): ClassRow | undefined {
  return classes.find((c) => c.Class.toLowerCase() === name.toLowerCase());
}

/**
 * Ratings label classes as "Destroyer T4" while every other tab uses the bare
 * class name, so match on the leading word.
 */
export function ratingForClass(name: string): ClassRatingRow | undefined {
  const target = name.toLowerCase();
  return classRatings.find((r) => r.CLASS.toLowerCase().split(' ')[0] === target);
}
