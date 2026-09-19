import React, { useState, useEffect } from 'react';
import {
  ActiveNavTab,
  AccountDemandUnit,
  TelemetrySignal,
  AutomationPlaybook,
  DataConnector,
  OperationalTask,
} from './types';
import {
  MOCK_DEMAND_UNITS,
  MOCK_SIGNALS,
  MOCK_PLAYBOOKS,
  MOCK_CONNECTORS,
  MOCK_TASKS,
} from './data/mockData';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { AccountDrawer } from './components/AccountDrawer';
import { DemandOverviewView } from './views/DemandOverviewView';
import { DemandUnitScoringView } from './views/DemandUnitScoringView';
import { DemandFunnelView } from './views/DemandFunnelView';
import { CustomerJourneyView } from './views/CustomerJourneyView';
import { AccountMatrixView } from './views/AccountMatrixView';
import { BuyingCommitteesView } from './views/BuyingCommitteesView';
import { CommitteeCoverageInspectorView } from './views/CommitteeCoverageInspectorView';
import { PiOperationsCenterView } from './views/PiOperationsCenterView';
import { SignalsPlaybooksView } from './views/SignalsPlaybooksView';
import { ScoringRulesStudioView } from './views/ScoringRulesStudioView';
import { DataConnectorsView } from './views/DataConnectorsView';
import { TasksActivityView } from './views/TasksActivityView';
import { WorkspaceTerminalView } from './views/WorkspaceTerminalView';
import { LandingPageView } from './views/LandingPageView';
import { GeminiChatbotView } from './views/GeminiChatbotView';
import { playCadBlip, playCadConfirm, playCadClick } from './utils/audio';
import { PanelLeft } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('LANDING');
  const [accounts, setAccounts] = useState<AccountDemandUnit[]>(MOCK_DEMAND_UNITS);
  const [signals, setSignals] = useState<TelemetrySignal[]>(MOCK_SIGNALS);
  const [playbooks, setPlaybooks] = useState<AutomationPlaybook[]>(MOCK_PLAYBOOKS);
  const [connectors, setConnectors] = useState<DataConnector[]>(MOCK_CONNECTORS);
  const [tasks, setTasks] = useState<OperationalTask[]>(MOCK_TASKS);
  const [selectedAccount, setSelectedAccount] = useState<AccountDemandUnit | null>(null);
  const [isSimulating, setIsSimulating] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isSidebarHidden, setIsSidebarHidden] = useState(false);
  const [isSidebarCompact, setIsSidebarCompact] = useState(false);
  const [externalAiPrompt, setExternalAiPrompt] = useState<string | undefined>(undefined);

  const handleTriggerAiPrompt = (prompt: string) => {
    playCadConfirm();
    setExternalAiPrompt(prompt);
    setActiveTab('CHATBOT');
  };

  const handleToggleTheme = () => {
    playCadClick();
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleSidebar = () => {
    playCadClick();
    setIsSidebarHidden((prev) => !prev);
  };

  const handleToggleCompact = () => {
    playCadClick();
    setIsSidebarCompact((prev) => !prev);
  };

  // Live Telemetry Simulator Effect
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      // Pick a random account to slightly fluctuate scores or telemetry
      setAccounts((prevAccounts) => {
        const targetIdx = Math.floor(Math.random() * prevAccounts.length);
        const updated = [...prevAccounts];
        const acc = { ...updated[targetIdx] };

        // Fluctuate product telemetry slightly
        const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2
        acc.scores = {
          ...acc.scores,
          productTelemetry: Math.min(100, Math.max(20, acc.scores.productTelemetry + delta)),
        };
        acc.telemetry = {
          ...acc.telemetry,
          activeUsers7d: Math.max(5, acc.telemetry.activeUsers7d + (delta > 0 ? 1 : 0)),
        };

        // Recalculate composite
        acc.compositeScore = Math.round(
          acc.scores.productTelemetry * 0.3 +
          acc.scores.committeeMaturity * 0.25 +
          acc.scores.behavioralEngagement * 0.25 +
          acc.scores.intentSurge * 0.1 +
          acc.scores.firmographicFit * 0.1
        );

        updated[targetIdx] = acc;
        return updated;
      });

      // Subtle sound effect occasionally
      if (Math.random() > 0.6) {
        playCadBlip(1200, 0.03);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const handleToggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleAddTask = (taskData: Omit<OperationalTask, 'id' | 'createdAt'>) => {
    const newTask: OperationalTask = {
      ...taskData,
      id: `TSK-${Date.now().toString().slice(-4)}`,
      createdAt: 'Just now',
    };
    setTasks((prev) => [newTask, ...prev]);
  };

  const handleTriggerPlaybook = (playbookId: string, _accountName: string) => {
    playCadConfirm();
    setPlaybooks((prev) =>
      prev.map((p) =>
        p.id === playbookId
          ? {
              ...p,
              executionsCount: (p.executionsCount ?? p.executionCount ?? 0) + 1,
              executionCount: (p.executionCount ?? p.executionsCount ?? 0) + 1,
            }
          : p
      )
    );
  };

  // Filter accounts if search query exists
  const visibleAccounts = accounts.filter((a) => {
    if (!searchFilter) return true;
    return (
      a.accountName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      a.domain.toLowerCase().includes(searchFilter.toLowerCase()) ||
      a.solutionTarget.toLowerCase().includes(searchFilter.toLowerCase())
    );
  });

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'theme-light' : 'theme-dark'} bg-[#040811] text-slate-100 flex flex-col cad-grid-bg relative selection:bg-cyan-500/30 selection:text-cyan-200 transition-colors duration-200`}>
      {/* CAD Blueprint Precision Background Crosshairs & Corner Guides */}
      <div className="fixed top-2 left-2 text-[9px] font-mono text-cyan-500/30 pointer-events-none select-none z-50">
        + [X:000 Y:000]
      </div>
      <div className="fixed top-2 right-2 text-[9px] font-mono text-cyan-500/30 pointer-events-none select-none z-50">
        [X:1920 Y:000] +
      </div>
      <div className="fixed bottom-2 left-2 text-[9px] font-mono text-cyan-500/30 pointer-events-none select-none z-50">
        + [X:000 Y:1080]
      </div>
      <div className="fixed bottom-2 right-2 text-[9px] font-mono text-cyan-500/30 pointer-events-none select-none z-50">
        [X:1920 Y:1080] +
      </div>

      {/* Primary View Switching: Landing Page (Outside) vs. Workstation Console (Inside) */}
      {activeTab === 'LANDING' ? (
        <LandingPageView
          onNavigateTab={(tab) => setActiveTab(tab)}
          onSelectAccount={(acc) => setSelectedAccount(acc)}
          accounts={visibleAccounts}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
      ) : (
        <>
          {/* Main Top Header inside Workstation Console */}
          <Header
            activeTab={activeTab}
            isSimulating={isSimulating}
            onToggleSimulation={() => setIsSimulating(!isSimulating)}
            onSearchAccount={(query) => setSearchFilter(query)}
            activeAccountCount={accounts.length}
            theme={theme}
            onToggleTheme={handleToggleTheme}
            isSidebarHidden={isSidebarHidden}
            onToggleSidebar={handleToggleSidebar}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />

          {/* Workspace Area: Left-Hand Navigation Rail + Main Dashboard Content */}
          <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1880px] mx-auto min-h-0 relative">
            {/* Floating edge button to restore navigation when hidden */}
            {isSidebarHidden && (
              <button
                onClick={handleToggleSidebar}
                className="fixed left-0 top-24 z-30 flex items-center gap-1.5 px-2.5 py-2 rounded-r bg-[#091526] border-y border-r border-cyan-400/50 text-cyan-300 text-xs font-mono shadow-[0_0_12px_rgba(6,182,212,0.3)] hover:bg-cyan-950 transition-all cursor-pointer"
                title="Show Navigation Stations"
              >
                <PanelLeft className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span className="text-[10px] font-bold">SHOW STATIONS (13)</span>
              </button>
            )}

            {/* Primary Navigation Rail (Left Side, with Collapsible Sections & Hide option) */}
            {!isSidebarHidden && (
              <Navigation
                activeTab={activeTab}
                onSelectTab={(tab) => setActiveTab(tab)}
                urgentTaskCount={tasks.filter((t) => !t.completed && (t.priority === 'URGENT' || t.priority === 'URGENT_SURGE')).length}
                criticalSignalCount={signals.filter((s) => s.severity === 'CRITICAL').length}
                isCompact={isSidebarCompact}
                onToggleCompact={handleToggleCompact}
                onHideSidebar={() => setIsSidebarHidden(true)}
                theme={theme}
              />
            )}

            {/* Dynamic Content Body */}
            <main className="flex-1 p-4 sm:p-6 min-w-0 overflow-y-auto">
              {activeTab === 'OVERVIEW' && (
                <DemandOverviewView
                  accounts={visibleAccounts}
                  signals={signals}
                  tasks={tasks}
                  theme={theme}
                  onSelectAccount={(acc) => setSelectedAccount(acc)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                />
              )}

          {activeTab === 'DEMAND_UNITS' && (
            <DemandUnitScoringView
              accounts={visibleAccounts}
              theme={theme}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onTriggerAiPrompt={handleTriggerAiPrompt}
            />
          )}

          {activeTab === 'FUNNEL' && (
            <DemandFunnelView
              accounts={visibleAccounts}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
            />
          )}

          {activeTab === 'JOURNEY' && (
            <CustomerJourneyView
              accounts={visibleAccounts}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
            />
          )}

          {activeTab === 'ACCOUNTS' && (
            <AccountMatrixView
              accounts={visibleAccounts}
              theme={theme}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'COMMITTEES' && (
            <BuyingCommitteesView
              accounts={visibleAccounts}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
            />
          )}

          {activeTab === 'COVERAGE' && (
            <CommitteeCoverageInspectorView
              accounts={visibleAccounts}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
            />
          )}

          {activeTab === 'PI_OPS' && (
            <PiOperationsCenterView
              signals={signals}
              accounts={visibleAccounts}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
            />
          )}

          {activeTab === 'SIGNALS' && (
            <SignalsPlaybooksView
              playbooks={playbooks}
              accounts={visibleAccounts}
              onTriggerPlaybook={handleTriggerPlaybook}
            />
          )}

          {activeTab === 'RULES' && (
            <ScoringRulesStudioView accounts={visibleAccounts} />
          )}

          {activeTab === 'CONNECTORS' && (
            <DataConnectorsView connectors={connectors} />
          )}

          {activeTab === 'TASKS' && (
            <TasksActivityView
              tasks={tasks}
              accounts={visibleAccounts}
              onToggleTask={handleToggleTask}
              onAddTask={handleAddTask}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
            />
          )}

          {activeTab === 'TERMINAL' && (
            <WorkspaceTerminalView accounts={visibleAccounts} />
          )}

          {activeTab === 'CHATBOT' && (
            <GeminiChatbotView
              accounts={visibleAccounts}
              theme={theme}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
              externalPrompt={externalAiPrompt}
              onClearExternalPrompt={() => setExternalAiPrompt(undefined)}
            />
          )}
        </main>
      </div>

      {/* Slide-out CAD Account Inspector Drawer */}
      <AccountDrawer
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        playbooks={playbooks}
        onTriggerPlaybook={handleTriggerPlaybook}
      />

      {/* Engineering Blueprint Footer */}
      <footer className="border-t border-cyan-500/20 bg-[#060b13] px-4 py-2.5 text-[11px] font-mono text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-cyan-400 font-semibold">
              MARKETING OPERATIONS OS // SYS.01
            </span>
            <span className="text-slate-600">|</span>
            <span className="hidden sm:inline-block">CAD SPEC: 80x80 GRID</span>
            <span className="text-slate-600">|</span>
            <span className="text-emerald-400">PQL+SQL INTEGRITY: 99.98%</span>
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            <span>ENGINEERING BUILD: 2026.4.1</span>
            <span>•</span>
            <span>RESTRICTED INTERNAL ARCHITECTURE</span>
          </div>
        </div>
      </footer>
      </>
      )}
    </div>
  );
}

export default App;
