import { type NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/app/models/user/user";
import { getUserFromToken, requireRole } from "@/lib/authUtils";
import {
  adminComment,
  InputError,
  readJson,
  routeId,
} from "@/lib/requestValidation";
import { routeError } from "@/lib/routeError";
import { EventService } from "@/services/eventService";

const eventService = new EventService();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromToken(request);
    requireRole(user.role, UserRole.Admin);
    const { id: idParam } = await params;
    const id = routeId(idParam);
    const body = (await readJson(request)) as {
      adminComment?: unknown;
    };
    return NextResponse.json(
      await eventService.cancelEvent(
        id,
        adminComment(body?.adminComment),
        user,
      ),
    );
  } catch (error) {
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
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
