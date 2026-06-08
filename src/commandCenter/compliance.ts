import type { CrewRecord, EquipmentRecord } from './records';
import { equipmentDisplayName, isFreightVehicle } from './equipmentFreight';

export type ComplianceStatusLabel = 'Missing' | 'On File' | 'Expiring Soon' | 'Expired' | 'Not Required';
export type ComplianceTone = 'good' | 'watch' | 'bad' | 'neutral';

export type ComplianceStatus = {
  label: ComplianceStatusLabel;
  tone: ComplianceTone;
  expirationDate?: string;
  daysUntilExpiration?: number;
};

export type ComplianceDocumentInput = {
  documentUrl?: string;
  expirationDate?: string;
  required?: boolean;
};

export type ComplianceReviewItem = {
  id: string;
  title: string;
  entityName: string;
  entityType: 'Crew' | 'Vehicle';
  documentType: 'Driver License' | 'Medical Card' | 'Vehicle Registration' | 'Insurance';
  status: Exclude<ComplianceStatusLabel, 'On File' | 'Not Required'>;
  severity: 'High' | 'Medium';
  expirationDate?: string;
  daysUntilExpiration?: number;
  recommendedAction: string;
  targetTab: 'crews' | 'freight';
  drawerType: 'employee' | 'equipment';
  recordId: string;
};

export type ComplianceReviewInput = {
  crew?: CrewRecord[];
  equipment?: EquipmentRecord[];
  todayIso?: string;
  limit?: number;
};

const expirationWindowDays = 30;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

function dateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function todayDate(todayIso?: string) {
  if (todayIso) return dateOnly(todayIso) || new Date(todayIso);
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function documentComplianceStatus(input: ComplianceDocumentInput, todayIso?: string): ComplianceStatus {
  const required = input.required !== false;
  if (!required) return { label: 'Not Required', tone: 'neutral' };

  const documentUrl = String(input.documentUrl || '').trim();
  const expirationDate = String(input.expirationDate || '').trim();
  if (!documentUrl || !expirationDate) return { label: 'Missing', tone: 'bad' };

  const expiration = dateOnly(expirationDate);
  if (!expiration) return { label: 'Missing', tone: 'bad' };

  const daysUntilExpiration = Math.floor((expiration.getTime() - todayDate(todayIso).getTime()) / millisecondsPerDay);
  if (daysUntilExpiration < 0) {
    return { label: 'Expired', tone: 'bad', expirationDate, daysUntilExpiration };
  }

  if (daysUntilExpiration <= expirationWindowDays) {
    return { label: 'Expiring Soon', tone: 'watch', expirationDate, daysUntilExpiration };
  }

  return { label: 'On File', tone: 'good', expirationDate, daysUntilExpiration };
}

function hasComplianceValue(...values: unknown[]) {
  return values.some((value) => String(value || '').trim().length > 0);
}

function hasDriverRole(driver: CrewRecord) {
  return String(driver.role || '').toLowerCase().includes('driver');
}

function needsDriverCompliance(driver: CrewRecord) {
  return hasDriverRole(driver)
    || Boolean(driver.drivesForCompany)
    || Boolean(driver.cdlCertified)
    || hasComplianceValue(
      driver.driverLicenseNumber,
      driver.driverLicenseExpirationDate,
      driver.driverLicenseDocumentUrl,
      driver.medicalCardExpirationDate,
      driver.medicalCardDocumentUrl,
    );
}

export function driverComplianceSummary(driver: CrewRecord, todayIso?: string) {
  const driverComplianceRequired = needsDriverCompliance(driver);
  const cdlCertified = Boolean(driver.cdlCertified);

  return {
    driverComplianceRequired,
    drivesForCompany: hasDriverRole(driver) || Boolean(driver.drivesForCompany),
    cdlCertified,
    license: documentComplianceStatus({
      documentUrl: driver.driverLicenseDocumentUrl,
      expirationDate: driver.driverLicenseExpirationDate,
      required: driverComplianceRequired,
    }, todayIso),
    medicalCard: documentComplianceStatus({
      documentUrl: driver.medicalCardDocumentUrl,
      expirationDate: driver.medicalCardExpirationDate,
      required: cdlCertified,
    }, todayIso),
  };
}

export function vehicleComplianceSummary(vehicle: EquipmentRecord, todayIso?: string) {
  return {
    registration: documentComplianceStatus({
      documentUrl: vehicle.registrationDocumentUrl,
      expirationDate: vehicle.registrationExpirationDate,
    }, todayIso),
    insurance: documentComplianceStatus({
      documentUrl: vehicle.insuranceDocumentUrl,
      expirationDate: vehicle.insuranceExpirationDate,
    }, todayIso),
  };
}

function isReviewableStatus(status: ComplianceStatus): status is ComplianceStatus & { label: ComplianceReviewItem['status'] } {
  return status.label === 'Missing' || status.label === 'Expired' || status.label === 'Expiring Soon';
}

function statusRank(status: ComplianceReviewItem['status']) {
  if (status === 'Expired') return 0;
  if (status === 'Missing') return 1;
  return 2;
}

function entityRank(entityType: ComplianceReviewItem['entityType']) {
  return entityType === 'Crew' ? 0 : 1;
}

function reviewItemFromStatus(input: {
  recordId: string;
  entityName: string;
  entityType: ComplianceReviewItem['entityType'];
  documentType: ComplianceReviewItem['documentType'];
  status: ComplianceStatus;
  targetTab: ComplianceReviewItem['targetTab'];
  drawerType: ComplianceReviewItem['drawerType'];
}): ComplianceReviewItem | null {
  if (!isReviewableStatus(input.status)) return null;
  const severity = input.status.label === 'Expiring Soon' ? 'Medium' : 'High';
  const assignmentType = input.entityType === 'Crew' ? 'driving' : 'vehicle';

  return {
    id: `${input.recordId}-${input.documentType.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    title: `${input.entityName} - ${input.documentType}`,
    entityName: input.entityName,
    entityType: input.entityType,
    documentType: input.documentType,
    status: input.status.label,
    severity,
    expirationDate: input.status.expirationDate,
    daysUntilExpiration: input.status.daysUntilExpiration,
    recommendedAction: `Update or upload the ${input.documentType} for ${input.entityName} before assigning ${assignmentType} work.`,
    targetTab: input.targetTab,
    drawerType: input.drawerType,
    recordId: input.recordId,
  };
}

export function buildComplianceReviewQueue(input: ComplianceReviewInput = {}): ComplianceReviewItem[] {
  const items: ComplianceReviewItem[] = [];

  (input.crew || []).forEach((member) => {
    const summary = driverComplianceSummary(member, input.todayIso);
    const recordId = member.id || member.name || 'crew-record';
    const entityName = member.name || member.title || recordId;
    [
      reviewItemFromStatus({
        recordId,
        entityName,
        entityType: 'Crew',
        documentType: 'Driver License',
        status: summary.license,
        targetTab: 'crews',
        drawerType: 'employee',
      }),
      reviewItemFromStatus({
        recordId,
        entityName,
        entityType: 'Crew',
        documentType: 'Medical Card',
        status: summary.medicalCard,
        targetTab: 'crews',
        drawerType: 'employee',
      }),
    ].filter(Boolean).forEach((item) => items.push(item as ComplianceReviewItem));
  });

  (input.equipment || []).filter(isFreightVehicle).forEach((vehicle) => {
    const summary = vehicleComplianceSummary(vehicle, input.todayIso);
    const recordId = vehicle.id || vehicle.assetId || equipmentDisplayName(vehicle);
    const entityName = equipmentDisplayName(vehicle);
    [
      reviewItemFromStatus({
        recordId,
        entityName,
        entityType: 'Vehicle',
        documentType: 'Vehicle Registration',
        status: summary.registration,
        targetTab: 'freight',
        drawerType: 'equipment',
      }),
      reviewItemFromStatus({
        recordId,
        entityName,
        entityType: 'Vehicle',
        documentType: 'Insurance',
        status: summary.insurance,
        targetTab: 'freight',
        drawerType: 'equipment',
      }),
    ].filter(Boolean).forEach((item) => items.push(item as ComplianceReviewItem));
  });

  return items
    .sort((a, b) => (
      statusRank(a.status) - statusRank(b.status)
      || entityRank(a.entityType) - entityRank(b.entityType)
      || a.title.localeCompare(b.title)
    ))
    .slice(0, input.limit || 8);
}

export function complianceBadgeClass(status: ComplianceStatus) {
  switch (status.tone) {
    case 'good':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    case 'watch':
      return 'bg-amber-50 text-amber-900 border-amber-200';
    case 'bad':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-jdt-sand text-zinc-700 border-jdt-border';
  }
}
