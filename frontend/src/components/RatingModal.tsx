// @ts-nocheck
import { useState } from "react";
import { useMutation } from "@apollo/client/react";
import { SUBMIT_RATING_MUTATION } from "../graphql/mutations";
import { MY_REQUESTS_QUERY } from "../graphql/queries";

const LABELS = { 1:"Poor", 2:"Fair", 3:"Good", 4:"Very Good", 5:"Excellent!" };

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div style={{ display:"flex", gap:8, justifyContent:"center" }}>
      {[1,2,3,4,5].map(star => (
        <button key={star} type="button" onClick={()=>onChange(star)} onMouseEnter={()=>setHovered(star)} onMouseLeave={()=>setHovered(0)}
          style={{ background:"none", border:"none", cursor:"pointer", fontSize:38, color: star<=(hovered||value) ? "var(--warning)" : "var(--border)", transition:"color 0.15s, transform 0.1s", transform: star===(hovered||value) ? "scale(1.2)" : "scale(1)" }}>
          ★
        </button>
      ))}
    </div>
  );
}

export default function RatingModal({ requestId, ratedUser, onClose, onSuccess }) {
  const [stars,   setStars]   = useState(0);
  const [comment, setComment] = useState("");

  const [submitRating, { loading }] = useMutation(SUBMIT_RATING_MUTATION, {
    refetchQueries: [{ query: MY_REQUESTS_QUERY }],
  });

  const handleSubmit = async () => {
    if (!stars) { alert("Select a star rating"); return; }
    try {
      await submitRating({ variables: { input: { requestId, stars, comment: comment.trim()||undefined } } });
      onSuccess(); onClose();
    } catch (err) { alert(err.message ?? "Failed to submit rating"); }
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.9)", zIndex:200, display:"flex", alignItems:"flex-end", justifyContent:"center", padding:16 }}
      onClick={e => e.target===e.currentTarget && onClose()}>

      <div className="card" style={{ width:"100%", maxWidth:420, padding:28, borderRadius:24, border:"1px solid var(--border)" }}>
        <div style={{ width:36, height:4, background:"var(--border)", borderRadius:2, margin:"0 auto 20px" }} />

        <p style={{ fontFamily:"var(--font-head)", fontSize:24, letterSpacing:1, color:"var(--white)", textAlign:"center", marginBottom:4 }}>
          RATE {ratedUser.toUpperCase()}
        </p>
        <p style={{ color:"var(--muted)", fontSize:13, textAlign:"center", marginBottom:20 }}>How was your experience?</p>

        <StarPicker value={stars} onChange={setStars} />

        <p style={{ textAlign:"center", height:20, margin:"8px 0 16px", fontWeight:700, fontSize:13, color:"var(--warning)", letterSpacing:0.5 }}>
          {LABELS[stars] ?? ""}
        </p>

        <textarea
          value={comment}
          onChange={e=>setComment(e.target.value)}
          placeholder="Leave a comment (optional)"
          maxLength={300}
          rows={3}
          style={{ background:"var(--card2)", border:"1.5px solid var(--border)", borderRadius:14, color:"var(--white)", fontFamily:"var(--font-body)", fontSize:14, padding:"12px 16px", width:"100%", outline:"none", resize:"none", marginBottom:20 }}
        />

        <div style={{ display:"flex", gap:10 }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex:1, padding:14, fontSize:12, fontWeight:700 }}>SKIP</button>
          <button className="btn-accent" onClick={handleSubmit} disabled={loading||!stars} style={{ flex:2, padding:14, fontSize:12, fontWeight:700, letterSpacing:0.5 }}>
            {loading?"SUBMITTING...":"SUBMIT RATING"}
          </button>
        </div>
      </div>
    </div>
  );
}