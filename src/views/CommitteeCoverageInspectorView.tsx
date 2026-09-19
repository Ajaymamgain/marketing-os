import React, { useState } from 'react';
import {
  Eye,
  ShieldCheck,
  AlertOctagon,
  Users,
  CheckCircle,
  FileCheck,
  Send,
  Zap,
  Sparkles,
} from 'lucide-react';
import { AccountDemandUnit, BuyingRole } from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface CommitteeCoverageInspectorViewProps {
  accounts: AccountDemandUnit[];
  onSelectAccount: (account: AccountDemandUnit) => void;
}

export const CommitteeCoverageInspectorView: React.FC<CommitteeCoverageInspectorViewProps> = ({
  accounts,
  onSelectAccount,
}) => {
  const [selectedAccId, setSelectedAccId] = useState<string>(accounts[0]?.id || '');
  const activeAccount = accounts.find((a) => a.id === selectedAccId) || accounts[0];
  const [dispatchAlert, setDispatchAlert] = useState<string | null>(null);

  const allRoles: { role: BuyingRole; label: string; desc: string }[] = [
    { role: 'technical_champion', label: 'Technical Champion', desc: 'Validates architecture, drives internal adoption.' },
    { role: 'economic_buyer', label: 'Economic Buyer', desc: 'Owns P&L budget, signs purchase requisition.' },
    { role: 'security_infosec', label: 'Security & InfoSec', desc: 'Conducts compliance, audit, and SOC2 CAIQ checks.' },
    { role: 'day_to_day_evaluator', label: 'Day-to-Day Evaluator', desc: 'Daily hands-on keyboard developer/operator.' },
    { role: 'procurement', label: 'Procurement & Legal', desc: 'Negotiates commercial terms and MSA contracts.' },
    { role: 'executive_sponsor', label: 'Executive Sponsor', desc: 'VP / C-Level with strategic corporate mandate.' },
  ];

  const handleDispatch = (actionName: string) => {
    playCadConfirm();
    setDispatchAlert(`Executed: [${actionName}] targeted to ${activeAccount.accountName}`);
    setTimeout(() => setDispatchAlert(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold">
              SYS.01 // FORENSIC INSPECTOR
            </span>
            <span className="text-xs text-slate-400">STAKEHOLDER PENETRATION &amp; RISK AUDIT</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            Buying Committee Coverage Inspector
          </h2>
          <p className="text-xs text-slate-400">
            Deep-dive forensic evaluation of committee role completeness, sentiment distribution, and deal risk factors.
          </p>
        </div>

        {/* Account Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">INSPECTING:</span>
          <select
            value={selectedAccId}
            onChange={(e) => {
              playCadClick();
              setSelectedAccId(e.target.value);
            }}
            className="bg-[#091526] border border-cyan-500/40 rounded px-3 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 font-mono cursor-pointer"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.accountName} ({a.committee.coverageScore}% Covered)
              </option>
            ))}
          </select>
        </div>
      </div>

      {dispatchAlert && (
        <div className="p-3 rounded bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{dispatchAlert}</span>
        </div>
      )}

      {/* Account Metric Banner */}
      <div className="p-4 rounded bg-[#081220] border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">{activeAccount.accountName}</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
              {activeAccount.primaryMotion}
            </span>
            <span className="text-[10px] text-slate-400">GRID SECTOR: {activeAccount.cadCoordinates.grid}</span>
          </div>
          <p className="text-xs text-slate-400">
            Solution Target: <span className="text-cyan-300">{activeAccount.solutionTarget}</span> • Deal Value:{' '}
            <span className="text-white font-bold">${(activeAccount.estDealValue / 1000).toFixed(0)}k</span>
          </p>
        </div>

        <div className="flex items-center gap-5 text-xs">
          <div className="text-right">
            <span className="text-slate-400 text-[10px] block">COMMITTEE COVERAGE</span>
            <span className="text-2xl font-bold text-amber-300">
              {activeAccount.committee.coverageScore}%
            </span>
          </div>

          <div className="text-right pl-4 border-l border-slate-800">
            <span className="text-slate-400 text-[10px] block">RISK STATUS</span>
            <span
              className={`text-sm font-bold block ${
                activeAccount.committee.missingRoles.length === 0
                  ? 'text-emerald-400'
                  : activeAccount.committee.missingRoles.includes('economic_buyer')
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}
            >
              {activeAccount.committee.missingRoles.length === 0
                ? 'LOW RISK'
                : activeAccount.committee.missingRoles.includes('economic_buyer')
                ? 'HIGH RISK'
                : 'MODERATE'}
            </span>
          </div>
        </div>
      </div>

      {/* 6-Persona Forensic Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            6-PERSONA PENETRATION AUDIT MATRIX
          </span>
          <span className="text-[10px] text-slate-400">
            {activeAccount.committee.totalIdentified} IDENTIFIED / {activeAccount.committee.totalRequired} MANDATORY
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {allRoles.map((rInfo) => {
            const member = activeAccount.committee.members.find((m) => m.role === rInfo.role);
            const isMissing = !member;

            return (
              <div
                key={rInfo.role}
                className={`p-3.5 rounded border transition-all space-y-2.5 relative ${
                  isMissing
                    ? 'bg-[#080f1a] border-dashed border-amber-500/40'
                    : 'bg-[#081322] border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.1)]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{rInfo.label}</span>
                  {isMissing ? (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950/80 border border-amber-500/40 text-amber-300 font-bold">
                      MISSING
                    </span>
                  ) : (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${
                        member.sentiment === 'CHAMPION' || member.sentiment === 'positive'
                          ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                          : 'bg-cyan-950 border-cyan-500/40 text-cyan-300'
                      }`}
                    >
                      {member.sentiment}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400">{rInfo.desc}</p>

                {member ? (
                  <div className="p-2.5 rounded bg-[#060b13] border border-cyan-950 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-200">{member.name}</span>
                      <span className="text-[10px] text-cyan-400">{member.engagementScore} PTS</span>
                    </div>
                    <p className="text-[11px] text-slate-400">{member.title}</p>
                    <p className="text-[10px] text-slate-500 italic mt-1">"{member.keyNotes}"</p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/40 space-y-1.5 text-xs text-amber-300">
                    <span className="text-[11px] block font-semibold">Deal Vulnerability:</span>
                    <p className="text-[10px] text-slate-400">
                      Unmapped role. May stall the deal during commercial contract or procurement sign-off.
                    </p>
                    <button
                      onClick={() => handleDispatch(`Multi-thread outreach for ${rInfo.label}`)}
                      className="mt-1 w-full py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      DISPATCH DISCOVERY PLAYBOOK →
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Forensic Remediation Actions */}
      <div className="p-4 rounded bg-[#081220] border border-cyan-500/30 space-y-3">
        <h4 className="text-xs font-bold text-cyan-300 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          FORENSIC RISK REMEDIATION ACTIONS (ONE-CLICK DISPATCH)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <button
            onClick={() => handleDispatch('Executive Sponsor Alignment Memo')}
            className="p-3 rounded bg-[#070e1a] hover:bg-[#0a1628] border border-cyan-500/25 hover:border-cyan-400 text-left cursor-pointer transition-all space-y-1 group"
          >
            <span className="text-white font-bold group-hover:text-cyan-300 transition-colors block">
              1. Executive Alignment Memo
            </span>
            <p className="text-[11px] text-slate-400">
              Generates customized VP-level ROI cost reduction model and delivers to primary contacts.
            </p>
          </button>

          <button
            onClick={() => handleDispatch('InfoSec Fast-Track Security CAIQ Package')}
            className="p-3 rounded bg-[#070e1a] hover:bg-[#0a1628] border border-cyan-500/25 hover:border-cyan-400 text-left cursor-pointer transition-all space-y-1 group"
          >
            <span className="text-white font-bold group-hover:text-cyan-300 transition-colors block">
              2. InfoSec Fast-Track Packet
            </span>
            <p className="text-[11px] text-slate-400">
              Pre-emptively dispatches SOC2 Type II, FedRAMP, and architecture schematics to CISO desk.
            </p>
          </button>

          <button
            onClick={() => handleDispatch('Product Telemetry Proof-of-Value Summary')}
            className="p-3 rounded bg-[#070e1a] hover:bg-[#0a1628] border border-cyan-500/25 hover:border-cyan-400 text-left cursor-pointer transition-all space-y-1 group"
          >
            <span className="text-white font-bold group-hover:text-cyan-300 transition-colors block">
              3. Telemetry POV Summary
            </span>
            <p className="text-[11px] text-slate-400">
              Summarizes the {activeAccount.telemetry.activeUsers7d} developers' usage metrics into commercial justification.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
};
