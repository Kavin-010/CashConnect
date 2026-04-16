// src/lib/passwordStrength.ts
// ── Password strength checker ─────────────────────────────────────────────────
// Returns a score 0-4 and a list of unmet requirements.
// Used on Signup and Change Password pages.

export interface PasswordStrength {
  score:        0 | 1 | 2 | 3 | 4;
  label:        string;
  color:        string;
  barColor:     string;
  requirements: Requirement[];
}

interface Requirement {
  label: string;
  met:   boolean;
}

export function checkPasswordStrength(password: string): PasswordStrength {
  const requirements: Requirement[] = [
    { label: "At least 8 characters",          met: password.length >= 8 },
    { label: "One uppercase letter (A-Z)",      met: /[A-Z]/.test(password) },
    { label: "One lowercase letter (a-z)",      met: /[a-z]/.test(password) },
    { label: "One number (0-9)",                met: /[0-9]/.test(password) },
    { label: "One special character (!@#$...)", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const metCount = requirements.filter((r) => r.met).length;
  const score    = metCount as 0 | 1 | 2 | 3 | 4;

  const levels = [
    { label: "",          color: "text-gray-500",  barColor: "bg-gray-600" },
    { label: "Weak",      color: "text-red-400",   barColor: "bg-red-500"  },
    { label: "Fair",      color: "text-orange-400",barColor: "bg-orange-500"},
    { label: "Good",      color: "text-yellow-400",barColor: "bg-yellow-500"},
    { label: "Strong",    color: "text-green-400", barColor: "bg-green-500" },
    { label: "Very Strong",color:"text-green-400", barColor: "bg-green-500" },
  ];

  const level = levels[Math.min(metCount, 5)];

  return {
    score,
    label:        level.label,
    color:        level.color,
    barColor:     level.barColor,
    requirements,
  };
}

export function isPasswordValid(password: string): boolean {
  const { requirements } = checkPasswordStrength(password);
  return requirements.every((r) => r.met);
}