import { UserProfile } from '../types.ts';

/**
 * Checks if user has permission as "Đầu mối 5S / Admin" or "Lãnh đạo khoa"
 * As requested: "phân quyền lại chỉ có tài khoản có nhãn đầu mối 5s/admin và lãnh đạo khoa có quyền thêm nhân sự, xem báo cáo tổng,..."
 */
export const is5SAdminOrLeader = (user: UserProfile | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'ADMIN' || user.role === 'LEADER';
};

/**
 * Only Đầu mối 5S / Admin and Lãnh đạo khoa can add, modify, or remove personnel
 */
export const canManagePersonnel = (user: UserProfile | null | undefined): boolean => {
  return is5SAdminOrLeader(user);
};

/**
 * Only Đầu mối 5S / Admin and Lãnh đạo khoa can view comprehensive reports (Báo cáo tổng hợp)
 */
export const canViewComprehensiveReports = (user: UserProfile | null | undefined): boolean => {
  return is5SAdminOrLeader(user);
};

/**
 * Only Đầu mối 5S / Admin and Lãnh đạo khoa can manage rooms (Thêm phòng, sửa thông tin phòng)
 */
export const canManageRooms = (user: UserProfile | null | undefined): boolean => {
  return is5SAdminOrLeader(user);
};

/**
 * Only Đầu mối 5S / Admin and Lãnh đạo khoa can access system settings & administration
 */
export const canManageSettings = (user: UserProfile | null | undefined): boolean => {
  return is5SAdminOrLeader(user);
};
