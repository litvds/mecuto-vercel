
// ЗАМЕНИТЕ СВОЙ app/page.js ЭТИМ ФАЙЛОМ

import { useState } from "react";

function detectDevice() {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

export default function Page() {

  async function buildTKP(payload){

    const device = detectDevice();

    if(device === "ios" || device === "android"){
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/build-tkp-pdf";
      form.target = "_blank";

      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "payload";
      input.value = JSON.stringify(payload);

      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
      form.remove();
      return;
    }

    const res = await fetch("/api/build-tkp-pdf",{
      method:"POST",
      headers:{ "Content-Type":"application/json"},
      body: JSON.stringify(payload)
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "TKP.pdf";
    a.click();

    URL.revokeObjectURL(url);
  }

  return <div>Используйте вашу текущую форму. Логика PDF подключена.</div>;
}
