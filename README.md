# SxS Guide

A web front end for the **SxS All In One Database** spreadsheet. You enter your
server and character once, and the app filters the database down to what
applies to you — instead of leaving you to scroll a 49-tab workbook.

## What it does

The workbook's schedule is **server-relative**: every milestone and event
carries a day number counted from the day a server opened, and the `DATE`
column is only the calendar one particular server happened to land on. The app
ignores that column and recomputes every date against *your* server's start
date. That is what makes the guide personal.

- **My guide** — your server day and season, what is running today, what lands
  next, experience remaining to your target level with a time estimate, and
  your class's community ratings.
- **Schedule** — all 376 milestones and events, dated to your server, filterable
  by season and type.
- **Class** — techniques, charms, published builds and community submissions for
  any class.
- **Dungeons** — clear power by difficulty, gear power, drop rates and set
  bonuses, joined across four tabs and defaulted to your current season. Gear
  tiers are marked in reach or ahead of you against your power rating.
- **Season score** — the season scoring model rebuilt as a live calculator.
  Enter your activity scores, season levels and gear ratings; it totals the
  gameplay, progression and gear ratings and places you in the season's grade
  band. Rates, thresholds and bands all differ per season and are read from the
  workbook. Astral points are not calculated: the workbook derives them
  differently in each season tab and the formula is not recoverable from the
  exported values.
- **Reference** — searchable, facet-filtered tables for relics, relic sets,
  monsters, companions, fantomon, cosmetics, servers and more.

Your profile is kept in `localStorage`. Nothing is uploaded anywhere.

## Running it

```
npm install
npm run dev
```

`npm run build` produces a static site in `dist/`. The build assumes GitHub
Pages project-site hosting; set `BASE_PATH=/` (or your own prefix) to deploy
elsewhere.

## Deploying

`.github/workflows/deploy.yml` typechecks, builds and publishes to GitHub Pages
on every push to `main`, and can be run by hand from the Actions tab. It needs
Pages switched on once first: **Settings → Pages → Build and deployment →
Source: GitHub Actions**. The site then serves from
`https://<owner>.github.io/sxsguide/`.

## Updating the data

The source workbook cannot be downloaded directly, so
`scripts/mirror-to-my-drive.gs` is an Apps Script that copies every tab into a
spreadsheet you own. Run it from [script.google.com](https://script.google.com),
download the result as `.xlsx`, then:

```
pip install openpyxl
python3 scripts/xlsx_to_json.py data/SxS.xlsx
```

That regenerates `src/data/*.json` plus an `index.json` describing what was
imported. `data/` is gitignored — see below.

### What is deliberately not imported

`scripts/xlsx_to_json.py` skips three kinds of tab, and prints which as it runs:

- **Personal data.** `User_Start_Dates`, `Form Responses 1` and
  `Form Responses 3` hold real email addresses and player IDs. They are never
  exported, and the workbook itself is gitignored so it does not reach the
  repo either. Only the aggregated, anonymous half of `Form Responses 2` (the
  per-class rating averages) is imported.
- **Dashboard scaffolding.** `MAIN PAGE` and `Season Primo Calculator` are
  formulas wired to the author's own character; the app recomputes these. The
  per-season scoring tabs are read for their rates, thresholds and bands only —
  the author's own figures in them are discarded.
- **Duplicates and irregular layouts.** `Servers` is a wide pivot of
  `Copy of Servers`; `Skills` is superseded by `Skills Log`; `Dungeon Layout`
  and `Timeline` have no consistent row shape.

Images are referenced by the workbook as paths like `Relics_Images/…` but the
image files are not in the export, so the app is text-only.

## Layout

```
scripts/mirror-to-my-drive.gs   Apps Script: workbook -> a copy you own
scripts/xlsx_to_json.py         .xlsx -> src/data/*.json
src/data/                       generated datasets (committed)
src/lib/compute.ts              server-day, season and experience maths
src/lib/data.ts                 dataset access; large tables load on demand
src/views/                      one file per tab
```
