import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { signToken } from "../middleware/auth";

// ── Password strength validation ──────────────────────────────────────────────
export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// ── Signup schema ─────────────────────────────────────────────────────────────
const PSG_EMAIL_REGEX = /^\d{2}[a-z]{2}\d{2}@psgtech\.ac\.in$/i;

export const SignupSchema = z.object({
  email:      z.string().email().regex(PSG_EMAIL_REGEX, "Must be a valid PSG Tech email"),
  name:       z.string().min(2).max(100),
  password:   PasswordSchema,
  rollNumber: z.string().regex(/^\d{2}[a-z]{2}\d{2}$/i, "Roll number format: 23pc21"),
  department: z.string().optional(),
  year:       z.number().min(1).max(5).optional(),
});

export const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

type SignupInput = z.infer<typeof SignupSchema>;
type LoginInput  = z.infer<typeof LoginSchema>;

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES    = 15;

// ── Signup ────────────────────────────────────────────────────────────────────
export async function signup(prisma: PrismaClient, input: SignupInput) {
  const data = SignupSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("An account with this email already exists.");

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email:        data.email.toLowerCase(),
      name:         data.name,
      passwordHash,
      rollNumber:   data.rollNumber.toLowerCase(),
      department:   data.department,
      year:         data.year,
      isVerified:   true, // ✅ auto-verify, no email OTP needed
    },
  });

  // ✅ Issue token immediately so user goes straight to dashboard
  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  return { user, needsVerification: false, token };
}

// ── Verify Email (kept for compatibility but not used) ────────────────────────
export async function verifyEmail(
  prisma: PrismaClient,
  email: string,
  code: string
) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new Error("User not found.");
  if (user.isVerified) throw new Error("Email already verified.");

  const otpRecord = await prisma.otpToken.findFirst({
    where: {
      userId:    user.id,
      purpose:   "EMAIL_VERIFY",
      used:      false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otpRecord) throw new Error("Verification code has expired. Please request a new one.");

  const valid = await bcrypt.compare(code, otpRecord.code);
  if (!valid) throw new Error("Invalid verification code.");

  await prisma.$transaction([
    prisma.otpToken.update({ where: { id: otpRecord.id }, data: { used: true } }),
    prisma.user.update({ where: { id: user.id }, data: { isVerified: true } }),
  ]);

  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  return { token, user: { ...user, isVerified: true } };
}

// ── Resend verification OTP ───────────────────────────────────────────────────
export async function resendVerificationOtp(prisma: PrismaClient, email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return true;
  if (user.isVerified) return true; // ✅ silent return, no error
  return true;
}

// ── Login ─────────────────────────────────────────────────────────────────────
export async function login(prisma: PrismaClient, input: LoginInput) {
  const data = LoginSchema.parse(input);

  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  const INVALID_MSG = "Invalid email or password.";
  if (!user) throw new Error(INVALID_MSG);

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil(
      (user.lockedUntil.getTime() - Date.now()) / 60000
    );
    throw new Error(
      `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}.`
    );
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);

  if (!valid) {
    const newAttempts = user.loginAttempts + 1;

    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: newAttempts, lockedUntil },
      });
      throw new Error(
        `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`
      );
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: newAttempts },
      });
      const remaining = MAX_LOGIN_ATTEMPTS - newAttempts;
      throw new Error(
        `${INVALID_MSG} ${remaining} attempt${remaining > 1 ? "s" : ""} remaining before lockout.`
      );
    }
  }

  // ✅ Removed EMAIL_NOT_VERIFIED check since all users are auto-verified
  await prisma.user.update({
    where: { id: user.id },
    data: { loginAttempts: 0, lockedUntil: null },
  });

  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  return { token, user };
}

// ── Update Profile ────────────────────────────────────────────────────────────
export async function updateProfile(
  prisma: PrismaClient,
  userId: string,
  input: { name?: string; department?: string; year?: number }
) {
  const data: any = {};
  if (input.name)       data.name       = input.name;
  if (input.department) data.department = input.department;
  if (input.year)       data.year       = input.year;

  return prisma.user.update({ where: { id: userId }, data });
}

// ── Change Password ───────────────────────────────────────────────────────────
export async function changePassword(
  prisma: PrismaClient,
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  PasswordSchema.parse(newPassword);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect.");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return true;
}