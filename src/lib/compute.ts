// Derives a player's personal guide from their profile.
//
// The workbook's schedule is server-relative: every milestone carries a DAY
// number counted from the day a server opened, and the DATE column is only the
// calendar the author's own server happened to land on. So the app ignores that
// column and recomputes each date against the player's own start date.

import { experienceTable, milestones, seasons } from './data';
import type { MilestoneRow } from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 1-based day count for a server, where the day it opened is day 1. */
export function serverDay(startDate: Date, now = new Date()): number {
  return Math.floor((now.getTime() - startDate.getTime()) / DAY_MS) + 1;
}

export function dateForDay(startDate: Date, day: number): Date {
  return new Date(startDate.getTime() + (day - 1) * DAY_MS);
}

export interface SeasonSpan {
  season: string;
  firstDay: number;
  lastDay: number;
}

/** Day ranges for each season, read off the milestone schedule itself. */
export const seasonSpans: SeasonSpan[] = (() => {
  const spans = new Map<string, SeasonSpan>();
  for (const m of milestones) {
    const day = typeof m.DAY === 'number' ? m.DAY : null;
    if (!m.SEASON || day === null) continue;
    const existing = spans.get(m.SEASON);
    if (!existing) {
      spans.set(m.SEASON, { season: m.SEASON, firstDay: day, lastDay: day });
    } else {
      existing.firstDay = Math.min(existing.firstDay, day);
      existing.lastDay = Math.max(existing.lastDay, day);
    }
  }
  return [...spans.values()].sort((a, b) => a.firstDay - b.firstDay);
})();

export function seasonForDay(day: number): SeasonSpan | null {
  // Seasons overlap by a day where one ends and the next begins, so scan from
  // the end and take the latest season that has started.
  for (let i = seasonSpans.length - 1; i >= 0; i--) {
    if (day >= seasonSpans[i].firstDay) return seasonSpans[i];
  }
  return seasonSpans[0] ?? null;
}

/** The region a season takes place in, per the Season Listing tab. */
export function regionForSeason(season: string): string {
  const normalised = season.trim().toLowerCase();
  return seasons.find((s) => s.Season.trim().toLowerCase() === normalised)?.Region ?? '';
}

export type EntryStatus = 'past' | 'active' | 'upcoming';

export interface ScheduleEntry {
  milestone: MilestoneRow;
  name: string;
  type: string;
  season: string;
  week: number | null;
  day: number;
  /** Events run for LENGTH days; milestones are a single unlock. */
  endDay: number;
  date: Date;
  /** When the entry stops being available: the start of the day after endDay. */
  endDate: Date;
  status: EntryStatus;
  daysAway: number;
}

/** The whole 500-plus day schedule, dated against one server's start. */
export function buildSchedule(startDate: Date, today: number): ScheduleEntry[] {
  return milestones
    .filter((m) => typeof m.DAY === 'number' && m.MILESTONE)
    .map((m) => {
      const day = m.DAY as number;
      const length = typeof m.LENGTH === 'number' && m.LENGTH > 0 ? m.LENGTH : 1;
      const endDay = m.TYPE === 'EVENT' ? day + length - 1 : day;
      const status: EntryStatus =
        today < day ? 'upcoming' : today > endDay ? 'past' : 'active';
      return {
        milestone: m,
        name: m.MILESTONE,
        type: m.TYPE || 'MILESTONE',
        season: m.SEASON,
        week: typeof m.WEEK === 'number' ? m.WEEK : null,
        day,
        endDay,
        date: dateForDay(startDate, day),
        endDate: dateForDay(startDate, endDay + 1),
        status,
        daysAway: day - today,
      };
    })
    .sort((a, b) => a.day - b.day);
}

export interface ExperiencePlan {
  valid: boolean;
  /** Experience still required to reach the target level. */
  remaining: number;
  hours: number | null;
  eta: Date | null;
  /** Per-level breakdown between the current and target level. */
  steps: { level: number; needed: number; cumulative: number }[];
}

/** Cumulative experience required to reach a level, or null if off the table. */
export function totalExperienceAt(level: number): number | null {
  const row = experienceTable.find((r) => r.Level === level);
  return row && typeof row['Total Experience'] === 'number'
    ? row['Total Experience']
    : null;
}

/** Experience to climb from one level to another. Null if either is off-table. */
export function experienceBetween(from: number, to: number): number | null {
  const a = totalExperienceAt(from);
  const b = totalExperienceAt(to);
  return a === null || b === null ? null : Math.max(0, b - a);
}

const totalExpAt = (level: number): number | null => {
  const row = experienceTable.find((r) => r.Level === level);
  return row && typeof row['Total Experience'] === 'number'
    ? row['Total Experience']
    : null;
};

export function experiencePlan(
  currentLevel: number,
  targetLevel: number,
  currentExp: number,
  expPerHour: number,
): ExperiencePlan {
  const empty: ExperiencePlan = {
    valid: false, remaining: 0, hours: null, eta: null, steps: [],
  };
  const from = totalExpAt(currentLevel);
  const to = totalExpAt(targetLevel);
  if (from === null || to === null || targetLevel <= currentLevel) return empty;

  // currentExp is progress banked toward the next level, so it comes off the
  // total rather than being added to it.
  const remaining = Math.max(0, to - from - (currentExp || 0));
  const hours = expPerHour > 0 ? remaining / expPerHour : null;
  const eta = hours === null ? null : new Date(Date.now() + hours * 60 * 60 * 1000);

  const steps: ExperiencePlan['steps'] = [];
  let cumulative = 0;
  for (let level = currentLevel + 1; level <= targetLevel; level++) {
    const row = experienceTable.find((r) => r.Level === level);
    const needed = row && typeof row['Experience Needed'] === 'number'
      ? row['Experience Needed'] : 0;
    cumulative += needed;
    steps.push({ level, needed, cumulative });
  }

  return { valid: true, remaining, hours, eta, steps };
}

const NUMBER = new Intl.NumberFormat('en-US');

export function formatNumber(value: number | string | undefined | null): string {
  if (value === '' || value === null || value === undefined) return '—';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return String(value);
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  return NUMBER.format(Math.round(n * 100) / 100);
}

export function formatDate(date: Date | null): string {
  if (!date) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDuration(hours: number | null): string {
  if (hours === null || !Number.isFinite(hours)) return '—';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${hours.toFixed(1)} hours`;
  const days = hours / 24;
  if (days < 60) return `${days.toFixed(1)} days`;
  return `${(days / 30.44).toFixed(1)} months`;
}
