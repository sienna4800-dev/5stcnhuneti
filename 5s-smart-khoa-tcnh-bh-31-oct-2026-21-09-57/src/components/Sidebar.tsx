import React from 'react';
import {
  Home,
  ClipboardCheck,
  Wrench,
  Calendar,
  BarChart3,
  Settings,
  Bell,
  QrCode,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';
import { is5SAdminOrLeader } from '../utils/permissions.ts';

interface SidebarProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
  onOpenQRScanner: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onNavigate, onOpenQRScanner }) => {
  const { currentUser, tasks, unreadNotifCount, logout } = useApp();

  const openTaskCount = tasks.filter((t) => t.status !== 'VERIFIED_DONE').length;
  const isAuthorized = is5SAdminOrLeader(currentUser);

  const navItems = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'inspect', label: 'Kiểm tra 5S', icon: ClipboardCheck },
    {
      id: 'tasks',
      label: 'Khắc phục tồn tại',
      icon: Wrench,
      badge: openTaskCount > 0 ? openTaskCount : undefined,
    },
    { id: 'schedules', label: 'Lịch kiểm tra', icon: Calendar },
    ...(isAuthorized
      ? [
          { id: 'reports', label: 'Báo cáo tổng hợp', icon: BarChart3 },
          { id: 'settings', label: 'Quản trị & Cài đặt', icon: Settings },
        ]
      : []),
    {
      id: 'notifications',
      label: 'Thông báo',
      icon: Bell,
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
    },
  ];

  return (
    <aside className="hidden sm:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 min-h-[calc(100vh-6rem)] p-4">
      {/* Quick Launch QR Button */}
      <div className="mb-5">
        <button
          onClick={onOpenQRScanner}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-medium py-2.5 px-4 rounded-xl shadow-xs transition-all cursor-pointer text-sm"
        >
          <QrCode className="w-4 h-4" />
          <span>Quét mã QR phòng</span>
        </button>
      </div>

      {/* Navigation Menu */}
      <nav className="space-y-1.5 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-50 text-blue-800 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${isActive ? 'text-blue-700 stroke-[2.5]' : 'text-slate-400'}`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Faculty badge & Role box */}
      <div className="pt-4 border-t border-slate-100 space-y-2">
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs">
          <div className="flex items-center gap-2 mb-1 text-slate-700 font-semibold">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="truncate">{currentUser?.roleTitle || 'Khách'}</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">{currentUser?.department || 'Khoa TCNH&BH'}</p>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-red-200"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Đăng xuất tài khoản</span>
        </button>
      </div>
    </aside>
  );
};
