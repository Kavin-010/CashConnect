import bcrypt from "bcryptjs";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { signToken } from "../middleware/auth";

const PSG_EMAIL_REGEX = /^\d{2}[a-z]{2}\d{2}@psgtech\.ac\.in$/i;

export const SignupSchema = z.object({
  email: z.string().email().regex(PSG_EMAIL_REGEX, "Must be a valid PSG Tech email"),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(128),
  rollNumber: z.string().regex(/^\d{2}[a-z]{2}\d{2}$/i, "Roll number format: 23pc21"),
  department: z.string().optional(),
  year: z.number().min(1).max(4).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type SignupInput = z.infer<typeof SignupSchema>;
type LoginInput = z.infer<typeof LoginSchema>;

export async function signup(prisma: PrismaClient, input: SignupInput) {
  const data = SignupSchema.parse(input);
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("An account with this email already exists.");

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      name: data.name,
      passwordHash,
      rollNumber: data.rollNumber.toLowerCase(),
      department: data.department,
      year: data.year,
    },
  });

  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  return { token, user };
}

export async function login(prisma: PrismaClient, input: LoginInput) {
  const data = LoginSchema.parse(input);
  const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
  const INVALID_MSG = "Invalid email or password.";
  if (!user) throw new Error(INVALID_MSG);

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) throw new Error(INVALID_MSG);

  const token = signToken({ userId: user.id, email: user.email, name: user.name });
  return { token, user };
}