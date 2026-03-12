"use client";

import { useEffect, useMemo, useState } from "react";

function parseFlexibleNumber(value) {
  return Number(String(value || "").replace(",", "."));
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
  const [showOptions, setShowOptions] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadMeta(source); }, [source]);
  useEffect(() => { if (searchResult?.model) calcTotalsNow(); }, [searchResult, selectedOptions, distanceKm, warrantyMonths]);

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
    }
  }

  async function handleSearchAndOpenOptions() {
    setLoading(true);
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        chuck_max_dia: parseFlexibleNumber(maxTurnDia || 0),
        max_len: parseFlexibleNumber(maxTurnLen || 0),
        bar_max_dia: parseFlexibleNumber(barDia || 0),
        chuck_dia: chuckDia,
        wantM: hasM,
        wantY: hasY,
        wantS: hasS
      })
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
    setHasM(false); setHasY(false); setHasS(false); setSearchResult(null); setSelectedOptions([]); setTotals(null); setShowOptions(false);
  }

  function toggleOption(opt) {
    if (searchResult?.model?.source === "stock") return;
    const exists = selectedOptions.some(o => o.row_num === opt.row_num);
    setSelectedOptions(exists ? selectedOptions.filter(o => o.row_num !== opt.row_num) : [...selectedOptions, opt]);
  }

  async function buildTKP() {
    if (!searchResult?.model) return;
    const newWin = window.open("", "_blank");
    if (newWin) newWin.document.write("<p style='font-family:Arial;padding:20px'>Формирование ТКП...</p>");

    const res = await fetch("/api/build-tkp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateName,
        customer, inn, contact, position, phone, email, preparedBy,
        distanceKm: parseFlexibleNumber(distanceKm || 0),
        warrantyMonths: Number(warrantyMonths || 6),
        model: searchResult.model,
        selectedOptions
      })
    });

    const data = await res.json();
    if (!data.ok) {
      if (newWin) newWin.close();
      alert(data.error || "Ошибка формирования ТКП");
      return;
    }

    if (newWin) {
      newWin.document.open();
      newWin.document.write(data.html);
      newWin.document.close();
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

  return (
    <main style={mainStyle}>
      <div style={cardStyle}>
        <div style={headerWrapStyle}>
          <div>
            <h1 style={{ fontSize: 28, margin: 0 }}>Форма для заполнения</h1>
            <div style={{ color: "#666", marginTop: 8 }}>{sourceLabel}</div>
          </div>
          <img src="/images/logo.png" alt="Логотип" style={logoImageStyle} />
        </div>

        <div style={formGridStyle}>
          <Label>Наименование заказчика</Label><Input value={customer} onChange={setCustomer} />
          <Label>ИНН</Label><Input value={inn} onChange={setInn} />
          <Label>Контактное лицо</Label><Input value={contact} onChange={setContact} />
          <Label>Должность</Label><Input value={position} onChange={setPosition} />
          <Label>Телефон</Label><Input value={phone} onChange={setPhone} />
          <Label>E-mail</Label><Input value={email} onChange={setEmail} />
          <Label>Кто подготовил</Label><Input value={preparedBy} onChange={setPreparedBy} />
        </div>

        <hr style={{ margin: "26px 0", border: 0, borderTop: "1px dashed #bbb" }} />

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

        <div style={checkboxWrapStyle}>
          <ChoiceChip checked={hasM} onClick={() => setHasM(!hasM)} label="С приводным инструментом" />
          <ChoiceChip checked={hasY} onClick={() => { const v = !hasY; setHasY(v); if (v) setHasM(true); }} label="С осью Y" />
          <ChoiceChip checked={hasS} onClick={() => { const v = !hasS; setHasS(v); if (v) setHasM(true); }} label="С противошпинделем" />
        </div>

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

        {searchResult?.model && totals && (
          <div style={summaryBoxStyle}>
            <div><b>Подобранная модель:</b> {searchResult.model.model_name}</div>
            <div style={{ marginTop: 6 }}>Предварительный итог: <b>{fmt(totals.total)}</b></div>
          </div>
        )}
      </div>

      {showOptions && searchResult?.model && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={modalHeaderStyle}>
              <h2 style={{ margin: 0, fontSize: 22 }}>Выберите опции для станка {searchResult.model.model_name}</h2>
              <button onClick={() => setShowOptions(false)} style={{ ...secondaryBtn, width: 44, minWidth: 44, padding: 8 }}>×</button>
            </div>

            <div style={modalBodyStyle}>
              {Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map(key => (
                <div key={key} style={optionGroupStyle}>
                  <div style={{ fontWeight: "bold", marginBottom: 12, fontSize: 16 }}>{grouped[key].title}</div>
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
                          <div style={{ fontWeight: 600, textAlign: "left" }}>{opt.option_name}</div>
                          <div style={{ marginTop: 8, textAlign: "left", color: checked || disabled ? "#111" : "#555" }}>
                            {disabled ? "включено" : fmt(opt.price)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={mobileStickyFooterStyle}>
              <div style={modalTotalStyle}>Предварительный итог: {totals ? fmt(totals.total) : "—"}</div>
              <button onClick={buildTKP} style={{ ...primaryBtn, minWidth: 220, width: "100%" }}>Сформировать ТКП</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Label({ children }) { return <div style={{ fontSize: 16 }}>{children}</div>; }
function FieldBlock({ label, children }) { return <div><div style={{ fontSize: 16, marginBottom: 8 }}>{label}</div>{children}</div>; }
function Input({ value, onChange, inputMode = "text" }) { return <input value={value} onChange={e => onChange(e.target.value)} inputMode={inputMode} style={inputStyle} />; }
function ChipRadio({ checked, onClick, label }) { return <button type="button" onClick={onClick} style={{ ...chipStyle, ...(checked ? chipSelectedStyle : {}) }}>{label}</button>; }
function ChoiceChip({ checked, onClick, label }) { return <button type="button" onClick={onClick} style={{ ...chipStyle, ...(checked ? chipSelectedStyle : {}) }}>{label}</button>; }
function fmt(v) { return Number(v || 0).toLocaleString("ru-RU"); }

const mainStyle = { minHeight: "100vh", background: "#f5f5f7", padding: 12, fontFamily: "Arial, sans-serif", boxSizing: "border-box" };
const cardStyle = { maxWidth: 980, margin: "0 auto", background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 8px 24px rgba(0,0,0,.08)" };
const headerWrapStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" };
const logoImageStyle = { width: 140, maxWidth: "40vw", height: "auto", objectFit: "contain" };
const formGridStyle = { display: "grid", gridTemplateColumns: "minmax(140px, 200px) 1fr", gap: 14, marginTop: 24, alignItems: "center" };
const adaptiveGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, alignItems: "start", marginTop: 18 };
const checkboxWrapStyle = { display: "flex", gap: 12, marginTop: 18, flexWrap: "wrap" };
const radioRowStyle = { display: "flex", gap: 10, flexWrap: "wrap" };
const buttonsWrapStyle = { display: "flex", justifyContent: "space-between", gap: 12, marginTop: 28, flexWrap: "wrap" };
const summaryBoxStyle = { marginTop: 20, padding: 14, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" };
const inputStyle = { width: "100%", padding: "12px 14px", border: "1px solid #bbb", borderRadius: 10, fontSize: 16, boxSizing: "border-box" };
const primaryBtn = { padding: "14px 22px", border: "1px solid #111", background: "#111", color: "#fff", borderRadius: 12, cursor: "pointer", minWidth: 220 };
const secondaryBtn = { padding: "14px 22px", border: "1px solid #999", background: "#fff", borderRadius: 12, cursor: "pointer", minWidth: 200 };
const chipStyle = { padding: "10px 14px", borderRadius: 999, border: "1px solid #cfcfcf", background: "#fff", cursor: "pointer" };
const chipSelectedStyle = { border: "1px solid #111", background: "#111", color: "#fff" };
const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.32)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxSizing: "border-box" };
const modalStyle = { width: "min(1200px, 98vw)", height: "min(920px, 96vh)", background: "#fff", borderRadius: 20, padding: 14, boxShadow: "0 20px 60px rgba(0,0,0,.18)", display: "flex", flexDirection: "column" };
const modalHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap" };
const modalBodyStyle = { flex: 1, overflowY: "auto", paddingRight: 4 };
const mobileStickyFooterStyle = { marginTop: 12, display: "grid", gridTemplateColumns: "1fr", gap: 10, borderTop: "1px solid #eee", paddingTop: 12 };
const modalTotalStyle = { padding: 12, background: "#f8f8f8", borderRadius: 10, fontWeight: "bold" };
const optionGroupStyle = { border: "1px solid #ddd", borderRadius: 16, padding: 12, marginBottom: 12 };
const optionsGridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 };
const optionCardStyle = { border: "1px solid #ddd", borderRadius: 14, padding: 14, background: "#fff", cursor: "pointer", textAlign: "left", transition: "all .2s ease" };
const optionCardSelectedStyle = { border: "1px solid #111", background: "#f4f7fb", boxShadow: "inset 0 0 0 1px #111" };
const optionCardDisabledStyle = { opacity: 1, cursor: "default", background: "#f8f8f8" };
