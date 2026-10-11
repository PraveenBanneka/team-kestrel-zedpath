// GroupRoom: one Durable Object per course group (CR-002). Holds that group's messages in its own SQLite storage and
// the members' live WebSocket connections (hibernation API: an idle room costs nothing). Only the Worker can reach a
// room (there is no public URL for it), and the Worker has already checked the session and the membership, so the
// identity headers below are trusted. Rules shared with the phone live in shared/groups.ts.
import { DurableObject } from 'cloudflare:workers';
import { HISTORY_LIMIT, canPost, cleanMessage, moderationSays, visibleTo, type ChatMessage, type ServerFrame } from '../shared/groups.ts';

interface Member { accountId: number; author: string; badge: string | null; blocked: number[] }
type Row = { message_id: string; account_id: number; author: string; badge: string | null; body: string; created_at: string; hidden: number } & Record<string, SqlStorageValue>;

const MODERATION_MODEL = '@cf/meta/llama-guard-3-8b';
const toMessage = (r: Pick<Row, 'message_id' | 'author' | 'badge' | 'body' | 'created_at'>): ChatMessage => ({ id: r.message_id, author: r.author, badge: r.badge, body: r.body, at: r.created_at });
const randomHex = (n: number) => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');

export class GroupRoom extends DurableObject<Env> {
  private sql: SqlStorage;
  private queue: Promise<void> = Promise.resolve();   // posts are processed one at a time (see webSocketMessage)

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS message (
        message_id  TEXT PRIMARY KEY CHECK (length(message_id) = 32),
        account_id  INTEGER NOT NULL,
        author      TEXT NOT NULL,
        badge       TEXT,
        body        TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 500),
        created_at  TEXT NOT NULL,
        hidden      INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)))`);
    this.sql.exec('CREATE INDEX IF NOT EXISTS idx_message_created ON message(created_at)');
    this.sql.exec('CREATE INDEX IF NOT EXISTS idx_message_account ON message(account_id, created_at)');
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/live') {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      const member: Member = {
        accountId: Number(req.headers.get('X-ZP-Account')), author: req.headers.get('X-ZP-Author') ?? '',
        badge: req.headers.get('X-ZP-Badge') ? decodeURIComponent(req.headers.get('X-ZP-Badge')!) : null, blocked: JSON.parse(req.headers.get('X-ZP-Blocked') ?? '[]') as number[],
      };
      const pair = new WebSocketPair();
      this.ctx.acceptWebSocket(pair[1]);
      pair[1].serializeAttachment(member);
      this.send(pair[1], { type: 'history', messages: this.history(member.blocked) });
      return new Response(null, { status: 101, webSocket: pair[0] });
    }
    if (url.pathname === '/hide' && req.method === 'POST') {                 // enough members reported it
      const { messageId } = await req.json<{ messageId: string }>();
      this.sql.exec('UPDATE message SET hidden = 1 WHERE message_id = ?', messageId);
      this.broadcast({ type: 'hidden', id: messageId });
      return new Response(null, { status: 204 });
    }
    if (url.pathname === '/purge' && req.method === 'POST') {                // the account was deleted
      const { accountId } = await req.json<{ accountId: number }>();
      const gone = this.sql.exec<{ message_id: string }>('SELECT message_id FROM message WHERE account_id = ?', accountId).toArray();
      this.sql.exec('DELETE FROM message WHERE account_id = ?', accountId);
      for (const g of gone) this.broadcast({ type: 'hidden', id: g.message_id });
      for (const ws of this.ctx.getWebSockets()) if ((ws.deserializeAttachment() as Member).accountId === accountId) ws.close(1008, 'Account deleted');
      return new Response(null, { status: 204 });
    }
    if (url.pathname === '/exists' && req.method === 'POST') {               // report check: does this message exist here?
      const { messageId } = await req.json<{ messageId: string }>();
      const n = this.sql.exec<{ n: number }>('SELECT count(*) AS n FROM message WHERE message_id = ?', messageId).one().n;
      return Response.json({ exists: n > 0 });
    }
    return new Response('Not found', { status: 404 });
  }

  // Posts are handled one at a time, in arrival order: while one waits for the moderation model, the next waits its
  // turn. Otherwise a second post could pass the rate check before the first is saved, and a quick reply could overtake
  // the message it answers (both seen in local testing, 2026-10-11).
  async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer) {
    const turn = this.queue.then(() => this.handlePost(ws, data));
    this.queue = turn.catch(() => {});
    return turn;
  }

  private async handlePost(ws: WebSocket, data: string | ArrayBuffer) {
    const member = ws.deserializeAttachment() as Member;
    let frame: { type?: unknown; body?: unknown };
    try { frame = JSON.parse(typeof data === 'string' ? data : new TextDecoder().decode(data)); } catch { return this.send(ws, { type: 'error', error: 'Unreadable message' }); }
    if (frame.type !== 'post') return;
    const clean = cleanMessage(frame.body);
    if (!clean.ok) return this.send(ws, { type: 'error', error: clean.error });

    const now = Date.now();
    const recent = this.sql.exec<{ created_at: string }>('SELECT created_at FROM message WHERE account_id = ? AND created_at > ?',
      member.accountId, new Date(now - 10 * 60_000).toISOString()).toArray().map(r => Date.parse(r.created_at));
    const rate = canPost(recent, now);
    if (!rate.ok) return this.send(ws, { type: 'error', error: rate.error });

    let verdict: 'SAFE' | 'UNSAFE' | 'ERROR';
    try { verdict = moderationSays(await this.env.AI.run(MODERATION_MODEL, { messages: [{ role: 'user', content: clean.body }] })); }
    catch { verdict = 'ERROR'; }                                                     // fail closed: unchecked = not posted
    if (verdict === 'ERROR') return this.send(ws, { type: 'error', error: 'Could not check your message right now. Try again in a moment.' });
    if (verdict === 'UNSAFE') return this.send(ws, { type: 'error', error: 'This message was not posted: it may break the group rules. Keep it kind and on topic.' });

    const row: Row = { message_id: randomHex(16), account_id: member.accountId, author: member.author, badge: member.badge,
      body: clean.body, created_at: new Date(now).toISOString(), hidden: 0 };
    this.sql.exec('INSERT INTO message (message_id, account_id, author, badge, body, created_at, hidden) VALUES (?, ?, ?, ?, ?, ?, 0)',
      row.message_id, row.account_id, row.author, row.badge, row.body, row.created_at);
    for (const peer of this.ctx.getWebSockets()) {
      const p = peer.deserializeAttachment() as Member;
      if (!p.blocked.includes(member.accountId)) this.send(peer, { type: 'message', message: toMessage(row) });
    }
  }

  async webSocketClose(ws: WebSocket, code: number) { try { ws.close(code === 1006 ? 1000 : code); } catch { /* already closed */ } }

  private history(blocked: number[]): ChatMessage[] {
    const rows = this.sql.exec<Row>('SELECT * FROM message ORDER BY created_at DESC LIMIT ?', HISTORY_LIMIT * 2).toArray();
    return visibleTo(rows.map(r => ({ ...r, accountId: r.account_id, hidden: r.hidden === 1 })), blocked)
      .slice(0, HISTORY_LIMIT).reverse().map(toMessage);
  }
  private send(ws: WebSocket, f: ServerFrame) { try { ws.send(JSON.stringify(f)); } catch { /* closed meanwhile */ } }
  private broadcast(f: ServerFrame) { for (const ws of this.ctx.getWebSockets()) this.send(ws, f); }
}
