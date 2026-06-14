# Map Items Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Groundzy-inspired Map Items Workbench to JDT project/farm map views so tree records can be searched, filtered, multi-selected, bulk updated, and exported from the map.

**Architecture:** Keep this inside the existing `MapsBoard` so tree pins, saved project pins, KML export/import, live GPS, and map mode selection remain one command surface. Add small local helpers for row labels, search matching, selected CSV export, marker classes, and schedule filtering. Wire `scheduleTasks` from `App` into `MapsBoard` for the project/farm calendar strip.

**Tech Stack:** React 19, TypeScript, Vite, Firebase-backed records, Google Maps JavaScript API fallback map, node:test server-rendered component tests.

---

### Task 1: Map Workbench Render Contract

**Files:**
- Modify: `src/components/MapsBoard.test.tsx`
- Modify: `src/components/MapsBoard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write failing tests**

Add tests asserting the project map renders `Map Items Workbench`, search/filter/multi-select controls, richer tree summaries, bulk actions, and a map schedule strip.

- [ ] **Step 2: Run MapsBoard tests and confirm failure**

Run: `npm exec -- node --test --import tsx src/components/MapsBoard.test.tsx`

- [ ] **Step 3: Add workbench state and helpers**

Add search text, active status filters, in-view toggle, multi-select toggle, selected tree IDs, export helpers, marker label helpers, and schedule filtering.

- [ ] **Step 4: Replace Tree Pin List with Map Items Workbench**

Render the new right-side panel while keeping Active Tree, KML, saved site location, and live GPS panels intact.

- [ ] **Step 5: Wire schedule tasks from App**

Pass `scheduleTasks` into `MapsBoard` and render matching tasks for the selected project/job under the map.

- [ ] **Step 6: Verify**

Run: `npm exec -- node --test --import tsx src/components/MapsBoard.test.tsx src/treeRelocationMap.test.ts src/components/CalendarBoard.test.tsx`

Then run: `npm run build`
