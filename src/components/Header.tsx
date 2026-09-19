import React, { useState, useEffect } from 'react';
import {
  Activity,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Layers,
  Search,
  Crosshair,
  ShieldCheck,
  Compass,
  Sun,
  Moon,
  PanelLeft,
  Globe,
  Terminal,
  ArrowLeft,
  Bot,
  Sparkles,
} from 'lucide-react';
import { isSoundEnabled, setSoundEnabled, playCadClick } from '../utils/audio';
import { ActiveNavTab } from '../types';

interface HeaderProps {
  activeTab: string;
  isSimulating: boolean;
  onToggleSimulation: () => void;
  onSearchAccount: (query: string) => void;
  activeAccountCount: number;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  isSidebarHidden?: boolean;
  onToggleSidebar?: () => void;
  onNavigateTab?: (tab: ActiveNavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  isSimulating,
  onToggleSimulation,
  onSearchAccount,
  activeAccountCount,
  theme = 'dark',
  onToggleTheme,
  isSidebarHidden = false,
  onToggleSidebar,
  onNavigateTab,
}) => {
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [timeString, setTimeString] = useState('');
  const [utcString, setUtcString] = useState('');
  const [searchVal, setSearchVal] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(now.toTimeString().split(' ')[0]);
      setUtcString(now.toISOString().slice(11, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playCadClick();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchVal(e.target.value);
    onSearchAccount(e.target.value);
  };

  return (
    <header className={`border-b ${theme === 'light' ? 'border-slate-300 bg-white/95 text-slate-900 shadow-xs' : 'border-cyan-500/20 bg-[#060b13]/95 text-slate-100'} backdrop-blur-md sticky top-0 z-40 transition-colors`}>
      {/* Top micro engineering bar */}
      <div className={`flex items-center justify-between px-4 py-1 border-b ${theme === 'light' ? 'border-slate-200 text-slate-700 bg-slate-50/70' : 'border-cyan-900/30 text-cyan-400/70'} text-[11px] font-mono tracking-wider`}>
        <div className="flex items-center gap-4">
          <span className={`flex items-center gap-1.5 font-bold ${theme === 'light' ? 'text-sky-800' : 'text-cyan-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${theme === 'light' ? 'bg-sky-600' : 'bg-cyan-400 animate-pulse'}`} />
            SYS.01 // CAD-MKTG-BLUEPRINT
          </span>
          <span className={theme === 'light' ? 'hidden sm:inline-block text-slate-300' : 'hidden sm:inline-block text-slate-500'}>|</span>
          <span className={`hidden sm:inline-block ${theme === 'light' ? 'text-slate-800 font-semibold' : ''}`}>SPEC: DUAL-MOTION (PLG+SLG) MARKETING OS</span>
          <span className={theme === 'light' ? 'hidden md:inline-block text-slate-300' : 'hidden md:inline-block text-slate-500'}>|</span>
          <span className={`hidden md:inline-block ${theme === 'light' ? 'text-slate-700' : ''}`}>SCALE: 1:1 CALIBRATED</span>
          <span className={theme === 'light' ? 'hidden lg:inline-block text-slate-300' : 'hidden lg:inline-block text-slate-500'}>|</span>
          <span className={`hidden lg:inline-block flex items-center gap-1 font-semibold ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400/90'}`}>
            <ShieldCheck className={`w-3 h-3 ${theme === 'light' ? 'text-emerald-700' : 'text-emerald-400'}`} />
            TELEMETRY MESH: SYNCHRONIZED
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className={`hidden sm:flex items-center gap-2 ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>
            <span>LOC: [41.8781° N, 87.6298° W]</span>
            <span className={theme === 'light' ? 'text-slate-300' : 'text-slate-600'}>/</span>
            <span className={`font-semibold ${theme === 'light' ? 'text-sky-900' : 'text-cyan-300'}`}>{timeString}</span>
            <span className={`text-[10px] ${theme === 'light' ? 'text-slate-500' : 'text-slate-500'}`}>({utcString})</span>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
            theme === 'light'
              ? 'bg-sky-100 border border-sky-300 text-sky-900'
              : 'bg-cyan-950/80 border border-cyan-500/30 text-cyan-300'
          }`}>
            REV: 2.4.1
          </span>
        </div>
      </div>

      {/* Main Console Header */}
      <div className="px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Module Title */}
        <div className="flex items-center gap-3">
          {/* Navigation Toggle Button (Left Rail Open/Close) */}
          {onToggleSidebar && (
            <button
              onClick={() => {
                playCadClick();
                onToggleSidebar();
              }}
              className={`p-2 rounded border transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-mono ${
                isSidebarHidden
                  ? theme === 'light'
                    ? 'border-sky-600 bg-sky-100 text-sky-950 font-bold shadow-xs'
                    : 'border-cyan-400 bg-cyan-950/70 text-cyan-300 hover:bg-cyan-900/80 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                  : theme === 'light'
                    ? 'border-slate-300 bg-slate-100 text-slate-800 hover:text-sky-900 hover:bg-slate-200'
                    : 'border-cyan-500/30 bg-[#091526] text-slate-400 hover:text-cyan-300'
              }`}
              title={isSidebarHidden ? 'Show Navigation Stations' : 'Hide Navigation Stations'}
            >
              <PanelLeft className="w-4 h-4" />
              {isSidebarHidden && <span className="hidden sm:inline text-[11px] font-bold">SHOW NAV</span>}
            </button>
          )}

          <div className={`relative flex items-center justify-center w-10 h-10 rounded border shrink-0 ${
            theme === 'light'
              ? 'border-sky-500 bg-sky-100 text-sky-800'
              : 'border-cyan-400/40 bg-cyan-950/40 text-cyan-300'
          }`}>
            <Crosshair className={`w-5 h-5 animate-spin-slow ${theme === 'light' ? 'text-sky-700' : 'text-cyan-400'}`} />
            <div className={`absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 ${theme === 'light' ? 'border-sky-600' : 'border-cyan-400'}`} />
            <div className={`absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 ${theme === 'light' ? 'border-sky-600' : 'border-cyan-400'}`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-base sm:text-lg font-bold tracking-tight flex items-center gap-2 ${
                theme === 'light' ? 'text-slate-950' : 'text-white'
              }`}>
                MARKETING OPERATIONS OS
                <span className={`text-[11px] font-mono px-1.5 py-0.2 rounded font-bold ${
                  theme === 'light'
                    ? 'bg-sky-100 border border-sky-400 text-sky-900'
                    : 'bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 font-normal'
                }`}>
                  SYS.01
                </span>
              </h1>
            </div>
            <p className={`text-xs font-mono flex items-center gap-2 font-medium ${
              theme === 'light' ? 'text-slate-700' : 'text-slate-400'
            }`}>
              <span>DEMAND UNIT SCORING &amp; BUYING COMMITTEE OPERATIONS</span>
              <span className={theme === 'light' ? 'text-sky-600' : 'text-cyan-500/50'}>•</span>
              <span className={theme === 'light' ? 'text-sky-800 font-bold' : 'text-cyan-400/90'}>{activeAccountCount} ACCOUNTS MAPPED</span>
            </p>
          </div>
        </div>

        {/* Global Controls: Theme Toggle, Search, Simulator, Audio */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-60">
            <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${
              theme === 'light' ? 'text-slate-500' : 'text-cyan-400/60'
            }`} />
            <input
              type="text"
              placeholder="Query account / committee..."
              value={searchVal}
              onChange={handleSearchChange}
              className={`w-full rounded pl-8 pr-3 py-1.5 text-xs font-mono transition-colors ${
                theme === 'light'
                  ? 'bg-slate-50 border border-slate-300 text-slate-950 placeholder-slate-400 focus:border-sky-600 focus:ring-1 focus:ring-sky-600'
                  : 'bg-[#091322] border border-cyan-500/25 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'
              }`}
            />
          </div>

          {/* Landing Page vs Console Toggle Button */}
          {onNavigateTab && (
            <button
              onClick={() => {
                playCadClick();
                onNavigateTab(activeTab === 'LANDING' ? 'OVERVIEW' : 'LANDING');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all cursor-pointer select-none font-bold ${
                activeTab === 'LANDING'
                  ? theme === 'light'
                    ? 'bg-sky-700 text-white border-sky-800 shadow-xs hover:bg-sky-800'
                    : 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : theme === 'light'
                    ? 'bg-sky-100/80 border-sky-400 text-sky-900 hover:bg-sky-200/80 shadow-xs'
                    : 'bg-cyan-950/80 border-cyan-400/60 text-cyan-300 hover:bg-cyan-900 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
              }`}
              title={activeTab === 'LANDING' ? 'Enter Workstation Console (Inside)' : 'Exit to Architecture Landing Page (Outside)'}
            >
              {activeTab === 'LANDING' ? (
                <>
                  <Terminal className="w-3.5 h-3.5" />
                  <span className="text-[11px]">ENTER CONSOLE</span>
                </>
              ) : (
                <>
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-[11px]">OUTSIDE: LANDING PAGE</span>
                </>
              )}
            </button>
          )}

          {/* Quick AI Copilot Toggle Button */}
          {onNavigateTab && (
            <button
              onClick={() => {
                playCadClick();
                onNavigateTab('CHATBOT');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all cursor-pointer select-none font-bold ${
                activeTab === 'CHATBOT'
                  ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                  : theme === 'light'
                    ? 'bg-cyan-50 border-cyan-400/80 text-cyan-900 hover:bg-cyan-100 shadow-xs'
                    : 'bg-cyan-950/80 border-cyan-400/60 text-cyan-300 hover:bg-cyan-900 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
              }`}
              title="Open Gemini AI Copilot & Linked Function Tools [ST.13]"
            >
              <Bot className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[11px]">AI COPILOT</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </button>
          )}

          {/* Light / Dark Mode Toggle Button */}
          {onToggleTheme && (
            <button
              onClick={() => {
                playCadClick();
                onToggleTheme();
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono border transition-all cursor-pointer select-none font-bold ${
                theme === 'light'
                  ? 'bg-slate-900 border-slate-800 text-white shadow-xs hover:bg-slate-800'
                  : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60'
              }`}
              title={theme === 'light' ? 'Switch to Dark CAD Blueprint' : 'Switch to Light Drafting Blueprint'}
            >
              {theme === 'light' ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-300" />
                  <span className="text-[11px]">DARK CAD</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px]">LIGHT WHITEPRINT</span>
                </>
              )}
            </button>
          )}

          {/* Simulation Toggle Button */}
          <button
            onClick={() => {
              playCadClick();
              onToggleSimulation();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-mono border transition-all cursor-pointer font-semibold ${
              isSimulating
                ? theme === 'light'
                  ? 'bg-amber-100 border-amber-500 text-amber-950 hover:bg-amber-200'
                  : 'bg-amber-500/10 border-amber-400/50 text-amber-300 hover:bg-amber-500/20'
                : theme === 'light'
                  ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  : 'bg-cyan-950/50 border-cyan-500/30 text-cyan-300 hover:bg-cyan-900/40'
            }`}
            title="Toggle simulated telemetry stream & dynamic scoring fluctuations"
          >
            {isSimulating ? (
              <>
                <Pause className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-amber-800' : 'text-amber-400'}`} />
                <span>SIMULATOR: [ACTIVE]</span>
              </>
            ) : (
              <>
                <Play className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-slate-700' : 'text-cyan-400'}`} />
                <span>SIMULATOR: [PAUSED]</span>
              </>
            )}
          </button>

          {/* Acoustic Feedback Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-1.5 rounded border transition-colors cursor-pointer ${
              soundOn
                ? theme === 'light'
                  ? 'border-sky-400 bg-sky-100 text-sky-800 hover:bg-sky-200'
                  : 'border-cyan-500/40 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50'
                : theme === 'light'
                  ? 'border-slate-300 bg-slate-100 text-slate-500 hover:text-slate-800'
                  : 'border-slate-700 bg-slate-900/50 text-slate-500 hover:text-slate-300'
            }`}
            title={soundOn ? 'CAD Audio: Mute' : 'CAD Audio: Unmute'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Blueprint Calibration Indicator */}
          <div className={`hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono ${
            theme === 'light'
              ? 'bg-slate-100 border-slate-300 text-slate-700 font-semibold'
              : 'bg-[#091526] border-cyan-500/20 text-cyan-400/80'
          }`}>
            <Compass className={`w-3.5 h-3.5 ${theme === 'light' ? 'text-sky-700' : 'text-cyan-400'}`} />
            <span>GRID: X80 Y80</span>
          </div>
        </div>
      </div>
    </header>
  );
};
