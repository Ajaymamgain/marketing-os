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
import { WorkspaceSubNav } from './components/WorkspaceSubNav';
import { AccountDrawer } from './components/AccountDrawer';
import { WorkspaceErrorBoundary } from './components/WorkspaceErrorBoundary';
import {
  HASH_TO_TAB,
  TAB_TO_HASH,
  INDEPENDENT_TABS,
  getWorkspaceSection,
} from './config/workspaceNav';
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

const DemandOverviewView = lazy(() =>
  import('./views/DemandOverviewView').then((m) => ({ default: m.DemandOverviewView }))
);
const DemandUnitScoringView = lazy(() =>
  import('./views/DemandUnitScoringView').then((m) => ({ default: m.DemandUnitScoringView }))
);
const DemandFunnelView = lazy(() =>
  import('./views/DemandFunnelView').then((m) => ({ default: m.DemandFunnelView }))
);
const CustomerJourneyView = lazy(() =>
  import('./views/CustomerJourneyView').then((m) => ({ default: m.CustomerJourneyView }))
);
const AccountMatrixView = lazy(() =>
  import('./views/AccountMatrixView').then((m) => ({ default: m.AccountMatrixView }))
);
const BuyingCommitteesView = lazy(() =>
  import('./views/BuyingCommitteesView').then((m) => ({ default: m.BuyingCommitteesView }))
);
const CommitteeCoverageInspectorView = lazy(() =>
  import('./views/CommitteeCoverageInspectorView').then((m) => ({
    default: m.CommitteeCoverageInspectorView,
  }))
);
const DecisionOperationsView = lazy(() =>
  import('./views/DecisionOperationsView').then((m) => ({ default: m.DecisionOperationsView }))
);
const OperationsDeskView = lazy(() =>
  import('./views/OperationsDeskView').then((m) => ({ default: m.OperationsDeskView }))
);
const AudiencePlaybookView = lazy(() =>
  import('./views/AudiencePlaybookView').then((m) => ({ default: m.AudiencePlaybookView }))
);
const ScoringRulesStudioView = lazy(() =>
  import('./views/ScoringRulesStudioView').then((m) => ({ default: m.ScoringRulesStudioView }))
);
const DataConnectorsView = lazy(() =>
  import('./views/DataConnectorsView').then((m) => ({ default: m.DataConnectorsView }))
);
const TasksActivityView = lazy(() =>
  import('./views/TasksActivityView').then((m) => ({ default: m.TasksActivityView }))
);
const WorkspaceTerminalView = lazy(() =>
  import('./views/WorkspaceTerminalView').then((m) => ({ default: m.WorkspaceTerminalView }))
);
const LandingPageView = lazy(() =>
  import('./views/LandingPageView').then((m) => ({ default: m.LandingPageView }))
);
const JevAutomationView = lazy(() =>
  import('./views/JevAutomationView').then((m) => ({ default: m.JevAutomationView }))
);
const SignalSimulatorView = lazy(() =>
  import('./views/SignalSimulatorView').then((m) => ({ default: m.SignalSimulatorView }))
);
const AccountSegmentsView = lazy(() =>
  import('./views/AccountSegmentsView').then((m) => ({ default: m.AccountSegmentsView }))
);
const ConversionWorkspaceView = lazy(() =>
  import('./views/ConversionWorkspaceView').then((m) => ({ default: m.ConversionWorkspaceView }))
);
const CompanyIntelligenceView = lazy(() =>
  import('./views/CompanyIntelligenceView').then((m) => ({ default: m.CompanyIntelligenceView }))
);

export function App() {
  const mainRef = React.useRef<HTMLElement>(null);
  const [activeTab, setActiveTabState] = useState<ActiveNavTab>(
    () => HASH_TO_TAB[window.location.hash.replace(/^#/, '').toLowerCase()] || 'LANDING'
  );

  const setActiveTab = (tab: ActiveNavTab) => {
    setActiveTabState(tab);
    const nextHash = TAB_TO_HASH[tab];
    if (nextHash && window.location.hash !== `#${nextHash}`) {
      window.location.hash = nextHash;
    }
  };

  const [accounts, setAccounts] = useState<AccountDemandUnit[]>(
    DEMO_DATA_ENABLED ? MOCK_DEMAND_UNITS : []
  );
  const [signals, setSignals] = useState<TelemetrySignal[]>(DEMO_DATA_ENABLED ? MOCK_SIGNALS : []);
  const [playbooks, setPlaybooks] = useState<AutomationPlaybook[]>([]);
  const [connectors, setConnectors] = useState<DataConnector[]>(
    DEMO_DATA_ENABLED ? MOCK_CONNECTORS : []
  );
  const [tasks, setTasks] = useState<OperationalTask[]>(DEMO_DATA_ENABLED ? MOCK_TASKS : []);
  const [selectedAccount, setSelectedAccount] = useState<AccountDemandUnit | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [isSidebarHidden, setIsSidebarHidden] = useState(
    () => window.matchMedia('(max-width: 767px)').matches
  );
  const [isSidebarCompact, setIsSidebarCompact] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [scoreFormula, setScoreFormula] = useState('fit × 0.35 + intent × 0.40 + coverage × 0.25');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [runtime, setRuntime] = useState<JevAutomationStatus | null>(null);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [activeTab]);

  // Research-view parameters belong to Intelligence, not to the demand dashboard.
  useEffect(() => {
    if (activeTab === 'INTELLIGENCE') return;
    const url = new URL(window.location.href);
    if (url.searchParams.has('intelligence_view')) {
      url.searchParams.delete('intelligence_view');
      window.history.replaceState(window.history.state, '', url);
    }
  }, [activeTab]);

  // URL hash sync for deep linking between views
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace(/^#/, '').toLowerCase();
      if (hash in HASH_TO_TAB) {
        setActiveTabState(HASH_TO_TAB[hash]);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleSidebar = () => {
    setIsSidebarHidden((prev) => !prev);
  };

  const handleToggleCompact = () => {
    setIsSidebarCompact((prev) => !prev);
  };

  const isLanding = activeTab === 'LANDING';
  const independentView = INDEPENDENT_TABS.has(activeTab);

  // Load live data from Dual Motion backend
  useEffect(() => {
    if (independentView || isLanding) {
      setIsLoading(false);
      return;
    }
    let isMounted = true;
    async function loadBackendData() {
      setIsLoading(true);
      try {
        const [liveUnits, liveTasks, liveConnectors, liveSignals, livePlaybooks, policy] =
          await Promise.all([
            fetchDemandUnits(),
            fetchTasks(),
            fetchConnectors(),
            fetchSignals(),
            fetchPlaybooks(),
            fetchScoringPolicy(),
          ]);
        if (!isMounted) return;
        if (policy?.formula) {
          setScoreFormula(policy.formula.replaceAll('×', ' × ').replaceAll('  ', ' '));
        }
        setAccounts(liveUnits);
        setTasks(liveTasks);
        setConnectors(liveConnectors);
        setSignals(liveSignals);
        setPlaybooks(livePlaybooks);
        setSelectedAccount((current) =>
          current ? liveUnits.find((unit) => unit.id === current.id) || null : null
        );
        setLastUpdated(new Date().toISOString());
        setLoadError('');
        const status = await fetchJevAutomationStatus();
        if (isMounted) setRuntime(status);
      } catch (err) {
        if (isMounted) {
          setLoadError(err instanceof Error ? err.message : 'Workspace data is unavailable.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadBackendData();
    const refresh = window.setInterval(() => {
      if (document.visibilityState === 'visible') loadBackendData();
    }, 60_000);
    return () => {
      window.clearInterval(refresh);
      isMounted = false;
    };
  }, [refreshNonce, independentView, isLanding]);

  // Demo telemetry simulation when explicitly enabled
  useEffect(() => {
    if (!DEMO_DATA_ENABLED || isLanding) return;

    const interval = setInterval(() => {
      setAccounts((prevAccounts) => {
        if (!prevAccounts.length) return prevAccounts;
        const targetIdx = Math.floor(Math.random() * prevAccounts.length);
        const updated = [...prevAccounts];
        const acc = { ...updated[targetIdx] };

        const delta = Math.floor(Math.random() * 5) - 2;
        acc.scores = {
          ...acc.scores,
          productTelemetry: Math.min(100, Math.max(20, acc.scores.productTelemetry + delta)),
        };
        acc.telemetry = {
          ...acc.telemetry,
          activeUsers7d: Math.max(5, acc.telemetry.activeUsers7d + (delta > 0 ? 1 : 0)),
        };

        acc.compositeScore = Math.round(
          (acc.scores.firmographicFit ?? 85) * 0.35 +
            (acc.scores.intentSurge ?? 80) * 0.4 +
            (acc.committee.coverageScore ?? 0) * 0.25
        );

        updated[targetIdx] = acc;
        return updated;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [activeTab]);

  const handleTriggerPlaybook = (_playbookId: string, _accountName: string) => {
    if (selectedAccount) sessionStorage.setItem('dm-playbook-demand-unit', selectedAccount.id);
    setSelectedAccount(null);
    setActiveTab('SIGNALS');
  };

  const visibleAccounts = accounts.filter((a) => {
    if (!searchFilter) return true;
    const query = searchFilter.toLowerCase();
    return (
      a.accountName.toLowerCase().includes(query) ||
      a.domain.toLowerCase().includes(query) ||
      a.solutionTarget.toLowerCase().includes(query)
    );
  });

  const urgentTaskCount = tasks.filter(
    (t) =>
      !t.completed &&
      !t.archived &&
      (t.priority === 'URGENT' || t.priority === 'URGENT_SURGE')
  ).length;
  const coverageHoldCount = visibleAccounts.filter((a) => a.committee.coverageScore === 0).length;
  const { section: activeSection } = getWorkspaceSection(activeTab);

  return (
    <div
      className={
        activeTab === 'LANDING'
          ? 'min-h-screen bg-white text-[#1c1917] flex flex-col selection:bg-[#fe551b]/20 selection:text-[#fe551b]'
          : 'hex-app flex min-h-[100dvh] flex-col bg-[#f8fafc] text-[#0f172a]'
      }
    >
      <a
        href="#main-content"
        className="dm-skip-link"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
      >
        Skip to main content
      </a>

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
          <Header
            activeTab={activeTab}
            independentView={independentView}
            isLoading={isLoading}
            lastUpdated={lastUpdated}
            integrationMode={runtime?.execution_policy.integration_mode}
            onRefresh={() => setRefreshNonce((current) => current + 1)}
            searchQuery={searchFilter}
            onSearchAccount={(query) => setSearchFilter(query)}
            activeAccountCount={accounts.length}
            isSidebarHidden={isSidebarHidden}
            onToggleSidebar={handleToggleSidebar}
            onNavigateTab={(tab) => setActiveTab(tab)}
          />

          <div className="flex-1 flex flex-col md:flex-row w-full max-w-[1880px] mx-auto min-h-0 relative">
            {isSidebarHidden && (
              <button
                type="button"
                onClick={handleToggleSidebar}
                className="fixed left-0 top-20 z-30 hidden md:flex items-center gap-1.5 rounded-r-lg border border-l-0 border-[#e2e8f0] bg-white px-2.5 py-2 text-xs font-medium text-[#0f172a] shadow-sm hover:bg-[#f8fafc]"
              >
                <PanelLeft className="h-4 w-4 text-[#475569]" />
                Show nav
              </button>
            )}

            {!isSidebarHidden && (
              <Navigation
                activeTab={activeTab}
                onSelectTab={(tab) => {
                  setActiveTab(tab);
                  if (window.matchMedia('(max-width: 767px)').matches) setIsSidebarHidden(true);
                }}
                urgentTaskCount={urgentTaskCount}
                coverageHoldCount={coverageHoldCount}
                isCompact={isSidebarCompact}
                onToggleCompact={handleToggleCompact}
                onHideSidebar={() => setIsSidebarHidden(true)}
              />
            )}

            <main
              ref={mainRef}
              tabIndex={-1}
              id="main-content"
              className={`min-w-0 flex-1 overflow-y-auto ${
                activeTab === 'CONVERSIONS' ? '' : 'px-4 py-6 sm:px-8'
              }`}
            >
              {activeSection && activeSection.tabs.length > 1 && (
                <WorkspaceSubNav
                  section={activeSection}
                  activeTab={activeTab}
                  onSelectTab={(tab) => setActiveTab(tab)}
                  counts={{
                    TASKS: urgentTaskCount,
                    COVERAGE: coverageHoldCount,
                  }}
                />
              )}

              <WorkspaceErrorBoundary key={activeTab}>
                <Suspense
                  fallback={
                    <div
                      className="mx-auto max-w-[1440px] space-y-5"
                      role="status"
                      aria-label="Loading workspace view"
                    >
                      <div className="space-y-2">
                        <div className="dm-skeleton h-8 w-56" />
                        <div className="dm-skeleton h-4 w-96 max-w-full" />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[0, 1, 2, 3].map((idx) => (
                          <div key={idx} className="dm-card space-y-3">
                            <div className="dm-skeleton h-3.5 w-24" />
                            <div className="dm-skeleton h-8 w-20" />
                            <div className="dm-skeleton h-3 w-36" />
                          </div>
                        ))}
                      </div>
                      <div className="dm-card space-y-3">
                        <div className="dm-skeleton h-5 w-44" />
                        <div className="dm-skeleton h-10 w-full" />
                        <div className="dm-skeleton h-10 w-full" />
                        <div className="dm-skeleton h-10 w-full" />
                      </div>
                    </div>
                  }
                >
                  {loadError && !independentView && (
                    <div
                      role="alert"
                      className="dm-notice dm-notice-error mx-auto mb-6 flex max-w-[1440px] flex-wrap items-center justify-between gap-3"
                    >
                      <div>
                        <strong>Workspace data could not refresh</strong>
                        <p className="mt-0.5">
                          {loadError}{' '}
                          {lastUpdated ? 'The last successful snapshot is still displayed.' : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="dm-button"
                          onClick={() => setRefreshNonce((current) => current + 1)}
                        >
                          Retry
                        </button>
                        <button
                          type="button"
                          className="dm-button"
                          onClick={() => setActiveTab('TERMINAL')}
                        >
                          Workspace access
                        </button>
                      </div>
                    </div>
                  )}

                  {isLoading && !independentView && !lastUpdated && (
                    <div
                      className="mx-auto mb-6 max-w-[1440px] space-y-4"
                      role="status"
                      aria-label="Loading workspace data"
                    >
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[0, 1, 2, 3].map((idx) => (
                          <div key={idx} className="dm-card space-y-3">
                            <div className="dm-skeleton h-3.5 w-28" />
                            <div className="dm-skeleton h-8 w-16" />
                            <div className="dm-skeleton h-3 w-40" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'OVERVIEW' && (
                    <DemandOverviewView
                      accounts={visibleAccounts}
                      signals={signals}
                      tasks={tasks}
                      theme="light"
                      onSelectAccount={(acc) => setSelectedAccount(acc)}
                      onNavigateTab={(tab) => setActiveTab(tab)}
                      scoreFormula={scoreFormula}
                      runtime={runtime}
                    />
                  )}

                  {activeTab === 'DEMAND_UNITS' && (
                    <DemandUnitScoringView
                      accounts={visibleAccounts}
                      theme="light"
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
                      signals={signals}
                      onSelectAccount={(acc) => setSelectedAccount(acc)}
                      onNavigateTab={(tab) => setActiveTab(tab)}
                    />
                  )}

                  {activeTab === 'ACCOUNTS' && (
                    <AccountMatrixView
                      accounts={visibleAccounts}
                      loading={isLoading && !lastUpdated}
                      theme="light"
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
                      onNavigateTab={(tab) => setActiveTab(tab)}
                    />
                  )}

                  {activeTab === 'OPERATIONS_DESK' && (
                    <OperationsDeskView onNavigateTab={(tab) => setActiveTab(tab)} />
                  )}

                  {activeTab === 'SIGNALS' && (
                    <AudiencePlaybookView
                      accounts={visibleAccounts}
                      loading={isLoading}
                      onNavigateTab={(tab) => setActiveTab(tab)}
                    />
                  )}

                  {activeTab === 'SIMULATOR' && <SignalSimulatorView theme="light" />}
                  {activeTab === 'CONVERSIONS' && (
                    <ConversionWorkspaceView refreshKey={refreshNonce} />
                  )}

                  {activeTab === 'RULES' && (
                    <ScoringRulesStudioView
                      accounts={visibleAccounts}
                      onApplied={() => setRefreshNonce((value) => value + 1)}
                    />
                  )}

                  {activeTab === 'SEGMENTS' && <AccountSegmentsView key={refreshNonce} />}
                  {activeTab === 'INTELLIGENCE' && (
                    <CompanyIntelligenceView
                      key={refreshNonce}
                      signals={signals}
                      accounts={visibleAccounts}
                      onOpenFullDrawer={(acc) => setSelectedAccount(acc)}
                    />
                  )}
                  {activeTab === 'CONNECTORS' && (
                    <DataConnectorsView
                      key={refreshNonce}
                      connectors={connectors}
                      onNavigateTab={(tab) => setActiveTab(tab)}
                    />
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
                    <JevAutomationView
                      theme="light"
                      onNavigateTab={(tab) => setActiveTab(tab)}
                    />
                  )}
                </Suspense>
              </WorkspaceErrorBoundary>
            </main>
          </div>

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
