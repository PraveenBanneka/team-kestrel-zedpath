// Test-only stand-in for the `cloudflare:workers` module, which exists only inside the Workers runtime. The API tests
// run on Node, import the Worker (which exports GroupRoom) and never start a room, so a bare base class is enough.
export class DurableObject<E = unknown> {
  constructor(readonly ctx: unknown, readonly env: E) {}
}
