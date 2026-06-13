# Reveal Match Approval Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let owner admins approve safe Verizon Reveal vehicle matches so JDT equipment records store stable Reveal IDs before GPS/status data updates operations.

**Architecture:** Keep match preview read-only. Add a separate owner-admin protected approval endpoint that receives selected Reveal-to-equipment pairings, verifies the Reveal vehicles against the live Vehicle API payload, then writes locked telematics identity fields to the selected Firestore equipment documents. The Equipment page exposes per-candidate approval and approve-all-safe actions, then refreshes the match review.

**Tech Stack:** Express, Firestore REST API, React/Vite, Node test runner with `tsx`.

---

### Task 1: Server Approval Helper

**Files:**
- Modify: `server/revealApi.js`
- Test: `server/revealApi.test.js`

- [ ] Add a failing test for `buildRevealMatchApprovalWrites` that turns selected approvals into Firestore equipment updates with `revealVehicleId`, `verizonVehicleId`, `telematicsProvider`, `revealMatchStatus`, `revealMatchApprovedAt`, and `revealMatchApprovedBy`.
- [ ] Implement `buildRevealMatchApprovalWrites`.
- [ ] Run `node --test server/revealApi.test.js` and confirm the new test passes.

### Task 2: Protected Approval Route

**Files:**
- Modify: `server/revealApi.js`
- Modify: `server.js`
- Modify: `src/aiStudioDeployment.test.ts`
- Test: `server/revealApi.test.js`

- [ ] Add a failing test for `handleRevealVehicleMatchApprovalRequest` requiring owner-admin auth and committing only selected matches.
- [ ] Implement `approveRevealVehicleMatchesInFirestore` and `handleRevealVehicleMatchApprovalRequest`.
- [ ] Add `POST /api/integrations/reveal/vehicles/matches/approve` to `server.js`.
- [ ] Update the deployment guard test to require the approval route.
- [ ] Run targeted tests and confirm they pass.

### Task 3: Equipment Page Approval UI

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/EquipmentBoard.tsx`
- Test: `src/components/WorkOrdersUi.test.tsx`

- [ ] Add a failing UI test for `Approve Match` and `Approve All Safe Matches`.
- [ ] Add app state and handler to call `/api/integrations/reveal/vehicles/matches/approve`.
- [ ] Add candidate-level approval buttons for matched/needs-review records with a JDT equipment ID.
- [ ] Add an approve-all-safe button for all non-new candidates with JDT equipment IDs.
- [ ] Run targeted UI tests and confirm they pass.

### Task 4: Verify, Deploy, Push

**Files:**
- All touched files

- [ ] Run `node --run test`.
- [ ] Run `node --run lint`.
- [ ] Run `node --run build`.
- [ ] Deploy Cloud Run service.
- [ ] Live-check app, health route, and unauthorized approval route.
- [ ] Commit and push the branch.
