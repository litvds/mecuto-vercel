import { readRange, rowsToObjects, toBool, toNum } from "./googleSheets";

export async function getModels() {
  const values = await readRange("Models!A1:M");
  return rowsToObjects(values).map(r => ({
    source: String(r.source || "").toLowerCase(),
    model_name: String(r.model_name || ""),
    combo_tag: String(r.combo_tag || ""),
    series: toNum(r.series),
    price: toNum(r.price),
    mass_kg: toNum(r.mass_kg),
    chuck_max_dia: toNum(r.chuck_max_dia),
    max_len: toNum(r.max_len),
    bar_max_dia: toNum(r.bar_max_dia),
    hasM: toBool(r.hasM),
    hasY: toBool(r.hasY),
    hasS: toBool(r.hasS),
    isTenoly: toBool(r.isTenoly)
  }));
}

export async function getOptions() {
  const values = await readRange("Options!A1:H");
  return rowsToObjects(values).map(r => ({
    source: String(r.source || "").toLowerCase(),
    model_name: String(r.model_name || ""),
    frame: toNum(r.frame),
    row_num: toNum(r.row_num),
    option_name: String(r.option_name || ""),
    price: toNum(r.price),
    available: toBool(r.available),
    stock_enabled: toBool(r.stock_enabled)
  }));
}

export async function getDelivery() {
  const values = await readRange("Delivery!A1:C");
  return rowsToObjects(values).map(r => ({
    max_distance: toNum(r.max_distance),
    max_mass_kg: toNum(r.max_mass_kg),
    cost: toNum(r.cost)
  })).sort((a, b) => a.max_distance - b.max_distance || a.max_mass_kg - b.max_mass_kg);
}

export async function getService() {
  const values = await readRange("Service!A1:C");
  return rowsToObjects(values).map(r => ({
    series: toNum(r.series),
    months: toNum(r.months),
    warranty_cost: toNum(r.warranty_cost)
  }));
}

export async function getPictures() {
  const values = await readRange("Pictures!A1:B");
  const rows = rowsToObjects(values);
  const map = {};
  rows.forEach(r => {
    const s = toNum(r.series);
    if (s) map[s] = String(r.image_url || "");
  });
  return map;
}

export async function getComboTags(source) {
  const models = await getModels();
  const uniq = {};
  models.filter(m => m.source === source).forEach(m => { if (m.combo_tag) uniq[m.combo_tag] = true; });
  return Object.keys(uniq).sort();
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

function scoreModel(model, input) {
  if (model.chuck_max_dia < input.chuck_max_dia) return null;
  if (model.max_len < input.max_len) return null;
  if (model.bar_max_dia < input.bar_max_dia) return null;
  return (model.chuck_max_dia - input.chuck_max_dia) + (model.max_len - input.max_len) + (model.bar_max_dia - input.bar_max_dia);
}

export async function findBestModel(input) {
  const models = await getModels();
  const pictures = await getPictures();
  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const model of models) {
    if (model.source !== String(input.source).toLowerCase()) continue;
    if (input.combo_tag && model.combo_tag !== input.combo_tag) continue;
    if (!modelMatchesMYS(model, input.wantM, input.wantY, input.wantS)) continue;
    const score = scoreModel(model, input);
    if (score === null) continue;
    if (score < bestScore) { bestScore = score; best = model; }
  }

  if (!best) return null;

  const allOptions = await getOptions();
  let options = allOptions.filter(o => o.source === best.source && o.model_name === best.model_name);
  options = best.source === "stock" ? options.filter(o => o.stock_enabled) : options.filter(o => o.available);

  return { model: best, options, pictureUrl: pictures[best.series] || "" };
}

export async function calcTotals(model, selectedOptions, distanceKm, warrantyMonths) {
  const deliveryRates = await getDelivery();
  const serviceRates = await getService();
  const base = toNum(model.price);
  const options = (selectedOptions || []).reduce((s, o) => s + toNum(o.price), 0);

  let delivery = 0;
  for (const r of deliveryRates) {
    if (distanceKm <= r.max_distance && model.mass_kg <= r.max_mass_kg) { delivery = r.cost; break; }
  }

  const warranty = serviceRates.find(r => Number(r.series) === Number(model.series) && Number(r.months) === Number(warrantyMonths))?.warranty_cost || 0;
  return { base, options, delivery, warranty, total: base + options + delivery + warranty };
}
