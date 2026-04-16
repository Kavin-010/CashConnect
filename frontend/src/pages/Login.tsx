// @ts-nocheck
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { LOGIN_MUTATION } from "../graphql/mutations";
import { saveToken } from "../lib/apolloClient";

export default function Login() {
  const navigate = useNavigate();
  const [email,  setEmail]  = useState("");
  const [pass,   setPass]   = useState("");
  const [showPw, setShowPw] = useState(false);

  const [loginMutation, { loading, error }] = useMutation(LOGIN_MUTATION);

  const handleLogin = async () => {
    const regex = /^[0-9]{2}[a-z]{2}[0-9]{2}@psgtech\.ac\.in$/i;
    if (!regex.test(email)) { alert("Enter a valid PSG Tech email"); return; }
    if (!pass)               { alert("Enter your password"); return; }
    try {
      const { data } = await loginMutation({
        variables: { input: { email: email.toLowerCase(), password: pass } },
      });
      if (data?.login?.token) {
        saveToken(data.login.token);
        navigate("/dashboard");
      }
    } catch (err) {
      if (err.message === "EMAIL_NOT_VERIFIED") {
        navigate("/verify-email", { state: { email: email.toLowerCase() } });
      }
    }
  };

  const isLocked = error?.message?.includes("locked");

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>

      <div style={{ textAlign:"center", marginBottom:40 }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, marginBottom:10 }}>
          <div style={{ width:8, height:8, borderRadius:"50%", background:"var(--accent)" }} />
          <span style={{ fontFamily:"var(--font-head)", fontSize:12, letterSpacing:4, color:"var(--muted)", textTransform:"uppercase" }}>PSG Tech</span>
        </div>
        <h1 style={{ fontFamily:"var(--font-head)", fontSize:56, lineHeight:0.95, color:"var(--white)", letterSpacing:3 }}>CAMPUS</h1>
        <h1 style={{ fontFamily:"var(--font-head)", fontSize:56, lineHeight:0.95, color:"var(--accent)", letterSpacing:3 }}>CASH</h1>
        <p style={{ color:"var(--muted)", fontSize:13, marginTop:10 }}>Campus cash sharing, made simple</p>
      </div>

      <div className="card" style={{ width:"100%", maxWidth:400, padding:28 }}>

        {error && !error.message.includes("EMAIL_NOT_VERIFIED") && (
          <div style={{ background: isLocked ? "rgba(255,68,68,0.1)" : "rgba(0,196,140,0.1)", border:`1px solid ${isLocked ? "var(--danger)" : "var(--accent)"}`, borderRadius:12, padding:"10px 14px", marginBottom:20, fontSize:13, color: isLocked ? "var(--danger)" : "var(--accent2)", textAlign:"center" }}>
            {isLocked && "🔒 "}{error.message}
          </div>
        )}

        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:"var(--muted)", textTransform:"uppercase", display:"block", marginBottom:8 }}>PSG Email</label>
          <input className="inp" type="email" placeholder="23pc21@psgtech.ac.in" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div style={{ marginBottom:24 }}>
          <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:"var(--muted)", textTransform:"uppercase", display:"block", marginBottom:8 }}>Password</label>
          <div style={{ position:"relative" }}>
            <input className="inp" type={showPw?"text":"password"} placeholder="Enter password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{ paddingRight:60 }} />
            <button onClick={()=>setShowPw(!showPw)} style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"var(--muted)", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)" }}>
              {showPw?"HIDE":"SHOW"}
            </button>
          </div>
        </div>

        <button className="btn-accent" onClick={handleLogin} disabled={loading||isLocked} style={{ width:"100%", padding:15, fontSize:14, fontWeight:700, letterSpacing:1, marginBottom:16 }}>
          {loading?"SIGNING IN...":isLocked?"ACCOUNT LOCKED":"SIGN IN"}
        </button>

        <div style={{ display:"flex", justifyContent:"space-between" }}>
          <button onClick={()=>navigate("/forgot-password")} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:13, cursor:"pointer", fontFamily:"var(--font-body)" }}>
            Forgot password?
          </button>
          <button onClick={()=>navigate("/signup")} style={{ background:"none", border:"none", color:"var(--accent)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)" }}>
            Create account →
          </button>
        </div>
      </div>
    </div>
  );
}