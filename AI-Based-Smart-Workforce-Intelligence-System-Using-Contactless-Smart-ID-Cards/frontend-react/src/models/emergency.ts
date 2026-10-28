export type HeadcountStatus = 'MISSING' | 'ACCOUNTED_FOR' | 'UNVERIFIED' | 'NOT_EXPECTED';

export interface EvacuationEvent {
  id: string;
  companyId: string;
  eventName: string;
  status: 'ACTIVE' | 'CLOSED';
  affectedZones: string[] | null;
  building: string | null;
  floor: string | null;
  coordinatorId: string | null;
  coordinatorName: string;
  startedAt: string;
  closedAt: string | null;
  closedById: string | null;
  closedByName: string | null;
  closeReason: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EvacuationStats {
  total: number;
  expected: number;
  accounted: number;
  missing: number;
  unverified: number;
  notExpected: number;
  completionPercentage: number;
}

export interface EvacuationParticipant {
  id: string;
  evacuationId: string;
  empId: string;
  empName: string;
  empUid: string | null;
  department: string;
  assignedZone: string | null;
  headcountStatus: HeadcountStatus;
  notExpectedReason: string | null;
  lastKnownZone: string | null;
  lastKnownRoomId: string | null;
  lastDetectedAt: string | null;
  empStatus: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ZoneSummary {
  zone: string;
  roomId: string | null;
  total: number;
  accounted: number;
  missing: number;
  unverified: number;
  notExpected: number;
}

export interface VerificationRecord {
  id: string;
  evacuationId: string;
  empId: string;
  empName: string;
  previousStatus: string;
  newStatus: string;
  verificationMethod: string | null;
  verifiedById: string;
  verifiedByName: string;
  note: string | null;
  createdAt: string;
}
