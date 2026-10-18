// My list (US-301..303): the student's ordered preference list for the UGC application. Drag (handle) or the arrow
// buttons reorder it; warnings follow BR-041/BR-042; "Fix the order" previews FR-305's order and applies it only
// after the student confirms; "Copy Uni-Codes" gives one per line (FR-306). Bands are re-read from the current results.
// CR-006: press and hold a course (or "Select") to choose several; Compare opens them in the order chosen (at most 3),
// Remove takes them off the list.
import { useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { Check, CheckCircle2, ChevronRight, Circle, ClipboardCopy, GripVertical, ListOrdered, ListPlus, Scale, Trash2, TriangleAlert, X } from 'lucide-react';
import { useHold } from '../hold.ts';
import type { ResultsResponse } from '../../shared/api.ts';
import type { Band } from '../../shared/banding.ts';
import { COMPARE_MAX } from './Compare.tsx';
import { Tip } from '../Tip.tsx';
import { LIST_MAX, listWarnings, missingEligible, move, proposeOrder, uniCodesText, type ListEntry } from '../../shared/list.ts';
import { t } from '../i18n/index.ts';
import { Rich } from '../i18n/Rich.tsx';

const bandLabel = (b: Band) => t(`band.${b}`);

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
function Row({ e, i, n, onMove, onRemove, open, selecting, selected, onPick }: { e: ListEntry & { stale: boolean }; i: number; n: number;
  onMove: (to: number) => void; onRemove: () => void; open: () => void; selecting: boolean; selected: boolean; onPick: () => void }) {
  const controls = useDragControls();
  const hold = useHold(onPick);
  return (
    <Reorder.Item value={e} dragListener={false} dragControls={controls} className={`list-row ${selected ? 'picked' : ''}`} as="div">
      {selecting ? (selected ? <CheckCircle2 size={22} className="pick-ic on" aria-hidden="true" /> : <Circle size={22} className="pick-ic" aria-hidden="true" />)
        : <span className="pos num">{i + 1}</span>}
      <button type="button" className="grow list-main" {...hold.handlers} aria-pressed={selecting ? selected : undefined}
        onClick={() => { if (hold.consumed()) return; if (selecting) onPick(); else open(); }}>
        <span className="t">{e.course}</span>
        <span className="s">{e.institution} · {e.uniCode}</span>
        {e.stale ? <span className="pill band-OUT_OF_RANGE">{t('list.stale')}</span>
          : <span className={`pill band-${e.band}`}>{bandLabel(e.band)}</span>}
      </button>
      <button type="button" className="icon-btn remove" aria-label={t('list.removeAria', { c: e.course })} onClick={onRemove}><X size={18} /></button>
      <button type="button" className="grip" onPointerDown={ev => controls.start(ev)} aria-label={t('list.reorderAria', { c: e.course })}
        onKeyDown={ev => {
          if (ev.key === 'ArrowUp' && i > 0) { ev.preventDefault(); onMove(i - 1); }
          if (ev.key === 'ArrowDown' && i < n - 1) { ev.preventDefault(); onMove(i + 1); }
        }}><GripVertical size={22} aria-hidden="true" /></button>
    </Reorder.Item>
  );
}

export function MyListScreen({ list, setList, results, go, setCompare }: { list: ListEntry[]; setList: (l: ListEntry[]) => void;
  results: ResultsResponse | null; go: (to: string) => void; setCompare: (c: string[]) => void }) {
  const [preview, setPreview] = useState<ListEntry[] | null>(null);
  const [picked, setPicked] = useState<string[] | null>(null);              // null = not choosing; else Uni-Codes in the order chosen
  const toggle = (u: string) => setPicked(p => p === null ? [u] : p.includes(u) ? p.filter(x => x !== u) : [...p, u]);
  const [copied, setCopied] = useState(false);
  const shown = withCurrentBands(list, results);
  const warn = listWarnings(shown);
  const missing = results ? missingEligible(list, results.offerings) : null;
  const missingTotal = missing ? missing.SAFE + missing.LIKELY + missing.REACH : 0;
  // The handbook advises listing as many eligible courses as possible (p.10): show how many are still left out.
  const more = missing && missingTotal > 0 && (
    <button className="card list-entry" onClick={() => go(`/courses/${missing.SAFE ? 'safe' : missing.LIKELY ? 'likely' : 'reach'}`)}>
      <span className="ic" style={{ background: 'var(--safe-bg)', color: 'var(--safe)' }}><ListPlus size={22} aria-hidden="true" /></span>
      <span className="grow"><span className="t">{missingTotal === 1 ? t('list.moreOne') : t('list.more', { n: missingTotal })}</span>
        <span className="s num">{t('list.moreSub', { s: missing.SAFE, l: missing.LIKELY, r: missing.REACH })}</span></span>
      <ChevronRight size={20} className="chev" aria-hidden="true" />
    </button>);

  const copy = async () => { try { await navigator.clipboard.writeText(uniCodesText(list)); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { /* blocked */ } };
  if (list.length === 0) return (
    <>
      <h1 className="screen-title">{t('list.h')}</h1>
      <div className="card stack">
        <ListOrdered size={28} aria-hidden="true" style={{ color: 'var(--brand-500)' }} />
        <p className="subtitle"><Rich text={t('list.emptySub')} /></p>
        <button className="btn filled" onClick={() => go('/courses/safe')}>{t('list.browse')}</button>
      </div>
      {more}
    </>);

  return (
    <>
      <div className="stack" style={{ gap: 4 }}>
        <h1 className="screen-title">{t('list.h')}</h1>
        <p className="subtitle">{t('list.count', { n: list.length, max: LIST_MAX })}</p>
        <button className="btn text" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} onClick={() => setPicked(p => p === null ? [] : null)} aria-pressed={picked !== null}>
          <CheckCircle2 size={18} aria-hidden="true" />{picked === null ? t('sel.select') : t('sel.cancel')}</button>
        {picked === null && <Tip text={t('sel.tipList')} />}
      </div>

      {warn.safeAbove.length > 0 && !preview && (
        <div className="alert warn" role="status"><TriangleAlert size={20} aria-hidden="true" />
          <span className="stack" style={{ gap: 8 }}>
            <span>{warn.safeAbove.length > 1 ? t('list.safeAboveMany', { course: warn.safeAbove[0].course, n: warn.safeAbove.length - 1 }) : t('list.safeAbove', { course: warn.safeAbove[0].course })}</span>
            <button className="btn tonal" style={{ alignSelf: 'flex-start' }} onClick={() => setPreview(proposeOrder(shown))}>{t('list.fix')}</button>
          </span>
        </div>)}
      {warn.noSafe && <div className="alert error" role="status"><TriangleAlert size={20} aria-hidden="true" />{t('list.noSafe')}</div>}

      {preview && (
        <div className="card stack">
          <h2 className="title-l">{t('list.suggested')}</h2>
          <p className="subtitle">{t('list.suggestedSub')}</p>
          <ol className="preview-list">{preview.map(e => <li key={e.uniCode}>{e.course} <span className="helper">· {e.uniCode} · {bandLabel(e.band)}</span></li>)}</ol>
          <div className="row">
            <button className="btn filled" onClick={() => { setList(preview.map(({ ...e }) => e)); setPreview(null); }}><Check size={18} aria-hidden="true" />{t('list.use')}</button>
            <button className="btn text" onClick={() => setPreview(null)}>{t('list.keep')}</button>
          </div>
        </div>)}

      <Reorder.Group axis="y" values={shown} onReorder={next => setList(next.map(({ stale: _s, ...e }) => e))} className="list-card" as="div">
        {shown.map((e, i) => <Row key={e.uniCode} e={e} i={i} n={shown.length} open={() => go(`/course/${e.uniCode}`)}
          onMove={to => setList(move(list, i, to))} onRemove={() => setList(list.filter(x => x.uniCode !== e.uniCode))}
          selecting={picked !== null} selected={!!picked?.includes(e.uniCode)} onPick={() => toggle(e.uniCode)} />)}
      </Reorder.Group>
      {picked !== null && (
        <div className="select-bar" role="region" aria-label={t('sel.bar')}>
          {picked.length > COMPARE_MAX && <p className="sel-max" role="status">{t('sel.cmpMax', { n: COMPARE_MAX })}</p>}
          <span className="grow"><span className="sel-badge num" role="status" aria-label={t('sel.count', { n: picked.length })}>{picked.length}</span></span>
          <button className="icon-btn" onClick={() => setPicked(null)} aria-label={t('sel.cancel')}><X size={20} /></button>
          <button className="btn tonal small" disabled={picked.length === 0} onClick={() => { setList(list.filter(x => !picked.includes(x.uniCode))); setPicked(null); }}>
            <Trash2 size={16} aria-hidden="true" />{t('sel.remove')}</button>
          <button className="btn filled small" disabled={picked.length === 0 || picked.length > COMPARE_MAX} onClick={() => { setCompare(picked); go('/compare'); }}>
            <Scale size={16} aria-hidden="true" />{t('sel.compare')}</button>
        </div>)}

      {more}
      <button className="btn tonal" onClick={() => go('/compare')}><Scale size={18} aria-hidden="true" />{t('list.compare')}</button>
      <button className="btn tonal" onClick={copy}>{copied ? <><Check size={18} aria-hidden="true" />{t('list.copied', { n: list.length })}</> : <><ClipboardCopy size={18} aria-hidden="true" />{t('list.copy')}</>}</button>
      <p className="helper">{t('list.paste')}</p>
    </>
  );
}
