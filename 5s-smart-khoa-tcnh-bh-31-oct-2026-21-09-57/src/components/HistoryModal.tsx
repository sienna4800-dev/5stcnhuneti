import React, { useState } from 'react';
import { InspectionRecord, Room } from '../types.ts';
import { formatVNDate } from '../utils/thresholdUtils.ts';
import { normalizeRoomId } from '../utils/roomUtils.ts';
import { X, CheckCircle2, AlertCircle, Sparkles, ClipboardList, Calendar, User, Eye, ArrowRight, MinusCircle } from 'lucide-react';

interface HistoryModalProps {
  room?: Room | null;
  inspections: InspectionRecord[];
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ room, inspections, onClose }) => {
  const [selectedInspection, setSelectedInspection] = useState<InspectionRecord | null>(null);

  const filtered = room
    ? inspections.filter((i) => normalizeRoomId(i.roomId) === normalizeRoomId(room.id))
    : inspections;

  // Order descending by timestamp
  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg">
              {room ? `Lịch sử Kiểm tra 5S – ${room.name}` : 'Lịch sử Kiểm tra Toàn khoa'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tổng số {sorted.length} đợt kiểm tra đã ghi nhận
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ lịch sử kiểm tra"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {!selectedInspection ? (
            /* Inspection list */
            sorted.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Chưa có lịch sử kiểm tra nào cho khu vực này.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {sorted.map((insp) => (
                  <div
                    key={insp.id}
                    onClick={() => setSelectedInspection(insp)}
                    className="py-3 px-3 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-slate-900">{insp.roomName}</span>
                        {insp.evaluationSource === 'AI_ASSISTED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md">
                            <Sparkles className="w-3 h-3 text-indigo-600" /> Có AI hỗ trợ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                            <ClipboardList className="w-3 h-3 text-slate-500" /> Thủ công
                          </span>
                        )}
                        {insp.isSample && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Demo
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-[11px] truncate">
                        {formatVNDate(insp.createdAt, true)} • {insp.inspectorName} ({insp.inspectorRole})
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-sm sm:text-base font-black text-slate-900">
                          {insp.officialScore !== null && insp.officialScore !== undefined
                            ? `${insp.officialScore}%`
                            : 'K.Đủ CS'}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            insp.officialResult === 'PASSED'
                              ? 'bg-blue-100 text-blue-800'
                              : insp.officialResult === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {insp.officialResult === 'PASSED'
                            ? 'Đạt chuẩn'
                            : insp.officialResult === 'FAILED'
                            ? 'Không đạt'
                            : 'Không đủ cơ sở'}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Inspection Detail View */
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setSelectedInspection(null)}
                className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                ← Quay lại danh sách đợt kiểm tra
              </button>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-900">{selectedInspection.roomName}</h4>
                  <span className="text-xl font-black text-blue-800">
                    {selectedInspection.officialScore !== null && selectedInspection.officialScore !== undefined
                      ? `${selectedInspection.officialScore}%`
                      : 'K.Đủ CS'}
                  </span>
                </div>
                <p className="text-slate-600">
                  Thời gian: {formatVNDate(selectedInspection.createdAt, true)} • Kiểm tra viên: {selectedInspection.inspectorName} ({selectedInspection.inspectorRole})
                </p>
                <p className="text-slate-600">
                  Phương thức: {selectedInspection.evaluationSource === 'AI_ASSISTED' ? `Có AI hỗ trợ (${selectedInspection.aiModel})` : 'Kiểm tra thủ công'}
                </p>
                <div className="pt-2 flex gap-3 text-[11px] font-semibold">
                  <span className="text-emerald-700">✓ {selectedInspection.passedCriteria} Đạt</span>
                  <span className="text-red-700">✗ {selectedInspection.failedCriteria} Không đạt</span>
                  <span className="text-slate-500">○ {selectedInspection.naCriteria} Không áp dụng</span>
                </div>
              </div>

              {/* Photos if any */}
              {selectedInspection.photos && selectedInspection.photos.length > 0 && (
                <div>
                  <h5 className="font-bold text-xs text-slate-800 mb-1.5">Ảnh chụp hiện trường:</h5>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {selectedInspection.photos.map((p, idx) => (
                      <div key={idx} className="shrink-0">
                        <img src={p.url} alt="Hiện trường" className="w-28 h-20 object-cover rounded-xl border border-slate-300" />
                        <p className="text-[10px] text-slate-500 truncate max-w-[110px] mt-0.5">{p.contextNote || p.name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Criterion decisions */}
              <div className="space-y-2">
                <h5 className="font-bold text-xs text-slate-800">Đánh giá từng tiêu chí:</h5>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  {selectedInspection.decisions?.map((d) => (
                    <div key={d.criterionId} className="p-2.5 bg-white flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-700 mr-1.5">[{d.criterionId}]</span>
                        <span className="text-slate-600 truncate">{d.userNotes || d.naReason || 'Đạt tiêu chuẩn'}</span>
                      </div>
                      <span className="font-bold shrink-0">
                        {d.status === 'PASSED' ? (
                          <span className="text-emerald-700">Đạt</span>
                        ) : d.status === 'FAILED' ? (
                          <span className="text-red-700">Không đạt</span>
                        ) : (
                          <span className="text-slate-500">K.Áp dụng</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
