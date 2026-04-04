// @ts-nocheck
import { useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { MY_REQUESTS_QUERY } from "../graphql/queries";

function formatDate(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
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

function RequestHistory() {
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useQuery(MY_REQUESTS_QUERY, {
    fetchPolicy: "network-only",
  });

  const allRequests = data?.myRequests ?? [];

  // Separate active from history
  const activeRequests = allRequests.filter(
    (r) => r.status === "OPEN" || r.status === "ACCEPTED"
  );
  const historyRequests = allRequests.filter(
    (r) => !["OPEN", "ACCEPTED"].includes(r.status)
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-gray-400 hover:text-white text-sm"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold">My Request History</h1>
        <button
          onClick={() => refetch()}
          className="ml-auto text-xs text-gray-400 hover:text-white"
        >
          ↻ Refresh
        </button>
      </div>

      {error && <p className="text-red-400 mb-4">{error.message}</p>}

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : (
        <>
          {/* ── Active Requests ── */}
          {activeRequests.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold mb-3 text-green-400">
                Active ({activeRequests.length})
              </h2>
              <div className="space-y-3">
                {activeRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    navigate={navigate}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── History ── */}
          <div>
            <h2 className="font-semibold mb-3 text-gray-400">
              Past Requests ({historyRequests.length})
            </h2>

            {historyRequests.length === 0 ? (
              <div className="bg-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-400">No past requests yet</p>
                <p className="text-gray-500 text-sm mt-1">
                  Completed, cancelled and expired requests will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historyRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    navigate={navigate}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ── Summary stats ── */}
          {allRequests.length > 0 && (
            <div className="mt-8 grid grid-cols-4 gap-3">
              {[
                { label: "Total",     value: allRequests.length,                                color: "text-white" },
                { label: "Completed", value: allRequests.filter(r => r.status === "COMPLETED").length, color: "text-green-400" },
                { label: "Cancelled", value: allRequests.filter(r => r.status === "CANCELLED").length, color: "text-red-400" },
                { label: "Expired",   value: allRequests.filter(r => r.status === "EXPIRED").length,   color: "text-yellow-400" },
              ].map((stat) => (
                <div key={stat.label} className="bg-gray-800 rounded-xl p-4 text-center">
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Request Card ──────────────────────────────────────────────────────────────

function RequestCard({ req, navigate }) {
  return (
    <div className="bg-gray-800 p-4 rounded-xl">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold">₹{req.amount}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge(req.status)}`}>
              {req.status}
            </span>
          </div>
          <p className="text-sm text-gray-400">{req.reason}</p>
          <p className="text-xs text-gray-500 mt-1">
            Posted: {formatDate(req.createdAt)}
          </p>
          {req.acceptor && (
            <p className="text-green-400 text-sm mt-1">
              {req.status === "COMPLETED" ? "Completed with" : "Accepted by"}:{" "}
              <span className="font-semibold">{req.acceptor.name}</span>{" "}
              ({req.acceptor.rollNumber})
            </p>
          )}
        </div>

        {/* Go to chat if accepted */}
        {req.status === "ACCEPTED" && req.chatRoom && (
          <button
            onClick={() => navigate(`/chat/${req.id}`)}
            className="bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded text-sm ml-4"
          >
            Open Chat
          </button>
        )}
      </div>
    </div>
  );
}

export default RequestHistory;