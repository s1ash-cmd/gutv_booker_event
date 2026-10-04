import { type NextRequest, NextResponse } from "next/server";
import { registrationSchema } from "@/lib/profileValidation";
import { authRateLimit } from "@/lib/rateLimit";
import { readJson } from "@/lib/requestValidation";
import { routeError } from "@/lib/routeError";
import { UserService } from "@/services/userService";
export async function POST(request: NextRequest) {
  try {
    const limited = await authRateLimit("register", 20);
    if (limited) return limited;
    const body = registrationSchema.parse(await readJson(request));
    const user = await new UserService().createUser(body);
    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Пользователь с таким логином уже существует" ||
        ("code" in error && error.code === "P2002"))
    )
      return NextResponse.json(
        { error: "Пользователь с таким логином уже существует" },
        { status: 409 },
      );
    return routeError(error);
  }
}
