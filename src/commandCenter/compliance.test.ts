import test from 'node:test';
import assert from 'node:assert/strict';
import { buildComplianceReviewQueue, documentComplianceStatus, driverComplianceSummary, vehicleComplianceSummary } from './compliance';

const today = '2026-06-03';

test('documentComplianceStatus classifies missing, expired, expiring, and on-file documents', () => {
  assert.equal(documentComplianceStatus({}, today).label, 'Missing');
  assert.equal(documentComplianceStatus({ documentUrl: 'https://drive/license.pdf', expirationDate: '2026-05-31' }, today).label, 'Expired');
  assert.equal(documentComplianceStatus({ documentUrl: 'https://drive/license.pdf', expirationDate: '2026-06-20' }, today).label, 'Expiring Soon');
  assert.equal(documentComplianceStatus({ documentUrl: 'https://drive/license.pdf', expirationDate: '2026-08-15' }, today).label, 'On File');
});

test('driverComplianceSummary only requires medical cards for CDL drivers', () => {
  const nonCdl = driverComplianceSummary({ id: 'crew-1', name: 'Driver One', role: 'Driver' }, today);
  assert.equal(nonCdl.driverComplianceRequired, true);
  assert.equal(nonCdl.license.label, 'Missing');
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

test('driverComplianceSummary treats driving eligibility as separate from personnel role', () => {
  const crewLeader = driverComplianceSummary({ id: 'crew-3', name: 'Crew Lead', role: 'Crew Leader' }, today);
  assert.equal(crewLeader.driverComplianceRequired, false);
  assert.equal(crewLeader.license.label, 'Not Required');

  const insuredCrewLeader = driverComplianceSummary({
    id: 'crew-4',
    name: 'Insured Crew Lead',
    role: 'Crew Leader',
    drivesForCompany: true,
  }, today);
  assert.equal(insuredCrewLeader.driverComplianceRequired, true);
  assert.equal(insuredCrewLeader.license.label, 'Missing');

  const cdlCrewLeader = driverComplianceSummary({
    id: 'crew-5',
    name: 'CDL Crew Lead',
    role: 'Crew Leader',
    drivesForCompany: true,
    cdlCertified: true,
  }, today);
  assert.equal(cdlCrewLeader.driverComplianceRequired, true);
  assert.equal(cdlCrewLeader.license.label, 'Missing');
  assert.equal(cdlCrewLeader.medicalCard.label, 'Missing');
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

test('buildComplianceReviewQueue ranks driver and vehicle documents that need office review', () => {
  const queue = buildComplianceReviewQueue({
    crew: [
      { id: 'crew-christian', name: 'Christian Crespo', role: 'Driver' },
      {
        id: 'crew-carlos',
        name: 'Carlos Reyes',
        role: 'Crew Leader',
        drivesForCompany: true,
        cdlCertified: true,
        driverLicenseDocumentUrl: 'https://drive/license.pdf',
        driverLicenseExpirationDate: '2026-08-15',
        medicalCardDocumentUrl: 'https://drive/medical.pdf',
        medicalCardExpirationDate: '2026-05-31',
      },
      { id: 'crew-regina', name: 'Regina Kane', role: 'Office Admin' },
    ],
    equipment: [
      {
        id: 'truck-semi-1',
        name: 'Semi #1',
        category: 'Truck',
        registrationDocumentUrl: 'https://drive/registration.pdf',
        registrationExpirationDate: '2026-06-20',
        insuranceDocumentUrl: 'https://drive/insurance.pdf',
        insuranceExpirationDate: '2026-08-15',
      },
      {
        id: 'trailer-lowboy',
        name: 'Black Lowboy',
        category: 'Trailer',
        registrationDocumentUrl: 'https://drive/registration.pdf',
        registrationExpirationDate: '2026-08-15',
        insuranceDocumentUrl: 'https://drive/insurance.pdf',
        insuranceExpirationDate: '2026-05-15',
      },
      { id: 'loader-komatsu', name: 'Komatsu 500 - 1', type: 'Loader' },
    ],
    todayIso: today,
  });

  assert.deepEqual(queue.map((item) => [item.recordId, item.documentType, item.status, item.severity, item.drawerType]), [
    ['crew-carlos', 'Medical Card', 'Expired', 'High', 'employee'],
    ['trailer-lowboy', 'Insurance', 'Expired', 'High', 'equipment'],
    ['crew-christian', 'Driver License', 'Missing', 'High', 'employee'],
    ['truck-semi-1', 'Vehicle Registration', 'Expiring Soon', 'Medium', 'equipment'],
  ]);
  assert.equal(queue[0].recommendedAction, 'Update or upload the Medical Card for Carlos Reyes before assigning driving work.');
  assert.equal(queue[1].targetTab, 'freight');
});
