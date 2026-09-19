import React, { useState } from 'react';
import {
  Milestone,
  CheckCircle2,
  Clock,
  ArrowRight,
  Shield,
  Zap,
  Users,
  Building,
  Terminal,
  FileText,
  Lock,
  Sparkles,
} from 'lucide-react';
import { AccountDemandUnit } from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface CustomerJourneyViewProps {
  accounts: AccountDemandUnit[];
  onSelectAccount: (account: AccountDemandUnit) => void;
}

interface JourneyNode {
  id: string;
  motion: 'PLG' | 'SLG' | 'DUAL';
  title: string;
  actor: string;
  milestoneDays: number;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  detail: string;
  telemetrySignal: string;
}

export const CustomerJourneyView: React.FC<CustomerJourneyViewProps> = ({
  accounts,
  onSelectAccount,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const plgJourneyNodes: JourneyNode[] = [
    {
      id: 'JN-01',
      motion: 'PLG',
      title: 'Initial Developer Ingestion & Sandbox Setup',
      actor: 'Technical Champion (Principal Architect)',
      milestoneDays: 1,
      status: 'COMPLETED',
      detail: 'Initiated self-serve cloud cluster with 3 default test worker nodes.',
      telemetrySignal: 'CLI_INSTALL: package initialized via homebrew',
    },
    {
      id: 'JN-02',
      motion: 'PLG',
      title: 'Seat Saturation & Team Multi-Tenancy',
      actor: 'Dev Squad Leads (18 Engineers)',
      milestoneDays: 6,
      status: 'COMPLETED',
      detail: 'Crossed 15-seat threshold. Organic viral workspace invite rate +45%.',
      telemetrySignal: 'SEAT_CAP_WARNING: Free tier 85% full',
    },
    {
      id: 'JN-03',
      motion: 'PLG',
      title: 'High-Volume Production Load Stress Test',
      actor: 'SRE & Tech Evaluator',
      milestoneDays: 12,
      status: activeAccount.scores.productTelemetry > 75 ? 'COMPLETED' : 'IN_PROGRESS',
      detail: 'Benchmarked 2.8M req/min with zero packet loss across cluster mesh.',
      telemetrySignal: 'API_BURST: 50,000 req/sec benchmark validated',
    },
    {
      id: 'JN-04',
      motion: 'PLG',
      title: 'Production Integration & Automated CI/CD Deploy',
      actor: 'Platform Engineering Squad',
      milestoneDays: 22,
      status: activeAccount.compositeScore > 85 ? 'COMPLETED' : 'PENDING',
      detail: 'Integrated dual motion webhook pipeline into GitOps deployment automation.',
      telemetrySignal: 'GITOPS_SYNC: 42 active deployment pipelines',
    },
  ];

  const slgJourneyNodes: JourneyNode[] = [
    {
      id: 'JN-11',
      motion: 'SLG',
      title: 'Economic Buyer Multi-Thread Alignment',
      actor: 'VP Engineering / CIO',
      milestoneDays: 4,
      status: activeAccount.committee.economicBuyerEngaged ? 'COMPLETED' : 'IN_PROGRESS',
      detail: 'Executive business briefing scheduled to present cost-reduction ROI model.',
      telemetrySignal: 'EXECUTIVE_CONNECT: Deck viewed 4 times by VP',
    },
    {
      id: 'JN-12',
      motion: 'SLG',
      title: 'Enterprise Buying Committee Activation',
      actor: 'Procurement, Champion, Legal',
      milestoneDays: 10,
      status: activeAccount.committee.coverageScore >= 75 ? 'COMPLETED' : 'IN_PROGRESS',
      detail: 'Formal demand unit formed across 6 stakeholders with mapped sentiment.',
      telemetrySignal: 'COMMITTEE_FORMED: 5 of 6 roles assigned',
    },
    {
      id: 'JN-13',
      motion: 'SLG',
      title: 'InfoSec & Compliance Gatekeeper Sign-Off',
      actor: 'CISO / Cybersecurity Director',
      milestoneDays: 16,
      status: activeAccount.committee.securitySignedOff ? 'COMPLETED' : 'IN_PROGRESS',
      detail: 'SOC2 Type II, FedRAMP, and penetration test verification completed.',
      telemetrySignal: 'SECURITY_AUDIT: Zero P0/P1 blockers found',
    },
    {
      id: 'JN-14',
      motion: 'SLG',
      title: 'Master Services Agreement (MSA) Execution',
      actor: 'Strategic Sourcing & Legal',
      milestoneDays: 28,
      status: activeAccount.stage === 'closed_won' || activeAccount.stage === 'expansion' ? 'COMPLETED' : 'PENDING',
      detail: 'Negotiated enterprise tier terms with 3-year commitment and SLA guarantee.',
      telemetrySignal: 'MSA_SIGNED: DocuSign envelope executed',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold">
              SYS.01 // JOURNEY ARCHITECTURE
            </span>
            <span className="text-xs text-slate-400">DUAL-TRACK STAGE TRANSITION STATE MACHINE</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            Dual-Motion Customer Journey Transition Map
          </h2>
          <p className="text-xs text-slate-400">
            Traces the convergence between bottom-up product telemetry velocity and top-down executive committee buying milestones.
          </p>
        </div>

        {/* Account Selector Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">ACTIVE ACCOUNT:</span>
          <select
            value={selectedAccountId}
            onChange={(e) => {
              playCadClick();
              setSelectedAccountId(e.target.value);
            }}
            className="bg-[#091526] border border-cyan-500/40 rounded px-3 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 font-mono cursor-pointer"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.accountName} (${(a.estDealValue / 1000).toFixed(0)}k)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Account Journey Spec Banner */}
      <div className="p-4 rounded bg-[#081220] border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white">{activeAccount.accountName}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
              {activeAccount.primaryMotion}
            </span>
            <span className="text-[10px] text-slate-400">GRID: {activeAccount.cadCoordinates.grid}</span>
          </div>
          <p className="text-xs text-slate-400">
            Solution Target: <span className="text-cyan-300">{activeAccount.solutionTarget}</span> • Current Stage:{' '}
            <span className="text-amber-300">{activeAccount.stage.toUpperCase()}</span>
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <span className="text-slate-500 text-[10px] block">COMPOSITE SCORE</span>
            <span className="text-xl font-bold text-cyan-300">{activeAccount.compositeScore} / 100</span>
          </div>
          <button
            onClick={() => {
              playCadConfirm();
              onSelectAccount(activeAccount);
            }}
            className="px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 text-xs font-semibold cursor-pointer transition-colors"
          >
            OPEN FORENSIC INSPECTOR →
          </button>
        </div>
      </div>

      {/* Dual Track Visual Map */}
      <div className="space-y-6">
        {/* TRACK A: PLG TRACK */}
        <div className="p-4 rounded bg-[#081322] border border-cyan-500/25 space-y-4">
          <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              TRACK A: PRODUCT-LED GROWTH (PLG) BOTTOM-UP VELOCITY
            </span>
            <span className="text-[10px] text-slate-400">TELEMETRY SCORE: {activeAccount.scores.productTelemetry}/100</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            {plgJourneyNodes.map((node, i) => (
              <div
                key={node.id}
                className={`p-3 rounded border text-xs space-y-2 relative transition-all ${
                  node.status === 'COMPLETED'
                    ? 'bg-[#09182c] border-cyan-500/50 text-slate-200'
                    : node.status === 'IN_PROGRESS'
                    ? 'bg-[#081524] border-amber-500/40 text-slate-300'
                    : 'bg-[#060b13] border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-cyan-400">STEP 0{i + 1} // T+{node.milestoneDays}D</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${
                      node.status === 'COMPLETED'
                        ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                        : node.status === 'IN_PROGRESS'
                        ? 'bg-amber-950 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-500'
                    }`}
                  >
                    {node.status}
                  </span>
                </div>

                <h4 className="font-bold text-white text-xs leading-snug">{node.title}</h4>
                <p className="text-[11px] text-slate-400">{node.detail}</p>

                <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-0.5">
                  <div>ACTOR: {node.actor}</div>
                  <div className="text-cyan-400/80">{node.telemetrySignal}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CONVERGENCE NEXUS (POINT OF DUAL MOTION SYNERGY) */}
        <div className="p-3 rounded bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-cyan-950/40 border border-cyan-500/40 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
            <span className="font-bold text-white">
              CONVERGENCE NEXUS: DEMAND UNIT QUALIFIED POINT (DUQ)
            </span>
          </div>
          <span className="text-[11px] text-cyan-300">
            Product Saturation (PQL &gt; 80) + Committee Sign-Off (SLG &gt; 75) = High-Velocity Deal
          </span>
        </div>

        {/* TRACK B: SLG TRACK */}
        <div className="p-4 rounded bg-[#081322] border border-cyan-500/25 space-y-4">
          <div className="flex items-center justify-between border-b border-indigo-900/40 pb-2">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-400" />
              TRACK B: SALES-LED ENTERPRISE (SLG) TOP-DOWN COMMITTEE CLEARANCE
            </span>
            <span className="text-[10px] text-slate-400">COMMITTEE SCORE: {activeAccount.scores.committeeMaturity}/100</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
            {slgJourneyNodes.map((node, i) => (
              <div
                key={node.id}
                className={`p-3 rounded border text-xs space-y-2 relative transition-all ${
                  node.status === 'COMPLETED'
                    ? 'bg-[#0e162d] border-indigo-500/50 text-slate-200'
                    : node.status === 'IN_PROGRESS'
                    ? 'bg-[#081224] border-amber-500/40 text-slate-300'
                    : 'bg-[#060b13] border-slate-800 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-400">STEP 0{i + 1} // T+{node.milestoneDays}D</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${
                      node.status === 'COMPLETED'
                        ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                        : node.status === 'IN_PROGRESS'
                        ? 'bg-amber-950 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900 border-slate-700 text-slate-500'
                    }`}
                  >
                    {node.status}
                  </span>
                </div>

                <h4 className="font-bold text-white text-xs leading-snug">{node.title}</h4>
                <p className="text-[11px] text-slate-400">{node.detail}</p>

                <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 space-y-0.5">
                  <div>ACTOR: {node.actor}</div>
                  <div className="text-indigo-400/80">{node.telemetrySignal}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
