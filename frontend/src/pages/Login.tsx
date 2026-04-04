// @ts-nocheck
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { login, loading, loginError } = useAuth();

  const handleLogin = async () => {
    const regex = /^[0-9]{2}[a-z]{2}[0-9]{2}@psgtech\.ac\.in$/;
    if (!regex.test(email)) { alert("Enter valid PSG Tech ID"); return; }
    if (!password) { alert("Enter password"); return; }
    try {
      await login({ email, password });
    } catch (err: any) {
      alert(err.message ?? "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-gray-900 to-black">
      <div className="w-full max-w-md bg-gray-900/80 backdrop-blur-lg border border-gray-700 rounded-3xl p-8 shadow-2xl">
        <h2 className="text-3xl font-bold text-white text-center mb-2">CampusCash Connect 🚀</h2>
        <p className="text-gray-400 text-center mb-6">Sign in with your PSG Tech account</p>
        {loginError && <p className="text-red-400 text-sm text-center mb-4">{loginError.message}</p>}
        <input type="email" placeholder="student_id@psgtech.ac.in" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 rounded-xl bg-gray-800 text-white outline-none focus:ring-2 focus:ring-indigo-500" />
        <input type="password" placeholder="Enter password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 rounded-xl bg-gray-800 text-white outline-none focus:ring-2 focus:ring-indigo-500" />
        <button onClick={handleLogin} disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl font-semibold disabled:opacity-50">
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <div className="flex justify-between mt-4 text-sm text-gray-400">
          <span onClick={() => navigate("/forgot-password")} className="hover:text-white cursor-pointer">Forgot password?</span>
          <span onClick={() => navigate("/signup")} className="hover:text-white cursor-pointer">Create account</span>
        </div>
      </div>
    </div>
  );
}

export default Login;