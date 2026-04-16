// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { ME_QUERY } from "../graphql/queries";
import { UPDATE_PROFILE_MUTATION, CHANGE_PASSWORD_MUTATION } from "../graphql/mutations";
import PasswordStrengthMeter from "../components/PasswordStrengthMeter";
import { isPasswordValid } from "../lib/passwordStrength";

const DEPARTMENTS = [
  "AMCS","Computer Science","Information Technology","Electronics & Communication",
  "Electrical & Electronics","Mechanical","Civil","Biotechnology",
  "Chemical","Textile","Fashion Technology",
];

export default function Profile() {
  const navigate = useNavigate();
  const [tab,   setTab]   = useState("profile");
  const [saved, setSaved] = useState(false);

  const { data, loading, refetch } = useQuery(ME_QUERY, {
    fetchPolicy: "network-only",
  });
  useEffect(() => { refetch(); }, []);

  const user = data?.me;

  const [name,       setName]       = useState(user?.name       ?? "");
  const [department, setDepartment] = useState(user?.department ?? "");
  const [year,       setYear]       = useState(user?.year?.toString() ?? "");
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [showCur,    setShowCur]    = useState(false);
  const [showNew,    setShowNew]    = useState(false);

  const [updateMutation,  { loading: updateLoading   }] = useMutation(UPDATE_PROFILE_MUTATION, { refetchQueries:[{ query: ME_QUERY }] });
  const [changePwMutation,{ loading: changePwLoading }] = useMutation(CHANGE_PASSWORD_MUTATION);

  const handleSave = async () => {
    if (!name.trim()) { alert("Name cannot be empty"); return; }
    try {
      await updateMutation({ variables: { input: { name:name.trim(), department:department||undefined, year:year?Number(year):undefined } } });
      setSaved(true); setTimeout(()=>setSaved(false), 3000);
    } catch (err) { alert(err.message ?? "Failed to update"); }
  };

  const handleChangePw = async () => {
    if (!currentPw)              { alert("Enter current password"); return; }
    if (!isPasswordValid(newPw)) { alert("New password doesn't meet all requirements"); return; }
    if (newPw !== confirmPw)     { alert("Passwords do not match"); return; }
    try {
      await changePwMutation({ variables: { currentPassword:currentPw, newPassword:newPw } });
      alert("Password changed!"); setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) { alert(err.message ?? "Failed to change password"); }
  };

  if (loading) return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center" }}>
      <p style={{ color:"var(--muted)" }}>Loading...</p>
    </div>
  );

  const Label = ({ children }) => (
    <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:"var(--muted)", textTransform:"uppercase", display:"block", marginBottom:8 }}>{children}</label>
  );

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", maxWidth:480, margin:"0 auto", padding:"20px 20px 80px" }}>

      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
        <button onClick={()=>navigate("/dashboard")} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:22 }}>←</button>
        <h1 style={{ fontFamily:"var(--font-head)", fontSize:30, letterSpacing:1, color:"var(--white)" }}>PROFILE</h1>
      </div>

      {/* Avatar card */}
      <div className="card" style={{ padding:20, display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
        <div style={{ width:66, height:66, borderRadius:"50%", background:"var(--accentdim)", border:"2px solid var(--accent)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-head)", fontSize:34, color:"var(--accent)", flexShrink:0 }}>
          {(user?.name??"?").charAt(0).toUpperCase()}
        </div>
        <div>
          <p style={{ fontFamily:"var(--font-head)", fontSize:22, color:"var(--white)", letterSpacing:1 }}>{user?.name?.toUpperCase()}</p>
          <p style={{ color:"var(--muted)", fontSize:13, marginTop:2 }}>{user?.email}</p>
          <p style={{ color:"var(--muted2)", fontSize:11, marginTop:2 }}>Roll: {user?.rollNumber?.toUpperCase()}</p>
          {/* ✅ Always show verified — no more NOT VERIFIED badge or VERIFY button */}
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:6 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"var(--success)" }} />
            <span style={{ fontSize:11, color:"var(--success)", fontWeight:700, letterSpacing:0.3 }}>
              EMAIL VERIFIED
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:20 }}>
        {[["profile","EDIT PROFILE"],["password","CHANGE PASSWORD"]].map(([t,label]) => (
          <button key={t} onClick={()=>setTab(t)} className={tab===t?"btn-accent":"btn-ghost"} style={{ flex:1, padding:"11px 8px", fontSize:11, fontWeight:700, letterSpacing:0.5 }}>
            {label}
          </button>
        ))}
      </div>

      {/* Edit Profile */}
      {tab==="profile" && (
        <div className="card" style={{ padding:20 }}>
          <div style={{ marginBottom:14 }}><Label>Full Name</Label>
            <input className="inp" type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" />
          </div>
          <div style={{ marginBottom:14 }}><Label>Email (cannot be changed)</Label>
            <input className="inp" type="email" value={user?.email??""} disabled style={{ opacity:0.4, cursor:"not-allowed" }} />
          </div>
          <div style={{ marginBottom:14 }}><Label>Roll Number (cannot be changed)</Label>
            <input className="inp" type="text" value={user?.rollNumber?.toUpperCase()??""} disabled style={{ opacity:0.4, cursor:"not-allowed" }} />
          </div>
          <div style={{ marginBottom:14 }}><Label>Department</Label>
            <select className="inp" value={department} onChange={e=>setDepartment(e.target.value)}>
              <option value="">Select department</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:20 }}><Label>Year</Label>
            <select className="inp" value={year} onChange={e=>setYear(e.target.value)}>
              <option value="">Select year</option>
              {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <button className="btn-accent" onClick={handleSave} disabled={updateLoading} style={{ flex:1, padding:14, fontSize:13, fontWeight:700, letterSpacing:0.5 }}>
              {updateLoading?"SAVING...":"SAVE CHANGES"}
            </button>
            {saved && <p style={{ color:"var(--success)", fontSize:12, fontWeight:700 }}>✓ SAVED</p>}
          </div>
        </div>
      )}

      {/* Change Password */}
      {tab==="password" && (
        <div className="card" style={{ padding:20 }}>
          <div style={{ marginBottom:14 }}><Label>Current Password</Label>
            <div style={{ position:"relative" }}>
              <input className="inp" type={showCur?"text":"password"} value={currentPw} onChange={e=>setCurrentPw(e.target.value)} placeholder="Enter current password" style={{ paddingRight:60 }} />
              <button onClick={()=>setShowCur(!showCur)} style={{ position:"absolute", right:16, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", color:"var(--muted)", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)" }}>
                {showCur?"HIDE":"SHOW"}
              </button>
            </div>
          </div>
          <div style={{ marginBottom:8 }}><Label>New Password</Label>
            <div style={{ position:"relative" }}>
              <input className="inp" type={showNew?"text":"password"} value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="Create strong password" style={{ paddingRight:60 }} />
              <button onClick={()=>setShowNew(!showNew)} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"var(--font-body)", position:"absolute", right:16, top:"50%", transform:"translateY(-50%)" }}>
                {showNew?"HIDE":"SHOW"}
              </button>
            </div>
            <PasswordStrengthMeter password={newPw} />
          </div>
          <div style={{ marginBottom:20 }}><Label>Confirm New Password</Label>
            <input className="inp" type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} placeholder="Re-enter new password" />
            {confirmPw && (
              <p style={{ fontSize:12, marginTop:6, color: newPw===confirmPw ? "var(--success)" : "var(--danger)", fontWeight:600 }}>
                {newPw===confirmPw ? "✓ Passwords match" : "✗ Do not match"}
              </p>
            )}
          </div>
          <button className="btn-accent" onClick={handleChangePw} disabled={changePwLoading} style={{ width:"100%", padding:14, fontSize:13, fontWeight:700, letterSpacing:0.5 }}>
            {changePwLoading?"CHANGING...":"CHANGE PASSWORD"}
          </button>
        </div>
      )}
    </div>
  );
}