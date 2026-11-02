/**
 * Date and time formatters for Asia/Ho_Chi_Minh timezone
 */

export function formatDateVN(dateString?: string | null): string {
  if (!dateString) return 'Chưa có';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Chưa có';
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  } catch {
    return 'Chưa có';
  }
}

export function formatDateTimeVN(dateString?: string | null): string {
  if (!dateString) return 'Chưa có';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Chưa có';
    return d.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh',
    });
  } catch {
    return 'Chưa có';
  }
}

export function isTaskOverdue(createdAt: string, daysLimit = 3, status?: string): boolean {
  if (status === 'VERIFIED_DONE') return false;
  try {
    const created = new Date(createdAt).getTime();
    const deadline = created + daysLimit * 24 * 3600 * 1000;
    return Date.now() > deadline;
  } catch {
    return false;
  }
}
