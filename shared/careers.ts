// CR-013 Career-first mode (Praveen 23 Oct: "Can we have an outcome driven mode? ... student can enter who he wants to
// become and we show his paths with access"). A small curated map from a career to the UGC courses (by course code, the
// handbook's own) and the other paths (by id, or by words in their programme titles) that commonly lead to it. The map is
// FindMyWay's guide, said so on screen; every course and path keeps its own official source, bands describe past cut-offs,
// and a licence step is shown only when its official source was checked (SLMC, 23 Oct 2026). Pure, tested.
import type { HiddenOffering, OfferingSummary, RouteSummary } from './api.ts';
import type { Band } from './banding.ts';
import { searchRoutes } from './route-search.ts';
import { matches } from './search.ts';

export interface Licence { body: string; step: string; quote: string; url: string; checkedOn: string }
export interface Career {
  id: string;
  /** Extra words a student may type for this career (English); the career's own name is in the i18n files. */
  words: string;
  /** UGC courses, by the handbook's course code, with the course name exactly as the rulebook has it (pinned by a test). */
  courses: { code: string; name: string }[];
  /** Other paths by id (when their names say nothing about the career), plus words searched in names and programmes. */
  routeIds: string[];
  routeTerms: string[];
  licence: Licence | null;
}

const SLMC_STEPS: Licence = {
  body: 'Sri Lanka Medical Council (SLMC)',
  step: 'After the degree: provisional registration with the SLMC, a compulsory one-year internship at an approved government hospital, then full registration.',
  quote: 'A compulsory one-year clinical training programme at an approved government hospital.',
  url: 'https://slmc.gov.lk/en/services/local-graduates', checkedOn: '2026-10-23',
};

export const CAREERS: Career[] = [
  { id: 'doctor', words: 'doctor physician surgeon medical mbbs medicine', courses: [{ code: '001', name: 'Medicine' }],
    routeIds: ['R092', 'R051'], routeTerms: [], licence: SLMC_STEPS },
  { id: 'dentist', words: 'dentist dental surgeon bds', courses: [{ code: '002', name: 'Dental Surgery' }], routeIds: [], routeTerms: [],
    licence: { body: 'Sri Lanka Medical Council (SLMC)', step: 'Dental graduates register with the SLMC, which regulates medical, dental and allied healthcare professionals.',
      quote: 'regulates medical, dental, and allied healthcare professionals', url: 'https://slmc.gov.lk/', checkedOn: '2026-10-23' } },
  { id: 'engineer', words: 'engineer engineering civil mechanical electrical electronic chemical',
    courses: [{ code: '008', name: 'Engineering' }, { code: '009', name: 'Engineering (EM) - Earth Resources Engineering' }, { code: '010', name: 'Engineering (TM) - Textile & Apparel Engineering' },
      { code: '143', name: 'Electronic and Intelligent Systems Engineering' }, { code: '102', name: 'Engineering Technology (ET)' }, { code: '057', name: 'Transport Management & Logistics Engineering (TMLE)' }],
    routeIds: ['R092', 'R027', 'R020', 'R042'], routeTerms: ['civil engineering', 'mechanical engineering', 'electrical', 'electronic', 'mechatronic', 'materials engineering', 'automotive', 'marine engineering', 'engineering technology'], licence: null },
  { id: 'software', words: 'software engineer developer programmer coder computer it data scientist cyber security ai',
    courses: [{ code: '099', name: 'Software Engineering' }, { code: '012', name: 'Computer Science' }, { code: '065', name: 'Computer Science & Technology' },
      { code: '026', name: 'Information Technology (IT)' }, { code: '038', name: 'Information and Communication Technology (ICT)' }, { code: '104', name: 'Information Communication Technology' },
      { code: '117', name: 'Artificial Intelligence' }, { code: '136', name: 'Data Science' }, { code: '119', name: 'Electronics and Computer Science' },
      { code: '075', name: 'Industrial Information Technology' }, { code: '096', name: 'Information Systems' }],
    routeIds: ['R018', 'R023', 'R024', 'R026', 'R032', 'R036', 'R037', 'R041'], routeTerms: ['software', 'computer science', 'computing', 'information technology', 'data science', 'cyber security'], licence: null },
  { id: 'lawyer', words: 'lawyer attorney advocate legal law llb barrister judge', courses: [{ code: '025', name: 'Law' }],
    routeIds: [], routeTerms: ['law', 'llb'], licence: null },
  { id: 'accountant', words: 'accountant accounting accountancy finance auditor chartered ca cima acca aat banker banking',
    courses: [{ code: '018', name: 'Commerce' }, { code: '127', name: 'Accounting Information Systems' }, { code: '133', name: 'Banking and Insurance' }, { code: '131', name: 'Financial Economics' }],
    routeIds: ['R028', 'R029', 'R030', 'R031', 'R096', 'R097', 'R102', 'R100', 'R101', 'R019', 'R038'], routeTerms: ['accounting', 'applied accounting', 'banking'], licence: null },
  { id: 'teacher', words: 'teacher teaching educator lecturer school education', courses: [{ code: '137', name: 'Primary Education' },
    { code: '081', name: 'Physical Education' }, { code: '105', name: 'Teaching English as a Second Language (TESL)' }],
    routeIds: ['R045'], routeTerms: ['bachelor of education'], licence: null },
  { id: 'nurse', words: 'nurse nursing midwife', courses: [{ code: '037', name: 'Nursing' }], routeIds: [], routeTerms: ['nursing'], licence: null },
  { id: 'pharmacist', words: 'pharmacist pharmacy pharmaceutical chemist', courses: [{ code: '051', name: 'Pharmacy' }], routeIds: [], routeTerms: ['pharmaceutical', 'pharmacy'], licence: null },
  { id: 'architect', words: 'architect architecture interior designer landscape', courses: [{ code: '023', name: 'Architecture' }, { code: '097', name: 'Landscape Architecture' }],
    routeIds: [], routeTerms: ['architecture', 'interior design'], licence: null },
  { id: 'vet', words: 'vet veterinarian veterinary animal doctor', courses: [{ code: '003', name: 'Veterinary Science' }], routeIds: [], routeTerms: [], licence: null },
  { id: 'business', words: 'business manager management entrepreneur marketing hr human resource mba',
    courses: [{ code: '016', name: 'Management' }, { code: '066', name: 'Entrepreneurship and Management' }, { code: '077', name: 'Business Information Systems (Honours) (BIS)' },
      { code: '022', name: 'Management Studies (TV)' }, { code: '114', name: 'Human Resource Development' }],
    routeIds: ['R021', 'R022', 'R025', 'R098', 'R099'], routeTerms: ['business management', 'business administration'], licence: null },
];

/** Careers whose name (in the app's language) or words match what the student typed; an empty query lists them all. */
export const findCareers = (query: string, label: (c: Career) => string) =>
  CAREERS.filter(c => matches(query, label(c), c.words, ...c.courses.map(x => x.name)));

const BAND_ORDER: Band[] = ['SAFE', 'LIKELY', 'REACH', 'OUT_OF_RANGE', 'NOT_ENOUGH_DATA'];

/** Everything a career leads to for this student: their banded courses (best chance first), the courses they cannot
 *  apply for (with the handbook's reason), and the other paths, with the programmes that matched. */
export function careerPaths<R extends Pick<RouteSummary, 'id' | 'name' | 'provider' | 'group' | 'programmes'>>(career: Career,
  offerings: OfferingSummary[], hidden: HiddenOffering[], routes: R[]) {
  const codes = new Set(career.courses.map(c => c.code)), names = new Set(career.courses.map(c => c.name));
  const courses = offerings.filter(o => codes.has(o.courseCode))
    .sort((a, b) => BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band) || a.course.localeCompare(b.course) || a.institution.localeCompare(b.institution));
  const closed = hidden.filter(h => names.has(h.course));
  const found = new Map<string, { route: R; programmes: string[] }>();
  for (const id of career.routeIds) { const r = routes.find(x => x.id === id); if (r) found.set(id, { route: r, programmes: [] }); }
  for (const term of career.routeTerms) for (const hit of searchRoutes(term, routes)) {
    const was = found.get(hit.route.id);
    found.set(hit.route.id, { route: hit.route, programmes: [...new Set([...(was?.programmes ?? []), ...hit.programmes])] });
  }
  return { courses, closed, routes: [...found.values()] };
}
