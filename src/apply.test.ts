// CR-012: the UGC application co-pilot. Formats follow the UGC's own examples (handbook 2025/26, Section 5), the checklist
// fits the student, every step cites the handbook, and the answers live only on this phone and go with the student's data.
import { beforeEach, describe, expect, it } from 'vitest';

const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0,
};
const A = await import('./apply.ts');
const S = await import('./storage.ts');
const { en } = await import('./i18n/en.ts');
const { si } = await import('./i18n/si.ts');
const { ta } = await import('./i18n/ta.ts');

const answers = (over: Partial<import('./apply.ts').ApplyAnswers> = {}) => ({ ...A.EMPTY_APPLY.answers, ...over });

describe('UGC application co-pilot (CR-012)', () => {
  beforeEach(() => store.clear());
  it('writes names and addresses the UGC way (the handbook\'s own example, p.130 and p.135)', () => {
    expect(A.nameWithInitials('Dayawansha Patabendige Shalini Bandara')).toBe('BANDARA DPS');
    expect(A.blockCaps('  dayawansha  patabendige ')).toBe('DAYAWANSHA PATABENDIGE');
    expect(A.addressCaps('No 68\nSchool Road,  Mathugama')).toBe('NO 68, SCHOOL ROAD, MATHUGAMA');
    expect(A.localMobile('+94791597530')).toBe('0791597530');
  });
  it('builds the checklist for this student: school or private, O/L copy, affidavit, aptitude applications', () => {
    const list = [{ needsOl: true, hasAptitudeTest: false, course: 'Medicine' }, { needsOl: false, hasAptitudeTest: true, course: 'Architecture' }];
    const school = A.documentsFor(answers({ candidate: 'SCHOOL', nameDiffers: false }), list).map(d => d.key);
    expect(school).toEqual(['apply.doc.nic', 'apply.doc.contact', 'apply.doc.print', 'apply.doc.olOne', 'apply.doc.principal', 'apply.doc.aptitudeOne']);   // one course each: singular wording
    const priv = A.documentsFor(answers({ candidate: 'PRIVATE', nameDiffers: true }), []).map(d => d.key);
    expect(priv).toContain('apply.doc.private');
    expect(priv).toContain('apply.doc.affidavit');
    expect(priv).not.toContain('apply.doc.principal');
    expect(priv).not.toContain('apply.doc.ol');
  });
  it('cites the handbook for every step and has it in all three languages', () => {
    const all = [...A.documentsFor(answers({ candidate: 'PRIVATE', nameDiffers: true }), [{ needsOl: true, hasAptitudeTest: true, course: 'X' }]), ...A.POST_STEPS];
    for (const i of all) {
      expect(i.page ?? i.section).toBeTruthy();
      for (const lang of [en, si, ta]) expect((lang as Record<string, string>)[i.key]?.length).toBeGreaterThan(10);
    }
    expect(A.UGC_ADDRESS).toBe('Deputy Secretary/ University Admissions, University Grants Commission, No. 20, Ward Place, Colombo 07');
  });
  it('keeps answers on this phone, and clearing the student\'s data removes them', () => {
    S.saveApply({ answers: answers({ address: 'No 68, School Road' }), done: { 'post:apply.post.print': true } });
    expect(S.loadApply().answers.address).toBe('No 68, School Road');
    expect(S.loadApply().done['post:apply.post.print']).toBe(true);
    S.clearStudentData();
    expect(S.loadApply()).toEqual(A.EMPTY_APPLY);
  });
});
