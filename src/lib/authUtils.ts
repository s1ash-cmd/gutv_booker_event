import type { NextRequest } from "next/server";
import { UserRole } from "@/app/models/user/user";
import { authService } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getUserFromToken(request: NextRequest) {
  const token = request.headers.get("authorization")?.split(" ")[1];

  if (!token) {
    throw new Error("Unauthorized");
  }

  try {
    const payload = await authService.verifyToken(token);
    const userId = Number.parseInt(String(payload.sub ?? ""), 10);

    if (!Number.isFinite(userId) || userId <= 0) {
      throw new Error("Invalid token");
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    const roleName = UserRole[currentUser.role];

    return {
      id: currentUser.id,
      role: currentUser.role,
      roleName,
      login: currentUser.login,
      name: currentUser.name,
    };
  } catch (error: unknown) {
    console.error(
      "Token verification error:",
      error instanceof Error ? error.message : error,
    );
    throw new Error("Invalid token");
  }
}

export async function getUserIdFromToken(
  request: NextRequest,
): Promise<number> {
  const user = await getUserFromToken(request);
  return user.id;
}

export async function isAdmin(request: NextRequest): Promise<boolean> {
  try {
    const user = await getUserFromToken(request);
    return user.roleName === "Admin";
  } catch {
    return false;
  }
}

export function requireRole(userRole: number, requiredRole: UserRole) {
  if (userRole !== requiredRole) {
    throw new Error("Forbidden");
  }
}
