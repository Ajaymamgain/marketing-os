import React, { useState } from 'react';
import {
  Zap,
  Play,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { AutomationPlaybook, AccountDemandUnit } from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface SignalsPlaybooksViewProps {
  playbooks: AutomationPlaybook[];
  accounts: AccountDemandUnit[];
  onTriggerPlaybook: (playbookId: string, accountName: string) => void;
}

export const SignalsPlaybooksView: React.FC<SignalsPlaybooksViewProps> = ({
  playbooks: initialPlaybooks,
  accounts,
  onTriggerPlaybook,
}) => {
  const [playbooks, setPlaybooks] = useState(
    initialPlaybooks.map((p) => ({
      ...p,
      enabled: p.enabled !== undefined ? p.enabled : p.status !== 'PAUSED',
      executionsCount: p.executionsCount ?? p.executionCount ?? 0,
      successRatePct: p.successRatePct ?? p.successRate ?? 92.5,
    }))
  );
  const [selectedTargetAccount, setSelectedTargetAccount] = useState(accounts[0]?.accountName || '');
  const [notification, setNotification] = useState<string | null>(null);

  const togglePlaybook = (id: string) => {
    playCadClick();
    setPlaybooks((prev) =>
      prev.map((pb) => (pb.id === id ? { ...pb, enabled: !pb.enabled } : pb))
    );
  };

  const handleExecute = (pb: any) => {
    playCadConfirm();
    onTriggerPlaybook(pb.id, selectedTargetAccount);
    setPlaybooks((prev) =>
      prev.map((p) => (p.id === pb.id ? { ...p, executionsCount: (p.executionsCount || 0) + 1 } : p))
    );
    setNotification(`Successfully executed [${pb.title}] targeted to ${selectedTargetAccount}`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold">
              SYS.01 // PLAYBOOKS AUTOMATION
            </span>
            <span className="text-xs text-slate-400">REVENUE OPERATIONS WORKFLOW ORCHESTRATION</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            Automated RevOps Playbooks &amp; Signal Triggers
          </h2>
          <p className="text-xs text-slate-400">
            Autonomous workflows triggered by product telemetry spikes, committee gaps, or competitive intent surges.
          </p>
        </div>

        {/* Global Dispatch Target Selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">MANUAL TEST DISPATCH TARGET:</span>
          <select
            value={selectedTargetAccount}
            onChange={(e) => {
              playCadClick();
              setSelectedTargetAccount(e.target.value);
            }}
            className="bg-[#091526] border border-cyan-500/40 rounded px-3 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-400 font-mono cursor-pointer"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.accountName}>
                {a.accountName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {notification && (
        <div className="p-3 rounded bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Playbooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {playbooks.map((pb) => {
          const triggerText = pb.trigger || pb.triggerCondition || 'Signal threshold breached';
          const actionsList = pb.actions || (pb.actionSummary ? pb.actionSummary.split('. ') : ['Dispatch automated signal cadence']);

          return (
            <div
              key={pb.id}
              className={`p-4 rounded border transition-all space-y-3.5 flex flex-col justify-between ${
                pb.enabled
                  ? 'bg-[#081322] border-cyan-500/30 hover:border-cyan-400/50'
                  : 'bg-[#060b13] border-slate-800 opacity-60'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-500/40 text-cyan-300">
                      {pb.id}
                    </span>
                    <span className="text-xs font-bold text-white">{pb.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 border border-blue-500/30 text-blue-300">
                      {pb.targetMotion}
                    </span>
                    <button
                      onClick={() => togglePlaybook(pb.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        pb.enabled
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {pb.enabled ? 'ACTIVE' : 'PAUSED'}
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{pb.description}</p>

                <div className="p-2.5 rounded bg-[#060c17] border border-cyan-950 space-y-1.5 text-xs">
                  <div className="text-[11px] text-amber-300 font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    TRIGGER: {triggerText}
                  </div>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    <span className="text-slate-500 block text-[10px] uppercase">Automated Actions:</span>
                    {actionsList.map((act: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-cyan-400">→</span>
                        <span>{act}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-cyan-950 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span>RUNS: <strong className="text-white">{pb.executionsCount}</strong></span>
                  <span>•</span>
                  <span>SUCCESS: <strong className="text-emerald-400">{pb.successRatePct}%</strong></span>
                </div>

                <button
                  onClick={() => handleExecute(pb)}
                  disabled={!pb.enabled}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
                    pb.enabled
                      ? 'bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 cursor-pointer'
                      : 'bg-slate-900 border border-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                  <span>DISPATCH TEST RUN</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
