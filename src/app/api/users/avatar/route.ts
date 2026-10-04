import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getUserFromToken } from "@/lib/authUtils";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { UserService } from "@/services/userService";
export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    if (Number(request.headers.get("content-length")) > 5 * 1024 * 1024)
      return NextResponse.json(
        { error: "Фото: не более 5 МБ" },
        { status: 413 },
      );
    // Stream cap prevents memory exhaustion even without a Content-Length header.
    const reader = request.body?.getReader();
    if (!reader)
      return NextResponse.json({ error: "Выберите фото" }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 5 * 1024 * 1024) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Фото: не более 5 МБ" },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    let image: Buffer;
    try {
      const source = sharp(Buffer.concat(chunks), {
        limitInputPixels: 20000000,
        animated: false,
      });
      const meta = await source.metadata();
      if (!["jpeg", "png", "webp"].includes(meta.format ?? ""))
        throw new Error("format");
      image = await source
        .rotate()
        .resize(512, 512, { fit: "cover" })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      return NextResponse.json(
        { error: "Выберите корректное фото JPG, PNG или WebP" },
        { status: 400 },
      );
    }
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: `data:image/webp;base64,${image.toString("base64")}` },
    });
    return NextResponse.json(UserService.userToResponseDto(updated));
  } catch (error) {
    return routeError(error);
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    return NextResponse.json(
      UserService.userToResponseDto(
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: null },
        }),
      ),
    );
  } catch (error) {
    return routeError(error);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    return NextResponse.json(
      UserService.userToResponseDto(
        await prisma.user.update({
          where: { id: user.id },
          data: { avatarUrl: null, avatarSeed: crypto.randomUUID() },
        }),
      ),
    );
  } catch (error) {
    return routeError(error);
  }
}
