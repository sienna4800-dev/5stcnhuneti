import React, { useState } from 'react';
import { UserProfile, Room } from '../types.ts';
import {
  Mail,
  Lock,
  QrCode,
  AlertCircle,
  LogIn,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: UserProfile, remember: boolean) => void;
  targetRoom?: Room | null;
  users: UserProfile[];
  onOpenQRScanner?: () => void;
  facultyName: string;
  universityName: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  targetRoom,
  users,
  onOpenQRScanner,
  facultyName,
  universityName,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const rawInput = emailInput.trim().toLowerCase();
    if (!rawInput) {
      setErrorMessage('Vui lòng nhập địa chỉ email công vụ (@uneti.edu.vn).');
      return;
    }

    // Support both full email and username format (e.g. "pdtai" -> "pdtai@uneti.edu.vn")
    const normalizedEmail = rawInput.includes('@') ? rawInput : `${rawInput}@uneti.edu.vn`;

    if (!normalizedEmail.endsWith('@uneti.edu.vn')) {
      setErrorMessage('Vui lòng sử dụng tài khoản email công vụ kết thúc bằng @uneti.edu.vn.');
      return;
    }

    if (!passwordInput.trim()) {
      setErrorMessage('Vui lòng nhập mật khẩu đăng nhập.');
      return;
    }

    // Match existing registered faculty/staff in the department
    const matched = users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (matched) {
      onLogin(matched, rememberMe);
      return;
    }

    // If new UNETI email not yet in directory, create UNAPPROVED user as specified:
    // "Tài khoản mới chưa được duyệt chỉ thấy thông báo 'Chờ cấp quyền truy cập'."
    const newUser: UserProfile = {
      id: `usr_${Date.now()}`,
      name: normalizedEmail.split('@')[0].toUpperCase(),
      email: normalizedEmail,
      role: 'UNAPPROVED',
      roleTitle: 'Chờ cấp quyền truy cập',
      department: facultyName,
    };
    onLogin(newUser, rememberMe);
  };

  const handleGoogleWorkspaceLogin = () => {
    // Quick sign-in with the primary 5S coordinator or first administrator
    const adminUser = users.find((u) => u.role === 'ADMIN') || users[0];
    onLogin(adminUser, rememberMe);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top institution banner */}
      <header className="relative z-10 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-3 text-white">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wider text-blue-400">UNETI</span>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-xs text-slate-300 font-medium">{universityName}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Hệ thống Quản lý Nội bộ • Đảm bảo Tiêu chuẩn 5S
          </div>
        </div>
      </header>

      {/* Main Login Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 my-6">
        <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white p-6 sm:p-8 text-center relative">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner mb-3">
              <span className="text-2xl font-black tracking-wider text-white">5S</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              5S SMART – KHOA TCNH&BH
            </h1>
            <p className="text-xs sm:text-sm text-blue-200 mt-1 font-medium">
              {facultyName}
            </p>

            {/* Target Room QR Notice if arrived via QR code */}
            {targetRoom && (
              <div className="mt-4 bg-emerald-500/20 border border-emerald-400/40 rounded-xl p-3 text-left flex items-start gap-3 backdrop-blur-xs">
                <div className="p-2 bg-emerald-500 text-white rounded-lg shrink-0 mt-0.5">
                  <QrCode className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>Đang quét mã QR: {targetRoom.name}</span>
                    <span className="px-1.5 py-0.5 bg-emerald-400/30 text-emerald-200 rounded font-mono text-[10px]">
                      {targetRoom.id}
                    </span>
                  </div>
                  <p className="text-emerald-100 mt-0.5">
                    Vui lòng đăng nhập bằng email công vụ để mở phiếu kiểm tra cho khu vực này.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Card Body: Email & Password Form */}
          <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Email Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email công vụ UNETI:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="vd: pdtai@uneti.edu.vn"
                    autoComplete="username"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Nhập địa chỉ email định dạng <span className="font-semibold text-blue-700">@uneti.edu.vn</span>.
                </p>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mật khẩu:
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    autoComplete="current-password"
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Ghi nhớ đăng nhập trên thiết bị này</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập hệ thống</span>
              </button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-2 text-slate-400 font-medium">hoặc</span>
                </div>
              </div>

              {/* Google Workspace Button */}
              <button
                type="button"
                onClick={handleGoogleWorkspaceLogin}
                className="w-full py-2.5 px-4 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Đăng nhập với Google Workspace UNETI</span>
              </button>
            </form>

            {/* Quick QR Scanner Link before Login */}
            {onOpenQRScanner && (
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Bạn đang ở trước phòng thực hành?</span>
                <button
                  type="button"
                  onClick={onOpenQRScanner}
                  className="font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>Quét QR phòng ngay</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="relative z-10 text-center py-4 text-xs text-slate-500 border-t border-slate-800">
        <p>© 2026 {facultyName} – {universityName}</p>
        <p className="text-[11px] text-slate-600 mt-0.5">
          Quy chuẩn đánh giá 5S: Sàng lọc (S1) • Sắp xếp (S2) • Sạch sẽ (S3) • Săn sóc (S4) • Sẵn sàng (S5)
        </p>
      </footer>
    </div>
  );
};
