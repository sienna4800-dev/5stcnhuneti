/**
 * Threshold and Date Formatting Utilities for 5S UNETI System
 */

export type ThresholdEvaluationResult = 'PASSED' | 'FAILED' | 'INSUFFICIENT_EVIDENCE';

/**
 * Standardized function to classify 5S inspection score based on configured threshold.
 * Uses RAW unrounded score for comparison to eliminate rounding artifacts.
 * No arbitrary "Xuất sắc" levels unless configured.
 * 
 * @param score Raw or rounded score percentage (0 - 100)
 * @param threshold Pass threshold percentage (default 80)
 * @param applicableCount Number of applicable criteria evaluated
 */
export function classifyInspectionResult(
  score: number | null | undefined,
  threshold: number = 80,
  applicableCount: number = 15
): ThresholdEvaluationResult {
  if (score === null || score === undefined || !Number.isFinite(score) || applicableCount === 0) {
    return 'INSUFFICIENT_EVIDENCE';
  }

  // Compare using raw score vs threshold
  return score >= threshold ? 'PASSED' : 'FAILED';
}

/**
 * Returns human-friendly Vietnamese label for threshold evaluation
 */
export function getResultLabel(result: ThresholdEvaluationResult): string {
  switch (result) {
    case 'PASSED':
      return 'Đạt chuẩn';
    case 'FAILED':
      return 'Không đạt';
    case 'INSUFFICIENT_EVIDENCE':
      return 'Không đủ cơ sở đánh giá';
  }
}

/**
 * Format date in Vietnamese format (dd/MM/yyyy or dd/MM/yyyy HH:mm)
 * strictly using timezone 'Asia/Ho_Chi_Minh' (GMT+7)
 */
export function formatVNDate(
  dateInput: string | number | Date | null | undefined,
  includeTime: boolean = false
): string {
  if (!dateInput) return 'Chưa có thông tin';

  try {
    const date = typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;

    if (isNaN(date.getTime())) {
      return 'Ngày không hợp lệ';
    }

    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      ...(includeTime
        ? {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }
        : {}),
    };

    return new Intl.DateTimeFormat('vi-VN', options).format(date);
  } catch (err) {
    return 'Ngày không hợp lệ';
  }
}


/** Evaluate legacy and current records from evidence counts, never the stored display enum. */
export function evaluateInspectionRecord(record: {
  passedCriteria?: number;
  failedCriteria?: number;
  applicableCriteria?: number;
  officialScore?: number | null;
  passScoreThreshold?: number;
  decisions?: { status: string }[];
}) {
  const validCount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;
  let passed: number | undefined;
  let failed: number | undefined;
  if (validCount(record.passedCriteria) && validCount(record.failedCriteria)) {
    passed = record.passedCriteria;
    failed = record.failedCriteria;
  } else if (Array.isArray(record.decisions) && record.decisions.length > 0) {
    passed = record.decisions.filter(item => item.status === 'PASSED').length;
    failed = record.decisions.filter(item => item.status === 'FAILED').length;
  }
  const applicableCount = passed !== undefined && failed !== undefined
    ? passed + failed
    : validCount(record.applicableCriteria) ? record.applicableCriteria : null;
  const snapshotScore = typeof record.officialScore === 'number' && Number.isFinite(record.officialScore)
    ? record.officialScore : null;
  const score = applicableCount === 0 ? null
    : passed !== undefined && applicableCount !== null && applicableCount > 0
      ? passed / applicableCount * 100 : snapshotScore;
  const threshold = typeof record.passScoreThreshold === 'number' && Number.isFinite(record.passScoreThreshold)
    ? record.passScoreThreshold : 80;
  const result = classifyInspectionResult(score, threshold, applicableCount ?? 0);
  const label = applicableCount === null ? 'Thiếu dữ liệu đánh giá' : getResultLabel(result);
  return { score, applicableCount, threshold, result, label };
}
