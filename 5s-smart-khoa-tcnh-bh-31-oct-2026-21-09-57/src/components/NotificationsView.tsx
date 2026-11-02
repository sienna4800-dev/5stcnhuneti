import React from 'react';
import { useApp } from '../context/AppContext.tsx';
import { formatDateVN, formatDateTimeVN } from '../utils/formatters.ts';
import { Bell, CheckCheck, Clock, Wrench, Calendar, AlertTriangle } from 'lucide-react';

interface NotificationsViewProps {
  onSelectRoom?: (roomId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onSelectRoom, onNavigateTab }) => {
  const { notifications, markNotificationRead } = useApp();

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Thông báo Hệ thống</h2>
          <p className="text-xs text-slate-500 mt-1">
            Thông báo trong app về lịch kiểm tra, nhiệm vụ mới và yêu cầu nghiệm thu.
          </p>
        </div>

        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={() => markNotificationRead(undefined, true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-blue-700" />
            <span>Đánh dấu đã đọc tất cả</span>
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            Không có thông báo nào.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => markNotificationRead(n.id)}
              className={`p-4 flex items-start justify-between gap-3 transition-colors cursor-pointer ${
                !n.isRead ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    n.type === 'OVERDUE_TASK'
                      ? 'bg-red-100 text-red-600'
                      : n.type === 'NEW_TASK'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}
                >
                  {n.type === 'OVERDUE_TASK' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : n.type === 'NEW_TASK' ? (
                    <Wrench className="w-4 h-4" />
                  ) : (
                    <Calendar className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900">{n.title}</h4>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{formatDateTimeVN(n.createdAt)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
