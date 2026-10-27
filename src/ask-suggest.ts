// Suggested questions on Ask FindMyWay (Praveen 2026-10-11): built from the student's own details, so each chip shows
// what Ask can do with them: their chances, their best achievement against the course they are reaching for, their
// interests, then questions every student has. Asked in the interface language (Ask answers in that language).
import type { Extras } from '../shared/account.ts';
import type { ListEntry } from '../shared/list.ts';
import { t, type Key } from './i18n/index.ts';

const LEVEL_RANK = ['SCHOOL', 'ZONAL', 'DISTRICT', 'PROVINCIAL', 'NATIONAL', 'INTERNATIONAL'];
const PLACE_RANK = ['TAKING_PART', 'THIRD', 'SECOND', 'FIRST'];

export function askSuggestions(extras: Extras, list: ListEntry[]): string[] {
  const out = [t('ask.q.chances')];
  const best = [...extras.achievements].sort((a, b) =>
    LEVEL_RANK.indexOf(b.level) - LEVEL_RANK.indexOf(a.level) || PLACE_RANK.indexOf(b.place) - PLACE_RANK.indexOf(a.place) || b.year - a.year)[0];
  if (best) {
    const aim = list.find(e => e.band === 'REACH') ?? list[0];
    const target = aim ? t('ask.q.at', { course: aim.course, institution: aim.institution }) : t('ask.q.uni');
    const vals = { activity: best.activity, level: t(`level.${best.level}` as Key).toLowerCase(), year: best.year, target };
    out.push(best.place === 'TAKING_PART' ? t('ask.q.achPart', vals) : t('ask.q.ach', { ...vals, place: t(`ask.place.${best.place}` as Key) }));
  }
  const likes = extras.interests.map(i => i.toLowerCase());
  if (likes.length) out.push(t('ask.q.interests', { interests: likes.length > 1 ? `${likes.slice(0, -1).join(', ')}${t('ask.and')}${likes.at(-1)}` : likes[0]! }));
  out.push(t('ask.q.aptitude'), t('ask.q.loanIt'), t('ask.q.jobs'), t('ask.q.ugc'));
  return out.slice(0, 5);
}
