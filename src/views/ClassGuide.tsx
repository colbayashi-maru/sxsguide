import { useEffect, useMemo, useState } from 'react';
import { builds, classByName, classes, communityBuilds, load, ratingForClass } from '../lib/data';
import { formatNumber } from '../lib/compute';
import type { SkillRow } from '../lib/types';
import type { Profile } from '../lib/profile';
import { DataTable, Empty, Panel } from '../components/ui';

/** Community build rows keep one column per slot; collect them in order. */
function slotsOf(row: Record<string, unknown>, prefix: string): string[] {
  return Object.keys(row)
    .filter((k) => k.startsWith(prefix))
    .map((k) => String(row[k] ?? '').trim())
    .filter(Boolean);
}

export default function ClassGuide({ profile }: { profile: Profile }) {
  const [selected, setSelected] = useState(profile.className);
  const [skills, setSkills] = useState<SkillRow[] | null>(null);

  useEffect(() => { setSelected(profile.className); }, [profile.className]);

  useEffect(() => {
    let cancelled = false;
    load<SkillRow>('skills').then((rows) => { if (!cancelled) setSkills(rows); });
    return () => { cancelled = true; };
  }, []);

  const klass = selected ? classByName(selected) : undefined;
  const rating = selected ? ratingForClass(selected) : undefined;

  const mine = useMemo(() => {
    if (!skills || !selected) return [];
    const target = selected.toLowerCase();
    return skills.filter((s) => (s.Class ?? '').toLowerCase() === target);
  }, [skills, selected]);

  const techniques = mine.filter((s) => s['Technique/Charm'] === 'Technique');
  const charms = mine.filter((s) => s['Technique/Charm'] === 'Charm');

  const classBuilds = useMemo(() => {
    if (!selected) return [];
    const target = selected.toLowerCase();
    return builds.filter((b) => (b.Class ?? '').toLowerCase() === target);
  }, [selected]);

  const classCommunityBuilds = useMemo(() => {
    if (!selected) return [];
    const target = selected.toLowerCase();
    // Community builds label the class as e.g. "CONQUEROR (T4)".
    return communityBuilds.filter((b) => String(b.Class ?? '').toLowerCase().startsWith(target));
  }, [selected]);

  const skillColumns = [
    'Skill Name', 'Technique/Charm', 'Cooldown',
    'Element/Physical/Buff/Debuff', 'Rarity', 'Description',
  ];

  return (
    <>
      <Panel title="Class guide" note="Skills, ratings and builds for one class">
        <div className="toolbar">
          <div className="field wide">
            <label htmlFor="cg-class">Class</label>
            <select id="cg-class" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Select a class…</option>
              {classes.map((c) => (
                <option key={c.Class} value={c.Class}>
                  {c.Class} — {c.Branch} {c['Sub Class']} (T{c.Tier})
                </option>
              ))}
            </select>
          </div>
        </div>

        {!klass ? (
          <Empty>Pick a class to see its skills and builds.</Empty>
        ) : (
          <div className="grid cols-4">
            <div className="stat">
              <div className="label">Branch</div><div className="value" style={{ fontSize: '1.1rem' }}>{klass.Branch}</div>
            </div>
            <div className="stat">
              <div className="label">Role</div><div className="value" style={{ fontSize: '1.1rem' }}>{klass['Sub Class']}</div>
            </div>
            <div className="stat">
              <div className="label">Tier</div><div className="value" style={{ fontSize: '1.1rem' }}>T{klass.Tier}</div>
            </div>
            <div className="stat">
              <div className="label">Community rating</div>
              <div className="value" style={{ fontSize: '1.1rem' }}>{rating?.RATING ?? '—'}</div>
              {rating && (
                <div className="sub">
                  PvP {formatNumber(rating.PVP)} · PvE {formatNumber(rating.PVE)} ·
                  4v4 {formatNumber(rating['4V4 (Tournament)'])}
                </div>
              )}
            </div>
          </div>
        )}
      </Panel>

      {klass && (
        <>
          <Panel
            title="Builds"
            note={`${classBuilds.length + classCommunityBuilds.length} published for ${klass.Class}`}
          >
            {classBuilds.length + classCommunityBuilds.length === 0 ? (
              <Empty>No builds published for this class yet.</Empty>
            ) : (
              <div className="grid cols-2">
                {classBuilds.map((b, i) => (
                  <div className="card" key={`b-${i}`}>
                    <h3>{b['Build Name']}</h3>
                    <div className="meta">{b.Class}</div>
                    <div className="slots">
                      <div className="slot"><b>Techniques</b><span>{b.Technique || '—'}</span></div>
                      <div className="slot"><b>Charms</b><span>{b.Charm || '—'}</span></div>
                    </div>
                  </div>
                ))}
                {classCommunityBuilds.map((b, i) => {
                  const skillSlots = slotsOf(b, 'Skill Slot');
                  const charmSlots = slotsOf(b, 'Charm Slot');
                  return (
                    <div className="card" key={`cb-${i}`}>
                      <h3>{b['Build Name']}</h3>
                      <div className="meta">{b.Class} · community submission</div>
                      <div className="slots">
                        <div className="slot"><b>Techniques</b><span>{skillSlots.join(', ') || '—'}</span></div>
                        <div className="slot"><b>Charms</b><span>{charmSlots.join(', ') || '—'}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel
            title="Techniques"
            note={skills ? `${techniques.length} for ${klass.Class}` : 'Loading skill data…'}
          >
            {!skills ? <Empty>Loading…</Empty>
              : techniques.length === 0 ? <Empty>No techniques listed for this class.</Empty>
              : <DataTable rows={techniques} columns={skillColumns} wrap={['Description']} pageSize={40} />}
          </Panel>

          <Panel
            title="Charms"
            note={skills ? `${charms.length} for ${klass.Class}` : 'Loading skill data…'}
          >
            {!skills ? <Empty>Loading…</Empty>
              : charms.length === 0 ? <Empty>No charms listed for this class.</Empty>
              : <DataTable rows={charms} columns={skillColumns} wrap={['Description']} pageSize={40} />}
          </Panel>
        </>
      )}
    </>
  );
}
