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

  it("assigns stable earthy category tones and stoplight status tones", () => {
    assert.match(categoryPillClass("crew"), /#A7BC86/);
    assert.match(categoryPillClass("equipment"), /#C68B64/);
    assert.match(categoryPillClass("freight"), /#8DB4BD/);
    assert.match(categoryPillClass("nursery"), /#8FAC72/);
    assert.match(categoryPillClass("relocation"), /#6F7D4D/);

    assert.match(categoryAccentBorderClass("freight"), /#345B6B/);
    assert.match(categoryAccentBorderClass("equipment"), /#935231/);

    assert.match(statusPillClass("Blocked"), /#7A331F/);
    assert.match(statusPillClass("Scheduled"), /#725B11/);
    assert.match(statusPillClass("In Progress"), /#7A4A12/);
    assert.match(statusPillClass("Ready For Relocation"), /#2F4A23/);

    assert.match(riskPillClass("critical"), /#7A331F/);
    assert.match(riskPillClass("watch"), /#725B11/);
    assert.match(riskPillClass("low"), /#2F4A23/);
  });
});
