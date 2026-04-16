// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useSubscription } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { ME_QUERY, OPEN_REQUESTS_QUERY, MY_REQUESTS_QUERY, USER_RATINGS_QUERY } from "../graphql/queries";
import { POST_REQUEST_MUTATION, ACCEPT_REQUEST_MUTATION } from "../graphql/mutations";
import { REQUEST_STATUS_CHANGED_SUBSCRIPTION } from "../graphql/subscriptions";
import { clearToken } from "../lib/apolloClient";
import { StarDisplay } from "../components/StarRating";

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", hour12:true });
}
function timeLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff/60000);
  const hrs  = Math.floor(mins/60);
  return hrs > 0 ? `${hrs}h ${mins%60}m left` : `${mins}m left`;
}

// ── Notification banner ───────────────────────────────────────────────────────
function Notifications({ notifications, onDismiss, onGoToChat }) {
  if (!notifications.length) return null;
  return (
    <div style={{ position:"fixed", top:16, right:16, zIndex:100, display:"flex", flexDirection:"column", gap:10, width:320 }}>
      {notifications.map(n => (
        <div key={n.id} style={{ background:"var(--card)", border:"1px solid var(--accent)", borderRadius:16, padding:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <span style={{ color:"var(--accent)", fontWeight:700, fontSize:12, letterSpacing:0.5 }}>🎉 REQUEST ACCEPTED</span>
            <button onClick={()=>onDismiss(n.id)} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:18, lineHeight:1 }}>×</button>
          </div>
          <p style={{ color:"var(--muted)", fontSize:12, marginBottom:10, lineHeight:1.5 }}>{n.message}</p>
          <button className="btn-accent" onClick={()=>onGoToChat(n.requestId, n.id)} style={{ padding:"8px 16px", fontSize:11, fontWeight:700, letterSpacing:0.5 }}>
            OPEN CHAT →
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Subscribes to one request — used in a map so must be separate component ──
// This is how real-time "request accepted" works without refresh
function RequestSubscriber({ requestId, onStatusChange }) {
  useSubscription(REQUEST_STATUS_CHANGED_SUBSCRIPTION, {
    variables: { requestId },
    onData: ({ data }) => {
      if (data?.data?.requestStatusChanged) {
        onStatusChange(data.data.requestStatusChanged);
      }
    },
  });
  return null;
}

// ── Single open request card ──────────────────────────────────────────────────
function OpenRequestCard({ req, onAccept, acceptLoading }) {
  const { data: ratingData } = useQuery(USER_RATINGS_QUERY, { variables: { userId: req.requester.id } });
  const ratings = ratingData?.userRatings;
  const tl      = timeLeft(req.expiresAt);

  return (
    <div className="card" style={{ padding:20, marginBottom:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:"var(--font-head)", fontSize:38, color:"var(--white)", lineHeight:1, marginBottom:4 }}>
            ₹{req.amount}
          </div>
          <p style={{ color:"var(--muted)", fontSize:14, marginBottom:6 }}>{req.reason}</p>

          {req.location && (
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6 }}>
              <span style={{ color:"var(--accent)", fontSize:13 }}>📍</span>
              <span style={{ color:"var(--accent2)", fontSize:13, fontWeight:500 }}>{req.location}</span>
            </div>
          )}

          <div style={{ color:"var(--muted2)", fontSize:12, marginBottom:4 }}>
            {req.requester.name}
            {req.requester.department && ` · ${req.requester.department}`}
          </div>

          {ratings && ratings.total > 0 && (
            <div style={{ marginBottom:6 }}>
              <StarDisplay average={ratings.average} total={ratings.total} size="sm" />
            </div>
          )}

          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ color:"var(--muted2)", fontSize:11 }}>{formatDate(req.createdAt)}</span>
            {tl && (
              <span style={{ background:"rgba(255,184,0,0.15)", color:"var(--warning)", fontSize:11, fontWeight:700, padding:"2px 8px", borderRadius:50 }}>
                {tl}
              </span>
            )}
          </div>
        </div>

        <button className="btn-accent" onClick={()=>onAccept(req.id)} disabled={acceptLoading} style={{ padding:"10px 20px", fontSize:12, fontWeight:700, letterSpacing:0.5, marginLeft:16, flexShrink:0 }}>
          ACCEPT
        </button>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { data: meData }   = useQuery(ME_QUERY);
  const currentUser        = meData?.me;
  const [notifications, setNotifications] = useState([]);
  const [showForm,      setShowForm]      = useState(false);
  const [amount,   setAmount]   = useState("");
  const [reason,   setReason]   = useState("");
  const [location, setLocation] = useState("");
  const [expiryMins, setExpiryMins] = useState("60");

  // ── My requests — needed for subscription targets ─────────────────────────
  const { data: myData, refetch: refetchMy } = useQuery(MY_REQUESTS_QUERY, { fetchPolicy:"network-only" });
  const myActiveRequests = (myData?.myRequests ?? []).filter(r => r.status==="OPEN" || r.status==="ACCEPTED");

  // ── Real-time: when backend publishes REQUEST_STATUS_CHANGED ──────────────
  // For each of the user's active requests, RequestSubscriber listens via WS.
  // When status becomes ACCEPTED → show notification immediately (no refresh needed).
  const handleStatusChange = (updatedRequest) => {
    if (updatedRequest.status==="ACCEPTED" && updatedRequest.acceptor) {
      setNotifications(prev => [...prev, {
        id: `${updatedRequest.id}-${Date.now()}`,
        message: `${updatedRequest.acceptor.name} (${updatedRequest.acceptor.rollNumber}) accepted your ₹${updatedRequest.amount} request`,
        requestId: updatedRequest.id,
      }]);
      refetchMy();
    }
  };

  const dismissNotification = id => setNotifications(prev => prev.filter(n => n.id !== id));
  const goToChat = (requestId, notifId) => { dismissNotification(notifId); navigate(`/chat/${requestId}`); };

  // ── Open requests from others ─────────────────────────────────────────────
  const { data: openData, loading: openLoading, error: openError, refetch: refetchOpen } =
    useQuery(OPEN_REQUESTS_QUERY, { fetchPolicy:"network-only" });

  // ── Post request mutation ─────────────────────────────────────────────────
  const [postMutation, { loading: postLoading }] = useMutation(POST_REQUEST_MUTATION, {
    refetchQueries: [{ query: OPEN_REQUESTS_QUERY }, { query: MY_REQUESTS_QUERY }],
  });

  const handlePost = async () => {
    if (!amount||!reason||!location) { alert("Fill all fields including location"); return; }
    try {
      await postMutation({ variables: { input: { amount:Number(amount), reason, location, expiresInMinutes:Number(expiryMins) } } });
      setAmount(""); setReason(""); setLocation(""); setExpiryMins("60"); setShowForm(false);
    } catch (err) { alert(err.message ?? "Failed to post"); }
  };

  // ── Accept mutation ───────────────────────────────────────────────────────
  const [acceptMutation, { loading: acceptLoading }] = useMutation(ACCEPT_REQUEST_MUTATION, {
    refetchQueries: [{ query: OPEN_REQUESTS_QUERY }],
  });

  const handleAccept = async (requestId) => {
    try { await acceptMutation({ variables: { requestId } }); navigate(`/chat/${requestId}`); }
    catch (err) { alert(err.message ?? "Failed to accept"); }
  };

  const openRequests = openData?.openRequests ?? [];

  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", maxWidth:480, margin:"0 auto", paddingBottom:80 }}>

      {/* Real-time subscription — one per active request */}
      {myActiveRequests.map(req => (
        <RequestSubscriber key={req.id} requestId={req.id} onStatusChange={handleStatusChange} />
      ))}

      <Notifications notifications={notifications} onDismiss={dismissNotification} onGoToChat={goToChat} />

      {/* ── Top bar ── */}
      <div style={{ padding:"20px 20px 0", display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
        <div>
          <p style={{ color:"var(--muted)", fontSize:11, textTransform:"uppercase", letterSpacing:1.5 }}>Welcome back</p>
          <h2 style={{ fontFamily:"var(--font-head)", fontSize:28, color:"var(--white)", letterSpacing:1 }}>
            {currentUser?.name?.toUpperCase() ?? "..."}
          </h2>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>navigate("/profile")} style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"50%", width:42, height:42, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:16 }}>
            👤
          </button>
          <button onClick={()=>{ clearToken(); navigate("/"); }} style={{ background:"var(--card)", border:"1px solid var(--border)", borderRadius:"50%", width:42, height:42, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", color:"var(--muted)", fontSize:16 }}>
            ↩
          </button>
        </div>
      </div>

      {/* ── My Requests button ── */}
      <div style={{ padding:"16px 20px" }}>
        <button onClick={()=>navigate("/history")} style={{ width:"100%", background:"var(--card)", border:"1px solid var(--border)", borderRadius:16, padding:"14px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer", color:"var(--white)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:20 }}>📋</span>
            <div style={{ textAlign:"left" }}>
              <p style={{ fontWeight:600, fontSize:14, color:"var(--white)" }}>My Requests</p>
              {myActiveRequests.length > 0
                ? <p style={{ fontSize:11, color:"var(--accent)", fontWeight:700, marginTop:1 }}>{myActiveRequests.length} active</p>
                : <p style={{ fontSize:11, color:"var(--muted2)", marginTop:1 }}>View history</p>
              }
            </div>
          </div>
          <span style={{ color:"var(--accent)", fontSize:18 }}>→</span>
        </button>
      </div>

      {/* ── Post Request ── */}
      <div style={{ padding:"0 20px 20px" }}>
        {!showForm ? (
          <button className="btn-accent" onClick={()=>setShowForm(true)} style={{ width:"100%", padding:16, fontSize:14, fontWeight:700, letterSpacing:1 }}>
            + POST CASH REQUEST
          </button>
        ) : (
          <div className="card" style={{ padding:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <span style={{ fontFamily:"var(--font-head)", fontSize:22, letterSpacing:1 }}>NEW REQUEST</span>
              <button onClick={()=>setShowForm(false)} style={{ background:"none", border:"none", color:"var(--muted)", cursor:"pointer", fontSize:22 }}>×</button>
            </div>
            {[
              { label:"Amount (₹)", value:amount, set:setAmount, type:"number", placeholder:"100" },
              { label:"Reason",     value:reason,  set:setReason, type:"text",   placeholder:"Need cash for canteen" },
              { label:"📍 Location",value:location,set:setLocation,type:"text",  placeholder:"Canteen Block A" },
            ].map(({ label, value, set, type, placeholder }) => (
              <div key={label} style={{ marginBottom:12 }}>
                <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:"var(--muted)", textTransform:"uppercase", display:"block", marginBottom:8 }}>{label}</label>
                <input className="inp" type={type} placeholder={placeholder} value={value} onChange={e=>set(e.target.value)} />
              </div>
            ))}
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:11, fontWeight:700, letterSpacing:1, color:"var(--muted)", textTransform:"uppercase", display:"block", marginBottom:8 }}>Visible For</label>
              <select className="inp" value={expiryMins} onChange={e=>setExpiryMins(e.target.value)}>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="60">1 hour</option>
                <option value="120">2 hours</option>
                <option value="180">3 hours</option>
                <option value="360">6 hours</option>
                <option value="720">12 hours</option>
                <option value="1440">24 hours</option>
              </select>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button className="btn-ghost" onClick={()=>setShowForm(false)} style={{ flex:1, padding:14, fontSize:13, fontWeight:700 }}>CANCEL</button>
              <button className="btn-accent" onClick={handlePost} disabled={postLoading} style={{ flex:2, padding:14, fontSize:13, fontWeight:700, letterSpacing:0.5 }}>
                {postLoading?"POSTING...":"POST REQUEST"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Active Requests ── */}
      <div style={{ padding:"0 20px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <h2 style={{ fontFamily:"var(--font-head)", fontSize:22, letterSpacing:1, color:"var(--white)" }}>ACTIVE REQUESTS</h2>
          <button onClick={()=>refetchOpen()} style={{ background:"none", border:"none", color:"var(--muted)", fontSize:13, cursor:"pointer", fontFamily:"var(--font-body)" }}>↻ Refresh</button>
        </div>

        {openError && <p style={{ color:"var(--danger)", fontSize:13, marginBottom:12 }}>{openError.message}</p>}

        {openLoading && openRequests.length===0 ? (
          <p style={{ color:"var(--muted)", textAlign:"center", padding:40 }}>Loading...</p>
        ) : openRequests.length===0 ? (
          <div style={{ textAlign:"center", padding:40 }}>
            <p style={{ fontSize:36, marginBottom:8 }}>💸</p>
            <p style={{ color:"var(--muted)", fontSize:14 }}>No open requests right now</p>
            <p style={{ color:"var(--muted2)", fontSize:12, marginTop:4 }}>Be the first to post one</p>
          </div>
        ) : (
          openRequests.map(req => (
            <OpenRequestCard key={req.id} req={req} onAccept={handleAccept} acceptLoading={acceptLoading} />
          ))
        )}
      </div>
    </div>
  );
}