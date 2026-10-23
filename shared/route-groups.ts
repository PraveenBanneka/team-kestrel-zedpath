// The groups of other paths (FE-5) and which group screens also list another group's paths (CR-015). One list of codes
// shared by the catalogue build (tools/rulebook), the API types and the app, so a new group is added in one place.
// Pure, tested (worker/scholarships.test.ts).

/** Every route_group the catalogue may use. RETRY has no tile on the home (the retry path was removed, VR). */
export const ROUTE_GROUP_CODES = ['PRIVATE_DEGREE', 'DIPLOMA', 'PROFESSIONAL', 'VOCATIONAL', 'JOB_EXAM', 'SCHOLARSHIP_ABROAD',
  'SCHOLARSHIP_LOAN', 'RETRY'] as const;
export type RouteGroup = typeof ROUTE_GROUP_CODES[number];

/** A group whose screen also shows another group's paths, as a second section (cross-listing; no data is copied).
 *  CR-015: *Scholarships and loans* also shows the government scholarships abroad (R046 to R051). */
export const ALSO_LISTS: Partial<Record<RouteGroup, RouteGroup>> = { SCHOLARSHIP_LOAN: 'SCHOLARSHIP_ABROAD' };

/** The paths a group screen shows: its own, then the cross-listed group's (null when it has none to cross-list). */
export function groupSections<T extends { group: RouteGroup }>(group: RouteGroup, routes: T[]): { own: T[]; also: { group: RouteGroup; routes: T[] } | null } {
  const other = ALSO_LISTS[group];
  return { own: routes.filter(r => r.group === group), also: other ? { group: other, routes: routes.filter(r => r.group === other) } : null };
}
