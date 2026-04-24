import { type NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/app/models/user/user";
import { getUserFromToken, requireRole } from "@/lib/authUtils";
import { EventService } from "@/services/eventService";

const eventService = new EventService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ status: string }> },
) {
  try {
    const user = await getUserFromToken(request);
    requireRole(user.role, UserRole.Admin);
    const { status } = await params;
    return NextResponse.json(await eventService.getEventsByStatus(status));
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message === "Unauthorized" ||
        error.message === "Invalid token"
      ) {
        return NextResponse.json({ error: error.message }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
