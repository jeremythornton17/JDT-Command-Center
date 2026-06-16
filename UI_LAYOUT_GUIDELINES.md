# JDT Command Center UI Layout Guidelines

This app is a dense field-operations command center. Screens should help office staff, owners, crew leaders, drivers, and maintenance users scan operational state quickly and take the next action without scrolling through oversized profile cards.

## Core Layout Rules

- Default to compact tables, lists, grouped work packages, and expandable detail.
- Use full cards only for repeated objects that truly need visual separation, and keep them compact.
- Avoid long walls of large cards for people, trees, work orders, compliance records, or schedule tasks.
- Use right-side detail drawers, inline expandable rows, or bottom drawers for deep record details.
- Keep important actions visible near the record they affect.
- Reduce vertical whitespace. Prefer tighter padding, shorter headers, compact filters, and dense row spacing.
- Keep the first viewport focused on command decisions: what is happening, who is assigned, what is blocked, and what action is next.
- Do not put every available field in the default view. Show the operational summary first and reveal full details on demand.

## Page Defaults

- Dashboard pages default to grouped operating work, not individual low-level task records.
- Project Work Orders default to grouped work packages.
- Project Trees default to compact individual tree records.
- Expanded tree detail may show individual root pruning, relocation work, nutrient care, and photo records.
- Crews default to Roster View, with full personnel detail in a side drawer.
- Equipment, Freight, Nursery, Clients, and Maps should use compact rows or grouped cards where record counts can grow.

## Card And Table Rules

- Use tables or compact list rows when a page can reasonably exceed 20 records.
- Use card grids only as an optional view toggle or when visual inspection matters.
- Repeated cards should avoid nested large sections.
- Compliance, status, risk, and assignment state should appear as compact badges in lists.
- Full compliance blocks, full history, full notes, and document details belong in detail drawers.

## Modal And Drawer Rules

- Avoid long scrolling modals as the default record browser.
- Use drawers for record inspection and modals for focused create/edit actions.
- Drawer headers should identify the record, status, and next action.
- Keep edit forms grouped by intent: identity, assignment, location, compliance, notes.

## Field Operations Rules

- Every important record should answer: who, where, when, status, blocker, and next action.
- Division pages should show division-specific actions first.
- Assignment buttons must make it clear what is being assigned, to whom, and for what project or job.
- Batch work should show batch count and scope first, then individual items inside an expanded view.

## Mobile Rules

- Mobile defaults should stack by urgency: today work, blockers, assigned tasks, map, detail.
- Tables should become horizontally scrollable or compact row cards.
- Field-user actions should be thumb-friendly and minimal: start, complete, note, photo, blocker, map.

## Visual Language

- Icons identify category.
- Colors identify status or risk.
- Category colors should be distinguishable but muted.
- Status and risk badges should pop enough to scan quickly.
- Use warning colors only for actual attention items.
