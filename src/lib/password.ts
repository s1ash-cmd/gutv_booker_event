import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);

export async function hashPassword(password: string, salt: string) {
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt:${derived.toString("base64")}`;
}

export async function verifyPassword(
  password: string,
  salt: string,
  hash: string,
) {
  const actual = hash.startsWith("scrypt:")
    ? await hashPassword(password, salt)
    : crypto
        .createHash("sha256")
        .update(password + salt)
        .digest("base64");
  const a = Buffer.from(actual);
  const b = Buffer.from(hash);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
