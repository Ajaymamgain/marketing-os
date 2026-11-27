import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  PanelRightOpen,
  X,
} from 'lucide-react';
import {
  fetchIntelligenceNews,
  IntelligenceArticle,
  IntelligenceCompany,
  IntelligenceDetail,
} from '../services/api';
import { AccountDemandUnit, TelemetrySignal } from '../types';
import { assessAccount } from '../scoring/intelligence-assessment';

type DetailTab = 'overview' | 'enrichment' | 'lookalikes' | 'news' | 'ads';

interface Props {
  company: IntelligenceCompany;
  detail: IntelligenceDetail | null;
  detailLoading: boolean;
  signals: TelemetrySignal[];
  matchedAccount: AccountDemandUnit | null;
  position: number; // 0-indexed within current filtered cohort
  totalInCohort: number;
  onStep: (delta: -1 | 1) => void;
  onClose: () => void;
  onOpenFullView: (domain: string, targetMode?: DetailTab) => void;
  onOpenFullDrawer?: (account: AccountDemandUnit) => void;
}

const newsCache = new Map<string, IntelligenceArticle[]>();

function normalizeKey(value?: string | null): string {
  return (value || '')
    .toLowerCase()
    .replace(/\b(inc|corp|corporation|llc|ltd|limited|co|company|plc|gmbh)\b\.?/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function formatDate(value?: string | null): string {
  if (!value) return 'Recent';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(parsed));
}

function severityMeta(severity: TelemetrySignal['severity']): {
  label: string;
  className: string;
} {
  switch (severity) {
    case 'CRITICAL':
      return { label: 'Critical', className: 'is-critical' };
    case 'SURGE':
      return { label: 'Surge', className: 'is-surge' };
    case 'WARNING':
      return { label: 'Warning', className: 'is-surge' };
    case 'ELEVATED':
      return { label: 'Elevated', className: 'is-elevated' };
    default:
      return { label: 'Nominal', className: 'is-nominal' };
  }
}

export function AccountQuickViewModal({
  company,
  detail,
  detailLoading,
  signals,
  matchedAccount,
  position,
  totalInCohort,
  onStep,
  onClose,
  onOpenFullView,
  onOpenFullDrawer,
}: Props) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [recentNews, setRecentNews] = useState<IntelligenceArticle[] | null>(
    () => newsCache.get(company.domain) ?? null
  );
  const [newsLoading, setNewsLoading] = useState(false);

  // Focus management & keyboard navigation (Esc, Left/Right arrows)
  useEffect(() => {
    closeBtnRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft' && position > 0) {
        e.preventDefault();
        onStep(-1);
      } else if (e.key === 'ArrowRight' && position < totalInCohort - 1) {
        e.preventDefault();
        onStep(1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, onStep, position, totalInCohort]);

  // Match real telemetry signals for this account (last 3 newest)
  const accountSignals = useMemo(() => {
    const normName = normalizeKey(company.name);
    const domainRoot = company.domain.toLowerCase().replace(/^www\./, '').split('.')[0] || '';
    const matchedId = matchedAccount?.id;
    const matchedNormName = normalizeKey(matchedAccount?.accountName);

    const matched = signals.filter((s) => {
      if (matchedId && s.accountId === matchedId) return true;
      const sigName = normalizeKey(s.accountName);
      if (sigName && normName && (sigName === normName || sigName === matchedNormName)) {
        return true;
      }
      if (
        domainRoot.length >= 4 &&
        (sigName.includes(domainRoot) || s.accountId.toLowerCase().includes(domainRoot))
      ) {
        return true;
      }
      return false;
    });

    const sorted = [...matched].sort((a, b) => {
      const ta = Date.parse(a.timestamp);
      const tb = Date.parse(b.timestamp);
      if (!Number.isNaN(ta) && !Number.isNaN(tb)) return tb - ta;
      return 0;
    });

    if (sorted.length > 0) {
      return sorted.slice(0, 3);
    }

    // Fallback to recentSignals on matchedAccount if no standalone TelemetrySignal rows matched
    if (matchedAccount?.recentSignals?.length) {
      return matchedAccount.recentSignals.slice(0, 3).map((text, index): TelemetrySignal => ({
        id: `${matchedAccount.id}-recent-${index}`,
        accountId: matchedAccount.id,
        accountName: matchedAccount.accountName,
        timestamp: matchedAccount.lastTelemetryPing || 'Recent',
        category: 'INTENT',
        title: text,
        detail: `Recorded on ${matchedAccount.solutionTarget || matchedAccount.accountName}`,
        severity: index === 0 ? 'ELEVATED' : 'NOMINAL',
        scoreImpact: 0,
        motion: matchedAccount.primaryMotion || 'DUAL',
        resolved: false,
        sourceFeed: 'Account telemetry',
      }));
    }

    return [];
  }, [company.domain, company.name, matchedAccount, signals]);

  // Load up to 3 dated news developments as context when no first-party telemetry signals exist
  useEffect(() => {
    if (accountSignals.length > 0) {
      setNewsLoading(false);
      return;
    }
    const cached = newsCache.get(company.domain);
    if (cached) {
      setRecentNews(cached);
      setNewsLoading(false);
      return;
    }
    let live = true;
    setRecentNews(null);
    setNewsLoading(true);
    fetchIntelligenceNews({ domain: company.domain, days: '180', limit: '3' })
      .then((res) => {
        const articles = res.articles.slice(0, 3);
        newsCache.set(company.domain, articles);
        if (live) setRecentNews(articles);
      })
      .catch(() => {
        if (live) setRecentNews([]);
      })
      .finally(() => {
        if (live) setNewsLoading(false);
      });
    return () => {
      live = false;
    };
  }, [accountSignals.length, company.domain]);

  const fields = detail?.detailed_profile?.profile.fields;
  const score = detail?.score || company.score;
  const assessment = assessAccount(score);
  const completeness = company.total_fields
    ? Math.round((company.known_fields / company.total_fields) * 100)
    : 0;

  const industryValue =
    fields?.industry?.value ||
    company.industry ||
    matchedAccount?.industry ||
    'Not established';
  const hqValue =
    fields?.headquarters?.value || company.headquarters || 'Not established';
  const employeeValue =
    fields?.employee_count?.value ||
    (score?.inputs.headcount.value != null
      ? score.inputs.headcount.value.toLocaleString()
      : null) ||
    (matchedAccount?.employeeCount
      ? matchedAccount.employeeCount.toLocaleString()
      : null) ||
    'Not established';
  const foundedValue = fields?.founded?.value || 'Not established';
  const statusValue =
    fields?.company_status?.value ||
    (company.status === 'complete' ? 'Researched' : 'Research processing');
  const fundingValue =
    fields?.funding?.value || matchedAccount?.tier || 'Not established';
  const overviewText =
    fields?.business_description?.value ||
    company.overview ||
    detail?.quote ||
    null;

  return (
    <div
      className="ci-qv-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="ci-qv-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ci-qv-title"
      >
        <header className="ci-qv-header">
          <div className="ci-qv-head-left">
            <div className="ci-qv-kicker tabular-nums">
              <span>Quick view</span>
              <span aria-hidden="true">·</span>
              <span>
                {position + 1} of {totalInCohort}
              </span>
              {company.rank > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Rank #{company.rank}</span>
                </>
              )}
            </div>
            <div className="ci-qv-title-row">
              <h2 id="ci-qv-title">{company.name}</h2>
              <a
                href={`https://${company.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ci-qv-domain"
              >
                {company.domain}
                <ArrowUpRight size={13} aria-hidden="true" />
              </a>
            </div>
            <div className={`ci-fit-label is-${assessment.band}`}>
              {assessment.label} · {assessment.readiness}
            </div>
          </div>

          <div className="ci-qv-head-controls">
            <div className="ci-qv-stepper" role="group" aria-label="Navigate accounts">
              <button
                type="button"
                className="ci-qv-icon-btn"
                aria-label="Previous account"
                disabled={position <= 0}
                onClick={() => onStep(-1)}
                title="Previous account (←)"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                className="ci-qv-icon-btn"
                aria-label="Next account"
                disabled={position >= totalInCohort - 1}
                onClick={() => onStep(1)}
                title="Next account (→)"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              className="ci-qv-icon-btn"
              aria-label="Close quick view"
              onClick={onClose}
              title="Close (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="ci-qv-body">
          <section className="ci-qv-scores" aria-label="Account score summary">
            <div>
              <span>Composite</span>
              <strong className="tabular-nums">
                {score ? score.composite.toFixed(1) : '—'}
                <small>/100</small>
              </strong>
            </div>
            <div>
              <span>ICP fit</span>
              <strong className="tabular-nums">
                {score ? score.fit.toFixed(1) : '—'}
              </strong>
            </div>
            <div>
              <span>Intent</span>
              <strong className="tabular-nums">
                {score ? score.intent.toFixed(1) : '—'}
              </strong>
            </div>
            <div>
              <span>Coverage</span>
              <strong className="tabular-nums">
                {score ? score.coverage.toFixed(1) : '—'}
              </strong>
            </div>
            <div>
              <span>Research</span>
              <strong className="tabular-nums">
                {completeness}%
                <small>
                  {' '}
                  ({company.known_fields}/{company.total_fields})
                </small>
              </strong>
            </div>
          </section>

          <section className="ci-qv-section" aria-label="Firmographic summary">
            <div className="ci-qv-section-head">
              <h3>Firmographic summary</h3>
              {detailLoading && (
                <span className="ci-qv-subtle">Enriching fields…</span>
              )}
            </div>
            {overviewText && <p className="ci-qv-overview">{overviewText}</p>}
            <dl className="ci-qv-firmo-grid">
              <div>
                <dt>Industry</dt>
                <dd>{industryValue}</dd>
              </div>
              <div>
                <dt>Headquarters</dt>
                <dd>{hqValue}</dd>
              </div>
              <div>
                <dt>Employees</dt>
                <dd className="tabular-nums">{employeeValue}</dd>
              </div>
              <div>
                <dt>Founded</dt>
                <dd className="tabular-nums">{foundedValue}</dd>
              </div>
              <div>
                <dt>Company status</dt>
                <dd>{statusValue}</dd>
              </div>
              <div>
                <dt>Funding / tier</dt>
                <dd>{fundingValue}</dd>
              </div>
            </dl>
          </section>

          <section className="ci-qv-section" aria-label="Last 3 telemetry signals">
            <div className="ci-qv-section-head">
              <h3>
                <Activity size={14} aria-hidden="true" />
                Last 3 telemetry signals
              </h3>
              <span className="ci-qv-subtle tabular-nums">
                {accountSignals.length > 0
                  ? `${accountSignals.length} recent ${
                      accountSignals.length === 1 ? 'signal' : 'signals'
                    }`
                  : '0 recorded'}
              </span>
            </div>

            {accountSignals.length > 0 ? (
              <ul className="ci-qv-signal-list">
                {accountSignals.map((sig) => {
                  const sev = severityMeta(sig.severity);
                  return (
                    <li key={sig.id} className="ci-qv-signal-item">
                      <div className="ci-qv-signal-main">
                        <strong>{sig.title}</strong>
                        {sig.detail && <p>{sig.detail}</p>}
                        <div className="ci-qv-signal-meta">
                          <span>{sig.category}</span>
                          <span aria-hidden="true">·</span>
                          <span>{sig.motion}</span>
                          {sig.sourceFeed && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>{sig.sourceFeed}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {formatDate(sig.timestamp)}
                          </span>
                        </div>
                      </div>
                      <div className="ci-qv-signal-right tabular-nums">
                        <span className={`ci-qv-severity ${sev.className}`}>
                          {sev.label}
                        </span>
                        {sig.scoreImpact !== 0 && (
                          <span className="ci-qv-impact">
                            {sig.scoreImpact > 0 ? '+' : ''}
                            {sig.scoreImpact} pts
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="ci-qv-no-signals">
                <p>
                  No first-party telemetry signals are recorded for {company.name}{' '}
                  yet. Connect product or marketing engagement feeds to stream
                  account telemetry here.
                </p>
                {newsLoading ? (
                  <span className="ci-qv-subtle">
                    Checking recent market developments…
                  </span>
                ) : recentNews && recentNews.length > 0 ? (
                  <div className="ci-qv-news-fallback">
                    <span className="ci-qv-news-label">
                      Latest market developments ({recentNews.length})
                    </span>
                    <ul>
                      {recentNews.map((article) => (
                        <li key={article.url}>
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {article.title}
                            <ArrowUpRight size={12} aria-hidden="true" />
                          </a>
                          <span className="tabular-nums">
                            {article.publisher} · {formatDate(article.published_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>

        <footer className="ci-qv-footer">
          <div className="ci-qv-quick-links">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullView(company.domain, 'enrichment');
              }}
            >
              Profile &amp; scores
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullView(company.domain, 'lookalikes');
              }}
            >
              Lookalikes
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullView(company.domain, 'news');
              }}
            >
              News ({company.news_count})
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenFullView(company.domain, 'ads');
              }}
            >
              Ad creatives
            </button>
          </div>
          <div className="ci-qv-footer-actions">
            {matchedAccount && onOpenFullDrawer && (
              <button
                type="button"
                className="ci-button"
                onClick={() => {
                  onClose();
                  onOpenFullDrawer(matchedAccount);
                }}
              >
                <PanelRightOpen size={14} aria-hidden="true" />
                Full drawer
              </button>
            )}
            <button
              type="button"
              className="ci-button ci-primary"
              onClick={() => {
                onClose();
                onOpenFullView(company.domain, 'overview');
              }}
            >
              Open full view
              <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
