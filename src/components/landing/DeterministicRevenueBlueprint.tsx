import React, { useState } from 'react';
import {
  Layers,
  Network,
  ShieldCheck,
  Zap,
  Activity,
  Users,
  Filter,
  ArrowRight,
  Database,
  Radio,
  CheckCircle2,
  Clock,
  Lock,
  Compass,
  Cpu,
} from 'lucide-react';
import { playCadClick, playCadConfirm } from '../../utils/audio';

interface DeterministicRevenueBlueprintProps {
  theme?: 'dark' | 'light';
  onNavigateTab: (tab: any) => void;
}

export const DeterministicRevenueBlueprint: React.FC<DeterministicRevenueBlueprintProps> = ({
  theme = 'dark',
  onNavigateTab,
}) => {
  const [activeView, setActiveView] = useState<'PIPELINE' | 'TOPOLOGY' | 'CONNECTORS'>('PIPELINE');
  const [selectedStage, setSelectedStage] = useState<number>(3); // 0-indexed stage 4 (Qualified DU)

  const stages = [
    {
      step: '01',
      code: 'STAGE_01_MKT',
      name: 'In-Market Account',
      focus: 'Firmographic ICP & 3rd-Party Intent',
      gateCriteria: 'ICP Tier 1-2 Fit score >= 70, Bombora surge score >= 60',
      plgRole: 'Domain registered on public developer docs or OSS repository',
      slgRole: 'Marketing accounts enriched via 6sense with identified industry tier',
      slaTimer: '14 days decay window',
      benchmarkConv: '38% conversion to Stage 02',
    },
    {
      step: '02',
      code: 'STAGE_02_ENG',
      name: 'Engaged Telemetry',
      focus: 'Live Product Usage & Inbound Signals',
      gateCriteria: '>= 5 weekly active developers, product telemetry score >= 50',
      plgRole: 'Live trial instance created, SDK initialized, active API calls',
      slgRole: 'Anonymous web visitors de-anonymized to named corporate accounts',
      slaTimer: '7 days PQL window',
      benchmarkConv: '52% conversion to Stage 03',
    },
    {
      step: '03',
      code: 'STAGE_03_PDU',
      name: 'Prioritized Demand Unit',
      focus: 'PQL Threshold & Champion Sourcing',
      gateCriteria: 'Telemetry vector >= 80, at least 1 technical champion verified',
      plgRole: 'Usage limit reached (seats, storage, or enterprise feature tier)',
      slgRole: 'Automated outbound outreach to Director / VP of Engineering',
      slaTimer: '48h SDR outreach SLA',
      benchmarkConv: '68% conversion to Stage 04',
    },
    {
      step: '04',
      code: 'STAGE_04_QDU',
      name: 'Qualified Demand Unit',
      focus: 'Buying Committee Consensus & Budget',
      gateCriteria: 'Economic Buyer engaged + Champion verified + Infosec pre-cleared',
      plgRole: 'Dev team requests enterprise SSO, SOC-2, and custom SLA tier',
      slgRole: 'AE stages technical evaluation with VP & Enterprise Architect',
      slaTimer: '24h AE meeting SLA',
      benchmarkConv: '76% conversion to Stage 05',
    },
    {
      step: '05',
      code: 'STAGE_05_PLN',
      name: 'Sales Pipeline Gate',
      focus: 'Security Sign-Off & Commercial Quorum',
      gateCriteria: 'Infosec questionnaire passed, Procurement and Legal engaged',
      plgRole: 'Production pilot environment provisioned with 100+ dev seats',
      slgRole: 'Formal commercial proposal, MSA negotiations, and pricing sign-off',
      slaTimer: '30 days close target',
      benchmarkConv: '84% conversion to Stage 06',
    },
    {
      step: '06',
      code: 'STAGE_06_EXP',
      name: 'Closed & Expansion',
      focus: 'Enterprise Rollout & NDR Growth',
      gateCriteria: 'Signed enterprise contract, multi-year commitment, CSM mapped',
      plgRole: 'Autonomous seat expansion triggers upsell playbooks at 85% capacity',
      slgRole: 'Executive Quarterly Business Reviews (QBRs) and cross-department land',
      slaTimer: 'Annual contract cycle',
      benchmarkConv: '135% Net Dollar Retention (NDR)',
    },
  ];

  const connectors = [
    {
      name: 'Snowflake DW',
      type: 'DATA WAREHOUSE',
      metric: '42,000 evt/sec',
      latency: '18ms',
      status: 'HEALTHY',
      role: 'Ingests real-time product events, cluster telemetry, and dev usage logs',
    },
    {
      name: 'Segment CDP',
      type: 'CUSTOMER DATA',
      metric: '12,500 evt/sec',
      latency: '24ms',
      status: 'HEALTHY',
      role: 'Identity resolution uniting anonymous browser sessions with user IDs',
    },
    {
      name: 'Salesforce CRM',
      type: 'CORE REVENUE CRM',
      metric: '3,200 sync/min',
      latency: '120ms',
      status: 'HEALTHY',
      role: 'Bi-directional account, opportunity, and buying committee synchronization',
    },
    {
      name: 'Bombora Surge',
      type: 'INTENT NETWORK',
      metric: 'Daily batch sync',
      latency: 'Realtime feed',
      status: 'HEALTHY',
      role: 'Monitors 9,000+ B2B topics and detects cross-web evaluation surges',
    },
    {
      name: '6sense ABM',
      type: 'DE-ANONYMIZATION',
      metric: '8,400 hits/day',
      latency: '45ms',
      status: 'HEALTHY',
      role: 'IP-to-company resolution and dynamic intent keyword heatmaps',
    },
    {
      name: 'HubSpot Marketing',
      type: 'MARKETING OPS',
      metric: 'Active Webhooks',
      latency: '60ms',
      status: 'HEALTHY',
      role: 'Automated executive email cadences and event nurture streams',
    },
  ];

  return (
    <div
      className={`rounded-2xl border transition-all ${
        theme === 'light'
          ? 'bg-white border-slate-300 shadow-xl'
          : 'bg-[#050c18] border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.1)]'
      }`}
    >
      {/* Blueprint Header */}
      <div
        className={`px-4 sm:px-6 py-3.5 border-b flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
          theme === 'light'
            ? 'bg-slate-100 border-slate-300 text-slate-800'
            : 'bg-[#030813] border-cyan-500/20 text-cyan-400'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>MACRO SPEC // DETERMINISTIC REVENUE OPERATING SYSTEM (SYS.01)</span>
          </div>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline text-slate-400 font-normal">
            6-STAGE DETERMINISTIC REVENUE ARCHITECTURE
          </span>
        </div>

        {/* View Switcher */}
        <div
          className={`p-1 rounded-lg border flex items-center gap-1 text-[11px] font-bold ${
            theme === 'light' ? 'bg-white border-slate-300' : 'bg-[#081222] border-cyan-500/30'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              playCadClick();
              setActiveView('PIPELINE');
            }}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              activeView === 'PIPELINE'
                ? theme === 'light'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            6-STAGE REVENUE GATES
          </button>
          <button
            type="button"
            onClick={() => {
              playCadClick();
              setActiveView('TOPOLOGY');
            }}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              activeView === 'TOPOLOGY'
                ? theme === 'light'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            DUAL-MOTION SCHEMATIC
          </button>
          <button
            type="button"
            onClick={() => {
              playCadClick();
              setActiveView('CONNECTORS');
            }}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              activeView === 'CONNECTORS'
                ? theme === 'light'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-cyan-500 text-slate-950 font-bold shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                : 'text-slate-400 hover:text-cyan-300'
            }`}
          >
            TELEMETRY MESH (6)
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* VIEW 1: 6-STAGE REVENUE GATES */}
        {activeView === 'PIPELINE' && (
          <div className="space-y-6">
            {/* Horizontal Stage Stepper */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {stages.map((st, idx) => {
                const isSelected = selectedStage === idx;
                return (
                  <button
                    key={st.step}
                    type="button"
                    onClick={() => {
                      playCadClick();
                      setSelectedStage(idx);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? theme === 'light'
                          ? 'bg-sky-50 border-sky-500 shadow-md ring-1 ring-sky-400'
                          : 'bg-[#09182e] border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400/50'
                        : theme === 'light'
                        ? 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                        : 'bg-[#071120] border-cyan-500/20 hover:border-cyan-400/50 text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-cyan-400">
                          GATE {st.step}
                        </span>
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isSelected ? 'bg-cyan-400 animate-ping' : 'bg-slate-600'
                          }`}
                        />
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 leading-tight">
                        {st.name}
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 mt-2 truncate">
                      {st.focus}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Stage Detail Inspector */}
            <div
              className={`p-6 rounded-xl border ${
                theme === 'light' ? 'bg-slate-50 border-slate-300' : 'bg-[#060f1e] border-cyan-500/30'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-cyan-500/20 gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-400/30">
                      GATE {stages[selectedStage].step} // {stages[selectedStage].code}
                    </span>
                    <span className="text-xs font-mono text-emerald-400">
                      {stages[selectedStage].benchmarkConv}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold mt-1.5">
                    {stages[selectedStage].name} Specification
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">SLA ENFORCEMENT:</span>
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{stages[selectedStage].slaTimer}</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {/* Gate Criteria */}
                <div
                  className={`p-4 rounded-lg border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#081324] border-cyan-500/20'
                  }`}
                >
                  <div className="text-xs font-mono font-bold text-cyan-400 mb-2 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    <span>STAGE-GATE ADMISSION CRITERIA</span>
                  </div>
                  <p className="text-xs font-mono leading-relaxed text-slate-300">
                    {stages[selectedStage].gateCriteria}
                  </p>
                </div>

                {/* PLG Motion */}
                <div
                  className={`p-4 rounded-lg border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#081324] border-cyan-500/20'
                  }`}
                >
                  <div className="text-xs font-mono font-bold text-emerald-400 mb-2 flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    <span>PRODUCT-LED VECTOR (PLG)</span>
                  </div>
                  <p className="text-xs font-mono leading-relaxed text-slate-300">
                    {stages[selectedStage].plgRole}
                  </p>
                </div>

                {/* SLG Motion */}
                <div
                  className={`p-4 rounded-lg border ${
                    theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#081324] border-cyan-500/20'
                  }`}
                >
                  <div className="text-xs font-mono font-bold text-indigo-400 mb-2 flex items-center gap-1.5">
                    <Users className="w-4 h-4" />
                    <span>SALES-LED COMMITTEE (SLG)</span>
                  </div>
                  <p className="text-xs font-mono leading-relaxed text-slate-300">
                    {stages[selectedStage].slgRole}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: DUAL-MOTION SCHEMATIC */}
        {activeView === 'TOPOLOGY' && (
          <div
            className={`p-6 sm:p-8 rounded-xl border ${
              theme === 'light' ? 'bg-slate-50 border-slate-300' : 'bg-[#030914] border-cyan-500/30'
            }`}
          >
            <div className="text-center max-w-2xl mx-auto mb-8">
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest">
                SYSTEM SCHEMATIC // CAD REVENUE TOPOLOGY
              </span>
              <h3 className="text-2xl font-bold mt-1">Dual-Motion Synchronization Bus</h3>
              <p className="text-xs font-mono text-slate-400 mt-1">
                How low-latency developer usage signals intersect with 6-persona buying committee momentum inside the Demand Unit Core.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center font-mono">
              {/* Top Vector Stream: PLG */}
              <div
                className={`md:col-span-4 p-5 rounded-xl border ${
                  theme === 'light' ? 'bg-white border-sky-300' : 'bg-[#071122] border-cyan-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>INBOUND PLG STREAM</span>
                  </span>
                  <span className="text-[10px] text-slate-500">30% WEIGHT</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Dev trial initialization &amp; repo pings</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>API limit &amp; seat exhaustion events</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Autonomous PQL scoring at 80+ pts</span>
                  </li>
                </ul>
              </div>

              {/* Central Core: Demand Unit Synthesis Core */}
              <div
                className={`md:col-span-4 p-6 rounded-2xl border text-center relative ${
                  theme === 'light'
                    ? 'bg-sky-100/70 border-sky-500 shadow-lg'
                    : 'bg-[#08152c] border-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]'
                }`}
              >
                <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3 bg-cyan-500/20 border border-cyan-400 text-cyan-300">
                  <Cpu className="w-6 h-6 animate-pulse" />
                </div>
                <div className="text-xs font-bold text-cyan-300 tracking-wider">
                  SYS.01 SYNTHESIS CORE
                </div>
                <div className="text-lg font-extrabold mt-1">Qualified Demand Unit</div>
                <div className="text-[11px] text-slate-400 mt-2">
                  Correlates telemetry velocity + committee coverage into deterministic pipeline value.
                </div>
              </div>

              {/* Bottom Vector Stream: SLG */}
              <div
                className={`md:col-span-4 p-5 rounded-xl border ${
                  theme === 'light' ? 'bg-white border-indigo-300' : 'bg-[#071122] border-indigo-500/30'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-indigo-400" />
                    <span>OUTBOUND SLG STREAM</span>
                  </span>
                  <span className="text-[10px] text-slate-500">25% WEIGHT</span>
                </div>
                <ul className="space-y-2 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>6-persona buying committee mapping</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>Single-thread risk elimination</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    <span>Infosec &amp; Procurement pre-clearance</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: TELEMETRY MESH CONNECTORS */}
        {activeView === 'CONNECTORS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
            {connectors.map((c) => (
              <div
                key={c.name}
                className={`p-4 rounded-xl border ${
                  theme === 'light'
                    ? 'bg-white border-slate-300 hover:border-sky-500 shadow-xs'
                    : 'bg-[#060f1f] border-cyan-500/25 hover:border-cyan-400/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{c.name}</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                    {c.status}
                  </span>
                </div>

                <div className="text-[10px] text-cyan-400 mb-2">{c.type}</div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{c.role}</p>

                <div className="pt-2 border-t border-cyan-500/15 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Throughput: {c.metric}</span>
                  <span className="text-emerald-400">{c.latency}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action strip to stations */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-cyan-500/20">
          <div className="text-xs font-mono text-slate-400">
            EXPLORE COMPLETE REVENUE WORKSTATIONS:
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => onNavigateTab('FUNNEL')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-bold border transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-[#091526] hover:bg-cyan-950 border-cyan-500/30 text-cyan-300'
              }`}
            >
              <span>DEMAND FUNNEL [ST.03]</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('CONNECTORS')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-sky-600 hover:bg-sky-700 text-white'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
              }`}
            >
              <span>TELEMETRY CONNECTORS [ST.11]</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
