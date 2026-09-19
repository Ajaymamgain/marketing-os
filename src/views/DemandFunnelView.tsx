import React, { useState } from 'react';
import {
  Filter,
  Layers,
  ArrowDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Zap,
  Cpu,
  Sparkles,
} from 'lucide-react';
import { AccountDemandUnit, FunnelStage } from '../types';
import { playCadClick } from '../utils/audio';

interface DemandFunnelViewProps {
  accounts: AccountDemandUnit[];
  onSelectAccount: (account: AccountDemandUnit) => void;
}

interface FunnelStepInfo {
  stage: FunnelStage;
  name: string;
  count: number;
  valueUsd: number;
  conversionPct: number;
  avgDaysInStage: number;
  plgContributionPct: number;
  slgContributionPct: number;
  diagnostics: string;
  status: 'OPTIMAL' | 'BOTTLENECK' | 'HEALTHY';
}

export const DemandFunnelView: React.FC<DemandFunnelViewProps> = ({
  accounts,
  onSelectAccount,
}) => {
  const [selectedStage, setSelectedStage] = useState<FunnelStage | 'ALL'>('ALL');

  const funnelSteps: FunnelStepInfo[] = [
    {
      stage: 'target',
      name: '01 // TARGET ICP ACCOUNTS',
      count: 2450,
      valueUsd: 196000000,
      conversionPct: 100,
      avgDaysInStage: 0,
      plgContributionPct: 50,
      slgContributionPct: 50,
      diagnostics: 'Firmographic ICP filter: 1k-15k headcount, cloud kubernetes tech footprint.',
      status: 'HEALTHY',
    },
    {
      stage: 'engaged',
      name: '02 // ENGAGED DEMAND UNITS',
      count: 720,
      valueUsd: 64800000,
      conversionPct: 29.3,
      avgDaysInStage: 12,
      plgContributionPct: 62,
      slgContributionPct: 38,
      diagnostics: 'Self-serve sandbox created or website whitepaper / technical doc session logged.',
      status: 'HEALTHY',
    },
    {
      stage: 'prioritized_du',
      name: '03 // PRIORITIZED DEMAND UNITS',
      count: 240,
      valueUsd: 28800000,
      conversionPct: 33.3,
      avgDaysInStage: 9,
      plgContributionPct: 58,
      slgContributionPct: 42,
      diagnostics: 'Dual-motion composite score crossed 70 threshold with >2 team members active.',
      status: 'OPTIMAL',
    },
    {
      stage: 'qualified_du',
      name: '04 // QUALIFIED DEMAND UNITS (PQL/SQL)',
      count: 98,
      valueUsd: 17640000,
      conversionPct: 40.8,
      avgDaysInStage: 15,
      plgContributionPct: 45,
      slgContributionPct: 55,
      diagnostics: 'Champion confirmed + economic buyer aligned. Commercial viability established.',
      status: 'BOTTLENECK',
    },
    {
      stage: 'pipeline_deal',
      name: '05 // FORMAL PIPELINE / PROPOSAL',
      count: 46,
      valueUsd: 9200000,
      conversionPct: 46.9,
      avgDaysInStage: 21,
      plgContributionPct: 30,
      slgContributionPct: 70,
      diagnostics: 'Pricing proposal delivered, security CAIQ package in review with InfoSec.',
      status: 'HEALTHY',
    },
    {
      stage: 'closed_won',
      name: '06 // CLOSED-WON CONTRACT',
      count: 28,
      valueUsd: 5600000,
      conversionPct: 60.8,
      avgDaysInStage: 14,
      plgContributionPct: 35,
      slgContributionPct: 65,
      diagnostics: 'MSA executed, automated SSO provisioning active.',
      status: 'OPTIMAL',
    },
    {
      stage: 'expansion',
      name: '07 // LAND & EXPAND TELEMETRY',
      count: 19,
      valueUsd: 4200000,
      conversionPct: 67.8,
      avgDaysInStage: 45,
      plgContributionPct: 75,
      slgContributionPct: 25,
      diagnostics: 'Adjacent department seat saturation triggered automated expansion addendum.',
      status: 'OPTIMAL',
    },
  ];

  const matchingAccounts = accounts.filter((acc) =>
    selectedStage === 'ALL' ? true : acc.stage === selectedStage
  );

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold">
              SYS.01 // WATERFALL FUNNEL
            </span>
            <span className="text-xs text-slate-400">DEMAND UNIT VELOCITY &amp; CONVERSION DIAGNOSTICS</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            Dual-Motion Demand Waterfall Funnel
          </h2>
          <p className="text-xs text-slate-400">
            Measures stage-by-stage progression from cold ICP target to Closed-Won and Expansion.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-[#081322] border border-cyan-500/30 text-cyan-300">
            TOTAL CONVERSION EFFICIENCY: 14.8%
          </span>
          <span className="px-2.5 py-1 rounded bg-[#081322] border border-amber-500/30 text-amber-300">
            1 STAGE BOTTLENECK DETECTED
          </span>
        </div>
      </div>

      {/* Stage Flow Waterfall Diagnostic Bar */}
      <div className="space-y-3">
        {funnelSteps.map((step, idx) => {
          const isSelected = selectedStage === step.stage;
          const widthPct = Math.max(15, (step.count / funnelSteps[0].count) * 100);

          return (
            <div
              key={step.stage}
              onClick={() => {
                playCadClick();
                setSelectedStage(isSelected ? 'ALL' : step.stage);
              }}
              className={`p-3.5 rounded border transition-all cursor-pointer relative ${
                isSelected
                  ? 'bg-cyan-950/70 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                  : 'bg-[#081220] border-cyan-500/25 hover:border-cyan-500/50 hover:bg-[#0a172a]'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold text-white">{step.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded border font-bold ${
                      step.status === 'BOTTLENECK'
                        ? 'bg-amber-950/70 border-amber-500/40 text-amber-300'
                        : step.status === 'OPTIMAL'
                        ? 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300'
                        : 'bg-cyan-950/70 border-cyan-500/30 text-cyan-300'
                    }`}
                  >
                    {step.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px]">UNITS: </span>
                    <span className="text-cyan-300 font-bold">{step.count.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px]">PIPELINE: </span>
                    <span className="text-white font-bold">${(step.valueUsd / 1000000).toFixed(1)}M</span>
                  </div>
                  {idx > 0 && (
                    <div>
                      <span className="text-slate-400 text-[10px]">CONV: </span>
                      <span className="text-emerald-400 font-bold">{step.conversionPct}%</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400 text-[10px]">AVG DAYS: </span>
                    <span className="text-amber-300 font-bold">{step.avgDaysInStage}d</span>
                  </div>
                </div>
              </div>

              {/* Progress visualizer & motion split */}
              <div className="space-y-1.5">
                <div className="w-full h-2.5 bg-slate-900 rounded-sm overflow-hidden flex">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-500"
                    style={{ width: `${(widthPct * step.plgContributionPct) / 100}%` }}
                    title={`PLG Velocity: ${step.plgContributionPct}%`}
                  />
                  <div
                    className="h-full bg-indigo-400 transition-all duration-500"
                    style={{ width: `${(widthPct * step.slgContributionPct) / 100}%` }}
                    title={`SLG Committee: ${step.slgContributionPct}%`}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="text-slate-300">{step.diagnostics}</span>
                  <span className="shrink-0 ml-2">
                    MOTION CONTRIBUTION: <span className="text-cyan-300">PLG {step.plgContributionPct}%</span> /{' '}
                    <span className="text-indigo-300">SLG {step.slgContributionPct}%</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filtered Stage Accounts Inspector */}
      <div className="p-4 rounded bg-[#081220] border border-cyan-500/25 space-y-3">
        <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2">
          <h3 className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            ACCOUNTS IN STAGE: {selectedStage.toUpperCase()} ({matchingAccounts.length})
          </h3>
          {selectedStage !== 'ALL' && (
            <button
              onClick={() => {
                playCadClick();
                setSelectedStage('ALL');
              }}
              className="text-xs text-cyan-400 hover:text-cyan-200 cursor-pointer"
            >
              SHOW ALL STAGES
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {matchingAccounts.map((acc) => (
            <div
              key={acc.id}
              onClick={() => {
                playCadClick();
                onSelectAccount(acc);
              }}
              className="p-3 rounded bg-[#070e1a] border border-cyan-950 hover:border-cyan-500/40 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {acc.accountName}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                    {acc.primaryMotion}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">{acc.solutionTarget}</p>
                <div className="text-[10px] text-slate-500 mt-1">
                  STAGE: {acc.stage.toUpperCase()} • ${(acc.estDealValue / 1000).toFixed(0)}k ARR
                </div>
              </div>

              <div className="text-right">
                <span className="text-base font-bold text-cyan-300 block">{acc.compositeScore}</span>
                <span className="text-[10px] text-amber-300">
                  {acc.committee.coverageScore}% Committee
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
