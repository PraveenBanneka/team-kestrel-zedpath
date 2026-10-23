// Search inside each group of other paths (Praveen 23 Oct: "Make all those options searchable too", "Inside each path",
// "With a search icon left to profile icon"). Same rule as the course search (shared/search.ts): every word typed must
// start a word of the path's name, institute or group, or of one of its programmes. A path found only through its
// programmes says which ones, so "law" shows the law degrees behind each institute. Pure, tested.
import type { RouteSummary } from './api.ts';
import { matches } from './search.ts';

/** Words a student may type for a whole group ("professional", "vocational", "abroad"). */
export const GROUP_WORDS: Record<RouteSummary['group'], string> = {
  PRIVATE_DEGREE: 'private degree university campus', DIPLOMA: 'diploma hnd open university', PROFESSIONAL: 'professional body qualification',
  VOCATIONAL: 'vocational nvq technical training', JOB_EXAM: 'government job exam gazette', SCHOLARSHIP_ABROAD: 'study abroad scholarship foreign',
  RETRY: 'retry sit again re sit',
};

export interface RouteHit<T> { route: T; programmes: string[] }

/** The short names students type, from the capitalised words of each part of the provider's name: "Sri Lanka Institute of
 *  Information Technology" -> SLIIT, "Open University of Sri Lanka" -> OUSL, "Department of Technical Education and
 *  Training" -> DTET. Lower-case joining words and "The" are skipped. */
export function acronyms(provider: string): string[] {
  return provider.split(/[(),\-–]/).map(part => part.trim().split(/\s+/).filter(w => /^[A-Z]/.test(w) && w !== 'The').map(w => w[0]).join(''))
    .filter(a => a.length >= 3);
}

/** Paths matching `query`, those matched by name, institute or group first; an empty query returns every path. */
export function searchRoutes<T extends Pick<RouteSummary, 'name' | 'provider' | 'group' | 'programmes'>>(query: string, routes: T[]): RouteHit<T>[] {
  if (!query.trim()) return routes.map(route => ({ route, programmes: [] }));
  const direct: RouteHit<T>[] = [], viaProgrammes: RouteHit<T>[] = [];
  for (const route of routes) {
    const own = [route.name, route.provider, GROUP_WORDS[route.group], ...acronyms(route.provider)];
    if (matches(query, ...own)) { direct.push({ route, programmes: [] }); continue; }
    const programmes = route.programmes.filter(p => matches(query, ...own, p));
    if (programmes.length) viaProgrammes.push({ route, programmes });
  }
  return [...direct, ...viaProgrammes];
}
