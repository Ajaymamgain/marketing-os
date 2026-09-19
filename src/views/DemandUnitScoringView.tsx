import React, { useState } from 'react';
import {
  Sliders,
  Filter,
  Search,
  CheckCircle2,
  AlertCircle,
  Activity,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Bot,
  Layers,
  Zap,
} from 'lucide-react';
import { AccountDemandUnit } from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface DemandUnitScoringViewProps {
  accounts: AccountDemandUnit[];
  theme?: 'dark' | 'light';
  onSelectAccount: (account: AccountDemandUnit) => void;
  onNavigateTab?: (tab: any) => void;
  onTriggerAiPrompt?: (prompt: string) => void;
}

export const DemandUnitScoringView: React.FC<DemandUnitScoringViewProps> = ({
  accounts,
  theme = 'dark',
  onSelectAccount,
  onNavigateTab,
  onTriggerAiPrompt,
}) => {
  const [selectedMotion, setSelectedMotion] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'score' | 'deal' | 'coverage'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Clean, focused Simulator State
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [simTelemetry, setSimTelemetry] = useState(85);
  const [simCommittee, setSimCommittee] = useState(80);
  const [simBehavioral, setSimBehavioral] = useState(75);
  const [simIntent, setSimIntent] = useState(70);
  const [simFit, setSimFit] = useState(90);

  // Compute composite score dynamically
  const simComposite = Math.round(
    simTelemetry * 0.3 +
    simCommittee * 0.25 +
    simBehavioral * 0.25 +
    simIntent * 0.1 +
    simFit * 0.1
  );

  const handleLoadAccount = (accId: string) => {
    playCadClick();
    setSelectedAccountId(accId);
    const target = accounts.find((a) => a.id === accId);
    if (target) {
      setSimTelemetry(target.scores.productTelemetry);
      setSimCommittee(target.scores.committeeMaturity);
      setSimBehavioral(target.scores.behavioralEngagement);
      setSimIntent(target.scores.intentSurge);
      setSimFit(target.scores.firmographicFit);
    }
  };

  const handleResetSimulator = () => {
    playCadClick();
    setSelectedAccountId('');
    setSimTelemetry(85);
    setSimCommittee(80);
    setSimBehavioral(75);
    setSimIntent(70);
    setSimFit(90);
  };

  const filteredAccounts = accounts
    .filter((acc) => {
      if (selectedMotion !== 'ALL' && acc.primaryMotion !== selectedMotion) return false;
      if (
        searchQuery &&
        !acc.accountName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !acc.solutionTarget.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      let valA = a.compositeScore;
      let valB = b.compositeScore;
      if (sortBy === 'deal') {
        valA = a.estDealValue;
        valB = b.estDealValue;
      } else if (sortBy === 'coverage') {
        valA = a.committee.coverageScore;
        valB = b.committee.coverageScore;
      }
      return sortOrder === 'desc' ? valB - valA : valA - valB;
    });

  const pqlCount = accounts.filter((a) => a.compositeScore >= 80).length;

  return (
    <div className="space-y-5 animate-fadeIn font-sans">
      {/* Station Header */}
      <div
        className={`p-4 rounded-xl border transition-all ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-[#081322] border-cyan-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  theme === 'light'
                    ? 'bg-sky-50 border-sky-300 text-sky-800'
                    : 'bg-cyan-950 border-cyan-400/40 text-cyan-300'
                }`}
              >
                ST.02 // DEMAND UNITS
              </span>
              <span className={`text-xs font-mono ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                SCORING &amp; CALIBRATION BENCH
              </span>
            </div>
            <h2
              className={`text-lg font-bold tracking-tight ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}
            >
              Demand Unit Scoring &amp; Calibration
            </h2>
            <p className={`text-xs font-mono ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
              Evaluates target accounts using dual-motion vectors (PLG product velocity + SLG committee buy-in).
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span
              className={`px-2.5 py-1 rounded border font-semibold ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-300 text-slate-700'
                  : 'bg-[#091526] border-cyan-500/30 text-cyan-300'
              }`}
            >
              TOTAL UNITS: {accounts.length}
            </span>
            <span
              className={`px-2.5 py-1 rounded border font-semibold ${
                theme === 'light'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-[#091526] border-emerald-500/30 text-emerald-300'
              }`}
            >
              PQL READY: {pqlCount}
            </span>
          </div>
        </div>
      </div>

      {/* Simplified, Clean Live Simulator Card */}
      <div
        className={`p-4 rounded-xl border transition-all ${
          theme === 'light'
            ? 'bg-white border-slate-200 shadow-xs'
            : 'bg-[#081322] border-cyan-500/30'
        }`}
      >
        {/* Simulator Subheader */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 mb-4 border-slate-200 dark:border-cyan-900/40">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3
              className={`text-xs font-mono font-bold uppercase tracking-wider ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}
            >
              Live Scoring Simulator
            </h3>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border hidden sm:inline-block ${
                theme === 'light'
                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                  : 'bg-[#060c18] border-cyan-500/30 text-cyan-300'
              }`}
            >
              (PT×0.3) + (CM×0.25) + (BE×0.25) + (IS×0.1) + (FF×0.1)
            </span>
          </div>

          {/* Quick Account Preset Loaders */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-mono mr-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              Load Preset:
            </span>
            {accounts.slice(0, 4).map((acc) => (
              <button
                key={acc.id}
                type="button"
                onClick={() => handleLoadAccount(acc.id)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-all cursor-pointer border ${
                  selectedAccountId === acc.id
                    ? theme === 'light'
                      ? 'bg-sky-100 border-sky-400 text-sky-900 font-bold'
                      : 'bg-cyan-500/20 border-cyan-400/60 text-cyan-300 font-bold'
                    : theme === 'light'
                    ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                    : 'bg-[#060c18] hover:bg-[#0b1b30] border-slate-800 text-slate-300'
                }`}
              >
                {acc.accountName}
              </button>
            ))}
            <button
              type="button"
              onClick={handleResetSimulator}
              title="Reset values"
              className={`p-1 rounded text-xs transition-colors cursor-pointer border ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-600'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sliders and Score Gauge in Clean 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Sliders Column (2 cols) */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            {/* 1. Product Telemetry */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className={theme === 'light' ? 'text-slate-800 font-semibold' : 'text-cyan-300 font-semibold'}>
                  Product Telemetry (30%)
                </span>
                <span className={`font-bold ${theme === 'light' ? 'text-sky-800' : 'text-cyan-300'}`}>
                  {simTelemetry} pts
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simTelemetry}
                onChange={(e) => {
                  setSimTelemetry(Number(e.target.value));
                  playCadClick();
                }}
                className="w-full accent-cyan-400 h-1.5 rounded cursor-pointer bg-slate-200 dark:bg-slate-800"
              />
              <span className={`text-[10px] block ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Seat cap breach, weekly active devs, API volume
              </span>
            </div>

            {/* 2. Committee Maturity */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className={theme === 'light' ? 'text-slate-800 font-semibold' : 'text-indigo-300 font-semibold'}>
                  Committee Maturity (25%)
                </span>
                <span className={`font-bold ${theme === 'light' ? 'text-indigo-800' : 'text-indigo-300'}`}>
                  {simCommittee} pts
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simCommittee}
                onChange={(e) => {
                  setSimCommittee(Number(e.target.value));
                  playCadClick();
                }}
                className="w-full accent-indigo-400 h-1.5 rounded cursor-pointer bg-slate-200 dark:bg-slate-800"
              />
              <span className={`text-[10px] block ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Champion engagement, Economic Buyer, Infosec signoff
              </span>
            </div>

            {/* 3. Behavioral Engagement */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className={theme === 'light' ? 'text-slate-800 font-semibold' : 'text-emerald-300 font-semibold'}>
                  Behavioral Engagement (25%)
                </span>
                <span className={`font-bold ${theme === 'light' ? 'text-emerald-800' : 'text-emerald-300'}`}>
                  {simBehavioral} pts
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simBehavioral}
                onChange={(e) => {
                  setSimBehavioral(Number(e.target.value));
                  playCadClick();
                }}
                className="w-full accent-emerald-400 h-1.5 rounded cursor-pointer bg-slate-200 dark:bg-slate-800"
              />
              <span className={`text-[10px] block ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Technical docs, webinar attendance, git repo events
              </span>
            </div>

            {/* 4. Intent Surge */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className={theme === 'light' ? 'text-slate-800 font-semibold' : 'text-amber-300 font-semibold'}>
                  3P Intent Surge (10%)
                </span>
                <span className={`font-bold ${theme === 'light' ? 'text-amber-800' : 'text-amber-300'}`}>
                  {simIntent} pts
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simIntent}
                onChange={(e) => {
                  setSimIntent(Number(e.target.value));
                  playCadClick();
                }}
                className="w-full accent-amber-400 h-1.5 rounded cursor-pointer bg-slate-200 dark:bg-slate-800"
              />
              <span className={`text-[10px] block ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                G2 comparisons, Bombora surge alerts, 6sense spikes
              </span>
            </div>

            {/* 5. Firmographic Fit */}
            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className={theme === 'light' ? 'text-slate-800 font-semibold' : 'text-purple-300 font-semibold'}>
                  Firmographic Fit / ICP Alignment (10%)
                </span>
                <span className={`font-bold ${theme === 'light' ? 'text-purple-800' : 'text-purple-300'}`}>
                  {simFit} pts
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={simFit}
                onChange={(e) => {
                  setSimFit(Number(e.target.value));
                  playCadClick();
                }}
                className="w-full accent-purple-400 h-1.5 rounded cursor-pointer bg-slate-200 dark:bg-slate-800"
              />
              <span className={`text-[10px] block ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                Employee count, cloud tech stack, revenue tier
              </span>
            </div>
          </div>

          {/* Results Column (1 col) */}
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between h-full ${
              theme === 'light'
                ? 'bg-slate-50 border-slate-200'
                : 'bg-[#060b13] border-cyan-500/30'
            }`}
          >
            <div>
              <span
                className={`text-[10px] font-mono uppercase tracking-wider block ${
                  theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Calculated Composite Score
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span
                  className={`text-4xl font-bold font-mono ${
                    simComposite >= 80
                      ? 'text-emerald-500'
                      : simComposite >= 65
                      ? theme === 'light'
                        ? 'text-sky-700'
                        : 'text-cyan-300'
                      : 'text-amber-500'
                  }`}
                >
                  {simComposite}
                </span>
                <span className={`text-xs font-mono ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
                  / 100
                </span>
              </div>

              <div className="mt-3">
                {simComposite >= 80 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-400/50 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    PQL READY // EXPANSION
                  </span>
                ) : simComposite >= 65 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-sky-50 dark:bg-cyan-950/70 border border-sky-300 dark:border-cyan-400/50 text-sky-800 dark:text-cyan-300 text-xs font-mono font-bold">
                    <Activity className="w-3.5 h-3.5 text-sky-500 dark:text-cyan-400" />
                    QUALIFIED DEMAND UNIT (SQL)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-400/50 text-amber-800 dark:text-amber-300 text-xs font-mono font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    NURTURE / EVALUATING
                  </span>
                )}
              </div>

              <p
                className={`text-[11px] font-mono mt-3 leading-relaxed border-t pt-2.5 ${
                  theme === 'light'
                    ? 'border-slate-200 text-slate-600'
                    : 'border-slate-800 text-slate-400'
                }`}
              >
                {simComposite >= 80
                  ? 'Recommendation: Product-Led Seat Velocity Escalation. Dispatch AE immediately with MSA enterprise addendum.'
                  : simComposite >= 65
                  ? 'Recommendation: Committee discovery call. Identify economic buyer and confirm infosec baseline.'
                  : 'Recommendation: Continue self-serve developer telemetry nurture drip.'}
              </p>
            </div>

            {onTriggerAiPrompt && (
              <button
                type="button"
                onClick={() => {
                  playCadConfirm();
                  onTriggerAiPrompt(
                    `Analyze demand unit score: Telemetry=${simTelemetry}, Committee=${simCommittee}, Behavioral=${simBehavioral}, Intent=${simIntent}, Fit=${simFit}. Composite=${simComposite}/100. Recommend immediate marketing operations actions.`
                  );
                }}
                className={`mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                  theme === 'light'
                    ? 'bg-sky-50 hover:bg-sky-100 border-sky-300 text-sky-900'
                    : 'bg-cyan-950 hover:bg-cyan-900 border-cyan-500/40 text-cyan-200'
                }`}
              >
                <Bot className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI DIAGNOSE SCORES</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Demand Units Directory Section */}
      <div className="space-y-3">
        {/* Filter and Control Bar */}
        <div
          className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
            theme === 'light'
              ? 'bg-white border-slate-200 shadow-xs'
              : 'bg-[#081220] border-cyan-500/20'
          }`}
        >
          {/* Search */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border w-full sm:w-64 ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-300 text-slate-800'
                  : 'bg-[#060c18] border-cyan-500/30 text-cyan-200'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Filter demand units..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-xs w-full font-mono placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-200 text-[10px]"
                >
                  CLEAR
                </button>
              )}
            </div>
          </div>

          {/* Motion Filter Pills */}
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              MOTION:
            </span>
            {['ALL', 'DUAL', 'PLG', 'SLG'].map((motion) => (
              <button
                key={motion}
                onClick={() => {
                  playCadClick();
                  setSelectedMotion(motion);
                }}
                className={`px-2.5 py-1 rounded transition-colors cursor-pointer text-xs font-mono font-semibold ${
                  selectedMotion === motion
                    ? theme === 'light'
                      ? 'bg-sky-100 border border-sky-400 text-sky-900 font-bold'
                      : 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold'
                    : theme === 'light'
                    ? 'bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {motion}
              </button>
            ))}
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2">
            <span className={theme === 'light' ? 'text-slate-500' : 'text-slate-400'}>SORT:</span>
            <button
              onClick={() => {
                playCadClick();
                setSortBy('score');
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              }}
              className={`px-2.5 py-1 rounded border cursor-pointer transition-colors ${
                sortBy === 'score'
                  ? theme === 'light'
                    ? 'bg-sky-100 border-sky-400 text-sky-900 font-bold'
                    : 'bg-cyan-950 border-cyan-500/40 text-cyan-300 font-bold'
                  : theme === 'light'
                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              SCORE {sortBy === 'score' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>

            <button
              onClick={() => {
                playCadClick();
                setSortBy('deal');
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              }}
              className={`px-2.5 py-1 rounded border cursor-pointer transition-colors ${
                sortBy === 'deal'
                  ? theme === 'light'
                    ? 'bg-sky-100 border-sky-400 text-sky-900 font-bold'
                    : 'bg-cyan-950 border-cyan-500/40 text-cyan-300 font-bold'
                  : theme === 'light'
                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              DEAL {sortBy === 'deal' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>

            <button
              onClick={() => {
                playCadClick();
                setSortBy('coverage');
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              }}
              className={`px-2.5 py-1 rounded border cursor-pointer transition-colors ${
                sortBy === 'coverage'
                  ? theme === 'light'
                    ? 'bg-sky-100 border-sky-400 text-sky-900 font-bold'
                    : 'bg-cyan-950 border-cyan-500/40 text-cyan-300 font-bold'
                  : theme === 'light'
                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              QUORUM % {sortBy === 'coverage' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
          </div>
        </div>

        {/* Demand Units Table */}
        <div
          className={`rounded-xl border overflow-hidden transition-all ${
            theme === 'light'
              ? 'bg-white border-slate-200 shadow-xs'
              : 'bg-[#081220] border-cyan-500/25'
          }`}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead
                className={`border-b uppercase text-[10px] tracking-wider ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-200 text-slate-600'
                    : 'bg-[#050a12] border-cyan-500/20 text-slate-400'
                }`}
              >
                <tr>
                  <th className="p-3">Demand Unit / Target</th>
                  <th className="p-3">Motion</th>
                  <th className="p-3">Stage</th>
                  <th className="p-3">Composite Score</th>
                  <th className="p-3">Vector Breakdown</th>
                  <th className="p-3">Committee Quorum</th>
                  <th className="p-3">Est. Pipeline</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y ${
                  theme === 'light' ? 'divide-slate-200' : 'divide-cyan-950/60'
                }`}
              >
                {filteredAccounts.map((acc) => (
                  <tr
                    key={acc.id}
                    onClick={() => {
                      playCadClick();
                      onSelectAccount(acc);
                    }}
                    className={`transition-colors cursor-pointer group ${
                      theme === 'light'
                        ? 'hover:bg-slate-50/80 text-slate-800'
                        : 'hover:bg-[#0a172a] text-white'
                    }`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-bold transition-colors ${
                            theme === 'light'
                              ? 'text-slate-900 group-hover:text-sky-700'
                              : 'text-white group-hover:text-cyan-300'
                          }`}
                        >
                          {acc.accountName}
                        </span>
                        <span
                          className={`text-[10px] ${
                            theme === 'light' ? 'text-slate-400' : 'text-slate-500'
                          }`}
                        >
                          [{acc.cadCoordinates.grid}]
                        </span>
                      </div>
                      <div
                        className={`text-[11px] flex items-center gap-1.5 mt-0.5 ${
                          theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        <span>{acc.solutionTarget}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          acc.primaryMotion === 'DUAL'
                            ? theme === 'light'
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                              : 'bg-indigo-950/80 border-indigo-500/30 text-indigo-300'
                            : acc.primaryMotion === 'PLG'
                            ? theme === 'light'
                              ? 'bg-cyan-50 border-cyan-200 text-cyan-700'
                              : 'bg-cyan-950/80 border-cyan-500/30 text-cyan-300'
                            : theme === 'light'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-amber-950/80 border-amber-500/30 text-amber-300'
                        }`}
                      >
                        {acc.primaryMotion}
                      </span>
                    </td>

                    <td className="p-3">
                      <span
                        className={`text-[11px] uppercase font-semibold ${
                          acc.stage === 'closed_won' || acc.stage === 'expansion'
                            ? 'text-emerald-500 font-bold'
                            : theme === 'light'
                            ? 'text-slate-700'
                            : 'text-slate-300'
                        }`}
                      >
                        {acc.stage.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`text-base font-bold ${
                            theme === 'light' ? 'text-sky-700' : 'text-cyan-300'
                          }`}
                        >
                          {acc.compositeScore}
                        </span>
                        <span className="text-[10px] text-emerald-500 font-bold">
                          +{acc.scoreDelta7d}
                        </span>
                      </div>
                    </td>

                    <td className="p-3 min-w-[170px]">
                      {/* Visual Segmented Bar */}
                      <div
                        className={`w-full h-2 rounded-sm overflow-hidden flex ${
                          theme === 'light' ? 'bg-slate-200' : 'bg-slate-900'
                        }`}
                      >
                        <div
                          className="bg-cyan-400 h-full"
                          style={{ width: `${acc.scores.productTelemetry * 0.3}%` }}
                          title={`PLG Telemetry: ${acc.scores.productTelemetry}`}
                        />
                        <div
                          className="bg-indigo-400 h-full"
                          style={{ width: `${acc.scores.committeeMaturity * 0.25}%` }}
                          title={`SLG Committee: ${acc.scores.committeeMaturity}`}
                        />
                        <div
                          className="bg-emerald-400 h-full"
                          style={{ width: `${acc.scores.behavioralEngagement * 0.25}%` }}
                          title={`Behavioral: ${acc.scores.behavioralEngagement}`}
                        />
                        <div
                          className="bg-amber-400 h-full"
                          style={{ width: `${acc.scores.intentSurge * 0.1}%` }}
                          title={`Intent: ${acc.scores.intentSurge}`}
                        />
                        <div
                          className="bg-purple-400 h-full"
                          style={{ width: `${acc.scores.firmographicFit * 0.1}%` }}
                          title={`Fit: ${acc.scores.firmographicFit}`}
                        />
                      </div>
                      <div
                        className={`flex justify-between text-[9px] mt-1 ${
                          theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        <span>PLG {acc.scores.productTelemetry}</span>
                        <span>SLG {acc.scores.committeeMaturity}</span>
                        <span>INT {acc.scores.intentSurge}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-bold ${
                            acc.committee.coverageScore >= 80
                              ? 'text-emerald-500'
                              : acc.committee.coverageScore >= 50
                              ? 'text-amber-500'
                              : 'text-rose-500'
                          }`}
                        >
                          {acc.committee.coverageScore}%
                        </span>
                        <span
                          className={`text-[10px] ${
                            theme === 'light' ? 'text-slate-400' : 'text-slate-400'
                          }`}
                        >
                          ({acc.committee.totalIdentified}/{acc.committee.totalRequired})
                        </span>
                      </div>
                    </td>

                    <td
                      className={`p-3 font-bold ${
                        theme === 'light' ? 'text-slate-900' : 'text-white'
                      }`}
                    >
                      ${(acc.estDealValue / 1000).toFixed(0)}k
                    </td>

                    <td className="p-3 text-right">
                      <button
                        type="button"
                        className={`px-2.5 py-1 rounded text-[11px] inline-flex items-center gap-1 transition-colors font-semibold border ${
                          theme === 'light'
                            ? 'bg-sky-50 group-hover:bg-sky-100 border-sky-300 text-sky-800'
                            : 'bg-cyan-500/10 group-hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300'
                        }`}
                      >
                        <span>INSPECT</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredAccounts.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className={`p-6 text-center text-xs ${
                        theme === 'light' ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      No matching demand units found for &ldquo;{searchQuery}&rdquo;.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
