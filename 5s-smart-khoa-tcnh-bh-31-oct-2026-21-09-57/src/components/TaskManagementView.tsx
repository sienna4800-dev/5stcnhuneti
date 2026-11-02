import React, { useState } from 'react';
import { CorrectiveTask, Room } from '../types.ts';
import { useApp } from '../context/AppContext.tsx';
import { formatVNDate } from '../utils/thresholdUtils.ts';
import { isPersonnelInRoster } from '../utils/roomUtils.ts';
import { is5SAdminOrLeader } from '../utils/permissions.ts';
import { compressImageFile } from '../utils/imageCompressor.ts';
import {
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Camera,
  User,
  Building,
  ArrowRight,
  Filter,
  Check,
  RotateCcw,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Calendar,
  History,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface TaskManagementViewProps {
  onSelectRoom?: (roomId: string) => void;
}

export const TaskManagementView: React.FC<TaskManagementViewProps> = ({ onSelectRoom }) => {
  const { tasks, rooms, currentUser, users, updateTask, verifyTask, settings } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTask, setSelectedTask] = useState<CorrectiveTask | null>(null);

  // Task detail modal state
  const [actionNotes, setActionNotes] = useState('');
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [isComparingAI, setIsComparingAI] = useState(false);
  const [aiCompareResult, setAiCompareResult] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Assignee and deadline editing state
  const [assigneeSelect, setAssigneeSelect] = useState('Chờ phân công');
  const [deadlineInput, setDeadlineInput] = useState('');
  const [assignmentSavedSuccess, setAssignmentSavedSuccess] = useState(false);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';
  const isLeader = currentUser?.role === 'LEADER';
  const isAuthorizedToVerify = isAdmin || isLeader;

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    const deadlineDays = settings.defaultTaskDeadlineDays || 3;
    const createdTime = new Date(t.createdAt).getTime();
    const isOverdue =
      t.status !== 'VERIFIED_DONE' &&
      Date.now() > createdTime + deadlineDays * 24 * 3600 * 1000;

    if (statusFilter === 'OVERDUE') return isOverdue;
    if (statusFilter === 'UNASSIGNED') return (!t.assignedTo || t.assignedTo === 'Chờ phân công') && t.status !== 'VERIFIED_DONE';
    if (statusFilter === 'PENDING') return t.status === 'PENDING';
    if (statusFilter === 'IN_PROGRESS') return t.status === 'IN_PROGRESS';
    if (statusFilter === 'PENDING_VERIFICATION') return t.status === 'PENDING_VERIFICATION';
    if (statusFilter === 'VERIFIED_DONE') return t.status === 'VERIFIED_DONE';
    return true;
  });

  const openModal = (task: CorrectiveTask) => {
    setSelectedTask(task);
    setActionNotes(task.actionNotes || '');
    setAfterPhotos(task.afterPhotos || []);
    setAiCompareResult(task.aiVerification || null);
    setShowRejectInput(false);
    setRejectionReason('');
    setAssigneeSelect(task.assignedTo && task.assignedTo.trim() !== '' ? task.assignedTo : 'Chờ phân công');
    setDeadlineInput(task.deadline ? task.deadline.split('T')[0] : '');
    setAssignmentSavedSuccess(false);
  };

  const closeModal = () => {
    setSelectedTask(null);
  };

  const handleUploadAfterPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const compressed = await compressImageFile(files[0]);
      setAfterPhotos((prev) => [...prev, compressed]);
    } catch (err) {
      console.error('Failed to compress after photo:', err);
    }
  };

  // Run AI Comparison between before and after photo
  const handleRunAIComparison = async () => {
    if (!selectedTask) return;
    if (afterPhotos.length === 0) {
      alert('Vui lòng chụp hoặc tải lên ít nhất 1 ảnh sau xử lý để AI đối chiếu.');
      return;
    }

    const beforePhoto = selectedTask.beforePhotos?.[0] || '';
    const afterPhoto = afterPhotos[0];

    setIsComparingAI(true);
    try {
      const response = await fetch('/api/ai-compare-correction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: selectedTask.id,
          criterionName: selectedTask.criterionName,
          roomName: selectedTask.roomName,
          issueDescription: selectedTask.issueDescription,
          beforePhoto,
          afterPhoto,
          userNotes: actionNotes,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi gọi AI đối chiếu ảnh.');
      }

      setAiCompareResult(data.verification);
    } catch (err: any) {
      alert(err?.message || 'Có lỗi khi phân tích đối chiếu bằng AI.');
    } finally {
      setIsComparingAI(false);
    }
  };

  // Save Assignment & Deadline (Only writes changes upon explicit click!)
  const handleSaveAssignment = async () => {
    if (!selectedTask) return;
    setIsSavingAssignment(true);

    const oldAssignee = selectedTask.assignedTo || 'Chờ phân công';
    const newAssignee = assigneeSelect.trim();
    const newDeadline = deadlineInput ? new Date(`${deadlineInput}T23:59:59`).toISOString() : undefined;

    let newStatus = selectedTask.status;
    if (newAssignee !== 'Chờ phân công' && newStatus === 'PENDING') {
      newStatus = 'IN_PROGRESS';
    }

    const auditEntry = {
      updatedBy: currentUser?.name || 'Quản trị viên',
      updatedAt: new Date().toISOString(),
      change: `Phân công: "${oldAssignee}" ➔ "${newAssignee}"${
        deadlineInput ? ` • Hạn: ${formatVNDate(deadlineInput)}` : ''
      }`,
    };

    const success = await updateTask(selectedTask.id, selectedTask.actionNotes, selectedTask.afterPhotos, newStatus, {
      assignedTo: newAssignee,
      deadline: newDeadline,
      auditEntry,
    });

    setIsSavingAssignment(false);
    if (success) {
      setAssignmentSavedSuccess(true);
      setSelectedTask((prev) =>
        prev
          ? {
              ...prev,
              assignedTo: newAssignee,
              status: newStatus,
              deadline: newDeadline,
              auditTrail: [...(prev.auditTrail || []), auditEntry],
            }
          : null
      );
      setTimeout(() => setAssignmentSavedSuccess(false), 2500);
    }
  };

  // Submit task for verification - REQUIRES both description and evidence photos!
  const handleSubmitFix = async () => {
    if (!selectedTask) return;
    if (actionNotes.trim().length === 0) {
      alert('Vui lòng nhập mô tả chi tiết công việc đã xử lý thực tế.');
      return;
    }
    if (afterPhotos.length === 0) {
      alert('Bắt buộc chụp hoặc tải lên ít nhất 1 ảnh minh chứng sau khi khắc phục để gửi nghiệm thu.');
      return;
    }

    const success = await updateTask(selectedTask.id, actionNotes, afterPhotos, 'PENDING_VERIFICATION');
    if (success) {
      closeModal();
    }
  };

  // Approve / Verify Task (Disallows self-verification!)
  const handleApprove = async () => {
    if (!selectedTask) return;

    // Strict rule: "Không cho tự nghiệm thu việc mình thực hiện."
    if (currentUser && selectedTask.assignedTo?.trim().toLowerCase() === currentUser.name?.trim().toLowerCase()) {
      alert(
        'Quy định 5S UNETI: Bạn là người phụ trách thực hiện nhiệm vụ này nên không được tự nghiệm thu cho chính mình. Vui lòng để một quản trị viên hoặc lãnh đạo khác nghiệm thu.'
      );
      return;
    }

    const ok = await verifyTask(selectedTask.id, true);
    if (ok) closeModal();
  };

  // Return / Reject Task with reason
  const handleReject = async () => {
    if (!selectedTask || !rejectionReason.trim()) {
      alert('Bắt buộc nhập lý do trả lại để người phụ trách làm lại.');
      return;
    }
    const ok = await verifyTask(selectedTask.id, false, rejectionReason);
    if (ok) closeModal();
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Quản lý Khắc phục Tồn tại 5S
            </h2>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
              {tasks.length} nhiệm vụ
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi, xử lý và nghiệm thu các nội dung Không đạt sau các đợt kiểm tra 5S. Hạn xử lý mặc định: {settings.defaultTaskDeadlineDays || 3} ngày.
          </p>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs min-w-0">
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'UNASSIGNED', label: 'Chờ phân công' },
            { key: 'PENDING', label: 'Chờ xử lý' },
            { key: 'IN_PROGRESS', label: 'Đang xử lý' },
            { key: 'PENDING_VERIFICATION', label: 'Chờ nghiệm thu' },
            { key: 'VERIFIED_DONE', label: 'Hoàn thành' },
            { key: 'OVERDUE', label: 'Quá hạn' },
          ].map((item) => (
            <button
              type="button"
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                statusFilter === item.key
                  ? 'bg-blue-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Task List Grid */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">
            Không có nhiệm vụ nào trong mục này
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Tất cả nội dung 5S trong trạng thái này đã được xử lý hoặc chưa phát sinh vi phạm.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0">
          {filteredTasks.map((task) => {
            const deadlineDays = settings.defaultTaskDeadlineDays || 3;
            const createdTime = new Date(task.createdAt).getTime();
            const overdue =
              task.status !== 'VERIFIED_DONE' &&
              Date.now() > createdTime + deadlineDays * 24 * 3600 * 1000;

            const isAssigned = task.assignedTo && task.assignedTo.trim() !== '' && task.assignedTo !== 'Chờ phân công';
            const isInRoster = isPersonnelInRoster(task.assignedTo, users);

            return (
              <div
                key={task.id}
                onClick={() => openModal(task)}
                className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-blue-300 transition-all flex flex-col justify-between cursor-pointer group min-w-0"
              >
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 shrink-0">
                          {task.roomName}
                        </span>
                        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 shrink-0">
                          {task.criterionCode}
                        </span>
                        {overdue && task.status !== 'VERIFIED_DONE' && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-red-600 text-white animate-pulse shrink-0">
                            Quá hạn
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 truncate">
                        {task.criterionName}
                      </h4>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        task.status === 'VERIFIED_DONE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : task.status === 'PENDING_VERIFICATION'
                          ? 'bg-indigo-100 text-indigo-800'
                          : task.status === 'IN_PROGRESS'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {task.status === 'VERIFIED_DONE'
                        ? 'Đã nghiệm thu'
                        : task.status === 'PENDING_VERIFICATION'
                        ? 'Chờ nghiệm thu'
                        : task.status === 'IN_PROGRESS'
                        ? 'Đang xử lý'
                        : 'Chờ xử lý'}
                    </span>
                  </div>

                  {/* Issue description */}
                  <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-100 mb-2 line-clamp-2">
                    <span className="font-bold">Tồn tại:</span> {task.issueDescription}
                  </p>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                    <span className="font-semibold text-slate-700">Khuyến nghị:</span> {task.recommendation}
                  </p>
                </div>

                {/* Footer metadata */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 gap-2">
                  <div className="flex items-center gap-1 min-w-0 truncate">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span
                      className={`truncate ${
                        !isAssigned
                          ? 'text-amber-600 font-semibold'
                          : !isInRoster
                          ? 'text-slate-600'
                          : 'text-slate-700'
                      }`}
                    >
                      {!isAssigned
                        ? 'Chờ phân công'
                        : !isInRoster
                        ? `${task.assignedTo} (Chưa liên kết)`
                        : task.assignedTo}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 font-medium text-blue-700 shrink-0">
                    <span>Chi tiết</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Detail & Reassignment Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                    {selectedTask.roomName}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                    {selectedTask.criterionCode}
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-base sm:text-lg mt-1 truncate">
                  {selectedTask.criterionName}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Đóng cửa sổ nhiệm vụ"
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Assignment & Deadline Box */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-blue-700" />
                    <span>Phân công người phụ trách &amp; Hạn xử lý</span>
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Tạo ngày: {formatVNDate(selectedTask.createdAt)}
                  </span>
                </div>

                {/* Notice for unlinked historical accounts */}
                {!isPersonnelInRoster(selectedTask.assignedTo, users) && (
                  <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Tài khoản chưa liên kết:</p>
                      <p>
                        Người phụ trách lưu trong lịch sử ("{selectedTask.assignedTo}") không thuộc danh sách nhân sự hiện hành của khoa. Vui lòng chọn một giảng viên/cán bộ hợp lệ bên dưới để phân công lại.
                      </p>
                    </div>
                  </div>
                )}

                {/* Form to reassign (Available for ADMIN & LEADER) */}
                {isAuthorizedToVerify ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Người phụ trách (Danh sách giảng viên &amp; đầu mối):
                        </label>
                        <select
                          value={assigneeSelect}
                          onChange={(e) => setAssigneeSelect(e.target.value)}
                          className="w-full p-2 bg-white rounded-xl border border-slate-300 font-medium text-xs"
                        >
                          {!isPersonnelInRoster(selectedTask.assignedTo, users) && (
                            <option value={selectedTask.assignedTo}>
                              {selectedTask.assignedTo} (Tài khoản chưa liên kết)
                            </option>
                          )}
                          <option value="Chờ phân công">-- Chờ phân công --</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.name}>
                              {u.name} ({u.roleTitle})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Hạn khắc phục:
                        </label>
                        <input
                          type="date"
                          value={deadlineInput}
                          onChange={(e) => setDeadlineInput(e.target.value)}
                          className="w-full p-2 bg-white rounded-xl border border-slate-300 text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {assignmentSavedSuccess ? (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Đã lưu thay đổi thành công!
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          * Chỉ lưu thay đổi khi bấm nút bên phải
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveAssignment}
                        disabled={isSavingAssignment}
                        className="bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        {isSavingAssignment ? 'Đang lưu...' : 'Lưu phân công & Hạn'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-700">
                    <p>
                      <span className="text-slate-500">Người phụ trách: </span>
                      <span className="font-bold">
                        {selectedTask.assignedTo && selectedTask.assignedTo !== 'Chờ phân công'
                          ? selectedTask.assignedTo
                          : 'Chờ phân công'}
                      </span>
                    </p>
                    {selectedTask.deadline && (
                      <p className="mt-1 text-slate-500">
                        Hạn hoàn thành: {formatVNDate(selectedTask.deadline)}
                      </p>
                    )}
                  </div>
                )}

                {/* Audit trail display */}
                {selectedTask.auditTrail && selectedTask.auditTrail.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/80">
                    <p className="text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <History className="w-3 h-3 text-slate-400" />
                      <span>Nhật ký phân công:</span>
                    </p>
                    <div className="space-y-1">
                      {selectedTask.auditTrail.map((entry, idx) => (
                        <p key={idx} className="text-[10px] text-slate-500">
                          {formatVNDate(entry.updatedAt, true)} • {entry.updatedBy}: {entry.change}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Problem & Before Photo */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 text-sm">Hiện trạng vi phạm ban đầu:</h4>
                <div className="bg-red-50 p-3 rounded-xl border border-red-200 text-red-900 space-y-1">
                  <p><span className="font-bold">Mô tả:</span> {selectedTask.issueDescription}</p>
                  <p><span className="font-bold">Khuyến nghị khắc phục:</span> {selectedTask.recommendation}</p>
                </div>

                {selectedTask.beforePhotos && selectedTask.beforePhotos.length > 0 && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Ảnh trước khi xử lý:
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {selectedTask.beforePhotos.map((imgUrl, i) => (
                        <img
                          key={i}
                          src={imgUrl}
                          alt="Trước xử lý"
                          className="w-32 h-24 object-cover rounded-xl border border-slate-300 shadow-2xs"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Taken & After Photo */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <h4 className="font-bold text-slate-800 text-sm">Cập nhật kết quả khắc phục:</h4>

                <div className="space-y-1">
                  <label htmlFor="actionNotesInput" className="block font-semibold text-slate-700">
                    Mô tả công việc đã xử lý thực tế (Bắt buộc):
                  </label>
                  <textarea
                    id="actionNotesInput"
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Mô tả cụ thể đã sắp xếp, nẹp dây, vệ sinh hoặc sửa chữa như thế nào..."
                    rows={2}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                    disabled={selectedTask.status === 'VERIFIED_DONE'}
                  />
                </div>

                {/* After photos upload */}
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700">
                    Ảnh sau khi khắc phục (Minh chứng - Bắt buộc để nghiệm thu):
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {afterPhotos.map((url, idx) => (
                      <div key={idx} className="relative group w-24 h-20 rounded-xl overflow-hidden border border-slate-300">
                        <img src={url} alt="Sau xử lý" className="w-full h-full object-cover" />
                        {selectedTask.status !== 'VERIFIED_DONE' && (
                          <button
                            type="button"
                            onClick={() => setAfterPhotos((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute inset-0 bg-red-600/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                    ))}

                    {selectedTask.status !== 'VERIFIED_DONE' && (
                      <label
                        htmlFor="afterPhotoUploadInput"
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-2.5 rounded-xl border border-blue-200 cursor-pointer transition-colors"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Chụp / Tải ảnh sau xử lý</span>
                        <input
                          id="afterPhotoUploadInput"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleUploadAfterPhoto}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* AI Before/After Comparison Button */}
                {afterPhotos.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={isComparingAI}
                      onClick={handleRunAIComparison}
                      className="bg-linear-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 disabled:opacity-50 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-2 shadow-xs cursor-pointer transition-all"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{isComparingAI ? 'AI đang đối chiếu ảnh...' : 'Yêu cầu AI đối chiếu ảnh Trước & Sau'}</span>
                    </button>
                  </div>
                )}

                {/* AI Compare Results */}
                {aiCompareResult && (
                  <div className="bg-indigo-50/80 border border-indigo-200 p-4 rounded-xl space-y-2 mt-2">
                    <div className="flex items-center justify-between font-bold text-indigo-900">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-indigo-600" />
                        Kết quả AI đối chiếu Trước &amp; Sau:
                      </span>
                      <span className="text-[11px] bg-indigo-200 px-2 py-0.5 rounded-full">
                        Độ tin cậy: {aiCompareResult.confidence}%
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="bg-white p-2 rounded-lg border border-indigo-100">
                        <span className="text-slate-500">Cùng khu vực: </span>
                        <span className={`font-bold ${aiCompareResult.sameArea ? 'text-emerald-700' : 'text-red-700'}`}>
                          {aiCompareResult.sameArea ? 'Đúng' : 'Chưa chắc chắn'}
                        </span>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-indigo-100">
                        <span className="text-slate-500">Vấn đề giải quyết: </span>
                        <span className={`font-bold ${aiCompareResult.issueResolved ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {aiCompareResult.issueResolved ? 'Đã khắc phục' : 'Chưa triệt để'}
                        </span>
                      </div>
                    </div>

                    <p className="text-indigo-950"><span className="font-bold">Quan sát AI:</span> {aiCompareResult.observation}</p>
                    <p className="text-indigo-900"><span className="font-bold">Khuyến nghị:</span> {aiCompareResult.recommendation}</p>
                  </div>
                )}
              </div>

              {/* Rejection input box */}
              {showRejectInput && (
                <div className="bg-red-50 p-3 rounded-xl border border-red-200 space-y-2">
                  <label htmlFor="rejectionReasonInput" className="block font-bold text-red-900">
                    Lý do trả lại yêu cầu xử lý lại (Bắt buộc):
                  </label>
                  <textarea
                    id="rejectionReasonInput"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Chỉ rõ điểm chưa đạt cần khắc phục lại..."
                    rows={2}
                    className="w-full p-2 rounded-lg border border-red-300 text-xs bg-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(false)}
                      className="px-3 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={handleReject}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold cursor-pointer"
                    >
                      Xác nhận trả lại
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 border border-slate-300 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Đóng
              </button>

              <div className="flex items-center gap-2">
                {/* Submit fix button for assignee or general users */}
                {selectedTask.status !== 'VERIFIED_DONE' && selectedTask.status !== 'PENDING_VERIFICATION' && (
                  <button
                    type="button"
                    onClick={handleSubmitFix}
                    className="bg-blue-700 hover:bg-blue-800 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Gửi yêu cầu nghiệm thu</span>
                  </button>
                )}

                {/* Verification Actions for ADMIN / LEADER */}
                {isAuthorizedToVerify && selectedTask.status !== 'VERIFIED_DONE' && (
                  <>
                    {!showRejectInput && (
                      <button
                        type="button"
                        onClick={() => setShowRejectInput(true)}
                        className="px-3.5 py-2 border border-red-300 text-red-700 hover:bg-red-50 font-bold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>Yêu cầu làm lại</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={currentUser && selectedTask.assignedTo?.trim().toLowerCase() === currentUser.name?.trim().toLowerCase()}
                      title={
                        currentUser && selectedTask.assignedTo?.trim().toLowerCase() === currentUser.name?.trim().toLowerCase()
                          ? 'Bạn là người thực hiện nên không được tự nghiệm thu'
                          : 'Duyệt hoàn thành nhiệm vụ'
                      }
                      className={`font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all ${
                        currentUser && selectedTask.assignedTo?.trim().toLowerCase() === currentUser.name?.trim().toLowerCase()
                          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Nghiệm thu Đạt</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
