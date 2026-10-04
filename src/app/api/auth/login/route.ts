import { type NextRequest, NextResponse } from "next/server";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/profileValidation";
import { authRateLimit } from "@/lib/rateLimit";
import { readJson } from "@/lib/requestValidation";
import { routeError } from "@/lib/routeError";
import { createSession } from "@/services/sessionService";
import { UserService } from "@/services/userService";
export async function POST(request: NextRequest) {
  try {
    const body = loginSchema.parse(await readJson(request));
    const limited = await authRateLimit(
      `login:${body.login.toLowerCase()}`,
      15,
    );
    if (limited) return limited;
    const globalLimit = await authRateLimit("login-global", 300);
    if (globalLimit) return globalLimit;
    const user = await new UserService().getByLogin(body.login);
    let valid = false;
    if (user)
      valid = await verifyPassword(body.password, user.salt, user.passwordHash);
    else await hashPassword(body.password, "dummy-auth-salt");
    if (!user || !valid || user.banned)
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 },
      );
    if (!user.passwordHash.startsWith("scrypt:"))
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(body.password, user.salt) },
      });
    return NextResponse.json(
      await createSession(user, request.headers.get("user-agent")),
    );
  } catch (error) {
    return routeError(error);
  }
}
