# Reveal Match Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a safe Verizon Reveal match-review layer before Reveal vehicle data is trusted inside JDT Command Center.

**Architecture:** Keep Reveal as a telematics enrichment source and keep JDT Command Center as the operational source of truth. Server code fetches Reveal vehicles, compares them against existing equipment records, and returns match candidates without writing anything. The Equipment page shows those candidates, highlights confidence, and keeps the existing sync buttons available for owner admins.

**Tech Stack:** Express server, Firestore REST API, React/Vite, Node test runner with `tsx`.

---

### Task 1: Match Candidate Core

**Files:**
- Modify: `server/revealApi.js`
- Test: `server/revealApi.test.js`

- [ ] Add failing tests for `buildRevealVehicleMatchCandidates` comparing Reveal vehicles against app equipment by Reveal ID, vehicle number, registration/tag, VIN, and name.
- [ ] Implement `buildRevealVehicleMatchCandidates(vehicles, equipment)` as a pure helper that returns `matched`, `needsReview`, and `newVehicle` confidence states.
- [ ] Run `node --test server/revealApi.test.js` and confirm the new tests pass.

### Task 2: Protected Match Preview Route

**Files:**
- Modify: `server/revealApi.js`
- Modify: `server.js`
- Test: `server/revealApi.test.js`
- Test: `src/aiStudioDeployment.test.ts`

- [ ] Add failing tests for `handleRevealVehicleMatchPreviewRequest` requiring owner admin auth and returning candidates without Firestore writes.
- [ ] Implement Firestore equipment listing using REST `documents/equipment` and map Firestore fields into plain objects.
- [ ] Add `POST /api/integrations/reveal/vehicles/matches/preview` to Cloud Run.
- [ ] Run targeted server/deployment tests and confirm they pass.

### Task 3: Equipment Page Review UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/EquipmentBoard.tsx`
- Test: `src/components/WorkOrdersUi.test.tsx`

- [ ] Add failing UI test proving owner admins can see a `Review Reveal Matches` action and candidate summary.
- [ ] Add app state and handler to call `/api/integrations/reveal/vehicles/matches/preview`.
- [ ] Render match candidate cards grouped by confidence with visible Reveal vehicle name, JDT match, match reason, and recommended action.
- [ ] Run targeted UI tests and confirm they pass.

### Task 4: Verification and Shipping

**Files:**
- All touched files

- [ ] Run `node --run test`.
- [ ] Run `node --run lint`.
- [ ] Run `node --run build`.
- [ ] Deploy Cloud Run service.
- [ ] Live-check app, Reveal health, and preview route unauthorized behavior.
- [ ] Commit and push the branch.
