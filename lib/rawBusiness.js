import { readRange, toNum, cell } from "./googleSheets";

const RAW_START_COL = 3;

const OPTION_SECTIONS = [
  { frame: 1, title: "Общие опции для станка", start: 78, end: 99 },
  { frame: 2, title: "Опции для работы с прутковой заготовкой", start: 100, end: 107 },
  { frame: 3, title: "Электронные ассистенты", start: 108, end: 110 },
  { frame: 4, title: "Опции системы ЧПУ", start: 111, end: 123 },
  { frame: 5, title: "Зажимные устройства", start: 124, end: 131 },
  { frame: 6, title: "Точность и контроль", start: 132, end: 135 },
  { frame: 7, title: "Оснастка", start: 136, end: 157 }
];

const FIXED_STANDARD_PACK = [
  "Литая чугунная станина с углом наклона 30°",
  "Освещение рабочей зоны",
  "Диодная лампа индикации состояния станка",
  "Полное охлаждение рабочей зоны",
  "Бак СОЖ: насос 1.5 кВт, подача СОЖ 5 бар",
  "Фильтры для стружки и охлаждающей жидкости",
  "Гидравлическая система: насос 1.5 кВт, бак до 50л",
  "12-позиционный инструментальный магазин (с приводным инструментом/без приводного инструмента)",
  "Гидравлический патрон",
  "Комплект калёных кулачков к патрону",
  "Автоматическая система смазки",
  "Встроенная гидростанция",
  "Ножной переключатель зажим/разжим кулачков",
  "Задняя бабка с сервоприводом",
  "Ленточный транспортёр стружки и бак для стружки",
  "Питание: 380В + 10%, 51 Гц",
  "Набор опор для выравнивания станка",
  "Стандартный комплект слесарного инструмента",
  "Документация на русском языке",
  "Подготовка к транспортировке, включая упаковку",
  "Стартовый набор оснастки",
  "Система ЧПУ Fanuc 0i-TF PLUS (3)",
  "Функция графического моделирования",
  "10,4 дюймовый ЖК монитор",
  "Интерфейс для флэш-карты памяти",
  "RS 232C интерфейс",
  "USB порт",
  "Ethernet port",
  "Комплект сырых кулачков к патрону"
];

const PAGE2_TEXT = `Сборка станков модельного ряда MECUTO iX производится в формате OEM на заводе Tenoly Machinery. Предприятие Tenoly Machinery – завод полного цикла - основан в 1978г. на Тайване. В 2009 году производственные мощности перенесены на материковый Китай. Tenoly Machinery специализируется на изготовлении среднеразмерных токарных, фрезерных и токарно-фрезерных станков с ЧПУ. Высокое качество выпускаемой продукции гарантированно высокотехнологичным оборудованием и жёстким контролем качества. Все процессы на производстве происходят в строгом соответствии с ISO9001
Ряд технических решений в станках MECUTO iX заимствован от итальянского производителя прецизионных токарных станков Biglia, но большая часть инновационных разработок являются результатом накопленного личного опыта конструкторов TENOLY & RAZMER.
РАЗМЕР располагает собственным конструкторским бюро, высокотехнологичным производственно-складским комплексом и эффективной командой продаж и маркетинга. Лучшие в России технологи, механики, электронщики обеспечивают сопровождение продаж на самом высоком и качественном уровне. Квалификация специалистов позволяет справиться с любой технической или технологической задачей: анализ потребностей заказчика, подбор и поставка оборудования, ввод в эксплуатацию новых станков, гарантийное и пост гарантийное обслуживание поставленного оборудования, ремонт оборудования токарно-фрезерной группы сторонних производителей, разработка технологии изготовления деталей, написание УП, создание постпроцессора для адаптации CAM-системы, разработка и изготовление оснастки… – список возможностей наших инженеров безграничен. Сервисные центры «РАЗМЕР» расположены в Санкт-Петербурге, Екатеринбурге, Челябинске, Нижнем Новгороде, Воронеже.
В России за 2022-2024 год компания РАЗМЕР поставила и успешно внедрила более 170 единиц станочного оборудования MECUTO/TENOLY. Станки приобрели как небольшие частные компании и индивидуальные предприниматели, так и крупные национальные холдинги.
Инженерный центр ООО «РАЗМЕР», который осуществляет прямые поставки оборудования, проводит гарантийное и постгарантийное обслуживание. База ООО «РАЗМЕР» расположена в г. Санкт-Петербург, включая административные помещения (1500 кв.м), склад станков (6000 кв.м), склад запасных частей и материалов (600 кв.м). Также склад 1500 кв.м. организован в Екатеринбурге.
Каждая комплектация станков MECUTO является воплощением идеи «разумного механического решения» и взаимодействия оператора с машиной как с живым организмом на интуитивном уровне. Симбиотические отношения между машиной и человеком вдохновляют инженеров TENOLY & RAZMER на создание технически правильных и эстетически прекрасных станков с ЧПУ.`;

function sourceToSheetName(source) {
  return source === "stock" ? "Stock" : "Summury";
}

function normalizeQuote(s) {
  return String(s || "").replace(/″/g, '"').replace(/“/g, '"').replace(/”/g, '"').trim();
}

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
      source,
      col: c,
      model_name: modelName,
      price: toNum(cell(values, 3, c)),
      chuck_max_dia: toNum(cell(values, 7, c)),
      max_len: toNum(cell(values, 8, c)),
      chuck_dia_label: normalizeQuote(cell(values, 13, c)),
      bar_max_dia: toNum(cell(values, 15, c)),
      mass_kg: toNum(cell(values, 68, c)),
      series: extractSeries(modelName),
      ...modelFlags(modelName)
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
      if (s.toLowerCase() === "включено") {
        options.push({ frame: section.frame, frameTitle: section.title, row_num: r, option_name: title, price: 0, included: true });
      }
    } else {
      const lower = s.toLowerCase();
      if (s && lower !== "нд" && s !== "-") {
        options.push({ frame: section.frame, frameTitle: section.title, row_num: r, option_name: title, price: toNum(v), included: false });
      }
    }
  }
  return options;
}

function getTechSpecs(values, model) {
  const specs = [];
  for (let r = 4; r <= 75; r++) {
    const name = String(cell(values, r, 1) || "").trim();
    const unit = String(cell(values, r, 2) || "").trim();
    const value = String(cell(values, r, model.col) ?? "").trim();
    if (!name || !value) continue;
    specs.push({ row_num: r, name, unit, value });
  }
  return specs;
}

function buildFixedConditions(warrantyMonths) {
  return [
    "Условия поставки: DDP Санкт-Петербург (включают стоимость упаковки, транспортировки оборудования на склад Поставщика, таможенную очистку, НДС 22%).",
    "",
    "Место передачи: склад покупателя",
    "",
    "Условия оплаты: Контракт заключается в Юанях. Оплата производится в рублях по курсу ЦБ РФ на день проведения платежа.",
    "",
    "Порядок оплаты:",
    "30% - авансовый платёж;",
    "60% - перед отправкой с завода-изготовителя;",
    "10% - после завершения ПНР",
    "",
    "Срок поставки: 180 дней.",
    "",
    "Шефмонтажные и пусконаладочные работы: Инженерный Центр «РАЗМЕР» осуществляет все работы по вводу оборудования в эксплуатацию силами своих сертифицированных специалистов.",
    "",
    "Указанная цена в предложении включает следующие обязательные работы, выполняемые Поставщиком:",
    "шефмонтажные работы, пусконаладочные работы, инструктаж обслуживающего персонала.",
    "",
    "Гарантийные обязательства: Инженерный Центр «РАЗМЕР» осуществляет гарантийное и пост гарантийное обслуживание поставленного оборудования силами своих сертифицированных специалистов.",
    "",
    `Гарантия на механические компоненты оборудования - ${warrantyMonths} мес.`,
    "Гарантия на систему ЧПУ и электрооборудование FANUC: 12 месяцев.",
    "",
    "Срок действия предложения: 30 дней."
  ];
}

export async function getSourceMeta(source) {
  const values = await readRange(`${sourceToSheetName(source)}!A1:ZZ220`);
  const models = buildModelsFromSheet(values, source);
  const chuckSet = {};
  models.forEach(m => { if (m.chuck_dia_label) chuckSet[m.chuck_dia_label] = true; });
  return {
    chuckDiameters: Object.keys(chuckSet).sort((a, b) => a.localeCompare(b, "ru")),
    sourceLabel: source === "stock" ? "Со склада" : "Под заказ"
  };
}

export async function findBestModel(input) {
  const values = await readRange(`${sourceToSheetName(input.source)}!A1:ZZ220`);
  const models = buildModelsFromSheet(values, input.source);

  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;
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

  let delivery = 0;
  let currentMaxMass = 0;
  for (let r = 2; r <= deliveryValues.length; r++) {
    const maxDist = toNum(cell(deliveryValues, r, 1));
    const maxMassCell = cell(deliveryValues, r, 5);
    if (String(maxMassCell || "").trim() !== "") currentMaxMass = toNum(maxMassCell);
    const cost = toNum(cell(deliveryValues, r, 4));
    if (currentMaxMass > 0 && maxDist > 0 && distanceKm <= maxDist && model.mass_kg <= currentMaxMass) {
      delivery = cost;
      break;
    }
  }

  let warranty = 0;
  for (let r = 2; r <= serviceValues.length; r++) {
    const series = toNum(cell(serviceValues, r, 1));
    const months = toNum(cell(serviceValues, r, 2));
    if (series === Number(model.series) && months === Number(warrantyMonths)) {
      warranty = toNum(cell(serviceValues, r, 8));
      break;
    }
  }

  return { base, options, delivery, warranty, total: base + options + delivery + warranty };
}

export async function buildQuoteData(payload) {
  const values = await readRange(`${sourceToSheetName(payload.model.source)}!A1:ZZ220`);
  const totals = await calcTotals(payload.model, payload.selectedOptions || [], Number(payload.distanceKm || 0), Number(payload.warrantyMonths || 6));

  const specs = getTechSpecs(values, payload.model);
  const mid = Math.ceil(specs.length / 2);
  const specsPage1 = specs.slice(0, mid);
  const specsPage2 = specs.slice(mid);

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
    modelTitleMain: `${brandPrefix}${modelName}`,
    modelTitleStd: `Стандартный комплект поставки ${brandPrefix}${modelName}`,
    modelTitleBottom: `Токарный обрабатывающий центр ${brandPrefix}${modelName}`,
    model: payload.model,
    options: payload.selectedOptions || [],
    conditions: buildFixedConditions(Number(payload.warrantyMonths || 6)),
    standardPack: FIXED_STANDARD_PACK,
    page2Text: PAGE2_TEXT,
    specsPage1,
    specsPage2,
    totals,
    imagePath: `/images/machines/${payload.model.series}.png`,
    factoryImagePath: `/images/factory/tenoly-factory.jpg`,
    companyAddress: "194100, Санкт-Петербург, Большой Сампсониевский пр., дом 68, лит. Н, пом. 24-Н, комн. 13, офис 609",
    companyPhone: "Тел./факс: +7 (812) 389-33-99",
    companyEmail: "info@razmergroup.ru",
    companySite: "www.razmergroup.ru",
    companyInn: "ИНН/КПП 7814729081/780201001, ОГРН 1187847134617"
  };
}
