import React, { useState } from 'react';
import {
  ActiveNavTab,
  AccountDemandUnit,
  TelemetrySignal,
  AutomationPlaybook,
  DataConnector,
} from '../types';
import {
  Crosshair,
  ShieldCheck,
  Cpu,
  Users,
  Radio,
  Zap,
  Network,
  Sliders,
  ArrowRight,
  Sparkles,
  Layers,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Compass,
  Terminal,
  Play,
  RotateCcw,
  Activity,
  Filter,
  Eye,
  CheckSquare,
  Lock,
  Globe,
  Database,
  Grid,
  Milestone,
  LayoutDashboard,
  Sun,
  Moon,
  Bot,
  MessageSquare,
  Flame,
  Send,
  TrendingUp,
  DollarSign,
  Clock,
  X,
  MessageCircle,
} from 'lucide-react';
import { playCadClick, playCadConfirm } from '../utils/audio';
import { GeminiChatbotView } from './GeminiChatbotView';
import { AutonomousDemandSimulator } from '../components/landing/AutonomousDemandSimulator';
import { DeterministicRevenueBlueprint } from '../components/landing/DeterministicRevenueBlueprint';

interface LandingPageViewProps {
  onNavigateTab: (tab: ActiveNavTab) => void;
  onSelectAccount?: (account: AccountDemandUnit) => void;
  accounts?: AccountDemandUnit[];
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onNavigateTab,
  onSelectAccount,
  accounts = [],
  theme = 'dark',
  onToggleTheme,
}) => {
  // AI Interactive state on Landing Page
  const [heroInput, setHeroInput] = useState('');
  const [externalPromptForAi, setExternalPromptForAi] = useState<string | undefined>(undefined);

  // Interactive ROI Calculator state on Landing Page
  const [annualPipelineM, setAnnualPipelineM] = useState(40); // $40M target
  const [avgDealSizeK, setAvgDealSizeK] = useState(85); // $85k ACV
  const [buyingCommitteeMaturity, setBuyingCommitteeMaturity] = useState(3); // 3 of 6 roles
  const [plgLeadVelocity, setPlgLeadVelocity] = useState<'STANDARD' | 'ACCELERATED' | 'HYPER'>('ACCELERATED');

  // Calculations
  const stallLossReduction = Math.round(annualPipelineM * 0.18 * (buyingCommitteeMaturity / 6) * 10) / 10;
  const cycleDaysSaved = Math.round(18 + (buyingCommitteeMaturity * 3.5) + (plgLeadVelocity === 'HYPER' ? 10 : plgLeadVelocity === 'ACCELERATED' ? 5 : 0));
  const conversionUpliftPct = Math.round(22 + (buyingCommitteeMaturity * 4) + (plgLeadVelocity === 'HYPER' ? 12 : 6));

  const handleTriggerAiWithPrompt = (prompt: string) => {
    playCadConfirm();
    setExternalPromptForAi(prompt);
    const elem = document.getElementById('ai-copilot');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLaunchConsole = (tab: ActiveNavTab = 'OVERVIEW') => {
    playCadConfirm();
    onNavigateTab(tab);
  };

  const stations = [
    {
      id: 'OVERVIEW' as ActiveNavTab,
      code: 'ST.01',
      title: 'Demand Overview & Command Deck',
      desc: 'Real-time bird’s-eye telemetry of dual-motion pipeline, stage distribution, and accounts in flight.',
      icon: LayoutDashboard,
      category: 'Command & Analytics',
    },
    {
      id: 'DEMAND_UNITS' as ActiveNavTab,
      code: 'ST.02',
      title: '5-Vector Demand Unit Scoring',
      desc: 'Algorithmic multi-vector qualification engine correlating product velocity with buying committee buy-in.',
      icon: Cpu,
      category: 'Scoring Engine',
    },
    {
      id: 'FUNNEL' as ActiveNavTab,
      code: 'ST.03',
      title: 'Demand Funnel Velocity',
      desc: '6-stage stage gate funnel tracking transition times, conversion ratios, and pipeline leakage points.',
      icon: Filter,
      category: 'Lifecycle Analytics',
    },
    {
      id: 'JOURNEY' as ActiveNavTab,
      code: 'ST.04',
      title: 'Customer Journey Matrix',
      desc: 'Chronological timeline correlating PLG developer pings with executive committee milestones.',
      icon: Milestone,
      category: 'Lifecycle Analytics',
    },
    {
      id: 'ACCOUNTS' as ActiveNavTab,
      code: 'ST.05',
      title: 'Account Matrix (2x2)',
      desc: 'Quadrant quadrant mapping PLG usage depth vs committee maturity to spot low-hanging expansion fruit.',
      icon: Grid,
      category: 'Account Intelligence',
    },
    {
      id: 'COMMITTEES' as ActiveNavTab,
      code: 'ST.06',
      title: 'Buying Committees Topology',
      desc: '6-persona stakeholder coverage map preventing single-threaded champion derailment.',
      icon: Users,
      category: 'Committee Mapping',
    },
    {
      id: 'COVERAGE' as ActiveNavTab,
      code: 'ST.07',
      title: 'Committee Coverage Inspector',
      desc: 'Granular gap detector flagging unmapped infosec, procurement, or economic buyers.',
      icon: Eye,
      category: 'Committee Mapping',
    },
    {
      id: 'PI_OPS' as ActiveNavTab,
      code: 'ST.08',
      title: 'PI Operations Center',
      desc: 'Surge triage triage and real-time incident center for high-priority product velocity alerts.',
      icon: Radio,
      category: 'Operations',
    },
    {
      id: 'SIGNALS' as ActiveNavTab,
      code: 'ST.09',
      title: 'Signals & Playbooks',
      desc: 'Automated workflow engine dispatching targeted multi-threaded outreach on intent spikes.',
      icon: Zap,
      category: 'Automation',
    },
    {
      id: 'RULES' as ActiveNavTab,
      code: 'ST.10',
      title: 'Scoring Rules Studio',
      desc: 'Configurable mathematical weights, decay half-lives, and enterprise deal multipliers.',
      icon: Sliders,
      category: 'Scoring Engine',
    },
    {
      id: 'CONNECTORS' as ActiveNavTab,
      code: 'ST.11',
      title: 'Telemetry Mesh Connectors',
      desc: 'Live integrations for Snowflake, Segment, Salesforce, Bombora, HubSpot, and 6sense.',
      icon: Network,
      category: 'Infrastructure',
    },
    {
      id: 'TASKS' as ActiveNavTab,
      code: 'ST.12',
      title: 'Tasks & Operational Activity',
      desc: 'Prioritized queue for SDRs, AEs, and Marketing Ops with SLA timers and motion tags.',
      icon: CheckSquare,
      category: 'Operations',
    },
    {
      id: 'CHATBOT' as ActiveNavTab,
      code: 'ST.13',
      title: 'Gemini AI Copilot & Linked Tools',
      desc: 'Interactive multi-turn AI assistant linked to 5 real-time scoring, committee audit, and playbook functions.',
      icon: Bot,
      category: 'Intelligence',
    },
  ];

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#040811] text-slate-100'} font-sans transition-colors duration-200`}>
      {/* Top Engineering Micro-Bar */}
      <div className={`px-4 sm:px-8 py-1.5 border-b text-[11px] font-mono flex items-center justify-between ${
        theme === 'light'
          ? 'bg-slate-100 border-slate-300 text-slate-700'
          : 'bg-[#060c18] border-cyan-500/20 text-cyan-400/80'
      }`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-bold">
            <span className={`w-1.5 h-1.5 rounded-full ${theme === 'light' ? 'bg-sky-600' : 'bg-cyan-400 animate-pulse'}`} />
            SPEC: DUAL-MOTION MARKETING OS
          </span>
          <span className="hidden md:inline text-slate-400">|</span>
          <span className="hidden md:inline text-slate-500">BLUEPRINT ARCHITECTURE RELEASE 2.4.1</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline font-mono">STATUS: TELEMETRY MESH SYNCHRONIZED</span>
          {onToggleTheme && (
            <button
              onClick={() => {
                playCadClick();
                onToggleTheme();
              }}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                theme === 'light'
                  ? 'bg-slate-200 border-slate-300 text-slate-800 hover:bg-slate-300'
                  : 'bg-cyan-950/60 border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/60'
              }`}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3 h-3 text-amber-500" />
                  <span>DARK CAD</span>
                </>
              ) : (
                <>
                  <Sun className="w-3 h-3 text-amber-400" />
                  <span>LIGHT WHITEPRINT</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Primary Landing Navigation Bar */}
      <header className={`sticky top-0 z-40 backdrop-blur-md border-b px-4 sm:px-8 py-3.5 flex items-center justify-between ${
        theme === 'light'
          ? 'bg-white/95 border-slate-300 shadow-xs'
          : 'bg-[#060b14]/90 border-cyan-500/20'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`relative flex items-center justify-center w-9 h-9 rounded border ${
            theme === 'light'
              ? 'border-sky-500 bg-sky-100 text-sky-800'
              : 'border-cyan-400/40 bg-cyan-950/40 text-cyan-300'
          }`}>
            <Crosshair className={`w-4 h-4 ${theme === 'light' ? 'text-sky-700' : 'text-cyan-400'}`} />
            <div className={`absolute -top-0.5 -left-0.5 w-1.5 h-1.5 border-t border-l ${theme === 'light' ? 'border-sky-600' : 'border-cyan-400'}`} />
            <div className={`absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 border-b border-r ${theme === 'light' ? 'border-sky-600' : 'border-cyan-400'}`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight">MARKETING OPERATIONS OS</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                theme === 'light'
                  ? 'bg-sky-100 border border-sky-300 text-sky-900'
                  : 'bg-cyan-950 border border-cyan-500/40 text-cyan-300'
              }`}>
                SYS.01
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-500">DUAL-MOTION DEMAND UNIT ARCHITECTURE</p>
          </div>
        </div>

        {/* Quick Nav Anchor links */}
        <nav className="hidden lg:flex items-center gap-5 text-xs font-mono font-medium">
          <a
            href="#architecture"
            className={`hover:underline underline-offset-4 ${theme === 'light' ? 'text-slate-700 hover:text-sky-800' : 'text-slate-300 hover:text-cyan-300'}`}
          >
            ARCHITECTURE
          </a>
          <a
            href="#ai-copilot"
            className={`flex items-center gap-1.5 font-bold hover:underline underline-offset-4 ${theme === 'light' ? 'text-sky-700 hover:text-sky-900' : 'text-cyan-400 hover:text-cyan-200'}`}
          >
            <Bot className="w-3.5 h-3.5 animate-pulse" />
            <span>AI COPILOT (LIVE)</span>
          </a>
          <a
            href="#simulator"
            className={`hover:underline underline-offset-4 ${theme === 'light' ? 'text-slate-700 hover:text-sky-800' : 'text-slate-300 hover:text-cyan-300'}`}
          >
            5-VECTOR SCORING
          </a>
          <a
            href="#roi-calculator"
            className={`hover:underline underline-offset-4 ${theme === 'light' ? 'text-slate-700 hover:text-sky-800' : 'text-slate-300 hover:text-cyan-300'}`}
          >
            ROI CALCULATOR
          </a>
          <a
            href="#stations"
            className={`hover:underline underline-offset-4 ${theme === 'light' ? 'text-slate-700 hover:text-sky-800' : 'text-slate-300 hover:text-cyan-300'}`}
          >
            STATIONS (13)
          </a>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="#ai-copilot"
            className={`flex items-center gap-1.5 px-3 py-2 rounded text-xs font-mono font-bold transition-all cursor-pointer border ${
              theme === 'light'
                ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-400 text-cyan-900 shadow-xs'
                : 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-400/70 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">ASK AI COPILOT</span>
            <span className="sm:hidden">AI</span>
          </a>

          <button
            onClick={() => handleLaunchConsole('OVERVIEW')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded text-xs font-mono font-bold transition-all cursor-pointer shadow-md ${
              theme === 'light'
                ? 'bg-sky-600 hover:bg-sky-700 text-white border border-sky-700 shadow-sky-200'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border border-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>ENTER WORKSPACE CONSOLE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section: CAD Blueprint Aesthetic */}
      <section className="relative px-4 sm:px-8 pt-12 pb-16 md:pt-20 md:pb-24 overflow-hidden border-b border-cyan-500/10">
        {/* Subtle grid backdrop decoration */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#0284c715_1px,transparent_1px),linear-gradient(to_bottom,#0284c715_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            {/* Tagline Pill */}
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold mb-6 border ${
              theme === 'light'
                ? 'bg-sky-50 border-sky-300 text-sky-900'
                : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
            }`}>
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>THE ENGINEERING STANDARD FOR MODERN B2B MARKETING OPERATIONS</span>
            </div>

            {/* Display Headline */}
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight mb-6">
              Deterministic Demand Units for{' '}
              <span className={theme === 'light' ? 'text-sky-700 underline decoration-sky-300' : 'text-cyan-400 underline decoration-cyan-500/40'}>
                Dual-Motion
              </span>{' '}
              Enterprises
            </h1>

            {/* Subheading */}
            <p className={`text-base sm:text-lg leading-relaxed mb-8 max-w-2xl font-normal ${
              theme === 'light' ? 'text-slate-600' : 'text-slate-300'
            }`}>
              Bridge the gap between Product-Led Growth and Sales-Led Enterprise deal orchestration.
              Unify live telemetry, 6-persona buying committee coverage, and automated intent playbooks
              inside a calibrated engineering workspace.
            </p>

            {/* Primary Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
              <button
                onClick={() => handleLaunchConsole('OVERVIEW')}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded font-mono text-sm font-bold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-200'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                }`}
              >
                <Terminal className="w-4 h-4" />
                <span>LAUNCH LIVE CONSOLE [SYS.01]</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleLaunchConsole('CHATBOT')}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded font-mono text-sm font-bold border transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-cyan-50 hover:bg-cyan-100 border-cyan-400 text-cyan-900 shadow-xs'
                    : 'bg-cyan-950/80 hover:bg-cyan-900/90 border-cyan-400/80 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                }`}
              >
                <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
                <span>AI COPILOT & TOOLS [ST.13]</span>
              </button>

              <a
                href="#simulator"
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3.5 rounded font-mono text-sm font-semibold border transition-all ${
                  theme === 'light'
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
                    : 'bg-[#091526] hover:bg-cyan-950/60 border-cyan-500/30 text-cyan-300'
                }`}
              >
                <Sliders className="w-4 h-4" />
                <span>TEST DEMAND SCORING SIMULATOR</span>
              </a>
            </div>

            {/* Micro telemetry proof metrics */}
            <div className={`mt-10 pt-6 border-t w-full grid grid-cols-2 sm:grid-cols-4 gap-4 text-center font-mono ${
              theme === 'light' ? 'border-slate-200 text-slate-700' : 'border-cyan-500/20 text-slate-400'
            }`}>
              <div>
                <div className={`text-2xl font-bold ${theme === 'light' ? 'text-sky-800' : 'text-cyan-300'}`}>34%</div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Pipeline Velocity +</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${theme === 'light' ? 'text-sky-800' : 'text-cyan-300'}`}>4.8x</div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Committee Coverage</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${theme === 'light' ? 'text-sky-800' : 'text-cyan-300'}`}>&lt; 180s</div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">PQL to Deal Latency</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`}>100%</div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Algorithmic Clarity</div>
              </div>
            </div>

            {/* Interactive Hero AI Live Prompt Engine */}
            <div className={`mt-8 w-full max-w-2xl mx-auto p-3.5 sm:p-4 rounded-xl border text-left backdrop-blur-md transition-all ${
              theme === 'light'
                ? 'bg-white/95 border-sky-300 shadow-md'
                : 'bg-[#06101f]/90 border-cyan-400/40 shadow-[0_0_25px_rgba(6,182,212,0.15)]'
            }`}>
              <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-cyan-500/20">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-cyan-400" />
                    LIVE AI PROMPT ENGINE [GEMINI 3.5 & 3.1]
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">5 LINKED FUNCTIONS READY</span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (heroInput.trim()) {
                    handleTriggerAiWithPrompt(heroInput);
                    setHeroInput('');
                  }
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={heroInput}
                    onChange={(e) => setHeroInput(e.target.value)}
                    placeholder="Ask Gemini AI or test an operational command directly on this page..."
                    className={`w-full px-3.5 py-2.5 rounded text-xs font-mono border focus:outline-none transition-all ${
                      theme === 'light'
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500'
                        : 'bg-[#091526] border-cyan-500/30 text-cyan-100 focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    }`}
                  />
                </div>
                <button
                  type="submit"
                  className={`px-4 py-2.5 rounded font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>EXECUTE AI</span>
                </button>
              </form>

              {/* Quick Interactive Prompt Chips */}
              <div className="mt-3 flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] font-mono text-slate-400 mr-1">TRY LIVE:</span>
                {[
                  { label: 'Audit Nexus Financial Committee', prompt: 'Audit the buying committee gaps and single-thread risks for Nexus Financial.' },
                  { label: 'Calculate Score (PLG: 96)', prompt: 'Calculate demand score: Telemetry 96, Committee 42, Behavioral 88, Intent 90, Fit 95.' },
                  { label: 'Simulate +150 PLG Seats', prompt: 'Simulate a PLG telemetry surge: +150 active seats and +85% API velocity on DataPulse.' },
                  { label: 'Trigger Infosec Fast-Track', prompt: 'Trigger the Infosec Fast-Track playbook for Starlight Cloud Systems with URGENT priority.' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleTriggerAiWithPrompt(chip.prompt)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono border transition-all cursor-pointer ${
                      theme === 'light'
                        ? 'bg-slate-100 hover:bg-sky-50 border-slate-300 text-slate-700 hover:text-sky-900 hover:border-sky-400'
                        : 'bg-[#091526]/80 hover:bg-cyan-950/80 border-cyan-500/30 text-cyan-300 hover:text-cyan-100 hover:border-cyan-400'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section: Macro Dual-Motion Deterministic Revenue Blueprint */}
      <section id="architecture" className="px-4 sm:px-8 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-xs font-mono font-bold tracking-widest text-cyan-500 uppercase mb-2">
            MACRO ARCHITECTURAL SPECIFICATION
          </div>
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
            Dual-Motion Deterministic Revenue Architecture
          </h2>
          <p className={`mt-3 text-sm sm:text-base max-w-3xl mx-auto ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            Synchronize high-velocity developer telemetry with 6-persona buying committee governance. Explore the 6 deterministic stage gates, cross-motion topology, and real-time telemetry mesh.
          </p>
        </div>

        <DeterministicRevenueBlueprint
          theme={theme}
          onNavigateTab={handleLaunchConsole}
        />
      </section>

      {/* Interactive AI Intelligence Deck & 5 Linked Functions (Directly on Landing Page) */}
      <section id="ai-copilot" className={`px-4 sm:px-8 py-16 border-b ${
        theme === 'light' ? 'bg-slate-50 border-slate-300' : 'bg-[#040914] border-cyan-500/20'
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
                  SYS.AI-01 // GEMINI DUAL-MOTION INTELLIGENCE ENGINE
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                AI Copilot & Linked Function Command Deck
              </h2>
              <p className={`text-xs sm:text-sm mt-2 max-w-3xl ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                Interact directly with the Gemini multi-turn AI assistant right here on the landing page. Select model tiers, audit enterprise accounts, simulate PLG usage spikes, evaluate committee coverage, and dispatch automated playbooks via 5 live callable functions.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded text-xs font-mono border font-bold flex items-center gap-2 ${
                theme === 'light' ? 'bg-white border-slate-300 text-sky-800' : 'bg-[#091526] border-cyan-500/40 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
              }`}>
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>5 LIVE FUNCTIONS ACTIVE</span>
              </span>
            </div>
          </div>

          {/* Embedded Full Interactive Gemini Chatbot & Function Playground */}
          <div className={`rounded-xl border shadow-xl overflow-hidden ${
            theme === 'light'
              ? 'bg-white border-slate-300 shadow-slate-200/80'
              : 'bg-[#060c18] border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)]'
          }`}>
            <GeminiChatbotView
              accounts={accounts}
              theme={theme}
              onNavigateTab={onNavigateTab}
              onSelectAccount={onSelectAccount}
              externalPrompt={externalPromptForAi}
              onClearExternalPrompt={() => setExternalPromptForAi(undefined)}
            />
          </div>
        </div>
      </section>

      {/* Interactive Autonomous AI Demand Unit Simulator Section */}
      <section id="simulator" className={`px-4 sm:px-8 py-16 border-y ${
        theme === 'light' ? 'bg-slate-100/70 border-slate-300' : 'bg-[#040913] border-cyan-500/20'
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center md:text-left mb-8">
            <div className="text-xs font-mono font-bold tracking-widest text-cyan-500 uppercase mb-1">
              MICRO TACTICAL SIMULATION ENGINE
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
              Autonomous AI Demand Unit Simulator
            </h2>
            <p className={`text-xs sm:text-sm mt-1.5 max-w-3xl ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
              Test live mathematical scoring vectors, inspect 6-persona buying committee quorum coverage, simulate autonomous action playbooks, and monitor real-time telemetry streaming for enterprise target accounts.
            </p>
          </div>

          <AutonomousDemandSimulator
            accounts={accounts}
            theme={theme}
            onNavigateTab={handleLaunchConsole}
            onTriggerAiPrompt={handleTriggerAiWithPrompt}
          />
        </div>
      </section>

      {/* Interactive Enterprise Pipeline & ROI Velocity Calculator */}
      <section id="roi-calculator" className={`px-4 sm:px-8 py-16 border-b ${
        theme === 'light' ? 'bg-white border-slate-300' : 'bg-[#040812] border-cyan-500/20'
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <div className="text-xs font-mono font-bold tracking-widest text-cyan-500 uppercase mb-1">
                ENTERPRISE REVENUE MODELING
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold">
                Interactive Pipeline Velocity & ROI Calculator
              </h2>
              <p className={`text-xs sm:text-sm mt-1.5 max-w-2xl ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                Simulate how unifying PLG telemetry with 6-persona buying committee orchestration eliminates single-thread deal stalls and accelerates deal velocity.
              </p>
            </div>

            <button
              onClick={() => {
                const prompt = `Based on an enterprise target pipeline of $${annualPipelineM}M with $${avgDealSizeK}k average deal size and ${buyingCommitteeMaturity} of 6 personas currently engaged, provide a detailed revenue acceleration plan. Calculate projected prevented leakage ($${stallLossReduction}M) and cycle compression (-${cycleDaysSaved} days).`;
                handleTriggerAiWithPrompt(prompt);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded font-mono text-xs font-bold border transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-sky-50 hover:bg-sky-100 border-sky-400 text-sky-900 shadow-xs'
                  : 'bg-cyan-950/80 hover:bg-cyan-900 border-cyan-400/80 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              }`}
            >
              <Bot className="w-4 h-4 text-cyan-400" />
              <span>GENERATE AI REVENUE PLAN</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Interactive Sliders (7 cols) */}
            <div className={`lg:col-span-7 p-6 rounded-xl border space-y-6 ${
              theme === 'light' ? 'bg-slate-50/80 border-slate-300 shadow-xs' : 'bg-[#060e1c] border-cyan-500/25 shadow-lg'
            }`}>
              {/* Slider 1: Target Pipeline */}
              <div>
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                  <span className="font-bold flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-cyan-400" />
                    TARGET ANNUAL PIPELINE ($M)
                  </span>
                  <span className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded ${
                    theme === 'light' ? 'bg-sky-100 text-sky-900' : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                  }`}>
                    ${annualPipelineM}M
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="5"
                  value={annualPipelineM}
                  onChange={(e) => setAnnualPipelineM(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>$5M Mid-Market</span>
                  <span>$50M Growth</span>
                  <span>$150M Large Enterprise</span>
                </div>
              </div>

              {/* Slider 2: Average Deal Size */}
              <div>
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                  <span className="font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    AVERAGE CONTRACT VALUE / ACV ($K)
                  </span>
                  <span className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded ${
                    theme === 'light' ? 'bg-emerald-100 text-emerald-900' : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    ${avgDealSizeK}k
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="300"
                  step="5"
                  value={avgDealSizeK}
                  onChange={(e) => setAvgDealSizeK(Number(e.target.value))}
                  className="w-full accent-emerald-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>$20k Velocity</span>
                  <span>$100k Mid-Market</span>
                  <span>$300k+ Large Enterprise</span>
                </div>
              </div>

              {/* Slider 3: Committee Persona Maturity */}
              <div>
                <div className="flex justify-between items-center text-xs font-mono mb-2">
                  <span className="font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-400" />
                    AVERAGE BUYING COMMITTEE QUORUM ENGAGED
                  </span>
                  <span className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded ${
                    theme === 'light' ? 'bg-indigo-100 text-indigo-900' : 'bg-indigo-950 text-indigo-300 border border-indigo-500/30'
                  }`}>
                    {buyingCommitteeMaturity} of 6 Personas
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={buyingCommitteeMaturity}
                  onChange={(e) => setBuyingCommitteeMaturity(Number(e.target.value))}
                  className="w-full accent-indigo-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                  <span>1 (Single-Threaded Dev)</span>
                  <span>3 (Champion + Tech + User)</span>
                  <span>6 (Full Enterprise Quorum)</span>
                </div>
              </div>

              {/* Selector: PLG Inbound Velocity */}
              <div>
                <div className="text-xs font-mono font-bold mb-2">PRODUCT-LED INBOUND TELEMETRY VELOCITY:</div>
                <div className="grid grid-cols-3 gap-2">
                  {(['STANDARD', 'ACCELERATED', 'HYPER'] as const).map((vel) => (
                    <button
                      key={vel}
                      type="button"
                      onClick={() => setPlgLeadVelocity(vel)}
                      className={`py-2 px-3 rounded text-xs font-mono font-bold border transition-all cursor-pointer ${
                        plgLeadVelocity === vel
                          ? theme === 'light'
                            ? 'bg-sky-600 text-white border-sky-700 shadow-xs'
                            : 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                          : theme === 'light'
                          ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                          : 'bg-[#091526] border-cyan-500/30 text-slate-300 hover:bg-cyan-950/60'
                      }`}
                    >
                      {vel}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Calculated Impact Metrics (5 cols) */}
            <div className={`lg:col-span-5 p-6 rounded-xl border flex flex-col justify-between ${
              theme === 'light' ? 'bg-white border-slate-300 shadow-md' : 'bg-[#071120] border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)]'
            }`}>
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-cyan-500/20 mb-5">
                  <span className="text-xs font-mono font-bold text-cyan-400">PROJECTED ENTERPRISE VALUE</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/40">
                    ESTIMATED ROI
                  </span>
                </div>

                <div className="space-y-4">
                  {/* Metric 1 */}
                  <div className={`p-4 rounded border ${
                    theme === 'light' ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-950/30 border-emerald-500/30'
                  }`}>
                    <div className="text-[11px] font-mono text-slate-500 uppercase">Prevented Pipeline Leakage</div>
                    <div className="text-3xl sm:text-4xl font-mono font-extrabold text-emerald-400 mt-1">
                      +${stallLossReduction}M
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      From automated buying committee multi-threading before single-thread stall.
                    </p>
                  </div>

                  {/* Metric 2 */}
                  <div className={`p-4 rounded border ${
                    theme === 'light' ? 'bg-sky-50 border-sky-200' : 'bg-cyan-950/30 border-cyan-500/30'
                  }`}>
                    <div className="text-[11px] font-mono text-slate-500 uppercase">Sales Cycle Compression</div>
                    <div className="text-3xl sm:text-4xl font-mono font-extrabold text-cyan-300 mt-1">
                      -{cycleDaysSaved} Days
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      PQL telemetry pre-qualifies security and technical evaluations ahead of procurement.
                    </p>
                  </div>

                  {/* Metric 3 */}
                  <div className={`p-4 rounded border ${
                    theme === 'light' ? 'bg-indigo-50 border-indigo-200' : 'bg-indigo-950/30 border-indigo-500/30'
                  }`}>
                    <div className="text-[11px] font-mono text-slate-500 uppercase">PQL-to-SQL Conversion Lift</div>
                    <div className="text-3xl sm:text-4xl font-mono font-extrabold text-indigo-400 mt-1">
                      +{conversionUpliftPct}%
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Deterministic 5-vector composite scoring routes reps only to high-readiness demand units.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-cyan-500/20">
                <button
                  type="button"
                  onClick={() => {
                    const prompt = `Provide an executive summary of our projected dual-motion ROI: $${annualPipelineM}M pipeline, $${avgDealSizeK}k deal size, ${buyingCommitteeMaturity} committee personas mapped, and ${plgLeadVelocity} PLG velocity. Outline the top 3 actionable steps to capture the +$${stallLossReduction}M revenue upside.`;
                    handleTriggerAiWithPrompt(prompt);
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded font-mono text-xs font-bold transition-all cursor-pointer shadow-md ${
                    theme === 'light'
                      ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-200'
                      : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  <span>CONSULT AI COPILOT ON THIS MODEL</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 13 Operational Stations Section */}
      <section id="stations" className="px-4 sm:px-8 py-16 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs font-mono font-bold tracking-widest text-cyan-500 uppercase mb-2">COMPLETE WORKSPACE MATRIX</div>
          <h2 className="text-2xl sm:text-4xl font-bold">13 Calibrated Operational Stations</h2>
          <p className={`mt-3 text-sm sm:text-base max-w-2xl mx-auto ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            Every critical function of modern B2B revenue operations mapped into a dedicated, high-density workstation station.
          </p>
        </div>

        {/* Stations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stations.map((st) => {
            const Icon = st.icon;
            return (
              <div
                key={st.id}
                onClick={() => handleLaunchConsole(st.id)}
                className={`group p-5 rounded border transition-all cursor-pointer flex flex-col justify-between ${
                  theme === 'light'
                    ? 'bg-white border-slate-300 hover:border-sky-500 hover:shadow-md'
                    : 'bg-[#071120] border-cyan-500/20 hover:border-cyan-400/60 hover:bg-[#09172c] hover:shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        theme === 'light' ? 'bg-slate-200 text-slate-800' : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                      }`}>
                        {st.code}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">{st.category}</span>
                    </div>

                    <Icon className={`w-4 h-4 transition-colors ${
                      theme === 'light' ? 'text-sky-700 group-hover:text-sky-900' : 'text-cyan-400 group-hover:text-cyan-200'
                    }`} />
                  </div>

                  <h3 className="font-bold text-sm mb-1.5 group-hover:text-cyan-400 transition-colors">
                    {st.title}
                  </h3>
                  <p className={`text-xs leading-relaxed ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
                    {st.desc}
                  </p>
                </div>

                <div className={`mt-4 pt-3 border-t flex items-center justify-between text-xs font-mono font-semibold ${
                  theme === 'light' ? 'border-slate-100 text-sky-800' : 'border-cyan-500/10 text-cyan-400'
                }`}>
                  <span>LAUNCH STATION</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison: Legacy ABM vs. Dual-Motion Marketing OS */}
      <section className={`px-4 sm:px-8 py-16 border-t ${
        theme === 'light' ? 'bg-slate-50 border-slate-300' : 'bg-[#050b16] border-cyan-500/20'
      }`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-xs font-mono font-bold tracking-widest text-cyan-500 uppercase mb-2">PARADIGM COMPARISON</div>
            <h2 className="text-2xl sm:text-3xl font-bold">Why Enterprise Leaders Replace Legacy ABM</h2>
          </div>

          <div className="overflow-x-auto">
            <table className={`w-full border text-xs font-mono ${
              theme === 'light' ? 'border-slate-300 bg-white' : 'border-cyan-500/30 bg-[#07101e]'
            }`}>
              <thead>
                <tr className={theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-cyan-950/40 text-cyan-300'}>
                  <th className="p-3 text-left border-b border-r border-slate-300 dark:border-cyan-500/30">CAPABILITY</th>
                  <th className="p-3 text-left border-b border-r border-slate-300 dark:border-cyan-500/30 text-slate-500">LEGACY ABM &amp; MQL ENGINES</th>
                  <th className={`p-3 text-left border-b ${theme === 'light' ? 'bg-sky-50 text-sky-900 font-bold' : 'bg-cyan-950/80 text-cyan-200 font-bold'}`}>
                    SYS.01 DUAL-MOTION MARKETING OS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-cyan-500/20">
                <tr>
                  <td className="p-3 font-bold border-r border-slate-200 dark:border-cyan-500/20">Primary Target Entity</td>
                  <td className="p-3 text-slate-500 border-r border-slate-200 dark:border-cyan-500/20">Isolated MQLs or whole account domains</td>
                  <td className={`p-3 font-semibold ${theme === 'light' ? 'text-sky-900 bg-sky-50/50' : 'text-cyan-200 bg-cyan-950/20'}`}>
                    Structured Demand Units with 6-persona buying committees
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold border-r border-slate-200 dark:border-cyan-500/20">Product Telemetry (PLG)</td>
                  <td className="p-3 text-slate-500 border-r border-slate-200 dark:border-cyan-500/20">Siloed in Mixpanel/Amplitude, invisible to sales</td>
                  <td className={`p-3 font-semibold ${theme === 'light' ? 'text-sky-900 bg-sky-50/50' : 'text-cyan-200 bg-cyan-950/20'}`}>
                    Live 30% weighted vector streaming from Snowflake &amp; Segment
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold border-r border-slate-200 dark:border-cyan-500/20">Buying Committee Coverage</td>
                  <td className="p-3 text-slate-500 border-r border-slate-200 dark:border-cyan-500/20">Single contact or lead form submission</td>
                  <td className={`p-3 font-semibold ${theme === 'light' ? 'text-sky-900 bg-sky-50/50' : 'text-cyan-200 bg-cyan-950/20'}`}>
                    Automated gap analysis across Economic, Champion, &amp; Security roles
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold border-r border-slate-200 dark:border-cyan-500/20">Scoring Model Transparency</td>
                  <td className="p-3 text-slate-500 border-r border-slate-200 dark:border-cyan-500/20">Black-box machine learning with unpredictable scores</td>
                  <td className={`p-3 font-semibold ${theme === 'light' ? 'text-sky-900 bg-sky-50/50' : 'text-cyan-200 bg-cyan-950/20'}`}>
                    100% deterministic multi-vector arithmetic with half-life decay
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-bold border-r border-slate-200 dark:border-cyan-500/20">Actionable Response</td>
                  <td className="p-3 text-slate-500 border-r border-slate-200 dark:border-cyan-500/20">Generic SDR cadences with no telemetry context</td>
                  <td className={`p-3 font-semibold ${theme === 'light' ? 'text-sky-900 bg-sky-50/50' : 'text-cyan-200 bg-cyan-950/20'}`}>
                    Surgically targeted playbooks (e.g. Infosec Pack when limits hit)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Final Callout Footer Section */}
      <section className={`px-4 sm:px-8 py-16 text-center border-t ${
        theme === 'light' ? 'bg-white border-slate-300' : 'bg-[#040811] border-cyan-500/20'
      }`}>
        <div className="max-w-3xl mx-auto">
          <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-4 border ${
            theme === 'light' ? 'bg-sky-100 border-sky-300 text-sky-800' : 'bg-cyan-950 border-cyan-400/40 text-cyan-300'
          }`}>
            <Compass className="w-6 h-6 animate-spin-slow" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            Ready to Calibrate Your Marketing Engine?
          </h2>

          <p className={`text-sm sm:text-base leading-relaxed mb-8 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>
            Enter the live Marketing Operations OS workspace. Experience real-time telemetry streaming,
            interactive buying committee topological graphs, and deterministic demand unit scoring.
          </p>

          <button
            onClick={() => handleLaunchConsole('OVERVIEW')}
            className={`inline-flex items-center gap-2 px-8 py-4 rounded font-mono text-sm font-bold transition-all cursor-pointer ${
              theme === 'light'
                ? 'bg-sky-600 hover:bg-sky-700 text-white shadow-xl shadow-sky-200'
                : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_25px_rgba(6,182,212,0.5)]'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>ENTER SYS.01 MARKETING OS WORKSPACE</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="mt-8 text-xs font-mono text-slate-500 flex flex-wrap justify-center items-center gap-4">
            <span>SPEC: DUAL-MOTION OS</span>
            <span>•</span>
            <span>GRID: X80 Y80</span>
            <span>•</span>
            <span>REVISION: 2.4.1</span>
            <span>•</span>
            <span>STATUS: READY</span>
          </div>
        </div>
      </section>

      {/* Floating Sticky Quick AI Copilot Launcher */}
      <div className="fixed bottom-6 right-6 z-50">
        <a
          href="#ai-copilot"
          className={`flex items-center gap-2.5 px-4 py-3 rounded-full font-mono text-xs font-extrabold shadow-2xl transition-all cursor-pointer border ${
            theme === 'light'
              ? 'bg-sky-600 hover:bg-sky-700 text-white border-sky-400 shadow-sky-300/60'
              : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 border-cyan-200 shadow-[0_0_25px_rgba(6,182,212,0.55)]'
          }`}
        >
          <Bot className="w-4 h-4 text-slate-950 animate-bounce" />
          <span>ASK AI COPILOT [LIVE]</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </a>
      </div>
    </div>
  );
};
