import { useEffect, useMemo, useState } from 'react';
import { seasonScoring } from '../lib/data';
import { formatNumber, parseDate, seasonForDay, serverDay } from '../lib/compute';
import type { ScoreBand, SeasonScoring } from '../lib/types';
import type { Profile } from '../lib/profile';
import { Empty, Panel, Stat } from '../components/ui';

type Inputs = Record<string, number>;

const STORAGE_KEY = 'sxsguide.score.v1';

function readSaved(): Record<string, Inputs> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, Inputs>;
  } catch {
    return {};
  }
}

function gradeFor(score: number, bands: ScoreBand[]): ScoreBand | null {
  return bands.find((b) => score >= b.min && (b.max === null || score <= b.max)) ?? null;
}

function sum(inputs: Inputs, keys: string[]): number {
  return keys.reduce((total, key) => total + (inputs[key] || 0), 0);
}

/** A labelled number input that leaves the field blank rather than showing 0. */
function NumberField({ id, label, hint, value, onChange }: {
  id: string; label: string; hint?: string; value: number | undefined;
  onChange: (n: number) => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id} type="number" min={0} inputMode="numeric"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

export default function SeasonScore({ profile }: { profile: Profile }) {
  const start = parseDate(profile.startDate);
  const serverSeason = start ? seasonForDay(serverDay(start))?.season ?? '' : '';

  const defaultSeason = useMemo(() => {
    const match = seasonScoring.find(
      (s) => s.season.toLowerCase() === serverSeason.toLowerCase(),
    );
    return match ?? seasonScoring[0];
  }, [serverSeason]);

  const [season, setSeason] = useState<SeasonScoring>(defaultSeason);
  const [saved, setSaved] = useState<Record<string, Inputs>>(readSaved);

  const inputs = saved[season.season] ?? {};

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    } catch {
      /* Saving is a convenience; the calculator works without it. */
    }
  }, [saved]);

  function set(key: string, value: number) {
    setSaved((prev) => ({
      ...prev,
      [season.season]: { ...(prev[season.season] ?? {}), [key]: value },
    }));
  }

  const gameplayRating = sum(inputs, season.gameplay.map((g) => `g:${g}`));

  // Progression points are levels earned past the season's threshold, times
  // that category's rate.
  const progressionRows = season.progression.map((rule) => {
    const levels = inputs[`p:${rule.label}`] || 0;
    return { rule, levels, points: levels * rule.perLevel };
  });
  const progressionRating = progressionRows.reduce((t, r) => t + r.points, 0);

  const gearRating = sum(inputs, season.gearSlots.map((s) => `x:${s}`));

  const total = gameplayRating + progressionRating + gearRating;
  const band = gradeFor(total, season.bands);
  const nextBand = season.bands.find((b) => b.min > total);

  return (
    <>
      <Panel
        title="Season score"
        note={
          serverSeason
            ? `Your server is in ${serverSeason.replace('SEASON', 'Season')}`
            : 'Set your server to default this to your current season'
        }
      >
        <div className="toolbar">
          <div className="field wide">
            <label htmlFor="ss-season">Season</label>
            <select
              id="ss-season"
              value={season.season}
              onChange={(e) => setSeason(
                seasonScoring.find((s) => s.season === e.target.value) ?? seasonScoring[0],
              )}
            >
              {seasonScoring.map((s) => (
                <option key={s.season} value={s.season}>
                  {s.season}{s.title ? ` — ${s.title}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid cols-4">
          <Stat label="Gameplay" value={formatNumber(gameplayRating)} />
          <Stat label="Progression" value={formatNumber(progressionRating)} />
          <Stat label="Gear" value={formatNumber(gearRating)} />
          <Stat
            label="Season score"
            value={<>{formatNumber(total)} {band && <span className="chip gold">{band.grade}</span>}</>}
            sub={nextBand
              ? `${formatNumber(nextBand.min - total)} to ${nextBand.grade}`
              : band ? 'top band reached' : undefined}
          />
        </div>
      </Panel>

      <Panel title="Gameplay rating" note="Points earned from each season activity">
        <div className="grid cols-3">
          {season.gameplay.map((label) => (
            <NumberField
              key={label}
              id={`g-${label}`}
              label={label}
              value={inputs[`g:${label}`]}
              onChange={(n) => set(`g:${label}`, n)}
            />
          ))}
        </div>
      </Panel>

      <Panel
        title="Progression rating"
        note="Levels earned past this season's threshold, times the season's rate"
      >
        <div className="grid cols-3">
          {progressionRows.map(({ rule, points }) => (
            <NumberField
              key={rule.label}
              id={`p-${rule.label}`}
              label={rule.label}
              hint={`${rule.perLevel} per level${rule.threshold !== null
                ? ` above ${rule.threshold}` : ''} · ${formatNumber(points)} points`}
              value={inputs[`p:${rule.label}`]}
              onChange={(n) => set(`p:${rule.label}`, n)}
            />
          ))}
        </div>
      </Panel>

      <Panel title="Gear rating" note="The rating each equipped piece contributes">
        <div className="grid cols-3">
          {season.gearSlots.map((slot) => (
            <NumberField
              key={slot}
              id={`x-${slot}`}
              label={slot}
              value={inputs[`x:${slot}`]}
              onChange={(n) => set(`x:${slot}`, n)}
            />
          ))}
        </div>
        <p className="dim" style={{ marginBottom: 0 }}>
          Gear points are specific to the piece you have equipped, so there is no
          table to look them up in — read them off your gear, as the spreadsheet does.
        </p>
      </Panel>

      <Panel title={`${season.season} bands`}>
        {season.bands.length === 0 ? (
          <Empty>No bands published for this season.</Empty>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Grade</th><th className="num">From</th><th className="num">To</th><th /></tr>
              </thead>
              <tbody>
                {season.bands.map((b) => (
                  <tr key={b.grade}>
                    <td><b>{b.grade}</b></td>
                    <td className="num">{formatNumber(b.min)}</td>
                    <td className="num">{b.max === null ? '—' : formatNumber(b.max)}</td>
                    <td>{band?.grade === b.grade && <span className="chip green">you are here</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="dim" style={{ marginBottom: 0 }}>
          Astral points are not calculated here: the workbook derives them
          differently in each season tab and the formula is not recoverable from
          the exported values.
        </p>
      </Panel>
    </>
  );
}
