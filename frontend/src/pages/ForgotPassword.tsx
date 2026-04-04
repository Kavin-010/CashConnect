// @ts-nocheck
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

type Step = "email" | "otp" | "password";

function ForgotPassword() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const navigate = useNavigate();
  const { forgotPassword, verifyOtp, resetPassword, loading } = useAuth();

  const handleSendOtp = async () => {
    if (!email) { alert("Enter your email"); return; }
    try { await forgotPassword(email); alert("OTP sent!"); setStep("otp"); }
    catch (err: any) { alert(err.message ?? "Failed"); }
  };

  const handleVerifyOtp = async () => {
    if (!otp) { alert("Enter OTP"); return; }
    try {
      const token = await verifyOtp(email, otp);
      if (!token) { alert("Invalid OTP"); return; }
      setResetToken(token); setStep("password");
    } catch (err: any) { alert(err.message ?? "Invalid OTP"); }
  };

  const handleReset = async () => {
    if (!newPassword) { alert("Enter new password"); return; }
    try { await resetPassword(resetToken, newPassword); alert("Password updated!"); navigate("/"); }
    catch (err: any) { alert(err.message ?? "Reset failed"); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-black">
      <div className="bg-gray-900/80 p-8 rounded-3xl w-96 shadow-xl">
        <h2 className="text-2xl text-white text-center mb-2">Reset Password</h2>
        <p className="text-gray-400 text-center text-sm mb-6">
          Step {step === "email" ? "1" : step === "otp" ? "2" : "3"} of 3
        </p>
        {step === "email" && <>
          <input type="email" placeholder="Your PSG email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-4 rounded bg-gray-800 text-white" />
          <button onClick={handleSendOtp} disabled={loading} className="w-full bg-blue-600 p-3 rounded disabled:opacity-50">{loading ? "Sending..." : "Send OTP"}</button>
        </>}
        {step === "otp" && <>
          <p className="text-gray-400 text-sm text-center mb-4">Check your PSG email</p>
          <input type="text" placeholder="6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} className="w-full p-3 mb-4 rounded bg-gray-800 text-white tracking-widest text-center text-lg" />
          <button onClick={handleVerifyOtp} disabled={loading} className="w-full bg-blue-600 p-3 rounded disabled:opacity-50">{loading ? "Verifying..." : "Verify OTP"}</button>
        </>}
        {step === "password" && <>
          <input type="password" placeholder="New Password (min 8 chars)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-3 mb-4 rounded bg-gray-800 text-white" />
          <button onClick={handleReset} disabled={loading} className="w-full bg-green-600 p-3 rounded disabled:opacity-50">{loading ? "Updating..." : "Update Password"}</button>
        </>}
        <p onClick={() => navigate("/")} className="text-gray-400 text-sm text-center mt-4 cursor-pointer hover:text-white">Back to login</p>
      </div>
    </div>
  );
}

export default ForgotPassword;