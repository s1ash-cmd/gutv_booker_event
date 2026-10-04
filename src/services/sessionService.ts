import crypto from "node:crypto";
import type { User } from "@/generated/prisma/client";
import { authService } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export const tokenHash = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");
const expiry = () => new Date(Date.now() + 7 * 86400000);

export async function createSession(user: User, userAgent: string | null) {
  const refreshToken = authService.generateRefreshToken();
  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({ where: { id: user.id } });
    if (!current || current.banned) throw new Error("Unauthorized");
    const session = await tx.userSession.create({
      data: {
        userId: current.id,
        refreshTokenHash: tokenHash(refreshToken),
        expiresAt: expiry(),
        userAgent: userAgent?.slice(0, 500),
      },
    });
    return {
      accessToken: await authService.generateAccessToken(current, session.id),
      refreshToken,
    };
  });
}

export async function refreshSession(token: string) {
  const hash = tokenHash(token);
  const refreshToken = authService.generateRefreshToken();
  return prisma.$transaction(async (tx) => {
    const session = await tx.userSession.findUnique({
      where: { refreshTokenHash: hash },
      include: { user: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.banned
    )
      throw new Error("Unauthorized");
    const changed = await tx.userSession.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: hash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        refreshTokenHash: tokenHash(refreshToken),
        lastUsedAt: new Date(),
        expiresAt: expiry(),
      },
    });
    if (changed.count !== 1) throw new Error("Unauthorized");
    return {
      accessToken: await authService.generateAccessToken(
        session.user,
        session.id,
      ),
      refreshToken,
    };
  });
}
