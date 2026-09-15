import { useEffect, useMemo, useState } from 'react';
import { classes, load } from '../lib/data';
import { formatDate, parseDate, serverDay } from '../lib/compute';
import type { ServerRow } from '../lib/types';
import type { Profile } from '../lib/profile';
import { Panel } from '../components/ui';

interface Props {
  profile: Profile;
  update: <K extends keyof Profile>(key: K, value: Profile[K]) => void;
  setProfile: (p: Profile) => void;
  reset: () => void;
  onDone: () => void;
}

/** Parses a number input, treating a cleared field as "not set" rather than 0. */
function num(value: string): number | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function Setup({ profile, update, setProfile, reset, onDone }: Props) {
  const [servers, setServers] = useState<ServerRow[] | null>(null);
  // What the player has typed so far, kept apart from the confirmed selection
  // so a half-typed name does not wipe the server they already picked.
  const [query, setQuery] = useState(profile.serverName);

  useEffect(() => {
    let cancelled = false;
    load<ServerRow>('servers').then((rows) => { if (!cancelled) setServers(rows); });
    return () => { cancelled = true; };
  }, []);

  // Every server name in the workbook is unique, so the name alone identifies a
  // server and the nexus can be derived rather than asked for.
  const sortedServers = useMemo(
    () => [...(servers ?? [])].sort((a, b) =>
      a['SERVER NAME'].localeCompare(b['SERVER NAME'], undefined, { numeric: true })),
    [servers],
  );

  const matched = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return undefined;
    return sortedServers.find((s) => s['SERVER NAME'].toLowerCase() === needle);
  }, [sortedServers, query]);

  // Partial matches, so a half-typed name reads as progress rather than as an
  // error. Only text that matches nothing at all is reported as not found.
  const partialCount = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle || matched) return 0;
    return sortedServers.filter((s) => s['SERVER NAME'].toLowerCase().includes(needle)).length;
  }, [sortedServers, query, matched]);

  function typeServer(value: string) {
    setQuery(value);
    const needle = value.trim().toLowerCase();
    const server = sortedServers.find((s) => s['SERVER NAME'].toLowerCase() === needle);
    if (!server) {
      // Keep whatever start date is already set: a player mid-keystroke has not
      // asked to clear their server, and unlisted servers rely on it.
      setProfile({ ...profile, serverName: '', serverNumber: null, nexus: null });
      return;
    }
    // Picking a server is what supplies the start date the whole guide is keyed
    // on, so write it and the nexus together.
    setProfile({
      ...profile,
      serverName: server['SERVER NAME'],
      nexus: typeof server.NEXUS === 'number' ? server.NEXUS : null,
      serverNumber: typeof server['SERVER #'] === 'number' ? server['SERVER #'] : null,
      startDate: server['START DATE'] || server['SERVER CREATION TIME'] || '',
    });
  }

  const start = parseDate(profile.startDate);
  const day = start ? serverDay(start) : null;

  const branches = useMemo(() => {
    const out = new Map<string, typeof classes>();
    for (const c of classes) {
      if (!out.has(c.Branch)) out.set(c.Branch, []);
      out.get(c.Branch)!.push(c);
    }
    return [...out.entries()];
  }, []);

  return (
    <>
      <Panel
        title="Your server"
        note="Everything in the guide is dated from the day your server opened."
      >
        <div className="grid cols-2">
          <div className="field">
            <label htmlFor="server">Server name</label>
            <input
              id="server"
              list="server-options"
              autoComplete="off"
              spellCheck={false}
              value={query}
              placeholder={servers ? 'Start typing, e.g. First Dawn' : 'Loading servers…'}
              disabled={!servers}
              onChange={(e) => typeServer(e.target.value)}
            />
            <datalist id="server-options">
              {sortedServers.map((s) => (
                <option key={s['SERVER NAME']} value={s['SERVER NAME']}>
                  Nexus {s.NEXUS} · server {s['SERVER #']}
                </option>
              ))}
            </datalist>
            <span className="hint">
              {matched
                ? `Nexus ${matched.NEXUS} · server ${matched['SERVER #']} · ${matched.STATUS.toLowerCase()}`
                : partialCount > 0
                  ? `${partialCount} server${partialCount === 1 ? '' : 's'} match — keep typing, or pick one from the list.`
                  : query.trim()
                    ? `No server called "${query.trim()}" — check the spelling, or set the start date below yourself.`
                    : `${sortedServers.length || ''} servers. Your nexus is filled in for you.`}
            </span>
          </div>

          <div className="field">
            <label htmlFor="start">Server start date</label>
            <input
              id="start"
              type="date"
              value={profile.startDate ? profile.startDate.slice(0, 10) : ''}
              onChange={(e) => update('startDate', e.target.value ? `${e.target.value}T09:00:00` : '')}
            />
            <span className="hint">
              {day !== null
                ? `Day ${day.toLocaleString()} · opened ${formatDate(start)}`
                : 'Filled in when you pick a server. Set it directly if yours is not listed.'}
            </span>
          </div>
        </div>
      </Panel>

      <Panel title="Your character">
        <div className="grid cols-3">
          <div className="field">
            <label htmlFor="class">Class</label>
            <select
              id="class"
              value={profile.className}
              onChange={(e) => update('className', e.target.value)}
            >
              <option value="">Select…</option>
              {branches.map(([branch, list]) => (
                <optgroup key={branch} label={branch}>
                  {list.map((c) => (
                    <option key={c.Class} value={c.Class}>
                      {c.Class} — {c['Sub Class']} (T{c.Tier})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="level">Current level</label>
            <input
              id="level" type="number" min={1} max={250} inputMode="numeric"
              value={profile.currentLevel ?? ''}
              onChange={(e) => update('currentLevel', num(e.target.value))}
            />
          </div>

          <div className="field">
            <label htmlFor="target">Target level</label>
            <input
              id="target" type="number" min={1} max={250} inputMode="numeric"
              value={profile.targetLevel ?? ''}
              onChange={(e) => update('targetLevel', num(e.target.value))}
            />
          </div>

          <div className="field">
            <label htmlFor="exp">Current experience</label>
            <input
              id="exp" type="number" min={0} inputMode="numeric"
              value={profile.currentExp ?? ''}
              onChange={(e) => update('currentExp', num(e.target.value))}
            />
            <span className="hint">Progress banked toward your next level.</span>
          </div>

          <div className="field">
            <label htmlFor="rate">Experience per hour</label>
            <input
              id="rate" type="number" min={0} inputMode="numeric"
              value={profile.expPerHour ?? ''}
              onChange={(e) => update('expPerHour', num(e.target.value))}
            />
            <span className="hint">Used to estimate time to your target.</span>
          </div>

          <div className="field">
            <label htmlFor="power">Power rating</label>
            <input
              id="power" type="number" min={0} inputMode="numeric"
              value={profile.powerRating ?? ''}
              onChange={(e) => update('powerRating', num(e.target.value))}
            />
            <span className="hint">Used to flag which dungeon gear is a step up.</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
          <button className="btn" onClick={onDone}>Show my guide</button>
          <button className="btn ghost" onClick={reset}>Clear</button>
        </div>
        <p className="dim" style={{ marginTop: 12 }}>
          Saved in this browser only. Nothing is uploaded anywhere.
        </p>
      </Panel>
    </>
  );
}
