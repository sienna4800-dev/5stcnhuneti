export type RoomType = 'LAB' | 'OFFICE' | 'MEETING' | 'CLASSROOM';

export interface RoomChecklistItem {
  id: string;
  category: 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'SPECIFIC';
  categoryName: string;
  code: string;
  name: string;
  description: string;
  guidelines: string;
}

export interface Room {
  id: string; // Internal ID: e.g. "PTH01", "PTH02", "VPK"
  name: string; // e.g. "Phòng thực hành 1"
  type: RoomType;
  location?: string; // Real location/building if provided, empty string if unknown
  manager?: string; // Person in charge, empty string if "Chưa phân công"
  specificNotes: string; // Specific focus areas
  checklist: RoomChecklistItem[];
  lastInspectedAt?: string;
  lastScore?: number;
  lastResult?: 'EXCELLENT' | 'PASSED' | 'FAILED' | 'NONE';
  openTaskCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type CriterionStatus = 'PASSED' | 'FAILED' | 'INSUFFICIENT_EVIDENCE' | 'NOT_APPLICABLE';

export interface AICriterionProposal {
  criterionId: string;
  criterionName: string;
  status: 'PASSED' | 'FAILED' | 'INSUFFICIENT_EVIDENCE';
  observation: string;
  photoReferences: number[]; // 1-indexed photo numbers
  issues?: string;
  recommendation?: string;
  evidenceNeeded?: string;
}

export interface InspectorCriterionDecision {
  criterionId: string;
  status: CriterionStatus;
  userNotes?: string;
  overrideReason?: string; // Required if different from AI proposal
  isOverriddenFromAI: boolean;
  naReason?: string; // Required if status is NOT_APPLICABLE
  customPhotos?: string[];
}

export interface InspectionPhoto {
  id: string;
  url: string; // base64 or object URL
  name: string;
  contextNote?: string; // e.g. "Khu vực máy tính cuối phòng"
  timestamp: string;
}

export interface InspectionRecord {
  id: string;
  roomId: string;
  roomName: string;
  roomType: RoomType;
  inspectorId: string;
  inspectorName: string;
  inspectorRole: string;
  evaluationSource: 'MANUAL' | 'AI_ASSISTED';
  aiModel?: string;
  aiAnalyzedAt?: string;
  aiPromptVersion?: string;
  aiChecklistVersion?: string;
  aiProposals?: AICriterionProposal[];
  decisions: InspectorCriterionDecision[];
  photos: InspectionPhoto[];
  officialScore: number;
  officialResult: 'EXCELLENT' | 'PASSED' | 'FAILED';
  totalCriteria: number;
  applicableCriteria: number;
  passedCriteria: number;
  failedCriteria: number;
  naCriteria: number;
  aiCoveragePercentage?: number;
  aiPreliminaryScore?: number;
  aiPreliminaryCriteriaCount?: number;
  passScoreThreshold?: number;
  isSample?: boolean;
  notes?: string;
  createdAt: string;
}

export interface CorrectiveTask {
  id: string;
  inspectionId: string;
  roomId: string;
  roomName: string;
  criterionId: string;
  criterionCode: string;
  criterionName: string;
  issueDescription: string;
  recommendation: string;
  assignedTo: string; // If empty or "Chưa phân công", belongs to admin's pending queue
  status: 'PENDING' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'VERIFIED_DONE';
  beforePhotos: string[];
  afterPhotos?: string[];
  actionNotes?: string;
  deadline?: string;
  isSample?: boolean;
  auditTrail?: { updatedBy: string; updatedAt: string; change: string }[];
  aiVerification?: {
    sameArea: boolean;
    issueResolved: boolean;
    confidence: number;
    observation: string;
    recommendation: string;
    evidenceSufficient: boolean;
    analyzedAt: string;
    model: string;
  };
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'LEADER' | 'LECTURER' | 'STUDENT' | 'UNAPPROVED';
  roleTitle: string;
  department: string;
  assignedRoomIds?: string[];
}

export interface AppSettings {
  facultyName: string;
  universityName: string;
  logoUrl?: string;
  primaryColor: string;
  passThreshold: number; // default 80%
  defaultTaskDeadlineDays: number; // default 3 days
  allowStudentInspection: boolean;
  isDemoMode: boolean;
  googleDriveFolderUrl?: string;
  googleDriveFolderId?: string;
  publicAppUrl?: string;
}

export interface InspectionSchedule {
  id: string;
  roomId: string;
  roomName: string;
  inspectorName: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  dueDate: string;
  notes?: string;
  status: 'PENDING' | 'OVERDUE' | 'COMPLETED';
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'SCHEDULE' | 'NEW_TASK' | 'OVERDUE_TASK' | 'TASK_VERIFICATION' | 'SYSTEM';
  link?: string;
  isRead: boolean;
  createdAt: string;
}
