#!/usr/bin/env python3
"""Convert the mirrored SxS workbook into the JSON the web app reads.

Usage:  python3 scripts/xlsx_to_json.py data/SxS.xlsx

Writes one file per dataset into src/data/, plus an index.json describing what
was imported. Re-run it whenever the source workbook is re-mirrored.

Tabs holding personal data (the raw form responses and the user profile sheet)
are deliberately not exported -- see SKIP_PII.
"""
import json
import sys
import datetime as dt
from pathlib import Path

try:
    import openpyxl
except ImportError:
    sys.exit("openpyxl is required:  pip install openpyxl")

OUT = Path("src/data")

# Tabs with real email addresses and player IDs in them. Never exported.
SKIP_PII = {"User_Start_Dates", "Form Responses 1", "Form Responses 3"}

# Tabs that are dashboard scaffolding, duplicates of a cleaner tab, or layouts
# too irregular to read as a table. Listed so the report can show them as
# deliberate omissions rather than silent gaps.
SKIP_LAYOUT = {
    "MAIN PAGE",         # formula dashboard; the app recomputes this itself
    "Landing Page",      # two cells of placeholder text
    "Servers",           # wide pivot of "Copy of Servers"
    "Dungeon Sets",      # narrower duplicate of "Copy of Dungeon Sets"
    "Timeline",          # free-form; "Milestones" carries the same dates
    "Database",          # side-by-side blocks; also duplicates "Milestones"
    "Dungeon Layout",    # nested headers, no consistent row shape
    "Skills",            # season-by-season blocks; "Skills Log" is the real one
    "Sheet38",           # unlabeled relic scaling matrix
    "World Boss Location",
    "Items",
    "Event Details",
    "Season Primo Calculator",
}

# name in workbook -> (output slug, header row index, column slice)
TABLES = {
    "Classes":              ("classes", 0, None),
    "Copy of Servers":      ("servers", 0, None),
    "Season Listing":       ("season-listing", 0, None),
    "Milestones":           ("milestones", 0, None),
    "Bed Calculations":     ("bed-calculations", 0, None),
    "Dungeon Data":         ("dungeon-data", 0, None),
    "Dungeon Drop Rate":    ("dungeon-drop-rate", 0, None),
    "Copy of Dungeon Sets": ("dungeon-sets", 0, None),
    "Gear Power":           ("gear-power", 0, None),
    "Relics":               ("relics", 0, None),
    "Relic Sets":           ("relic-sets", 0, None),
    "Event Relics":         ("event-relics", 0, None),
    "Monsters":             ("monsters", 0, None),
    "Skills Log":           ("skills", 0, None),
    "Builds":               ("builds", 0, None),
    "Community Builds":     ("community-builds", 0, None),
    "Companions":           ("companions", 0, None),
    "Companion Visages":    ("companion-visages", 0, None),
    "Fantomon":             ("fantomon", 0, None),
    "Fantomon Skills":      ("fantomon-skills", 0, None),
    "Glossary":             ("glossary", 0, None),
    "Astral Pact":          ("astral-pact", 0, None),
    "Collaborations":       ("collaborations", 0, None),
    "Skins":                ("skins", 0, None),
    "Skin Details":         ("skin-details", 0, None),
    # Only columns A-C of this tab are the level table; the rest is a scratch
    # calculator wired to the owner's own character.
    "Experience Table":     ("experience-table", 0, slice(0, 3)),
    # The left half is individual survey submissions (with emails); only the
    # aggregated per-class ratings on the right are exported.
    "Form Responses 2":     ("class-ratings", 1, slice(7, 17)),
}


def clean(value):
    """Normalise a cell into something JSON-serialisable and comparable."""
    if value is None:
        return ""
    if isinstance(value, (dt.datetime, dt.date)):
        return value.isoformat()
    if isinstance(value, float):
        # openpyxl reports every number as a float; keep whole numbers whole so
        # levels and counts don't render as "4.0".
        return int(value) if value.is_integer() else round(value, 6)
    if isinstance(value, str):
        return value.strip()
    return value


def read_grid(ws):
    rows = [[clean(c) for c in row] for row in ws.iter_rows(values_only=True)]
    return [r for r in rows if any(str(c) != "" for c in r)]


def to_records(grid, header_row, cols):
    if cols:
        grid = [r[cols] for r in grid]
        grid = [r for r in grid if any(str(c) != "" for c in r)]
    if len(grid) <= header_row:
        return [], []

    raw_header = grid[header_row]
    # Trim trailing unnamed columns, then name any gaps so records stay keyed.
    width = max((i + 1 for i, c in enumerate(raw_header) if str(c) != ""), default=0)
    columns, seen = [], {}
    for i in range(width):
        name = str(raw_header[i]) if i < len(raw_header) else ""
        name = name or f"Column {i + 1}"
        # Duplicate headers exist (e.g. paired season columns); keep them unique.
        if name in seen:
            seen[name] += 1
            name = f"{name} ({seen[name]})"
        else:
            seen[name] = 1
        columns.append(name)

    records = []
    for row in grid[header_row + 1:]:
        rec = {c: (row[i] if i < len(row) else "") for i, c in enumerate(columns)}
        if any(str(v) != "" for v in rec.values()):
            records.append(rec)
    return columns, records


def key_value_sheet(grid):
    """Game Statistics is a two-column label/number list, not a table."""
    return [{"label": str(r[0]).rstrip(":"), "value": r[1] if len(r) > 1 else ""}
            for r in grid if str(r[0]) != ""]


def main():
    src = Path(sys.argv[1] if len(sys.argv) > 1 else "data/SxS.xlsx")
    if not src.exists():
        sys.exit(f"Workbook not found: {src}")

    wb = openpyxl.load_workbook(src, data_only=True)
    OUT.mkdir(parents=True, exist_ok=True)
    index = []

    for name in wb.sheetnames:
        if name in SKIP_PII:
            print(f"  skip (personal data)  {name}")
            continue
        if name in SKIP_LAYOUT:
            print(f"  skip (not tabular)    {name}")
            continue

        grid = read_grid(wb[name])

        if name == "Game Statistics":
            slug, records, columns = "game-statistics", key_value_sheet(grid), ["label", "value"]
        elif name in TABLES:
            slug, header_row, cols = TABLES[name]
            columns, records = to_records(grid, header_row, cols)
        else:
            print(f"  skip (unmapped)       {name}")
            continue

        (OUT / f"{slug}.json").write_text(json.dumps(records, ensure_ascii=False, indent=1))
        index.append({"sheet": name, "slug": slug, "columns": columns, "rows": len(records)})
        print(f"  {name:24} -> {slug}.json  ({len(records)} rows, {len(columns)} cols)")

    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1))
    print(f"\n{len(index)} datasets -> {OUT}/")


if __name__ == "__main__":
    main()
