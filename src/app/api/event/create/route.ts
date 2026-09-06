import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/authUtils";
import { EventService, EventValidationError } from "@/services/eventService";

const eventService = new EventService();

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const body = await request.json();
    const event = await eventService.createEvent(body, user);
    return NextResponse.json(event);
  } catch (error) {
    if (error instanceof EventValidationError)
      return NextResponse.json(
        { error: error.message, fields: error.fields },
        { status: 400 },
      );
    if (error instanceof Error && error.name.startsWith("Prisma")) {
      console.error("Failed to create event", error);
      return NextResponse.json(
        {
          error:
            "Не удалось сохранить заявку. Попробуйте позже или свяжитесь с командой ГУТВ.",
        },
        { status: 500 },
      );
    }
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
