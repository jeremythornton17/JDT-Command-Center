import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isAuthorizedEmail } from "../authAccess";
import { defaultJdtPersonnelRoster, mergePersonnelRecords, personnelCrewAllocationOptions, personnelLanguageOptions, personnelRoleOptions } from "./personnel";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readProjectFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("JDT personnel roster", () => {
  it("includes the current personnel names and phone numbers", () => {
    assert.equal(defaultJdtPersonnelRoster.length, 17);
    assert.deepEqual(
      defaultJdtPersonnelRoster.map(person => [person.name, person.role, person.phone]),
      [
        ["Jeremy Thornton", "Owner", "561-312-3004"],
        ["Buck Thornton", "Owner", "863-228-2660"],
        ["Jeff Swindle", "Crew Leader", "863-673-1348"],
        ["Jack Belcher", "Crew Leader", "863-261-2470"],
        ["Santiago Lopes", "Crew Leader", "919-583-2952"],
        ["Carlos Reyes", "Crew Leader", "863-228-1031"],
        ["Samuel Rivera", "Crew Leader", "863-233-6601"],
        ["Earl Bryant", "Crew Leader", "863-673-1880"],
        ["Nick Lara", "Crew Leader", "863-233-0892"],
        ["Neftali Euceda", "Crew Leader", "863-228-7991"],
        ["Alex Bueno", "Driver", "863-843-2079"],
        ["Christian Crespo", "Driver", "863-228-0351"],
        ["Vince Carreno", "Driver", "828-379-4036"],
        ["Ron Thompson", "Driver", "863-281-3341"],
        ["Carlos \"Burro\"", "Nutrient Tech", "863-599-1731"],
        ["Regina Kane", "Office Admin", "863-228-1201"],
        ["Jennifer Bermudez", "Operations Coordinator", "239-800-1736"],
      ],
    );
  });

  it("uses Buck's JDT email with owner admin app access", () => {
    const buck = defaultJdtPersonnelRoster.find(person => person.name === "Buck Thornton");

    assert.equal(buck?.email, "buck@jdtnurseries.com");
    assert.equal(buck?.appAccess, "admin");
    assert.equal(isAuthorizedEmail(buck?.email), true);
  });

  it("marks known CDL-certified personnel for driver compliance tracking", () => {
    const cdlPersonnel = ["Jeremy Thornton", "Buck Thornton", "Earl Bryant", "Jack Belcher", "Carlos Reyes"];

    for (const name of cdlPersonnel) {
      const person = defaultJdtPersonnelRoster.find(record => record.name === name);
      assert.equal(person?.drivesForCompany, true, `${name} should be marked as driving for company insurance`);
      assert.equal(person?.cdlCertified, true, `${name} should be marked CDL certified`);
    }
  });

  it("merges Firestore personnel edits without dropping baseline roster contacts", () => {
    const merged = mergePersonnelRecords(defaultJdtPersonnelRoster, [
      { id: "personnel-jeff-swindle", name: "Jeff Swindle", role: "Crew Leader", phone: "863-000-0000", availability: "Active" },
      { id: "personnel-new-manager", name: "New Manager", role: "Manager", phone: "863-111-1111" },
    ]);

    assert.equal(merged.length, 18);
    assert.equal(merged.find(person => person.name === "Jeff Swindle")?.phone, "863-000-0000");
    assert.equal(merged.find(person => person.name === "Buck Thornton")?.phone, "863-228-2660");
    assert.equal(merged.at(-1)?.name, "New Manager");
  });

  it("does not let blank Firestore placeholders hide roster names or phone numbers", () => {
    const merged = mergePersonnelRecords(defaultJdtPersonnelRoster, [
      { id: "personnel-jeff-swindle", name: "", role: "", phone: "", availability: "Active" },
      { id: "blank-placeholder", name: "", role: "", phone: "" },
    ]);
    const jeff = merged.find(person => person.id === "personnel-jeff-swindle");

    assert.equal(merged.length, 17);
    assert.equal(jeff?.name, "Jeff Swindle");
    assert.equal(jeff?.role, "Crew Leader");
    assert.equal(jeff?.phone, "863-673-1348");
    assert.equal(jeff?.availability, "Active");
  });

  it("keeps the baseline roster wired directly into the crews page", () => {
    const crewsBoard = readProjectFile("src/components/CrewsBoard.tsx");

    assert.match(crewsBoard, /defaultJdtPersonnelRoster/);
    assert.match(crewsBoard, /mergePersonnelRecords/);
  });

  it("lets personnel edits fill in contact and operating details later", () => {
    const entityForms = readProjectFile("src/components/EntityForms.tsx");

    assert.match(entityForms, /key:\s*'email'/);
    assert.match(entityForms, /key:\s*'availability'/);
    assert.match(entityForms, /key:\s*'type'/);
    assert.match(entityForms, /key:\s*'notes'/);
  });

  it("keeps field role options clear for personnel setup", () => {
    assert.deepEqual(
      personnelRoleOptions,
      [
        "Owner",
        "Office Admin",
        "Operations Coordinator",
        "Crew Leader",
        "Driver",
        "Nutrient Tech",
        "Irrigation Tech",
        "Mechanic",
        "Field Support",
      ],
    );
  });

  it("keeps crew allocation options practical for field departments", () => {
    assert.deepEqual(
      personnelCrewAllocationOptions,
      [
        "Ownership",
        "Office",
        "Operations Leadership",
        "Transportation",
        "Nutrient Care",
        "Irrigation",
        "Equipment Maintenance",
        "Field Support",
      ],
    );
  });

  it("uses a fixed language dropdown for personnel setup", () => {
    const entityForms = readProjectFile("src/components/EntityForms.tsx");

    assert.deepEqual(personnelLanguageOptions, ["English", "Spanish", "Bilingual"]);
    assert.match(entityForms, /key:\s*'language',\s*label:\s*'Language',\s*type:\s*'select',\s*options:\s*personnelLanguageOptions/);
  });

  it("makes the crews page distinguish role, crew allocation, and primary skill", () => {
    const crewsBoard = readProjectFile("src/components/CrewsBoard.tsx");

    assert.match(crewsBoard, /Primary Role/);
    assert.match(crewsBoard, /Crew Allocation/);
    assert.match(crewsBoard, /Primary Skill/);
    assert.match(crewsBoard, /Task Go-To/);
  });

  it("uses Carlos Reyes as the starter example for root pruning assignment", () => {
    const carlos = defaultJdtPersonnelRoster.find(person => person.name === "Carlos Reyes");

    assert.equal(carlos?.role, "Crew Leader");
    assert.equal(carlos?.skill, "Root pruning");
  });
});
