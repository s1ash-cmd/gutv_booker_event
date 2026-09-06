import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/authUtils";
import { EventService } from "@/services/eventService";

const service = new EventService();
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getUserFromToken(request);
    const { id } = await params;
    const body = await request.json();
    return NextResponse.json(
      await service.updateContentList(Number(id), body?.contentList, user),
    );
  } catch (error) {
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
