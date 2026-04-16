// @ts-nocheck
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation, useApolloClient } from "@apollo/client/react";
import { VERIFY_EMAIL_MUTATION, RESEND_VERIFICATION_MUTATION } from "../graphql/mutations";
import { saveToken } from "../lib/apolloClient";
import { ME_QUERY } from "../graphql/queries";

export default function VerifyEmail() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const email     = location.state?.email ?? "";
  const [code,   setCode]   = useState("");
  const [resent, setResent] = useState(false);

  const client = useApolloClient();
  const [verifyMutation, { loading: vLoading, error: vError }] = useMutation(VERIFY_EMAIL_MUTATION);
  const [resendMutation, { loading: rLoading }]                 = useMutation(RESEND_VERIFICATION_MUTATION);

  if (!email) { navigate("/"); return null; }

  const handleVerify = async () => {
    if (code.length !== 6) { alert("Enter the 6-digit code"); return; }
    try {
      const { data } = await verifyMutation({ variables: { email, code } });
      if (data?.verifyEmail?.token) {
        saveToken(data.verifyEmail.token);
        await client.refetchQueries({ include: ["Me"] }); // ✅ refresh verified status
        navigate("/dashboard");
      }
    } catch (err) { alert(err.message ?? "Verification failed. Check the code and try again."); }
  };

  const handleResend = async () => {
    try {
      await resendMutation({ variables: { email } });
      setResent(true); setCode("");
      setTimeout(() => setResent(false), 5000);
    } catch (err) { alert(err.message ?? "Failed to resend"); }
  };

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>

      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ fontSize:60, marginBottom:12 }}>📬</div>
        <h1 style={{ fontFamily:"var(--font-head)", fontSize:44, letterSpacing:3, color:"var(--white)" }}>VERIFY EMAIL</h1>
        <p style={{ color:"var(--muted)", fontSize:14, marginTop:8 }}>Code sent to</p>
        <p style={{ color:"var(--accent)", fontWeight:700, fontSize:14, marginTop:4 }}>{email}</p>
        <p style={{ color:"var(--muted2)", fontSize:12, marginTop:4 }}>Check your inbox and spam folder</p>
      </div>

      <div className="card" style={{ width:"100%", maxWidth:380, padding:28 }}>

        {vError && (
          <div style={{ background:"rgba(255,68,68,0.1)", border:"1px solid var(--danger)", borderRadius:12, padding:"10px 14px", marginBottom:20, fontSize:13, color:"var(--danger)", textAlign:"center" }}>
            {vError.message}
          </div>
        )}

        {resent && (
          <div style={{ background:"rgba(0,196,140,0.1)", border:"1px solid var(--accent)", borderRadius:12, padding:"10px 14px", marginBottom:20, fontSize:13, color:"var(--accent)", textAlign:"center" }}>
            ✓ New verification code sent!
          </div>
        )}

        <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:"var(--muted)", textTransform:"uppercase", display:"block", marginBottom:10 }}>6-Digit Code</label>
        <input
          className="inp"
          type="text"
          inputMode="numeric"
          placeholder="000000"
          value={code}
          onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))}
          onKeyDown={e=>e.key==="Enter"&&handleVerify()}
          autoFocus
          style={{ textAlign:"center", fontSize:30, fontWeight:700, letterSpacing:"0.4em", marginBottom:20 }}
        />

        <button className="btn-accent" onClick={handleVerify} disabled={vLoading||code.length!==6} style={{ width:"100%", padding:15, fontSize:14, fontWeight:700, letterSpacing:1, marginBottom:16 }}>
          {vLoading?"VERIFYING...":"VERIFY & CONTINUE"}
        </button>

        <div style={{ textAlign:"center", marginBottom:12 }}>
          <button onClick={handleResend} disabled={rLoading||resent} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:13, cursor:"pointer", fontFamily:"var(--font-body)" }}>
            {rLoading?"Sending...":"Didn't receive it? Resend code"}
          </button>
        </div>

        <div style={{ textAlign:"center" }}>
          <button onClick={()=>navigate("/")} style={{ background:"none", border:"none", color:"var(--muted2)", fontSize:12, cursor:"pointer", fontFamily:"var(--font-body)" }}>
            ← Back to login
          </button>
        </div>
      </div>
    </div>
  );
}