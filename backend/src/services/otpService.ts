import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "./emailService";

const OTP_EXPIRES_MINUTES = Number(process.env.OTP_EXPIRES_MINUTES ?? 10);

function generateOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function addMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

// ── Generate and send OTP (works for both EMAIL_VERIFY and PASSWORD_RESET) ────
export async function generateAndSendOtp(
  prisma: PrismaClient,
  email: string,
  purpose: "PASSWORD_RESET" | "EMAIL_VERIFY" = "PASSWORD_RESET"
): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return true; // prevent enumeration

  const rawCode    = generateOtp();
  const hashedCode = await bcrypt.hash(rawCode, 10);

  // Invalidate old unused OTPs of same purpose
  await prisma.otpToken.updateMany({
    where: { userId: user.id, purpose, used: false },
    data:  { used: true },
  });

  await prisma.otpToken.create({
    data: {
      userId:    user.id,
      code:      hashedCode,
      purpose,
      expiresAt: addMinutes(OTP_EXPIRES_MINUTES),
    },
  });

  const isVerification = purpose === "EMAIL_VERIFY";

  await sendEmail({
    to:      user.email,
    subject: isVerification
      ? "CampusCash Connect — Verify Your Email"
      : "CampusCash Connect — Password Reset OTP",
    html: `
      <div style="font-family:sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#4f46e5;margin-bottom:8px;">CampusCash Connect</h2>
        <p style="color:#374151;">Hi ${user.name},</p>
        <p style="color:#374151;">
          ${isVerification
            ? "Please verify your email address to activate your account."
            : "Your password reset OTP is:"}
        </p>
        <div style="font-size:36px;font-weight:bold;letter-spacing:10px;color:#4f46e5;padding:20px 0;text-align:center;">
          ${rawCode}
        </div>
        <p style="color:#6b7280;font-size:14px;">
          This code expires in <strong>${OTP_EXPIRES_MINUTES} minutes</strong>.
        </p>
        <p style="color:#6b7280;font-size:13px;margin-top:16px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  });

  return true;
}

// ── Verify OTP → return short-lived reset token (for password reset) ──────────
export async function verifyOtp(
  prisma: PrismaClient,
  email: string,
  code: string
): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new Error("Invalid OTP or email.");

  const otpRecord = await prisma.otpToken.findFirst({
    where: {
      userId:    user.id,
      purpose:   "PASSWORD_RESET",
      used:      false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) throw new Error("OTP has expired or already been used.");

  const valid = await bcrypt.compare(code, otpRecord.code);
  if (!valid) throw new Error("Invalid OTP code.");

  await prisma.otpToken.update({ where: { id: otpRecord.id }, data: { used: true } });

  return jwt.sign(
    { userId: user.id, purpose: "PASSWORD_RESET" },
    process.env.JWT_SECRET!,
    { expiresIn: "15m" }
  );
}

// ── Reset password ────────────────────────────────────────────────────────────
export async function resetPassword(
  prisma: PrismaClient,
  resetToken: string,
  newPassword: string
): Promise<boolean> {
  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters.");

  let payload: { userId: string; purpose: string };
  try {
    payload = jwt.verify(resetToken, process.env.JWT_SECRET!) as typeof payload;
  } catch {
    throw new Error("Reset link has expired. Please request a new OTP.");
  }

  if (payload.purpose !== "PASSWORD_RESET") throw new Error("Invalid reset token.");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: payload.userId }, data: { passwordHash } });
  return true;
}