import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAppPermissions, getAppRole, getUnauthorizedAccountMessage, isAdminEmail, isAuthorizedEmail } from "./authAccess";

describe("auth access helpers", () => {
  it("limits admin access to explicit owner accounts", () => {
    assert.equal(isAdminEmail("jeremy@jdtnurseries.com"), true);
    assert.equal(isAdminEmail("buck@jdtnurseries.com"), true);
    assert.equal(isAdminEmail("crew.lead@jdtnurseries.com"), false);
    assert.equal(isAdminEmail("CREW.LEAD@JDTNURSERIES.COM"), false);
  });

  it("allows jdtnurseries.com accounts into the app without making them admins", () => {
    assert.equal(isAuthorizedEmail("jeremy@jdtnurseries.com"), true);
    assert.equal(isAuthorizedEmail("crew.lead@jdtnurseries.com"), true);
    assert.equal(isAuthorizedEmail("CREW.LEAD@JDTNURSERIES.COM"), true);
  });

  it("allows Buck Thornton into the app as an owner admin with his JDT email", () => {
    assert.equal(isAuthorizedEmail("buck@jdtnurseries.com"), true);
    assert.equal(isAdminEmail("buck@jdtnurseries.com"), true);
    assert.equal(getAppRole("buck@jdtnurseries.com"), "owner_admin");
    assert.deepEqual(getAppPermissions("buck@jdtnurseries.com"), {
      canRead: true,
      canWrite: true,
      canImport: true,
      canDelete: true,
      canReset: true,
      canManageSources: true,
      canManageUsers: true,
      canSubmitFieldUpdates: true,
    });
  });

  it("does not grant app access to personal or lookalike domains", () => {
    assert.equal(isAdminEmail("jeremy@gmail.com"), false);
    assert.equal(isAuthorizedEmail("jeremy@gmail.com"), false);
    assert.equal(isAuthorizedEmail("jdtn2155@gmail.com"), false);
    assert.equal(isAdminEmail("owner@notjdtnurseries.com"), false);
    assert.equal(isAuthorizedEmail("owner@notjdtnurseries.com"), false);
    assert.equal(isAdminEmail("crew@jdtnurseries.com.evil.test"), false);
    assert.equal(isAuthorizedEmail("crew@jdtnurseries.com.evil.test"), false);
    assert.equal(isAdminEmail(null), false);
    assert.equal(isAuthorizedEmail(null), false);
  });

  it("keeps the unauthorized message open to approved non-domain contacts", () => {
    assert.doesNotMatch(getUnauthorizedAccountMessage(), /authorized jdtnurseries\.com account/i);
    assert.match(getUnauthorizedAccountMessage(), /authorized account/i);
  });
});
