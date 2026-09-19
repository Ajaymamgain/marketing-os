import React, { useState } from 'react';
import {
  Radio,
  AlertTriangle,
  Zap,
  Filter,
  CheckCircle2,
  Bell,
  Play,
  ArrowRight,
  ShieldAlert,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { TelemetrySignal, AccountDemandUnit } from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface PiOperationsCenterViewProps {
  signals: TelemetrySignal[];
  accounts: AccountDemandUnit[];
  onSelectAccount: (account: AccountDemandUnit) => void;
}

export const PiOperationsCenterView: React.FC<PiOperationsCenterViewProps> = ({
  signals,
  accounts,
  onSelectAccount,
}) => {
  const [activeSeverity, setActiveSeverity] = useState<string>('ALL');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [acknowledgedSignals, setAcknowledgedSignals] = useState<string[]>([]);
  const [actionAlert, setActionAlert] = useState<string | null>(null);

  const handleAcknowledge = (sigId: string) => {
    playCadClick();
    setAcknowledgedSignals((prev) => [...prev, sigId]);
  };

  const handleDispatch = (sig: TelemetrySignal) => {
    playCadConfirm();
    setActionAlert(`Dispatched Automated Playbook for signal [${sig.id}] -> ${sig.accountName}`);
    setTimeout(() => setActionAlert(null), 4000);
  };

  const filtered = signals.filter((sig) => {
    if (activeSeverity !== 'ALL' && sig.severity !== activeSeverity) return false;
    if (activeCategory !== 'ALL' && sig.category !== activeCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold">
              SYS.01 // PI OPERATIONS CENTER
            </span>
            <span className="text-xs text-slate-400">PIPELINE INTELLIGENCE &amp; LIVE TRIAGE STREAM</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            Pipeline Intelligence (PI) Operations Center
          </h2>
          <p className="text-xs text-slate-400">
            Real-time telemetry event triage from product clusters, G2 intent spikes, and committee fluctuations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-[#081220] border border-cyan-500/30 text-cyan-300">
            STREAM: ONLINE (42 MS LATENCY)
          </span>
          <span className="px-2.5 py-1 rounded bg-[#081220] border border-amber-500/30 text-amber-300">
            {signals.filter((s) => s.severity === 'CRITICAL').length} CRITICAL SURGES
          </span>
        </div>
      </div>

      {actionAlert && (
        <div className="p-3 rounded bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 text-xs flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          <span>{actionAlert}</span>
        </div>
      )}

      {/* Filter and Severity Tabs */}
      <div className="p-3 rounded bg-[#081220] border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400">SEVERITY:</span>
          {['ALL', 'CRITICAL', 'SURGE', 'ELEVATED', 'NOMINAL'].map((sev) => (
            <button
              key={sev}
              onClick={() => {
                playCadClick();
                setActiveSeverity(sev);
              }}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                activeSeverity === sev
                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400">CATEGORY:</span>
          {['ALL', 'PRODUCT_SPIKE', 'COMMITTEE_GAP', 'INTENT_SURGE', 'CONTRACT_EXPIRY'].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                playCadClick();
                setActiveCategory(cat);
              }}
              className={`px-2 py-1 rounded text-[11px] transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-indigo-950 border border-indigo-400 text-indigo-200 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400'
              }`}
            >
              {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Triage Feed */}
      <div className="space-y-3">
        {filtered.map((sig) => {
          const isAcked = acknowledgedSignals.includes(sig.id);
          const matchedAcc = accounts.find((a) => a.id === sig.accountId);

          return (
            <div
              key={sig.id}
              className={`p-4 rounded border transition-all space-y-3 ${
                isAcked
                  ? 'bg-[#060b13]/60 border-slate-800 opacity-60'
                  : sig.severity === 'CRITICAL'
                  ? 'bg-[#0e101d] border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                  : 'bg-[#081322] border-cyan-500/25'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-cyan-900/30 pb-2">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded border font-bold ${
                      sig.severity === 'CRITICAL'
                        ? 'bg-rose-950 border-rose-500/40 text-rose-300'
                        : sig.severity === 'SURGE'
                        ? 'bg-amber-950 border-amber-500/40 text-amber-300'
                        : 'bg-cyan-950 border-cyan-500/40 text-cyan-300'
                    }`}
                  >
                    {sig.severity}
                  </span>
                  <span className="text-xs font-bold text-white">{sig.title}</span>
                  <span className="text-[10px] text-slate-500">{sig.id}</span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {sig.timestamp}
                  </span>
                  <span className="text-cyan-400">SCORE DELTA: +{sig.scoreImpact} PTS</span>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 max-w-3xl">
                  <p className="text-slate-300 leading-relaxed">{sig.detail}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                    <span>TARGET: <strong className="text-white">{sig.accountName}</strong></span>
                    <span>•</span>
                    <span>SOURCE: {sig.sourceFeed || 'TELEMETRY_INGEST_MESH'}</span>
                    <span>•</span>
                    <span>CATEGORY: {sig.category}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDispatch(sig)}
                    className="px-3 py-1.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Play className="w-3 h-3 text-cyan-400" />
                    <span>DISPATCH PLAYBOOK</span>
                  </button>

                  {matchedAcc && (
                    <button
                      onClick={() => {
                        playCadClick();
                        onSelectAccount(matchedAcc);
                      }}
                      className="px-2.5 py-1.5 rounded bg-[#091526] hover:bg-[#0c1c33] border border-cyan-500/30 text-slate-300 text-xs flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <span>INSPECT DU</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>
                  )}

                  {!isAcked && (
                    <button
                      onClick={() => handleAcknowledge(sig.id)}
                      className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer transition-colors"
                    >
                      ACK
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
