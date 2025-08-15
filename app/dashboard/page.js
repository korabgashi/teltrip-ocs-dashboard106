"use client";
import { useEffect, useMemo, useState } from "react";

async function postJSON(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(json?.error || json?.detail || text || `HTTP ${res.status}`);
  return json;
}

// ------- helpers to flatten OCS fields -------
const a = (v) => Array.isArray(v) ? v : [];
const s = (v) => (v === null || v === undefined) ? "" : String(v);

function getICCID(sub) {
  const list = a(sub?.imsiList);
  return list.length ? (list[0]?.iccid ?? "") : "";
}
function getStatusText(sub) {
  // OCS returns array of { id, subscriberId, startDate, endDate?, status }
  const hist = a(sub?.status);
  if (!hist.length) return "";
  // Sort by startDate desc and pick latest label; also join distinct labels
  const labelSet = Array.from(new Set(hist.map(x => s(x?.status)).filter(Boolean)));
  // Use the *current* (no endDate) if exists, otherwise the latest by startDate
  const current = hist.find(x => !x?.endDate) || hist.slice().sort((a,b)=>s(b?.startDate).localeCompare(s(a?.startDate)))[0];
  const currentLabel = s(current?.status);
  return currentLabel || labelSet.join(" / ");
}
function getESIM(sub) {
  // sometimes under sub.sim.esim, sometimes under imsiList[0].esim
  const simEsim = sub?.sim?.esim;
  const list = a(sub?.imsiList);
  const imsiEsim = list.length ? list[0]?.esim : undefined;
  const v = (simEsim !== undefined ? simEsim : imsiEsim);
  return v === true ? "Yes" : v === false ? "No" : "";
}
function getActivationDate(sub) {
  return s(sub?.activationDate || sub?.tsactivationutc || "");
}
function getLastUsage(sub) {
  return s(sub?.lastUsageDate || "");
}
function getBalance(sub) {
  const v = sub?.balance;
  if (typeof v === "number") return v.toFixed(2);
  if (typeof v === "string" && v.trim() !== "") return v;
  return "";
}

// ------- columns to display -------
const COLUMNS = [
  { key: "subscriberId",    title: "Subscriber ID", value: (sub) => s(sub?.subscriberId) },
  { key: "iccid",           title: "ICCID",         value: (sub) => s(getICCID(sub)) },
  { key: "status",          title: "Status",        value: (sub) => s(getStatusText(sub)) },
  { key: "esim",            title: "eSIM",          value: (sub) => s(getESIM(sub)) },
  { key: "activationDate",  title: "Activated",     value: (sub) => s(getActivationDate(sub)) },
  { key: "lastUsageDate",   title: "Last Usage",    value: (sub) => s(getLastUsage(sub)) },
  { key: "resellerId",      title: "Reseller ID",   value: (sub) => s(sub?.resellerId ?? sub?.reseller ?? "") },
  { key: "accountId",       title: "Account ID",    value: (sub) => s(sub?.accountId ?? "") },
  { key: "batchId",         title: "Batch ID",      value: (sub) => s(sub?.batchId ?? "") },
  { key: "prepaid",         title: "Prepaid",       value: (sub) => sub?.prepaid === true ? "Yes" : sub?.prepaid === false ? "No" : "" },
  { key: "balance",         title: "Balance",       value: (sub) => getBalance(sub) },
];

export default function Dashboard(){
  const [accountId, setAccountId] = useState(3771);
  const [rows, setRows] = useState([]);
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const json = await postJSON("/api/ocs/list-subscribers", { accountId });
      setRaw(JSON.stringify(json ?? {}, null, 2));
      const list = json?.listSubscriber?.subscriberList;
      setRows(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(String(e));
      setRows([]);
    } finally { setLoading(false); }
  };

  useEffect(()=> { load(); }, []);

  const kpis = useMemo(()=> {
    const total = rows.length;
    const active = rows.filter(r => getStatusText(r).toUpperCase() === "ACTIVE").length;
    return { total, active, inactive: total - active };
  }, [rows]);

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap' }}>
        <h1 style={{ fontSize:24, fontWeight:700 }}>OCS Dashboard</h1>
        <div style={{ display:'flex', gap:8 }}>
          <input
            type="number"
            value={accountId}
            onChange={(e)=>setAccountId(Number(e.target.value))}
            style={{ width:160, padding:8, borderRadius:10, border:'1px solid #2a3356', background:'#0f1428', color:'#e9ecf1' }}
          />
          <button onClick={load} style={{ padding:'8px 14px', borderRadius:10, border:0, background:'#4b74ff', color:'#fff', fontWeight:600 }}>
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginTop:16, padding:12, borderRadius:12, background:'#3a2030', color:'#ffd4d4', whiteSpace:'pre-wrap' }}>
          <strong>API error:</strong> {error}
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginTop:16 }}>
        <div style={{ background:'#151a2e', padding:16, borderRadius:16 }}>
          <div style={{ opacity:0.7 }}>Total Subscribers</div>
          <div style={{ fontSize:28, fontWeight:700 }}>{kpis.total}</div>
        </div>
        <div style={{ background:'#151a2e', padding:16, borderRadius:16 }}>
          <div style={{ opacity:0.7 }}>Active</div>
          <div style={{ fontSize:28, fontWeight:700 }}>{kpis.active}</div>
        </div>
        <div style={{ background:'#151a2e', padding:16, borderRadius:16 }}>
          <div style={{ opacity:0.7 }}>Inactive</div>
          <div style={{ fontSize:28, fontWeight:700 }}>{kpis.inactive}</div>
        </div>
      </div>

      <div style={{ marginTop:24, background:'#151a2e', borderRadius:16, overflow:'auto' }}>
        <div style={{ minWidth: 1200 }}>
          {/* header */}
          <div style={{ display:'grid', gridTemplateColumns:`repeat(${COLUMNS.length}, minmax(140px, 1fr))`, gap:0, fontWeight:600, borderBottom:'1px solid #2a3356', padding:12 }}>
            {COLUMNS.map(c => <div key={c.key}>{c.title}</div>)}
          </div>
          {/* rows */}
          {rows.map((r, idx) => (
            <div key={idx} style={{ display:'grid', gridTemplateColumns:`repeat(${COLUMNS.length}, minmax(140px, 1fr))`, gap:0, borderBottom:'1px solid #2a3356', padding:12 }}>
              {COLUMNS.map(c => <div key={c.key}>{c.value(r)}</div>)}
            </div>
          ))}
          {!loading && !error && rows.length===0 && <div style={{ padding:16, opacity:0.8 }}>No data.</div>}
          {loading && <div style={{ padding:16 }}>Loading…</div>}
        </div>
      </div>

      {/* Raw viewer for debugging */}
      <div style={{ marginTop:16, background:'#1d233a', padding:12, borderRadius:12, color:'#cfd8ff' }}>
        <div style={{ fontWeight:700, marginBottom:8 }}>Raw response (for debugging)</div>
        <pre style={{ margin:0, whiteSpace:'pre-wrap' }}>{raw}</pre>
      </div>
    </div>
  );
}
