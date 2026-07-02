import type { EquipmentRecord } from './records';
import { equipmentCategory, equipmentDisplayName, normalizeDelimitedList } from './equipmentFreight';

export const fieldMapsTreeRelocationStatusValues = [
  'Not Started',
  '25% Cut',
  '50% Cut',
  '75% Cut',
  '100% Cut',
  'Ready for Relocation',
  'Moved to Holding Area',
  'Relocated',
  'Removed',
  'Remaining in Place',
] as const;

export const fieldMapsBillingStatusValues = [
  'Not Invoiced',
  'Invoiced',
  'Paid',
  'Hold / Dispute',
  'Not Billable',
] as const;

export const fieldMapsLegacyRelocationStatusAliases: Record<string, typeof fieldMapsTreeRelocationStatusValues[number]> = {
  'Moved to Holding': 'Moved to Holding Area',
  'Moved To Holding': 'Moved to Holding Area',
  'Moved To Holding Area': 'Moved to Holding Area',
  Invoiced: 'Relocated',
  Paid: 'Relocated',
};

export const fieldMapsEquipmentAccessValues = ['Good', 'Blocked', 'Requires Review'] as const;

export const fieldMapsIssueAlertValues = [
  'None',
  'Stressed',
  'Damaged',
  'Dead',
  'Irrigation',
  'Blocked Access',
  'Needs Replanting',
  'Leaning',
  'Needs Jeremy Review',
] as const;

export const fieldMapsCrewVisibleTreeFields = [
  'Tree_Tag',
  'Tree_Type',
  'DBH_IN',
  'Tree_Relocation_Status',
  'Loaders_Needed',
  'Additional_Equipment_Required',
  'Equipment_Access',
  'Equipment_Access_Notes',
  'Crew_Notes',
  'Issue_Alert',
  'Attachments',
] as const;

export const fieldMapsCrewHiddenTreeFields = [
  'Project_ID',
  'Client_ID',
  'Tree_Asset_ID',
  'Existing_Latitude',
  'Existing_Longitude',
  'Destination_Latitude',
  'Destination_Longitude',
  'Source_Northing',
  'Source_Easting',
  'Source_CRS_WKID',
  'Source_CRS_Label',
  'Survey_Township_Range',
  'Existing_Source_Pin',
  'Destination_Pin',
  'Map_Geometry_Status',
  'Last_Map_Sync_At',
  'ArcGIS_Feature_ID',
  'ArcGIS_Layer_URL',
  'Last_Updated_Source',
  'Last_Updated_By',
  'Last_Updated_At',
  'Last_Sync_Direction',
  'Sync_Transaction_ID',
  'ArcGIS_Last_Sync_At',
  'JDT_Last_Sync_At',
  'App_Record_ID',
  'App_Updated_At',
  'Last_Sync_Batch_ID',
  'Schema_Version',
  'Estimated_Relocation_Cost',
  'Contract_Relocation_Cost',
  'Relocation_Cost',
  'Billing_Status',
  'Invoice_Status',
  'Import_Batch_ID',
  'Source_File',
  'Source_Sheet',
] as const;

export const fieldMapsRelocationCostFields = [
  'Estimated_Relocation_Cost',
  'Contract_Relocation_Cost',
  'Relocation_Cost',
] as const;

export const relocationCostVisibleEmails = [
  'jeremy@jdtnurseries.com',
  'jennifer@jdtnurseries.com',
  'regina@jdtnurseries.com',
] as const;

export const relocationCostVisibleRoles = [
  'owner',
  'admin',
  'administrator',
  'operations coordinator',
  'office admin',
  'project manager',
] as const;

export type FieldMapsUserAccess = {
  email?: string;
  role?: string;
  roles?: string[];
};

export type FieldMapsLoaderOption = {
  value: string;
  label: string;
  equipmentId: string;
  category: string;
  status: string;
};

export function canViewRelocationCost(user: FieldMapsUserAccess = {}): boolean {
  const email = normalize(user.email);
  if (email && relocationCostVisibleEmails.includes(email as typeof relocationCostVisibleEmails[number])) return true;
  const roles = [user.role, ...(user.roles || [])].map((role) => normalize(role)).filter(Boolean);
  return roles.some((role) => relocationCostVisibleRoles.includes(role as typeof relocationCostVisibleRoles[number]));
}

export function normalizeFieldMapsTreeRelocationStatus(status: unknown): typeof fieldMapsTreeRelocationStatusValues[number] {
  const text = clean(status);
  const direct = fieldMapsTreeRelocationStatusValues.find((value) => value.toLowerCase() === text.toLowerCase());
  if (direct) return direct;
  const alias = fieldMapsLegacyRelocationStatusAliases[text];
  if (alias) return alias;
  return 'Not Started';
}

export function fieldMapsRequiresPhoto(input: {
  relocationStatus?: unknown;
  issueAlert?: unknown;
  equipmentAccess?: unknown;
}): boolean {
  const status = normalizeFieldMapsTreeRelocationStatus(input.relocationStatus);
  const issue = clean(input.issueAlert);
  const access = clean(input.equipmentAccess);
  return Boolean(
    (issue && issue !== 'None')
    || ['Relocated', 'Moved to Holding Area', 'Removed'].includes(status)
    || ['Blocked', 'Requires Review'].includes(access),
  );
}

export function buildFieldMapsLoaderOptions(equipmentList: EquipmentRecord[] = []): FieldMapsLoaderOption[] {
  return equipmentList
    .filter(isActiveLoader)
    .map((equipment) => {
      const label = equipmentDisplayName(equipment);
      const equipmentId = clean(equipment.id || equipment.assetId || equipment.asset || label);
      return {
        value: equipmentId,
        label,
        equipmentId,
        category: equipmentCategory(equipment),
        status: clean(equipment.status) || 'Available',
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }));
}

function isActiveLoader(equipment: EquipmentRecord): boolean {
  const status = normalize(equipment.status || equipment.serviceStatus || equipment.availability);
  if (['retired', 'sold', 'inactive'].includes(status)) return false;
  const category = equipmentCategory(equipment);
  if (category !== 'Machine') return false;
  const signals = normalizeDelimitedList([
    equipment.eqType,
    equipment.type,
    equipment.name,
    equipment.asset,
    equipment.make,
    equipment.model,
  ].filter(Boolean).join(';'));
  return signals.some((signal) => /\bloader\b/i.test(signal) || /^front$/i.test(signal));
}

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function normalize(value: unknown): string {
  return clean(value).toLowerCase();
}
