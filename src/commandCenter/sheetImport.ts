import type {
  ClientRecord,
  CommandRecord,
  EquipmentRecord,
  InventoryItemRecord,
  LocationRecord,
  ProjectMaterialItemRecord,
  ScheduleTaskRecord,
  SpeciesRecord,
  StaffRecord,
  TreeRelocationRecord,
  WorkOrderRecord,
  DocumentRecord,
} from './records';
import { normalizeDelimitedList, withHomeBaseEquipmentDefaults } from './equipmentFreight';
import { clientIdFromName, jobIdFromName, projectIdFromName } from './relationships';
import { sourceRefFromWorkbookRow } from './workbookProjectFlow';

export type SheetImportTemplateId =
  | 'inventory'
  | 'clients'
  | 'equipment'
  | 'locations'
  | 'staff'
  | 'species'
  | 'schedule'
  | 'relocation'
  | 'jdt_project_flow_tree_assets'
  | 'jdt_project_flow_tree_pruning'
  | 'jdt_project_flow_treatment_aftercare'
  | 'jdt_project_flow_tree_photos'
  | 'jdt_project_flow_project_material_items';

export type SheetImportTemplate = {
  id: SheetImportTemplateId;
  label: string;
  sourceSheet: string;
  targetCollections: string[];
  requiredHeaders: string[];
  pasteHeaders?: string[];
  previewFields?: Array<{ label: string; key: string }>;
};

export type ImportTarget = {
  collectionName: string;
  label: string;
  records: CommandRecord[];
  warnings: string[];
};

export type ImportPreview = {
  templateId: SheetImportTemplateId;
  label: string;
  sourceSheet: string;
  targets: ImportTarget[];
  warnings: string[];
  projectContext?: ProjectImportContext;
};

export type ProjectImportContext = {
  clientId?: string;
  clientName?: string;
  projectId?: string;
  projectsId?: string;
  projectName?: string;
  jobId?: string;
  jobName?: string;
};

export type BuildImportPreviewOptions = {
  projectContext?: ProjectImportContext | null;
};

type RowObject = Record<string, string>;

export const sheetImportTemplates: SheetImportTemplate[] = [
  {
    id: 'inventory',
    label: 'JDT Inventory',
    sourceSheet: 'JDT Inventory Master List',
    targetCollections: ['inventoryItems'],
    requiredHeaders: ['Farm ID', 'Zone', 'Species'],
    pasteHeaders: ['Farm ID', 'Zone', 'Species', 'Quantity', 'Height', 'Spread', 'Rootball Size', 'Price'],
    previewFields: [
      { label: 'Farm', key: 'farm' },
      { label: 'Zone', key: 'zone' },
      { label: 'Qty', key: 'quantity' },
      { label: 'Height', key: 'height' },
    ],
  },
  {
    id: 'clients',
    label: 'Clients',
    sourceSheet: 'Client Master List',
    targetCollections: ['clients'],
    requiredHeaders: ['Client Company', 'Contact Name', 'Phone'],
  },
  {
    id: 'equipment',
    label: 'Equipment',
    sourceSheet: 'JDT Equipment Master List',
    targetCollections: ['equipment'],
    requiredHeaders: ['JDT Equipment Master List', 'Make', 'Model'],
    pasteHeaders: ['Equipment ID', 'JDT Equipment Master List', 'Make', 'Model', 'Truck Type', 'Trailer Type', 'Implement Type', 'Current Location', 'Location Type', 'Assigned To', 'Compatible Implements', 'Last Service Date', 'Service Interval (Days)', 'Next Service Due', 'Service Status'],
  },
  {
    id: 'locations',
    label: 'Locations',
    sourceSheet: 'Location Names and Addresses Master List',
    targetCollections: ['locations'],
    requiredHeaders: ['Location ID', 'Location Name', 'Main Address'],
  },
  {
    id: 'staff',
    label: 'Staff',
    sourceSheet: 'Staff Master List',
    targetCollections: ['staff'],
    requiredHeaders: ['Staff Name', 'Role', 'Phone'],
  },
  {
    id: 'species',
    label: 'Species',
    sourceSheet: 'Tree Species Master List',
    targetCollections: ['species'],
    requiredHeaders: ['Species List'],
  },
  {
    id: 'schedule',
    label: 'Schedule Tasks',
    sourceSheet: 'JDT Schedule tabs',
    targetCollections: ['scheduleTasks'],
    requiredHeaders: ['Job/Schedule ID', 'Status', 'Assignee', 'Task'],
  },
  {
    id: 'relocation',
    label: 'Relocation Trees',
    sourceSheet: 'Relocation Details Master List',
    targetCollections: ['treeRelocationRecords'],
    requiredHeaders: ['JOB ID', 'TAG', 'TYPE'],
  },
  {
    id: 'jdt_project_flow_tree_assets',
    label: 'JDT Project Flow - Tree Assets',
    sourceSheet: 'Tree Assets',
    targetCollections: ['treeRelocationRecords'],
    requiredHeaders: ['Tree_Assets_ID', 'Projects_ID', 'Tree Type'],
    pasteHeaders: ['Tree_Assets_ID', 'Projects_ID', 'Tree Type', 'DBH (IN)', 'Difficulty ', 'Condition', 'Existing Location Description', 'Proposed Final Location Description', 'Current Status', 'Relocation Required', 'Relocation Cost', 'Relocation Status', 'Installation Required', 'Preservation Required', 'Removal Required', 'Priority'],
    previewFields: [
      { label: 'Project', key: 'projectId' },
      { label: 'Tree', key: 'type' },
      { label: 'Status', key: 'status' },
      { label: 'DBH', key: 'dbh' },
    ],
  },
  {
    id: 'jdt_project_flow_tree_pruning',
    label: 'JDT Project Flow - Tree Pruning',
    sourceSheet: 'Tree Pruning',
    targetCollections: ['workOrders'],
    requiredHeaders: ['Tree Assets_ID', 'Tree_Prune_ID'],
    pasteHeaders: ['Tree Assets_ID', 'Tree_Prune_ID', 'Root Prune Cuts', 'Date of 1st Cut', 'Date of 2nd Cut', 'Date of 3rd Cut', 'Prep Checks', 'Readiness Reviews', 'Notes'],
    previewFields: [
      { label: 'Tree', key: 'treeNames' },
      { label: 'Status', key: 'status' },
      { label: 'Scheduled', key: 'scheduledDate' },
    ],
  },
  {
    id: 'jdt_project_flow_treatment_aftercare',
    label: 'JDT Project Flow - Treatment or Aftercare',
    sourceSheet: 'Treatment or Aftercare',
    targetCollections: ['workOrders'],
    requiredHeaders: ['Treatment_Aftercare Logs_ID', 'Tree Assets_ID'],
    pasteHeaders: ['Treatment_Aftercare Logs_ID', 'Tree Assets_ID', 'Treatments', 'Treatments Type', 'Date Of Last Treatment', 'Treatment Action', 'Completed By', 'Condition Observed', 'Watering Status', 'Irrigation Status', 'Stress Level', 'Follow-up Needed', 'Next Follow-up Date', 'Notes'],
    previewFields: [
      { label: 'Tree', key: 'treeNames' },
      { label: 'Action', key: 'taskType' },
      { label: 'Follow-up', key: 'scheduledDate' },
    ],
  },
  {
    id: 'jdt_project_flow_tree_photos',
    label: 'JDT Project Flow - Tree Photos',
    sourceSheet: 'Tree Photos',
    targetCollections: ['documents'],
    requiredHeaders: ['Tree_Photos_ID', 'Tree Assets_ID'],
    pasteHeaders: ['Tree_Photos_ID', 'Tree Assets_ID', 'Photo', 'Captured By', 'Captured Date', 'Photo Location', 'Notes'],
    previewFields: [
      { label: 'Tree', key: 'treeId' },
      { label: 'Type', key: 'photoType' },
      { label: 'Date', key: 'photoDate' },
    ],
  },
  {
    id: 'jdt_project_flow_project_material_items',
    label: 'JDT Project Flow - Project Material Items',
    sourceSheet: 'Project_Material_Items',
    targetCollections: ['projectMaterialItems'],
    requiredHeaders: ['Project_Material_Items_ID', 'Projects_ID', 'Material Type'],
    pasteHeaders: ['Project_Material_Items_ID', 'Projects_ID', 'Project Name', 'Hole Number / Area', 'Source', 'Material Type', 'Size / Class', 'Quantity Required', 'Quantity Installed', 'Unit Price', 'Install Status', 'Notes'],
    previewFields: [
      { label: 'Project', key: 'projectName' },
      { label: 'Area', key: 'holeNumberOrArea' },
      { label: 'Material', key: 'materialType' },
      { label: 'Qty', key: 'quantityRequired' },
    ],
  },
];

export function parseDelimitedRows(text: string): string[][] {
  const delimiter = text.includes('\t') ? '\t' : ',';
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (quoted && next === '"') {
        current += '"';
        index += 1;
      } else if (quoted && isDelimitedQuoteClose(next, delimiter)) {
        quoted = false;
      } else if (!quoted && current.length === 0 && hasDelimitedQuoteClose(text, index + 1, delimiter)) {
        quoted = true;
      } else {
        current += char;
      }
      continue;
    }

    if (!quoted && char === delimiter) {
      row.push(cleanText(current));
      current = '';
      continue;
    }

    if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cleanText(current));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      current = '';
      continue;
    }

    current += char;
  }

  row.push(cleanText(current));
  if (row.some(Boolean)) rows.push(row);

  return rows;
}

function isDelimitedQuoteClose(next: string | undefined, delimiter: string): boolean {
  return next === undefined || next === delimiter || next === '\n' || next === '\r';
}

function hasDelimitedQuoteClose(text: string, startIndex: number, delimiter: string): boolean {
  for (let index = startIndex; index < text.length; index += 1) {
    if (text[index] !== '"') continue;
    if (text[index + 1] === '"') {
      index += 1;
      continue;
    }
    return isDelimitedQuoteClose(text[index + 1], delimiter);
  }
  return false;
}

export function buildImportPreview(templateId: SheetImportTemplateId, input: string | string[][], options: BuildImportPreviewOptions = {}): ImportPreview {
  const template = findTemplate(templateId);
  const rows = typeof input === 'string' ? parseDelimitedRows(input) : input;
  const projectContext = isProjectWorkbookTemplateId(templateId) ? normalizeProjectImportContext(options.projectContext) : undefined;
  const mapped = mapTemplate(template, rows, { projectContext });
  const contextualTarget = projectContext ? applyProjectContextToTarget(mapped, projectContext) : mapped;

  return {
    templateId,
    label: template.label,
    sourceSheet: template.sourceSheet,
    targets: [contextualTarget],
    warnings: contextualTarget.warnings,
    ...(projectContext ? { projectContext } : {}),
  };
}

export function previewSummary(preview: ImportPreview): string {
  const recordCount = preview.targets.reduce((sum, target) => sum + target.records.length, 0);
  const warningCount = new Set([
    ...preview.warnings,
    ...preview.targets.flatMap((target) => target.warnings),
  ]).size;
  const label = preview.targets[0]?.label || preview.label;
  return `${recordCount} ${label} record${recordCount === 1 ? '' : 's'} ready, ${warningCount} warning${warningCount === 1 ? '' : 's'}`;
}

export function pasteHeadersForTemplate(template: SheetImportTemplate): string[] {
  return template.pasteHeaders || template.requiredHeaders;
}

export function previewDetailsForRecord(template: SheetImportTemplate, record: CommandRecord): Array<{ label: string; value: string }> {
  return (template.previewFields || [])
    .map(({ label, key }) => ({ label, value: displayFieldValue(record[key]) }))
    .filter((field) => field.value.length > 0);
}

export function normalizeProjectImportContext(context?: ProjectImportContext | null): ProjectImportContext | undefined {
  if (!context) return undefined;
  const projectId = cleanText(context.projectId || context.projectsId || '');
  const normalized: ProjectImportContext = {
    clientId: cleanText(context.clientId || ''),
    clientName: cleanText(context.clientName || ''),
    projectId,
    projectsId: cleanText(context.projectsId || projectId),
    projectName: cleanText(context.projectName || ''),
    jobId: cleanText(context.jobId || ''),
    jobName: cleanText(context.jobName || ''),
  };
  const compact = Object.fromEntries(Object.entries(normalized).filter(([, value]) => Boolean(value))) as ProjectImportContext;
  return Object.keys(compact).length ? compact : undefined;
}

function applyProjectContextToTarget(target: ImportTarget, context: ProjectImportContext): ImportTarget {
  return {
    ...target,
    records: target.records.map((record) => applyProjectContextToRecord(record, context)),
  };
}

function applyProjectContextToRecord(record: CommandRecord, context: ProjectImportContext): CommandRecord {
  const projectId = context.projectId || context.projectsId || record.projectId;
  return {
    ...record,
    clientId: context.clientId || record.clientId,
    clientName: context.clientName || record.clientName,
    projectId,
    projectsId: context.projectsId || projectId || record.projectsId,
    projectName: context.projectName || record.projectName,
    jobId: context.jobId || record.jobId,
    jobName: context.jobName || record.jobName,
  };
}

export function isProjectWorkbookTemplateId(templateId: SheetImportTemplateId): boolean {
  return templateId.startsWith('jdt_project_flow_');
}

function mapTemplate(template: SheetImportTemplate, rows: string[][], options: BuildImportPreviewOptions = {}): ImportTarget {
  switch (template.id) {
    case 'inventory':
      return mapInventory(template, rows);
    case 'clients':
      return mapClients(template, rows);
    case 'equipment':
      return mapEquipment(template, rows);
    case 'locations':
      return mapLocations(template, rows);
    case 'staff':
      return mapStaff(template, rows);
    case 'species':
      return mapSpecies(template, rows);
    case 'schedule':
      return mapSchedule(template, rows);
    case 'relocation':
      return mapRelocation(template, rows);
    case 'jdt_project_flow_tree_assets':
      return mapJdtProjectFlowTreeAssets(template, rows, options.projectContext);
    case 'jdt_project_flow_tree_pruning':
      return mapJdtProjectFlowTreePruning(template, rows);
    case 'jdt_project_flow_treatment_aftercare':
      return mapJdtProjectFlowTreatmentAftercare(template, rows);
    case 'jdt_project_flow_tree_photos':
      return mapJdtProjectFlowTreePhotos(template, rows);
    case 'jdt_project_flow_project_material_items':
      return mapJdtProjectFlowProjectMaterialItems(template, rows, options.projectContext);
    default:
      return makeTarget(template, [], [`Unsupported import template: ${template.id}`]);
  }
}

function mapInventory(template: SheetImportTemplate, rows: string[][]): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const inventory = records
    .map(({ row, index }) => {
      const farm = value(row, 'Farm ID');
      const zone = value(row, 'Zone');
      const species = value(row, 'Species');
      const height = value(row, 'Height');

      if (!farm && !zone && !species) {
        warnings.push(`Row ${index} skipped: blank inventory row`);
        return null;
      }

      if (!farm || !zone || !species) {
        warnings.push(`Row ${index} skipped: inventory rows need Farm ID, Zone, and Species`);
        return null;
      }

      const id = `inventory-${slugify([farm, zone, species, compactDimension(height)].filter(Boolean).join('-'))}`;

      return {
        id,
        treeId: id,
        name: `${species} - ${farm} ${zone}`,
        title: `${species} - ${farm} ${zone}`,
        status: 'Available',
        farm,
        zone,
        species,
        ranchOakType: species,
        quantity: numberFrom(value(row, 'Quantity')) ?? cleanOptional(value(row, 'Quantity')),
        height,
        spread: value(row, 'Spread'),
        rootballSize: value(row, 'Rootball Size'),
        price: moneyFrom(value(row, 'Price')) ?? cleanOptional(value(row, 'Price')),
        sourceSheet: template.sourceSheet,
      } satisfies InventoryItemRecord;
    })
    .filter(Boolean) as InventoryItemRecord[];

  return makeTarget(template, inventory, warnings, 'inventoryItems');
}

function mapClients(template: SheetImportTemplate, rows: string[][]): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const grouped = new Map<string, ClientRecord>();

  records.forEach(({ row, index }) => {
    const company = value(row, 'Client Company');
    const contactName = value(row, 'Contact Name');
    const phone = value(row, 'Phone');
    const email = value(row, 'Email');
    const address = value(row, 'Address');

    if (!company && !contactName && !phone && !email && !address) {
      warnings.push(`Row ${index} skipped: blank client row`);
      return;
    }

    if (!company) {
      warnings.push(`Row ${index} skipped: client company is required`);
      return;
    }

    const id = `client-${slugify(company)}`;
    const existing = grouped.get(id);
    const member = contactName || phone || email
      ? { name: contactName || company, role: contactName === company ? 'Account' : 'Contact', phone, email }
      : null;

    if (!existing) {
      grouped.set(id, {
        id,
        name: company,
        title: company,
        contactName: contactName || company,
        phone,
        email,
        billingAddress: address,
        members: [],
        sourceSheet: template.sourceSheet,
      } as ClientRecord);
      return;
    }

    if (address && !existing.billingAddress) existing.billingAddress = address;
    if (phone && !existing.phone) existing.phone = phone;
    if (email && !existing.email) existing.email = email;
    if (member && (member.name !== existing.contactName || member.phone !== existing.phone || member.email !== existing.email)) {
      existing.members = [...(existing.members || []), member];
    }
  });

  return makeTarget(template, Array.from(grouped.values()), warnings, 'clients');
}

function mapEquipment(template: SheetImportTemplate, rows: string[][]): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const equipment = records
    .map(({ row, index }) => {
      const assetId = firstValue(row, 'Equipment ID', 'Asset ID', 'Asset');
      const type = firstValue(row, 'JDT Equipment Master List', 'Equipment', 'Equipment Type', 'Type');
      const make = value(row, 'Make');
      const model = value(row, 'Model');
      const serviceStatus = value(row, 'Service Status');
      const truckType = firstValue(row, 'Truck Type', 'Truck');
      const trailerType = firstValue(row, 'Trailer Type', 'Trailer');
      const implementType = firstValue(row, 'Implement Type', 'Implement');
      const currentLocationName = firstValue(row, 'Current Location', 'Location', 'Location Name');
      const currentLocationType = firstValue(row, 'Location Type', 'Current Location Type');
      const assignedCrewName = firstValue(row, 'Assigned To', 'Operator', 'Driver');
      const compatibleImplementTypes = normalizeDelimitedList(firstValue(row, 'Compatible Implements', 'Compatible Implement Types', 'Implements'));

      if (!type && !make && !model) {
        if (serviceStatus) warnings.push(`Row ${index} skipped: blank equipment row with formula-only service status`);
        return null;
      }

      if (!type || !make || !model) {
        warnings.push(`Row ${index} skipped: equipment rows need Type, Make, and Model`);
        return null;
      }

      const name = [make, model].filter(Boolean).join(' ');
      const status = equipmentStatus(serviceStatus);
      const category = equipmentCategoryFrom(type, truckType, trailerType, implementType);

      return withHomeBaseEquipmentDefaults({
        id: assetId ? `equipment-${slugify(assetId)}` : `equipment-${slugify([type, make, model].join('-'))}`,
        name,
        title: name,
        assetId,
        asset: assetId,
        type,
        eqType: type,
        category,
        truckType,
        trailerType,
        implementType,
        compatibleImplementTypes,
        currentLocationName,
        currentLocation: currentLocationName,
        currentLocationType,
        assignedCrewName,
        operator: assignedCrewName,
        make,
        model,
        status,
        serviceStatus,
        lastServiceDate: value(row, 'Last Service Date'),
        serviceIntervalDays: numberFrom(value(row, 'Service Interval (Days)')) ?? cleanOptional(value(row, 'Service Interval (Days)')),
        nextServiceDue: value(row, 'Next Service Due'),
        sourceSheet: template.sourceSheet,
      } satisfies EquipmentRecord);
    })
    .filter(Boolean) as EquipmentRecord[];

  return makeTarget(template, equipment, warnings, 'equipment');
}

function mapLocations(template: SheetImportTemplate, rows: string[][]): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const locations = records
    .map(({ row, index }) => {
      const locationType = value(row, 'Location ID') || value(row, 'Location Type');
      const locationName = value(row, 'Location Name');
      const mainAddress = value(row, 'Main Address');
      const crewAccessPoint = value(row, 'Crew Access Point');
      const equipmentAccessPoint = value(row, 'Equipment Access Point');

      if (!locationType && !locationName && !mainAddress && !crewAccessPoint && !equipmentAccessPoint) {
        warnings.push(`Row ${index} skipped: blank location row`);
        return null;
      }

      if (!locationName) {
        warnings.push(`Row ${index} skipped: location name is required`);
        return null;
      }

      return {
        id: `location-${slugify(locationName)}`,
        name: locationName,
        title: locationName,
        locationType,
        locationId: locationType,
        mainAddress,
        crewAccessPoint,
        equipmentAccessPoint,
        sourceSheet: template.sourceSheet,
      } satisfies LocationRecord;
    })
    .filter(Boolean) as LocationRecord[];

  return makeTarget(template, locations, warnings, 'locations');
}

function mapStaff(template: SheetImportTemplate, rows: string[][]): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const staff = records
    .map(({ row, index }) => {
      const name = value(row, 'Staff Name');
      const rawRole = value(row, 'Role');
      const phone = value(row, 'Phone');
      const email = value(row, 'Email');

      if (!name && !rawRole && !phone && !email) {
        warnings.push(`Row ${index} skipped: blank staff row`);
        return null;
      }

      if (!name) {
        warnings.push(`Row ${index} skipped: staff name is required`);
        return null;
      }

      const role = staffRole(rawRole);

      return {
        id: `staff-${slugify(name)}`,
        name,
        title: name,
        role,
        phone,
        email,
        status: 'Active',
        availability: 'Available',
        isRosterContact: true,
        appAccess: staffAccess(email, role),
        sourceSheet: template.sourceSheet,
      } satisfies StaffRecord;
    })
    .filter(Boolean) as StaffRecord[];

  return makeTarget(template, staff, warnings, 'staff');
}

function mapSpecies(template: SheetImportTemplate, rows: string[][]): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const seen = new Map<string, SpeciesRecord>();

  records.forEach(({ row, index }) => {
    const speciesId = value(row, 'Species ID');
    const speciesName = value(row, 'Species List') || value(row, 'Species');

    if (!speciesId && !speciesName) {
      warnings.push(`Row ${index} skipped: blank species row`);
      return;
    }

    if (!speciesName) {
      warnings.push(`Row ${index} skipped: species name is required`);
      return;
    }

    const canonicalName = canonicalSpecies(speciesName);
    const id = `species-${slugify(canonicalName)}`;
    const existing = seen.get(id);

    if (existing) {
      existing.aliases = Array.from(new Set([...(existing.aliases || []), speciesName].filter((item) => item !== existing.canonicalName)));
      return;
    }

    seen.set(id, {
      id,
      name: canonicalName,
      title: canonicalName,
      speciesId,
      speciesName,
      canonicalName,
      aliases: speciesName === canonicalName ? [] : [speciesName],
      sourceSheet: template.sourceSheet,
    } satisfies SpeciesRecord);
  });

  return makeTarget(template, Array.from(seen.values()), warnings, 'species');
}

function mapSchedule(template: SheetImportTemplate, rows: string[][]): ImportTarget {
  const { records, warnings, headers } = objectRows(rows, template.requiredHeaders);
  const activityHeader = headers.find((header) => /relocation|freight|nursery|maintenance/i.test(header)) || 'Activity';
  const schedule = records
    .map(({ row, index }) => {
      const jobScheduleId = value(row, 'Job/Schedule ID');
      const task = value(row, 'Task');
      const clientCompany = value(row, 'Client Company');
      const locationName = value(row, 'Location Name');

      if (!jobScheduleId && !task && !clientCompany && !locationName) {
        warnings.push(`Row ${index} skipped: blank schedule row`);
        return null;
      }

      const fallbackId = [jobScheduleId, task, clientCompany, locationName, value(row, 'Start Date')].filter(Boolean).join('-');
      const projectName = jobScheduleId || task;
      const jobName = task || jobScheduleId;

      return {
        id: `schedule-${slugify(fallbackId || `row-${index}`)}`,
        title: [jobScheduleId, task, clientCompany].filter(Boolean).join(' - ') || `Schedule row ${index}`,
        clientId: clientIdFromName(clientCompany),
        clientName: clientCompany,
        projectId: projectIdFromName(clientCompany, projectName),
        projectName,
        jobId: jobIdFromName(projectName, jobName),
        jobName,
        jobScheduleId,
        activityType: value(row, activityHeader),
        jobStage: value(row, 'Job Stage'),
        status: value(row, 'Status') || 'Open',
        assignee: value(row, 'Assignee'),
        task,
        startDate: value(row, 'Start Date'),
        endDate: value(row, 'End Date'),
        locationId: value(row, 'Location ID'),
        locationName,
        mainAddress: value(row, 'Main Address'),
        clientCompany,
        clientContactName: value(row, 'Client Name'),
        clientPhone: value(row, 'Client Phone Number'),
        clientEmail: value(row, 'Client Email'),
        equipment: value(row, 'Equipment'),
        implements: value(row, 'Implements'),
        truck: value(row, 'Truck'),
        trailer: value(row, 'Trailer'),
        loadStatus: value(row, 'Load Status'),
        species: value(row, 'Species'),
        farmId: value(row, 'Farm ID'),
        zone: value(row, 'Zone'),
        quantity: numberFrom(value(row, 'Quantity')) ?? cleanOptional(value(row, 'Quantity')),
        notes: value(row, 'Notes'),
        saveToMaster: /true|yes|checked/i.test(value(row, 'Save to Master')),
        sourceSheet: template.sourceSheet,
      } satisfies ScheduleTaskRecord;
    })
    .filter(Boolean) as ScheduleTaskRecord[];

  return makeTarget(template, schedule, warnings, 'scheduleTasks');
}

function mapRelocation(template: SheetImportTemplate, rows: string[][]): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const relocation = records
    .map(({ row, index }) => {
      const jobId = value(row, 'JOB ID');
      const tag = value(row, 'TAG');
      const type = value(row, 'TYPE');

      if (!jobId && !tag && !type) {
        warnings.push(`Row ${index} skipped: blank relocation row`);
        return null;
      }

      if (!jobId && !tag) {
        warnings.push(`Row ${index} skipped: relocation rows need JOB ID or TAG`);
        return null;
      }

      const title = [jobId, tag, type].filter(Boolean).join(' - ');
      const projectName = jobId;
      const jobName = tag || type || jobId;

      return {
        id: `relocation-${slugify([jobId, tag, type].filter(Boolean).join('-') || `row-${index}`)}`,
        name: title,
        title,
        projectId: projectIdFromName('', projectName),
        projectName,
        jobId: jobIdFromName(projectName, jobName),
        jobName,
        sourceJobId: jobId,
        tag,
        type,
        heightSpread: value(row, 'HEIGHT X SPREAD'),
        dbh: numberFrom(value(row, 'DBH (IN)')) ?? cleanOptional(value(row, 'DBH (IN)')),
        difficulty: value(row, 'Difficulty'),
        relocationCost: moneyFrom(value(row, 'RELOCATION COST')) ?? cleanOptional(value(row, 'RELOCATION COST')),
        relocationStatus: value(row, 'RELOCATION STATUS'),
        status: value(row, 'RELOCATION STATUS') || 'Open',
        rootPruneCuts: numberFrom(value(row, 'ROOT PRUNE CUTS')) ?? cleanOptional(value(row, 'ROOT PRUNE CUTS')),
        firstCutDate: value(row, 'DATE OF FIRST CUT'),
        secondCutDate: value(row, 'DATE OF SECOND CUT'),
        relocationDate: value(row, 'RELOCATION DATE'),
        treatments: numberFrom(value(row, 'TREATMENTS')) ?? cleanOptional(value(row, 'TREATMENTS')),
        lastTreatmentDate: value(row, 'LAST TREATMENT DATE'),
        treatmentAction: value(row, 'TREATMENT ACTION'),
        location: value(row, 'LOCATION'),
        sourceSheet: template.sourceSheet,
      } satisfies TreeRelocationRecord;
    })
    .filter(Boolean) as TreeRelocationRecord[];

  return makeTarget(template, relocation, warnings, 'treeRelocationRecords');
}

function mapJdtProjectFlowTreeAssets(template: SheetImportTemplate, rows: string[][], projectContext?: ProjectImportContext | null): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const normalizedContext = normalizeProjectImportContext(projectContext);
  const contextProjectId = normalizedContext?.projectId || normalizedContext?.projectsId || '';
  const treeAssets = records
    .map(({ row, index }) => {
      const treeAssetId = value(row, 'Tree_Assets_ID');
      const projectsId = value(row, 'Projects_ID') || contextProjectId;
      const type = value(row, 'Tree Type');
      const existingLocationDescription = firstValue(row, 'Existing Location Description', 'LOCATION', 'Location');
      const sourcePin = coordinatePointFromText(existingLocationDescription, 'Imported source pin');

      if (!treeAssetId && !projectsId && !type) {
        warnings.push(`Row ${index} skipped: blank tree asset row`);
        return null;
      }

      if (!treeAssetId || !projectsId || !type) {
        warnings.push(`Row ${index} skipped: tree asset rows need Tree_Assets_ID, Projects_ID or selected project context, and Tree Type`);
        return null;
      }

      return {
        id: treeAssetId,
        treeId: treeAssetId,
        name: [type, treeAssetId].filter(Boolean).join(' '),
        title: [type, treeAssetId].filter(Boolean).join(' '),
        projectId: projectsId,
        projectsId,
        projectName: value(row, 'Project Name') || normalizedContext?.projectName,
        type,
        ranchOakType: type,
        treeType: type,
        dbh: numberFrom(value(row, 'DBH (IN)')) ?? cleanOptional(value(row, 'DBH (IN)')),
        difficulty: value(row, 'Difficulty'),
        condition: value(row, 'Condition'),
        existingLocationDescription,
        proposedFinalLocationDescription: value(row, 'Proposed Final Location Description'),
        currentStatus: value(row, 'Current Status'),
        status: value(row, 'Current Status') || value(row, 'Relocation Status') || 'Open',
        relocationRequired: value(row, 'Relocation Required'),
        relocationCost: moneyFrom(value(row, 'Relocation Cost')) ?? cleanOptional(value(row, 'Relocation Cost')),
        relocationStatus: value(row, 'Relocation Status'),
        installationRequired: value(row, 'Installation Required'),
        preservationRequired: value(row, 'Preservation Required'),
        removalRequired: value(row, 'Removal Required'),
        priority: value(row, 'Priority'),
        relocationMap: sourcePin ? { source: sourcePin } : undefined,
        sourceSheetName: 'Tree Assets',
        sourceSheet: template.sourceSheet,
        sourceRowId: treeAssetId,
        sourceRefs: [sourceRefFromWorkbookRow('Tree Assets', {
          Tree_Assets_ID: treeAssetId,
        }, index)],
      } satisfies TreeRelocationRecord;
    })
    .filter(Boolean) as TreeRelocationRecord[];

  return makeTarget(template, treeAssets, warnings, 'treeRelocationRecords');
}

function mapJdtProjectFlowTreePruning(template: SheetImportTemplate, rows: string[][]): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const workOrders = records
    .map(({ row, index }) => {
      const treeAssetId = value(row, 'Tree Assets_ID');
      const treePruneId = value(row, 'Tree_Prune_ID');
      const firstCutDate = value(row, 'Date of 1st Cut');
      const rootPruneCuts = value(row, 'Root Prune Cuts');
      const prepChecks = value(row, 'Prep Checks');
      const readinessReview = value(row, 'Readiness Reviews');

      if (!treeAssetId && !treePruneId && !rootPruneCuts && !firstCutDate) {
        warnings.push(`Row ${index} skipped: blank tree pruning row`);
        return null;
      }

      if (!treeAssetId || !treePruneId) {
        warnings.push(`Row ${index} skipped: tree pruning rows need Tree Assets_ID and Tree_Prune_ID`);
        return null;
      }

      return {
        id: treePruneId,
        title: `Root prune ${treeAssetId}`,
        workOrderType: 'tree_pruning',
        division: 'Relocation & Installation',
        taskType: 'Root Pruning',
        status: readinessReview || 'Ready',
        scheduledDate: firstCutDate,
        sourceSheetName: 'Tree Pruning',
        sourceRowId: treePruneId,
        treeIds: [treeAssetId],
        treeNames: [treeAssetId],
        notes: [
          rootPruneCuts && `Root prune cuts: ${rootPruneCuts}`,
          prepChecks && `Prep checks: ${prepChecks}`,
          value(row, 'Notes'),
        ].filter(Boolean).join('\n'),
        sourceRefs: [sourceRefFromWorkbookRow('Tree Pruning', {
          Tree_Assets_ID: treeAssetId,
          Tree_Prune_ID: treePruneId,
        }, index)],
      } satisfies WorkOrderRecord;
    })
    .filter(Boolean) as WorkOrderRecord[];

  return makeTarget(template, workOrders, warnings, 'workOrders');
}

function mapJdtProjectFlowTreatmentAftercare(template: SheetImportTemplate, rows: string[][]): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const workOrders = records
    .map(({ row, index }) => {
      const treatmentId = value(row, 'Treatment_Aftercare Logs_ID');
      const treeAssetId = value(row, 'Tree Assets_ID');
      const treatmentType = firstValue(row, 'Treatments Type', 'Treatment Type');
      const treatmentAction = value(row, 'Treatment Action');
      const nextFollowUpDate = value(row, 'Next Follow-up Date');

      if (!treatmentId && !treeAssetId && !treatmentType && !treatmentAction) {
        warnings.push(`Row ${index} skipped: blank treatment or aftercare row`);
        return null;
      }

      if (!treatmentId || !treeAssetId) {
        warnings.push(`Row ${index} skipped: treatment rows need Treatment_Aftercare Logs_ID and Tree Assets_ID`);
        return null;
      }

      return {
        id: treatmentId,
        title: [treatmentType || treatmentAction || 'Aftercare', treeAssetId].filter(Boolean).join(' '),
        workOrderType: 'treatment_aftercare',
        division: 'Relocation & Installation',
        taskType: treatmentType || treatmentAction || 'Treatment / Aftercare',
        status: /yes|true|needed/i.test(value(row, 'Follow-up Needed')) ? 'Ready' : (treatmentAction || 'Complete'),
        scheduledDate: nextFollowUpDate,
        completedDate: value(row, 'Date Of Last Treatment'),
        crewLeadName: value(row, 'Completed By'),
        sourceSheetName: 'Treatment or Aftercare',
        sourceRowId: treatmentId,
        treeIds: [treeAssetId],
        treeNames: [treeAssetId],
        notes: [
          value(row, 'Treatments') && `Treatments: ${value(row, 'Treatments')}`,
          treatmentType && `Treatment type: ${treatmentType}`,
          treatmentAction && `Action: ${treatmentAction}`,
          value(row, 'Condition Observed') && `Condition observed: ${value(row, 'Condition Observed')}`,
          value(row, 'Watering Status') && `Watering: ${value(row, 'Watering Status')}`,
          value(row, 'Irrigation Status') && `Irrigation: ${value(row, 'Irrigation Status')}`,
          value(row, 'Stress Level') && `Stress level: ${value(row, 'Stress Level')}`,
          value(row, 'Notes'),
        ].filter(Boolean).join('\n'),
        sourceRefs: [sourceRefFromWorkbookRow('Treatment or Aftercare', {
          'Treatment_Aftercare Logs_ID': treatmentId,
        }, index)],
      } satisfies WorkOrderRecord;
    })
    .filter(Boolean) as WorkOrderRecord[];

  return makeTarget(template, workOrders, warnings, 'workOrders');
}

function mapJdtProjectFlowTreePhotos(template: SheetImportTemplate, rows: string[][]): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const documents = records
    .map(({ row, index }) => {
      const photoId = value(row, 'Tree_Photos_ID');
      const treeAssetId = value(row, 'Tree Assets_ID');
      const photoType = firstValue(row, 'Photo Type', 'Type', 'Category');
      const caption = firstValue(row, 'Caption', 'Photo Caption', 'Description');
      const url = firstValue(row, 'Photo', 'Photo URL', 'File URL', 'Drive URL', 'Image URL', 'URL', 'Photo Link', 'Link');
      const photoLocation = value(row, 'Photo Location');

      if (!photoId && !treeAssetId && !caption && !url) {
        warnings.push(`Row ${index} skipped: blank tree photo row`);
        return null;
      }

      if (!photoId || !treeAssetId) {
        warnings.push(`Row ${index} skipped: tree photo rows need Tree_Photos_ID and Tree Assets_ID`);
        return null;
      }

      return {
        id: photoId,
        name: caption || [photoType, photoLocation, treeAssetId].filter(Boolean).join(' ') || photoId,
        title: caption || [photoType, photoLocation, treeAssetId].filter(Boolean).join(' ') || photoId,
        category: 'Tree Photo',
        treeId: treeAssetId,
        treeIds: [treeAssetId],
        photoType,
        photoDate: firstValue(row, 'Captured Date', 'Photo Date', 'Date'),
        photoLocation,
        takenBy: firstValue(row, 'Captured By', 'Taken By', 'Uploaded By', 'Completed By'),
        url,
        notes: value(row, 'Notes'),
        sourceSheetName: 'Tree Photos',
        sourceRowId: photoId,
        sourceRefs: [sourceRefFromWorkbookRow('Tree Photos', {
          Tree_Photos_ID: photoId,
        }, index)],
      } satisfies DocumentRecord;
    })
    .filter(Boolean) as DocumentRecord[];

  return makeTarget(template, documents, warnings, 'documents');
}

function mapJdtProjectFlowProjectMaterialItems(template: SheetImportTemplate, rows: string[][], projectContext?: ProjectImportContext | null): ImportTarget {
  const { records, warnings } = objectRows(rows, template.requiredHeaders);
  const normalizedContext = normalizeProjectImportContext(projectContext);
  const contextProjectId = normalizedContext?.projectId || normalizedContext?.projectsId || '';
  const materialItems = records
    .map(({ row, index }) => {
      const materialItemId = value(row, 'Project_Material_Items_ID');
      const projectsId = value(row, 'Projects_ID') || contextProjectId;
      const materialType = value(row, 'Material Type');

      if (!materialItemId && !projectsId && !materialType) {
        warnings.push(`Row ${index} skipped: blank project material item row`);
        return null;
      }

      if (!projectsId || !materialType) {
        warnings.push(`Row ${index} skipped: material rows need Projects_ID or selected project context, and Material Type`);
        return null;
      }

      const id = materialItemId || `material-${slugify([projectsId, value(row, 'Hole Number / Area'), materialType, value(row, 'Size / Class')].filter(Boolean).join('-') || `row-${index}`)}`;

      return {
        id,
        projectMaterialItemsId: materialItemId,
        projectsId,
        projectId: projectsId,
        projectName: value(row, 'Project Name') || normalizedContext?.projectName,
        holeNumberOrArea: value(row, 'Hole Number / Area'),
        source: value(row, 'Source'),
        materialType,
        sizeClass: value(row, 'Size / Class'),
        quantityRequired: numberFrom(value(row, 'Quantity Required')) ?? cleanOptional(value(row, 'Quantity Required')),
        quantityInstalled: numberFrom(value(row, 'Quantity Installed')) ?? cleanOptional(value(row, 'Quantity Installed')),
        unitPrice: moneyFrom(value(row, 'Unit Price')) ?? cleanOptional(value(row, 'Unit Price')),
        installStatus: value(row, 'Install Status') || 'Needed',
        notes: value(row, 'Notes'),
        sourceSheetName: 'Project_Material_Items',
        sourceRowId: materialItemId || id,
        sourceRefs: [sourceRefFromWorkbookRow('Project_Material_Items', {
          Project_Material_Items_ID: materialItemId || id,
        }, index)],
      } satisfies ProjectMaterialItemRecord;
    })
    .filter(Boolean) as ProjectMaterialItemRecord[];

  return makeTarget(template, materialItems, warnings, 'projectMaterialItems');
}

function coordinatePointFromText(text: string, label: string) {
  const match = cleanText(text).match(/(-?\d{1,3}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)/);
  if (!match) return undefined;

  const lat = Number(match[1]);
  const lng = Number(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;

  return {
    lat: Number(lat.toFixed(5)),
    lng: Number(lng.toFixed(5)),
    label,
  };
}

function objectRows(rows: string[][], requiredHeaders: string[]) {
  const warnings: string[] = [];
  const headerIndex = findHeaderIndex(rows, requiredHeaders);

  if (headerIndex < 0) {
    return { headers: [], records: [], warnings: ['No matching header row found'] };
  }

  const headers = rows[headerIndex].map(cleanText);
  const missing = requiredHeaders.filter((header) => !headers.some((candidate) => normalizedHeader(candidate) === normalizedHeader(header)));
  missing.forEach((header) => warnings.push(`Missing expected header: ${header}`));

  const records = rows.slice(headerIndex + 1).map((row, rowIndex) => {
    const object: RowObject = {};
    headers.forEach((header, index) => {
      if (!header) return;
      object[normalizedHeader(header)] = cleanText(row[index] || '');
    });
    return { row: object, index: headerIndex + rowIndex + 2 };
  });

  return { headers, records, warnings };
}

function findHeaderIndex(rows: string[][], requiredHeaders: string[]): number {
  const required = requiredHeaders.map(normalizedHeader);
  let bestIndex = -1;
  let bestScore = 0;

  rows.forEach((row, index) => {
    const headers = row.map(normalizedHeader);
    const score = required.filter((header) => headers.includes(header)).length;
    if (score > bestScore) {
      bestIndex = index;
      bestScore = score;
    }
  });

  return bestScore > 0 ? bestIndex : -1;
}

function makeTarget(template: SheetImportTemplate, records: CommandRecord[], warnings: string[], collectionName = template.targetCollections[0]): ImportTarget {
  return {
    collectionName,
    label: template.label,
    records,
    warnings,
  };
}

function findTemplate(templateId: SheetImportTemplateId): SheetImportTemplate {
  const template = sheetImportTemplates.find((item) => item.id === templateId);
  if (!template) throw new Error(`Unknown import template: ${templateId}`);
  return template;
}

function value(row: RowObject, header: string): string {
  return cleanText(row[normalizedHeader(header)] || '');
}

function firstValue(row: RowObject, ...headers: string[]): string {
  for (const header of headers) {
    const candidate = value(row, header);
    if (candidate) return candidate;
  }
  return '';
}

function cleanText(input: unknown): string {
  return String(input ?? '').replace(/\u00a0/g, ' ').trim();
}

function cleanOptional(input: unknown): string | undefined {
  const text = cleanText(input);
  return text || undefined;
}

function displayFieldValue(input: unknown): string {
  if (input === null || input === undefined) return '';
  return cleanText(input);
}

function normalizedHeader(input: string): string {
  return cleanText(input).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function slugify(input: string): string {
  return cleanText(input)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function numberFrom(input: string): number | undefined {
  const cleaned = cleanText(input).replace(/[$,]/g, '').replace(/[^0-9.-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return undefined;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function moneyFrom(input: string): number | undefined {
  return numberFrom(input);
}

function compactDimension(input: string): string {
  return cleanText(input).replace(/['"]/g, '').replace(/\s+/g, ' ');
}

function staffRole(role: string): string {
  const cleanRole = cleanText(role);
  if (/owner/i.test(cleanRole)) return 'Owner';
  return cleanRole || 'Staff';
}

function staffAccess(email: string, role: string): StaffRecord['appAccess'] {
  const cleanEmail = cleanText(email).toLowerCase();
  if (cleanEmail === 'jeremy@jdtnurseries.com') return 'admin';
  if (cleanEmail.endsWith('@jdtnurseries.com')) return 'authorized';
  if (role === 'Owner') return 'contact-only';
  return 'contact-only';
}

function equipmentStatus(serviceStatus: string): string {
  if (/due|overdue/i.test(serviceStatus)) return 'Maintenance';
  if (/upcoming|inspection/i.test(serviceStatus)) return 'Inspection';
  if (/down/i.test(serviceStatus)) return 'Down';
  return 'Available';
}

function equipmentCategoryFrom(type: string, truckType: string, trailerType: string, implementType: string): EquipmentRecord['category'] {
  const joined = [type, truckType, trailerType, implementType].join(' ').toLowerCase();
  if (trailerType || joined.includes('trailer')) return 'Trailer';
  if (truckType || joined.includes('truck')) return 'Truck';
  if (implementType || joined.includes('implement')) return 'Implement';
  if (joined.includes('tool')) return 'Tool';
  return 'Machine';
}

function canonicalSpecies(species: string): string {
  const clean = cleanText(species).replace(/\s+/g, ' ');
  const upper = clean.toUpperCase();
  const aliases: Record<string, string> = {
    'FOX TAIL': 'Foxtail',
    FOXTAIL: 'Foxtail',
    'LIVE OAKS': 'Live Oak',
    'LIVE OAK': 'Live Oak',
    'ORANGE GEIGAR': 'Orange Geiger',
    'ORANGE GEIGER': 'Orange Geiger',
    CALOPHYLLUM: 'Calophyllum',
    CALOPHYLUM: 'Calophyllum',
  };

  if (aliases[upper]) return aliases[upper];
  return clean.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}
