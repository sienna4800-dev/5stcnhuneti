import { Room, InspectionRecord, CorrectiveTask, AppSettings, UserProfile } from '../types.ts';
import { classifyInspectionResult, ThresholdEvaluationResult } from './thresholdUtils.ts';

/**
 * Standardized canonical room ID mapping.
 * Maps variations, aliases and historical references to controlled canonical IDs:
 * PTH01, PTH02, VPK, FBC, KTS.
 */
export function normalizeRoomId(rawId: string | null | undefined): string {
  if (!rawId) return '';
  const clean = rawId.trim();
  const lower = clean.toLowerCase();

  // PTH01 aliases
  if (
    lower === 'pth01' ||
    lower === 'pth-01' ||
    lower === 'pth_01' ||
    lower === 'pth 01' ||
    lower === 'phòng thực hành 1' ||
    lower === 'phong thuc hanh 1' ||
    lower === 'phong thuc hanh 01'
  ) {
    return 'PTH01';
  }

  // PTH02 aliases
  if (
    lower === 'pth02' ||
    lower === 'pth-02' ||
    lower === 'pth_02' ||
    lower === 'pth 02' ||
    lower === 'phòng thực hành 2' ||
    lower === 'phong thuc hanh 2' ||
    lower === 'phong thuc hanh 02'
  ) {
    return 'PTH02';
  }

  // VPK aliases
  if (
    lower === 'vpk' ||
    lower === 'vp-khoa' ||
    lower === 'văn phòng khoa' ||
    lower === 'van phong khoa' ||
    lower === 'văn phòng'
  ) {
    return 'VPK';
  }

  // FBC aliases
  if (
    lower === 'fbc' ||
    lower === 'clb fbc' ||
    lower === 'clb-fbc' ||
    lower === 'fbc club'
  ) {
    return 'FBC';
  }

  // KTS aliases
  if (
    lower === 'kts' ||
    lower === 'không gian lưu trữ số' ||
    lower === 'khong gian luu tru so' ||
    lower === 'kho lưu trữ số'
  ) {
    return 'KTS';
  }

  return clean.toUpperCase();
}

export interface DerivedRoomStats {
  hasInspection: boolean;
  lastInspectedAt?: string;
  lastScore?: number | null;
  lastResult: ThresholdEvaluationResult | 'NONE';
  openTaskCount: number;
  totalInspectionsCount: number;
  latestInspection?: InspectionRecord;
}

/**
 * Dynamically derives room statistics from inspections and tasks collections.
 * Does NOT rely on hardcoded/static summary fields on Room objects.
 */
export function deriveRoomStats(
  roomId: string,
  inspections: InspectionRecord[] = [],
  tasks: CorrectiveTask[] = [],
  settings?: AppSettings
): DerivedRoomStats {
  const normId = normalizeRoomId(roomId);
  const threshold = settings?.passThreshold ?? 80;

  // Filter and sort room inspections descending by timestamp
  const roomInspections = inspections
    .filter((i) => normalizeRoomId(i.roomId) === normId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filter room open tasks
  const roomOpenTasks = tasks.filter(
    (t) => normalizeRoomId(t.roomId) === normId && t.status !== 'VERIFIED_DONE'
  );

  if (roomInspections.length === 0) {
    return {
      hasInspection: false,
      lastInspectedAt: undefined,
      lastScore: null,
      lastResult: 'NONE',
      openTaskCount: roomOpenTasks.length,
      totalInspectionsCount: 0,
    };
  }

  const latest = roomInspections[0];
  const inspThreshold = latest.passScoreThreshold ?? threshold;

  const result = classifyInspectionResult(
    latest.officialScore,
    inspThreshold,
    latest.applicableCriteria ?? (latest.decisions?.length || 15)
  );

  return {
    hasInspection: true,
    lastInspectedAt: latest.createdAt,
    lastScore: latest.officialScore,
    lastResult: result,
    openTaskCount: roomOpenTasks.length,
    totalInspectionsCount: roomInspections.length,
    latestInspection: latest,
  };
}

/**
 * Checks if an assignee name matches a current valid user in personnel roster.
 */
export function isPersonnelInRoster(name: string | undefined, users: UserProfile[]): boolean {
  if (!name || name.trim() === '' || name === 'Chờ phân công') return true;
  return users.some(
    (u) => u.name.trim().toLowerCase() === name.trim().toLowerCase() ||
           u.email.trim().toLowerCase() === name.trim().toLowerCase()
  );
}
