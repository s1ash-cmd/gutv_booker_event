import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { InputError } from "@/lib/requestValidation";
export function routeError(error: unknown) {
  if (
    error instanceof ZodError ||
    error instanceof SyntaxError ||
    error instanceof InputError
  )
    return NextResponse.json(
      {
        error:
          error instanceof ZodError
            ? error.issues[0]?.message
            : error instanceof InputError
              ? error.message
              : "Некорректный JSON",
      },
      { status: 400 },
    );
  if (
    error instanceof Error &&
    ["Unauthorized", "Invalid token"].includes(error.message)
  )
    return NextResponse.json({ error: "Войдите в аккаунт" }, { status: 401 });
  if (error instanceof Error && error.message === "Forbidden")
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    error.code === "P2025"
  )
    return NextResponse.json(
      { error: "Данные изменились. Обновите страницу." },
      { status: 409 },
    );
  console.error(
    "API operation failed",
    error instanceof Error ? error.name : "Unknown error",
  );
  return NextResponse.json(
    { error: "Не удалось выполнить запрос" },
    { status: 500 },
  );
}
