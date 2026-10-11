// Database design vs ZP-DOC-05 (Data Design): the real migrations 0001..0010 applied to an empty SQLite database
// (worker/testing/d1-sqlite.ts, foreign keys ON as D1 always has them), then checked table by table against what the
// document promises: STRICT tables, foreign keys with their ON DELETE action, CHECKs, indexes, reference counts, the
// account-deletion cascade, and the CR-006 expand-then-contract step (0009 -> 0010). Read-only on migrations/ and app code.
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestD1 } from './testing/d1-sqlite.ts';

const MIGRATIONS = path.resolve(import.meta.dirname, '..', 'migrations');
const FILES = fs.readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort();
const T = '2026-10-11T08:00:00.000Z';
const RULES = '2026-10-11';
const H = (c: string) => c.repeat(64);

type Db = DatabaseSync;
const all = (db: Db, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).all(...a) as Record<string, any>[];
const one = (db: Db, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).get(...a) as Record<string, any>;
const run = (db: Db, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).run(...a);
const count = (db: Db, table: string, where = '1', ...a: (string | number | null)[]) => Number(one(db, `SELECT count(*) AS n FROM ${table} WHERE ${where}`, ...a).n);
const tables = (db: Db) => all(db, "SELECT name, strict, wr FROM pragma_table_list WHERE schema = 'main' AND type = 'table' AND name NOT LIKE 'sqlite_%'");
const fks = (db: Db, t: string) => all(db, 'SELECT id, seq, "table" AS ref, "from", "to", on_delete FROM pragma_foreign_key_list(?)', t);
const indexes = (db: Db, t: string) => all(db, 'SELECT name, "unique", partial FROM pragma_index_list(?)', t);

// ---- seed helpers (valid rows; every value satisfies the CHECKs)
function student(db: Db, id: number, opts: { profile?: boolean } = {}) {
  run(db, "INSERT INTO account (account_id, auth_subject, role, created_at) VALUES (?, ?, 'STUDENT', ?)", id, `local:${String(id).padStart(32, '0')}`, T);
  if (opts.profile === false) return;
  run(db, "INSERT INTO student_profile (account_id, stream_code, district_code, z_e4, updated_at) VALUES (?, 'PHYS', 'KUR', 14821, ?)", id, T);
}
function fullStudent(db: Db, id: number) {
  student(db, id);
  run(db, "INSERT INTO password_login VALUES (?, ?, ?, ?, 'PBKDF2-SHA256-600000', ?)", id, `user${id}`, 'a'.repeat(32), H('b'), T);
  run(db, "INSERT INTO session VALUES (?, ?, ?, '2027-01-01T00:00:00.000Z')", H(String(id % 10)), id, T);
  run(db, 'INSERT INTO recovery_code VALUES (?, ?, ?)', id, H('c'), T);
  run(db, "INSERT INTO student_subject VALUES (?, 1, 'CMATH', 'B'), (?, 2, 'PHY', 'C'), (?, 3, 'ICT', 'A')", id, id, id);
  run(db, "INSERT INTO student_achievement (account_id, position, activity, kind, level, place, year) VALUES (?, 1, 'Chess', 'SPORT', 'SCHOOL', 'FIRST', 2024)", id);
  run(db, "INSERT INTO student_interest VALUES (?, 'Maths')", id);
  run(db, "INSERT INTO student_contact (account_id, full_name, email, mobile, birth_date, consent_version, consent_at, updated_at) VALUES (?, 'Test Student', 'a@example.com', '+94712345678', '2006-05-01', '2026-10-11', ?, ?)", id, T, T);
  run(db, "INSERT INTO group_rules_acceptance VALUES (?, ?, ?)", id, RULES, T);
  run(db, "INSERT INTO journey_course VALUES (?, '001', 'A', ?)", id, T);
  run(db, "INSERT INTO journey_notice VALUES (?, 'R001', ?, NULL)", id, T);
  run(db, "INSERT INTO journey_step VALUES (?, 'RESULTS', ?)", id, T);
}
const courseGroup = (db: Db, id: number, course = '001') => run(db, "INSERT INTO course_group (group_id, kind, course_code, created_at) VALUES (?, 'COURSE', ?, ?)", id, course, T);

// Every foreign key ZP-DOC-05 declares, in its own words, as (table.column -> parent, ON DELETE). Sources: the CR-001
// (0003), CR-002 table (0006), CR-003 (0007), CR-006 table (0010) and the 0001 physical schema it reproduces verbatim.
const DOC_FKS: [string, string, string, string][] = [
  // 0001 provenance, reference data, rules, offerings, routes, deadlines, review
  ['citation.fact_id', 'fact', 'fact_id', 'CASCADE'], ['citation.source_id', 'source_document', 'source_id', 'NO ACTION'],
  ['account.verified_for_letter', 'institution', 'letter', 'NO ACTION'],
  ['fact_revision.fact_id', 'fact', 'fact_id', 'CASCADE'], ['fact_revision.changed_by', 'account', 'account_id', 'NO ACTION'],
  ['stream_subject.stream_code', 'stream', 'stream_code', 'NO ACTION'], ['stream_subject.subject_code', 'subject', 'subject_code', 'NO ACTION'],
  ['institution.parent_letter', 'institution', 'letter', 'NO ACTION'],
  ['offering.course_code', 'course', 'course_code', 'NO ACTION'], ['offering.institution_letter', 'institution', 'letter', 'NO ACTION'],
  ['rule_node.parent_id', 'rule_node', 'node_id', 'CASCADE'], ['rule_node.subject_code', 'subject', 'subject_code', 'NO ACTION'],
  ['rule_node.stream_code', 'stream', 'stream_code', 'NO ACTION'], ['rule_node.fact_id', 'fact', 'fact_id', 'NO ACTION'],
  ['offering_year.academic_year', 'intake_year', 'academic_year', 'NO ACTION'], ['offering_year.fact_id', 'fact', 'fact_id', 'NO ACTION'],
  ['offering_year.course_code', 'offering', 'course_code', 'NO ACTION'], ['offering_year.institution_letter', 'offering', 'institution_letter', 'NO ACTION'],
  ['offering_year_medium.offering_year_id', 'offering_year', 'offering_year_id', 'CASCADE'],
  ['selection_group.offering_year_id', 'offering_year', 'offering_year_id', 'CASCADE'],
  ['selection_group.al_rule_root_id', 'rule_node', 'node_id', 'NO ACTION'], ['selection_group.ol_rule_root_id', 'rule_node', 'node_id', 'NO ACTION'],
  ['cutoff.group_id', 'selection_group', 'group_id', 'CASCADE'], ['cutoff.district_code', 'district', 'district_code', 'NO ACTION'],
  ['cutoff.fact_id', 'fact', 'fact_id', 'NO ACTION'],
  ['route.rule_root_id', 'rule_node', 'node_id', 'NO ACTION'], ['route.fact_id', 'fact', 'fact_id', 'NO ACTION'],
  ['route_private_degree.route_id', 'route', 'route_id', 'CASCADE'], ['route_job_exam.route_id', 'route', 'route_id', 'CASCADE'],
  ['deadline.academic_year', 'intake_year', 'academic_year', 'NO ACTION'], ['deadline.route_id', 'route', 'route_id', 'NO ACTION'],
  ['deadline.fact_id', 'fact', 'fact_id', 'NO ACTION'],
  ['deadline_offering_year.deadline_id', 'deadline', 'deadline_id', 'CASCADE'], ['deadline_offering_year.offering_year_id', 'offering_year', 'offering_year_id', 'CASCADE'],
  ['push_subscription_deadline.subscription_id', 'push_subscription', 'subscription_id', 'CASCADE'],
  ['push_subscription_deadline.deadline_id', 'deadline', 'deadline_id', 'CASCADE'],
  ['extraction_run.source_id', 'source_document', 'source_id', 'NO ACTION'],
  ['candidate_fact.run_id', 'extraction_run', 'run_id', 'CASCADE'], ['candidate_fact.published_fact_id', 'fact', 'fact_id', 'NO ACTION'],
  ['candidate_fact.reviewer_id', 'account', 'account_id', 'NO ACTION'],
  ['mistake_report.fact_id', 'fact', 'fact_id', 'NO ACTION'], ['mistake_report.resolved_by', 'account', 'account_id', 'NO ACTION'],
  // CR-001 (0003): "Deleting an account deletes every row below it (ON DELETE CASCADE)"
  ['password_login.account_id', 'account', 'account_id', 'CASCADE'], ['session.account_id', 'account', 'account_id', 'CASCADE'],
  ['recovery_code.account_id', 'account', 'account_id', 'CASCADE'], ['student_profile.account_id', 'account', 'account_id', 'CASCADE'],
  ['student_profile.stream_code', 'stream', 'stream_code', 'NO ACTION'], ['student_profile.district_code', 'district', 'district_code', 'NO ACTION'],
  ['student_subject.account_id', 'student_profile', 'account_id', 'CASCADE'], ['student_subject.subject_code', 'subject', 'subject_code', 'NO ACTION'],
  ['student_achievement.account_id', 'account', 'account_id', 'CASCADE'], ['student_interest.account_id', 'account', 'account_id', 'CASCADE'],
  // CR-002 (0006) table
  ['senior_invite.course_code', 'course', 'course_code', 'NO ACTION'], ['senior_invite.institution_letter', 'institution', 'letter', 'NO ACTION'],
  ['senior_invite.redeemed_by', 'account', 'account_id', 'CASCADE'],
  ['course_group.course_code', 'course', 'course_code', 'NO ACTION'], ['course_group.stream_code', 'stream', 'stream_code', 'NO ACTION'],
  ['course_group.district_code', 'district', 'district_code', 'NO ACTION'],
  ['group_member.group_id', 'course_group', 'group_id', 'CASCADE'], ['group_member.account_id', 'account', 'account_id', 'CASCADE'],
  ['message_report.group_id', 'course_group', 'group_id', 'CASCADE'], ['message_report.reporter_id', 'account', 'account_id', 'CASCADE'],
  ['account_block.blocker_id', 'account', 'account_id', 'CASCADE'], ['account_block.blocked_id', 'account', 'account_id', 'CASCADE'],
  // CR-003 (0007)
  ['student_contact.account_id', 'account', 'account_id', 'CASCADE'],
  // CR-006 (0010) table
  ['group_rules_acceptance.account_id', 'account', 'account_id', 'CASCADE'],
  ['journey_course.account_id', 'account', 'account_id', 'CASCADE'],
  ['journey_course.course_code', 'offering', 'course_code', 'NO ACTION'], ['journey_course.institution_letter', 'offering', 'institution_letter', 'NO ACTION'],
  ['journey_notice.account_id', 'account', 'account_id', 'CASCADE'], ['journey_step.account_id', 'account', 'account_id', 'CASCADE'],
];

// Tables holding a student's rows: the doc says each one cascades when the account is deleted.
const ACCOUNT_CHILDREN = ['password_login', 'session', 'recovery_code', 'student_profile', 'student_subject', 'student_achievement',
  'student_interest', 'student_contact', 'group_member', 'message_report', 'account_block', 'group_rules_acceptance',
  'journey_course', 'journey_notice', 'journey_step'];

let db: Db;
beforeEach(() => { db = createTestD1().raw; });

describe('MIG: migrations apply cleanly', () => {
  it('MIG-001 0001..0010 exist, are numbered without gaps and apply in order on an empty database', () => {
    expect(FILES.map(f => f.slice(0, 4))).toEqual(['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009', '0010']);
    const fresh = new DatabaseSync(':memory:');
    fresh.exec('PRAGMA foreign_keys = ON;');
    for (const f of FILES) expect(() => fresh.exec(fs.readFileSync(path.join(MIGRATIONS, f), 'utf8')), f).not.toThrow();
    expect(tables(fresh).length).toBeGreaterThanOrEqual(45);
  });

  it('MIG-002 foreign keys are ON (as D1 enforces them) and the schema passes integrity_check', () => {
    expect(one(db, 'PRAGMA foreign_keys').foreign_keys).toBe(1);
    expect(one(db, 'PRAGMA integrity_check').integrity_check).toBe('ok');
  });

  it('MIG-003 PRAGMA foreign_key_check is clean right after the migrations (reference + offering data)', () => {
    expect(all(db, 'PRAGMA foreign_key_check')).toEqual([]);
  });
});

describe('MIG: tables and keys', () => {
  it('MIG-004 every table is STRICT (Physical design, Conventions: "STRICT tables")', () => {
    const notStrict = tables(db).filter(t => t.strict !== 1).map(t => t.name);
    expect(notStrict).toEqual([]);
  });

  it('MIG-005 every table the CR sections name exists', () => {
    const names = new Set(tables(db).map(t => t.name));
    for (const t of ['account', 'offering', 'course', 'institution', ...ACCOUNT_CHILDREN, 'senior_invite', 'course_group', 'answer_feedback'])
      expect(names.has(t), t).toBe(true);
  });

  it('MIG-006 every FK declared in ZP-DOC-05 exists (PRAGMA foreign_key_list) with the documented ON DELETE', () => {
    const missing: string[] = [];
    for (const [tc, parent, to, onDelete] of DOC_FKS) {
      const [table, col] = tc.split('.');
      const hit = fks(db, table).find(f => f.from === col && f.ref === parent && f.to === to);
      if (!hit) missing.push(`${tc} -> ${parent}(${to}) missing`);
      else if (hit.on_delete !== onDelete) missing.push(`${tc}: ON DELETE ${hit.on_delete}, doc says ${onDelete}`);
    }
    expect(missing).toEqual([]);
  });

  it('MIG-007 no undocumented FK: every FK in the schema is in the documented list', () => {
    const doc = new Set(DOC_FKS.map(([tc, p, to]) => `${tc}->${p}.${to}`));
    const extra = tables(db).flatMap(t => fks(db, t.name).map(f => `${t.name}.${f.from}->${f.ref}.${f.to}`)).filter(k => !doc.has(k));
    expect(extra).toEqual([]);
  });

  it('MIG-008 journey_course has ONE composite FK (course_code, institution_letter) -> offering', () => {
    const toOffering = fks(db, 'journey_course').filter(f => f.ref === 'offering');
    expect(new Set(toOffering.map(f => f.id)).size).toBe(1);
    expect(toOffering.sort((a, b) => a.seq - b.seq).map(f => [f.from, f.to])).toEqual([['course_code', 'course_code'], ['institution_letter', 'institution_letter']]);
  });

  it('MIG-009 primary keys of the CR-006 relations are the pair of participating keys (mapping step 5)', () => {
    const pk = (t: string) => all(db, 'SELECT name FROM pragma_table_info(?) WHERE pk > 0 ORDER BY pk', t).map(r => r.name);
    expect(pk('group_rules_acceptance')).toEqual(['account_id', 'rules_version']);
    expect(pk('journey_course')).toEqual(['account_id', 'course_code', 'institution_letter']);
    expect(pk('journey_notice')).toEqual(['account_id', 'route_id']);
    expect(pk('journey_step')).toEqual(['account_id', 'step_id']);
    expect(pk('group_member')).toEqual(['group_id', 'account_id']);
  });

  it('MIG-010 indexes the doc names exist (PRAGMA index_list), unique/partial as described', () => {
    const want: [string, string, { unique?: 0 | 1; partial?: 0 | 1 }][] = [
      ['offering', 'idx_offering_uni_code', { unique: 1 }], ['cutoff', 'idx_cutoff_district', {}],
      ['offering_year', 'idx_offering_year_year', {}], ['rule_node', 'idx_rule_node_parent', {}],
      ['deadline', 'idx_deadline_year_due', {}], ['citation', 'idx_citation_source', {}],
      ['candidate_fact', 'idx_candidate_queue', { partial: 1 }], ['mistake_report', 'idx_report_open', { partial: 1 }],
      ['session', 'idx_session_account', {}], ['student_profile', 'idx_student_profile_stream', {}],
      ['student_profile', 'idx_student_profile_district', {}], ['student_subject', 'idx_student_subject_subject', {}],
      ['group_member', 'idx_group_member_account', {}], ['account_block', 'idx_account_block_blocked', {}],
      ['course_group', 'ux_course_group_course', { unique: 1, partial: 1 }], ['course_group', 'ux_course_group_batch', { unique: 1, partial: 1 }],
    ];
    const problems: string[] = [];
    for (const [t, name, flags] of want) {
      const ix = indexes(db, t).find(i => i.name === name);
      if (!ix) { problems.push(`${t}.${name} missing`); continue; }
      if (flags.unique !== undefined && ix.unique !== flags.unique) problems.push(`${name} unique=${ix.unique}`);
      if (flags.partial !== undefined && ix.partial !== flags.partial) problems.push(`${name} partial=${ix.partial}`);
    }
    expect(problems).toEqual([]);
  });
});

describe('MIG: reference data', () => {
  it('MIG-011 255 offerings (2025/26 Uni-Codes), 121 courses, 20 institutions; uni_code is derived and unique', () => {
    expect(count(db, 'offering')).toBe(255);
    expect(count(db, 'course')).toBe(121);
    expect(count(db, 'institution')).toBe(20);
    expect(Number(one(db, 'SELECT count(DISTINCT uni_code) AS n FROM offering').n)).toBe(255);
    expect(count(db, 'offering', 'uni_code <> course_code || institution_letter')).toBe(0);
  });

  it('MIG-012 0002 reference data: 6 streams, 25 districts, 59 subjects (Appendix "Student accounts")', () => {
    expect(count(db, 'stream')).toBe(6);
    expect(count(db, 'district')).toBe(25);
    expect(count(db, 'subject')).toBe(59);
  });
});

describe('MIG: CHECK constraints reject bad values', () => {
  beforeEach(() => { student(db, 1); });

  it("MIG-013 account.avatar: 'zz' rejected; 'a01'..'a12' and NULL accepted", () => {
    expect(() => run(db, "UPDATE account SET avatar = 'zz' WHERE account_id = 1")).toThrow(/CHECK/);
    expect(() => run(db, "UPDATE account SET avatar = 'a13' WHERE account_id = 1")).toThrow(/CHECK/);
    for (let i = 1; i <= 12; i++) run(db, 'UPDATE account SET avatar = ? WHERE account_id = 1', `a${String(i).padStart(2, '0')}`);
    run(db, 'UPDATE account SET avatar = NULL WHERE account_id = 1');
  });

  it("MIG-014 journey_step.step_id: 'X' rejected; the eight documented steps accepted", () => {
    expect(() => run(db, "INSERT INTO journey_step VALUES (1, 'X', ?)", T)).toThrow(/CHECK/);
    for (const s of ['RESULTS', 'LIST', 'COMPARE', 'UGC_APPLY', 'UGC_ORDER', 'APTITUDE', 'UGC_SELECTION', 'UGC_REGISTER'])
      run(db, 'INSERT INTO journey_step VALUES (1, ?, ?)', s, T);
    expect(count(db, 'journey_step')).toBe(8);
  });

  it("MIG-015 journey_notice.route_id: 'R12', 'R1234', 'X123' rejected; 'R012' accepted", () => {
    for (const bad of ['R12', 'R1234', 'X123', 'r012'])
      expect(() => run(db, 'INSERT INTO journey_notice VALUES (1, ?, ?, NULL)', bad, T), bad).toThrow(/CHECK/);
    run(db, "INSERT INTO journey_notice VALUES (1, 'R012', ?, NULL)", T);
  });

  it('MIG-016 journey_notice: applied_at < followed_at rejected; equal or later accepted', () => {
    expect(() => run(db, "INSERT INTO journey_notice VALUES (1, 'R001', '2026-10-11T08:00:00Z', '2026-10-10T08:00:00Z')")).toThrow(/CHECK/);
    run(db, "INSERT INTO journey_notice VALUES (1, 'R001', '2026-10-11T08:00:00Z', '2026-10-11T08:00:00Z')");
    run(db, "INSERT INTO journey_notice VALUES (1, 'R002', '2026-10-11T08:00:00Z', '2026-10-12T08:00:00Z')");
  });

  it('MIG-017 rules_version other than 2026-10-11 rejected (group_rules_acceptance and group_member)', () => {
    courseGroup(db, 1);
    expect(() => run(db, "INSERT INTO group_rules_acceptance VALUES (1, '2026-01-01', ?)", T)).toThrow(/CHECK/);
    expect(() => run(db, "INSERT INTO group_member VALUES (1, 1, ?, '2025-01-01')", T)).toThrow(/CHECK/);
    run(db, 'INSERT INTO group_rules_acceptance VALUES (1, ?, ?)', RULES, T);
    run(db, 'INSERT INTO group_member VALUES (1, 1, ?, NULL)', T);
  });

  it('MIG-018 composite FK journey_course -> offering rejects a non-existent offering (real course, wrong institution too)', () => {
    expect(() => run(db, "INSERT INTO journey_course VALUES (1, '999', 'A', ?)", T)).toThrow(/FOREIGN KEY/);
    const realCourse = one(db, 'SELECT course_code FROM offering LIMIT 1').course_code as string;
    const notOffered = one(db, 'SELECT letter FROM institution WHERE letter NOT IN (SELECT institution_letter FROM offering WHERE course_code = ?) LIMIT 1', realCourse);
    expect(notOffered, 'an institution that does not offer the course').toBeTruthy();
    expect(() => run(db, 'INSERT INTO journey_course VALUES (1, ?, ?, ?)', realCourse, notOffered.letter, T)).toThrow(/FOREIGN KEY/);
    run(db, "INSERT INTO journey_course VALUES (1, '001', 'A', ?)", T);
  });

  it('MIG-019 STRICT rejects a value of the wrong type (z_e4 as text)', () => {
    student(db, 2, { profile: false });
    expect(() => run(db, "INSERT INTO student_profile VALUES (2, 'PHYS', 'KUR', 'high', ?)", T)).toThrow(/cannot store TEXT value in INTEGER column/);
  });

  it('MIG-020 student_contact CHECKs (CR-003): bad mobile, upper-case email, impossible date rejected', () => {
    const ins = (email: string, mobile: string, birth: string) =>
      run(db, "INSERT INTO student_contact (account_id, full_name, email, mobile, birth_date, consent_version, consent_at, updated_at) VALUES (1, 'Test Student', ?, ?, ?, '2026-10-11', ?, ?)", email, mobile, birth, T, T);
    expect(() => ins('a@example.com', '0712345678', '2006-05-01')).toThrow(/CHECK/);
    expect(() => ins('A@Example.com', '+94712345678', '2006-05-01')).toThrow(/CHECK/);
    expect(() => ins('a@example.com', '+94712345678', '2006-02-30')).toThrow(/CHECK/);
    ins('a@example.com', '+94712345678', '2006-05-01');
  });

  it('MIG-021 course_group: one group per course and per batch (partial UNIQUE), kind/columns consistent', () => {
    courseGroup(db, 1, '001');
    expect(() => courseGroup(db, 2, '001')).toThrow(/UNIQUE/);
    run(db, "INSERT INTO course_group (kind, stream_code, district_code, created_at) VALUES ('BATCH', 'PHYS', 'KUR', ?)", T);
    expect(() => run(db, "INSERT INTO course_group (kind, stream_code, district_code, created_at) VALUES ('BATCH', 'PHYS', 'KUR', ?)", T)).toThrow(/UNIQUE/);
    expect(() => run(db, "INSERT INTO course_group (kind, course_code, stream_code, created_at) VALUES ('COURSE', '002', 'PHYS', ?)", T)).toThrow(/CHECK/);
  });

  it('MIG-022 student data only on STUDENT accounts (0003 triggers) and account_block cannot block self', () => {
    run(db, "INSERT INTO account (account_id, auth_subject, role, created_at) VALUES (9, 'curator', 'CURATOR', ?)", T);
    expect(() => run(db, "INSERT INTO student_profile VALUES (9, 'PHYS', 'KUR', 1, ?)", T)).toThrow(/requires a STUDENT account/);
    expect(() => run(db, 'INSERT INTO account_block VALUES (1, 1, ?)', T)).toThrow(/CHECK/);
  });
});

describe('MIG: deleting an account', () => {
  it('MIG-023 foreign_key_check is clean after seeding a full student, groups, reports and blocks', () => {
    fullStudent(db, 1); fullStudent(db, 2);
    courseGroup(db, 1);
    run(db, 'INSERT INTO group_member VALUES (1, 1, ?, NULL), (1, 2, ?, NULL)', T, T);
    run(db, "INSERT INTO message_report VALUES (1, ?, 1, 'SPAM', ?)", 'a'.repeat(32), T);
    run(db, 'INSERT INTO account_block VALUES (1, 2, ?), (2, 1, ?)', T, T);
    expect(all(db, 'PRAGMA foreign_key_check')).toEqual([]);
  });

  it('MIG-024 DELETE FROM account cascades to every child table (listed), and leaves the other account intact', () => {
    fullStudent(db, 1); fullStudent(db, 2);
    courseGroup(db, 1);
    run(db, 'INSERT INTO group_member VALUES (1, 1, ?, NULL), (1, 2, ?, NULL)', T, T);
    run(db, "INSERT INTO message_report VALUES (1, ?, 1, 'SPAM', ?), (1, ?, 2, 'SPAM', ?)", 'a'.repeat(32), T, 'b'.repeat(32), T);
    run(db, 'INSERT INTO account_block VALUES (1, 2, ?), (2, 1, ?)', T, T);
    const byAccount: Record<string, string> = { message_report: 'reporter_id', account_block: 'blocker_id = 1 OR blocked_id' };
    const rowsOf = (t: string) => count(db, t, `${byAccount[t] ?? 'account_id'} = 1`);
    for (const t of ACCOUNT_CHILDREN) expect(rowsOf(t), `${t} seeded`).toBeGreaterThan(0);
    run(db, 'DELETE FROM account WHERE account_id = 1');
    const left = ACCOUNT_CHILDREN.filter(t => rowsOf(t) > 0);
    expect(left).toEqual([]);
    expect(count(db, 'account', 'account_id = 2')).toBe(1);
    expect(count(db, 'student_subject', 'account_id = 2')).toBe(3);
    expect(count(db, 'course_group')).toBe(1);                      // "course_group: Unaffected"
    expect(count(db, 'account_block')).toBe(0);                     // "Blocks both ways deleted"
    expect(all(db, 'PRAGMA foreign_key_check')).toEqual([]);
  });

  it("MIG-025 deleting a SENIOR account deletes its redeemed senior_invite (CASCADE), unredeemed invites stay", () => {
    const letter = one(db, "SELECT letter FROM institution WHERE kind = 'UNIVERSITY' LIMIT 1").letter as string;
    const course = one(db, 'SELECT course_code FROM offering WHERE institution_letter = ? LIMIT 1', letter).course_code as string;
    run(db, "INSERT INTO account (account_id, auth_subject, role, verified_for_letter, created_at) VALUES (5, 'local:senior', 'SENIOR', ?, ?)", letter, T);
    const inv = (id: number, h: string) => run(db, "INSERT INTO senior_invite (invite_id, code_hash, course_code, institution_letter, study_year, created_at, expires_at) VALUES (?, ?, ?, ?, 2, ?, '2027-01-01T00:00:00Z')", id, H(h), course, letter, T);
    inv(1, 'd'); inv(2, 'e');
    run(db, 'UPDATE senior_invite SET redeemed_by = 5, redeemed_at = ? WHERE invite_id = 1', T);
    expect(() => run(db, 'UPDATE senior_invite SET redeemed_by = 5, redeemed_at = ? WHERE invite_id = 2', T)).toThrow(/UNIQUE|invalid redemption/);
    run(db, 'DELETE FROM account WHERE account_id = 5');
    expect(all(db, 'SELECT invite_id FROM senior_invite').map(r => r.invite_id)).toEqual([2]);
  });

  it('MIG-026 staff references (NO ACTION) block deleting a staff account that reviewed a fact, as documented', () => {
    run(db, "INSERT INTO account (account_id, auth_subject, role, created_at) VALUES (7, 'curator', 'CURATOR', ?)", T);
    run(db, 'INSERT INTO fact (fact_id, kind, updated_at) VALUES (1, ?, ?)', 'RULE', '2026-10-11T00:00:00Z');
    run(db, "INSERT INTO fact_revision VALUES (1, 1, '{}', ?, 7, 'seed')", T);
    expect(() => run(db, 'DELETE FROM account WHERE account_id = 7')).toThrow(/FOREIGN KEY/);
  });
});

describe('MIG: expand, then contract (CR-005 -> CR-006)', () => {
  it('MIG-027 group_member.rules_version still exists after 0010 (kept for rollback)', () => {
    const cols = all(db, 'SELECT name FROM pragma_table_info(?)', 'group_member').map(r => r.name);
    expect(cols).toContain('rules_version');
  });

  it("MIG-028 the previous release's group SQL (worker/groups.ts before commit 4f3708b) still runs on the 0010 schema", () => {
    student(db, 1);
    courseGroup(db, 1, '001');
    // Verbatim from `git show 4f3708b^:worker/groups.ts`, with GROUP_RULES_VERSION = '2026-10-11'.
    const GROUP_SELECT = `SELECT g.group_id, g.kind, g.course_code, g.stream_code, g.district_code,
    (SELECT count(*) FROM group_member m WHERE m.group_id = g.group_id) AS members,
    mine.account_id IS NOT NULL AS joined, coalesce(mine.rules_version = '${RULES}', 0) AS rules_ok
  FROM course_group g LEFT JOIN group_member mine ON mine.group_id = g.group_id AND mine.account_id = ?`;
    const where = "kind = 'COURSE' AND course_code = ?";
    run(db, `INSERT INTO group_member (group_id, account_id, joined_at, rules_version) SELECT group_id, ?, ?, ? FROM course_group WHERE ${where}
      ON CONFLICT (group_id, account_id) DO UPDATE SET rules_version = excluded.rules_version`, 1, T, RULES, '001');
    const row = one(db, `${GROUP_SELECT} WHERE ${where.replace(/\b(kind|course_code|stream_code|district_code)\b/g, 'g.$1')}`, 1, '001');
    expect(row).toMatchObject({ group_id: 1, members: 1, joined: 1, rules_ok: 1 });
    const live = one(db, `SELECT g.kind, g.course_code, mb.rules_version FROM group_member mb JOIN course_group g USING (group_id)
    WHERE mb.group_id = ? AND mb.account_id = ?`, 1, 1);
    expect(live).toMatchObject({ kind: 'COURSE', course_code: '001', rules_version: RULES });
  });

  it('MIG-029 0009 -> 0010 carry-over: one acceptance per account at its FIRST join; NULL members not carried', () => {
    const pre = createTestD1(FILES.filter(f => f < '0010')).raw;     // the database as it was before 0010
    expect(all(pre, 'SELECT name FROM pragma_table_list WHERE name = ?', 'group_rules_acceptance')).toEqual([]);
    for (const id of [1, 2, 3]) student(pre, id);
    for (const [g, c] of [[1, '001'], [2, '002'], [3, '003']] as const) courseGroup(pre, g, c);
    const mem = (g: number, a: number, at: string, v: string | null) => run(pre, 'INSERT INTO group_member VALUES (?, ?, ?, ?)', g, a, at, v);
    mem(1, 1, '2026-10-11T10:00:00Z', RULES); mem(2, 1, '2026-10-11T09:00:00Z', RULES); mem(3, 1, '2026-10-11T08:00:00Z', null);
    mem(1, 2, '2026-10-11T12:00:00Z', RULES);
    mem(1, 3, '2026-10-11T07:00:00Z', null);
    pre.exec(fs.readFileSync(path.join(MIGRATIONS, FILES.find(f => f.startsWith('0010'))!), 'utf8'));
    expect(all(pre, 'SELECT account_id, rules_version, accepted_at FROM group_rules_acceptance ORDER BY account_id')).toEqual([
      { account_id: 1, rules_version: RULES, accepted_at: '2026-10-11T09:00:00Z' },   // min over accepted rows only
      { account_id: 2, rules_version: RULES, accepted_at: '2026-10-11T12:00:00Z' },
    ]);
    expect(count(pre, 'group_member')).toBe(5);                                       // memberships untouched
    expect(count(pre, 'group_member', 'rules_version IS NOT NULL')).toBe(3);          // old column kept, values kept
    expect(count(pre, 'offering')).toBe(255);
    expect(all(pre, 'PRAGMA foreign_key_check')).toEqual([]);
  });

  it('MIG-030 0010 on a database with no 0009 acceptances carries nothing; avatars start NULL (initials)', () => {
    student(db, 1);
    expect(count(db, 'group_rules_acceptance')).toBe(0);
    expect(one(db, 'SELECT avatar FROM account WHERE account_id = 1').avatar).toBeNull();
  });
});
