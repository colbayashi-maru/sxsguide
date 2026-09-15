/**
 * Copies every tab of the SxS All In One Database into a NEW spreadsheet that
 * you own, which you can then download as .xlsx.
 *
 * Works with view-only access, and works when the owner has turned off
 * download / print / copy for viewers — it reads cell values through the
 * Sheets service rather than going through the export endpoint.
 *
 * How to run it:
 *   1. Go to https://script.google.com and click "New project".
 *   2. Delete the placeholder code, paste this file in, and Save.
 *   3. Pick "mirror" in the function dropdown and click Run.
 *   4. Approve the permission prompt the first time (it needs Sheets + Drive).
 *   5. Open View > Logs (or Execution log). The new spreadsheet's URL is
 *      printed there.
 *   6. Open that URL, then File > Download > Microsoft Excel (.xlsx).
 *
 * If it stops partway with a timeout, set RESUME_FROM to the number the log
 * reports and run it again — it appends to the same output spreadsheet as long
 * as you paste its ID into DEST_ID.
 *
 * Chart-only tabs are skipped; they hold a rendered chart rather than cells.
 */

const SOURCE_ID = '1uZqmE-71qg2JbEEeBKQXppDToqo4UwQ1zdMFs75UyrU';

// Leave blank on the first run. To resume after a timeout, paste the ID of the
// spreadsheet the first run created (the long string in its URL).
const DEST_ID = '';

// Leave at 0 on the first run. To resume, set this to the tab index the log
// stopped at.
const RESUME_FROM = 0;

function mirror() {
  const src = SpreadsheetApp.openById(SOURCE_ID);
  const dest = DEST_ID
    ? SpreadsheetApp.openById(DEST_ID)
    : SpreadsheetApp.create(src.getName() + ' (mirror)');

  Logger.log('Output spreadsheet: ' + dest.getUrl());

  const sheets = src.getSheets();
  const started = Date.now();

  for (let i = RESUME_FROM; i < sheets.length; i++) {
    // Apps Script hard-stops at 6 minutes. Bail out cleanly with a resume
    // point instead of losing the run.
    if (Date.now() - started > 4.5 * 60 * 1000) {
      Logger.log('Approaching the time limit. Set DEST_ID to the output ' +
                 'spreadsheet id, RESUME_FROM to ' + i + ', and run again.');
      return;
    }

    const sheet = sheets[i];
    const name = sheet.getName().slice(0, 99);

    // Chart sheets hold an embedded chart instead of a grid, and getDataRange
    // throws "The action is not supported for OBJECT sheet" on them. There is
    // no tabular data to mirror, so skip them.
    if (sheet.getType() !== SpreadsheetApp.SheetType.GRID) {
      Logger.log('[' + i + '] ' + name + ': skipped (not a grid sheet)');
      continue;
    }

    const range = sheet.getDataRange();
    // Display values, so formulas arrive as the numbers and text a reader sees.
    const values = range.getDisplayValues();

    let target = dest.getSheetByName(name);
    if (!target) {
      target = dest.insertSheet(name);
    }
    target.clear();

    if (values.length && values[0].length) {
      target.getRange(1, 1, values.length, values[0].length).setValues(values);
    }
    Logger.log('[' + i + '] ' + name + ': ' + values.length + ' rows');
  }

  // A brand new spreadsheet starts with an empty "Sheet1" we never wrote to.
  const leftover = dest.getSheetByName('Sheet1');
  if (leftover && dest.getSheets().length > 1 && leftover.getLastRow() === 0) {
    dest.deleteSheet(leftover);
  }

  Logger.log('Done. Download it with File > Download > Microsoft Excel (.xlsx).');
  Logger.log('Output spreadsheet: ' + dest.getUrl());
}
