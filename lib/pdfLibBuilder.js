import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const A4_W = 595.28;
const A4_H = 841.89;
const M = 28;

async function loadImageBytes(relPath) {
  try {
    const full = path.join(process.cwd(), "public", relPath.replace(/^\//, ""));
    return await fs.readFile(full);
  } catch {
    return null;
  }
}

async function embedAnyImage(pdfDoc, relPath) {
  const bytes = await loadImageBytes(relPath);
  if (!bytes) return null;
  const lower = relPath.toLowerCase();
  if (lower.endsWith(".png")) return await pdfDoc.embedPng(bytes);
  return await pdfDoc.embedJpg(bytes);
}

function wrapText(text, font, size, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrappedText(page, text, x, y, opts) {
  const { font, size, maxWidth, lineGap = 2, color = rgb(0,0,0), indent = 0 } = opts;
  const paras = String(text || "").split("\n").map(s => s.trim()).filter(Boolean);
  let cy = y;

  for (const p of paras) {
    const first = wrapText(p, font, size, maxWidth - indent);
    first.forEach((line, idx) => {
      const dx = idx === 0 ? indent : 0;
      page.drawText(line, { x: x + dx, y: cy, font, size, color });
      cy -= size + lineGap;
    });
    cy -= 4;
  }
  return cy;
}

function drawCellText(page, text, x, yTop, w, h, font, size, bold = false) {
  const lines = wrapText(text, font, size, w - 8);
  let y = yTop - size - 4;
  for (const line of lines.slice(0, 4)) {
    if (y < yTop - h + 2) break;
    page.drawText(line, { x: x + 4, y, font, size });
    y -= size + 1;
  }
}

function drawTable(page, startY, headers, rows, colWidths, fonts, sizes) {
  const { font, bold } = fonts;
  const { body = 10, head = 10 } = sizes;
  let y = startY;
  const x0 = M;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);

  page.drawRectangle({ x: x0, y: y - 22, width: tableWidth, height: 22, borderColor: rgb(0.8,0.8,0.8), borderWidth: 1 });
  let x = x0;
  headers.forEach((h, i) => {
    page.drawRectangle({ x, y: y - 22, width: colWidths[i], height: 22, borderColor: rgb(0.8,0.8,0.8), borderWidth: 1 });
    drawCellText(page, h, x, y, colWidths[i], 22, bold, head, true);
    x += colWidths[i];
  });
  y -= 22;

  for (const row of rows) {
    const heights = row.map((cell, i) => {
      const lines = wrapText(String(cell ?? ""), font, body, colWidths[i] - 8);
      return Math.max(20, lines.length * (body + 1) + 8);
    });
    const h = Math.max(...heights);

    x = x0;
    row.forEach((cell, i) => {
      page.drawRectangle({ x, y: y - h, width: colWidths[i], height: h, borderColor: rgb(0.82,0.82,0.82), borderWidth: 1 });
      drawCellText(page, String(cell ?? ""), x, y, colWidths[i], h, font, body);
      x += colWidths[i];
    });
    y -= h;
  }
  return y;
}

function addPage(pdfDoc) {
  return pdfDoc.addPage([A4_W, A4_H]);
}

export async function buildPdfBuffer(data) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const logo = await embedAnyImage(pdfDoc, "/images/logo.png");
  const machinePng = await embedAnyImage(pdfDoc, data.imagePath || "");
  const factoryImg = await embedAnyImage(pdfDoc, data.factoryImagePath || "/images/factory/tenoly-factory.jpg");

  // Page 1
  let page = addPage(pdfDoc);
  let y = A4_H - M;

  if (logo) {
    const dims = logo.scale(1);
    const targetW = 130;
    const targetH = dims.height * (targetW / dims.width);
    page.drawImage(logo, { x: M, y: y - targetH, width: targetW, height: targetH });
  }

  let rx = M + 150;
  let ry = y - 5;
  const reqs = [
    data.companyAddress,
    data.companyPhone,
    data.companyEmail,
    data.companySite,
    data.companyInn
  ];
  for (const line of reqs) {
    const lines = wrapText(line, font, 11, A4_W - rx - M);
    for (const l of lines) {
      page.drawText(l, { x: rx, y: ry, font, size: 11 });
      ry -= 13;
    }
  }

  y = ry - 25;
  const titleLines = wrapText(data.modelTitleTop, bold, 20, A4_W - 2*M);
  for (const tl of titleLines) {
    const tw = bold.widthOfTextAtSize(tl, 20);
    page.drawText(tl, { x: (A4_W - tw) / 2, y, font: bold, size: 20 });
    y -= 24;
  }

  if (machinePng) {
    const dims = machinePng.scale(1);
    const maxW = A4_W - 2*M;
    const maxH = 250;
    const ratio = Math.min(maxW / dims.width, maxH / dims.height);
    const w = dims.width * ratio;
    const h = dims.height * ratio;
    page.drawImage(machinePng, { x: (A4_W - w) / 2, y: y - h - 10, width: w, height: h });
    y = y - h - 30;
  }

  page.drawRectangle({ x: M, y: y - 130, width: A4_W - 2*M, height: 130, borderColor: rgb(0.84,0.84,0.84), borderWidth: 1 });
  const rows1 = [
    ["ТКП №", data.tkpNumber],
    ["Дата", data.createdAt],
    ["Заказчик", data.customer],
    ["ИНН", data.inn],
    ["Контактное лицо", data.contact],
    ["Должность", data.position],
    ["Телефон", data.phone],
    ["E-mail", data.email],
    ["Кто подготовил", data.preparedBy],
  ];
  let iy = y - 16;
  for (const [l, v] of rows1) {
    page.drawText(String(l), { x: M + 10, y: iy, font, size: 11 });
    page.drawText(String(v || ""), { x: M + 160, y: iy, font, size: 11 });
    iy -= 13;
  }

  // Page 2
  page = addPage(pdfDoc);
  y = A4_H - M;
  page.drawText(data.modelTitleMain || "", { x: M, y, font: bold, size: 18 });
  y -= 22;

  if (factoryImg) {
    const dims = factoryImg.scale(1);
    const maxW = A4_W - 2*M;
    const maxH = 210;
    const ratio = Math.min(maxW / dims.width, maxH / dims.height);
    const w = dims.width * ratio;
    const h = dims.height * ratio;
    page.drawImage(factoryImg, { x: (A4_W - w) / 2, y: y - h, width: w, height: h });
    y = y - h - 18;
  }

  y = drawWrappedText(page, data.page2Text || "", M, y, {
    font, size: 10.5, maxWidth: A4_W - 2*M, lineGap: 1.5, indent: 24
  });

  // Page 3 specs 1
  page = addPage(pdfDoc);
  y = A4_H - M;
  page.drawText("Технические характеристики — стр. 1", { x: M, y, font: bold, size: 16 });
  y -= 18;
  drawTable(
    page,
    y,
    ["Наименование характеристики", "Ед. изм.", "Значение"],
    (data.specsPage1 || []).map(r => [r.name, r.unit, r.value]),
    [312, 70, 157],
    { font, bold },
    { body: 9.5, head: 9.5 }
  );

  // Page 4 specs 2
  page = addPage(pdfDoc);
  y = A4_H - M;
  page.drawText("Технические характеристики — стр. 2", { x: M, y, font: bold, size: 16 });
  y -= 18;
  drawTable(
    page,
    y,
    ["Наименование характеристики", "Ед. изм.", "Значение"],
    (data.specsPage2 || []).map(r => [r.name, r.unit, r.value]),
    [312, 70, 157],
    { font, bold },
    { body: 9.5, head: 9.5 }
  );

  // Page 5 standard pack
  page = addPage(pdfDoc);
  y = A4_H - M;
  page.drawText(data.modelTitleStd || "Стандартный комплект поставки", { x: M, y, font: bold, size: 16 });
  y -= 22;
  for (const item of (data.standardPack || [])) {
    const lines = wrapText("• " + item, font, 10.5, A4_W - 2*M);
    for (const line of lines) {
      page.drawText(line, { x: M, y, font, size: 10.5 });
      y -= 13;
    }
    y -= 1;
  }

  // Page 6 pricing
  page = addPage(pdfDoc);
  y = A4_H - M;
  page.drawText("Стоимость проекта и опции", { x: M, y, font: bold, size: 16 });
  y -= 18;
  const priceRows = [
    ["Стоимость станка", fmt(data.totals?.base || 0)],
    ["", ""],
    ["Дополнительные опции", ""],
    ...((data.options || []).length ? (data.options || []).map(o => [o.option_name, (data.model?.source === "stock" ? "включено" : fmt(o.price))]) : [["Без дополнительных опций", ""]]),
    ["", ""],
    ["Итоговый расчет", ""],
    ["Стоимость опций", fmt(data.totals?.options || 0)],
    ["Стоимость доставки", fmt(data.totals?.delivery || 0)],
    ["Стоимость гарантии", fmt(data.totals?.warranty || 0)],
    ["Итого", fmt(data.totals?.total || 0)],
  ];
  drawTable(page, y, ["Позиция", "Стоимость"], priceRows, [405, 134], { font, bold }, { body: 10, head: 10 });

  // Page 7 conditions
  page = addPage(pdfDoc);
  y = A4_H - M;
  page.drawText("Условия поставки", { x: M, y, font: bold, size: 16 });
  y -= 22;
  const condText = (data.conditions || []).join("\n");
  drawWrappedText(page, condText, M, y, {
    font, size: 10.5, maxWidth: A4_W - 2*M, lineGap: 2, indent: 0
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
