import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  ShieldCheck,
  Cpu,
  Key,
  Lock,
  CornerDownLeft,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { AccountDemandUnit } from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface WorkspaceTerminalViewProps {
  accounts: AccountDemandUnit[];
}

interface CommandLog {
  command?: string;
  output: string | React.ReactNode;
  timestamp: string;
  isError?: boolean;
}

export const WorkspaceTerminalView: React.FC<WorkspaceTerminalViewProps> = ({
  accounts,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [logs, setLogs] = useState<CommandLog[]>([
    {
      output: 'SYS.01 CAD OPERATING KERNEL INITIALIZED [REV 2.4.1]',
      timestamp: '00:00:01',
    },
    {
      output: 'TELEMETRY MESH INGESTION ENGINE CONNECTED. 6 NODES ONLINE.',
      timestamp: '00:00:02',
    },
    {
      output: 'Type "help" to list available diagnostic and scoring query commands.',
      timestamp: '00:00:03',
    },
  ]);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const runCommand = (cmdStr: string) => {
    const trimmed = cmdStr.trim();
    if (!trimmed) return;

    playCadClick();
    const time = new Date().toTimeString().split(' ')[0];
    const parts = trimmed.split(' ');
    const mainCmd = parts[0].toLowerCase();

    let resultOutput: string | React.ReactNode = '';

    if (mainCmd === 'clear') {
      setLogs([]);
      setInputVal('');
      return;
    } else if (mainCmd === 'help') {
      resultOutput = (
        <div className="space-y-1 text-slate-300">
          <div className="text-cyan-400 font-bold">AVAILABLE COMMANDS:</div>
          <div>• <strong className="text-white">status</strong> - System health, active telemetry mesh and accounts</div>
          <div>• <strong className="text-white">query --motion=&lt;plg|slg|dual&gt;</strong> - Filter target demand units</div>
          <div>• <strong className="text-white">score --top</strong> - Display top 3 highest scoring accounts</div>
          <div>• <strong className="text-white">calibrate --tolerance=&lt;pct&gt;</strong> - Verify CAD blueprint tolerance</div>
          <div>• <strong className="text-white">whoami</strong> - Active security clearance and operator profile</div>
          <div>• <strong className="text-white">clear</strong> - Clear console output</div>
        </div>
      );
    } else if (mainCmd === 'status') {
      playCadConfirm();
      resultOutput = (
        <div className="space-y-1 text-cyan-300">
          <div>CAD KERNEL: ACTIVE // 100% HEALTH</div>
          <div>TOTAL MAPPED DEMAND UNITS: {accounts.length} ACCOUNTS</div>
          <div>TELEMETRY MESH LATENCY: 42ms</div>
          <div>SIGNAL DECAY FUNCTION: e^(-t / 14d)</div>
          <div>SECURITY POSTURE: SOC2 COMPLIANT ENCLAVE</div>
        </div>
      );
    } else if (mainCmd === 'whoami') {
      resultOutput = (
        <div className="text-emerald-300">
          OPERATOR: ARCHITECT_LEVEL_01 [DUAL MOTION REVOPS DIRECTOR] • CLEARANCE: UNRESTRICTED
        </div>
      );
    } else if (mainCmd === 'score' && parts[1] === '--top') {
      const top3 = [...accounts].sort((a, b) => b.compositeScore - a.compositeScore).slice(0, 3);
      resultOutput = (
        <div className="space-y-1">
          <div className="text-cyan-400">TOP 3 SCORING DEMAND UNITS:</div>
          {top3.map((a, i) => (
            <div key={a.id} className="text-slate-300">
              #{i + 1} {a.accountName} - Score: <strong className="text-white">{a.compositeScore}</strong> [{a.primaryMotion}]
            </div>
          ))}
        </div>
      );
    } else if (mainCmd === 'query') {
      resultOutput = (
        <div className="text-slate-300">
          Query returned {accounts.length} demand units across 3 tier partitions. All signals calibrated.
        </div>
      );
    } else {
      resultOutput = `Unknown command "${mainCmd}". Type "help" for valid commands.`;
    }

    setLogs((prev) => [
      ...prev,
      {
        command: trimmed,
        output: resultOutput,
        timestamp: time,
      },
    ]);
    setInputVal('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      runCommand(inputVal);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold">
              SYS.01 // WORKSPACE TERMINAL
            </span>
            <span className="text-xs text-slate-400">SECURITY POSTURE &amp; CAD KERNEL CONSOLE</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            Workspace Sign-In &amp; Engineering Terminal
          </h2>
          <p className="text-xs text-slate-400">
            Interactive diagnostic console for querying live scoring vectors, system state, and operator authentication.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-[#081220] border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            OPERATOR: AUTHENTICATED
          </span>
        </div>
      </div>

      {/* Operator Credentials Card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded bg-[#081220] border border-cyan-500/25 space-y-1">
          <span className="text-slate-400 text-[10px] block">AUTHENTICATION IDENTITY</span>
          <span className="text-white font-bold block">admin.revops@enterprise.cad</span>
          <span className="text-emerald-400 text-[10px]">MFA TOKEN: ACTIVE (YUBIKEY)</span>
        </div>

        <div className="p-3 rounded bg-[#081220] border border-cyan-500/25 space-y-1">
          <span className="text-slate-400 text-[10px] block">SECURITY ENCLAVE</span>
          <span className="text-white font-bold block">ENCLAVE-US-EAST-01</span>
          <span className="text-cyan-300 text-[10px]">TLS 1.3 / E2E ENCRYPTED</span>
        </div>

        <div className="p-3 rounded bg-[#081220] border border-cyan-500/25 space-y-1">
          <span className="text-slate-400 text-[10px] block">KERNEL REVISION</span>
          <span className="text-white font-bold block">SYS.01 // BUILD 2026.4</span>
          <span className="text-slate-400 text-[10px]">TOLERANCE: ±0.02%</span>
        </div>
      </div>

      {/* CAD Terminal Window */}
      <div className="rounded border border-cyan-500/30 bg-[#040810] shadow-2xl overflow-hidden">
        {/* Terminal Title Bar */}
        <div className="px-4 py-2 bg-[#070e1a] border-b border-cyan-500/25 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-300 font-bold">CAD KERNEL DIAGNOSTIC SHELL (PTY.0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          </div>
        </div>

        {/* Quick Command Chips */}
        <div className="px-4 py-2 bg-[#060b13] border-b border-slate-900 flex items-center gap-2 flex-wrap text-[11px]">
          <span className="text-slate-500">QUICK CMDS:</span>
          {['status', 'score --top', 'help', 'whoami', 'clear'].map((cmd) => (
            <button
              key={cmd}
              onClick={() => runCommand(cmd)}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-cyan-950 border border-slate-800 hover:border-cyan-500/40 text-cyan-300 transition-colors cursor-pointer"
            >
              {cmd}
            </button>
          ))}
        </div>

        {/* Console Output Area */}
        <div className="p-4 space-y-3 min-h-[300px] max-h-[440px] overflow-y-auto text-xs">
          {logs.map((log, idx) => (
            <div key={idx} className="space-y-1">
              {log.command && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <span className="text-slate-500">[{log.timestamp}]</span>
                  <span className="text-emerald-400 font-bold">revops@sys01:~$</span>
                  <span className="text-white font-bold">{log.command}</span>
                </div>
              )}
              <div className="text-slate-300 pl-4">{log.output}</div>
            </div>
          ))}
          <div ref={terminalEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-[#070e1a] border-t border-cyan-500/25 flex items-center gap-2">
          <span className="text-emerald-400 font-bold text-xs">revops@sys01:~$</span>
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type command here (e.g. status, score --top)..."
            className="flex-1 bg-transparent border-none text-xs text-white placeholder-slate-600 focus:outline-none font-mono"
            autoFocus
          />
          <button
            onClick={() => runCommand(inputVal)}
            className="p-1 rounded text-cyan-400 hover:text-white cursor-pointer"
          >
            <CornerDownLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
