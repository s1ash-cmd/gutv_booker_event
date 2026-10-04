const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawn } = require("node:child_process");
const Database = require("better-sqlite3");

async function main() {
  const { SignJWT } = await import("jose");
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "gutv-event-test-"));
  const databasePath = path.join(temporary, "test.db");
  const db = new Database(databasePath);
  for (const migration of fs
    .readdirSync("prisma/migrations")
    .filter((name) => name.startsWith("20"))
    .sort())
    db.exec(
      fs.readFileSync(`prisma/migrations/${migration}/migration.sql`, "utf8"),
    );
  const insertUser = db.prepare(
    "INSERT INTO Users (id,login,passwordHash,salt,name,role,banned) VALUES (?,?,'test','test',?,?,?)",
  );
  insertUser.run(1, "owner", "Test owner", 4, 0);
  insertUser.run(2, "other", "Other owner", 4, 0);
  insertUser.run(3, "admin", "Test admin", 3, 0);
  insertUser.run(4, "banned", "Banned owner", 4, 1);
  db.prepare(
    "INSERT INTO Events (userId,client,reason,creationTime,status,startTime,endTime,warningsJson) VALUES (1,'Legacy','Legacy request',?,0,?,?,'{}')",
  ).run(Date.now(), Date.now() + 86400000, Date.now() + 172800000);
  const secret = crypto.randomBytes(32);
  const port = 3198;
  const env = {
    ...process.env,
    DATABASE_URL: `file:${databasePath}`,
    JWT_SECRET: secret.toString("hex"),
    JWT_ISSUER: "integration",
    JWT_AUDIENCE: "integration",
    JWT_EXPIRE_MINUTES: "30",
  };
  const server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", String(port)],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let logs = "";
  server.stdout.on("data", (d) => {
    logs += d;
  });
  server.stderr.on("data", (d) => {
    logs += d;
  });
  const tokens = {};
  db.prepare(
    "UPDATE Users SET organization=?, representativeContacts=?, name=? WHERE id=1",
  ).run("Test faculty", "@test", "Test person");
  try {
    for (let id = 1; id <= 4; id++) {
      const sessionId = crypto.randomUUID();
      db.prepare(
        "INSERT INTO UserSession (id,userId,refreshTokenHash,createdAt,lastUsedAt,expiresAt) VALUES (?,?,?,?,?,?)",
      ).run(
        sessionId,
        id,
        crypto.randomBytes(32).toString("hex"),
        new Date().toISOString(),
        new Date().toISOString(),
        new Date(Date.now() + 7 * 86400000).toISOString(),
      );
      tokens[id] = await new SignJWT({
        sid: sessionId,
        role: id === 3 ? "Admin" : "Organization",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(String(id))
        .setIssuer("integration")
        .setAudience("integration")
        .setExpirationTime("30m")
        .sign(new TextEncoder().encode(env.JWT_SECRET));
    }
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try {
        const r = await fetch(`http://localhost:${port}/`);
        if (r.ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 150));
    }
    assert.ok(ready, logs);
    const request = async (
      route,
      { id = 1, method = "GET", body, status = 200 } = {},
    ) => {
      const response = await fetch(
        `http://localhost:${port}/api/event/${route}`,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            ...(id ? { Authorization: `Bearer ${tokens[id]}` } : {}),
          },
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );
      const result = await response.json();
      assert.equal(response.status, status, JSON.stringify(result));
      return result;
    };
    const date = (days) => new Date(Date.now() + days * 86400000).toISOString();
    const details = {
      requestType: "coverage",
      organization: "Test faculty",
      representativeName: "Test person",
      representativeContacts: "@test",
      sessions: [
        { startTime: date(40), endTime: date(41), location: "Hall" },
        { startTime: date(43), endTime: date(44), location: "Park" },
      ],
      scenario: "Opening\nInterview\nClosing",
      participants: "5–10",
      crew: {
        videoEngineer: 0,
        operator: 0,
        editor: 0,
        sound: 0,
        photographer: 0,
        lighting: 0,
      },
      contentIdea: "",
      contentList: "",
      deliveryDeadline: "",
      rulesAccepted: true,
    };
    const body = {
      reason: "Integration request",
      comment: "Notes",
      startTime: date(1),
      endTime: date(2),
      details,
    };
    const created = await request("create", { method: "POST", body });
    assert.deepEqual(created.details, details);
    assert.equal(created.startTime, details.sessions[0].startTime);
    assert.equal(created.endTime, details.sessions[1].endTime);
    const read = await request(`get_by_id/${created.id}`);
    assert.deepEqual(read.details, details);
    assert.equal(read.clientId, 1);
    assert.equal((await request("get_my")).length, 2);
    assert.equal((await request("get_by_id/1")).details, null);
    await request(`get_by_id/${created.id}`, { id: 2, status: 400 });
    await request("create", { id: 0, method: "POST", body, status: 401 });
    await request("create", { id: 4, method: "POST", body, status: 401 });
    const invalid = await request("create", {
      method: "POST",
      body: {
        ...body,
        details: {
          ...details,
          sessions: [{ ...details.sessions[0], startTime: date(2) }],
        },
      },
      status: 400,
    });
    assert.ok(invalid.fields["sessions.0.startTime"]);
    await request("create", {
      method: "POST",
      body: { ...body, details: { ...details, rulesAccepted: false } },
      status: 400,
    });
    for (const requestType of ["content", "combined"]) {
      const input = {
        ...body,
        details: {
          ...details,
          requestType,
          deliveryDeadline: date(60).slice(0, 10),
        },
      };
      assert.equal(
        (await request("create", { method: "POST", body: input })).details
          .requestType,
        requestType,
      );
    }
    const trip = await request("create", {
      method: "POST",
      body: {
        ...body,
        details: {
          ...details,
          requestType: "trip",
          sessions: [
            {
              startTime: date(100),
              endTime: date(103),
              location: "Training base",
            },
          ],
          scenario: "",
          participants: "",
          crew: { ...details.crew, operator: 2, videoEngineer: 1 },
          contentIdea: "Report and photos",
        },
      },
    });
    assert.ok(trip.warnings.contentListMissing);
    await request(`content_list/${trip.id}`, {
      id: 2,
      method: "PATCH",
      body: { contentList: "Unauthorized" },
      status: 400,
    });
    const filled = await request(`content_list/${trip.id}`, {
      method: "PATCH",
      body: { contentList: "Intro\nFinal video\nPhotos" },
    });
    assert.equal(filled.details.contentList, "Intro\nFinal video\nPhotos");
    assert.equal(filled.warnings.contentListMissing, undefined);
    const lateDetails = {
      ...filled.details,
      sessions: [
        { startTime: date(20), endTime: date(21), location: "Training base" },
      ],
    };
    db.prepare("UPDATE Events SET detailsJson=? WHERE id=?").run(
      JSON.stringify(lateDetails),
      trip.id,
    );
    assert.ok(
      (
        await request(`content_list/${trip.id}`, {
          id: 3,
          method: "PATCH",
          body: { contentList: "Updated list" },
        })
      ).warnings.contentListLate,
    );
    await request(`approve/${created.id}`, {
      id: 3,
      method: "PATCH",
      body: { adminComment: "Approved" },
    });
    assert.equal(
      (await request(`complete/${created.id}`, { id: 3, method: "PATCH" }))
        .status,
      "Completed",
    );
    await request(`cancel/${trip.id}`, {
      id: 3,
      method: "PATCH",
      body: { adminComment: "Cancelled" },
    });
    await request(`content_list/${trip.id}`, {
      method: "PATCH",
      body: { contentList: "Too late" },
      status: 400,
    });
    // Exercise real account/session routes, without touching the working database.
    const api = async (
      route,
      { token, method = "GET", body, status = 200, headers = {} } = {},
    ) => {
      const response = await fetch(`http://localhost:${port}/api/${route}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...headers,
        },
        ...(body !== undefined
          ? {
              body:
                typeof body === "string" || Buffer.isBuffer(body)
                  ? body
                  : JSON.stringify(body),
            }
          : {}),
      });
      const result = await response.json();
      assert.equal(
        response.status,
        status,
        `${route}: ${JSON.stringify(result)}`,
      );
      return result;
    };
    const registration = {
      login: "new-user",
      password: "Password-123",
      name: "Иванов Иван Иванович",
      organization: "Совет студентов",
      representativeContacts: "@ivanov",
    };
    await api("users/create", {
      method: "POST",
      body: { ...registration, organization: "" },
      status: 400,
    });
    await api("users/create", {
      method: "POST",
      body: { ...registration, password: 123456789 },
      status: 400,
    });
    const account = await api("users/create", {
      method: "POST",
      body: { ...registration, role: 3 },
      status: 201,
    });
    assert.equal(account.role, "Organization");
    assert.equal(account.organization, registration.organization);
    assert.ok(!("passwordHash" in account));
    assert.ok(
      db
        .prepare("SELECT passwordHash FROM Users WHERE id=?")
        .get(account.id)
        .passwordHash.startsWith("scrypt:"),
    );
    await api("users/create", {
      method: "POST",
      body: registration,
      status: 409,
    });
    await api("auth/login", {
      method: "POST",
      body: { login: null, password: [] },
      status: 400,
    });
    await api("auth/login", {
      method: "POST",
      body: { login: registration.login, password: "wrongpass" },
      status: 401,
    });
    const login = () =>
      api("auth/login", { method: "POST", body: registration });
    const deviceA = await login();
    const deviceB = await login();
    const devices = await api("auth/sessions", { token: deviceA.accessToken });
    assert.equal(devices.length, 2);
    assert.equal(devices.filter((s) => s.isCurrent).length, 1);
    assert.ok(devices.every((s) => !("refreshTokenHash" in s)));
    assert.ok(
      !db
        .prepare("SELECT 1 FROM UserSession WHERE refreshTokenHash=?")
        .get(deviceA.refreshToken),
    );
    const rotatedA = await api("auth/refresh", {
      method: "POST",
      body: { refreshToken: deviceA.refreshToken },
    });
    await api("auth/refresh", {
      method: "POST",
      body: { refreshToken: deviceA.refreshToken },
      status: 401,
    });
    await api("users/get_me", { token: deviceB.accessToken });
    const foreign = (await api("auth/sessions", { token: tokens[2] }))[0];
    await api(`auth/sessions/${foreign.id}`, {
      method: "DELETE",
      token: deviceB.accessToken,
      status: 404,
    });
    const revoked = (
      await api("auth/sessions", { token: deviceB.accessToken })
    ).find((s) => !s.isCurrent);
    await api(`auth/sessions/${revoked.id}`, {
      method: "DELETE",
      token: deviceB.accessToken,
    });
    await api("users/get_me", { token: rotatedA.accessToken, status: 401 });
    await api("auth/refresh", {
      method: "POST",
      body: { refreshToken: rotatedA.refreshToken },
      status: 401,
    });
    await api("users/profile", {
      method: "PATCH",
      token: deviceB.accessToken,
      body: { ...registration, organization: "Новая организация", role: 3 },
    });
    assert.equal(
      (await api("users/get_me", { token: deviceB.accessToken })).role,
      "Organization",
    );
    const withProfile = await api("event/create", {
      token: deviceB.accessToken,
      method: "POST",
      body: {
        ...body,
        details: {
          ...details,
          organization: "FORGED",
          representativeName: "FORGED",
          representativeContacts: "FORGED",
        },
      },
    });
    assert.equal(withProfile.details.organization, "Новая организация");
    assert.equal(withProfile.details.representativeName, registration.name);
    assert.equal(
      withProfile.details.representativeContacts,
      registration.representativeContacts,
    );
    await api("users/profile", {
      method: "PATCH",
      token: deviceB.accessToken,
      body: registration,
    });
    assert.equal(
      (
        await api(`event/get_by_id/${withProfile.id}`, {
          token: deviceB.accessToken,
        })
      ).details.organization,
      "Новая организация",
    );
    await api(`event/get_by_id/${withProfile.id}junk`, {
      token: deviceB.accessToken,
      status: 400,
    });
    await api("users/get_all", { token: deviceB.accessToken, status: 403 });
    const generated = await api("users/avatar", {
      token: deviceB.accessToken,
      method: "PATCH",
    });
    assert.ok(generated.avatarSeed);
    assert.equal(generated.avatarUrl, null);
    await api("users/avatar", {
      token: deviceB.accessToken,
      method: "POST",
      body: "<svg><script>alert(1)</script></svg>",
      status: 400,
    });
    const photo = await require("sharp")({
      create: { width: 8, height: 8, channels: 3, background: "#3355aa" },
    })
      .png()
      .toBuffer();
    const withPhoto = await api("users/avatar", {
      method: "POST",
      token: deviceB.accessToken,
      body: photo,
      headers: { "Content-Type": "image/png" },
    });
    assert.ok(withPhoto.avatarUrl.startsWith("data:image/webp;base64,"));
    const metadata = await require("sharp")(
      Buffer.from(withPhoto.avatarUrl.split(",")[1], "base64"),
    ).metadata();
    assert.equal(metadata.width, 512);
    assert.equal(metadata.height, 512);
    assert.equal(metadata.format, "webp");
    await api("users/avatar", { method: "DELETE", token: deviceB.accessToken });
    assert.equal(
      (await api("users/get_me", { token: deviceB.accessToken })).avatarUrl,
      null,
    );
    await api("users/avatar", {
      method: "POST",
      token: deviceB.accessToken,
      body: Buffer.alloc(5 * 1024 * 1024 + 1),
      status: 413,
    });
    // Reject oversized/malformed bodies and invalid admin input.
    await api("event/create", {
      token: deviceB.accessToken,
      method: "POST",
      body: "{broken",
      status: 400,
    });
    await api("users/profile", {
      token: deviceB.accessToken,
      method: "PATCH",
      body: JSON.stringify({ ...registration, name: "x".repeat(300000) }),
      status: 400,
    });
    await api(`event/approve/${withProfile.id}`, {
      token: tokens[3],
      method: "PATCH",
      body: { adminComment: {} },
      status: 400,
    });
    await api(`event/approve/${withProfile.id}`, {
      token: tokens[3],
      method: "PATCH",
      body: "{broken",
      status: 400,
    });
    // Concurrent moderation must not resurrect a cancelled request.
    const moderated = await request("create", { method: "POST", body });
    const moderation = await Promise.all(
      ["approve", "cancel"].map((action) =>
        fetch(`http://localhost:${port}/api/event/${action}/${moderated.id}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${tokens[3]}`,
            "Content-Type": "application/json",
          },
          body: "{}",
        }),
      ),
    );
    assert.ok(moderation.every((r) => [200, 400, 409].includes(r.status)));
    assert.equal(
      (await request(`get_by_id/${moderated.id}`)).status,
      "Cancelled",
    );
    const ownPage = await api("event/list?scope=my&pageSize=1&status=all", {
      token: deviceB.accessToken,
    });
    assert.equal(ownPage.items.length, 1);
    assert.ok(ownPage.total >= 1);
    assert.ok(ownPage.items.every((event) => event.clientId === account.id));
    const nextPage = await api(
      "event/list?scope=my&pageSize=1&page=2&status=all",
      { token: deviceB.accessToken },
    );
    assert.ok(nextPage.items.every((event) => event.clientId === account.id));
    if (ownPage.total > 1)
      assert.notEqual(nextPage.items[0].id, ownPage.items[0].id);
    const cyrillic = await api(
      `event/list?scope=my&query=${encodeURIComponent("ИВАНОВ")}`,
      { token: deviceB.accessToken },
    );
    assert.ok(cyrillic.total >= 1);
    assert.ok(
      cyrillic.items.every((event) =>
        event.details.representativeName.includes("Иванов"),
      ),
    );
    await api("event/list?scope=all", {
      token: deviceB.accessToken,
      status: 403,
    });
    await api("event/list?scope=user&userId=1", {
      token: deviceB.accessToken,
      status: 403,
    });
    await api("event/list?pageSize=101", {
      token: deviceB.accessToken,
      status: 400,
    });
    const scoped = await api(
      `event/list?scope=user&userId=${account.id}&status=all`,
      { token: tokens[3] },
    );
    assert.equal(scoped.total, ownPage.total);
    assert.ok(scoped.items.every((event) => event.clientId === account.id));
    const cancelledPage = await api("event/list?scope=all&status=Cancelled", {
      token: tokens[3],
    });
    assert.ok(
      cancelledPage.items.every((event) => event.status === "Cancelled"),
    );
    await api("auth/logout_all", {
      method: "POST",
      token: deviceB.accessToken,
    });
    await api("users/get_me", { token: deviceB.accessToken, status: 401 });
    await api("auth/refresh", {
      method: "POST",
      body: { refreshToken: deviceB.refreshToken },
      status: 401,
    });
    const bannedDevice = await login();
    await api(`users/ban/${account.id}`, { token: tokens[3], method: "PATCH" });
    await api("users/get_me", { token: bannedDevice.accessToken, status: 401 });
    await api("auth/refresh", {
      method: "POST",
      body: { refreshToken: bannedDevice.refreshToken },
      status: 401,
    });
    await api(`users/unban/${account.id}`, {
      token: tokens[3],
      method: "PATCH",
    });
    await api("users/get_me", { token: bannedDevice.accessToken, status: 401 });
    const logoutDevice = await login();
    await api("auth/logout", {
      token: logoutDevice.accessToken,
      method: "POST",
    });
    await api("users/get_me", { token: logoutDevice.accessToken, status: 401 });
    // Existing SHA-256 passwords migrate on successful authentication.
    const oldSalt = "legacy-salt";
    db.prepare("UPDATE Users SET passwordHash=?,salt=? WHERE id=2").run(
      crypto
        .createHash("sha256")
        .update(`legacy-password${oldSalt}`)
        .digest("base64"),
      oldSalt,
    );
    await api("auth/login", {
      method: "POST",
      body: { login: "other", password: "legacy-password" },
    });
    assert.ok(
      db
        .prepare("SELECT passwordHash FROM Users WHERE id=2")
        .get()
        .passwordHash.startsWith("scrypt:"),
    );
    for (let attempt = 0; attempt < 15; attempt++)
      await api("auth/login", {
        method: "POST",
        body: { login: "missing-user", password: "wrongpass" },
        status: 401,
      });
    await api("auth/login", {
      method: "POST",
      body: { login: "missing-user", password: "wrongpass" },
      status: 429,
    });
    console.log(
      "API integration passed: event types/deadlines/permissions, profile snapshots, independent devices, refresh rotation/revocation, bans, legacy passwords, avatar validation, rate limits and concurrent moderation.",
    );
  } finally {
    server.kill("SIGTERM");
    await new Promise((resolve) => server.once("exit", resolve));
    db.close();
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
