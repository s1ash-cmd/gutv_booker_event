import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tokenHash } from "@/services/sessionService";
// Shared SQLite counters work across workers; untrusted forwarding headers cannot bypass them.
export async function authRateLimit(identity: string, limit: number) {
  const now = new Date();
  const key = tokenHash(identity);
  const resetsAt = new Date(Date.now() + 15 * 60000);
  const count = await prisma.$transaction(async (tx) => {
    await tx.authRateLimit.deleteMany({ where: { resetsAt: { lte: now } } });
    return tx.authRateLimit.upsert({
      where: { key },
      create: { key, count: 1, resetsAt },
      update: { count: { increment: 1 } },
    });
  });
  return count.count > limit
    ? NextResponse.json(
        { error: "Слишком много попыток. Повторите позже." },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              Math.ceil((count.resetsAt.getTime() - now.getTime()) / 1000),
            ),
          },
        },
      )
    : null;
}
