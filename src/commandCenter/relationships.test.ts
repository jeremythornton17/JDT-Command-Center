import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assigneeInitialsFromName,
  clientIdFromName,
  clientOperatingCodeFromName,
  jobIdFromName,
  operatingDateCode,
  operatingJobIdFromParts,
  projectOperatingIdFromParts,
  resolveClientIdentityFromList,
  normalizeWorkOrderRelationship,
  normalizeProjectRelationship,
  projectIdFromName,
  sameClient,
  sameProjectTreeAsset,
  uniqueProjectOperatingIdFromParts,
  workOrderIdFromName,
} from "./relationships";

describe("client project job relationships", () => {
  it("builds stable ids from readable names", () => {
    assert.equal(clientIdFromName("McArthur Golf Club"), "client-mcarthur-golf-club");
    assert.equal(projectIdFromName("McArthur Golf Club", "Hole 3 Install"), "project-mcarthur-golf-club-hole-3-install");
    assert.equal(jobIdFromName("Hole 3 Install", "Root Prune Phase 1"), "job-hole-3-install-root-prune-phase-1");
  });

  it("builds readable operating ids for JDT projects and work orders", () => {
    assert.equal(clientOperatingCodeFromName("Boca West Country Club"), "BWCC");
    assert.equal(clientOperatingCodeFromName("A Cut Above"), "ACA");
    assert.equal(operatingDateCode("2026-06-04"), "060426");
    assert.equal(projectOperatingIdFromParts("Boca West Country Club", "2026-06-04"), "BWCC-060426");
    assert.equal(
      uniqueProjectOperatingIdFromParts({
        clientName: "Miakka Golf Club",
        projectName: "Miakka GC New Build",
        createdDate: "2026-06-11",
        existingProjects: [{ projectId: "MGC-061126", projectName: "Miakka GC Berm" }],
      }),
      "MGC-061126-NEW-BUILD",
    );
    assert.equal(assigneeInitialsFromName("Carlos Reyes"), "CR");
    assert.equal(
      operatingJobIdFromParts({
        projectId: "BWCC-060426",
        purpose: "Root Pruning",
        assigneeName: "Carlos Reyes",
        date: "2026-06-05",
        sequence: 1,
      }),
      "BWCC-060426-ROOTPRUNE-CR-060526-01",
    );
    assert.equal(
      operatingJobIdFromParts({
        projectId: "BWCC-060426",
        purpose: "Equipment Change",
        date: "2026-06-05",
        sequence: 2,
      }),
      "BWCC-060426-EQUIP-060526-02",
    );
  });

  it("normalizes a project-like record without dropping readable labels", () => {
    assert.deepEqual(
      normalizeProjectRelationship({ title: "Hole 3 Install", client: "McArthur Golf Club" }),
      {
        clientId: "client-mcarthur-golf-club",
        clientName: "McArthur Golf Club",
        projectId: "project-mcarthur-golf-club-hole-3-install",
        projectName: "Hole 3 Install",
      },
    );
  });

  it("matches clients by stable id first and readable fallback second", () => {
    const client = { id: "client-mcarthur-golf-club", name: "McArthur Golf Club" };

    assert.equal(sameClient(client, { clientId: "client-mcarthur-golf-club", clientName: "Edited Name" }), true);
    assert.equal(sameClient(client, { clientName: "McArthur Golf Club" }), true);
    assert.equal(sameClient(client, { clientName: "Other Club" }), false);
    assert.deepEqual(
      resolveClientIdentityFromList(
        { client: "Miakka Golf Club" },
        [{ id: "client-mpy89z86", name: "Miakka Golf Club" }],
      ),
      { clientId: "client-mpy89z86", clientName: "Miakka Golf Club" },
    );
  });

  it("matches project tree assets inside the selected project instead of globally by tree id", () => {
    assert.equal(
      sameProjectTreeAsset(
        { projectId: "project-waterford", treeId: "1001" },
        { projectId: "project-waterford", treeId: "1001" },
      ),
      true,
    );
    assert.equal(
      sameProjectTreeAsset(
        { projectId: "project-waterford", treeId: "1001" },
        { projectId: "project-boca-west", treeId: "1001" },
      ),
      false,
    );
  });

  it("builds stable work order ids under a job", () => {
    assert.equal(
      workOrderIdFromName("job-boca-west-relocation", "Root prune Hole 7"),
      "work-order-job-boca-west-relocation-root-prune-hole-7",
    );
  });

  it("normalizes a workbook-aligned work order without dropping labels", () => {
    assert.deepEqual(normalizeWorkOrderRelationship({
      clientName: "Boca West Country Club",
      projectName: "Boca West Relocation",
      jobName: "Relocation & Installation",
      title: "Root prune Hole 7",
    }), {
      clientId: "client-boca-west-country-club",
      clientName: "Boca West Country Club",
      projectId: "project-boca-west-country-club-boca-west-relocation",
      projectName: "Boca West Relocation",
      jobId: "job-boca-west-relocation-relocation-and-installation",
      jobName: "Relocation & Installation",
      id: "work-order-job-boca-west-relocation-relocation-and-installation-root-prune-hole-7",
      title: "Root prune Hole 7",
    });
  });
});
