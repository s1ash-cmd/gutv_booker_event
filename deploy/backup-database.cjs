const Database = require("better-sqlite3");
const fs = require("node:fs");
const path = require("node:path");
(async () => {
  const file = process.env.DATABASE_URL?.replace(/^file:/, "");
  if (!file || !path.isAbsolute(file)) throw new Error("Absolute SQLite path required");
  if (!fs.existsSync(file)) return;
  const directory = path.join(path.dirname(file), "backups");
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const db = new Database(file, { readonly: true });
  try {
    await db.backup(path.join(directory, `event-${new Date().toISOString().replace(/[:.]/g, "-")}.sqlite3`));
  } finally { db.close(); }
  const backups = fs.readdirSync(directory).filter(name => /^event-.*\.sqlite3$/.test(name)).sort().reverse();
  for (const name of backups.slice(14)) fs.unlinkSync(path.join(directory, name));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
