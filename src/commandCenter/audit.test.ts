import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { stampRecordForSave } from "./audit";
import type { CommandRecord } from "./records";

describe("record audit helpers", () => {
  it("adds created and updated history to new records", () => {
    const stamped = stampRecordForSave(
      { id: "job-1", title: "Boca Move" },
      undefined,
      { actorEmail: "jennifer@jdtnurseries.com", now: "2026-05-31T15:05:00.000Z", event: "Created project" },
    );

    assert.equal(stamped.createdBy, "jennifer@jdtnurseries.com");
    assert.equal(stamped.updatedBy, "jennifer@jdtnurseries.com");
    assert.equal(stamped.history?.[0].event, "Created project");
  });

  it("preserves created metadata and prepends update history", () => {
    const existing: CommandRecord = {
      id: "job-1",
      title: "Boca Move",
      createdBy: "jeremy@jdtnurseries.com",
      createdAtIso: "2026-05-30T12:00:00.000Z",
      history: [{ date: "Earlier", user: "Jeremy", event: "Created project" }],
    };

    const stamped = stampRecordForSave(
      { id: "job-1", title: "Boca Move - Updated" },
      existing,
      { actorEmail: "regina@jdtnurseries.com", now: "2026-05-31T15:05:00.000Z", event: "Updated project" },
    );

    assert.equal(stamped.createdBy, "jeremy@jdtnurseries.com");
    assert.equal(stamped.createdAtIso, "2026-05-30T12:00:00.000Z");
    assert.equal(stamped.updatedBy, "regina@jdtnurseries.com");
    assert.equal(stamped.history?.[0].event, "Updated project");
    assert.equal(stamped.history?.[1].event, "Created project");
  });
});
