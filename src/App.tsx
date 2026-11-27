import React, { useState, useEffect, lazy, Suspense } from 'react';
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
  MOCK_CONNECTORS,
  MOCK_TASKS,
} from './data/mockData';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { AccountDrawer } from './components/AccountDrawer';
import { WorkspaceErrorBoundary } from './components/WorkspaceErrorBoundary';
const DemandOverviewView = lazy(() => import('./views/DemandOverviewView').then((module) => ({ default: module.DemandOverviewView })));
const DemandUnitScoringView = lazy(() => import('./views/DemandUnitScoringView').then((module) => ({ default: module.DemandUnitScoringView })));
const DemandFunnelView = lazy(() => import('./views/DemandFunnelView').then((module) => ({ default: module.DemandFunnelView })));
const CustomerJourneyView = lazy(() => import('./views/CustomerJourneyView').then((module) => ({ default: module.CustomerJourneyView })));
const AccountMatrixView = lazy(() => import('./views/AccountMatrixView').then((module) => ({ default: module.AccountMatrixView })));
const BuyingCommitteesView = lazy(() => import('./views/BuyingCommitteesView').then((module) => ({ default: module.BuyingCommitteesView })));
const CommitteeCoverageInspectorView = lazy(() => import('./views/CommitteeCoverageInspectorView').then((module) => ({ default: module.CommitteeCoverageInspectorView })));
const DecisionOperationsView = lazy(() => import('./views/DecisionOperationsView').then((module) => ({ default: module.DecisionOperationsView })));
const AudiencePlaybookView = lazy(() => import('./views/AudiencePlaybookView').then((module) => ({ default: module.AudiencePlaybookView })));
const ScoringRulesStudioView = lazy(() => import('./views/ScoringRulesStudioView').then((module) => ({ default: module.ScoringRulesStudioView })));
const DataConnectorsView = lazy(() => import('./views/DataConnectorsView').then((module) => ({ default: module.DataConnectorsView })));
const TasksActivityView = lazy(() => import('./views/TasksActivityView').then((module) => ({ default: module.TasksActivityView })));
const WorkspaceTerminalView = lazy(() => import('./views/WorkspaceTerminalView').then((module) => ({ default: module.WorkspaceTerminalView })));
const LandingPageView = lazy(() => import('./views/LandingPageView').then((module) => ({ default: module.LandingPageView })));
const JevAutomationView = lazy(() => import('./views/JevAutomationView').then((module) => ({ default: module.JevAutomationView })));
const SignalSimulatorView = lazy(() => import('./views/SignalSimulatorView').then((module) => ({ default: module.SignalSimulatorView })));
import { playCadBlip, playCadConfirm, playCadClick } from './utils/audio';
import { PanelLeft } from 'lucide-react';
import {
  fetchDemandUnits,
  fetchScoringPolicy,
  fetchTasks,
  fetchJevAutomationStatus,
  JevAutomationStatus,
  fetchConnectors,
  fetchSignals,
  fetchPlaybooks,
  DEMO_DATA_ENABLED,
} from './services/api';

const AccountSegmentsView = lazy(() => import('./views/AccountSegmentsView').then(module => ({default:module.AccountSegmentsView})));

const ConversionWorkspaceView = lazy(() => import('./views/ConversionWorkspaceView').then(m => ({default: m.ConversionWorkspaceView})));
const CompanyIntelligenceView = lazy(() => import('./views/CompanyIntelligenceView').then(m=>({default:m.CompanyIntelligenceView})));

const hashToTab: Record<string, ActiveNavTab> = {
  '': 'LANDING',
  'landing': 'LANDING',
  'overview': 'OVERVIEW',
  'waterfall': 'OVERVIEW',
  'demand-units': 'DEMAND_UNITS',
  'funnel': 'FUNNEL',
  'journey': 'JOURNEY',
  'matrix': 'ACCOUNTS',
  'accounts': 'ACCOUNTS',
  'committees': 'COMMITTEES',
  'committee': 'COMMITTEES',
  'coverage': 'COVERAGE',
  'pi': 'DECISION_OPS',
  'decisions': 'DECISION_OPS',
  'decision-inbox': 'DECISION_OPS',
  'copilot': 'DECISION_OPS',
  'jev-automation': 'AUTOMATION',
  'automation': 'AUTOMATION',
  'pi-ops': 'DECISION_OPS',
  'signals': 'SIGNALS',
  'simulator': 'SIMULATOR',
  'conversions': 'CONVERSIONS',
  'playbooks': 'SIGNALS',
  'rules': 'RULES',
  'connectors': 'CONNECTORS',
  'segments': 'SEGMENTS',
  'intelligence':'INTELLIGENCE',
  'enrichment':'INTELLIGENCE',
  'tasks': 'TASKS',
  'terminal': 'TERMINAL',
};

export function App() {
  const mainRef = React.useRef<HTMLElement>(null);
  const [activeTab, setActiveTabState] = useState<ActiveNavTab>(() => hashToTab[window.location.hash.replace(/^#/, '').toLowerCase()] || 'LANDING');
  const setActiveTab = (tab: ActiveNavTab) => {
    const routes: Record<ActiveNavTab, string> = {LANDING:'landing', OVERVIEW:'overview', DEMAND_UNITS:'demand-units', FUNNEL:'funnel', JOURNEY:'journey', ACCOUNTS:'matrix', COMMITTEES:'committees', COVERAGE:'coverage', DECISION_OPS:'decisions', SIGNALS:'playbooks', SIMULATOR:'simulator', CONVERSIONS:'conversions', RULES:'rules', CONNECTORS:'connectors', SEGMENTS:'segments', INTELLIGENCE:'intelligence', TASKS:'tasks', TERMINAL:'terminal', AUTOMATION:'automation'};
    setActiveTabState(tab);
    if (window.location.hash !== `#${routes[tab]}`) window.location.hash = routes[tab];
  };
  const [accounts, setAccounts] = useState<AccountDemandUnit[]>(DEMO_DATA_ENABLED ? MOCK_DEMAND_UNITS : []);
  const [signals, setSignals] = useState<TelemetrySignal[]>(DEMO_DATA_ENABLED ? MOCK_SIGNALS : []);
  const [playbooks, setPlaybooks] = useState<AutomationPlaybook[]>([]);
  const [connectors, setConnectors] = useState<DataConnector[]>(DEMO_DATA_ENABLED ? MOCK_CONNECTORS : []);
  const [tasks, setTasks] = useState<OperationalTask[]>(DEMO_DATA_ENABLED ? MOCK_TASKS : []);
  const [selectedAccount, setSelectedAccount] = useState<AccountDemandUnit | null>(null);
  const [isSimulating, setIsSimulating] = useState(DEMO_DATA_ENABLED);
  const [searchFilter, setSearchFilter] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isSidebarHidden, setIsSidebarHidden] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [isSidebarCompact, setIsSidebarCompact] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [scoreFormula, setScoreFormula] = useState('fit × 0.35 + intent × 0.40 + coverage × 0.25');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<JevAutomationStatus | null>(null);

  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [activeTab]);

  // Research-view parameters belong to Intelligence, not to the demand dashboard.
  useEffect(() => {
    if (activeTab === 'INTELLIGENCE') return;
    const url = new URL(window.location.href);
    if (url.searchParams.has('intelligence_view')) {
      url.searchParams.delete('intelligence_view');
      window.history.replaceState(window.history.state, '', url);
    }
  }, [activeTab]);

  // URL Hash Sync for deep linking between views
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '').toLowerCase();

      if (hash in hashToTab) {
        setActiveTabState(hashToTab[hash]);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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

  const independentView = ['CONNECTORS','SEGMENTS','AUTOMATION','INTELLIGENCE','CONVERSIONS'].includes(activeTab);

  // Load live data from Dual Motion backend on mount
  useEffect(() => {
    if (independentView) { setIsLoading(false); return; }
    let isMounted = true;
    async function loadBackendData() {
      setIsLoading(true);
      try {
        const [liveUnits, liveTasks, liveConnectors, liveSignals, livePlaybooks, policy] = await Promise.all([
          fetchDemandUnits(),
          fetchTasks(),
          fetchConnectors(),
          fetchSignals(),
          fetchPlaybooks(),
          fetchScoringPolicy(),
        ]);
        if (!isMounted) return;
        if (policy?.formula) setScoreFormula(policy.formula.replaceAll('×', ' × ').replaceAll('  ', ' '));
        setAccounts(liveUnits);
        setTasks(liveTasks);
        setConnectors(liveConnectors);
        setSignals(liveSignals);
        setPlaybooks(livePlaybooks);
        setSelectedAccount((current) => current ? liveUnits.find((unit) => unit.id === current.id) || null : null);
        setLastUpdated(new Date().toISOString());
        setLoadError('');
        const status = await fetchJevAutomationStatus();
        if (isMounted) setRuntime(status);
      } catch (err) {
        if (isMounted) setLoadError(err instanceof Error ? err.message : 'Workspace data is unavailable.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadBackendData();
    const refresh = window.setInterval(() => { if (document.visibilityState === 'visible') loadBackendData(); }, 60_000);
    return () => {
      window.clearInterval(refresh);
      isMounted = false;
    };
  }, [refreshNonce,independentView]);

  // Live Telemetry Simulator Effect
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      // Pick a random account to slightly fluctuate scores or telemetry
      setAccounts((prevAccounts) => {
        if (!prevAccounts.length) return prevAccounts;
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

        // Enforce Dual Motion invariant: composite = fit*0.35 + intent*0.40 + coverage*0.25
        acc.compositeScore = Math.round(
          (acc.scores.firmographicFit ?? 85) * 0.35 +
          (acc.scores.intentSurge ?? 80) * 0.40 +
          (acc.committee.coverageScore ?? 0) * 0.25
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

  const handleTriggerPlaybook = (_playbookId: string, _accountName: string) => {
    playCadConfirm();
    if (selectedAccount) sessionStorage.setItem('dm-playbook-demand-unit', selectedAccount.id);
    setSelectedAccount(null);
    window.location.hash = 'playbooks';
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

  const inWorkspace = activeTab !== 'LANDING';

  return (
    <div className={activeTab === 'LANDING'
      ? 'min-h-screen bg-white text-[#1c1917] flex flex-col selection:bg-[#fe551b]/20 selection:text-[#fe551b]'
      : 'hex-app theme-light flex min-h-[100dvh] flex-col bg-[#f6f7f9] text-[#1c1f26]'}>
<a href="#main-content" className="dm-skip-link" onClick={(event) => { event.preventDefault(); document.getElementById('main-content')?.focus(); }}>Skip to main content</a>
      {/* Primary View Switching: Landing Page (Outside) vs. Workstation Console (Inside) */}
      {activeTab === 'LANDING' ? (
        <Suspense fallback={<div className="dm-empty" role="status">Loading product website…</div>}>
        <LandingPageView
          onNavigateTab={(tab) => setActiveTab(tab)}
          onSelectAccount={(acc) => setSelectedAccount(acc)}
          accounts={visibleAccounts}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
        </Suspense>
      ) : (
        <>
          {/* Main Top Header inside Workstation Console */}
          <Header
            activeTab={activeTab}
            independentView={independentView}
            isLoading={isLoading}
            lastUpdated={lastUpdated}
            integrationMode={runtime?.execution_policy.integration_mode}
            isSimulating={isSimulating}
            simulationAvailable={DEMO_DATA_ENABLED}
            onToggleSimulation={() => setIsSimulating(!isSimulating)}
            onRefresh={() => setRefreshNonce((current) => current + 1)}
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
                type="button"
                onClick={handleToggleSidebar}
                className="fixed left-0 top-20 z-30 hidden md:flex items-center gap-1.5 rounded-r-md border border-l-0 border-[#e6e8ee] bg-white px-2.5 py-2 text-[12px] text-[#1c1f26] hover:bg-[#f6f7f9]"
              >
                <PanelLeft className="h-4 w-4" />
                Show nav
              </button>
            )}

            {/* Primary Navigation Rail (Left Side, with Collapsible Sections & Hide option) */}
            {!isSidebarHidden && (
              <Navigation
                activeTab={activeTab}
                onSelectTab={(tab) => { setActiveTab(tab); if (window.matchMedia('(max-width: 767px)').matches) setIsSidebarHidden(true); }}
                urgentTaskCount={tasks.filter((t) => !t.completed && !t.archived && (t.priority === 'URGENT' || t.priority === 'URGENT_SURGE')).length}
                criticalSignalCount={signals.filter((s) => s.severity === 'CRITICAL').length}
                isCompact={isSidebarCompact}
                onToggleCompact={handleToggleCompact}
                onHideSidebar={() => setIsSidebarHidden(true)}
                theme={theme}
              />
            )}

            {/* Dynamic Content Body */}
            <main ref={mainRef} tabIndex={-1} id="main-content" className={`min-w-0 flex-1 overflow-y-auto ${activeTab === 'CONVERSIONS' ? '' : 'px-4 py-6 sm:px-8'}`}>
              <WorkspaceErrorBoundary key={activeTab}>
              <Suspense fallback={<div className="dm-notice" role="status">Loading workspace view…</div>}>
              {loadError && !independentView && <div role="alert" className="dm-notice dm-notice-error mb-6 flex flex-wrap items-center justify-between gap-3"><div><strong>Workspace data could not refresh</strong><p>{loadError} {lastUpdated ? 'The last successful snapshot is still displayed.' : ''}</p></div><div className="flex gap-2"><button className="dm-button" onClick={() => setRefreshNonce((current) => current + 1)}>Retry</button><button className="dm-button" onClick={() => setActiveTab('TERMINAL')}>Sign in</button></div></div>}
              {isLoading && !independentView && !lastUpdated && <div role="status" className="dm-notice mb-6">Loading your workspace…</div>}
              {activeTab === 'OVERVIEW' && (
                <DemandOverviewView
                  accounts={visibleAccounts}
                  signals={signals}
                  tasks={tasks}
                  theme={theme}
                  onSelectAccount={(acc) => setSelectedAccount(acc)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  scoreFormula={scoreFormula}
                  runtime={runtime}
                />
              )}

          {activeTab === 'DEMAND_UNITS' && (
            <DemandUnitScoringView
              accounts={visibleAccounts}
              theme={theme}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
              onApplied={() => setRefreshNonce((value) => value + 1)}
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
              loading={isLoading && !lastUpdated}
              theme={theme}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'COMMITTEES' && (
            <BuyingCommitteesView
              accounts={visibleAccounts}
              onSelectAccount={(acc) => setSelectedAccount(acc)}

              onApplied={() => setRefreshNonce((value) => value + 1)}
            />
          )}

          {activeTab === 'COVERAGE' && (
            <CommitteeCoverageInspectorView
              accounts={visibleAccounts}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
            />
          )}

          {activeTab === 'DECISION_OPS' && (
            <DecisionOperationsView
              signals={signals}
              accounts={visibleAccounts}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
            />
          )}

          {activeTab === 'SIGNALS' && (
            <AudiencePlaybookView accounts={visibleAccounts} loading={isLoading} />
          )}

          {activeTab === 'SIMULATOR' && (
            <>
              <div className="mb-4 flex justify-end"><a className="dm-button" href="#conversions">Open conversion simulator</a></div>
              <SignalSimulatorView theme={theme} />
            </>
          )}
          {activeTab === 'CONVERSIONS' && <ConversionWorkspaceView refreshKey={refreshNonce} />}


          {activeTab === 'RULES' && (
            <ScoringRulesStudioView accounts={visibleAccounts} onApplied={() => setRefreshNonce((value) => value + 1)} />
          )}

          {activeTab === 'SEGMENTS' && <AccountSegmentsView key={refreshNonce} />}
          {activeTab === 'INTELLIGENCE' && <CompanyIntelligenceView key={refreshNonce} />}
          {activeTab === 'CONNECTORS' && (
            <DataConnectorsView key={refreshNonce} connectors={connectors} />
          )}

          {activeTab === 'TASKS' && (
            <TasksActivityView
              tasks={tasks}
              accounts={visibleAccounts}
              onSelectAccount={(acc) => setSelectedAccount(acc)}
            />
          )}

          {activeTab === 'TERMINAL' && (
            <WorkspaceTerminalView accounts={visibleAccounts} />
          )}

          {activeTab === 'AUTOMATION' && (
            <JevAutomationView theme={theme} />
          )}
              </Suspense>
              </WorkspaceErrorBoundary>
        </main>
      </div>

      {/* Slide-out CAD Account Inspector Drawer */}
      <AccountDrawer
        account={selectedAccount}
        onClose={() => setSelectedAccount(null)}
        playbooks={playbooks}
        onTriggerPlaybook={handleTriggerPlaybook}
      />

      </>
      )}
    </div>
  );
}

export default App;
