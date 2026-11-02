import {
  CriterionStatus,
  InspectorCriterionDecision,
  AICriterionProposal,
  Room,
  CorrectiveTask,
  InspectionRecord
} from '../types.ts';

/**
 * Calculates official 5S inspection score
 * Formula: Passed Criteria / (Passed Criteria + Failed Criteria) * 100%
 * Not Applicable criteria are excluded from denominator.
 * If all are Not Applicable or 0 evaluated, returns null (cannot evaluate).
 */
export function calculateInspectionScore(
  decisions: { status: CriterionStatus }[],
  passThreshold: number = 80
): {
  score: number | null;
  passedCount: number;
  failedCount: number;
  naCount: number;
  applicableCount: number;
  totalCount: number;
  result: 'PASSED' | 'FAILED' | 'CANNOT_EVALUATE';
} {
  const totalCount = decisions.length;
  let passedCount = 0;
  let failedCount = 0;
  let naCount = 0;

  for (const d of decisions) {
    if (d.status === 'PASSED') passedCount++;
    else if (d.status === 'FAILED') failedCount++;
    else if (d.status === 'NOT_APPLICABLE') naCount++;
  }

  const applicableCount = passedCount + failedCount;

  if (applicableCount === 0) {
    return {
      score: null,
      passedCount,
      failedCount,
      naCount,
      applicableCount: 0,
      totalCount,
      result: 'CANNOT_EVALUATE',
    };
  }

  const rawScore = (passedCount / applicableCount) * 100;
  const score = Math.round(rawScore * 10) / 10;

  // Use unrounded score for comparison vs configured threshold
  const result: 'PASSED' | 'FAILED' = rawScore >= passThreshold ? 'PASSED' : 'FAILED';

  return {
    score,
    passedCount,
    failedCount,
    naCount,
    applicableCount,
    totalCount,
    result,
  };
}

/**
 * Calculates AI preliminary evaluation coverage and temporary score
 */
export function calculateAICoverage(
  proposals: AICriterionProposal[],
  totalChecklistCount: number
): {
  coveragePercentage: number;
  decisiveCount: number; // PASSED or FAILED
  insufficientCount: number;
  preliminaryScore: number | null;
} {
  let passedCount = 0;
  let failedCount = 0;
  let insufficientCount = 0;

  for (const p of proposals) {
    if (p.status === 'PASSED') passedCount++;
    else if (p.status === 'FAILED') failedCount++;
    else if (p.status === 'INSUFFICIENT_EVIDENCE') insufficientCount++;
  }

  const decisiveCount = passedCount + failedCount;
  const coveragePercentage = totalChecklistCount > 0 
    ? Math.round((decisiveCount / totalChecklistCount) * 100) 
    : 0;

  let preliminaryScore: number | null = null;
  if (decisiveCount > 0) {
    preliminaryScore = Math.round((passedCount / decisiveCount) * 1000) / 10;
  }

  return {
    coveragePercentage,
    decisiveCount,
    insufficientCount,
    preliminaryScore,
  };
}

/**
 * Safely initializes default rooms ensuring:
 * 1. Default PTH01, PTH02, VPK are always present.
 * 2. Does not duplicate existing rooms.
 * 3. Does not overwrite user changes to existing rooms.
 * 4. Leaves location and manager empty if not specified ("Chưa cập nhật", "Chưa phân công").
 */
export function initializeDefaultRooms(
  existingRooms: Room[],
  defaultTemplates: Room[]
): Room[] {
  if (!existingRooms || existingRooms.length === 0) {
    return [...defaultTemplates];
  }

  const result = [...existingRooms];
  const existingIds = new Set(existingRooms.map((r) => r.id));

  for (const t of defaultTemplates) {
    if (!existingIds.has(t.id)) {
      result.push({ ...t });
      existingIds.add(t.id);
    }
  }

  return result;
}

/**
 * Generates corrective tasks automatically from FAILED criteria in an inspection.
 * If room manager is not assigned or empty, assigns to "Chờ phân công".
 */
export function generateCorrectiveTasks(
  inspection: InspectionRecord,
  room: Room,
  deadlineDays = 3
): CorrectiveTask[] {
  const tasks: CorrectiveTask[] = [];
  const assignedManager = room.manager && room.manager.trim() !== '' 
    ? room.manager.trim() 
    : 'Chờ phân công';

  const deadline = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString();

  for (const decision of inspection.decisions) {
    if (decision.status === 'FAILED') {
      const checklistItem = room.checklist.find((c) => c.id === decision.criterionId);
      const aiProposal = inspection.aiProposals?.find((a) => a.criterionId === decision.criterionId);

      const issue = decision.userNotes?.trim() || aiProposal?.issues?.trim() || 'Chưa đạt chuẩn 5S';
      const recommendation = aiProposal?.recommendation?.trim() || checklistItem?.guidelines || 'Cần sắp xếp, vệ sinh và khắc phục ngay';

      // Attach before photos if any
      const beforePhotos: string[] = [];
      if (decision.customPhotos && decision.customPhotos.length > 0) {
        beforePhotos.push(...decision.customPhotos);
      } else if (aiProposal && aiProposal.photoReferences && inspection.photos) {
        for (const refIdx of aiProposal.photoReferences) {
          const photo = inspection.photos[refIdx - 1];
          if (photo) beforePhotos.push(photo.url);
        }
      }
      if (beforePhotos.length === 0 && inspection.photos.length > 0) {
        beforePhotos.push(inspection.photos[0].url);
      }

      tasks.push({
        id: `TASK-${inspection.id}-${decision.criterionId}-${Date.now().toString(36)}`,
        inspectionId: inspection.id,
        roomId: room.id,
        roomName: room.name,
        criterionId: decision.criterionId,
        criterionCode: checklistItem?.code || decision.criterionId,
        criterionName: checklistItem?.name || aiProposal?.criterionName || 'Tiêu chí 5S',
        issueDescription: issue,
        recommendation: recommendation,
        assignedTo: assignedManager,
        status: 'PENDING',
        beforePhotos,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return tasks;
}

/**
 * Validates that an inspector's decision is complete.
 * - If status is NOT_APPLICABLE, naReason must be provided.
 * - If AI proposed something else and inspector overrides, overrideReason must be provided.
 * - Status cannot be INSUFFICIENT_EVIDENCE when finalizing.
 */
export function validateInspectorDecision(
  decision: InspectorCriterionDecision,
  aiProposal?: AICriterionProposal
): { valid: boolean; error?: string } {
  if (decision.status === 'INSUFFICIENT_EVIDENCE') {
    return {
      valid: false,
      error: 'Vui lòng xác nhận kết luận chính thức (Đạt, Không đạt hoặc Không áp dụng) trước khi gửi phiếu.',
    };
  }

  if (decision.status === 'NOT_APPLICABLE') {
    if (!decision.naReason || decision.naReason.trim().length < 3) {
      return {
        valid: false,
        error: 'Bắt buộc nhập lý do khi chọn tiêu chí Không áp dụng.',
      };
    }
  }

  if (decision.status === 'FAILED') {
    if (!decision.userNotes || decision.userNotes.trim().length < 3) {
      if (!aiProposal?.issues) {
        return {
          valid: false,
          error: 'Bắt buộc nhập mô tả tồn tại khi đánh giá Không đạt.',
        };
      }
    }
  }

  if (aiProposal && decision.status !== aiProposal.status && aiProposal.status !== 'INSUFFICIENT_EVIDENCE') {
    if (!decision.overrideReason || decision.overrideReason.trim().length < 3) {
      return {
        valid: false,
        error: 'Bắt buộc ghi lý do ngắn khi sửa khác đề xuất của AI.',
      };
    }
  }

  return { valid: true };
}
