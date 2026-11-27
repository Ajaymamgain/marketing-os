import React, { useMemo, useState } from 'react';
import { AccountDemandUnit } from '../../types';
import { landingSamples, scoreModule } from './DemandPlay';

type Point = {
  id: string;
  name: string;
  fit: number;
  intent: number;
  coverage: number;
  route: 'Sales lane' | 'Marketing lane' | 'Hold';
  grade: string;
  stage: string;
  composite: number;
  sla: number | null;
};

function pointsFor(accounts: AccountDemandUnit[]): Point[] {
  const samples = landingSamples.map((row) => {
    const outcome = scoreModule(row);
    return { id: row.id, name: row.company, fit: row.fit, intent: row.intent, coverage: row.coverage, ...outcome };
  });
  const live = accounts.filter((account) => account.scoreAudit).map((account) => {
    const fit = Math.round(account.scoreAudit!.fit);
    const intent = Math.round(account.scoreAudit!.intent);
    const coverage = Math.round(account.scoreAudit!.coverage);
    const outcome = scoreModule({ fit, intent, coverage, tier1: /tier\s*1/i.test(account.tier), opportunity: false, recycled: false });
    return { id: account.id, name: account.accountName, fit, intent, coverage, ...outcome };
  });
  return [...samples, ...live];
}

function HexStat({ label, value, note, hot, onClick }: { label: string; value: string; note: string; hot?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={hot ? 'hx-stat is-hot' : 'hx-stat'} onClick={onClick}>
      <svg viewBox="0 0 160 140" aria-hidden="true">
        <polygon points="80,6 150,42 150,102 80,134 10,102 10,42" />
      </svg>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{note}</em>
      </span>
    </button>
  );
}

export function HexFloor({
  accounts,
  onOpen,
}: {
  accounts: AccountDemandUnit[];
  onOpen: () => void;
}) {
  const points = useMemo(() => pointsFor(accounts), [accounts]);
  const [lane, setLane] = useState<'All' | Point['route']>('All');
  const [picked, setPicked] = useState<string | null>(null);
  const shown = points.filter((point) => lane === 'All' || point.route === lane);
  const active = shown.find((point) => point.id === picked) ?? shown[0];
  const lanes = (['Sales lane', 'Marketing lane', 'Hold'] as const).map((route) => ({
    route,
    count: points.filter((point) => point.route === route).length,
  }));
  const total = points.length || 1;
  const stages = ['Target', 'Active', 'Engaged', 'Prioritized', 'Qualified', 'Pipeline', 'Won', 'Lost'].map((stage) => ({
    stage,
    count: shown.filter((point) => point.stage === stage).length,
  }));
  const grades = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D'].map((grade) => ({
    grade,
    count: shown.filter((point) => point.grade === grade).length,
  }));
  const coverageBands = [
    { label: 'Zero', count: shown.filter((point) => point.coverage <= 0).length },
    { label: 'Partial', count: shown.filter((point) => point.coverage > 0 && point.coverage < 50).length },
    { label: 'A1 ready', count: shown.filter((point) => point.coverage >= 50).length },
  ];
  const sla = [
    { label: '4h', count: shown.filter((point) => point.sla === 4).length },
    { label: '24h', count: shown.filter((point) => point.sla === 24).length },
    { label: 'None', count: shown.filter((point) => !point.sla).length },
  ];
  const avg = (key: 'fit' | 'intent' | 'coverage') => Math.round(shown.reduce((sum, point) => sum + point[key], 0) / (shown.length || 1));
  let donut = 0;
  const donutColors = ['#1d4ed8', '#60a5fa', '#d97706'];

  return (
    <section className="hx-floor" aria-label="Demand floor">
      <div className="hx-sell">
        <div>
          <p className="lp-kicker">Demand-unit scoring</p>
          <h2>The buying group is the work item.</h2>
          <p>One open record for each account and buying need. Fit, decayed intent, and coverage decide sales, marketing, or hold. Coverage zero keeps the lane closed.</p>
          <div className="lp-actions">
            <button type="button" className="lp-btn lp-btn-primary" onClick={onOpen}>Open the workspace</button>
            <button type="button" className="lp-btn lp-btn-ghost" onClick={() => document.getElementById('play')?.scrollIntoView({ behavior: 'smooth' })}>Adjust a score</button>
          </div>
        </div>
        <div className="hx-stats">
          <HexStat label="On the floor" value={String(points.length)} note="Sample + workspace" hot={lane === 'All'} onClick={() => setLane('All')} />
          <HexStat label="Sales lane" value={String(lanes[0].count)} note="Seller and SLA" hot={lane === 'Sales lane'} onClick={() => setLane('Sales lane')} />
          <HexStat label="Marketing" value={String(lanes[1].count)} note="Real, not sales-ready" hot={lane === 'Marketing lane'} onClick={() => setLane('Marketing lane')} />
          <HexStat label="Hold" value={String(lanes[2].count)} note="Coverage or low score" hot={lane === 'Hold'} onClick={() => setLane('Hold')} />
          <HexStat label="Avg composite" value={(shown.reduce((sum, point) => sum + point.composite, 0) / (shown.length || 1)).toFixed(1)} note="fit · intent · coverage" onClick={() => setLane('All')} />
          <HexStat label="Coverage 0" value={String(points.filter((point) => point.coverage <= 0).length)} note="A1 and SLA locked" onClick={() => setLane('Hold')} />
        </div>
      </div>

      <div className="hx-grid">
        <article className="hx-card hx-card-wide">
          <header><h3>Lane split</h3><span>{points.length} on the floor</span></header>
          <div className="hx-donut-row">
            <svg viewBox="0 0 120 120" role="img" aria-label="Units by lane">
              {lanes.map((item, index) => {
                const sweep = (item.count / total) * 100;
                const dash = `${sweep} ${100 - sweep}`;
                const node = (
                  <circle key={item.route} cx="60" cy="60" r="38" fill="none" stroke={donutColors[index]} strokeWidth="14"
                    strokeDasharray={dash} strokeDashoffset={25 - donut} pathLength={100}
                    onClick={() => setLane(item.route)} />
                );
                donut += sweep;
                return node;
              })}
              <text x="60" y="64" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1c1f26">{points.length}</text>
            </svg>
            <ul>
              {lanes.map((item, index) => (
                <li key={item.route}>
                  <button type="button" onClick={() => setLane(item.route)}>
                    <i style={{ background: donutColors[index] }} />
                    {item.route}
                    <b>{item.count}</b>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </article>

        <article className="hx-card">
          <header><h3>Stage</h3><span>Current position</span></header>
          <ul className="hx-bars">
            {stages.map((item) => (
              <li key={item.stage}>
                <span>{item.stage}</span>
                <i><em style={{ width: `${(item.count / (shown.length || 1)) * 100}%` }} /></i>
                <b>{item.count}</b>
              </li>
            ))}
          </ul>
        </article>

        <article className="hx-card">
          <header><h3>Grades</h3><span>A1 needs coverage 50</span></header>
          <ul className="hx-bars">
            {grades.map((item) => (
              <li key={item.grade}>
                <span>{item.grade}</span>
                <i><em style={{ width: `${(item.count / (shown.length || 1)) * 100}%` }} /></i>
                <b>{item.count}</b>
              </li>
            ))}
          </ul>
        </article>

        <article className="hx-card hx-card-wide">
          <header><h3>Fit against intent</h3><span>{active ? `${active.name} · ${active.grade} · ${active.route}` : 'Select a point'}</span></header>
          <svg viewBox="0 0 520 220" className="hx-plot" role="img" aria-label="Fit score against intent score">
            <line x1="36" y1="12" x2="36" y2="180" stroke="#e6e8ee" />
            <line x1="36" y1="180" x2="500" y2="180" stroke="#e6e8ee" />
            {shown.map((point) => {
              const x = 36 + (point.fit / 100) * 450;
              const y = 180 - (point.intent / 100) * 160;
              const held = point.coverage <= 0;
              return (
                <g key={point.id} onClick={() => setPicked(point.id)} className="hx-dot">
                  <circle cx={x} cy={y} r={picked === point.id ? 8 : 6} fill={held ? '#d97706' : '#1d4ed8'} />
                  <title>{`${point.name}: fit ${point.fit}, intent ${point.intent}, coverage ${point.coverage}`}</title>
                </g>
              );
            })}
            <text x="36" y="204" fill="#6b7280" fontSize="11">Fit 0</text>
            <text x="470" y="204" fill="#6b7280" fontSize="11">100</text>
            <text x="4" y="18" fill="#6b7280" fontSize="11">Intent</text>
          </svg>
        </article>

        <article className="hx-card">
          <header><h3>Score parts</h3><span>Averages in view</span></header>
          <ul className="hx-bars hx-parts">
            {[
              ['Fit', avg('fit'), '35%'],
              ['Intent', avg('intent'), '40%'],
              ['Coverage', avg('coverage'), '25%'],
            ].map(([label, value, weight]) => (
              <li key={label}>
                <span>{label} × {weight}</span>
                <i><em style={{ width: `${value}%` }} /></i>
                <b>{value}</b>
              </li>
            ))}
          </ul>
          <p className="hx-formula">composite = fit×0.35 + intent×0.40 + coverage×0.25</p>
        </article>

        <article className="hx-card">
          <header><h3>Coverage gate</h3><span>Zero holds the lane</span></header>
          <ul className="hx-bars">
            {coverageBands.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <i><em className={item.label === 'Zero' ? 'is-hold' : undefined} style={{ width: `${(item.count / (shown.length || 1)) * 100}%` }} /></i>
                <b>{item.count}</b>
              </li>
            ))}
          </ul>
          <p className="hx-formula">Blocks A1, Engaged, the 4-hour SLA, and persona discovery.</p>
        </article>

        <article className="hx-card">
          <header><h3>SLA</h3><span>Only after the gate</span></header>
          <ul className="hx-bars">
            {sla.map((item) => (
              <li key={item.label}>
                <span>{item.label}</span>
                <i><em style={{ width: `${(item.count / (shown.length || 1)) * 100}%` }} /></i>
                <b>{item.count}</b>
              </li>
            ))}
          </ul>
        </article>

        <article className="hx-card hx-card-wide">
          <header><h3>Composite trace</h3><span>Each bar is one unit</span></header>
          <svg viewBox="0 0 520 120" className="hx-trace" role="img" aria-label="Composite score of each unit">
            {shown.map((point, index) => {
              const width = 520 / Math.max(shown.length, 1);
              const height = (point.composite / 100) * 96;
              return (
                <g key={point.id} onClick={() => setPicked(point.id)}>
                  <rect x={index * width + 4} y={108 - height} width={Math.max(width - 8, 4)} height={height} rx="3" fill={point.coverage <= 0 ? '#d97706' : '#1d4ed8'} opacity={picked === point.id ? 1 : 0.85} />
                  <title>{`${point.name} ${point.composite.toFixed(1)}`}</title>
                </g>
              );
            })}
          </svg>
        </article>
      </div>
      <p className="hx-caption">Charts use the sample accounts and the units already in this workspace. They are an operating picture, not booked revenue.</p>
    </section>
  );
}
