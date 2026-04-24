import { AuthService } from "@/services/authService";

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is not set`);
  }

  return value;
}

export const authService = new AuthService({
  key: getRequiredEnv("JWT_SECRET"),
  issuer: getRequiredEnv("JWT_ISSUER"),
  audience: getRequiredEnv("JWT_AUDIENCE"),
  expireMinutes: Number.parseInt(getRequiredEnv("JWT_EXPIRE_MINUTES"), 10),
});
