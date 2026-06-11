import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Briefcase, Building2, Check, FilePlus, Leaf, MapPin, Plus, Truck, User, Wrench } from 'lucide-react';
import {
  equipmentCategory,
  equipmentCategoryOptions,
  equipmentDisplayName,
  equipmentLocationTypeOptions,
  equipmentStatusOptions,
  equipmentTypeOptions,
  freightStatusOptions,
  implementTypeOptions,
  jdtHomeBase,
  normalizeDelimitedList as normalizeResourceList,
  trailerMaintenanceCategoryOptions,
  trailerTypeOptions,
  truckTypeOptions,
} from '../commandCenter/equipmentFreight';
import { personnelCrewAllocationOptions, personnelLanguageOptions, personnelRoleOptions } from '../commandCenter/personnel';
import { relocationInstallationDivisionLabel, relocationInstallationJobTypes } from '../commandCenter/relocationInstallation';
import { defaultRelocationStatus, relocationStatusOptions } from '../commandCenter/treeLifecycle';
import { jdtProjectFlowWorkbook } from '../commandCenter/workbookProjectFlow';

type FieldConfig = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'textarea' | 'checkbox' | 'select' | 'multiselect' | 'email' | 'tel' | 'url';
  options?: string[];
  suggestions?: string[];
  placeholder?: string;
  hint?: string;
  defaultValue?: string | boolean | number;
  section?: string;
  wide?: boolean;
  rows?: number;
  required?: boolean;
  showWhen?: (formData: Record<string, unknown>) => boolean;
};

type EntityFormsProps = {
  type: string;
  onClose: () => void;
  openModal: (type: string, data?: any) => void;
  onSaveRecord: (type: string, data: any) => void;
  data?: any;
  jobsList?: any[];
  ranchOaksList?: any[];
  equipmentList?: any[];
  crewsList?: any[];
  clientsList?: any[];
  locationsList?: any[];
  workOrders?: any[];
  projectMaterialItems?: any[];
  submitLabel?: string;
};

type EquipmentLocationOption = {
  name: string;
  addresses: string[];
  locationType: string;
};

const addNewOptions = [
  { type: 'job', label: 'Project', icon: Briefcase },
  { type: 'client', label: 'Client', icon: Building2 },
  { type: 'tree', label: 'Tree', icon: Leaf },
  { type: 'load', label: 'Freight Load', icon: Truck },
  { type: 'equipment', label: 'Equipment', icon: Wrench },
  { type: 'employee', label: 'Employee', icon: User },
];

const loadStopTypeOptions = ['Pickup', 'Drop Off', 'Delivery', 'Trailer Spot', 'Equipment Move', 'Other'];
const loadCategoryOptions = ['Equipment', 'Trailer', 'Trees', 'Material', 'Other'];
const equipmentRequestTypeOptions = ['Add Equipment', 'Swap Equipment', 'Remove Equipment', 'Rental Request', 'Return Rental'];
const equipmentSourceOptions = ['JD Thornton Equipment', 'Rental Equipment', 'Either JD Thornton or Rental'];
const defaultFreightLocationOptions = [
  'JD Thornton Nurseries Home Base',
  '1010 E Sugarland Hwy, Clewiston, FL 33440',
  '10 Acre Farm',
  '25 Acre Farm',
  '40 Acre Farm',
];
const ranchOakTypeOptions = ['Single trunk', 'Multi trunk', 'Split trunk'];
const ranchOakStatusOptions = ['Available', 'Sold', 'On Hold', 'Dig Queue', 'Harvested', 'Assigned'];
const propagationSourceOptions = ['Seed', 'Cutting', 'Liner', 'Air Layer', 'Purchased Starter'];
const propagationStageOptions = ['Shade House', 'Seed Cell', 'Quart', '1G', '3G', '7G', '15G', '25G', '45G', 'Ready for Field', 'Field Planted'];
const propagationHealthOptions = ['Rooting', 'Healthy', 'Needs Water', 'Needs Nutrient Care', 'Pest Watch', 'Disease Watch', 'Stressed', 'Ready to Move Up', 'Ready for Field'];
const divisionOptions = [relocationInstallationDivisionLabel, 'Nursery', 'Freight', 'Maintenance / Equipment', 'Administration'];
const workOrderStatusOptions = ['Draft', 'Ready', 'Scheduled', 'Active', 'Blocked', 'Complete', 'Cancelled'];
const workOrderPriorityOptions = ['Low', 'Normal', 'High', 'Urgent', 'Critical'];
const crewAssignmentTypeOptions = ['general_task', 'tree_pruning', 'treatment_aftercare', 'move_readiness', 'daily_field_update', 'change_order', 'billing_milestone'];
const projectTreeFormTypes = new Set(['project_tree_asset', 'project_tree_pruning', 'project_tree_aftercare', 'project_tree_photo']);

function usesRentalEquipment(formData: Record<string, unknown>) {
  const source = String(formData.equipmentSource || '').toLowerCase();
  const requestType = String(formData.equipmentRequestType || '').toLowerCase();
  return source.includes('rental') || requestType.includes('rental');
}

function employeeHasDriverRole(formData: Record<string, unknown>) {
  return String(formData.role || '').toLowerCase().includes('driver');
}

function employeeDriverComplianceEnabled(formData: Record<string, unknown>) {
  return employeeHasDriverRole(formData) || Boolean(formData.drivesForCompany) || Boolean(formData.cdlCertified);
}

function employeeCdlComplianceEnabled(formData: Record<string, unknown>) {
  return employeeDriverComplianceEnabled(formData) && Boolean(formData.cdlCertified);
}

function equipmentProfileCategory(formData: Record<string, unknown>) {
  return equipmentCategory(formData as any);
}

function isMachineProfile(formData: Record<string, unknown>) {
  return equipmentProfileCategory(formData) === 'Machine';
}

function isTruckProfile(formData: Record<string, unknown>) {
  return equipmentProfileCategory(formData) === 'Truck';
}

function isTrailerProfile(formData: Record<string, unknown>) {
  return equipmentProfileCategory(formData) === 'Trailer';
}

function isImplementProfile(formData: Record<string, unknown>) {
  return equipmentProfileCategory(formData) === 'Implement';
}

function isToolProfile(formData: Record<string, unknown>) {
  return equipmentProfileCategory(formData) === 'Tool';
}

function isVehicleProfile(formData: Record<string, unknown>) {
  return isTruckProfile(formData) || isTrailerProfile(formData);
}

function buildLoadStopFields(stopCount: number): FieldConfig[] {
  return Array.from({ length: stopCount }, (_, index) => index + 1).flatMap((stopNumber) => ([
  {
    key: `stop${stopNumber}Type`,
    label: `Stop ${stopNumber} Type`,
    type: 'select',
    options: loadStopTypeOptions,
    defaultValue: stopNumber === 1 ? 'Pickup' : '',
    section: 'Stops & Schedule',
  },
  {
    key: `stop${stopNumber}LoadCategory`,
    label: 'Load Category',
    type: 'select',
    options: loadCategoryOptions,
    defaultValue: stopNumber === 1 ? 'Equipment' : '',
  },
  { key: `stop${stopNumber}EquipmentName`, label: 'Equipment / Material' },
  { key: `stop${stopNumber}TrailerName`, label: 'Trailer Number' },
  { key: `stop${stopNumber}MainAddress`, label: 'Main Address', wide: true },
  {
    key: `stop${stopNumber}ConstructionAccessPin`,
    label: 'Construction / Equipment Access Pin Point',
    placeholder: 'Paste Google Maps pin or coordinates',
    wide: true,
  },
  {
    key: `stop${stopNumber}LoadUnloadPin`,
    label: 'Load / Unload Pin Point',
    placeholder: 'Paste Google Maps pin or coordinates',
    wide: true,
  },
  { key: `stop${stopNumber}RequestedTime`, label: 'Requested Delivery Time' },
  { key: `stop${stopNumber}SiteContactName`, label: 'Site Contact Name' },
  { key: `stop${stopNumber}SiteContactPhone`, label: 'Site Contact Number', type: 'tel' },
  { key: `stop${stopNumber}SaveLocation`, label: 'Save As New Location', type: 'checkbox' },
  { key: `stop${stopNumber}SaveContact`, label: 'Save To Contacts', type: 'checkbox' },
  ]));
}

const fieldSets: Record<string, FieldConfig[]> = {
  job: [
    { key: 'title', label: 'Project Name', required: true },
    { key: 'client', label: 'Client' },
    {
      key: 'projectId',
      label: 'Project ID',
      placeholder: 'Auto-generated, for example BWCC-060426',
      hint: 'Auto-generated, for example BWCC-060426. You can override it if needed.',
    },
    { key: 'division', label: 'Division', type: 'select', options: divisionOptions },
    { key: 'jobType', label: 'Job Type', type: 'select', options: [...relocationInstallationJobTypes] },
    {
      key: 'rootPruningPeriodMonths',
      label: 'Default Root Pruning Months',
      type: 'number',
      defaultValue: 4,
      hint: 'Used to calculate the 2nd cut halfway point and ready-for-relocation date for project trees.',
    },
    { key: 'location', label: 'Main Jobsite Address', section: 'Project Site Addresses', placeholder: 'Paste street address or Google Maps link', wide: true },
    { key: 'crewAccessAddress', label: 'Crew Access Address', placeholder: 'Paste access address, Google Maps link, or lat,long pin', wide: true },
    { key: 'truckAccessAddress', label: 'Truck / Equipment Access Address', placeholder: 'Paste access address, Google Maps link, or lat,long pin', wide: true },
    { key: 'constructionAccessPin', label: 'Construction / Equipment Access Pin', placeholder: 'Paste Google Maps URL or lat,long coordinates', wide: true },
    { key: 'loadUnloadPin', label: 'Load / Unload Pin', placeholder: 'Paste Google Maps URL or lat,long coordinates', wide: true },
    { key: 'secondaryLoadUnloadPin', label: 'Additional Load / Unload Pin', placeholder: 'Paste Google Maps URL or lat,long coordinates', wide: true },
    { key: 'siteAccessNotes', label: 'Site Access Notes', type: 'textarea', rows: 3, wide: true },
    { key: 'pm', label: 'Project Manager' },
    { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Active', 'Delayed', 'On Hold', 'Complete'] },
    { key: 'startDate', label: 'Schedule Start Date', type: 'date', section: 'Schedule' },
    { key: 'endDate', label: 'Schedule End Date', type: 'date' },
    { key: 'date', label: 'Target Date', type: 'date' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  client: [
    { key: 'name', label: 'Company Name', required: true },
    { key: 'contactName', label: 'Primary Contact' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'billingAddress', label: 'Billing Address' },
    { key: 'accessNotes', label: 'Access Notes', type: 'textarea' },
  ],
  contact: [
    { key: 'name', label: 'Contact Name', required: true },
    { key: 'company', label: 'Company' },
    { key: 'role', label: 'Role' },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  employee: [
    { key: 'name', label: 'Name', required: true },
    { key: 'role', label: 'Role', type: 'select', options: personnelRoleOptions },
    { key: 'phone', label: 'Phone', type: 'tel' },
    { key: 'email', label: 'Email', type: 'email' },
    { key: 'type', label: 'Crew Allocation', type: 'select', options: personnelCrewAllocationOptions },
    { key: 'availability', label: 'Availability', type: 'select', options: ['Available', 'Active', 'Sidelined', 'Off Duty'] },
    { key: 'skill', label: 'Primary Skill' },
    { key: 'language', label: 'Language', type: 'select', options: personnelLanguageOptions },
    {
      key: 'drivesForCompany',
      label: 'Drives / Insurance Registered',
      type: 'checkbox',
      section: 'Driver Compliance',
      hint: 'Driver role is tracked automatically; use this for crew leaders or other insured personnel who may drive company vehicles.',
    },
    { key: 'cdlCertified', label: 'CDL Certified', type: 'checkbox', showWhen: employeeDriverComplianceEnabled },
    { key: 'driverLicenseNumber', label: 'Driver License Number', showWhen: employeeDriverComplianceEnabled },
    { key: 'driverLicenseExpirationDate', label: 'Driver License Expiration', type: 'date', showWhen: employeeDriverComplianceEnabled },
    { key: 'driverLicenseDocumentUrl', label: 'Driver License Document URL', type: 'url', wide: true, showWhen: employeeDriverComplianceEnabled },
    { key: 'medicalCardExpirationDate', label: 'Medical Card Expiration', type: 'date', showWhen: employeeCdlComplianceEnabled },
    { key: 'medicalCardDocumentUrl', label: 'Medical Card Document URL', type: 'url', wide: true, showWhen: employeeCdlComplianceEnabled },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  tree: [
    { key: 'treeId', label: 'Tree ID', required: true },
    { key: 'ranchOakType', label: 'Tree Type' },
    { key: 'dbh', label: 'DBH', type: 'number' },
    { key: 'height', label: 'Height', type: 'number' },
    { key: 'spread', label: 'Spread', type: 'number' },
    { key: 'quantity', label: 'Quantity', type: 'number' },
    { key: 'rootballSize', label: 'Rootball Size' },
    { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Sold', 'On Hold', 'Dig Queue', 'Harvested', 'Assigned'] },
    { key: 'farm', label: 'Farm' },
    { key: 'zone', label: 'Zone' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  ranchOak: [
    { key: 'treeId', label: 'Tree ID', required: true, section: 'Ranch Oak Identity' },
    { key: 'ranchOakType', label: 'Ranch Oak Type', type: 'select', options: ranchOakTypeOptions, defaultValue: 'Single trunk' },
    { key: 'commonName', label: 'Common Name', defaultValue: 'Ranch Oak Live Oak' },
    { key: 'status', label: 'Status', type: 'select', options: ranchOakStatusOptions, defaultValue: 'Available' },
    { key: 'dbh', label: 'DBH', type: 'number', section: 'Size & Value' },
    { key: 'height', label: 'Height', type: 'number' },
    { key: 'spread', label: 'Spread', type: 'number' },
    { key: 'quantity', label: 'Quantity', type: 'number', defaultValue: 1 },
    { key: 'rootballSize', label: 'Rootball Size' },
    { key: 'estimatedWeight', label: 'Estimated Weight' },
    { key: 'price', label: 'Value / Price', type: 'number' },
    { key: 'fieldLocation', label: 'Field Location', section: 'Field Position' },
    { key: 'farm', label: 'Farm' },
    { key: 'zone', label: 'Zone' },
    { key: 'row', label: 'Row' },
    { key: 'position', label: 'Position' },
    { key: 'rootPruneDate', label: 'Root Prune Date', type: 'date', section: 'Work History' },
    { key: 'dateHarvested', label: 'Date Harvested', type: 'date' },
    { key: 'datePlanted', label: 'Date Planted', type: 'date' },
    { key: 'condition', label: 'Condition' },
    { key: 'customerName', label: 'Customer / Project' },
    { key: 'projectId', label: 'Project ID' },
    { key: 'mainImageUrl', label: 'Main Image URL', type: 'url', section: 'Images', wide: true },
    { key: 'imageUrl2', label: 'Additional Image 1 URL', type: 'url', wide: true },
    { key: 'imageUrl3', label: 'Additional Image 2 URL', type: 'url', wide: true },
    { key: 'imageUrl4', label: 'Additional Image 3 URL', type: 'url', wide: true },
    { key: 'imageUrl5', label: 'Additional Image 4 URL', type: 'url', wide: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  propagation: [
    { key: 'propagationBatchId', label: 'Propagation Batch ID', required: true, section: 'Propagation Identity' },
    { key: 'treeId', label: 'Plant / Batch Code' },
    { key: 'commonName', label: 'Plant / Species', required: true },
    { key: 'species', label: 'Botanical / Species Name' },
    { key: 'propagationSource', label: 'Propagation Source', type: 'select', options: propagationSourceOptions, defaultValue: 'Cutting' },
    { key: 'propagationStage', label: 'Current Stage', type: 'select', options: propagationStageOptions, defaultValue: 'Shade House' },
    { key: 'quantity', label: 'Quantity', type: 'number', defaultValue: 1, section: 'Quantity & Location' },
    { key: 'fieldLocation', label: 'Location' },
    { key: 'farm', label: 'Farm / Holding Area' },
    { key: 'zone', label: 'Bench / Zone' },
    { key: 'startDate', label: 'Start Date', type: 'date', section: 'Timing' },
    { key: 'targetMoveUpDate', label: 'Target Move-Up Date', type: 'date' },
    { key: 'waterNeeds', label: 'Water Needs', type: 'textarea', rows: 2, section: 'Care Requirements' },
    { key: 'nutrientNeeds', label: 'Nutrient Care Needs', type: 'textarea', rows: 2 },
    { key: 'plantHealthStatus', label: 'Plant Health Status', type: 'select', options: propagationHealthOptions, defaultValue: 'Rooting' },
    { key: 'internalUseOnly', label: 'Internal Use Only', type: 'checkbox', defaultValue: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  project_tree_asset: [
    { key: 'treeId', label: 'Tree Asset ID', required: true },
    { key: 'type', label: 'Tree Type', required: true },
    { key: 'dbh', label: 'DBH (IN)', type: 'number' },
    { key: 'difficulty', label: 'Difficulty' },
    { key: 'condition', label: 'Condition' },
    { key: 'existingLocationDescription', label: 'Existing Location Description', wide: true },
    { key: 'proposedFinalLocationDescription', label: 'Proposed Final Location Description', wide: true },
    { key: 'status', label: 'Current Status', type: 'select', options: ['Open', 'Ready for Root Pruning', 'Root Pruning', 'Ready for Relocation', 'Relocated', 'Installed', 'Preservation', 'Removed', 'On Hold'] },
    { key: 'relocationRequired', label: 'Relocation Required', type: 'checkbox' },
    { key: 'relocationCost', label: 'Relocation Cost', type: 'number' },
    { key: 'relocationStatus', label: 'Relocation Status', type: 'select', options: [...relocationStatusOptions], defaultValue: defaultRelocationStatus },
    {
      key: 'rootPruningPeriodMonths',
      label: 'Tree Root Pruning Months',
      type: 'number',
      hint: 'Leave blank to use the project default. Use this when a tree needs more or less root-pruning time.',
    },
    { key: 'installationRequired', label: 'Installation Required', type: 'checkbox' },
    { key: 'preservationRequired', label: 'Preservation Required', type: 'checkbox' },
    { key: 'removalRequired', label: 'Removal Required', type: 'checkbox' },
    { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Normal', 'High', 'Urgent', 'Critical'] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  project_tree_pruning: [
    { key: 'title', label: 'Root Pruning Record', required: true },
    { key: 'treeIds', label: 'Tree Asset ID', required: true },
    { key: 'scheduledDate', label: 'Date of 1st Cut', type: 'date' },
    { key: 'secondCutDate', label: 'Date of 2nd Cut', type: 'date' },
    { key: 'thirdCutDate', label: 'Date of 3rd Cut', type: 'date' },
    { key: 'prepChecks', label: 'Prep Checks', type: 'textarea' },
    { key: 'status', label: 'Readiness Reviews', type: 'select', options: ['Draft', 'Ready', 'Scheduled', 'Active', 'Blocked', 'Complete', 'Cancelled'] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  project_tree_aftercare: [
    { key: 'title', label: 'Nutrient Care Record', required: true },
    { key: 'treeIds', label: 'Tree Asset ID', required: true },
    { key: 'treatments', label: 'Treatments' },
    { key: 'taskType', label: 'Treatments Type' },
    { key: 'completedDate', label: 'Date Of Last Treatment', type: 'date' },
    { key: 'treatmentAction', label: 'Treatment Action' },
    { key: 'crewLeadName', label: 'Completed By' },
    { key: 'conditionObserved', label: 'Condition Observed' },
    { key: 'wateringStatus', label: 'Watering Status' },
    { key: 'irrigationStatus', label: 'Irrigation Status' },
    { key: 'stressLevel', label: 'Stress Level', type: 'select', options: ['Low', 'Moderate', 'High', 'Severe'] },
    { key: 'followUpNeeded', label: 'Follow-up Needed', type: 'checkbox' },
    { key: 'scheduledDate', label: 'Next Follow-up Date', type: 'date' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  project_tree_photo: [
    { key: 'name', label: 'Photo Record Name', required: true },
    { key: 'treeId', label: 'Tree Asset ID', required: true },
    { key: 'url', label: 'Photo', type: 'url' },
    { key: 'takenBy', label: 'Captured By' },
    { key: 'photoDate', label: 'Captured Date', type: 'date' },
    { key: 'photoLocation', label: 'Photo Location' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  document: [
    { key: 'name', label: 'Document Name', required: true },
    { key: 'job', label: 'Linked Project' },
    { key: 'category', label: 'Category', type: 'select', options: ['Permit', 'Closeout Proof', 'Field Photo', 'Bill of Lading', 'Proof of Delivery', 'Driver License', 'Medical Card', 'Vehicle Registration', 'Insurance', 'Contract', 'Invoice', 'Other'] },
    { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Received', 'Filed', 'Needs Review', 'Approved', 'Expired', 'Missing'] },
    { key: 'reviewStatus', label: 'Review Status', type: 'select', options: ['Needs Review', 'Approved', 'Rejected', 'Filed'] },
    { key: 'url', label: 'Source URL', type: 'url' },
    { key: 'relatedEntityType', label: 'Related Entity Type', type: 'select', options: ['client', 'project', 'job', 'workOrder', 'load', 'equipment', 'crew', 'tree', 'fieldUpdate'] },
    { key: 'relatedEntityId', label: 'Related Entity ID' },
    { key: 'relatedTitle', label: 'Related Title' },
    { key: 'uploadedBy', label: 'Uploaded By' },
    { key: 'uploadedAt', label: 'Uploaded Date', type: 'date' },
    { key: 'expirationDate', label: 'Expiration Date', type: 'date' },
    { key: 'storageProvider', label: 'Storage Provider', type: 'select', options: ['Google Drive', 'Firebase Storage', 'External URL', 'Local Reference'] },
    { key: 'fileType', label: 'File Type', type: 'select', options: ['Photo', 'PDF', 'Image', 'Document', 'Video', 'Other'] },
    { key: 'fileId', label: 'File ID' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  syncSource: [
    { key: 'name', label: 'Source Name', required: true },
    { key: 'sourceType', label: 'Source Type', type: 'select', options: ['Google Sheet', 'Google Drive Folder', 'Manual Import', 'Firebase Collection'] },
    { key: 'owner', label: 'Owner' },
    { key: 'status', label: 'Status', type: 'select', options: ['Needs Setup', 'Active', 'Paused', 'Error'] },
    { key: 'url', label: 'Source URL', type: 'url' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  syncMapping: [
    { key: 'name', label: 'Mapping Name', required: true },
    { key: 'sourceId', label: 'Source ID' },
    { key: 'targetCollection', label: 'Target Collection', type: 'select', options: ['inventoryItems', 'clients', 'equipment', 'locations', 'staff', 'species', 'scheduleTasks', 'treeRelocationRecords', 'workOrders', 'projectMaterialItems', 'documents'] },
    { key: 'status', label: 'Status', type: 'select', options: ['Needs Setup', 'Mapped', 'Active', 'Paused'] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  load: [
    {
      key: 'title',
      label: 'Load Title',
      section: 'Dispatch',
      placeholder: 'Auto-generated from driver, truck, client, and freight details',
      hint: 'Auto-generated from driver, truck, client, and freight details. You can override it if needed.',
    },
    { key: 'loadNumber', label: 'Move / Load Number', placeholder: 'FM-YYYYMMDD-DRIVER-TRUCK-##', hint: 'Format: FM-date-driver initials-truck code-sequence, for example FM-20260601-CC-S1-01.' },
    { key: 'clientName', label: 'Client' },
    { key: 'projectName', label: 'Project' },
    { key: 'jobName', label: 'Job' },
    { key: 'outsideNetwork', label: 'Outside Network', type: 'checkbox', section: 'Assign Driver' },
    { key: 'driver', label: 'Driver' },
    { key: 'outsideCompany', label: 'Outside Company', showWhen: (formData) => Boolean(formData.outsideNetwork) },
    { key: 'outsideDriverPhone', label: 'Outside Driver Phone', type: 'tel', showWhen: (formData) => Boolean(formData.outsideNetwork) },
    { key: 'outsideTruckUnit', label: 'Outside Truck / Unit', showWhen: (formData) => Boolean(formData.outsideNetwork) },
    { key: 'truck', label: 'Truck', type: 'select', options: truckTypeOptions },
    { key: 'requiredTrailerType', label: 'Required Trailer Type' },
    { key: 'equipmentNames', label: 'Linked Equipment' },
    { key: 'date', label: 'Date', type: 'date', section: 'Stops & Schedule' },
    { key: 'rateUsd', label: 'Rate (USD)', type: 'number' },
    { key: 'eta', label: 'ETA' },
    { key: 'driverNotes', label: 'Driver Notes', type: 'textarea', section: 'Driver Instructions', wide: true },
    { key: 'status', label: 'Status', type: 'select', options: freightStatusOptions },
    { key: 'escortRequired', label: 'Escort Required', type: 'checkbox' },
  ],
  vehicleActivity: [
    { key: 'locationName', label: 'Location Name' },
    { key: 'locationAddress', label: 'Address / Site Detail' },
    { key: 'assignedCrewName', label: 'Driver / Crew Member' },
    { key: 'assignedTruck', label: 'Truck' },
    { key: 'vehicleLoadState', label: 'Load State', type: 'select', options: ['Empty', 'Pre-loading', 'Loaded', 'Staged', 'In Use'] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  freightStopProgress: [
    { key: 'stopId', label: 'Stop ID / Name' },
    { key: 'locationName', label: 'Location Name' },
    { key: 'locationAddress', label: 'Address / Site Detail' },
    { key: 'nextStatus', label: 'Stop Status', type: 'select', options: ['Pending', 'InProgress', 'Completed', 'Skipped'] },
    { key: 'actualArrivalAt', label: 'Actual Arrival' },
    { key: 'actualDepartureAt', label: 'Actual Departure' },
    { key: 'saveLocation', label: 'Save Location', type: 'checkbox' },
    { key: 'saveContact', label: 'Save Site Contact', type: 'checkbox' },
    { key: 'siteContactName', label: 'Site Contact Name' },
    { key: 'siteContactPhone', label: 'Site Contact Phone', type: 'tel' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  freightRouteStep: [
    { key: 'routeStepId', label: 'Route Step ID / Number' },
    { key: 'routeStepStatus', label: 'Step Status', type: 'select', options: ['Pending', 'In Progress', 'Complete', 'Skipped', 'Delayed'] },
    { key: 'actualStart', label: 'Actual Start' },
    { key: 'actualEnd', label: 'Actual End' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  freightPod: [
    { key: 'receiverName', label: 'Receiver Name' },
    { key: 'completedAt', label: 'Completed At' },
    { key: 'signatureDataUrl', label: 'Signature Data / URL' },
    { key: 'bolPhotoDataUrl', label: 'BOL Photo / BOL URL' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  vehicleIssue: [
    { key: 'severity', label: 'Severity', type: 'select', options: ['Low', 'Medium', 'High', 'Critical'] },
    { key: 'description', label: 'Issue Description', type: 'textarea', required: true },
    { key: 'reportedBy', label: 'Reported By' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  equipment: [
    { key: 'name', label: 'Equipment Name', required: true },
    { key: 'assetId', label: 'Asset ID' },
    { key: 'category', label: 'Category', type: 'select', options: equipmentCategoryOptions },
    { key: 'status', label: 'Status', type: 'select', options: equipmentStatusOptions },
    { key: 'eqType', label: 'Equipment Type', type: 'select', options: equipmentTypeOptions, section: 'Category Details', showWhen: isMachineProfile },
    { key: 'truckType', label: 'Truck Type', type: 'select', options: truckTypeOptions, section: 'Category Details', showWhen: isTruckProfile },
    { key: 'trailerType', label: 'Trailer Type', type: 'select', options: trailerTypeOptions, section: 'Category Details', showWhen: isTrailerProfile },
    { key: 'implementType', label: 'Implement Type', type: 'select', options: implementTypeOptions, section: 'Category Details', showWhen: isImplementProfile },
    { key: 'toolType', label: 'Tool Type', section: 'Category Details', showWhen: isToolProfile },
    {
      key: 'compatibleTruckTypes',
      label: 'Compatible Trucks',
      type: 'multiselect',
      options: truckTypeOptions,
      section: 'Dispatch Compatibility',
      showWhen: (formData) => isMachineProfile(formData) || isTrailerProfile(formData),
    },
    {
      key: 'compatibleTrailerTypes',
      label: 'Compatible Trailers',
      type: 'multiselect',
      options: trailerTypeOptions,
      section: 'Dispatch Compatibility',
      showWhen: (formData) => isMachineProfile(formData) || isTruckProfile(formData),
    },
    {
      key: 'compatibleMachineTypes',
      label: 'Compatible Machine Types',
      type: 'multiselect',
      options: equipmentTypeOptions.filter((option) => !['Truck', 'Trailer', 'Implement', 'Tool'].includes(option)),
      section: 'Dispatch Compatibility',
      showWhen: isImplementProfile,
    },
    {
      key: 'compatibleImplementTypes',
      label: 'Compatible Implements',
      type: 'multiselect',
      options: implementTypeOptions,
      section: 'Dispatch Compatibility',
      showWhen: isMachineProfile,
    },
    { key: 'attachedImplementNames', label: 'Attached Implements', showWhen: isMachineProfile },
    { key: 'currentLocationType', label: 'Location Type', type: 'select', options: equipmentLocationTypeOptions },
    { key: 'currentLocationName', label: 'Current Location' },
    { key: 'currentLocation', label: 'Current Address / Site Detail' },
    { key: 'assignedCrewName', label: 'Assigned Crew / Driver' },
    { key: 'assignedProjectName', label: 'Assigned Project' },
    { key: 'assignedTruck', label: 'Assigned Truck', showWhen: (formData) => isTrailerProfile(formData) || isImplementProfile(formData) },
    { key: 'operator', label: 'Operator', showWhen: (formData) => isMachineProfile(formData) || isTruckProfile(formData) },
    { key: 'hours', label: 'Hours', type: 'number', showWhen: (formData) => isMachineProfile(formData) || isTruckProfile(formData) },
    { key: 'serviceDueHours', label: 'Service Due Hours', type: 'number', showWhen: (formData) => isMachineProfile(formData) || isTruckProfile(formData) },
    { key: 'trailerMaintenanceCategories', label: 'Trailer Maintenance Categories', type: 'multiselect', options: trailerMaintenanceCategoryOptions, section: 'Trailer Maintenance', showWhen: isTrailerProfile },
    { key: 'trailerServiceNotes', label: 'Trailer Service Notes', type: 'textarea', showWhen: isTrailerProfile },
    { key: 'registrationNumber', label: 'Registration Number / Tag', section: 'Vehicle Compliance', showWhen: isVehicleProfile },
    { key: 'registrationExpirationDate', label: 'Registration Expiration', type: 'date', showWhen: isVehicleProfile },
    { key: 'registrationDocumentUrl', label: 'Registration Document URL', type: 'url', wide: true, showWhen: isVehicleProfile },
    { key: 'insuranceCompany', label: 'Insurance Company', showWhen: isVehicleProfile },
    { key: 'insurancePolicyNumber', label: 'Insurance Policy Number', showWhen: isVehicleProfile },
    { key: 'insuranceExpirationDate', label: 'Insurance Expiration', type: 'date', showWhen: isVehicleProfile },
    { key: 'insuranceDocumentUrl', label: 'Insurance Document URL', type: 'url', wide: true, showWhen: isVehicleProfile },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  assign_work: [
    { key: 'title', label: 'Work Order Title', required: true, section: 'Assignment Context' },
    { key: 'clientName', label: 'Client' },
    { key: 'projectName', label: 'Project' },
    {
      key: 'projectId',
      label: 'Project ID',
      placeholder: 'Auto-generated, for example BWCC-060426',
      hint: 'Project this job belongs to.',
    },
    { key: 'jobName', label: 'Job' },
    {
      key: 'jobId',
      label: 'Job ID',
      placeholder: 'Auto-generated, for example BWCC-060426-ROOTPRUNE-CR-060526-01',
      hint: 'Auto-generated, for example BWCC-060426-ROOTPRUNE-CR-060526-01. You can override it if needed.',
    },
    { key: 'division', label: 'Division', type: 'select', options: divisionOptions, defaultValue: relocationInstallationDivisionLabel },
    { key: 'workOrderType', label: 'Assignment Type', type: 'select', options: crewAssignmentTypeOptions, defaultValue: 'general_task' },
    { key: 'taskType', label: 'Task / Work To Perform' },
    { key: 'crewLeadName', label: 'Crew Lead', section: 'Who Is This For' },
    { key: 'assignedCrewNames', label: 'Assigned Crew / People' },
    { key: 'requiredSkills', label: 'Required Skills' },
    { key: 'scheduledDate', label: 'Start / Scheduled Date', type: 'date', section: 'When' },
    { key: 'dueDate', label: 'End / Due Date', type: 'date' },
    { key: 'siteArea', label: 'Work Location / Site Area', section: 'What They Need To Know' },
    { key: 'origin', label: 'Start Location' },
    { key: 'destination', label: 'Finish Location' },
    { key: 'equipmentNames', label: 'Equipment Needed' },
    { key: 'implementNames', label: 'Implements Needed' },
    { key: 'truckNames', label: 'Truck Needs' },
    { key: 'trailerNames', label: 'Trailer Needs' },
    { key: 'status', label: 'Status', type: 'select', options: workOrderStatusOptions, defaultValue: 'Draft', section: 'Status & Source' },
    { key: 'priority', label: 'Priority', type: 'select', options: workOrderPriorityOptions, defaultValue: 'Normal' },
    { key: 'sourceSheetName', label: 'Source Workbook Tab', type: 'select', options: Object.keys(jdtProjectFlowWorkbook.tabs) },
    { key: 'notes', label: 'Crew Instructions', type: 'textarea', wide: true },
  ],
  assign_equipment: [
    { key: 'title', label: 'Equipment Request Title', required: true, section: 'Equipment Request' },
    { key: 'clientName', label: 'Client' },
    { key: 'projectName', label: 'Project' },
    {
      key: 'projectId',
      label: 'Project ID',
      placeholder: 'Auto-generated, for example BWCC-060426',
      hint: 'Project this equipment request belongs to.',
    },
    { key: 'jobName', label: 'Job' },
    {
      key: 'jobId',
      label: 'Job ID',
      placeholder: 'Auto-generated, for example BWCC-060426-EQUIP-060526-01',
      hint: 'Auto-generated from project, request type, assignee if present, date, and sequence.',
    },
    { key: 'division', label: 'Division', type: 'select', options: divisionOptions, defaultValue: relocationInstallationDivisionLabel },
    { key: 'equipmentRequestType', label: 'Equipment Request Type', type: 'select', options: equipmentRequestTypeOptions, defaultValue: 'Add Equipment' },
    { key: 'equipmentSource', label: 'Equipment Source', type: 'select', options: equipmentSourceOptions, defaultValue: 'JD Thornton Equipment' },
    { key: 'rentalVendor', label: 'Rental Vendor', showWhen: usesRentalEquipment },
    { key: 'rentalContact', label: 'Rental Contact / Phone', showWhen: usesRentalEquipment },
    { key: 'rentalStartDate', label: 'Rental Start Date', type: 'date', showWhen: usesRentalEquipment },
    { key: 'rentalEndDate', label: 'Rental End Date', type: 'date', showWhen: usesRentalEquipment },
    { key: 'equipmentNames', label: 'Requested Equipment', section: 'Assets Needed' },
    { key: 'implementNames', label: 'Required Implements' },
    { key: 'truckNames', label: 'Truck Needs' },
    { key: 'trailerNames', label: 'Trailer Needs' },
    { key: 'assignedCrewNames', label: 'Crew / Operator Affected' },
    { key: 'scheduledDate', label: 'Needed Start Date', type: 'date', section: 'Timing & Location' },
    { key: 'dueDate', label: 'Return / End Date', type: 'date' },
    { key: 'origin', label: 'Current Location' },
    { key: 'destination', label: 'Needed At' },
    { key: 'siteArea', label: 'Site Area / Hole' },
    { key: 'status', label: 'Request Status', type: 'select', options: workOrderStatusOptions, defaultValue: 'Draft', section: 'Status & Notes' },
    { key: 'priority', label: 'Priority', type: 'select', options: workOrderPriorityOptions, defaultValue: 'Normal' },
    { key: 'notes', label: 'Equipment Request Notes', type: 'textarea', wide: true },
  ],
  assign_freight: [
    {
      key: 'title',
      label: 'Freight Request Title',
      required: true,
      section: 'Freight Request',
      hint: 'Creates a project work order. Use Freight > Create Dispatch Move for the driver route.',
    },
    { key: 'clientName', label: 'Client' },
    { key: 'projectName', label: 'Project' },
    {
      key: 'projectId',
      label: 'Project ID',
      placeholder: 'Auto-generated, for example BWCC-060426',
      hint: 'Project this freight request belongs to.',
    },
    { key: 'jobName', label: 'Job' },
    {
      key: 'jobId',
      label: 'Job ID',
      placeholder: 'Auto-generated, for example BWCC-060426-FREIGHT-CC-060526-01',
      hint: 'Auto-generated from project, freight need, assignee if present, date, and sequence.',
    },
    { key: 'division', label: 'Division', type: 'select', options: divisionOptions, defaultValue: relocationInstallationDivisionLabel },
    { key: 'taskType', label: 'Freight Need' },
    { key: 'equipmentNames', label: 'Equipment / Material To Move', section: 'Move Details' },
    { key: 'truckNames', label: 'Truck Needs' },
    { key: 'trailerNames', label: 'Trailer Needs' },
    { key: 'origin', label: 'Pickup / Start Location' },
    { key: 'destination', label: 'Delivery / Finish Location' },
    { key: 'siteArea', label: 'Site Area / Access Notes' },
    { key: 'scheduledDate', label: 'Needed Start Date', type: 'date', section: 'Timing' },
    { key: 'dueDate', label: 'Target Completion / End Date', type: 'date' },
    { key: 'status', label: 'Request Status', type: 'select', options: workOrderStatusOptions, defaultValue: 'Draft', section: 'Status & Notes' },
    { key: 'priority', label: 'Priority', type: 'select', options: workOrderPriorityOptions, defaultValue: 'Normal' },
    { key: 'loadNames', label: 'Linked Dispatch Moves' },
    { key: 'notes', label: 'Freight Request Notes', type: 'textarea', wide: true },
  ],
  project_material_item: [
    { key: 'projectName', label: 'Project', required: true },
    { key: 'holeNumberOrArea', label: 'Hole / Area' },
    { key: 'source', label: 'Source', type: 'select', options: ['JD Thornton', 'Container Pines', 'McArthur Tree Nursery', 'Relocated Trees', 'Client Supplied', 'Other'] },
    { key: 'materialType', label: 'Material Type', required: true },
    { key: 'sizeClass', label: 'Size / Class', type: 'select', options: ['3g', '7g', '15g', '25g', '45g', 'Medium', 'Large', 'Extra Large', 'B&B', 'Field Grown', 'Custom'] },
    { key: 'quantityRequired', label: 'Quantity Required', type: 'number' },
    { key: 'quantityInstalled', label: 'Quantity Installed', type: 'number' },
    { key: 'unitPrice', label: 'Unit Price', type: 'number' },
    { key: 'installStatus', label: 'Install Status', type: 'select', options: ['Needed', 'Pulled', 'Loaded', 'Delivered', 'Installed', 'Rejected', 'Complete', 'On Hold'] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  generic: [
    { key: 'title', label: 'Title' },
    { key: 'status', label: 'Status' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
};

function canonicalType(type: string) {
  const normalized = type.replace(/^edit_/, '');
  if (['assign_equipment'].includes(normalized)) return 'assign_equipment';
  if (['assign_freight'].includes(normalized)) return 'assign_freight';
  if (['assign_work', 'assign_crew', 'work_order', 'workorder'].includes(normalized)) return 'assign_work';
  if (['project_material_item', 'projectmaterialitem', 'material_item'].includes(normalized)) return 'project_material_item';
  if (['project', 'change_order', 'delay'].includes(normalized)) return 'job';
  if (['spot_vehicle', 'drop_trailer', 'hook_trailer', 'mark_vehicle_empty', 'mark_vehicle_loaded'].includes(normalized)) return 'vehicleActivity';
  if (['advance_freight_stop'].includes(normalized)) return 'freightStopProgress';
  if (['complete_freight_route_step'].includes(normalized)) return 'freightRouteStep';
  if (['complete_freight_pod'].includes(normalized)) return 'freightPod';
  if (['report_vehicle_issue'].includes(normalized)) return 'vehicleIssue';
  if (['freight', 'create_move', 'set_freight_status', 'complete'].includes(normalized)) return 'load';
  if (['ranch_oak', 'edit_tree'].includes(normalized)) return 'ranchOak';
  if (['propagation', 'edit_propagation'].includes(normalized)) return 'propagation';
  if (['add_tree', 'log_prune', 'treatment', 'move_check', 'assign_tree'].includes(normalized)) return 'tree';
  if (['project_tree_asset', 'project_tree_pruning', 'project_tree_aftercare', 'project_tree_photo'].includes(normalized)) return normalized;
  if (['maintenance', 'log_issue', 'set_eq_status'].includes(normalized)) return 'equipment';
  if (['crew'].includes(normalized)) return 'employee';
  if (['contact'].includes(normalized)) return 'contact';
  if (['sync_source', 'syncsource'].includes(normalized)) return 'syncSource';
  if (['sync_mapping', 'syncmapping'].includes(normalized)) return 'syncMapping';
  return fieldSets[normalized] ? normalized : 'generic';
}

function normalizeListFields(formData: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(
    keys
      .filter((key) => Object.prototype.hasOwnProperty.call(formData, key))
      .map((key) => [key, normalizeResourceList(formData[key])]),
  );
}

function stripTransientFormData<T extends Record<string, unknown>>(formData: T): T {
  const cleaned = { ...formData };
  delete cleaned.projectSiteAddressOptions;
  return cleaned;
}

function withAssignmentIntentDefaults(type: string, formData: Record<string, unknown>) {
  const normalized = type.replace(/^edit_/, '');
  const hasValue = (key: string) => String(formData[key] ?? '').trim().length > 0;

  if (normalized === 'assign_equipment') {
    return {
      ...formData,
      division: hasValue('division') ? formData.division : relocationInstallationDivisionLabel,
      workOrderType: hasValue('workOrderType') ? formData.workOrderType : 'equipment',
      taskType: hasValue('taskType') ? formData.taskType : 'Equipment change request',
      status: hasValue('status') ? formData.status : 'Draft',
      priority: hasValue('priority') ? formData.priority : 'Normal',
    };
  }

  if (normalized === 'assign_freight') {
    return {
      ...formData,
      division: hasValue('division') ? formData.division : relocationInstallationDivisionLabel,
      workOrderType: hasValue('workOrderType') ? formData.workOrderType : 'freight',
      taskType: hasValue('taskType') ? formData.taskType : 'Freight support request',
      status: hasValue('status') ? formData.status : 'Draft',
      priority: hasValue('priority') ? formData.priority : 'Normal',
    };
  }

  if (['assign_work', 'assign_crew', 'work_order', 'workorder'].includes(normalized)) {
    return {
      ...formData,
      division: hasValue('division') ? formData.division : relocationInstallationDivisionLabel,
      workOrderType: hasValue('workOrderType') ? formData.workOrderType : 'general_task',
      status: hasValue('status') ? formData.status : 'Draft',
      priority: hasValue('priority') ? formData.priority : 'Normal',
    };
  }

  return formData;
}

function initialFormData(data: any, fields: FieldConfig[]) {
  const base = { ...(data || {}) };
  for (const field of fields) {
    if (base[field.key] === undefined) {
      base[field.key] = field.defaultValue ?? (field.type === 'checkbox' ? false : '');
    }
  }
  return base;
}

function hasProjectContext(data: Record<string, unknown>) {
  return Boolean(String(data.projectId || data.projectsId || data.projectName || '').trim());
}

function ProjectContextPanel({ formData }: { formData: Record<string, unknown> }) {
  if (!hasProjectContext(formData)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
          <div>
            <p className="text-xs font-black uppercase tracking-wide">Project context required</p>
            <p className="mt-1 text-xs font-bold">Open this form from a Project Profile so the tree is saved to the correct client, project, and job.</p>
          </div>
        </div>
      </div>
    );
  }

  const contextLine = [
    formData.clientName,
    formData.projectName || formData.projectId || formData.projectsId,
    formData.jobName || formData.jobId,
  ].map((value) => String(value || '').trim()).filter(Boolean).join(' > ');

  return (
    <div className="rounded-xl border border-jdt-border bg-jdt-sand p-4">
      <p className="text-[10px] font-black uppercase tracking-wide text-jdt-primary">Saving To Project</p>
      <p className="mt-1 text-sm font-black text-jdt-text">{contextLine}</p>
    </div>
  );
}

function initialStopCount(data: any) {
  if (Array.isArray(data?.stops) && data.stops.length > 0) return data.stops.length;
  const stopNumbers = Object.keys(data || {})
    .map((key) => key.match(/^stop(\d+)/)?.[1])
    .filter(Boolean)
    .map(Number);
  return Math.max(1, ...stopNumbers.filter((value) => Number.isFinite(value)));
}

function loadFormDataFromRecord(data: any) {
  const base = { ...(data || {}) };
  if (!Array.isArray(data?.stops)) return base;

  data.stops.forEach((stop: any, index: number) => {
    const stopNumber = index + 1;
    base[`stop${stopNumber}Type`] = stop.type || '';
    base[`stop${stopNumber}LoadCategory`] = stop.loadCategory || '';
    base[`stop${stopNumber}EquipmentName`] = stop.equipmentName || '';
    base[`stop${stopNumber}TrailerName`] = stop.trailerName || '';
    base[`stop${stopNumber}MainAddress`] = stop.mainAddress || stop.address || '';
    base[`stop${stopNumber}ConstructionAccessPin`] = stop.constructionAccessPin || '';
    base[`stop${stopNumber}LoadUnloadPin`] = stop.loadUnloadPin || stop.location || '';
    base[`stop${stopNumber}RequestedTime`] = stop.requestedTime || stop.window || '';
    base[`stop${stopNumber}SiteContactName`] = stop.siteContactName || '';
    base[`stop${stopNumber}SiteContactPhone`] = stop.siteContactPhone || '';
    base[`stop${stopNumber}SaveLocation`] = Boolean(stop.saveLocation);
    base[`stop${stopNumber}SaveContact`] = Boolean(stop.saveContact);
    base[`stop${stopNumber}Notes`] = stop.notes || '';
  });

  return base;
}

function ranchOakFormDataFromRecord(data: any) {
  const base = { ...(data || {}) };
  const additionalImages = Array.isArray(data?.imageUrls) ? data.imageUrls : [];
  ['imageUrl2', 'imageUrl3', 'imageUrl4', 'imageUrl5'].forEach((key, index) => {
    if (base[key] === undefined) base[key] = additionalImages[index] || '';
  });
  return base;
}

function fieldsForType(resolvedType: string, stopCount: number) {
  const baseFields = fieldSets[resolvedType] || fieldSets.generic;
  if (resolvedType !== 'load') return baseFields;

  return baseFields.flatMap((field) => (
    field.key === 'eta'
      ? [field, ...buildLoadStopFields(stopCount)]
      : [field]
  ));
}

function uniqueTextOptions(values: unknown[]): string[] {
  const expandValue = (value: unknown): string[] => {
    if (Array.isArray(value)) return value.flatMap(expandValue);
    return [String(value || '').trim()].filter(Boolean);
  };
  const seen = new Set<string>();
  const options: string[] = [];
  for (const value of values.flatMap(expandValue)) {
    const clean = String(value || '').trim();
    const key = clean.toLowerCase();
    if (!clean || seen.has(key)) continue;
    seen.add(key);
    options.push(clean);
  }
  return options;
}

function valuesFromRecords(records: any[], keys: string[]): string[] {
  return records.flatMap((record) => keys.map((key) => record?.[key]));
}

function cleanIdentity(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function firstCleanText(values: unknown[]): string {
  return values.map((value) => String(value || '').trim()).find(Boolean) || '';
}

function optionLocationType(record: any, fallback = 'Unknown'): string {
  const directType = firstCleanText([record?.currentLocationType, record?.locationType]);
  if (equipmentLocationTypeOptions.includes(directType)) return directType;

  const signal = firstCleanText([
    record?.accessType,
    record?.division,
    Array.isArray(record?.divisionUse) ? record.divisionUse.join(' ') : record?.divisionUse,
    record?.sourceSheet,
    record?.sourceText,
    record?.name,
    record?.title,
  ]).toLowerCase();
  if (signal.includes('farm') || signal.includes('nursery')) return 'Farm';
  if (signal.includes('shop') || signal.includes('maintenance')) return 'Shop';
  if (signal.includes('transit')) return 'In Transit';
  if (signal) return 'Job Site';
  return fallback;
}

function locationAddressValues(record: any): string[] {
  return uniqueTextOptions([
    record?.mainAddress,
    record?.locationAddress,
    record?.address,
    record?.sourceText,
    record?.crewAccessAddress,
    record?.truckAccessAddress,
    record?.constructionAccessPin,
    record?.loadUnloadPin,
    record?.secondaryLoadUnloadPin,
    record?.coordinateText,
    record?.googleMapsUrl,
  ]);
}

function pushEquipmentLocationOption(options: EquipmentLocationOption[], option: EquipmentLocationOption) {
  const name = String(option.name || '').trim();
  const addresses = uniqueTextOptions(option.addresses || []);
  if (!name) return;

  const key = name.toLowerCase();
  const existing = options.find((item) => item.name.toLowerCase() === key);
  if (existing) {
    existing.addresses = uniqueTextOptions([...existing.addresses, ...addresses]);
    if (existing.locationType === 'Unknown' && option.locationType) existing.locationType = option.locationType;
    return;
  }

  options.push({
    name,
    addresses,
    locationType: option.locationType || 'Unknown',
  });
}

const projectLocationFields = [
  { key: 'location', suffix: '', type: 'Job Site' },
  { key: 'address', suffix: '', type: 'Job Site' },
  { key: 'site', suffix: '', type: 'Job Site' },
  { key: 'crewAccessAddress', suffix: ' - Crew Access', type: 'Job Site' },
  { key: 'truckAccessAddress', suffix: ' - Truck / Equipment Access', type: 'Job Site' },
  { key: 'constructionAccessPin', suffix: ' - Construction / Equipment Access Pin', type: 'Job Site' },
  { key: 'loadUnloadPin', suffix: ' - Load / Unload Pin', type: 'Job Site' },
  { key: 'secondaryLoadUnloadPin', suffix: ' - Additional Load / Unload Pin', type: 'Job Site' },
] as const;

function buildEquipmentLocationOptions({
  jobsList,
  locationsList,
  equipmentList,
}: {
  jobsList: any[];
  locationsList: any[];
  equipmentList: any[];
}): EquipmentLocationOption[] {
  const options: EquipmentLocationOption[] = [];

  pushEquipmentLocationOption(options, {
    name: jdtHomeBase.name,
    addresses: [jdtHomeBase.address],
    locationType: jdtHomeBase.locationType,
  });

  locationsList.forEach((location) => {
    const name = firstCleanText([location?.name, location?.title, location?.locationName, location?.locationId]);
    pushEquipmentLocationOption(options, {
      name,
      addresses: locationAddressValues(location),
      locationType: optionLocationType(location),
    });
  });

  jobsList.forEach((job) => {
    const projectName = firstCleanText([job?.projectName, job?.title, job?.name, job?.jobName, job?.projectId, job?.id]);
    if (!projectName) return;

    const projectAddresses = uniqueTextOptions(projectLocationFields.map((field) => job?.[field.key]));
    pushEquipmentLocationOption(options, {
      name: projectName,
      addresses: projectAddresses,
      locationType: 'Job Site',
    });

    projectLocationFields.forEach((field) => {
      const address = String(job?.[field.key] || '').trim();
      if (!address || !field.suffix) return;
      pushEquipmentLocationOption(options, {
        name: `${projectName}${field.suffix}`,
        addresses: [address],
        locationType: field.type,
      });
    });
  });

  equipmentList.forEach((equipment) => {
    pushEquipmentLocationOption(options, {
      name: firstCleanText([equipment?.currentLocationName, equipment?.location]),
      addresses: [equipment?.currentLocation].filter(Boolean),
      locationType: optionLocationType(equipment),
    });
  });

  return options;
}

function equipmentLocationNameSuggestions(options: EquipmentLocationOption[], currentValue?: unknown): string[] {
  return uniqueTextOptions([...options.map((option) => option.name), currentValue]);
}

function equipmentLocationAddressSuggestions(options: EquipmentLocationOption[], currentValue?: unknown): string[] {
  return uniqueTextOptions([...options.flatMap((option) => option.addresses), currentValue]);
}

function findEquipmentLocationOption(options: EquipmentLocationOption[], name: unknown): EquipmentLocationOption | undefined {
  const target = cleanIdentity(name);
  if (!target) return undefined;
  return options.find((option) => cleanIdentity(option.name) === target);
}

function isHomeBaseLocationValue(value: unknown) {
  const clean = cleanIdentity(value);
  return clean === cleanIdentity(jdtHomeBase.name) || clean === cleanIdentity(jdtHomeBase.address);
}

function shouldReplaceStaleEquipmentLocation(data: Record<string, unknown>, selectedLocation?: EquipmentLocationOption) {
  if (!selectedLocation) return false;

  const currentName = String(data.currentLocationName || '').trim();
  const currentAddress = String(data.currentLocation || '').trim();
  const assignedProjectName = String(data.assignedProjectName || data.projectName || '').trim();
  const jobSiteIntent = String(data.currentLocationType || '').trim() === 'Job Site' || Boolean(assignedProjectName);
  const currentNameIsReplaceable = !currentName || isHomeBaseLocationValue(currentName);
  const currentAddressIsReplaceable = !currentAddress || isHomeBaseLocationValue(currentAddress) || currentAddress === currentName;

  return jobSiteIntent && currentNameIsReplaceable && currentAddressIsReplaceable;
}

function resolveEquipmentProjectLocation(data: Record<string, unknown>, options: EquipmentLocationOption[]) {
  const projectLocationName = firstCleanText([data.assignedProjectName, data.projectName]);
  const selectedLocation = findEquipmentLocationOption(options, projectLocationName);
  if (!shouldReplaceStaleEquipmentLocation(data, selectedLocation)) return data;

  return {
    ...data,
    currentLocationName: selectedLocation?.name || projectLocationName,
    ...(selectedLocation?.addresses?.[0] ? { currentLocation: selectedLocation.addresses[0] } : {}),
    currentLocationType: selectedLocation?.locationType || 'Job Site',
  };
}

function savedLocationMatchesFormContext(location: any, data: Record<string, unknown>) {
  const contextValues = [
    data?.jobId,
    data?.jobName,
    data?.projectId,
    data?.projectsId,
    data?.projectName,
    data?.clientId,
    data?.clientName,
    data?.client,
  ].map(cleanIdentity).filter(Boolean);
  if (!contextValues.length) return true;

  const locationScopeValues = [
    location?.jobId,
    location?.jobName,
    location?.projectId,
    location?.projectsId,
    location?.projectName,
    location?.clientId,
    location?.clientName,
    location?.client,
  ].map(cleanIdentity).filter(Boolean);

  if (!locationScopeValues.length) return true;
  return locationScopeValues.some((value) => contextValues.includes(value));
}

function savedLocationSuggestionValues(location: any): string[] {
  return [
    location?.name,
    location?.title,
    location?.locationName,
    location?.mainAddress,
    location?.locationAddress,
    location?.address,
    location?.crewAccessAddress,
    location?.truckAccessAddress,
    location?.constructionAccessPin,
    location?.loadUnloadPin,
    location?.secondaryLoadUnloadPin,
    location?.coordinateText,
    location?.googleMapsUrl,
    location?.sourceText,
  ].filter(Boolean).map(String);
}

function personName(person: any): string {
  return String(person?.name || person?.fullName || person?.displayName || '').trim();
}

function isDriver(person: any): boolean {
  const roleSignals = [
    person?.role,
    person?.type,
    person?.crewAllocation,
    person?.primaryRole,
    person?.title,
  ].map((value) => String(value || '').toLowerCase());
  return roleSignals.some((value) => value.includes('driver'));
}

function namesForEquipmentCategory(equipmentList: any[], category: string): string[] {
  return equipmentList
    .filter((equipment) => equipmentCategory(equipment) === category)
    .map((equipment) => equipmentDisplayName(equipment));
}

function listWithCurrent(options: unknown[], current: unknown): string[] {
  return uniqueTextOptions([...options, current]);
}

function enrichFieldsWithSuggestions(
  resolvedType: string,
  fields: FieldConfig[],
  data: any,
  lists: Pick<EntityFormsProps, 'jobsList' | 'equipmentList' | 'crewsList' | 'clientsList' | 'locationsList' | 'workOrders' | 'projectMaterialItems'>,
) {
  const jobsList = lists.jobsList || [];
  const equipmentList = lists.equipmentList || [];
  const crewsList = lists.crewsList || [];
  const clientsList = lists.clientsList || [];
  const locationsList = lists.locationsList || [];
  const workOrders = lists.workOrders || [];
  const projectMaterialItems = lists.projectMaterialItems || [];

  const projectNames = uniqueTextOptions([
    ...valuesFromRecords(jobsList, ['title', 'name', 'projectName']),
    ...valuesFromRecords(workOrders, ['projectName']),
    ...valuesFromRecords(projectMaterialItems, ['projectName']),
  ]);
  const jobNames = uniqueTextOptions([
    ...valuesFromRecords(jobsList, ['jobName', 'title', 'name']),
    ...valuesFromRecords(workOrders, ['jobName', 'title']),
  ]);
  const clientNames = uniqueTextOptions([
    ...valuesFromRecords(clientsList, ['name', 'company', 'companyName']),
    ...valuesFromRecords(jobsList, ['client', 'clientName']),
    ...valuesFromRecords(workOrders, ['clientName']),
  ]);
  const crewNames = uniqueTextOptions(crewsList.map(personName));
  const driverNames = uniqueTextOptions(crewsList.filter(isDriver).map(personName));
  const equipmentNames = uniqueTextOptions(equipmentList.map((equipment) => equipmentDisplayName(equipment)));
  const truckNames = uniqueTextOptions(namesForEquipmentCategory(equipmentList, 'Truck'));
  const trailerNames = uniqueTextOptions(namesForEquipmentCategory(equipmentList, 'Trailer'));
  const implementNames = uniqueTextOptions(namesForEquipmentCategory(equipmentList, 'Implement'));
  const truckTypeNames = uniqueTextOptions([
    ...truckTypeOptions,
    ...valuesFromRecords(equipmentList.filter((equipment) => equipmentCategory(equipment) === 'Truck'), ['truckType', 'type', 'eqType']),
  ]);
  const trailerTypeNames = uniqueTextOptions([
    ...trailerTypeOptions,
    ...valuesFromRecords(equipmentList.filter((equipment) => equipmentCategory(equipment) === 'Trailer'), ['trailerType', 'type', 'eqType']),
  ]);
  const machineTypeNames = uniqueTextOptions([
    ...equipmentTypeOptions.filter((option) => !['Truck', 'Trailer', 'Implement', 'Tool'].includes(option)),
    ...valuesFromRecords(equipmentList.filter((equipment) => equipmentCategory(equipment) === 'Machine'), ['eqType', 'type']),
  ]);
  const implementTypeNames = uniqueTextOptions([
    ...implementTypeOptions,
    ...valuesFromRecords(equipmentList.filter((equipment) => equipmentCategory(equipment) === 'Implement'), ['implementType', 'type', 'eqType']),
  ]);
  const siteContacts = clientsList.flatMap((client) => [
    ...(Array.isArray(client?.members) ? client.members : []),
    {
      name: client?.contactName,
      phone: client?.phone,
      email: client?.email,
    },
  ]);
  const siteContactNames = uniqueTextOptions(valuesFromRecords(siteContacts, ['name', 'contactName']));
  const siteContactPhones = uniqueTextOptions(valuesFromRecords(siteContacts, ['phone', 'mobile', 'cell']));
  const projectSiteAddressOptions = uniqueTextOptions(Array.isArray(data?.projectSiteAddressOptions) ? data.projectSiteAddressOptions : []);
  const savedLocationOptions = uniqueTextOptions(
    locationsList
      .filter((location) => savedLocationMatchesFormContext(location, data || {}))
      .flatMap(savedLocationSuggestionValues),
  );
  const scopedLocationRecords = locationsList.filter((location) => savedLocationMatchesFormContext(location, data || {}));
  const equipmentLocationOptions = buildEquipmentLocationOptions({
    jobsList,
    locationsList: scopedLocationRecords,
    equipmentList,
  });
  const locations = uniqueTextOptions([
    ...defaultFreightLocationOptions,
    ...savedLocationOptions,
    ...valuesFromRecords(jobsList, ['location', 'site', 'address', 'crewAccessAddress', 'truckAccessAddress', 'constructionAccessPin', 'loadUnloadPin', 'secondaryLoadUnloadPin']),
    ...valuesFromRecords(clientsList, ['billingAddress', 'address', 'siteAddress']),
    ...valuesFromRecords(equipmentList, ['currentLocationName', 'currentLocation', 'location']),
    ...valuesFromRecords(workOrders, ['origin', 'destination', 'siteArea']),
  ]);
  const scopedLocations = projectSiteAddressOptions.length > 0
    ? uniqueTextOptions([...projectSiteAddressOptions, ...savedLocationOptions])
    : locations;

  return fields.map((field) => {
    const currentValue = data?.[field.key];
    if (field.key === 'driver') return { ...field, type: 'text' as const, suggestions: listWithCurrent(driverNames, currentValue) };
    if (field.key === 'requiredTrailerType') return { ...field, type: 'text' as const, suggestions: listWithCurrent(['Any Trailer Type', ...trailerTypeNames], currentValue) };
    if (field.key === 'trailerMaintenanceCategories') return { ...field, suggestions: listWithCurrent(trailerMaintenanceCategoryOptions, currentValue) };
    if (field.key === 'truckType') return { ...field, options: listWithCurrent(truckTypeNames, currentValue) };
    if (field.key === 'trailerType') return { ...field, options: listWithCurrent(trailerTypeNames, currentValue) };
    if (field.key === 'eqType') return { ...field, options: listWithCurrent(equipmentTypeOptions, currentValue) };
    if (field.key === 'implementType') return { ...field, options: listWithCurrent(implementTypeNames, currentValue) };
    if (field.key === 'compatibleTruckTypes') return { ...field, options: listWithCurrent(truckNames, currentValue) };
    if (field.key === 'compatibleTrailerTypes') return { ...field, options: listWithCurrent(trailerNames, currentValue) };
    if (field.key === 'compatibleMachineTypes') return { ...field, options: listWithCurrent(machineTypeNames, currentValue) };
    if (['projectName', 'assignedProjectName'].includes(field.key)) return { ...field, suggestions: listWithCurrent(projectNames, currentValue) };
    if (['jobName', 'job'].includes(field.key)) return { ...field, suggestions: listWithCurrent(jobNames, currentValue) };
    if (['client', 'clientName', 'company'].includes(field.key)) return { ...field, suggestions: listWithCurrent(clientNames, currentValue) };
    if (['crewLeadName', 'assignedCrewName', 'assignedCrewNames', 'reportedBy', 'operator', 'pm'].includes(field.key)) {
      return { ...field, suggestions: listWithCurrent(crewNames, currentValue) };
    }
    if (['truck', 'assignedTruck', 'truckNames'].includes(field.key)) return { ...field, type: 'text' as const, suggestions: listWithCurrent(truckNames, currentValue) };
    if (['trailer', 'trailerNames'].includes(field.key)) return { ...field, type: 'text' as const, suggestions: listWithCurrent(trailerNames, currentValue) };
    if (/^stop\d+TrailerName$/.test(field.key)) return { ...field, suggestions: listWithCurrent(trailerNames, currentValue) };
    if (/^stop\d+EquipmentName$/.test(field.key)) return { ...field, suggestions: listWithCurrent(equipmentNames, currentValue) };
    if (/^stop\d+SiteContactName$/.test(field.key)) return { ...field, suggestions: listWithCurrent(siteContactNames, currentValue) };
    if (/^stop\d+SiteContactPhone$/.test(field.key)) return { ...field, suggestions: listWithCurrent(siteContactPhones, currentValue) };
    if (['equipmentNames', 'linkedEquipment', 'attachedImplementNames'].includes(field.key)) {
      return { ...field, suggestions: listWithCurrent(equipmentNames, currentValue) };
    }
    if (field.key === 'compatibleImplementTypes') {
      return { ...field, options: listWithCurrent(implementNames, currentValue) };
    }
    if (['implementNames'].includes(field.key)) {
      return { ...field, suggestions: listWithCurrent([...implementNames, ...implementTypeOptions], currentValue) };
    }
    if (field.key === 'currentLocationName') {
      return {
        ...field,
        suggestions: equipmentLocationNameSuggestions(equipmentLocationOptions, currentValue),
        hint: field.hint || 'Choose a saved project, farm, shop, or site pin name first.',
      };
    }
    if (field.key === 'currentLocation') {
      return {
        ...field,
        suggestions: equipmentLocationAddressSuggestions(equipmentLocationOptions, currentValue),
        hint: field.hint || 'Main address, access point, Google Maps link, or lat,long pin tied to the selected location name.',
      };
    }
    if ([
      'origin',
      'delivery',
      'destination',
      'location',
      'locationName',
      'locationAddress',
      'siteArea',
      'crewAccessAddress',
      'truckAccessAddress',
      'constructionAccessPin',
      'loadUnloadPin',
      'secondaryLoadUnloadPin',
    ].includes(field.key)) {
      return { ...field, suggestions: listWithCurrent(scopedLocations, currentValue) };
    }
    if (/^stop\d+(Location|Address|MainAddress|ConstructionAccessPin|LoadUnloadPin)$/.test(field.key)) {
      return { ...field, suggestions: listWithCurrent(scopedLocations, currentValue) };
    }
    return field;
  });
}

function suggestionListId(resolvedType: string, fieldKey: string) {
  return `${resolvedType}-${fieldKey}-suggestions`.replace(/[^a-zA-Z0-9_-]/g, '-');
}

function LoadStopControls({ onAddStop }: { onAddStop: () => void }) {
  return (
    <div className="sm:col-span-2 flex flex-wrap items-center gap-3 border-t border-jdt-border pt-4">
      <button
        type="button"
        onClick={() => window.open(`https://www.google.com/maps/@${jdtHomeBase.coordinates.lat},${jdtHomeBase.coordinates.lng},17z`, '_blank', 'noopener,noreferrer')}
        className="inline-flex items-center gap-2 rounded-lg border border-jdt-border bg-white px-4 py-2.5 text-xs font-black uppercase text-jdt-text hover:border-jdt-olive"
      >
        <MapPin className="h-4 w-4 text-jdt-olive" /> Open Google Maps
      </button>
      <button
        type="button"
        onClick={onAddStop}
        className="inline-flex items-center gap-2 rounded-lg border border-jdt-border bg-white px-4 py-2.5 text-xs font-black uppercase text-jdt-text hover:border-jdt-olive"
      >
        <Plus className="h-4 w-4 text-jdt-olive" /> Add Another Stop
      </button>
    </div>
  );
}

export default function EntityForms({
  type,
  onClose,
  openModal,
  onSaveRecord,
  data,
  jobsList = [],
  equipmentList = [],
  crewsList = [],
  clientsList = [],
  locationsList = [],
  workOrders = [],
  projectMaterialItems = [],
  submitLabel = 'Save Record',
}: EntityFormsProps) {
  const resolvedType = canonicalType(type);
  const formSeed = useMemo(() => (
    resolvedType === 'load'
      ? loadFormDataFromRecord(data)
      : resolvedType === 'ranchOak'
        ? ranchOakFormDataFromRecord(data)
        : data
  ), [resolvedType, data]);
  const [stopCount, setStopCount] = useState(() => initialStopCount(formSeed));
  const equipmentLocationOptions = useMemo(
    () => buildEquipmentLocationOptions({
      jobsList,
      locationsList,
      equipmentList,
    }),
    [jobsList, locationsList, equipmentList],
  );
  const resolvedFormSeed = useMemo(
    () => resolvedType === 'equipment' ? resolveEquipmentProjectLocation(formSeed || {}, equipmentLocationOptions) : (formSeed || {}),
    [resolvedType, formSeed, equipmentLocationOptions],
  );
  const fields = useMemo(
    () => enrichFieldsWithSuggestions(
      resolvedType,
      fieldsForType(resolvedType, stopCount),
      resolvedFormSeed || {},
      { jobsList, equipmentList, crewsList, clientsList, locationsList, workOrders, projectMaterialItems },
    ),
    [resolvedType, stopCount, resolvedFormSeed, jobsList, equipmentList, crewsList, clientsList, locationsList, workOrders, projectMaterialItems],
  );
  const [formData, setFormData] = useState<any>(() => initialFormData(resolvedFormSeed, fields));
  const [formError, setFormError] = useState('');
  const requiresProjectContext = projectTreeFormTypes.has(resolvedType);
  const missingProjectContext = requiresProjectContext && !hasProjectContext(formData);

  useEffect(() => {
    if (resolvedType !== 'equipment') return;
    setFormData((prev: any) => {
      const next = resolveEquipmentProjectLocation(prev, equipmentLocationOptions);
      return next === prev ? prev : next;
    });
  }, [resolvedType, equipmentLocationOptions]);

  const handleChange = (key: string, value: any) => {
    setFormError('');
    if (resolvedType === 'equipment' && ['assignedProjectName', 'projectName', 'currentLocationType'].includes(key)) {
      setFormData((prev: any) => resolveEquipmentProjectLocation({ ...prev, [key]: value }, equipmentLocationOptions));
      return;
    }
    if (resolvedType === 'equipment' && key === 'currentLocationName') {
      setFormData((prev: any) => {
        const selectedLocation = findEquipmentLocationOption(equipmentLocationOptions, value);
        const previousLocation = findEquipmentLocationOption(equipmentLocationOptions, prev.currentLocationName);
        const currentAddress = String(prev.currentLocation || '').trim();
        const previousAddress = String(previousLocation?.addresses?.[0] || '').trim();
        const previousName = String(prev.currentLocationName || '').trim();
        const shouldReplaceAddress = !currentAddress || currentAddress === previousAddress || currentAddress === previousName;
        return {
          ...prev,
          [key]: value,
          ...(selectedLocation?.addresses?.[0] && shouldReplaceAddress ? { currentLocation: selectedLocation.addresses[0] } : {}),
          ...(selectedLocation?.locationType ? { currentLocationType: selectedLocation.locationType } : {}),
        };
      });
      return;
    }
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleMultiSelectChange = (key: string, option: string, checked: boolean) => {
    setFormError('');
    setFormData((prev: any) => {
      const currentValues = normalizeResourceList(prev[key]);
      const nextValues = checked
        ? Array.from(new Set([...currentValues, option]))
        : currentValues.filter((value) => value !== option);
      return { ...prev, [key]: nextValues };
    });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (missingProjectContext) {
      setFormError('Project context required before saving this tree record.');
      return;
    }
    const normalizedFormData = stripTransientFormData(withAssignmentIntentDefaults(type, {
      ...formData,
      ...(resolvedType === 'ranchOak' ? {
        imageUrls: ['imageUrl2', 'imageUrl3', 'imageUrl4', 'imageUrl5']
          .map((key) => String(formData[key] || '').trim())
          .filter(Boolean),
      } : {}),
      ...(resolvedType === 'propagation' ? {
        inventoryClass: 'Propagation',
        sourceCollection: 'inventoryItems',
        internalUseOnly: true,
        status: formData.status || formData.plantHealthStatus || 'Rooting',
      } : {}),
      ...normalizeListFields(formData, [
        'assignedCrewNames',
        'assignedCrewIds',
        'requiredSkills',
        'equipmentNames',
        'equipmentIds',
        'implementNames',
        'implementIds',
        'requiredImplementTypes',
        'loadNames',
        'loadIds',
        'truckNames',
        'truckIds',
        'trailerNames',
        'trailerIds',
        'treeIds',
        'treeNames',
        'compatibleTruckTypes',
        'compatibleTrailerTypes',
        'compatibleMachineTypes',
        'compatibleImplementTypes',
        'attachedImplementNames',
        'attachedImplementIds',
        'trailerMaintenanceCategories',
      ]),
    }));
    onSaveRecord(type, normalizedFormData);
    onClose();
  };

  const handleAddStop = () => {
    setStopCount((current: number) => {
      const next = current + 1;
      setFormData((prev: any) => initialFormData(prev, buildLoadStopFields(next)));
      return next;
    });
  };

  if (type === 'add_new') {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {addNewOptions.map(({ type: optionType, label, icon: Icon }) => (
          <button
            type="button"
            key={optionType}
            onClick={() => openModal(optionType)}
            className="flex items-center justify-between gap-4 rounded-xl border border-jdt-border bg-white p-4 text-left hover:border-jdt-olive transition-colors"
          >
            <span className="flex items-center gap-3 text-sm font-black text-jdt-text">
              <Icon className="h-5 w-5 text-jdt-olive" /> {label}
            </span>
            <FilePlus className="h-4 w-4 text-zinc-400" />
          </button>
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {requiresProjectContext ? <ProjectContextPanel formData={formData} /> : null}
      {formError ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-800">{formError}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.filter((field) => !field.showWhen || field.showWhen(formData)).map((field, index, visibleFields) => {
          const showSection = Boolean(field.section && field.section !== visibleFields[index - 1]?.section);
          const fieldClassName = field.type === 'textarea' || field.wide ? 'sm:col-span-2 block' : 'block';

          return (
            <React.Fragment key={field.key}>
              {resolvedType === 'load' && field.key === 'driverNotes' ? <LoadStopControls onAddStop={handleAddStop} /> : null}
              {showSection ? (
                <div className="sm:col-span-2 border-t border-jdt-border pt-4 first:border-t-0 first:pt-0">
                  <h4 className="text-xs font-black uppercase tracking-[0.16em] text-jdt-primary">{field.section}</h4>
                </div>
              ) : null}
              <label className={fieldClassName}>
                <span className="block text-[10px] font-black uppercase text-zinc-500 mb-1.5">{field.label}</span>
                {field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.key] || ''}
                    onChange={(event) => handleChange(field.key, event.target.value)}
                    rows={field.rows || (field.key === 'stepPlanText' ? 7 : 4)}
                    className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500"
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                  />
                ) : field.type === 'checkbox' ? (
                  <span className="flex h-10 items-center gap-2 rounded-lg border border-jdt-border bg-jdt-panel px-3">
                    <input
                      type="checkbox"
                      checked={Boolean(formData[field.key])}
                      onChange={(event) => handleChange(field.key, event.target.checked)}
                      className="h-4 w-4 rounded border-jdt-border text-jdt-primary"
                    />
                    <span className="text-sm font-bold text-jdt-text">Yes</span>
                  </span>
                ) : field.type === 'select' ? (
                  <select
                    value={formData[field.key] || ''}
                    onChange={(event) => handleChange(field.key, event.target.value)}
                    required={field.required}
                    className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500"
                  >
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {(field.options || []).map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                ) : field.type === 'multiselect' ? (
                  <div className="rounded-lg border border-jdt-border bg-jdt-panel p-2">
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {(field.options || field.suggestions || []).map((option) => {
                        const selectedValues = normalizeResourceList(formData[field.key]);
                        return (
                          <label key={option} className="flex items-center gap-2 rounded-md bg-white/70 px-2 py-1.5 text-xs font-bold text-jdt-text">
                            <input
                              type="checkbox"
                              checked={selectedValues.includes(option)}
                              onChange={(event) => handleMultiSelectChange(field.key, option, event.target.checked)}
                              className="h-3.5 w-3.5 rounded border-jdt-border text-jdt-primary"
                            />
                            <span>{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type={field.type || 'text'}
                      value={formData[field.key] || ''}
                      onChange={(event) => handleChange(field.key, event.target.value)}
                      required={field.required}
                      list={field.suggestions?.length ? suggestionListId(resolvedType, field.key) : undefined}
                      className="w-full rounded-lg border border-jdt-border bg-jdt-panel px-3 py-2 text-sm font-bold text-jdt-text outline-none focus:border-zinc-500"
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    />
                    {field.suggestions?.length ? (
                      <datalist id={suggestionListId(resolvedType, field.key)}>
                        {field.suggestions.map((option) => (
                          <option key={option} value={option} />
                        ))}
                      </datalist>
                    ) : null}
                  </>
                )}
                {field.hint ? <span className="mt-1 block text-[10px] font-bold text-zinc-500">{field.hint}</span> : null}
              </label>
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-jdt-border pt-4">
        <button type="button" onClick={onClose} className="rounded-lg border border-jdt-border bg-white px-4 py-2.5 text-xs font-black uppercase text-zinc-700 hover:border-jdt-olive">
          Cancel
        </button>
        <button type="submit" disabled={missingProjectContext} className="inline-flex items-center gap-2 rounded-lg bg-jdt-primary px-5 py-2.5 text-xs font-black uppercase text-white hover:bg-jdt-dark disabled:cursor-not-allowed disabled:opacity-50">
          <Check className="h-4 w-4" /> {submitLabel}
        </button>
      </div>
    </form>
  );
}
