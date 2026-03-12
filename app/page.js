"use client";

import { useEffect, useMemo, useState } from "react";

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
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: src })
    });
    const data = await res.json();
    if (data.ok) { setChuckValues(data.chuckDiameters || []); setSourceLabel(data.sourceLabel || ""); setChuckDia(""); }
  }

  async function handleSearchAndOpenOptions() {
    setLoading(true);
    const res = await fetch("/api/search", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source, chuck_max_dia: Number(maxTurnDia || 0), max_len: Number(maxTurnLen || 0),
        bar_max_dia: Number(barDia || 0), chuck_dia: chuckDia, wantM: hasM, wantY: hasY, wantS: hasS
      })
    });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) return alert(data.message || data.error || "Модель не найдена");
    setSearchResult(data);
    const initialOptions = data.model.source === "stock" ? (data.options || []) : [];
    setSelectedOptions(initialOptions);
    setShowOptions(true);
  }

  async function calcTotalsNow() {
    if (!searchResult?.model) return;
    const res = await fetch("/api/quote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: searchResult.model, selectedOptions, distanceKm: Number(distanceKm || 0), warrantyMonths: Number(warrantyMonths || 6)
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
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templateName, customer, inn, contact, position, phone, email, preparedBy,
        distanceKm: Number(distanceKm || 0), warrantyMonths: Number(warrantyMonths || 6),
        model: searchResult.model, selectedOptions
      })
    });
    const data = await res.json();
    if (!data.ok) {
      if (newWin) newWin.close();
      return alert(data.error || "Ошибка формирования ТКП");
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
    <main style={{ minHeight: "100vh", background: "#f5f5f7", padding: 20, fontFamily: "Arial, sans-serif" }}>
      <div style={{ maxWidth: 980, margin: "0 auto", background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 8px 24px rgba(0,0,0,.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16 }}>
          <div><h1 style={{ fontSize: 28, margin: 0 }}>Форма для заполнения</h1><div style={{ color: "#666", marginTop: 8 }}>{sourceLabel}</div></div>
          <div style={{ width: 92, height: 92, borderRadius: "50%", border: "3px solid #c8a45b", display: "flex", alignItems: "center", justifyContent: "center", color: "#c8a45b", fontWeight: "bold" }}>MECUTO</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 14, marginTop: 24, alignItems: "center" }}>
          <Label>Наименование заказчика</Label><Input value={customer} onChange={setCustomer} />
          <Label>ИНН</Label><Input value={inn} onChange={setInn} />
          <Label>Контактное лицо</Label><Input value={contact} onChange={setContact} />
          <Label>Должность</Label><Input value={position} onChange={setPosition} />
          <Label>Телефон</Label><Input value={phone} onChange={setPhone} />
          <Label>E-mail</Label><Input value={email} onChange={setEmail} />
          <Label>Кто подготовил</Label><Input value={preparedBy} onChange={setPreparedBy} />
        </div>

        <hr style={{ margin: "26px 0", border: 0, borderTop: "1px dashed #bbb" }} />

        <div style={{ display: "flex", gap: 40, marginBottom: 18 }}>
          <label><input type="radio" checked={source === "stock"} onChange={() => setSource("stock")} /> Из наличия</label>
          <label><input type="radio" checked={source === "summury"} onChange={() => setSource("summury")} /> Под заказ</label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "250px 160px 250px 160px", gap: 14, alignItems: "center" }}>
          <Label>Максимальный диаметр точения</Label><Input value={maxTurnDia} onChange={setMaxTurnDia} />
          <Label>Максимальная длина точения</Label><Input value={maxTurnLen} onChange={setMaxTurnLen} />
          <Label>Диаметр прутка</Label><Input value={barDia} onChange={setBarDia} />
          <Label>Диаметр патрона</Label>
          <select value={chuckDia} onChange={e => setChuckDia(e.target.value)} style={inputStyle}>
            <option value="">—</option>{chuckValues.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: 24, marginTop: 18, flexWrap: "wrap" }}>
          <label><input type="checkbox" checked={hasM} onChange={e => setHasM(e.target.checked)} /> С приводным инструментом</label>
          <label><input type="checkbox" checked={hasY} onChange={e => { setHasY(e.target.checked); if (e.target.checked) setHasM(true); }} /> С осью Y</label>
          <label><input type="checkbox" checked={hasS} onChange={e => { setHasS(e.target.checked); if (e.target.checked) setHasM(true); }} /> С противошпинделем</label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "250px 160px 180px auto", gap: 14, alignItems: "center", marginTop: 18 }}>
          <Label>Расстояние до места поставки</Label><Input value={distanceKm} onChange={setDistanceKm} />
          <Label>Гарантия месяцев</Label>
          <div style={{ display: "flex", gap: 14 }}>{[6,12,24].map(m => <label key={m}><input type="radio" checked={warrantyMonths===m} onChange={() => setWarrantyMonths(m)} /> {m}</label>)}</div>
        </div>

        <div style={{ marginTop: 18, display:"grid", gridTemplateColumns:"250px 1fr", gap:14, alignItems:"center" }}>
          <Label>Шаблон ТКП</Label>
          <div style={{ display:"flex", gap:18 }}>
            <label><input type="radio" checked={templateName === "style-size"} onChange={() => setTemplateName("style-size")} /> Стиль Размер</label>
            <label><input type="radio" checked={templateName === "alternative-style"} onChange={() => setTemplateName("alternative-style")} /> Альтернативный стиль</label>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 28 }}>
          <button onClick={handleSearchAndOpenOptions} style={primaryBtn} disabled={loading}>{loading ? "Подбираем..." : "Перейти к выбору опций"}</button>
          <button onClick={clearForm} style={secondaryBtn}>Очистить форму</button>
        </div>

        {searchResult?.model && totals && <div style={{ marginTop: 20, padding: 14, borderRadius: 12, background: "#fafafa", border: "1px solid #eee" }}>
          <div><b>Подобранная модель:</b> {searchResult.model.model_name}</div>
          <div style={{ marginTop: 6 }}>Предварительный итог: <b>{fmt(totals.total)}</b></div>
        </div>}
      </div>

      {showOptions && searchResult?.model && <div style={overlayStyle}>
        <div style={modalStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ margin: 0, fontSize: 22 }}>Выберите опции для станка {searchResult.model.model_name}</h2>
            <button onClick={() => setShowOptions(false)} style={{ ...secondaryBtn, width: 44, minWidth: 44, padding: 8 }}>×</button>
          </div>

          <div style={{ maxHeight: "70vh", overflowY: "auto", paddingRight: 8 }}>
            {Object.keys(grouped).sort((a,b)=>Number(a)-Number(b)).map(key => (
              <div key={key} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <div style={{ fontWeight: "bold", marginBottom: 10 }}>{grouped[key].title}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10 }}>
                  {grouped[key].items.map((opt, idx) => {
                    const checked = selectedOptions.some(o => o.row_num === opt.row_num);
                    const disabled = searchResult.model.source === "stock";
                    return <label key={idx} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10, display: "block" }}>
                      <input type="checkbox" checked={disabled ? true : checked} disabled={disabled} onChange={() => toggleOption(opt)} /> {opt.option_name} — {disabled ? "включено" : fmt(opt.price)}
                    </label>;
                  })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div style={{ padding: 12, background: "#f8f8f8", borderRadius: 10, fontWeight: "bold", flex: 1 }}>
              Предварительный итог: {totals ? fmt(totals.total) : "—"}
            </div>
            <button onClick={buildTKP} style={{ ...primaryBtn, minWidth: 220 }}>Сформировать ТКП</button>
          </div>
        </div>
      </div>}
    </main>
  );
}

function Label({ children }) { return <div style={{ fontSize: 16 }}>{children}</div>; }
function Input({ value, onChange }) { return <input value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />; }
function fmt(v) { return Number(v || 0).toLocaleString("ru-RU"); }

const inputStyle = { width: "100%", padding: "10px 12px", border: "1px solid #bbb", borderRadius: 4, fontSize: 16, boxSizing: "border-box" };
const primaryBtn = { padding: "14px 22px", border: "1px solid #999", background: "#f3f3f3", borderRadius: 4, cursor: "pointer", minWidth: 220 };
const secondaryBtn = { padding: "14px 22px", border: "1px solid #999", background: "#f8f8f8", borderRadius: 4, cursor: "pointer", minWidth: 200 };
const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,.22)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 };
const modalStyle = { width: "min(1200px, 96vw)", background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 20px 60px rgba(0,0,0,.18)" };
