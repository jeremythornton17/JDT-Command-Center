# Command Spine Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen the JDT Command Center operating spine so Client, Project, Job, Work Order, Assignment, Field Update, Report, and Dashboard records work together.

**Architecture:** Add focused command-center intelligence helpers for relationship audits, risk scoring, daily command briefs, KPI reports, and seed cleanup. Surface those helpers through the existing Dashboard, Reports, Settings, and project drawer components without creating a separate app workflow.

**Tech Stack:** React, TypeScript, Firebase/Firestore, existing Node test runner, existing JDT commandCenter helper modules.

---

### Task 1: Operating Intelligence Helpers

**Files:**
- Create: `src/commandCenter/operatingIntelligence.ts`
- Test: `src/commandCenter/operatingIntelligence.test.ts`

- [ ] Write tests for relationship issue detection, project risk scoring, daily command brief generation, KPI summaries, and seed-batch filtering.
- [ ] Implement the helper functions with pure data transforms.
- [ ] Run `node --test --import tsx src/commandCenter/operatingIntelligence.test.ts`.

### Task 2: Dashboard Command Brief

**Files:**
- Modify: `src/commandCenter/dashboard.ts`
- Modify: `src/App.tsx`
- Test: `src/commandCenter/dashboard.test.ts`

- [ ] Extend `DashboardSummary` with `dailyBrief` and `projectRisks`.
- [ ] Render a compact Daily Command Brief and At Risk Projects panel on the Command Board.
- [ ] Keep current dashboard behavior intact.

### Task 3: Reports KPIs

**Files:**
- Modify: `src/components/ReportsBoard.tsx`
- Test: `src/components/ReportsBoard.test.tsx`

- [ ] Replace simple-only counts with operational KPI sections.
- [ ] Show project health, crew field updates, freight readiness, equipment downtime, tree lifecycle, and data quality.

### Task 4: Seed Cleanup

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/SettingsBoard.tsx`
- Test: `src/components/SettingsBoard.test.tsx`

- [ ] Add owner-only cleanup for records with a matching `seedBatchId` or `isSeedData`.
- [ ] Keep existing full reset buttons unchanged.
- [ ] Make cleanup update synced state so Firestore deletes are handled through existing sync.

### Task 5: Live Data Repair

**Files:**
- Firestore named database: `ai-studio-aaf65ee2-61ca-4360-af29-1c862096338e`

- [ ] Update the existing Boca West live job to use client document `cli-2275`.
- [ ] Create or update the live Boca West project profile so the client/job/project chain has a real non-seed project.
- [ ] Verify by reading Firestore back.

### Task 6: Verification

- [ ] Run focused tests.
- [ ] Run the full 132-test suite.
- [ ] Run TypeScript and production build.
- [ ] Check `https://app.jdtcommandcenter.com/` returns the app shell.
