// Alerts (CR-002): official notices with a closing date: Gazette job exams and other intakes. Each shows whether the
// student meets the A/L and age rules, checked on this phone (results and date of birth never leave it). O/L rules are
// shown for the student to check: ZedPath does not hold O/L results. "Add to my Journey" makes it a dated step.
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CalendarCheck, CalendarPlus, CircleCheck, CircleHelp, CircleX, ExternalLink, Landmark, ScrollText } from 'lucide-react';
import type { ProfileInput } from '../../shared/api.ts';
import { checkNotice, sortNotices, type Check, type JourneyResponse } from '../../shared/journey.ts';
import { loadDob, saveAlertsSeen, saveDob } from '../storage.ts';
import { Stagger, rise } from '../ui.tsx';
import { longDate, today } from './Journey.tsx';

const CHECK: Record<Check, { icon: typeof CircleCheck; tone: string }> = {
  MEETS: { icon: CircleCheck, tone: 'var(--safe)' }, NOT_MET: { icon: CircleX, tone: 'var(--danger)' },
  UNKNOWN: { icon: CircleHelp, tone: 'var(--out)' }, NOT_NEEDED: { icon: CircleCheck, tone: 'var(--out)' },
};
function Line({ c, text }: { c: Check; text: string }) {
  const { icon: Icon, tone } = CHECK[c];
  return <span className="row body-m" style={{ flexWrap: 'nowrap', gap: 8, alignItems: 'flex-start' }}><Icon size={18} aria-hidden="true" style={{ color: tone, flex: 'none', marginTop: 2 }} /><span>{text}</span></span>;
}

export function AlertsScreen({ data, profile, saved, setSaved, go }: { data: JourneyResponse | null; profile: ProfileInput | null;
  saved: string[]; setSaved: (ids: string[]) => void; go: (to: string) => void }) {
  const [dob, setDob] = useState<string | null>(() => loadDob());
  useEffect(() => { if (data) saveAlertsSeen(data.notices.map(n => n.routeId)); }, [data]);       // opening Alerts clears the bell
  if (!data) return <><div className="skeleton" /><div className="skeleton" /></>;
  const t = today();
  const items = sortNotices(data.notices.map(n => ({ n, c: checkNotice(n, profile, dob, t) })));
  const setBirth = (v: string) => { const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; saveDob(d); setDob(d); };

  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">Alerts</h1>
        <p className="subtitle">Exams and intakes from the Government Gazette and official notices, checked against your results.</p>
      </div>
      <label className="field card" style={{ gap: 6 }}>
        <span>Your date of birth (optional)</span>
        <input className="input" type="date" value={dob ?? ''} max={t} onChange={e => setBirth(e.target.value)} />
        <span className="helper">Only used to check age limits. It stays on this phone and is never sent anywhere.</span>
      </label>

      <Stagger className="stack">
        {items.map(({ n, c }) => {
          const added = saved.includes(n.routeId);
          return (
            <motion.section key={n.routeId} variants={rise} className="card stack" style={{ gap: 10, opacity: c.status === 'CLOSED' ? .72 : 1 }}>
              <div className="row" style={{ gap: 6 }}>
                {c.status === 'OPEN' && <span className="pill open">{c.daysLeft === 0 ? 'Closes today' : `Open · ${c.daysLeft} day${c.daysLeft > 1 ? 's' : ''} left`}</span>}
                {c.status === 'UPCOMING' && <span className="pill band-LIKELY">Opens {longDate(n.opensOn!)}</span>}
                {c.status === 'CLOSED' && <span className="pill band-NOT_ENOUGH_DATA">Closed</span>}
                {c.forYou && c.al === 'MEETS' && <span className="pill band-SAFE">For you</span>}
                <span className="pill"><Landmark size={13} aria-hidden="true" />{n.kind === 'JOB_EXAM_CLOSE' ? 'Job exam' : 'Intake'}</span>
              </div>
              <h2 className="title-l" style={{ margin: 0 }}>{n.title}</h2>
              <span className="subtitle" style={{ margin: 0 }}>{n.provider}</span>
              <span className="body-m num"><b>Closes {longDate(n.closesOn)}</b></span>
              <div className="stack" style={{ gap: 6 }}>
                {n.al && <Line c={c.al} text={c.al === 'UNKNOWN' ? 'A/L rule: add your results to check' : `A/L: ${n.al.quote}`} />}
                {n.age && <Line c={c.age} text={c.age === 'UNKNOWN' ? `Age ${n.age.min ?? 'up'} to ${n.age.max} on ${longDate(n.age.asOf)}: add your date of birth to check`
                  : `Age ${n.age.min !== null ? `${n.age.min} to ` : 'up to '}${n.age.max} on ${longDate(n.age.asOf)}`} />}
                {n.ol && <Line c="UNKNOWN" text={`Check yourself (O/L): ${n.ol}`} />}
              </div>
              <a className="source-link" href={n.sourceUrl} target="_blank" rel="noopener"><ScrollText size={14} aria-hidden="true" />{n.sourceLocator}<ExternalLink size={12} aria-hidden="true" /></a>
              {c.status !== 'CLOSED' && (added
                ? <button className="btn tonal" onClick={() => go('/journey')}><CalendarCheck size={18} aria-hidden="true" />In your Journey</button>
                : <button className="btn filled" onClick={() => setSaved([...saved, n.routeId])}><CalendarPlus size={18} aria-hidden="true" />Add to my Journey</button>)}
              {n.officialUrl && c.status !== 'CLOSED' && <a className="btn text" href={n.officialUrl} target="_blank" rel="noopener" style={{ alignSelf: 'flex-start' }}>Official website<ExternalLink size={16} aria-hidden="true" /></a>}
            </motion.section>);
        })}
      </Stagger>
      <p className="footer-note">Checked against official sources on {longDate(data.notices[0]?.retrievedOn ?? t)}. Always read the full notice before applying.</p>
    </>
  );
}
