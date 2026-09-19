import React, { useState } from 'react';
import {
  LayoutDashboard,
  Cpu,
  Filter,
  Milestone,
  Grid,
  Users,
  Eye,
  Radio,
  Zap,
  Sliders,
  Network,
  CheckSquare,
  Terminal,
  ChevronDown,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
  Minimize2,
  Maximize2,
  Globe,
  Bot,
  Sparkles,
} from 'lucide-react';
import { ActiveNavTab } from '../types';
import { playCadClick } from '../utils/audio';

interface NavigationProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  urgentTaskCount: number;
  criticalSignalCount: number;
  isCompact?: boolean;
  onToggleCompact?: () => void;
  onHideSidebar?: () => void;
  theme?: 'dark' | 'light';
}

interface NavItem {
  id: ActiveNavTab;
  code: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: string;
}

interface NavSection {
  id: string;
  title: string;
  shortTitle: string;
  items: NavItem[];
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  urgentTaskCount,
  criticalSignalCount,
  isCompact = false,
  onToggleCompact,
  onHideSidebar,
  theme = 'dark',
}) => {
  const sections: NavSection[] = [
    {
      id: 'showcase',
      title: 'PUBLIC SPEC & OVERVIEW',
      shortTitle: 'OUTSIDE',
      items: [
        { id: 'LANDING', code: '00', label: 'Exit to Landing Page (Outside)', icon: Globe },
      ],
    },
    {
      id: 'demand_intel',
      title: 'DEMAND INTELLIGENCE & SCORING',
      shortTitle: 'DEMAND INTEL',
      items: [
        { id: 'OVERVIEW', code: '01', label: 'Demand Overview', icon: LayoutDashboard },
        { id: 'DEMAND_UNITS', code: '02', label: 'Demand Unit Scoring', icon: Cpu },
        { id: 'FUNNEL', code: '03', label: 'Demand Funnel', icon: Filter },
        { id: 'JOURNEY', code: '04', label: 'Customer Journey', icon: Milestone },
      ],
    },
    {
      id: 'account_topology',
      title: 'ACCOUNT & COMMITTEE TOPOLOGY',
      shortTitle: 'ACCOUNTS & CMTE',
      items: [
        { id: 'ACCOUNTS', code: '05', label: 'Account Matrix (2x2)', icon: Grid },
        { id: 'COMMITTEES', code: '06', label: 'Buying Committees', icon: Users },
        { id: 'COVERAGE', code: '07', label: 'Coverage Inspector', icon: Eye },
      ],
    },
    {
      id: 'marketing_ops',
      title: 'MARKETING OPS & PLAYBOOKS',
      shortTitle: 'MKTG OPS',
      items: [
        {
          id: 'PI_OPS',
          code: '08',
          label: 'PI Operations Center',
          icon: Radio,
          badge: criticalSignalCount,
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        },
        { id: 'SIGNALS', code: '09', label: 'Signals & Playbooks', icon: Zap },
        { id: 'RULES', code: '10', label: 'Scoring Rules Studio', icon: Sliders },
      ],
    },
    {
      id: 'platform_infra',
      title: 'PLATFORM & ORCHESTRATION',
      shortTitle: 'PLATFORM',
      items: [
        { id: 'CONNECTORS', code: '11', label: 'Telemetry Mesh', icon: Network },
        {
          id: 'TASKS',
          code: '12',
          label: 'Tasks & Activity',
          icon: CheckSquare,
          badge: urgentTaskCount,
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        },
        {
          id: 'CHATBOT',
          code: '13',
          label: 'AI Copilot & Functions',
          icon: Bot,
          badge: 'AI',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]',
        },
        { id: 'TERMINAL', code: '14', label: 'Workspace Sign-In', icon: Terminal },
      ],
    },
  ];

  // Accordion state for collapsible sections
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    demand_intel: false,
    account_topology: false,
    marketing_ops: false,
    platform_infra: false,
  });

  const toggleSection = (sectionId: string) => {
    playCadClick();
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const toggleAllSections = () => {
    playCadClick();
    const allCollapsed = Object.values(collapsedSections).every(Boolean);
    const nextState = !allCollapsed;
    setCollapsedSections({
      demand_intel: nextState,
      account_topology: nextState,
      marketing_ops: nextState,
      platform_infra: nextState,
    });
  };

  const isAllCollapsed = Object.values(collapsedSections).every(Boolean);

  if (isCompact) {
    return (
      <nav className={`w-16 border-b md:border-b-0 md:border-r ${theme === 'light' ? 'border-slate-300 bg-white shadow-xs' : 'border-cyan-500/20 bg-[#060c18]'} shrink-0 flex flex-col items-center py-2.5 md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:overflow-y-auto z-30 transition-all duration-200`}>
        {/* Expand / Uncompact buttons */}
        <div className={`flex flex-col items-center gap-1.5 pb-2 border-b ${theme === 'light' ? 'border-slate-200' : 'border-cyan-500/20'} w-full px-2`}>
          {onToggleCompact && (
            <button
              onClick={() => {
                playCadClick();
                onToggleCompact();
              }}
              className={`p-1.5 rounded transition-colors ${theme === 'light' ? 'text-slate-700 hover:text-sky-800 hover:bg-slate-100' : 'text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40'}`}
              title="Expand Sidebar"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          {onHideSidebar && (
            <button
              onClick={() => {
                playCadClick();
                onHideSidebar();
              }}
              className={`p-1.5 rounded transition-colors ${theme === 'light' ? 'text-slate-600 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30'}`}
              title="Hide Navigation"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Compact Icons */}
        <div className="flex flex-col items-center space-y-1.5 w-full pt-3">
          {sections.flatMap((s) => s.items).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  playCadClick();
                  onSelectTab(item.id);
                }}
                className={`group relative p-2.5 rounded text-xs transition-all cursor-pointer ${
                  isActive
                    ? theme === 'light'
                      ? 'bg-sky-100 border border-sky-600 text-sky-900 shadow-xs'
                      : 'bg-cyan-950/80 border border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                    : theme === 'light'
                      ? 'text-slate-700 hover:text-sky-900 hover:bg-slate-100 border border-transparent'
                      : 'text-slate-400 hover:text-cyan-200 hover:bg-[#0a1628] border border-transparent'
                }`}
                title={`${item.code} ${item.label}`}
              >
                <Icon className="w-4 h-4" />
                {Boolean(item.badge) && (
                  <span className={`absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ${theme === 'light' ? 'ring-white' : 'ring-[#060c18]'}`} />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  return (
    <nav className={`w-full md:w-64 xl:w-72 border-b md:border-b-0 md:border-r ${theme === 'light' ? 'border-slate-300 bg-white shadow-xs' : 'border-cyan-500/20 bg-[#060c18]'} shrink-0 flex flex-col p-2.5 md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:overflow-y-auto z-30 transition-all duration-200`}>
      {/* Left Rail System Header */}
      <div className={`flex items-center justify-between px-2 py-2 mb-2 border-b ${theme === 'light' ? 'border-slate-200 text-slate-900' : 'border-cyan-500/20 text-cyan-300'} text-[10px] font-mono`}>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${theme === 'light' ? 'bg-sky-600' : 'bg-cyan-400 animate-pulse'}`} />
          <span className={`font-bold tracking-wider ${theme === 'light' ? 'text-slate-900' : 'text-cyan-300'}`}>SYSTEM STATIONS</span>
        </div>

        {/* Sidebar Controls: Collapse all sections & Hide rail */}
        <div className="flex items-center gap-1">
          <button
            onClick={toggleAllSections}
            className={`text-[9px] px-2 py-0.5 rounded font-mono font-bold transition-colors cursor-pointer ${
              theme === 'light'
                ? 'bg-slate-100 border border-slate-300 text-slate-800 hover:text-sky-800 hover:border-sky-400 hover:bg-slate-200'
                : 'bg-[#091526] border border-cyan-500/20 text-slate-300 hover:text-cyan-300 hover:border-cyan-400/40'
            }`}
            title={isAllCollapsed ? 'Expand all sections' : 'Collapse all sections'}
          >
            {isAllCollapsed ? 'EXPAND' : 'COLLAPSE'}
          </button>

          {onToggleCompact && (
            <button
              onClick={() => {
                playCadClick();
                onToggleCompact();
              }}
              className={`p-1 rounded transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'bg-slate-100 border border-slate-300 text-slate-700 hover:text-sky-800 hover:bg-slate-200'
                  : 'bg-[#091526] border border-cyan-500/20 text-slate-400 hover:text-cyan-300'
              }`}
              title="Compact icon-only view"
            >
              <Minimize2 className="w-3 h-3" />
            </button>
          )}

          {onHideSidebar && (
            <button
              onClick={() => {
                playCadClick();
                onHideSidebar();
              }}
              className={`p-1 rounded transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'bg-slate-100 border border-slate-300 text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                  : 'bg-[#091526] border border-cyan-500/20 text-slate-400 hover:text-rose-400 hover:border-rose-500/40'
              }`}
              title="Hide Navigation Sidebar"
            >
              <PanelLeftClose className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Collapsible Sections List */}
      <div className="flex flex-col space-y-3 w-full">
        {sections.map((section) => {
          const isCollapsed = !!collapsedSections[section.id];
          const hasActiveItem = section.items.some((item) => item.id === activeTab);

          return (
            <div
              key={section.id}
              className={`rounded border transition-colors ${
                hasActiveItem
                  ? theme === 'light'
                    ? 'border-sky-300 bg-sky-50/70 shadow-xs'
                    : 'border-cyan-500/30 bg-cyan-950/20'
                  : theme === 'light'
                    ? 'border-slate-200 bg-slate-50/50'
                    : 'border-cyan-500/10 bg-[#070e1b]/40'
              }`}
            >
              {/* Section Accordion Trigger */}
              <button
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between px-2.5 py-2 text-[10px] font-mono tracking-wider font-bold transition-colors select-none rounded cursor-pointer ${
                  theme === 'light'
                    ? 'text-slate-900 hover:text-sky-800 hover:bg-slate-100/80'
                    : 'text-slate-200 hover:text-cyan-300 hover:bg-[#091526]/50'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {isCollapsed ? (
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${theme === 'light' ? 'text-sky-700' : 'text-cyan-400'}`} />
                  ) : (
                    <ChevronDown className={`w-3.5 h-3.5 shrink-0 ${theme === 'light' ? 'text-sky-700' : 'text-cyan-400'}`} />
                  )}
                  <span className={`truncate text-left font-bold ${theme === 'light' ? 'text-slate-900' : 'text-slate-200'}`}>
                    {section.title}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-1">
                  {hasActiveItem && (
                    <span className={`w-1.5 h-1.5 rounded-full ${theme === 'light' ? 'bg-sky-600 animate-pulse' : 'bg-cyan-400 animate-pulse'}`} />
                  )}
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold ${
                    theme === 'light'
                      ? 'bg-slate-200 text-slate-800 border border-slate-300'
                      : 'bg-slate-900/80 border border-slate-700/60 text-slate-300'
                  }`}>
                    {section.items.length}
                  </span>
                </div>
              </button>

              {/* Section Items */}
              {!isCollapsed && (
                <div className="px-1.5 pb-1.5 pt-0.5 space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          playCadClick();
                          onSelectTab(item.id);
                        }}
                        className={`group relative flex items-center justify-between w-full px-2.5 py-2 rounded text-xs font-mono transition-all cursor-pointer select-none ${
                          isActive
                            ? theme === 'light'
                              ? 'bg-sky-100/90 border border-sky-600 text-sky-950 font-bold shadow-xs'
                              : 'bg-cyan-950/90 border border-cyan-400 text-cyan-100 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-semibold'
                            : theme === 'light'
                              ? 'text-slate-800 hover:text-sky-950 hover:bg-slate-100 border border-transparent font-medium'
                              : 'text-slate-300 hover:text-cyan-200 hover:bg-[#0a1628] border border-transparent'
                        }`}
                      >
                        {/* Corner brackets when active */}
                        {isActive && (
                          <>
                            <span className={`absolute -top-0.5 -left-0.5 w-1.5 h-1.5 border-t-2 border-l-2 ${theme === 'light' ? 'border-sky-700' : 'border-cyan-300'}`} />
                            <span className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 border-b-2 border-r-2 ${theme === 'light' ? 'border-sky-700' : 'border-cyan-300'}`} />
                          </>
                        )}

                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                              isActive
                                ? theme === 'light'
                                  ? 'bg-sky-700 text-white border border-sky-800'
                                  : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                                : theme === 'light'
                                  ? 'bg-slate-200 border border-slate-300 text-slate-800 group-hover:text-sky-900 group-hover:border-sky-400'
                                  : 'bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30'
                            }`}
                          >
                            {item.code}
                          </span>

                          <Icon
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isActive
                                ? theme === 'light'
                                  ? 'text-sky-800'
                                  : 'text-cyan-300'
                                : theme === 'light'
                                  ? 'text-slate-700 group-hover:text-sky-800'
                                  : 'text-slate-400 group-hover:text-cyan-300'
                            }`}
                          />

                          <span className={`truncate text-left text-[11px] ${
                            isActive
                              ? theme === 'light' ? 'text-sky-950 font-bold' : 'text-cyan-100 font-bold'
                              : theme === 'light' ? 'text-slate-900 font-medium' : 'text-slate-300 font-normal'
                          }`}>
                            {item.label}
                          </span>
                        </div>

                        {Boolean(item.badge) && (
                          <span
                            className={`ml-1.5 px-1.5 py-0.5 text-[9px] rounded border font-mono font-bold shrink-0 ${
                              item.badgeColor || (theme === 'light' ? 'bg-sky-200 text-sky-900 border-sky-400' : 'bg-cyan-950 text-cyan-300 border-cyan-400/40')
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer System Diagnostics */}
      <div className={`mt-auto pt-3 px-2 border-t ${theme === 'light' ? 'border-slate-200 text-slate-700' : 'border-cyan-500/10 text-slate-500'} text-[10px] font-mono hidden md:block`}>
        <div className="flex items-center justify-between text-[9px] font-bold">
          <span>MKTG OPS // SYS.01</span>
          <span className={theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}>ONLINE</span>
        </div>
      </div>
    </nav>
  );
};
