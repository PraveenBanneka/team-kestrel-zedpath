// The bundled read model (rulebook) and the server-side profile validation shared by every API route.
import rulebookJson from './generated/rulebook-2025-2026.json';
import type { Rulebook } from '../shared/rulebook.ts';
import type { ApiError, ProfileInput } from '../shared/api.ts';
import { evaluate, type Grade, type StreamCode, type Verdict } from '../shared/rules.ts';
import { band, type BandResult } from '../shared/banding.ts';

export const book = rulebookJson as unknown as Rulebook;
export const districtIndex = new Map(book.districts.map((d, i) => [d.code, i]));
export const STREAMS = new Set<StreamCode>(book.streams.map(s => s.code));
export const SUBJECT_NAMES: Record<string, string> = Object.fromEntries(book.subjects.map(s => [s.code, s.name]));
/** A/L subjects a student can enter (O/L entries such as ENG_OL are rule inputs, not A/L choices). */
export const AL_SUBJECTS = new Set(book.subjects.map(s => s.code).filter(c => !c.endsWith('_OL')));
const GRADES = new Set<Grade>(['A', 'B', 'C', 'S']);

/**
 * Server-side validation of the profile (FR-102, FR-203, NFR-035). `strictSubjects` also requires every subject to be
 * a known A/L subject: used where the profile is stored (the database references the subject table), while
 * /results keeps its original, more lenient check (safe default: unchanged behaviour).
 */
export function parseProfile(body: unknown, strictSubjects = false): ProfileInput | ApiError {
  const b = body as Partial<ProfileInput> | null;
  if (!b || typeof b !== 'object') return { error: 'A JSON profile is required' };
  if (!b.stream || !STREAMS.has(b.stream)) return { error: 'Unknown stream', field: 'stream' };
  if (!b.district || !districtIndex.has(b.district)) return { error: 'Unknown district', field: 'district' };
  if (!Number.isInteger(b.zE4) || b.zE4! < -40000 || b.zE4! > 40000) return { error: 'Z-score must be between −4.0000 and +4.0000', field: 'zE4' };
  const al = b.al ?? {};
  if (typeof al !== 'object') return { error: 'Enter exactly three A/L subjects', field: 'al' };
  const subjects = Object.keys(al);
  if (subjects.length !== 3) return { error: 'Enter exactly three A/L subjects', field: 'al' };
  if (!subjects.every(s => /^[A-Z0-9_]{2,12}$/.test(s)) || !Object.values(al).every(g => GRADES.has(g as Grade)))
    return { error: 'Each subject needs a grade of A, B, C or S', field: 'al' };
  if (strictSubjects && !subjects.every(s => AL_SUBJECTS.has(s))) return { error: 'Unknown subject', field: 'al' };
  return { stream: b.stream, district: b.district, zE4: b.zE4!, al, ol: b.ol };
}

export type RulebookOffering = typeof book.offerings[number];
export interface GroupAssessment { group: RulebookOffering['groups'][number]; verdict: Verdict; result: BandResult | null }

/** One offering judged for one student: subject rules per selection group, then the band where eligible. The single
 *  source for /results and Ask ZedPath's engine facts, so the two can never disagree. */
export function assessOffering(o: RulebookOffering, p: ProfileInput): { groups: GroupAssessment[]; anyEligible: boolean } {
  const course = book.courses[o.courseCode];
  const di = districtIndex.get(p.district)!;
  const student = { stream: p.stream, al: p.al, ol: p.ol };
  const groups = o.groups.map(g => {
    const rule = course.groups?.[g.code] ?? { al: course.al, ol: course.ol };
    const verdict = evaluate(rule.al, rule.ol ?? undefined, student);
    const result = verdict === 'NOT_ELIGIBLE' ? null : band(p.zE4, g.years.map(y => ({ examYear: y.examYear, zE4: y.zE4[di] })));
    return { group: g, verdict, result };
  });
  return { groups, anyEligible: groups.some(g => g.verdict !== 'NOT_ELIGIBLE') };
}
