// My list (US-301..303): the student's ordered preference list for the UGC application. Drag (handle) or the arrow
// buttons reorder it; warnings follow BR-041/BR-042; "Fix the order" previews FR-305's order and applies it only
// after the student confirms; "Copy Uni-Codes" gives one per line (FR-306). Bands are re-read from the current results.
import { useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { Check, ClipboardCopy, GripVertical, ListOrdered, TriangleAlert, X } from 'lucide-react';
import type { ResultsResponse } from '../../shared/api.ts';
import type { Band } from '../../shared/banding.ts';
import { LIST_MAX, listWarnings, move, proposeOrder, uniCodesText, type ListEntry } from '../../shared/list.ts';

const BAND_LABEL: Record<Band, string> = { SAFE: 'Safe', LIKELY: 'Likely', REACH: 'Reach', OUT_OF_RANGE: 'Out of range', NOT_ENOUGH_DATA: 'Not enough data' };

/** The list with each entry's band taken from the latest results (the profile may have changed since it was added). */
export function withCurrentBands(list: ListEntry[], results: ResultsResponse | null): (ListEntry & { stale: boolean })[] {
  if (!results) return list.map(e => ({ ...e, stale: false }));
  return list.map(e => {
    const now = results.offerings.find(o => o.uniCode === e.uniCode && o.group === e.group) ?? results.offerings.find(o => o.uniCode === e.uniCode);
    return now ? { ...e, band: now.band, stale: false } : { ...e, stale: true };
  });
}

/** One row: drag handle on the right (Praveen, 2026-10-05: no arrow buttons). The handle is also a keyboard control
 *  (focus it, then Arrow Up / Arrow Down), so reordering still works without a touch screen (FR-301). */
function Row({ e, i, n, onMove, onRemove, open }: { e: ListEntry & { stale: boolean }; i: number; n: number;
  onMove: (to: number) => void; onRemove: () => void; open: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item value={e} dragListener={false} dragControls={controls} className="list-row" as="div">
      <span className="pos num">{i + 1}</span>
      <button type="button" className="grow list-main" onClick={open}>
        <span className="t">{e.course}</span>
        <span className="s">{e.institution} · {e.uniCode}</span>
        {e.stale ? <span className="pill band-OUT_OF_RANGE">No longer eligible with your results</span>
          : <span className={`pill band-${e.band}`}>{BAND_LABEL[e.band]}</span>}
      </button>
      <button type="button" className="icon-btn remove" aria-label={`Remove ${e.course}`} onClick={onRemove}><X size={18} /></button>
      <button type="button" className="grip" onPointerDown={ev => controls.start(ev)} aria-label={`Reorder ${e.course}: drag, or use the arrow keys`}
        onKeyDown={ev => {
          if (ev.key === 'ArrowUp' && i > 0) { ev.preventDefault(); onMove(i - 1); }
          if (ev.key === 'ArrowDown' && i < n - 1) { ev.preventDefault(); onMove(i + 1); }
        }}><GripVertical size={22} aria-hidden="true" /></button>
    </Reorder.Item>
  );
}

export function MyListScreen({ list, setList, results, go }: { list: ListEntry[]; setList: (l: ListEntry[]) => void;
  results: ResultsResponse | null; go: (to: string) => void }) {
  const [preview, setPreview] = useState<ListEntry[] | null>(null);
  const [copied, setCopied] = useState(false);
  const shown = withCurrentBands(list, results);
  const warn = listWarnings(shown);

  const copy = async () => { try { await navigator.clipboard.writeText(uniCodesText(list)); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* blocked */ } };
  if (list.length === 0) return (
    <>
      <h1 className="screen-title">My list</h1>
      <div className="card stack">
        <ListOrdered size={28} aria-hidden="true" style={{ color: 'var(--brand-500)' }} />
        <p className="subtitle">Build your UGC preference list here. Open any course and tap <b>Add to my list</b>, then put them in the order you want them most.</p>
        <button className="btn filled" onClick={() => go('/courses/safe')}>Browse my courses</button>
      </div>
    </>);

  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">My list</h1>
        <p className="subtitle"><span className="num">{list.length}</span> of {LIST_MAX}. Most-wanted first: the UGC places you in the highest course on your list that you qualify for.</p>
      </div>

      {warn.safeAbove.length > 0 && !preview && (
        <div className="alert warn" role="status"><TriangleAlert size={20} aria-hidden="true" />
          <span className="stack" style={{ gap: 8 }}>
            <span><b>{warn.safeAbove[0].course}</b>{warn.safeAbove.length > 1 ? ` and ${warn.safeAbove.length - 1} more` : ''} {warn.safeAbove.length > 1 ? 'are' : 'is'} Safe, so the Likely and Reach courses listed below {warn.safeAbove.length > 1 ? 'them' : 'it'} are unlikely to be reached.</span>
            <button className="btn tonal" style={{ alignSelf: 'flex-start' }} onClick={() => setPreview(proposeOrder(shown))}>Fix the order</button>
          </span>
        </div>)}
      {warn.noSafe && <div className="alert error" role="status"><TriangleAlert size={20} aria-hidden="true" />No Safe course on your list yet. Without one you may not be placed anywhere: add at least one Safe course.</div>}

      {preview && (
        <div className="card stack">
          <h2 className="title-l">Suggested order</h2>
          <p className="subtitle">Your Likely and Reach courses first, in your order; then your Safe courses, in your order.</p>
          <ol className="preview-list">{preview.map(e => <li key={e.uniCode}>{e.course} <span className="helper">· {e.uniCode} · {BAND_LABEL[e.band]}</span></li>)}</ol>
          <div className="row">
            <button className="btn filled" onClick={() => { setList(preview.map(({ ...e }) => e)); setPreview(null); }}><Check size={18} aria-hidden="true" />Use this order</button>
            <button className="btn text" onClick={() => setPreview(null)}>Keep mine</button>
          </div>
        </div>)}

      <Reorder.Group axis="y" values={shown} onReorder={next => setList(next.map(({ stale: _s, ...e }) => e))} className="list-card" as="div">
        {shown.map((e, i) => <Row key={e.uniCode} e={e} i={i} n={shown.length} open={() => go(`/course/${e.uniCode}`)}
          onMove={to => setList(move(list, i, to))} onRemove={() => setList(list.filter(x => x.uniCode !== e.uniCode))} />)}
      </Reorder.Group>

      <button className="btn tonal" onClick={copy}>{copied ? <><Check size={18} aria-hidden="true" />Copied {list.length} Uni-Codes</> : <><ClipboardCopy size={18} aria-hidden="true" />Copy Uni-Codes in this order</>}</button>
      <p className="helper">Paste them into the UGC online application in the same order. Your list is saved on this phone.</p>
    </>
  );
}
