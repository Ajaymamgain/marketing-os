import React, { useMemo, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { IntelligenceCompany } from '../services/api';
import { assessAccount } from '../scoring/intelligence-assessment';

type DensityColumnMode = 'completeness' | 'news';
type FitBandKey = 'strong' | 'moderate' | 'limited' | 'low' | 'unknown';
type DetailTab = 'overview' | 'enrichment' | 'lookalikes' | 'news' | 'ads';

interface Props {
  companies: IntelligenceCompany[];
  totalAccounts: number;
  selectedDomain: string;
  selectedIndustry: string;
  onSelectIndustry: (industry: string) => void;
  onSelectAccount: (domain: string) => void;
  onInspectAccount: (domain: string, targetMode?: DetailTab) => void;
  onQuickView?: (domain: string) => void;
}

const FIT_BANDS: Array<{ key: FitBandKey; label: string; short: string; color: string }> = [
  { key: 'strong', label: 'Strong ICP fit (≥80)', short: 'Strong fit', color: '#15803d' },
  { key: 'moderate', label: 'Moderate ICP fit (60–79)', short: 'Moderate fit', color: '#1d4ed8' },
  { key: 'limited', label: 'Limited ICP fit (40–59)', short: 'Limited fit', color: '#b45309' },
  { key: 'low', label: 'Low ICP fit (<40)', short: 'Low fit', color: '#64748b' },
  { key: 'unknown', label: 'Fit not established', short: 'Not established', color: '#94a3b8' },
];

const COMPLETENESS_BUCKETS = [
  { key: '0-25', label: '0–25%', test: (pct: number) => pct <= 25 },
  { key: '26-50', label: '26–50%', test: (pct: number) => pct > 25 && pct <= 50 },
  { key: '51-75', label: '51–75%', test: (pct: number) => pct > 50 && pct <= 75 },
  { key: '76-100', label: '76–100%', test: (pct: number) => pct > 75 },
] as const;

const NEWS_BUCKETS = [
  { key: '0', label: '0 articles', test: (n: number) => n === 0 },
  { key: '1-2', label: '1–2 articles', test: (n: number) => n >= 1 && n <= 2 },
  { key: '3-5', label: '3–5 articles', test: (n: number) => n >= 3 && n <= 5 },
  { key: '6+', label: '6+ articles', test: (n: number) => n >= 6 },
] as const;

function completenessPct(c: IntelligenceCompany): number {
  return c.total_fields ? Math.round((c.known_fields / c.total_fields) * 100) : 0;
}

function heatCellStyle(count: number, maxCount: number): { background: string; color: string; subColor: string } {
  if (count === 0 || maxCount === 0) {
    return { background: '#f8fafc', color: '#94a3b8', subColor: '#cbd5e1' };
  }
  const ratio = count / maxCount;
  if (ratio <= 0.2) {
    return { background: '#eff6ff', color: '#1e3a8a', subColor: '#475569' };
  }
  if (ratio <= 0.45) {
    return { background: '#dbeafe', color: '#1e3a8a', subColor: '#334155' };
  }
  if (ratio <= 0.72) {
    return { background: '#93c5fd', color: '#0f172a', subColor: '#1e293b' };
  }
  return { background: '#1d4ed8', color: '#ffffff', subColor: '#dbeafe' };
}

export function IntelligenceDensityView({
  companies,
  totalAccounts,
  selectedDomain,
  selectedIndustry,
  onSelectIndustry,
  onSelectAccount,
  onInspectAccount,
  onQuickView,
}: Props) {
  const [columnMode, setColumnMode] = useState<DensityColumnMode>('completeness');
  const [activeCell, setActiveCell] = useState<{ band: FitBandKey; colKey: string } | null>(null);
  const [hoveredDomain, setHoveredDomain] = useState<string>('');

  const columns = columnMode === 'completeness' ? COMPLETENESS_BUCKETS : NEWS_BUCKETS;

  const matrix = useMemo(() => {
    const cellMap = new Map<string, IntelligenceCompany[]>();
    const rowTotals: Record<FitBandKey, number> = {
      strong: 0,
      moderate: 0,
      limited: 0,
      low: 0,
      unknown: 0,
    };
    const colTotals: Record<string, number> = {};
    for (const col of columns) colTotals[col.key] = 0;

    for (const company of companies) {
      const band = assessAccount(company.score).band as FitBandKey;
      const metric = columnMode === 'completeness' ? completenessPct(company) : company.news_count;
      const col = columns.find((b) => b.test(metric)) || columns[0];
      const cellKey = `${band}::${col.key}`;
      const list = cellMap.get(cellKey);
      if (list) list.push(company);
      else cellMap.set(cellKey, [company]);
      rowTotals[band] += 1;
      colTotals[col.key] += 1;
    }

    let maxCell = 0;
    for (const list of cellMap.values()) {
      if (list.length > maxCell) maxCell = list.length;
    }

    return { cellMap, rowTotals, colTotals, maxCell };
  }, [companies, columnMode, columns]);

  const activeCellAccounts = useMemo(() => {
    if (!activeCell) {
      return [...companies].sort(
        (a, b) => (b.score?.composite ?? -1) - (a.score?.composite ?? -1)
      );
    }
    const list = matrix.cellMap.get(`${activeCell.band}::${activeCell.colKey}`) || [];
    return [...list].sort(
      (a, b) => (b.score?.composite ?? -1) - (a.score?.composite ?? -1)
    );
  }, [activeCell, companies, matrix]);

  const industryStats = useMemo(() => {
    const map = new Map<
      string,
      { industry: string; count: number; strong: number; scoreSum: number; scored: number }
    >();
    for (const c of companies) {
      const key = c.industry?.trim() || 'Not established';
      const entry = map.get(key) || {
        industry: key,
        count: 0,
        strong: 0,
        scoreSum: 0,
        scored: 0,
      };
      entry.count += 1;
      if (assessAccount(c.score).band === 'strong') entry.strong += 1;
      if (c.score) {
        entry.scoreSum += c.score.composite;
        entry.scored += 1;
      }
      map.set(key, entry);
    }
    return Array.from(map.values())
      .sort((a, b) => b.count - a.count || b.strong - a.strong)
      .slice(0, 10);
  }, [companies]);

  const maxIndustryCount = industryStats[0]?.count || 1;

  const sortedTiles = useMemo(() => {
    const bandRank: Record<FitBandKey, number> = {
      strong: 0,
      moderate: 1,
      limited: 2,
      low: 3,
      unknown: 4,
    };
    return [...companies].sort((a, b) => {
      const ba = bandRank[assessAccount(a.score).band as FitBandKey];
      const bb = bandRank[assessAccount(b.score).band as FitBandKey];
      if (ba !== bb) return ba - bb;
      return (b.score?.composite ?? -1) - (a.score?.composite ?? -1);
    });
  }, [companies]);

  const focusedTileCompany = useMemo(() => {
    const targetDomain = hoveredDomain || selectedDomain;
    return companies.find((c) => c.domain === targetDomain) || sortedTiles[0] || null;
  }, [companies, hoveredDomain, selectedDomain, sortedTiles]);

  const activeCellLabel = useMemo(() => {
    if (!activeCell) return null;
    const bandLabel = FIT_BANDS.find((b) => b.key === activeCell.band)?.short || activeCell.band;
    const colLabel = columns.find((c) => c.key === activeCell.colKey)?.label || activeCell.colKey;
    return `${bandLabel} · ${colLabel}`;
  }, [activeCell, columns]);

  if (!companies.length) {
    return (
      <div className="ci-viz-surface ci-state">
        <h3>No accounts to aggregate</h3>
        <p>Adjust your search, research status, industry, or ICP fit filters to inspect portfolio density.</p>
      </div>
    );
  }

  return (
    <div className="ci-density-layout">
      <div className="ci-viz-grid">
        <section className="ci-viz-surface ci-density-matrix-panel" aria-label="Account density heatmap">
          <header className="ci-viz-header">
            <div>
              <h2>Portfolio density matrix</h2>
              <p>
                Concentration of {companies.length} displayed accounts (of {totalAccounts} total) across ICP fit and{' '}
                {columnMode === 'completeness' ? 'research coverage' : 'dated news volume'}. Click any cell to inspect its cohort.
              </p>
            </div>
            <div className="ci-segmented" role="group" aria-label="Density column dimension">
              <button
                type="button"
                aria-pressed={columnMode === 'completeness'}
                className={columnMode === 'completeness' ? 'is-active' : ''}
                onClick={() => {
                  setColumnMode('completeness');
                  setActiveCell(null);
                }}
              >
                Research coverage
              </button>
              <button
                type="button"
                aria-pressed={columnMode === 'news'}
                className={columnMode === 'news' ? 'is-active' : ''}
                onClick={() => {
                  setColumnMode('news');
                  setActiveCell(null);
                }}
              >
                News activity
              </button>
            </div>
          </header>

          <div className="ci-heatmap-wrap">
            <table className="ci-heatmap-table">
              <thead>
                <tr>
                  <th scope="col" className="ci-heatmap-corner">
                    ICP fit band
                  </th>
                  {columns.map((col) => (
                    <th key={col.key} scope="col">
                      {col.label}
                    </th>
                  ))}
                  <th scope="col" className="ci-heatmap-total-col">
                    Row total
                  </th>
                </tr>
              </thead>
              <tbody>
                {FIT_BANDS.map((band) => (
                  <tr key={band.key}>
                    <th scope="row" className="ci-heatmap-row-head">
                      <span
                        className="ci-legend-swatch"
                        style={{ backgroundColor: band.color }}
                        aria-hidden="true"
                      />
                      <span>{band.label}</span>
                    </th>
                    {columns.map((col) => {
                      const cellAccounts = matrix.cellMap.get(`${band.key}::${col.key}`) || [];
                      const count = cellAccounts.length;
                      const pct = companies.length ? Math.round((count / companies.length) * 100) : 0;
                      const style = heatCellStyle(count, matrix.maxCell);
                      const isSelected =
                        activeCell?.band === band.key && activeCell?.colKey === col.key;
                      return (
                        <td key={col.key}>
                          <button
                            type="button"
                            disabled={count === 0}
                            aria-pressed={isSelected}
                            className={`ci-heatmap-cell ${isSelected ? 'is-selected' : ''}`}
                            style={{ backgroundColor: style.background, color: style.color }}
                            onClick={() =>
                              setActiveCell((prev) =>
                                prev?.band === band.key && prev?.colKey === col.key
                                  ? null
                                  : { band: band.key, colKey: col.key }
                              )
                            }
                            title={`${band.short}, ${col.label}: ${count} accounts (${pct}%)`}
                          >
                            <strong>{count}</strong>
                            <span style={{ color: style.subColor }}>{count > 0 ? `${pct}%` : '—'}</span>
                          </button>
                        </td>
                      );
                    })}
                    <td className="ci-heatmap-total-cell">
                      <strong>{matrix.rowTotals[band.key]}</strong>
                      <span>
                        {companies.length
                          ? `${Math.round((matrix.rowTotals[band.key] / companies.length) * 100)}%`
                          : '0%'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row" className="ci-heatmap-corner">
                    Column total
                  </th>
                  {columns.map((col) => (
                    <td key={col.key} className="ci-heatmap-foot-cell">
                      <strong>{matrix.colTotals[col.key]}</strong>
                    </td>
                  ))}
                  <td className="ci-heatmap-foot-cell">
                    <strong>{companies.length}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <footer className="ci-density-scale" aria-label="Density intensity scale">
            <span>Lower density</span>
            <div className="ci-density-swatches" aria-hidden="true">
              <span style={{ backgroundColor: '#f8fafc' }} />
              <span style={{ backgroundColor: '#eff6ff' }} />
              <span style={{ backgroundColor: '#dbeafe' }} />
              <span style={{ backgroundColor: '#93c5fd' }} />
              <span style={{ backgroundColor: '#1d4ed8' }} />
            </div>
            <span>Higher density (peak cell: {matrix.maxCell} accounts)</span>
          </footer>
        </section>

        <aside className="ci-viz-surface ci-inspector" aria-label="Density bucket accounts">
          <div className="ci-bucket-head">
            <div>
              <h3>{activeCellLabel ? activeCellLabel : 'Top accounts in view'}</h3>
              <p className="tabular-nums">
                {activeCellAccounts.length} {activeCellAccounts.length === 1 ? 'account' : 'accounts'}
                {activeCellLabel ? ' in selected density cell' : ' sorted by composite score'}
              </p>
            </div>
            {activeCell && (
              <button
                type="button"
                className="ci-clear-inline"
                onClick={() => setActiveCell(null)}
                aria-label="Clear selected density cell"
              >
                <X size={13} />
                Clear
              </button>
            )}
          </div>

          <div className="ci-bucket-list">
            {activeCellAccounts.slice(0, 40).map((c) => {
              const band = assessAccount(c.score);
              const pct = completenessPct(c);
              return (
                <button
                  key={c.domain}
                  type="button"
                  className={`ci-bucket-row ${c.domain === selectedDomain ? 'is-selected' : ''}`}
                  onClick={() => {
                    onSelectAccount(c.domain);
                    if (onQuickView) onQuickView(c.domain);
                    else onInspectAccount(c.domain, 'overview');
                  }}
                >
                  <div className="ci-bucket-row-main">
                    <strong>{c.name}</strong>
                    <span className="tabular-nums">
                      {c.score ? c.score.composite.toFixed(1) : '—'}
                    </span>
                  </div>
                  <div className="ci-bucket-row-sub">
                    <span>{c.industry || c.domain}</span>
                    <span className={`ci-fit-inline is-${band.band}`}>
                      {pct}% · {c.news_count} news
                    </span>
                  </div>
                </button>
              );
            })}
            {activeCellAccounts.length > 40 && (
              <p className="ci-bucket-more">
                Showing top 40 of {activeCellAccounts.length} accounts in this cohort. Switch to List view or refine filters to inspect all.
              </p>
            )}
          </div>
        </aside>
      </div>

      <div className="ci-density-bottom">
        <section className="ci-viz-surface ci-density-card" aria-label="Industry concentration">
          <div className="ci-density-card-head">
            <div>
              <h3>Industry concentration</h3>
              <p>Click an industry row to filter the active cohort.</p>
            </div>
            {selectedIndustry !== 'all' && (
              <button
                type="button"
                className="ci-clear-inline"
                onClick={() => onSelectIndustry('all')}
              >
                All industries
              </button>
            )}
          </div>
          <div className="ci-industry-bars">
            {industryStats.map((row) => {
              const avgScore = row.scored ? (row.scoreSum / row.scored).toFixed(1) : '—';
              const isSelected = selectedIndustry === row.industry;
              const isFilterable = row.industry !== 'Not established';
              return (
                <button
                  key={row.industry}
                  type="button"
                  disabled={!isFilterable}
                  aria-pressed={isSelected}
                  className={`ci-industry-row ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => {
                    if (!isFilterable) return;
                    onSelectIndustry(isSelected ? 'all' : row.industry);
                  }}
                >
                  <div className="ci-industry-row-top">
                    <span className="ci-industry-name">{row.industry}</span>
                    <span className="ci-industry-metrics tabular-nums">
                      <strong>{row.count}</strong> accounts · {row.strong} strong fit · avg {avgScore}
                    </span>
                  </div>
                  <div className="ci-industry-track">
                    <span
                      style={{
                        width: `${Math.max(4, Math.round((row.count / maxIndustryCount) * 100))}%`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="ci-viz-surface ci-density-card" aria-label="Cohort micro-tile density strip">
          <div className="ci-density-card-head">
            <div>
              <h3>Cohort tile map ({sortedTiles.length} accounts)</h3>
              <p>Every displayed account ordered by ICP fit and composite score. Hover to preview, click to open.</p>
            </div>
          </div>

          <div className="ci-tile-grid" role="list">
            {sortedTiles.map((c) => {
              const band = assessAccount(c.score).band as FitBandKey;
              const color = FIT_BANDS.find((b) => b.key === band)?.color || '#94a3b8';
              const pct = completenessPct(c);
              const opacity = Math.max(0.32, Math.min(1, 0.35 + (pct / 100) * 0.65));
              const isSelected = c.domain === selectedDomain;
              return (
                <button
                  key={c.domain}
                  type="button"
                  role="listitem"
                  className={`ci-tile ${isSelected ? 'is-selected' : ''}`}
                  style={{ backgroundColor: color, opacity }}
                  aria-label={`${c.name}: composite ${c.score ? c.score.composite.toFixed(1) : 'none'}, ${pct}% researched`}
                  title={`${c.name} (${c.domain}) · Score ${c.score ? c.score.composite.toFixed(1) : '—'} · ${pct}% researched`}
                  onMouseEnter={() => setHoveredDomain(c.domain)}
                  onFocus={() => setHoveredDomain(c.domain)}
                  onMouseLeave={() => setHoveredDomain('')}
                  onClick={() => {
                    onSelectAccount(c.domain);
                    if (onQuickView) onQuickView(c.domain);
                    else onInspectAccount(c.domain, 'overview');
                  }}
                />
              );
            })}
          </div>

          {focusedTileCompany && (
            <div className="ci-tile-readout">
              <div>
                <strong>{focusedTileCompany.name}</strong>
                <span>
                  {focusedTileCompany.domain} · {focusedTileCompany.industry || 'Industry not established'}
                </span>
              </div>
              <div className="ci-tile-readout-right tabular-nums">
                <span>
                  Composite{' '}
                  <strong>
                    {focusedTileCompany.score ? focusedTileCompany.score.composite.toFixed(1) : '—'}
                  </strong>
                </span>
                <span>
                  Fit{' '}
                  <strong>
                    {focusedTileCompany.score ? focusedTileCompany.score.fit.toFixed(1) : '—'}
                  </strong>
                </span>
                <span>
                  {focusedTileCompany.known_fields}/{focusedTileCompany.total_fields} fields
                </span>
                <button
                  type="button"
                  className="ci-tile-open"
                  onClick={() => onInspectAccount(focusedTileCompany.domain, 'overview')}
                >
                  Open
                  <ArrowUpRight size={12} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
