# Driver and Vehicle Compliance Documents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add editable driver license, CDL medical card, vehicle registration, and vehicle insurance tracking to JDT Command Center.

**Architecture:** Store the new compliance fields directly on existing personnel and equipment records, then compute simple document status through one reusable helper. Surface those statuses on Crew, Equipment, and Freight cards so office/admin users can immediately see what is missing, expired, expiring soon, or on file.

**Tech Stack:** React, TypeScript, Vite, Node test runner, Firestore-backed optional record fields.

---

### Task 1: Compliance Helper Tests

**Files:**
- Create: `src/commandCenter/compliance.test.ts`
- Create: `src/commandCenter/compliance.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import { documentComplianceStatus, driverComplianceSummary, vehicleComplianceSummary } from './compliance';

const today = '2026-06-03';

test('documentComplianceStatus classifies missing, expired, expiring, and on-file documents', () => {
  assert.equal(documentComplianceStatus({}, today).label, 'Missing');
  assert.equal(documentComplianceStatus({ documentUrl: 'https://drive/license.pdf', expirationDate: '2026-05-31' }, today).label, 'Expired');
  assert.equal(documentComplianceStatus({ documentUrl: 'https://drive/license.pdf', expirationDate: '2026-06-20' }, today).label, 'Expiring Soon');
  assert.equal(documentComplianceStatus({ documentUrl: 'https://drive/license.pdf', expirationDate: '2026-08-15' }, today).label, 'On File');
});

test('driverComplianceSummary only requires medical cards for CDL drivers', () => {
  const nonCdl = driverComplianceSummary({ id: 'crew-1', name: 'Driver One', role: 'Driver' }, today);
  assert.equal(nonCdl.medicalCard.label, 'Not Required');

  const cdl = driverComplianceSummary({
    id: 'crew-2',
    name: 'Driver Two',
    role: 'Driver',
    cdlCertified: true,
    driverLicenseDocumentUrl: 'https://drive/license.pdf',
    driverLicenseExpirationDate: '2026-08-15',
  }, today);
  assert.equal(cdl.license.label, 'On File');
  assert.equal(cdl.medicalCard.label, 'Missing');
});

test('vehicleComplianceSummary classifies registration and insurance independently', () => {
  const summary = vehicleComplianceSummary({
    id: 'truck-1',
    name: 'Semi #1',
    category: 'Truck',
    registrationDocumentUrl: 'https://drive/registration.pdf',
    registrationExpirationDate: '2026-08-15',
    insuranceDocumentUrl: 'https://drive/insurance.pdf',
    insuranceExpirationDate: '2026-05-15',
  }, today);

  assert.equal(summary.registration.label, 'On File');
  assert.equal(summary.insurance.label, 'Expired');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/commandCenter/compliance.test.ts`

Expected: FAIL because `src/commandCenter/compliance.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/commandCenter/compliance.ts` with `documentComplianceStatus`, `driverComplianceSummary`, and `vehicleComplianceSummary`. Treat missing URL or missing expiration date as `Missing`, dates before today as `Expired`, dates within 30 days as `Expiring Soon`, future dates beyond 30 days as `On File`, and non-CDL medical cards as `Not Required`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --import tsx src/commandCenter/compliance.test.ts`

Expected: PASS.

### Task 2: Record and Form Tests

**Files:**
- Modify: `src/commandCenter/records.ts`
- Modify: `src/components/EntityForms.tsx`
- Modify: `src/components/EntityForms.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add tests asserting that the employee form renders `Driver Compliance`, `CDL Certified`, `Driver License Number`, `Driver License Expiration`, `Driver License Document URL`, `Medical Card Expiration`, and `Medical Card Document URL` when CDL is checked. Add a second test asserting that the equipment form renders `Vehicle Compliance`, `Registration Number / Tag`, `Registration Expiration`, `Registration Document URL`, `Insurance Company`, `Insurance Policy Number`, `Insurance Expiration`, and `Insurance Document URL`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/components/EntityForms.test.tsx`

Expected: FAIL because the form labels are missing.

- [ ] **Step 3: Write minimal implementation**

Extend `CrewRecord` and `EquipmentRecord` with optional compliance fields from the approved design. Add the corresponding field configs to the employee and equipment forms. Gate medical card fields with `showWhen: formData => Boolean(formData.cdlCertified)`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --import tsx src/components/EntityForms.test.tsx`

Expected: PASS.

### Task 3: Card Display Tests

**Files:**
- Modify: `src/components/CrewsBoard.tsx`
- Modify: `src/components/EquipmentBoard.tsx`
- Modify: `src/components/FreightBoard.tsx`
- Modify: `src/components/WorkOrdersUi.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add UI tests that render:

```ts
{
  id: 'personnel-christian-crespo',
  name: 'Christian Crespo',
  role: 'Driver',
  cdlCertified: true,
  driverLicenseDocumentUrl: 'https://drive/license.pdf',
  driverLicenseExpirationDate: '2026-06-20',
  medicalCardDocumentUrl: 'https://drive/medical.pdf',
  medicalCardExpirationDate: '2026-05-01',
}
```

and assert that Crew cards show `Driver Compliance`, `License`, `Expiring Soon`, `CDL`, `Medical Card`, and `Expired`.

Add equipment/freight card tests using a `Truck` with registration and insurance fields, then assert that cards show `Vehicle Compliance`, `Registration`, `Insurance`, and the computed statuses.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test --import tsx src/components/WorkOrdersUi.test.tsx`

Expected: FAIL because the card panels do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Import the compliance helper into Crew, Equipment, and Freight boards. Render a compact `Driver Compliance` panel for driver personnel records and a compact `Vehicle Compliance` panel for trucks, trailers, and records that already have registration or insurance fields.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test --import tsx src/components/WorkOrdersUi.test.tsx`

Expected: PASS.

### Task 4: Verification and Deployment

**Files:**
- Modify: `package.json` only if the new compliance test file is not already included in the test script.

- [ ] **Step 1: Run TypeScript**

Run: `node ../../node_modules/typescript/bin/tsc --noEmit`

Expected: PASS.

- [ ] **Step 2: Run full tests**

Run: `node --test --import tsx ...` through the existing `npm test` equivalent.

Expected: PASS.

- [ ] **Step 3: Build**

Run: `node ../../node_modules/vite/bin/vite.js build`

Expected: PASS with `dist` generated.

- [ ] **Step 4: Deploy**

Use existing Google Cloud cached credentials to build and deploy the Cloud Run service `jd-thornton-nurseries-command-center` in `us-west1`.

- [ ] **Step 5: Verify production domain**

Request `https://app.jdtcommandcenter.com/` and confirm HTTP 200. Fetch the production bundle and verify the strings `Driver Compliance`, `Vehicle Compliance`, `Driver License Document URL`, and `Insurance Document URL` are present.
