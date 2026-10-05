// Test-only D1 stand-in on node:sqlite: applies the real migrations/*.sql in order, enforces foreign keys (as D1
// always does) and implements the slice of the D1 API the Worker uses: prepare().bind().first/all/run and batch()
// (atomic, like D1). Lets the API be tested end to end without a network or a Cloudflare account.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';

const MIGRATIONS = path.resolve(import.meta.dirname, '..', '..', 'migrations');

class Stmt {
  constructor(readonly db: DatabaseSync, readonly sql: string, readonly args: SQLInputValue[] = []) {}
  bind(...args: unknown[]) { return new Stmt(this.db, this.sql, args as SQLInputValue[]); }
  async first<T>(col?: string): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.args) as Record<string, unknown> | undefined;
    if (!row) return null;
    return (col ? row[col] : row) as T;
  }
  async all<T>() { return this.exec() as { results: T[]; success: true; meta: Record<string, unknown> }; }
  async run() { return this.exec(); }
  exec() {
    const st = this.db.prepare(this.sql);
    const returnsRows = /^\s*(SELECT|WITH|PRAGMA)\b/i.test(this.sql) || /\bRETURNING\b/i.test(this.sql);
    if (returnsRows) return { results: st.all(...this.args), success: true as const, meta: {} };
    const r = st.run(...this.args);
    return { results: [], success: true as const, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
  }
}

export function createTestD1(migrations = fs.readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort()) {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const f of migrations) db.exec(fs.readFileSync(path.join(MIGRATIONS, f), 'utf8'));
  const d1 = {
    prepare: (sql: string) => new Stmt(db, sql),
    async batch(stmts: Stmt[]) {
      db.exec('BEGIN');
      try {
        const out = stmts.map(s => s.exec());
        db.exec('COMMIT');
        return out;
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
    },
    async exec(sql: string) { db.exec(sql); return { count: 0, duration: 0 }; },
  };
  return { d1: d1 as unknown as D1Database, raw: db };
}
