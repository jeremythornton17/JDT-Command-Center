import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { categoryForWorkItemTone, operatingCategoryForNavId, operatingCategoryForRecordType } from "../commandCenter/visualLanguage";
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
});
