const assert = require("node:assert/strict");
const fs = require("node:fs");
const Database = require("better-sqlite3");
const db = new Database(":memory:");
for (const dir of fs
  .readdirSync("prisma/migrations")
  .filter((name) => name.startsWith("20") && name < "20261004120000")
  .sort())
  db.exec(fs.readFileSync(`prisma/migrations/${dir}/migration.sql`, "utf8"));
const user = db.prepare(
  "INSERT INTO Users (id,login,passwordHash,salt,name,role,refreshToken) VALUES (?,?,'old-hash','salt','Old name',4,'old-refresh')",
);
user.run(1, "with-details");
user.run(2, "legacy");
user.run(3, "damaged");
const insert = db.prepare(
  "INSERT INTO Events (userId,client,reason,creationTime,status,startTime,endTime,warningsJson,detailsJson) VALUES (?,'Client','Reason',?,0,1,2,'{}',?)",
);
const snapshot = {
  organization: "Организация",
  representativeName: "Фамилия Имя Отчество",
  representativeContacts: "@contact",
};
insert.run(
  1,
  1,
  JSON.stringify({ ...snapshot, organization: "Old organization" }),
);
insert.run(1, 2, JSON.stringify(snapshot));
insert.run(2, 1, null);
insert.run(3, 1, "{broken JSON");
const previousEvents = db.prepare("SELECT * FROM Events").all();
db.exec(
  fs.readFileSync(
    "prisma/migrations/20261004120000_profiles_sessions/migration.sql",
    "utf8",
  ),
);
const migrated = db.prepare("SELECT * FROM Users WHERE id=1").get();
assert.equal(migrated.organization, snapshot.organization);
assert.equal(migrated.name, snapshot.representativeName);
assert.equal(migrated.representativeContacts, snapshot.representativeContacts);
assert.equal(migrated.passwordHash, "old-hash");
assert.equal(migrated.refreshToken, null);
for (const id of [2, 3]) {
  const row = db.prepare("SELECT * FROM Users WHERE id=?").get(id);
  assert.equal(row.name, "Old name");
  assert.equal(row.organization, "");
}
assert.deepEqual(
  db
    .prepare("SELECT * FROM Events")
    .all()
    .map(({ searchText, ...event }) => event),
  previousEvents,
);
db.close();
console.log(
  "Profile migration passed: latest details recovered; legacy/damaged records and existing events preserved.",
);
