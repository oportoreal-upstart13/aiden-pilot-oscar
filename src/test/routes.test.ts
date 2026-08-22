import assert from "node:assert/strict";
import { before, describe, test } from "node:test";

/**
 * Route-handler tests.
 *
 * These run against a **production build** over HTTP rather than by
 * importing the handlers in-process, and that is a constraint, not a
 * preference — see `.claude/fixes/testing.md`. The upside is that nothing
 * is stubbed: every assertion below goes through the real `withAuth`, the
 * real Zod parse, the real org-filtered query, the real ownership step
 * and the real ability gate, in the real order. A pure-function test
 * cannot tell you that a perimeter step is missing; these can.
 *
 * Requires `npm start` on BASE with the seeded database.
 */

const BASE = process.env.SMOKE_BASE ?? "http://localhost:3100";
const PASSWORD = process.env.SEED_PASSWORD ?? "DeskLine!Seed1";

/** A cookie jar, since Node's fetch does not keep one. */
class Session {
  private cookies = new Map<string, string>();

  private header(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }

  private absorb(response: Response) {
    for (const raw of response.headers.getSetCookie()) {
      const [pair] = raw.split(";");
      const index = pair.indexOf("=");
      if (index > 0) {
        this.cookies.set(pair.slice(0, index).trim(), pair.slice(index + 1));
      }
    }
  }

  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    const response = await fetch(`${BASE}${path}`, {
      ...init,
      redirect: "manual",
      headers: {
        ...(init.headers ?? {}),
        ...(this.cookies.size > 0 ? { cookie: this.header() } : {}),
      },
    });
    this.absorb(response);
    return response;
  }

  setCookie(name: string, value: string) {
    this.cookies.set(name, value);
  }

  static async login(email: string): Promise<Session> {
    const session = new Session();
    const csrfResponse = await session.fetch("/api/auth/csrf");
    const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };

    const body = new URLSearchParams({
      csrfToken,
      email,
      password: PASSWORD,
      callbackUrl: BASE,
      json: "true",
    });
    const login = await session.fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    assert.ok(
      login.status === 200 || login.status === 302,
      `login for ${email} failed with ${login.status}`
    );
    return session;
  }
}

const ACME_TICKET_AGENT1 = "tkt_acme_1"; // owned by agent1@acme.test
const ACME_TICKET_AGENT2 = "tkt_acme_3"; // owned by agent2@acme.test
const GLOBEX_TICKET = "tkt_globex_1";

let anonymous: Session;
let agent1: Session;
let viewer: Session;
let owner: Session;

before(async () => {
  const reachable = await fetch(`${BASE}/api/auth/csrf`).catch(() => null);
  assert.ok(
    reachable?.ok,
    `no server on ${BASE} — start one with: npm run build && npm start -- -p 3100`
  );
  anonymous = new Session();
  agent1 = await Session.login("agent1@acme.test");
  viewer = await Session.login("viewer@acme.test");
  owner = await Session.login("owner@acme.test");
});

describe("perimeter order", () => {
  test("401 before anything else", async () => {
    const response = await anonymous.fetch("/api/tickets");
    assert.equal(response.status, 401);
  });

  test("authentication precedes body validation — a malformed body from an anonymous caller is still 401, not 400", async () => {
    const response = await anonymous.fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nonsense: true }),
    });
    assert.equal(
      response.status,
      401,
      "a 400 here would mean the body was parsed before the caller was authenticated"
    );
  });

  test("400 once authenticated, with the flattened issue map", async () => {
    const response = await agent1.fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: "", body: "" }),
    });
    assert.equal(response.status, 400);
    const payload = (await response.json()) as { error?: unknown };
    assert.ok(payload.error, "400 carries the flattened Zod issues");
  });

  test("ability denial is 403 and is decided after the row is visible", async () => {
    const readable = await viewer.fetch(`/api/tickets/${ACME_TICKET_AGENT1}`);
    assert.equal(readable.status, 200, "a viewer may read any in-org ticket");

    const denied = await viewer.fetch(
      `/api/tickets/${ACME_TICKET_AGENT1}/draft`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone: "neutral" }),
      }
    );
    assert.equal(
      denied.status,
      403,
      "403 not 404 — the caller can already see the row, so the denial leaks nothing"
    );
  });
});

describe("route params are validated before any query", () => {
  test("an id past the length bound is rejected, not passed to the database", async () => {
    const response = await agent1.fetch(`/api/tickets/${"x".repeat(70)}`);
    assert.equal(response.status, 404);
    const body = await response.text();
    assert.equal(
      body.includes("subject"),
      false,
      "a ticket in the body would mean an unvalidated id reached findFirst, " +
        "where Prisma omits an unusable filter and returns the wrong row"
    );
  });

  test("a blank id does not resolve to some arbitrary ticket", async () => {
    const response = await agent1.fetch("/api/tickets/%20%20%20");
    assert.equal(response.status, 404);
  });
});

describe("the ownership step degenerates by role", () => {
  test("an agent is refused a colleague's ticket in the same org", async () => {
    const response = await agent1.fetch(`/api/tickets/${ACME_TICKET_AGENT2}`);
    assert.equal(response.status, 404);
  });

  test("a viewer reads the very same ticket", async () => {
    const response = await viewer.fetch(`/api/tickets/${ACME_TICKET_AGENT2}`);
    assert.equal(
      response.status,
      200,
      "same URL, different role — the step is a real ownership check for " +
        "agents and a presence check for viewers"
    );
  });

  test("an owner reads it too, and still cannot mutate it", async () => {
    assert.equal(
      (await owner.fetch(`/api/tickets/${ACME_TICKET_AGENT2}`)).status,
      200
    );
    const patched = await owner.fetch(`/api/tickets/${ACME_TICKET_AGENT2}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }),
    });
    assert.equal(
      patched.status,
      403,
      "owners govern the organization; agents work the queue"
    );
  });

  test("the list applies the same boundary the detail read enforces", async () => {
    const response = await agent1.fetch("/api/tickets");
    const { tickets } = (await response.json()) as {
      tickets: { id: string }[];
    };
    const ids = tickets.map((ticket) => ticket.id);
    assert.ok(ids.includes(ACME_TICKET_AGENT1));
    assert.equal(
      ids.includes(ACME_TICKET_AGENT2),
      false,
      "a row in the list that 404s on open is the bug D3 fixed"
    );
  });
});

describe("cross-tenant reads are indistinguishable from missing ones", () => {
  test("a Globex ticket is 404 for an Acme agent", async () => {
    assert.equal(
      (await agent1.fetch(`/api/tickets/${GLOBEX_TICKET}`)).status,
      404
    );
  });

  test("cross-tenant, not-yours and nonexistent share one body, byte for byte", async () => {
    const [foreign, notYours, missing] = await Promise.all([
      agent1.fetch(`/api/tickets/${GLOBEX_TICKET}`),
      agent1.fetch(`/api/tickets/${ACME_TICKET_AGENT2}`),
      agent1.fetch("/api/tickets/tkt_does_not_exist"),
    ]);

    const bodies = await Promise.all([
      foreign.text(),
      notYours.text(),
      missing.text(),
    ]);

    assert.equal(bodies[0], bodies[1]);
    assert.equal(bodies[1], bodies[2]);
    assert.equal(bodies[0], '{"error":"Resource not found"}');
  });
});

describe("the org cookie is untrusted input", () => {
  test("forging it towards another organization grants nothing", async () => {
    const forged = await Session.login("agent1@acme.test");
    forged.setCookie("deskline_org", "org_globex");

    const response = await forged.fetch("/api/tickets");
    assert.equal(response.status, 200);
    const { activeOrgId } = (await response.json()) as { activeOrgId: string };
    assert.equal(
      activeOrgId,
      "org_acme",
      "the Membership query is the authority; the cookie is only a request"
    );
  });

  test("switching to an organization the caller does not belong to is 404", async () => {
    const response = await agent1.fetch("/api/orgs/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgId: "org_globex" }),
    });
    assert.equal(response.status, 404);
  });
});
