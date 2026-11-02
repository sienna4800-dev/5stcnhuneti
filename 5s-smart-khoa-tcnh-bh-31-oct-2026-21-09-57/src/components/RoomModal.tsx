import React, { useState, useEffect } from 'react';
import { Room, RoomType } from '../types.ts';
import { useApp } from '../context/AppContext.tsx';
import { X, Building, Save } from 'lucide-react';
import { DEFAULT_CHECKLIST } from '../data/defaultData.ts';

interface RoomModalProps {
  room?: Room | null;
  onClose: () => void;
  onSave: (room: Partial<Room>) => Promise<void>;
}

export const RoomModal: React.FC<RoomModalProps> = ({ room, onClose, onSave }) => {
  const [id, setId] = useState(room?.id || '');
  const [name, setName] = useState(room?.name || '');
  const [type, setType] = useState<RoomType>(room?.type || 'LAB');
  const [location, setLocation] = useState(room?.location || '');
  const [manager, setManager] = useState(room?.manager || '');
  const [specificNotes, setSpecificNotes] = useState(room?.specificNotes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { users } = useApp();
  const isEditing = Boolean(room);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !name.trim()) {
      alert('Vui lòng nhập mã phòng và tên phòng.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: id.trim().toUpperCase(),
        name: name.trim(),
        type,
        location: location.trim(),
        manager: manager.trim(),
        specificNotes: specificNotes.trim(),
        checklist: room?.checklist || DEFAULT_CHECKLIST,
      });
      onClose();
    } catch (err: any) {
      alert(err?.message || 'Có lỗi khi lưu phòng');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-700" />
            <h3 className="font-bold text-base text-slate-900">
              {isEditing ? `Chỉnh sửa Thông tin Phòng: ${room?.name}` : 'Thêm Phòng / Khu vực Mới'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mã nội bộ phòng (ID cố định):
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                disabled={isEditing} // ID is fixed to avoid breaking QR
                placeholder="VD: PTH03, VPK2..."
                required
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-mono uppercase font-bold disabled:bg-slate-200"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isEditing ? 'Mã cố định gắn liền với mã QR đã in' : 'Mã không dấu, ví dụ: PTH03'}
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Loại khu vực:</label>
              <select
                value={type}
                onChange={(e: any) => setType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
              >
                <option value="LAB">Phòng thực hành (LAB)</option>
                <option value="OFFICE">Văn phòng khoa (OFFICE)</option>
                <option value="MEETING">Không gian CLB / Sinh hoạt (MEETING)</option>
                <option value="CLASSROOM">Phòng học (CLASSROOM)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Tên hiển thị phòng:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Phòng thực hành 3 (Phòng mô phỏng ngân hàng)"
              required
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Vị trí thực tế (Nếu có):
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Để trống nếu chưa có"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
              />
              <p className="text-[10px] text-slate-400 mt-0.5">Để trống hiển thị "Chưa cập nhật"</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Người phụ trách:
              </label>
              <select
                value={
                  users.some((u) => u.name === manager)
                    ? manager
                    : manager.trim() === ''
                    ? ''
                    : 'CUSTOM'
                }
                onChange={(e) => {
                  if (e.target.value === 'CUSTOM') {
                    // keep current manager or set blank
                  } else {
                    setManager(e.target.value);
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium mb-1.5"
              >
                <option value="">-- Chưa phân công --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.name}>
                    {u.name} ({u.roleTitle})
                  </option>
                ))}
                <option value="CUSTOM">Khác (Nhập tên tùy chỉnh)...</option>
              </select>

              {(!users.some((u) => u.name === manager) && manager.trim() !== '') ||
                (!users.some((u) => u.name === manager) && manager === 'CUSTOM') ? (
                <input
                  type="text"
                  value={manager === 'CUSTOM' ? '' : manager}
                  onChange={(e) => setManager(e.target.value)}
                  placeholder="Nhập tên người phụ trách..."
                  className="w-full bg-white border border-blue-400 rounded-xl p-2"
                />
              ) : null}
              <p className="text-[10px] text-slate-400 mt-0.5">Để trống hiển thị "Chưa phân công"</p>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nội dung kiểm tra đặc thù:
            </label>
            <textarea
              value={specificNotes}
              onChange={(e) => setSpecificNotes(e.target.value)}
              placeholder="VD: Bàn ghế, máy tính, thiết bị, dây điện, vệ sinh và bố trí phòng..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 transition-colors cursor-pointer shadow-xs"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu thông tin phòng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
