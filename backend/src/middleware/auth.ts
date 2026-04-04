import jwt from "jsonwebtoken";

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
}

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export async function getUser(authHeader: string): Promise<JwtPayload | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function requireAuth(context: { user: JwtPayload | null }): JwtPayload {
  if (!context.user) throw new Error("UNAUTHENTICATED: You must be logged in.");
  return context.user;
}