"use client";
import { useEffect, useMemo, useState } from "react";

/* ---------------- helpers ---------------- */
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
const a = (v) => Array.isArray(v) ? v : [];
const s = (v) => (v === null || v === undefined) ? "" : String(v);

function getICCID(sub) {
  const list = a(sub?.imsiList);
  if (!list.length) return "";
  return s(list[0]?.iccid);
}

function formatStatus(statusArray) {
  const arr = a(statusArray);
  if (!arr.length) return "";
  // Prefer the current one (no endDate); fall back to latest by startDate.
  const current = arr.find(x => !x?.endDate)
    || arr.slice().sort((a,b)=>s(b?.startDate).localeCompare(s(a?.startDate)))[0];
  const currentLabel = s(current?.status);
  // Also show history compact if there are multiple distinct labels.
  const distinct = Array.from(new Set(arr.map(x => s(x?.status)).filter(Boolean)));
  return distinct.length > 1 ? `${currentLabel} (${distinct.join(" / ")})` : currentLabel;
}

function formatPackages(sub) {
  // We don’t fetch packages in this route, but some OCS responses include them inline.
  // Handle several common shapes: packages[], package[], subscriberPrepaidPackages[]
  const candidates =
    a(sub?.packages) ||
    a(sub?.package) ||
    a(sub?.subscriberPrepaidPackages) ||
    [];

  const names = candidates.map(p =>
    p?.packageTemplate?.prepaidpackagetemplatename
    || p?.prepaidpackagetemplatename
    || p?.templateName
    || p?.name
    || ""
  ).filter(Boolean);

  return names.join(" / ");
}

function cleanDate(v) {
  // Shows ISOish strings as-is; avoids "[object Object]"
  return typeof v === "string" ? v : (v ? String(v) : "");
}

/* ---------------- page ---------------- */
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
    const active = rows.filter(r => formatStatus(r?.status).toUpperCase().includes("ACTIVE")).length;
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
        <div style={{ minWidth: 1100 }}>
          {/* header */}
          <div style={{ display:'grid', gridTemplateColumns:'1.2fr 2fr 1.4fr 2fr 1.8fr 1.8fr', gap:0, fontWeight:600, borderBottom:'1px solid #2a3356', padding:12 }}>
            <div>Subscriber ID</div>
            <div>ICCID</div>
            <div>Status</div>
            <div>Package</div>
            <div>Activated</div>
            <div>Expires</div>
          </div>
          {/* rows */}
          {<div style={{
  display: 'grid',
  gridTemplateColumns: '1fr 2fr 1.5fr 2fr 1.5fr 1.5fr 1.5fr 1.5fr 1.5fr 1.2fr',
  gap: '12px',
  padding: '12px 0',
  fontWeight: 'bold',
  color: '#aab4f9',
  borderBottom: '2px solid #2a3356'
}}>
  <div>ID</div>
  <div>ICCID</div>
  <div>Status</div>
  <div>Package</div>
  <div>Activated</div>
  <div>Expires</div>
  <div>Subscr. €</div>
  <div>Reseller €</div>
  <div>Profit €</div>
  <div>Margin</div>
</div>

{rows.map((r, i) => (
  <div key={i} style={{
    display: 'grid',
    gridTemplateColumns: '1fr 2fr 1.5fr 2fr 1.5fr 1.5fr 1.5fr 1.5fr 1.5fr 1.2fr',
    gap: '12px',
    borderBottom: '1px solid #2a3356',
    padding: '12px 0',
    fontSize: 14
  }}>
    <div>{s(r?.subscriberId)}</div>
    <div style={{ fontFamily: 'monospace' }}>{getICCID(r)}</div>
    <div>{formatStatus(r?.status)}</div>
    <div>{formatPackages(r)}</div>
    <div>{cleanDate(r?.activationDate || r?.tsactivationutc)}</div>
    <div>{cleanDate(r?.expiryDate || r?.tsexpirationutc)}</div>
    <div>{euro(r?.subscriberCost)}</div>
    <div>{euro(r?.resellerCostWeeklyTotal)}</div>
    <div>{euro(r?.profit)}</div>
    <div>{r?.margin?.toFixed(1)}%</div>
  </div>
))}

{!loading && !error && rows.length === 0 && <div style={{ padding: 16, opacity: 0.8 }}>No data.</div>}
{loading && <div style={{ padding: 16 }}>Loading…</div>}}
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
