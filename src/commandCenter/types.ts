export interface JobCard {
  id: string;
  division: string;
  scheduleWindow: string;
  title: string;
  phase: string;
  status: string;
  priority: string;
  priorityBanner?: string;
  location: string;
  startTime: string;
  crewName: string;
  crewLead: string;
  equipment: string[];
  assets: string[];
  priorities: string[];
  contactName: string;
  contactPhone: string;
  mapNote?: string;
  changeNote?: string;
  relatedTreeIds: string[];
  relatedLoadId?: string;
  sheetRow?: number;
  sourceSheetId?: string;
  lastSheetSync?: string;
  updatedAt: string;
  createdAt: string;
  warnings?: string[];
}

export interface RanchOak {
  id: string;
  treeId: string;
  ranchOakType: string;
  status: string;
  dbh: string | number;
  height: string | number;
  spread: string | number;
  rootballSize: string;
  dateHarvested: string;
  farm: string;
  zone: string;
  datePlanted?: string;
  growthCyclePhase?: string;
  lastFertilized?: string;
  fertilizerType?: string;
  lastSprayed?: string;
  sprayType?: string;
  nutrientCareNotes?: string;
  photos: string[];
  notes: string;
}
