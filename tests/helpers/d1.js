/* Simulation de D1 avec le SQLite intégré à Node : exécute le vrai SQL des migrations et du code. */
const fs = require("fs"), path = require("path");
const { DatabaseSync } = require("node:sqlite");
const MIGRATIONS = path.join(__dirname, "../../d1/migrations");

function createD1() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  const wrap = (sql, params = []) => ({
    bind: (...p) => wrap(sql, p),
    run: async () => { const r = db.prepare(sql).run(...params); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
    first: async () => db.prepare(sql).get(...params) || null,
    all: async () => ({ results: db.prepare(sql).all(...params), success: true }),
    _exec: () => { const r = db.prepare(sql); return /^\s*(select|with)/i.test(sql) ? { results: r.all(...params), meta: { changes: 0 } } : { results: [], meta: { changes: Number(r.run(...params).changes) } }; },
  });
  return {
    _db: db,
    prepare: (sql) => wrap(sql),
    exec: async (sql) => { db.exec(sql); },
    batch: async (stmts) => { db.exec("BEGIN"); try { const out = stmts.map((s) => s._exec()); db.exec("COMMIT"); return out; } catch (e) { db.exec("ROLLBACK"); throw e; } },
  };
}
function migrated() {
  const d = createD1();
  for (const f of fs.readdirSync(MIGRATIONS).filter((x) => x.endsWith(".sql")).sort()) d._db.exec(fs.readFileSync(path.join(MIGRATIONS, f), "utf8"));
  return d;
}
module.exports = { createD1, migrated, MIGRATIONS };
