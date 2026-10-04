ALTER TABLE "Users" ADD COLUMN "organization" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Users" ADD COLUMN "representativeContacts" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Users" ADD COLUMN "avatarSeed" TEXT;
ALTER TABLE "Users" ADD COLUMN "avatarUrl" TEXT;
CREATE TABLE "UserSession" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "userId" INTEGER NOT NULL,
 "refreshTokenHash" TEXT NOT NULL,
 "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "lastUsedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" DATETIME NOT NULL,
 "revokedAt" DATETIME,
 "userAgent" TEXT,
 CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UserSession_refreshTokenHash_key" ON "UserSession"("refreshTokenHash");
CREATE INDEX "UserSession_userId_revokedAt_idx" ON "UserSession"("userId", "revokedAt");
-- Old bearer/refresh tokens have no device identity; require a fresh login.
UPDATE "Users" SET "refreshToken" = NULL, "refreshTokenExpiryTime" = NULL;
-- Recover representative data from the most recent structured request, where available.
UPDATE "Users" SET
 "organization" = COALESCE((SELECT json_extract("detailsJson", '$.organization') FROM "Events" WHERE "userId" = "Users"."id" AND json_valid("detailsJson") ORDER BY "creationTime" DESC LIMIT 1), ''),
 "representativeContacts" = COALESCE((SELECT json_extract("detailsJson", '$.representativeContacts') FROM "Events" WHERE "userId" = "Users"."id" AND json_valid("detailsJson") ORDER BY "creationTime" DESC LIMIT 1), ''),
 "name" = COALESCE((SELECT NULLIF(json_extract("detailsJson", '$.representativeName'), '') FROM "Events" WHERE "userId" = "Users"."id" AND json_valid("detailsJson") ORDER BY "creationTime" DESC LIMIT 1), "name");
CREATE TABLE "AuthRateLimit" ("key" TEXT NOT NULL PRIMARY KEY, "count" INTEGER NOT NULL, "resetsAt" DATETIME NOT NULL);

ALTER TABLE "Events" ADD COLUMN "searchText" TEXT;
