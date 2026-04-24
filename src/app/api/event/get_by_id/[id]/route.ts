import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/authUtils";
import { EventService } from "@/services/eventService";

const eventService = new EventService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromToken(request);
    const { id: idParam } = await params;
    const id = Number.parseInt(idParam, 10);

    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "Некорректный ID" }, { status: 400 });
    }

    return NextResponse.json(await eventService.getEventById(id, user));
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Unauthorized" ||
        error.message === "Invalid token"
      ) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      const status = error.message.includes("не найден") ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
