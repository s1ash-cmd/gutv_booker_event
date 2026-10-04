import { type NextRequest, NextResponse } from "next/server";
import { refreshSchema } from "@/lib/profileValidation";
import { readJson } from "@/lib/requestValidation";
import { routeError } from "@/lib/routeError";
import { refreshSession } from "@/services/sessionService";
export async function POST(request: NextRequest) {
  try {
    const body = refreshSchema.parse(await readJson(request));
    return NextResponse.json(await refreshSession(body.refreshToken));
  } catch (error) {
    return routeError(error);
  }
}
