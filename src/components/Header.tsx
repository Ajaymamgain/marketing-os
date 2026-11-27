import React, { useState } from 'react';
import { PanelLeft, RefreshCw, Search } from 'lucide-react';
import { ActiveNavTab } from '../types';

interface HeaderProps {
  independentView?:boolean; activeTab: string; isSimulating: boolean; simulationAvailable?: boolean;
  onToggleSimulation: () => void; onRefresh: () => void;
  onSearchAccount: (query: string) => void; activeAccountCount: number;
  theme?: 'dark' | 'light'; onToggleTheme?: () => void;
  isSidebarHidden?: boolean; onToggleSidebar?: () => void;
  onNavigateTab?: (tab: ActiveNavTab) => void;
  isLoading?: boolean; lastUpdated?: string | null; integrationMode?: string;
}
const titles: Record<string, string> = { OVERVIEW: 'Overview', DEMAND_UNITS: 'Demand scoring', FUNNEL: 'Demand funnel', JOURNEY: 'Customer journey', ACCOUNTS: 'Account matrix', COMMITTEES: 'Buying committees', COVERAGE: 'Coverage', DECISION_OPS: 'Decision inbox', SIGNALS: 'Playbooks', RULES: 'Scoring studio', CONNECTORS: 'Connections', SEGMENTS:'Segments', INTELLIGENCE:'Account & ad intelligence', TASKS: 'Operational activity', AUTOMATION: 'Automation', TERMINAL: 'Workspace access', SIMULATOR: 'Data imports & replay', CONVERSIONS: 'Conversions' };
export const Header: React.FC<HeaderProps> = ({ independentView,activeTab, onRefresh, onSearchAccount, activeAccountCount, isSidebarHidden, onToggleSidebar, isLoading, lastUpdated, integrationMode }) => {
  const [query, setQuery] = useState('');
  return <header className="dm-header sticky top-0 z-40 border-b bg-white">
    <div className="flex items-center gap-3 px-4 sm:px-6 py-3">
      <button className="dm-icon-button" onClick={onToggleSidebar} aria-label={isSidebarHidden ? 'Show navigation' : 'Hide navigation'} aria-expanded={!isSidebarHidden}><PanelLeft size={19} /></button>
      <div className="min-w-0"><p className="text-sm font-semibold text-[#17243b]">Dual Motion <span className="hidden sm:inline text-[#a0a8b8] mx-2">/</span><span className="hidden sm:inline font-normal">{titles[activeTab]}</span></p><p className="text-xs text-[#5b687c]">{independentView ? (activeTab === 'INTELLIGENCE' ? 'Research workspace' : activeTab === 'CONVERSIONS' ? 'Marketing operations' : 'Workspace settings') : <>{activeAccountCount} demand units · {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Connecting to workspace'}</>}</p></div>
      <div className="ml-auto flex items-center gap-3">
        {integrationMode && <span className={`dm-badge hidden sm:inline-flex ${integrationMode === 'dry_run' ? 'dm-badge-amber' : ''}`}>{integrationMode === 'dry_run' ? 'Dry run' : integrationMode === 'local' ? 'Live execution' : integrationMode.replaceAll('_', ' ')}</span>}
        {!independentView && <label className="relative hidden lg:block"><span className="sr-only">Search demand units</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#657389]"/><input type="search" value={query} placeholder="Search demand units" onChange={(e) => { setQuery(e.target.value); onSearchAccount(e.target.value); }} className="dm-input dm-search-input w-64" /></label>}
        <button className="dm-icon-button" onClick={onRefresh} disabled={isLoading} aria-label="Refresh workspace" title="Refresh workspace"><RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} /></button>
      </div>
    </div>
    {!independentView && <label className="relative block lg:hidden mx-4 pb-3"><span className="sr-only">Search demand units</span><input type="search" value={query} placeholder="Search demand units" onChange={(e) => { setQuery(e.target.value); onSearchAccount(e.target.value); }} className="dm-input w-full"/></label>}
  </header>;
};
