import React from 'react';
import {
  TrendingUp,
  Users,
  Layers,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  Activity,
  Zap,
  Target,
  BarChart3,
  Terminal,
} from 'lucide-react';
import { AccountDemandUnit, TelemetrySignal, OperationalTask } from '../types';
import { playCadClick } from '../utils/audio';

interface DemandOverviewViewProps {
  accounts: AccountDemandUnit[];
  signals: TelemetrySignal[];
  tasks: OperationalTask[];
  theme?: 'dark' | 'light';
  onSelectAccount: (account: AccountDemandUnit) => void;
  onNavigateTab: (tab: any) => void;
}

export const DemandOverviewView: React.FC<DemandOverviewViewProps> = ({
  accounts,
  signals,
  tasks,
  theme = 'dark',
  onSelectAccount,
  onNavigateTab,
}) => {
  const totalPipeline = accounts.reduce((acc, a) => acc + a.estDealValue, 0);
  const avgCompositeScore = Math.round(
    accounts.reduce((acc, a) => acc + a.compositeScore, 0) / (accounts.length || 1)
  );
  const avgCommitteeCoverage = Math.round(
    accounts.reduce((acc, a) => acc + a.committee.coverageScore, 0) / (accounts.length || 1)
  );
  const highPrioritySignals = signals.filter((s) => s.severity === 'CRITICAL' || s.severity === 'SURGE');

  // Motion split calculation
  const plgCount = accounts.filter((a) => a.primaryMotion === 'PLG').length;
  const slgCount = accounts.filter((a) => a.primaryMotion === 'SLG').length;
  const dualCount = accounts.filter((a) => a.primaryMotion === 'DUAL').length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner with System Spec */}
      <div className="p-4 rounded border border-cyan-500/30 bg-[#081322] flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold">
              OS SYSTEM TELEMETRY: ACTIVE
            </span>
            <span className="text-xs font-mono text-slate-400">ENGINEERING SPEC REV 2.4</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Dual-Motion Marketing Operations Dashboard
          </h2>
          <p className="text-xs text-slate-400 font-mono max-w-2xl">
            Real-time synchronization of Product-Led Growth (PQL) telemetry and Sales-Led Enterprise Buying Committee coverage across all active target demand units.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => {
              playCadClick();
              onNavigateTab('DEMAND_UNITS');
            }}
            className="px-3.5 py-2 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>CALIBRATE SCORING</span>
          </button>
          <button
            onClick={() => {
              playCadClick();
              onNavigateTab('PI_OPS');
            }}
            className="px-3.5 py-2 rounded bg-[#0b1b30] hover:bg-[#0e233f] border border-cyan-500/30 text-slate-200 font-semibold cursor-pointer transition-colors flex items-center gap-1.5"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>PI TRIAGE FEED</span>
          </button>
        </div>
      </div>

      {/* Global Metric Cards with CAD Grid Accent */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-3.5 rounded bg-[#091526] border border-cyan-500/25 cad-border cad-corner-tl cad-corner-br">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-cyan-400" />
              TOTAL ESTIMATED PIPELINE
            </span>
            <span className="text-emerald-400 text-[10px]">+18.4% MoM</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            ${(totalPipeline / 1000000).toFixed(2)}M
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Across {accounts.length} monitored target demand units
          </p>
        </div>

        <div className="p-3.5 rounded bg-[#091526] border border-cyan-500/25 cad-border cad-corner-tl cad-corner-br">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              AVG DUAL-MOTION SCORE
            </span>
            <span className="text-cyan-300 text-[10px]">PQL / SQL HYBRID</span>
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-300 tracking-tight flex items-baseline gap-2">
            <span>{avgCompositeScore}</span>
            <span className="text-xs font-normal text-slate-400">/ 100 PTS</span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Confidence index: 94.2% verified telemetry
          </p>
        </div>

        <div className="p-3.5 rounded bg-[#091526] border border-cyan-500/25 cad-border cad-corner-tl cad-corner-br">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              COMMITTEE MATURITY
            </span>
            <span className="text-indigo-400 text-[10px]">6 PERSONAS</span>
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-300 tracking-tight flex items-baseline gap-2">
            <span>{avgCommitteeCoverage}%</span>
            <span className="text-xs font-normal text-slate-400">AVG DEPTH</span>
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            Champion + Economic Buyer alignment rate
          </p>
        </div>

        <div className="p-3.5 rounded bg-[#091526] border border-cyan-500/25 cad-border cad-corner-tl cad-corner-br">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              DUAL MOTION VELOCITY INDEX
            </span>
            <span className="text-emerald-400 text-[10px]">ACCELERATION</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300 tracking-tight">
            1.84x
          </div>
          <p className="text-[11px] font-mono text-slate-400 mt-1">
            44% shorter cycle when both PLG + SLG align
          </p>
        </div>
      </div>

      {/* Primary Layout: Motion Distribution & Live Signal Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Demand Units Lead Board */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 rounded bg-[#081322] border border-cyan-500/25 space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2.5">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold font-mono text-white tracking-tight">
                  TOP PRIORITY DEMAND UNITS (REAL-TIME TELEMETRY RANKING)
                </h3>
              </div>
              <button
                onClick={() => {
                  playCadClick();
                  onNavigateTab('DEMAND_UNITS');
                }}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1 transition-colors"
              >
                <span>VIEW FULL ENGINE</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {accounts.slice(0, 5).map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => {
                    playCadClick();
                    onSelectAccount(acc);
                  }}
                  className="p-3 rounded bg-[#070e1a] border border-cyan-950 hover:border-cyan-500/40 hover:bg-[#0a1527] transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {acc.accountName}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                        {acc.primaryMotion}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {acc.tier}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                      <span>{acc.solutionTarget}</span>
                      <span className="text-slate-600">•</span>
                      <span>STAGE: {acc.stage.replace('_', ' ').toUpperCase()}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 block">COMMITTEE</span>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        {acc.committee.coverageScore}% ({acc.committee.totalIdentified}/6)
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-mono text-slate-400 block">EST DEAL</span>
                      <span className="text-xs font-mono font-bold text-white">
                        ${(acc.estDealValue / 1000).toFixed(0)}k
                      </span>
                    </div>

                    <div className="text-right pl-3 border-l border-slate-800">
                      <span className="text-[10px] font-mono text-slate-400 block">SCORE</span>
                      <span className="text-base font-mono font-bold text-cyan-300">
                        {acc.compositeScore}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dual Motion Distribution Matrix */}
          <div className="p-4 rounded bg-[#081322] border border-cyan-500/25 space-y-3">
            <h3 className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              REVENUE MOTION ARCHITECTURE COMPOSITION
            </h3>

            <div className="grid grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded bg-[#070e1a] border border-cyan-500/20">
                <span className="text-[10px] text-cyan-400 block font-semibold">PLG MOTION</span>
                <span className="text-xl font-bold text-white">{plgCount} Units</span>
                <p className="text-[10px] text-slate-400 mt-1">Product telemetry-led self serve expansion</p>
              </div>

              <div className="p-3 rounded bg-[#070e1a] border border-cyan-500/20">
                <span className="text-[10px] text-indigo-400 block font-semibold">SLG MOTION</span>
                <span className="text-xl font-bold text-white">{slgCount} Units</span>
                <p className="text-[10px] text-slate-400 mt-1">Committee-driven top-down enterprise procurement</p>
              </div>

              <div className="p-3 rounded bg-[#070e1a] border border-cyan-500/20">
                <span className="text-[10px] text-emerald-400 block font-semibold">DUAL MOTION (CONVERGED)</span>
                <span className="text-xl font-bold text-white">{dualCount} Units</span>
                <p className="text-[10px] text-slate-400 mt-1">Synchronized PLG seat surge + C-level alignment</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Live Telemetry Ticker & Tasks */}
        <div className="space-y-4">
          {/* Live Signals Pulse */}
          <div className="p-4 rounded bg-[#081322] border border-cyan-500/25 space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2">
              <span className="text-xs font-bold font-mono text-amber-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                LIVE REVENUE TELEMETRY PINGS
              </span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            </div>

            <div className="space-y-2.5">
              {highPrioritySignals.map((sig) => (
                <div
                  key={sig.id}
                  className="p-2.5 rounded bg-[#070e1a] border border-amber-500/20 space-y-1 text-xs font-mono"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      {sig.category} // {sig.severity}
                    </span>
                    <span className="text-[10px] text-slate-500">{sig.timestamp}</span>
                  </div>
                  <h4 className="text-white font-bold text-xs">{sig.title}</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{sig.detail}</p>
                  <div className="text-[10px] text-cyan-400 pt-1">
                    TARGET: {sig.accountName}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                playCadClick();
                onNavigateTab('PI_OPS');
              }}
              className="w-full py-1.5 rounded bg-cyan-950/60 hover:bg-cyan-900/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono transition-colors cursor-pointer"
            >
              OPEN PI TRIAGE OPERATIONS CENTER →
            </button>
          </div>

          {/* Immediate Rep Actions */}
          <div className="p-4 rounded bg-[#081322] border border-cyan-500/25 space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2">
              <span className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                URGENT REVENUE OPERATIONS ACTIONS
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {tasks.filter((t) => !t.completed).length} PENDING
              </span>
            </div>

            <div className="space-y-2">
              {tasks.slice(0, 3).map((tsk) => (
                <div
                  key={tsk.id}
                  className="p-2.5 rounded bg-[#070e1a] border border-cyan-950 text-xs font-mono space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-cyan-300 font-bold text-[11px]">{tsk.accountName}</span>
                    <span className="text-[10px] text-amber-400">{tsk.priority}</span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{tsk.title}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                    <span>{tsk.assignedTo}</span>
                    <span>DUE: {tsk.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                playCadClick();
                onNavigateTab('TASKS');
              }}
              className="w-full py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono transition-colors cursor-pointer"
            >
              VIEW ALL OPERATIONAL ACTIONS →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
