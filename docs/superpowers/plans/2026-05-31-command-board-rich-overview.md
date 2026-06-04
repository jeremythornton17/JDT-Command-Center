# Command Board Rich Overview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the richer Option B Command Board overview while preserving the current Firestore-backed production data path.

**Architecture:** Add one pure dashboard summary helper under `src/commandCenter` so counts and featured cards are derived from real app records. Wire that helper into `src/App.tsx` and replace the lean Command Board body with pipeline and four operating division cards, leaving current CRUD, import, audit, permissions, and deployment code intact.

**Tech Stack:** React, TypeScript, Vite, Firebase Firestore sync state, Node test runner with `tsx`.

---

### Task 1: Dashboard Summary Helper

**Files:**
- Create: `src/commandCenter/dashboard.ts`
- Create: `src/commandCenter/dashboard.test.ts`
- Modify: `package.json`

- [ ] Write tests for pipeline stage counts from jobs, clients, and schedule tasks.
- [ ] Write tests for featured operation card selection for relocation, freight, nursery, and equipment.
- [ ] Run the dashboard helper test and verify it fails because the helper does not exist.
- [ ] Implement the helper with real-data-only derived counts.
- [ ] Run the dashboard helper test and verify it passes.

### Task 2: Command Board UI Restore

**Files:**
- Modify: `src/App.tsx`

- [ ] Import `buildDashboardSummary`.
- [ ] Build `dashboardSummary` with `useMemo` from jobs, loads, nursery inventory, equipment, clients, schedule tasks, and relocation records.
- [ ] Pass `dashboardSummary` into `Dashboard`.
- [ ] Replace the lean Dashboard layout with Today’s Command Board header, Quote-to-Job Sales Pipeline, four operating division cards, and the existing recent-records/quick-actions section.
- [ ] Ensure empty states show “no active” messages instead of mock operational records.

### Task 3: Verification

**Files:**
- None

- [ ] Run all Node tests.
- [ ] Run TypeScript with `tsc --noEmit`.
- [ ] Run the Vite production build.
- [ ] Browser-check the local app and confirm the restored board contains “Quote-to-Job Sales Pipeline,” “Relocation / Install,” “Freight Dispatch,” “Nursery Production,” and “Maintenance / Equip.”
