// @ts-nocheck
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@apollo/client/react";
import { SIGNUP_MUTATION } from "../graphql/mutations";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { isPasswordValid } from "../lib/passwordStrength";

export default function Signup() {
  const navigate = useNavigate();
  const [name,       setName]       = useState("");
  const [email,      setEmail]      = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [pass,       setPass]       = useState("");
  const [showPw,     setShowPw]     = useState(false);

  const [signupMutation, { loading, error }] = useMutation(SIGNUP_MUTATION);

  const handleSignup = async () => {
    if (!name.trim())   { alert("Enter your name"); return; }
    if (!email.match(/^\d{2}[a-z]{2}\d{2}@psgtech\.ac\.in$/i)) { alert("Enter a valid PSG Tech email e.g. 23pc21@psgtech.ac.in"); return; }
    if (!rollNumber.match(/^\d{2}[a-z]{2}\d{2}$/i)) { alert("Enter valid roll number e.g. 23pc21"); return; }
    if (!isPasswordValid(pass)) { alert("Please meet all password requirements first"); return; }

    try {
      const { data } = await signupMutation({
        variables: { input: { name, email: email.toLowerCase(), password: pass, rollNumber: rollNumber.toLowerCase() } },
      });
      // ── After signup backend sends OTP → navigate to verify page ──────────
      if (data?.signup?.needsVerification) {
        navigate("/verify-email", { state: { email: email.toLowerCase() } });
      }
    } catch (err) {
      alert(err.message ?? "Signup failed. Please try again.");
    }
  };

  const Label = ({ children }) => (
    <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:"var(--muted)", textTransform:"uppercase", display:"block", marginBottom:8 }}>
      {children}
    </label>
  );

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24 }}>

      <div style={{ textAlign:"center", marginBottom:32 }}>
        <h1 style={{ fontFamily:"var(--font-head)", fontSize:44, color:"var(--white)", letterSpacing:3 }}>CREATE ACCOUNT</h1>
        <p style={{ color:"var(--muted)", fontSize:13, marginTop:4 }}>PSG Tech students only</p>
      </div>

      <div className="card" style={{ width:"100%", maxWidth:420, padding:28 }}>

        {error && (
          <div style={{ background:"rgba(0,196,140,0.1)", border:"1px solid var(--accent)", borderRadius:12, padding:"10px 14px", marginBottom:20, fontSize:13, color:"var(--accent2)", textAlign:"center" }}>
            {error.message}
          </div>
        )}

        <div style={{ marginBottom:14 }}><Label>Full Name</Label>
          <input className="inp" type="text" placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)} />
        </div>

        <div style={{ marginBottom:14 }}><Label>PSG Email</Label>
          <input className="inp" type="email" placeholder="23pc21@psgtech.ac.in" value={email} onChange={e=>setEmail(e.target.value)} />
        </div>

        <div style={{ marginBottom:14 }}><Label>Roll Number</Label>
          <input className="inp" type="text" placeholder="e.g. 23pc21" value={rollNumber} onChange={e=>setRollNumber(e.target.value)} />
        </div>

        <div style={{ marginBottom:8 }}><Label>Password</Label>
          <div style={{ position:"relative" }}>
            <input className="inp" type={showPw?"text":"password"} placeholder="Create a strong password" value={pass} onChange={e=>setPass(e.target.value)} style={{ paddingRight:60 }} />
            <button onClick={()=>setShowPw(!showPw)} style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"var(--muted)", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)" }}>
              {showPw?"HIDE":"SHOW"}
            </button>
          </div>
          <PasswordStrengthMeter password={pass} />
        </div>

        <button className="btn-accent" onClick={handleSignup} disabled={loading} style={{ width:"100%", padding:15, fontSize:14, fontWeight:700, letterSpacing:1, marginTop:20, marginBottom:16 }}>
          {loading?"CREATING ACCOUNT...":"CREATE ACCOUNT"}
        </button>

        <p style={{ textAlign:"center", color:"var(--muted)", fontSize:13 }}>
          Already have an account?{" "}
          <button onClick={()=>navigate("/")} style={{ background:"none", border:"none", color:"var(--accent)", fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)", fontSize:13 }}>
            Sign in →
          </button>
        </p>
      </div>
    </div>
  );
}