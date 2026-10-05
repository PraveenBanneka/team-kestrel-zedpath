// The contract between the React app and the Hono API Worker. Both sides import these types.
import type { Band, Trend } from './banding.ts';
import type { Grade, StreamCode } from './rules.ts';

export interface ProfileInput {
  stream: StreamCode;
  district: string;                 // district code, e.g. 'KUR'
  zE4: number;                      // Z-score in ten-thousandths
  al: Record<string, Grade>;        // exactly three subjects
  ol?: Record<string, Grade | 'F'>;
}

export interface Meta {
  academicYear: string;
  districts: { code: string; name: string; disadvantaged: boolean }[];
  streams: { code: StreamCode; name: string }[];
  subjects: { code: string; name: string; streams: StreamCode[] }[];
  sources: { id: string; title: string; edition: string; sha256: string }[];
}

export interface OfferingSummary {
  uniCode: string;
  courseCode: string;
  course: string;
  institution: string;
  group: string;                    // 'ALL' or a selection-group code
  groupLabel: string | null;
  band: Band;
  limitedHistory: boolean;
  yearsUsed: number;
  latestE4: number | null;
  gapToLatestE4: number | null;
  trend: Trend;
  hasAptitudeTest: boolean;
  meritOnly: boolean;
  needsOl: boolean;
}

export interface HiddenOffering { uniCode: string; course: string; institution: string; reason: string; page: number }

export interface ResultsResponse {
  academicYear: string;
  counts: Record<Band, number>;
  offerings: OfferingSummary[];
  hidden: HiddenOffering[];
  computedAt: string;
}

export interface Citation { sourceId: string; page: number; label: string }

export interface OfferingDetail {
  uniCode: string;
  course: string;
  institution: string;
  proposedIntake: number | null;
  duration: string | null;
  selectionBasis: 'QUOTA' | 'MERIT_ONLY';
  hasAptitudeTest: boolean;
  requirementText: string;                 // exact handbook wording (shown on request)
  needs: string[];                         // plain-language lines generated from the rule tree
  olNeeds: string[];
  ambiguousWording: boolean;               // BR-044: inclusive reading used; confirm on the UGC form
  requirementCitation: Citation;
  otherRequirements: string | null;
  /** What the degree teaches, from the university's own published curriculum (null when not yet researched). */
  syllabus: Syllabus | null;
  groups: {
    code: string;
    label: string | null;
    history: { academicYear: string; zE4: number | null; citation: Citation }[];
  }[];
}

export interface ApiError { error: string; field?: string }

export interface RouteSummary {
  id: string;
  group: 'PRIVATE_DEGREE' | 'DIPLOMA' | 'PROFESSIONAL' | 'VOCATIONAL' | 'JOB_EXAM' | 'SCHOLARSHIP_ABROAD' | 'RETRY';
  name: string; provider: string; duration: string | null; costText: string | null; intakeTiming: string | null;
  requirements: string; officialUrl: string | null; sourceUrl: string; sourceLocator: string; retrievedOn: string;
  openNow: boolean; warning: string | null;
}

/** A degree's curriculum as published by the university (data/degrees/, researched 2026-10-05). Module titles are
 *  copied from the official source; `sourceUrls` are the pages read; `notes` says when a list is partial or dated. */
export interface Syllabus {
  degree: string;
  duration: string | null;
  specialisations: string[];
  years: { label: string; modules: string[] }[];
  sourceUrls: string[];
  retrievedOn: string;
  notes: string | null;
}
