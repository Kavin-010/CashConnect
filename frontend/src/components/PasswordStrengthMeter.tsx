// @ts-nocheck
import { checkPasswordStrength } from "../lib/passwordStrength";

export default function PasswordStrengthMeter({ password }) {
  if (!password) return null;
  const { score, label, requirements } = checkPasswordStrength(password);
  const total    = requirements.length;
  const pct      = (score / total) * 100;
  const barColor = score <= 1 ? "#ff4444" : score === 2 ? "#ff8800" : score === 3 ? "#ffb800" : "#00c48c";

  return (
    <div style={{ marginTop:10 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
        <div style={{ flex:1, height:3, background:"var(--border)", borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:barColor, borderRadius:2, transition:"width 0.3s, background 0.3s" }} />
        </div>
        {label && (
          <span style={{ fontSize:10, fontWeight:700, color:barColor, letterSpacing:0.5, textTransform:"uppercase", minWidth:72, textAlign:"right" }}>
            {label}
          </span>
        )}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {requirements.map(req => (
          <div key={req.label} style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:12, color: req.met ? "var(--success)" : "var(--muted2)", lineHeight:1 }}>
              {req.met ? "✓" : "○"}
            </span>
            <span style={{ fontSize:12, color: req.met ? "var(--success)" : "var(--muted2)" }}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}