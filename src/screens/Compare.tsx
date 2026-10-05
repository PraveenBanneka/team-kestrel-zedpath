// Degree comparer: up to 3 courses side by side with the student's own chance, the cut-off history for their
// district, the entry rules, duration, places, selection basis and aptitude test. All values come from the same
// API as the course page (UGC data with citations); nothing is estimated here.
import { useEffect, useState } from 'react';
import { ListOrdered, Plus, Scale, X } from 'lucide-react';
import type { OfferingDetail, ProfileInput, ResultsResponse } from '../../shared/api.ts';
import { formatGap, formatZ, type Band } from '../../shared/banding.ts';
import type { ListEntry } from '../../shared/list.ts';
import { shortDuration, shortInstitution, shortYear, titleCase } from '../format.ts';

export const COMPARE_MAX = 3;
const BAND_LABEL: Record<Band, string> = { SAFE: 'Safe', LIKELY: 'Likely', REACH: 'Reach', OUT_OF_RANGE: 'Out of range', NOT_ENOUGH_DATA: 'Not enough data' };

function Spark({ history }: { history: OfferingDetail['groups'][number]['history'] }) {
  const pts = [...history].reverse().filter(h => h.zE4 !== null) as { academicYear: string; zE4: number }[];
  if (pts.length < 2) return <span className="helper">{pts.length ? formatZ(pts[0].zE4) : 'No data'}</span>;
  const W = 110, H = 34, min = Math.min(...pts.map(p => p.zE4)), max = Math.max(...pts.map(p => p.zE4)), span = Math.max(1, max - min);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${(i * W / (pts.length - 1)).toFixed(1)} ${(H - 4 - (p.zE4 - min) / span * (H - 8)).toFixed(1)}`).join(' ');
  return <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={pts.map(p => `${shortYear(p.academicYear)} ${formatZ(p.zE4)}`).join(', ')}>
    <path d={d} fill="none" stroke="var(--brand-500)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" /></svg>;
}

export function CompareScreen({ codes, setCodes, profile, results, list, go }: { codes: string[]; setCodes: (c: string[]) => void;
  profile: ProfileInput; results: ResultsResponse | null; list: ListEntry[]; go: (to: string) => void }) {
  const [details, setDetails] = useState<Record<string, OfferingDetail | 'error'>>({});
  useEffect(() => {
    for (const u of codes) if (!details[u]) fetch(`/api/offerings/${u}?district=${profile.district}`)
      .then(r => r.ok ? r.json() : Promise.reject()).then(d => setDetails(x => ({ ...x, [u]: d as OfferingDetail })))
      .catch(() => setDetails(x => ({ ...x, [u]: 'error' })));
  }, [codes, profile.district]);   // eslint-disable-line react-hooks/exhaustive-deps

  const fromList = list.filter(e => !codes.includes(e.uniCode)).slice(0, 6);
  const cols = codes.map(u => ({ u, d: details[u], mine: results?.offerings.filter(o => o.uniCode === u) ?? [] }));

  const row = (label: string, cell: (c: typeof cols[number], d: OfferingDetail) => React.ReactNode) => (
    <tr><th scope="row">{label}</th>{cols.map(c => <td key={c.u}>{c.d && c.d !== 'error' ? cell(c, c.d) : c.d === 'error' ? '—' : <span className="skeleton-line" />}</td>)}</tr>);

  return (
    <>
      <div className="row" style={{ flexWrap: 'nowrap', gap: 14 }}>
        <span className="ic-lg" style={{ background: 'var(--likely-bg)', color: 'var(--likely)' }}><Scale size={26} aria-hidden="true" /></span>
        <div className="stack" style={{ gap: 2 }}><h1 className="screen-title">Compare</h1>
          <p className="subtitle">Up to {COMPARE_MAX} courses side by side, with your own chances.</p></div>
      </div>

      {codes.length === 0 && <div className="card"><p className="subtitle">Open a course and tap <b>Compare</b>, or pick from your list below.</p></div>}

      {codes.length > 0 && (
        <div className="compare-wrap" role="region" aria-label="Comparison table" tabIndex={0}>
          <table className="compare-table">
            <thead><tr><th scope="col"><span className="sr-only">Detail</span></th>{cols.map(c => {
              const d = c.d && c.d !== 'error' ? c.d : null;
              return <th scope="col" key={c.u}>
                <button type="button" className="col-x" aria-label={`Remove ${c.u} from comparison`} onClick={() => setCodes(codes.filter(x => x !== c.u))}><X size={16} /></button>
                <button type="button" className="col-head" onClick={() => go(`/course/${c.u}`)}>
                  <span className="t">{d ? titleCase(d.course) : c.u}</span>
                  <span className="s">{d ? shortInstitution(d.institution) : ''} · {c.u}</span>
                </button></th>; })}</tr></thead>
            <tbody>
              {row('Your chance', c => c.mine.length
                ? c.mine.map(o => <span key={o.group} className={`pill band-${o.band}`}>{BAND_LABEL[o.band]}{c.mine.length > 1 ? ` (${o.group})` : ''}</span>)
                : <span className="pill band-OUT_OF_RANGE">Not eligible</span>)}
              {row('Latest cut-off', (c, d) => {
                const h = d.groups[0]?.history.find(x => x.zE4 !== null);
                return h ? <span className="num"><b>{formatZ(h.zE4!)}</b><br /><span className="helper">{shortYear(h.academicYear)}{c.mine[0]?.gapToLatestE4 != null ? ` · you ${formatGap(c.mine[0].gapToLatestE4)}` : ''}</span></span> : '—';
              })}
              {row('5-year trend', (_c, d) => <Spark history={d.groups[0]?.history ?? []} />)}
              {row('Needs', (_c, d) => <span className="cell-list">{d.needs.slice(0, 4).map((n, i) => <span key={i}>{n.replace(/:$/, '')}</span>)}</span>)}
              {row('Aptitude test', (_c, d) => d.hasAptitudeTest ? 'Yes' : 'No')}
              {row('Duration', (_c, d) => d.duration ? shortDuration(d.duration) : '—')}
              {row('Places', (_c, d) => d.proposedIntake ? <span className="num">{d.proposedIntake.toLocaleString('en')}</span> : '—')}
              {row('Selection', (_c, d) => d.selectionBasis === 'MERIT_ONLY' ? 'All-island merit' : 'District quotas')}
              {row('Syllabus', (c, d) => d.syllabus
                ? <button type="button" className="source-link" style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => go(`/course/${c.u}`)}>
                    {d.syllabus.years.reduce((a, y) => a + y.modules.length, 0)} modules, {d.syllabus.years.length} {d.syllabus.years.length === 1 ? 'year' : 'years/levels'}</button>
                : <span className="helper">Not added yet</span>)}
              {row('Source', (_c, d) => <span className="helper">UGC handbook 2025/26, p.{d.requirementCitation.page}</span>)}
            </tbody>
          </table>
        </div>)}

      {codes.length < COMPARE_MAX && fromList.length > 0 && (
        <div className="stack" style={{ gap: 8 }}>
          <p className="section-label"><ListOrdered size={14} aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 4 }} />Add from my list</p>
          <div className="chips">{fromList.map(e => (
            <button key={e.uniCode} type="button" className="chip" onClick={() => setCodes([...codes, e.uniCode])}>
              <Plus size={14} aria-hidden="true" />{e.course} · {e.institution}</button>))}</div>
        </div>)}
      <p className="footer-note">Past cut-offs describe the past: no band is a promise of admission.</p>
    </>
  );
}
