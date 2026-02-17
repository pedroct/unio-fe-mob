import crypto from "crypto";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { authSessions, users } from "@shared/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "unio-jwt-dev-secret-change-in-prod";
const ACCESS_TOKEN_EXPIRY = "10m";
const REFRESH_TOKEN_DAYS = 14;

export interface JwtPayload {
  userId: string;
  tokenVersion: number;
}

export function generateAccessToken(userId: string, tokenVersion: number): string {
  return jwt.sign({ userId, tokenVersion } as JwtPayload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createAuthSession(
  userId: string,
  refreshToken: string,
  ip: string | undefined,
  userAgent: string | undefined
) {
  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  const [session] = await db
    .insert(authSessions)
    .values({ userId, tokenHash, expiresAt, ip, userAgent })
    .returning();

  return session;
}

export async function findValidSession(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  const [session] = await db
    .select()
    .from(authSessions)
    .where(
      and(
        eq(authSessions.tokenHash, tokenHash),
        isNull(authSessions.revokedAt)
      )
    );

  if (!session) return null;
  if (session.expiresAt < new Date()) return null;

  return session;
}

export async function rotateRefreshToken(
  oldSession: typeof authSessions.$inferSelect,
  newRefreshToken: string,
  ip: string | undefined,
  userAgent: string | undefined
) {
  const newTokenHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000);

  return await db.transaction(async (tx) => {
    await tx
      .update(authSessions)
      .set({ revokedAt: new Date() })
      .where(eq(authSessions.id, oldSession.id));

    const [newSession] = await tx
      .insert(authSessions)
      .values({
        userId: oldSession.userId,
        tokenHash: newTokenHash,
        expiresAt,
        ip,
        userAgent,
      })
      .returning();

    return newSession;
  });
}

export async function revokeSession(refreshToken: string) {
  const tokenHash = hashToken(refreshToken);
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.tokenHash, tokenHash), isNull(authSessions.revokedAt)));
}

export async function revokeAllUserSessions(userId: string) {
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)));
}

export async function incrementTokenVersion(userId: string): Promise<number> {
  const [updated] = await db
    .update(users)
    .set({ tokenVersion: sql`${users.tokenVersion} + 1` })
    .where(eq(users.id, userId))
    .returning({ tokenVersion: users.tokenVersion });
  return updated.tokenVersion;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de acesso ausente." });
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyAccessToken(token);
    (req as any).userId = payload.userId;
    (req as any).tokenVersion = payload.tokenVersion;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expirado.", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Token inválido.", code: "TOKEN_INVALID" });
  }
}

export async function validateTokenVersion(req: Request, res: Response, next: NextFunction) {
  const userId = (req as any).userId;
  const tokenVersion = (req as any).tokenVersion;

  const [user] = await db
    .select({ tokenVersion: users.tokenVersion })
    .from(users)
    .where(eq(users.id, userId));

  if (!user || user.tokenVersion !== tokenVersion) {
    return res.status(401).json({ error: "Sessão revogada.", code: "SESSION_REVOKED" });
  }

  next();
}

export function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/auth/refresh",
  });
}

export function getClientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
}
