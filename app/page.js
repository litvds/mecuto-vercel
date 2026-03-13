
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function parseFlexibleNumber(value) {
  return Number(String(value || "").replace(",", "."));
}

function detectDevice() {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function fmt(v) {
  return Number(v || 0).toLocaleString("ru-RU");
}

function getMachineImage(model) {
  if (!model?.series) return "";
  return `/images/machines/${model.series}.png`;
}

export default function Page() {
  const [source, setSource] = useState("stock");
  const [sourceLabel, setSourceLabel] = useState("");
  const [chuckValues, setChuckValues] = useState([]);
  const [templateName, setTemplateName] = useState("style-size");

  const [customer, setCustomer] = useState("");
  const [inn, setInn] = useState("");
  const [contact, setContact] = useState("");
  const [position, setPosition] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preparedBy, setPreparedBy] = useState("");

  const [maxTurnDia, setMaxTurnDia] = useState("");
  const [maxTurnLen, setMaxTurnLen] = useState("");
  const [barDia, setBarDia] = useState("");
  const [chuckDia, setChuckDia] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState(6);

  const [hasM, setHasM] = useState(false);
  const [hasY, setHasY] = useState(false);
  const [hasS, setHasS] = useState(false);

  const [searchResult, setSearchResult] = useState(null);
  const [previewSearchResult, setPreviewSearchResult] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [totals, setTotals] = useState(null);
  const [previewTotals, setPreviewTotals] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMessage, setPreviewMessage] = useState("Введите параметры для автоматического подбора");
  const searchSeq = useRef(0);

  const filterPayload = useMemo(() => ({
    source,
    chuck_max_dia: parseFlexibleNumber(maxTurnDia || 0),
    max_len: parseFlexibleNumber(maxTurnLen || 0),
    bar_max_dia: parseFlexibleNumber(barDia || 0),
    chuck_dia: chuckDia,
    wantM: hasM,
    wantY: hasY,
    wantS: hasS
  }), [source, maxTurnDia, maxTurnLen, barDia, chuckDia, hasM, hasY, hasS]);

  useEffect(() => { loadMeta(source); }, [source]);

  useEffect(() => {
    const hasAnyFilter =
      filterPayload.chuck_max_dia > 0 ||
      filterPayload.max_len > 0 ||
      filterPayload.bar_max_dia > 0 ||
      !!filterPayload.chuck_dia ||
      filterPayload.wantM ||
      filterPayload.wantY ||
      filterPayload.wantS;

    if (!hasAnyFilter) {
      setPreviewSearchResult(null);
      setPreviewTotals(null);
      setPreviewMessage("Введите параметры для автоматического подбора");
      return;
    }

    const seq = ++searchSeq.current;
    const t = setTimeout(async () => {
      try {
        setPreviewLoading(true);
        setPreviewMessage("Подбираем модель...");
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(filterPayload)
        });
        const data = await res.json();

        if (seq !== searchSeq.current) return;

        if (!data.ok) {
          setPreviewSearchResult(null);
          setPreviewTotals(null);
          setPreviewMessage(data.message || data.error || "Подходящая модель не найдена");
          setPreviewLoading(false);
          return;
        }

        setPreviewSearchResult(data);
        setPreviewMessage("Модель подобрана");

        const quoteRes = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: data.model,
            selectedOptions: data.model.source === "stock" ? (data.options || []) : [],
            distanceKm: parseFlexibleNumber(distanceKm || 0),
            warrantyMonths: Number(warrantyMonths || 6)
          })
        });
        const quoteData = await quoteRes.json();
        if (seq !== searchSeq.current) return;
        if (quoteData.ok) setPreviewTotals(quoteData);
      } catch {
        if (seq !== searchSeq.current) return;
        setPreviewSearchResult(null);
        setPreviewTotals(null);
        setPreviewMessage("Ошибка автоматического подбора");
      } finally {
        if (seq === searchSeq.current) setPreviewLoading(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [filterPayload, distanceKm, warrantyMonths]);

  useEffect(() => {
    if (searchResult?.model) calcTotalsNow();
  }, [searchResult, selectedOptions, distanceKm, warrantyMonths]);

  async function loadMeta(src) {
    const res = await fetch("/api/source-meta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: src })
    });
    const data = await res.json();
    if (data.ok) {
      setChuckValues(data.chuckDiameters || []);
      setSourceLabel(data.sourceLabel || "");
      setChuckDia("");
      setPreviewSearchResult(null);
      setPreviewTotals(null);
      setSearchResult(null);
      setTotals(null);
      setSelectedOptions([]);
      setShowOptions(false);
      setPreviewMessage("Введите параметры для автоматического подбора");
    }
  }

  async function handleSearchAndOpenOptions() {
    setLoading(true);
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filterPayload)
    });

    const data = await res.json();
    setLoading(false);

    if (!data.ok) {
      alert(data.message || data.error || "Модель не найдена");
      return;
    }

    setSearchResult(data);
    const initialOptions = data.model.source === "stock" ? (data.options || []) : [];
    setSelectedOptions(initialOptions);
    setShowOptions(true);
  }

  async function calcTotalsNow() {
    if (!searchResult?.model) return;

    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: searchResult.model,
        selectedOptions,
        distanceKm: parseFlexibleNumber(distanceKm || 0),
        warrantyMonths: Number(warrantyMonths || 6)
      })
    });

    const data = await res.json();
    if (data.ok) setTotals(data);
  }

  function clearForm() {
    setCustomer(""); setInn(""); setContact(""); setPosition(""); setPhone(""); setEmail(""); setPreparedBy("");
    setMaxTurnDia(""); setMaxTurnLen(""); setBarDia(""); setChuckDia(""); setDistanceKm(""); setWarrantyMonths(6);
    setHasM(false); setHasY(false); setHasS(false);
    setSearchResult(null); setPreviewSearchResult(null);
    setSelectedOptions([]); setTotals(null); setPreviewTotals(null);
    setShowOptions(false);
    setPreviewMessage("Введите параметры для автоматического подбора");
  }

  function toggleOption(opt) {
    if (searchResult?.model?.source === "stock") return;
    const exists = selectedOptions.some(o => o.row_num === opt.row_num);
    setSelectedOptions(exists ? selectedOptions.filter(o => o.row_num !== opt.row_num) : [...selectedOptions, opt]);
  }

  function submitPdfForm(payload, target = "_blank") {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/build-tkp-pdf";
    form.target = target;
    form.style.display = "none";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "payload";
    input.value = JSON.stringify(payload);

    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    form.remove();
  }

  async function buildTKP() {
    if (!searchResult?.model) return;

    const payload = {
      templateName, customer, inn, contact, position, phone, email, preparedBy,
      distanceKm: parseFlexibleNumber(distanceKm || 0),
      warrantyMonths: Number(warrantyMonths || 6),
      model: searchResult.model,
      selectedOptions
    };

    const device = detectDevice();

    if (device === "ios") {
      submitPdfForm(payload, "_self");
      return;
    }

    if (device === "android") {
      submitPdfForm(payload, "_blank");
      return;
    }

    try {
      const res = await fetch("/api/build-tkp-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Ошибка создания PDF");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "TKP.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();

      setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (e) {
      alert(String(e.message || e));
    }
  }

  const grouped = useMemo(() => {
    const g = {};
    (searchResult?.options || []).forEach(opt => {
      const key = String(opt.frame);
      if (!g[key]) g[key] = { title: opt.frameTitle, items: [] };
      g[key].items.push(opt);
    });
    return g;
  }, [searchResult]);

  const modelForCard = searchResult?.model || previewSearchResult?.model;
  const totalForCard = totals?.total || previewTotals?.total || 0;

  return (
    <main style={mainStyle}>
      <div style={heroWrapStyle}>
        <div style={heroBadgeStyle}>MECUTO / TENOLY / RAZMER</div>
        <div style={heroTitleStyle}>Конфигуратор ТКП 4.1</div>
        <div style={heroSubStyle}>Подбор модели, опции и PDF в одном интерфейсе — без изменения backend и логики PDF.</div>
      </div>

      <div style={pageGridStyle}>
        <div style={leftColStyle}>
          <div style={cardStyle}>
            <div style={headerWrapStyle}>
              <div>
                <h1 style={{ fontSize: 30, margin: 0 }}>Подбор ТКП</h1>
                <div style={{ color: "#666", marginTop: 8 }}>{sourceLabel}</div>
              </div>
              <img src="/images/logo.png" alt="Логотип" style={logoImageStyle} />
            </div>

            <Block title="Данные заказчика">
              <div style={formGridStyle}>
                <Label>Наименование заказчика</Label><Input value={customer} onChange={setCustomer} />
                <Label>ИНН</Label><Input value={inn} onChange={setInn} />
                <Label>Контактное лицо</Label><Input value={contact} onChange={setContact} />
                <Label>Должность</Label><Input value={position} onChange={setPosition} />
                <Label>Телефон</Label><Input value={phone} onChange={setPhone} />
                <Label>E-mail</Label><Input value={email} onChange={setEmail} />
                <Label>Кто подготовил</Label><Input value={preparedBy} onChange={setPreparedBy} />
              </div>
            </Block>

            <Block title="Источник и параметры">
              <div style={radioRowStyle}>
                <ChipRadio checked={source === "stock"} onClick={() => setSource("stock")} label="Из наличия" />
                <ChipRadio checked={source === "summury"} onClick={() => setSource("summury")} label="Под заказ" />
              </div>

              <div style={adaptiveGridStyle}>
                <FieldBlock label="Максимальный диаметр точения"><Input value={maxTurnDia} onChange={setMaxTurnDia} inputMode="decimal" /></FieldBlock>
                <FieldBlock label="Максимальная длина точения"><Input value={maxTurnLen} onChange={setMaxTurnLen} inputMode="decimal" /></FieldBlock>
                <FieldBlock label="Диаметр прутка"><Input value={barDia} onChange={setBarDia} inputMode="decimal" /></FieldBlock>
                <FieldBlock label="Диаметр патрона">
                  <select value={chuckDia} onChange={e => setChuckDia(e.target.value)} style={inputStyle}>
                    <option value="">—</option>
                    {chuckValues.map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </FieldBlock>
              </div>

              <div style={chipGridStyle}>
                <ChoiceChip checked={hasM} onClick={() => setHasM(!hasM)} label="С приводным инструментом" />
                <ChoiceChip checked={hasY} onClick={() => { const v = !hasY; setHasY(v); if (v) setHasM(true); }} label="С осью Y" />
                <ChoiceChip checked={hasS} onClick={() => { const v = !hasS; setHasS(v); if (v) setHasM(true); }} label="С противошпинделем" />
              </div>
            </Block>

            <Block title="Расчет и выпуск ТКП">
              <div style={adaptiveGridStyle}>
                <FieldBlock label="Расстояние до места поставки"><Input value={distanceKm} onChange={setDistanceKm} inputMode="decimal" /></FieldBlock>
                <FieldBlock label="Гарантия месяцев">
                  <div style={radioRowStyle}>
                    {[6, 12, 24].map(m => <ChipRadio key={m} checked={warrantyMonths === m} onClick={() => setWarrantyMonths(m)} label={String(m)} />)}
                  </div>
                </FieldBlock>
              </div>

              <div style={adaptiveGridStyle}>
                <FieldBlock label="Шаблон ТКП">
                  <div style={radioRowStyle}>
                    <ChipRadio checked={templateName === "style-size"} onClick={() => setTemplateName("style-size")} label="Стиль Размер" />
                    <ChipRadio checked={templateName === "alternative-style"} onClick={() => setTemplateName("alternative-style")} label="Альтернативный стиль" />
                  </div>
                </FieldBlock>
              </div>

              <div style={buttonsWrapStyle}>
                <button onClick={handleSearchAndOpenOptions} style={primaryBtn} disabled={loading}>
                  {loading ? "Подбираем..." : "Перейти к выбору опций"}
                </button>
                <button onClick={clearForm} style={secondaryBtn}>Очистить форму</button>
              </div>
            </Block>
          </div>
        </div>

        <div style={rightColStyle}>
          <div style={stickyCardStyle}>
            <div style={stickyTopRowStyle}>
              <div style={cardLabelStyle}>Живой подбор</div>
              {previewLoading && <div style={loaderStyle}>обновление…</div>}
            </div>

            {!previewLoading && !modelForCard && <div style={hintStyle}>{previewMessage}</div>}

            {modelForCard && (
              <>
                <div style={modelTitleStyle}>{modelForCard.model_name}</div>
                <div style={modelSubtitleStyle}>Подходит под заданные параметры</div>

                <div style={metaPillsStyle}>
                  <span style={pillStyle}>{modelForCard.source === "stock" ? "Со склада" : "Под заказ"}</span>
                  <span style={pillStyle}>Серия {modelForCard.series}</span>
                  <span style={pillStyle}>Масса {fmt(modelForCard.mass_kg)} кг</span>
                </div>

                <div style={imageWrapStyle}>
                  <img src={getMachineImage(modelForCard)} alt={modelForCard.model_name} style={machinePreviewStyle} />
                </div>

                <div style={priceBoxStyle}>
                  <div style={priceCaptionStyle}>Предварительный итог</div>
                  <div style={priceValueStyle}>{fmt(totalForCard)}</div>
                </div>

                <div style={miniTableStyle}>
                  <Row label="Базовая цена" value={totals?.base || previewTotals?.base || 0} />
                  <Row label="Опции" value={totals?.options || previewTotals?.options || 0} />
                  <Row label="Доставка" value={totals?.delivery || previewTotals?.delivery || 0} />
                  <Row label="Гарантия" value={totals?.warranty || previewTotals?.warranty || 0} />
                </div>

                {!searchResult?.model && (
                  <button onClick={handleSearchAndOpenOptions} style={{ ...primaryBtn, width: "100%", marginTop: 14 }} disabled={loading || previewLoading}>
                    Выбрать опции для этой модели
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showOptions && searchResult?.model && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <div>
                <h2 style={{ margin: 0, fontSize: 22 }}>Выберите опции для станка {searchResult.model.model_name}</h2>
                <div style={{ color: "#666", marginTop: 6 }}>Цена обновляется автоматически</div>
              </div>
              <button onClick={() => setShowOptions(false)} style={{ ...secondaryBtn, width: 44, minWidth: 44, padding: 8 }}>×</button>
            </div>

            <div style={modalBodyStyle}>
              {Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map(key => (
                <div key={key} style={optionGroupStyle}>
                  <div style={optionGroupTitleStyle}>{grouped[key].title}</div>
                  <div style={optionsGridStyle}>
                    {grouped[key].items.map((opt, idx) => {
                      const checked = selectedOptions.some(o => o.row_num === opt.row_num);
                      const disabled = searchResult.model.source === "stock";
                      return (
                        <button
                          key={idx}
                          onClick={() => toggleOption(opt)}
                          disabled={disabled}
                          style={{
                            ...optionCardStyle,
                            ...(checked || disabled ? optionCardSelectedStyle : {}),
                            ...(disabled ? optionCardDisabledStyle : {})
                          }}
                        >
                          <div style={optionNameStyle}>{opt.option_name}</div>
                          <div style={optionPriceStyle}>{disabled ? "включено" : fmt(opt.price)}</div>
                          <div style={optionHintStyle}>
                            {disabled ? "Входит в комплектацию" : checked ? "Добавлено" : "Нажмите, чтобы добавить"}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={mobileStickyFooterStyle}>
              <div style={modalTotalStyle}>
                <div style={{ fontSize: 12, color: "#666" }}>Предварительный итог</div>
                <div style={{ fontSize: 24, fontWeight: 800 }}>{fmt(totals?.total || 0)}</div>
              </div>
              <button onClick={buildTKP} style={{ ...primaryBtn, minWidth: 220, width: "100%" }}>Сформировать PDF</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Block({ title, children }) {
  return (
    <div style={blockStyle}>
      <div style={blockTitleStyle}>{title}</div>
      {children}
    </div>
  );
}

function Label({ children }) { return <div style={{ fontSize: 16 }}>{children}</div>; }
function FieldBlock({ label, children }) { return <div><div style={{ fontSize: 16, marginBottom: 8 }}>{label}</div>{children}</div>; }
function Input({ value, onChange, inputMode = "text" }) { return <input value={value} onChange={e => onChange(e.target.value)} inputMode={inputMode} style={inputStyle} />; }
function ChipRadio({ checked, onClick, label }) { return <button type="button" onClick={onClick} style={{ ...chipStyle, ...(checked ? chipSelectedStyle : {}) }}>{label}</button>; }
function ChoiceChip({ checked, onClick, label }) { return <button type="button" onClick={onClick} style={{ ...choiceChipStyle, ...(checked ? chipSelectedStyle : {}) }}>{label}</button>; }
function Row({ label, value }) {
  return (
    <div style={rowStyle}>
      <div style={{ color: "#666" }}>{label}</div>
      <div style={{ fontWeight: 700 }}>{fmt(value)}</div>
    </div>
  );
}

const mainStyle = { minHeight: "100vh", background: "linear-gradient(180deg, #f5f5f7 0%, #eceef2 100%)", padding: 12, fontFamily: "Arial, sans-serif", boxSizing: "border-box" };
const heroWrapStyle = { maxWidth: 1320, margin: "0 auto 14px", background: "linear-gradient(135deg, #111 0%, #1b2430 100%)", color: "#fff", borderRadius: 20, padding: "18px 20px", boxShadow: "0 8px 24px rgba(0,0,0,.12)" };
const heroBadgeStyle = { display: "inline-block", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", opacity: .75 };
const heroTitleStyle = { fontSize: 30, fontWeight: 800, marginTop: 8 };
const heroSubStyle = { marginTop: 8, opacity: .84, lineHeight: 1.4, maxWidth: 760 };
const pageGridStyle = { maxWidth: 1320, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(320px,420px)", gap: 16, alignItems: "start" };
const leftColStyle = { minWidth: 0 };
const rightColStyle = { minWidth: 0 };
const cardStyle = { background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 8px 24px rgba(0,0,0,.08)" };
const stickyCardStyle = { position: "sticky", top: 12, background: "#fff", borderRadius: 20, padding: 18, boxShadow: "0 8px 24px rgba(0,0,0,.08)" };
const headerWrapStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const logoImageStyle = { width: 140, maxWidth: "40vw", height: "auto", objectFit: "contain" };
const blockStyle = { border: "1px solid #ececec", borderRadius: 16, padding: 16, marginTop: 16, background: "#fff" };
const blockTitleStyle = { fontSize: 14, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 14 };
const formGridStyle = { display: "grid", gridTemplateColumns: "minmax(140px, 220px) 1fr", gap: 14, alignItems: "center" };
const adaptiveGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, alignItems: "start" };
const chipGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 14 };
const radioRowStyle = { display: "flex", gap: 10, flexWrap: "wrap" };
const buttonsWrapStyle = { display: "flex", justifyContent: "space-between", gap: 12, marginTop: 18, flexWrap: "wrap" };
const inputStyle = { width: "100%", padding: "12px 14px", border: "1px solid #bbb", borderRadius: 12, fontSize: 16, boxSizing: "border-box", background: "#fff" };
const primaryBtn = { padding: "14px 22px", border: "1px solid #111", background: "#111", color: "#fff", borderRadius: 14, cursor: "pointer", minWidth: 220 };
const secondaryBtn = { padding: "14px 22px", border: "1px solid #999", background: "#fff", borderRadius: 14, cursor: "pointer", minWidth: 200 };
const chipStyle = { padding: "10px 14px", borderRadius: 999, border: "1px solid #cfcfcf", background: "#fff", cursor: "pointer" };
const choiceChipStyle = { padding: "12px 14px", borderRadius: 14, border: "1px solid #d8d8d8", background: "#fff", cursor: "pointer", textAlign: "left" };
const chipSelectedStyle = { border: "1px solid #111", background: "#111", color: "#fff" };
const stickyTopRowStyle = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 };
const loaderStyle = { fontSize: 12, color: "#666" };
const cardLabelStyle = { fontSize: 13, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: ".05em" };
const hintStyle = { marginTop: 14, color: "#666", lineHeight: 1.4 };
const modelTitleStyle = { fontSize: 30, fontWeight: 800, marginTop: 10, lineHeight: 1.08 };
const modelSubtitleStyle = { color: "#666", marginTop: 6 };
const metaPillsStyle = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 };
const pillStyle = { padding: "6px 10px", borderRadius: 999, background: "#f2f2f2", fontSize: 12 };
const imageWrapStyle = { marginTop: 14, borderRadius: 16, overflow: "hidden", background: "#fafafa", border: "1px solid #eee" };
const machinePreviewStyle = { width: "100%", height: 250, objectFit: "contain", display: "block" };
const priceBoxStyle = { marginTop: 14, padding: 16, borderRadius: 16, background: "linear-gradient(135deg, #111 0%, #2b2b2b 100%)", color: "#fff" };
const priceCaptionStyle = { fontSize: 12, opacity: .8 };
const priceValueStyle = { fontSize: 34, fontWeight: 800, marginTop: 4 };
const miniTableStyle = { marginTop: 14, border: "1px solid #eee", borderRadius: 14, overflow: "hidden" };
const rowStyle = { display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderBottom: "1px solid #eee" };
const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.32)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxSizing: "border-box", zIndex: 50 };
const modalStyle = { width: "min(1320px, 98vw)", height: "min(920px, 96vh)", background: "#fff", borderRadius: 20, padding: 14, boxShadow: "0 20px 60px rgba(0,0,0,.18)", display: "flex", flexDirection: "column" };
const modalHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" };
const modalBodyStyle = { flex: 1, overflowY: "auto", paddingRight: 4 };
const mobileStickyFooterStyle = { marginTop: 12, display: "grid", gridTemplateColumns: "1fr minmax(220px,340px)", gap: 10, borderTop: "1px solid #eee", paddingTop: 12 };
const modalTotalStyle = { padding: 12, background: "#f8f8f8", borderRadius: 14, fontWeight: "bold" };
const optionGroupStyle = { border: "1px solid #ddd", borderRadius: 16, padding: 12, marginBottom: 12 };
const optionGroupTitleStyle = { fontWeight: "bold", marginBottom: 12, fontSize: 16 };
const optionsGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 };
const optionCardStyle = { border: "1px solid #ddd", borderRadius: 16, padding: 16, background: "#fff", cursor: "pointer", textAlign: "left", transition: "all .2s ease" };
const optionCardSelectedStyle = { border: "1px solid #111", background: "#f4f7fb", boxShadow: "inset 0 0 0 1px #111" };
const optionCardDisabledStyle = { opacity: 1, cursor: "default", background: "#f8f8f8" };
const optionNameStyle = { fontWeight: 700, textAlign: "left", minHeight: 42 };
const optionPriceStyle = { marginTop: 10, textAlign: "left", color: "#111", fontSize: 18 };
const optionHintStyle = { marginTop: 8, textAlign: "left", fontSize: 12, color: "#777" };
