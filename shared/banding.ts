// Safe / Likely / Reach banding: business rules BR-030 to BR-036 of ZP-DOC-03, implemented exactly.
// All Z-scores are integers in ten-thousandths (z_e4: 1.4821 -> 14821), so every comparison is exact (NFR-051).

export type Band = 'SAFE' | 'LIKELY' | 'REACH' | 'OUT_OF_RANGE' | 'NOT_ENOUGH_DATA';
export type Trend = 'RISING' | 'FALLING' | 'STEADY' | 'JUMPY' | 'NO_TREND';

/** Configuration values of BR-036. Changing one of these changes what students see: tests pin them. */
export const BANDING = {
  limitedHistoryMargin: 1000,   // 0.1000  (BR-031): extra safety when fewer than 3 years are known
  reachBelowMin: 500,           // 0.0500  (BR-032): how far below the lowest cut-off still counts as Reach
  trendSlopePerYear: 200,       // 0.0200  (BR-033)
  jumpyStdDev: 1000,            // 0.1000  (BR-033)
  fullHistoryYears: 3,          // BR-031
  maxYears: 5,                  // BR-032: the most recent five intake years
} as const;

/** One intake year's cut-off for the student's district (or the all-island cut-off, BR-035). null = NQC. */
export interface YearCutoff { examYear: number; zE4: number | null }

export interface BandResult {
  band: Band;
  yearsUsed: number;                 // n in BR-030/031
  limitedHistory: boolean;           // n is 1 or 2
  latestE4: number | null;           // c_l: the most recent numeric cut-off
  gapToLatestE4: number | null;      // Z − c_l, signed (FR-206)
  minE4: number | null;
  maxE4: number | null;
  trend: Trend;
  nqcYears: number[];                // BR-034: shown as "No qualified candidates in <year>"
}

export function band(zE4: number, history: YearCutoff[]): BandResult {
  const recent = [...history].sort((a, b) => b.examYear - a.examYear).slice(0, BANDING.maxYears);
  const numeric = recent.filter((y): y is { examYear: number; zE4: number } => y.zE4 !== null);
  const nqcYears = recent.filter(y => y.zE4 === null).map(y => y.examYear);
  const n = numeric.length;
  if (n === 0) {                                                                          // BR-030
    return { band: 'NOT_ENOUGH_DATA', yearsUsed: 0, limitedHistory: false, latestE4: null, gapToLatestE4: null,
      minE4: null, maxE4: null, trend: 'NO_TREND', nqcYears };
  }
  const values = numeric.map(y => y.zE4);
  const latest = numeric[0].zE4;                                                         // most recent numeric year
  const max = Math.max(...values), min = Math.min(...values);
  const limited = n < BANDING.fullHistoryYears;                                          // BR-031
  const m = limited ? BANDING.limitedHistoryMargin : 0;
  let b: Band;                                                                           // BR-032
  if (zE4 >= max + m) b = 'SAFE';
  else if (zE4 >= latest) b = 'LIKELY';
  else if (zE4 >= min - BANDING.reachBelowMin) b = 'REACH';
  else b = 'OUT_OF_RANGE';
  return { band: b, yearsUsed: n, limitedHistory: limited, latestE4: latest, gapToLatestE4: zE4 - latest,
    minE4: min, maxE4: max, trend: limited ? 'NO_TREND' : trend(numeric), nqcYears };
}

/** BR-033: least-squares slope per year; JUMPY when the standard deviation exceeds the threshold. */
function trend(points: { examYear: number; zE4: number }[]): Trend {
  const n = points.length;
  const mx = points.reduce((s, p) => s + p.examYear, 0) / n;
  const my = points.reduce((s, p) => s + p.zE4, 0) / n;
  const sd = Math.sqrt(points.reduce((s, p) => s + (p.zE4 - my) ** 2, 0) / n);
  if (sd > BANDING.jumpyStdDev) return 'JUMPY';
  const slope = points.reduce((s, p) => s + (p.examYear - mx) * (p.zE4 - my), 0) / points.reduce((s, p) => s + (p.examYear - mx) ** 2, 0);
  return slope > BANDING.trendSlopePerYear ? 'RISING' : slope < -BANDING.trendSlopePerYear ? 'FALLING' : 'STEADY';
}

/** Exact parse of a four-decimal Z-score string ("1.4821", "-0.0724") into ten-thousandths (BR-005). */
export function parseZ(text: string): number | null {
  const m = text.trim().match(/^([+-]?)(\d)\.(\d{4})$/);
  if (!m) return null;
  const v = (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 10000 + Number(m[3]));
  return v >= -40000 && v <= 40000 ? v : null;
}

export const formatZ = (e4: number): string => `${e4 < 0 ? '−' : ''}${Math.floor(Math.abs(e4) / 10000)}.${String(Math.abs(e4) % 10000).padStart(4, '0')}`;
export const formatGap = (e4: number): string => `${e4 >= 0 ? '+' : '−'}${formatZ(Math.abs(e4))}`;
