import React from 'react';
import { Room } from '../types.ts';
import { useApp } from '../context/AppContext.tsx';
import { deriveRoomStats } from '../utils/roomUtils.ts';
import { formatVNDate } from '../utils/thresholdUtils.ts';
import {
  MapPin,
  User,
  Calendar,
  AlertCircle,
  Sparkles,
  ClipboardList,
  QrCode,
  History,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
  Pencil,
  Info,
} from 'lucide-react';

interface RoomCardProps {
  room: Room;
  onManualInspect: (room: Room) => void;
  onAIEvaluate: (room: Room) => void;
  onViewHistory: (room: Room) => void;
  onViewQR: (room: Room) => void;
  onEdit?: (room: Room) => void;
  canInspect?: boolean;
}

export const RoomCard: React.FC<RoomCardProps> = ({
  room,
  onManualInspect,
  onAIEvaluate,
  onViewHistory,
  onViewQR,
  onEdit,
  canInspect = true,
}) => {
  const { inspections, tasks, settings } = useApp();

  // Derive live statistics directly from inspections and tasks (never static hardcoded fields)
  const stats = deriveRoomStats(room.id, inspections, tasks, settings);
  const { hasInspection, lastInspectedAt, lastScore, lastResult, openTaskCount } = stats;

  let resultBadge = (
    <span className="inline-flex items-center gap-1 text-slate-500 bg-slate-100 text-xs px-2.5 py-1 rounded-full font-medium">
      <Clock className="w-3.5 h-3.5" /> Chưa kiểm tra
    </span>
  );

  if (hasInspection && lastScore !== null && lastScore !== undefined) {
    if (lastResult === 'INSUFFICIENT_EVIDENCE') {
      resultBadge = (
        <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-300">
          <Info className="w-3.5 h-3.5 text-slate-600" /> Không đủ cơ sở đánh giá
        </span>
      );
    } else if (lastResult === 'PASSED') {
      resultBadge = (
        <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {lastScore}% • Đạt chuẩn
        </span>
      );
    } else {
      resultBadge = (
        <span className="inline-flex items-center gap-1 text-red-800 bg-red-50 text-xs px-2.5 py-1 rounded-full font-semibold border border-red-200">
          <AlertCircle className="w-3.5 h-3.5 text-red-600" /> {lastScore}% • Không đạt
        </span>
      );
    }
  }

  const managerText = room.manager && room.manager.trim() !== '' ? room.manager : 'Chưa phân công';
  const locationText = room.location && room.location.trim() !== '' ? room.location : 'Chưa cập nhật';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden min-w-0">
      {/* Top Card Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                {room.id}
              </span>
              <span className="text-xs text-slate-500 font-medium truncate">
                {room.type === 'LAB'
                  ? 'Phòng thực hành'
                  : room.type === 'OFFICE'
                  ? 'Văn phòng khoa'
                  : room.type === 'MEETING'
                  ? 'Phòng sinh hoạt'
                  : 'Khu vực chuyên môn'}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
              {room.name}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(room)}
                title={`Sửa thông tin phòng & phân công người phụ trách: ${room.name}`}
                aria-label={`Sửa thông tin phòng & phân công người phụ trách: ${room.name}`}
                className="p-2 text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onViewQR(room)}
              title={`Xem mã QR của ${room.name}`}
              aria-label={`Xem mã QR của ${room.name}`}
              className="p-2 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Specific room focus notes */}
        {room.specificNotes && (
          <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-4 line-clamp-2">
            <span className="font-semibold text-slate-700">Trọng tâm 5S:</span> {room.specificNotes}
          </p>
        )}

        {/* Meta details list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 mb-4">
          <div className="flex items-center gap-1.5 truncate" title={`Vị trí: ${locationText}`}>
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{locationText}</span>
          </div>

          <div
            onClick={() => onEdit && onEdit(room)}
            className={`flex items-center gap-1.5 truncate ${
              onEdit ? 'cursor-pointer hover:underline' : ''
            } ${managerText === 'Chưa phân công' ? 'text-amber-600 font-semibold' : ''}`}
            title={onEdit ? `Bấm để phân công người phụ trách (${managerText})` : `Phụ trách: ${managerText}`}
          >
            <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{managerText}</span>
            {onEdit && <Pencil className="w-3 h-3 text-slate-400 opacity-60" />}
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Lần kiểm tra: {formatVNDate(lastInspectedAt)}</span>
          </div>

          <div className="flex items-center gap-1.5 truncate">
            <AlertCircle
              className={`w-3.5 h-3.5 shrink-0 ${openTaskCount > 0 ? 'text-amber-500' : 'text-slate-400'}`}
            />
            <span className={openTaskCount > 0 ? 'text-amber-700 font-semibold' : ''}>
              Tồn tại: {openTaskCount} việc
            </span>
          </div>
        </div>

        {/* Inspection result pill */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium">Kết quả gần nhất:</span>
          {resultBadge}
        </div>
      </div>

      {/* Action Buttons Bottom Grid - Responsive stack on narrow/medium screens */}
      <div className="p-3 bg-slate-50 border-t border-slate-200">
        {canInspect ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onManualInspect(room)}
              aria-label={`Kiểm tra thủ công phòng ${room.name}`}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl text-xs font-semibold border border-slate-200 transition-colors shadow-2xs cursor-pointer text-center leading-tight"
            >
              <ClipboardList className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span className="truncate">Kiểm tra thủ công</span>
            </button>

            <button
              type="button"
              onClick={() => onAIEvaluate(room)}
              aria-label={`Đánh giá 5S bằng AI phòng ${room.name}`}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-2.5 bg-linear-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer text-center leading-tight"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span className="truncate">Đánh giá bằng AI</span>
            </button>
          </div>
        ) : (
          <div className="text-center text-xs text-slate-500 py-1 font-medium">
            Tài khoản chỉ có quyền xem
          </div>
        )}

        {/* History and QR secondary bar */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-200/60 text-xs">
          <button
            type="button"
            onClick={() => onViewHistory(room)}
            aria-label={`Xem lịch sử kiểm tra phòng ${room.name}`}
            className="font-medium text-slate-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer py-1"
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch sử kiểm tra</span>
          </button>

          <button
            type="button"
            onClick={() => onViewQR(room)}
            aria-label={`Xem mã QR phòng ${room.name}`}
            className="font-medium text-blue-700 hover:text-blue-800 flex items-center gap-1 cursor-pointer py-1"
          >
            <span>Mã QR</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
