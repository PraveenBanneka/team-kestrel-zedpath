import { describe, expect, it } from 'vitest';
import { artsBaskets, evaluate, type Rule, type Student } from './rules.ts';

const st = (stream: Student['stream'], al: Student['al'], ol?: Student['ol']): Student => ({ stream, al, ol });

// Medicine 001 (handbook p.50): "At least two 'C' grades and a 'S' grade in Biology, Chemistry and Physics"
const MEDICINE: Rule = { all: [
  { subject: 'BIO', min: 'S' }, { subject: 'CHEM', min: 'S' }, { subject: 'PHY', min: 'S' },
  { gradeCount: 2, min: 'C', of: ['BIO', 'CHEM', 'PHY'] },
] };
// Computer Science 012 (handbook p.70): C in CMATH or PHY or HMATH, and S in two other listed subjects
const COMPUTER_SCIENCE: Rule = { all: [
  { any: [{ subject: 'CMATH', min: 'C' }, { subject: 'PHY', min: 'C' }, { subject: 'HMATH', min: 'C' }] },
  { atLeast: 2, of: ['CMATH', 'HMATH', 'MATH', 'PHY', 'CHEM', 'ICT'].map(s => ({ subject: s, min: 'S' as const })) },
] };
// Physical Science 013 (handbook p.70): CMATH or HMATH, and CHEM or PHY, and a third from a list (distinct)
const PHYSICAL_SCIENCE: Rule = { all: [
  { any: [{ subject: 'CMATH', min: 'S' }, { subject: 'HMATH', min: 'S' }] },
  { any: [{ subject: 'CHEM', min: 'S' }, { subject: 'PHY', min: 'S' }] },
  { anySubjects: 1, min: 'S', from: ['AGRI', 'CMATH', 'BIO', 'HMATH', 'CHEM', 'PHY'] },
] };

describe('evaluate(): general minimum (BR-001)', () => {
  it('rejects any subject below S', () =>
    expect(evaluate({ anySubjects: 3, min: 'S' }, undefined, st('ARTS', { ECON: 'C', GEOG: 'S', HIST: 'F' as never }))).toBe('NOT_ELIGIBLE'));
  it('requires exactly three subjects', () =>
    expect(() => evaluate({ anySubjects: 3, min: 'S' }, undefined, st('ARTS', { ECON: 'C', GEOG: 'S' }))).toThrow());
});

describe('evaluate(): handbook examples', () => {
  it('Medicine: two Cs and an S is eligible; one C is not', () => {
    expect(evaluate(MEDICINE, undefined, st('BIO', { BIO: 'C', CHEM: 'C', PHY: 'S' }))).toBe('ELIGIBLE');
    expect(evaluate(MEDICINE, undefined, st('BIO', { BIO: 'C', CHEM: 'S', PHY: 'S' }))).toBe('NOT_ELIGIBLE');
  });
  it('Computer Science: C in Physics alone satisfies "Combined Mathematics or Physics" (AC-201.3)', () => {
    expect(evaluate(COMPUTER_SCIENCE, undefined, st('PHYS', { CMATH: 'S', PHY: 'C', CHEM: 'S' }))).toBe('ELIGIBLE');
  });
  it('Computer Science: the gate subject cannot also count as one of the two others', () => {
    // CMATH C is the gate; then two OTHER listed subjects are needed: only ICT is listed -> not eligible
    expect(evaluate(COMPUTER_SCIENCE, undefined, st('PHYS', { CMATH: 'C', ICT: 'A', ECON: 'A' }))).toBe('NOT_ELIGIBLE');
    expect(evaluate(COMPUTER_SCIENCE, undefined, st('PHYS', { CMATH: 'C', ICT: 'A', PHY: 'S' }))).toBe('ELIGIBLE');
  });
  it('Physical Science: three distinct subjects; a subject used for one slot cannot fill the third', () => {
    expect(evaluate(PHYSICAL_SCIENCE, undefined, st('PHYS', { CMATH: 'S', CHEM: 'S', PHY: 'S' }))).toBe('ELIGIBLE');
    expect(evaluate(PHYSICAL_SCIENCE, undefined, st('PHYS', { CMATH: 'S', PHY: 'S', ICT: 'A' }))).toBe('NOT_ELIGIBLE');
  });
});

describe('Arts basket rules (handbook printed pp.31 to 34)', () => {
  const ok = (...subs: string[]) => artsBaskets(st('ARTS', Object.fromEntries(subs.map(x => [x, 'S'])) as Student['al']));
  it('needs at least one Basket 01 subject in general', () => {
    expect(ok('ECON', 'GEOG', 'HIST')).toBe(true);
    expect(ok('BUDDHISM', 'ART', 'FRE')).toBe(false);
  });
  it('exception 1: three national languages', () => expect(ok('SIN', 'TAM', 'ENG')).toBe(true));
  it('exception 2 / basket 04 exemption b: one national and two classical (the handbook example)', () =>
    expect(ok('SIN', 'PALI', 'SANSKRIT')).toBe(true));
  it('never three classical or three foreign languages', () => {
    expect(ok('ARABIC', 'PALI', 'SANSKRIT')).toBe(false);
    expect(ok('CHINESE', 'FRE', 'GER')).toBe(false);
  });
  it('two national and one classical is three languages without an exemption', () => expect(ok('SIN', 'ENG', 'PALI')).toBe(false));
  it('exception 3: two languages plus a basket 02 or 03 subject', () => {
    expect(ok('CHINESE', 'FRE', 'BUDDHISM')).toBe(true);
    expect(ok('SIN', 'ENG', 'MUSIC')).toBe(true);
  });
  it('never a religion with its own civilisation', () => {
    expect(ok('BUDDHISM', 'BUDCIV', 'ECON')).toBe(false);
    expect(ok('BUDDHISM', 'HINDUCIV', 'ECON')).toBe(true);
  });
  it('at most one technological subject', () => expect(ok('CIVTECH', 'EEIT', 'ECON')).toBe(false));
  it('rejects subjects outside the Arts baskets', () => expect(ok('PHY', 'ECON', 'GEOG')).toBe(false));
});

describe('evaluate(): streams and O/L requirements (FR-113)', () => {
  const COMMERCE_ANY3: Rule = { all: [{ streamIs: ['COMMERCE', 'BIO', 'PHYS'] }, { anySubjects: 3, min: 'S' }] };
  it('checks the stream', () => {
    expect(evaluate(COMMERCE_ANY3, undefined, st('COMMERCE', { ECON: 'S', ACC: 'S', BSTUD: 'S' }))).toBe('ELIGIBLE');
    expect(evaluate(COMMERCE_ANY3, undefined, st('ARTS', { ECON: 'S', GEOG: 'S', HIST: 'S' }))).toBe('NOT_ELIGIBLE');
  });
  const OL: Rule = { all: [{ olSubject: 'ENG_OL', min: 'C' }, { any: [{ olSubject: 'MATH_OL', min: 'C' }, { subject: 'MATH', min: 'S' }] }] };
  const s = (ol?: Student['ol']) => st('COMMERCE', { ECON: 'S', ACC: 'S', BSTUD: 'S' }, ol);
  it('is NEEDS_OL until O/L grades are given', () => expect(evaluate({ anySubjects: 3, min: 'S' }, OL, s())).toBe('NEEDS_OL'));
  it('evaluates O/L grades once given', () => {
    expect(evaluate({ anySubjects: 3, min: 'S' }, OL, s({ ENG_OL: 'C', MATH_OL: 'B' }))).toBe('ELIGIBLE');
    expect(evaluate({ anySubjects: 3, min: 'S' }, OL, s({ ENG_OL: 'S', MATH_OL: 'A' }))).toBe('NOT_ELIGIBLE');
  });
});
