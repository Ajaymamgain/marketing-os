import React, { useState } from 'react';
import {
  Network,
  RefreshCw,
  Database,
  Cloud,
  Radio,
  Server,
  Activity,
  Sparkles,
} from 'lucide-react';
import { DataConnector } from '../types';
import { playCadClick, playCadConfirm } from '../utils/audio';

interface DataConnectorsViewProps {
  connectors: DataConnector[];
}

export const DataConnectorsView: React.FC<DataConnectorsViewProps> = ({
  connectors: initialConnectors,
}) => {
  const [connectors, setConnectors] = useState(initialConnectors);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [logMessage, setLogMessage] = useState<string | null>(null);

  const handleSync = (id: string) => {
    playCadClick();
    setSyncingId(id);
    const conn = connectors.find((c) => c.id === id);

    setTimeout(() => {
      playCadConfirm();
      setSyncingId(null);
      setConnectors((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, lastSync: 'Just now', status: 'SYNCHRONIZED' } : c
        )
      );
      setLogMessage(`Telemetry stream verified: [${conn?.name}] synced ${Math.floor(Math.random() * 400 + 100)}k events.`);
      setTimeout(() => setLogMessage(null), 4000);
    }, 900);
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'PRODUCT_ANALYTICS':
        return Activity;
      case 'DATA_WAREHOUSE':
        return Database;
      case 'CRM':
        return Cloud;
      case 'INTENT_STREAM':
        return Radio;
      default:
        return Server;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-400/40 text-cyan-300 font-bold">
              SYS.01 // TELEMETRY MESH
            </span>
            <span className="text-xs text-slate-400">DATA CONNECTORS &amp; INGESTION TOPOLOGY</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight mt-1">
            Data Connectors &amp; Real-Time Telemetry Mesh
          </h2>
          <p className="text-xs text-slate-400">
            Bidirectional sync between product usage telemetry, enterprise CRM, and 3P intent providers.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-2.5 py-1 rounded bg-[#081220] border border-emerald-500/30 text-emerald-300">
            MESH STATUS: ALL NODES SYNCHRONIZED
          </span>
        </div>
      </div>

      {logMessage && (
        <div className="p-3 rounded bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{logMessage}</span>
        </div>
      )}

      {/* Mesh Architecture Diagram */}
      <div className="p-4 rounded bg-[#081220] border border-cyan-500/30 space-y-3">
        <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-400" />
          TELEMETRY MESH INGESTION TOPOLOGY
        </span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded bg-[#070e1a] border border-cyan-950 space-y-1">
            <span className="text-cyan-400 font-bold text-[11px] block">LAYER 1: RAW INGESTION</span>
            <p className="text-slate-400 text-[11px]">
              Kafka events &amp; Segment webhooks capture seat additions, API volume, and CLI homebrew installations.
            </p>
            <span className="text-[10px] text-slate-500">Latency: &lt; 50ms</span>
          </div>

          <div className="p-3 rounded bg-[#070e1a] border border-cyan-950 space-y-1">
            <span className="text-indigo-400 font-bold text-[11px] block">LAYER 2: SCORING ENGINE</span>
            <p className="text-slate-400 text-[11px]">
              Calculates dual-motion composite formula with 14-day exponential signal decay and committee weights.
            </p>
            <span className="text-[10px] text-slate-500">Processing: Continuous In-Memory</span>
          </div>

          <div className="p-3 rounded bg-[#070e1a] border border-cyan-950 space-y-1">
            <span className="text-emerald-400 font-bold text-[11px] block">LAYER 3: CRM DISPATCH</span>
            <p className="text-slate-400 text-[11px]">
              Syncs prioritized demand units directly into Salesforce &amp; Slack alert channels for AE acceleration.
            </p>
            <span className="text-[10px] text-slate-500">Sync: Sub-second bidirectional</span>
          </div>
        </div>
      </div>

      {/* Connectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {connectors.map((conn) => {
          const category = conn.category || conn.type || 'EVENT_BUS';
          const Icon = getIcon(category);
          const isSyncing = syncingId === conn.id;
          const rate = conn.eventsPerSec ? `${conn.eventsPerSec.toLocaleString()} evt/sec` : conn.eventsPerMin ? `${conn.eventsPerMin.toLocaleString()} evt/min` : 'Dynamic stream';

          return (
            <div
              key={conn.id}
              className="p-4 rounded bg-[#081220] border border-cyan-500/25 hover:border-cyan-400/40 transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-cyan-950/70 border border-cyan-500/30 text-cyan-300">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">{conn.name}</h4>
                      <span className="text-[10px] text-slate-500">{category}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded border font-bold ${
                      conn.status === 'SYNCHRONIZED' || conn.status === 'SYNCED'
                        ? 'bg-emerald-950 border-emerald-500/40 text-emerald-300'
                        : conn.status === 'STREAMING'
                        ? 'bg-cyan-950 border-cyan-500/40 text-cyan-300'
                        : 'bg-amber-950 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    {conn.status}
                  </span>
                </div>

                <div className="space-y-1 text-xs border-t border-slate-800/80 pt-2">
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Ingestion Rate:</span>
                    <span className="text-white font-bold">{rate}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Pipeline Latency:</span>
                    <span className="text-cyan-300">{conn.latencyMs} ms</span>
                  </div>
                  <div className="flex justify-between text-slate-400 text-[11px]">
                    <span>Last Telemetry Sync:</span>
                    <span className="text-slate-500">{conn.lastSync}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleSync(conn.id)}
                disabled={isSyncing}
                className="w-full py-1.5 rounded bg-[#070e1a] hover:bg-[#0a1628] border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-cyan-400'}`} />
                <span>{isSyncing ? 'VERIFYING TELEMETRY...' : 'PING & TEST SYNC'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
