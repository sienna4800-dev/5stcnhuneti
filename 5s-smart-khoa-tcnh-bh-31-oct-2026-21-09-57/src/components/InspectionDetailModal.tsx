import React from 'react';
import { InspectionRecord } from '../types.ts';
import { formatVNDate } from '../utils/thresholdUtils.ts';
import {
  X,
  CheckCircle2,
  AlertCircle,
  MinusCircle,
  HelpCircle,
  Sparkles,
  Calendar,
  User,
  Building,
  Image as ImageIcon,
} from 'lucide-react';

interface InspectionDetailModalProps {
  inspection: InspectionRecord | null;
  onClose: () => void;
}

export const InspectionDetailModal: React.FC<InspectionDetailModalProps> = ({
  inspection,
  onClose,
}) => {
  if (!inspection) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                {inspection.roomId}
              </span>
              <span className="text-xs font-mono text-slate-500">{inspection.id}</span>
              {inspection.isSample && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                  Dữ liệu minh họa
                </span>
              )}
            </div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg mt-1">
              Chi tiết Phiếu Kiểm tra – {inspection.roomName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ chi tiết phiếu"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-500 block">Thời gian:</span>
              <span className="font-bold text-slate-800">{formatVNDate(inspection.createdAt, true)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Người kiểm tra:</span>
              <span className="font-bold text-slate-800">{inspection.inspectorName}</span>
              <span className="text-[10px] text-slate-500 block">({inspection.inspectorRole})</span>
            </div>
            <div>
              <span className="text-slate-500 block">Phương thức:</span>
              <span className="font-bold text-slate-800">
                {inspection.evaluationSource === 'AI_ASSISTED' ? 'AI hỗ trợ (Gemini 3.8)' : 'Thủ công'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Điểm số / Kết luận:</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-base font-black text-blue-800">
                  {inspection.officialScore !== null && inspection.officialScore !== undefined
                    ? `${inspection.officialScore}%`
                    : 'K.Đủ CS'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    inspection.officialResult === 'PASSED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : inspection.officialResult === 'FAILED'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {inspection.officialResult === 'PASSED'
                    ? 'Đạt chuẩn'
                    : inspection.officialResult === 'FAILED'
                    ? 'Không đạt'
                    : 'Không đủ cơ sở đánh giá'}
                </span>
              </div>
            </div>
          </div>

          {/* Photos if any */}
          {inspection.photos && inspection.photos.length > 0 && (
            <div>
              <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span>Hình ảnh đính kèm phiếu ({inspection.photos.length} ảnh):</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {inspection.photos.map((p, idx) => (
                  <div key={idx} className="rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                    <img src={p.url} alt={p.name} className="w-full h-24 object-cover" />
                    <p className="p-1.5 text-[10px] text-slate-600 truncate">{p.contextNote || p.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decisions breakdown */}
          <div>
            <h4 className="font-bold text-slate-900 mb-2">Chi tiết đánh giá từng tiêu chí:</h4>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {inspection.decisions?.map((d) => (
                <div key={d.criterionId} className="p-3 bg-white flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="font-bold text-slate-800 mr-2">[{d.criterionId}]</span>
                    {d.userNotes && (
                      <p className="text-slate-600 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {d.userNotes}
                      </p>
                    )}
                    {d.naReason && (
                      <p className="text-slate-500 italic mt-1">Lý do K.Áp dụng: {d.naReason}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {d.status === 'PASSED' && (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đạt
                      </span>
                    )}
                    {d.status === 'FAILED' && (
                      <span className="inline-flex items-center gap-1 font-bold text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                        <AlertCircle className="w-3.5 h-3.5" /> Không đạt
                      </span>
                    )}
                    {d.status === 'NOT_APPLICABLE' && (
                      <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                        <MinusCircle className="w-3.5 h-3.5" /> Không áp dụng
                      </span>
                    )}
                    {d.status === 'INSUFFICIENT_EVIDENCE' && (
                      <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <HelpCircle className="w-3.5 h-3.5" /> Chưa đủ bằng chứng
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
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
