// Generates the logical relational schema diagrams (Information Engineering / crow's foot notation) for ZP-DOC-05
// directly from migrations/*.sql, so the diagrams can never drift from the real schema.
// Run from the repo root:  node tools/docs/schema-diagram.ts
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const OUT = path.join(ROOT, 'docs', '05-data-design', 'diagrams');
const db = new DatabaseSync(':memory:');
for (const f of fs.readdirSync(path.join(ROOT, 'migrations')).filter(f => f.endsWith('.sql')).sort())
  db.exec(fs.readFileSync(path.join(ROOT, 'migrations', f), 'utf8'));

type Col = { name: string; type: string; notnull: number; pk: number };
type Fk = { table: string; from: string; to: string };
const tables = (db.prepare(`SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all() as { name: string }[]).map(t => t.name);

const groups: Record<string, string[]> = {
  'relational-admission': ['stream', 'subject', 'stream_subject', 'district', 'institution', 'course', 'offering', 'intake_year',
    'offering_year', 'offering_year_medium', 'selection_group', 'cutoff', 'rule_node'],
  'relational-trust-journey': ['fact', 'citation', 'source_document', 'fact_revision', 'account', 'extraction_run', 'candidate_fact',
    'mistake_report', 'route', 'route_private_degree', 'route_job_exam', 'deadline', 'deadline_offering_year', 'push_subscription',
    'push_subscription_deadline'],
};
const all = new Set(Object.values(groups).flat());
const missing = tables.filter(t => !all.has(t));
if (missing.length) throw new Error(`tables not placed in a diagram: ${missing.join(', ')}`);

for (const [name, members] of Object.entries(groups)) {
  const inGroup = new Set(members);
  const lines = ['@startuml', '!pragma layout smetana', 'skinparam defaultFontName Calibri', 'skinparam defaultFontSize 12',
    'skinparam shadowing false', 'skinparam linetype ortho', 'hide circle', 'hide methods', 'hide stereotypes',
    'skinparam class {', '  BackgroundColor #FFFFFF', '  BorderColor #006B5F', '  HeaderBackgroundColor #E9F4F1', '  ArrowColor #3F4946', '}'];
  const refs = new Set<string>();
  const rels: string[] = [];          // relationships are emitted after every entity is declared
  for (const t of members) {
    const cols = db.prepare(`PRAGMA table_xinfo(${t})`).all() as (Col & { hidden: number })[];
    const fks = (db.prepare(`PRAGMA foreign_key_list(${t})`).all() as Fk[]);
    const fkCols = new Set(fks.map(f => f.from));
    lines.push(`entity ${t} {`);
    for (const c of cols.filter(c => c.pk)) lines.push(`  * <b>${c.name}</b> : ${c.type || 'INTEGER'}${fkCols.has(c.name) ? ' <<FK>>' : ''}`);
    lines.push('  --');
    for (const c of cols.filter(c => !c.pk)) {
      const gen = c.hidden === 2 || c.hidden === 3 ? ' <<generated>>' : '';
      lines.push(`  ${c.notnull ? '* ' : ''}${c.name} : ${c.type}${fkCols.has(c.name) ? ' <<FK>>' : ''}${gen}`);
    }
    lines.push('}');
    for (const f of fks) {
      const target = f.table;
      if (!inGroup.has(target)) refs.add(target);
      const fromCol = cols.find(c => c.name === f.from)!;
      const optional = !fromCol.notnull && !fromCol.pk;
      // crow's foot: many children to one (or zero-or-one) parent
      const key = `${t}->${target}:${f.from}`;
      if (!refs.has(key)) { refs.add(key); rels.push(`${target} ${optional ? '|o' : '||'}--o{ ${t} : ${f.from}`); }
    }
  }
  for (const r of refs) if (!r.includes('->') && !inGroup.has(r)) lines.push(`entity ${r} #F3F8F6 {\n  (see other diagram)\n}`);
  lines.push(...rels, '@enduml');
  fs.writeFileSync(path.join(OUT, `${name}.puml`), lines.join('\n') + '\n');
  console.log(`${name}.puml: ${members.length} tables`);
}
