// @ts-nocheck
import { useState } from "react";
import { useAuth } from "../hooks/useAuth";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const { signup, loading, signupError } = useAuth();

  const handleSignup = async () => {
    if (!name) { alert("Enter your name"); return; }
    if (!email.endsWith("@psgtech.ac.in")) { alert("Use your PSG Tech email"); return; }
    if (!rollNumber) { alert("Enter your roll number e.g. 23pc21"); return; }
    if (!password) { alert("Enter password"); return; }
    try {
      await signup({ name, email, password, rollNumber });
    } catch (err: any) {
      alert(err.message ?? "Signup failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 to-black">
      <div className="bg-gray-900/80 p-8 rounded-3xl w-96 shadow-xl">
        <h2 className="text-2xl text-white text-center mb-6">Create Account</h2>
        {signupError && <p className="text-red-400 text-sm text-center mb-4">{signupError.message}</p>}
        <input type="text" placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-3 mb-4 rounded bg-gray-800 text-white" />
        <input type="email" placeholder="student_id@psgtech.ac.in" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 mb-4 rounded bg-gray-800 text-white" />
        <input type="text" placeholder="Roll Number e.g. 23pc21" value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} className="w-full p-3 mb-4 rounded bg-gray-800 text-white" />
        <input type="password" placeholder="Password (min 8 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 mb-4 rounded bg-gray-800 text-white" />
        <button onClick={handleSignup} disabled={loading} className="w-full bg-green-600 p-3 rounded disabled:opacity-50">
          {loading ? "Creating..." : "Sign Up"}
        </button>
      </div>
    </div>
  );
}

export default Signup;