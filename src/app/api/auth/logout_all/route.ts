import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/authUtils";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    await prisma.userSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}
