import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  Room,
  InspectionRecord,
  CorrectiveTask,
  InspectionSchedule,
  AppNotification,
  AppSettings,
  UserProfile,
} from '../types.ts';
import { DEMO_USERS } from '../data/defaultData.ts';
import {
  INITIAL_ROOMS,
  INITIAL_SETTINGS,
  INITIAL_INSPECTIONS,
  INITIAL_TASKS,
  INITIAL_SCHEDULES,
  INITIAL_NOTIFICATIONS,
} from '../data/initialDb.ts';

interface AppContextType {
  currentUser: UserProfile | null;
  setCurrentUser: (u: UserProfile | null) => void;
  login: (user: UserProfile, remember?: boolean) => void;
  logout: () => void;
  switchUserRole: (role: UserProfile['role']) => void;
  users: UserProfile[];

  rooms: Room[];
  inspections: InspectionRecord[];
  tasks: CorrectiveTask[];
  schedules: InspectionSchedule[];
  notifications: AppNotification[];
  settings: AppSettings;

  isLoading: boolean;
  apiConnected: boolean;
  hasGeminiKey: boolean;
  unreadNotifCount: number;

  refreshData: () => Promise<void>;
  addOrUpdateRoom: (room: Partial<Room>) => Promise<boolean>;
  saveInspection: (inspection: any) => Promise<InspectionRecord>;
  updateTask: (
    taskId: string,
    actionNotes?: string,
    afterPhotos?: string[],
    status?: any,
    extra?: { assignedTo?: string; deadline?: string; auditEntry?: any }
  ) => Promise<boolean>;
  verifyTask: (taskId: string, approved: boolean, rejectionReason?: string) => Promise<boolean>;
  addSchedule: (schedule: Partial<InspectionSchedule>) => Promise<boolean>;
  markNotificationRead: (id?: string, markAll?: boolean) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<boolean>;
  updateUsers: (newUsers: UserProfile[]) => Promise<boolean>;
  resetDemoData: () => Promise<void>;

  // Draft inspections
  saveInspectionDraft: (roomId: string, draft: any) => void;
  getInspectionDraft: (roomId: string) => any;
  clearInspectionDraft: (roomId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<UserProfile[]>(DEMO_USERS);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('5s_uneti_user');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return null;
  });

  const login = (user: UserProfile, remember = true) => {
    setCurrentUser(user);
    if (remember) {
      try {
        localStorage.setItem('5s_uneti_user', JSON.stringify(user));
      } catch {
        // ignore
      }
    }
  };

  const logout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('5s_uneti_user');
    } catch {
      // ignore
    }
  };

  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [inspections, setInspections] = useState<InspectionRecord[]>(INITIAL_INSPECTIONS);
  const [tasks, setTasks] = useState<CorrectiveTask[]>(INITIAL_TASKS);
  const [schedules, setSchedules] = useState<InspectionSchedule[]>(INITIAL_SCHEDULES);
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);

  const [isLoading, setIsLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState(false);

  // Check health and load backend data on mount
  const refreshData = async () => {
    setIsLoading(true);
    try {
      const healthRes = await fetch('/api/health');
      if (healthRes.ok) {
        const hData = await healthRes.json();
        setHasGeminiKey(Boolean(hData.hasGeminiKey));
        setApiConnected(true);
      }

      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          if (json.data.rooms) setRooms(json.data.rooms);
          if (json.data.inspections) setInspections(json.data.inspections);
          if (json.data.tasks) setTasks(json.data.tasks);
          if (json.data.schedules) setSchedules(json.data.schedules);
          if (json.data.notifications) setNotifications(json.data.notifications);
          if (json.data.settings) setSettings(json.data.settings);
          if (json.data.users) setUsers(json.data.users);
        }
      }
    } catch (err) {
      console.warn('Backend /api/data not reachable yet, using memory state:', err);
      setApiConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const switchUserRole = (role: UserProfile['role']) => {
    const found = users.find((u) => u.role === role) || DEMO_USERS.find((u) => u.role === role);
    if (found) {
      login(found, true);
    } else if (role === 'UNAPPROVED') {
      login(
        {
          id: 'new_guest',
          name: 'Người dùng mới',
          email: 'guest@uneti.edu.vn',
          role: 'UNAPPROVED',
          roleTitle: 'Chờ cấp quyền truy cập',
          department: 'Khoa Tài chính – Ngân hàng và Bảo hiểm',
        },
        true
      );
    }
  };

  const addOrUpdateRoom = async (roomData: Partial<Room>): Promise<boolean> => {
    try {
      const res = await fetch('/api/data/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomData),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.rooms) setRooms(data.rooms);
        return true;
      }
    } catch (err) {
      console.error('Failed to add/update room:', err);
    }
    // Fallback local update
    setRooms((prev) => {
      const idx = prev.findIndex((r) => r.id === roomData.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...roomData, updatedAt: new Date().toISOString() } as Room;
        return updated;
      }
      return [...prev, roomData as Room];
    });
    return true;
  };

  const saveInspection = async (inspectionData: any): Promise<InspectionRecord> => {
    const res = await fetch('/api/data/inspection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inspectionData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Lỗi khi lưu phiếu kiểm tra.');
    }

    const data = await res.json();
    await refreshData();
    // Clear draft if any
    if (inspectionData.roomId) {
      clearInspectionDraft(inspectionData.roomId);
    }
    return data.inspection;
  };

  const updateTask = async (
    taskId: string,
    actionNotes?: string,
    afterPhotos?: string[],
    status?: any,
    extra?: { assignedTo?: string; deadline?: string; auditEntry?: any }
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/data/task/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, actionNotes, afterPhotos, status, ...extra }),
      });
      if (res.ok) {
        await refreshData();
        return true;
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
    return false;
  };

  const verifyTask = async (taskId: string, approved: boolean, rejectionReason?: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/data/task/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId,
          approved,
          verifiedBy: currentUser ? currentUser.name : 'Ban kiểm tra 5S',
          rejectionReason,
        }),
      });
      if (res.ok) {
        await refreshData();
        return true;
      }
    } catch (err) {
      console.error('Failed to verify task:', err);
    }
    return false;
  };

  const addSchedule = async (scheduleData: Partial<InspectionSchedule>): Promise<boolean> => {
    try {
      const res = await fetch('/api/data/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData),
      });
      if (res.ok) {
        await refreshData();
        return true;
      }
    } catch (err) {
      console.error('Failed to save schedule:', err);
    }
    return false;
  };

  const markNotificationRead = async (id?: string, markAll = false) => {
    try {
      await fetch('/api/data/notification/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, markAll }),
      });
      await refreshData();
    } catch {
      setNotifications((prev) =>
        prev.map((n) => (markAll || n.id === id ? { ...n, isRead: true } : n))
      );
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>): Promise<boolean> => {
    try {
      const res = await fetch('/api/data/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (res.ok) {
        await refreshData();
        return true;
      }
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
    setSettings((prev) => ({ ...prev, ...newSettings }));
    return true;
  };

  const updateUsers = async (newUsers: UserProfile[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/data/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUsers),
      });
      if (res.ok) {
        setUsers(newUsers);
        if (currentUser) {
          const updatedCurrent = newUsers.find((u) => u.id === currentUser.id);
          if (updatedCurrent) setCurrentUser(updatedCurrent);
        }
        return true;
      }
    } catch (err) {
      console.error('Failed to update users:', err);
    }
    setUsers(newUsers);
    return true;
  };

  const resetDemoData = async () => {
    try {
      const res = await fetch('/api/data/reset-demo', { method: 'POST' });
      if (res.ok) {
        await refreshData();
      }
    } catch (err) {
      console.error('Failed to reset demo data:', err);
    }
  };

  // Draft handling in localStorage
  const saveInspectionDraft = (roomId: string, draft: any) => {
    try {
      localStorage.setItem(`5s_draft_${roomId}`, JSON.stringify(draft));
    } catch (e) {
      console.error('Failed to save draft in localStorage:', e);
    }
  };

  const getInspectionDraft = (roomId: string) => {
    try {
      const item = localStorage.getItem(`5s_draft_${roomId}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  };

  const clearInspectionDraft = (roomId: string) => {
    try {
      localStorage.removeItem(`5s_draft_${roomId}`);
    } catch (e) {
      console.error('Failed to clear draft:', e);
    }
  };

  const unreadNotifCount = notifications.filter((n) => !n.isRead).length;

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        login,
        logout,
        switchUserRole,
        users,
        rooms,
        inspections,
        tasks,
        schedules,
        notifications,
        settings,
        isLoading,
        apiConnected,
        hasGeminiKey,
        unreadNotifCount,
        refreshData,
        addOrUpdateRoom,
        saveInspection,
        updateTask,
        verifyTask,
        addSchedule,
        markNotificationRead,
        updateSettings,
        updateUsers,
        resetDemoData,
        saveInspectionDraft,
        getInspectionDraft,
        clearInspectionDraft,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
