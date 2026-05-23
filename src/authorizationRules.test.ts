import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fullAccessRoles, personnelRoles } from "./personnelRoles";

const rules = readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");

describe("Firestore role authorization rules", () => {
  it("recognizes every app personnel role", () => {
    for (const role of personnelRoles) {
      assert.match(rules, new RegExp(`"${role}"`));
    }
  });

  it("keeps full-access authorization aligned with Admin and Owner", () => {
    assert.match(rules, new RegExp(fullAccessRoles.map((role) => `"${role}"`).join(", ")));
    assert.match(rules, /Office@jdtnurseries\.com/);
    assert.match(rules, /jeremy@jdtnurseries\.com/);
    assert.equal(rules.includes("@jdtnurseries\\\\.com") || rules.includes("@jdtnurseries\\.com"), true);
  });
});
