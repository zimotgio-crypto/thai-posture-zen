// The DB EXCLUDE constraint (bookings_no_overlap) surfaces as a Postgres
// error on insert; all three booking paths map it to a "conflict" result.
import { test } from "node:test";
import assert from "node:assert/strict";

import { isBookingConflictError } from "../src/lib/booking-availability.server.ts";

test("exclusion and unique violations count as booking conflicts", () => {
  assert.equal(isBookingConflictError({ code: "23P01" }), true);
  assert.equal(isBookingConflictError({ code: "23505" }), true);
});

test("other errors are not treated as conflicts", () => {
  assert.equal(isBookingConflictError({ code: "23502" }), false);
  assert.equal(isBookingConflictError({ code: null }), false);
  assert.equal(isBookingConflictError({}), false);
  assert.equal(isBookingConflictError(null), false);
  assert.equal(isBookingConflictError(undefined), false);
});
