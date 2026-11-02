import React, { useState } from 'react';
import {
  Room,
  InspectionPhoto,
  AICriterionProposal,
  InspectorCriterionDecision,
  CriterionStatus,
} from '../types.ts';
import { useApp } from '../context/AppContext.tsx';
import { compressImageFile } from '../utils/imageCompressor.ts';
import { calculateAICoverage, calculateInspectionScore, validateInspectorDecision } from '../utils/5s-logic.ts';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Trash2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MinusCircle,
  ArrowRight,
  ArrowLeft,
  Send,
  RefreshCw,
  Image as ImageIcon,
  Check,
  AlertTriangle,
  FileText,
  Sliders,
  Layers,
} from 'lucide-react';

interface AIEvaluationModalProps {
  room: Room;
  onClose: () => void;
  onSuccess: (inspection: any) => void;
  onSwitchToManual: () => void;
}

export const AIEvaluationModal: React.FC<AIEvaluationModalProps> = ({
  room,
  onClose,
  onSuccess,
  onSwitchToManual,
}) => {
  const { currentUser, saveInspection, hasGeminiKey, settings } = useApp();

  // Workflow steps:
  // 1. 'PHOTOS' -> Upload & contextualize up to 8 photos
  // 2. 'ANALYZING' -> Calling Gemini API
  // 3. 'REVIEW' -> Human-in-the-loop confirmation
  // 4. 'SUBMITTING' -> Saving official inspection
  const [step, setStep] = useState<'PHOTOS' | 'ANALYZING' | 'REVIEW'>('PHOTOS');

  // Photo list
  const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
  const [generalNotes, setGeneralNotes] = useState('');
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);

  // AI Response Data
  const [aiSummary, setAiSummary] = useState<string>('');
  const [aiProposals, setAiProposals] = useState<AICriterionProposal[]>([]);
  const [aiMetadata, setAiMetadata] = useState<any>(null);

  // Inspector decisions
  const [decisions, setDecisions] = useState<Record<string, InspectorCriterionDecision>>({});

  // Active photo modal preview
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Error handling
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiErrorDetails, setApiErrorDetails] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Suggested photo angles
  const suggestedAngles = [
    { title: 'Toàn cảnh phòng', desc: 'Từ cửa vào nhìn bao quát toàn bộ không gian' },
    { title: 'Bàn & Thiết bị', desc: 'Máy tính, bàn phím, màn hình, bàn làm việc' },
    { title: 'Lối đi & Sàn nhà', desc: 'Lối đi chính, góc tường, dây điện' },
    { title: 'Tủ & Lưu trữ', desc: 'Tủ hồ sơ, kệ tài liệu, khay thiết bị' },
  ];

  // Photo upload handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (photos.length + files.length > 8) {
      alert('Tối đa 8 ảnh trong một lần đánh giá 5S.');
      return;
    }

    setIsProcessingFiles(true);
    try {
      const newPhotos: InspectionPhoto[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedDataUrl = await compressImageFile(file);
        const nextNum = photos.length + newPhotos.length + 1;
        const defaultNote = suggestedAngles[Math.min(nextNum - 1, suggestedAngles.length - 1)]?.title || `Góc chụp số ${nextNum}`;

        newPhotos.push({
          id: `PHOTO-${Date.now()}-${i}`,
          url: compressedDataUrl,
          name: file.name,
          contextNote: defaultNote,
          timestamp: new Date().toISOString(),
        });
      }
      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch (err) {
      console.error('Failed to compress photo:', err);
      alert('Không thể xử lý ảnh, vui lòng thử lại ảnh khác.');
    } finally {
      setIsProcessingFiles(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdatePhotoNote = (index: number, note: string) => {
    setPhotos((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], contextNote: note };
      return copy;
    });
  };

  // Call AI Backend Endpoint
  const handleRunAIAnalysis = async () => {
    if (photos.length === 0) {
      setValidationError('Vui lòng chụp hoặc tải lên ít nhất 1 ảnh khu vực để bắt đầu phân tích.');
      return;
    }

    setStep('ANALYZING');
    setApiError(null);
    setApiErrorDetails(null);
    setValidationError(null);

    try {
      const payload = {
        roomId: room.id,
        roomName: room.name,
        roomType: room.type,
        checklist: room.checklist,
        photos: photos.map((p) => ({
          id: p.id,
          name: p.name,
          dataUrl: p.url,
          contextNote: p.contextNote,
        })),
        userNotes: generalNotes,
      };

      const response = await fetch('/api/ai-evaluate-5s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi gọi API phân tích AI');
      }

      const evalData = data.aiEvaluation;
      setAiSummary(evalData.summary);
      setAiProposals(evalData.proposals);
      setAiMetadata(evalData);

      // Prepopulate inspector decisions from AI proposals
      const initialDecisions: Record<string, InspectorCriterionDecision> = {};
      evalData.proposals.forEach((p: AICriterionProposal) => {
        initialDecisions[p.criterionId] = {
          criterionId: p.criterionId,
          // If AI says INSUFFICIENT_EVIDENCE, keep it so inspector MUST confirm Đạt/Không đạt/K.Áp dụng
          status: p.status,
          userNotes: p.issues || '',
          isOverriddenFromAI: false,
        };
      });
      setDecisions(initialDecisions);
      setStep('REVIEW');
    } catch (err: any) {
      console.error('AI Analysis failed:', err);
      setApiError(err?.message || 'Có lỗi khi phân tích ảnh bằng AI.');
      setStep('PHOTOS'); // Keep photos and return to photos view so user loses nothing!
    }
  };

  // Inspector Decision Actions
  const handleAcceptProposal = (proposal: AICriterionProposal) => {
    if (proposal.status === 'INSUFFICIENT_EVIDENCE') {
      alert('Tiêu chí này AI chưa đủ bằng chứng. Vui lòng trực tiếp chọn Đạt, Không đạt hoặc Không áp dụng.');
      return;
    }

    setDecisions((prev) => ({
      ...prev,
      [proposal.criterionId]: {
        criterionId: proposal.criterionId,
        status: proposal.status,
        userNotes: proposal.issues || '',
        overrideReason: '',
        isOverriddenFromAI: false,
      },
    }));
  };

  const handleOverrideStatus = (criterionId: string, newStatus: CriterionStatus) => {
    const aiProp = aiProposals.find((p) => p.criterionId === criterionId);
    const isOverride = aiProp && aiProp.status !== newStatus && aiProp.status !== 'INSUFFICIENT_EVIDENCE';

    setDecisions((prev) => ({
      ...prev,
      [criterionId]: {
        ...(prev[criterionId] || { criterionId, isOverriddenFromAI: false }),
        status: newStatus,
        isOverriddenFromAI: Boolean(isOverride),
      },
    }));
  };

  const handleUpdateOverrideReason = (criterionId: string, reason: string) => {
    setDecisions((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        overrideReason: reason,
      },
    }));
  };

  const handleUpdateNAReason = (criterionId: string, reason: string) => {
    setDecisions((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        naReason: reason,
      },
    }));
  };

  const handleUpdateDecisionNotes = (criterionId: string, notes: string) => {
    setDecisions((prev) => ({
      ...prev,
      [criterionId]: {
        ...prev[criterionId],
        userNotes: notes,
      },
    }));
  };

  // Validation before official submit
  const validateReview = (): { valid: boolean; error?: string } => {
    for (const c of room.checklist) {
      const d = decisions[c.id];
      const aiP = aiProposals.find((p) => p.criterionId === c.id);

      if (!d) {
        return {
          valid: false,
          error: `Tiêu chí [${c.code}] ${c.name} chưa được rà soát.`,
        };
      }

      if (d.status === 'INSUFFICIENT_EVIDENCE') {
        return {
          valid: false,
          error: `Tiêu chí [${c.code}] đang ở trạng thái "Chưa đủ bằng chứng". Vui lòng xác nhận kết luận chính thức (Đạt, Không đạt hoặc Không áp dụng) trước khi gửi.`,
        };
      }

      const val = validateInspectorDecision(d, aiP);
      if (!val.valid) {
        return {
          valid: false,
          error: `[${c.code}] ${val.error}`,
        };
      }
    }
    return { valid: true };
  };

  // Submit Official Inspection
  const handleSubmitInspection = async () => {
    setValidationError(null);
    const check = validateReview();
    if (!check.valid) {
      setValidationError(check.error || 'Vui lòng xác nhận đầy đủ các tiêu chí.');
      return;
    }

    setIsSubmitting(true);
    try {
      const decisionsList = room.checklist.map((c) => decisions[c.id]);
      const coverage = calculateAICoverage(aiProposals, room.checklist.length);

      const inspectionPayload = {
        id: `INSP-AI-${Date.now()}`,
        roomId: room.id,
        roomName: room.name,
        roomType: room.type,
        inspectorId: currentUser?.id || 'guest',
        inspectorName: currentUser?.name || 'Cán bộ kiểm tra',
        inspectorRole: currentUser?.roleTitle || 'Giảng viên',
        evaluationSource: 'AI_ASSISTED',
        aiModel: aiMetadata?.model || 'gemini-3.8-flash',
        aiAnalyzedAt: aiMetadata?.analyzedAt || new Date().toISOString(),
        aiPromptVersion: aiMetadata?.aiPromptVersion || '2.1-UNETI-TCNHBH',
        aiChecklistVersion: aiMetadata?.checklistVersion || '1.0',
        aiProposals,
        aiCoveragePercentage: coverage.coveragePercentage,
        aiPreliminaryScore: coverage.preliminaryScore ?? undefined,
        decisions: decisionsList,
        photos,
        notes: generalNotes,
      };

      const result = await saveInspection(inspectionPayload);
      onSuccess(result);
    } catch (err: any) {
      setValidationError(err?.message || 'Có lỗi xảy ra khi lưu phiếu kiểm tra.');
      setIsSubmitting(false);
    }
  };

  const coverage = calculateAICoverage(aiProposals, room.checklist?.length || 0);
  const officialScorePreview = calculateInspectionScore(
    Object.values(decisions),
    settings?.passThreshold || 80
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                  {room.id}
                </span>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg">
                  AI Đánh giá 5S – {room.name}
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Mô hình: <span className="font-semibold text-blue-700">Gemini 3.8 Flash</span> • Người kiểm tra: {currentUser?.name || 'Cán bộ kiểm tra'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Header */}
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-3 sm:gap-6">
            <div className={`flex items-center gap-1.5 font-semibold ${step === 'PHOTOS' ? 'text-blue-700' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 'PHOTOS' ? 'bg-blue-700 text-white' : 'bg-slate-200'}`}>
                1
              </span>
              <span>Thu thập ảnh ({photos.length}/8)</span>
            </div>

            <div className={`flex items-center gap-1.5 font-semibold ${step === 'ANALYZING' ? 'text-blue-700' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 'ANALYZING' ? 'bg-blue-700 text-white animate-spin' : 'bg-slate-200'}`}>
                2
              </span>
              <span>AI Phân tích</span>
            </div>

            <div className={`flex items-center gap-1.5 font-semibold ${step === 'REVIEW' ? 'text-blue-700' : 'text-slate-500'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${step === 'REVIEW' ? 'bg-blue-700 text-white' : 'bg-slate-200'}`}>
                3
              </span>
              <span>Xác nhận &amp; Gửi phiếu</span>
            </div>
          </div>

          {step === 'PHOTOS' && (
            <button
              onClick={onSwitchToManual}
              className="text-xs text-slate-600 hover:text-blue-700 font-semibold cursor-pointer hidden sm:block"
            >
              Chuyển sang kiểm tra thủ công
            </button>
          )}
        </div>

        {/* Alerts / Error banners */}
        {apiError && (
          <div className="bg-red-50 border-b border-red-200 p-4 text-xs text-red-800 space-y-1.5 shrink-0">
            <div className="flex items-center gap-2 font-bold text-red-900">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{apiError}</span>
            </div>
            {apiErrorDetails && <p className="text-[11px] text-red-700">{apiErrorDetails}</p>}
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleRunAIAnalysis}
                className="bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-red-700 cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
              <button
                onClick={onSwitchToManual}
                className="bg-white border border-red-300 text-red-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-50 cursor-pointer"
              >
                Chuyển sang kiểm tra thủ công
              </button>
            </div>
          </div>
        )}

        {validationError && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 text-xs text-amber-800 flex items-center gap-2 font-medium shrink-0">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {step === 'PHOTOS' && (
            /* STEP 1: Upload Photos */
            <div className="space-y-6">
              {/* Photo Guide */}
              <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 font-bold text-sm text-blue-900 mb-2">
                  <Camera className="w-4 h-4 text-blue-700" />
                  <span>Hướng dẫn thu thập ảnh đánh giá 5S tối ưu:</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {suggestedAngles.map((angle, idx) => (
                    <div key={idx} className="bg-white/80 p-2.5 rounded-xl border border-blue-100">
                      <p className="font-bold text-slate-800">{idx + 1}. {angle.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{angle.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photo Upload Dropzone */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Ảnh đã chụp ({photos.length}/8 ảnh)
                  </label>
                  <span className="text-xs text-slate-500">Tự động nén ảnh chất lượng cao</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="group bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden shadow-2xs flex flex-col justify-between"
                    >
                      <div className="relative aspect-video bg-slate-900">
                        <img
                          src={photo.url}
                          alt={photo.name}
                          onClick={() => setPreviewPhotoUrl(photo.url)}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        />
                        <span className="absolute top-1.5 left-1.5 bg-black/70 text-white font-bold text-[10px] px-2 py-0.5 rounded-full">
                          Ảnh #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute top-1.5 right-1.5 p-1 bg-red-600/90 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="p-2">
                        <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                          Ghi chú bối cảnh:
                        </label>
                        <input
                          type="text"
                          value={photo.contextNote || ''}
                          onChange={(e) => handleUpdatePhotoNote(index, e.target.value)}
                          placeholder="VD: Dãy máy tính cuối..."
                          className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                        />
                      </div>
                    </div>
                  ))}

                  {/* Add Photo Button Tile */}
                  {photos.length < 8 && (
                    <label
                      htmlFor="aiPhotoUploadInput"
                      className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/50 rounded-2xl flex flex-col items-center justify-center p-4 aspect-video sm:aspect-auto sm:min-h-[140px] text-center cursor-pointer transition-all"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-2">
                        <Camera className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">Chụp / Tải ảnh</span>
                      <span className="text-[11px] text-slate-500 mt-0.5">Tối đa 8 ảnh (hỗ trợ camera)</span>
                      <input
                        id="aiPhotoUploadInput"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        className="hidden"
                        onChange={handlePhotoUpload}
                        disabled={isProcessingFiles}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* General Note */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Ghi chú bối cảnh chung cho AI (Không bắt buộc):
                </label>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Ví dụ: Giờ thực hành buổi sáng vừa kết thúc lúc 11h30, sinh viên vừa rời phòng..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-white"
                />
              </div>
            </div>
          )}

          {step === 'ANALYZING' && (
            /* STEP 2: Loading State */
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-blue-200 border-t-blue-700 animate-spin"></div>
                <Sparkles className="w-8 h-8 text-indigo-600 animate-pulse" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">
                  AI Gemini 3.8 Flash đang phân tích 5S...
                </h4>
                <p className="text-xs text-slate-500 max-w-md mt-1">
                  Đang đối chiếu {photos.length} hình ảnh với {room.checklist.length} tiêu chí 5S chuẩn của Khoa Tài chính – Ngân hàng và Bảo hiểm.
                </p>
              </div>
            </div>
          )}

          {step === 'REVIEW' && (
            /* STEP 3: Review AI Proposals with Human Confirmation */
            <div className="space-y-6">
              {/* AI Summary Banner */}
              <div className="bg-linear-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-sm text-blue-200 mb-1.5">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Tóm tắt nhận định 5S từ AI Gemini:</span>
                </div>
                <p className="text-xs text-slate-100 leading-relaxed">{aiSummary}</p>
              </div>

              {/* Coverage Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <p className="text-[11px] text-slate-500 font-medium">Tiêu chí đủ bằng chứng</p>
                  <p className="text-xl font-black text-slate-900 mt-1">
                    {coverage.decisiveCount} / {room.checklist.length}
                  </p>
                  <p className="text-[10px] text-blue-700 font-semibold mt-0.5">
                    Độ phủ: {coverage.coveragePercentage}%
                  </p>
                </div>

                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
                  <p className="text-[11px] text-amber-800 font-medium">Chưa đủ bằng chứng</p>
                  <p className="text-xl font-black text-amber-900 mt-1">
                    {coverage.insufficientCount}
                  </p>
                  <p className="text-[10px] text-amber-700 font-medium mt-0.5">
                    Cần người kiểm tra xác nhận
                  </p>
                </div>

                <div className="bg-indigo-50 p-3.5 rounded-xl border border-indigo-200 col-span-2">
                  <p className="text-[11px] text-indigo-800 font-medium">
                    Điểm AI tạm tính (trên các tiêu chí đủ bằng chứng):
                  </p>
                  <p className="text-xl font-black text-indigo-900 mt-1">
                    {coverage.preliminaryScore !== null ? `${coverage.preliminaryScore}%` : 'N/A'}
                  </p>
                  <p className="text-[10px] text-indigo-700 italic mt-0.5">
                    * Không dùng điểm này để tự kết luận toàn bộ phòng đạt 5S.
                  </p>
                </div>
              </div>

              {/* Criteria Review Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-700" />
                    <span>Rà soát &amp; Xác nhận kết luận từng tiêu chí (Bắt buộc)</span>
                  </h4>
                  <span className="text-xs text-slate-500">
                    {Object.values(decisions).filter((d) => d.status !== 'INSUFFICIENT_EVIDENCE').length}/{room.checklist.length} đã xác nhận
                  </span>
                </div>

                <div className="space-y-4">
                  {room.checklist.map((item) => {
                    const proposal = aiProposals.find((p) => p.criterionId === item.id);
                    const decision = decisions[item.id];
                    const isDecided = decision && decision.status !== 'INSUFFICIENT_EVIDENCE';
                    const isOverridden = decision?.isOverriddenFromAI;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          !isDecided
                            ? 'bg-amber-50/50 border-amber-300 ring-2 ring-amber-200'
                            : decision.status === 'PASSED'
                            ? 'bg-white border-slate-200'
                            : decision.status === 'FAILED'
                            ? 'bg-red-50/40 border-red-200'
                            : 'bg-slate-50 border-slate-300'
                        }`}
                      >
                        {/* Criterion header */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800">
                                {item.code}
                              </span>
                              <span className="font-bold text-sm text-slate-900">{item.name}</span>
                            </div>
                            <p className="text-xs text-slate-600">{item.description}</p>
                          </div>

                          {/* AI Proposal Badge */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] text-slate-500 font-semibold">AI đề xuất:</span>
                            {proposal?.status === 'PASSED' ? (
                              <span className="bg-emerald-100 text-emerald-800 text-xs px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đạt
                              </span>
                            ) : proposal?.status === 'FAILED' ? (
                              <span className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-red-600" /> Không đạt
                              </span>
                            ) : (
                              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                                <HelpCircle className="w-3 h-3 text-amber-600" /> Chưa đủ bằng chứng
                              </span>
                            )}
                          </div>
                        </div>

                        {/* What AI observed */}
                        {proposal && (
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5 my-2">
                            <p className="text-slate-700">
                              <span className="font-semibold text-slate-900">Quan sát từ ảnh:</span> {proposal.observation}
                            </p>

                            {proposal.issues && (
                              <p className="text-red-700 font-medium">
                                <span className="font-bold">Vấn đề:</span> {proposal.issues}
                              </p>
                            )}

                            {proposal.recommendation && (
                              <p className="text-blue-800 font-medium">
                                <span className="font-bold">Gợi ý khắc phục:</span> {proposal.recommendation}
                              </p>
                            )}

                            {proposal.evidenceNeeded && (
                              <p className="text-amber-800 font-medium">
                                <span className="font-bold">Minh chứng cần bổ sung:</span> {proposal.evidenceNeeded}
                              </p>
                            )}

                            {/* Photo References */}
                            {proposal.photoReferences && proposal.photoReferences.length > 0 && (
                              <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-500">
                                <span className="font-medium">Căn cứ:</span>
                                {proposal.photoReferences.map((pNum) => {
                                  const photo = photos[pNum - 1];
                                  return (
                                    <button
                                      key={pNum}
                                      type="button"
                                      onClick={() => photo && setPreviewPhotoUrl(photo.url)}
                                      className="inline-flex items-center gap-1 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-700 px-2 py-0.5 rounded text-[11px] cursor-pointer"
                                    >
                                      <ImageIcon className="w-3 h-3 text-slate-400" />
                                      <span>Ảnh #{pNum}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Inspector Review Controls */}
                        <div className="pt-2 border-t border-slate-200 mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800 mr-1">Kết luận kiểm tra:</span>

                            {/* Accept AI shortcut */}
                            {proposal && proposal.status !== 'INSUFFICIENT_EVIDENCE' && (
                              <button
                                type="button"
                                onClick={() => handleAcceptProposal(proposal)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                                  !isOverridden && decision?.status === proposal.status
                                    ? 'bg-blue-700 text-white shadow-2xs'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Chấp nhận AI</span>
                              </button>
                            )}

                            {/* Manual Override Buttons */}
                            <button
                              type="button"
                              onClick={() => handleOverrideStatus(item.id, 'PASSED')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                                decision?.status === 'PASSED'
                                  ? 'bg-emerald-600 text-white shadow-2xs'
                                  : 'bg-white border border-slate-200 hover:bg-emerald-50 text-slate-700'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Đạt</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOverrideStatus(item.id, 'FAILED')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                                decision?.status === 'FAILED'
                                  ? 'bg-red-600 text-white shadow-2xs'
                                  : 'bg-white border border-slate-200 hover:bg-red-50 text-slate-700'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>Không đạt</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOverrideStatus(item.id, 'NOT_APPLICABLE')}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                                decision?.status === 'NOT_APPLICABLE'
                                  ? 'bg-slate-700 text-white shadow-2xs'
                                  : 'bg-white border border-slate-200 hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <MinusCircle className="w-3.5 h-3.5" />
                              <span>Không áp dụng</span>
                            </button>
                          </div>

                          {!isDecided && (
                            <span className="text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                              ⚠ Cần xác nhận kết luận
                            </span>
                          )}
                        </div>

                        {/* If changed from AI proposal: Require override reason */}
                        {isOverridden && (
                          <div className="mt-3 bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 space-y-1">
                            <label className="block text-[11px] font-bold text-blue-900">
                              Lý do sửa khác đề xuất của AI (Bắt buộc):
                            </label>
                            <input
                              type="text"
                              value={decision?.overrideReason || ''}
                              onChange={(e) => handleUpdateOverrideReason(item.id, e.target.value)}
                              placeholder="Ghi rõ căn cứ sửa (ví dụ: đã kiểm tra hồ sơ trực tiếp, sinh viên đang trong giờ học...)"
                              className="w-full text-xs p-2 rounded-lg border border-blue-300 bg-white"
                            />
                          </div>
                        )}

                        {/* If marked NOT_APPLICABLE: Require NA reason */}
                        {decision?.status === 'NOT_APPLICABLE' && (
                          <div className="mt-3 bg-slate-100 p-2.5 rounded-xl border border-slate-200 space-y-1">
                            <label className="block text-[11px] font-bold text-slate-800">
                              Lý do Không áp dụng (Bắt buộc):
                            </label>
                            <input
                              type="text"
                              value={decision?.naReason || ''}
                              onChange={(e) => handleUpdateNAReason(item.id, e.target.value)}
                              placeholder="Nhập lý do tiêu chí này không áp dụng..."
                              className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          {step === 'PHOTOS' && (
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
                onClick={handleRunAIAnalysis}
                disabled={photos.length === 0}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Bắt đầu phân tích AI ({photos.length} ảnh)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          )}

          {step === 'REVIEW' && (
            <>
              <button
                type="button"
                onClick={() => setStep('PHOTOS')}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Chụp / Thêm ảnh</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitInspection}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-xs font-bold text-white flex items-center gap-2 shadow-md transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang lưu phiếu & tạo nhiệm vụ...' : 'Xác nhận & Gửi phiếu chính thức'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Full Photo Preview Modal */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={previewPhotoUrl} alt="Minh chứng chi tiết" className="rounded-xl max-h-[85vh] object-contain shadow-2xl" />
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute -top-3 -right-3 p-2 bg-white text-slate-900 rounded-full shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
