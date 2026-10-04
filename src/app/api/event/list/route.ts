import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@/app/models/user/user";
import { getUserFromToken, requireRole } from "@/lib/authUtils";
import { routeId } from "@/lib/requestValidation";
import { routeError } from "@/lib/routeError";
import { EventService } from "@/services/eventService";

const paramsSchema = z.object({
  scope: z.enum(["my", "all", "user"]).default("my"),
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(["all", "Pending", "Cancelled", "Approved", "Completed"])
    .default("all"),
  query: z.string().max(200).default(""),
  sort: z.enum(["createdAsc", "createdDesc"]).default("createdDesc"),
  userId: z.string().optional(),
});
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const params = paramsSchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );
    if (params.scope !== "my") requireRole(user.role, UserRole.Admin);
    const userId =
      params.scope === "my"
        ? user.id
        : params.scope === "user"
          ? routeId(params.userId ?? "")
          : undefined;
    return NextResponse.json(
      await new EventService().listEvents({
        ...params,
        userId,
        status: params.status === "all" ? undefined : params.status,
      }),
    );
  } catch (error) {
    return routeError(error);
  }
}
