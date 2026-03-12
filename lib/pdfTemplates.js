function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fmt(n) {
  return Number(n || 0).toLocaleString("ru-RU");
}

function rowsOptions(data, stockMode) {
  const rows = [];
  rows.push(`<tr><td><b>Стоимость станка</b></td><td class="money"><b>${fmt(data.basePrice || 0)}</b></td></tr>`);
  rows.push(`<tr><td colspan="2" style="height:10px;background:#fff"></td></tr>`);
  rows.push(`<tr><td><b>Дополнительные опции</b></td><td></td></tr>`);

  if ((data.items || []).length) {
    rows.push(...data.items.map(o =>
      `<tr><td>${esc(o.option_name)}</td><td class="money">${stockMode ? "включено" : fmt(o.price)}</td></tr>`
    ));
  } else {
    rows.push(`<tr><td>Без дополнительных опций</td><td></td></tr>`);
  }

  rows.push(`<tr><td colspan="2" style="height:10px;background:#fff"></td></tr>`);
  rows.push(`<tr><td><b>Итоговый расчет</b></td><td></td></tr>`);
  rows.push(`<tr><td>Стоимость опций</td><td class="money">${fmt(data.optionsTotal || 0)}</td></tr>`);
  rows.push(`<tr><td>Стоимость доставки</td><td class="money">${fmt(data.delivery || 0)}</td></tr>`);
  rows.push(`<tr><td>Стоимость гарантии</td><td class="money">${fmt(data.warranty || 0)}</td></tr>`);
  rows.push(`<tr><td><b>Итого</b></td><td class="money"><b>${fmt(data.total || 0)}</b></td></tr>`);

  return rows.join("");
}

function rowsSpecs(items) {
  return (items || []).map(i =>
    `<tr><td>${esc(i.name)}</td><td>${esc(i.unit)}</td><td>${esc(i.value)}</td></tr>`
  ).join("");
}

function rowsPack(items) {
  return (items || []).map(i => `<li>${esc(i)}</li>`).join("");
}

function rowsConditions(items) {
  return (items || []).map(i =>
    i ? `<p>${esc(i)}</p>` : `<div style="height:8px"></div>`
  ).join("");
}

function page2Paragraphs(text) {
  return String(text || "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)
    .map(p => `<p>${esc(p)}</p>`)
    .join("");
}

function css() {
  return `
  @page { size: A4; margin: 8mm; }

  * { box-sizing: border-box; }

  body {
    font-family: Arial, sans-serif;
    color: #111;
    margin: 0;
    font-size: 12px;
    line-height: 1.35;
  }

  .printbar {
    display: flex;
    gap: 12px;
    padding: 8px 0 14px;
  }

  .printbar button {
    padding: 10px 14px;
    cursor: pointer;
  }

  .page {
    min-height: 277mm;
    page-break-after: always;
  }

  .page:last-child {
    page-break-after: auto;
  }

  .logo {
    width: 150px;
    height: auto;
    object-fit: contain;
    display: block;
  }

  .head {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 22px;
    align-items: start;
  }

  .company {
    font-size: 12px;
    line-height: 1.45;
    text-align: left;
  }

  .center-title {
    text-align: center;
    font-size: 24px;
    font-weight: 700;
    margin: 14px 0 10px;
    line-height: 1.25;
  }

  .machine-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 320px;
  }

  .machine-image {
    width: 100%;
    height: 300px;
    object-fit: contain;
    object-position: center;
    display: block;
  }

  .info-card {
    border: 1px solid #d7d7d7;
    border-radius: 10px;
    padding: 12px;
    margin-top: 16px;
  }

  .kv {
    width: 100%;
    border-collapse: collapse;
  }

  .kv td {
    padding: 4px 0;
    vertical-align: top;
    font-size: 12px;
  }

  .factory-image {
    width: 100%;
    height: 260px;
    object-fit: cover;
    object-position: center;
    display: block;
    border-radius: 10px;
  }

  .big-text {
    text-align: justify;
    font-size: 12px;
    line-height: 1.4;
  }

  .big-text p {
    margin: 0 0 10px 0;
    text-indent: 1.25cm;
  }

  .title {
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 12px;
    line-height: 1.25;
  }

  table.tbl {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    table-layout: fixed;
  }

  .tbl th,
  .tbl td {
    border: 1px solid #cfcfcf;
    padding: 5px 6px;
    vertical-align: top;
    font-size: 12px;
    line-height: 1.3;
  }

  .tbl th {
    font-weight: 700;
    text-align: left;
  }

  .tbl.specs th,
  .tbl.specs td {
    padding: 3px 4px;
    font-size: 11px;
    line-height: 1.15;
  }

  .tbl.specs th:nth-child(1),
  .tbl.specs td:nth-child(1) { width: 58%; }

  .tbl.specs th:nth-child(2),
  .tbl.specs td:nth-child(2) { width: 14%; }

  .tbl.specs th:nth-child(3),
  .tbl.specs td:nth-child(3) { width: 28%; }

  .money {
    text-align: right;
    white-space: nowrap;
  }

  ul.clean {
    margin: 8px 0 0 18px;
    padding: 0;
  }

  ul.clean li {
    margin: 0 0 6px 0;
    font-size: 12px;
    line-height: 1.35;
  }

  .conditions {
    font-size: 12px;
    line-height: 1.4;
  }

  .conditions p {
    margin: 0 0 8px 0;
    text-align: left;
    text-indent: 0;
  }

  @media print {
    .printbar { display: none; }
  }
  `;
}

function renderCommonPages(data, stockMode) {
  return `
  <section class="page">
    <div class="head">
      <img class="logo" src="/images/logo.png" alt="Логотип">
      <div class="company">
        <div>${esc(data.companyAddress)}</div>
        <div>${esc(data.companyPhone)}</div>
        <div>${esc(data.companyEmail)}</div>
        <div>${esc(data.companySite)}</div>
        <div>${esc(data.companyInn)}</div>
      </div>
    </div>

    <div class="center-title">${esc(data.modelTitleTop)}</div>

    <div class="machine-wrap">
      <img class="machine-image" src="${esc(data.imagePath)}" alt="">
    </div>

    <div class="info-card">
      <table class="kv">
        <tr><td style="width:180px">ТКП №</td><td>${esc(data.tkpNumber)}</td></tr>
        <tr><td>Дата</td><td>${esc(data.createdAt)}</td></tr>
        <tr><td>Заказчик</td><td>${esc(data.customer)}</td></tr>
        <tr><td>ИНН</td><td>${esc(data.inn)}</td></tr>
        <tr><td>Контактное лицо</td><td>${esc(data.contact)}</td></tr>
        <tr><td>Должность</td><td>${esc(data.position)}</td></tr>
        <tr><td>Телефон</td><td>${esc(data.phone)}</td></tr>
        <tr><td>E-mail</td><td>${esc(data.email)}</td></tr>
        <tr><td>Кто подготовил</td><td>${esc(data.preparedBy)}</td></tr>
      </table>
    </div>
  </section>

  <section class="page">
    <div class="title">${esc(data.modelTitleMain)}</div>
    <img class="factory-image" src="${esc(data.factoryImagePath)}" alt="">
    <div class="info-card">
      <div class="big-text">${page2Paragraphs(data.page2Text)}</div>
    </div>
  </section>

  <section class="page">
    <div class="title">Технические характеристики — стр. 1</div>
    <table class="tbl specs">
      <thead><tr><th>Наименование характеристики</th><th>Ед. изм.</th><th>Значение</th></tr></thead>
      <tbody>${rowsSpecs(data.specsPage1)}</tbody>
    </table>
  </section>

  <section class="page">
    <div class="title">Технические характеристики — стр. 2</div>
    <table class="tbl specs">
      <thead><tr><th>Наименование характеристики</th><th>Ед. изм.</th><th>Значение</th></tr></thead>
      <tbody>${rowsSpecs(data.specsPage2)}</tbody>
    </table>
  </section>

  <section class="page">
    <div class="title">${esc(data.modelTitleStd)}</div>
    <ul class="clean">${rowsPack(data.standardPack)}</ul>
  </section>

  <section class="page">
    <div class="title">Стоимость проекта и опции</div>
    <table class="tbl">
      <tbody>${rowsOptions({
        basePrice: data.totals.base,
        items: data.options,
        optionsTotal: data.totals.options,
        delivery: data.totals.delivery,
        warranty: data.totals.warranty,
        total: data.totals.total
      }, stockMode)}</tbody>
    </table>
  </section>

  <section class="page">
    <div class="title">Условия поставки</div>
    <div class="conditions">${rowsConditions(data.conditions)}</div>
  </section>
  `;
}

export function renderTemplate(data) {
  const stockMode = data.model.source === "stock";

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(data.tkpNumber)}</title>
  <style>${css()}</style>
</head>
<body>
  <div class="printbar">
    <button onclick="window.print()">Печать / PDF</button>
  </div>
  ${renderCommonPages(data, stockMode)}
</body>
</html>`;
}
