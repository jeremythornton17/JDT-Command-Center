export type ArcGisGeometryType = 'point' | 'polygon' | 'polyline';

export type ArcGisHostedLayerId =
  | 'JDT_Project_Boundaries'
  | 'JDT_Tree_Assets'
  | 'JDT_Final_Tree_Locations'
  | 'JDT_Holding_Areas'
  | 'JDT_Work_Zones'
  | 'JDT_Root_Prune_Events'
  | 'JDT_Relocation_Work'
  | 'JDT_Nutrient_Care_Tasks'
  | 'JDT_Equipment_Locations';

export type ArcGisFieldType = 'oid' | 'string' | 'double' | 'integer' | 'date';

export type ArcGisHostedField = {
  name: string;
  alias: string;
  type: ArcGisFieldType;
};

export type ArcGisHostedLayerConfig = {
  id: ArcGisHostedLayerId;
  title: string;
  serviceName: ArcGisHostedLayerId;
  geometryType: ArcGisGeometryType;
  sourceOfTruth: 'ArcGIS geometry, JDT operations';
  objectIdField: 'OBJECTID';
  primaryStatusField?: string;
  primaryIdFields: string[];
  fields: ArcGisHostedField[];
};

export type ArcGisLayerUrlEnvKey =
  | 'VITE_ARCGIS_LAYER_JDT_PROJECT_BOUNDARIES_URL'
  | 'VITE_ARCGIS_LAYER_JDT_TREE_ASSETS_URL'
  | 'VITE_ARCGIS_LAYER_JDT_FINAL_TREE_LOCATIONS_URL'
  | 'VITE_ARCGIS_LAYER_JDT_HOLDING_AREAS_URL'
  | 'VITE_ARCGIS_LAYER_JDT_WORK_ZONES_URL'
  | 'VITE_ARCGIS_LAYER_JDT_ROOT_PRUNE_EVENTS_URL'
  | 'VITE_ARCGIS_LAYER_JDT_RELOCATION_WORK_URL'
  | 'VITE_ARCGIS_LAYER_JDT_NUTRIENT_CARE_TASKS_URL'
  | 'VITE_ARCGIS_LAYER_JDT_EQUIPMENT_LOCATIONS_URL';

export const arcGisLayerUrlEnvKeys: Record<ArcGisHostedLayerId, ArcGisLayerUrlEnvKey> = {
  JDT_Project_Boundaries: 'VITE_ARCGIS_LAYER_JDT_PROJECT_BOUNDARIES_URL',
  JDT_Tree_Assets: 'VITE_ARCGIS_LAYER_JDT_TREE_ASSETS_URL',
  JDT_Final_Tree_Locations: 'VITE_ARCGIS_LAYER_JDT_FINAL_TREE_LOCATIONS_URL',
  JDT_Holding_Areas: 'VITE_ARCGIS_LAYER_JDT_HOLDING_AREAS_URL',
  JDT_Work_Zones: 'VITE_ARCGIS_LAYER_JDT_WORK_ZONES_URL',
  JDT_Root_Prune_Events: 'VITE_ARCGIS_LAYER_JDT_ROOT_PRUNE_EVENTS_URL',
  JDT_Relocation_Work: 'VITE_ARCGIS_LAYER_JDT_RELOCATION_WORK_URL',
  JDT_Nutrient_Care_Tasks: 'VITE_ARCGIS_LAYER_JDT_NUTRIENT_CARE_TASKS_URL',
  JDT_Equipment_Locations: 'VITE_ARCGIS_LAYER_JDT_EQUIPMENT_LOCATIONS_URL',
};

const objectIdField: ArcGisHostedField = { name: 'OBJECTID', alias: 'Object ID', type: 'oid' };

export const treeRelocationStatusValues = [
  'Not Started',
  '25% Cut',
  '50% Cut',
  '75% Cut',
  '100% Cut',
  'Ready for Relocation',
  'Moved to Holding',
  'Relocated',
] as const;

export const jdtArcGisHostedLayerConfigs: ArcGisHostedLayerConfig[] = [
  hostedLayer('JDT_Project_Boundaries', 'JDT Project Boundaries', 'polygon', ['Project_ID'], [
    objectIdField,
    textField('Project_ID', 'Project ID'),
    textField('Project_Name', 'Project Name'),
    textField('Client_ID', 'Client ID'),
    textField('Client_Name', 'Client Name'),
    textField('Project_Status', 'Project Status'),
    dateField('Start_Date', 'Start Date'),
    dateField('End_Date', 'End Date'),
    textField('Notes', 'Notes'),
  ]),
  hostedLayer('JDT_Tree_Assets', 'JDT Tree Assets', 'point', ['Project_ID', 'Tree_Asset_ID'], [
    objectIdField,
    textField('Tree_Asset_ID', 'Tree Asset ID'),
    textField('Project_ID', 'Project ID'),
    textField('Client_ID', 'Client ID'),
    textField('Asset_Category', 'Asset Category'),
    textField('Tree_Tag', 'Tree Tag'),
    textField('Tree_Type', 'Tree Type'),
    doubleField('DBH_IN', 'DBH (in)'),
    doubleField('Height_FT', 'Height (ft)'),
    doubleField('Spread_FT', 'Spread (ft)'),
    textField('Condition', 'Condition'),
    textField('Difficulty', 'Difficulty'),
    textField('Priority', 'Priority'),
    textField('Tree_Relocation_Status', 'Tree Relocation Status'),
    textField('Installation_Status', 'Installation Status'),
    textField('Tree_Final_Outcome', 'Tree Final Outcome'),
    textField('Current_Field_Location', 'Current Field Location'),
    textField('Holding_Area_Name', 'Holding Area Name'),
    textField('Existing_Location_Description', 'Existing Location Description'),
    textField('Proposed_Final_Location_Description', 'Proposed Final Location Description'),
    doubleField('Estimated_Relocation_Cost', 'Estimated Relocation Cost'),
    doubleField('Contract_Relocation_Cost', 'Contract Relocation Cost'),
    textField('Risk_Level', 'Risk Level'),
    textField('Map_Geometry_Status', 'Map Geometry Status'),
    dateField('Last_Map_Sync_At', 'Last Map Sync At'),
    textField('Notes', 'Notes'),
  ], 'Tree_Relocation_Status'),
  hostedLayer('JDT_Final_Tree_Locations', 'JDT Final Tree Locations', 'point', ['Final_Location_ID', 'Tree_Asset_ID'], [
    objectIdField,
    textField('Final_Location_ID', 'Final Location ID'),
    textField('Tree_Asset_ID', 'Tree Asset ID'),
    textField('Project_ID', 'Project ID'),
    textField('Tree_Tag', 'Tree Tag'),
    textField('Tree_Type', 'Tree Type'),
    textField('Destination_Status', 'Destination Status'),
    textField('Approved_By', 'Approved By'),
    dateField('Approval_Date', 'Approval Date'),
    textField('Install_Notes', 'Install Notes'),
  ], 'Destination_Status'),
  hostedLayer('JDT_Holding_Areas', 'JDT Holding Areas', 'polygon', ['Holding_Area_ID', 'Project_ID'], [
    objectIdField,
    textField('Holding_Area_ID', 'Holding Area ID'),
    textField('Project_ID', 'Project ID'),
    textField('Holding_Area_Name', 'Holding Area Name'),
    integerField('Capacity_Estimate', 'Capacity Estimate'),
    integerField('Current_Tree_Count', 'Current Tree Count'),
    textField('Irrigation_Available', 'Irrigation Available'),
    textField('Access_Notes', 'Access Notes'),
    textField('Status', 'Status'),
    textField('Notes', 'Notes'),
  ], 'Status'),
  hostedLayer('JDT_Work_Zones', 'JDT Work Zones', 'polygon', ['Work_Zone_ID', 'Project_ID'], [
    objectIdField,
    textField('Work_Zone_ID', 'Work Zone ID'),
    textField('Project_ID', 'Project ID'),
    textField('Zone_Name', 'Zone Name'),
    textField('Work_Type', 'Work Type'),
    textField('Assigned_Crew', 'Assigned Crew'),
    dateField('Start_Date', 'Start Date'),
    dateField('End_Date', 'End Date'),
    textField('Status', 'Status'),
    textField('Notes', 'Notes'),
  ], 'Status'),
  hostedLayer('JDT_Root_Prune_Events', 'JDT Root Prune Events', 'point', ['Root_Pruning_ID', 'Tree_Asset_ID'], [
    objectIdField,
    textField('Root_Pruning_ID', 'Root Pruning ID'),
    textField('Root_Prune_Cycle_ID', 'Root Prune Cycle ID'),
    textField('Tree_Asset_ID', 'Tree Asset ID'),
    textField('Project_ID', 'Project ID'),
    textField('Tree_Tag', 'Tree Tag'),
    dateField('Scheduled_Date', 'Scheduled Date'),
    dateField('Completed_Date', 'Completed Date'),
    textField('Root_Prune_Task_Status', 'Root Prune Task Status'),
    integerField('Root_Prune_Event_Number', 'Root Prune Event Number'),
    doubleField('Planned_Cut_Percent', 'Planned Cut Percent'),
    doubleField('Actual_Cut_Percent', 'Actual Cut Percent'),
    doubleField('Cumulative_Cut_Percent_After_Event', 'Cumulative Cut Percent After Event'),
    textField('Assigned_Crew', 'Assigned Crew'),
    textField('Assigned_Crew_Leader', 'Assigned Crew Leader'),
    textField('Notes', 'Notes'),
  ], 'Root_Prune_Task_Status'),
  hostedLayer('JDT_Relocation_Work', 'JDT Relocation Work', 'point', ['Relocation_Work_ID', 'Tree_Asset_ID'], [
    objectIdField,
    textField('Relocation_Work_ID', 'Relocation Work ID'),
    textField('Tree_Asset_ID', 'Tree Asset ID'),
    textField('Project_ID', 'Project ID'),
    textField('Tree_Tag', 'Tree Tag'),
    dateField('Scheduled_Move_Date', 'Scheduled Move Date'),
    dateField('Actual_Move_Date', 'Actual Move Date'),
    textField('Move_Task_Status', 'Move Task Status'),
    textField('Move_Type', 'Move Type'),
    textField('Origin_Location', 'Origin Location'),
    textField('Destination_Location', 'Destination Location'),
    textField('Holding_Area_Name', 'Holding Area Name'),
    textField('Assigned_Crew', 'Assigned Crew'),
    textField('Equipment_Used', 'Equipment Used'),
    textField('Truck_Used', 'Truck Used'),
    textField('Trailer_Used', 'Trailer Used'),
    textField('Operator', 'Operator'),
    textField('Notes', 'Notes'),
  ], 'Move_Task_Status'),
  hostedLayer('JDT_Nutrient_Care_Tasks', 'JDT Nutrient Care Tasks', 'point', ['Nutrient_Care_ID', 'Tree_Asset_ID'], [
    objectIdField,
    textField('Nutrient_Care_ID', 'Nutrient Care ID'),
    textField('Tree_Asset_ID', 'Tree Asset ID'),
    textField('Project_ID', 'Project ID'),
    textField('Related_Root_Pruning_ID', 'Related Root Pruning ID'),
    textField('Tree_Tag', 'Tree Tag'),
    textField('Care_Phase', 'Care Phase'),
    dateField('Scheduled_Date', 'Scheduled Date'),
    dateField('Completed_Date', 'Completed Date'),
    textField('Care_Task_Status', 'Care Task Status'),
    textField('Treatment_Type', 'Treatment Type'),
    textField('Treatment_Product', 'Treatment Product'),
    textField('Condition_Observed', 'Condition Observed'),
    textField('Stress_Level', 'Stress Level'),
    textField('Watering_Status', 'Watering Status'),
    textField('Irrigation_Status', 'Irrigation Status'),
    textField('Follow_Up_Needed', 'Follow Up Needed'),
    dateField('Next_Follow_Up_Date', 'Next Follow Up Date'),
    textField('Assigned_Crew', 'Assigned Crew'),
    textField('Vendor', 'Vendor'),
    textField('Notes', 'Notes'),
  ], 'Care_Task_Status'),
  hostedLayer('JDT_Equipment_Locations', 'JDT Equipment Locations', 'point', ['Equipment_ID'], [
    objectIdField,
    textField('Equipment_ID', 'Equipment ID'),
    textField('Equipment_Name', 'Equipment Name'),
    textField('Equipment_Type', 'Equipment Type'),
    textField('Project_ID', 'Project ID'),
    textField('Current_Status', 'Current Status'),
    textField('Assigned_Crew', 'Assigned Crew'),
    dateField('Last_Seen_At', 'Last Seen At'),
    textField('Verizon_Asset_ID', 'Verizon Asset ID'),
    textField('Notes', 'Notes'),
  ], 'Current_Status'),
];

export function hostedLayerById(id: ArcGisHostedLayerId): ArcGisHostedLayerConfig {
  const layer = jdtArcGisHostedLayerConfigs.find((candidate) => candidate.id === id);
  if (!layer) throw new Error(`Unknown JDT ArcGIS hosted layer: ${id}`);
  return layer;
}

function hostedLayer(
  id: ArcGisHostedLayerId,
  title: string,
  geometryType: ArcGisGeometryType,
  primaryIdFields: string[],
  fields: ArcGisHostedField[],
  primaryStatusField?: string,
): ArcGisHostedLayerConfig {
  return {
    id,
    title,
    serviceName: id,
    geometryType,
    sourceOfTruth: 'ArcGIS geometry, JDT operations',
    objectIdField: 'OBJECTID',
    primaryStatusField,
    primaryIdFields,
    fields,
  };
}

function textField(name: string, alias: string): ArcGisHostedField {
  return { name, alias, type: 'string' };
}

function doubleField(name: string, alias: string): ArcGisHostedField {
  return { name, alias, type: 'double' };
}

function integerField(name: string, alias: string): ArcGisHostedField {
  return { name, alias, type: 'integer' };
}

function dateField(name: string, alias: string): ArcGisHostedField {
  return { name, alias, type: 'date' };
}
