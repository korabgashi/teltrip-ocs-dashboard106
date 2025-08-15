
"use client";
export default function Error({ error, reset }){
  return (
    <div style={{ marginTop:16, padding:12, borderRadius:12, background:'#3a2030', color:'#ffd4d4', whiteSpace:'pre-wrap' }}>
      <strong>Dashboard error:</strong> {String(error?.message || error)}
      <div><button onClick={()=>reset()} style={{ marginTop:10, padding:'8px 12px', border:0, borderRadius:8, background:'#4b74ff', color:'#fff' }}>Retry</button></div>
    </div>
  );
}
