// Ask FindMyWay corpus: one passage per "other path" of the catalogue (data/routes/), with its official source. Pure and
// tested (worker/scholarships.test.ts); tools/ask/build-corpus.ts calls it. CR-015: a scholarship or loan says what it
// pays for and what it gives (its notes), and a path it pays for names it under "Ways to pay". Those lines appear only
// when the catalogue has them, so the passages of the other paths stay exactly as they were.
import type { CorpusPassage } from '../../shared/ask.ts';

export interface CorpusRoute {
  id: string; route_group: string; name: string; provider: string; duration: string | null; intake_timing: string | null;
  entry_requirements_text: string | null; programmes?: string[]; cost_basis?: string; cost_min_lkr: number | null; cost_max_lkr: number | null;
  source_url: string | null; source_locator: string; retrieved_on: string; notes?: string | null; for_routes?: string[];
}

export function routePassages(routes: CorpusRoute[]): CorpusPassage[] {
  const byId = new Map(routes.map(r => [r.id, r]));
  const named = (ids: string[]) => ids.map(id => byId.get(id)).filter(x => x !== undefined).map(x => `${x.name} (${x.provider})`).join('; ');
  return routes.map(r => {
    // The basis says what the amount covers (Praveen 23 Oct: a semester fee must never read as the cost of a degree).
    const per = ({ PER_SEMESTER: ' per semester', PER_YEAR: ' per year', PER_SUBJECT: ' per subject', TO_REGISTER: ' to register' } as Record<string, string>)[r.cost_basis ?? ''] ?? '';
    const cost = r.cost_min_lkr === null ? '' : `Cost: Rs ${r.cost_min_lkr.toLocaleString('en')}${r.cost_max_lkr && r.cost_max_lkr !== r.cost_min_lkr ? ` to Rs ${r.cost_max_lkr.toLocaleString('en')}` : ''}${per}.`;
    const payers = routes.filter(s => s.for_routes?.includes(r.id)).map(s => s.id);
    const scholarship = r.route_group === 'SCHOLARSHIP_LOAN';
    const text = [`${r.name} (${r.route_group.replace(/_/g, ' ').toLowerCase()}), offered by ${r.provider}.`,
      r.duration ? `Duration: ${r.duration}.` : '', cost, r.intake_timing ? `When: ${r.intake_timing}` : '',
      r.entry_requirements_text ? `Entry requirements: ${r.entry_requirements_text}` : 'Entry requirements: not published on a page FindMyWay could check.',
      r.programmes?.length ? `Programmes: ${r.programmes.join('; ')}.` : '',
      scholarship && r.notes ? `What it gives and its conditions: ${r.notes}` : '',
      scholarship && r.for_routes?.length ? `Pays for: ${named(r.for_routes)}.` : '',
      payers.length ? `Ways to pay: ${named(payers)}.` : ''].filter(Boolean).join(' ');
    return { id: `route-${r.id}`, kind: 'ROUTE' as const, source: `${r.source_locator} (checked ${r.retrieved_on})`, page: null, url: r.source_url, text: text.slice(0, 3000) };
  });
}
