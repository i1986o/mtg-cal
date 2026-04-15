// One-time script: remove all rows with status="pinned" from the events tab.
// These were manually inserted before the scraper was fixed.
// Safe to delete after first successful run.

import { google } from "googleapis";

const SHEET_ID = "19jxjKhSSkckuMgIhxM0-QYaiVZ_R6wsZ7nH41l6anC8";
const EVENTS_TAB = "events";

async function main() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const sh = google.sheets({ version: "v4", auth });

  // Read all rows
  const r = await sh.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${EVENTS_TAB}!A:P`,
  });
  const rows = r.data.values || [];
  if (rows.length < 2) {
    console.log("[cleanup] No data rows found.");
    return;
  }

  // Find header index for "status" column
  const headers = rows[0];
  const statusIdx = headers.indexOf("status");
  if (statusIdx === -1) {
    console.log("[cleanup] No 'status' column found.");
    return;
  }

  // Collect 1-indexed row numbers of pinned rows (skip header at index 0)
  const pinnedRows = [];
  for (let i = 1; i < rows.length; i++) {
    if ((rows[i][statusIdx] || "").toLowerCase() === "pinned") {
      pinnedRows.push(i); // 0-indexed in sheet data, but row i+1 in sheet
      console.log(
        `[cleanup] pinned row ${i + 1}: id=${rows[i][0]} title="${rows[i][1]}"`
      );
    }
  }

  if (pinnedRows.length === 0) {
    console.log("[cleanup] No pinned rows found. Nothing to do.");
    return;
  }

  // Get the sheet ID (not the spreadsheet ID — the tab's numeric ID)
  const meta = await sh.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const sheetId = meta.data.sheets.find(
    (s) => s.properties.title === EVENTS_TAB
  ).properties.sheetId;

  // Delete rows from bottom to top so indices stay valid
  const requests = pinnedRows
    .sort((a, b) => b - a)
    .map((i) => ({
      deleteDimension: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: i, // 0-indexed
          endIndex: i + 1,
        },
      },
    }));

  await sh.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests },
  });

  console.log(`[cleanup] Deleted ${pinnedRows.length} pinned rows.`);
}

main().catch((err) => {
  console.error("[cleanup] Error:", err.message);
  process.exit(1);
});
