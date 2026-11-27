import React, { useState } from 'react';
import { ArrowRight, Grid2X2, List, Download } from 'lucide-react';
import { AccountDemandUnit, ActiveNavTab } from '../types';
import './account-matrix.css';

interface Props {
  accounts: AccountDemandUnit[];
  theme?: 'dark' | 'light';
  loading?: boolean;
  onSelectAccount: (account: AccountDemandUnit) => void;
  onNavigateTab?: (tab: ActiveNavTab) => void;
}
const quadrants = [
  { id: 'intent', title: 'Develop the fit', detail: 'Active intent · lower fit', fit: false, intent: true },
  { id: 'strong', title: 'Review for activation', detail: 'Strong fit · active intent', fit: true, intent: true },
  { id: 'quiet', title: 'Monitor for signals', detail: 'Lower fit · quiet intent', fit: false, intent: false },
  { id: 'fit', title: 'Build engagement', detail: 'Strong fit · quiet intent', fit: true, intent: false },
];
const score = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) ? value : null;
const fit = (a: AccountDemandUnit) => score(a.scoreAudit?.fit ?? a.scores?.firmographicFit);
const intent = (a: AccountDemandUnit) => score(a.scoreAudit?.intent ?? a.scores?.intentSurge);
const coverage = (a: AccountDemandUnit) => score(a.scoreAudit?.coverage ?? a.committee?.coverageScore);
const composite = (a: AccountDemandUnit) => score(a.scoreAudit?.composite ?? a.compositeScore);
const display = (value: number | null) => value === null ? '—' : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
const need = (a: AccountDemandUnit) => !a.solutionTarget || a.solutionTarget === 'unclassified' ? 'Need not classified' : a.solutionTarget;
const lane = (a: AccountDemandUnit) => a.scoreAudit?.routingState?.replaceAll('_', ' ').toLowerCase() || 'Not evaluated';

export const AccountMatrixView: React.FC<Props> = ({ accounts, loading, onSelectAccount, onNavigateTab }) => {
  const [mode, setMode] = useState<'matrix' | 'table'>(() => window.matchMedia('(max-width: 600px)').matches ? 'table' : 'matrix');
  const [cellId, setCellId] = useState('all');
  const [query, setQuery] = useState('');
  const [fitThreshold, setFitThreshold] = useState(80);
  const [intentThreshold, setIntentThreshold] = useState(55);
  const [limit, setLimit] = useState(25);
  const searched = accounts.filter(a => [a.accountName, a.domain, a.solutionTarget].some(value => (value || '').toLowerCase().includes(query.trim().toLowerCase())));
  const matches = (a: AccountDemandUnit, cell: typeof quadrants[number]) => fit(a) !== null && intent(a) !== null && (fit(a)! >= fitThreshold) === cell.fit && (intent(a)! >= intentThreshold) === cell.intent;
  const groups = quadrants.map(cell => ({ ...cell, units: searched.filter(a => matches(a, cell)) }));
  const incomplete = searched.filter(a => fit(a) === null || intent(a) === null);
  const selected = groups.find(cell => cell.id === cellId);
  const shown = [...(cellId === 'incomplete' ? incomplete : selected ? selected.units : searched)].sort((a, b) => (composite(b) ?? -1) - (composite(a) ?? -1) || (a.accountName || '').localeCompare(b.accountName || ''));
  const noIntent = searched.length > 0 && searched.every(a => intent(a) === 0);
  const noCoverage = searched.length > 0 && searched.every(a => coverage(a) === 0);
  const contextText = noCoverage ? 'Buying-group coverage is also zero. Research and company news do not establish buying intent; connect first-party activity and contact evidence before activation.' : 'Research and company news do not establish buying intent. Review first-party activity before activation.';
  const reset = () => { setQuery(''); setCellId('all'); setLimit(25); };
  const exportCsv = () => {
    const rows = [['Account', 'Domain', 'Need', 'Fit', 'Intent', 'Coverage', 'Composite', 'Operating lane'], ...shown.map(a => [a.accountName, a.domain, need(a), fit(a) ?? '', intent(a) ?? '', coverage(a) ?? '', composite(a) ?? '', lane(a)])];
    const csv = rows.map(row => row.map(value => { const str = String(value ?? ''); return `"${/^[=+@-]/.test(str) ? "'" : ''}${str.replaceAll('"', '""')}"`; }).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'dual-motion-demand-matrix.csv'; anchor.click(); URL.revokeObjectURL(url);
  };
  return <div className="account-matrix">
    <header className="am-heading"><div><h1>Account matrix</h1><p>Find the right accounts to engage, then check their coverage and operating gates.</p></div><button className="dm-button" onClick={exportCsv} disabled={!shown.length}><Download size={16} />Export data</button></header>
    {loading && !accounts.length ? <section className="am-panel am-empty" role="status">Loading account scores…</section> : !accounts.length ? <section className="am-panel am-empty"><h2>No demand units available</h2><p>Import account data or check the workspace search to populate your matrix.</p><button className="dm-button" onClick={() => onNavigateTab?.('SIMULATOR')}>Open data imports</button></section> : <>
      <section className="am-toolbar" aria-label="Matrix filters">
        <label className="dm-field am-search">Find an account<input className="dm-input" value={query} placeholder="Account, domain, or need" onChange={e => { setQuery(e.target.value); setLimit(25); }} /></label>
        <details className="am-thresholds"><summary>Thresholds: fit {fitThreshold} · intent {intentThreshold}</summary><div><label className="dm-field">Strong fit starts at<select className="dm-input" value={fitThreshold} onChange={e => { setFitThreshold(Number(e.target.value)); setLimit(25); }}>{[50, 60, 75, 80, 90].map(v => <option key={v} value={v}>{v} / 100</option>)}</select></label><label className="dm-field">Active intent starts at<select className="dm-input" value={intentThreshold} onChange={e => { setIntentThreshold(Number(e.target.value)); setLimit(25); }}>{[35, 55, 75, 90].map(v => <option key={v} value={v}>{v} / 100</option>)}</select></label><p>View thresholds only. Saved scoring rules stay unchanged.</p><button className="am-text-button" onClick={() => onNavigateTab?.('RULES')}>Open Scoring studio <ArrowRight size={14} /></button></div></details>
        <div className="am-mode" role="group" aria-label="Matrix visualization"><button aria-pressed={mode === 'matrix'} onClick={() => setMode('matrix')}><Grid2X2 size={16} />Matrix</button><button aria-pressed={mode === 'table'} onClick={() => setMode('table')}><List size={16} />Table</button></div>
      </section>
      {mode === 'matrix' && <section className="am-panel am-chart" aria-labelledby="am-chart-title"><div className="am-section-heading"><h2 id="am-chart-title">Fit × intent</h2><span>{searched.length.toLocaleString()} demand units</span></div><div className="am-axes"><span>Intent ↑</span><span>Account fit →</span></div><div className="am-grid">{groups.map(cell => <button className={`am-quadrant ${cell.id === 'strong' ? 'am-opportunity' : ''}`} key={cell.id} aria-pressed={cellId === cell.id} onClick={() => { setCellId(cellId === cell.id ? 'all' : cell.id); setLimit(25); }}><span className="am-quadrant-title">{cell.title}<ArrowRight size={15} /></span><span className={`am-quadrant-value ${cell.units.length ? 'am-populated' : ''}`}>{cell.units.length.toLocaleString()}<span>{searched.length ? Math.round(cell.units.length / searched.length * 100) : 0}% of view</span></span><span className="am-quadrant-description">{cell.detail}</span><span className="am-share" aria-hidden="true"><span style={{ width: `${searched.length ? cell.units.length / searched.length * 100 : 0}%` }} /></span></button>)}</div>{incomplete.length > 0 && <button className="am-text-button" aria-pressed={cellId === 'incomplete'} onClick={() => { setCellId('incomplete'); setLimit(25); }}>{incomplete.length} with incomplete scores · review separately</button>}<p className="am-chart-note">Fit ≥ {fitThreshold} / 100 · Active intent ≥ {intentThreshold} / 100. Select a quadrant to filter the accounts below.</p></section>}
      {noIntent && <aside className="am-context"><div><strong>Fit is available. Intent scores are currently zero.</strong><p className="am-context-desktop">{contextText}</p><details className="am-context-detail"><summary>Why are these scores zero?</summary><p>{contextText}</p></details></div><button className="am-text-button" onClick={() => onNavigateTab?.('CONNECTORS')}>Review connections <ArrowRight size={15} /></button></aside>}
      <section className="am-panel am-accounts" aria-labelledby="am-accounts-title"><div className="am-section-heading"><div><h2 id="am-accounts-title">{cellId === 'incomplete' ? 'Incomplete scores' : selected?.title || 'All demand units'}</h2><p role="status">{shown.length.toLocaleString()} matching units · Highest composite first</p></div>{(cellId !== 'all' || query) && <button className="dm-button" onClick={reset}>Clear filters</button>}</div>
        <div className="am-table-scroll"><table className="am-table"><thead><tr><th scope="col">Account / need</th><th scope="col">Fit</th><th scope="col">Intent</th><th scope="col">Coverage</th><th scope="col">Composite</th><th scope="col">Operating lane</th></tr></thead><tbody>{shown.slice(0, limit).map(a => <tr key={a.id}><td><button className="am-account-link" onClick={() => onSelectAccount(a)}>{a.accountName || a.domain || 'Unnamed account'}</button><span className="am-account-subline">{a.domain || 'Domain unavailable'} · {need(a)}</span></td><td>{display(fit(a))}</td><td>{display(intent(a))}</td><td>{display(coverage(a))}{coverage(a) !== null && '%'}</td><td><strong>{display(composite(a))}</strong></td><td><span className="am-lane">{lane(a)}</span></td></tr>)}</tbody></table></div>
        <div className="am-mobile-accounts">{shown.slice(0, limit).map(a => <article key={a.id}><div><button className="am-account-link" onClick={() => onSelectAccount(a)}>{a.accountName || a.domain || 'Unnamed account'}</button><strong>{display(composite(a))}<small>Composite</small></strong></div><p>{a.domain || 'Domain unavailable'} · {need(a)}</p><dl><div><dt>Fit</dt><dd>{display(fit(a))}</dd></div><div><dt>Intent</dt><dd>{display(intent(a))}</dd></div><div><dt>Coverage</dt><dd>{display(coverage(a))}{coverage(a) !== null && '%'}</dd></div><div><dt>Lane</dt><dd>{lane(a)}</dd></div></dl></article>)}</div>
        {!shown.length && <div className="am-empty"><h3>No accounts match this view</h3><p>{selected ? 'No demand units meet these fit and intent thresholds.' : 'Try a different account name, domain, or need.'}</p><button className="dm-button" onClick={reset}>Show all accounts</button></div>}
        {shown.length > 0 && <footer className="am-table-footer"><span>Showing 1–{Math.min(limit, shown.length)} of {shown.length.toLocaleString()}</span>{shown.length > limit && <button className="dm-button" onClick={() => setLimit(v => v + 25)}>Show 25 more</button>}</footer>}
      </section>
    </>}
  </div>;
};
