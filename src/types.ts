export type TreeStatus = 'Not Started' | '1st Cut Complete' | '2nd Cut Complete' | 'Ready for Final Cut' | 'Ready for Relocation' | 'Relocated' | 'Hold' | 'Billed' | 'REMOVED';

export interface TreeJob {
  id: string;
  project: string;
  tag: string;
  species?: string;
  heightSpread?: string;
  dbh?: string;
  difficulty?: string;
  relocationCost?: number;
  status: TreeStatus | string;
  rootPruneCuts?: number;
  firstCutDate?: number;
  secondCutDate?: number;
  relocationDate?: number;
  treatments?: number;
  lastTreatmentDate?: number;
  treatmentAction?: string;
  location?: string;
  notes?: string;
  authorId: string;
  createdAt: number;
  updatedAt: number;
}
