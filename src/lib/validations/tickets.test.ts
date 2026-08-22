import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  CreateTicketBody,
  DraftBody,
  ListTicketsQuery,
  UpdateTicketBody,
} from "@/lib/validations/tickets";

describe("CreateTicketBody", () => {
  test("trims and accepts a well-formed ticket", () => {
    const parsed = CreateTicketBody.parse({
      subject: "  Checkout fails  ",
      body: "  Cards decline at the confirmation step.  ",
    });
    assert.equal(parsed.subject, "Checkout fails");
    assert.equal(parsed.body, "Cards decline at the confirmation step.");
  });

  test("rejects whitespace-only fields — trim happens before the length check", () => {
    assert.equal(
      CreateTicketBody.safeParse({ subject: "   ", body: "real" }).success,
      false
    );
    assert.equal(
      CreateTicketBody.safeParse({ subject: "real", body: "   " }).success,
      false
    );
  });

  test("bounds both fields", () => {
    assert.equal(
      CreateTicketBody.safeParse({ subject: "x".repeat(201), body: "b" })
        .success,
      false
    );
    assert.equal(
      CreateTicketBody.safeParse({ subject: "s", body: "x".repeat(10_001) })
        .success,
      false
    );
  });
});

describe("UpdateTicketBody", () => {
  test('refuses status "closed" — closing is POST /close, which emits ticket.close', () => {
    const result = UpdateTicketBody.safeParse({ status: "closed" });
    assert.equal(
      result.success,
      false,
      "accepting closed here would record a close as a ticket.update and " +
        "quietly weaken the audit trail"
    );
  });

  test("accepts the statuses a PATCH may set", () => {
    assert.equal(UpdateTicketBody.safeParse({ status: "open" }).success, true);
    assert.equal(
      UpdateTicketBody.safeParse({ status: "pending" }).success,
      true
    );
  });

  test("rejects an empty object — a no-op update would emit an audit event saying nothing changed", () => {
    assert.equal(UpdateTicketBody.safeParse({}).success, false);
  });

  test("accepts a partial update", () => {
    assert.equal(
      UpdateTicketBody.safeParse({ subject: "New subject" }).success,
      true
    );
  });
});

describe("ListTicketsQuery", () => {
  test("defaults limit to 25 when absent", () => {
    assert.equal(ListTicketsQuery.parse({}).limit, 25);
  });

  test("coerces the string a query string actually delivers", () => {
    assert.equal(ListTicketsQuery.parse({ limit: "10" }).limit, 10);
  });

  test("bounds limit so a list read cannot be turned into a full scan", () => {
    assert.equal(ListTicketsQuery.safeParse({ limit: "101" }).success, false);
    assert.equal(ListTicketsQuery.safeParse({ limit: "0" }).success, false);
    assert.equal(ListTicketsQuery.safeParse({ limit: "-5" }).success, false);
  });

  test("filtering by closed is allowed — only transitioning to it is not", () => {
    assert.equal(ListTicketsQuery.parse({ status: "closed" }).status, "closed");
  });

  test("rejects an unknown status", () => {
    assert.equal(
      ListTicketsQuery.safeParse({ status: "archived" }).success,
      false
    );
  });
});

describe("DraftBody", () => {
  test("defaults the tone", () => {
    assert.equal(DraftBody.parse({}).tone, "neutral");
  });

  test("rejects a tone outside the offered set", () => {
    assert.equal(DraftBody.safeParse({ tone: "sarcastic" }).success, false);
  });
});
