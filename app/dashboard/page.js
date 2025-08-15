
"use client";
import { useEffect, useState } from "react";

function safeList(x){
  return Array.isArray(x) ? x : [];
}

export default function Dashboard(){
  const [rows, setRows] = useState([]);
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function load(){
    setLoading(true); setErr("");
    try{
      const res = await fetch("/api/ocs/list-subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: 3771 })
      });
      const text = await res.text();
      let json; try{ json = JSON.parse(text); }catch{ json = { raw: text }; }
      setRaw(JSON.stringify(json, null, 2));
      const list = json?.listSubscriber?.subscriberList;
      setRows(safeList(list));
    }catch(e){
      setErr(String(e));
    }finally{
      setLoading(false);
    }
  }

  useEffect(()=>{ load(); }, []);

  return (
    <div>
      <h1>OCS Dashboard</h1>
      <button onClick={load} disabled={loading} style={{ padding:'8px 14px', borderRadius:8 }}>
        {loading ? "Loading…" : "Refresh"}
      </button>
      {err && <div style={{ marginTop:10, color:'#ffb3b3' }}>API error: {err}</div>}
      <div style={{ marginTop:16, background:'#151a2e', padding:12, borderRadius:12, color:'#cfd8ff' }}>
        <div style={{ fontWeight:700, marginBottom:8 }}>Raw response</div>
        <pre style={{ margin:0, whiteSpace:'pre-wrap' }}>{raw}</pre>
      </div>
      <table style={{ marginTop:20, width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th style={{ textAlign:'left', borderBottom:'1px solid #2a3356', padding:8 }}>Subscriber ID</th>
            <th style={{ textAlign:'left', borderBottom:'1px solid #2a3356', padding:8 }}>ICCID</th>
            <th style={{ textAlign:'left', borderBottom:'1px solid #2a3356', padding:8 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i)=> (
            <tr key={i}>
              <td style={{ padding:8 }}>{String(s?.subscriberId ?? "")}</td>
              <td style={{ padding:8 }}>{String((s?.imsiList && s.imsiList[0]?.iccid) || "")}</td>
              <td style={{ padding:8 }}>{String(s?.status ?? "")}</td>
            </tr>
          ))}
          {rows.length===0 && <tr><td colSpan="3" style={{ padding:8, opacity:0.8 }}>No data.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
