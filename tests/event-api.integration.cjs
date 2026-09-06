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
  try {
    for (let id = 1; id <= 4; id++)
      tokens[id] = await new SignJWT({
        role: id === 3 ? "Admin" : "Organization",
      })
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(String(id))
        .setIssuer("integration")
        .setAudience("integration")
        .setExpirationTime("30m")
        .sign(new TextEncoder().encode(env.JWT_SECRET));
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
    await request("create", { id: 4, method: "POST", body, status: 400 });
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
    console.log(
      "API integration passed: four request types, multi-session persistence, legacy records, deadlines, permissions, content-list updates and moderation.",
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
