// Other paths (FE-5): compiles the curated catalogue (data/routes/) into the routes of the rulebook the Worker serves.
// Pure and tested (worker/scholarships.test.ts, worker/routes-free.test.ts); tools/rulebook/build-rulebook.ts calls it.
// The build fails, so nothing ships, when the catalogue breaks a rule below (server-side truth, not UI-only hiding).
import type { Rulebook } from '../../shared/rulebook.ts';
import { ROUTE_GROUP_CODES, type RouteGroup } from '../../shared/route-groups.ts';

/** One record of data/routes/routes-*.json (only the fields the rulebook uses). */
export interface CatalogueRoute {
  id: string; route_group: string; name: string; provider: string; duration?: string | null;
  cost_min_lkr: number | null; cost_max_lkr: number | null; cost_basis?: string;
  intake_timing?: string | null; entry_requirements_text?: string | null; programmes?: string[];
  official_url?: string | null; source_url?: string | null; source_locator: string; retrieved_on: string; notes?: string | null;
  /** CR-015, SCHOLARSHIP_LOAN only: ids of the routes this scholarship or loan pays for. */
  for_routes?: string[];
}

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
/** The latest date written in a timing text: "12 October 2026" or "12.10.2026" -> ISO. */
export function latestDate(text: string): string | null {
  const ds: string[] = [];
  for (const m of text.matchAll(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi))
    ds.push(`${m[3]}-${String(MONTHS.indexOf(m[2].toLowerCase()) + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`);
  for (const m of text.matchAll(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g)) ds.push(`${m[3]}-${m[2]}-${m[1]}`);
  return ds.sort().at(-1) ?? null;
}

/** A published cost of 0 (SLIATE, DTET full-time). An unknown cost (null) is NOT free: Number(null) is 0. */
export const isFree = (r: Pick<CatalogueRoute, 'cost_min_lkr' | 'cost_max_lkr'>) =>
  r.cost_min_lkr != null && Number(r.cost_min_lkr) === 0 && (r.cost_max_lkr == null || Number(r.cost_max_lkr) === 0);
const lkr = (n: unknown) => `Rs ${Number(n).toLocaleString('en-LK')}`;
/** "Rs A to Rs B", "Rs A", or "Up to Rs B" when only a maximum is published or the minimum is a free place
 *  (e.g. NAITA: free for low-income families, the route's note says so). Never "Rs 0" (Praveen 23 Oct). */
export const costText = (r: Pick<CatalogueRoute, 'cost_min_lkr' | 'cost_max_lkr'>): string | null => {
  if (isFree(r)) return null;
  const min = r.cost_min_lkr == null || Number(r.cost_min_lkr) === 0 ? null : Number(r.cost_min_lkr);
  const max = r.cost_max_lkr == null ? null : Number(r.cost_max_lkr);
  if (min === null) return max === null ? null : `Up to ${lkr(max)}`;
  return max !== null && max !== min ? `${lkr(min)} to ${lkr(max)}` : lkr(min);
};

/** Every rule the catalogue breaks, as readable lines (empty = valid). CR-015 rules:
 *  - route_group is one of ROUTE_GROUP_CODES;
 *  - for_routes only on SCHOLARSHIP_LOAN routes; a list of distinct ids of existing routes, never itself or another
 *    scholarship or loan;
 *  - a SCHOLARSHIP_LOAN route has no cost (cost_min_lkr and cost_max_lkr null): what it gives is not a price, and it lives
 *    in `notes`, so the card can never show it as a cost or as "Free". */
export function catalogueErrors(raw: CatalogueRoute[]): string[] {
  const errors: string[] = [];
  const byId = new Map(raw.map(r => [r.id, r]));
  for (const r of raw) {
    if (!(ROUTE_GROUP_CODES as readonly string[]).includes(r.route_group)) errors.push(`${r.id}: unknown route_group ${r.route_group}`);
    if (r.route_group === 'SCHOLARSHIP_LOAN' && (r.cost_min_lkr != null || r.cost_max_lkr != null))
      errors.push(`${r.id}: a scholarship or loan has no cost; put the amount it gives in notes`);
    if (r.for_routes === undefined) continue;
    if (r.route_group !== 'SCHOLARSHIP_LOAN') { errors.push(`${r.id}: for_routes is allowed only on SCHOLARSHIP_LOAN routes`); continue; }
    if (!Array.isArray(r.for_routes) || r.for_routes.some(id => typeof id !== 'string')) { errors.push(`${r.id}: for_routes must be a list of route ids`); continue; }
    if (new Set(r.for_routes).size !== r.for_routes.length) errors.push(`${r.id}: for_routes repeats an id`);
    for (const id of r.for_routes) {
      const target = byId.get(id);
      if (!target) errors.push(`${r.id}: for_routes names ${id}, which is not in the catalogue`);
      else if (id === r.id || target.route_group === 'SCHOLARSHIP_LOAN') errors.push(`${r.id}: for_routes names ${id}, a scholarship or loan, not a path it pays for`);
    }
  }
  return errors;
}

/** The rulebook's routes. Throws (the build stops) when catalogueErrors finds anything. `waysToPay` is the reverse of
 *  `for_routes`, in catalogue order, so the route page shows it without the app working it out. */
export function compileRoutes(raw: CatalogueRoute[]): Rulebook['routes'] {
  const errors = catalogueErrors(raw);
  if (errors.length) throw new Error(`route catalogue: ${errors.length} problem(s)\n  ${errors.join('\n  ')}`);
  const payers = new Map<string, string[]>();
  for (const r of raw) for (const id of r.for_routes ?? []) payers.set(id, [...(payers.get(id) ?? []), r.id]);
  return raw.map(r => ({
    id: r.id, group: r.route_group as RouteGroup, name: r.name, provider: r.provider,
    duration: r.duration && r.duration !== 'None' ? String(r.duration) : null,
    free: isFree(r),
    costBasis: (r.cost_basis ?? 'TOTAL') as Rulebook['routes'][number]['costBasis'],
    costText: costText(r),
    intakeTiming: r.intake_timing ?? null, requirements: r.entry_requirements_text ?? null, programmes: r.programmes ?? [], officialUrl: r.official_url ?? null,
    sourceUrl: r.source_url ?? null, sourceLocator: r.source_locator, retrievedOn: r.retrieved_on, warning: r.notes ?? null,
    closesOn: r.intake_timing ? latestDate(String(r.intake_timing)) : null, openAtRetrieval: /\bOPEN\b/.test(String(r.intake_timing ?? '')),
    ...(r.for_routes?.length ? { forRoutes: [...r.for_routes] } : {}),
    ...(payers.has(r.id) ? { waysToPay: payers.get(r.id)! } : {}),
  }));
}
