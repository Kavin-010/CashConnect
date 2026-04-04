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

export async function generateAndSendOtp(prisma: PrismaClient, email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return true;

  const rawCode = generateOtp();
  const hashedCode = await bcrypt.hash(rawCode, 10);

  await prisma.otpToken.updateMany({
    where: { userId: user.id, purpose: "PASSWORD_RESET", used: false },
    data: { used: true },
  });

  await prisma.otpToken.create({
    data: {
      userId: user.id,
      code: hashedCode,
      purpose: "PASSWORD_RESET",
      expiresAt: addMinutes(OTP_EXPIRES_MINUTES),
    },
  });

  await sendEmail({
    to: user.email,
    subject: "CampusCash Connect — Password Reset OTP",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:auto;">
        <h2 style="color:#2563eb;">CampusCash Connect</h2>
        <p>Hi ${user.name},</p>
        <p>Your password reset OTP is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1d4ed8;padding:16px 0;">${rawCode}</div>
        <p>Expires in <strong>${OTP_EXPIRES_MINUTES} minutes</strong>.</p>
      </div>
    `,
  });

  return true;
}

export async function verifyOtp(prisma: PrismaClient, email: string, code: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new Error("Invalid OTP or email.");

  const otpRecord = await prisma.otpToken.findFirst({
    where: { userId: user.id, purpose: "PASSWORD_RESET", used: false, expiresAt: { gt: new Date() } },
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

export async function resetPassword(prisma: PrismaClient, resetToken: string, newPassword: string): Promise<boolean> {
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