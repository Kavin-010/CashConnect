import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import ForgotPassword from "./pages/ForgotPassword";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";

function App() {
  return (
    <Routes>
      {/* Public routes — redirect to dashboard if already logged in */}
      <Route path="/" element={
        <PublicRoute><Login /></PublicRoute>
      } />
      <Route path="/signup" element={
        <PublicRoute><Signup /></PublicRoute>
      } />
      <Route path="/forgot-password" element={
        <PublicRoute><ForgotPassword /></PublicRoute>
      } />

      {/* Protected routes — redirect to login if not logged in */}
      <Route path="/dashboard" element={
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      } />
      <Route path="/chat/:requestId" element={
        <ProtectedRoute><Chat /></ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;