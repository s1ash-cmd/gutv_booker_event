import { type NextRequest, NextResponse } from "next/server";
import { getUserFromToken } from "@/lib/authUtils";
import { prisma } from "@/lib/prisma";
import { profileSchema } from "@/lib/profileValidation";
import { readJson } from "@/lib/requestValidation";
import { routeError } from "@/lib/routeError";
import { UserService } from "@/services/userService";
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const profile = profileSchema.parse(await readJson(request));
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: profile,
    });
    return NextResponse.json(UserService.userToResponseDto(updated));
  } catch (error) {
    return routeError(error);
  }
}
