import React, { useState, useMemo } from 'react';
import {
  Grid,
  Download,
  Search,
  Users,
  Cpu,
  TrendingUp,
  Building,
  ChevronRight,
  Sparkles,
  Layers,
  Sliders,
  RefreshCw,
  Eye,
  Crosshair,
  ShieldCheck,
  Zap,
  Target,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import { AccountDemandUnit, ActiveNavTab } from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface AccountMatrixViewProps {
  accounts: AccountDemandUnit[];
  theme?: 'dark' | 'light';
  onSelectAccount: (account: AccountDemandUnit) => void;
  onNavigateTab?: (tab: ActiveNavTab) => void;
}

type MatrixViewMode = 'MAP' | 'CARDS' | 'TABLE';

export const AccountMatrixView: React.FC<AccountMatrixViewProps> = ({
  accounts,
  theme = 'dark',
  onSelectAccount,
  onNavigateTab,
}) => {
  const [viewMode, setViewMode] = useState<MatrixViewMode>('MAP');
  const [activeTier, setActiveTier] = useState<string>('ALL');
  const [selectedMotion, setSelectedMotion] = useState<string>('ALL');
  const [selectedQuadrant, setSelectedQuadrant] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [telemetryThreshold, setTelemetryThreshold] = useState<number>(70);
  const [committeeThreshold, setCommitteeThreshold] = useState<number>(70);
  const [hoveredAccount, setHoveredAccount] = useState<AccountDemandUnit | null>(null);
  const [selectedAccountInMatrix, setSelectedAccountInMatrix] = useState<AccountDemandUnit | null>(
    accounts[0] || null
  );
  const [simulatedAccountAction, setSimulatedAccountAction] = useState<string | null>(null);

  // Quadrant classification based on dynamic thresholds
  const getQuadrant = (acc: AccountDemandUnit) => {
    const highTel = acc.scores.productTelemetry >= telemetryThreshold;
    const highCom = acc.scores.committeeMaturity >= committeeThreshold;
    if (highTel && highCom) return 'DUAL_SURGE';
    if (highTel && !highCom) return 'PQL_EXPANSION';
    if (!highTel && highCom) return 'ENTERPRISE_PROCUREMENT';
    return 'NURTURE_POOL';
  };

  const getQuadrantMeta = (quadrant: string) => {
    switch (quadrant) {
      case 'DUAL_SURGE':
        return {
          code: 'QUADRANT I',
          name: 'Dual-Motion Convergence',
          tag: 'HOTTEST REVENUE OPPORTUNITY',
          color: 'emerald',
          borderClass: 'border-emerald-500/40',
          bgClass: 'bg-emerald-950/40',
          textClass: 'text-emerald-400',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          dotColor: '#10b981',
          strategy: 'Execute Rapid Commercial Close & Multi-Year Enterprise MSA',
        };
      case 'PQL_EXPANSION':
        return {
          code: 'QUADRANT II',
          name: 'Product-Led PQL Expansion',
          tag: 'SINGLE-THREAD RISK // HIGH USAGE',
          color: 'cyan',
          borderClass: 'border-cyan-500/40',
          bgClass: 'bg-cyan-950/40',
          textClass: 'text-cyan-400',
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          dotColor: '#06b6d4',
          strategy: 'Multi-Thread VP / Economic Buyer via CFO Business Case Playbook',
        };
      case 'ENTERPRISE_PROCUREMENT':
        return {
          code: 'QUADRANT III',
          name: 'Enterprise Procurement',
          tag: 'EXECUTIVE SPONSOR // LOW USAGE',
          color: 'indigo',
          borderClass: 'border-indigo-500/40',
          bgClass: 'bg-indigo-950/40',
          textClass: 'text-indigo-400',
          badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          dotColor: '#6366f1',
          strategy: 'Deploy Engineering Sandbox POC & Drive Bottom-Up Developer Adoption',
        };
      default:
        return {
          code: 'QUADRANT IV',
          name: 'Early ICP Nurture Pool',
          tag: 'MONITORING // LOW FIT',
          color: 'slate',
          borderClass: 'border-slate-700/60',
          bgClass: 'bg-slate-900/40',
          textClass: 'text-slate-400',
          badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
          dotColor: '#64748b',
          strategy: 'Automated Account-Based Content Drip & Behavioral Signal Polling',
        };
    }
  };

  // Filter accounts
  const filtered = useMemo(() => {
    return accounts.filter((acc) => {
      if (activeTier !== 'ALL' && acc.tier !== activeTier) return false;
      if (selectedMotion !== 'ALL' && acc.primaryMotion !== selectedMotion) return false;
      if (selectedQuadrant !== 'ALL' && getQuadrant(acc) !== selectedQuadrant) return false;
      if (
        search &&
        !acc.accountName.toLowerCase().includes(search.toLowerCase()) &&
        !acc.domain.toLowerCase().includes(search.toLowerCase()) &&
        !acc.industry.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [accounts, activeTier, selectedMotion, selectedQuadrant, search, telemetryThreshold, committeeThreshold]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalPipeline = accounts.reduce((acc, a) => acc + a.estDealValue, 0);
    const q1Accounts = accounts.filter((a) => getQuadrant(a) === 'DUAL_SURGE');
    const q1Pipeline = q1Accounts.reduce((acc, a) => acc + a.estDealValue, 0);
    const q2Accounts = accounts.filter((a) => getQuadrant(a) === 'PQL_EXPANSION');
    const q3Accounts = accounts.filter((a) => getQuadrant(a) === 'ENTERPRISE_PROCUREMENT');
    const avgComposite = Math.round(
      accounts.reduce((acc, a) => acc + a.compositeScore, 0) / (accounts.length || 1)
    );

    return {
      totalPipeline,
      q1Count: q1Accounts.length,
      q1Pipeline,
      q1Pct: Math.round((q1Accounts.length / (accounts.length || 1)) * 100),
      q2Count: q2Accounts.length,
      q3Count: q3Accounts.length,
      avgComposite,
    };
  }, [accounts, telemetryThreshold, committeeThreshold]);

  const exportData = () => {
    playCadConfirm();
    const exportPayload = {
      timestamp: new Date().toISOString(),
      calibrationThresholds: {
        telemetryThreshold,
        committeeThreshold,
      },
      matrixMetrics: metrics,
      accounts: filtered.map((a) => ({
        ...a,
        assignedQuadrant: getQuadrant(a),
      })),
    };
    const jsonStr = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dual_motion_account_matrix_${Date.now()}.json`;
    link.click();
  };

  const resetThresholds = () => {
    playCadClick();
    setTelemetryThreshold(70);
    setCommitteeThreshold(70);
    setActiveTier('ALL');
    setSelectedMotion('ALL');
    setSelectedQuadrant('ALL');
    setSearch('');
  };

  const handleSimulateAction = (actionText: string) => {
    playCadConfirm();
    setSimulatedAccountAction(actionText);
    setTimeout(() => {
      setSimulatedAccountAction(null);
    }, 3500);
  };

  // SVG Coordinates helper for 2D Cartesian Quadrant canvas
  const svgWidth = 760;
  const svgHeight = 480;
  const padLeft = 65;
  const padRight = 35;
  const padTop = 35;
  const padBottom = 55;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const getSvgX = (score: number) => padLeft + (Math.max(0, Math.min(100, score)) / 100) * plotWidth;
  const getSvgY = (score: number) => padTop + plotHeight - (Math.max(0, Math.min(100, score)) / 100) * plotHeight;

  const thresholdX = getSvgX(telemetryThreshold);
  const thresholdY = getSvgY(committeeThreshold);

  return (
    <div className={`space-y-6 font-mono transition-colors duration-200 ${theme === 'light' ? 'text-slate-900' : 'text-slate-100'}`}>
      {/* Header Bar */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-4 ${
        theme === 'light' ? 'border-slate-200' : 'border-cyan-500/20'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
              theme === 'light'
                ? 'bg-sky-50 text-sky-800 border-sky-300'
                : 'bg-cyan-950 text-cyan-300 border-cyan-400/40'
            }`}>
              SYS.02 // ACCOUNT MATRIX TOPOLOGY
            </span>
            <span className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              2D CARTESIAN QUADRANT SCHEMATIC &amp; CONVERGENCE CLUSTERS
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight mt-1">
            Dual-Motion Account Matrix &amp; Quadrant Map
          </h2>
          <p className={`text-xs mt-1 max-w-3xl ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            Cross-analyzes product telemetry velocity (PLG signals) against buying committee maturity (SLG quorum). Dynamically adjust thresholds to re-calibrate quadrant boundaries and surface high-velocity convergence accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className={`flex items-center p-1 rounded border text-xs ${
            theme === 'light' ? 'bg-slate-100 border-slate-300' : 'bg-[#081220] border-cyan-500/30'
          }`}>
            <button
              onClick={() => {
                playCadClick();
                setViewMode('MAP');
              }}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
                viewMode === 'MAP'
                  ? theme === 'light'
                    ? 'bg-white text-sky-900 shadow-xs'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>2D MAP</span>
            </button>

            <button
              onClick={() => {
                playCadClick();
                setViewMode('CARDS');
              }}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
                viewMode === 'CARDS'
                  ? theme === 'light'
                    ? 'bg-white text-sky-900 shadow-xs'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>QUADRANTS</span>
            </button>

            <button
              onClick={() => {
                playCadClick();
                setViewMode('TABLE');
              }}
              className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer font-bold ${
                viewMode === 'TABLE'
                  ? theme === 'light'
                    ? 'bg-white text-sky-900 shadow-xs'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                  : theme === 'light'
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>PORTFOLIO TABLE</span>
            </button>
          </div>

          <button
            onClick={exportData}
            className={`px-3 py-1.5 rounded text-xs flex items-center gap-1.5 cursor-pointer transition-all border font-bold ${
              theme === 'light'
                ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-700 shadow-xs'
                : 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>EXPORT PAYLOAD</span>
          </button>
        </div>
      </div>

      {/* Executive Metric Ribbon (4 Key Signals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-3.5 rounded border transition-all ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#081220] border-cyan-500/20'
        }`}>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-cyan-400" />
              PORTFOLIO PIPELINE
            </span>
            <span className="text-[10px] text-cyan-400 font-bold">{accounts.length} ACCOUNTS</span>
          </div>
          <div className="text-xl font-bold mt-1.5 flex items-baseline gap-2">
            <span>${(metrics.totalPipeline / 1000).toFixed(0)}k</span>
            <span className="text-xs text-slate-400 font-normal">Total ARR</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Avg Score: {metrics.avgComposite} / 100</div>
        </div>

        <div className={`p-3.5 rounded border transition-all ${
          theme === 'light' ? 'bg-emerald-50/70 border-emerald-200 shadow-xs' : 'bg-[#061814] border-emerald-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="flex items-center gap-1.5 font-bold">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Q1 DUAL CONVERGENCE
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
              {metrics.q1Pct}% OF TOTAL
            </span>
          </div>
          <div className="text-xl font-bold mt-1.5 text-emerald-400 flex items-baseline gap-2">
            <span>${(metrics.q1Pipeline / 1000).toFixed(0)}k</span>
            <span className="text-xs text-slate-400 font-normal">({metrics.q1Count} Prime Accounts)</span>
          </div>
          <div className="text-[10px] text-emerald-500/90 mt-1 font-bold">Highest Win Rate &amp; Velocity</div>
        </div>

        <div className={`p-3.5 rounded border transition-all ${
          theme === 'light' ? 'bg-cyan-50/70 border-cyan-200 shadow-xs' : 'bg-[#051624] border-cyan-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs text-cyan-400">
            <span className="flex items-center gap-1.5 font-bold">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Q2 PQL EXPANSION
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
              {metrics.q2Count} ACCOUNTS
            </span>
          </div>
          <div className="text-xl font-bold mt-1.5 text-cyan-300 flex items-baseline gap-2">
            <span>High Usage</span>
            <span className="text-xs text-amber-400 font-normal">(Needs Econ Buyer)</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Grassroots developer adoption active</div>
        </div>

        <div className={`p-3.5 rounded border transition-all ${
          theme === 'light' ? 'bg-indigo-50/70 border-indigo-200 shadow-xs' : 'bg-[#0d122c] border-indigo-500/30'
        }`}>
          <div className="flex items-center justify-between text-xs text-indigo-400">
            <span className="flex items-center gap-1.5 font-bold">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              Q3 TOP-DOWN SPONSORS
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
              {metrics.q3Count} ACCOUNTS
            </span>
          </div>
          <div className="text-xl font-bold mt-1.5 text-indigo-300 flex items-baseline gap-2">
            <span>High Committee</span>
            <span className="text-xs text-slate-400 font-normal">(Needs POC Sandbox)</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">C-level aligned, driving self-serve uptake</div>
        </div>
      </div>

      {/* Interactive Threshold Calibration & Filter Bar */}
      <div className={`p-4 rounded border space-y-3 ${
        theme === 'light' ? 'bg-slate-50 border-slate-300' : 'bg-[#081220] border-cyan-500/20'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search account, domain, or industry..."
              className={`w-full pl-9 pr-4 py-2 rounded text-xs border transition-all ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                  : 'bg-[#050c18] border-cyan-500/30 text-white focus:border-cyan-400 placeholder:text-slate-500'
              }`}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Dynamic Threshold Calibration Controls */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                TELEMETRY CUTOFF (X):
              </span>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={telemetryThreshold}
                onChange={(e) => setTelemetryThreshold(Number(e.target.value))}
                className="w-20 sm:w-24 accent-cyan-400 cursor-pointer"
              />
              <span className="font-bold text-cyan-300 px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-[11px]">
                {telemetryThreshold}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                COMMITTEE CUTOFF (Y):
              </span>
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={committeeThreshold}
                onChange={(e) => setCommitteeThreshold(Number(e.target.value))}
                className="w-20 sm:w-24 accent-indigo-400 cursor-pointer"
              />
              <span className="font-bold text-indigo-300 px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-500/30 text-[11px]">
                {committeeThreshold}%
              </span>
            </div>

            <button
              onClick={resetThresholds}
              title="Reset Calibration Thresholds to 70/70"
              className={`px-2 py-1 rounded text-[11px] flex items-center gap-1 transition-colors border cursor-pointer ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-cyan-300'
              }`}
            >
              <RefreshCw className="w-3 h-3" />
              <span>RESET</span>
            </button>
          </div>
        </div>

        {/* Filter Chips Ribbon */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/40 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 text-[11px]">MOTION:</span>
            {['ALL', 'DUAL', 'PLG', 'SLG'].map((m) => (
              <button
                key={m}
                onClick={() => {
                  playCadClick();
                  setSelectedMotion(m);
                }}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer border ${
                  selectedMotion === m
                    ? theme === 'light'
                      ? 'bg-sky-100 border-sky-400 text-sky-900 font-bold'
                      : 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-bold'
                    : theme === 'light'
                    ? 'bg-white border-slate-300 text-slate-600'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {m === 'DUAL' ? 'DUAL-MOTION' : m}
              </button>
            ))}

            <span className="text-slate-400 text-[11px] ml-2">TIER:</span>
            {['ALL', 'Tier-1 Enterprise', 'Tier-2 MidMarket', 'Tier-3 Scale'].map((tier) => (
              <button
                key={tier}
                onClick={() => {
                  playCadClick();
                  setActiveTier(tier);
                }}
                className={`px-2.5 py-1 rounded text-[11px] transition-colors cursor-pointer border ${
                  activeTier === tier
                    ? theme === 'light'
                      ? 'bg-sky-100 border-sky-400 text-sky-900 font-bold'
                      : 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-bold'
                    : theme === 'light'
                    ? 'bg-white border-slate-300 text-slate-600'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {tier.replace('Tier-', 'T')}
              </button>
            ))}
          </div>

          {/* Active Quadrant Filter Indicator */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">QUADRANT:</span>
            <select
              value={selectedQuadrant}
              onChange={(e) => {
                playCadClick();
                setSelectedQuadrant(e.target.value);
              }}
              className={`px-2.5 py-1 rounded text-[11px] border cursor-pointer font-bold ${
                theme === 'light'
                  ? 'bg-white border-slate-300 text-slate-800'
                  : 'bg-[#050c18] border-cyan-500/40 text-cyan-300'
              }`}
            >
              <option value="ALL">ALL QUADRANTS ({accounts.length})</option>
              <option value="DUAL_SURGE">Q1: Dual Convergence</option>
              <option value="PQL_EXPANSION">Q2: PQL Expansion</option>
              <option value="ENTERPRISE_PROCUREMENT">Q3: Enterprise Procurement</option>
              <option value="NURTURE_POOL">Q4: Nurture Pool</option>
            </select>
          </div>
        </div>
      </div>

      {/* MAIN VIEW MODE 1: 2D CARTESIAN QUADRANT CANVAS MAP */}
      {viewMode === 'MAP' && (
        <div className={`p-4 sm:p-6 rounded-xl border relative ${
          theme === 'light'
            ? 'bg-white border-slate-300 shadow-lg shadow-slate-100'
            : 'bg-[#050b16] border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)]'
        }`}>
          {/* Schematic Header Label */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b pb-3 border-cyan-500/10">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-xs font-bold text-cyan-300 tracking-wider">
                LIVE 2D CARTESIAN CONVERGENCE RADAR
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded border ${
                theme === 'light' ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}>
                NODES SIZED BY ARR POTENTIAL
              </span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span>Q1 Dual Motion</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                <span>Q2 PQL</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 inline-block" />
                <span>Q3 Top-Down</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
                <span>Q4 Nurture</span>
              </span>
            </div>
          </div>

          {/* Interactive SVG Coordinate Map */}
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto max-h-[580px] select-none"
              style={{ minWidth: '640px' }}
            >
              <defs>
                {/* Quadrant background gradients */}
                <radialGradient id="q1Grad" cx="90%" cy="10%" r="90%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                </radialGradient>
                <radialGradient id="q2Grad" cx="90%" cy="90%" r="90%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
                </radialGradient>
                <radialGradient id="q3Grad" cx="10%" cy="10%" r="90%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
                </radialGradient>
                <radialGradient id="q4Grad" cx="10%" cy="90%" r="90%">
                  <stop offset="0%" stopColor="#64748b" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#64748b" stopOpacity="0.01" />
                </radialGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 4 Quadrant Background Rectangles */}
              {/* Q3: Top-Left (Enterprise Procurement) */}
              <rect
                x={padLeft}
                y={padTop}
                width={thresholdX - padLeft}
                height={thresholdY - padTop}
                fill="url(#q3Grad)"
                stroke={selectedQuadrant === 'ENTERPRISE_PROCUREMENT' ? '#6366f1' : 'none'}
                strokeWidth="2"
                className="cursor-pointer transition-colors"
                onClick={() => {
                  playCadClick();
                  setSelectedQuadrant(selectedQuadrant === 'ENTERPRISE_PROCUREMENT' ? 'ALL' : 'ENTERPRISE_PROCUREMENT');
                }}
              />

              {/* Q1: Top-Right (Dual-Motion Convergence) */}
              <rect
                x={thresholdX}
                y={padTop}
                width={padLeft + plotWidth - thresholdX}
                height={thresholdY - padTop}
                fill="url(#q1Grad)"
                stroke={selectedQuadrant === 'DUAL_SURGE' ? '#10b981' : 'none'}
                strokeWidth="2"
                className="cursor-pointer transition-colors"
                onClick={() => {
                  playCadClick();
                  setSelectedQuadrant(selectedQuadrant === 'DUAL_SURGE' ? 'ALL' : 'DUAL_SURGE');
                }}
              />

              {/* Q4: Bottom-Left (Early ICP Nurture) */}
              <rect
                x={padLeft}
                y={thresholdY}
                width={thresholdX - padLeft}
                height={padTop + plotHeight - thresholdY}
                fill="url(#q4Grad)"
                stroke={selectedQuadrant === 'NURTURE_POOL' ? '#64748b' : 'none'}
                strokeWidth="2"
                className="cursor-pointer transition-colors"
                onClick={() => {
                  playCadClick();
                  setSelectedQuadrant(selectedQuadrant === 'NURTURE_POOL' ? 'ALL' : 'NURTURE_POOL');
                }}
              />

              {/* Q2: Bottom-Right (Product-Led PQL Expansion) */}
              <rect
                x={thresholdX}
                y={thresholdY}
                width={padLeft + plotWidth - thresholdX}
                height={padTop + plotHeight - thresholdY}
                fill="url(#q2Grad)"
                stroke={selectedQuadrant === 'PQL_EXPANSION' ? '#06b6d4' : 'none'}
                strokeWidth="2"
                className="cursor-pointer transition-colors"
                onClick={() => {
                  playCadClick();
                  setSelectedQuadrant(selectedQuadrant === 'PQL_EXPANSION' ? 'ALL' : 'PQL_EXPANSION');
                }}
              />

              {/* Grid Lines across 0 to 100 */}
              {[20, 40, 60, 80].map((pct) => {
                const gx = getSvgX(pct);
                const gy = getSvgY(pct);
                return (
                  <g key={pct} opacity="0.25">
                    {/* Vertical grid line */}
                    <line
                      x1={gx}
                      y1={padTop}
                      x2={gx}
                      y2={padTop + plotHeight}
                      stroke={theme === 'light' ? '#cbd5e1' : '#1e3a5f'}
                      strokeDasharray="3 3"
                    />
                    {/* Horizontal grid line */}
                    <line
                      x1={padLeft}
                      y1={gy}
                      x2={padLeft + plotWidth}
                      y2={gy}
                      stroke={theme === 'light' ? '#cbd5e1' : '#1e3a5f'}
                      strokeDasharray="3 3"
                    />
                    {/* X axis tick labels */}
                    <text
                      x={gx}
                      y={padTop + plotHeight + 16}
                      fill={theme === 'light' ? '#64748b' : '#64748b'}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {pct}%
                    </text>
                    {/* Y axis tick labels */}
                    <text
                      x={padLeft - 8}
                      y={gy + 3}
                      fill={theme === 'light' ? '#64748b' : '#64748b'}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {pct}%
                    </text>
                  </g>
                );
              })}

              {/* Dynamic Threshold Crosshair Lines (X & Y) */}
              <g>
                {/* Vertical Cutoff Line */}
                <line
                  x1={thresholdX}
                  y1={padTop}
                  x2={thresholdX}
                  y2={padTop + plotHeight}
                  stroke="#06b6d4"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                  opacity="0.8"
                />
                <text
                  x={thresholdX}
                  y={padTop - 8}
                  fill="#06b6d4"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  X-CUTOFF: {telemetryThreshold}%
                </text>

                {/* Horizontal Cutoff Line */}
                <line
                  x1={padLeft}
                  y1={thresholdY}
                  x2={padLeft + plotWidth}
                  y2={thresholdY}
                  stroke="#6366f1"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                  opacity="0.8"
                />
                <text
                  x={padLeft + plotWidth + 8}
                  y={thresholdY + 3}
                  fill="#6366f1"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="monospace"
                  textAnchor="start"
                >
                  Y-CUTOFF: {committeeThreshold}%
                </text>
              </g>

              {/* Quadrant Corner Labels & Watermarks */}
              {/* Q3 (Top Left) */}
              <g transform={`translate(${padLeft + 12}, ${padTop + 20})`} pointerEvents="none">
                <text fill="#818cf8" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  Q3 // ENTERPRISE PROCUREMENT
                </text>
                <text fill="#64748b" fontSize="9" fontFamily="monospace" y="14">
                  High Committee / Low Telemetry
                </text>
              </g>

              {/* Q1 (Top Right) */}
              <g transform={`translate(${padLeft + plotWidth - 12}, ${padTop + 20})`} textAnchor="end" pointerEvents="none">
                <text fill="#34d399" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  Q1 // DUAL CONVERGENCE
                </text>
                <text fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace" y="14">
                  MAX ARR ACCELERATION
                </text>
              </g>

              {/* Q4 (Bottom Left) */}
              <g transform={`translate(${padLeft + 12}, ${padTop + plotHeight - 20})`} pointerEvents="none">
                <text fill="#64748b" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  Q4 // EARLY ICP NURTURE
                </text>
                <text fill="#475569" fontSize="9" fontFamily="monospace" y="14">
                  Low Telemetry / Low Committee
                </text>
              </g>

              {/* Q2 (Bottom Right) */}
              <g transform={`translate(${padLeft + plotWidth - 12}, ${padTop + plotHeight - 20})`} textAnchor="end" pointerEvents="none">
                <text fill="#22d3ee" fontSize="11" fontWeight="bold" fontFamily="monospace">
                  Q2 // PRODUCT-LED PQL EXPANSION
                </text>
                <text fill="#64748b" fontSize="9" fontFamily="monospace" y="14">
                  High Telemetry / Missing Executive
                </text>
              </g>

              {/* Primary Axis Boundary Box */}
              <rect
                x={padLeft}
                y={padTop}
                width={plotWidth}
                height={plotHeight}
                fill="none"
                stroke={theme === 'light' ? '#94a3b8' : '#1e3a5f'}
                strokeWidth="1.5"
              />

              {/* Axis Titles */}
              {/* Bottom X-Axis Title */}
              <text
                x={padLeft + plotWidth / 2}
                y={padTop + plotHeight + 36}
                fill={theme === 'light' ? '#334155' : '#94a3b8'}
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                PRODUCT TELEMETRY VELOCITY (PLG USAGE, SEAT SATURATION, API CALLS) [0 TO 100]
              </text>

              {/* Left Y-Axis Title */}
              <text
                x={-(padTop + plotHeight / 2)}
                y="20"
                transform="rotate(-90)"
                fill={theme === 'light' ? '#334155' : '#94a3b8'}
                fontSize="11"
                fontWeight="bold"
                fontFamily="monospace"
                textAnchor="middle"
              >
                BUYING COMMITTEE MATURITY (STAKEHOLDER QUORUM, BUYER ENGAGEMENT) [0 TO 100]
              </text>

              {/* Plotted Account Nodes */}
              {filtered.map((acc) => {
                const cx = getSvgX(acc.scores.productTelemetry);
                const cy = getSvgY(acc.scores.committeeMaturity);
                const quad = getQuadrant(acc);
                const meta = getQuadrantMeta(quad);
                const isSelected = selectedAccountInMatrix?.id === acc.id;
                const isHovered = hoveredAccount?.id === acc.id;

                // Radius scaled by deal value ($50k -> 8px, $250k -> 16px)
                const baseRadius = 8 + (acc.estDealValue / 250000) * 8;

                return (
                  <g
                    key={acc.id}
                    className="cursor-pointer transition-transform group"
                    onClick={() => {
                      playCadClick();
                      setSelectedAccountInMatrix(acc);
                    }}
                    onMouseEnter={() => setHoveredAccount(acc)}
                    onMouseLeave={() => setHoveredAccount(null)}
                  >
                    {/* Pulsing ring for selected / prime Q1 account */}
                    {(isSelected || quad === 'DUAL_SURGE') && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={baseRadius + 6}
                        fill="none"
                        stroke={meta.dotColor}
                        strokeWidth="1.5"
                        opacity={isSelected ? '0.85' : '0.4'}
                        strokeDasharray={isSelected ? 'none' : '3 2'}
                        className="animate-pulse"
                      />
                    )}

                    {/* Outer halo on hover */}
                    {isHovered && (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={baseRadius + 10}
                        fill={meta.dotColor}
                        opacity="0.2"
                        filter="url(#glow)"
                      />
                    )}

                    {/* Main Account Dot */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={baseRadius}
                      fill={meta.dotColor}
                      stroke={isSelected ? '#ffffff' : theme === 'light' ? '#ffffff' : '#050b16'}
                      strokeWidth={isSelected ? '3' : '2'}
                      filter={isSelected ? 'url(#glow)' : undefined}
                      opacity={isSelected || isHovered ? '1' : '0.9'}
                    />

                    {/* Account Label text */}
                    <text
                      x={cx}
                      y={cy + baseRadius + 14}
                      fill={isSelected ? '#38bdf8' : theme === 'light' ? '#1e293b' : '#cbd5e1'}
                      fontSize="10"
                      fontWeight={isSelected ? 'bold' : '600'}
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {acc.accountName.split(' ')[0]}
                    </text>

                    {/* Small deal pill */}
                    <text
                      x={cx}
                      y={cy + baseRadius + 24}
                      fill={meta.dotColor}
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      ${(acc.estDealValue / 1000).toFixed(0)}k
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Interactive Tooltip Card when hovering on a node */}
          {hoveredAccount && (
            <div className={`p-3.5 rounded-lg border text-xs max-w-sm mt-3 transition-all ${
              theme === 'light'
                ? 'bg-slate-900 text-white border-slate-700 shadow-xl'
                : 'bg-[#0b172a] text-white border-cyan-400/50 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
            }`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-cyan-300 text-sm">{hoveredAccount.accountName}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${getQuadrantMeta(getQuadrant(hoveredAccount)).badgeClass}`}>
                  {getQuadrantMeta(getQuadrant(hoveredAccount)).code}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">{hoveredAccount.domain} // {hoveredAccount.industry}</p>

              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-700/60 text-[11px]">
                <div>
                  <span className="text-slate-400">Telemetry (X): </span>
                  <strong className="text-cyan-400">{hoveredAccount.scores.productTelemetry}%</strong>
                </div>
                <div>
                  <span className="text-slate-400">Committee (Y): </span>
                  <strong className="text-indigo-400">{hoveredAccount.scores.committeeMaturity}%</strong>
                </div>
                <div>
                  <span className="text-slate-400">Composite: </span>
                  <strong className="text-white">{hoveredAccount.compositeScore}/100</strong>
                </div>
                <div>
                  <span className="text-slate-400">Pipeline ARR: </span>
                  <strong className="text-emerald-400">${(hoveredAccount.estDealValue / 1000).toFixed(0)}k</strong>
                </div>
              </div>

              <div className="mt-2 pt-1 border-t border-slate-700/40 text-[10px] text-slate-300">
                <strong className="text-cyan-400">Directive: </strong>
                {getQuadrantMeta(getQuadrant(hoveredAccount)).strategy}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MAIN VIEW MODE 2: 2x2 QUADRANT BENTO CARDS */}
      {viewMode === 'CARDS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['ENTERPRISE_PROCUREMENT', 'DUAL_SURGE', 'NURTURE_POOL', 'PQL_EXPANSION'] as const).map((qKey) => {
            const meta = getQuadrantMeta(qKey);
            const qAccounts = filtered.filter((a) => getQuadrant(a) === qKey);
            const qPipeline = qAccounts.reduce((sum, a) => sum + a.estDealValue, 0);
            const isSelected = selectedQuadrant === qKey;

            return (
              <div
                key={qKey}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-4 ${
                  isSelected
                    ? `${meta.bgClass} ${meta.borderClass} shadow-[0_0_20px_rgba(6,182,212,0.25)]`
                    : theme === 'light'
                    ? 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                    : 'bg-[#070e1b] border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${meta.badgeClass}`}>
                          {meta.code}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{meta.tag}</span>
                      </div>
                      <h3 className={`text-base font-bold mt-1.5 ${meta.textClass}`}>
                        {meta.name}
                      </h3>
                    </div>

                    <button
                      onClick={() => {
                        playCadClick();
                        setSelectedQuadrant(selectedQuadrant === qKey ? 'ALL' : qKey);
                      }}
                      className={`text-xs px-2.5 py-1 rounded border transition-colors cursor-pointer font-bold ${
                        isSelected
                          ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                          : theme === 'light'
                          ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isSelected ? 'FILTER ACTIVE' : 'FILTER'}
                    </button>
                  </div>

                  <p className={`text-xs mt-2 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                    {meta.strategy}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-3 mt-3 border-t border-slate-800/60 font-bold">
                    <span className="text-slate-400">{qAccounts.length} Target Units</span>
                    <span className="text-white">${(qPipeline / 1000).toFixed(0)}k Pipeline ARR</span>
                  </div>

                  {/* Account Cards inside Quadrant */}
                  <div className="space-y-2 mt-3">
                    {qAccounts.length === 0 ? (
                      <div className="p-4 rounded border border-dashed border-slate-800 text-center text-xs text-slate-500">
                        No accounts currently match active filters in this quadrant.
                      </div>
                    ) : (
                      qAccounts.map((acc) => {
                        const isAccSelected = selectedAccountInMatrix?.id === acc.id;
                        return (
                          <div
                            key={acc.id}
                            onClick={() => {
                              playCadClick();
                              setSelectedAccountInMatrix(acc);
                            }}
                            className={`p-2.5 rounded border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isAccSelected
                                ? 'bg-cyan-950/80 border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                                : theme === 'light'
                                ? 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                                : 'bg-[#050c18] hover:bg-[#091526] border-slate-800/80'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs truncate text-white">{acc.accountName}</span>
                                <span className="text-[10px] text-slate-400">({acc.cadCoordinates.grid})</span>
                              </div>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>Telem: <strong className="text-cyan-300">{acc.scores.productTelemetry}%</strong></span>
                                <span>Comm: <strong className="text-indigo-300">{acc.scores.committeeMaturity}%</strong></span>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xs font-bold text-emerald-400">${(acc.estDealValue / 1000).toFixed(0)}k</div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  playCadConfirm();
                                  onSelectAccount(acc);
                                }}
                                className="text-[10px] text-cyan-400 hover:underline flex items-center justify-end"
                              >
                                DOSSIER <ChevronRight className="w-3 h-3 ml-0.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MAIN VIEW MODE 3: TABULAR PORTFOLIO MATRIX */}
      {viewMode === 'TABLE' && (
        <div className={`rounded-xl border overflow-hidden ${
          theme === 'light' ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#060d1a] border-cyan-500/20'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b text-[11px] font-bold ${
                  theme === 'light' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#081424] text-cyan-300 border-cyan-500/20'
                }`}>
                  <th className="p-3">GRID SECTOR</th>
                  <th className="p-3">ACCOUNT &amp; DOMAIN</th>
                  <th className="p-3">QUADRANT CLASSIFICATION</th>
                  <th className="p-3">TELEMETRY (X)</th>
                  <th className="p-3">COMMITTEE (Y)</th>
                  <th className="p-3">COMPOSITE</th>
                  <th className="p-3">ARR POTENTIAL</th>
                  <th className="p-3">STAGE</th>
                  <th className="p-3">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filtered.map((acc) => {
                  const quad = getQuadrant(acc);
                  const meta = getQuadrantMeta(quad);
                  const isSelected = selectedAccountInMatrix?.id === acc.id;

                  return (
                    <tr
                      key={acc.id}
                      onClick={() => {
                        playCadClick();
                        setSelectedAccountInMatrix(acc);
                      }}
                      className={`transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-950/60 text-white'
                          : theme === 'light'
                          ? 'hover:bg-slate-50 text-slate-800'
                          : 'hover:bg-[#091526] text-slate-300'
                      }`}
                    >
                      <td className="p-3 font-mono font-bold text-slate-400">
                        {acc.cadCoordinates.grid}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-white text-xs">{acc.accountName}</div>
                        <div className="text-[10px] text-slate-400">{acc.domain}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${meta.badgeClass}`}>
                          {meta.name}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-cyan-300 w-8">{acc.scores.productTelemetry}%</span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-cyan-400"
                              style={{ width: `${acc.scores.productTelemetry}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-300 w-8">{acc.scores.committeeMaturity}%</span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-indigo-400"
                              style={{ width: `${acc.scores.committeeMaturity}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-white">
                        {acc.compositeScore} / 100
                      </td>
                      <td className="p-3 font-bold text-emerald-400">
                        ${(acc.estDealValue / 1000).toFixed(0)}k
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-300">
                          {acc.stage.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            playCadConfirm();
                            onSelectAccount(acc);
                          }}
                          className="px-2 py-1 rounded bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>DOSSIER</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SELECTED ACCOUNT QUICK DIAGNOSTIC HUD */}
      {selectedAccountInMatrix && (
        <div className={`p-4 sm:p-5 rounded-xl border transition-all ${
          theme === 'light'
            ? 'bg-white border-slate-300 shadow-md'
            : 'bg-[#081220] border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)]'
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-3 border-cyan-500/20">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded bg-cyan-950 border border-cyan-400/50 flex items-center justify-center text-cyan-300 font-bold">
                <Building className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{selectedAccountInMatrix.accountName}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${getQuadrantMeta(getQuadrant(selectedAccountInMatrix)).badgeClass}`}>
                    {getQuadrantMeta(getQuadrant(selectedAccountInMatrix)).code}: {getQuadrantMeta(getQuadrant(selectedAccountInMatrix)).name}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedAccountInMatrix.domain} | {selectedAccountInMatrix.industry} | Assigned AE: {selectedAccountInMatrix.assignedAe}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleSimulateAction('Simulated +30 Seats Surge -> Recalculating Product Telemetry...')}
                className="px-3 py-1.5 rounded bg-cyan-950/70 hover:bg-cyan-900 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>SIMULATE SEAT SURGE</span>
              </button>

              <button
                onClick={() => {
                  playCadConfirm();
                  onSelectAccount(selectedAccountInMatrix);
                }}
                className="px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>OPEN FULL DOSSIER</span>
              </button>
            </div>
          </div>

          {simulatedAccountAction && (
            <div className="mt-3 p-2 rounded bg-cyan-950/80 border border-cyan-400 text-cyan-300 text-xs flex items-center gap-2 animate-fadeIn">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
              <span>{simulatedAccountAction}</span>
            </div>
          )}

          {/* Diagnostics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs">
            <div className="p-2.5 rounded bg-[#050c18] border border-slate-800">
              <span className="text-slate-400 text-[10px]">Product Telemetry Velocity</span>
              <div className="text-base font-bold text-cyan-300 mt-0.5">
                {selectedAccountInMatrix.scores.productTelemetry} / 100
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Active Users: {selectedAccountInMatrix.telemetry.activeUsers7d} ({selectedAccountInMatrix.telemetry.seatSaturationPct}% Saturation)
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#050c18] border border-slate-800">
              <span className="text-slate-400 text-[10px]">Committee Maturity &amp; Depth</span>
              <div className="text-base font-bold text-indigo-300 mt-0.5">
                {selectedAccountInMatrix.committee.coverageScore}% Quorum
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {selectedAccountInMatrix.committee.totalIdentified} of {selectedAccountInMatrix.committee.totalRequired} Personas Mapped
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#050c18] border border-slate-800">
              <span className="text-slate-400 text-[10px]">Composite Dual-Motion Score</span>
              <div className="text-base font-bold text-white mt-0.5">
                {selectedAccountInMatrix.compositeScore} / 100
              </div>
              <div className="text-[10px] text-emerald-400 mt-0.5">
                Score 7d Delta: +{selectedAccountInMatrix.scoreDelta7d}
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#050c18] border border-slate-800">
              <span className="text-slate-400 text-[10px]">Pipeline Deal Potential</span>
              <div className="text-base font-bold text-emerald-400 mt-0.5">
                ${(selectedAccountInMatrix.estDealValue / 1000).toFixed(0)}k ARR
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Stage: {selectedAccountInMatrix.stage.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </div>

          {/* Committee Alignment Indicators */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-bold">COMMITTEE QUORUM:</span>
              <span className={`flex items-center gap-1 font-bold ${
                selectedAccountInMatrix.committee.championIdentified ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {selectedAccountInMatrix.committee.championIdentified ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                Champion
              </span>

              <span className={`flex items-center gap-1 font-bold ${
                selectedAccountInMatrix.committee.economicBuyerEngaged ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {selectedAccountInMatrix.committee.economicBuyerEngaged ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                Economic Buyer
              </span>

              <span className={`flex items-center gap-1 font-bold ${
                selectedAccountInMatrix.committee.securitySignedOff ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                Security Signoff
              </span>
            </div>

            <div className="text-cyan-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              <span>RECOMMENDED PLAYBOOK: {selectedAccountInMatrix.recommendedPlaybookId || 'EXECUTIVE_CFO_ROI'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
