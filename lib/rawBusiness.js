import { readRange, toNum, cell } from "./googleSheets";

const RAW_START_COL = 3;
const OPTION_SECTIONS = [
  { frame: 1, title: "Общие опции", start: 78, end: 99 },
  { frame: 2, title: "Опции для работы с прутковой заготовкой", start: 100, end: 107 },
  { frame: 3, title: "Электронные ассистенты", start: 108, end: 110 },
  { frame: 4, title: "Системы ЧПУ", start: 111, end: 123 },
  { frame: 5, title: "Измерительные устройства", start: 124, end: 131 },
  { frame: 6, title: "Задняя бабка", start: 132, end: 135 },
  { frame: 7, title: "Поддерживающие устройства", start: 136, end: 157 }
];

function sourceToSheetName(source) { return source === "stock" ? "Stock" : "Summury"; }
function normalizeQuote(s) { return String(s || "").replace(/″/g, '"').replace(/“/g, '"').replace(/”/g, '"').trim(); }

function extractSeries(modelName) {
  const name = String(modelName || "").trim();
  if (/tenoly/i.test(name)) {
    const m = name.match(/tenoly\s*([0-9]+)/i);
    if (!m) return 0;
    const ten = parseInt(m[1], 10);
    if (ten >= 100 && ten < 200) return 300;
    if (ten >= 200 && ten < 300) return 500;
    if (ten >= 700 && ten < 800) return 700;
    if (ten >= 800 && ten < 1200) return 800;
    if (ten >= 1200 && ten < 1600) return 1200;
    if (ten >= 1600 && ten < 2000) return 1600;
    if (ten >= 2000 && ten < 3000) return 2000;
    if (ten >= 3000) return 3000;
    return 0;
  }
  const mx = name.match(/iX-([0-9]+)/i);
  if (!mx) return 0;
  return Math.floor(parseInt(mx[1], 10) / 100) * 100;
}

function modelFlags(modelName) {
  const name = String(modelName || "");
  const isTenoly = /tenoly/i.test(name);
  const test = isTenoly ? name.replace(/tenoly/ig, "") : name;
  return { hasM: /M/.test(test), hasY: /Y/.test(test), hasS: /S/.test(test), isTenoly };
}

function modelMatchesMYS(model, wantM, wantY, wantS) {
  if (model.isTenoly) return true;
  if (wantM && !model.hasM) return false;
  if (wantY && !model.hasY) return false;
  if (wantS && !model.hasS) return false;
  if (!wantM && model.hasM) return false;
  if (!wantY && model.hasY) return false;
  if (!wantS && model.hasS) return false;
  return true;
}

function buildModelsFromSheet(values, source) {
  const models = [];
  let c = RAW_START_COL;
  while (true) {
    const modelName = String(cell(values, 2, c) || "").trim();
    if (!modelName) break;
    models.push({
      source, col: c, model_name: modelName, price: toNum(cell(values, 3, c)),
      chuck_max_dia: toNum(cell(values, 7, c)), max_len: toNum(cell(values, 8, c)),
      chuck_dia_label: normalizeQuote(cell(values, 13, c)), bar_max_dia: toNum(cell(values, 15, c)),
      mass_kg: toNum(cell(values, 68, c)), series: extractSeries(modelName), ...modelFlags(modelName)
    });
    c += 1;
  }
  return models;
}

function scoreModel(model, input) {
  if (model.chuck_max_dia < input.chuck_max_dia) return null;
  if (model.max_len < input.max_len) return null;
  if (model.bar_max_dia < input.bar_max_dia) return null;
  if (input.chuck_dia && normalizeQuote(model.chuck_dia_label) !== normalizeQuote(input.chuck_dia)) return null;
  return (model.chuck_max_dia - input.chuck_max_dia) + (model.max_len - input.max_len) + (model.bar_max_dia - input.bar_max_dia);
}

function optionFrameForRow(rowNum) {
  return OPTION_SECTIONS.find(s => rowNum >= s.start && rowNum <= s.end) || null;
}

function getOptionsForModel(values, model) {
  const options = [];
  for (let r = 78; r <= 157; r++) {
    const title = String(cell(values, r, 1) || "").trim();
    if (!title) continue;
    const v = cell(values, r, model.col);
    const s = String(v || "").trim();
    const section = optionFrameForRow(r);
    if (!section) continue;
    if (model.source === "stock") {
      if (s.toLowerCase() === "включено") options.push({ frame: section.frame, frameTitle: section.title, row_num: r, option_name: title, price: 0 });
    } else {
      const lower = s.toLowerCase();
      if (s && lower !== "нд" && s !== "-") options.push({ frame: section.frame, frameTitle: section.title, row_num: r, option_name: title, price: toNum(v) });
    }
  }
  return options;
}

async function getStandardPack(source) {
  const values = await readRange(`${sourceToSheetName(source)}!A1:ZZ220`);
  const items = [];
  for (let r = 159; r <= 186; r++) {
    const text = String(cell(values, r, 1) || "").trim();
    if (text) items.push(text);
  }
  return items;
}

export async function getSourceMeta(source) {
  const values = await readRange(`${sourceToSheetName(source)}!A1:ZZ200`);
  const models = buildModelsFromSheet(values, source);
  const chuckSet = {};
  models.forEach(m => { if (m.chuck_dia_label) chuckSet[m.chuck_dia_label] = true; });
  return { chuckDiameters: Object.keys(chuckSet).sort((a,b)=>a.localeCompare(b,'ru')), sourceLabel: source === 'stock' ? 'Со склада' : 'Под заказ' };
}

export async function findBestModel(input) {
  const values = await readRange(`${sourceToSheetName(input.source)}!A1:ZZ220`);
  const models = buildModelsFromSheet(values, input.source);
  let best = null, bestScore = Number.POSITIVE_INFINITY;
  for (const model of models) {
    if (!modelMatchesMYS(model, input.wantM, input.wantY, input.wantS)) continue;
    const sc = scoreModel(model, input);
    if (sc === null) continue;
    if (sc < bestScore) { bestScore = sc; best = model; }
  }
  if (!best) return null;
  return { model: best, options: getOptionsForModel(values, best) };
}

export async function calcTotals(model, selectedOptions, distanceKm, warrantyMonths) {
  const deliveryValues = await readRange("Delivery!A1:E100");
  const serviceValues = await readRange("Service!A1:H100");
  const base = toNum(model.price);
  const options = (selectedOptions || []).reduce((s, o) => s + toNum(o.price), 0);

  let delivery = 0, currentMaxMass = 0;
  for (let r = 2; r <= deliveryValues.length; r++) {
    const maxDist = toNum(cell(deliveryValues, r, 1));
    const maxMassCell = cell(deliveryValues, r, 5);
    if (String(maxMassCell || "").trim() !== "") currentMaxMass = toNum(maxMassCell);
    const cost = toNum(cell(deliveryValues, r, 4));
    if (currentMaxMass > 0 && maxDist > 0 && distanceKm <= maxDist && model.mass_kg <= currentMaxMass) { delivery = cost; break; }
  }

  let warranty = 0;
  for (let r = 2; r <= serviceValues.length; r++) {
    const series = toNum(cell(serviceValues, r, 1));
    const months = toNum(cell(serviceValues, r, 2));
    if (series === Number(model.series) && months === Number(warrantyMonths)) { warranty = toNum(cell(serviceValues, r, 8)); break; }
  }
  return { base, options, delivery, warranty, total: base + options + delivery + warranty };
}

export async function buildQuoteData(payload) {
  const totals = await calcTotals(payload.model, payload.selectedOptions || [], payload.distanceKm, payload.warrantyMonths);
  const standardPack = await getStandardPack(payload.model.source);
  const now = new Date();
  const pad = n => ("0" + n).slice(-2);
  const tkpNumber = `${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}${pad(Math.floor(now.getMilliseconds()/10))}`;
  const isTenolyStock = payload.model.source === "stock" && payload.model.isTenoly;
  const brandPrefix = isTenolyStock ? "" : "MECUTO ";
  const modelName = payload.model.model_name;

  return {
    templateName: payload.templateName || "style-size",
    tkpNumber,
    createdAt: now.toLocaleString("ru-RU"),
    customer: payload.customer || "",
    inn: payload.inn || "",
    contact: payload.contact || "",
    position: payload.position || "",
    phone: payload.phone || "",
    email: payload.email || "",
    preparedBy: payload.preparedBy || "",
    warrantyMonths: payload.warrantyMonths || 6,
    modelTitleTop: `Токарный центр ${brandPrefix}${modelName}`,
    modelTitleStd: `Стандартный комплект поставки ${brandPrefix}${modelName}`,
    modelTitleBottom: `Токарный обрабатывающий центр ${brandPrefix}${modelName}`,
    model: payload.model, options: payload.selectedOptions || [], standardPack, totals,
    imagePath: `/images/machines/${payload.model.series}.png`
  };
}
