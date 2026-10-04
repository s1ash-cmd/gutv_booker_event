import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/authUtils";
import { InputError, readJson } from "@/lib/requestValidation";
import { routeError } from "@/lib/routeError";
import { EventService, EventValidationError } from "@/services/eventService";

const eventService = new EventService();

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const body = (await readJson(request)) as Record<string, unknown>;
    const event = await eventService.createEvent(
      body as unknown as import("@/app/models/event/event").CreateEventRequestDto,
      user,
    );
    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof EventValidationError)
      return NextResponse.json(
        { error: error.message, fields: error.fields },
        { status: 400 },
      );
    if (
      error instanceof SyntaxError ||
      error instanceof InputError ||
      (error instanceof Error && error.name.startsWith("Prisma"))
    )
      return routeError(error);
    if (error instanceof Error) {
      if (
        error.message === "Unauthorized" ||
        error.message === "Invalid token"
      ) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
