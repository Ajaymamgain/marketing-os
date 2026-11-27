import React, { useState } from 'react';
import { ActivityTypeScore } from '../services/api';

interface ActivityTypeScoresProps {
  types: ActivityTypeScore[];
  onChange: (type: string, points: number) => void;
  onAdd?: (label: string, source: 'marketo' | 'ad_platform', points: number) => Promise<string | void>;
  theme?: 'dark' | 'light';
}

function Group({
  title,
  note,
  rows,
  onChange,
  theme,
  reportingOnly = false,
}: {
  title: string;
  note: string;
  rows: ActivityTypeScore[];
  onChange: (type: string, points: number) => void;
  theme: 'dark' | 'light';
  reportingOnly?: boolean;
}) {
  const light = theme === 'light';
  return (
    <div>
      <h4 className={`text-xs font-semibold ${light ? 'text-slate-900' : 'text-white'}`}>{title}</h4>
      <p className={`mt-1 text-[11px] leading-4 ${light ? 'text-slate-500' : 'text-slate-400'}`}>{note}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <label key={row.type} className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${light ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-slate-700 bg-[#060c18] text-slate-200'}`}>
            <span>
              {row.label}
              {row.source === 'ad_platform' && (
                <span className={`mt-0.5 block text-[10px] ${light ? 'text-slate-500' : 'text-slate-400'}`}>
                  {(row.impressions || 0).toLocaleString()} impressions · {(row.clicks || 0).toLocaleString()} clicks
                  <span className="block">Campaign reporting only</span>
                </span>
              )}
            </span>
            {!reportingOnly && <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              aria-label={`${row.label} score`}
              value={row.points}
              onChange={(event) => onChange(row.type, Number(event.target.value))}
              className={`w-16 rounded border px-2 py-1 text-right tabular-nums ${light ? 'border-slate-300 bg-white text-slate-900' : 'border-slate-600 bg-slate-950 text-white'}`}
            />}
          </label>
        ))}
      </div>
    </div>
  );
}

export const ActivityTypeScores: React.FC<ActivityTypeScoresProps> = ({ types, onChange, onAdd, theme = 'dark' }) => {
  const light = theme === 'light';
  const [label, setLabel] = useState('');
  const [points, setPoints] = useState(1);
  const [message, setMessage] = useState('');
  const add = async () => {
    if (!onAdd || !label.trim()) return;
    const error = await onAdd(label.trim(), 'marketo', points);
    setMessage(error || '');
    if (!error) setLabel('');
  };
  return (
  <div className="mt-4 space-y-4">
    <Group
      title="Marketo activities"
      note="Points for a person on this demand unit. A higher number raises intent more than a lower one."
      rows={types.filter((row) => row.source === 'marketo')}
      onChange={onChange}
      theme={theme}
    />
    <Group
      title="Ad platforms"
      note="Campaign impressions and clicks have no person identity in this export, so they do not add buyer intent points. Use them to assess campaign reach and pacing."
      rows={types.filter((row) => row.source === 'ad_platform')}
      onChange={onChange}
      theme={theme}
      reportingOnly
    />
    {onAdd && (
      <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => { event.preventDefault(); void add(); }}>
        <label className="text-[11px]">
          <span className={light ? 'text-slate-600' : 'text-slate-400'}>New Marketo activity type</span>
          <input aria-label="New activity type name" value={label} onChange={(event) => setLabel(event.target.value)} className={`mt-1 block w-40 rounded border px-2 py-1 text-xs ${light ? 'border-slate-300 bg-white' : 'border-slate-600 bg-slate-950 text-white'}`} />
        </label>
        <label className="text-[11px]">
          <span className={light ? 'text-slate-600' : 'text-slate-400'}>Score</span>
          <input aria-label="New activity score" type="number" min={0} max={100} step={0.1} value={points} onChange={(event) => setPoints(Number(event.target.value))} className={`mt-1 block w-16 rounded border px-2 py-1 text-xs ${light ? 'border-slate-300 bg-white' : 'border-slate-600 bg-slate-950 text-white'}`} />
        </label>
        <button type="submit" className={`rounded px-2 py-1 text-xs font-semibold ${light ? 'bg-slate-900 text-white' : 'bg-cyan-400 text-slate-950'}`}>Add type</button>
        {message && <p className="text-[11px] text-rose-400">{message}</p>}
      </form>
    )}
  </div>
  );
};
