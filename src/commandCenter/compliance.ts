import type { CrewRecord, EquipmentRecord } from './records';

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
