import { google } from "googleapis";

function getSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) throw new Error("Не заданы GOOGLE_SERVICE_ACCOUNT_EMAIL или GOOGLE_PRIVATE_KEY");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });

  return google.sheets({ version: "v4", auth });
}

export async function readRange(range) {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  if (!spreadsheetId) throw new Error("Не задан GOOGLE_SHEET_ID");
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE"
  });
  return res.data.values || [];
}

export function toNum(v) {
  if (v === "" || v === null || v === undefined) return 0;
  const s = String(v).replace(/\s/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
}

export function cell(values, r, c) {
  return values[r - 1]?.[c - 1] ?? "";
}
