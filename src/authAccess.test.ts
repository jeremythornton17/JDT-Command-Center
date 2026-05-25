import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAdminEmail } from "./authAccess";

describe("auth access helpers", () => {
  it("treats Jeremy and jdtnurseries.com accounts as admin users", () => {
    assert.equal(isAdminEmail("jeremy@jdtnurseries.com"), true);
    assert.equal(isAdminEmail("crew.lead@jdtnurseries.com"), true);
    assert.equal(isAdminEmail("CREW.LEAD@JDTNURSERIES.COM"), true);
  });

  it("does not grant admin access to personal or lookalike domains", () => {
    assert.equal(isAdminEmail("jeremy@gmail.com"), false);
    assert.equal(isAdminEmail("owner@notjdtnurseries.com"), false);
    assert.equal(isAdminEmail("crew@jdtnurseries.com.evil.test"), false);
    assert.equal(isAdminEmail(null), false);
  });
});
