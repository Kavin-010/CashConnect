import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import ForgotPassword from "./pages/ForgotPassword";
import RequestHistory from "./pages/RequestHistory";
import Profile from "./pages/Profile";
import VerifyEmail from "./pages/VerifyEmail";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

      {/* Verify email — public, no redirect (needed after signup and from login) */}
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/chat/:requestId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><RequestHistory /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    </Routes>
  );
}

export default App;