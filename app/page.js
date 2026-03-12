"use client";

import { useEffect, useState } from "react";

const frameTitles = {
  1: "Frame1 (78-99)",
  2: "Frame2 (100-107)",
  3: "Frame3 (108-110)",
  4: "Frame4 (111-123)",
  5: "Frame5 (124-131)",
  6: "Frame6 (132-135)",
  7: "Frame7 (136-157)"
};

export default function Page() {
  const [source, setSource] = useState("summury");
  const [comboTags, setComboTags] = useState([]);
  const [comboTag, setComboTag] = useState("");
  const [tb1, setTb1] = useState("");
  const [tb2, setTb2] = useState("");
  const [tb3, setTb3] = useState("");
  const [wantM, setWantM] = useState(false);
  const [wantY, setWantY] = useState(false);
  const [wantS, setWantS] = useState(false);
  const [model, setModel] = useState(null);
  const [options, setOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [distanceKm, setDistanceKm] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState(6);
  const [totals, setTotals] = useState(null);

  useEffect(() => { loadCombos(source); }, [source]);
  useEffect(() => { if (model) calculateTotals(); }, [selectedOptions, distanceKm, warrantyMonths]);

  async function loadCombos(src) {
    const res = await fetch("/api/combos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: src })
    });
    const data = await res.json();
    setComboTags(data.tags || []);
    setComboTag("");
  }

  async function searchModel() {
    const res = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source,
        combo_tag: comboTag,
        chuck_max_dia: Number(tb1 || 0),
        max_len: Number(tb2 || 0),
        bar_max_dia: Number(tb3 || 0),
        wantM,
        wantY,
        wantS
      })
    });

    const data = await res.json();
    if (!data.ok) {
      alert(data.message || "Модель не найдена");
      return;
    }

    setModel(data.model);
    setOptions(data.options || []);
    setSelectedOptions(data.model.source === "stock" ? (data.options || []) : []);
    setTotals(null);
  }

  async function calculateTotals() {
    if (!model) return;
    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        selectedOptions,
        distanceKm: Number(distanceKm || 0),
        warrantyMonths: Number(warrantyMonths || 6)
      })
    });
    const data = await res.json();
    setTotals(data);
  }

  function toggleOption(opt) {
    if (model?.source === "stock") return;
    const exists = selectedOptions.some(o => o.option_name === opt.option_name);
    if (exists) setSelectedOptions(selectedOptions.filter(o => o.option_name !== opt.option_name));
    else setSelectedOptions([...selectedOptions, opt]);
  }

  function groupedOptions() {
    const g = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    options.forEach(o => {
      const k = Number(o.frame || 1);
      if (!g[k]) g[k] = [];
      g[k].push(o);
    });
    return g;
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 20, fontFamily: "Arial, sans-serif" }}>
      <h1>Подбор ТКП</h1>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
        <div>
          <label>Источник</label>
          <select value={source} onChange={e => setSource(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="summury">Summury</option>
            <option value="stock">Stock</option>
          </select>
        </div>

        <div>
          <label>Combo</label>
          <select value={comboTag} onChange={e => setComboTag(e.target.value)} style={{ width: "100%", padding: 8 }}>
            <option value="">— без фильтра —</option>
            {comboTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label>Макс. диаметр точения</label>
          <input value={tb1} onChange={e => setTb1(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>

        <div>
          <label>Макс. длина</label>
          <input value={tb2} onChange={e => setTb2(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>

        <div>
          <label>Макс. диаметр прутка</label>
          <input value={tb3} onChange={e => setTb3(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, marginTop: 16 }}>
        <label><input type="checkbox" checked={wantM} onChange={e => setWantM(e.target.checked)} /> M</label>
        <label><input type="checkbox" checked={wantY} onChange={e => { setWantY(e.target.checked); if (e.target.checked) setWantM(true); }} /> Y</label>
        <label><input type="checkbox" checked={wantS} onChange={e => { setWantS(e.target.checked); if (e.target.checked) setWantM(true); }} /> S</label>
      </div>

      <button onClick={searchModel} style={{ marginTop: 16, padding: "10px 16px", cursor: "pointer" }}>
        Подобрать модель
      </button>

      {model && <>
        <hr style={{ margin: "24px 0" }} />
        <h2>{model.model_name}</h2>
        <p>Цена модели: {Number(model.price).toLocaleString("ru-RU")}</p>
        <p>Масса: {model.mass_kg} кг</p>
        <p>Серия: {model.series}</p>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", marginTop: 16 }}>
          <div>
            <label>Расстояние доставки</label>
            <input value={distanceKm} onChange={e => setDistanceKm(e.target.value)} style={{ width: "100%", padding: 8 }} />
          </div>
          <div>
            <label>Гарантия</label>
            <select value={warrantyMonths} onChange={e => setWarrantyMonths(Number(e.target.value))} style={{ width: "100%", padding: 8 }}>
              <option value={6}>6 месяцев</option>
              <option value={12}>12 месяцев</option>
              <option value={24}>24 месяца</option>
            </select>
          </div>
        </div>

        <h3 style={{ marginTop: 24 }}>Опции</h3>
        {Object.entries(groupedOptions()).map(([frame, arr]) =>
          arr.length ? (
            <div key={frame} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, marginTop: 12 }}>
              <div style={{ fontWeight: "bold", marginBottom: 8 }}>{frameTitles[frame]}</div>
              <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
                {arr.map((opt, i) => {
                  const checked = selectedOptions.some(o => o.option_name === opt.option_name);
                  const disabled = model.source === "stock";
                  return (
                    <label key={i} style={{ border: "1px solid #eee", borderRadius: 6, padding: 8 }}>
                      <input type="checkbox" checked={disabled ? true : checked} disabled={disabled} onChange={() => toggleOption(opt)} />
                      {" "}{opt.option_name} — {disabled ? "включено" : Number(opt.price).toLocaleString("ru-RU")}
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null
        )}

        {totals && (
          <div style={{ marginTop: 20, padding: 12, background: "#f7f7f7", borderRadius: 8 }}>
            <div>Цена модели: {Number(totals.base).toLocaleString("ru-RU")}</div>
            <div>Опции: {Number(totals.options).toLocaleString("ru-RU")}</div>
            <div>Доставка: {Number(totals.delivery).toLocaleString("ru-RU")}</div>
            <div>Гарантия: {Number(totals.warranty).toLocaleString("ru-RU")}</div>
            <div style={{ marginTop: 8, fontWeight: "bold" }}>Итого: {Number(totals.total).toLocaleString("ru-RU")}</div>
          </div>
        )}
      </>}
    </main>
  );
}
