// Row shapes for the generated datasets in src/data/. Keys are the column
// headers from the source workbook, so they keep the spelling (and the
// occasional typo) that the spreadsheet uses.

export interface ClassRow {
  Image: string;
  Branch: string;
  Class: string;
  'Sub Class': string;
  Tier: number | '';
}

export interface ServerRow {
  NEXUS: number | '';
  'SERVER #': number | '';
  'SERVER NAME': string;
  STATUS: string;
  'SERVER CREATION TIME': string;
  'START DATE': string;
  'SEASON STATUS': string;
  'DAYS LIVE': number | '';
  PROGRESS: number | '';
}

export interface MilestoneRow {
  IMAGE: string;
  WEEK: number | '';
  SEASON: string;
  DAY: number | '';
  DATE: string;
  MILESTONE: string;
  TYPE: string;
  LENGTH: number | '';
}

export interface SeasonRow {
  Season: string;
  Region: string;
  'Start Date': string;
  'End Date': string;
}

export interface ExperienceRow {
  Level: number | '';
  'Experience Needed': number | '';
  'Total Experience': number | '';
}

export interface SkillRow {
  Image: string;
  'Skill Name': string;
  'Class Tier': number | '';
  Class: string;
  'Technique/Charm': string;
  Cooldown: number | '';
  'Element/Physical/Buff/Debuff': string;
  Description: string;
  Rarity: string;
  'Skill Damage': number | '';
  Rare: number | '';
  Epic: number | '';
  Legendary: number | '';
  Mythic: number | '';
  Divine: number | '';
  Immortal: number | '';
}

export interface BuildRow {
  'Build Name': string;
  Class: string;
  Technique: string;
  Charm: string;
}

export interface CommunityBuildRow {
  'Build Name': string;
  Class: string;
  [slot: string]: string;
}

export interface ClassRatingRow {
  'TOTAL REVIEWS': number | string;
  CLASS: string;
  SEASON: number | '';
  PVP: number | '';
  PVE: number | '';
  '4V4 (Tournament)': number | '';
  'Chaos and Crucible': number | '';
  Investment: number | '';
  'SEASON AVERAGE': number | '';
  RATING: string;
}

export interface DungeonRow {
  SEASON: string;
  REGION: string;
  'DUNGEON NAME': string;
  LOCATION: string;
  IMAGE: string;
  'GEAR LEVEL': number | '';
  [difficulty: string]: string | number | '';
}

export interface DungeonSetRow {
  SEASON: string;
  DUNGEON: string;
  IMAGE: string;
  SET: string;
  '2 PIECE': string;
  '4 PIECE': string;
  'SKILL/CHARM': string;
  DESCRIPTION: string;
}

export interface GearPowerRow {
  SEASON: string;
  DUNGEON: string;
  LEGENDARY: number | '';
  MYTHIC: number | '';
  DIVINE: number | '';
  'DIVINE+': number | '';
}

export interface RelicRow {
  IMAGE: string;
  REGION: string;
  ZONE: string;
  NAME: string;
  RARITY: string;
  ATTRIBUTE: string;
  'BASE STAT': number | '';
  'RATE INCREASE PER STAR': number | '';
  'AWAKENED STAT': number | '';
  ELEMENT: string;
  SETS: string;
}

export interface RelicSetRow {
  'SET NAME': string;
  'COMPLETE SET BONUS': string;
  '3-STAR SET BONUS': string;
  'AWAKENED SET BONUS': string;
}

export interface CompanionRow {
  REGION: string;
  'REGION TYPE': string;
  Image: string;
  NAME: string;
  CLASS: string;
  'MAIN FOCUS': string;
  'SUB STATS': string;
  COLLAB: string;
}

export interface MonsterRow {
  Season: string;
  Image: string;
  Monster: string;
  Rarity: string;
  Dungeon: string;
  'Min Level': number | '';
  'Max Level': number | '';
  HP: number | '';
  DEF: number | '';
  ATK: number | '';
  SPD: number | '';
}

export interface GlossaryRow {
  'Column 1': string;
  Season: string;
  Image: string;
  Location: string;
  Detail: string;
  'Dungeon / Key Target': string;
}

export interface StatRow {
  label: string;
  value: number | string;
}

export interface ScoreBand {
  min: number;
  /** null on the top band, which has no ceiling. */
  max: number | null;
  grade: string;
}

export interface ProgressionRule {
  label: string;
  /** Level above which points start accruing; null if the label omitted it. */
  threshold: number | null;
  perLevel: number;
}

export interface SeasonScoring {
  season: string;
  title: string;
  experienceCap: number | null;
  gameplay: string[];
  progression: ProgressionRule[];
  gearSlots: string[];
  rarities: string[];
  bands: ScoreBand[];
}
