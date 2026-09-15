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

  useEffect(() => {
    let cancelled = false;
    load<ServerRow>('servers').then((rows) => { if (!cancelled) setServers(rows); });
    return () => { cancelled = true; };
  }, []);

  const nexusList = useMemo(() => {
    const set = new Set<number>();
    for (const s of servers ?? []) if (typeof s.NEXUS === 'number') set.add(s.NEXUS);
    return [...set].sort((a, b) => a - b);
  }, [servers]);

  const serversInNexus = useMemo(() => {
    if (!servers || profile.nexus === null) return [];
    return servers
      .filter((s) => s.NEXUS === profile.nexus)
      .sort((a, b) => Number(a['SERVER #']) - Number(b['SERVER #']));
  }, [servers, profile.nexus]);

  function pickServer(name: string) {
    const server = serversInNexus.find((s) => s['SERVER NAME'] === name);
    if (!server) {
      setProfile({ ...profile, serverName: '', serverNumber: null });
      return;
    }
    // Selecting a server is what supplies the start date the whole guide is
    // keyed on, so write both in one update.
    setProfile({
      ...profile,
      serverName: server['SERVER NAME'],
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
        <div className="grid cols-3">
          <div className="field">
            <label htmlFor="nexus">Nexus</label>
            <select
              id="nexus"
              value={profile.nexus ?? ''}
              disabled={!servers}
              onChange={(e) => setProfile({
                ...profile,
                nexus: num(e.target.value),
                serverName: '',
                serverNumber: null,
              })}
            >
              <option value="">{servers ? 'Select…' : 'Loading…'}</option>
              {nexusList.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div className="field">
            <label htmlFor="server">Server</label>
            <select
              id="server"
              value={profile.serverName}
              disabled={!serversInNexus.length}
              onChange={(e) => pickServer(e.target.value)}
            >
              <option value="">{profile.nexus === null ? 'Pick a nexus first' : 'Select…'}</option>
              {serversInNexus.map((s) => (
                <option key={`${s['SERVER #']}-${s['SERVER NAME']}`} value={s['SERVER NAME']}>
                  {s['SERVER #']} · {s['SERVER NAME']}
                </option>
              ))}
            </select>
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
                : 'Set this directly if your server is not listed.'}
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
