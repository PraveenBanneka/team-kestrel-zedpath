// Degree comparer: up to 3 courses side by side with the student's own chance, the cut-off history for their
// district, the entry rules, duration, places, selection basis and aptitude test. All values come from the same
// API as the course page (UGC data with citations); nothing is estimated here.
// Video 2 (Praveen 2026-10-11): every Compare button opens this screen; the columns swipe sideways, and a "+" column
// to the right of the last course adds another (search your courses, or pick from My list).
// Review 2026-10-18: the picker opens ABOVE the table and scrolls into view (below a tall table it was off-screen, so "+"
// looked dead), and a new column is scrolled to sit just right of the sticky labels instead of under them.
import { useEffect, useMemo, useRef, useState } from 'react';
import { ListOrdered, Plus, Scale, Search, X } from 'lucide-react';
import type { OfferingDetail, ProfileInput, ResultsResponse } from '../../shared/api.ts';
import { formatGap, formatZ, type Band } from '../../shared/banding.ts';
import type { ListEntry } from '../../shared/list.ts';
import { matches } from '../../shared/search.ts';
import { shortDuration, shortInstitution, shortYear, titleCase } from '../format.ts';
import { locale, t } from '../i18n/index.ts';

export const COMPARE_MAX = 3;
const bandLabel = (b: Band) => t(`band.${b}`);
const BAND_ORDER: Band[] = ['SAFE', 'LIKELY', 'REACH'];

function Spark({ history }: { history: OfferingDetail['groups'][number]['history'] }) {
  const pts = [...history].reverse().filter(h => h.zE4 !== null) as { academicYear: string; zE4: number }[];
  if (pts.length < 2) return <span className="helper">{pts.length ? formatZ(pts[0].zE4) : t('cmp.noData')}</span>;
  const W = 110, H = 34, min = Math.min(...pts.map(p => p.zE4)), max = Math.max(...pts.map(p => p.zE4)), span = Math.max(1, max - min);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(i * W / (pts.length - 1)).toFixed(1)} ${(H - 4 - (p.zE4 - min) / span * (H - 8)).toFixed(1)}`).join(' ');
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={pts.map(p => `${shortYear(p.academicYear)} ${formatZ(p.zE4)}`).join(', ')}>
    <path d={d} fill="none" stroke="var(--brand-500)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

/** Search the student's own courses (Safe, Likely, Reach) and My list, to add one to the comparison. */
function Picker({ codes, results, list, onPick }: { codes: string[]; results: ResultsResponse | null; list: ListEntry[]; onPick: (u: string) => void }) {
  const [q, setQ] = useState('');
  const box = useRef<HTMLElement>(null);
  useEffect(() => { box.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, []);
  const fromList = list.filter(e => !codes.includes(e.uniCode)).slice(0, 6);
  const found = useMemo(() => {
    const seen = new Set<string>();
    return (results?.offerings ?? []).filter(o => BAND_ORDER.includes(o.band) && !codes.includes(o.uniCode) && (!q.trim() || matches(q, o.course, o.institution, o.uniCode)))
      .sort((a, b) => BAND_ORDER.indexOf(a.band) - BAND_ORDER.indexOf(b.band) || (b.gapToLatestE4 ?? 0) - (a.gapToLatestE4 ?? 0))
      .filter(o => { if (seen.has(o.uniCode)) return false; seen.add(o.uniCode); return true; }).slice(0, 8);
  }, [results, codes, q]);
  return (
    <section ref={box} className="card stack" aria-labelledby="cmp-pick-h" style={{ scrollMarginTop: 72 }}>
      <h2 id="cmp-pick-h" className="title-m">{t('cmp.pickH')}</h2>
      <label className="search"><Search size={20} aria-hidden="true" /><input placeholder={t('cmp.search')} value={q} onChange={e => setQ(e.target.value)}
        aria-label={t('cmp.search')} enterKeyHint="search" /></label>
      {fromList.length > 0 && !q.trim() && (<>
        <p className="section-label"><ListOrdered size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />{t('cmp.fromList')}</p>
        <div className="chips">{fromList.map(e => (
          <button key={e.uniCode} type="button" className="chip" onClick={() => onPick(e.uniCode)}><Plus size={14} aria-hidden="true" />{e.course} · {e.institution}</button>))}</div>
      </>)}
      <div className="list-card flat">
        {found.map(o => (
          <button key={o.uniCode} type="button" className="item" onClick={() => onPick(o.uniCode)}>
            <span className={`strip ${o.band}`} aria-hidden="true" />
            <span className="grow"><span className="t">{titleCase(o.course)}</span><span className="s">{shortInstitution(o.institution)} · {bandLabel(o.band)}</span></span>
            <Plus size={20} className="chev" aria-hidden="true" />
          </button>))}
        {results && found.length === 0 && <p className="helper" style={{ padding: 12 }}>{t('cmp.noMatch')}</p>}
      </div>
    </section>);
}

export function CompareScreen({ codes, setCodes, profile, results, list, go }: { codes: string[]; setCodes: (c: string[]) => void;
  profile: ProfileInput; results: ResultsResponse | null; list: ListEntry[]; go: (to: string) => void }) {
  const [details, setDetails] = useState<Record<string, OfferingDetail | 'error'>>({});
  const [picking, setPicking] = useState(codes.length === 0);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    for (const u of codes) if (!details[u]) fetch(`/api/offerings/${u}?district=${profile.district}`)
      .then(r => r.ok ? r.json() : Promise.reject()).then(d => setDetails(x => ({ ...x, [u]: d as OfferingDetail })))
      .catch(() => setDetails(x => ({ ...x, [u]: 'error' })));
  }, [codes, profile.district]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (codes.length === 0) setPicking(true); }, [codes.length]);

  const pick = (u: string) => { setCodes([...codes, u]); setPicking(false); };
  // Show a newly added column with its left edge just right of the sticky label column (never hidden under it).
  const shown = useRef(codes.length);
  useEffect(() => {
    const grew = codes.length > shown.current; shown.current = codes.length;
    const el = wrap.current; if (!grew || !el) return;
    const heads = el.querySelectorAll<HTMLElement>('thead th');
    const col = heads[codes.length], label = heads[0];
    if (col && label) el.scrollTo({ left: Math.max(0, col.offsetLeft - label.offsetWidth), behavior: 'smooth' });
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [codes.length]);
  const canAdd = codes.length < COMPARE_MAX;
  const cols = codes.map(u => ({ u, d: details[u], mine: results?.offerings.filter(o => o.uniCode === u) ?? [] }));

  const row = (label: string, cell: (c: typeof cols[number], d: OfferingDetail) => React.ReactNode) => (
    <tr><th scope="row">{label}</th>{cols.map(c => <td key={c.u}>{c.d && c.d !== 'error' ? cell(c, c.d) : c.d === 'error' ? '—' : <span className="skeleton-line" />}</td>)}
      {canAdd && <td className="add-col" aria-hidden="true" />}</tr>);

  return (
    <>
      <div className="row" style={{ flexWrap: 'nowrap', gap: 14 }}>
        <span className="ic-lg" style={{ background: 'var(--likely-bg)', color: 'var(--likely)' }}><Scale size={26} aria-hidden="true" /></span>
        <div className="stack" style={{ gap: 2 }}><h1 className="screen-title">{t('title.compare')}</h1>
          <p className="subtitle">{t('cmp.sub', { n: COMPARE_MAX })}</p></div>
      </div>

      {canAdd && picking && <Picker codes={codes} results={results} list={list} onPick={pick} />}
      {codes.length > 0 && (<>
        <div ref={wrap} style={{ scrollMarginTop: 72 }} className="compare-wrap swipe" role="region" aria-label={t('cmp.region')} tabIndex={0}>
          <table className="compare-table">
            <thead><tr><th scope="col"><span className="sr-only">{t('cmp.detail')}</span></th>{cols.map(c => {
              const d = c.d && c.d !== 'error' ? c.d : null;
              return <th scope="col" key={c.u}>
                <button type="button" className="col-x" aria-label={t('cmp.removeAria', { c: d ? titleCase(d.course) : c.u })} onClick={() => setCodes(codes.filter(x => x !== c.u))}><X size={16} /></button>
                <button type="button" className="col-head" onClick={() => go(`/course/${c.u}`)}>
                  <span className="t">{d ? titleCase(d.course) : c.d === 'error' ? t('cmp.noData') : <span className="skeleton-line" />}</span>
                  <span className="s">{d ? `${shortInstitution(d.institution)} · ${c.u}` : c.u}</span>
                </button></th>; })}
              {canAdd && <th scope="col" className="add-col">
                <button type="button" className={`add-slot ${picking ? 'on' : ''}`} onClick={() => setPicking(p => !p)} aria-expanded={picking}>
                  <Plus size={26} aria-hidden="true" /><span>{t('cmp.add')}</span></button></th>}
            </tr></thead>
            <tbody>
              {row(t('cmp.chance'), c => c.mine.length
                ? c.mine.map(o => <span key={o.group} className={`pill band-${o.band}`}>{bandLabel(o.band)}{c.mine.length > 1 ? ` (${o.group})` : ''}</span>)
                : <span className="pill band-OUT_OF_RANGE">{t('cmp.notEligible')}</span>)}
              {row(t('cmp.latest'), (c, d) => {
                const h = d.groups[0]?.history.find(x => x.zE4 !== null);
                return h ? <span className="num"><b>{formatZ(h.zE4!)}</b><br /><span className="helper">{shortYear(h.academicYear)}{c.mine[0]?.gapToLatestE4 != null ? ` · ${t('cmp.you', { gap: formatGap(c.mine[0].gapToLatestE4) })}` : ''}</span></span> : '—';
              })}
              {row(t('cmp.trend'), (_c, d) => <Spark history={d.groups[0]?.history ?? []} />)}
              {row(t('cmp.needs'), (_c, d) => <span className="cell-list">{d.needs.slice(0, 4).map((n, i) => <span key={i}>{n.replace(/:$/, '')}</span>)}</span>)}
              {row(t('cmp.aptitude'), (_c, d) => d.hasAptitudeTest ? t('cmp.yes') : t('cmp.no'))}
              {row(t('cmp.duration'), (_c, d) => d.duration ? shortDuration(d.duration) : '—')}
              {row(t('cmp.places'), (_c, d) => d.proposedIntake ? <span className="num">{d.proposedIntake.toLocaleString(locale())}</span> : '—')}
              {row(t('cmp.selection'), (_c, d) => d.selectionBasis === 'MERIT_ONLY' ? t('cmp.merit') : t('cmp.quotas'))}
              {row(t('cmp.syllabus'), (c, d) => d.syllabus
                ? <button type="button" className="source-link" style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => go(`/course/${c.u}`)}>
                    {d.syllabus.years.length === 1 ? t('cmp.modulesOne', { m: d.syllabus.years.reduce((a, y) => a + y.modules.length, 0) })
                      : t('cmp.modules', { m: d.syllabus.years.reduce((a, y) => a + y.modules.length, 0), y: d.syllabus.years.length })}</button>
                : <span className="helper">{t('cmp.notAdded')}</span>)}
              {row(t('cmp.source'), (_c, d) => <span className="helper">UGC handbook 2025/26, p.{d.requirementCitation.page}</span>)}
            </tbody>
          </table>
        </div>
        {codes.length > 1 && <p className="helper" style={{ textAlign: 'center' }}>{t('cmp.swipe')}</p>}
      </>)}

      <p className="footer-note">{t('cmp.footer')}</p>
    </>
  );
}
