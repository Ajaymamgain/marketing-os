import React, { useState } from 'react';
import {
  Sliders,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Sparkles,
  Info,
} from 'lucide-react';
import { ScoringRule, AccountDemandUnit } from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface ScoringRulesStudioViewProps {
  accounts: AccountDemandUnit[];
}

export const ScoringRulesStudioView: React.FC<ScoringRulesStudioViewProps> = ({
  accounts,
}) => {
  const [weights, setWeights] = useState({
    productTelemetry: 30,
    committeeMaturity: 25,
    behavioralEngagement: 25,
    intentSurge: 10,
    firmographicFit: 10,
  });

  const [decayHalfLifeDays, setDecayHalfLifeDays] = useState(14);
  const [pqlThreshold, setPqlThreshold] = useState(80);
  const [sqlThreshold, setSqlThreshold] = useState(70);
  const [selectedAccId, setSelectedAccId] = useState(accounts[0]?.id || '');
  const [savedAlert, setSavedAlert] = useState(false);

  const totalWeight =
    weights.productTelemetry +
    weights.committeeMaturity +
    weights.behavioralEngagement +
    weights.intentSurge +
    weights.firmographicFit;

  const activeAccount = accounts.find((a) => a.id === selectedAccId) || accounts[0];

  const calcCustomScore = (acc: AccountDemandUnit) => {
    return Math.round(
      (acc.scores.productTelemetry * weights.productTelemetry +
        acc.scores.committeeMaturity * weights.committeeMaturity +
        acc.scores.behavioralEngagement * weights.behavioralEngagement +
        acc.scores.intentSurge * weights.intentSurge +
        acc.scores.firmographicFit * weights.firmographicFit) /
        100
    );
  };

  const handleSave = () => {
    playCadConfirm();
    setSavedAlert(true);
    setTimeout(() => setSavedAlert(false), 3500);
  };

  const handleReset = () => {
    playCadClick();
    setWeights({
      productTelemetry: 30,
      committeeMaturity: 25,
      behavioralEngagement: 25,
      intentSurge: 10,
      firmographicFit: 10,
    });
    setDecayHalfLifeDays(14);
    setPqlThreshold(80);
    setSqlThreshold(70);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold">
              SYS.01 // SCORING RULES STUDIO
            </span>
            <span className="text-xs text-slate-400">ALGORITHM SPECIFICATION &amp; WEIGHT ENGINE</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            Dual-Motion Scoring Rules Studio
          </h2>
          <p className="text-xs text-slate-400">
            Configure component weights, signal decay half-lives, and qualification thresholds.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET DEFAULTS</span>
          </button>

          <button
            onClick={handleSave}
            disabled={totalWeight !== 100}
            className={`px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all ${
              totalWeight === 100
                ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            <span>DEPLOY WEIGHTS</span>
          </button>
        </div>
      </div>

      {savedAlert && (
        <div className="p-3 rounded bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Scoring weights successfully compiled and deployed to telemetry mesh engine!</span>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Weight Calibration Sliders */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 rounded bg-[#081220] border border-cyan-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-cyan-900/30 pb-2">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                COMPONENT RATIO WEIGHTS
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">TOTAL:</span>
                <span
                  className={`font-bold px-2 py-0.2 rounded border ${
                    totalWeight === 100
                      ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {totalWeight}% {totalWeight === 100 ? 'VALID' : '(MUST EQUAL 100%)'}
                </span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Product Telemetry */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-cyan-300 font-bold">1. Product Telemetry Velocity (PLG)</span>
                  <span className="text-white font-bold">{weights.productTelemetry}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={weights.productTelemetry}
                  onChange={(e) => {
                    playCadClick();
                    setWeights({ ...weights, productTelemetry: Number(e.target.value) });
                  }}
                  className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">Seat saturation, active dev count, API throughput</span>
              </div>

              {/* Committee Maturity */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-indigo-300 font-bold">2. Buying Committee Maturity (SLG)</span>
                  <span className="text-white font-bold">{weights.committeeMaturity}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  value={weights.committeeMaturity}
                  onChange={(e) => {
                    playCadClick();
                    setWeights({ ...weights, committeeMaturity: Number(e.target.value) });
                  }}
                  className="w-full accent-indigo-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">Economic buyer identification, champion influence, InfoSec signoff</span>
              </div>

              {/* Behavioral Engagement */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-300 font-bold">3. Behavioral Documentation Engagement</span>
                  <span className="text-white font-bold">{weights.behavioralEngagement}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={weights.behavioralEngagement}
                  onChange={(e) => {
                    playCadClick();
                    setWeights({ ...weights, behavioralEngagement: Number(e.target.value) });
                  }}
                  className="w-full accent-emerald-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">Technical API docs views, pricing page scrutiny, repo forks</span>
              </div>

              {/* 3P Intent Surge */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-amber-300 font-bold">4. 3P External Intent Surge (Bombora / G2)</span>
                  <span className="text-white font-bold">{weights.intentSurge}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={weights.intentSurge}
                  onChange={(e) => {
                    playCadClick();
                    setWeights({ ...weights, intentSurge: Number(e.target.value) });
                  }}
                  className="w-full accent-amber-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">Competitor category research surges, third-party buyer spikes</span>
              </div>

              {/* Firmographic ICP Fit */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-purple-300 font-bold">5. Enterprise ICP Firmographic Fit</span>
                  <span className="text-white font-bold">{weights.firmographicFit}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={weights.firmographicFit}
                  onChange={(e) => {
                    playCadClick();
                    setWeights({ ...weights, firmographicFit: Number(e.target.value) });
                  }}
                  className="w-full accent-purple-400 bg-slate-800 h-1.5 rounded cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">Target employee size, funding tier, cloud infrastructure alignment</span>
              </div>
            </div>
          </div>

          {/* Qualification Thresholds & Signal Decay */}
          <div className="p-4 rounded bg-[#081220] border border-cyan-500/30 space-y-4">
            <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              DECAY HALF-LIFE &amp; QUALIFICATION THRESHOLDS
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-1.5">
                <span className="text-slate-400 text-[11px] block">PQL Threshold (Expansion)</span>
                <input
                  type="number"
                  min="50"
                  max="95"
                  value={pqlThreshold}
                  onChange={(e) => setPqlThreshold(Number(e.target.value))}
                  className="w-full bg-[#060c17] border border-cyan-500/30 rounded p-1.5 text-white font-bold"
                />
                <span className="text-[10px] text-slate-500">Default: 80 pts</span>
              </div>

              <div className="space-y-1.5">
                <span className="text-slate-400 text-[11px] block">SQL Threshold (Target DU)</span>
                <input
                  type="number"
                  min="40"
                  max="85"
                  value={sqlThreshold}
                  onChange={(e) => setSqlThreshold(Number(e.target.value))}
                  className="w-full bg-[#060c17] border border-cyan-500/30 rounded p-1.5 text-white font-bold"
                />
                <span className="text-[10px] text-slate-500">Default: 70 pts</span>
              </div>

              <div className="space-y-1.5">
                <span className="text-slate-400 text-[11px] block">Signal Half-Life Decay</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={decayHalfLifeDays}
                  onChange={(e) => setDecayHalfLifeDays(Number(e.target.value))}
                  className="w-full bg-[#060c17] border border-cyan-500/30 rounded p-1.5 text-white font-bold"
                />
                <span className="text-[10px] text-slate-500">Days until score decays 50%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Live Recalculation Test Benchmark */}
        <div className="p-4 rounded bg-[#081220] border border-cyan-500/30 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="border-b border-cyan-900/30 pb-2">
              <span className="text-xs font-bold text-cyan-300 block">LIVE BENCHMARK VALIDATOR</span>
              <span className="text-[10px] text-slate-500">Test formula against real account telemetry</span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-400">Select Test Account:</label>
              <select
                value={selectedAccId}
                onChange={(e) => {
                  playCadClick();
                  setSelectedAccId(e.target.value);
                }}
                className="w-full bg-[#060c17] border border-cyan-500/30 rounded p-1.5 text-xs text-cyan-300 font-mono"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.accountName}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded bg-[#060c17] border border-cyan-950 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Original Score:</span>
                <span className="text-white font-bold">{activeAccount.compositeScore}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Recalculated Score:</span>
                <span className="text-cyan-300 font-bold text-base">
                  {calcCustomScore(activeAccount)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[11px]">
                <span className="text-slate-500">Net Delta:</span>
                <span
                  className={
                    calcCustomScore(activeAccount) >= activeAccount.compositeScore
                      ? 'text-emerald-400 font-bold'
                      : 'text-amber-400 font-bold'
                  }
                >
                  {calcCustomScore(activeAccount) - activeAccount.compositeScore >= 0 ? '+' : ''}
                  {calcCustomScore(activeAccount) - activeAccount.compositeScore} pts
                </span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-[#070e1a] border border-cyan-950 text-[11px] text-slate-400 space-y-1">
              <span className="text-cyan-400 font-bold block">Status Classification:</span>
              <p>
                {calcCustomScore(activeAccount) >= pqlThreshold
                  ? '[PQL READY] Meets PQL Ready standard. Auto-dispatches SDR with pre-approved pilot contract.'
                  : calcCustomScore(activeAccount) >= sqlThreshold
                  ? '[QUALIFIED] Qualified Demand Unit. Continues nurturing and sales-assisted onboarding.'
                  : '[NURTURE] In Nurture Pool.'}
              </p>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 border-t border-cyan-950 pt-2">
            Formula: SCORE = ∑(Signal_i × Weight_i) × (0.5 ^ (Days / {decayHalfLifeDays}))
          </div>
        </div>
      </div>
    </div>
  );
};
