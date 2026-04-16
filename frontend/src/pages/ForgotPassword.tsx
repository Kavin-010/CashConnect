// @ts-nocheck
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step,    setStep]   = useState("email");
  const [email,   setEmail]  = useState("");
  const [code,    setCode]   = useState("");
  const [newPass, setNewPass]= useState("");
  const { forgotPassword, resetPassword, loading } = useAuth();

  const handleSendCode = async () => {
    if (!email) { alert("Enter your email"); return; }
    try { await forgotPassword(email); setStep("reset"); }
    catch (err) { alert(err.message ?? "Failed to send code"); }
  };

  const handleReset = async () => {
    if (!code || !newPass) { alert("Fill all fields"); return; }
    try { await resetPassword(email, code, newPass); alert("Password updated!"); navigate("/"); }
    catch (err) { alert(err.message ?? "Reset failed"); }
  };

  const Label = ({ children }) => (
    <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:"var(--muted)", textTransform:"uppercase", display:"block", marginBottom:8 }}>{children}</label>
  );

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>

      <div style={{ textAlign:"center", marginBottom:32 }}>
        <h1 style={{ fontFamily:"var(--font-head)", fontSize:44, letterSpacing:3, color:"var(--white)" }}>RESET PASSWORD</h1>
        <p style={{ color:"var(--muted)", fontSize:13, marginTop:4 }}>
          Step {step==="email"?"1":"2"} of 2
        </p>
      </div>

      <div className="card" style={{ width:"100%", maxWidth:400, padding:28 }}>

        {step==="email" && (<>
          <div style={{ marginBottom:20 }}><Label>PSG Email</Label>
            <input className="inp" type="email" placeholder="23pc21@psgtech.ac.in" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <button className="btn-accent" onClick={handleSendCode} disabled={loading} style={{ width:"100%", padding:15, fontSize:14, fontWeight:700, letterSpacing:1, marginBottom:16 }}>
            {loading?"SENDING...":"SEND CODE"}
          </button>
        </>)}

        {step==="reset" && (<>
          <div style={{ background:"rgba(0,196,140,0.1)", border:"1px solid var(--accent)", borderRadius:12, padding:"10px 14px", marginBottom:20, fontSize:13, color:"var(--accent)", textAlign:"center" }}>
            ✓ Code sent to {email}
          </div>
          <div style={{ marginBottom:14 }}><Label>Verification Code</Label>
            <input className="inp" type="text" inputMode="numeric" placeholder="6-digit code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} style={{ textAlign:"center", fontSize:22, letterSpacing:"0.3em" }} />
          </div>
          <div style={{ marginBottom:20 }}><Label>New Password</Label>
            <input className="inp" type="password" placeholder="Min 8 chars" value={newPass} onChange={e=>setNewPass(e.target.value)} />
          </div>
          <button className="btn-accent" onClick={handleReset} disabled={loading} style={{ width:"100%", padding:15, fontSize:14, fontWeight:700, letterSpacing:1, marginBottom:16 }}>
            {loading?"UPDATING...":"UPDATE PASSWORD"}
          </button>
        </>)}

        <div style={{ textAlign:"center" }}>
          <button onClick={()=>navigate("/")} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:13, cursor:"pointer", fontFamily:"var(--font-body)" }}>
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
}