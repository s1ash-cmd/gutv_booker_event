import { AuthService } from "@/services/authService";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }

  return value;
}

const expireMinutes = Number(getRequiredEnv("JWT_EXPIRE_MINUTES"));
if (
  !Number.isInteger(expireMinutes) ||
  expireMinutes < 1 ||
  expireMinutes > 1440
) {
  throw new Error("JWT_EXPIRE_MINUTES must be an integer from 1 to 1440");
}
const key = getRequiredEnv("JWT_SECRET");
if (process.env.NODE_ENV === "production" && Buffer.byteLength(key) < 32) {
  throw new Error("JWT_SECRET must contain at least 32 bytes in production");
}
export const authService = new AuthService({
  key,
  issuer: getRequiredEnv("JWT_ISSUER"),
  audience: getRequiredEnv("JWT_AUDIENCE"),
  expireMinutes,
});
