import { type ReactNode, useDeferredValue, useMemo, useState } from 'react';
import { formatNumber } from '../lib/compute';

export function Panel({ title, note, actions, children }: {
  title?: string; note?: string; actions?: ReactNode; children: ReactNode;
}) {
  return (
    <section className="panel">
      {(title || note || actions) && (
        <header>
          {title && <h2>{title}</h2>}
          {note && <p>{note}</p>}
          <span style={{ marginLeft: 'auto' }}>{actions}</span>
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

// Rows come from the generated datasets, which are typed as named
// interfaces rather than index-signature maps; read them structurally.
type Row = object;

function get(row: Row, key: string): unknown {
  return (row as Record<string, unknown>)[key];
}

function cellText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function isNumericColumn(rows: Row[], key: string): boolean {
  let numbers = 0;
  let values = 0;
  for (const row of rows.slice(0, 40)) {
    const v = get(row, key);
    if (v === '' || v === null || v === undefined) continue;
    values++;
    if (typeof v === 'number') numbers++;
  }
  return values > 0 && numbers / values > 0.7;
}

export interface DataTableProps {
  rows: Row[];
  /** Columns to show, in order. Defaults to every key on the first row. */
  columns?: string[];
  /** Columns offered as dropdown filters above the table. */
  facets?: string[];
  searchKeys?: string[];
  /** Columns rendered with wrapping instead of on one line. */
  wrap?: string[];
  pageSize?: number;
}

/**
 * Searchable, facet-filtered table used by every reference view. Rows are
 * capped and revealed in pages so a 2,000-row dataset stays responsive.
 */
export function DataTable({
  rows, columns, facets = [], searchKeys, wrap = [], pageSize = 60,
}: DataTableProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [limit, setLimit] = useState(pageSize);
  const deferredQuery = useDeferredValue(query);

  const keys = useMemo(
    () => columns ?? (rows.length ? Object.keys(rows[0] as Record<string, unknown>) : []),
    [columns, rows],
  );
  const searchable = searchKeys ?? keys;
  const numericColumns = useMemo(
    () => new Set(keys.filter((k) => isNumericColumn(rows, k))),
    [keys, rows],
  );

  const facetOptions = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const facet of facets) {
      const values = new Set<string>();
      for (const row of rows) {
        const text = cellText(get(row, facet)).trim();
        if (text) values.add(text);
      }
      out[facet] = [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    return out;
  }, [facets, rows]);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    const active = Object.entries(selected).filter(([, v]) => v);
    return rows.filter((row) => {
      for (const [key, value] of active) {
        if (cellText(get(row, key)).trim() !== value) return false;
      }
      if (!needle) return true;
      return searchable.some((k) => cellText(get(row, k)).toLowerCase().includes(needle));
    });
  }, [rows, deferredQuery, selected, searchable]);

  // Reset paging whenever the result set changes, so a new search starts at the
  // top rather than showing however many rows the last one had revealed.
  const visible = useMemo(() => filtered.slice(0, limit), [filtered, limit]);

  function changeFilter(key: string, value: string) {
    setSelected((s) => ({ ...s, [key]: value }));
    setLimit(pageSize);
  }

  return (
    <>
      <div className="toolbar">
        <div className="field wide">
          <label htmlFor="dt-search">Search</label>
          <input
            id="dt-search"
            value={query}
            placeholder="Type to filter…"
            onChange={(e) => { setQuery(e.target.value); setLimit(pageSize); }}
          />
        </div>
        {facets.map((facet) => (
          <div className="field" key={facet}>
            <label htmlFor={`dt-${facet}`}>{facet}</label>
            <select
              id={`dt-${facet}`}
              value={selected[facet] ?? ''}
              onChange={(e) => changeFilter(facet, e.target.value)}
            >
              <option value="">All</option>
              {facetOptions[facet]?.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        ))}
      </div>

      <p className="dim" style={{ margin: '0 0 10px' }}>
        {filtered.length.toLocaleString()} of {rows.length.toLocaleString()} rows
      </p>

      {filtered.length === 0 ? (
        <Empty>Nothing matches those filters.</Empty>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {keys.map((k) => (
                    <th key={k} className={numericColumns.has(k) ? 'num' : undefined}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row, i) => (
                  <tr key={i}>
                    {keys.map((k) => {
                      const numeric = numericColumns.has(k);
                      const value = get(row, k);
                      return (
                        <td
                          key={k}
                          className={[numeric ? 'num' : '', wrap.includes(k) ? 'wrap' : ''].filter(Boolean).join(' ')}
                        >
                          {numeric ? formatNumber(value as number) : cellText(value) || '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length > visible.length && (
            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <button className="btn ghost" onClick={() => setLimit((l) => l + pageSize * 3)}>
                Show more ({(filtered.length - visible.length).toLocaleString()} remaining)
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}
