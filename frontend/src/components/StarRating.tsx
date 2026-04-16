// @ts-nocheck
import { useState } from "react";

export function StarDisplay({ average, total, size = "sm" }) {
  if (total === 0) return <span style={{ color:"var(--muted2)", fontSize:11 }}>No ratings yet</span>;
  const starSize = size === "sm" ? 13 : 20;
  const filled   = Math.round(average);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:4 }}>
      <div style={{ display:"flex", gap:1 }}>
        {[1,2,3,4,5].map(s => (
          <span key={s} style={{ fontSize:starSize, color: s<=filled ? "var(--warning)" : "var(--border)", lineHeight:1 }}>★</span>
        ))}
      </div>
      <span style={{ color:"var(--warning)", fontWeight:700, fontSize: size==="sm" ? 12 : 16 }}>{average.toFixed(1)}</span>
      <span style={{ color:"var(--muted2)", fontSize:11 }}>({total})</span>
    </div>
  );
}

export function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display:"flex", gap:6 }}>
      {[1,2,3,4,5].map(star => (
        <button key={star} type="button" onClick={()=>onChange(star)} onMouseEnter={()=>setHovered(star)} onMouseLeave={()=>setHovered(0)}
          style={{ background:"none", border:"none", cursor:"pointer", fontSize:28, color: star<=(hovered||value) ? "var(--warning)" : "var(--border)", transition:"color 0.15s" }}>
          ★
        </button>
      ))}
    </div>
  );
}