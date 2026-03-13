"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function parseFlexibleNumber(value) { return Number(String(value || "").replace(",", ".")); }
function detectDevice() {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}
function fmt(v) { return Number(v || 0).toLocaleString("ru-RU"); }
function getMachineImage(model) { return model?.series ? `/images/machines/${model.series}.png` : ""; }
function roleTitle(role) {
  return ({ manager: "Менеджер по продажам", sales_director: "Директор по продажам", ceo: "Генеральный директор" })[role] || role;
}

export default function Page() {
  const [me, setMe] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setMe(data.user || null);
      setCheckingAuth(false);
    })();
  }, []);

  useEffect(() => {
    const apply = () => setIsMobile(window.innerWidth <= 820);
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);

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

  useEffect(() => { if (me) loadMeta(source); }, [source, me]);

  useEffect(() => {
    if (!me) return;
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
    }, 350);

    return () => clearTimeout(t);
  }, [filterPayload, distanceKm, warrantyMonths, me]);

  useEffect(() => {
    if (searchResult?.model) calcTotalsNow();
  }, [searchResult, selectedOptions, distanceKm, warrantyMonths]);

  async function doLogin(e) {
    e.preventDefault();
    setAuthError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password })
    });
    const data = await res.json();
    if (!data.ok) {
      setAuthError(data.error || "Ошибка входа");
      return;
    }
    setMe(data.user);
    setPassword("");
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    location.reload();
  }

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
    const exists = selectedOptions.some((o) => o.row_num === opt.row_num);
    setSelectedOptions(exists ? selectedOptions.filter((o) => o.row_num !== opt.row_num) : [...selectedOptions, opt]);
  }

  function submitFormToRoute(payload, route) {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = route;
    form.target = "_self";
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

  async function downloadViaFetch(route, filenameBase) {
    const payload = getPayload();
    const res = await fetch(route, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const data = await res.text();
      throw new Error(data || "Ошибка генерации файла");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filenameBase;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function getPayload() {
    return {
      templateName, customer, inn, contact, position, phone, email, preparedBy,
      distanceKm: parseFlexibleNumber(distanceKm || 0),
      warrantyMonths: Number(warrantyMonths || 6),
      model: searchResult.model,
      selectedOptions
    };
  }

  async function handleGenerate(kind) {
    if (!searchResult?.model) return;
    const device = detectDevice();
    const payload = getPayload();

    try {
      if (device !== "desktop") {
        if (kind === "pdf") submitFormToRoute(payload, "/api/build-tkp-pdf?download=1");
        else if (kind === "docx") submitFormToRoute(payload, "/api/build-tkp-docx?download=1");
        else submitFormToRoute(payload, "/api/build-tkp-bundle?download=1");
        return;
      }

      if (kind === "pdf") await downloadViaFetch("/api/build-tkp-pdf?download=1", "TKP.pdf");
      else if (kind === "docx") await downloadViaFetch("/api/build-tkp-docx?download=1", "TKP.docx");
      else await downloadViaFetch("/api/build-tkp-bundle?download=1", "TKP_bundle.zip");
    } catch (e) {
      alert(String(e.message || e));
    }
  }

  const grouped = useMemo(() => {
    const g = {};
    (searchResult?.options || []).forEach((opt) => {
      const key = String(opt.frame);
      if (!g[key]) g[key] = { title: opt.frameTitle, items: [] };
      g[key].items.push(opt);
    });
    return g;
  }, [searchResult]);

  const modelForCard = searchResult?.model || previewSearchResult?.model;
  const totalForCard = totals?.total || previewTotals?.total || 0;

  if (checkingAuth) return <main style={{ padding: 24, fontFamily: "Arial" }}>Загрузка...</main>;

  if (!me) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f5f5f7", fontFamily: "Arial", padding: 20 }}>
        <form onSubmit={doLogin} style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 18, padding: 24, boxShadow: "0 8px 24px rgba(0,0,0,.08)" }}>
          <h1 style={{ marginTop: 0 }}>Вход в систему</h1>
          <div style={{ marginBottom: 8 }}>Логин</div>
          <input value={login} onChange={(e) => setLogin(e.target.value)} style={styles.input} />
          <div style={{ marginBottom: 8, marginTop: 14 }}>Пароль</div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} />
          {authError && <div style={{ color: "crimson", marginTop: 12 }}>{authError}</div>}
          <button type="submit" style={{ ...styles.primaryBtn(true), marginTop: 16 }}>Войти</button>
        </form>
      </main>
    );
  }

  return (
    <main style={styles.main}>
      <div style={styles.shell}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: isMobile ? "stretch" : "center",
            marginBottom: 12,
            flexWrap: "wrap"
          }}
        >
          <div style={{ color: "#333", fontWeight: 600 }}>
            {me.full_name || me.login} • {roleTitle(me.role)}
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              flexDirection: "row",
              width: isMobile ? "100%" : "auto",
              justifyContent: isMobile ? "space-between" : "flex-end"
            }}
          >
            {me.role === "ceo" && (
              <a
                href="/admin"
                style={{
                  ...styles.secondaryBtn(false),
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: isMobile ? 1 : "0 0 auto"
                }}
              >
                Журнал ТКП
              </a>
            )}

            <button
              onClick={logout}
              style={{
                ...styles.secondaryBtn(false),
                flex: isMobile ? 1 : "0 0 auto"
              }}
            >
              Выйти
            </button>
          </div>
        </div>

        <div style={styles.hero(isMobile)}>
          <div style={styles.heroBadge}>MECUTO / TENOLY / RAZMER</div>
          <div style={styles.heroTitle(isMobile)}>Конфигуратор ТКП V5</div>
          <div style={styles.heroSub(isMobile)}>Роли, журнал ТКП, PDF и DOCX по правам доступа.</div>
        </div>

        <div style={styles.layout(isMobile)}>
          <div style={styles.left}>
            {isMobile && (
              <PreviewCard isMobile={isMobile} previewLoading={previewLoading} modelForCard={modelForCard} totalForCard={totalForCard} totals={totals} previewTotals={previewTotals} previewMessage={previewMessage} />
            )}

            <div style={styles.card}>
              <div style={styles.header(isMobile)}>
                <div>
                  <h1 style={styles.h1(isMobile)}>Подбор ТКП</h1>
                  <div style={styles.muted}>{sourceLabel}</div>
                </div>
                <img src="/images/logo.png" alt="Логотип" style={styles.logo(isMobile)} />
              </div>

              <Block title="Данные заказчика">
                <div style={styles.formGrid(isMobile)}>
                  <Label isMobile={isMobile}>Наименование заказчика</Label><Input value={customer} onChange={setCustomer} />
                  <Label isMobile={isMobile}>ИНН</Label><Input value={inn} onChange={setInn} />
                  <Label isMobile={isMobile}>Контактное лицо</Label><Input value={contact} onChange={setContact} />
                  <Label isMobile={isMobile}>Должность</Label><Input value={position} onChange={setPosition} />
                  <Label isMobile={isMobile}>Телефон</Label><Input value={phone} onChange={setPhone} />
                  <Label isMobile={isMobile}>E-mail</Label><Input value={email} onChange={setEmail} />
                  <Label isMobile={isMobile}>Кто подготовил</Label><Input value={preparedBy} onChange={setPreparedBy} />
                </div>
              </Block>

              <Block title="Источник и параметры">
                <div style={styles.radioRow(isMobile)}>
                  <ChipRadio checked={source === "stock"} onClick={() => setSource("stock")} label="Из наличия" />
                  <ChipRadio checked={source === "summury"} onClick={() => setSource("summury")} label="Под заказ" />
                </div>

                <div style={styles.paramGrid(isMobile)}>
                  <FieldBlock label="Максимальный диаметр точения"><Input value={maxTurnDia} onChange={setMaxTurnDia} inputMode="decimal" /></FieldBlock>
                  <FieldBlock label="Максимальная длина точения"><Input value={maxTurnLen} onChange={setMaxTurnLen} inputMode="decimal" /></FieldBlock>
                  <FieldBlock label="Диаметр прутка"><Input value={barDia} onChange={setBarDia} inputMode="decimal" /></FieldBlock>
                  <FieldBlock label="Диаметр патрона">
                    <select value={chuckDia} onChange={(e) => setChuckDia(e.target.value)} style={styles.input}>
                      <option value="">—</option>
                      {chuckValues.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </FieldBlock>
                </div>

                <div style={styles.chipGrid(isMobile)}>
                  <ChoiceChip checked={hasM} onClick={() => setHasM(!hasM)} label="С приводным инструментом" />
                  <ChoiceChip checked={hasY} onClick={() => { const v = !hasY; setHasY(v); if (v) setHasM(true); }} label="С осью Y" />
                  <ChoiceChip checked={hasS} onClick={() => { const v = !hasS; setHasS(v); if (v) setHasM(true); }} label="С противошпинделем" />
                </div>
              </Block>

              <Block title="Расчет и выпуск ТКП">
                <div style={styles.paramGrid(isMobile)}>
                  <FieldBlock label="Расстояние до места поставки"><Input value={distanceKm} onChange={setDistanceKm} inputMode="decimal" /></FieldBlock>
                  <FieldBlock label="Гарантия месяцев">
                    <div style={styles.radioRow(isMobile)}>
                      {[6, 12, 24].map((m) => <ChipRadio key={m} checked={warrantyMonths === m} onClick={() => setWarrantyMonths(m)} label={String(m)} />)}
                    </div>
                  </FieldBlock>
                </div>

                <div style={styles.paramGrid(isMobile)}>
                  <FieldBlock label="Шаблон ТКП">
                    <div style={styles.templateRow(isMobile)}>
                      <ChipRadio checked={templateName === "style-size"} onClick={() => setTemplateName("style-size")} label="Стиль Размер" />
                      <ChipRadio checked={templateName === "alternative-style"} onClick={() => setTemplateName("alternative-style")} label="Альтернативный стиль" />
                    </div>
                  </FieldBlock>
                </div>

                <div style={styles.buttonGroup(isMobile)}>
                  <button onClick={handleSearchAndOpenOptions} style={styles.secondaryBtn(true)} disabled={loading}>
                    {loading ? "Подбираем..." : "Перейти к выбору опций"}
                  </button>
                  <button onClick={clearForm} style={styles.secondaryBtn(true)}>Очистить форму</button>
                </div>
              </Block>
            </div>
          </div>

          {!isMobile && (
            <div style={styles.right}>
              <PreviewCard isMobile={isMobile} previewLoading={previewLoading} modelForCard={modelForCard} totalForCard={totalForCard} totals={totals} previewTotals={previewTotals} previewMessage={previewMessage} />
            </div>
          )}
        </div>
      </div>

      {showOptions && searchResult?.model && (
        <div style={styles.overlay}>
          <div style={styles.modal(isMobile)}>
            <div style={styles.modalHeader(isMobile)}>
              <div>
                <h2 style={{ margin: 0, fontSize: isMobile ? 18 : 22 }}>Выберите опции для станка {searchResult.model.model_name}</h2>
                <div style={styles.muted}>Цена обновляется автоматически</div>
              </div>
              <button onClick={() => setShowOptions(false)} style={styles.closeBtn}>×</button>
            </div>

            <div style={styles.modalBody}>
              {Object.keys(grouped).sort((a, b) => Number(a) - Number(b)).map((key) => (
                <div key={key} style={styles.optionGroup}>
                  <div style={styles.optionGroupTitle}>{grouped[key].title}</div>
                  <div style={styles.optionsGrid(isMobile)}>
                    {grouped[key].items.map((opt, idx) => {
                      const checked = selectedOptions.some((o) => o.row_num === opt.row_num);
                      const disabled = searchResult.model.source === "stock";
                      return (
                        <button key={idx} onClick={() => toggleOption(opt)} disabled={disabled} style={{ ...styles.optionCard, ...(checked || disabled ? styles.optionCardSelected : {}), ...(disabled ? styles.optionCardDisabled : {}) }}>
                          <div style={styles.optionName}>{opt.option_name}</div>
                          <div style={styles.optionPrice}>{disabled ? "включено" : fmt(opt.price)}</div>
                          <div style={styles.optionHint}>{disabled ? "Входит в комплектацию" : checked ? "Добавлено" : "Нажмите, чтобы добавить"}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={styles.modalFooter(isMobile)}>
              <div style={styles.totalBox}>
                <div style={{ fontSize: 12, color: "#666" }}>Предварительный итог</div>
                <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 800 }}>{fmt(totals?.total || 0)}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 8 }}>
                <button onClick={() => handleGenerate("pdf")} style={styles.primaryBtn(true)}>Сформировать PDF</button>
                {(me.role === "sales_director" || me.role === "ceo") && <button onClick={() => handleGenerate("both")} style={styles.secondaryBtn(true)}>Сформировать PDF + DOCX</button>}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function PreviewCard({ isMobile, previewLoading, modelForCard, totalForCard, totals, previewTotals, previewMessage }) {
  return (
    <div style={styles.previewCard(isMobile)}>
      <div style={styles.previewHead}>
        <div style={styles.cardLabel}>Живой подбор</div>
        {previewLoading && <div style={styles.loader}>обновление…</div>}
      </div>
      {!previewLoading && !modelForCard && <div style={styles.hint}>{previewMessage}</div>}
      {modelForCard && (
        <>
          <div style={styles.modelTitle(isMobile)}>{modelForCard.model_name}</div>
          <div style={styles.modelSubtitle}>Подходит под заданные параметры</div>
          <div style={styles.pills}>
            <span style={styles.pill}>{modelForCard.source === "stock" ? "Со склада" : "Под заказ"}</span>
            <span style={styles.pill}>Серия {modelForCard.series}</span>
            <span style={styles.pill}>Масса {fmt(modelForCard.mass_kg)} кг</span>
          </div>
          <div style={styles.imageWrap}><img src={getMachineImage(modelForCard)} alt={modelForCard.model_name} style={styles.machineImage} /></div>
          <div style={styles.priceHero}>
            <div style={{ fontSize: 12, opacity: .8 }}>Предварительный итог</div>
            <div style={{ fontSize: isMobile ? 28 : 34, fontWeight: 800, marginTop: 4 }}>{fmt(totalForCard)}</div>
          </div>
          <div style={styles.rowsBox}>
            <Row label="Базовая цена" value={totals?.base || previewTotals?.base || 0} />
            <Row label="Опции" value={totals?.options || previewTotals?.options || 0} />
            <Row label="Доставка" value={totals?.delivery || previewTotals?.delivery || 0} />
            <Row label="Гарантия" value={totals?.warranty || previewTotals?.warranty || 0} />
          </div>
        </>
      )}
    </div>
  );
}

function Block({ title, children }) { return <div style={styles.block}><div style={styles.blockTitle}>{title}</div>{children}</div>; }
function Label({ children, isMobile }) { return <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: isMobile ? 600 : 400 }}>{children}</div>; }
function FieldBlock({ label, children }) { return <div><div style={{ fontSize: 16, marginBottom: 8 }}>{label}</div>{children}</div>; }
function Input({ value, onChange, inputMode = "text" }) { return <input value={value} onChange={(e) => onChange(e.target.value)} inputMode={inputMode} style={styles.input} />; }
function ChipRadio({ checked, onClick, label }) { return <button type="button" onClick={onClick} style={{ ...styles.chip, ...(checked ? styles.chipSelected : {}) }}>{label}</button>; }
function ChoiceChip({ checked, onClick, label }) { return <button type="button" onClick={onClick} style={{ ...styles.choiceChip, ...(checked ? styles.chipSelected : {}) }}>{label}</button>; }
function Row({ label, value }) { return <div style={styles.row}><div style={{ color: "#666" }}>{label}</div><div style={{ fontWeight: 700 }}>{fmt(value)}</div></div>; }

const styles = {
  main: { minHeight: "100vh", background: "linear-gradient(180deg, #f5f5f7 0%, #eceef2 100%)", padding: 12, fontFamily: "Arial, sans-serif", boxSizing: "border-box" },
  shell: { maxWidth: 1320, margin: "0 auto" },
  hero: (m) => ({ background: "linear-gradient(135deg, #111 0%, #1b2430 100%)", color: "#fff", borderRadius: m ? 20 : 24, padding: m ? "18px 18px" : "22px 24px", boxShadow: "0 8px 24px rgba(0,0,0,.12)", marginBottom: 16 }),
  heroBadge: { display: "inline-block", fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", opacity: .75 },
  heroTitle: (m) => ({ fontSize: m ? 32 : 44, lineHeight: 1.05, fontWeight: 800, marginTop: 10 }),
  heroSub: (m) => ({ marginTop: 10, opacity: .9, lineHeight: 1.35, maxWidth: m ? "100%" : 760, fontSize: m ? 18 : 24 }),
  layout: (m) => ({ display: "grid", gridTemplateColumns: m ? "1fr" : "minmax(0,1fr) minmax(320px,420px)", gap: 16, alignItems: "start" }),
  left: { minWidth: 0 }, right: { minWidth: 0 },
  card: { background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 8px 24px rgba(0,0,0,.08)" },
  previewCard: (m) => ({ position: m ? "static" : "sticky", top: 12, background: "#fff", borderRadius: 20, padding: 18, boxShadow: "0 8px 24px rgba(0,0,0,.08)", marginBottom: m ? 16 : 0 }),
  header: (m) => ({ display: "flex", justifyContent: "space-between", alignItems: m ? "center" : "flex-start", gap: 16, flexDirection: m ? "column-reverse" : "row" }),
  h1: (m) => ({ fontSize: m ? 28 : 30, margin: 0 }),
  muted: { color: "#666", marginTop: 8, lineHeight: 1.35 },
  logo: (m) => ({ width: m ? 180 : 140, maxWidth: "70vw", height: "auto", objectFit: "contain", alignSelf: m ? "center" : "auto" }),
  block: { border: "1px solid #ececec", borderRadius: 16, padding: 16, marginTop: 16, background: "#fff" },
  blockTitle: { fontSize: 14, fontWeight: 700, color: "#444", textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 14 },
  formGrid: (m) => ({ display: "grid", gridTemplateColumns: m ? "1fr" : "minmax(140px,220px) 1fr", gap: m ? 10 : 14, alignItems: "center" }),
  paramGrid: (m) => ({ display: "grid", gridTemplateColumns: m ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, alignItems: "start" }),
  chipGrid: (m) => ({ display: "grid", gridTemplateColumns: m ? "1fr" : "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 14 }),
  radioRow: (m) => ({ display: "flex", gap: 10, flexWrap: "wrap" }),
  templateRow: (m) => ({ display: "flex", gap: 10, flexWrap: "wrap", flexDirection: m ? "column" : "row" }),
  buttonGroup: (m) => ({ display: "grid", gridTemplateColumns: m ? "1fr" : "1fr 1fr", gap: 12, marginTop: 18 }),
  input: { width: "100%", padding: "14px 16px", border: "1px solid #bbb", borderRadius: 14, fontSize: 18, minHeight: 54, boxSizing: "border-box", background: "#fff", appearance: "none", WebkitAppearance: "none" },
  primaryBtn: (full) => ({ padding: "16px 20px", border: "1px solid #111", background: "#111", color: "#fff", borderRadius: 16, cursor: "pointer", width: full ? "100%" : "auto", minHeight: 56, fontSize: 18, fontWeight: 600 }),
  secondaryBtn: (full) => ({ padding: "16px 20px", border: "1px solid #bbb", background: "#fff", color: "#111", borderRadius: 16, cursor: "pointer", width: full ? "100%" : "auto", minHeight: 56, fontSize: 18 }),
  chip: { padding: "12px 18px", borderRadius: 999, border: "1px solid #cfcfcf", background: "#fff", cursor: "pointer", minHeight: 48, fontSize: 18 },
  choiceChip: { padding: "14px 16px", borderRadius: 16, border: "1px solid #d8d8d8", background: "#fff", cursor: "pointer", textAlign: "left", minHeight: 54, fontSize: 18 },
  chipSelected: { border: "1px solid #111", background: "#111", color: "#fff" },
  previewHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  cardLabel: { fontSize: 13, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: ".05em" },
  loader: { fontSize: 12, color: "#666" },
  hint: { marginTop: 14, color: "#666", lineHeight: 1.45, fontSize: 18 },
  modelTitle: (m) => ({ fontSize: m ? 26 : 30, fontWeight: 800, marginTop: 10, lineHeight: 1.08 }),
  modelSubtitle: { color: "#666", marginTop: 6, fontSize: 16 },
  pills: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
  pill: { padding: "6px 10px", borderRadius: 999, background: "#f2f2f2", fontSize: 12 },
  imageWrap: { marginTop: 14, borderRadius: 16, overflow: "hidden", background: "#fafafa", border: "1px solid #eee" },
  machineImage: { width: "100%", height: 250, objectFit: "contain", display: "block" },
  priceHero: { marginTop: 14, padding: 16, borderRadius: 16, background: "linear-gradient(135deg, #111 0%, #2b2b2b 100%)", color: "#fff" },
  rowsBox: { marginTop: 14, border: "1px solid #eee", borderRadius: 14, overflow: "hidden" },
  row: { display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderBottom: "1px solid #eee" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.32)", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, boxSizing: "border-box", zIndex: 50 },
  modal: (m) => ({ width: m ? "100vw" : "min(1320px, 98vw)", height: m ? "100vh" : "min(920px, 96vh)", background: "#fff", borderRadius: m ? 0 : 20, padding: 14, boxShadow: m ? "none" : "0 20px 60px rgba(0,0,0,.18)", display: "flex", flexDirection: "column" }),
  modalHeader: (m) => ({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 12, flexWrap: "wrap", paddingTop: m ? 10 : 0 }),
  closeBtn: { width: 44, minWidth: 44, height: 44, borderRadius: 12, border: "1px solid #bbb", background: "#fff", fontSize: 24 },
  modalBody: { flex: 1, overflowY: "auto", paddingRight: 4 },
  modalFooter: (m) => ({ marginTop: 12, display: "grid", gridTemplateColumns: m ? "1fr" : "1fr minmax(220px,340px)", gap: 10, borderTop: "1px solid #eee", paddingTop: 12 }),
  totalBox: { padding: 12, background: "#f8f8f8", borderRadius: 14, fontWeight: "bold" },
  optionGroup: { border: "1px solid #ddd", borderRadius: 16, padding: 12, marginBottom: 12 },
  optionGroupTitle: { fontWeight: "bold", marginBottom: 12, fontSize: 16 },
  optionsGrid: (m) => ({ display: "grid", gridTemplateColumns: m ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }),
  optionCard: { border: "1px solid #ddd", borderRadius: 16, padding: 16, background: "#fff", cursor: "pointer", textAlign: "left", transition: "all .2s ease" },
  optionCardSelected: { border: "1px solid #111", background: "#f4f7fb", boxShadow: "inset 0 0 0 1px #111" },
  optionCardDisabled: { opacity: 1, cursor: "default", background: "#f8f8f8" },
  optionName: { fontWeight: 700, textAlign: "left", minHeight: 42, fontSize: 18, lineHeight: 1.3 },
  optionPrice: { marginTop: 10, textAlign: "left", color: "#111", fontSize: 22 },
  optionHint: { marginTop: 8, textAlign: "left", fontSize: 13, color: "#777" },
};
