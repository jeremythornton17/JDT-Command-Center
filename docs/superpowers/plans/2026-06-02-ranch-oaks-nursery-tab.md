# Ranch Oaks Nursery Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Ranch Oaks subtab to the Nursery board while keeping Command Center as the only source of truth.

**Architecture:** The Nursery board will receive `inventoryItems` and `ranchOaks` separately, with a fallback for existing combined callers. Shared display helpers will identify Ranch Oaks records and summarize location/status/type counts without creating a new Firestore collection.

**Tech Stack:** React, TypeScript, Node test runner, Vite, existing Firestore sync state.

---

### Task 1: Add Failing UI Tests

**Files:**
- Modify: `src/components/NurseryBoard.test.tsx`

- [ ] **Step 1: Write tests** for `All Nursery Inventory` and `Ranch Oaks` subtabs, Ranch Oaks-only filtering, status counts, farm/location filters, type fields, and Ranch Oaks actions.
- [ ] **Step 2: Run focused tests** with `node --test --import tsx src/components/NurseryBoard.test.tsx` and confirm they fail because the tab split does not exist yet.

### Task 2: Add Ranch Oaks Display Helpers

**Files:**
- Modify: `src/commandCenter/nurseryDisplay.ts`

- [ ] **Step 1: Add helpers** to detect Ranch Oaks records by collection/source/type fields and to summarize Ranch Oak type/status/location data.
- [ ] **Step 2: Keep existing generic inventory display behavior unchanged for ordinary nursery stock.**

### Task 3: Refactor Nursery Board

**Files:**
- Modify: `src/components/NurseryBoard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Pass `inventoryItems` and `ranchOaks` separately from `App.tsx`.**
- [ ] **Step 2: Add page subtabs: `All Nursery Inventory` and `Ranch Oaks`.**
- [ ] **Step 3: Keep generic inventory cards/table for all stock.**
- [ ] **Step 4: Add a dedicated Ranch Oaks view with status summary, farm/location filter, type filter, search, card/table mode, and Edit/Assign/QR/Map actions.**

### Task 4: Verify And Deploy

**Files:**
- No code files unless verification exposes an issue.

- [ ] **Step 1: Run focused tests.**
- [ ] **Step 2: Run the full test suite and `tsc --noEmit`.**
- [ ] **Step 3: Run the production Vite build.**
- [ ] **Step 4: Deploy to Cloud Run and verify the live bundle contains the Ranch Oaks tab markers.**
