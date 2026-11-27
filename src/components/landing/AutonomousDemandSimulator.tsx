import React, { useState, useEffect, useMemo } from 'react';
import { AccountDemandUnit, BuyingRole } from '../../types';
import {
  Cpu,
  Activity,
  Users,
  BarChart3,
  Zap,
  ShieldCheck,
  Orbit,
  Terminal,
  RotateCcw,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Play,
  Pause,
  Layers,
  Radio,
  Sliders,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { playCadClick, playCadConfirm, playCadBlip } from '../../utils/audio';

export type CommitteeRoleKey =
  | 'economic_buyer'
  | 'champion'
  | 'technical_evaluator'
  | 'security_infosec'
  | 'procurement'
  | 'end_user';

interface AutonomousDemandSimulatorProps {
  accounts: AccountDemandUnit[];
  theme?: 'dark' | 'light';
  onNavigateTab?: (tab: any) => void;
  onSelectAccount?: (account: AccountDemandUnit) => void;
  isInnerView?: boolean;
}

interface SimulatedEvent {
  id: string;
  timestamp: string;
  type: 'TELEMETRY' | 'COMMITTEE' | 'INTENT' | 'PLAYBOOK';
  message: string;
  impact: string;
}

export const AutonomousDemandSimulator: React.FC<AutonomousDemandSimulatorProps> = ({
  accounts,
  theme = 'dark',
  onNavigateTab,
  onSelectAccount,
  isInnerView = false,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || 'DU-8092');
  const [isSandboxMode, setIsSandboxMode] = useState<boolean>(false);

  // Active Account
  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  }, [accounts, selectedAccountId]);

  // 5-Vector Scores
  const [telemetry, setTelemetry] = useState<number>(selectedAccount?.scores.productTelemetry || 92);
  const [committee, setCommittee] = useState<number>(selectedAccount?.scores.committeeMaturity || 88);
  const [behavioral, setBehavioral] = useState<number>(selectedAccount?.scores.behavioralEngagement || 85);
  const [intent, setIntent] = useState<number>(selectedAccount?.scores.intentSurge || 90);
  const [fit, setFit] = useState<number>(selectedAccount?.scores.firmographicFit || 95);

  // 6 Persona interactive toggle map
  const [personaEngaged, setPersonaEngaged] = useState<Record<CommitteeRoleKey, boolean>>({
    economic_buyer: true,
    champion: true,
    technical_evaluator: true,
    security_infosec: true,
    procurement: false,
    end_user: true,
  });

  // Simulated Telemetry Stream
  const [streamLog, setStreamLog] = useState<SimulatedEvent[]>([
    {
      id: 'EVT-101',
      timestamp: '14:22:04.120',
      type: 'TELEMETRY',
      message: 'Snowflake Ingest: +54 weekly active devs in kubernetes cluster',
      impact: '+4.2 pts telemetry',
    },
    {
      id: 'EVT-102',
      timestamp: '14:22:05.890',
      type: 'COMMITTEE',
      message: 'Agent Beta: VP of Platform Eng viewed enterprise pricing',
      impact: 'Economic Buyer Identified',
    },
    {
      id: 'EVT-103',
      timestamp: '14:22:08.410',
      type: 'INTENT',
      message: 'Bombora Surge: G2 Grid intent spike 94.2 (Tier 1)',
      impact: '+12 pts surge velocity',
    },
  ]);

  // Autonomous Agent heartbeats
  const [agentLoopRunning, setAgentLoopRunning] = useState<boolean>(true);
  const [recentActionNotice, setRecentActionNotice] = useState<string | null>(null);

  // Update vectors when switching account
  useEffect(() => {
    if (!isSandboxMode && selectedAccount) {
      setTelemetry(selectedAccount.scores.productTelemetry);
      setCommittee(selectedAccount.scores.committeeMaturity);
      setBehavioral(selectedAccount.scores.behavioralEngagement);
      setIntent(selectedAccount.scores.intentSurge);
      setFit(selectedAccount.scores.firmographicFit);

      // Map personas
      const hasEB = selectedAccount.committee.economicBuyerEngaged;
      const hasChamp = selectedAccount.committee.championIdentified;
      const hasSec = selectedAccount.committee.securitySignedOff;

      setPersonaEngaged({
        economic_buyer: hasEB,
        champion: hasChamp,
        technical_evaluator: true,
        security_infosec: hasSec,
        procurement: selectedAccount.stage === 'pipeline_deal' || selectedAccount.stage === 'closed_won' || selectedAccount.stage === 'expansion',
        end_user: true,
      });
    }
  }, [selectedAccountId, isSandboxMode, selectedAccount]);

  // Calculate composite score dynamically: 30% telemetry, 25% committee, 25% behavioral, 10% intent, 10% fit
  const compositeScore = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        telemetry * 0.3 + committee * 0.25 + behavioral * 0.25 + intent * 0.1 + fit * 0.1
      )
    )
  );

  // Calculate stage from composite
  const stageInfo = useMemo(() => {
    if (compositeScore >= 85 && personaEngaged.security_infosec && personaEngaged.economic_buyer) {
      return {
        label: 'QUALIFIED DEMAND UNIT (STAGE GATE 04)',
        code: 'STAGE_04_QDU',
        color: 'text-emerald-400 bg-emerald-950/70 border-emerald-500/40',
        badge: 'READY FOR PIPELINE',
      };
    }
    if (compositeScore >= 72) {
      return {
        label: 'PRIORITIZED DEMAND UNIT (STAGE GATE 03)',
        code: 'STAGE_03_PDU',
        color: 'text-cyan-300 bg-cyan-950/70 border-cyan-400/40',
        badge: 'COMMITTEE SOURCING',
      };
    }
    if (compositeScore >= 50) {
      return {
        label: 'ENGAGED TELEMETRY (STAGE GATE 02)',
        code: 'STAGE_02_ENG',
        color: 'text-amber-400 bg-amber-950/70 border-amber-500/40',
        badge: 'WARM USAGE',
      };
    }
    return {
      label: 'IN-MARKET TARGET (STAGE GATE 01)',
      code: 'STAGE_01_MKT',
      color: 'text-slate-400 bg-slate-900/80 border-slate-700',
      badge: 'MONITORING',
    };
  }, [compositeScore, personaEngaged]);

  // Single-thread risk calculation
  const isSingleThreaded = personaEngaged.champion && !personaEngaged.economic_buyer;
  const isInfosecBlocked = compositeScore >= 75 && !personaEngaged.security_infosec;

  // Toggle committee member
  const handleTogglePersona = (role: CommitteeRoleKey) => {
    playCadClick();
    const nextState = !personaEngaged[role];
    setPersonaEngaged((prev) => ({ ...prev, [role]: nextState }));

    // Recalculate committee score
    const totalCount = Object.values({ ...personaEngaged, [role]: nextState }).filter(Boolean).length;
    const newCommitteeScore = Math.round((totalCount / 6) * 100);
    setCommittee(newCommitteeScore);

    // Add log
    const now = new Date().toISOString().substring(11, 23);
    setStreamLog((prev) => [
      {
        id: `EVT-${Date.now().toString().slice(-4)}`,
        timestamp: now,
        type: 'COMMITTEE',
        message: `Agent Beta: Buying committee ${role.replace('_', ' ').toUpperCase()} marked as ${nextState ? 'ENGAGED' : 'UNMAPPED'}`,
        impact: `${nextState ? '+' : '-'}${Math.round(100 / 6)}% coverage`,
      },
      ...prev.slice(0, 7),
    ]);
  };

  // Playbook execution simulation
  const handleExecutePlaybook = (actionName: string, deltaTelemetry = 0, deltaIntent = 0, deltaCommittee = 0) => {
    playCadConfirm();
    setTelemetry((prev) => Math.min(100, Math.max(0, prev + deltaTelemetry)));
    setIntent((prev) => Math.min(100, Math.max(0, prev + deltaIntent)));
    setCommittee((prev) => Math.min(100, Math.max(0, prev + deltaCommittee)));

    setRecentActionNotice(`DISPATCHED: ${actionName}`);
    setTimeout(() => setRecentActionNotice(null), 3000);

    const now = new Date().toISOString().substring(11, 23);
    setStreamLog((prev) => [
      {
        id: `EVT-${Date.now().toString().slice(-4)}`,
        timestamp: now,
        type: 'PLAYBOOK',
        message: `Agent Gamma executed: ${actionName}`,
        impact: `Telemetry: +${deltaTelemetry} | Intent: +${deltaIntent}`,
      },
      ...prev.slice(0, 7),
    ]);
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        theme === 'light'
          ? 'bg-white border-slate-300 shadow-xl'
          : 'bg-[#050c18] border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.12)]'
      }`}
    >
      {/* CAD Simulator Header Micro-Strip */}
      <div
        className={`px-4 sm:px-6 py-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
          theme === 'light'
            ? 'bg-slate-100 border-slate-300 text-slate-800'
            : 'bg-[#030813] border-cyan-500/20 text-cyan-400'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>SYS.01 // AUTONOMOUS DEMAND UNIT SIMULATION ENGINE</span>
          </div>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline text-slate-400 font-normal">
            REALTIME VECTOR CALCULUS &amp; COMMITTEE STAGING
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">AGENT LOOP:</span>
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>ACTIVE (420 EVT/S)</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              playCadClick();
              setIsSandboxMode(!isSandboxMode);
            }}
            className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-all cursor-pointer ${
              isSandboxMode
                ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : theme === 'light'
                ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                : 'bg-[#091526] text-cyan-300 border-cyan-500/30 hover:bg-cyan-900/60'
            }`}
          >
            {isSandboxMode ? 'SANDBOX MODE (CUSTOM)' : 'ACCOUNT PRESET'}
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Top Control Grid: Account Selector, 4 Autonomous Agents Monitor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Account Target Picker */}
          <div className="lg:col-span-6">
            <label className="block text-xs font-mono text-slate-400 mb-2 uppercase tracking-wider">
              TARGET ACCOUNT DEMAND UNIT:
            </label>
            <div className="flex flex-wrap gap-2">
              {accounts.slice(0, 6).map((acc) => {
                const isSelected = !isSandboxMode && acc.id === selectedAccountId;
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => {
                      playCadClick();
                      setIsSandboxMode(false);
                      setSelectedAccountId(acc.id);
                    }}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? theme === 'light'
                          ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                          : 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                        : theme === 'light'
                        ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                        : 'bg-[#081222] text-slate-300 border-cyan-500/25 hover:border-cyan-400/50 hover:bg-cyan-950/40'
                    }`}
                  >
                    {acc.accountName.split(' ')[0]} ({acc.scores.productTelemetry}%)
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4 Autonomous Agents Real-Time Ticker */}
          <div
            className={`lg:col-span-6 p-3 rounded-xl border grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#030914] border-cyan-500/20'
            }`}
          >
            <div>
              <div className="text-slate-500 text-[10px]">AGENT ALPHA</div>
              <div className="font-bold text-cyan-400 flex items-center gap-1">
                <Activity className="w-3 h-3 animate-pulse" />
                <span>TELEMETRY</span>
              </div>
              <div className="text-[9px] text-emerald-400">SYNCED</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px]">AGENT BETA</div>
              <div className="font-bold text-indigo-400 flex items-center gap-1">
                <Users className="w-3 h-3" />
                <span>COMMITTEE</span>
              </div>
              <div className="text-[9px] text-cyan-300">6 ROLES</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px]">AGENT GAMMA</div>
              <div className="font-bold text-amber-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>PLAYBOOKS</span>
              </div>
              <div className="text-[9px] text-amber-300">ARMED</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px]">AGENT DELTA</div>
              <div className="font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>INFOSEC</span>
              </div>
              <div className="text-[9px] text-emerald-300">DEMO GATE</div>
            </div>
          </div>
        </div>

        {/* Main Simulation Deck: Left 7 cols Sliders, Right 5 cols Output & Real-time Calculus */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sliders & Persona Grid (Left 7 cols) */}
          <div
            className={`lg:col-span-7 p-5 sm:p-6 rounded-xl border space-y-6 ${
              theme === 'light' ? 'bg-slate-50/70 border-slate-300' : 'bg-[#060e1d] border-cyan-500/25'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-cyan-500/20">
              <span className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>5-VECTOR DUAL-MOTION TUNING MATRIX</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  playCadClick();
                  setTelemetry(85);
                  setCommittee(75);
                  setBehavioral(70);
                  setIntent(88);
                  setFit(95);
                  setPersonaEngaged({
                    economic_buyer: true,
                    champion: true,
                    technical_evaluator: true,
                    security_infosec: true,
                    procurement: false,
                    end_user: true,
                  });
                }}
                className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-200 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>RESET VECTORS</span>
              </button>
            </div>

            {/* Slider 1: Telemetry */}
            <div>
              <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  PRODUCT TELEMETRY (PLG WEIGHT: 30%)
                </span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    theme === 'light' ? 'bg-sky-100 text-sky-800' : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {telemetry}/100 [{(telemetry * 0.3).toFixed(1)} PTS]
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={telemetry}
                onChange={(e) => setTelemetry(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                <span>0 DAU / Cold usage</span>
                <span>Threshold: PQL 80+</span>
                <span>120+ Seats / High velocity</span>
              </div>
            </div>

            {/* Slider 2: Committee Maturity */}
            <div>
              <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  BUYING COMMITTEE COVERAGE (SLG WEIGHT: 25%)
                </span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    theme === 'light'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  {committee}/100 [{(committee * 0.25).toFixed(1)} PTS]
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={committee}
                onChange={(e) => setCommittee(Number(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
                <span>Single-threaded developer</span>
                <span>Consensus Quorum</span>
                <span>Full 6-persona alignment</span>
              </div>
            </div>

            {/* Slider 3: Behavioral Engagement */}
            <div>
              <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                <span className="font-bold flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  BEHAVIORAL ENGAGEMENT (WEIGHT: 25%)
                </span>
                <span
                  className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                    theme === 'light'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {behavioral}/100 [{(behavioral * 0.25).toFixed(1)} PTS]
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={behavioral}
                onChange={(e) => setBehavioral(Number(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Slider 4 & 5 Compact Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="flex justify-between items-center text-xs font-mono mb-1">
                  <span className="font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    INTENT SURGE (10%)
                  </span>
                  <span className="font-bold text-amber-400">{intent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={intent}
                  onChange={(e) => setIntent(Number(e.target.value))}
                  className="w-full accent-amber-400 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-xs font-mono mb-1">
                  <span className="font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-cyan-400" />
                    ICP FIT (10%)
                  </span>
                  <span className="font-bold text-cyan-400">{fit}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fit}
                  onChange={(e) => setFit(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>
            </div>

            {/* 6-Persona Interactive Buying Committee Matrix */}
            <div className="pt-4 border-t border-cyan-500/20">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  <span>INTERACTIVE BUYING COMMITTEE QUORUM (CLICK TO TOGGLE):</span>
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {Object.values(personaEngaged).filter(Boolean).length}/6 ENGAGED
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { role: 'economic_buyer' as const, label: 'Economic Buyer', desc: 'VP / Budget Owner' },
                  { role: 'champion' as const, label: 'Champion', desc: 'Tech Lead / Sponsor' },
                  { role: 'technical_evaluator' as const, label: 'Tech Evaluator', desc: 'Staff Architect' },
                  { role: 'security_infosec' as const, label: 'Security / Infosec', desc: 'CISO / Risk Analyst' },
                  { role: 'procurement' as const, label: 'Procurement', desc: 'Vendor Legal / MSA' },
                  { role: 'end_user' as const, label: 'End User', desc: 'Dev Team Lead' },
                ].map((p) => {
                  const isEngaged = personaEngaged[p.role];
                  return (
                    <button
                      key={p.role}
                      type="button"
                      onClick={() => handleTogglePersona(p.role)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isEngaged
                          ? theme === 'light'
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-950'
                            : 'bg-indigo-950/60 border-indigo-400/60 text-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
                          : theme === 'light'
                          ? 'bg-slate-100 border-slate-300 text-slate-400 hover:bg-slate-200/60'
                          : 'bg-[#071120] border-cyan-500/20 text-slate-500 hover:border-cyan-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-bold">{p.label}</span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isEngaged ? 'bg-emerald-400' : 'bg-slate-600'
                          }`}
                        />
                      </div>
                      <div className="text-[10px] font-mono opacity-80">{p.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Warnings / Governance Alerts */}
              {isSingleThreaded && (
                <div className="mt-3 p-2.5 rounded border border-amber-500/40 bg-amber-950/40 text-amber-300 text-xs font-mono flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                  <span>
                    WARNING: Single-thread derailment risk detected. Champion is active but Economic Buyer is unmapped!
                  </span>
                </div>
              )}

              {isInfosecBlocked && (
                <div className="mt-2 p-2.5 rounded border border-cyan-500/40 bg-cyan-950/40 text-cyan-300 text-xs font-mono flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    INFOSEC GATEWAY: Score {compositeScore}+ meets enterprise threshold. Stage Gate requires SOC-2 &amp; Infosec sign-off.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Real-time Stage Gate Engine, Playbook Sandbox & Telemetry Stream (Right 5 cols) */}
          <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
            {/* Top Score Readout Card */}
            <div
              className={`p-6 rounded-xl border ${
                theme === 'light'
                  ? 'bg-white border-slate-300 shadow-md'
                  : 'bg-[#060e1b] border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 mb-4">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-mono font-bold">COMPOSITE DEMAND QUALIFICATION</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">MATH REVENUE MODEL</span>
              </div>

              <div className="text-center py-4">
                <div
                  className={`text-6xl sm:text-7xl font-mono font-extrabold tracking-tight ${
                    compositeScore >= 80
                      ? 'text-emerald-400'
                      : compositeScore >= 65
                      ? 'text-cyan-300'
                      : 'text-amber-400'
                  }`}
                >
                  {compositeScore}
                  <span className="text-2xl text-slate-500 font-normal">/100</span>
                </div>

                <div className="mt-3">
                  <span className={`inline-block px-3 py-1 rounded text-xs font-mono font-bold border ${stageInfo.color}`}>
                    {stageInfo.label}
                  </span>
                </div>
              </div>

              {/* Real-time Math Calculus */}
              <div
                className={`p-3 rounded border text-[11px] font-mono space-y-1.5 ${
                  theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-[#091526] border-cyan-500/20 text-slate-300'
                }`}
              >
                <div className="flex justify-between">
                  <span>Product Telemetry (30%):</span>
                  <span className="font-bold text-cyan-400">{(telemetry * 0.3).toFixed(1)} pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Committee Quorum (25%):</span>
                  <span className="font-bold text-indigo-400">{(committee * 0.25).toFixed(1)} pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Behavioral Pings (25%):</span>
                  <span className="font-bold text-emerald-400">{(behavioral * 0.25).toFixed(1)} pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Intent Surge (10%):</span>
                  <span className="font-bold text-amber-400">{(intent * 0.1).toFixed(1)} pts</span>
                </div>
                <div className="flex justify-between">
                  <span>Firmographic Fit (10%):</span>
                  <span className="font-bold text-cyan-400">{(fit * 0.1).toFixed(1)} pts</span>
                </div>
              </div>
            </div>

            {/* Autonomous Playbook Dispatcher (Interactive Action Buttons) */}
            <div
              className={`p-4 rounded-xl border ${
                theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#060e1c] border-cyan-500/25'
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" />
                  <span>SIMULATE AUTONOMOUS ACTION PLAYBOOK:</span>
                </span>
                {recentActionNotice && (
                  <span className="text-[10px] font-mono text-emerald-400 animate-pulse font-bold">
                    {recentActionNotice}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleExecutePlaybook('Infosec Fast-Track Automation', 0, 8, 15)}
                  className={`p-2 rounded text-[11px] font-mono font-bold border text-left transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-white hover:bg-emerald-50 border-slate-300 text-slate-800'
                      : 'bg-[#091526] hover:bg-emerald-950/60 border-cyan-500/30 text-emerald-300'
                  }`}
                >
                  <div className="font-bold text-emerald-400">1. Fast-Track Infosec</div>
                  <div className="text-[9px] text-slate-400">+15% Committee sign-off</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecutePlaybook('Simulate +60 Dev Seats Expansion', 15, 0, 5)}
                  className={`p-2 rounded text-[11px] font-mono font-bold border text-left transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-white hover:bg-sky-50 border-slate-300 text-slate-800'
                      : 'bg-[#091526] hover:bg-cyan-950/60 border-cyan-500/30 text-cyan-300'
                  }`}
                >
                  <div className="font-bold text-cyan-400">2. +60 PLG Dev Surge</div>
                  <div className="text-[9px] text-slate-400">+15 pts Telemetry vector</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecutePlaybook('3-Thread Executive Briefing Cadence', 0, 10, 20)}
                  className={`p-2 rounded text-[11px] font-mono font-bold border text-left transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-white hover:bg-indigo-50 border-slate-300 text-slate-800'
                      : 'bg-[#091526] hover:bg-indigo-950/60 border-cyan-500/30 text-indigo-300'
                  }`}
                >
                  <div className="font-bold text-indigo-400">3. Exec Briefing Cadence</div>
                  <div className="text-[9px] text-slate-400">+20% Buyer Quorum</div>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecutePlaybook('Direct Route to Enterprise AE', 5, 12, 10)}
                  className={`p-2 rounded text-[11px] font-mono font-bold border text-left transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-white hover:bg-amber-50 border-slate-300 text-slate-800'
                      : 'bg-[#091526] hover:bg-amber-950/60 border-cyan-500/30 text-amber-300'
                  }`}
                >
                  <div className="font-bold text-amber-400">4. Route to Named AE</div>
                  <div className="text-[9px] text-slate-400">Instant SLA escalation</div>
                </button>
              </div>
            </div>

            {/* Live Streaming Telemetry Feed */}
            <div
              className={`p-3 rounded-xl border font-mono text-[10px] ${
                theme === 'light' ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-[#030712] text-cyan-300 border-cyan-500/30'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-700 dark:border-cyan-500/20 mb-2">
                <span className="flex items-center gap-1.5 text-cyan-400 font-bold">
                  <Terminal className="w-3 h-3 text-cyan-400" />
                  <span>CAD://TELEMETRY_LOG_STREAM</span>
                </span>
                <span className="text-[9px] text-emerald-400 animate-pulse">INGESTING</span>
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto font-mono pr-1">
                {streamLog.map((evt) => (
                  <div key={evt.id} className="flex items-start justify-between gap-2 border-b border-slate-800 pb-1">
                    <div>
                      <span className="text-slate-500">[{evt.timestamp}]</span>{' '}
                      <span className="text-slate-200">{evt.message}</span>
                    </div>
                    <span className="text-cyan-400 font-bold shrink-0">{evt.impact}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Link to the autonomous decision plane */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  playCadConfirm();
                  onNavigateTab?.('AUTOMATION');
                }}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-mono text-xs font-bold border transition-all cursor-pointer shadow-md ${
                  theme === 'light'
                    ? 'bg-sky-50 hover:bg-sky-100 border-sky-400 text-sky-950 shadow-xs'
                    : 'bg-cyan-950/90 hover:bg-cyan-900 border-cyan-400/80 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                }`}
              >
                <Orbit className="w-4 h-4 text-cyan-400" />
                <span>VIEW JEV AUTOMATION DECISION LOG</span>
              </button>

              {isInnerView ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      playCadConfirm();
                      if (selectedAccount && onSelectAccount) {
                        onSelectAccount(selectedAccount);
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer border ${
                      theme === 'light'
                        ? 'bg-white hover:bg-slate-50 border-slate-300 text-slate-800'
                        : 'bg-[#091526] hover:bg-[#0d1e38] border-cyan-500/40 text-cyan-300'
                    }`}
                  >
                    <span>OPEN DRAWER SPEC</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playCadConfirm();
                      if (onNavigateTab) {
                        onNavigateTab('COMMITTEES');
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-sky-600 hover:bg-sky-700 text-white'
                        : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold'
                    }`}
                  >
                    <span>COMMITTEE ST.03</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigateTab?.('DEMAND_UNITS')}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-xs font-bold transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-200'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  }`}
                >
                  <span>OPEN FULL SCORING WORKSTATION [ST.02]</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
