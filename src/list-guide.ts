// "What you need to know" under My list (CR-011, 23 October 2026): the UGC's own rules for the preference list, each with
// its place in the UGC handbook 2025/26. Praveen found that FindMyWay's old advice (put Very likely courses last, "Fix the
// order") contradicted the handbook, which says the order must follow the student's own preference (p.112).
import type { Key } from './i18n/en.ts';

export interface GuideItem { key: Key; page?: string; section?: string }

export const LIST_GUIDE: GuideItem[] = [
  { key: 'list.guide.order', page: '112' },        // items 7-8: "decreasing interest ... in the mind of the student"
  { key: 'list.guide.highest', page: '112-113' },  // items 11, 12, 14 and 15: only listed Uni-Codes; most preferred first; up to 125
  { key: 'list.guide.cutoffs', page: '112' },      // item 10: do not depend on last year's cut-off pattern
  { key: 'list.guide.register', page: '114' },     // "Important": not registering loses higher-preferred universities, same course
  { key: 'list.guide.change', page: '116' },       // 3.3: change the order once, within two weeks, post the signed copy
  { key: 'list.guide.aptitude', section: '2.2' },  // practical / aptitude tests: each university's own press notice
];
