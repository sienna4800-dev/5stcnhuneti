import http from 'http';
import { normalizeRoomId, deriveRoomStats, isPersonnelInRoster } from '../src/utils/roomUtils.ts';
import { classifyInspectionResult, getResultLabel, formatVNDate } from '../src/utils/thresholdUtils.ts';
import { calculateInspectionScore } from '../src/utils/5s-logic.ts';
import * as XLSX from 'xlsx';
import { DEFAULT_CHECKLIST, DEMO_USERS } from '../src/data/defaultData.ts';
import { INITIAL_ROOMS, INITIAL_INSPECTIONS, INITIAL_TASKS } from '../src/data/initialDb.ts';

function runAssertions() {
  console.log('=== TEST SUITE 1: CANONICAL ROOM ID NORMALIZATION ===');
  const pth01Variants = ['pth01', 'PTH-01', 'pth_01', 'PTH 01', 'Phòng thực hành 1', 'phong thuc hanh 1'];
  for (const v of pth01Variants) {
    const res = normalizeRoomId(v);
    if (res !== 'PTH01') throw new Error(`normalizeRoomId("${v}") expected "PTH01", got "${res}"`);
  }
  console.log('✓ All 6 PTH01 variations correctly normalize to "PTH01"');

  const pth02Variants = ['pth02', 'PTH-02', 'phòng thực hành 2', 'PTH 02'];
  for (const v of pth02Variants) {
    const res = normalizeRoomId(v);
    if (res !== 'PTH02') throw new Error(`normalizeRoomId("${v}") expected "PTH02", got "${res}"`);
  }
  console.log('✓ All 4 PTH02 variations correctly normalize to "PTH02"');

  const vpkVariants = ['vpk', 'VP-KHOA', 'văn phòng khoa', 'van phong khoa', 'VĂN PHÒNG'];
  for (const v of vpkVariants) {
    const res = normalizeRoomId(v);
    if (res !== 'VPK') throw new Error(`normalizeRoomId("${v}") expected "VPK", got "${res}"`);
  }
  console.log('✓ All 5 VPK variations correctly normalize to "VPK"');

  const ktsVariants = ['kts', 'KTS', 'không gian lưu trữ số', 'khong gian luu tru so', 'kho lưu trữ số'];
  for (const v of ktsVariants) {
    const res = normalizeRoomId(v);
    if (res !== 'KTS') throw new Error(`normalizeRoomId("${v}") expected "KTS", got "${res}"`);
  }
  console.log('✓ All 5 KTS variations correctly normalize to "KTS"');

  console.log('\n=== TEST SUITE 2: THRESHOLD AND EVALUATION LOGIC ===');
  // KTS 73.3% with threshold 80%
  const ktsResult = classifyInspectionResult(73.3, 80, 15);
  if (ktsResult !== 'FAILED') throw new Error(`Expected 73.3% to be FAILED, got ${ktsResult}`);
  const ktsLabel = getResultLabel(ktsResult);
  if (ktsLabel !== 'Không đạt') {
    throw new Error(`Expected KTS 73.3% label to be "Không đạt", got ${ktsLabel}`);
  }
  console.log('✓ 73.3% score with 80% threshold correctly classified as "FAILED" / "Không đạt"');

  // Exact 80.0% with threshold 80%
  const passResult = classifyInspectionResult(80.0, 80, 15);
  if (passResult !== 'PASSED') throw new Error(`Expected 80.0% to be PASSED, got ${passResult}`);
  console.log('✓ 80.0% score meets 80% threshold and correctly classified as "PASSED"');

  // 15 criteria NOT_APPLICABLE (applicable = 0)
  const naScore = calculateInspectionScore(
    DEFAULT_CHECKLIST.map((c) => ({
      criterionId: c.id,
      status: 'NOT_APPLICABLE',
      naReason: 'Khu vực không sử dụng thiết bị này',
    })),
    80
  );
  if (naScore.result !== 'CANNOT_EVALUATE' || naScore.applicableCount !== 0) {
    throw new Error(`Expected CANNOT_EVALUATE when all 15 are NA, got ${naScore.result}`);
  }
  const naResultClassified = classifyInspectionResult(naScore.score, 80, naScore.applicableCount);
  const naLabel = getResultLabel(naResultClassified);
  if (naLabel !== 'Không đủ cơ sở đánh giá') {
    throw new Error(`Expected label "Không đủ cơ sở đánh giá", got "${naLabel}"`);
  }
  const labelStr: string = naLabel;
  if (labelStr === 'Đạt' || labelStr === 'Không đạt' || labelStr.includes('Cải thiện')) {
    throw new Error(`CRITICAL ERROR: Denominator=0 was labeled with evaluative label!`);
  }
  console.log('✓ All 15 NA criteria (denominator = 0) correctly results in neutral "Không đủ cơ sở đánh giá"');

  console.log('\n=== TEST SUITE 3: DYNAMIC ROOM STATS CALCULATION ===');
  const pth01Stats = deriveRoomStats('pth-01', INITIAL_INSPECTIONS, INITIAL_TASKS, { passThreshold: 80 } as any);
  if (!pth01Stats.hasInspection) throw new Error('PTH01 expected to have inspections');
  if (pth01Stats.totalInspectionsCount !== 3) throw new Error(`Expected 3 inspections for PTH01, got ${pth01Stats.totalInspectionsCount}`);
  if (pth01Stats.openTaskCount !== 2) throw new Error(`Expected 2 open tasks for PTH01, got ${pth01Stats.openTaskCount}`);
  console.log(`✓ PTH01 dynamic stats derived: ${pth01Stats.totalInspectionsCount} inspections, latest score: ${pth01Stats.lastScore}%, ${pth01Stats.openTaskCount} open tasks`);

  const vpkStats = deriveRoomStats('VPK', INITIAL_INSPECTIONS, INITIAL_TASKS, { passThreshold: 80 } as any);
  if (vpkStats.totalInspectionsCount !== 2) throw new Error(`Expected 2 inspections for VPK, got ${vpkStats.totalInspectionsCount}`);
  console.log(`✓ VPK dynamic stats derived: ${vpkStats.totalInspectionsCount} inspections, latest score: ${vpkStats.lastScore}%, ${vpkStats.openTaskCount} open tasks`);

  console.log('\n=== TEST SUITE 4: HISTORICAL PERSONNEL PRESERVATION & UNLINKED ROSTER CHECK ===');
  const validUsers = DEMO_USERS;
  // Historical person not in roster
  const historicalPerson = 'TS. Nguyễn Văn Thịnh';
  const isInRoster = isPersonnelInRoster(historicalPerson, validUsers);
  if (isInRoster) {
    throw new Error('TS. Nguyễn Văn Thịnh should NOT be in current active faculty roster');
  }
  console.log(`✓ Historical inspector "${historicalPerson}" correctly identified as unlinked to current roster`);

  // Active faculty
  const activeFaculty = 'TS. Phạm Đức Tài';
  if (!isPersonnelInRoster(activeFaculty, validUsers)) {
    throw new Error(`Active faculty member ${activeFaculty} should be recognized in roster`);
  }
  console.log(`✓ Current 5S head "${activeFaculty}" correctly recognized in roster`);

  console.log('\n=== TEST SUITE 5: TIMEZONE Asia/Ho_Chi_Minh FORMATTING ===');
  const testIso = '2026-10-31T05:30:00.000Z'; // 12:30 in GMT+7
  const formatted = formatVNDate(testIso);
  if (!formatted.includes('31/10/2026')) {
    throw new Error(`Expected dd/MM/yyyy (31/10/2026), got ${formatted}`);
  }
  console.log(`✓ Date formatted in Asia/Ho_Chi_Minh: ${formatted}`);

  console.log('\n=== TEST SUITE 6: REAL XLSX EXPORT VERIFICATION ===');
  const testData = [
    {
      'Mã phiếu': 'INSP-20261025-01',
      'Phòng': 'Phòng thực hành 1',
      'Mã phòng': 'PTH01',
      'Ngày kiểm tra': '25/10/2026 14:00',
      'Người kiểm tra': 'TS. Nguyễn Văn Thịnh',
      'Phương thức': 'AI hỗ trợ',
      'Điểm đạt (%)': 86.7,
      'Kết luận': 'Đạt',
      'Tiêu chí đạt': '13/15',
    },
  ];
  const worksheet = XLSX.utils.json_to_sheet(testData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo 5S');
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });
  if (!excelBuffer || excelBuffer.length < 100) {
    throw new Error('Failed to generate valid XLSX buffer');
  }
  console.log(`✓ SheetJS XLSX export verified: generated valid workbook buffer of ${excelBuffer.length} bytes`);

  console.log('\nALL 6 CRITICAL INTEGRATION TEST SUITES PASSED! ✓');
}

runAssertions();

// Verify backend HTTP endpoint
const req = http.get('http://localhost:3000/api/health', (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log('\n=== TEST SUITE 7: BACKEND HEALTH API CHECK ===');
      console.log(`HTTP Status: ${res.statusCode}`);
      console.log(`API Health: status="${data.status}", model="${data.model}", faculty="${data.faculty}"`);
      if (res.statusCode === 200 && data.status === 'ok') {
        console.log('✓ Backend API health check passed!');
        process.exit(0);
      } else {
        console.error('Backend health check returned unexpected data');
        process.exit(1);
      }
    } catch (e: any) {
      console.error('Failed to parse health response:', e);
      process.exit(1);
    }
  });
});

req.on('error', (err) => {
  console.error('HTTP request failed:', err.message);
  process.exit(1);
});
