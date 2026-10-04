import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/authUtils";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const sessions = await prisma.userSession.findMany({
      where: {
        userId: user.id,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastUsedAt: "desc" },
    });
    return NextResponse.json(
      sessions.map((s) => ({
        id: s.id,
        createdAt: s.createdAt,
        lastUsedAt: s.lastUsedAt,
        expiresAt: s.expiresAt,
        userAgent: s.userAgent,
        isCurrent: s.id === user.sessionId,
      })),
    );
  } catch (error) {
    return routeError(error);
  }
}
