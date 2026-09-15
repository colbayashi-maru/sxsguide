import { useMemo, useState } from 'react';
import { buildSchedule, formatDate, parseDate, serverDay } from '../lib/compute';
import type { Profile } from '../lib/profile';
import { Empty, Panel } from '../components/ui';

export default function Schedule({ profile, onSetup }: { profile: Profile; onSetup: () => void }) {
  const [season, setSeason] = useState('');
  const [type, setType] = useState('');
  const [hidePast, setHidePast] = useState(true);

  const start = parseDate(profile.startDate);
  const today = start ? serverDay(start) : null;

  const all = useMemo(
    () => (start && today !== null ? buildSchedule(start, today) : []),
    [start, today],
  );

  const seasonOptions = useMemo(
    () => [...new Set(all.map((e) => e.season).filter(Boolean))],
    [all],
  );

  const shown = useMemo(() => all.filter((e) => {
    if (season && e.season !== season) return false;
    if (type && e.type !== type) return false;
    if (hidePast && e.status === 'past') return false;
    return true;
  }), [all, season, type, hidePast]);

  if (!start) {
    return (
      <Panel title="Schedule">
        <p className="muted" style={{ marginTop: 0 }}>
          Set your server first — the schedule is dated from the day it opened.
        </p>
        <button className="btn" onClick={onSetup}>Set up</button>
      </Panel>
    );
  }

  return (
    <Panel
      title="Full schedule"
      note={`${all.length} entries across the tracked seasons · your server is on day ${today}`}
    >
      <div className="toolbar">
        <div className="field">
          <label htmlFor="sch-season">Season</label>
          <select id="sch-season" value={season} onChange={(e) => setSeason(e.target.value)}>
            <option value="">All</option>
            {seasonOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="sch-type">Type</label>
          <select id="sch-type" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All</option>
            <option value="MILESTONE">Milestone</option>
            <option value="EVENT">Event</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="sch-past">Past entries</label>
          <select
            id="sch-past"
            value={hidePast ? 'hide' : 'show'}
            onChange={(e) => setHidePast(e.target.value === 'hide')}
          >
            <option value="hide">Hidden</option>
            <option value="show">Shown</option>
          </select>
        </div>
      </div>

      {shown.length === 0 ? (
        <Empty>Nothing matches those filters.</Empty>
      ) : (
        <div>
          {shown.map((e, i) => (
            <div className={`entry ${e.status}`} key={`${e.day}-${e.name}-${i}`}>
              <span className="day">Day {e.day}</span>
              <span>
                <span className="name">{e.name}</span>{' '}
                <span className={`chip ${e.type === 'EVENT' ? 'gold' : 'grey'}`}>{e.type}</span>{' '}
                {e.season && <span className="chip grey">{e.season}</span>}
              </span>
              <span className="when">
                {e.status === 'active' ? 'running now'
                  : e.status === 'past' ? formatDate(e.date)
                  : `in ${e.daysAway}d · ${formatDate(e.date)}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
