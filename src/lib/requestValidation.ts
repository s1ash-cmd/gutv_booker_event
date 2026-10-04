import type { NextRequest } from "next/server";
export class InputError extends Error {}
export function routeId(value: string) {
  const id = /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(id) || id < 1)
    throw new InputError("Некорректный идентификатор");
  return id;
}
export async function readJson(request: NextRequest): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError("Missing JSON");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 256 * 1024) {
      await reader.cancel();
      throw new SyntaxError("JSON exceeds limit");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export function adminComment(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > 20000)
    throw new InputError("Комментарий: не более 20 000 символов");
  return value.trim() || null;
}
