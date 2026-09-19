import React, { useState } from 'react';
import {
  Cpu,
  Sliders,
  Filter,
  ArrowUpDown,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Zap,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { AccountDemandUnit, MotionType } from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface DemandUnitScoringViewProps {
  accounts: AccountDemandUnit[];
  onSelectAccount: (account: AccountDemandUnit) => void;
}

export const DemandUnitScoringView: React.FC<DemandUnitScoringViewProps> = ({
  accounts,
  onSelectAccount,
}) => {
  const [selectedMotion, setSelectedMotion] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'score' | 'deal' | 'coverage'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive Live Scoring Simulator State
  const [simTelemetry, setSimTelemetry] = useState(85);
  const [simCommittee, setSimCommittee] = useState(80);
  const [simBehavioral, setSimBehavioral] = useState(75);
  const [simIntent, setSimIntent] = useState(70);
  const [simFit, setSimFit] = useState(90);

  // Calculate simulated composite score
  const simComposite = Math.round(
    simTelemetry * 0.3 +
    simCommittee * 0.25 +
    simBehavioral * 0.25 +
    simIntent * 0.1 +
    simFit * 0.1
  );

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

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold">
              SYS.01 // CORE ENGINE
            </span>
            <span className="text-xs font-mono text-slate-400">ALGORITHM SPEC: DUAL-MOTION COMPOSITE</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            Demand Unit Scoring &amp; Marketing Operating Engine
          </h2>
          <p className="text-xs text-slate-400 font-mono">
            Evaluates B2B Demand Units by merging product telemetry velocity (PLG) with buying committee alignment (SLG).
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2 py-1 rounded bg-[#091526] border border-cyan-500/30 text-cyan-300">
            TOTAL UNITS: {accounts.length}
          </span>
          <span className="px-2 py-1 rounded bg-[#091526] border border-emerald-500/30 text-emerald-300">
            PQL QUALIFIED: {accounts.filter((a) => a.compositeScore >= 80).length}
          </span>
        </div>
      </div>

      {/* Interactive Scoring Sandbox & Simulator */}
      <div className="p-4 rounded bg-[#081220] border border-cyan-500/30 space-y-4 cad-border cad-corner-tl cad-corner-br">
        <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2.5">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold font-mono text-white tracking-tight">
              INTERACTIVE DUAL-MOTION SCORE SIMULATOR &amp; WEIGHT BENCH
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-400">FORMULA:</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-cyan-500/30 text-cyan-300">
              (PT×0.30) + (CM×0.25) + (BE×0.25) + (IS×0.10) + (FF×0.10)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sliders (2 Cols) */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-cyan-300">PLG: Product Telemetry (30%)</span>
                <span className="text-white font-bold">{simTelemetry} pts</span>
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
                className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Seat cap breach, weekly active devs, API volume</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-indigo-300">SLG: Committee Maturity (25%)</span>
                <span className="text-white font-bold">{simCommittee} pts</span>
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
                className="w-full accent-indigo-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Champion engagement, Economic Buyer confirmed, Infosec signoff</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-emerald-300">Behavioral Engagement (25%)</span>
                <span className="text-white font-bold">{simBehavioral} pts</span>
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
                className="w-full accent-emerald-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Technical documentation sessions, webinars, repo stars</span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-amber-300">3P Intent &amp; Competitor Surge (10%)</span>
                <span className="text-white font-bold">{simIntent} pts</span>
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
                className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">G2 comparisons, Bombora surge alerts, 6sense cluster intent</span>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-purple-300">Firmographic Fit / ICP Alignment (10%)</span>
                <span className="text-white font-bold">{simFit} pts</span>
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
                className="w-full accent-purple-400 bg-slate-800 h-1.5 rounded cursor-pointer"
              />
              <span className="text-[10px] text-slate-500">Employee count, cloud tech stack footprint, revenue range</span>
            </div>
          </div>

          {/* Simulated Result Card (1 Col) */}
          <div className="p-4 rounded bg-[#060b13] border border-cyan-500/30 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">
                Simulated Composite Score
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-4xl font-bold font-mono text-cyan-300">
                  {simComposite}
                </span>
                <span className="text-xs font-mono text-slate-400">/ 100</span>
              </div>

              <div className="mt-3">
                {simComposite >= 85 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-950/70 border border-emerald-400/50 text-emerald-300 text-xs font-mono font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    PQL READY: ENTERPRISE SURGE
                  </span>
                ) : simComposite >= 70 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-950/70 border border-cyan-400/50 text-cyan-300 text-xs font-mono font-bold">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    QUALIFIED DEMAND UNIT (SQL)
                  </span>
                ) : simComposite >= 50 ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/70 border border-amber-400/50 text-amber-300 text-xs font-mono font-bold">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    ENGAGED EVALUATION
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-400 text-xs font-mono font-bold">
                    COLD / NURTURE TARGET
                  </span>
                )}
              </div>
            </div>

            <p className="text-[11px] font-mono text-slate-400 mt-4 leading-relaxed border-t border-slate-800 pt-3">
              {simComposite >= 85
                ? 'Recommendation: Trigger Playbook-01 (Product-Led Seat Velocity Escalation). Dispatch AE immediately with pre-configured MSA pricing addendum.'
                : 'Recommendation: Continue asynchronous self-serve expansion. Trigger Automated Marketing Telemetry drip.'}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="p-3 rounded bg-[#081220] border border-cyan-500/20 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 flex items-center gap-1">
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
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                selectedMotion === motion
                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-300 font-bold'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {motion}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">SORT:</span>
            <button
              onClick={() => {
                playCadClick();
                setSortBy('score');
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              }}
              className={`px-2 py-1 rounded border cursor-pointer transition-colors ${
                sortBy === 'score'
                  ? 'bg-cyan-950 border-cyan-500/40 text-cyan-300 font-bold'
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
              className={`px-2 py-1 rounded border cursor-pointer transition-colors ${
                sortBy === 'deal'
                  ? 'bg-cyan-950 border-cyan-500/40 text-cyan-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              DEAL VALUE {sortBy === 'deal' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>

            <button
              onClick={() => {
                playCadClick();
                setSortBy('coverage');
                setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
              }}
              className={`px-2 py-1 rounded border cursor-pointer transition-colors ${
                sortBy === 'coverage'
                  ? 'bg-cyan-950 border-cyan-500/40 text-cyan-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              COMMITTEE % {sortBy === 'coverage' ? (sortOrder === 'desc' ? '↓' : '↑') : ''}
            </button>
          </div>
        </div>
      </div>

      {/* Demand Units Table */}
      <div className="rounded border border-cyan-500/25 bg-[#081220] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#050a12] border-b border-cyan-500/20 text-slate-400 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="p-3">Demand Unit / Account</th>
                <th className="p-3">Primary Motion</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Composite Score</th>
                <th className="p-3">Score Component Breakdown</th>
                <th className="p-3">Committee Coverage</th>
                <th className="p-3">Est. Deal Value</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-950/60">
              {filteredAccounts.map((acc) => (
                <tr
                  key={acc.id}
                  onClick={() => {
                    playCadClick();
                    onSelectAccount(acc);
                  }}
                  className="hover:bg-[#0a172a] transition-colors cursor-pointer group"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold group-hover:text-cyan-300 transition-colors">
                        {acc.accountName}
                      </span>
                      <span className="text-[10px] text-slate-500">[{acc.cadCoordinates.grid}]</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <span>{acc.solutionTarget}</span>
                    </div>
                  </td>

                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
                      {acc.primaryMotion}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className="text-slate-300 text-[11px] uppercase">
                      {acc.stage.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="p-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-bold text-cyan-300">{acc.compositeScore}</span>
                      <span className="text-[10px] text-emerald-400">+{acc.scoreDelta7d}</span>
                    </div>
                  </td>

                  <td className="p-3 min-w-[180px]">
                    {/* Visual Segmented Bar */}
                    <div className="w-full h-2 bg-slate-900 rounded-sm overflow-hidden flex">
                      <div
                        className="bg-cyan-400 h-full"
                        style={{ width: `${acc.scores.productTelemetry * 0.3}%` }}
                        title={`Product Telemetry: ${acc.scores.productTelemetry}`}
                      />
                      <div
                        className="bg-indigo-400 h-full"
                        style={{ width: `${acc.scores.committeeMaturity * 0.25}%` }}
                        title={`Committee Maturity: ${acc.scores.committeeMaturity}`}
                      />
                      <div
                        className="bg-emerald-400 h-full"
                        style={{ width: `${acc.scores.behavioralEngagement * 0.25}%` }}
                        title={`Behavioral: ${acc.scores.behavioralEngagement}`}
                      />
                      <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${acc.scores.intentSurge * 0.1}%` }}
                        title={`Intent Surge: ${acc.scores.intentSurge}`}
                      />
                      <div
                        className="bg-purple-400 h-full"
                        style={{ width: `${acc.scores.firmographicFit * 0.1}%` }}
                        title={`Fit: ${acc.scores.firmographicFit}`}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                      <span>PLG {acc.scores.productTelemetry}</span>
                      <span>SLG {acc.scores.committeeMaturity}</span>
                      <span>INT {acc.scores.intentSurge}</span>
                    </div>
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-amber-300 font-bold">{acc.committee.coverageScore}%</span>
                      <span className="text-[10px] text-slate-400">
                        ({acc.committee.totalIdentified}/{acc.committee.totalRequired})
                      </span>
                    </div>
                  </td>

                  <td className="p-3 font-bold text-white">
                    ${(acc.estDealValue / 1000).toFixed(0)}k
                  </td>

                  <td className="p-3 text-right">
                    <button className="px-2.5 py-1 rounded bg-cyan-500/10 group-hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[11px] inline-flex items-center gap-1 transition-colors">
                      <span>INSPECT</span>
                      <ChevronRight className="w-3 h-3 text-cyan-400" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
