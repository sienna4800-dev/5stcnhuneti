import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { deriveRoomStats } from '../utils/roomUtils.ts';
import { formatVNDate } from '../utils/thresholdUtils.ts';
import {
  ClipboardCheck,
  Sparkles,
  QrCode,
  Wrench,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Building,
  User,
  ArrowRight,
  TrendingUp,
  Info,
} from 'lucide-react';
import { Room } from '../types.ts';
import { is5SAdminOrLeader } from '../utils/permissions.ts';

interface HomeDashboardProps {
  onNavigate: (tab: string) => void;
  onOpenQRScanner: () => void;
  onStartManual: (room: Room) => void;
  onStartAI: (room: Room) => void;
  onSelectRoom: (room: Room) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({
  onNavigate,
  onOpenQRScanner,
  onStartManual,
  onStartAI,
  onSelectRoom,
}) => {
  const { currentUser, rooms, tasks, inspections, schedules, settings } = useApp();

  const isStudent = currentUser?.role === 'STUDENT';
  const displayRooms = isStudent
    ? rooms.filter((r) => r.id === 'FBC')
    : rooms;

  const openTasks = tasks.filter((t) => t.status !== 'VERIFIED_DONE').length;
  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'VERIFIED_DONE') return false;
    const created = new Date(t.createdAt).getTime();
    return Date.now() > created + (settings.defaultTaskDeadlineDays || 3) * 24 * 3600 * 1000;
  }).length;

  // Recent inspections sorted descending by timestamp
  const sortedInspections = [...inspections].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const recentInspections = sortedInspections.slice(0, 3);

  // Average pass rate calculated from total criteria
  let totalP = 0;
  let totalA = 0;
  inspections.forEach((i) => {
    totalP += i.passedCriteria || 0;
    totalA += i.applicableCriteria || 0;
  });
  const avgPassRate = totalA > 0 ? Math.round((totalP / totalA) * 1000) / 10 : 0;

  return (
    <div className="space-y-4 sm:space-y-5 min-w-0">
      {/* Compact Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-sm relative overflow-hidden min-w-0">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 bg-blue-700/50 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-blue-200 border border-blue-500/30 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>Hệ thống 5S Thông minh Khoa TCNH&amp;BH</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug">
            Xin chào, {currentUser?.name || 'Quý Thầy/Cô'}!
          </h2>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Vai trò: <span className="font-semibold text-white">{currentUser?.roleTitle || 'Khách'}</span> • {currentUser?.department || 'Khoa TCNH&BH'}
          </p>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 mt-4 flex-wrap">
            <button
              type="button"
              onClick={onOpenQRScanner}
              aria-label="Quét mã QR phòng"
              className="bg-white hover:bg-slate-100 text-blue-900 font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition-transform hover:scale-102 cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-blue-700" />
              <span>Quét mã QR phòng</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('inspect')}
              aria-label="Xem danh sách phòng kiểm tra 5S"
              className="bg-blue-600/80 hover:bg-blue-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs border border-blue-400/40 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Danh sách phòng kiểm tra</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 min-w-0">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium truncate">Khu vực quản lý</span>
            <Building className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{displayRooms.length}</p>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">Phòng &amp; văn phòng khoa</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium truncate">Tồn tại cần xử lý</span>
            <Wrench className="w-4 h-4 text-amber-500 shrink-0" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600">{openTasks}</p>
          <p className="text-[11px] text-red-600 font-semibold mt-0.5 truncate">
            {overdueTasks > 0 ? `${overdueTasks} việc quá hạn` : 'Không có quá hạn'}
          </p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium truncate">Tỷ lệ tuân thủ</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600">{avgPassRate}%</p>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">Chuẩn 5S toàn khoa</p>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs min-w-0">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span className="font-medium truncate">Lượt kiểm tra</span>
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900">{inspections.length}</p>
          <p className="text-[11px] text-blue-700 font-medium mt-0.5 truncate">Phiếu đã ghi nhận</p>
        </div>
      </div>

      {/* Pre-populated Rooms Shortcut List with DYNAMIC derivation */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm sm:text-base truncate">
              Phòng &amp; Khu vực thuộc quyền quản lý
            </h3>
            <p className="text-xs text-slate-500 truncate">
              Điểm và tồn tại được tổng hợp tự động từ phiếu kiểm tra thực tế
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('inspect')}
            aria-label="Xem tất cả phòng kiểm tra 5S"
            className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer shrink-0"
          >
            <span>Xem tất cả</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 min-w-0">
          {displayRooms.slice(0, 3).map((room) => {
            const stats = deriveRoomStats(room.id, inspections, tasks, settings);

            let statusBadge = (
              <span className="text-[11px] font-semibold text-slate-500">
                Chưa KT
              </span>
            );

            if (stats.hasInspection && stats.lastScore !== null && stats.lastScore !== undefined) {
              if (stats.lastResult === 'PASSED') {
                statusBadge = (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {stats.lastScore}% • Đạt
                  </span>
                );
              } else if (stats.lastResult === 'FAILED') {
                statusBadge = (
                  <span className="text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    {stats.lastScore}% • K.Đạt
                  </span>
                );
              } else {
                statusBadge = (
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    Không đủ cơ sở
                  </span>
                );
              }
            }

            return (
              <div
                key={room.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all flex flex-col justify-between min-w-0"
              >
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 shrink-0">
                      {room.id}
                    </span>
                    <div className="shrink-0">{statusBadge}</div>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 truncate">{room.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {stats.openTaskCount > 0 ? (
                      <span className="text-amber-700 font-medium">
                        {stats.openTaskCount} tồn tại cần xử lý
                      </span>
                    ) : stats.hasInspection ? (
                      <span className="text-slate-600">
                        KT gần nhất: {formatVNDate(stats.lastInspectedAt)}
                      </span>
                    ) : (
                      'Chưa có lịch sử kiểm tra'
                    )}
                  </p>
                </div>

                <div className="pt-2.5 border-t border-slate-200/70 mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onStartAI(room)}
                    aria-label={`Đánh giá AI phòng ${room.name}`}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer truncate"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">Đánh giá AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onStartManual(room)}
                    aria-label={`Kiểm tra thủ công phòng ${room.name}`}
                    className="text-xs font-semibold text-slate-600 hover:text-blue-700 cursor-pointer shrink-0"
                  >
                    Thủ công →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Schedules & Recent Inspections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
        {/* Schedules card */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-700" />
              <span>Lịch Kiểm tra Sắp đến hạn</span>
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('schedules')}
              aria-label="Xem chi tiết lịch kiểm tra 5S"
              className="text-xs text-blue-700 font-semibold hover:underline cursor-pointer"
            >
              Chi tiết
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {schedules.slice(0, 3).map((sch) => (
              <div
                key={sch.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-900 truncate">{sch.roomName}</p>
                  <p className="text-slate-500 text-[11px] truncate">
                    Hạn: {formatVNDate(sch.dueDate)} • {sch.inspectorName}
                  </p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    sch.status === 'OVERDUE'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {sch.status === 'OVERDUE' ? 'Quá hạn' : 'Đang chờ'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Inspections (ordered by timestamp descending) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-emerald-600" />
              <span>Hoạt động Đánh giá Gần đây</span>
            </h3>
            {is5SAdminOrLeader(currentUser) ? (
              <button
                type="button"
                onClick={() => onNavigate('reports')}
                aria-label="Xem báo cáo tổng hợp 5S"
                className="text-xs text-blue-700 font-semibold hover:underline cursor-pointer"
              >
                Xem báo cáo
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('inspect')}
                aria-label="Xem tất cả phòng kiểm tra"
                className="text-xs text-blue-700 font-semibold hover:underline cursor-pointer"
              >
                Xem tất cả phòng
              </button>
            )}
          </div>

          <div className="space-y-2 text-xs">
            {recentInspections.map((insp) => (
              <div
                key={insp.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2 min-w-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 truncate">{insp.roomName}</span>
                    {insp.evaluationSource === 'AI_ASSISTED' && (
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-semibold shrink-0">
                        AI
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-[11px] truncate">
                    {formatVNDate(insp.createdAt)} • {insp.inspectorName}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-black text-blue-800">
                    {insp.officialScore !== null && insp.officialScore !== undefined ? `${insp.officialScore}%` : 'K.Đủ CS'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
