import fs from "fs/promises";
import path from "path";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

const A4_W = 595.28;
const A4_H = 841.89;
const M = 28;
const LIGHT_GRAY = rgb(0.94, 0.94, 0.94);

function fmt(n) {
  return Number(n || 0).toLocaleString("ru-RU");
}

async function readPublicFile(relPath) {
  const full = path.join(process.cwd(), "public", relPath.replace(/^\//, ""));
  return await fs.readFile(full);
}

async function tryReadPublicFile(relPath) {
  try {
    return await readPublicFile(relPath);
  } catch {
    return null;
  }
}

async function loadImage(pdfDoc, relPath) {
  if (!relPath) return null;
  const bytes = await tryReadPublicFile(relPath);
  if (!bytes) return null;
  const p = relPath.toLowerCase();
  if (p.endsWith(".png")) return await pdfDoc.embedPng(bytes);
  return await pdfDoc.embedJpg(bytes);
}

async function listPublicFonts() {
  const dir = path.join(process.cwd(), "public", "fonts");
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name).filter((n) => /\.(ttf|otf)$/i.test(n));
  } catch {
    return [];
  }
}

function pickFontByPriority(files, priorities) {
  const lowerMap = new Map(files.map((f) => [f.toLowerCase(), f]));
  for (const p of priorities) {
    const hit = lowerMap.get(p.toLowerCase());
    if (hit) return hit;
  }
  return null;
}

function looksBold(name) {
  const n = name.toLowerCase();
  return n.includes("bold") || n.includes("bd") || n.includes("-b");
}

function looksRegular(name) {
  return !looksBold(name);
}

async function embedRequiredFonts(pdfDoc) {
  const files = await listPublicFonts();
  if (!files.length) {
    throw new Error("В папке public/fonts не найдено ни одного файла шрифта. Положите туда .ttf или .otf с поддержкой кириллицы.");
  }

  const regularName =
    pickFontByPriority(files, ["Arial.ttf","arial.ttf","DejaVuSans.ttf","NotoSans-Regular.ttf","Inter-Regular.ttf","Roboto-Regular.ttf"]) ||
    files.find(looksRegular) ||
    files[0];

  const boldName =
    pickFontByPriority(files, ["Arial-Bold.ttf","arial-bold.ttf","Arialbd.ttf","arialbd.ttf","DejaVuSans-Bold.ttf","NotoSans-Bold.ttf","Inter-Bold.ttf","Roboto-Bold.ttf"]) ||
    files.find((f) => looksBold(f) && f !== regularName) ||
    regularName;

  const regularBytes = await readPublicFile(`/fonts/${regularName}`);
  const boldBytes = await readPublicFile(`/fonts/${boldName}`);

  return {
    font: await pdfDoc.embedFont(regularBytes, { subset: true }),
    bold: await pdfDoc.embedFont(boldBytes, { subset: true }),
  };
}

function wrapText(text, font, size, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawWrapped(page, text, x, y, opts) {
  const { font, size, maxWidth, lineGap = 2, indent = 0 } = opts;
  const paras = String(text || "").split("\n").map((s) => s.trim()).filter(Boolean);
  let cy = y;

  for (const p of paras) {
    const lines = wrapText(p, font, size, maxWidth - indent);
    lines.forEach((line, idx) => {
      page.drawText(line, {
        x: x + (idx === 0 ? indent : 0),
        y: cy,
        font,
        size,
        color: rgb(0, 0, 0),
      });
      cy -= size + lineGap;
    });
    cy -= 4;
  }
  return cy;
}

function drawTable(page, startY, headers, rows, colWidths, font, bold, bodySize = 10, headSize = 10, highlightRows = new Set()) {
  const x0 = M;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  let y = startY;

  let x = x0;
  page.drawRectangle({ x: x0, y: y - 22, width: tableWidth, height: 22, borderWidth: 1, borderColor: rgb(0.82, 0.82, 0.82) });
  headers.forEach((h, i) => {
    page.drawRectangle({ x, y: y - 22, width: colWidths[i], height: 22, borderWidth: 1, borderColor: rgb(0.82, 0.82, 0.82) });
    page.drawText(String(h || ""), { x: x + 4, y: y - 15, font: bold, size: headSize });
    x += colWidths[i];
  });
  y -= 22;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const heights = row.map((cell, i) => {
      const lines = wrapText(String(cell || ""), highlightRows.has(r) ? bold : font, bodySize, colWidths[i] - 8);
      return Math.max(20, lines.length * (bodySize + 1) + 8);
    });
    const h = Math.max(...heights);
    x = x0;
    row.forEach((cell, i) => {
      page.drawRectangle({
        x,
        y: y - h,
        width: colWidths[i],
        height: h,
        borderWidth: 1,
        borderColor: rgb(0.85, 0.85, 0.85),
        color: highlightRows.has(r) ? LIGHT_GRAY : undefined
      });
      const useFont = highlightRows.has(r) ? bold : font;
      const lines = wrapText(String(cell || ""), useFont, bodySize, colWidths[i] - 8);
      let ty = y - bodySize - 4;
      for (const line of lines) {
        if (ty < y - h + 2) break;
        page.drawText(line, { x: x + 4, y: ty, font: useFont, size: bodySize });
        ty -= bodySize + 1;
      }
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
  pdfDoc.registerFontkit(fontkit);

  const { font, bold } = await embedRequiredFonts(pdfDoc);

  const logo = await loadImage(pdfDoc, "/images/logo.png");
  const machineImg = await loadImage(pdfDoc, data.imagePath || "");
  const factoryImg = await loadImage(pdfDoc, data.factoryImagePath || "/images/factory/tenoly-factory.jpg");

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
  const reqs = [data.companyAddress, data.companyPhone, data.companyEmail, data.companySite, data.companyInn];
  for (const line of reqs) {
    const lines = wrapText(line, font, 11, A4_W - rx - M);
    for (const l of lines) {
      page.drawText(l, { x: rx, y: ry, font, size: 11 });
      ry -= 13;
    }
  }

  y = ry - 50;
  for (const tl of wrapText(data.modelTitleTop || "", bold, 20, A4_W - 2 * M)) {
    const tw = bold.widthOfTextAtSize(tl, 20);
    page.drawText(tl, { x: (A4_W - tw) / 2, y, font: bold, size: 20 });
    y -= 24;
  }

  if (machineImg) {
    const dims = machineImg.scale(1);
    const ratio = Math.min((A4_W - 2 * M) / dims.width, 250 / dims.height);
    const w = dims.width * ratio;
    const h = dims.height * ratio;
    page.drawImage(machineImg, { x: (A4_W - w) / 2, y: y - h - 10, width: w, height: h });
    y = y - h - 30;
  }

  page.drawRectangle({ x: M, y: y - 130, width: A4_W - 2 * M, height: 130, borderWidth: 1, borderColor: rgb(0.84, 0.84, 0.84) });
  const page1Rows = [
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
  for (const [l, v] of page1Rows) {
    page.drawText(String(l || ""), { x: M + 10, y: iy, font, size: 11 });
    page.drawText(String(v || ""), { x: M + 160, y: iy, font, size: 11 });
    iy -= 13;
  }

  page = addPage(pdfDoc);
  y = A4_H - M;
  page.drawText(data.modelTitleMain || "", { x: M, y, font: bold, size: 18 });
  y -= 22;
  if (factoryImg) {
    const dims = factoryImg.scale(1);
    const ratio = Math.min((A4_W - 2 * M) / dims.width, 210 / dims.height);
    const w = dims.width * ratio;
    const h = dims.height * ratio;
    page.drawImage(factoryImg, { x: (A4_W - w) / 2, y: y - h, width: w, height: h });
    y = y - h - 18;
  }
  drawWrapped(page, data.page2Text || "", M, y, { font, size: 10.5, maxWidth: A4_W - 2 * M, lineGap: 1.5, indent: 24 });

  page = addPage(pdfDoc);
  y = A4_H - M;
  page.drawText("Технические характеристики — стр. 1", { x: M, y, font: bold, size: 16 });
  y -= 18;
  drawTable(page, y, ["Наименование характеристики", "Ед. изм.", "Значение"], (data.specsPage1 || []).map((r) => [r.name, r.unit, r.value]), [312, 70, 157], font, bold, 9.5, 9.5);

  page = addPage(pdfDoc);
  y = A4_H - M;
  page.drawText("Технические характеристики — стр. 2", { x: M, y, font: bold, size: 16 });
  y -= 18;
  drawTable(page, y, ["Наименование характеристики", "Ед. изм.", "Значение"], (data.specsPage2 || []).map((r) => [r.name, r.unit, r.value]), [312, 70, 157], font, bold, 9.5, 9.5);

  page = addPage(pdfDoc);
  y = A4_H - M;
  page.drawText(data.modelTitleStd || "Стандартный комплект поставки", { x: M, y, font: bold, size: 16 });
  y -= 22;
  for (const item of data.standardPack || []) {
    for (const line of wrapText("• " + item, font, 10.5, A4_W - 2 * M)) {
      page.drawText(line, { x: M, y, font, size: 10.5 });
      y -= 13;
    }
    y -= 1;
  }

  page = addPage(pdfDoc);
  y = A4_H - M;
  page.drawText("Стоимость проекта и опции", { x: M, y, font: bold, size: 16 });
  y -= 18;
  const priceRows = [
    ["Стоимость станка", fmt(data.totals?.base || 0)],
    ["", ""],
    ["Дополнительные опции", ""],
    ...((data.options || []).length
      ? (data.options || []).map((o) => [o.option_name, data.model?.source === "stock" ? "включено" : fmt(o.price)])
      : [["Без дополнительных опций", ""]]),
    ["", ""],
    ["Итоговый расчет", ""],
    ["Стоимость опций", fmt(data.totals?.options || 0)],
    ["Стоимость доставки", fmt(data.totals?.delivery || 0)],
    ["Стоимость гарантии", fmt(data.totals?.warranty || 0)],
    ["Итого", fmt(data.totals?.total || 0)],
  ];
  drawTable(
    page,
    y,
    ["Позиция", "Стоимость"],
    priceRows,
    [405, 134],
    font,
    bold,
    10,
    10,
    new Set([0, 2, 5, 9])
  );

  page = addPage(pdfDoc);
  y = A4_H - M;
  page.drawText("Условия поставки", { x: M, y, font: bold, size: 16 });
  y -= 22;
  drawWrapped(page, (data.conditions || []).join("\n"), M, y, { font, size: 10.5, maxWidth: A4_W - 2 * M, lineGap: 2, indent: 0 });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
