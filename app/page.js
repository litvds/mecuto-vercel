
"use client";

import { useState } from "react";

export default function Page() {
  const [customer,setCustomer]=useState("");
  const [model,setModel]=useState(null);

  return (
    <main style={{fontFamily:"Arial",padding:40}}>
      <h1>Конфигуратор MECUTO</h1>

      <div style={{marginTop:20}}>
        <div>Заказчик</div>
        <input
          value={customer}
          onChange={e=>setCustomer(e.target.value)}
          style={{padding:10,width:300}}
        />
      </div>

      <div style={{marginTop:30}}>
        <button
          style={{padding:"12px 20px",background:"#111",color:"#fff",borderRadius:8}}
          onClick={()=>setModel({name:"MECUTO iX Demo"})}
        >
          Подобрать модель
        </button>
      </div>

      {model && (
        <div style={{marginTop:30,padding:20,border:"1px solid #ddd",borderRadius:10}}>
          <div style={{fontSize:20,fontWeight:"bold"}}>{model.name}</div>
          <div style={{marginTop:10}}>Предварительный итог: 5 200 000</div>

          <button
            style={{marginTop:20,padding:"12px 20px",background:"#111",color:"#fff",borderRadius:8}}
            onClick={()=>alert("PDF будет сформирован сервером")}
          >
            Сформировать PDF
          </button>
        </div>
      )}
    </main>
  );
}
