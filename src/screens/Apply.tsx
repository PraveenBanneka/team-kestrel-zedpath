// Apply to the UGC, step by step (CR-012): the student's own checklist, their details ready to copy into each screen of
// the UGC online application, and the print-and-post steps, each with its page in the UGC handbook 2025/26 (Section 5).
// ZedPath never logs in to the UGC: the student copies what ZedPath knows; for the rest a guide says what to write and
// the common mistake (no typing the form twice). Only two answers and the ticks are kept, on this phone (storage.ts).
import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Circle, Copy, Info, ShieldCheck } from 'lucide-react';
import type { Meta, ProfileInput, ResultsResponse } from '../../shared/api.ts';
import type { Contact } from '../../shared/contact.ts';
import { nameOf } from '../../shared/describe.ts';
import { formatZ } from '../../shared/banding.ts';
import { uniCodesText, type ListEntry } from '../../shared/list.ts';
import { FORM_GUIDES, POST_STEPS, UGC_ADDRESS, blockCaps, documentsFor, localMobile, nameWithInitials, type ApplyAnswers, type Item } from '../apply.ts';
import { loadApply, saveApply } from '../storage.ts';
import { useToast } from '../Toast.tsx';
import { t } from '../i18n/index.ts';
import type { Key } from '../i18n/en.ts';

const source = (i: { page?: string; section?: string }) => i.page ? t('apply.src', { p: i.page }) : t('apply.srcSec', { s: i.section ?? '' });

export function ApplyScreen({ profile, meta, contact, list, results, go }: { profile: ProfileInput; meta: Meta | null; contact: Contact | null;
  list: ListEntry[]; results: ResultsResponse | null; go: (to: string) => void }) {
  const [state, setState] = useState(loadApply);
  useEffect(() => { saveApply(state); }, [state]);
  const [toast, showToast] = useToast(1800);
  const a = state.answers;
  const set = (k: keyof ApplyAnswers, v: ApplyAnswers[keyof ApplyAnswers]) => setState(s => ({ ...s, answers: { ...s.answers, [k]: v } }));
  const tick = (k: string) => setState(s => ({ ...s, done: { ...s.done, [k]: !s.done[k] } }));
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); showToast(t('apply.copied')); } catch { /* blocked */ } };

  const onList = list.map(e => results?.offerings.find(o => o.uniCode === e.uniCode)).filter(Boolean)
    .map(o => ({ needsOl: o!.needsOl, hasAptitudeTest: o!.hasAptitudeTest, course: list.find(e => e.uniCode === o!.uniCode)?.course ?? o!.course }));
  const docs = documentsFor(a, onList);
  const allTicks = [...docs.map(d => `doc:${d.key}`), ...POST_STEPS.map(p => `post:${p.key}`)];
  const doneCount = allTicks.filter(k => state.done[k]).length;
  const district = meta?.districts.find(d => d.code === profile.district)?.name ?? profile.district;

  // Plain functions, not components: a component defined in here would remount its input on every keystroke.
  const tickRow = ({ id, item, extra }: { id: string; item: Item; extra?: ReactNode }) => (
    <li key={id} className="apply-tick">
      <button type="button" role="checkbox" aria-checked={!!state.done[id]} onClick={() => tick(id)} className="icon-btn" aria-label={t(item.key, item.vars)}>
        {state.done[id] ? <CheckCircle2 size={22} style={{ color: 'var(--safe)' }} aria-hidden="true" /> : <Circle size={22} aria-hidden="true" />}
      </button>
      <span className="grow"><span className="body-m">{t(item.key, item.vars)}</span>{extra}<span className="source"> {source(item)}</span></span>
    </li>);

  const field = ({ label, value, copyText, input }: { label: Key; value?: string; copyText?: string; input?: ReactNode }) => (
    <div key={label} className="apply-field">
      <span className="apply-label">{t(label)}</span>
      <div className="row" style={{ flexWrap: 'nowrap', gap: 8 }}>
        {input ?? <span className="apply-value">{value || '—'}</span>}
        {(copyText ?? value) ? <button type="button" className="icon-btn" onClick={() => copy(copyText ?? value ?? '')} aria-label={t('apply.copyX', { x: t(label) })}><Copy size={18} aria-hidden="true" /></button> : null}
      </div>
    </div>);
  const guide = (g: (typeof FORM_GUIDES)[number]) => (
    <div key={g.key} className="apply-field">
      <span className="apply-label">{t(g.title)}</span>
      <span className="body-m">{t(g.key)} <span className="source">{t('apply.src', { p: g.page })}</span></span>
    </div>);
  const G = (key: string) => guide(FORM_GUIDES.find(g => g.key === key)!);

  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">{t('apply.title')}</h1>
        <p className="subtitle">{t('apply.sub')}</p>
        <p className="helper" role="status">{t('apply.progress', { n: doneCount, m: allTicks.length })}</p>
      </div>
      <div className="alert info"><ShieldCheck size={20} aria-hidden="true" /><span>{t('apply.private')}</span></div>

      <section className="card stack" aria-labelledby="ap1">
        <h2 id="ap1" className="title-l">{t('apply.s1')}</h2>
        <p className="body-m">{t('apply.qCandidate')}</p>
        <div className="seg" role="radiogroup" aria-label={t('apply.qCandidate')}>
          {(['SCHOOL', 'PRIVATE'] as const).map(c => <button key={c} type="button" role="radio" aria-checked={a.candidate === c} className={a.candidate === c ? 'on' : ''} onClick={() => set('candidate', c)}><span>{t(c === 'SCHOOL' ? 'apply.school' : 'apply.privateC')}</span></button>)}
        </div>
        <p className="body-m">{t('apply.qName')}</p>
        <div className="seg" role="radiogroup" aria-label={t('apply.qName')}>
          {([true, false] as const).map(v => <button key={String(v)} type="button" role="radio" aria-checked={a.nameDiffers === v} className={a.nameDiffers === v ? 'on' : ''} onClick={() => set('nameDiffers', v)}><span>{t(v ? 'apply.yes' : 'apply.no')}</span></button>)}
        </div>
        <ul className="plain-list apply-ticks">{docs.map(d => tickRow({ id: `doc:${d.key}`, item: d }))}</ul>
      </section>

      <section className="card stack" aria-labelledby="ap2">
        <h2 id="ap2" className="title-l">{t('apply.s2')}</h2>
        <div className="alert info"><Info size={20} aria-hidden="true" /><span>{t('apply.autofill')}</span></div>

        <h3 className="title-m">{t('apply.g.register')} <span className="source">{t('apply.src', { p: '127-130' })}</span></h3>
        {G('apply.gd.nic')}
        {G('apply.gd.alIndex')}
        {field({ label: 'apply.f.initials', value: contact ? nameWithInitials(contact.fullName) : '' })}
        {field({ label: 'apply.f.fullName', value: contact ? blockCaps(contact.fullName) : '' })}
        {field({ label: 'apply.f.dob', value: contact?.birthDate ?? '' })}
        {field({ label: 'apply.f.email', value: contact?.email ?? '' })}
        {field({ label: 'apply.f.mobile', value: contact ? localMobile(contact.mobile) : '' })}

        <h3 className="title-m">{t('apply.g.step1')} <span className="source">{t('apply.src', { p: '135' })}</span></h3>
        {G('apply.gd.address')}
        {field({ label: 'apply.f.district', value: district })}
        {G('apply.gd.parents')}

        <h3 className="title-m">{t('apply.g.step2')} <span className="source">{t('apply.src', { p: '136' })}</span></h3>
        {field({ label: 'apply.f.results', value: `${Object.entries(profile.al).map(([s, g]) => `${nameOf(s)} ${g}`).join(' · ')} · Z ${formatZ(profile.zE4)}`, copyText: '' })}
        {G('apply.gd.prev')}

        <h3 className="title-m">{t('apply.g.step3')} <span className="source">{t('apply.src', { p: '137' })}</span></h3>
        {G('apply.gd.school')}

        <h3 className="title-m">{t('apply.g.step4')} <span className="source">{t('apply.src', { p: '140' })}</span></h3>
        {list.length > 0
          ? <>
              <p className="helper">{t('apply.step4note')}</p>
              <ol className="apply-codes">{list.map(e => <li key={e.uniCode}><span className="num">{e.uniCode}</span> <span className="helper">{e.course}</span></li>)}</ol>
              <button type="button" className="btn tonal" onClick={() => copy(uniCodesText(list))}><Copy size={18} aria-hidden="true" />{t('apply.copyAll', { n: list.length })}</button>
            </>
          : <button type="button" className="btn tonal" onClick={() => go('/list')}>{t('apply.step4empty')}</button>}
      </section>

      <section className="card stack" aria-labelledby="ap3">
        <h2 id="ap3" className="title-l">{t('apply.s3')}</h2>
        <ul className="plain-list apply-ticks">{POST_STEPS.map(p => tickRow({ id: `post:${p.key}`, item: p,
          extra: p.key === 'apply.post.send' ? <span className="row" style={{ marginTop: 6 }}><span className="apply-value">{UGC_ADDRESS}</span>
            <button type="button" className="icon-btn" onClick={() => copy(UGC_ADDRESS)} aria-label={t('apply.copyX', { x: t('apply.address') })}><Copy size={18} aria-hidden="true" /></button></span> : null }))}</ul>
      </section>
      <p className="footer-note">{t('apply.footer')}</p>
      {toast}
    </>
  );
}
