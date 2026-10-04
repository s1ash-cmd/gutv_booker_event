import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/authUtils";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromToken(request);
    const { id } = await params;
    const result = await prisma.userSession.updateMany({
      where: { id, userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (!result.count)
      return NextResponse.json({ error: "Сессия не найдена" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError(error);
  }
}
