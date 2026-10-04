import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/authUtils";
import { InputError, readJson, routeId } from "@/lib/requestValidation";
import { routeError } from "@/lib/routeError";
import { EventService } from "@/services/eventService";

const service = new EventService();
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromToken(request);
    const { id } = await params;
    const body = (await readJson(request)) as Record<string, unknown>;
    return NextResponse.json(
      await service.updateContentList(routeId(id), body?.contentList, user),
    );
  } catch (error) {
    if (
      error instanceof SyntaxError ||
      error instanceof InputError ||
      (error instanceof Error && error.name.startsWith("Prisma"))
    )
      return routeError(error);
    const message =
      error instanceof Error ? error.message : "Не удалось сохранить перечень";
    return NextResponse.json(
      { error: message },
      {
        status: ["Unauthorized", "Invalid token"].includes(message) ? 401 : 400,
      },
    );
  }
}
