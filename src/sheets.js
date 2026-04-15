import { google } from "googleapis";

const SHEET_ID = "19jxjKhSSkckuMgIhxM0-QYaiVZ_R6wsZ7nH41l6anC8";
const EVENTS_TAB = "events";
const ARCHIVE_TAB = "archive";
const ARCHIVE_DAYS = 90;

export const HEADERS = [
  "id","title","format","date","time","timezone",
  "location","address","cost","store_url","detail_url",
  "source","status","notes","added_date","updated_date",
];

async function getAuth() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ["https://www.googleapis.com/auth/spreadsheets"] });
  return google.sheets({ version: "v4", auth });
}

async function readTab(sh, tab) {
  const r = await sh.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tab}!A:P` });
  const rows = r.data.values || [];
  if (rows.length < 2) return [];
  return rows.slice(1).map(row => { const obj = {}; HEADERS.forEach((h,i) => { obj[h] = row[i]||""; }); return obj; });
}

async function ensureSetup(sh) {
  const meta = await sh.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const existing = meta.data.sheets.map(s => s.properties.title);
  const toAdd = [EVENTS_TAB, ARCHIVE_TAB].filter(t => !existing.includes(t));
  if (toAdd.length) await sh.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { requests: toAdd.map(title => ({ addSheet: { properties: { title } } })) } });
  for (const tab of [EVENTS_TAB, ARCHIVE_TAB]) {
    const r = await sh.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: `${tab}!A1:P1` });
    if (((r.data.values||[])[0]||[])[0] !== "id") await sh.spreadsheets.values.update({ spreadsheetId: SHEET_ID, range: `${tab}!A1`, valueInputOption: "RAW", requestBody: { values: [HEADERS] } });
  }
}

function toRow(event, ex=null) {
  const now = new Date().toISOString().split("T")[0];
  return [event.id, event.title, event.format, event.date||"", event.time||"", event.timezone||"America/New_York", event.location||"", event.address||"", event.cost||"", event.store_url||"", event.detail_url||"", event.source, ex?.status||"active", ex?.notes||"", ex?.added_date||now, now];
}

export function rowToEvent(row) {
  if (!row.date || !row.time) return null;
  // Times in the sheet are UTC (scraped from WotC API UTC timestamps)
  const startDate = new Date(`${row.date}T${row.time}:00Z`);
  return { id: row.id, title: row.title, format: row.format, location: { name: row.location, address: row.address, storeUrl: row.store_url }, startDate, endDate: null, timeZone: row.timezone||"America/New_York", cost: row.cost, detailUrl: row.detail_url, description: row.notes||null, source: row.source };
}

export async function upsertEvents(newEvents) {
  const sh = await getAuth();
  await ensureSetup(sh);
  const existing = await readTab(sh, EVENTS_TAB);
  const byId = {};
  existing.forEach((row, i) => { byId[row.id] = { row, idx: i+2 }; });
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - ARCHIVE_DAYS);
  let added=0, updated=0, skipped=0;
  const toAppend=[], toUpdate=[], toArchive=[];
  for (const event of newEvents) {
    const found = byId[event.id];
    if (!found) { toAppend.push(toRow(event)); added++; }
    else {
      if (found.row.status === "pinned") { skipped++; continue; }
      const r = toRow(event, found.row);
      if (found.row.status === "skip") r[12] = "skip";
      toUpdate.push({ idx: found.idx, values: r }); updated++;
    }
  }
  for (const { row, idx } of Object.values(byId)) {
    if (row.date && new Date(row.date) < cutoff) toArchive.push({ idx, row });
  }
  if (toAppend.length) await sh.spreadsheets.values.append({ spreadsheetId: SHEET_ID, range: `${EVENTS_TAB}!A:P`, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values: toAppend } });
  if (toUpdate.length) await sh.spreadsheets.values.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { valueInputOption: "RAW", data: toUpdate.map(({ idx, values }) => ({ range: `${EVENTS_TAB}!A${idx}:P${idx}`, values: [values] })) } });
  if (toArchive.length) {
    await sh.spreadsheets.values.append({ spreadsheetId: SHEET_ID, range: `${ARCHIVE_TAB}!A:P`, valueInputOption: "RAW", insertDataOption: "INSERT_ROWS", requestBody: { values: toArchive.map(({ row }) => HEADERS.map(h => row[h]||"")) } });
    const meta2 = await sh.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const shId = meta2.data.sheets.find(s => s.properties.title===EVENTS_TAB).properties.sheetId;
    await sh.spreadsheets.batchUpdate({ spreadsheetId: SHEET_ID, requestBody: { requests: toArchive.map(({ idx }) => idx).sort((a,b)=>b-a).map(idx => ({ deleteDimension: { range: { sheetId: shId, dimension: "ROWS", startIndex: idx-1, endIndex: idx } } })) } });
  }
  return { added, updated, skipped, archived: toArchive.length };
}

export async function readActiveEvents() {
  const sh = await getAuth();
  const rows = await readTab(sh, EVENTS_TAB);
  return rows.filter(r => r.status!=="skip" && r.date).map(rowToEvent).filter(Boolean).sort((a,b) => a.startDate-b.startDate);
}
