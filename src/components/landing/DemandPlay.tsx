import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccountDemandUnit } from '../../types';
import { ScoreRing } from './ScoreRing';

type Loadout = {
  id: string;
  label: string;
  company: string;
  domain: string;
  need: string;
  source: 'sample' | 'workspace';
  fit: number;
  intent: number;
  coverage: number;
  tier1: boolean;
  opportunity: boolean;
  recycled: boolean;
};

type Outcome = {
  composite: number;
  grade: string;
  stage: string;
  route: 'Sales lane' | 'Marketing lane' | 'Hold';
  sla: number | null;
  play: string;
  locks: string[];
  brief: string;
};

export const landingSamples: Loadout[] = [
  { id: 'harborline', label: 'Harborline', company: 'Harborline', domain: 'harborline.com', need: 'Data residency', source: 'sample', fit: 84, intent: 72, coverage: 56, tier1: true, opportunity: false, recycled: false },
  { id: 'northspan', label: 'Northspan', company: 'Northspan', domain: 'northspan.io', need: 'Data residency', source: 'sample', fit: 88, intent: 80, coverage: 0, tier1: false, opportunity: false, recycled: false },
  { id: 'acme', label: 'Acme Industrial', company: 'Acme Industrial', domain: 'acme.example', need: 'Plant safety', source: 'sample', fit: 62, intent: 48, coverage: 22, tier1: false, opportunity: false, recycled: false },
  { id: 'northwind', label: 'Northwind', company: 'Northwind', domain: 'northwind.example', need: 'Cloud archive', source: 'sample', fit: 40, intent: 8, coverage: 0, tier1: false, opportunity: false, recycled: false },
];

const STAGES = ['Target', 'Active', 'Engaged', 'Prioritized', 'Qualified', 'Pipeline', 'Won', 'Lost'];

function round1(value: number) {
  const scaled = value * 10;
  const base = Math.trunc(scaled);
  const fraction = Math.abs(scaled - base);
  if (Math.abs(fraction - 0.5) < 1e-8) {
    const even = base % 2 === 0 ? base : base + (scaled < 0 ? -1 : 1);
    return even / 10;
  }
  return Math.round(scaled) / 10;
}

function playLabel(code: string) {
  const names: Record<string, string> = {
    COVERAGE_VERIFICATION: 'Coverage verification',
    RECYCLE_NURTURE: 'Recycle nurture',
    DEAL_ACCELERATION: 'Deal acceleration',
    SALES_ALIGNMENT: 'Sales alignment',
    EXECUTIVE_AIR_COVER: 'Executive air cover',
    INTENT_ACCELERATION: 'Intent acceleration',
    AWARENESS: 'Awareness',
  };
  return names[code] ?? code;
}

export function scoreModule(input: Pick<Loadout, 'fit' | 'intent' | 'coverage' | 'tier1' | 'opportunity' | 'recycled'>): Outcome {
  const { fit, intent, coverage, tier1, opportunity, recycled } = input;
  const composite = round1(fit * 0.35 + intent * 0.4 + coverage * 0.25);
  let grade = 'D';
  if (fit >= 80 && intent >= 70 && coverage >= 50) grade = 'A1';
  else if (fit >= 75 && intent >= 60) grade = 'A2';
  else if ((fit >= 65 && intent >= 60) || (fit >= 80 && intent >= 45)) grade = 'B1';
  else if (fit >= 55 && intent >= 40) grade = 'B2';
  else if (fit >= 70 && intent < 40) grade = 'C1';
  else if (fit < 55 && intent >= 60) grade = 'C2';

  let stage = 'Target';
  if (opportunity) stage = 'Pipeline';
  else if (coverage <= 0) stage = intent >= 15 ? 'Active' : 'Target';
  else {
    const prioritized = !recycled && (grade === 'A1' || grade === 'A2' || (composite >= 72 && fit >= 70) || (tier1 && intent >= 60 && coverage >= 30));
    if (prioritized) stage = 'Prioritized';
    else if (coverage > 0) stage = 'Engaged';
    else if (intent >= 15) stage = 'Active';
  }

  let route: Outcome['route'] = 'Hold';
  let sla: number | null = null;
  if (coverage <= 0) route = 'Hold';
  else if (grade === 'A1' && stage === 'Prioritized') { route = 'Sales lane'; sla = 4; }
  else if ((grade === 'A2' || grade === 'B1' || stage === 'Prioritized') && !recycled) { route = 'Sales lane'; sla = 24; }
  else if (grade === 'B2' || grade === 'C1' || grade === 'C2' || recycled) route = 'Marketing lane';

  let play = 'AWARENESS';
  if (coverage <= 0) play = 'COVERAGE_VERIFICATION';
  else if (recycled) play = 'RECYCLE_NURTURE';
  else if (stage === 'Pipeline') play = 'DEAL_ACCELERATION';
  else if (stage === 'Prioritized') play = 'SALES_ALIGNMENT';
  else if (coverage > 0 && coverage < 60) play = 'EXECUTIVE_AIR_COVER';
  else if (stage === 'Active') play = 'INTENT_ACCELERATION';

  const locks = coverage <= 0 ? ['A1', 'Engaged', '4-hour SLA', 'Persona discovery'] : [];
  let brief = 'Scores stay below the sales and marketing gates. The unit remains on hold.';
  if (coverage <= 0 && opportunity) brief = 'An opportunity is on file, so the stage is Pipeline. Coverage zero still holds the lane.';
  else if (coverage <= 0 && intent >= 15) brief = 'Intent places the unit in Active. Coverage zero holds the lane and blocks Engaged, A1, and the four-hour SLA.';
  else if (coverage <= 0) brief = 'Fresh intent and a verified buying group are both absent. The unit stays on the target list.';
  else if (sla === 4) brief = 'Fit, intent, and coverage clear A1. Sales follow-up carries a four-hour SLA.';
  else if (route === 'Sales lane') brief = 'The unit is sales-ready. The SLA is 24 hours.';
  else if (route === 'Marketing lane') brief = 'Demand is real and covered. It stays with marketing until a seller is warranted.';
  return { composite, grade, stage, route, sla, play: playLabel(play), locks, brief };
}

function workspaceRows(accounts: AccountDemandUnit[]): Loadout[] {
  return accounts.filter((account) => account.scoreAudit).slice(0, 4).map((account) => ({
    id: `ws-${account.id}`,
    label: account.accountName,
    company: account.accountName,
    domain: account.domain,
    need: account.solutionTarget,
    source: 'workspace' as const,
    fit: Math.round(account.scoreAudit!.fit),
    intent: Math.round(account.scoreAudit!.intent),
    coverage: Math.round(account.scoreAudit!.coverage),
    tier1: /tier\s*1/i.test(account.tier),
    opportunity: false,
    recycled: false,
  }));
}

export function DemandPlay({
  accounts = [],
  onOpenAccount,
}: {
  accounts?: AccountDemandUnit[];
  onOpenAccount?: (account: AccountDemandUnit) => void;
}) {
  const rows = useMemo(() => [...landingSamples, ...workspaceRows(accounts)], [accounts]);
  const [selectedId, setSelectedId] = useState(landingSamples[0].id);
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const [fit, setFit] = useState(selected.fit);
  const [intent, setIntent] = useState(selected.intent);
  const [coverage, setCoverage] = useState(selected.coverage);
  const [tier1, setTier1] = useState(selected.tier1);
  const [opportunity, setOpportunity] = useState(selected.opportunity);
  const [recycled, setRecycled] = useState(selected.recycled);
  const [adjusting, setAdjusting] = useState(false);
  const [laneFilter, setLaneFilter] = useState<'All' | Outcome['route']>('All');
  const [log, setLog] = useState<string[]>(['Opened Harborline · Data residency.']);
  const [preview, setPreview] = useState<string | null>(null);
  const decisionKey = useRef({ id: '', signature: '' });

  const outcome = useMemo(
    () => scoreModule({ fit, intent, coverage, tier1, opportunity, recycled }),
    [fit, intent, coverage, tier1, opportunity, recycled],
  );
  const recorded = useMemo(() => scoreModule(selected), [selected]);
  const dirty = fit !== selected.fit || intent !== selected.intent || coverage !== selected.coverage || tier1 !== selected.tier1 || opportunity !== selected.opportunity || recycled !== selected.recycled;

  const applyRow = (row: Loadout, note: string) => {
    setSelectedId(row.id);
    setFit(row.fit);
    setIntent(row.intent);
    setCoverage(row.coverage);
    setTier1(row.tier1);
    setOpportunity(row.opportunity);
    setRecycled(row.recycled);
    setPreview(null);
    setLog((current) => [note, ...current].slice(0, 6));
  };

  useEffect(() => {
    const signature = `${outcome.stage}|${outcome.route}|${outcome.grade}|${outcome.play}`;
    const previous = decisionKey.current;
    if (previous.id === selected.id && previous.signature && previous.signature !== signature && adjusting) {
      setLog((current) => [`${selected.company}: ${outcome.stage} · ${outcome.route} · ${outcome.play}.`, ...current].slice(0, 6));
    }
    decisionKey.current = { id: selected.id, signature };
  }, [adjusting, outcome.grade, outcome.play, outcome.route, outcome.stage, selected.company, selected.id]);

  const [zeroOnly, setZeroOnly] = useState(false);
  const [tapeOn, setTapeOn] = useState(true);
  const [tapeScope, setTapeScope] = useState<'all' | 'sample' | 'workspace'>('all');
  const [tape, setTape] = useState<Array<{ id: string; rowId: string; company: string; need: string; text: string; stamp: string }>>([]);
  const tapeCursor = useRef(0);
  const scored = useMemo(() => rows.map((row) => ({ row, outcome: scoreModule(row) })), [rows]);
  const counts = {
    units: scored.length,
    sales: scored.filter((item) => item.outcome.route === 'Sales lane').length,
    marketing: scored.filter((item) => item.outcome.route === 'Marketing lane').length,
    hold: scored.filter((item) => item.outcome.route === 'Hold').length,
    zero: scored.filter((item) => item.row.coverage <= 0).length,
  };
  const stageCounts = STAGES.map((stage) => ({
    stage,
    count: scored.filter((item) => item.outcome.stage === stage).length,
  }));

  useEffect(() => {
    const pool = scored.filter((item) => tapeScope === 'all' || item.row.source === tapeScope);
    if (!pool.length) return;
    const push = () => {
      const item = pool[tapeCursor.current % pool.length];
      tapeCursor.current += 1;
      const stamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTape((current) => [{
        id: `${item.row.id}-${tapeCursor.current}`,
        rowId: item.row.id,
        company: item.row.company,
        need: item.row.need,
        text: `${item.outcome.grade} · ${item.outcome.stage} · ${item.outcome.route} · ${item.outcome.composite.toFixed(1)}`,
        stamp,
      }, ...current].slice(0, 14));
    };
    push();
    if (!tapeOn) return;
    const timer = window.setInterval(push, 2600);
    return () => window.clearInterval(timer);
  }, [scored, tapeOn, tapeScope]);

  const visible = rows.filter((row) => {
    if (zeroOnly && row.coverage > 0) return false;
    return laneFilter === 'All' || scoreModule(row).route === laneFilter;
  });
  const chooseLane = (lane: 'All' | Outcome['route']) => {
    setZeroOnly(false);
    setLaneFilter(lane);
  };
  const actions = [
    { id: 'seller', label: 'Seller follow-up', enabled: outcome.route === 'Sales lane', detail: outcome.sla ? `${outcome.sla}-hour SLA` : 'Sales lane is closed' },
    { id: 'program', label: 'Marketing program', enabled: outcome.route === 'Marketing lane', detail: outcome.route === 'Marketing lane' ? outcome.play : 'Unit is not on the marketing lane' },
    { id: 'verify', label: 'Verify buying group', enabled: coverage <= 0, detail: coverage <= 0 ? 'Coverage is zero' : 'A buying-group member is already on the unit' },
    { id: 'persona', label: 'Persona discovery', enabled: coverage > 0, detail: coverage > 0 ? 'Coverage gate is open' : 'Blocked while coverage is zero' },
  ];

  return (
    <div className="deck">
      <div className="deck-kpis">
        {([
          ['Units', counts.units, () => chooseLane('All')],
          ['Sales', counts.sales, () => chooseLane('Sales lane')],
          ['Marketing', counts.marketing, () => chooseLane('Marketing lane')],
          ['Hold', counts.hold, () => chooseLane('Hold')],
          ['Coverage 0', counts.zero, () => { setLaneFilter('All'); setZeroOnly(true); }],
        ] as const).map(([label, value, onClick]) => (
          <button key={label} type="button" onClick={onClick} className={(label === 'Coverage 0' && zeroOnly) || (label === 'Sales' && !zeroOnly && laneFilter === 'Sales lane') || (label === 'Marketing' && !zeroOnly && laneFilter === 'Marketing lane') || (label === 'Hold' && !zeroOnly && laneFilter === 'Hold') || (label === 'Units' && !zeroOnly && laneFilter === 'All') ? 'is-on' : undefined}>
            <span>{label}</span>
            <strong>{value}</strong>
          </button>
        ))}
      </div>
      <div className="deck-body">
        <aside className="deck-feed" aria-label="Score tape">
          <header>
            <div>
              <p>Score tape</p>
              <strong>{tapeOn ? 'Running' : 'Paused'}</strong>
            </div>
            <button type="button" onClick={() => setTapeOn((on) => !on)}>{tapeOn ? 'Pause' : 'Run'}</button>
          </header>
          <div className="deck-tabs" role="tablist">
            {(['all', 'sample', 'workspace'] as const).map((scope) => (
              <button key={scope} type="button" role="tab" aria-selected={tapeScope === scope} className={tapeScope === scope ? 'is-on' : undefined} onClick={() => setTapeScope(scope)}>
                {scope === 'all' ? 'All' : scope === 'sample' ? 'Samples' : 'Workspace'}
              </button>
            ))}
          </div>
          <ul>
            {tape.filter((item) => {
              const row = rows.find((candidate) => candidate.id === item.rowId);
              if (!row) return false;
              if (zeroOnly && row.coverage > 0) return false;
              const route = scoreModule(row).route;
              return laneFilter === 'All' || route === laneFilter;
            }).map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => {
                  const row = rows.find((candidate) => candidate.id === item.rowId);
                  if (row) applyRow(row, `Opened ${row.company} from the tape.`);
                }}>
                  <b>{item.company.slice(0, 1)}</b>
                  <span>
                    <strong>{item.company}</strong>
                    <small>{item.stamp}</small>
                    <em>{item.need}</em>
                    <p>{item.text}</p>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="deck-note">Scores already on this page. Not a live provider feed.</p>
        </aside>
        <div className="op-shell">
      <div className="op-toolbar">
        <div className="op-modes" role="tablist" aria-label="Record mode">
          <button type="button" role="tab" aria-selected={!adjusting} className={!adjusting ? 'is-on' : undefined} onClick={() => setAdjusting(false)}>Record</button>
          <button type="button" role="tab" aria-selected={adjusting} className={adjusting ? 'is-on' : undefined} onClick={() => setAdjusting(true)}>Adjust scores</button>
        </div>
        <p>{adjusting ? 'Working copy. Provider systems are not updated.' : 'Stored scores for the selected unit.'}</p>
        {dirty && <button type="button" className="op-text" onClick={() => applyRow(selected, `Reset ${selected.company} to the recorded scores.`)}>Reset</button>}
      </div>

      <div className="op-board">
        <section className="op-queue" aria-label="Demand units">
          <div className="op-filters" role="group" aria-label="Filter by lane">
            {(['All', 'Sales lane', 'Marketing lane', 'Hold'] as const).map((lane) => (
              <button key={lane} type="button" className={!zeroOnly && laneFilter === lane ? 'is-on' : undefined} onClick={() => chooseLane(lane)}>
                {lane === 'All' ? 'All' : lane.replace(' lane', '')}
              </button>
            ))}
          </div>
          {(['sample', 'workspace'] as const).map((source) => {
            const group = visible.filter((row) => row.source === source);
            if (!group.length) return null;
            return (
              <div key={source}>
                <p className="op-group">{source === 'sample' ? 'Samples' : 'This workspace'}</p>
                <ul>
                  {group.map((row) => {
                    const rowOutcome = scoreModule(row);
                    const active = row.id === selected.id;
                    return (
                      <li key={row.id}>
                        <button type="button" aria-current={active ? 'true' : undefined} onClick={() => applyRow(row, `Opened ${row.company} · ${row.need}.`)}>
                          <span>
                            <strong>{row.company}</strong>
                            <small>{row.need}</small>
                          </span>
                          <span>
                            <b>{rowOutcome.composite.toFixed(1)}</b>
                            <small>{rowOutcome.route}</small>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          {visible.length === 0 && <p className="op-empty">No units on this lane.</p>}
        </section>

        <section className="op-record" aria-live="polite">
          <header>
            <div>
              <p>{selected.source === 'workspace' ? 'Workspace' : 'Sample'} · {selected.domain}</p>
              <h2>{selected.company}</h2>
              <span>{selected.need}</span>
            </div>
            <ScoreRing
              fit={fit}
              intent={intent}
              coverage={coverage}
              composite={outcome.composite}
              grade={outcome.grade}
            />
          </header>
          {dirty && <p className="op-delta">Recorded {recorded.composite.toFixed(1)} · {recorded.stage} · {recorded.route}. Working copy {outcome.composite.toFixed(1)} · {outcome.stage} · {outcome.route}.</p>}
          <ol className="op-stages" aria-label="Waterfall position">
            {STAGES.map((stage) => {
              const locked = coverage <= 0 && (stage === 'Engaged' || stage === 'Prioritized');
              return (
                <li
                  key={stage}
                  className={[stage === outcome.stage ? 'is-here' : '', locked ? 'is-held' : ''].filter(Boolean).join(' ')}
                  aria-current={stage === outcome.stage ? 'step' : undefined}
                  title={locked ? `${stage} stays closed while coverage is zero` : stage}
                >
                  {stage}
                </li>
              );
            })}
          </ol>
          <div className="op-meters">
            {([
              ['Fit', '0.35', fit, setFit],
              ['Intent', '0.40', intent, setIntent],
              ['Coverage', '0.25', coverage, setCoverage],
            ] as const).map(([label, weight, value, set]) => (
              <label key={label}>
                <span>{label} <b>{value}</b></span>
                {adjusting ? (
                  <input type="range" min={0} max={100} step={1} value={value} aria-valuetext={`${label} ${value}`} style={{ ['--op-fill' as string]: `${value}%` }} onChange={(event) => set(Number(event.target.value))} />
                ) : (
                  <i><em style={{ width: `${value}%` }} /></i>
                )}
                <small>× {weight} = {(value * Number(weight)).toFixed(1)}</small>
              </label>
            ))}
          </div>
          {adjusting && (
            <div className="op-flags" role="group" aria-label="Record conditions">
              {([
                ['Tier 1', tier1, setTier1],
                ['Opportunity on file', opportunity, setOpportunity],
                ['Recycle', recycled, setRecycled],
              ] as const).map(([label, on, set]) => (
                <button key={label} type="button" aria-pressed={on} onClick={() => set(!on)}>{label}</button>
              ))}
            </div>
          )}
          <p className="op-brief">{outcome.brief}</p>
        </section>

        <aside className="op-decision">
          <p className="op-kicker">Operating decision</p>
          <dl>
            <div><dt>Stage</dt><dd>{outcome.stage}</dd></div>
            <div><dt>Lane</dt><dd>{outcome.route}</dd></div>
            <div><dt>SLA</dt><dd>{outcome.sla ? `${outcome.sla} hours` : 'None'}</dd></div>
            <div><dt>Play</dt><dd>{outcome.play}</dd></div>
          </dl>
          {outcome.locks.length > 0 && (
            <ul className="op-policy">
              {outcome.locks.map((lock) => <li key={lock}>{lock} blocked</li>)}
            </ul>
          )}
          <div className="op-actions">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                disabled={!action.enabled}
                onClick={() => {
                  const message = `${action.label} for ${selected.company} would be the next step. No task or provider write was created.`;
                  setPreview(message);
                  setLog((current) => [`Previewed ${action.label}.`, ...current].slice(0, 6));
                }}
              >
                <strong>{action.label}</strong>
                <small>{action.detail}</small>
              </button>
            ))}
          </div>
          {preview && <p className="op-preview">{preview}</p>}
          {selected.source === 'workspace' && onOpenAccount && (
            <button
              type="button"
              className="op-open"
              onClick={() => {
                const account = accounts.find((item) => `ws-${item.id}` === selected.id);
                if (account) onOpenAccount(account);
              }}
            >
              Open in scoring
            </button>
          )}
          <ol className="op-log" aria-label="Decision activity">
            {log.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}
          </ol>
        </aside>
      </div>
        </div>
        <aside className="deck-rail" aria-label="Stage mix">
          <p>Stage mix</p>
          <ul>
            {stageCounts.map((item) => (
              <li key={item.stage}>
                <span>{item.stage}</span>
                <i><em style={{ width: `${counts.units ? (item.count / counts.units) * 100 : 0}%` }} /></i>
                <b>{item.count}</b>
              </li>
            ))}
          </ul>
          <p>Coverage hold</p>
          <ul className="deck-holds">
            {scored.filter((item) => item.row.coverage <= 0).map((item) => (
              <li key={item.row.id}>
                <button type="button" onClick={() => applyRow(item.row, `Opened ${item.row.company} from coverage hold.`)}>
                  <strong>{item.row.company}</strong>
                  <small>{item.outcome.stage} · {item.outcome.grade}</small>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
