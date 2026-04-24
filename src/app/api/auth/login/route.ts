import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import type { LoginRequest } from "@/app/models/auth/auth";
import { authService } from "@/lib/auth";
import { UserService } from "@/services/userService";

const userService = new UserService();

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();

    const user = await userService.getByLogin(body.login);

    if (!user) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 },
      );
    }

    const passwordHash = crypto
      .createHash("sha256")
      .update(body.password + user.salt)
      .digest("base64");

    if (passwordHash !== user.passwordHash) {
      return NextResponse.json(
        { error: "Неверный логин или пароль" },
        { status: 401 },
      );
    }

    if (user.banned) {
      return NextResponse.json(
        { error: "Пользователь заблокирован" },
        { status: 401 },
      );
    }

    const accessToken = await authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken();

    await userService.saveRefreshToken(user.id, refreshToken);

    return NextResponse.json({
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
