import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { MobileNav } from './components/MobileNav.tsx';
import { HomeDashboard } from './components/HomeDashboard.tsx';
import { RoomCard } from './components/RoomCard.tsx';
import { RoomQRModal } from './components/RoomQRModal.tsx';
import { QRScannerModal } from './components/QRScannerModal.tsx';
import { ManualInspectionModal } from './components/ManualInspectionModal.tsx';
import { AIEvaluationModal } from './components/AIEvaluationModal.tsx';
import { HistoryModal } from './components/HistoryModal.tsx';
import { TaskManagementView } from './components/TaskManagementView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { SchedulesView } from './components/SchedulesView.tsx';
import { NotificationsView } from './components/NotificationsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { RoomModal } from './components/RoomModal.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { Room, InspectionRecord } from './types.ts';
import { is5SAdminOrLeader } from './utils/permissions.ts';
import { normalizeRoomId } from './utils/roomUtils.ts';
import {
  Plus,
  QrCode,
  ShieldAlert,
  Sparkles,
  ClipboardCheck,
  CheckCircle2,
  Lock,
  User,
  ArrowRight,
  LogOut,
  Building,
  BarChart3,
  Calendar,
  Settings,
} from 'lucide-react';

function AppContent() {
  const {
    currentUser,
    setCurrentUser,
    login,
    logout,
    switchUserRole,
    users,
    rooms,
    inspections,
    tasks,
    addOrUpdateRoom,
    settings,
  } = useApp();

  const [currentTab, setCurrentTab] = useState<string>('home');

  // Modals state
  const [activeQRRoom, setActiveQRRoom] = useState<Room | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [manualInspectRoom, setManualInspectRoom] = useState<Room | null>(null);
  const [aiEvaluateRoom, setAiEvaluateRoom] = useState<Room | null>(null);
  const [historyRoom, setHistoryRoom] = useState<Room | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [roomToEdit, setRoomToEdit] = useState<Room | null | undefined>(undefined); // undefined means closed, null means create new

  // Toast / Success banner after inspection
  const [lastSubmittedInspection, setLastSubmittedInspection] = useState<InspectionRecord | null>(null);

  // Check URL query param for ?room=... (as required by QR spec)
  const params = new URLSearchParams(window.location.search);
  const roomParam = params.get('room');
  const targetRoom = roomParam
    ? rooms.find((r) => normalizeRoomId(r.id) === normalizeRoomId(roomParam)) || null
    : null;

  useEffect(() => {
    if (targetRoom && currentUser && currentUser.role !== 'UNAPPROVED') {
      setAiEvaluateRoom(targetRoom);
    }
  }, [rooms, currentUser, targetRoom]);

  const handleSelectRoomFromScanner = (roomId: string) => {
    const found = rooms.find((r) => r.id === roomId);
    if (found) {
      setAiEvaluateRoom(found);
    }
  };

  const handleInspectionSuccess = (inspection: InspectionRecord) => {
    setManualInspectRoom(null);
    setAiEvaluateRoom(null);
    setLastSubmittedInspection(inspection);
  };

  // 1. FIRST SCREEN: If not logged in, render dedicated LoginScreen!
  if (!currentUser) {
    return (
      <>
        <LoginScreen
          onLogin={(user, remember) => {
            login(user, remember);
            if (targetRoom && user.role !== 'UNAPPROVED') {
              setAiEvaluateRoom(targetRoom);
            }
          }}
          targetRoom={targetRoom}
          users={users}
          onOpenQRScanner={() => setShowQRScanner(true)}
          facultyName={settings.facultyName}
          universityName={settings.universityName}
        />

        {showQRScanner && (
          <QRScannerModal
            onClose={() => setShowQRScanner(false)}
            onSelectRoom={(roomId) => {
              setShowQRScanner(false);
              const found = rooms.find((r) => r.id === roomId);
              if (found) {
                window.history.replaceState(null, '', `?room=${found.id}`);
              }
            }}
            rooms={rooms}
          />
        )}
      </>
    );
  }

  const isStudent = currentUser.role === 'STUDENT';
  const isAdmin = currentUser.role === 'ADMIN';
  const isAuthorizedAdminOrLeader = is5SAdminOrLeader(currentUser);

  // Filter rooms based on role
  const displayRooms = isStudent
    ? rooms.filter((r) => r.id === 'FBC')
    : rooms;

  // Unapproved Account Screen as required:
  // "Tài khoản mới chưa được duyệt chỉ thấy thông báo “Chờ cấp quyền truy cập”."
  if (currentUser.role === 'UNAPPROVED') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-xl border border-slate-200 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold text-slate-900">Chờ cấp quyền truy cập</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tài khoản <span className="font-semibold text-slate-800">{currentUser.email}</span> đã được ghi nhận vào hệ thống 5S SMART – Khoa TCNH&amp;BH. Vui lòng liên hệ Quản trị viên khoa hoặc Trưởng khoa để được phê duyệt vai trò phù hợp.
          </p>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <button
              onClick={() => switchUserRole('ADMIN')}
              className="bg-blue-700 hover:bg-blue-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Chuyển sang vai trò Đầu mối 5S / Quản trị viên
            </button>
            <button
              onClick={() => switchUserRole('LECTURER')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-xl text-xs transition-colors cursor-pointer"
            >
              Chuyển sang vai trò Giảng viên
            </button>
            <button
              onClick={logout}
              className="text-xs text-red-600 hover:text-red-700 font-semibold py-2 flex items-center justify-center gap-1 cursor-pointer mt-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất / Quay lại màn hình đăng nhập</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        onOpenQRScanner={() => setShowQRScanner(true)}
        onNavigate={(tab) => setCurrentTab(tab)}
        currentTab={currentTab}
      />

      {/* Main Layout Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Left Desktop Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onNavigate={(tab) => setCurrentTab(tab)}
          onOpenQRScanner={() => setShowQRScanner(true)}
        />

        {/* Dynamic Main Workspace Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 sm:pb-8 max-w-full overflow-x-hidden">
          {/* Submission Success Toast */}
          {lastSubmittedInspection && (
            <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl mb-6 shadow-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-emerald-950">
                    Đã ghi nhận phiếu kiểm tra thành công!
                  </h4>
                  <p className="text-xs text-emerald-800">
                    Khu vực: <span className="font-semibold">{lastSubmittedInspection.roomName}</span> • Điểm chính thức: <span className="font-bold text-emerald-900">{lastSubmittedInspection.officialScore}%</span> • Các tiêu chí Không đạt đã tự động tạo nhiệm vụ khắc phục.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setLastSubmittedInspection(null)}
                className="text-emerald-700 hover:text-emerald-900 text-xs font-semibold px-2 py-1"
              >
                Đóng
              </button>
            </div>
          )}

          {/* TAB 1: Home Dashboard */}
          {currentTab === 'home' && (
            <HomeDashboard
              onNavigate={(tab) => setCurrentTab(tab)}
              onOpenQRScanner={() => setShowQRScanner(true)}
              onStartManual={(room) => setManualInspectRoom(room)}
              onStartAI={(room) => setAiEvaluateRoom(room)}
              onSelectRoom={(room) => setActiveQRRoom(room)}
            />
          )}

          {/* TAB 2: Inspect / Room List */}
          {currentTab === 'inspect' && (
            <div className="space-y-6">
              {/* Room list header */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-900">Danh sách Phòng &amp; Mã QR</h2>
                    <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                      {displayRooms.length} khu vực
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Ba phòng mặc định (PTH01, PTH02, VPK) được tạo sẵn kèm mã QR riêng. Bạn có thể kiểm tra ngay hoặc quét mã.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowQRScanner(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs border border-blue-200 transition-colors cursor-pointer shadow-2xs"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Quét mã QR</span>
                  </button>

                  {isAuthorizedAdminOrLeader && (
                    <button
                      onClick={() => setRoomToEdit(null)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm phòng mới</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Room Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {displayRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    onManualInspect={(r) => setManualInspectRoom(r)}
                    onAIEvaluate={(r) => setAiEvaluateRoom(r)}
                    onViewHistory={(r) => setHistoryRoom(r)}
                    onViewQR={(r) => setActiveQRRoom(r)}
                    onEdit={isAuthorizedAdminOrLeader ? (r) => setRoomToEdit(r) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Corrective Tasks */}
          {currentTab === 'tasks' && <TaskManagementView />}

          {/* TAB 4: Schedules */}
          {currentTab === 'schedules' && <SchedulesView />}

          {/* TAB 5: Reports */}
          {currentTab === 'reports' && <ReportsView />}

          {/* TAB 6: Notifications */}
          {currentTab === 'notifications' && <NotificationsView />}

          {/* TAB 7: Settings */}
          {currentTab === 'settings' && <SettingsView />}

          {/* TAB 8: Account (Mobile tab) */}
          {currentTab === 'account' && (
            <div className="max-w-md mx-auto bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-700 to-indigo-800 text-white mx-auto flex items-center justify-center font-black text-2xl shadow-md">
                  {currentUser.name.charAt(0)}
                </div>
                <h3 className="font-bold text-lg text-slate-900 mt-3">{currentUser.name}</h3>
                <p className="text-xs text-slate-500">{currentUser.email}</p>
                <span className="inline-block mt-2 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
                  {currentUser.roleTitle}
                </span>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Đơn vị công tác:</span>
                  <span className="font-semibold text-slate-800">{currentUser.department}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Hệ thống:</span>
                  <span className="font-semibold text-slate-800">5S SMART – UNETI TCNH&amp;BH</span>
                </div>
              </div>

              {/* Mobile Quick Navigation Shortcuts for authorized views */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <p className="text-xs font-semibold text-slate-700">Chức năng quản lý:</p>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setCurrentTab('schedules')}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold flex items-center justify-between cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-700" />
                      <span>Lịch kiểm tra 5S</span>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isAuthorizedAdminOrLeader && (
                    <>
                      <button
                        type="button"
                        onClick={() => setCurrentTab('reports')}
                        className="p-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/70 text-blue-900 font-semibold flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4 text-blue-700" />
                          <span>Báo cáo Tổng hợp 5S</span>
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setCurrentTab('settings')}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-2">
                          <Settings className="w-4 h-4 text-slate-700" />
                          <span>Quản trị &amp; Cài đặt hệ thống</span>
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Demo Role Switcher - Strictly gated for Demo Mode */}
              {settings.isDemoMode && (
                <div className="pt-4 border-t border-slate-100 space-y-2">
                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-amber-900 text-xs">
                    <p className="font-bold">Chế độ thử nghiệm giao diện:</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Chỉ dùng để kiểm tra phân quyền hiển thị giao diện. Dữ liệu thử nghiệm được tách biệt, không dùng đổi user thật.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => switchUserRole('ADMIN')}
                      className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                    >
                      Quản trị viên
                    </button>
                    <button
                      type="button"
                      onClick={() => switchUserRole('LEADER')}
                      className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                    >
                      Lãnh đạo khoa
                    </button>
                    <button
                      type="button"
                      onClick={() => switchUserRole('LECTURER')}
                      className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                    >
                      Giảng viên
                    </button>
                    <button
                      type="button"
                      onClick={() => switchUserRole('STUDENT')}
                      className="p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium cursor-pointer"
                    >
                      Sinh viên CLB
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={logout}
                  className="w-full py-2.5 px-4 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Đăng xuất tài khoản</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav currentTab={currentTab} onNavigate={(tab) => setCurrentTab(tab)} />

      {/* --- ALL MODALS --- */}

      {/* 1. Room QR Code View & Download Modal */}
      {activeQRRoom && (
        <RoomQRModal
          room={activeQRRoom}
          onClose={() => setActiveQRRoom(null)}
          onInspectNow={(r) => {
            setActiveQRRoom(null);
            setAiEvaluateRoom(r);
          }}
        />
      )}

      {/* 2. QR Code Scanner Modal */}
      {showQRScanner && (
        <QRScannerModal
          rooms={rooms}
          onClose={() => setShowQRScanner(false)}
          onSelectRoom={handleSelectRoomFromScanner}
        />
      )}

      {/* 3. Manual 5S Inspection Modal */}
      {manualInspectRoom && (
        <ManualInspectionModal
          room={manualInspectRoom}
          onClose={() => setManualInspectRoom(null)}
          onSuccess={handleInspectionSuccess}
        />
      )}

      {/* 4. AI 5S Evaluation Modal (Gemini 3.8 Flash) */}
      {aiEvaluateRoom && (
        <AIEvaluationModal
          room={aiEvaluateRoom}
          onClose={() => setAiEvaluateRoom(null)}
          onSuccess={handleInspectionSuccess}
          onSwitchToManual={() => {
            const target = aiEvaluateRoom;
            setAiEvaluateRoom(null);
            setManualInspectRoom(target);
          }}
        />
      )}

      {/* 5. Room Inspection History Modal */}
      {(historyRoom || showAllHistory) && (
        <HistoryModal
          room={historyRoom}
          inspections={inspections}
          onClose={() => {
            setHistoryRoom(null);
            setShowAllHistory(false);
          }}
        />
      )}

      {/* 6. Admin Add / Edit Room Modal */}
      {roomToEdit !== undefined && (
        <RoomModal
          room={roomToEdit}
          onClose={() => setRoomToEdit(undefined)}
          onSave={async (roomData) => {
            await addOrUpdateRoom(roomData);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
