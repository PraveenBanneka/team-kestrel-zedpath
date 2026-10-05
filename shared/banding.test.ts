import { describe, expect, it } from 'vitest';
import { BANDING, band, formatGap, formatZ, parseZ } from './banding.ts';

describe('banding thresholds (pinned: changing them changes what students see; BR-036)', () => {
  it('keeps the approved configuration values', () => {
    expect(BANDING).toEqual({ limitedHistoryMargin: 1000, reachBelowMin: 500, trendSlopePerYear: 200,
      jumpyStdDev: 1000, fullHistoryYears: 3, maxYears: 5 });
  });
});

describe('parseZ / formatZ (BR-005, NFR-051)', () => {
  it('parses four-decimal Z-scores exactly', () => {
    expect(parseZ('1.4821')).toBe(14821);
    expect(parseZ('-0.0724')).toBe(-724);
    expect(parseZ('+2.7935')).toBe(27935);
  });
  it('rejects wrong precision and out-of-range values (FR-102)', () => {
    for (const bad of ['1.482', '1.48215', '4.0001', '-4.0001', 'abc', '', '1,4821']) expect(parseZ(bad)).toBeNull();
    expect(parseZ('4.0000')).toBe(40000);
    expect(parseZ('-4.0000')).toBe(-40000);
  });
  it('formats with a sign and four decimals', () => {
    expect(formatZ(14821)).toBe('1.4821');
    expect(formatZ(-724)).toBe('−0.0724');
    expect(formatGap(610)).toBe('+0.0610');
    expect(formatGap(-270)).toBe('−0.0270');
  });
});

const hist = (...v: (number | null)[]) => v.map((zE4, i) => ({ examYear: 2025 - i, zE4 }));   // newest first

describe('band() with full history (n >= 3, BR-032)', () => {
  const h = hist(14211, 14702, 13904, 13377, 13120);    // the concept preview's CS-at-Ruhuna example
  it('SAFE at or above the highest cut-off', () => {
    expect(band(14702, h).band).toBe('SAFE');
    expect(band(15000, h).band).toBe('SAFE');
  });
  it('LIKELY between the latest and the highest', () => {
    expect(band(14211, h).band).toBe('LIKELY');
    expect(band(14701, h).band).toBe('LIKELY');
  });
  it('REACH below the latest but within 0.0500 of the lowest', () => {
    expect(band(14210, h).band).toBe('REACH');
    expect(band(13120 - 500, h).band).toBe('REACH');
  });
  it('OUT_OF_RANGE further below', () => expect(band(13120 - 501, h).band).toBe('OUT_OF_RANGE'));
  it('reports the signed gap to the latest cut-off (FR-206)', () => expect(band(14821, h).gapToLatestE4).toBe(610));
  it('uses only the five most recent years', () => {
    expect(band(15000, [...h, { examYear: 2019, zE4: 20000 }]).yearsUsed).toBe(5);
  });
});

describe('band() with limited history (n = 1 or 2, BR-031)', () => {
  it('needs 0.1000 above the highest to be SAFE', () => {
    const h = hist(14211);
    expect(band(15211, h).band).toBe('SAFE');
    expect(band(15210, h).band).toBe('LIKELY');
    expect(band(14211, h).band).toBe('LIKELY');
    expect(band(14210, h).band).toBe('REACH');
    expect(band(13711, h).band).toBe('REACH');
    expect(band(13710, h).band).toBe('OUT_OF_RANGE');
    expect(band(15211, h).limitedHistory).toBe(true);
    expect(band(15211, h).trend).toBe('NO_TREND');
  });
});

describe('band() with NQC years (BR-030, BR-034)', () => {
  it('NOT_ENOUGH_DATA when every year is NQC', () => expect(band(20000, hist(null, null)).band).toBe('NOT_ENOUGH_DATA'));
  it('excludes NQC years and reports them', () => {
    const r = band(15000, hist(null, 14000, 13900, 13800));
    expect(r.yearsUsed).toBe(3);
    expect(r.latestE4).toBe(14000);
    expect(r.nqcYears).toEqual([2025]);
  });
});

describe('trend (BR-033)', () => {
  it('RISING, FALLING, STEADY and JUMPY', () => {
    expect(band(0, hist(14000, 13700, 13400)).trend).toBe('RISING');
    expect(band(0, hist(13400, 13700, 14000)).trend).toBe('FALLING');
    expect(band(0, hist(14000, 14010, 13990)).trend).toBe('STEADY');
    expect(band(0, hist(16000, 13000, 15800)).trend).toBe('JUMPY');
  });
});
