// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { ME_QUERY } from "../graphql/queries";
import { UPDATE_PROFILE_MUTATION, CHANGE_PASSWORD_MUTATION } from "../graphql/mutations";

const DEPARTMENTS = [
    "AMCS",
  "Computer Science",
  "Information Technology",
  "Electronics & Communication",
  "Electrical & Electronics",
  "Mechanical",
  "Civil",
  "Biotechnology",
  "Chemical",
  "Textile",
  "Fashion Technology",
];

const YEARS = [1, 2, 3, 4, 5];

function Profile() {
  const navigate  = useNavigate();
  const [tab, setTab] = useState("profile"); // "profile" | "password"
  const [saved, setSaved] = useState(false);

  // ── Fetch current user ────────────────────────────────────────────────────
  const { data, loading } = useQuery(ME_QUERY);
  const user = data?.me;

  // ── Profile form state ────────────────────────────────────────────────────
  const [name,       setName]       = useState("");
  const [department, setDepartment] = useState("");
  const [year,       setYear]       = useState("");

  // Populate form once user loads
  useState(() => {
    if (user) {
      setName(user.name ?? "");
      setDepartment(user.department ?? "");
      setYear(user.year?.toString() ?? "");
    }
  });

  // ── Password form state ───────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword,     setNewPassword]     = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ── Mutations ─────────────────────────────────────────────────────────────
  const [updateMutation, { loading: updateLoading }] = useMutation(
    UPDATE_PROFILE_MUTATION,
    { refetchQueries: [{ query: ME_QUERY }] }
  );

  const [changePwMutation, { loading: changePwLoading }] = useMutation(
    CHANGE_PASSWORD_MUTATION
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!name.trim()) { alert("Name cannot be empty"); return; }
    try {
      await updateMutation({
        variables: {
          input: {
            name:       name.trim(),
            department: department || undefined,
            year:       year ? Number(year) : undefined,
          },
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.message ?? "Failed to update profile");
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword)  { alert("Enter your current password"); return; }
    if (!newPassword)      { alert("Enter a new password"); return; }
    if (newPassword.length < 8) { alert("New password must be at least 8 characters"); return; }
    if (newPassword !== confirmPassword) { alert("New passwords do not match"); return; }

    try {
      await changePwMutation({
        variables: { currentPassword, newPassword },
      });
      alert("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      alert(err.message ?? "Failed to change password");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      {/* Avatar + Name */}
      <div className="flex items-center gap-4 bg-gray-800 p-5 rounded-xl mb-6">
        <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-2xl font-bold">
          {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        <div>
          <p className="text-xl font-semibold">{user?.name}</p>
          <p className="text-gray-400 text-sm">{user?.email}</p>
          <p className="text-gray-500 text-xs mt-0.5">
            Roll No: {user?.rollNumber?.toUpperCase()}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("profile")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "profile"
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Edit Profile
        </button>
        <button
          onClick={() => setTab("password")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "password"
              ? "bg-indigo-600 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
        >
          Change Password
        </button>
      </div>

      {/* ── Edit Profile Tab ── */}
      {tab === "profile" && (
        <div className="bg-gray-800 p-5 rounded-xl space-y-4">

          {/* Name */}
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full p-3 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Email — read only */}
          <div>
            <label className="text-gray-400 text-sm mb-1 block">
              Email <span className="text-gray-600">(cannot be changed)</span>
            </label>
            <input
              type="email"
              value={user?.email ?? ""}
              disabled
              className="w-full p-3 rounded-lg bg-gray-700 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Roll Number — read only */}
          <div>
            <label className="text-gray-400 text-sm mb-1 block">
              Roll Number <span className="text-gray-600">(cannot be changed)</span>
            </label>
            <input
              type="text"
              value={user?.rollNumber?.toUpperCase() ?? ""}
              disabled
              className="w-full p-3 rounded-lg bg-gray-700 text-gray-500 cursor-not-allowed"
            />
          </div>

          {/* Department */}
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Department</label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="text-gray-400 text-sm mb-1 block">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full p-3 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select year</option>
              {YEARS.map((y) => (
                <option key={y} value={y}>Year {y}</option>
              ))}
            </select>
          </div>

          {/* Save button */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={updateLoading}
              className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 rounded-lg font-medium disabled:opacity-50"
            >
              {updateLoading ? "Saving..." : "Save Changes"}
            </button>
            {saved && (
              <p className="text-green-400 text-sm">
                ✓ Profile updated successfully
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Change Password Tab ── */}
      {tab === "password" && (
        <div className="bg-gray-800 p-5 rounded-xl space-y-4">

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full p-3 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              className="w-full p-3 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="text-gray-400 text-sm mb-1 block">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full p-3 rounded-lg bg-gray-700 text-white outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-red-400 text-xs mt-1">Passwords do not match</p>
            )}
            {confirmPassword && newPassword === confirmPassword && confirmPassword.length >= 8 && (
              <p className="text-green-400 text-xs mt-1">✓ Passwords match</p>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={handleChangePassword}
              disabled={changePwLoading}
              className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 rounded-lg font-medium disabled:opacity-50"
            >
              {changePwLoading ? "Changing..." : "Change Password"}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default Profile;