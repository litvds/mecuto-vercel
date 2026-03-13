
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  SectionType,
  ShadingType,
  TabStopPosition,
  TabStopType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import fs from "fs/promises";
import path from "path";

function fmt(n) {
  return Number(n || 0).toLocaleString("ru-RU");
}

async function tryReadPublic(relPath) {
  try {
    return await fs.readFile(path.join(process.cwd(), "public", relPath.replace(/^\//, "")));
  } catch {
    return null;
  }
}

function para(text = "", opts = {}) {
  return new Paragraph({
    alignment: opts.align || AlignmentType.LEFT,
    spacing: {
      before: opts.before ?? 0,
      after: opts.after ?? 100,
      line: opts.line ?? 276,
    },
    children: [
      new TextRun({
        text: String(text || ""),
        bold: !!opts.bold,
        size: opts.size ?? 22,
        italics: !!opts.italics,
        color: opts.color,
      }),
    ],
    indent: opts.indent ? { firstLine: opts.indent } : undefined,
    pageBreakBefore: !!opts.pageBreakBefore,
  });
}

function imagePara(bytes, w, h, align = AlignmentType.CENTER, after = 140) {
  return new Paragraph({
    alignment: align,
    spacing: { after },
    children: [new ImageRun({ data: bytes, transformation: { width: w, height: h } })],
  });
}

function simpleCell(text, widthPct, opts = {}) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    shading: opts.shade ? { fill: "F2F2F2", type: ShadingType.CLEAR } : undefined,
    children: [
      new Paragraph({
        spacing: { before: 40, after: 40, line: 260 },
        alignment: opts.align || AlignmentType.LEFT,
        children: [
          new TextRun({
            text: String(text || ""),
            bold: !!opts.bold,
            size: opts.size ?? 21,
          }),
        ],
      }),
    ],
  });
}

function borderedTable(rows, widths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "DADADA" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "DADADA" },
    },
    rows: rows.map((row) => new TableRow({
      children: row.map((c, i) => simpleCell(c.text ?? c, widths[i] || widths[0], c)),
    })),
  });
}

function sectionHeader(text) {
  return para(text, {
    heading: HeadingLevel.HEADING_1,
    size: 28,
    bold: true,
    after: 140,
  });
}

function buildCoverInfoTable(data) {
  const rows = [
    ["ТКП №", data.tkpNumber],
    ["Дата", data.createdAt],
    ["Заказчик", data.customer],
    ["ИНН", data.inn],
    ["Контактное лицо", data.contact],
    ["Должность", data.position],
    ["Телефон", data.phone],
    ["E-mail", data.email],
    ["Кто подготовил", data.preparedBy],
  ].map(([a, b]) => [{ text: a, size: 21 }, { text: b, size: 21 }]);

  return borderedTable(rows, [28, 72]);
}

function buildSpecsTable(specs) {
  const rows = [
    [
      { text: "Наименование характеристики", bold: true, shade: true, size: 20 },
      { text: "Ед. изм.", bold: true, shade: true, size: 20, align: AlignmentType.CENTER },
      { text: "Значение", bold: true, shade: true, size: 20, align: AlignmentType.CENTER },
    ],
    ...specs.map((r) => [
      { text: r.name || "", size: 20 },
      { text: r.unit || "", size: 20, align: AlignmentType.CENTER },
      { text: r.value || "", size: 20, align: AlignmentType.CENTER },
    ]),
  ];
  return borderedTable(rows, [54, 16, 30]);
}

function priceRow(title, value = "", emphasized = false) {
  return [
    { text: title, bold: emphasized, shade: emphasized, size: 21 },
    { text: value, bold: emphasized, shade: emphasized, size: 21 },
  ];
}

function buildPriceTable(data) {
  const optionRows = (data.options || []).length
    ? (data.options || []).map((o) => [
        { text: o.option_name, size: 21 },
        { text: data.model?.source === "stock" ? "включено" : fmt(o.price), size: 21 },
      ])
    : [[{ text: "Без дополнительных опций", size: 21 }, { text: "", size: 21 }]];

  const rows = [
    [
      { text: "Позиция", bold: true, shade: true, size: 20 },
      { text: "Стоимость", bold: true, shade: true, size: 20 },
    ],
    priceRow("Стоимость станка", fmt(data.totals?.base || 0), true),
    [{ text: "", size: 21 }, { text: "", size: 21 }],
    priceRow("Дополнительные опции", "", true),
    ...optionRows,
    [{ text: "", size: 21 }, { text: "", size: 21 }],
    priceRow("Итоговый расчет", "", true),
    [{ text: "Стоимость опций", size: 21 }, { text: fmt(data.totals?.options || 0), size: 21 }],
    [{ text: "Стоимость доставки", size: 21 }, { text: fmt(data.totals?.delivery || 0), size: 21 }],
    [{ text: "Стоимость гарантии", size: 21 }, { text: fmt(data.totals?.warranty || 0), size: 21 }],
    priceRow("Итого", fmt(data.totals?.total || 0), true),
  ];

  return borderedTable(rows, [72, 28]);
}

function bulletPara(text) {
  return new Paragraph({
    spacing: { after: 40, line: 260 },
    bullet: { level: 0 },
    children: [new TextRun({ text: String(text || ""), size: 21 })],
  });
}

function pageFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 0 },
        children: [
          new TextRun({ children: ["Стр. "] }),
          new TextRun({ children: [PageNumber.CURRENT] }),
        ],
      }),
    ],
  });
}

export async function buildDocxBuffer(data) {
  const logoBytes = await tryReadPublic("/images/logo.png");
  const machineBytes = await tryReadPublic(data.imagePath || "");
  const factoryBytes = await tryReadPublic(data.factoryImagePath || "/images/factory/tenoly-factory.jpg");

  const coverRows = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 28, type: WidthType.PERCENTAGE },
          children: logoBytes ? [imagePara(logoBytes, 120, 120, AlignmentType.LEFT, 0)] : [para("")],
          borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
        }),
        new TableCell({
          width: { size: 72, type: WidthType.PERCENTAGE },
          children: [
            para(data.companyAddress || "", { size: 20, after: 40 }),
            para(data.companyPhone || "", { size: 20, after: 40 }),
            para(data.companyEmail || "", { size: 20, after: 40 }),
            para(data.companySite || "", { size: 20, after: 40 }),
            para(data.companyInn || "", { size: 20, after: 0 }),
          ],
          borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
        }),
      ],
    }),
  ];

  const coverTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } },
    rows: coverRows,
  });

  const specs = [...(data.specsPage1 || []), ...(data.specsPage2 || [])];
  const specsMid = Math.ceil(specs.length / 2);
  const specs1 = specs.slice(0, specsMid);
  const specs2 = specs.slice(specsMid);

  const coverChildren = [
    coverTable,
    para("", { after: 80 }),
    para(data.modelTitleTop || "ТКП", { align: AlignmentType.CENTER, bold: true, size: 34, after: 160 }),
  ];

  if (machineBytes) {
    coverChildren.push(imagePara(machineBytes, 520, 240, AlignmentType.CENTER, 180));
  }

  coverChildren.push(buildCoverInfoTable(data));

  const producerChildren = [
    sectionHeader(data.modelTitleMain || "Описание производителя"),
  ];

  if (factoryBytes) {
    producerChildren.push(imagePara(factoryBytes, 520, 220, AlignmentType.CENTER, 160));
  }

  String(data.page2Text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((line) => producerChildren.push(para(line, { size: 21, after: 60, indent: 280 })));

  const sections = [
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { margin: { top: 900, right: 900, bottom: 700, left: 900 } },
      },
      footers: { default: pageFooter() },
      children: coverChildren,
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { margin: { top: 900, right: 900, bottom: 700, left: 900 } },
      },
      footers: { default: pageFooter() },
      children: producerChildren,
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { margin: { top: 700, right: 700, bottom: 700, left: 700 } },
      },
      footers: { default: pageFooter() },
      children: [
        sectionHeader("Технические характеристики — стр. 1"),
        buildSpecsTable(specs1),
      ],
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { margin: { top: 700, right: 700, bottom: 700, left: 700 } },
      },
      footers: { default: pageFooter() },
      children: [
        sectionHeader("Технические характеристики — стр. 2"),
        buildSpecsTable(specs2),
      ],
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { margin: { top: 700, right: 850, bottom: 700, left: 850 } },
      },
      footers: { default: pageFooter() },
      children: [
        sectionHeader(data.modelTitleStd || "Стандартный комплект поставки"),
        ...((data.standardPack || []).map((item) => bulletPara(item))),
      ],
    },
    {
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { margin: { top: 700, right: 850, bottom: 700, left: 850 } },
      },
      footers: { default: pageFooter() },
      children: [
        sectionHeader("Стоимость проекта и опции"),
        buildPriceTable(data),
      ],
    },
    {
      properties: {
        type: SectionType.CONTINUOUS,
        page: { margin: { top: 700, right: 850, bottom: 700, left: 850 } },
      },
      footers: { default: pageFooter() },
      children: [
        sectionHeader("Условия поставки"),
        ...((data.conditions || []).map((line) => para(line, { size: 21, after: 60 }))),
      ],
    },
  ];

  const doc = new Document({
    sections,
  });

  return await Packer.toBuffer(doc);
}
