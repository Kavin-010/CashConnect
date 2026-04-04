// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useSubscription } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { ME_QUERY, OPEN_REQUESTS_QUERY, MY_REQUESTS_QUERY } from "../graphql/queries";
import {
  POST_REQUEST_MUTATION,
  ACCEPT_REQUEST_MUTATION,
  COMPLETE_REQUEST_MUTATION,
  CANCEL_REQUEST_MUTATION,
} from "../graphql/mutations";
import { REQUEST_STATUS_CHANGED_SUBSCRIPTION } from "../graphql/subscriptions";
import { clearToken } from "../lib/apolloClient";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function timeLeft(expiresAt) {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  if (hrs > 0) return `Expires in ${hrs}h ${mins % 60}m`;
  return `Expires in ${mins}m`;
}

function statusBadge(status) {
  const map = {
    OPEN:      "bg-green-700 text-green-200",
    ACCEPTED:  "bg-blue-700 text-blue-200",
    COMPLETED: "bg-gray-600 text-gray-200",
    CANCELLED: "bg-red-800 text-red-200",
    EXPIRED:   "bg-yellow-800 text-yellow-200",
  };
  return map[status] ?? "bg-gray-700 text-gray-300";
}

// ── Notification Banner ───────────────────────────────────────────────────────

function NotificationBanner({ notifications, onDismiss, onGoToChat }) {
  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {notifications.map((n) => (
        <div
          key={n.id}
          className="bg-indigo-700 border border-indigo-500 text-white px-4 py-3 rounded-xl shadow-2xl flex flex-col gap-2"
        >
          <div className="flex justify-between items-start">
            <p className="font-semibold text-sm">Request Accepted! 🎉</p>
            <button
              onClick={() => onDismiss(n.id)}
              className="text-indigo-300 hover:text-white text-xl leading-none -mt-1"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-indigo-200">{n.message}</p>
          <button
            onClick={() => onGoToChat(n.requestId, n.id)}
            className="bg-white text-indigo-700 font-semibold text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-100 self-start"
          >
            Open Chat →
          </button>
        </div>
      ))}
    </div>
  );
}

// ── Request Subscriber ────────────────────────────────────────────────────────
// Separate component so useSubscription can be called per request
// (hooks cannot be called inside loops)

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

// ── Main Dashboard ────────────────────────────────────────────────────────────

function Dashboard() {
  const navigate = useNavigate();

  // ── Current user ──────────────────────────────────────────────────────────
  const { data: meData } = useQuery(ME_QUERY);
  const currentUser = meData?.me;

  // ── Notifications ─────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);

  const handleStatusChange = (updatedRequest) => {
    if (updatedRequest.status === "ACCEPTED" && updatedRequest.acceptor) {
      setNotifications((prev) => [
        ...prev,
        {
          id: `${updatedRequest.id}-${Date.now()}`,
          message: `${updatedRequest.acceptor.name} (${updatedRequest.acceptor.rollNumber}) accepted your ₹${updatedRequest.amount} request for "${updatedRequest.reason}"`,
          requestId: updatedRequest.id,
        },
      ]);
      refetchMy();
    }
  };

  const dismissNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const goToChat = (requestId, notifId) => {
    dismissNotification(notifId);
    navigate(`/chat/${requestId}`);
  };

  // ── My requests ───────────────────────────────────────────────────────────
  const {
    data: myData,
    loading: myLoading,
    refetch: refetchMy,
  } = useQuery(MY_REQUESTS_QUERY, { fetchPolicy: "network-only" });

  const myActiveRequests = (myData?.myRequests ?? []).filter(
    (r) => r.status === "OPEN" || r.status === "ACCEPTED"
  );

  // ── Open requests from others ─────────────────────────────────────────────
  const {
    data: openData,
    loading: openLoading,
    error: openError,
    refetch: refetchOpen,
  } = useQuery(OPEN_REQUESTS_QUERY, { fetchPolicy: "network-only" });

  // ── Post request ──────────────────────────────────────────────────────────
  const [amount, setAmount]           = useState("");
  const [reason, setReason]           = useState("");
  const [expiryMins, setExpiryMins]   = useState("60");

  const [postMutation, { loading: postLoading }] = useMutation(POST_REQUEST_MUTATION, {
    refetchQueries: [{ query: OPEN_REQUESTS_QUERY }, { query: MY_REQUESTS_QUERY }],
  });

  const handlePost = async () => {
    if (!amount || !reason) { alert("Fill all fields"); return; }
    try {
      await postMutation({
        variables: {
          input: {
            amount: Number(amount),
            reason,
            expiresInMinutes: Number(expiryMins),
          },
        },
      });
      setAmount("");
      setReason("");
      setExpiryMins("60");
    } catch (err) {
      alert(err.message ?? "Failed to post request");
    }
  };

  // ── Accept request ────────────────────────────────────────────────────────
  const [acceptMutation, { loading: acceptLoading }] = useMutation(
    ACCEPT_REQUEST_MUTATION,
    { refetchQueries: [{ query: OPEN_REQUESTS_QUERY }] }
  );

  const handleAccept = async (requestId) => {
    try {
      await acceptMutation({ variables: { requestId } });
      navigate(`/chat/${requestId}`);
    } catch (err) {
      alert(err.message ?? "Failed to accept");
    }
  };

  // ── Complete request ──────────────────────────────────────────────────────
  const [completeMutation] = useMutation(COMPLETE_REQUEST_MUTATION, {
    refetchQueries: [{ query: MY_REQUESTS_QUERY }],
  });

  const handleComplete = async (requestId) => {
    if (!confirm("Mark this request as completed?")) return;
    try {
      await completeMutation({ variables: { requestId } });
    } catch (err) {
      alert(err.message ?? "Failed to complete");
    }
  };

  // ── Cancel request ────────────────────────────────────────────────────────
  const [cancelMutation] = useMutation(CANCEL_REQUEST_MUTATION, {
    refetchQueries: [{ query: MY_REQUESTS_QUERY }, { query: OPEN_REQUESTS_QUERY }],
  });

  const handleCancel = async (requestId) => {
    if (!confirm("Cancel this request?")) return;
    try {
      await cancelMutation({ variables: { requestId } });
    } catch (err) {
      alert(err.message ?? "Failed to cancel");
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    clearToken();
    navigate("/");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">

      {/* Notification Banner */}
      <NotificationBanner
        notifications={notifications}
        onDismiss={dismissNotification}
        onGoToChat={goToChat}
      />

      {/* Subscribe to each active request for real-time status changes */}
      {myActiveRequests.map((req) => (
        <RequestSubscriber
          key={req.id}
          requestId={req.id}
          onStatusChange={handleStatusChange}
        />
      ))}

      {/* Header */}
      <div className="flex justify-between items-center mb-1">
        <h1 className="text-2xl font-bold">CampusCash Dashboard 💸</h1>
        <button
          onClick={logout}
          className="text-sm text-gray-400 hover:text-white"
        >
          Logout
        </button>
      </div>
      <p className="text-gray-400 mb-6">
        Logged in as:{" "}
        <span className="text-white font-medium">{currentUser?.name}</span>{" "}
        ({currentUser?.email})
      </p>

      {/* ── Post Request ── */}
      <div className="bg-gray-800 p-4 rounded-xl mb-6">
        <h2 className="mb-3 font-semibold">Post Cash Request</h2>

        <input
          type="number"
          placeholder="Amount (₹)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
        />

        <input
          type="text"
          placeholder="Reason (Canteen / Library / etc.)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full p-2 mb-3 rounded bg-gray-700 text-white"
        />

        <div className="flex items-center gap-3 mb-3">
          <label className="text-gray-400 text-sm whitespace-nowrap">
            Visible for:
          </label>
          <select
            value={expiryMins}
            onChange={(e) => setExpiryMins(e.target.value)}
            className="flex-1 p-2 rounded bg-gray-700 text-white"
          >
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

        <button
          onClick={handlePost}
          disabled={postLoading}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded disabled:opacity-50"
        >
          {postLoading ? "Posting..." : "Post Request"}
        </button>
      </div>

      {/* ── My Requests ── */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">My Requests</h2>
          <button
            onClick={() => refetchMy()}
            className="text-xs text-gray-400 hover:text-white"
          >
            ↻ Refresh
          </button>
        </div>

        {myLoading ? (
          <p className="text-gray-400">Loading...</p>
        ) : (myData?.myRequests ?? []).length === 0 ? (
          <p className="text-gray-400">You haven't posted any requests yet</p>
        ) : (
          <div className="space-y-3">
            {(myData?.myRequests ?? []).map((req) => (
              <div key={req.id} className="bg-gray-800 p-4 rounded-xl">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">₹{req.amount}</p>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(req.status)}`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{req.reason}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Posted: {formatDate(req.createdAt)}
                    </p>
                    {req.expiresAt && req.status === "OPEN" && (
                      <p className="text-xs text-yellow-400 mt-1">
                        {timeLeft(req.expiresAt)}
                      </p>
                    )}
                    {req.acceptor && (
                      <p className="text-green-400 text-sm mt-1">
                        Accepted by:{" "}
                        <span className="font-semibold">{req.acceptor.name}</span>{" "}
                        ({req.acceptor.rollNumber})
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {req.status === "ACCEPTED" && req.chatRoom && (
                      <button
                        onClick={() => navigate(`/chat/${req.id}`)}
                        className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-sm"
                      >
                        Open Chat
                      </button>
                    )}
                    {req.status === "ACCEPTED" && (
                      <button
                        onClick={() => handleComplete(req.id)}
                        className="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-sm"
                      >
                        Mark Done ✓
                      </button>
                    )}
                    {["OPEN", "ACCEPTED"].includes(req.status) && (
                      <button
                        onClick={() => handleCancel(req.id)}
                        className="bg-red-800 hover:bg-red-700 px-3 py-1 rounded text-sm"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Active Requests from others ── */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Active Requests</h2>
          <button
            onClick={() => refetchOpen()}
            className="text-xs text-gray-400 hover:text-white"
          >
            ↻ Refresh
          </button>
        </div>

        {openError && (
          <p className="text-red-400 mb-3">{openError.message}</p>
        )}

        {openLoading && (openData?.openRequests ?? []).length === 0 ? (
          <p className="text-gray-400">Loading...</p>
        ) : (openData?.openRequests ?? []).length === 0 ? (
          <p className="text-gray-400">No open requests from others</p>
        ) : (
          <div className="space-y-3">
            {(openData?.openRequests ?? []).map((req) => (
              <div
                key={req.id}
                className="bg-gray-800 p-4 rounded-xl flex justify-between items-start"
              >
                <div>
                  <p className="font-semibold">₹{req.amount}</p>
                  <p className="text-sm text-gray-400">{req.reason}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    By {req.requester.name} ({req.requester.rollNumber})
                  </p>
                  <p className="text-xs text-gray-500">
                    Posted: {formatDate(req.createdAt)}
                  </p>
                  {req.expiresAt && (
                    <p className="text-xs text-yellow-400 mt-1">
                      {timeLeft(req.expiresAt)}
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleAccept(req.id)}
                  disabled={acceptLoading}
                  className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded disabled:opacity-50 ml-4 mt-1"
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default Dashboard;