
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
  return String(process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
}

function getSheets() {
  const auth = new google.auth.JWT({
    email: getClientEmail(),
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function getRows(sheetName) {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });
  return res.data.values || [];
}

function normalizeHeader(v) {
  return String(v || "").trim().toLowerCase();
}

function rowsToObjects(rows) {
  if (!rows.length) return [];
  const headers = rows[0].map((h) => String(h || "").trim());
  return rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] ?? "";
    });
    return obj;
  });
}

function getHeaderMap(headerRow) {
  const headers = (headerRow || []).map((h) => String(h || "").trim());
  const map = new Map();
  headers.forEach((h, i) => map.set(normalizeHeader(h), i));
  return { headers, map };
}

function findCol(map, aliases) {
  for (const alias of aliases) {
    const idx = map.get(normalizeHeader(alias));
    if (idx !== undefined) return idx;
  }
  return -1;
}

function mapSourceValue(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s === "summury" || s === "summary") return "На заказ";
  if (s === "stock") return "Со склада";
  return v || "";
}

export async function getUserByLogin(login) {
  const rows = await getRows("users");
  const objects = rowsToObjects(rows);
  const target = String(login || "").trim().toLowerCase();
  return objects.find(
    (u) =>
      String(u.login || "").trim().toLowerCase() === target &&
      String(u.is_active || "TRUE").toUpperCase() !== "FALSE"
  ) || null;
}

export async function appendTKPLog(item) {
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();

  const rows = await getRows("tkp_log");
  if (!rows.length) {
    throw new Error('Лист "tkp_log" пустой. Добавьте строку заголовков.');
  }

  const { headers, map } = getHeaderMap(rows[0]);
  const record = Array(headers.length).fill("");

  const setByAliases = (aliases, value) => {
    const idx = findCol(map, aliases);
    if (idx >= 0) record[idx] = value ?? "";
  };

  setByAliases(["created_at", "дата"], item.created_at);
  setByAliases(["login", "логин"], item.login);
  setByAliases(["full_name", "фио"], item.full_name);
  setByAliases(["role", "роль"], item.role);
  setByAliases(["customer", "заказчик"], item.customer);
  setByAliases(["inn", "инн"], item.inn);
  setByAliases(["model", "модель"], item.model);
  setByAliases(["source", "источник"], mapSourceValue(item.source));
  setByAliases(["total", "сумма"], item.total);
  setByAliases(["files", "файлы"], item.files);
  setByAliases(["tkp_number", "ткп №", "ткп", "tkp no", "tkp #"], item.tkp_number);

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "tkp_log!A:Z",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [record]
    }
  });
}

export async function listTKPLogs(limit = 500) {
  const rows = await getRows("tkp_log");
  const objects = rowsToObjects(rows);
  return objects.slice(-limit).reverse().map((x) => {
    const out = { ...x };
    if ("source" in out) out.source = mapSourceValue(out.source);
    if ("Источник" in out) out["Источник"] = mapSourceValue(out["Источник"]);
    return out;
  });
}
