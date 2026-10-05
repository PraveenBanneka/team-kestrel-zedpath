// Shared visual building blocks for the v2 design: page transitions, staggered lists, the Safe/Likely/Reach ring,
// and the cut-off history chart. Motion is skipped automatically for users who prefer reduced motion.
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { formatZ } from '../shared/banding.ts';

export function Page({ children, k }: { children: ReactNode; k: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div key={k} className="stack" style={{ gap: 16 }} initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}>
      {children}
    </motion.div>
  );
}

/** Variants for a list row inside <Stagger>: give the row `variants={rise}` and it inherits the cascade. */
export const rise = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] as const } } };

/** Rows (motion elements using `rise`) appear one after another, 35 ms apart, capped so long lists finish fast. */
export function Stagger({ children, className, role }: { children: ReactNode; className?: string; role?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} role={role} initial={reduce ? false : 'hidden'} animate="show"
      variants={{ show: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } } }}>
      {children}
    </motion.div>
  );
}

/** Donut ring of Safe / Likely / Reach counts. */
export function BandRing({ safe, likely, reach }: { safe: number; likely: number; reach: number }) {
  const total = Math.max(1, safe + likely + reach);
  const R = 46, C = 2 * Math.PI * R;
  const parts = [{ v: safe, c: '#3DDC97' }, { v: likely, c: '#9DB8FF' }, { v: reach, c: '#FFC94A' }];
  let offset = 0;
  return (
    <svg className="ring" viewBox="0 0 120 120" role="img" aria-label={`${safe} safe, ${likely} likely, ${reach} reach`}>
      <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="14" />
      {parts.map((p, i) => {
        const len = (p.v / total) * C;
        const el = (
          <motion.circle key={i} cx="60" cy="60" r={R} fill="none" stroke={p.c} strokeWidth="14" strokeLinecap="butt"
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} transform="rotate(-90 60 60)"
            initial={{ strokeDasharray: `0 ${C}` }} animate={{ strokeDasharray: `${len} ${C - len}` }} transition={{ duration: 0.9, delay: 0.15 + i * 0.12, ease: [0.2, 0.8, 0.2, 1] }} />);
        offset += len;
        return el;
      })}
      <text x="60" y="58" textAnchor="middle" fontFamily="Outfit" fontWeight="700" fontSize="28" fill="#fff">{safe + likely + reach}</text>
      <text x="60" y="76" textAnchor="middle" fontFamily="Inter" fontSize="10" fill="rgba(255,255,255,.8)">within reach</text>
    </svg>
  );
}

/** Line chart of the district cut-off by intake year, with the student's Z-score as a dashed line. */
export function CutoffChart({ history, zE4 }: { history: { academicYear: string; zE4: number | null }[]; zE4: number }) {
  const pts = [...history].reverse().filter(h => h.zE4 !== null) as { academicYear: string; zE4: number }[];
  if (pts.length === 0) return null;
  const W = 340, H = 170, PL = 8, PR = 8, PT = 18, PB = 28;
  const vals = [...pts.map(p => p.zE4), zE4];
  const min = Math.min(...vals) - 400, max = Math.max(...vals) + 400;
  const x = (i: number) => PL + (pts.length === 1 ? (W - PL - PR) / 2 : (i * (W - PL - PR)) / (pts.length - 1));
  const y = (v: number) => PT + (1 - (v - min) / (max - min)) * (H - PT - PB);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.zE4).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts.length - 1).toFixed(1)} ${H - PB} L${x(0).toFixed(1)} ${H - PB} Z`;
  const yz = y(zE4);
  return (
    <figure className="stack" style={{ margin: 0, gap: 8 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Cut-offs ${pts.map(p => `${p.academicYear} ${formatZ(p.zE4)}`).join(', ')}; your Z-score ${formatZ(zE4)}`}>
        <defs>
          <linearGradient id="cfill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#4C7DFF" stopOpacity=".28" /><stop offset="1" stopColor="#4C7DFF" stopOpacity="0" /></linearGradient>
        </defs>
        <motion.path d={area} fill="url(#cfill)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.3 }} />
        <motion.path d={line} fill="none" stroke="#3461C9" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }} />
        <line x1={PL} x2={W - PR} y1={yz} y2={yz} stroke="#E8920C" strokeWidth="2" strokeDasharray="6 5" />
        <text x={W - PR} y={yz - 6} textAnchor="end" fontFamily="Inter" fontWeight="600" fontSize="11" fill="#B86E00">You {formatZ(zE4)}</text>
        {pts.map((p, i) => (
          <g key={p.academicYear}>
            <circle cx={x(i)} cy={y(p.zE4)} r="4.5" fill="#fff" stroke="#3461C9" strokeWidth="2.5" />
            <text x={x(i)} y={H - 8} textAnchor="middle" fontFamily="Inter" fontSize="10.5" fill="#7A8396">{p.academicYear.slice(2, 4)}/{p.academicYear.slice(7, 9)}</text>
          </g>))}
      </svg>
      <div className="chart-legend"><span><i style={{ background: '#3461C9' }} />Cut-off, your district</span><span><i style={{ background: '#E8920C' }} />Your Z-score</span></div>
    </figure>
  );
}
