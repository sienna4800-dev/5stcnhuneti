import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { InspectionRecord, CorrectiveTask, Room } from '../types.ts';
import { useApp } from '../context/AppContext.tsx';
import { formatVNDate, evaluateInspectionRecord } from '../utils/thresholdUtils.ts';
import { normalizeRoomId } from '../utils/roomUtils.ts';
import { is5SAdminOrLeader } from '../utils/permissions.ts';
import { InspectionDetailModal } from './InspectionDetailModal.tsx';
import {
  BarChart3,
  Download,
  Printer,
  Filter,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ClipboardList,
  Calendar,
  Layers,
  FileSpreadsheet,
  Lock,
  Eye,
  Info,
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { inspections, tasks, rooms, settings, currentUser } = useApp();

  const isAuthorized = is5SAdminOrLeader(currentUser);

  // Filters state
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [selectedSource, setSelectedSource] = useState<string>('ALL');
  const [dateRangePreset, setDateRangePreset] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [dataSourceFilter, setDataSourceFilter] = useState<'ALL' | 'OPERATIONAL' | 'SAMPLE' | 'UNKNOWN'>('ALL');

  // Inspection detail modal state
  const [selectedInspectionForDetail, setSelectedInspectionForDetail] = useState<InspectionRecord | null>(null);

  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Quyền truy cập hạn chế</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Chức năng <span className="font-semibold text-slate-800">Báo cáo Tổng hợp 5S</span> chỉ dành riêng cho các tài khoản có nhãn:
        </p>
        <div className="flex flex-col gap-2 max-w-sm mx-auto text-left text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            <span className="font-bold text-slate-900">Đầu mối 5S / Quản trị viên:</span>
            <span className="text-slate-600">TS. Phạm Đức Tài</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            <span className="font-bold text-slate-900">Lãnh đạo khoa / Trưởng khoa:</span>
            <span className="text-slate-600">TS. Phùng Thị Lan Hương</span>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 italic">
          Tài khoản hiện tại của bạn: <span className="font-semibold text-slate-700">{currentUser?.name}</span> ({currentUser?.roleTitle})
        </p>
      </div>
    );
  }

  // Filter inspections based on all active criteria
  const filteredInspections = inspections.filter((insp) => {
    // Room filter with normalized ID
    if (selectedRoomId !== 'ALL' && normalizeRoomId(insp.roomId) !== normalizeRoomId(selectedRoomId)) {
      return false;
    }

    // Source filter
    if (selectedSource !== 'ALL' && insp.evaluationSource !== selectedSource) {
      return false;
    }

    // Data source mode (operational vs sample)
    if (dataSourceFilter === 'OPERATIONAL' && insp.isSample !== false) {
      return false;
    }
    if (dataSourceFilter === 'SAMPLE' && insp.isSample !== true) {
      return false;
    }

    if (dataSourceFilter === 'UNKNOWN' && insp.isSample !== undefined) return false;

    // Date range filter
    const inspTime = new Date(insp.createdAt).getTime();
    if (dateRangePreset === '7DAYS') {
      const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
      if (inspTime < sevenDaysAgo) return false;
    } else if (dateRangePreset === '30DAYS') {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
      if (inspTime < thirtyDaysAgo) return false;
    } else if (dateRangePreset === 'CUSTOM') {
      if (fromDate) {
        const fromTime = new Date(`${fromDate}T00:00:00`).getTime();
        if (inspTime < fromTime) return false;
      }
      if (toDate) {
        const toTime = new Date(`${toDate}T23:59:59.999`).getTime();
        if (inspTime > toTime) return false;
      }
    }

    return true;
  });

  // SYNCHRONIZED TASKS: Tasks belonging to inspections or rooms matching active filters!
  const filteredInspectionIdSet = new Set(filteredInspections.map((i) => i.id));
  const filteredRoomNormIds = new Set(
    selectedRoomId !== 'ALL'
      ? [normalizeRoomId(selectedRoomId)]
      : filteredInspections.map((i) => normalizeRoomId(i.roomId))
  );

  const filteredTasks = tasks.filter((t) => {
    // If task links directly to an inspection in the current filtered set
    if (t.inspectionId && filteredInspectionIdSet.has(t.inspectionId)) {
      return true;
    }
    // If task matches the filtered room and date criteria
    if (selectedRoomId !== 'ALL') {
      if (normalizeRoomId(t.roomId) !== normalizeRoomId(selectedRoomId)) return false;
    } else {
      if (!filteredRoomNormIds.has(normalizeRoomId(t.roomId))) return false;
    }

    // Data source mode
    if (dataSourceFilter === 'OPERATIONAL' && t.isSample !== false) return false;
    if (dataSourceFilter === 'SAMPLE' && t.isSample !== true) return false;
    if (dataSourceFilter === 'UNKNOWN' && t.isSample !== undefined) return false;

    // Time filter for standalone tasks
    const tTime = new Date(t.createdAt).getTime();
    if (dateRangePreset === '7DAYS') {
      if (tTime < Date.now() - 7 * 24 * 3600 * 1000) return false;
    } else if (dateRangePreset === '30DAYS') {
      if (tTime < Date.now() - 30 * 24 * 3600 * 1000) return false;
    } else if (dateRangePreset === 'CUSTOM') {
      if (fromDate && tTime < new Date(`${fromDate}T00:00:00`).getTime()) return false;
      if (toDate && tTime > new Date(`${toDate}T23:59:59.999`).getTime()) return false;
    }

    return true;
  });

  const scopedOpenTasks = filteredTasks.filter((t) => t.status !== 'VERIFIED_DONE').length;
  const scopedDoneTasks = filteredTasks.filter((t) => t.status === 'VERIFIED_DONE').length;

  // Aggregate stats from filtered inspections
  let totalPassed = 0;
  let totalFailed = 0;
  let totalApplicable = 0;

  const sGroupStats: Record<string, { passed: number; failed: number }> = {
    S1: { passed: 0, failed: 0 },
    S2: { passed: 0, failed: 0 },
    S3: { passed: 0, failed: 0 },
    S4: { passed: 0, failed: 0 },
    S5: { passed: 0, failed: 0 },
  };

  const failureFrequency: Record<string, { count: number; name: string }> = {};

  filteredInspections.forEach((insp) => {
    insp.decisions?.forEach((d) => {
      const sPrefix = d.criterionId.slice(0, 2);
      if (d.status === 'PASSED') {
        totalPassed++;
        totalApplicable++;
        if (sGroupStats[sPrefix]) sGroupStats[sPrefix].passed++;
      } else if (d.status === 'FAILED') {
        totalFailed++;
        totalApplicable++;
        if (sGroupStats[sPrefix]) sGroupStats[sPrefix].failed++;

        if (!failureFrequency[d.criterionId]) {
          failureFrequency[d.criterionId] = {
            count: 0,
            name: d.criterionId,
          };
        }
        failureFrequency[d.criterionId].count++;
      }
    });
  });

  const hasData = filteredInspections.length > 0;
  const overallPassRate = totalApplicable > 0 ? Math.round((totalPassed / totalApplicable) * 1000) / 10 : 0;

  const topFailures = Object.entries(failureFrequency)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  // Real Excel .xlsx export
  const handleExportXLSX = () => {
    if (filteredInspections.length === 0) {
      alert('Không có dữ liệu phiếu kiểm tra nào phù hợp với bộ lọc hiện tại.');
      return;
    }

    const exportRows = filteredInspections.map((insp, index) => ({
      STT: index + 1,
      'Mã phiếu': insp.id,
      'Phòng / Khu vực': insp.roomName,
      'Mã nội bộ': insp.roomId,
      'Loại khu vực': insp.roomType,
      'Ngày kiểm tra': formatVNDate(insp.createdAt, true),
      'Người kiểm tra': insp.inspectorName,
      'Vai trò': insp.inspectorRole,
      'Phương thức': insp.evaluationSource === 'AI_ASSISTED' ? 'AI hỗ trợ (Gemini 3.8)' : 'Thủ công',
      'Điểm số (%)': insp.officialScore !== null && insp.officialScore !== undefined ? insp.officialScore : 'K.Đủ CS',
      'Đạt': insp.passedCriteria,
      'Không đạt': insp.failedCriteria,
      'Không áp dụng': insp.naCriteria,
      'Kết luận':
        evaluateInspectionRecord(insp).result === 'PASSED'
          ? 'Đạt chuẩn'
          : evaluateInspectionRecord(insp).result === 'FAILED'
          ? 'Không đạt'
          : 'Không đủ cơ sở đánh giá',
      'Nguồn dữ liệu': insp.isSample === true ? 'Minh họa' : insp.isSample === false ? 'Vận hành' : 'Chưa xác minh nguồn',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Báo cáo 5S');

    const fileName = `BaoCao_5S_UNETI_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // CSV export option preserved
  const handleExportCSV = () => {
    if (filteredInspections.length === 0) {
      alert('Không có dữ liệu phiếu kiểm tra nào phù hợp với bộ lọc.');
      return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += 'BÁO CÁO KẾT QUẢ KIỂM TRA 5S - KHOA TÀI CHÍNH NGÂN HÀNG & BẢO HIỂM (UNETI)\n';
    csvContent += `Thời điểm xuất: ${formatVNDate(new Date(), true)}\n`;
    csvContent += 'Mô tả: Kết quả theo checklist và ngưỡng cấu hình của khoa\n\n';
    csvContent += 'Mã phiếu,Phòng,Mã phòng,Ngày kiểm tra,Người kiểm tra,Phương thức,Điểm số (%),Đạt,Không đạt,Không áp dụng,Kết luận\n';

    filteredInspections.forEach((insp) => {
      const scoreStr = insp.officialScore !== null && insp.officialScore !== undefined ? insp.officialScore : 'K.Đủ CS';
      const resultStr =
        evaluateInspectionRecord(insp).result === 'PASSED'
          ? 'Đạt chuẩn'
          : evaluateInspectionRecord(insp).result === 'FAILED'
          ? 'Không đạt'
          : 'Không đủ cơ sở đánh giá';

      csvContent += `"${insp.id}","${insp.roomName}","${insp.roomId}","${formatVNDate(
        insp.createdAt,
        true
      )}","${insp.inspectorName}","${
        insp.evaluationSource === 'AI_ASSISTED' ? 'AI hỗ trợ' : 'Thủ công'
      }",${scoreStr},${insp.passedCriteria},${insp.failedCriteria},${insp.naCriteria},"${resultStr}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BaoCao_5S_UNETI_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* Header & Export controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:border-none print:shadow-none print:p-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">
              Báo cáo Tổng hợp 5S Khoa TCNH&amp;BH
            </h2>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full border border-blue-200">
              {filteredInspections.length} đợt kiểm tra
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Kết quả theo checklist và ngưỡng cấu hình của khoa (áp dụng ngưỡng mặc định 80% cho các phiếu chưa lưu ngưỡng).
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap print:hidden">
          <button
            type="button"
            onClick={handleExportXLSX}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất file Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-4 h-4" />
            <span>In Báo cáo</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs print:hidden">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <Filter className="w-4 h-4 text-blue-700" />
            <span>Bộ lọc báo cáo &amp; đồng bộ chỉ số</span>
          </div>
          <span className="text-[11px] text-blue-700 font-medium bg-blue-50 px-2 py-0.5 rounded">
            Phạm vi: {selectedRoomId === 'ALL' ? 'Toàn khoa' : selectedRoomId} • {filteredInspections.length} phiếu liên kết
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">Khu vực / Phòng:</label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium"
            >
              <option value="ALL">Tất cả phòng ({rooms.length})</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  [{r.id}] {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Phương thức kiểm tra:</label>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium"
            >
              <option value="ALL">Tất cả phương thức</option>
              <option value="AI_ASSISTED">Có AI hỗ trợ (Gemini 3.8)</option>
              <option value="MANUAL">Kiểm tra thủ công</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Khoảng thời gian:</label>
            <select
              value={dateRangePreset}
              onChange={(e) => setDateRangePreset(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium"
            >
              <option value="ALL">Toàn bộ thời gian</option>
              <option value="7DAYS">7 ngày gần nhất</option>
              <option value="30DAYS">30 ngày gần nhất</option>
              <option value="CUSTOM">Tùy chọn từ ngày - đến ngày</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">Nguồn dữ liệu:</label>
            <select
              value={dataSourceFilter}
              onChange={(e) => setDataSourceFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium"
            >
              <option value="ALL">Tất cả dữ liệu</option>
              <option value="OPERATIONAL">Dữ liệu vận hành thực tế</option>
              <option value="SAMPLE">Dữ liệu minh họa khởi tạo</option>
              <option value="UNKNOWN">Chưa xác minh nguồn</option>
            </select>
          </div>
        </div>

        {/* Custom date range picker if CUSTOM selected */}
        {dateRangePreset === 'CUSTOM' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Từ ngày:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium text-xs"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Đến ngày:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Cards - All synchronized with active filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Tỷ lệ Tuân thủ 5S</p>
          <p className="text-2xl sm:text-3xl font-black text-blue-700 mt-1">
            {hasData && totalApplicable > 0 ? `${overallPassRate}%` : 'Chưa có'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {hasData ? `${totalPassed} Đạt / ${totalApplicable} Áp dụng` : 'Không có tiêu chí'}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Số Đợt kiểm tra</p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            {filteredInspections.length}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {filteredInspections.filter((i) => i.evaluationSource === 'AI_ASSISTED').length} có AI hỗ trợ
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Tồn tại Cần xử lý</p>
          <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
            {scopedOpenTasks}
          </p>
          <p className="text-[11px] text-amber-700 mt-1 truncate" title={`Theo ${filteredInspections.length} phiếu được lọc`}>
            Phạm vi lọc hiện tại
          </p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-xs text-slate-500 font-medium">Tồn tại Đã nghiệm thu</p>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1">
            {scopedDoneTasks}
          </p>
          <p className="text-[11px] text-emerald-700 mt-1 truncate">
            Khắc phục thành công
          </p>
        </div>
      </div>

      {/* Empty State when no data matches */}
      {!hasData ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base">
            Chưa có dữ liệu kiểm tra phù hợp
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Không tìm thấy phiếu kiểm tra nào với các tiêu chí lọc đã chọn. Hãy thử thay đổi bộ lọc hoặc chọn "Toàn bộ thời gian".
          </p>
        </div>
      ) : (
        <>
          {/* 5S Dimension Breakdown (S1 - S5) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-700" />
              <span>Tỷ lệ Đạt theo 5 Nhóm Tiêu chí (S1 – S5)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
              {[
                { key: 'S1', name: 'S1 – Sàng lọc' },
                { key: 'S2', name: 'S2 – Sắp xếp' },
                { key: 'S3', name: 'S3 – Sạch sẽ' },
                { key: 'S4', name: 'S4 – Săn sóc' },
                { key: 'S5', name: 'S5 – Sẵn sàng' },
              ].map((cat) => {
                const stat = sGroupStats[cat.key];
                const sum = (stat?.passed || 0) + (stat?.failed || 0);
                const rate = sum > 0 ? Math.round(((stat?.passed || 0) / sum) * 100) : 0;

                return (
                  <div key={cat.key} className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between font-bold">
                      <span className="truncate">{cat.name}</span>
                      <span className="text-blue-700 font-black">{sum > 0 ? `${rate}%` : '-'}</span>
                    </div>
                    <div className="bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full transition-all" style={{ width: `${rate}%` }}></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{stat?.passed || 0} Đạt</span>
                      <span className="text-red-600">{stat?.failed || 0} Không đạt</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Frequent Failures */}
          {topFailures.length > 0 && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Các Tiêu chí Chưa đạt Lặp lại Nhiều nhất</span>
              </h3>

              <div className="space-y-2 text-xs">
                {topFailures.map(([criterionId, data], idx) => (
                  <div
                    key={criterionId}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-800 shrink-0">[{criterionId}]</span>
                      <span className="text-slate-700 truncate">Tiêu chí phát hiện vi phạm qua các lần kiểm tra</span>
                    </div>
                    <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200 shrink-0">
                      {data.count} lần
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inspections Master Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 font-bold text-sm text-slate-900 flex items-center justify-between">
              <span>Danh sách Phiếu Kiểm tra Chi tiết ({filteredInspections.length})</span>
              <span className="text-xs font-normal text-slate-500">Bấm "Xem" để xem đầy đủ 15 tiêu chí và ảnh</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3">Mã phiếu</th>
                    <th className="p-3">Khu vực</th>
                    <th className="p-3">Ngày kiểm tra</th>
                    <th className="p-3">Người kiểm tra</th>
                    <th className="p-3">Phương thức</th>
                    <th className="p-3 text-center">Điểm số</th>
                    <th className="p-3 text-center">Kết luận</th>
                    <th className="p-3 text-center print:hidden">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInspections.map((insp) => (
                    <tr key={insp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono font-medium text-slate-800">
                        {insp.id}
                        {insp.isSample && (
                          <span className="ml-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Demo
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{insp.roomName}</td>
                      <td className="p-3 text-slate-600">{formatVNDate(insp.createdAt)}</td>
                      <td className="p-3 text-slate-700">{insp.inspectorName}</td>
                      <td className="p-3">
                        {insp.evaluationSource === 'AI_ASSISTED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                            <Sparkles className="w-3 h-3 text-indigo-500" /> Có AI
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            Thủ công
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center font-black text-sm text-blue-800">
                        {insp.officialScore !== null && insp.officialScore !== undefined ? `${insp.officialScore}%` : 'K.Đủ CS'}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            evaluateInspectionRecord(insp).result === 'PASSED'
                              ? 'bg-blue-100 text-blue-800'
                              : evaluateInspectionRecord(insp).result === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {evaluateInspectionRecord(insp).result === 'PASSED'
                            ? 'Đạt chuẩn'
                            : evaluateInspectionRecord(insp).result === 'FAILED'
                            ? 'Không đạt'
                            : 'Không đủ cơ sở'}
                        </span>
                      </td>
                      <td className="p-3 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedInspectionForDetail(insp)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal View Inspection Detail */}
      <InspectionDetailModal
        inspection={selectedInspectionForDetail}
        onClose={() => setSelectedInspectionForDetail(null)}
      />
    </div>
  );
};
