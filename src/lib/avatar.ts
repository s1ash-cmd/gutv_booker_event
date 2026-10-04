import type { CSSProperties } from "react";
export function getAvatarGlowStyle(
  role?: string | null,
): CSSProperties & { "--avatar-glow-color": string } {
  return { "--avatar-glow-color": role === "Admin" ? "#a855f7" : "#38bdf8" };
}
export const getAvatarUrl = (
  login: string,
  role?: string,
  avatarSeed?: string | null,
  avatarUrl?: string | null,
) => {
  if (avatarUrl) return avatarUrl;
  const params = new URLSearchParams({
    seed: avatarSeed || `${login}GUtv 52`,
    size: "128",

    backgroundColor:
      role === "Admin"
        ? "e9d5ff"
        : role === "Organization"
          ? "dbeafe"
          : "d1ecf1",
  });

  return `https://api.dicebear.com/9.x/bottts-neutral/svg?${params}`;
};
