"use client";

import { useEffect, useState } from "react";

export default function AdminPage() {
  const [me, setMe] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      setMe(meData.user || null);
      if (!meData.user || meData.user.role !== "ceo") return;

      const res = await fetch("/api/tkp-log");
      const data = await res.json();
      if (data.ok) setItems(data.items || []);
      else setError(data.error || "Ошибка загрузки журнала");
    })();
  }, []);

  if (!me) return <main style={{ padding: 24, fontFamily: "Arial" }}>Требуется вход</main>;
  if (me.role !== "ceo") return <main style={{ padding: 24, fontFamily: "Arial" }}>Доступ только для генерального директора</main>;

  return (
    <main style={{ padding: 24, fontFamily: "Arial", background: "#f5f5f7", minHeight: "100vh" }}>
      <h1>Журнал ТКП</h1>
      {error && <div>{error}</div>}
      <div style={{ overflowX: "auto", background: "#fff", borderRadius: 12, padding: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Дата","Логин","ФИО","Роль","Заказчик","ИНН","Модель","Источник","Сумма","Файлы","ТКП №"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((x, i) => (
              <tr key={i}>
                <td style={td}>{x.created_at}</td>
                <td style={td}>{x.login}</td>
                <td style={td}>{x.full_name}</td>
                <td style={td}>{x.role}</td>
                <td style={td}>{x.customer}</td>
                <td style={td}>{x.inn}</td>
                <td style={td}>{x.model}</td>
                <td style={td}>{x.source}</td>
                <td style={td}>{x.total}</td>
                <td style={td}>{x.files}</td>
                <td style={td}>{x.tkp_number}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

const td = { padding: 10, borderBottom: "1px solid #eee", whiteSpace: "nowrap" };
