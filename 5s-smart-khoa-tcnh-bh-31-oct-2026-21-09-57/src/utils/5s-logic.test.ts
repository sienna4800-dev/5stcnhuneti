import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateInspectionScore,
  calculateAICoverage,
  initializeDefaultRooms,
  generateCorrectiveTasks,
  validateInspectorDecision
} from './5s-logic.ts';
import { Room, InspectionRecord, InspectorCriterionDecision, AICriterionProposal } from '../types.ts';

test('calculateInspectionScore correctly computes score excluding NOT_APPLICABLE', () => {
  // 8 passed, 2 failed, 2 NA -> 8 / (8 + 2) = 80.0%
  const decisions = [
    { status: 'PASSED' as const },
    { status: 'PASSED' as const },
    { status: 'PASSED' as const },
    { status: 'PASSED' as const },
    { status: 'PASSED' as const },
    { status: 'PASSED' as const },
    { status: 'PASSED' as const },
    { status: 'PASSED' as const },
    { status: 'FAILED' as const },
    { status: 'FAILED' as const },
    { status: 'NOT_APPLICABLE' as const },
    { status: 'NOT_APPLICABLE' as const },
  ];

  const res = calculateInspectionScore(decisions);
  assert.equal(res.score, 80);
  assert.equal(res.passedCount, 8);
  assert.equal(res.failedCount, 2);
  assert.equal(res.naCount, 2);
  assert.equal(res.applicableCount, 10);
  assert.equal(res.result, 'PASSED');
});

test('calculateInspectionScore handles all NOT_APPLICABLE returning CANNOT_EVALUATE and null score', () => {
  const decisions = [
    { status: 'NOT_APPLICABLE' as const },
    { status: 'NOT_APPLICABLE' as const },
  ];

  const res = calculateInspectionScore(decisions);
  assert.equal(res.score, null);
  assert.equal(res.result, 'CANNOT_EVALUATE');
  assert.equal(res.applicableCount, 0);
});

test('calculateAICoverage calculates percentage and decisive count', () => {
  const proposals: AICriterionProposal[] = [
    {
      criterionId: 'c1',
      criterionName: 'C1',
      status: 'PASSED',
      observation: 'Clean',
      photoReferences: [1],
    },
    {
      criterionId: 'c2',
      criterionName: 'C2',
      status: 'FAILED',
      observation: 'Wires messy',
      photoReferences: [2],
    },
    {
      criterionId: 'c3',
      criterionName: 'C3',
      status: 'INSUFFICIENT_EVIDENCE',
      observation: 'Dark corner',
      photoReferences: [1],
    },
  ];

  const coverage = calculateAICoverage(proposals, 4);
  // 2 decisive out of 4 total -> 50%
  assert.equal(coverage.decisiveCount, 2);
  assert.equal(coverage.insufficientCount, 1);
  assert.equal(coverage.coveragePercentage, 50);
  // preliminary score: 1 passed out of 2 decisive = 50%
  assert.equal(coverage.preliminaryScore, 50);
});

test('initializeDefaultRooms does not duplicate rooms and preserves modifications', () => {
  const templates: Room[] = [
    {
      id: 'PTH01',
      name: 'Phòng thực hành 1',
      type: 'LAB',
      location: '',
      manager: '',
      specificNotes: 'Bàn ghế máy tính',
      checklist: [],
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 'PTH02',
      name: 'Phòng thực hành 2',
      type: 'LAB',
      location: '',
      manager: '',
      specificNotes: 'Bàn ghế máy tính',
      checklist: [],
      createdAt: '',
      updatedAt: '',
    },
  ];

  // User already edited PTH01
  const existing: Room[] = [
    {
      id: 'PTH01',
      name: 'Phòng thực hành 1 - Đã đổi tên',
      type: 'LAB',
      location: 'Tầng 4 Nhà HA8',
      manager: 'ThS. Nguyễn Văn A',
      specificNotes: 'Bàn ghế máy tính',
      checklist: [],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
    },
  ];

  const initialized = initializeDefaultRooms(existing, templates);
  assert.equal(initialized.length, 2);
  const pth01 = initialized.find((r) => r.id === 'PTH01');
  assert.equal(pth01?.name, 'Phòng thực hành 1 - Đã đổi tên');
  assert.equal(pth01?.location, 'Tầng 4 Nhà HA8');
  assert.equal(pth01?.manager, 'ThS. Nguyễn Văn A');

  const pth02 = initialized.find((r) => r.id === 'PTH02');
  assert.equal(pth02?.name, 'Phòng thực hành 2');
  assert.equal(pth02?.manager, ''); // left empty if not specified
});

test('generateCorrectiveTasks creates tasks for FAILED criteria and assigns to "Chờ phân công" if room has no manager', () => {
  const room: Room = {
    id: 'PTH01',
    name: 'Phòng thực hành 1',
    type: 'LAB',
    location: '',
    manager: '', // No manager assigned!
    specificNotes: 'Bàn ghế máy tính',
    checklist: [
      {
        id: 'S2-02',
        code: 'S2-02',
        category: 'S2',
        categoryName: 'Sắp xếp',
        name: 'Dây điện gọn gàng',
        description: 'Dây điện đi nẹp',
        guidelines: 'Gom dây vào nẹp',
      },
    ],
    createdAt: '',
    updatedAt: '',
  };

  const inspection: InspectionRecord = {
    id: 'INSP-101',
    roomId: 'PTH01',
    roomName: 'Phòng thực hành 1',
    roomType: 'LAB',
    inspectorId: 'U1',
    inspectorName: 'Kiểm tra viên 1',
    inspectorRole: 'INSPECTOR',
    evaluationSource: 'MANUAL',
    photos: [{ id: 'p1', url: 'data:image/png;base64,abc', name: 'photo1.png', timestamp: '' }],
    decisions: [
      {
        criterionId: 'S2-02',
        status: 'FAILED',
        userNotes: 'Dây điện máy tính dãy 3 để lộn xộn dưới sàn',
        isOverriddenFromAI: false,
      },
    ],
    officialScore: 0,
    officialResult: 'FAILED',
    totalCriteria: 1,
    applicableCriteria: 1,
    passedCriteria: 0,
    failedCriteria: 1,
    naCriteria: 0,
    createdAt: new Date().toISOString(),
  };

  const tasks = generateCorrectiveTasks(inspection, room);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].assignedTo, 'Chờ phân công');
  assert.equal(tasks[0].criterionId, 'S2-02');
  assert.equal(tasks[0].status, 'PENDING');
});

test('validateInspectorDecision enforces reasons for NA and overrides', () => {
  const decision1: InspectorCriterionDecision = {
    criterionId: 'S1-01',
    status: 'NOT_APPLICABLE',
    isOverriddenFromAI: false,
    naReason: '',
  };
  const res1 = validateInspectorDecision(decision1);
  assert.equal(res1.valid, false);

  const decision2: InspectorCriterionDecision = {
    criterionId: 'S1-01',
    status: 'NOT_APPLICABLE',
    isOverriddenFromAI: false,
    naReason: 'Khu vực không có tài liệu giấy',
  };
  const res2 = validateInspectorDecision(decision2);
  assert.equal(res2.valid, true);

  // Override AI proposal
  const aiProposal: AICriterionProposal = {
    criterionId: 'S1-01',
    criterionName: 'S1-01',
    status: 'FAILED',
    observation: 'Found items',
    photoReferences: [1],
    issues: 'Items on table',
  };
  const decision3: InspectorCriterionDecision = {
    criterionId: 'S1-01',
    status: 'PASSED',
    isOverriddenFromAI: true,
    overrideReason: '', // missing
  };
  const res3 = validateInspectorDecision(decision3, aiProposal);
  assert.equal(res3.valid, false);

  const decision4: InspectorCriterionDecision = {
    criterionId: 'S1-01',
    status: 'PASSED',
    isOverriddenFromAI: true,
    overrideReason: 'Sinh viên đang thực hành trong giờ, không phải đồ thừa',
  };
  const res4 = validateInspectorDecision(decision4, aiProposal);
  assert.equal(res4.valid, true);
});
