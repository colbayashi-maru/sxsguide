# SxS Guide

A web app front-end for the **SxS All In One Database** spreadsheet. The goal is
that a player enters their own character data and the app returns the guidance
relevant to them, rather than making them scroll a 33-tab workbook.

## Status

Scaffold only. The app cannot be built until the spreadsheet data is in the repo
(see below) — the network policy for this environment blocks `docs.google.com`,
so the data has to arrive as files.

## Adding data

Export tabs from the source workbook and drop them in `data/` as
`data/<Tab Name>.csv`, then:

```
npm install
npm run data   # data/*.csv -> src/data/*.json
npm run dev
```

`scripts/csv-to-json.mjs` trims the empty padding rows and columns Google adds,
treats row 1 as the header, and writes one JSON file per tab plus an
`index.json` listing every tab with its columns and row count.

## Source workbook tabs

Reference list of the 33 tabs in the source workbook, for tracking what has been
imported:

| Tab | Imported |
| --- | --- |
| Form Responses 2 | no |
| MAIN PAGE | no |
| Community Builds | no |
| Milestones | no |
| Dungeon Data | no |
| Copy of Servers | no |
| Experience Table | no |
| Season Primo Calculator | no |
| Season 1 Witching Trials | no |
| Season 2 Crossing Paths | no |
| Season 3 Finale of Chaos | no |
| Season 4 Bizzare Theatre | no |
| Season 5 Firefrost Anthem | no |
| Astral Pact | no |
| Dungeon Layout | no |
| Dungeon Drop Rate | no |
| Dungeon Sets | no |
| Relics | no |
| Relic Sets | no |
| Relic Split | no |
| Monsters | no |
| Skins | no |
| Skin Details | no |
| Copy of Dungeon Sets | no |
| Collaborations | no |
| Companions | no |
| Fantomon | no |
| Fantomon Skills | no |
| Skills | no |
| Log | no |
| Builds | no |
| Game Statistics | no |
| Glossary | no |
