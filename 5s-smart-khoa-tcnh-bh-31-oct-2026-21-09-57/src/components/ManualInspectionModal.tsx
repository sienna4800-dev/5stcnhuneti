import React, { useState, useEffect } from 'react';
import { Room, InspectorCriterionDecision, CriterionStatus } from '../types.ts';
import { useApp } from '../context/AppContext.tsx';
import { calculateInspectionScore, validateInspectorDecision } from '../utils/5s-logic.ts';
import { compressImageFile } from '../utils/imageCompressor.ts';
import {
  X,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Camera,
  Trash2,
  Save,
  Send,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Info,
  Check,
} from 'lucide-react';

interface ManualInspectionModalProps {
  room: Room;
  onClose: () => void;
  onSuccess: (inspection: any) => void;
}

export const ManualInspectionModal: React.FC<ManualInspectionModalProps> = ({
  room,
  onClose,
  onSuccess,
}) => {
  const { currentUser, saveInspection, saveInspectionDraft, getInspectionDraft, clearInspectionDraft, settings } = useApp();

  // State for decisions map
  const [decisions, setDecisions] = useState<Record<string, InspectorCriterionDecision>>({});
  const [generalNotes, setGeneralNotes] = useState('');
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftSavedToast, setDraftSavedToast] = useState(false);

  // Group checklist by Category
  const checklist = room.checklist || [];

  // Restore draft if available
  useEffect(() => {
    const draft = getInspectionDraft(room.id);
    if (draft && draft.decisions) {
      setDecisions(draft.decisions);
      if (draft.generalNotes) setGeneralNotes(draft.generalNotes);
    }
  }, [room.id]);

  const handleSetStatus = (criterionId: string, status: CriterionStatus) => {
    setDecisions((prev) => {
      const existing = prev[criterionId] || {
        criterionId,
        status: 'PASSED',
        isOverriddenFromAI: false,
      };
      return {
        ...prev,
        [criterionId]: {
          ...existing,
          status,
        },
      };
    });
  };

  const handleUpdateNotes = (criterionId: string, field: 'userNotes' | 'naReason', value: string) => {
    setDecisions((prev) => {
      const existing = prev[criterionId] || {
        criterionId,
        status: 'PASSED',
        isOverriddenFromAI: false,
      };
      return {
        ...prev,
        [criterionId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleAddPhoto = async (criterionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const compressed = await compressImageFile(files[0]);
      setDecisions((prev) => {
        const existing = prev[criterionId] || {
          criterionId,
          status: 'PASSED',
          isOverriddenFromAI: false,
          customPhotos: [],
        };
        const currentPhotos = existing.customPhotos || [];
        return {
          ...prev,
          [criterionId]: {
            ...existing,
            customPhotos: [...currentPhotos, compressed],
          },
        };
      });
    } catch (err) {
      console.error('Failed to compress image:', err);
    }
  };

  const handleRemovePhoto = (criterionId: string, photoIndex: number) => {
    setDecisions((prev) => {
      const existing = prev[criterionId];
      if (!existing || !existing.customPhotos) return prev;
      const filtered = existing.customPhotos.filter((_, idx) => idx !== photoIndex);
      return {
        ...prev,
        [criterionId]: {
          ...existing,
          customPhotos: filtered,
        },
      };
    });
  };

  const handleSaveDraft = () => {
    saveInspectionDraft(room.id, {
      roomId: room.id,
      decisions,
      generalNotes,
      savedAt: new Date().toISOString(),
    });
    setDraftSavedToast(true);
    setTimeout(() => setDraftSavedToast(false), 2500);
  };

  // Calculate answered count
  const answeredCount = Object.keys(decisions).length;
  const totalCount = checklist.length;
  const progressPercent = totalCount > 0 ? Math.round((answeredCount / totalCount) * 100) : 0;

  // Validate before Review
  const validateAll = (): { valid: boolean; error?: string } => {
    for (const c of checklist) {
      const d = decisions[c.id];
      if (!d) {
        return {
          valid: false,
          error: `Tiêu chí "${c.code}: ${c.name}" chưa được chọn kết quả đánh giá.`,
        };
      }
      const v = validateInspectorDecision(d);
      if (!v.valid) {
        return {
          valid: false,
          error: `[${c.code}] ${v.error}`,
        };
      }
    }
    return { valid: true };
  };

  const handleProceedToReview = () => {
    setErrorMsg(null);
    const val = validateAll();
    if (!val.valid) {
      setErrorMsg(val.error || 'Vui lòng hoàn thành đầy đủ thông tin các tiêu chí.');
      return;
    }
    setIsReviewStep(true);
  };

  const handleSubmitInspection = async () => {
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const decisionsList = checklist.map((c) => decisions[c.id]);

      const inspectionPayload = {
        id: `INSP-${Date.now()}`,
        roomId: room.id,
        roomName: room.name,
        roomType: room.type,
        inspectorId: currentUser?.id || 'guest',
        inspectorName: currentUser?.name || 'Cán bộ kiểm tra',
        inspectorRole: currentUser?.roleTitle || 'Giảng viên',
        evaluationSource: 'MANUAL',
        decisions: decisionsList,
        photos: [],
        notes: generalNotes,
      };

      const result = await saveInspection(inspectionPayload);
      clearInspectionDraft(room.id);
      onSuccess(result);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi gửi phiếu kiểm tra.');
      setIsSubmitting(false);
    }
  };

  // Group checklist items by category
  const categories = [
    { key: 'S1', name: 'S1 – Sàng lọc (Seiri)' },
    { key: 'S2', name: 'S2 – Sắp xếp (Seiton)' },
    { key: 'S3', name: 'S3 – Sạch sẽ (Seiso)' },
    { key: 'S4', name: 'S4 – Săn sóc (Seiketsu)' },
    { key: 'S5', name: 'S5 – Sẵn sàng (Shitsuke)' },
  ];

  const scorePreview = calculateInspectionScore(
    Object.values(decisions),
    settings.passThreshold || 80
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                {room.id}
              </span>
              <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                Phiếu Kiểm tra 5S – {room.name}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Người kiểm tra: <span className="font-semibold text-slate-700">{currentUser?.name || 'Cán bộ kiểm tra'}</span> • Phiên bản checklist: 1.0
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="bg-slate-100 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2 flex-1 mr-4">
            <span className="text-slate-600 font-medium">Tiến độ:</span>
            <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-blue-600 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <span className="font-bold text-blue-700">{answeredCount}/{totalCount} ({progressPercent}%)</span>
          </div>

          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-1 text-slate-600 hover:text-blue-700 font-semibold cursor-pointer shrink-0"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Lưu nháp</span>
          </button>
        </div>

        {/* Toast draft saved */}
        {draftSavedToast && (
          <div className="bg-emerald-600 text-white text-xs font-semibold py-1.5 px-4 text-center animate-fade-in shrink-0">
            ✓ Đã lưu bản nháp phiếu kiểm tra! Bạn có thể tiếp tục sau.
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-50 text-red-700 border-b border-red-200 p-3 text-xs flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Body content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {!isReviewStep ? (
            /* Step 1: Answering Checklist */
            <div className="space-y-6">
              {categories.map((cat) => {
                const items = checklist.filter((c) => c.category === cat.key);
                if (items.length === 0) return null;

                return (
                  <div key={cat.key} className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 border-b border-slate-200 pb-1.5 flex items-center justify-between">
                      <span>{cat.name}</span>
                      <span className="text-xs font-normal text-slate-500">
                        {items.filter((i) => decisions[i.id]).length}/{items.length} đã đánh giá
                      </span>
                    </h4>

                    <div className="space-y-3">
                      {items.map((item) => {
                        const decision = decisions[item.id];
                        const status = decision?.status;

                        return (
                          <div
                            key={item.id}
                            className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                              status === 'PASSED'
                                ? 'bg-emerald-50/40 border-emerald-200'
                                : status === 'FAILED'
                                ? 'bg-red-50/40 border-red-200'
                                : status === 'NOT_APPLICABLE'
                                ? 'bg-slate-50 border-slate-300'
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                                    {item.code}
                                  </span>
                                  <span className="font-bold text-sm text-slate-900">
                                    {item.name}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-600">{item.description}</p>
                                <p className="text-[11px] text-slate-500 mt-1 italic">
                                  Hướng dẫn: {item.guidelines}
                                </p>
                              </div>

                              {/* Action buttons: Pass / Fail / NA */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSetStatus(item.id, 'PASSED')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                    status === 'PASSED'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Đạt</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetStatus(item.id, 'FAILED')}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                    status === 'FAILED'
                                      ? 'bg-red-600 text-white shadow-xs'
                                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-red-50 hover:text-red-700'
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Không đạt</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleSetStatus(item.id, 'NOT_APPLICABLE')}
                                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                                    status === 'NOT_APPLICABLE'
                                      ? 'bg-slate-700 text-white shadow-xs'
                                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  <MinusCircle className="w-3.5 h-3.5" />
                                  <span>Không áp dụng</span>
                                </button>
                              </div>
                            </div>

                            {/* Additional inputs based on status */}
                            {status === 'FAILED' && (
                              <div className="mt-3 pt-3 border-t border-red-200 space-y-2">
                                <label className="block text-xs font-semibold text-red-800">
                                  Mô tả chi tiết tồn tại / vi phạm (Bắt buộc):
                                </label>
                                <textarea
                                  value={decision?.userNotes || ''}
                                  onChange={(e) => handleUpdateNotes(item.id, 'userNotes', e.target.value)}
                                  placeholder="Mô tả cụ thể vị trí và vấn đề tồn tại quan sát được..."
                                  rows={2}
                                  className="w-full text-xs p-2 rounded-lg border border-red-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-red-500"
                                />
                              </div>
                            )}

                            {status === 'NOT_APPLICABLE' && (
                              <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                                <label className="block text-xs font-semibold text-slate-700">
                                  Lý do Không áp dụng (Bắt buộc):
                                </label>
                                <input
                                  type="text"
                                  value={decision?.naReason || ''}
                                  onChange={(e) => handleUpdateNotes(item.id, 'naReason', e.target.value)}
                                  placeholder="Nhập lý do tiêu chí này không áp dụng cho phòng..."
                                  className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-slate-500"
                                />
                              </div>
                            )}

                            {/* Photo attachments */}
                            <div className="mt-3 flex items-center gap-2 flex-wrap">
                              {decision?.customPhotos?.map((pUrl, pIdx) => (
                                <div key={pIdx} className="relative group w-12 h-12 rounded-lg overflow-hidden border border-slate-300">
                                  <img src={pUrl} alt="Minh chứng" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => handleRemovePhoto(item.id, pIdx)}
                                    className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))}

                              <label className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-200 cursor-pointer transition-colors">
                                <Camera className="w-3.5 h-3.5" />
                                <span>Thêm ảnh minh chứng</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleAddPhoto(item.id, e)}
                                />
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* General inspection notes */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Ghi chú chung của đợt kiểm tra (Không bắt buộc):
                </label>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Nhận xét tổng thể về thái độ, nề nếp hoặc lưu ý đặc biệt..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>
          ) : (
            /* Step 2: Review Screen before Submission */
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 space-y-1">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <Info className="w-4 h-4 text-blue-700" />
                  <span>Xác nhận thông tin phiếu kiểm tra</span>
                </div>
                <p>
                  Vui lòng rà soát lại kết quả đánh giá trước khi gửi. Sau khi gửi, phiếu sẽ được lưu vào lịch sử, tính điểm chính thức và tự động tạo nhiệm vụ khắc phục cho các tiêu chí Không đạt.
                </p>
              </div>

              {/* Score preview card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">Điểm số chính thức dự kiến:</p>
                  <p className="text-2xl font-black text-slate-900">
                    {scorePreview.score !== null ? `${scorePreview.score}%` : 'Không đủ cơ sở đánh giá'}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Công thức: {scorePreview.passedCount} Đạt / {scorePreview.applicableCount} Tiêu chí áp dụng ({scorePreview.naCount} Không áp dụng)
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs px-3 py-1 rounded-full font-bold uppercase ${
                      scorePreview.result === 'CANNOT_EVALUATE'
                        ? 'bg-slate-100 text-slate-700 border border-slate-300'
                        : scorePreview.result === 'PASSED'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {scorePreview.result === 'CANNOT_EVALUATE'
                      ? 'Không đủ cơ sở đánh giá'
                      : scorePreview.result === 'PASSED'
                      ? 'Đạt chuẩn 5S'
                      : 'Không đạt'}
                  </span>
                </div>
              </div>

              {/* Breakdown list */}
              <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200 text-xs">
                {checklist.map((item) => {
                  const d = decisions[item.id];
                  return (
                    <div key={item.id} className="p-3 flex items-start justify-between gap-3 bg-white">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800">[{item.code}]</span>
                          <span className="text-slate-900 font-medium">{item.name}</span>
                        </div>
                        {d?.status === 'FAILED' && d.userNotes && (
                          <p className="text-red-600 mt-1">
                            <span className="font-semibold">Tồn tại:</span> {d.userNotes}
                          </p>
                        )}
                        {d?.status === 'NOT_APPLICABLE' && d.naReason && (
                          <p className="text-slate-500 mt-1">
                            <span className="font-semibold">Lý do:</span> {d.naReason}
                          </p>
                        )}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold shrink-0 ${
                          d?.status === 'PASSED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d?.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {d?.status === 'PASSED' ? 'Đạt' : d?.status === 'FAILED' ? 'Không đạt' : 'K.Áp dụng'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          {!isReviewStep ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                onClick={handleProceedToReview}
                className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <span>Xem lại phiếu &amp; Gửi</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setIsReviewStep(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay lại chỉnh sửa</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitInspection}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang ghi nhận...' : 'Xác nhận & Gửi phiếu chính thức'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
