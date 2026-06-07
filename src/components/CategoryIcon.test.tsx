import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  categoryAccentBorderClass,
  categoryForWorkItemTone,
  categoryPillClass,
  operatingCategoryForNavId,
  operatingCategoryForRecordType,
  riskPillClass,
  statusPillClass,
  statusToneName,
} from "../commandCenter/visualLanguage";
import { CategoryIcon, CategoryPill } from "./CategoryIcon";

describe("operating category visual language", () => {
  it("keeps category identity separate from status and risk color", () => {
    assert.equal(operatingCategoryForNavId("crews"), "crew");
    assert.equal(operatingCategoryForNavId("equipment"), "equipment");
    assert.equal(operatingCategoryForNavId("freight"), "freight");
    assert.equal(operatingCategoryForNavId("inventory"), "nursery");
    assert.equal(operatingCategoryForNavId("tracker"), "relocation");
    assert.equal(operatingCategoryForRecordType("alert"), "alert");
    assert.equal(operatingCategoryForRecordType("equipment"), "equipment");
    assert.equal(categoryForWorkItemTone("task"), "crew");
  });

  it("renders accessible category icons and compact icon pills", () => {
    const iconHtml = renderToString(<CategoryIcon category="freight" />);
    assert.match(iconHtml, /aria-label="Freight"/);
    assert.match(iconHtml, /data-category="freight"/);

    const compactPillHtml = renderToString(<CategoryPill category="equipment" compact />);
    assert.match(compactPillHtml, /aria-label="Equipment"/);
    assert.match(compactPillHtml, /data-category="equipment"/);
    assert.doesNotMatch(compactPillHtml, />Equipment</);
  });

  it("assigns distinct category accents with muted surfaces and brighter stoplight status tones", () => {
    assert.match(categoryPillClass("relocation"), /#0F3D2E/);
    assert.match(categoryPillClass("crew"), /#8A5A2B/);
    assert.match(categoryPillClass("freight"), /#1E7EA2/);
    assert.match(categoryPillClass("equipment"), /#7C3AED/);
    assert.match(categoryPillClass("nursery"), /#63B52F/);

    assert.match(categoryAccentBorderClass("relocation"), /#0F3D2E/);
    assert.match(categoryAccentBorderClass("crew"), /#8A5A2B/);
    assert.match(categoryAccentBorderClass("freight"), /#1E7EA2/);
    assert.match(categoryAccentBorderClass("equipment"), /#7C3AED/);
    assert.match(categoryAccentBorderClass("nursery"), /#63B52F/);

    assert.match(statusPillClass("Blocked"), /#8F241A/);
    assert.match(statusPillClass("Scheduled"), /#FFF35A/);
    assert.match(statusPillClass("Scheduled"), /#5F4A00/);
    assert.match(statusPillClass("In Progress"), /#DFF6FF/);
    assert.match(statusPillClass("In Progress"), /#075985/);
    assert.match(statusPillClass("Ready For Relocation"), /#236B2E/);

    assert.match(riskPillClass("critical"), /#8F241A/);
    assert.match(riskPillClass("watch"), /#FFF35A/);
    assert.match(riskPillClass("low"), /#236B2E/);
  });

  it("uses explicit status labels before broad keyword matching", () => {
    assert.equal(statusToneName("Invoiced"), "ready");
    assert.equal(statusToneName("Moved To Holding Area"), "active");
    assert.equal(statusToneName("Needs Equipment"), "caution");
    assert.equal(statusToneName("At Pickup"), "active");
    assert.equal(statusToneName("Not Started"), "danger");
  });
});
