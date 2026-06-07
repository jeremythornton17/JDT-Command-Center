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
    assert.match(categoryPillClass("crew"), /#A85418/);
    assert.match(categoryPillClass("freight"), /#1E7EA2/);
    assert.match(categoryPillClass("equipment"), /#B54626/);
    assert.match(categoryPillClass("nursery"), /#63B52F/);

    assert.match(categoryAccentBorderClass("relocation"), /#0F3D2E/);
    assert.match(categoryAccentBorderClass("crew"), /#A85418/);
    assert.match(categoryAccentBorderClass("freight"), /#1E7EA2/);
    assert.match(categoryAccentBorderClass("equipment"), /#B54626/);
    assert.match(categoryAccentBorderClass("nursery"), /#63B52F/);

    assert.match(statusPillClass("Blocked"), /#8F241A/);
    assert.match(statusPillClass("Scheduled"), /#8A6500/);
    assert.match(statusPillClass("In Progress"), /#A44E10/);
    assert.match(statusPillClass("Ready For Relocation"), /#236B2E/);

    assert.match(riskPillClass("critical"), /#8F241A/);
    assert.match(riskPillClass("watch"), /#8A6500/);
    assert.match(riskPillClass("low"), /#236B2E/);
  });
});
