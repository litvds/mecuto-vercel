function esc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function fmt(n){return Number(n||0).toLocaleString("ru-RU")}
function optionsRows(options,stockMode){
  if(!options?.length) return '<tr><td colspan="2">Без дополнительных опций</td></tr>';
  return options.map(o=>`<tr><td>${esc(o.option_name)}</td><td style="text-align:right">${stockMode?'включено':fmt(o.price)}</td></tr>`).join("");
}
function packRows(items){return (items||[]).map(i=>`<li>${esc(i)}</li>`).join("")}
const css = `
@page{size:A4;margin:12mm}
body{font-family:Arial,sans-serif;color:#111}
.page{width:100%}
.machine-image{width:100%;height:260px;object-fit:contain;object-position:center;display:block}
.money{text-align:right;white-space:nowrap}
table{width:100%;border-collapse:collapse}
td,th{border:1px solid #cfcfcf;padding:6px 8px;vertical-align:top}
.noborder td,.noborder th{border:none;padding:2px 0}
.printbar{margin:0 0 12px 0;display:flex;gap:12px}
.printbar button{padding:10px 14px;cursor:pointer}
@media print{.printbar{display:none}body{margin:0}}
`;
export function renderTemplate(data){
  const stockMode = data.model.source === "stock";
  if(data.templateName==="alternative-style"){
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(data.tkpNumber)}</title><style>${css}
      .head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-bottom:3px solid #1f2937;padding-bottom:12px}
      .brand{font-size:30px;font-weight:800;letter-spacing:1px}.sub{color:#4b5563}.card{border:1px solid #e5e7eb;border-radius:14px;padding:14px;background:#fff}
      .two{display:grid;grid-template-columns:1.05fr .95fr;gap:18px;margin-top:16px}.spec-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      .spec{background:#f9fafb;border-radius:10px;padding:12px;border:1px solid #eceff3}.total{font-size:22px;font-weight:700;color:#111827}
    </style></head><body><div class="page"><div class="printbar"><button onclick="window.print()">Печать / PDF</button></div>
      <div class="head"><div><div class="brand">MECUTO</div><div class="sub">Коммерческое предложение № ${esc(data.tkpNumber)}</div><div class="sub">${esc(data.createdAt)}</div></div>
      <div style="text-align:right"><div><b>Заказчик:</b> ${esc(data.customer)}</div><div><b>Контакт:</b> ${esc(data.contact)}</div><div><b>Телефон:</b> ${esc(data.phone)}</div><div><b>E-mail:</b> ${esc(data.email)}</div></div></div>
      <div class="two"><div class="card"><div style="font-size:24px;font-weight:700;margin-bottom:8px;">${esc(data.modelTitleTop)}</div><img class="machine-image" src="${esc(data.imagePath)}"></div>
      <div class="card"><div style="font-size:20px;font-weight:700;margin-bottom:10px;">Основные данные</div><div class="spec-grid">
      <div class="spec"><b>Модель</b><br>${esc(data.model.model_name)}</div><div class="spec"><b>Серия</b><br>${esc(data.model.series)}</div>
      <div class="spec"><b>Масса</b><br>${fmt(data.model.mass_kg)} кг</div><div class="spec"><b>Гарантия</b><br>${esc(data.warrantyMonths)} мес.</div>
      <div class="spec"><b>Доставка</b><br>${fmt(data.totals.delivery)}</div><div class="spec"><b>Подготовил</b><br>${esc(data.preparedBy)}</div></div>
      <div style="margin-top:16px" class="total">Итого: ${fmt(data.totals.total)}</div></div></div>
      <div class="card" style="margin-top:16px"><div style="font-size:20px;font-weight:700;margin-bottom:8px;">Стандартный комплект</div><ul>${packRows(data.standardPack)}</ul></div>
      <div class="card" style="margin-top:16px"><div style="font-size:20px;font-weight:700;margin-bottom:8px;">Опции и стоимость</div><table><thead><tr><th>Опция</th><th style="width:180px">Стоимость</th></tr></thead><tbody>${optionsRows(data.options,stockMode)}</tbody></table></div>
      <div class="card" style="margin-top:16px"><div style="font-size:20px;font-weight:700;margin-bottom:8px;">Финансовый расчёт</div><table>
      <tr><td>Стоимость станка</td><td class="money">${fmt(data.totals.base)}</td></tr><tr><td>Стоимость опций</td><td class="money">${fmt(data.totals.options)}</td></tr>
      <tr><td>Стоимость доставки</td><td class="money">${fmt(data.totals.delivery)}</td></tr><tr><td>Стоимость гарантии</td><td class="money">${fmt(data.totals.warranty)}</td></tr>
      <tr><td><b>Итого</b></td><td class="money"><b>${fmt(data.totals.total)}</b></td></tr></table></div></div></body></html>`;
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(data.tkpNumber)}</title><style>${css}
    .title{font-size:22px;font-weight:bold;margin-bottom:10px}.hero{display:grid;grid-template-columns:1.25fr 1fr;gap:16px;align-items:start}
    .hero-card{border:1px solid #d8d8d8;border-radius:10px;padding:12px}.logo{width:90px;height:90px;border:3px solid #c8a45b;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#c8a45b;font-weight:bold;margin-left:auto}
    .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}.kv{padding:10px 12px;background:#fafafa;border:1px solid #e6e6e6;border-radius:8px}.hdr{font-weight:bold;font-size:18px;margin-bottom:8px}
  </style></head><body><div class="page"><div class="printbar"><button onclick="window.print()">Печать / PDF</button></div>
    <div class="hero"><div><div class="title">${esc(data.modelTitleTop)}</div><div class="hero-card"><img class="machine-image" src="${esc(data.imagePath)}"></div></div>
    <div><div class="logo">MECUTO</div><div class="hero-card" style="margin-top:16px"><div class="hdr">ТКП № ${esc(data.tkpNumber)}</div><table class="noborder">
    <tr><td>Дата:</td><td>${esc(data.createdAt)}</td></tr><tr><td>Заказчик:</td><td>${esc(data.customer)}</td></tr><tr><td>ИНН:</td><td>${esc(data.inn)}</td></tr>
    <tr><td>Контакт:</td><td>${esc(data.contact)}</td></tr><tr><td>Должность:</td><td>${esc(data.position)}</td></tr><tr><td>Телефон:</td><td>${esc(data.phone)}</td></tr>
    <tr><td>E-mail:</td><td>${esc(data.email)}</td></tr><tr><td>Подготовил:</td><td>${esc(data.preparedBy)}</td></tr></table></div></div></div>
    <div class="hero-card" style="margin-top:16px"><div class="hdr">${esc(data.modelTitleBottom)}</div><div class="grid2">
    <div class="kv"><b>Модель:</b><br>${esc(data.model.model_name)}</div><div class="kv"><b>Серия:</b><br>${esc(data.model.series)}</div>
    <div class="kv"><b>Цена модели:</b><br>${fmt(data.totals.base)}</div><div class="kv"><b>Масса:</b><br>${fmt(data.model.mass_kg)} кг</div>
    <div class="kv"><b>Доставка:</b><br>${fmt(data.totals.delivery)}</div><div class="kv"><b>Гарантия, в месяцах:</b><br>${esc(data.warrantyMonths)}</div></div></div>
    <div style="margin-top:16px"><div class="hdr">${esc(data.modelTitleStd)}</div><div class="hero-card"><ul>${packRows(data.standardPack)}</ul></div></div>
    <div style="margin-top:16px"><div class="hdr">Выбранные опции</div><table><thead><tr><th>Наименование</th><th style="width:180px">Стоимость</th></tr></thead><tbody>${optionsRows(data.options,stockMode)}</tbody></table></div>
    <div style="margin-top:16px"><div class="hdr">Итог</div><table>
    <tr><td>Стоимость станка</td><td class="money">${fmt(data.totals.base)}</td></tr><tr><td>Стоимость опций</td><td class="money">${fmt(data.totals.options)}</td></tr>
    <tr><td>Стоимость доставки</td><td class="money">${fmt(data.totals.delivery)}</td></tr><tr><td>Стоимость гарантии</td><td class="money">${fmt(data.totals.warranty)}</td></tr>
    <tr><td><b>Итого</b></td><td class="money"><b>${fmt(data.totals.total)}</b></td></tr></table></div>
  </div></body></html>`;
}
