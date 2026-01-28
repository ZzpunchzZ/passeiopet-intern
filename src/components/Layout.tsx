import type { ReactNode } from 'react';
import { Users, MessageSquare, Calendar, DollarSign } from 'lucide-react';

type TabType = 'schedule' | 'clients' | 'finance' | 'messages';

interface LayoutProps {
  children: ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const NAV_ITEMS: { id: TabType; label: string; icon: typeof Calendar }[] = [
  { id: 'schedule', label: 'Agenda', icon: Calendar },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'finance', label: 'Financeiro', icon: DollarSign },
  { id: 'messages', label: 'Mensagens', icon: MessageSquare },
];

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Main content area */}
      <div className="flex-1 overflow-auto">{children}</div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 safe-area-bottom">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${
                  isActive
                    ? 'text-emerald-600'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Icon
                  className={`w-6 h-6 transition-transform ${
                    isActive ? 'scale-110' : ''
                  }`}
                />
                <span
                  className={`text-xs font-medium ${
                    isActive ? 'text-emerald-600' : 'text-gray-500'
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 bg-emerald-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export type { TabType };
