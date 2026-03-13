import { google } from "googleapis";

function getSpreadsheetId() {
  return (
    process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
    process.env.GOOGLE_SHEET_ID ||
    process.env.GOOGLE_SPREADSHEET_ID ||
    ""
  ).trim();
}

function getClientEmail() {
  return (
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    process.env.GOOGLE_CLIENT_EMAIL ||
    ""
  ).trim();
}

function getPrivateKey() {
  return String(process.env.GOOGLE_PRIVATE_KEY || "")
    .replace(/^"/, "")
    .replace(/"$/, "")
    .replace(/\\n/g, "\n");
}

function getSheetsClient() {
  const clientEmail = getClientEmail();
  const privateKey = getPrivateKey();

  if (!clientEmail || !privateKey) {
    throw new Error("Не заданы GOOGLE_SERVICE_ACCOUNT_EMAIL или GOOGLE_PRIVATE_KEY");
  }

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return google.sheets({ version: "v4", auth });
}

export async function readRange(range) {
  const spreadsheetId = getSpreadsheetId();
  if (!spreadsheetId) {
    throw new Error("Не задан GOOGLE_SHEET_ID / GOOGLE_SHEETS_SPREADSHEET_ID / GOOGLE_SPREADSHEET_ID");
  }

  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE"
  });

  return res.data.values || [];
}

export async function getRows(sheetName) {
  return await readRange(`${sheetName}!A:Z`);
}

export function toNum(v) {
  if (v === "" || v === null || v === undefined) return 0;
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
}

export function cell(values, r, c) {
  return values?.[r - 1]?.[c - 1] ?? "";
}
