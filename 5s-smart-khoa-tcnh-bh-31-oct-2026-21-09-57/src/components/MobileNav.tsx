import React from 'react';
import { Home, ClipboardCheck, Wrench, Bell, User } from 'lucide-react';
import { useApp } from '../context/AppContext.tsx';

interface MobileNavProps {
  currentTab: string;
  onNavigate: (tab: string) => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentTab, onNavigate }) => {
  const { unreadNotifCount, tasks } = useApp();

  const openTaskCount = tasks.filter((t) => t.status !== 'VERIFIED_DONE').length;

  const items = [
    { id: 'home', label: 'Trang chủ', icon: Home },
    { id: 'inspect', label: 'Kiểm tra', icon: ClipboardCheck },
    {
      id: 'tasks',
      label: 'Khắc phục',
      icon: Wrench,
      badge: openTaskCount > 0 ? openTaskCount : undefined,
    },
    {
      id: 'notifications',
      label: 'Thông báo',
      icon: Bell,
      badge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
    },
    { id: 'account', label: 'Tài khoản', icon: User },
  ];

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg px-2 py-1 safe-area-pb">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors relative cursor-pointer ${
                isActive
                  ? 'text-blue-700 font-bold bg-blue-50/80'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.75]'}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 bg-red-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight truncate max-w-full">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
