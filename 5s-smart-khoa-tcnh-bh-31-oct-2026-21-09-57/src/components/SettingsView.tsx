import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { UserProfile } from '../types.ts';
import { is5SAdminOrLeader, canManagePersonnel } from '../utils/permissions.ts';
import {
  Settings,
  Shield,
  Save,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Info,
  Building,
  Key,
  Users,
  AlertTriangle,
  Lock,
  Plus,
  Trash2,
  QrCode,
  Globe,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, resetDemoData, currentUser, users, updateUsers } = useApp();

  const isAuthorized = is5SAdminOrLeader(currentUser);
  const canAddStaff = canManagePersonnel(currentUser);

  const [facultyName, setFacultyName] = useState(settings.facultyName);
  const [universityName, setUniversityName] = useState(settings.universityName);
  const [passThreshold, setPassThreshold] = useState(settings.passThreshold || 80);
  const [deadlineDays, setDeadlineDays] = useState(settings.defaultTaskDeadlineDays || 3);
  const [publicAppUrl, setPublicAppUrl] = useState(settings.publicAppUrl || '');
  const [urlValidationError, setUrlValidationError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [userList, setUserList] = useState<UserProfile[]>(users);

  useEffect(() => {
    setUserList(users);
  }, [users]);

  // If user is neither 5S Admin nor Leader, block access with clear explanation
  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Quyền truy cập hạn chế</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Chức năng <span className="font-semibold text-slate-800">Quản trị &amp; Cài đặt</span> và <span className="font-semibold text-slate-800">Quản lý/Thêm nhân sự</span> chỉ dành riêng cho tài khoản có nhãn:
        </p>
        <div className="flex flex-col gap-2 max-w-sm mx-auto text-left text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span className="font-bold text-slate-900">Đầu mối 5S / Quản trị viên:</span>
            <span className="text-slate-600">TS. Phạm Đức Tài</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            <span className="font-bold text-slate-900">Lãnh đạo khoa / Trưởng khoa:</span>
            <span className="text-slate-600">TS. Phùng Thị Lan Hương</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 italic">
          Tài khoản hiện tại của bạn: <span className="font-semibold text-slate-700">{currentUser?.name}</span> ({currentUser?.roleTitle})
        </p>
      </div>
    );
  }

  const handleUserChange = (index: number, field: keyof UserProfile, value: string) => {
    setUserList((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddUser = () => {
    if (!canAddStaff) {
      alert('Chỉ tài khoản Đầu mối 5S/Admin và Lãnh đạo khoa mới có quyền thêm nhân sự.');
      return;
    }
    setUserList((prev) => [
      ...prev,
      {
        id: `user_${Date.now()}`,
        name: 'ThS. Giảng viên mới',
        role: 'LECTURER',
        roleTitle: 'Giảng viên',
        email: 'giangvien.moi@uneti.edu.vn',
        department: facultyName,
      },
    ]);
  };

  const handleRemoveUser = (index: number) => {
    if (!canAddStaff) {
      alert('Chỉ tài khoản Đầu mối 5S/Admin và Lãnh đạo khoa mới có quyền xóa nhân sự.');
      return;
    }
    if (userList.length <= 1) {
      alert('Hệ thống cần tối thiểu 1 người dùng quản trị.');
      return;
    }
    setUserList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveUsers = async () => {
    await updateUsers(userList);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlValidationError(null);

    const trimmedUrl = publicAppUrl.trim();
    if (trimmedUrl.length > 0) {
      if (!trimmedUrl.startsWith('https://')) {
        setUrlValidationError('URL vận hành công khai bắt buộc phải có định dạng HTTPS (bắt đầu bằng https://).');
        return;
      }
    }

    await updateSettings({
      facultyName: facultyName.trim(),
      universityName: universityName.trim(),
      passThreshold: Number(passThreshold),
      defaultTaskDeadlineDays: Number(deadlineDays),
      publicAppUrl: trimmedUrl ? trimmedUrl.replace(/\/$/, '') : undefined,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto min-w-0">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">Quản trị &amp; Cài đặt Hệ thống</h2>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Đầu mối 5S / Admin &amp; Lãnh đạo khoa
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Thiết lập nhận diện đơn vị, ngưỡng điểm đạt 5S, URL vận hành và nhân sự khoa.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="bg-emerald-600 text-white text-xs font-semibold p-3.5 rounded-xl flex items-center gap-2 shadow-sm animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Đã lưu thành công các thay đổi cấu hình hệ thống!</span>
        </div>
      )}

      {/* Architecture Honesty Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-2 text-slate-600">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <Info className="w-4 h-4 text-blue-700 shrink-0" />
          <span>Kiến trúc dữ liệu &amp; Giới hạn phân quyền</span>
        </div>
        <p className="leading-relaxed">
          <strong>Bản thử nghiệm — dữ liệu lưu trữ cục bộ trên máy chủ phiên làm việc (data/db.json):</strong> Hiện tại dữ liệu phòng, phiếu kiểm tra và nhiệm vụ tồn tại được lưu trong tệp JSON nội bộ của phiên làm việc, chưa kết nối CSDL đám mây tập trung dùng chung.
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Cơ chế phân quyền được thực thi ở tầng giao diện và dịch vụ nội bộ theo vai trò đã cấp; không tự khẳng định tính bảo mật cấp hệ thống ngoài phạm vi ứng dụng.
        </p>
      </div>

      {/* Faculty Personnel Management */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-700" />
              <span>Ban Lãnh đạo Khoa &amp; Danh sách Nhân sự / Người phụ trách 5S</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân quyền &amp; cập nhật thông tin Trưởng khoa, Đầu mối 5S và Giảng viên trong khoa.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canAddStaff && (
              <button
                type="button"
                onClick={handleAddUser}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm nhân sự</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleSaveUsers}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Lưu danh sách</span>
            </button>
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            Chỉ tài khoản có vai trò <strong>Đầu mối 5S / Admin</strong> (TS. Phạm Đức Tài) và <strong>Lãnh đạo khoa</strong> (TS. Phùng Thị Lan Hương) mới có quyền thêm nhân sự mới và cấu hình hệ thống.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {userList.map((u, idx) => (
            <div key={u.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  u.role === 'LEADER'
                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                    : u.role === 'ADMIN'
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : u.role === 'LECTURER'
                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {u.roleTitle || u.role}
                </span>

                {userList.length > 1 && canAddStaff && (
                  <button
                    type="button"
                    onClick={() => handleRemoveUser(idx)}
                    className="text-red-600 hover:text-red-800 hover:underline cursor-pointer flex items-center gap-1 text-[11px]"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600">Họ tên &amp; Học hàm/học vị:</label>
                <input
                  type="text"
                  value={u.name}
                  onChange={(e) => handleUserChange(idx, 'name', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Vai trò phân quyền:</label>
                  <select
                    value={u.role}
                    onChange={(e) => {
                      const newRole = e.target.value as UserProfile['role'];
                      let newTitle = u.roleTitle;
                      if (newRole === 'ADMIN') newTitle = 'Đầu mối 5S / Quản trị viên';
                      if (newRole === 'LEADER') newTitle = 'Trưởng khoa';
                      if (newRole === 'LECTURER') newTitle = 'Giảng viên';
                      if (newRole === 'STUDENT') newTitle = 'Sinh viên';

                      setUserList((prev) => {
                        const copy = [...prev];
                        copy[idx] = { ...copy[idx], role: newRole, roleTitle: newTitle };
                        return copy;
                      });
                    }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-medium"
                  >
                    <option value="ADMIN">Đầu mối 5S / Admin</option>
                    <option value="LEADER">Lãnh đạo khoa</option>
                    <option value="LECTURER">Giảng viên</option>
                    <option value="STUDENT">Sinh viên</option>
                    <option value="UNAPPROVED">Chờ cấp quyền</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Chức danh hiển thị:</label>
                  <input
                    type="text"
                    value={u.roleTitle}
                    onChange={(e) => handleUserChange(idx, 'roleTitle', e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600">Email công vụ:</label>
                <input
                  type="email"
                  value={u.email}
                  onChange={(e) => handleUserChange(idx, 'email', e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-[11px]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
          <Building className="w-4 h-4 text-blue-700" />
          <span>Thông tin Nhận diện Đơn vị</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tên trường:</label>
            <input
              type="text"
              value={universityName}
              onChange={(e) => setUniversityName(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tên khoa / Đơn vị:</label>
            <input
              type="text"
              value={facultyName}
              onChange={(e) => setFacultyName(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
            />
          </div>
        </div>

        {/* Operational URL & QR Configuration */}
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 pt-2 pb-2 border-b border-slate-100">
          <Globe className="w-4 h-4 text-blue-700" />
          <span>Cấu hình URL Vận hành &amp; Mã QR Phòng</span>
        </h3>

        <div className="space-y-2 text-xs">
          <label htmlFor="publicAppUrlInput" className="block font-semibold text-slate-700">
            URL vận hành công khai của ứng dụng (Bắt buộc định dạng HTTPS):
          </label>
          <input
            id="publicAppUrlInput"
            type="url"
            value={publicAppUrl}
            onChange={(e) => {
              setPublicAppUrl(e.target.value);
              setUrlValidationError(null);
            }}
            placeholder="https://5s.tcnh.uneti.edu.vn"
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono text-xs"
          />
          {urlValidationError && (
            <p className="text-red-600 font-semibold">{urlValidationError}</p>
          )}
          <p className="text-[11px] text-slate-500 leading-relaxed">
            * Khi được cấu hình, mã QR của từng phòng sẽ trỏ trực tiếp đến URL vận hành này mà không chứa token nhạy cảm. Khi để trống, thẻ QR sẽ hiển thị cảnh báo "QR thử nghiệm — chưa cấu hình URL vận hành".
          </p>
        </div>

        {/* 5S Evaluation Parameters */}
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 pt-2 pb-2 border-b border-slate-100">
          <Sliders className="w-4 h-4 text-blue-700" />
          <span>Tham số Đánh giá 5S &amp; Xử lý Tồn tại</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ngưỡng điểm Đạt chuẩn 5S (%):
            </label>
            <input
              type="number"
              min="50"
              max="100"
              value={passThreshold}
              onChange={(e) => setPassThreshold(Number(e.target.value))}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1 italic">
              * Mặc định 80%. Đây là cấu hình ban đầu có thể điều chỉnh, không phải quy định cứng của trường.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Thời hạn khắc phục mặc định (ngày):
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(Number(e.target.value))}
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold"
            />
            <p className="text-[11px] text-slate-500 mt-1 italic">
              * Mặc định sau 3 ngày kể từ khi phát sinh nhiệm vụ Không đạt.
            </p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
          >
            <Save className="w-4 h-4" />
            <span>Lưu cài đặt</span>
          </button>
        </div>
      </form>
    </div>
  );
};
