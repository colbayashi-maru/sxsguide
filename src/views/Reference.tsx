import { useEffect, useState } from 'react';
import { load, relicSets, type LazyDataset } from '../lib/data';
import { DataTable, Empty, Panel, type DataTableProps } from '../components/ui';

type Source =
  | { kind: 'static'; rows: Record<string, unknown>[] }
  | { kind: 'lazy'; dataset: LazyDataset };

interface Section {
  id: string;
  label: string;
  note: string;
  source: Source;
  table: Omit<DataTableProps, 'rows'>;
}

const SECTIONS: Section[] = [
  {
    id: 'relics',
    label: 'Relics',
    note: 'Every relic, its stats and the set it belongs to',
    source: { kind: 'lazy', dataset: 'relics' },
    table: {
      columns: ['NAME', 'REGION', 'ZONE', 'RARITY', 'ATTRIBUTE', 'ELEMENT',
                'BASE STAT', 'RATE INCREASE PER STAR', 'AWAKENED STAT', 'SETS'],
      facets: ['REGION', 'RARITY', 'ELEMENT', 'ATTRIBUTE'],
      searchKeys: ['NAME', 'SETS', 'ATTRIBUTE', 'ZONE'],
    },
  },
  {
    id: 'relic-sets',
    label: 'Relic sets',
    note: 'Set bonuses at complete, 3-star and awakened',
    source: { kind: 'static', rows: relicSets as unknown as Record<string, unknown>[] },
    table: {
      columns: ['SET NAME', 'COMPLETE SET BONUS', '3-STAR SET BONUS', 'AWAKENED SET BONUS'],
      searchKeys: ['SET NAME'],
    },
  },
  {
    id: 'event-relics',
    label: 'Event relics',
    note: 'Relics awarded outside the normal region pool',
    source: { kind: 'lazy', dataset: 'event-relics' },
    table: {
      columns: ['NAME', 'RARITY', 'ATTRIBUTE', 'BASE STAT', 'RATE INCREASE PER STAR',
                'AWAKENED STAT', 'ELEMENT'],
      facets: ['RARITY', 'ELEMENT'],
    },
  },
  {
    id: 'monsters',
    label: 'Monsters',
    note: 'Bosses and mobs with their level ranges and stats',
    source: { kind: 'lazy', dataset: 'monsters' },
    table: {
      columns: ['Monster', 'Season', 'Rarity', 'Dungeon', 'Min Level', 'Max Level',
                'HP', 'DEF', 'ATK', 'SPD'],
      facets: ['Season', 'Rarity', 'Dungeon'],
      searchKeys: ['Monster', 'Dungeon'],
    },
  },
  {
    id: 'companions',
    label: 'Companions',
    note: 'Companions by region, class and stat focus',
    source: { kind: 'lazy', dataset: 'companions' },
    table: {
      columns: ['NAME', 'REGION', 'CLASS', 'MAIN FOCUS', 'SUB STATS', 'COLLAB'],
      facets: ['REGION', 'CLASS', 'MAIN FOCUS'],
      searchKeys: ['NAME', 'SUB STATS'],
    },
  },
  {
    id: 'fantomon',
    label: 'Fantomon',
    note: 'Fantomon and their materialization figures',
    source: { kind: 'lazy', dataset: 'fantomon' },
    table: { facets: ['Rarity', 'Class'], searchKeys: ['Name'] },
  },
  {
    id: 'fantomon-skills',
    label: 'Fantomon skills',
    note: 'Skills by fantomon and growth stage',
    source: { kind: 'lazy', dataset: 'fantomon-skills' },
    table: {
      columns: ['Name', 'Type', 'Skill Name', 'Skill'],
      facets: ['Name', 'Type'],
      wrap: ['Skill'],
    },
  },
  {
    id: 'astral-pact',
    label: 'Astral pact',
    note: 'Buffs unlocked at each point threshold',
    source: { kind: 'lazy', dataset: 'astral-pact' },
    table: { columns: ['Points', 'Buff', 'Cummulative'], searchKeys: ['Buff'] },
  },
  {
    id: 'glossary',
    label: 'Glossary',
    note: 'Locations, gates and landmarks worth knowing',
    source: { kind: 'lazy', dataset: 'glossary' },
    table: {
      columns: ['Column 1', 'Season', 'Location', 'Detail', 'Dungeon / Key Target'],
      facets: ['Season'],
      wrap: ['Detail'],
    },
  },
  {
    id: 'skins',
    label: 'Skins',
    note: 'Appearance sets and how they are obtained',
    source: { kind: 'lazy', dataset: 'skins' },
    table: {
      columns: ['SKINS', 'METHOD OF RECEIVING', 'DETAILS', 'RELEASE DATE'],
      facets: ['METHOD OF RECEIVING'],
      wrap: ['DETAILS'],
    },
  },
  {
    id: 'skin-details',
    label: 'Cosmetics',
    note: 'Individual cosmetic pieces and their prices',
    source: { kind: 'lazy', dataset: 'skin-details' },
    table: {
      columns: ['SKINS', 'TYPE', 'STELLARIS', 'PRICE'],
      facets: ['TYPE'],
      searchKeys: ['SKINS'],
    },
  },
  {
    id: 'collaborations',
    label: 'Collaborations',
    note: 'Crossover events and the characters they brought',
    source: { kind: 'lazy', dataset: 'collaborations' },
    table: {
      columns: ['COLLABORATION', 'ESTIMATED TIME (DAY 1 SERVERS)', 'DURATION',
                'LIMITED FANTOMON', 'LIMITED COMPANIONS', 'FREE COMPANION'],
      searchKeys: ['COLLABORATION'],
    },
  },
  {
    id: 'servers',
    label: 'Servers',
    note: 'Every server, when it opened and where it is in the season cycle',
    source: { kind: 'lazy', dataset: 'servers' },
    table: {
      columns: ['NEXUS', 'SERVER #', 'SERVER NAME', 'STATUS', 'START DATE',
                'SEASON STATUS', 'DAYS LIVE'],
      facets: ['STATUS', 'SEASON STATUS'],
      searchKeys: ['SERVER NAME', 'NEXUS'],
    },
  },
];

function SectionBody({ section }: { section: Section }) {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(
    section.source.kind === 'static' ? section.source.rows : null,
  );

  useEffect(() => {
    if (section.source.kind === 'static') {
      setRows(section.source.rows);
      return;
    }
    let cancelled = false;
    setRows(null);
    load<Record<string, unknown>>(section.source.dataset)
      .then((loaded) => { if (!cancelled) setRows(loaded); });
    return () => { cancelled = true; };
  }, [section]);

  if (!rows) return <Empty>Loading…</Empty>;
  if (rows.length === 0) return <Empty>This dataset is empty.</Empty>;
  return <DataTable rows={rows} {...section.table} />;
}

export default function Reference() {
  const [active, setActive] = useState(SECTIONS[0]);

  return (
    <>
      <Panel title="Reference" note="Everything else in the database, searchable">
        <div className="toolbar">
          <div className="field wide">
            <label htmlFor="ref-section">Dataset</label>
            <select
              id="ref-section"
              value={active.id}
              onChange={(e) => setActive(SECTIONS.find((s) => s.id === e.target.value) ?? SECTIONS[0])}
            >
              {SECTIONS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
        </div>
      </Panel>

      <Panel title={active.label} note={active.note}>
        <SectionBody section={active} key={active.id} />
      </Panel>
    </>
  );
}
