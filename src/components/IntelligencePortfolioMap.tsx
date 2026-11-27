import React, { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { ArrowUpRight, Crosshair } from 'lucide-react';
import { IntelligenceCompany } from '../services/api';
import { assessAccount } from '../scoring/intelligence-assessment';

type MapAxisPreset = 'fit_composite' | 'fit_coverage' | 'rank_composite';
type DetailTab = 'overview' | 'enrichment' | 'lookalikes' | 'news' | 'ads';

interface Props {
  companies: IntelligenceCompany[];
  totalAccounts: number;
  selectedDomain: string;
  onSelectAccount: (domain: string) => void;
  onInspectAccount: (domain: string, targetMode?: DetailTab) => void;
  onQuickView?: (domain: string) => void;
}

interface PlotPoint {
  domain: string;
  name: string;
  industry: string;
  headquarters: string;
  overview: string | null;
  status: string;
  rank: number;
  fit: number;
  composite: number;
  intent: number;
  coverage: number;
  completeness: number;
  knownFields: number;
  totalFields: number;
  newsCount: number;
  band: 'strong' | 'moderate' | 'limited' | 'low' | 'unknown';
  bandLabel: string;
  readiness: string;
  nextStep: string;
  x: number;
  y: number;
  z: number;
}

const BAND_COLORS: Record<PlotPoint['band'], string> = {
  strong: '#15803d',
  moderate: '#1d4ed8',
  limited: '#b45309',
  low: '#64748b',
  unknown: '#94a3b8',
};

const BAND_ORDER: Array<{ key: PlotPoint['band']; label: string }> = [
  { key: 'strong', label: 'Strong ICP fit' },
  { key: 'moderate', label: 'Moderate ICP fit' },
  { key: 'limited', label: 'Limited ICP fit' },
  { key: 'low', label: 'Low ICP fit' },
  { key: 'unknown', label: 'Not established' },
];

/** Deterministic micro-offset so accounts with identical scores remain individually clickable. */
function hashOffset(key: string, salt: number, amplitude = 0.7): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const normalized = ((h >>> 0) % 1000) / 1000; // 0..1
  return (normalized * 2 - 1) * amplitude;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function MapTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: PlotPoint }>;
}) {
  if (!active || !payload?.length || !payload[0]?.payload) return null;
  const p = payload[0].payload;
  return (
    <div
      className="bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs text-slate-700 max-w-[270px]"
      style={{ boxShadow: '0 4px 14px rgba(15, 23, 42, 0.08)' }}
    >
      <div className="font-semibold text-slate-900 text-[13px] leading-snug">{p.name}</div>
      <div className="text-slate-500 mt-0.5 truncate">
        {p.domain}
        {p.industry !== 'Not established' ? ` · ${p.industry}` : ''}
      </div>
      <div
        className="font-medium mt-1.5"
        style={{ color: BAND_COLORS[p.band] }}
      >
        {p.bandLabel}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 pt-2 border-t border-slate-100 tabular-nums">
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Composite</span>
          <span className="font-semibold text-slate-900">{p.composite.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">ICP fit</span>
          <span className="font-semibold text-slate-900">{p.fit.toFixed(1)}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Research</span>
          <span className="font-medium text-slate-800">{p.completeness}%</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">News</span>
          <span className="font-medium text-slate-800">{p.newsCount}</span>
        </div>
      </div>
      <div className="text-[11px] text-slate-400 mt-2">Click dot to inspect account</div>
    </div>
  );
}

export function IntelligencePortfolioMap({
  companies,
  totalAccounts,
  selectedDomain,
  onSelectAccount,
  onInspectAccount,
  onQuickView,
}: Props) {
  const [preset, setPreset] = useState<MapAxisPreset>('fit_composite');

  const maxRank = useMemo(
    () => Math.max(10, ...companies.map((c) => c.rank || 0), companies.length),
    [companies]
  );

  const points = useMemo<PlotPoint[]>(() => {
    return companies.map((c, idx) => {
      const assessment = assessAccount(c.score);
      const fit = c.score ? Number(c.score.fit.toFixed(1)) : 0;
      const composite = c.score ? Number(c.score.composite.toFixed(1)) : 0;
      const intent = c.score ? Number(c.score.intent.toFixed(1)) : 0;
      const coverage = c.score ? Number(c.score.coverage.toFixed(1)) : 0;
      const completeness = c.total_fields
        ? Math.round((c.known_fields / c.total_fields) * 100)
        : 0;
      const rank = c.rank || idx + 1;

      const jx = hashOffset(c.domain, 17, 0.85);
      const jy = hashOffset(c.domain, 31, 0.85);

      let x = clamp(fit + jx, 0, 100);
      let y = clamp(composite + jy, 0, 100);

      if (preset === 'fit_coverage') {
        x = clamp(fit + jx, 0, 100);
        y = clamp(completeness + jy, 0, 100);
      } else if (preset === 'rank_composite') {
        x = clamp(rank, 1, maxRank);
        y = clamp(composite + jy, 0, 100);
      }

      // Scale bubble footprint modestly by research depth + news signals
      const z = 42 + Math.min(8, c.news_count) * 14 + Math.round(completeness * 0.45);

      return {
        domain: c.domain,
        name: c.name,
        industry: c.industry || 'Not established',
        headquarters: c.headquarters || 'Not established',
        overview: c.overview,
        status: c.status,
        rank,
        fit,
        composite,
        intent,
        coverage,
        completeness,
        knownFields: c.known_fields,
        totalFields: c.total_fields,
        newsCount: c.news_count,
        band: assessment.band as PlotPoint['band'],
        bandLabel: assessment.label,
        readiness: assessment.readiness,
        nextStep: assessment.next,
        x,
        y,
        z,
      };
    });
  }, [companies, preset, maxRank]);

  const bandCounts = useMemo(() => {
    const counts: Record<PlotPoint['band'], number> = {
      strong: 0,
      moderate: 0,
      limited: 0,
      low: 0,
      unknown: 0,
    };
    for (const p of points) counts[p.band] += 1;
    return counts;
  }, [points]);

  const selectedPoint = useMemo(
    () => points.find((p) => p.domain === selectedDomain) || points[0] || null,
    [points, selectedDomain]
  );

  const axisMeta = useMemo(() => {
    if (preset === 'fit_coverage') {
      return {
        title: 'Account landscape — ICP fit vs. research coverage',
        subtitle: 'Identify high-fit accounts with thin profile data or fully researched priority accounts.',
        xLabel: 'ICP fit score',
        yLabel: 'Research coverage (%)',
        xDomain: [0, 100] as [number, number],
        yDomain: [0, 100] as [number, number],
        xRefPrimary: 80,
        xRefSecondary: 60,
        yRef: 60,
        yRefLabel: '60% researched',
      };
    }
    if (preset === 'rank_composite') {
      return {
        title: 'Account landscape — portfolio rank vs. composite score',
        subtitle: 'Compare cohort rank order against Dual Motion composite score across filtered accounts.',
        xLabel: 'Portfolio rank',
        yLabel: 'Composite score',
        xDomain: [1, maxRank] as [number, number],
        yDomain: [0, 100] as [number, number],
        xRefPrimary: null,
        xRefSecondary: null,
        yRef: 50,
        yRefLabel: 'Score 50',
      };
    }
    return {
      title: 'Account landscape — ICP fit vs. composite score',
      subtitle: 'Bubble size reflects research completeness and dated news coverage. Click any account to inspect.',
      xLabel: 'ICP fit score',
      yLabel: 'Composite score',
      xDomain: [0, 100] as [number, number],
      yDomain: [0, 100] as [number, number],
      xRefPrimary: 80,
      xRefSecondary: 60,
      yRef: 50,
      yRefLabel: 'Score 50',
    };
  }, [preset, maxRank]);

  if (!companies.length) {
    return (
      <div className="ci-viz-surface ci-state">
        <h3>No accounts to map</h3>
        <p>Adjust your search, research status, industry, or ICP fit criteria to plot accounts on the landscape map.</p>
      </div>
    );
  }

  return (
    <div className="ci-viz-grid">
      <section className="ci-viz-surface ci-map-canvas" aria-label="Account portfolio scatter map">
        <header className="ci-viz-header">
          <div>
            <h2>{axisMeta.title}</h2>
            <p>{axisMeta.subtitle}</p>
          </div>
          <div className="ci-segmented" role="group" aria-label="Map axes">
            {(
              [
                ['fit_composite', 'Fit vs. score'],
                ['fit_coverage', 'Fit vs. coverage'],
                ['rank_composite', 'Rank vs. score'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={preset === id}
                className={preset === id ? 'is-active' : ''}
                onClick={() => setPreset(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="ci-map-chart-wrap">
          <ResponsiveContainer width="100%" height={420}>
            <ScatterChart margin={{ top: 18, right: 24, bottom: 26, left: 6 }}>
              <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name={axisMeta.xLabel}
                domain={axisMeta.xDomain}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={{ stroke: '#cbd5e1' }}
                axisLine={{ stroke: '#cbd5e1' }}
                label={{
                  value: axisMeta.xLabel,
                  position: 'insideBottom',
                  offset: -14,
                  fill: '#475569',
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={axisMeta.yLabel}
                domain={axisMeta.yDomain}
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={{ stroke: '#cbd5e1' }}
                axisLine={{ stroke: '#cbd5e1' }}
                width={46}
                label={{
                  value: axisMeta.yLabel,
                  angle: -90,
                  position: 'insideLeft',
                  offset: 12,
                  style: { textAnchor: 'middle', fill: '#475569', fontSize: 12 },
                }}
              />
              <ZAxis type="number" dataKey="z" range={[36, 170]} />
              {axisMeta.xRefSecondary !== null && (
                <ReferenceLine
                  x={axisMeta.xRefSecondary}
                  stroke="#94a3b8"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Moderate fit (60)',
                    position: 'insideTopRight',
                    fill: '#64748b',
                    fontSize: 11,
                  }}
                />
              )}
              {axisMeta.xRefPrimary !== null && (
                <ReferenceLine
                  x={axisMeta.xRefPrimary}
                  stroke="#15803d"
                  strokeDasharray="4 4"
                  strokeOpacity={0.55}
                  label={{
                    value: 'Strong fit (80)',
                    position: 'insideTopRight',
                    fill: '#15803d',
                    fontSize: 11,
                  }}
                />
              )}
              <ReferenceLine
                y={axisMeta.yRef}
                stroke="#cbd5e1"
                strokeDasharray="4 4"
                label={{
                  value: axisMeta.yRefLabel,
                  position: 'insideTopLeft',
                  fill: '#64748b',
                  fontSize: 11,
                }}
              />
              <Tooltip
                cursor={{ stroke: '#94a3b8', strokeDasharray: '3 3' }}
                content={<MapTooltip />}
              />
              <Scatter
                name="Accounts"
                data={points}
                isAnimationActive={false}
                onClick={(entry) => {
                  const target = (entry as { payload?: PlotPoint })?.payload || (entry as unknown as PlotPoint);
                  if (target?.domain) onSelectAccount(target.domain);
                }}
                style={{ cursor: 'pointer' }}
              >
                {points.map((point) => {
                  const isSelected = selectedPoint?.domain === point.domain;
                  return (
                    <Cell
                      key={point.domain}
                      fill={BAND_COLORS[point.band]}
                      fillOpacity={isSelected ? 0.96 : 0.72}
                      stroke={isSelected ? '#0f172a' : '#ffffff'}
                      strokeWidth={isSelected ? 2.5 : 1.25}
                    />
                  );
                })}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <footer className="ci-viz-legend" aria-label="Fit band distribution">
          {BAND_ORDER.map(({ key, label }) => (
            <span key={key} className="ci-legend-item">
              <span
                className="ci-legend-swatch"
                style={{ backgroundColor: BAND_COLORS[key] }}
                aria-hidden="true"
              />
              <span>{label}</span>
              <strong>{bandCounts[key]}</strong>
            </span>
          ))}
          <span className="ci-legend-meta">
            Plotting {points.length} of {totalAccounts} accounts
          </span>
        </footer>
      </section>

      <aside className="ci-viz-surface ci-inspector" aria-label="Selected account details">
        {selectedPoint ? (
          <>
            <div className="ci-inspector-head">
              <div>
                <span className="ci-inspector-kicker">
                  <Crosshair size={13} aria-hidden="true" />
                  Selected account · Rank #{selectedPoint.rank}
                </span>
                <h3>{selectedPoint.name}</h3>
                <a
                  href={`https://${selectedPoint.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ci-inspector-domain"
                >
                  {selectedPoint.domain}
                  <ArrowUpRight size={12} />
                </a>
              </div>
            </div>

            <div
              className={`ci-fit-label is-${selectedPoint.band}`}
              style={{ marginTop: 10 }}
            >
              {selectedPoint.bandLabel} · {selectedPoint.readiness}
            </div>

            <div className="ci-inspector-metrics">
              <div>
                <span>Composite</span>
                <strong>{selectedPoint.composite.toFixed(1)}</strong>
              </div>
              <div>
                <span>ICP fit</span>
                <strong>{selectedPoint.fit.toFixed(1)}</strong>
              </div>
              <div>
                <span>Research</span>
                <strong>{selectedPoint.completeness}%</strong>
              </div>
              <div>
                <span>Articles</span>
                <strong>{selectedPoint.newsCount}</strong>
              </div>
            </div>

            <dl className="ci-inspector-facts">
              <div>
                <dt>Industry</dt>
                <dd>{selectedPoint.industry}</dd>
              </div>
              <div>
                <dt>Headquarters</dt>
                <dd>{selectedPoint.headquarters}</dd>
              </div>
              <div>
                <dt>Fields collected</dt>
                <dd className="tabular-nums">
                  {selectedPoint.knownFields} / {selectedPoint.totalFields} researched fields
                </dd>
              </div>
              <div>
                <dt>Recommended next</dt>
                <dd>{selectedPoint.nextStep}</dd>
              </div>
            </dl>

            {selectedPoint.overview && (
              <p className="ci-inspector-overview">{selectedPoint.overview}</p>
            )}

            <div className="ci-inspector-actions">
              {onQuickView && (
                <button
                  type="button"
                  className="ci-button ci-primary"
                  onClick={() => onQuickView(selectedPoint.domain)}
                >
                  Quick view summary
                </button>
              )}
              <button
                type="button"
                className={onQuickView ? 'ci-button' : 'ci-button ci-primary'}
                onClick={() => onInspectAccount(selectedPoint.domain, 'overview')}
              >
                Open full account view
                <ArrowUpRight size={14} />
              </button>
              <div className="ci-inspector-links">
                <button
                  type="button"
                  onClick={() => onInspectAccount(selectedPoint.domain, 'enrichment')}
                >
                  Profile &amp; scores
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => onInspectAccount(selectedPoint.domain, 'lookalikes')}
                >
                  Peers
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => onInspectAccount(selectedPoint.domain, 'news')}
                >
                  News ({selectedPoint.newsCount})
                </button>
                <span aria-hidden="true">·</span>
                <button
                  type="button"
                  onClick={() => onInspectAccount(selectedPoint.domain, 'ads')}
                >
                  Ad creatives
                </button>
              </div>
            </div>
          </>
        ) : (
          <p className="ci-state">Click any point on the map to inspect an account.</p>
        )}
      </aside>
    </div>
  );
}
