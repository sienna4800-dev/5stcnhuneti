import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import {
  Bell,
  QrCode,
  User,
  ShieldAlert,
  ChevronDown,
  RefreshCw,
  LogOut,
  Building2,
  Cpu,
} from 'lucide-react';

interface NavbarProps {
  onOpenQRScanner: () => void;
  onNavigate: (tab: string) => void;
  currentTab: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenQRScanner, onNavigate, currentTab }) => {
  const {
    currentUser,
    setCurrentUser,
    logout,
    switchUserRole,
    settings,
    unreadNotifCount,
    hasGeminiKey,
    apiConnected,
    users,
  } = useApp();

  const [showRoleMenu, setShowRoleMenu] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs w-full min-w-0">
      {/* Top institution ribbon */}
      <div className="bg-slate-900 text-slate-200 text-xs py-1 px-3 sm:px-4 flex justify-between items-center tracking-wide min-w-0 gap-2">
        <div className="flex items-center gap-1.5 sm:gap-2 truncate min-w-0 flex-1">
          <span className="font-bold text-blue-400 shrink-0">UNETI</span>
          <span className="text-slate-500 shrink-0">|</span>
          <span className="truncate text-[11px] sm:text-xs">{settings.universityName}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-[10px] sm:text-[11px]">
          {hasGeminiKey ? (
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <Cpu className="w-3 h-3" />
              <span className="hidden xs:inline">AI Gemini 3.8</span>
              <span>Sẵn sàng</span>
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-amber-300 font-medium"
              title="Chưa cấu hình GEMINI_API_KEY ở backend"
            >
              <Cpu className="w-3 h-3" />
              <span>AI: Chưa cấu hình key</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-4 min-w-0">
        {/* Brand identity */}
        <div
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0 flex-1 sm:flex-initial"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-700 to-indigo-800 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-md group-hover:scale-105 transition-transform shrink-0">
            5S
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-slate-900 text-sm sm:text-lg leading-tight tracking-tight truncate">
                5S SMART
              </h1>
              <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-1 py-0.2 rounded border border-blue-200 shrink-0">
                TCNH&amp;BH
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 truncate max-w-[170px] sm:max-w-md">
              Khoa Tài chính – Ngân hàng và Bảo hiểm
            </p>
          </div>
        </div>

        {/* Action icons & User profile */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Quick QR scanner button */}
          <button
            type="button"
            onClick={onOpenQRScanner}
            title="Quét mã QR phòng"
            aria-label="Quét mã QR phòng"
            className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 p-2 sm:px-3 sm:py-2 rounded-xl font-medium text-xs sm:text-sm border border-blue-200 transition-colors cursor-pointer shrink-0"
          >
            <QrCode className="w-4 h-4" />
            <span className="hidden md:inline">Quét QR</span>
          </button>

          {/* Notifications bell */}
          <button
            type="button"
            onClick={() => onNavigate('notifications')}
            title="Thông báo"
            aria-label="Thông báo"
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadNotifCount}
              </span>
            )}
          </button>

          {/* Role switcher & User status */}
          <div className="relative shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                aria-label={`Tài khoản người dùng: ${currentUser.name}`}
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors text-left cursor-pointer"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-100 text-blue-800 flex items-center justify-center font-bold text-xs border border-slate-300 shrink-0">
                  {currentUser.name.charAt(0)}
                </div>
                <div className="hidden lg:block leading-tight max-w-[130px] truncate">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-blue-600 font-medium truncate">
                    {currentUser.roleTitle}
                  </p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block shrink-0" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="px-3 py-1.5 bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Đăng nhập
              </button>
            )}

            {/* Role Switcher Dropdown */}
            {showRoleMenu && currentUser && (
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-500">Tài khoản hiện tại:</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{currentUser.name}</p>
                  <span className="inline-block mt-1 text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    {currentUser.roleTitle}
                  </span>
                </div>

                {/* Only allow demo role switching when isDemoMode is enabled */}
                {settings.isDemoMode ? (
                  <div className="py-2 max-h-56 overflow-y-auto">
                    <div className="px-3 py-1 mb-1 bg-amber-50 rounded-lg border border-amber-200 text-[10px] text-amber-800 font-medium">
                      Chế độ thử nghiệm: Đổi vai trò kiểm tra quyền giao diện (dữ liệu demo tách biệt)
                    </div>
                    {users.map((user) => (
                      <button
                        type="button"
                        key={user.id}
                        onClick={() => {
                          setCurrentUser(user);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex flex-col gap-0.5 transition-colors cursor-pointer ${
                          currentUser.id === user.id
                            ? 'bg-blue-50 text-blue-800 font-medium'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="font-semibold">{user.name}</span>
                        <span className="text-[11px] text-slate-500">{user.roleTitle}</span>
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => {
                        switchUserRole('UNAPPROVED');
                        setShowRoleMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs flex flex-col gap-0.5 text-amber-700 hover:bg-amber-50 cursor-pointer mt-1"
                    >
                      <span className="font-semibold">Tài khoản chưa duyệt</span>
                      <span className="text-[11px] text-amber-600">Thử nghiệm "Chờ cấp quyền"</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 text-xs text-slate-500">
                    Chế độ vận hành chính thức: Chuyển đổi vai trò demo bị vô hiệu hóa.
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 px-3">
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate('settings');
                      setShowRoleMenu(false);
                    }}
                    className="hover:text-blue-700 font-medium cursor-pointer"
                  >
                    Cài đặt
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoleMenu(false);
                      logout();
                    }}
                    className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
