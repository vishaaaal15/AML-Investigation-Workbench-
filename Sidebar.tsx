import React from 'react';
import {
  LayoutDashboard,
  BellRing,
  FolderLock,
  Network,
  TestTube2,
  BookOpen,
  Briefcase
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'alerts'
  | 'cases'
  | 'workspace'
  | 'network'
  | 'evaluation'
  | 'methodology';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeCaseId: string | null;
  alertsCount?: number;
  openCasesCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  activeCaseId,
  alertsCount = 100,
  openCasesCount = 42
}) => {
  const navItems = [
    {
      id: 'overview' as NavTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null
    },
    {
      id: 'alerts' as NavTab,
      label: 'Alert Queue',
      icon: BellRing,
      badge: alertsCount
    },
    {
      id: 'cases' as NavTab,
      label: 'Cases',
      icon: FolderLock,
      badge: openCasesCount
    },
    {
      id: 'workspace' as NavTab,
      label: activeCaseId ? `Workspace (${activeCaseId})` : 'Case Workspace',
      icon: Briefcase,
      badge: activeCaseId ? 'Active' : null,
      badgeClass: 'bg-indigo-900 text-indigo-300'
    },
    {
      id: 'network' as NavTab,
      label: 'Transaction Network',
      icon: Network,
      badge: null
    },
    {
      id: 'evaluation' as NavTab,
      label: 'AI Evaluation & Ops',
      icon: TestTube2,
      badge: '11 Tests',
      badgeClass: 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
    },
    {
      id: 'methodology' as NavTab,
      label: 'Methodology & Docs',
      icon: BookOpen,
      badge: null
    }
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0 select-none">
      <div className="p-4 border-b border-slate-800/80">
        <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Investigation Core
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          Level 2 AML Forensics
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded text-xs font-medium transition ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/40 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-indigo-400' : 'text-slate-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge !== null && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    item.badgeClass || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/60 text-[11px] text-slate-500 space-y-1">
        <div className="flex items-center justify-between text-[10px]">
          <span>Analyst Mode</span>
          <span className="text-emerald-400 font-mono">AUTHORIZED</span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          Model: gemini-3.8-flash (server)
        </div>
      </div>
    </aside>
  );
};
