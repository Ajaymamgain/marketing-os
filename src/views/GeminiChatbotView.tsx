import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Sliders,
  Play,
  RotateCcw,
  Zap,
  Users,
  BarChart3,
  Flame,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Code2,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Terminal,
  Cpu,
  Layers,
  Search,
  Activity,
  Radio,
  ArrowRight,
} from 'lucide-react';
import {
  ChatMessage,
  GeminiModelTier,
  ChatbotRole,
  ChatFunctionExecution,
  AccountDemandUnit,
} from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface GeminiChatbotViewProps {
  accounts: AccountDemandUnit[];
  theme?: 'dark' | 'light';
  onNavigateTab?: (tab: any) => void;
  onSelectAccount?: (account: AccountDemandUnit) => void;
  externalPrompt?: string;
  onClearExternalPrompt?: () => void;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-init-1',
    role: 'model',
    text: `### [SYS.AI-01] Dual-Motion AI Copilot Online [SYS.VER 3.8-CAD]

Welcome to the **Marketing Operations AI Copilot**. I am connected directly to your dual-motion telemetry stream, 6-persona buying committee graphs, and operational automation engine.

**I have 5 live AI-linked functions you can trigger or automate:**
1. \`calculateDemandScore\` - Compute composite scores, PQL gating, and routing advice
2. \`lookupAccount\` - Inspect live demand units (Starlight, Nexus, AeroDynamics, etc.)
3. \`analyzeCommitteeCoverage\` - Audit 6 buying personas and flag single-thread stall risks
4. \`simulateTelemetrySurge\` - Simulate product seat spikes & API growth
5. \`triggerPlaybook\` - Dispatch operational playbooks across Slack & CRM

Feel free to chat with me naturally, click any starter query below, or use the **Interactive AI Tools Playground** on the right!`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    modelUsed: 'gemini-3.5-flash',
  },
];

const STARTER_PROMPTS = [
  '[AUDIT] Audit buying committee gaps for Nexus Financial',
  '[CALCULATE] Demand score: Telemetry 98, Committee 45, Behavioral 85',
  '[SIMULATE] +150 seat surge on DataPulse Analytics',
  '[PLAYBOOK] Trigger Infosec Fast-Track playbook for Starlight Cloud',
  '[ANALYSIS] Explain how PQL decay half-life interacts with sales routing',
];

export const GeminiChatbotView: React.FC<GeminiChatbotViewProps> = ({
  accounts,
  theme = 'dark',
  onNavigateTab,
  onSelectAccount,
  externalPrompt,
  onClearExternalPrompt,
}) => {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem('cad_gemini_chat_history');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_MESSAGES;
  });

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModelTier>('gemini-3.5-flash');
  const [selectedRole, setSelectedRole] = useState<ChatbotRole>('default');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedFunctions, setExpandedFunctions] = useState<Record<string, boolean>>({});

  // Automation Engine State
  const [isAutonomousActive, setIsAutonomousActive] = useState(true);
  const [autoCadenceTick, setAutoCadenceTick] = useState(0);
  const [autoDispatchedCount, setAutoDispatchedCount] = useState(3);

  const AUTO_TELEMETRY_LOGS = [
    'TELEMETRY STREAM: 5/5 Demand Units Synchronized (<120ms latency)',
    'COMMITTEE WATCHDOG: 1 Single-Thread Risk Detected on Nexus Financial',
    'PQL ROUTER: Starlight Cloud Systems (Score 94) Pre-Approved for SDR Dispatch',
    'VELOCITY ACCELERATOR: DataPulse Analytics Core API Consumption +85% W/W',
    'AUTONOMOUS AGENT: 3 Playbooks Dispatched Successfully across Slack & CRM',
  ];

  // Interactive Tools Playground state
  const [activeToolTab, setActiveToolTab] = useState<
    'score' | 'lookup' | 'committee' | 'surge' | 'playbook'
  >('score');

  // Tool 1: Calculate Score inputs
  const [toolTelemetry, setToolTelemetry] = useState<number>(92);
  const [toolCommittee, setToolCommittee] = useState<number>(68);
  const [toolBehavioral, setToolBehavioral] = useState<number>(80);
  const [toolIntent, setToolIntent] = useState<number>(85);
  const [toolFit, setToolFit] = useState<number>(90);
  const [scoreResult, setScoreResult] = useState<any>(null);

  // Tool 2: Lookup Account
  const [lookupAccountName, setLookupAccountName] = useState<string>(
    accounts[0]?.accountName || 'Starlight Cloud Systems'
  );
  const [lookupResult, setLookupResult] = useState<any>(null);

  // Tool 3: Committee Audit
  const [committeeAccountName, setCommitteeAccountName] = useState<string>(
    'Nexus Financial Technologies'
  );
  const [committeeResult, setCommitteeResult] = useState<any>(null);

  // Tool 4: Simulate Surge
  const [surgeAccountName, setSurgeAccountName] = useState<string>(
    'DataPulse Analytics Core'
  );
  const [surgeSeats, setSurgeSeats] = useState<number>(120);
  const [surgeApiGrowth, setSurgeApiGrowth] = useState<number>(75);
  const [surgeResult, setSurgeResult] = useState<any>(null);

  // Tool 5: Trigger Playbook
  const [playbookAccountName, setPlaybookAccountName] = useState<string>(
    'Nexus Financial Technologies'
  );
  const [playbookName, setPlaybookName] = useState<string>('Infosec Fast-Track');
  const [playbookUrgency, setPlaybookUrgency] = useState<string>('HIGH');
  const [playbookResult, setPlaybookResult] = useState<any>(null);

  const [toolRunning, setToolRunning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Autonomous Cadence Heartbeat
  useEffect(() => {
    if (!isAutonomousActive) return;
    const interval = setInterval(() => {
      setAutoCadenceTick((prev) => (prev + 1) % AUTO_TELEMETRY_LOGS.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [isAutonomousActive]);

  // Automated Real-Time Score Evaluation whenever inputs change
  useEffect(() => {
    const composite = Math.round(
      toolTelemetry * 0.3 +
      toolCommittee * 0.25 +
      toolBehavioral * 0.25 +
      toolIntent * 0.1 +
      toolFit * 0.1
    );
    let qualification = 'NURTURE';
    let recommendedAction = 'Continue automated behavioral nurturing sequence';
    let primaryRisk = 'Insufficient telemetry and buying committee volume';
    if (composite >= 85) {
      qualification = 'PQL_READY';
      recommendedAction = 'Auto-dispatch SDR & schedule technical proof-of-value evaluation';
      primaryRisk = toolCommittee < 65 ? 'Single-threaded champion risk - engage Economic Buyer' : 'None - High conversion readiness';
    } else if (composite >= 65) {
      qualification = 'QUALIFIED_DEMAND_UNIT';
      recommendedAction = 'Engage buying committee through multi-threaded content cadence';
      primaryRisk = toolCommittee < 50 ? 'Missing Security & Procurement decision makers' : 'Telemetry below conversion threshold';
    }
    setScoreResult({
      compositeScore: composite,
      qualification,
      primaryRisk,
      recommendedAction,
      isAutomated: true,
      lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
  }, [toolTelemetry, toolCommittee, toolBehavioral, toolIntent, toolFit]);

  // Automated Real-Time Account Lookup when account changes
  useEffect(() => {
    const acc = accounts.find(
      (a) => a.accountName.toLowerCase() === lookupAccountName.toLowerCase()
    ) || accounts[0];
    if (acc) {
      setLookupResult({
        accountName: acc.accountName,
        industry: acc.industry,
        tier: acc.tier,
        currentStage: acc.stage,
        compositeScore: acc.compositeScore,
        estimatedDealValue: `$${(acc.estDealValue / 1000).toFixed(0)}k ARR`,
        pqlStatus: acc.compositeScore >= 85 ? 'PQL_QUALIFIED' : 'IN_PROGRESS',
        telemetrySummary: {
          activeSeats: acc.telemetry.activeUsers7d,
          velocityGrowth: `+${acc.telemetry.weeklyGrowthRatePct}%`,
          healthScore: `${acc.scores.productTelemetry}/100`,
        },
        committeeSummary: {
          engagedRoles: `${acc.committee.totalIdentified} of ${acc.committee.totalRequired}`,
          championIdentified: acc.committee.championIdentified,
          economicBuyerEngaged: acc.committee.economicBuyerEngaged,
          securitySignedOff: acc.committee.securitySignedOff,
        },
      });
    }
  }, [lookupAccountName, accounts]);

  // Automated Real-Time Committee Audit when target changes
  useEffect(() => {
    const acc = accounts.find(
      (a) => a.accountName.toLowerCase().includes(committeeAccountName.toLowerCase().split(' ')[0])
    ) || accounts[1] || accounts[0];
    if (acc) {
      const missing = acc.committee.missingRoles || [];

      setCommitteeResult({
        accountName: acc.accountName,
        coverageScore: acc.committee.coverageScore,
        identifiedRoles: acc.committee.totalIdentified,
        requiredRoles: acc.committee.totalRequired,
        missingRoles: missing,
        riskLevel: missing.length >= 2 ? 'HIGH_SINGLE_THREAD_RISK' : missing.length === 1 ? 'MODERATE_STALL_RISK' : 'OPTIMAL_QUORUM',
        recommendedIntervention: missing.includes('economic_buyer')
          ? 'Dispatch Executive ROI Playbook via CFO email channel'
          : missing.includes('security_compliance')
          ? 'Initiate Automated Infosec Fast-Track with SOC2 package'
          : 'Ready for Enterprise Commercial Proposal',
      });
    }
  }, [committeeAccountName, accounts]);

  // Automated Real-Time Surge Simulation when sliders move
  useEffect(() => {
    const acc = accounts.find((a) => a.accountName.includes('DataPulse')) || accounts[0];
    const priorSeats = acc?.telemetry?.activeUsers7d || 180;
    const priorTelemScore = acc?.scores?.productTelemetry || 78;
    const priorComp = acc?.compositeScore || 72;

    const simulatedTelem = Math.min(100, Math.round(priorTelemScore + (surgeSeats / 8) + (surgeApiGrowth * 0.15)));
    const scoreDelta = Math.round((simulatedTelem - priorTelemScore) * 0.3);
    const simulatedComp = Math.min(100, priorComp + scoreDelta);
    const triggeredPQL = simulatedComp >= 85;

    setSurgeResult({
      accountName: surgeAccountName,
      simulation: {
        priorSeats,
        newSeats: priorSeats + surgeSeats,
        priorTelemetryScore: priorTelemScore,
        simulatedTelemetryScore: simulatedTelem,
        priorCompositeScore: priorComp,
        simulatedCompositeScore: simulatedComp,
        scoreDelta,
        triggeredPQL,
        newStage: triggeredPQL ? 'opportunity_pipeline' : 'buying_committee',
        automatedActions: triggeredPQL
          ? [
              'Auto-routed to Tier 1 SDR queue',
              'Triggered Slack alert in #revops-signals',
              'Drafted Enterprise Proof-of-Value contract',
            ]
          : ['Increased automated telemetry poll frequency to 15s'],
      },
    });
  }, [surgeAccountName, surgeSeats, surgeApiGrowth, accounts]);

  // Save history
  useEffect(() => {
    try {
      sessionStorage.setItem('cad_gemini_chat_history', JSON.stringify(messages));
    } catch (e) {
      console.error(e);
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Toggle function call detail card
  const toggleFunctionCard = (key: string) => {
    playCadClick();
    setExpandedFunctions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Copy reply text
  const handleCopy = (id: string, text: string) => {
    playCadClick();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear conversation
  const handleClearHistory = () => {
    playCadClick();
    if (confirm('Clear AI Copilot chat history and reset to default?')) {
      setMessages(INITIAL_MESSAGES);
      sessionStorage.removeItem('cad_gemini_chat_history');
    }
  };

  // Automated Quick Action 1: Run Full Pipeline Audit
  const handleRunAutomatedAudit = () => {
    playCadConfirm();
    handleSendMessage(
      '[AUTONOMOUS AUDIT] Execute full automated dual-motion audit: scan all 5 demand units, verify 6-persona buying committee quorum coverage, calculate stage gating, flag single-thread stall risks, and dispatch prioritized next actions.'
    );
  };

  // Automated Quick Action 2: Auto-Dispatch PQL Playbooks
  const handleAutoDispatchPQLs = () => {
    playCadConfirm();
    setAutoDispatchedCount((prev) => prev + 2);
    handleSendMessage(
      '[AUTO-DISPATCH] Run automated playbook routing for all high-readiness accounts (Score >= 85). Send SDR notification to Slack #revops-alerts and initiate Infosec Fast-Track for Starlight Cloud and DataPulse.'
    );
  };

  // Submit chat message
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isLoading) return;

    playCadClick();
    setInputText('');

    const userMessage: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      // Send conversation to server-side Gemini endpoint
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            text: m.text,
          })),
          model: selectedModel,
          role: selectedRole,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      const aiMessage: ChatMessage = {
        id: `msg-ai-${Date.now()}`,
        role: 'model',
        text: data.reply || 'Analysis complete.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed || selectedModel,
        isSimulated: data.isSimulated,
        functionCalls: data.functionCalls,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: 'model',
        text: `[SYSTEM NOTICE] Request encountered a network or service delay (${err.message || 'unknown'}). Running in offline deterministic simulation mode.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: `${selectedModel} (Fallback)`,
        isSimulated: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger external prompt if provided
  useEffect(() => {
    if (externalPrompt && externalPrompt.trim()) {
      handleSendMessage(externalPrompt);
      if (onClearExternalPrompt) {
        onClearExternalPrompt();
      }
    }
  }, [externalPrompt]);

  // Direct interactive function runner
  const handleRunToolDirectly = async (functionName: string, args: any) => {
    playCadClick();
    setToolRunning(true);
    try {
      const res = await fetch('/api/gemini/run-function', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ functionName, args }),
      });
      const data = await res.json();
      if (data.success) {
        if (functionName === 'calculateDemandScore') setScoreResult(data.result);
        if (functionName === 'lookupAccount') setLookupResult(data.result);
        if (functionName === 'analyzeCommitteeCoverage') setCommitteeResult(data.result);
        if (functionName === 'simulateTelemetrySurge') setSurgeResult(data.result);
        if (functionName === 'triggerPlaybook') setPlaybookResult(data.result);
      }
    } catch (e) {
      console.error('Tool run failed:', e);
    } finally {
      setToolRunning(false);
    }
  };

  // Send tool results to chat
  const handleSendToolResultToChat = (title: string, summary: string) => {
    handleSendMessage(`[Ran Tool: ${title}] ${summary}`);
  };

  return (
    <div className="flex flex-col h-full w-full space-y-4 font-mono">
      {/* Top Station Header & Controls (Automated CAD Command Bar) */}
      <div
        className={`p-4 rounded-xl border flex flex-col gap-3.5 transition-all ${
          theme === 'light'
            ? 'bg-white border-slate-300 text-slate-900 shadow-sm'
            : 'bg-[#071120] border-cyan-500/40 text-cyan-100 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
        }`}
      >
        {/* Upper Row: Station Title, Autonomous Mode Badge, Quick Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border flex items-center justify-center ${
              theme === 'light'
                ? 'bg-sky-50 border-sky-300 text-sky-700'
                : 'bg-cyan-950/80 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
            }`}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold tracking-wider text-cyan-400">STATION 13</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  theme === 'light'
                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-cyan-950/90 border-cyan-500/40 text-cyan-300'
                }`}>
                  GEMINI AI DUAL-MOTION COPILOT
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playCadClick();
                    setIsAutonomousActive(!isAutonomousActive);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                    isAutonomousActive
                      ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isAutonomousActive ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                  <span>{isAutonomousActive ? 'AUTONOMOUS ENGINE: ACTIVE' : 'MANUAL MODE'}</span>
                </button>
              </div>
              <div className="text-sm font-bold tracking-tight mt-0.5">
                Automated Revenue Intelligence & 5-Linked Execution Engines
              </div>
            </div>
          </div>

          {/* Quick Automation Execution Buttons in Header */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRunAutomatedAudit}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-sky-600 hover:bg-sky-700 text-white border-sky-700 shadow-xs'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 border-cyan-300 font-extrabold shadow-[0_0_12px_rgba(6,182,212,0.3)]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>RUN AUTO-AUDIT</span>
            </button>

            <button
              type="button"
              onClick={handleAutoDispatchPQLs}
              disabled={isLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold border transition-all cursor-pointer ${
                theme === 'light'
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                  : 'bg-[#0a1b33] hover:bg-cyan-950 border-cyan-500/50 text-cyan-200 shadow-xs'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
              <span>AUTO-DISPATCH PQLS</span>
            </button>
          </div>
        </div>

        {/* Lower Row: Active Telemetry Heartbeat Ticker & Model / Role Selectors */}
        <div className={`pt-2.5 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
          theme === 'light' ? 'border-slate-200' : 'border-cyan-500/20'
        }`}>
          {/* Real-Time Telemetry Cadence Ticker */}
          <div className="flex items-center gap-2 text-[11px]">
            <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse shrink-0" />
            <span className="text-slate-400 uppercase font-bold shrink-0">CADENCE TICK:</span>
            <span className={`font-mono transition-all font-semibold ${
              theme === 'light' ? 'text-sky-800' : 'text-cyan-300'
            }`}>
              {AUTO_TELEMETRY_LOGS[autoCadenceTick]}
            </span>
          </div>

          {/* Model & Role Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Model Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] opacity-75">Model:</span>
              <select
                value={selectedModel}
                onChange={(e) => {
                  playCadClick();
                  setSelectedModel(e.target.value as GeminiModelTier);
                }}
                className={`text-xs px-2.5 py-1 rounded border focus:outline-none cursor-pointer font-bold ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-[#09182d] border-cyan-500/50 text-cyan-200'
                }`}
              >
                <option value="gemini-3.5-flash">gemini-3.5-flash (Automated Default)</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast Telemetry Stream)</option>
                <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Deep Enterprise Reasoning)</option>
              </select>
            </div>

            {/* Role Persona Selector */}
            <div className="flex items-center gap-1.5 text-xs">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[11px] opacity-75">Role:</span>
              <select
                value={selectedRole}
                onChange={(e) => {
                  playCadClick();
                  setSelectedRole(e.target.value as ChatbotRole);
                }}
                className={`text-xs px-2.5 py-1 rounded border focus:outline-none cursor-pointer font-bold ${
                  theme === 'light'
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-[#09182d] border-cyan-500/50 text-cyan-200'
                }`}
              >
                <option value="default">Dual-Motion Revenue Architect (All-Around)</option>
                <option value="telemetry_analyst">Telemetry & Usage Velocity Analyst</option>
                <option value="committee_strategist">Enterprise Buying Committee Strategist</option>
                <option value="pipeline_commander">Marketing Ops Pipeline Commander</option>
              </select>
            </div>

            {/* Clear Button */}
            <button
              onClick={handleClearHistory}
              className={`p-1.5 rounded border text-xs flex items-center gap-1 hover:opacity-80 transition cursor-pointer ${
                theme === 'light'
                  ? 'bg-slate-200 border-slate-300 text-slate-700'
                  : 'bg-red-950/40 border-red-500/40 text-red-300'
              }`}
              title="Reset Chat History"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold">RESET</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Chat Area (60%), Right Interactive AI Tools (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0">
        {/* Left Column: Chat Conversation */}
        <div
          className={`lg:col-span-7 flex flex-col rounded border min-h-[550px] max-h-[780px] overflow-hidden ${
            theme === 'light'
              ? 'bg-white border-slate-300'
              : 'bg-[#060e1c]/95 border-cyan-500/30'
          }`}
        >
          {/* Chat Header Sub-bar */}
          <div
            className={`px-4 py-2 border-b flex items-center justify-between text-xs ${
              theme === 'light'
                ? 'bg-slate-50 border-slate-200 text-slate-600'
                : 'bg-[#091526] border-cyan-500/30 text-cyan-300/80'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>CONVERSATION THREAD ({messages.length} messages)</span>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono">
              AI-LINKED TOOLS ACTIVE: 5
            </span>
          </div>

          {/* Scrollable Message List */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* Meta Label */}
                  <div className="flex items-center gap-2 mb-1 text-[10px] opacity-70">
                    <span className="font-bold">
                      {isUser ? 'OPERATOR (YOU)' : `AI COPILOT [${msg.modelUsed || 'Gemini'}]`}
                    </span>
                    <span>{msg.timestamp}</span>
                    {msg.isSimulated && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-400/40">
                        SIMULATION
                      </span>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={`max-w-[92%] rounded-md p-3.5 text-xs leading-relaxed border relative group ${
                      isUser
                        ? theme === 'light'
                          ? 'bg-sky-700 text-white border-sky-800'
                          : 'bg-cyan-950/90 text-cyan-100 border-cyan-400/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        : theme === 'light'
                          ? 'bg-slate-100 text-slate-900 border-slate-300'
                          : 'bg-[#0c1e36]/90 text-slate-100 border-slate-700'
                    }`}
                  >
                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition p-1 rounded bg-black/40 hover:bg-black/70 text-cyan-300 cursor-pointer"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>

                    {/* Markdown-like formatting */}
                    <div className="whitespace-pre-wrap space-y-2">
                      {msg.text.split('\n\n').map((para, idx) => {
                        // Header 3
                        if (para.startsWith('### ')) {
                          return (
                            <h4 key={idx} className="font-bold text-sm text-cyan-400 border-b border-cyan-500/20 pb-1">
                              {para.replace('### ', '')}
                            </h4>
                          );
                        }
                        // Bullet lines
                        if (para.includes('\n- ') || para.startsWith('- ')) {
                          return (
                            <ul key={idx} className="list-disc pl-4 space-y-1">
                              {para
                                .split('\n')
                                .filter((line) => line.trim().startsWith('- '))
                                .map((item, lIdx) => (
                                  <li key={lIdx}>{item.replace('- ', '')}</li>
                                ))}
                            </ul>
                          );
                        }
                        return <p key={idx}>{para}</p>;
                      })}
                    </div>

                    {/* Function Calls Inspector Widget inside message */}
                    {msg.functionCalls && msg.functionCalls.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-cyan-500/30 space-y-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-400">
                          <Zap className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                          <span>AI-LINKED FUNCTION EXECUTED:</span>
                        </div>

                        {msg.functionCalls.map((fc, fcIdx) => {
                          const cardKey = `${msg.id}-${fc.name}-${fcIdx}`;
                          const isExpanded = expandedFunctions[cardKey] ?? false;

                          return (
                            <div
                              key={fcIdx}
                              className="rounded border border-cyan-500/40 bg-black/40 p-2 text-[11px]"
                            >
                              <div
                                onClick={() => toggleFunctionCard(cardKey)}
                                className="flex items-center justify-between cursor-pointer hover:text-cyan-300"
                              >
                                <div className="flex items-center gap-2">
                                  <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                                  <span className="font-bold text-cyan-300">
                                    {fc.name}()
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    SUCCESS
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-cyan-400">
                                  <span>{isExpanded ? 'Hide Payload' : 'Inspect Payload'}</span>
                                  {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  )}
                                </div>
                              </div>

                              {/* Collapsible raw argument & result inspector */}
                              {isExpanded && (
                                <div className="mt-2 pt-2 border-t border-cyan-500/20 space-y-1 text-[10px]">
                                  <div className="text-cyan-400 font-bold">Arguments:</div>
                                  <pre className="bg-black/60 p-1.5 rounded overflow-x-auto text-emerald-300">
                                    {JSON.stringify(fc.args, null, 2)}
                                  </pre>
                                  <div className="text-cyan-400 font-bold mt-1">Returned Data:</div>
                                  <pre className="bg-black/60 p-1.5 rounded overflow-x-auto text-cyan-200">
                                    {JSON.stringify(fc.result, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 text-xs text-cyan-400 animate-pulse">
                <Bot className="w-4 h-4" />
                <span>Thinking & executing AI-linked functions...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Starter Prompts */}
          <div
            className={`px-3 py-2 border-t flex flex-wrap gap-1.5 text-[10px] ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-[#091526] border-cyan-500/30'
            }`}
          >
            <span className="text-cyan-400 self-center font-bold">QUICK EXEC:</span>
            {STARTER_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className={`px-2 py-1 rounded border transition cursor-pointer text-left truncate max-w-[280px] ${
                  theme === 'light'
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-[#0c1f38] border-cyan-500/30 text-cyan-200 hover:border-cyan-400 hover:text-white'
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div
            className={`p-3 border-t flex items-center gap-2 ${
              theme === 'light' ? 'bg-white border-slate-200' : 'bg-[#071324] border-cyan-500/40'
            }`}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder="Ask anything or command: 'Audit Nexus Financial', 'Score Telemetry 90, Committee 60'..."
              disabled={isLoading}
              className={`flex-1 px-3 py-2 text-xs rounded border focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                theme === 'light'
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
                  : 'bg-[#09182d] border-cyan-500/50 text-cyan-100 placeholder:text-cyan-400/40'
              }`}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={isLoading || !inputText.trim()}
              className="px-4 py-2 rounded bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-cyan-400 disabled:opacity-50 transition cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>SEND</span>
            </button>
          </div>
        </div>

        {/* Right Column: Interactive AI-Linked Function Playground */}
        <div
          className={`lg:col-span-5 flex flex-col rounded border overflow-hidden ${
            theme === 'light'
              ? 'bg-slate-50 border-slate-300'
              : 'bg-[#071324]/95 border-cyan-500/40'
          }`}
        >
          {/* Playground Header */}
          <div
            className={`px-4 py-2.5 border-b flex items-center justify-between text-xs font-bold ${
              theme === 'light'
                ? 'bg-slate-200/80 border-slate-300 text-slate-800'
                : 'bg-[#09182d] border-cyan-500/40 text-cyan-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>AI-LINKED FUNCTION PLAYGROUND</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              PLAY & TEST LIVE
            </span>
          </div>

          {/* Function Tabs */}
          <div className="flex border-b border-cyan-500/30 text-[10px] overflow-x-auto">
            <button
              onClick={() => {
                playCadClick();
                setActiveToolTab('score');
              }}
              className={`flex-1 py-2 px-2 text-center font-bold border-r border-cyan-500/20 cursor-pointer transition ${
                activeToolTab === 'score'
                  ? 'bg-cyan-500/20 text-cyan-300 border-b-2 border-b-cyan-400'
                  : 'hover:bg-cyan-950/40 text-cyan-400/70'
              }`}
            >
              1. DEMAND SCORE
            </button>
            <button
              onClick={() => {
                playCadClick();
                setActiveToolTab('committee');
              }}
              className={`flex-1 py-2 px-2 text-center font-bold border-r border-cyan-500/20 cursor-pointer transition ${
                activeToolTab === 'committee'
                  ? 'bg-cyan-500/20 text-cyan-300 border-b-2 border-b-cyan-400'
                  : 'hover:bg-cyan-950/40 text-cyan-400/70'
              }`}
            >
              2. COMMITTEE
            </button>
            <button
              onClick={() => {
                playCadClick();
                setActiveToolTab('surge');
              }}
              className={`flex-1 py-2 px-2 text-center font-bold border-r border-cyan-500/20 cursor-pointer transition ${
                activeToolTab === 'surge'
                  ? 'bg-cyan-500/20 text-cyan-300 border-b-2 border-b-cyan-400'
                  : 'hover:bg-cyan-950/40 text-cyan-400/70'
              }`}
            >
              3. PLG SURGE
            </button>
            <button
              onClick={() => {
                playCadClick();
                setActiveToolTab('lookup');
              }}
              className={`flex-1 py-2 px-2 text-center font-bold border-r border-cyan-500/20 cursor-pointer transition ${
                activeToolTab === 'lookup'
                  ? 'bg-cyan-500/20 text-cyan-300 border-b-2 border-b-cyan-400'
                  : 'hover:bg-cyan-950/40 text-cyan-400/70'
              }`}
            >
              4. LOOKUP
            </button>
            <button
              onClick={() => {
                playCadClick();
                setActiveToolTab('playbook');
              }}
              className={`flex-1 py-2 px-2 text-center font-bold cursor-pointer transition ${
                activeToolTab === 'playbook'
                  ? 'bg-cyan-500/20 text-cyan-300 border-b-2 border-b-cyan-400'
                  : 'hover:bg-cyan-950/40 text-cyan-400/70'
              }`}
            >
              5. PLAYBOOK
            </button>
          </div>

          {/* Playground Tool Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
            {/* TAB 1: calculateDemandScore */}
            {activeToolTab === 'score' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                    fn: calculateDemandScore()
                  </span>
                  <span className="text-[10px] text-cyan-400/70">Dual-Motion Formula</span>
                </div>
                <p className="text-[11px] opacity-80">
                  Calculates composite score (0-100), stage-gate progression, and primary sales-routing risks.
                </p>

                {/* Sliders */}
                <div className="space-y-2 p-2.5 rounded bg-black/30 border border-cyan-500/20">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Product Telemetry (30% wt):</span>
                      <span className="font-bold text-cyan-300">{toolTelemetry}/100</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={toolTelemetry}
                      onChange={(e) => setToolTelemetry(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Buying Committee Coverage (25% wt):</span>
                      <span className="font-bold text-cyan-300">{toolCommittee}/100</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={toolCommittee}
                      onChange={(e) => setToolCommittee(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Behavioral Content Engagement (25% wt):</span>
                      <span className="font-bold text-cyan-300">{toolBehavioral}/100</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={toolBehavioral}
                      onChange={(e) => setToolBehavioral(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div>
                      <span>Intent Surge (10%):</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={toolIntent}
                        onChange={(e) => setToolIntent(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded bg-[#091526] border border-cyan-500/40 text-cyan-300"
                      />
                    </div>
                    <div>
                      <span>ICP Fit (10%):</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={toolFit}
                        onChange={(e) => setToolFit(Number(e.target.value))}
                        className="w-full px-2 py-1 rounded bg-[#091526] border border-cyan-500/40 text-cyan-300"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleRunToolDirectly('calculateDemandScore', {
                        telemetryScore: toolTelemetry,
                        committeeScore: toolCommittee,
                        behavioralScore: toolBehavioral,
                        intentScore: toolIntent,
                        fitScore: toolFit,
                      })
                    }
                    disabled={toolRunning}
                    className="flex-1 py-2 rounded bg-cyan-500 text-slate-950 font-bold flex items-center justify-center gap-1.5 hover:bg-cyan-400 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>RUN CALCULATION</span>
                  </button>
                  {scoreResult && (
                    <button
                      onClick={() =>
                        handleSendToolResultToChat(
                          'calculateDemandScore',
                          `Calculated Composite Score ${scoreResult.compositeScore}/100. Status: ${scoreResult.qualification}. Next: ${scoreResult.recommendedAction}`
                        )
                      }
                      className="px-3 py-2 rounded border border-cyan-500/50 text-cyan-300 hover:bg-cyan-950/60 cursor-pointer"
                    >
                      SEND TO CHAT
                    </button>
                  )}
                </div>

                {/* Score Output Card */}
                {scoreResult && (
                  <div className="p-3 rounded bg-cyan-950/40 border border-cyan-400/50 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-cyan-400 font-bold">CALCULATION RESULT:</span>
                      <span className="text-base font-bold text-cyan-300">
                        {scoreResult.compositeScore} / 100
                      </span>
                    </div>
                    <div className="text-[11px]">
                      <strong>Qualification:</strong> {scoreResult.qualification}
                    </div>
                    <div className="text-[11px]">
                      <strong>Primary Risk:</strong> {scoreResult.primaryRisk}
                    </div>
                    <div className="text-[11px] text-emerald-300">
                      <strong>Recommended:</strong> {scoreResult.recommendedAction}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: analyzeCommitteeCoverage */}
            {activeToolTab === 'committee' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    fn: analyzeCommitteeCoverage()
                  </span>
                  <span className="text-[10px] text-cyan-400/70">6-Persona Audit</span>
                </div>
                <p className="text-[11px] opacity-80">
                  Inspects missing stakeholders (Economic Buyer, Champion, Infosec, Procurement) and diagnoses single-thread deal stall danger.
                </p>

                <div>
                  <label className="text-[11px] opacity-75">Target Account:</label>
                  <select
                    value={committeeAccountName}
                    onChange={(e) => setCommitteeAccountName(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded bg-[#091526] border border-cyan-500/40 text-cyan-300"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.accountName}>
                        {a.accountName} ({a.tier})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleRunToolDirectly('analyzeCommitteeCoverage', {
                        accountName: committeeAccountName,
                      })
                    }
                    disabled={toolRunning}
                    className="flex-1 py-2 rounded bg-cyan-500 text-slate-950 font-bold flex items-center justify-center gap-1.5 hover:bg-cyan-400 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>AUDIT 6 PERSONAS</span>
                  </button>
                  {committeeResult && (
                    <button
                      onClick={() =>
                        handleSendToolResultToChat(
                          'analyzeCommitteeCoverage',
                          `Audited ${committeeResult.accountName}. Coverage: ${committeeResult.coverageScore}%. Status: ${committeeResult.riskLevel}. Missing: ${committeeResult.missingRoles?.join(', ') || 'None'}`
                        )
                      }
                      className="px-3 py-2 rounded border border-cyan-500/50 text-cyan-300 hover:bg-cyan-950/60 cursor-pointer"
                    >
                      SEND TO CHAT
                    </button>
                  )}
                </div>

                {/* Committee Result */}
                {committeeResult && (
                  <div className="p-3 rounded bg-black/40 border border-cyan-500/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300">
                        {committeeResult.accountName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          committeeResult.isSingleThreaded
                            ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {committeeResult.riskLevel}
                      </span>
                    </div>

                    <div className="text-[11px]">
                      Coverage:{' '}
                      <strong>
                        {committeeResult.coverageScore}% ({committeeResult.identifiedRoles}/
                        {committeeResult.requiredRoles} roles)
                      </strong>
                    </div>

                    {/* Roles checklist */}
                    <div className="space-y-1 pt-1 border-t border-cyan-500/20">
                      {committeeResult.rolesMatrix?.map((r: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-[10px] py-0.5"
                        >
                          <span className="flex items-center gap-1.5">
                            {r.filled ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                            )}
                            <span>{r.role}</span>
                          </span>
                          <span className="opacity-60">{r.criticality}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[10px] text-yellow-300 pt-1 border-t border-cyan-500/20">
                      <strong>Next Playbook:</strong> {committeeResult.recommendedIntervention}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: simulateTelemetrySurge */}
            {activeToolTab === 'surge' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    fn: simulateTelemetrySurge()
                  </span>
                  <span className="text-[10px] text-cyan-400/70">PLG Expansion</span>
                </div>
                <p className="text-[11px] opacity-80">
                  Simulates user seat spike and API call velocity surge to test automatic PQL threshold triggering.
                </p>

                <div>
                  <label className="text-[11px] opacity-75">Target Account:</label>
                  <select
                    value={surgeAccountName}
                    onChange={(e) => setSurgeAccountName(e.target.value)}
                    className="w-full mt-1 px-2.5 py-1.5 rounded bg-[#091526] border border-cyan-500/40 text-cyan-300"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.accountName}>
                        {a.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 p-2.5 rounded bg-black/30 border border-cyan-500/20">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>Simulate Additional Active Seats:</span>
                      <span className="font-bold text-cyan-300">+{surgeSeats} seats</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      step="10"
                      value={surgeSeats}
                      onChange={(e) => setSurgeSeats(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span>API Call Consumption Velocity:</span>
                      <span className="font-bold text-cyan-300">+{surgeApiGrowth}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="200"
                      step="5"
                      value={surgeApiGrowth}
                      onChange={(e) => setSurgeApiGrowth(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleRunToolDirectly('simulateTelemetrySurge', {
                        accountName: surgeAccountName,
                        additionalSeats: surgeSeats,
                        apiUsageGrowthPct: surgeApiGrowth,
                      })
                    }
                    disabled={toolRunning}
                    className="flex-1 py-2 rounded bg-cyan-500 text-slate-950 font-bold flex items-center justify-center gap-1.5 hover:bg-cyan-400 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>SIMULATE PLG SURGE</span>
                  </button>
                  {surgeResult && (
                    <button
                      onClick={() =>
                        handleSendToolResultToChat(
                          'simulateTelemetrySurge',
                          `Simulated +${surgeSeats} seats on ${surgeAccountName}. Score shifted from ${surgeResult.simulation?.priorCompositeScore} to ${surgeResult.simulation?.simulatedCompositeScore}. PQL Triggered: ${surgeResult.simulation?.triggeredPQL ? 'YES' : 'NO'}`
                        )
                      }
                      className="px-3 py-2 rounded border border-cyan-500/50 text-cyan-300 hover:bg-cyan-950/60 cursor-pointer"
                    >
                      SEND TO CHAT
                    </button>
                  )}
                </div>

                {/* Surge Result Output */}
                {surgeResult && (
                  <div className="p-3 rounded bg-cyan-950/40 border border-cyan-400/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-300">
                        {surgeResult.accountName}
                      </span>
                      {surgeResult.simulation?.triggeredPQL && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/30 border border-emerald-400 text-emerald-300 font-bold text-[10px] flex items-center gap-1">
                          <Zap className="w-3 h-3 text-emerald-400 fill-current" />
                          <span>PQL TRIGGER REACHED</span>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-cyan-500/20">
                      <div className="flex items-center gap-1.5">
                        <span>Seats: {surgeResult.simulation?.priorSeats}</span>
                        <ArrowRight className="w-3 h-3 text-cyan-400" />
                        <strong>{surgeResult.simulation?.newSeats}</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>Telemetry Score: {surgeResult.simulation?.priorTelemetryScore}</span>
                        <ArrowRight className="w-3 h-3 text-cyan-400" />
                        <strong>{surgeResult.simulation?.simulatedTelemetryScore}</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span>Composite Score: {surgeResult.simulation?.priorCompositeScore}</span>
                        <ArrowRight className="w-3 h-3 text-cyan-400" />
                        <strong className="text-cyan-300">
                          {surgeResult.simulation?.simulatedCompositeScore} (+
                          {surgeResult.simulation?.scoreDelta})
                        </strong>
                      </div>
                      <div>
                        New Stage: <strong>{surgeResult.simulation?.newStage}</strong>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-cyan-500/20 text-[10px] space-y-0.5">
                      <div className="text-cyan-400 font-bold">Automated Dispatches:</div>
                      {surgeResult.simulation?.automatedActions?.map(
                        (act: string, idx: number) => (
                          <div key={idx} className="flex items-center gap-1 text-emerald-300">
                            <Check className="w-3 h-3" />
                            <span>{act}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: lookupAccount */}
            {activeToolTab === 'lookup' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-cyan-400" />
                    fn: lookupAccount()
                  </span>
                  <span className="text-[10px] text-cyan-400/70">Database Query</span>
                </div>
                <p className="text-[11px] opacity-80">
                  Retrieves live CAD demand unit telemetry metrics, deal value, stage, and committee health.
                </p>

                <div>
                  <label className="text-[11px] opacity-75">Select or Type Account:</label>
                  <input
                    type="text"
                    value={lookupAccountName}
                    onChange={(e) => setLookupAccountName(e.target.value)}
                    placeholder="e.g. Starlight, Nexus, AeroDynamics..."
                    className="w-full mt-1 px-2.5 py-1.5 rounded bg-[#091526] border border-cyan-500/40 text-cyan-300 text-xs"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleRunToolDirectly('lookupAccount', {
                        accountName: lookupAccountName,
                      })
                    }
                    disabled={toolRunning}
                    className="flex-1 py-2 rounded bg-cyan-500 text-slate-950 font-bold flex items-center justify-center gap-1.5 hover:bg-cyan-400 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>QUERY ACCOUNT METRIC</span>
                  </button>
                  {lookupResult?.success && (
                    <button
                      onClick={() =>
                        handleSendToolResultToChat(
                          'lookupAccount',
                          `Inspected ${lookupResult.account?.name}. Stage: ${lookupResult.account?.stage}, Score: ${lookupResult.account?.compositeScore}, Est Value: $${lookupResult.account?.estDealValue?.toLocaleString()}`
                        )
                      }
                      className="px-3 py-2 rounded border border-cyan-500/50 text-cyan-300 hover:bg-cyan-950/60 cursor-pointer"
                    >
                      SEND TO CHAT
                    </button>
                  )}
                </div>

                {lookupResult && lookupResult.success && (
                  <div className="p-3 rounded bg-black/40 border border-cyan-500/40 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-cyan-300">
                        {lookupResult.account?.name}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                        {lookupResult.account?.tier}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-90">{lookupResult.summary}</div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-cyan-500/20">
                      <div>
                        Active Users: <strong>{lookupResult.account?.telemetry?.activeUsers}</strong>
                      </div>
                      <div>
                        Weekly Events: <strong>{lookupResult.account?.telemetry?.weeklyEvents}</strong>
                      </div>
                      <div>
                        API Velocity:{' '}
                        <strong className="text-emerald-300">
                          {lookupResult.account?.telemetry?.apiVelocityGrowth}
                        </strong>
                      </div>
                      <div>
                        Telemetry Health:{' '}
                        <strong className="text-cyan-300">
                          {lookupResult.account?.telemetry?.healthScore}/100
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: triggerPlaybook */}
            {activeToolTab === 'playbook' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    fn: triggerPlaybook()
                  </span>
                  <span className="text-[10px] text-cyan-400/70">Marketing Ops Automation</span>
                </div>
                <p className="text-[11px] opacity-80">
                  Executes end-to-end multi-channel orchestration tasks across Slack, HubSpot sequences, and Salesforce pipeline alerts.
                </p>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] opacity-75">Target Account:</label>
                    <select
                      value={playbookAccountName}
                      onChange={(e) => setPlaybookAccountName(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded bg-[#091526] border border-cyan-500/40 text-cyan-300"
                    >
                      {accounts.map((a) => (
                        <option key={a.id} value={a.accountName}>
                          {a.accountName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] opacity-75">Select Automation Playbook:</label>
                    <select
                      value={playbookName}
                      onChange={(e) => setPlaybookName(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded bg-[#091526] border border-cyan-500/40 text-cyan-300"
                    >
                      <option value="Infosec Fast-Track">Infosec Fast-Track (SOC2 / FedRAMP Packet)</option>
                      <option value="Executive Multi-Threading">Executive Multi-Threading (VP/C-Level Align)</option>
                      <option value="PQL Slack Dispatch">PQL Slack Dispatch (Sales Engineering Alert)</option>
                      <option value="High-Intent Surge Blitz">High-Intent Surge Blitz (G2/Bombora Surge)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] opacity-75">Urgency Level:</label>
                    <select
                      value={playbookUrgency}
                      onChange={(e) => setPlaybookUrgency(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded bg-[#091526] border border-cyan-500/40 text-cyan-300"
                    >
                      <option value="CRITICAL">CRITICAL (Immediate SLA &lt; 30m)</option>
                      <option value="HIGH">HIGH (&lt; 2h SLA)</option>
                      <option value="MEDIUM">MEDIUM (Standard 24h)</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      handleRunToolDirectly('triggerPlaybook', {
                        accountName: playbookAccountName,
                        playbookName,
                        urgency: playbookUrgency,
                      })
                    }
                    disabled={toolRunning}
                    className="flex-1 py-2 rounded bg-cyan-500 text-slate-950 font-bold flex items-center justify-center gap-1.5 hover:bg-cyan-400 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>TRIGGER AUTOMATION</span>
                  </button>
                  {playbookResult && (
                    <button
                      onClick={() =>
                        handleSendToolResultToChat(
                          'triggerPlaybook',
                          `Triggered ${playbookResult.playbookName} for ${playbookResult.accountName}. Dispatch ID: ${playbookResult.playbookId}. Urgency: ${playbookResult.urgency}`
                        )
                      }
                      className="px-3 py-2 rounded border border-cyan-500/50 text-cyan-300 hover:bg-cyan-950/60 cursor-pointer"
                    >
                      SEND TO CHAT
                    </button>
                  )}
                </div>

                {/* Playbook Output */}
                {playbookResult && (
                  <div className="p-3 rounded bg-black/40 border border-cyan-500/40 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-cyan-300">
                        {playbookResult.playbookName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {playbookResult.status}
                      </span>
                    </div>

                    <div className="text-[10px] opacity-75">
                      Dispatch ID: <code>{playbookResult.playbookId}</code> | Target:{' '}
                      <strong>{playbookResult.accountName}</strong>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-cyan-500/20 text-[10px]">
                      <div className="font-bold text-cyan-400">Automated Actions:</div>
                      {playbookResult.actionsDispatched?.map((a: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-1.5 text-slate-300">
                          <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
