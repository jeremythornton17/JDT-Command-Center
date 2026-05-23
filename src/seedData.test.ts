import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { seededOperationsCrew, shouldSeedCollection } from "./seedData";

describe("seed data configuration", () => {
  it("does not include seeded operations crew or personnel records", () => {
    assert.deepEqual(seededOperationsCrew, []);
  });

  it("prevents the crews collection from being auto-seeded", () => {
    assert.equal(shouldSeedCollection("crews", [{ id: "crew-seed" }]), false);
    assert.equal(shouldSeedCollection("jobs", [{ id: "job-seed" }]), true);
    assert.equal(shouldSeedCollection("crews", []), false);
  });
});
