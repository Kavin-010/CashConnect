// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { MY_REQUESTS_QUERY, MY_RATING_FOR_REQUEST_QUERY } from "../graphql/queries";
import { COMPLETE_REQUEST_MUTATION, CANCEL_REQUEST_MUTATION } from "../graphql/mutations";
import RatingModal from "../components/RatingModal";

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", hour12:true });
}

const STATUS_STYLE = {
  OPEN:      { bg:"rgba(0,196,140,0.12)",  color:"#00c48c" },
  ACCEPTED:  { bg:"rgba(0,196,140,0.25)",  color:"#00e6a5" },
  COMPLETED: { bg:"rgba(100,100,100,0.15)",color:"#777" },
  CANCELLED: { bg:"rgba(255,68,68,0.12)",  color:"#ff4444" },
  EXPIRED:   { bg:"rgba(255,184,0,0.12)",  color:"#ffb800" },
};

function RequestCard({ req, navigate, onComplete, onCancel, onRate }) {
  const { data: ratingData } = useQuery(MY_RATING_FOR_REQUEST_QUERY, {
    variables: { requestId: req.id },
    skip: req.status !== "COMPLETED",
  });
  const alreadyRated = !!ratingData?.myRatingForRequest;
  const s = STATUS_STYLE[req.status] ?? STATUS_STYLE.COMPLETED;

  return (
    <div className="card" style={{ padding:20, marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
            <span style={{ fontFamily:"var(--font-head)", fontSize:30, color:"var(--white)" }}>₹{req.amount}</span>
            <span style={{ background:s.bg, color:s.color, fontSize:10, fontWeight:700, padding:"3px 10px", borderRadius:50, letterSpacing:0.5, textTransform:"uppercase" }}>
              {req.status}
            </span>
          </div>
          <p style={{ color:"var(--muted)", fontSize:13, marginBottom:4 }}>{req.reason}</p>
          {req.location && <p style={{ color:"var(--accent2)", fontSize:12, marginBottom:4 }}>📍 {req.location}</p>}
          <p style={{ color:"var(--muted2)", fontSize:11 }}>{formatDate(req.createdAt)}</p>
          {req.acceptor && (
            <p style={{ color:"var(--success)", fontSize:12, marginTop:6, fontWeight:600 }}>
              {req.status==="COMPLETED" ? "✓ Completed with" : "Accepted by"} {req.acceptor.name}
            </p>
          )}
          {req.status==="COMPLETED" && alreadyRated && (
            <p style={{ color:"var(--warning)", fontSize:11, marginTop:4 }}>
              ★ You rated {ratingData.myRatingForRequest.stars}/5
            </p>
          )}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8, marginLeft:12 }}>
          {req.status==="ACCEPTED" && req.chatRoom && (
            <button className="btn-accent" onClick={()=>navigate(`/chat/${req.id}`)} style={{ padding:"8px 14px", fontSize:11, fontWeight:700, letterSpacing:0.5 }}>
              CHAT
            </button>
          )}
          {req.status==="ACCEPTED" && (
            <button onClick={()=>onComplete(req)} style={{ background:"rgba(0,196,140,0.12)", border:"1px solid var(--success)", borderRadius:50, padding:"8px 14px", fontSize:11, fontWeight:700, color:"var(--success)", cursor:"pointer", fontFamily:"var(--font-body)", letterSpacing:0.5 }}>
              DONE ✓
            </button>
          )}
          {req.status==="COMPLETED" && req.acceptor && !alreadyRated && (
            <button onClick={()=>onRate(req.id, req.acceptor.name)} style={{ background:"rgba(255,184,0,0.12)", border:"1px solid var(--warning)", borderRadius:50, padding:"8px 14px", fontSize:11, fontWeight:700, color:"var(--warning)", cursor:"pointer", fontFamily:"var(--font-body)", letterSpacing:0.5 }}>
              ★ RATE
            </button>
          )}
          {["OPEN","ACCEPTED"].includes(req.status) && (
            <button onClick={()=>onCancel(req.id)} style={{ background:"rgba(255,68,68,0.1)", border:"1px solid var(--danger)", borderRadius:50, padding:"8px 14px", fontSize:11, fontWeight:700, color:"var(--danger)", cursor:"pointer", fontFamily:"var(--font-body)", letterSpacing:0.5 }}>
              CANCEL
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RequestHistory() {
  const navigate = useNavigate();
  const [ratingModal, setRatingModal] = useState(null);

  const { data, loading, error, refetch } = useQuery(MY_REQUESTS_QUERY, { fetchPolicy:"network-only" });
  const [completeMutation] = useMutation(COMPLETE_REQUEST_MUTATION, { refetchQueries: [{ query: MY_REQUESTS_QUERY }] });
  const [cancelMutation]   = useMutation(CANCEL_REQUEST_MUTATION,   { refetchQueries: [{ query: MY_REQUESTS_QUERY }] });

  const handleComplete = async (req) => {
    if (!confirm("Mark as completed?")) return;
    try {
      await completeMutation({ variables: { requestId: req.id } });
      if (req.acceptor) setTimeout(() => setRatingModal({ requestId: req.id, ratedUser: req.acceptor.name }), 500);
    } catch (err) { alert(err.message ?? "Failed"); }
  };

  const handleCancel = async (requestId) => {
    if (!confirm("Cancel this request?")) return;
    try { await cancelMutation({ variables: { requestId } }); }
    catch (err) { alert(err.message ?? "Failed"); }
  };

  const allRequests     = data?.myRequests ?? [];
  const activeRequests  = allRequests.filter(r => ["OPEN","ACCEPTED"].includes(r.status));
  const historyRequests = allRequests.filter(r => !["OPEN","ACCEPTED"].includes(r.status));

  const stats = [
    { label:"TOTAL",  value:allRequests.length,                                       color:"var(--white)" },
    { label:"DONE",   value:allRequests.filter(r=>r.status==="COMPLETED").length,     color:"var(--success)" },
    { label:"CANCEL", value:allRequests.filter(r=>r.status==="CANCELLED").length,     color:"var(--danger)" },
    { label:"EXPIRE", value:allRequests.filter(r=>r.status==="EXPIRED").length,       color:"var(--warning)" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", maxWidth:480, margin:"0 auto", padding:"20px 20px 80px" }}>

      {ratingModal && (
        <RatingModal requestId={ratingModal.requestId} ratedUser={ratingModal.ratedUser} onClose={()=>setRatingModal(null)} onSuccess={()=>refetch()} />
      )}

      <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:24 }}>
        <button onClick={()=>navigate("/dashboard")} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:22 }}>←</button>
        <h1 style={{ fontFamily:"var(--font-head)", fontSize:30, letterSpacing:1, color:"var(--white)", flex:1 }}>MY REQUESTS</h1>
        <button onClick={()=>refetch()} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:13, fontFamily:"var(--font-body)" }}>↻</button>
      </div>

      {allRequests.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8, marginBottom:24 }}>
          {stats.map(s => (
            <div key={s.label} className="card" style={{ padding:"12px 8px", textAlign:"center" }}>
              <p style={{ fontFamily:"var(--font-head)", fontSize:30, color:s.color, lineHeight:1 }}>{s.value}</p>
              <p style={{ color:"var(--muted2)", fontSize:9, fontWeight:700, letterSpacing:0.5, marginTop:4, textTransform:"uppercase" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {error && <p style={{ color:"var(--danger)", fontSize:13, marginBottom:12 }}>{error.message}</p>}

      {loading ? (
        <p style={{ color:"var(--muted)", textAlign:"center", padding:40 }}>Loading...</p>
      ) : allRequests.length===0 ? (
        <div style={{ textAlign:"center", padding:60 }}>
          <p style={{ fontSize:40, marginBottom:12 }}>📭</p>
          <p style={{ color:"var(--muted)", fontSize:14 }}>No requests yet</p>
          <button className="btn-accent" onClick={()=>navigate("/dashboard")} style={{ marginTop:20, padding:"12px 24px", fontSize:13, fontWeight:700 }}>
            POST YOUR FIRST REQUEST
          </button>
        </div>
      ) : (<>
        {activeRequests.length > 0 && (
          <div style={{ marginBottom:24 }}>
            <p style={{ fontFamily:"var(--font-head)", fontSize:16, letterSpacing:1, color:"var(--accent)", marginBottom:12 }}>
              ACTIVE ({activeRequests.length})
            </p>
            {activeRequests.map(req => <RequestCard key={req.id} req={req} navigate={navigate} onComplete={handleComplete} onCancel={handleCancel} onRate={(id,user)=>setRatingModal({ requestId:id, ratedUser:user })} />)}
          </div>
        )}
        {historyRequests.length > 0 && (
          <div>
            <p style={{ fontFamily:"var(--font-head)", fontSize:16, letterSpacing:1, color:"var(--muted)", marginBottom:12 }}>
              HISTORY ({historyRequests.length})
            </p>
            {historyRequests.map(req => <RequestCard key={req.id} req={req} navigate={navigate} onComplete={handleComplete} onCancel={handleCancel} onRate={(id,user)=>setRatingModal({ requestId:id, ratedUser:user })} />)}
          </div>
        )}
      </>)}
    </div>
  );
}