import React, { useState } from 'react';
import { InspectionSchedule, Room } from '../types.ts';
import { useApp } from '../context/AppContext.tsx';
import { Calendar, Plus, User, Clock, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export const SchedulesView: React.FC = () => {
  const { schedules, rooms, currentUser, addSchedule } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);

  const [roomId, setRoomId] = useState<string>(rooms[0]?.id || '');
  const [inspectorName, setInspectorName] = useState<string>(currentUser?.name || 'Cán bộ phụ trách');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  const isAdmin = currentUser?.role === 'ADMIN';

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoom = rooms.find((r) => r.id === roomId);
    if (!targetRoom) return;

    await addSchedule({
      roomId: targetRoom.id,
      roomName: targetRoom.name,
      inspectorName: inspectorName.trim(),
      frequency,
      dueDate,
      notes: notes.trim(),
      status: 'PENDING',
    });

    setShowAddModal(false);
    setNotes('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Lịch Kiểm tra 5S Định kỳ</h2>
          <p className="text-xs text-slate-500 mt-1">
            Lập kế hoạch và theo dõi thời hạn kiểm tra định kỳ cho các phòng thuộc Khoa TCNH&amp;BH.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo lịch kiểm tra mới</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {schedules.map((sch) => (
          <div
            key={sch.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                  {sch.frequency === 'DAILY' ? 'Hằng ngày' : sch.frequency === 'WEEKLY' ? 'Hằng tuần' : 'Hằng tháng'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    sch.status === 'OVERDUE'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {sch.status === 'OVERDUE' ? 'Quá hạn' : 'Sắp đến hạn'}
                </span>
              </div>

              <h4 className="font-bold text-base text-slate-900">{sch.roomName}</h4>
              <p className="text-xs text-slate-600 mt-1">
                Người phụ trách: <span className="font-semibold text-slate-800">{sch.inspectorName}</span>
              </p>
              {sch.notes && (
                <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg mt-2">
                  {sch.notes}
                </p>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1 font-medium text-slate-700">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Hạn: {sch.dueDate}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">Tạo Lịch Kiểm tra Mới</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn phòng:</label>
                <select
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
                >
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      [{r.id}] {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Người thực hiện kiểm tra:</label>
                <input
                  type="text"
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tần suất:</label>
                  <select
                    value={frequency}
                    onChange={(e: any) => setFrequency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
                  >
                    <option value="DAILY">Hằng ngày</option>
                    <option value="WEEKLY">Hằng tuần</option>
                    <option value="MONTHLY">Hằng tháng</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày đến hạn:</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung lưu ý:</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ghi chú cụ thể đợt kiểm tra..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-semibold hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800"
                >
                  Lưu lịch kiểm tra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
