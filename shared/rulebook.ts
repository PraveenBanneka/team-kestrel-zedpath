// Shape of the compiled read model the Worker serves from (built by tools/rulebook/build-rulebook.ts).
import type { Rule, StreamCode } from './rules.ts';
import type { RouteSummary } from './api.ts';

export interface Rulebook {
  academicYear: string;
  generatedAt: string;
  rulesStatus: 'RECONCILED' | 'MISSING';
  districts: { code: string; name: string; disadvantaged: boolean }[];
  streams: { code: StreamCode; name: string }[];
  subjects: { code: string; name: string }[];
  sources: { id: string; title: string; edition: string; sha256: string }[];
  /** Requirement rules per course code (identical across universities, BR-020). */
  courses: Record<string, {
    name: string; al: Rule; ol: Rule | null;
    groups: Record<string, { al: Rule; ol: Rule | null }> | null;
    other: string | null; page: number; quote: string;
    reconciliation?: { decision: string; reading: 'LITERAL' | 'INCLUSIVE'; note: string };
  }>;
  /** Other routes (FE-5), from official sources; openNow is computed at request time from closesOn. */
  routes: (Omit<RouteSummary, 'openNow'> & { closesOn: string | null; openAtRetrieval: boolean })[];
  offerings: {
    uniCode: string; courseCode: string; course: string; institution: string;
    proposedIntake: number | null; duration: string | null; meritOnly: boolean; hasAptitudeTest: boolean;
    other: string | null; page: number;
    groups: {
      code: string; label: string | null;
      /** Most recent first; zE4 has one entry per district in `districts` order; null = NQC. */
      years: { academicYear: string; examYear: number; source: string; sourceLabel: string; page: number; zE4: (number | null)[] }[];
    }[];
  }[];
}
