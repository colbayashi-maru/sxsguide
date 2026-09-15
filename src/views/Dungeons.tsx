import { useMemo, useState } from 'react';
import { dropRates, dungeonSets, dungeons, gearPower } from '../lib/data';
import { formatNumber, parseDate, seasonForDay, serverDay } from '../lib/compute';
import type { Profile } from '../lib/profile';
import { Empty, Panel } from '../components/ui';

/**
 * Dungeon names are spelled differently across tabs — "Ocean Palace Ruins" in
 * one, "OCEAN PALACE RUINS (100)" in another. Strip the level range and case so
 * the three tabs join.
 */
function dungeonKey(name: unknown): string {
  return String(name ?? '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase();
}

const DIFFICULTIES = ['NORMAL', 'HARD', 'NIGHTMARE', 'PURGATORY', 'ABYSS'] as const;
const GEAR_TIERS = ['LEGENDARY', 'MYTHIC', 'DIVINE', 'DIVINE+'] as const;

export default function Dungeons({ profile }: { profile: Profile }) {
  const start = parseDate(profile.startDate);
  const today = start ? serverDay(start) : null;
  const currentSeason = today !== null ? seasonForDay(today)?.season ?? '' : '';

  const seasonOptions = useMemo(
    () => [...new Set(dungeons.map((d) => String(d.SEASON)).filter(Boolean))],
    [],
  );

  // Default to the season the player's server is actually in, matching the
  // workbook's "Season 2" spelling against the schedule's "SEASON 2".
  const defaultSeason = useMemo(() => {
    const match = seasonOptions.find(
      (s) => s.toLowerCase() === currentSeason.toLowerCase(),
    );
    return match ?? '';
  }, [seasonOptions, currentSeason]);

  const [season, setSeason] = useState(defaultSeason);

  const setsByDungeon = useMemo(() => {
    const map = new Map<string, typeof dungeonSets>();
    for (const s of dungeonSets) {
      const key = dungeonKey(s.DUNGEON);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return map;
  }, []);

  const dropsByDungeon = useMemo(() => {
    const map = new Map<string, Record<string, string | number>>();
    for (const d of dropRates) map.set(dungeonKey(d.DUNGEONS), d);
    return map;
  }, []);

  const powerByDungeon = useMemo(() => {
    const map = new Map<string, typeof gearPower[number]>();
    for (const g of gearPower) map.set(dungeonKey(g.DUNGEON), g);
    return map;
  }, []);

  const shown = useMemo(
    () => dungeons.filter((d) => !season || String(d.SEASON) === season),
    [season],
  );

  const power = profile.powerRating;

  return (
    <>
      <Panel
        title="Dungeons"
        note={
          currentSeason
            ? `Your server is in ${currentSeason.replace('SEASON', 'Season')}`
            : 'Set your server to default this to your current season'
        }
      >
        <div className="toolbar">
          <div className="field wide">
            <label htmlFor="dg-season">Season</label>
            <select id="dg-season" value={season} onChange={(e) => setSeason(e.target.value)}>
              <option value="">All seasons</option>
              {seasonOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        {power === null && (
          <p className="notice">
            Add your power rating on the Setup tab and each gear tier is marked
            as within reach or still ahead of you.
          </p>
        )}
      </Panel>

      {shown.length === 0 ? (
        <Panel><Empty>No dungeons for that season.</Empty></Panel>
      ) : shown.map((d, i) => {
        const key = dungeonKey(d['DUNGEON NAME']);
        const sets = setsByDungeon.get(key) ?? [];
        const drops = dropsByDungeon.get(key);
        const gear = powerByDungeon.get(key);

        // The drop-rate tab mixes percentages with the names of the sets that
        // drop there; split them so each renders as what it is.
        const dropEntries = Object.entries(drops ?? {})
          .filter(([k, v]) => k !== 'DUNGEONS' && v !== '' && v !== undefined);
        const rates = dropEntries
          .filter((e): e is [string, number] => typeof e[1] === 'number');
        const droppedSets = [...new Set(
          dropEntries.filter(([, v]) => typeof v === 'string').map(([, v]) => String(v)),
        )];

        return (
          <Panel key={`${key}-${i}`}>
            <header>
              <h2>{String(d['DUNGEON NAME'])}</h2>
              <p>
                {String(d.SEASON)} · {String(d.REGION)}
                {d.LOCATION ? ` · ${String(d.LOCATION)}` : ''}
                {d['GEAR LEVEL'] !== '' ? ` · gear level ${formatNumber(d['GEAR LEVEL'])}` : ''}
              </p>
            </header>

            <div className="grid cols-3">
              <div>
                <h3 className="dim">Clear power by difficulty</h3>
                <div className="table-wrap" style={{ marginTop: 8 }}>
                  <table>
                    <tbody>
                      {DIFFICULTIES.filter((k) => d[k] !== '' && d[k] !== undefined).map((k) => (
                        <tr key={k}>
                          <td>{k}</td>
                          <td className="num">{formatNumber(d[k] as number)}</td>
                        </tr>
                      ))}
                      {DIFFICULTIES.every((k) => d[k] === '' || d[k] === undefined) && (
                        <tr><td className="dim">Not published</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="dim">Gear power</h3>
                <div className="table-wrap" style={{ marginTop: 8 }}>
                  <table>
                    <tbody>
                      {GEAR_TIERS.map((tier) => {
                        const value = gear?.[tier] ?? d[tier];
                        if (value === '' || value === undefined) return null;
                        const reachable = power !== null && typeof value === 'number' && power >= value;
                        return (
                          <tr key={tier}>
                            <td>{tier}</td>
                            <td className="num">{formatNumber(value as number)}</td>
                            <td>
                              {power === null ? null : (
                                <span className={`chip ${reachable ? 'green' : 'grey'}`}>
                                  {reachable ? 'in reach' : 'ahead of you'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {GEAR_TIERS.every((t) => (gear?.[t] ?? d[t]) === '' || (gear?.[t] ?? d[t]) === undefined) && (
                        <tr><td className="dim">Not published</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="dim">Drop rates</h3>
                <div className="table-wrap" style={{ marginTop: 8 }}>
                  <table>
                    <tbody>
                      {rates.length > 0
                        ? rates.map(([k, v]) => (
                            <tr key={k}>
                              <td>{k}</td>
                              <td className="num">
                                {v < 1 ? `${(v * 100).toFixed(2)}%` : formatNumber(v)}
                              </td>
                            </tr>
                          ))
                        : <tr><td className="dim">Not published</td></tr>}
                    </tbody>
                  </table>
                </div>
                {droppedSets.length > 0 && (
                  <p style={{ margin: '10px 0 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {droppedSets.map((name) => (
                      <span className="chip grey" key={name}>{name}</span>
                    ))}
                  </p>
                )}
              </div>
            </div>

            {sets.length > 0 && (
              <>
                <h3 className="dim" style={{ marginTop: 16 }}>Gear sets</h3>
                <div className="grid cols-2" style={{ marginTop: 8 }}>
                  {sets.map((s, j) => (
                    <div className="card" key={j}>
                      <h3>{s.SET}</h3>
                      <div className="slots">
                        <div className="slot"><b>2 piece</b><span>{s['2 PIECE'] || '—'}</span></div>
                        <div className="slot"><b>4 piece</b><span>{s['4 PIECE'] || '—'}</span></div>
                        {s['SKILL/CHARM'] && (
                          <div className="slot"><b>{s['SKILL/CHARM']}</b><span>{s.DESCRIPTION}</span></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Panel>
        );
      })}
    </>
  );
}
