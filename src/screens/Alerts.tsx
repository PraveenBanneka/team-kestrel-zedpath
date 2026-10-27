// Alerts (CR-002): official notices with a closing date: Gazette job exams and other intakes. Each shows whether the
// student meets the A/L and age rules, checked on this phone (results and date of birth never leave it). O/L rules are
// shown for the student to check: FindMyWay does not hold O/L results. "Add to my Journey" makes it a dated step.
// Notice titles, rules and sources stay in English, as published (the screen says so in Sinhala and Tamil).
import { useEffect } from 'react';
import { motion } from 'motion/react';
import { CalendarCheck, CalendarPlus, CircleCheck, CircleHelp, CircleX, ExternalLink, Landmark, ScrollText } from 'lucide-react';
import type { ProfileInput } from '../../shared/api.ts';
import { checkNotice, sortNotices, type Check, type JourneyResponse } from '../../shared/journey.ts';
import { saveAlertsSeen } from '../storage.ts';
import { Stagger, rise } from '../ui.tsx';
import { getLang, t } from '../i18n/index.ts';
import { longDate, today } from './Journey.tsx';

const CHECK: Record<Check, { icon: typeof CircleCheck; tone: string }> = {
  MEETS: { icon: CircleCheck, tone: 'var(--safe)' }, NOT_MET: { icon: CircleX, tone: 'var(--danger)' },
  UNKNOWN: { icon: CircleHelp, tone: 'var(--out)' }, NOT_NEEDED: { icon: CircleCheck, tone: 'var(--out)' },
};
function Line({ c, text }: { c: Check; text: string }) {
  const { icon: Icon, tone } = CHECK[c];
  return <span className="row body-m" style={{ flexWrap: 'nowrap', gap: 8, alignItems: 'flex-start' }}><Icon size={18} aria-hidden="true" style={{ color: tone, flex: 'none', marginTop: 2 }} /><span>{text}</span></span>;
}

export function AlertsScreen({ data, profile, dob, saved, setSaved, embedded = false }: { data: JourneyResponse | null; profile: ProfileInput | null;
  dob: string | null; saved: string[]; setSaved: (ids: string[]) => void; go: (to: string) => void; embedded?: boolean }) {
  useEffect(() => { if (data) saveAlertsSeen(data.notices.map(n => n.routeId)); }, [data]);       // opening Alerts clears the bell
  if (!data) return <><div className="skeleton" /><div className="skeleton" /></>;
  const day = today();
  const items = sortNotices(data.notices.map(n => ({ n, c: checkNotice(n, profile, dob, day) })));

  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        {!embedded && <h1 className="screen-title">{t('al.h')}</h1>}
        <p className="subtitle">{t('al.sub')}</p>
        {getLang() !== 'en' && <p className="helper">{t('al.official')}</p>}
      </div>

      <Stagger className="stack">
        {items.map(({ n, c }) => {
          const added = saved.includes(n.routeId);
          const d = n.age ? longDate(n.age.asOf) : '';
          return (
            <motion.section key={n.routeId} variants={rise} className="card stack" style={{ gap: 10, opacity: c.status === 'CLOSED' ? .72 : 1 }}>
              <div className="row" style={{ gap: 6 }}>
                {c.status === 'OPEN' && <span className="pill open">{c.daysLeft === 0 ? t('al.closesToday') : c.daysLeft === 1 ? t('al.openDay') : t('al.openDays', { n: c.daysLeft })}</span>}
                {c.status === 'UPCOMING' && <span className="pill band-LIKELY">{t('al.opens', { d: longDate(n.opensOn!) })}</span>}
                {c.status === 'CLOSED' && <span className="pill band-NOT_ENOUGH_DATA">{t('al.closed')}</span>}
                {c.forYou && c.al === 'MEETS' && <span className="pill band-SAFE">{t('al.forYou')}</span>}
                <span className="pill"><Landmark size={13} aria-hidden="true" />{n.kind === 'JOB_EXAM_CLOSE' ? t('al.job') : t('al.intake')}</span>
              </div>
              <h2 className="title-l" style={{ margin: 0 }} lang="en">{n.title}</h2>
              <span className="subtitle" style={{ margin: 0 }} lang="en">{n.provider}</span>
              <span className="body-m num"><b>{t('al.closes', { d: longDate(n.closesOn) })}</b></span>
              <div className="stack" style={{ gap: 6 }}>
                {n.al && <Line c={c.al} text={c.al === 'UNKNOWN' ? t('al.alUnknown') : t('al.alRule', { q: n.al.quote })} />}
                {n.age && <Line c={c.age} text={c.age === 'UNKNOWN'
                  ? (n.age.min !== null ? t('al.ageUnknown', { min: n.age.min, max: n.age.max ?? '', d }) : t('al.ageUnknownMax', { max: n.age.max ?? '', d }))
                  : (n.age.min !== null ? t('al.age', { min: n.age.min, max: n.age.max ?? '', d }) : t('al.ageMax', { max: n.age.max ?? '', d }))} />}
                {n.ol && <Line c="UNKNOWN" text={t('al.ol', { t: n.ol })} />}
              </div>
              <a className="source-link" href={n.sourceUrl} target="_blank" rel="noopener" lang="en"><ScrollText size={14} aria-hidden="true" />{n.sourceLocator}<ExternalLink size={12} aria-hidden="true" /></a>
              {c.status !== 'CLOSED' && (added
                ? <button className="btn tonal" onClick={() => setSaved(saved.filter(x => x !== n.routeId))}><CalendarCheck size={18} aria-hidden="true" />{t('jt.following1')}</button>
                : <button className="btn filled" onClick={() => setSaved([...saved, n.routeId])}><CalendarPlus size={18} aria-hidden="true" />{t('jt.follow')}</button>)}
              {n.officialUrl && c.status !== 'CLOSED' && <a className="btn text" href={n.officialUrl} target="_blank" rel="noopener" style={{ alignSelf: 'flex-start' }}>{t('al.site')}<ExternalLink size={16} aria-hidden="true" /></a>}
            </motion.section>);
        })}
      </Stagger>
      <p className="footer-note">{t('al.footer', { d: longDate(data.notices[0]?.retrievedOn ?? day) })}</p>
    </>
  );
}
