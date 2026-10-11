// The Journey saved on the account (CR-006, Praveen 2026-10-11; data design ZP-DOC-05 CR-006, migration 0010).
// Mounted under /api by worker/index.ts AFTER accountRoutes, whose '/me/*' middleware (ready, same origin, session)
// guards every route here; worker/my-journey.test.ts checks a request without a session is refused.
//   GET    /me/journey                          -> MyJourney
//   PUT    /me/journey/courses/:uniCode         -> 204   follow a course (must be a 2025/26 offering)
//   DELETE /me/journey/courses/:uniCode         -> 204
//   PUT    /me/journey/notices/:routeId         -> 204   follow a notice or other path (must be in the route catalogue)
//   DELETE /me/journey/notices/:routeId         -> 204
//   PUT    /me/journey/notices/:routeId/applied {applied} -> 204; 409 before the notice opens; 404 if not followed
//   PUT    /me/journey/steps/:stepId {done}     -> 204; 409 while the step's window is not open
// The windows come from the same read model the phone shows (journey JSON), so the rule is enforced here, not only in
// the app. Dates are Sri Lanka dates (UTC+05:30).
import { Hono, type Context } from 'hono';
import { isStepId, noticeTickable, stepWindow, type JourneyResponse, type MyJourney } from '../shared/journey.ts';
import { book } from './rulebook.ts';
import { err, type AppEnv } from './account.ts';
import journey from './generated/journey-2025-2026.json' with { type: 'json' };

type C = Context<AppEnv>;
const data = journey as unknown as JourneyResponse;
const nowIso = () => new Date().toISOString();
/** Today in Sri Lanka (UTC+05:30), YYYY-MM-DD: a window that opens "on 14 October" opens at local midnight. */
export const todayLk = (now = Date.now()) => new Date(now + 330 * 60_000).toISOString().slice(0, 10);
const UNI_RE = /^\d{3}[A-Z]$/, ROUTE_RE = /^R\d{3}$/;
const flag = async (c: C, key: 'applied' | 'done') => {
  const b = (await c.req.json().catch(() => null)) as Record<string, unknown> | null;
  return typeof b?.[key] === 'boolean' ? b[key] as boolean : null;
};

export const myJourneyRoutes = new Hono<AppEnv>();

myJourneyRoutes.get('/me/journey', async c => {
  const id = c.get('accountId'), db = c.env.DB;
  const [courses, notices, steps] = await db.batch([
    db.prepare('SELECT course_code || institution_letter AS uni, followed_at FROM journey_course WHERE account_id = ? ORDER BY followed_at').bind(id),
    db.prepare('SELECT route_id, followed_at, applied_at FROM journey_notice WHERE account_id = ? ORDER BY followed_at').bind(id),
    db.prepare('SELECT step_id, done_at FROM journey_step WHERE account_id = ?').bind(id),
  ]);
  return c.json({
    courses: (courses.results as { uni: string; followed_at: string }[]).map(r => ({ uniCode: r.uni, followedAt: r.followed_at })),
    notices: (notices.results as { route_id: string; followed_at: string; applied_at: string | null }[])
      .map(r => ({ routeId: r.route_id, followedAt: r.followed_at, appliedAt: r.applied_at })),
    steps: (steps.results as { step_id: string; done_at: string }[]).filter(r => isStepId(r.step_id))
      .map(r => ({ stepId: r.step_id as MyJourney['steps'][number]['stepId'], doneAt: r.done_at })),
  } satisfies MyJourney);
});

myJourneyRoutes.put('/me/journey/courses/:uni', async c => {
  const uni = c.req.param('uni');
  if (!UNI_RE.test(uni) || !book.offerings.some(o => o.uniCode === uni)) return err(c, 404, 'No such course');
  await c.env.DB.prepare('INSERT OR IGNORE INTO journey_course (account_id, course_code, institution_letter, followed_at) VALUES (?, ?, ?, ?)')
    .bind(c.get('accountId'), uni.slice(0, 3), uni.slice(3), nowIso()).run();
  return c.body(null, 204);
});
myJourneyRoutes.delete('/me/journey/courses/:uni', async c => {
  const uni = c.req.param('uni');
  await c.env.DB.prepare('DELETE FROM journey_course WHERE account_id = ? AND course_code = ? AND institution_letter = ?')
    .bind(c.get('accountId'), uni.slice(0, 3), uni.slice(3)).run();
  return c.body(null, 204);
});

myJourneyRoutes.put('/me/journey/notices/:route', async c => {
  const route = c.req.param('route');
  if (!ROUTE_RE.test(route) || !book.routes.some(r => r.id === route)) return err(c, 404, 'No such notice');
  await c.env.DB.prepare('INSERT OR IGNORE INTO journey_notice (account_id, route_id, followed_at) VALUES (?, ?, ?)')
    .bind(c.get('accountId'), route, nowIso()).run();
  return c.body(null, 204);
});
myJourneyRoutes.delete('/me/journey/notices/:route', async c => {
  await c.env.DB.prepare('DELETE FROM journey_notice WHERE account_id = ? AND route_id = ?').bind(c.get('accountId'), c.req.param('route')).run();
  return c.body(null, 204);
});
myJourneyRoutes.put('/me/journey/notices/:route/applied', async c => {
  const route = c.req.param('route'), applied = await flag(c, 'applied');
  if (applied === null) return err(c, 400, 'Say whether you applied', 'applied');
  if (applied && !noticeTickable(data.notices.find(n => n.routeId === route), todayLk()))
    return err(c, 409, 'Applications have not opened yet');
  const r = await c.env.DB.prepare('UPDATE journey_notice SET applied_at = ? WHERE account_id = ? AND route_id = ?')
    .bind(applied ? nowIso() : null, c.get('accountId'), route).run();
  return r.meta.changes ? c.body(null, 204) : err(c, 404, 'Follow it first');
});

myJourneyRoutes.put('/me/journey/steps/:step', async c => {
  const step = c.req.param('step'), done = await flag(c, 'done');
  if (!isStepId(step)) return err(c, 404, 'No such step');
  if (done === null) return err(c, 400, 'Say whether the step is done', 'done');
  if (done && !stepWindow(step, data.steps, todayLk()).open) return err(c, 409, 'This step has not opened yet');
  await (done
    ? c.env.DB.prepare('INSERT OR IGNORE INTO journey_step (account_id, step_id, done_at) VALUES (?, ?, ?)').bind(c.get('accountId'), step, nowIso())
    : c.env.DB.prepare('DELETE FROM journey_step WHERE account_id = ? AND step_id = ?').bind(c.get('accountId'), step)).run();
  return c.body(null, 204);
});
