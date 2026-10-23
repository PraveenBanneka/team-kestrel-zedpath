// The words of the "added to My list" confirmation, from the result of addManyToList (shared/list.ts).
import { t } from './i18n/index.ts';

export function addedMessage(r: { added: number; already: number; full: number }): string {
  return [
    r.added > 0 ? (r.added === 1 ? t('sel.addedOne') : t('sel.added', { n: r.added })) : '',
    r.already ? t('sel.already', { n: r.already }) : '',
    r.full ? t('detail.err.FULL') : '',
  ].filter(Boolean).join(' ');
}
