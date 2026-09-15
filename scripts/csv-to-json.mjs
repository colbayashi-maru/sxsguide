// Converts every CSV in data/ into a JSON file in src/data/.
// Drop a tab export in data/<Tab Name>.csv and run `npm run data`.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';

const SRC = 'data';
const OUT = 'src/data';

// RFC4180-ish parser: handles quoted fields, embedded commas, newlines and "".
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { quoted = false; }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') { quoted = true; }
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') { field += c; }
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// Google exports pad tabs with trailing empty rows/columns; drop them so the
// header detection below doesn't latch onto a blank line.
function trimGrid(rows) {
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!nonEmpty.length) return [];
  const width = Math.max(...nonEmpty.map((r) => {
    let last = -1;
    r.forEach((c, i) => { if (c.trim() !== '') last = i; });
    return last + 1;
  }));
  return nonEmpty.map((r) => Array.from({ length: width }, (_, i) => (r[i] ?? '').trim()));
}

function toRecords(grid) {
  if (grid.length < 2) return { columns: [], rows: [] };
  const [header, ...body] = grid;
  const columns = header.map((h, i) => (h || `Column ${i + 1}`));
  const rows = body.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i] ?? ''])));
  return { columns, rows };
}

if (!existsSync(SRC)) {
  console.log(`No ${SRC}/ directory — nothing to convert.`);
  process.exit(0);
}
mkdirSync(OUT, { recursive: true });

const files = readdirSync(SRC).filter((f) => f.toLowerCase().endsWith('.csv'));
if (!files.length) {
  console.log(`No CSVs in ${SRC}/ — add tab exports and re-run.`);
}

const index = [];
for (const file of files) {
  const name = basename(file, '.csv');
  const { columns, rows } = toRecords(trimGrid(parseCsv(readFileSync(join(SRC, file), 'utf8'))));
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  writeFileSync(join(OUT, `${slug}.json`), JSON.stringify({ name, columns, rows }, null, 2));
  index.push({ name, slug, columns, rowCount: rows.length });
  console.log(`${name}: ${rows.length} rows, ${columns.length} columns -> ${slug}.json`);
}
writeFileSync(join(OUT, 'index.json'), JSON.stringify(index, null, 2));
