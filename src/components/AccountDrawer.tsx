import React, { useState } from 'react';
import {
  X,
  Shield,
  Activity,
  Zap,
  Users,
  Building,
  TrendingUp,
  Cpu,
  Mail,
  FileCheck,
  Play,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AccountDemandUnit, AutomationPlaybook } from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface AccountDrawerProps {
  account: AccountDemandUnit | null;
  onClose: () => void;
  playbooks: AutomationPlaybook[];
  onTriggerPlaybook: (playbookId: string, accountName: string) => void;
}

export const AccountDrawer: React.FC<AccountDrawerProps> = ({
  account,
  onClose,
  playbooks,
  onTriggerPlaybook,
}) => {
  if (!account) return null;

  const [notification, setNotification] = useState<string | null>(null);

  const handleExecute = (pbId: string) => {
    playCadConfirm();
    onTriggerPlaybook(pbId, account.accountName);
    const pb = playbooks.find((p) => p.id === pbId);
    setNotification(`Dispatched ${pb?.title || pbId} to ${account.accountName}`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#060c17] border-l border-cyan-500/30 h-full overflow-y-auto flex flex-col shadow-2xl relative">
        {/* CAD Blueprint Corner Marker Accents */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />

        {/* Drawer Header */}
        <div className="p-4 border-b border-cyan-500/25 bg-[#081220] flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                {account.id}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                CAD-SPEC: {account.cadCoordinates.grid}
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/60 border border-blue-500/30 text-blue-300">
                {account.primaryMotion} MOTION
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-1 flex items-center gap-2">
              {account.accountName}
              <span className="text-xs font-mono font-normal text-slate-400">
                ({account.domain})
              </span>
            </h2>
          </div>

          <button
            onClick={() => {
              playCadClick();
              onClose();
            }}
            className="p-1.5 rounded border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {notification && (
          <div className="mx-4 mt-3 p-2 rounded bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 text-xs font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{notification}</span>
          </div>
        )}

        <div className="p-4 space-y-5 flex-1">
          {/* Quick Metrics Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded bg-[#091526] border border-cyan-500/20">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Composite Score</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold font-mono text-cyan-300">
                  {account.compositeScore}
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  +{account.scoreDelta7d} (7d)
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#091526] border border-cyan-500/20">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Deal ARR Potential</span>
              <span className="text-xl font-bold font-mono text-white mt-0.5 block">
                ${(account.estDealValue / 1000).toFixed(0)}k
              </span>
              <span className="text-[10px] font-mono text-slate-400">{account.tier}</span>
            </div>

            <div className="p-2.5 rounded bg-[#091526] border border-cyan-500/20">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Committee Depth</span>
              <span className="text-xl font-bold font-mono text-amber-300 mt-0.5 block">
                {account.committee.coverageScore}%
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {account.committee.totalIdentified}/{account.committee.totalRequired} Mapped
              </span>
            </div>

            <div className="p-2.5 rounded bg-[#091526] border border-cyan-500/20">
              <span className="text-[10px] font-mono text-slate-400 block uppercase">Confidence Interval</span>
              <span className="text-xl font-bold font-mono text-emerald-300 mt-0.5 block">
                {account.confidenceLevel}%
              </span>
              <span className="text-[10px] font-mono text-slate-400">STAGE: {account.stage.toUpperCase()}</span>
            </div>
          </div>

          {/* Dual-Motion Calibrated Score Breakdown */}
          <div className="p-3.5 rounded bg-[#081220] border border-cyan-500/25 space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                CALIBRATED DUAL-MOTION COMPONENT RATIOS
              </span>
              <span className="text-[10px] font-mono text-slate-400">TOTAL 100 PTS</span>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-cyan-300">PLG: Product Ingestion &amp; Seat Velocity (30%)</span>
                  <span className="text-white font-bold">{account.scores.productTelemetry} / 100</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400" style={{ width: `${account.scores.productTelemetry}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-indigo-300">SLG: Buying Committee Maturity (25%)</span>
                  <span className="text-white font-bold">{account.scores.committeeMaturity} / 100</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-400" style={{ width: `${account.scores.committeeMaturity}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-emerald-300">Behavioral Docs &amp; Engagement (25%)</span>
                  <span className="text-white font-bold">{account.scores.behavioralEngagement} / 100</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${account.scores.behavioralEngagement}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-amber-300">3P Intent Surge &amp; Research (10%)</span>
                  <span className="text-white font-bold">{account.scores.intentSurge} / 100</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400" style={{ width: `${account.scores.intentSurge}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-purple-300">Enterprise ICP Fit (10%)</span>
                  <span className="text-white font-bold">{account.scores.firmographicFit} / 100</span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400" style={{ width: `${account.scores.firmographicFit}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Buying Committee Topology */}
          <div className="p-3.5 rounded bg-[#081220] border border-cyan-500/25 space-y-3">
            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                BUYING COMMITTEE TOPOLOGY (6 PERSONAS)
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                {account.committee.members.length} VERIFIED STAKEHOLDERS
              </span>
            </div>

            {account.committee.missingRoles.length > 0 && (
              <div className="p-2 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2">
                <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  MISSING PERSONAS: {account.committee.missingRoles.map((r) => r.replace('_', ' ').toUpperCase()).join(', ')}
                </span>
              </div>
            )}

            <div className="space-y-2">
              {account.committee.members.map((member) => (
                <div
                  key={member.id}
                  className="p-2.5 rounded bg-[#070e1a] border border-cyan-950 hover:border-cyan-500/30 transition-colors flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded bg-cyan-900/30 border border-cyan-500/30 flex items-center justify-center text-xs font-mono text-cyan-300 font-bold shrink-0">
                      {member.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{member.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                          {member.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{member.title}</p>
                      <p className="text-[10px] font-mono text-slate-500 mt-1">{member.keyNotes}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-mono font-bold text-cyan-300 block">
                      {member.engagementScore} PTS
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 block">
                      Seen {member.lastSeen}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real-Time Telemetry & Workspace Health */}
          <div className="p-3.5 rounded bg-[#081220] border border-cyan-500/25 space-y-2.5">
            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2">
              <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                PRODUCT TELEMETRY METRICS
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                WS: {account.telemetry.primaryWorkspaceId}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 rounded bg-[#070e1a] border border-cyan-950">
                <span className="text-[10px] text-slate-400 block">Active Devs (7d)</span>
                <span className="text-base font-bold text-white">{account.telemetry.activeUsers7d}</span>
              </div>
              <div className="p-2 rounded bg-[#070e1a] border border-cyan-950">
                <span className="text-[10px] text-slate-400 block">Seat Saturation</span>
                <span className="text-base font-bold text-cyan-300">{account.telemetry.seatSaturationPct}%</span>
              </div>
              <div className="p-2 rounded bg-[#070e1a] border border-cyan-950">
                <span className="text-[10px] text-slate-400 block">Monthly API Calls</span>
                <span className="text-base font-bold text-white">
                  {(account.telemetry.apiCallsMonthly / 1000000).toFixed(1)}M
                </span>
              </div>
              <div className="p-2 rounded bg-[#070e1a] border border-cyan-950">
                <span className="text-[10px] text-slate-400 block">Weekly Velocity</span>
                <span className="text-base font-bold text-emerald-400">
                  +{account.telemetry.weeklyGrowthRatePct}%
                </span>
              </div>
            </div>
          </div>

          {/* Triggerable Automation Playbooks */}
          <div className="p-3.5 rounded bg-[#081220] border border-cyan-500/25 space-y-2.5">
            <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              RECOMMENDED AUTOMATED REVENUE PLAYBOOKS
            </span>

            <div className="space-y-2">
              {playbooks.slice(0, 3).map((pb) => (
                <div
                  key={pb.id}
                  className="p-2.5 rounded bg-[#070e1a] border border-cyan-950 hover:border-cyan-500/30 transition-colors flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{pb.title}</span>
                      <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                        {pb.targetMotion}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{pb.description}</p>
                  </div>

                  <button
                    onClick={() => handleExecute(pb.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-300 text-xs font-mono font-semibold cursor-pointer shrink-0 transition-colors"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>EXECUTE</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-3 border-t border-cyan-500/25 bg-[#081220] flex items-center justify-between text-xs font-mono text-slate-400 sticky bottom-0 z-10">
          <span>ASSIGNED: {account.assignedAe} &amp; {account.assignedSdr}</span>
          <span className="text-cyan-400">LAST TELEMETRY: {account.lastTelemetryPing}</span>
        </div>
      </div>
    </div>
  );
};
