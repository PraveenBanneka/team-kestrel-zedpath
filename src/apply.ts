// UGC application co-pilot (CR-012, 23 October 2026): helps a student fill the UGC's online application and post the
// signed printout, following the UGC handbook 2025/26, Section 5 (pages 126 to 154). ZedPath never logs in to the UGC and
// never fills its form: the student copies across what ZedPath already knows, and for the rest the co-pilot explains what
// to write (Praveen 23 Oct: no typing the form twice). It keeps only two answers and the ticks, on this phone
// (storage.ts, zedpath.apply.v1, cleared with the student's data); nothing is sent to ZedPath's server.
import type { Key } from './i18n/en.ts';

export type Candidate = 'SCHOOL' | 'PRIVATE';
export interface ApplyAnswers { candidate: Candidate | null; nameDiffers: boolean | null }
export interface ApplyState { answers: ApplyAnswers; done: Record<string, boolean> }
export const EMPTY_APPLY: ApplyState = {
  answers: { candidate: null, nameDiffers: null },
  done: {},
};

/** The UGC wants names and addresses in English BLOCK CAPITALS (handbook p.130, p.135). */
export const blockCaps = (s: string) => s.trim().replace(/\s+/g, ' ').toUpperCase();
/** "Dayawansha Patabendige Shalini Bandara" -> "BANDARA DPS", the UGC's own example on p.130. */
export function nameWithInitials(full: string): string {
  const parts = blockCaps(full).split(' ').filter(Boolean);
  if (parts.length < 2) return parts.join('');
  const last = parts.pop()!;
  return `${last} ${parts.map(p => p[0]).join('')}`;
}
/** "+94771234567" -> "0771234567", the format in the UGC's example (p.130). */
export const localMobile = (m: string) => m.replace(/^\+94/, '0');

export interface Item { key: Key; page?: string; section?: string; vars?: Record<string, string | number> }

/** What to get ready, for THIS student (p.126 to p.154). */
export function documentsFor(a: ApplyAnswers, list: { needsOl: boolean; hasAptitudeTest: boolean; course: string }[]): Item[] {
  const ol = list.filter(c => c.needsOl).length;
  const apt = list.filter(c => c.hasAptitudeTest).map(c => c.course);
  const items: Item[] = [
    { key: 'apply.doc.nic', page: '126' },
    { key: 'apply.doc.contact', page: '128' },
    { key: 'apply.doc.print', page: '125, 152' },
  ];
  if (ol > 0) items.push({ key: ol === 1 ? 'apply.doc.olOne' : 'apply.doc.ol', page: '153', vars: { n: ol } });
  if (a.candidate === 'SCHOOL') items.push({ key: 'apply.doc.principal', page: '153' });
  if (a.candidate === 'PRIVATE') items.push({ key: 'apply.doc.private', page: '153-154' });
  if (a.nameDiffers) items.push({ key: 'apply.doc.affidavit', page: '154' });
  if (apt.length > 0) items.push({ key: apt.length === 1 ? 'apply.doc.aptitudeOne' : 'apply.doc.aptitude', section: '2.2', vars: { n: apt.length, list: apt.slice(0, 3).join(', ') + (apt.length > 3 ? '…' : '') } });
  return items;
}

/** After submitting online: print, sign, certify, post (p.152 to p.154) and the one chance to change the order (p.116). */
export const POST_STEPS: Item[] = [
  { key: 'apply.post.print', page: '152' },
  { key: 'apply.post.sign', page: '154' },
  { key: 'apply.post.certify', page: '153' },
  { key: 'apply.post.barcodes', page: '153' },
  { key: 'apply.post.pack', page: '154' },
  { key: 'apply.post.send', page: '154' },
  { key: 'apply.post.order', page: '116' },
];

/** The fields the student types on the UGC site: what to write and the common mistake (handbook pages). */
export const FORM_GUIDES: { title: Key; key: Key; page: string }[] = [
  { title: 'apply.f.nic', key: 'apply.gd.nic', page: '126-127' },
  { title: 'apply.f.alIndex', key: 'apply.gd.alIndex', page: '127' },
  { title: 'apply.f.address', key: 'apply.gd.address', page: '135' },
  { title: 'apply.f.parents', key: 'apply.gd.parents', page: '135' },
  { title: 'apply.f.prev', key: 'apply.gd.prev', page: '136' },
  { title: 'apply.f.school', key: 'apply.gd.school', page: '137' },
];

export const UGC_ADDRESS = 'Deputy Secretary/ University Admissions, University Grants Commission, No. 20, Ward Place, Colombo 07';
