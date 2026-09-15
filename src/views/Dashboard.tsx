import { useMemo } from 'react';
import {
  buildSchedule, experiencePlan, formatDate, formatDuration, formatNumber,
  parseDate, regionForSeason, seasonForDay, serverDay,
} from '../lib/compute';
import { classByName, ratingForClass } from '../lib/data';
import type { Profile } from '../lib/profile';
import { Empty, Panel, Stat } from '../components/ui';

export default function Dashboard({ profile, onSetup }: { profile: Profile; onSetup: () => void }) {
  const start = parseDate(profile.startDate);
  const today = start ? serverDay(start) : null;

  const schedule = useMemo(
    () => (start && today !== null ? buildSchedule(start, today) : []),
    [start, today],
  );

  const active = schedule.filter((e) => e.status === 'active');
  const upcoming = schedule.filter((e) => e.status === 'upcoming').slice(0, 6);

  const season = today !== null ? seasonForDay(today) : null;
  const region = season ? regionForSeason(season.season) : '';
  const seasonProgress = season && today !== null
    ? Math.min(1, Math.max(0, (today - season.firstDay) / Math.max(1, season.lastDay - season.firstDay)))
    : 0;

  const plan = useMemo(() => experiencePlan(
    profile.currentLevel ?? 0,
    profile.targetLevel ?? 0,
    profile.currentExp ?? 0,
    profile.expPerHour ?? 0,
  ), [profile.currentLevel, profile.targetLevel, profile.currentExp, profile.expPerHour]);

  const klass = profile.className ? classByName(profile.className) : undefined;
  const rating = profile.className ? ratingForClass(profile.className) : undefined;

  if (!start) {
    return (
      <Panel title="Set up your character">
        <p className="muted" style={{ marginTop: 0 }}>
          Pick your server and class and the guide dates every milestone, event
          and dungeon against your own server's timeline.
        </p>
        <button className="btn" onClick={onSetup}>Get started</button>
      </Panel>
    );
  }

  return (
    <>
      <div className="grid cols-4">
        <Stat
          label="Server day"
          value={today?.toLocaleString() ?? '—'}
          sub={`Opened ${formatDate(start)}`}
        />
        <Stat
          label="Season"
          value={season ? season.season.replace('SEASON', 'Season') : '—'}
          sub={region ? `Region: ${region}` : undefined}
        />
        <Stat
          label="Active now"
          value={active.length}
          sub={active.length ? 'events and unlocks running' : 'nothing running'}
        />
        <Stat
          label="Next up"
          value={upcoming[0] ? `${upcoming[0].daysAway}d` : '—'}
          sub={upcoming[0]?.name ?? 'end of schedule'}
        />
      </div>

      {season && (
        <Panel
          title={`${season.season.replace('SEASON', 'Season')} progress`}
          note={`Day ${today} · season runs from day ${season.firstDay} to ${season.lastDay}`}
        >
          <div className="bar"><i style={{ width: `${(seasonProgress * 100).toFixed(1)}%` }} /></div>
          <p className="dim" style={{ marginBottom: 0 }}>
            {(seasonProgress * 100).toFixed(0)}% through · {Math.max(0, season.lastDay - (today ?? 0))} days
            remaining in this season
          </p>
        </Panel>
      )}

      <Panel title="Running now" note="Events and unlocks live on your server today">
        {active.length === 0 ? (
          <Empty>Nothing scheduled for day {today}.</Empty>
        ) : (
          <div>
            {active.map((e, i) => (
              <div className="entry active" key={`${e.day}-${e.name}-${i}`}>
                <span className="day">Day {e.day}</span>
                <span>
                  <span className="name">{e.name}</span>{' '}
                  <span className={`chip ${e.type === 'EVENT' ? 'gold' : 'green'}`}>{e.type}</span>
                </span>
                <span className="when">
                  {e.endDay > e.day ? `until ${formatDate(e.endDate)}` : formatDate(e.date)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Coming up" note="Dated against your server's own calendar">
        {upcoming.length === 0 ? (
          <Empty>Your server is past the end of the tracked schedule.</Empty>
        ) : (
          <div>
            {upcoming.map((e, i) => (
              <div className="entry upcoming" key={`${e.day}-${e.name}-${i}`}>
                <span className="day">Day {e.day}</span>
                <span>
                  <span className="name">{e.name}</span>{' '}
                  <span className={`chip ${e.type === 'EVENT' ? 'gold' : 'grey'}`}>{e.type}</span>
                </span>
                <span className="when">
                  {e.daysAway === 0 ? 'today' : `in ${e.daysAway}d · ${formatDate(e.date)}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid cols-2">
        <Panel title="Levelling">
          {!plan.valid ? (
            <p className="muted" style={{ margin: 0 }}>
              Set a current and target level on the Setup tab to estimate the grind.
            </p>
          ) : (
            <>
              <div className="grid tight" style={{ marginBottom: 12 }}>
                <Stat
                  label={`Level ${profile.currentLevel} → ${profile.targetLevel}`}
                  value={formatNumber(plan.remaining)}
                  sub="experience remaining"
                />
                <Stat
                  label="At your current rate"
                  value={formatDuration(plan.hours)}
                  sub={plan.eta ? `≈ ${formatDate(plan.eta)}` : 'set experience per hour'}
                />
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Level</th><th className="num">Needed</th><th className="num">Cumulative</th></tr>
                  </thead>
                  <tbody>
                    {plan.steps.slice(0, 12).map((s) => (
                      <tr key={s.level}>
                        <td>{s.level}</td>
                        <td className="num">{formatNumber(s.needed)}</td>
                        <td className="num">{formatNumber(s.cumulative)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="dim" style={{ marginBottom: 0 }}>
                {plan.steps.length > 12 && `Showing the first 12 of ${plan.steps.length} levels. `}
                {(profile.currentExp ?? 0) > 0 && `Cumulative is the full cost of each level; the
                 headline above nets off the ${formatNumber(profile.currentExp)} you have banked.`}
              </p>
            </>
          )}
        </Panel>

        <Panel title="Your class">
          {!klass ? (
            <p className="muted" style={{ margin: 0 }}>Pick a class on the Setup tab.</p>
          ) : (
            <>
              <h3>{klass.Class}</h3>
              <p className="meta dim">
                {klass.Branch} · {klass['Sub Class']} · Tier {klass.Tier}
              </p>
              {rating ? (
                <div className="grid tight" style={{ marginTop: 12 }}>
                  <Stat label="Community rating" value={rating.RATING || '—'} sub={`Season ${rating.SEASON}`} />
                  <Stat label="Average" value={formatNumber(rating['SEASON AVERAGE'])} sub="out of 5" />
                  <Stat label="PvP" value={formatNumber(rating.PVP)} />
                  <Stat label="PvE" value={formatNumber(rating.PVE)} />
                  <Stat label="4v4" value={formatNumber(rating['4V4 (Tournament)'])} />
                  <Stat label="Chaos / Crucible" value={formatNumber(rating['Chaos and Crucible'])} />
                </div>
              ) : (
                <p className="dim" style={{ marginBottom: 0 }}>
                  No community ratings submitted for this class yet.
                </p>
              )}
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
