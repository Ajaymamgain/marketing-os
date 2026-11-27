import {useEffect, useState} from 'react';
import {ChevronRight, Pause, Play, RotateCcw, SkipForward} from 'lucide-react';
import type {ConversionBatchDetail, ConversionReceipt} from '../services/api';

const labels: Record<string, string> = {
  accepted: 'Accepted by provider', processed: 'Processed by provider', sending: 'Sending',
  uncertain: 'Needs provider check', failed: 'Provider rejected', blocked: 'Held at review', ready: 'Ready after review',
};

interface Step {
  title: string;
  value: string;
  detail: string;
  x: number;
  y: number;
}

function trace(batch: ConversionBatchDetail, row: ConversionReceipt): Step[] {
  const outcome = row.outcome?.replaceAll('_', ' ') || 'Outcome not supplied';
  const consent = batch.operation === 'remove' ? 'Removal' : row.consent;
  const route = [
    {title: 'CRM record', value: 'Row ' + row.line, detail: 'Imported from a reviewed CRM file.', x: 115, y: 74},
    {title: 'CRM milestone', value: batch.operation === 'conversion' ? outcome : batch.operation === 'add' ? 'Audience add' : 'Audience removal', detail: 'The requested outcome or membership change.', x: 329, y: 74},
    {title: 'Matching data', value: row.matched_by, detail: 'Matching identifiers identified during server validation.', x: 543, y: 74},
    {title: 'Privacy and timing', value: consent, detail: row.lag_days == null ? 'The batch’s server validation applies here.' : `The outcome was recorded ${row.lag_days} days after the click.`, x: 757, y: 74},
  ];
  if (row.state === 'blocked') {
    return [...route, {title: 'Held for review', value: 'No provider receipt', detail: row.message, x: 544, y: 208}];
  }
  route.push({
    title: 'Destination', value: batch.destination.name,
    detail: batch.assigned ? 'The destination is assigned to this reviewed batch.' : 'A workspace owner can assign a destination from Run history.',
    x: 971, y: 74,
  });
  if (row.state === 'ready' || row.state === 'sending') {
    return [...route, {title: 'Delivery status', value: labels[row.state], detail: row.message, x: 971, y: 208}];
  }
  return [...route, {
    title: 'Delivery receipt', value: labels[row.state] || row.state,
    detail: row.reference ? `${row.message} Receipt ${row.reference}.` : row.message, x: 971, y: 208,
  }];
}

const pendingPath: Step[] = [
  {title: 'CRM record', value: 'Awaiting import', detail: 'Upload a real CRM file to start a batch.', x: 115, y: 74},
  {title: 'CRM milestone', value: 'Awaiting review', detail: 'Choose the conversion goal or audience action.', x: 329, y: 74},
  {title: 'Matching data', value: 'Awaiting review', detail: 'The server checks the identifiers supplied in the row.', x: 543, y: 74},
  {title: 'Privacy and timing', value: 'Awaiting review', detail: 'Validation checks consent, timestamps, and the selected upload rules.', x: 757, y: 74},
  {title: 'Destination', value: 'Awaiting assignment', detail: 'Assign a destination to a reviewed batch.', x: 971, y: 74},
  {title: 'Delivery receipt', value: 'Awaiting delivery', detail: 'Provider replies appear here after sending.', x: 971, y: 208},
];

const nodeWidth = 188;
const nodeHeight = 66;

export function ConversionFlow({batch, onOpenBatch}: {
  batch: ConversionBatchDetail | null;
  onOpenBatch: (id: string) => void;
}) {
  const [rowNumber, setRowNumber] = useState('');
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const row = batch?.rows.find(entry => String(entry.line) === rowNumber) || batch?.rows[0];
  const steps = batch && row ? trace(batch, row) : pendingPath;
  const index = Math.min(position, Math.max(0, steps.length - 1));
  useEffect(() => {
    setRowNumber('');
    setPosition(0);
    setPlaying(false);
  }, [batch?.id]);
  useEffect(() => {
    if (!playing) return;
    if (position >= steps.length - 1) {
      setPlaying(false);
      return;
    }
    const timer = window.setTimeout(() => setPosition(current => current + 1), 850);
    return () => window.clearTimeout(timer);
  }, [playing, position, steps.length]);

  return <section className="cv-pane cv-flow" id="conversion-flow">
    <div className="cv-pane-title cv-results-heading">
      <div><h2>Conversion flow</h2><p>Inspect the path recorded for a CRM row.</p></div>
      {batch && <button className="dm-button" onClick={() => onOpenBatch(batch.id)}>Open batch <ChevronRight size={15}/></button>}
    </div>
      <div className="cv-flow-toolbar">
        <div className="cv-actions">
          <button className="dm-button dm-button-primary" disabled={!row} onClick={() => {
            if (!playing && index === steps.length - 1) setPosition(0);
            setPlaying(!playing);
          }}>{playing ? <Pause size={15}/> : <Play size={15}/>} {playing ? 'Pause trace' : 'Play trace'}</button>
          <button className="dm-button" onClick={() => {setPlaying(false);setPosition((index + 1) % steps.length);}}><SkipForward size={15}/> Step</button>
          <button className="dm-button" aria-label="Reset trace" onClick={() => {setPlaying(false);setPosition(0);}}><RotateCcw size={15}/></button>
        </div>
        {batch && row && <label>CRM row<select className="dm-input" value={String(row.line)} onChange={event => {
          setRowNumber(event.target.value);setPosition(0);setPlaying(false);
        }}>{batch.rows.map(item => <option value={item.line} key={item.line}>Row {item.line} · {labels[item.state] || item.state}</option>)}</select></label>}
      </div>
      <div className="cv-diagram">
        <svg viewBox="0 0 1090 264" role="group" aria-label="CRM row delivery path" className="cv-flow-svg">
          <defs><pattern id="conversion-flow-grid" width="18" height="18" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="#d7e1e9"/>
          </pattern></defs>
          <rect width="1090" height="264" fill="url(#conversion-flow-grid)" aria-hidden="true"/>
          {steps.slice(1).map((step, i) => {
            const previous = steps[i];
            const x = previous.x + nodeWidth / 2;
            const end = step.y === previous.y
              ? `M ${x} ${previous.y} H ${step.x - nodeWidth / 2}`
              : `M ${previous.x} ${previous.y + nodeHeight / 2} V ${step.y - 54} H ${step.x} V ${step.y - nodeHeight / 2}`;
            return <path key={step.title} d={end} fill="none" stroke={i < index ? '#087669' : '#9aafbe'} strokeWidth={i < index ? 2.5 : 1.5}/>;
          })}
          {steps.map((step, i) => <g key={step.title} role="button" tabIndex={0} aria-label={`${step.title}: ${step.value}`}
            aria-pressed={index === i} onClick={() => {setPlaying(false);setPosition(i);}}
            onKeyDown={e => {if (e.key === 'Enter' || e.key === ' ') {e.preventDefault();setPlaying(false);setPosition(i);}}}>
            <rect x={step.x - nodeWidth / 2} y={step.y - nodeHeight / 2} width={nodeWidth} height={nodeHeight} rx={8}
              fill={i === index ? '#e9f6f3' : '#fff'} stroke={i === index ? '#087669' : '#bfccd7'} strokeWidth={i === index ? 2.4 : 1}/>
            <text x={step.x - 79} y={step.y - 8} className="cv-flow-node-label">{step.title}</text>
            <text x={step.x - 79} y={step.y + 14} className="cv-flow-node-value">{step.value.length > 25 ? step.value.slice(0, 24) + '…' : step.value}</text>
          </g>)}
        </svg>
      </div>
      {steps[index] && <div className="cv-flow-detail" aria-live="polite">
        <strong>Step {index + 1} / {steps.length} · {steps[index].title}</strong><p>{steps[index].detail}</p>
      </div>}
      {row?.updated_at && <p className="cv-caption">Row updated {new Date(row.updated_at).toLocaleString()}</p>}
  </section>;
}
