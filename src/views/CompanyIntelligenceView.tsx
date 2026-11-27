import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Map as MapIcon,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import {
  CompanyResearchFact,
  fetchIntelligence,
  fetchIntelligenceDetail,
  fetchIntelligenceNews,
  IntelligenceDetail,
  IntelligenceNews,
  IntelligencePortfolio,
} from '../services/api';
import './company-intelligence.css';
import { AdIntelligencePanel } from './AdIntelligencePanel';
import { AccountIntelligenceSummary } from './AccountIntelligenceSummary';
import { assessAccount } from '../scoring/intelligence-assessment';
import { IntelligencePortfolioMap } from '../components/IntelligencePortfolioMap';
import { IntelligenceDensityView } from '../components/IntelligenceDensityView';
import { AccountQuickViewModal } from '../components/AccountQuickViewModal';
import { AccountDemandUnit, TelemetrySignal } from '../types';

type Mode = 'overview' | 'enrichment' | 'lookalikes' | 'news' | 'ads';
type PortfolioView = 'list' | 'map' | 'density';

interface CompanyIntelligenceViewProps {
  signals?: TelemetrySignal[];
  accounts?: AccountDemandUnit[];
  onOpenFullDrawer?: (account: AccountDemandUnit) => void;
}

const LIST_PAGE_SIZE = 25;

const labels: Record<string, string> = {
  business_description: 'Company overview',
  industry: 'Industry',
  headquarters: 'Headquarters',
  founded: 'Founded',
  company_status: 'Company status',
  employee_count: 'Employees',
  products: 'Products & offerings',
  target_customers: 'Target customers',
  leadership: 'Founders & leadership',
  funding: 'Funding & latest round',
  investors: 'Investors',
  pricing: 'Public pricing',
  competitors: 'Reported competitive context',
  partnerships: 'Partnerships',
  market_position: 'Market position',
};

const displayDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('en', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      }).format(new Date(value))
    : 'Not recorded';

function sources(fact?: CompanyResearchFact) {
  return (
    <div className="ci-sources">
      {fact?.source_urls.map((url, i) => (
        <a key={url} href={url} target="_blank" rel="noopener noreferrer">
          {new URL(url).hostname.replace(/^www\./, '')}
          {fact.source_urls.length > 1 ? ` · ${i + 1}` : ''}
          <ArrowUpRight size={12} />
        </a>
      ))}
    </div>
  );
}

function Fact({ name, fact }: { name: string; fact?: CompanyResearchFact }) {
  return (
    <section className="ci-fact">
      <h3>{name}</h3>
      <p className={!fact?.value ? 'ci-muted' : ''}>
        {fact?.value || 'Not established by this research.'}
      </p>
      {sources(fact)}
      {fact?.as_of && <small>Evidence as of {displayDate(fact.as_of)}</small>}
    </section>
  );
}

function download(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const cell = (v: unknown) => {
    let s = String(v ?? '');
    if (/^[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const csv = [
    keys.map(cell).join(','),
    ...rows.map((r) => keys.map((k) => cell(r[k])).join(',')),
  ].join('\r\n');
  const u = URL.createObjectURL(
    new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' })
  );
  const a = document.createElement('a');
  a.href = u;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(u);
}

export function CompanyIntelligenceView({
  signals = [],
  accounts = [],
  onOpenFullDrawer,
}: CompanyIntelligenceViewProps = {}) {
  const [data, setData] = useState<IntelligencePortfolio | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<Mode>(() =>
    new URLSearchParams(window.location.search).get('intelligence_view') === 'ads'
      ? 'ads'
      : 'overview'
  );
  const [portfolioView, setPortfolioView] = useState<PortfolioView>(() => {
    const param = new URLSearchParams(window.location.search).get('layout');
    return param === 'map' || param === 'density' ? param : 'list';
  });

  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [attractiveness, setAttractiveness] = useState('all');
  const [industry, setIndustry] = useState('all');
  const [sort, setSort] = useState('name');
  const [listPage, setListPage] = useState(0);

  const [selected, setSelected] = useState(
    () => new URLSearchParams(window.location.search).get('account') || ''
  );
  const [quickViewDomain, setQuickViewDomain] = useState<string | null>(null);
  const [detail, setDetail] = useState<IntelligenceDetail | null>(null);
  const [detailError, setDetailError] = useState('');
  const [detailLoading, setDetailLoading] = useState(false);

  const [news, setNews] = useState<IntelligenceNews | null>(null);
  const [newsError, setNewsError] = useState('');
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsCompany, setNewsCompany] = useState('');
  const [days, setDays] = useState('180');
  const [offset, setOffset] = useState(0);
  const [refresh, setRefresh] = useState(0);

  const [peer, setPeer] = useState<IntelligenceDetail | null>(null);
  const [peerDomain, setPeerDomain] = useState('');
  const [peerError, setPeerError] = useState('');

  const detailCacheRef = useRef<Map<string, IntelligenceDetail>>(new Map());

  useEffect(() => {
    const url = new URL(window.location.href);
    if (mode === 'ads') url.searchParams.set('intelligence_view', 'ads');
    else url.searchParams.delete('intelligence_view');
    if (portfolioView !== 'list') url.searchParams.set('layout', portfolioView);
    else url.searchParams.delete('layout');
    if (selected) url.searchParams.set('account', selected);
    else url.searchParams.delete('account');
    window.history.replaceState(window.history.state, '', url);
  }, [mode, portfolioView, selected]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    detailCacheRef.current.clear();
    fetchIntelligence()
      .then((v) => {
        if (live) {
          setData(v);
          setError('');
        }
      })
      .catch(() => {
        if (live)
          setError(
            'Company intelligence could not load. Your saved research remains available.'
          );
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [refresh]);

  const industries = useMemo(() => {
    const set = new Set<string>();
    for (const c of data?.companies || []) {
      const value = c.industry?.trim();
      if (value) set.add(value);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const companies = useMemo(() => {
    const q = mode === 'news' ? '' : query.toLowerCase().trim();
    return (data?.companies || [])
      .filter(
        (c) =>
          (status === 'all' ||
            (status === 'complete' ? c.status === 'complete' : c.status !== 'complete')) &&
          (industry === 'all' || (c.industry?.trim() || '') === industry) &&
          (!q ||
            [c.name, c.domain, c.industry, c.headquarters, c.overview].some((v) =>
              v?.toLowerCase().includes(q)
            ))
      )
      .filter(
        (c) =>
          attractiveness === 'all' || assessAccount(c.score).band === attractiveness
      )
      .sort((a, b) => {
        if (sort === 'fit') return (b.score?.fit ?? -1) - (a.score?.fit ?? -1);
        if (sort === 'score')
          return (b.score?.composite ?? -1) - (a.score?.composite ?? -1);
        if (sort === 'coverage') {
          const ca = a.total_fields ? a.known_fields / a.total_fields : 0;
          const cb = b.total_fields ? b.known_fields / b.total_fields : 0;
          return cb - ca || a.name.localeCompare(b.name);
        }
        if (sort === 'news')
          return b.news_count - a.news_count || a.name.localeCompare(b.name);
        return a.name.localeCompare(b.name);
      });
  }, [data, query, status, industry, attractiveness, sort, mode]);

  const totalAccounts = useMemo(() => {
    if (!data) return 0;
    return Math.max(
      data.total || 0,
      data.summary?.accounts || 0,
      data.companies.length
    );
  }, [data]);

  const hasActiveFilters =
    Boolean(query.trim()) ||
    status !== 'all' ||
    attractiveness !== 'all' ||
    industry !== 'all';

  const resetFilters = () => {
    setQuery('');
    setStatus('all');
    setAttractiveness('all');
    setIndustry('all');
    setOffset(0);
    setListPage(0);
  };

  useEffect(() => {
    if (!data) return;
    if (!companies.some((c) => c.domain === selected)) {
      setSelected(companies[0]?.domain || '');
    }
  }, [companies, selected, data]);

  // Keep paginated List view synced to the currently selected account
  const totalListPages = Math.max(1, Math.ceil(companies.length / LIST_PAGE_SIZE));
  useEffect(() => {
    if (!selected) {
      setListPage(0);
      return;
    }
    const idx = companies.findIndex((c) => c.domain === selected);
    if (idx >= 0) {
      const targetPage = Math.floor(idx / LIST_PAGE_SIZE);
      setListPage((prev) => (prev === targetPage ? prev : targetPage));
    } else {
      setListPage(0);
    }
  }, [selected, companies]);

  const clampedPage = Math.min(listPage, totalListPages - 1);
  const pagedCompanies = useMemo(
    () =>
      companies.slice(
        clampedPage * LIST_PAGE_SIZE,
        (clampedPage + 1) * LIST_PAGE_SIZE
      ),
    [companies, clampedPage]
  );

  useEffect(() => {
    let live = true;
    setDetailError('');
    setPeer(null);
    setPeerDomain('');
    if (!selected) {
      setDetail(null);
      return;
    }
    const cached = detailCacheRef.current.get(selected);
    if (cached) {
      setDetail(cached);
      setDetailLoading(false);
      return;
    }
    setDetail(null);
    setDetailLoading(true);
    fetchIntelligenceDetail(selected)
      .then((v) => {
        detailCacheRef.current.set(selected, v);
        if (live) setDetail(v);
      })
      .catch(() => {
        if (live)
          setDetailError('This company’s research could not load. Try refreshing.');
      })
      .finally(() => {
        if (live) setDetailLoading(false);
      });
    return () => {
      live = false;
    };
  }, [selected, refresh]);

  useEffect(() => {
    let live = true;
    setPeer(null);
    setPeerError('');
    if (!peerDomain) return;
    fetchIntelligenceDetail(peerDomain)
      .then((v) => {
        if (live) setPeer(v);
      })
      .catch(() => {
        if (live) setPeerError('The comparison profile could not load.');
      });
    return () => {
      live = false;
    };
  }, [peerDomain]);

  useEffect(() => {
    if (mode !== 'news') return;
    let live = true;
    setNewsLoading(true);
    setNewsError('');
    const timer = window.setTimeout(() => {
      fetchIntelligenceNews({
        domain: newsCompany,
        q: query,
        days,
        offset: String(offset),
        limit: '20',
      })
        .then((v) => {
          if (live) setNews(v);
        })
        .catch(() => {
          if (live) setNewsError('News could not load. Try refreshing.');
        })
        .finally(() => {
          if (live) setNewsLoading(false);
        });
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [mode, newsCompany, query, days, offset, refresh]);

  const company = data?.companies.find((c) => c.domain === selected);
  const research = detail?.detailed_profile;
  const fields = research?.profile.fields;

  const openQuickView = (domain: string) => {
    setSelected(domain);
    setQuickViewDomain(domain);
  };

  const quickViewIndex = useMemo(() => {
    if (!quickViewDomain) return -1;
    return companies.findIndex((c) => c.domain === quickViewDomain);
  }, [companies, quickViewDomain]);

  const quickViewCompany =
    quickViewIndex >= 0 ? companies[quickViewIndex] : null;

  const matchedQuickViewAccount = useMemo(() => {
    if (!quickViewCompany || !accounts.length) return null;
    const targetDomain = quickViewCompany.domain.toLowerCase().replace(/^www\./, '');
    const targetName = quickViewCompany.name.toLowerCase().trim();
    return (
      accounts.find(
        (acc) => acc.domain?.toLowerCase().replace(/^www\./, '') === targetDomain
      ) ||
      accounts.find((acc) => acc.accountName?.toLowerCase().trim() === targetName) ||
      null
    );
  }, [accounts, quickViewCompany]);

  const handleStepQuickView = (delta: -1 | 1) => {
    if (quickViewIndex < 0) return;
    const next = companies[quickViewIndex + delta];
    if (next) {
      setSelected(next.domain);
      setQuickViewDomain(next.domain);
    }
  };

  const handleInspectAccount = (domain: string, targetMode: Mode = 'overview') => {
    setSelected(domain);
    setQuickViewDomain(null);
    setMode(targetMode);
    if (targetMode === 'news') {
      setNewsCompany(domain);
      setOffset(0);
    } else {
      setPortfolioView('list');
    }
  };

  const handlePortfolioViewChange = (nextView: PortfolioView) => {
    setPortfolioView(nextView);
    if (mode === 'news' && nextView !== 'list') {
      setMode('overview');
    }
  };

  const exportView = () => {
    if (mode === 'news') {
      download(
        'company-news-page.csv',
        (news?.articles || []).map((a) => ({
          company: a.company_name,
          title: a.title,
          published_at: a.published_at,
          event_date: a.event_date,
          publisher: a.publisher,
          summary: a.summary,
          source_url: a.url,
        }))
      );
    } else if (portfolioView !== 'list') {
      download(
        'filtered-accounts-intelligence.csv',
        companies.map((c) => ({
          rank: c.rank,
          name: c.name,
          domain: c.domain,
          industry: c.industry || '',
          headquarters: c.headquarters || '',
          fit_band: assessAccount(c.score).label,
          composite_score: c.score ? c.score.composite.toFixed(1) : '',
          fit_score: c.score ? c.score.fit.toFixed(1) : '',
          known_fields: c.known_fields,
          total_fields: c.total_fields,
          news_count: c.news_count,
          status: c.status,
        }))
      );
    } else if (mode === 'lookalikes') {
      download(
        'lookalike-peers.csv',
        (detail?.lookalikes || []).map((p) => ({
          account: company?.name,
          peer: p.name,
          domain: p.domain,
          similarity: p.similarity,
          method: p.method,
        }))
      );
    } else if (fields) {
      download(
        'company-profile.csv',
        Object.entries(fields).map(([key, fact]) => ({
          company: company?.name,
          field: labels[key] || key,
          value: fact.value,
          as_of: fact.as_of,
          sources: fact.source_urls.join(' | '),
          status: 'Research candidate',
        }))
      );
    }
  };

  const exportDisabled =
    mode === 'news'
      ? !news?.articles.length
      : portfolioView !== 'list'
      ? !companies.length
      : mode === 'lookalikes'
      ? !detail?.lookalikes?.length
      : !fields;

  const exportLabel =
    mode === 'news'
      ? 'Export news page'
      : portfolioView !== 'list'
      ? `Export cohort (${companies.length})`
      : mode === 'lookalikes'
      ? 'Export peers'
      : 'Export profile';

  const displayedPct =
    totalAccounts > 0 ? Math.round((companies.length / totalAccounts) * 100) : 0;

  return (
    <div className="ci-root">
      <div className="ci-title">
        <div>
          <h1>Account &amp; ad intelligence</h1>
          <p>
            Company research, scores, market developments and creative evidence
            together.
          </p>
        </div>
        <div className="ci-actions">
          <button
            className="ci-button"
            onClick={() => setRefresh((n) => n + 1)}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
          {mode !== 'ads' && (
            <button
              className="ci-button ci-primary"
              onClick={exportView}
              disabled={exportDisabled}
            >
              <ArrowDownToLine size={15} />
              {exportLabel}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="ci-error">
          {error}
          <button onClick={() => setRefresh((n) => n + 1)}>Try again</button>
        </div>
      )}

      <div className="ci-summary" aria-label="Research coverage">
        <span>
          <strong>{data?.summary.accounts ?? '—'}</strong> accounts
        </span>
        <span>
          <strong>{data?.summary.complete ?? '—'}</strong> researched profiles
        </span>
        <span>
          <strong>{data?.summary.news ?? '—'}</strong> dated articles
        </span>
        <span>
          <strong>
            {data?.companies.filter((c) => assessAccount(c.score).band === 'strong')
              .length ?? '—'}
          </strong>{' '}
          strong-fit accounts
        </span>
        <span className="ci-review">Research-based · provisional scores</span>
      </div>

      <div
        className="ci-tabs"
        role="tablist"
        aria-label="Intelligence views"
        onKeyDown={(e) => {
          const tabs = Array.from(
            e.currentTarget.querySelectorAll<HTMLButtonElement>('[role=tab]')
          );
          const i = tabs.indexOf(document.activeElement as HTMLButtonElement);
          let n = i;
          if (e.key === 'ArrowRight') n = (i + 1) % tabs.length;
          else if (e.key === 'ArrowLeft') n = (i - 1 + tabs.length) % tabs.length;
          else if (e.key === 'Home') n = 0;
          else if (e.key === 'End') n = tabs.length - 1;
          else return;
          e.preventDefault();
          tabs[n]?.focus();
          tabs[n]?.click();
        }}
      >
        {(
          [
            ['overview', 'Account overview'],
            ['enrichment', 'Profile & scores'],
            ['lookalikes', 'Lookalike peers'],
            ['news', 'Company news'],
            ['ads', 'Ad creatives'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            tabIndex={mode === id ? 0 : -1}
            aria-selected={mode === id}
            aria-controls="intelligence-panel"
            id={`tab-${id}`}
            onClick={() => {
              setMode(id);
              setOffset(0);
              setQuery('');
              if (id === 'news') {
                setNewsCompany(selected);
              } else if (id !== 'overview') {
                setPortfolioView('list');
              }
            }}
          >
            {label}
            {id === 'news' && data && <span>{data.summary.news}</span>}
          </button>
        ))}
      </div>

      <label className="ci-view-select">
        <span>Intelligence view</span>
        <select
          value={mode}
          onChange={(e) => {
            const view = e.target.value as Mode;
            setMode(view);
            setOffset(0);
            setQuery('');
            if (view === 'news') {
              setNewsCompany(selected);
            } else if (view !== 'overview') {
              setPortfolioView('list');
            }
          }}
        >
          <option value="overview">Account overview</option>
          <option value="enrichment">Profile &amp; scores</option>
          <option value="lookalikes">Lookalike peers</option>
          <option value="news">Company news</option>
          <option value="ads">Ad creatives</option>
        </select>
      </label>

      <div className="ci-toolbar">
        <label className="ci-search">
          <Search size={16} />
          <span className="sr-only">
            {mode === 'news' ? 'Search company news' : 'Search companies'}
          </span>
          <input
            value={query}
            type="search"
            placeholder={
              mode === 'news'
                ? 'Search companies, headlines or topics'
                : 'Search company, domain, industry or HQ'
            }
            onChange={(e) => {
              setQuery(e.target.value);
              setOffset(0);
              setListPage(0);
            }}
          />
        </label>

        {mode === 'news' ? (
          <>
            <label>
              <span className="sr-only">Company news filter</span>
              <select
                value={newsCompany}
                onChange={(e) => {
                  setNewsCompany(e.target.value);
                  if (e.target.value) {
                    setStatus('all');
                    setAttractiveness('all');
                    setIndustry('all');
                    setSelected(e.target.value);
                  }
                  setOffset(0);
                }}
              >
                <option value="">All accounts</option>
                {data?.companies.map((c) => (
                  <option key={c.domain} value={c.domain}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">News period</span>
              <select
                value={days}
                onChange={(e) => {
                  setDays(e.target.value);
                  setOffset(0);
                }}
              >
                {[7, 30, 90, 180].map((n) => (
                  <option key={n} value={n}>
                    Last {n} days
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label>
              <span className="sr-only">Research status</span>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setListPage(0);
                }}
              >
                <option value="all">All research</option>
                <option value="complete">Completed research</option>
                <option value="pending">Pending research</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Account attractiveness</span>
              <select
                value={attractiveness}
                onChange={(e) => {
                  setAttractiveness(e.target.value);
                  setListPage(0);
                }}
              >
                <option value="all">All ICP fit</option>
                <option value="strong">Strong ICP fit</option>
                <option value="moderate">Moderate ICP fit</option>
                <option value="limited">Limited ICP fit</option>
                <option value="low">Low ICP fit</option>
                <option value="unknown">Fit not established</option>
              </select>
            </label>
            {industries.length > 0 && (
              <label>
                <span className="sr-only">Industry filter</span>
                <select
                  value={industry}
                  onChange={(e) => {
                    setIndustry(e.target.value);
                    setListPage(0);
                  }}
                >
                  <option value="all">All industries ({industries.length})</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span className="sr-only">Sort accounts</span>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setListPage(0);
                }}
              >
                <option value="name">Name A–Z</option>
                <option value="fit">Highest ICP fit</option>
                <option value="score">Highest composite</option>
                <option value="coverage">Highest research coverage</option>
                <option value="news">Most news articles</option>
              </select>
            </label>
          </>
        )}

        <div
          className="ci-view-toggle"
          role="group"
          aria-label="Account view mode"
        >
          {(
            [
              ['list', 'List', List],
              ['map', 'Map', MapIcon],
              ['density', 'Density', LayoutGrid],
            ] as const
          ).map(([id, label, Icon]) => {
            const active = mode !== 'news' && portfolioView === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                className={active ? 'is-active' : ''}
                onClick={() => handlePortfolioViewChange(id)}
              >
                <Icon size={14} aria-hidden="true" />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {mode !== 'news' && (
        <div
          className="ci-count-bar"
          role="status"
          aria-live="polite"
          aria-label="Displayed account count"
        >
          <div className="ci-count-primary">
            {loading && !data ? (
              <span>Loading accounts…</span>
            ) : (
              <>
                <span>
                  Showing{' '}
                  <strong className="tabular-nums">
                    {companies.length.toLocaleString()}
                  </strong>{' '}
                  of{' '}
                  <strong className="tabular-nums">
                    {totalAccounts.toLocaleString()}
                  </strong>{' '}
                  accounts
                </span>
                {hasActiveFilters && totalAccounts > 0 && (
                  <span className="ci-count-pct tabular-nums">
                    · {displayedPct}% of cohort matches criteria
                  </span>
                )}
              </>
            )}
          </div>
          <div className="ci-count-right">
            {!loading && totalAccounts > 0 && (
              <div className="ci-count-meter" aria-hidden="true">
                <span style={{ width: `${displayedPct}%` }} />
              </div>
            )}
            {hasActiveFilters && (
              <button
                type="button"
                className="ci-clear-inline"
                onClick={resetFilters}
              >
                <X size={13} aria-hidden="true" />
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      <div id="intelligence-panel" role="tabpanel" aria-labelledby={`tab-${mode}`}>
        {loading && !data ? (
          <div className="ci-state" role="status">
            Loading company research…
          </div>
        ) : mode === 'news' ? (
          <section aria-label="Company news feed" className="ci-news-feed">
            <div className="ci-section-title">
              <h2>Latest company developments</h2>
              <span>
                {newsLoading
                  ? 'Loading…'
                  : `${news?.total ?? 0} matching articles`}
              </span>
            </div>
            {newsError && (
              <p role="alert" className="ci-error">
                {newsError}
              </p>
            )}
            {newsLoading ? (
              <div className="ci-state" role="status">
                Finding articles in your saved research…
              </div>
            ) : !news?.articles.length ? (
              <div className="ci-state">
                <h3>No matching news</h3>
                <p>
                  Try another company, topic or date window. Missing news does not
                  mean nothing happened.
                </p>
                <button
                  className="ci-button"
                  onClick={() => {
                    setQuery('');
                    setNewsCompany('');
                    setDays('180');
                    setOffset(0);
                  }}
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <>
                {news.articles.map((a) => (
                  <article
                    className="ci-news-item"
                    key={`${a.company_domain}-${a.url}`}
                  >
                    <div className="ci-news-meta">
                      <button
                        onClick={() => {
                          setSelected(a.company_domain);
                          setMode('enrichment');
                          setPortfolioView('list');
                          setQuery('');
                          setStatus('all');
                          setAttractiveness('all');
                          setIndustry('all');
                        }}
                      >
                        {a.company_name}
                      </button>
                      <span>{displayDate(a.published_at)}</span>
                    </div>
                    <div>
                      <h3>
                        <a
                          href={a.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {a.title}
                          <ArrowUpRight size={15} />
                        </a>
                      </h3>
                      <p>{a.summary}</p>
                      <div className="ci-news-source">
                        {a.publisher}
                        {a.event_date && a.event_date !== a.published_at && (
                          <span> · Event: {displayDate(a.event_date)}</span>
                        )}
                      </div>
                      <p className="ci-relevance">{a.relevance}</p>
                    </div>
                  </article>
                ))}
                <footer className="ci-pagination">
                  <span>
                    {offset + 1}–{Math.min(offset + 20, news.total)} of{' '}
                    {news.total} articles
                  </span>
                  <div>
                    <button
                      className="ci-button"
                      aria-label="Previous news page"
                      disabled={offset === 0}
                      onClick={() => setOffset((n) => Math.max(0, n - 20))}
                    >
                      <ChevronLeft size={16} />
                      Previous
                    </button>
                    <button
                      className="ci-button"
                      disabled={news.next_offset === null}
                      onClick={() => setOffset(news.next_offset ?? offset)}
                    >
                      Next
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </footer>
              </>
            )}
          </section>
        ) : portfolioView === 'map' ? (
          <IntelligencePortfolioMap
            companies={companies}
            totalAccounts={totalAccounts}
            selectedDomain={selected}
            onSelectAccount={(domain) => setSelected(domain)}
            onInspectAccount={handleInspectAccount}
            onQuickView={openQuickView}
          />
        ) : portfolioView === 'density' ? (
          <IntelligenceDensityView
            companies={companies}
            totalAccounts={totalAccounts}
            selectedDomain={selected}
            selectedIndustry={industry}
            onSelectIndustry={(nextIndustry) => {
              setIndustry(nextIndustry);
              setListPage(0);
            }}
            onSelectAccount={(domain) => setSelected(domain)}
            onInspectAccount={handleInspectAccount}
            onQuickView={openQuickView}
          />
        ) : (
          <div className="ci-workspace">
            <aside className="ci-company-list" aria-label="Research accounts">
              <div className="ci-list-heading">
                <h2 className="tabular-nums">
                  {companies.length} of {totalAccounts} accounts
                </h2>
                <span>Score / 100</span>
              </div>
              <label className="ci-mobile-company">
                <span className="sr-only">Selected account</span>
                <select
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {companies.map((c) => (
                    <option value={c.domain} key={c.domain}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="ci-company-rows">
                {pagedCompanies.map((c) => (
                  <button
                    key={c.domain}
                    aria-pressed={c.domain === selected}
                    className={`ci-company ${
                      c.domain === selected ? 'is-selected' : ''
                    }`}
                    onClick={() => openQuickView(c.domain)}
                  >
                    <span className="ci-company-main">
                      <strong>{c.name}</strong>
                      <span>{c.score ? c.score.composite.toFixed(1) : '—'}</span>
                    </span>
                    <span className="ci-company-domain">{c.domain}</span>
                    <span
                      className={`ci-fit-label is-${assessAccount(c.score).band}`}
                    >
                      <i aria-hidden="true" />
                      {assessAccount(c.score).label}
                    </span>
                    <span className="ci-company-bottom">
                      {c.status === 'complete'
                        ? `${c.known_fields}/${c.total_fields} fields · ${c.news_count} articles`
                        : 'Research processing'}
                    </span>
                  </button>
                ))}
              </div>
              {companies.length > LIST_PAGE_SIZE && (
                <div className="ci-list-pager" aria-label="Account list pagination">
                  <span className="tabular-nums">
                    {clampedPage * LIST_PAGE_SIZE + 1}–
                    {Math.min(
                      (clampedPage + 1) * LIST_PAGE_SIZE,
                      companies.length
                    )}{' '}
                    of {companies.length}
                  </span>
                  <div>
                    <button
                      type="button"
                      className="ci-pager-btn"
                      aria-label="Previous account page"
                      disabled={clampedPage === 0}
                      onClick={() => setListPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      className="ci-pager-btn"
                      aria-label="Next account page"
                      disabled={clampedPage >= totalListPages - 1}
                      onClick={() =>
                        setListPage((p) => Math.min(totalListPages - 1, p + 1))
                      }
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
              {!companies.length && (
                <p className="ci-state">
                  No companies match. Try a broader search or clear active filters.
                </p>
              )}
            </aside>

            <div className="ci-detail">
              {detailLoading ? (
                <div className="ci-state" role="status">
                  Loading account intelligence…
                </div>
              ) : detailError ? (
                <div role="alert" className="ci-error">
                  {detailError}
                </div>
              ) : !company ? (
                <div className="ci-state">
                  Choose an account to inspect its research.
                </div>
              ) : (
                <>
                  <header className="ci-account-heading">
                    <div>
                      <h2>{company.name}</h2>
                      <a
                        href={`https://${company.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {company.domain}
                        <ArrowUpRight size={13} />
                      </a>
                    </div>
                    <span className="ci-status">
                      {research ? 'Research collected' : 'Research processing'}
                    </span>
                  </header>
                  <p className="ci-provenance">
                    {research
                      ? `Collected ${displayDate(
                          research.retrieved_at
                        )} · Source-backed candidates`
                      : 'Available source evidence will appear while detailed research completes.'}
                  </p>
                  {mode === 'overview' ? (
                    <AccountIntelligenceSummary
                      key={`${selected}-${refresh}`}
                      company={company}
                      detail={detail}
                      onOpen={(view) => {
                        setMode(view);
                        setQuery('');
                        setOffset(0);
                        if (view === 'news') setNewsCompany(selected);
                      }}
                    />
                  ) : mode === 'ads' ? (
                    <AdIntelligencePanel
                      key={selected}
                      domain={selected}
                      name={company.name}
                    />
                  ) : mode === 'enrichment' ? (
                    <>
                      <Score
                        score={detail?.score}
                        company={company.name}
                        profileFields={company.known_fields}
                        totalFields={company.total_fields}
                        newsCount={company.news_count}
                        onNews={() => {
                          setNewsCompany(selected);
                          setMode('news');
                          setQuery('');
                          setOffset(0);
                        }}
                        onPeers={() => setMode('lookalikes')}
                      />
                      <div className="ci-research-section">
                        <h3>Company profile</h3>
                        <span>
                          {company.known_fields} of {company.total_fields}{' '}
                          researched fields available
                        </span>
                      </div>
                      {fields ? (
                        <>
                          <div className="ci-quick-facts">
                            {[
                              'industry',
                              'headquarters',
                              'founded',
                              'company_status',
                            ].map((k) => (
                              <div key={k}>
                                <span>{labels[k]}</span>
                                <p>{fields[k]?.value || 'Unknown'}</p>
                                {sources(fields[k])}
                              </div>
                            ))}
                          </div>
                          <Fact
                            name="Company overview"
                            fact={fields.business_description}
                          />
                          <div className="ci-profile-fields">
                            {[
                              'products',
                              'target_customers',
                              'employee_count',
                              'leadership',
                              'funding',
                              'investors',
                              'pricing',
                              'partnerships',
                            ].map((k) => (
                              <Fact key={k} name={labels[k]} fact={fields[k]} />
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="ci-state">
                          <p>
                            {detail?.quote ||
                              'Detailed profile is not available yet.'}
                          </p>
                          {detail?.source_url && (
                            <a
                              href={detail.source_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Read official source ↗
                            </a>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="ci-section-title">
                        <h3>Accounts with a similar business</h3>
                        <span>Within this cohort</span>
                      </div>
                      <p className="ci-caption">
                        Compared on industry, business description, products and
                        target customers. Low similarity can mean no close peer
                        exists in this cohort. Similarity is not buying intent or
                        proof of direct competition.
                      </p>
                      <div className="ci-peers">
                        {detail?.lookalikes?.map((p) => (
                          <button
                            key={p.domain}
                            className={
                              p.domain === peerDomain ? 'is-selected' : ''
                            }
                            onClick={() => setPeerDomain(p.domain)}
                          >
                            <div>
                              <strong>{p.name}</strong>
                              <span>{p.domain}</span>
                              <small>
                                {p.matched_on
                                  .map((m) => m.field.replaceAll('_', ' '))
                                  .join(' · ')}
                              </small>
                            </div>
                            <div>
                              <b>{p.similarity.toFixed(1)}</b>
                              <small>/ 100 similarity</small>
                            </div>
                          </button>
                        ))}
                      </div>
                      {!detail?.lookalikes?.length && (
                        <div className="ci-state">
                          No supported lookalike match was found in this cohort.
                        </div>
                      )}
                      {peerError && (
                        <p role="alert" className="ci-error">
                          {peerError}
                        </p>
                      )}
                      {peerDomain && !peer && !peerError && (
                        <p role="status" className="ci-caption">
                          Loading peer comparison…
                        </p>
                      )}
                      {peer?.detailed_profile && fields && (
                        <section className="ci-comparison">
                          <h3>Business comparison</h3>
                          <div className="ci-comparison-head">
                            <span>Evidence</span>
                            <strong>{company.name}</strong>
                            <strong>
                              {peer.detailed_profile.profile.company_name}
                            </strong>
                          </div>
                          {[
                            'industry',
                            'products',
                            'target_customers',
                            'pricing',
                            'market_position',
                          ].map((k) => (
                            <div className="ci-comparison-row" key={k}>
                              <h4>{labels[k]}</h4>
                              <div>
                                <p>{fields[k]?.value || 'Not established'}</p>
                                {sources(fields[k])}
                              </div>
                              <div>
                                <p>
                                  {peer.detailed_profile!.profile.fields[k]
                                    ?.value || 'Not established'}
                                </p>
                                {sources(
                                  peer.detailed_profile!.profile.fields[k]
                                )}
                              </div>
                            </div>
                          ))}
                        </section>
                      )}
                      <Fact
                        name="Reported competitive context"
                        fact={fields?.competitors}
                      />
                      <Fact
                        name="Market position"
                        fact={fields?.market_position}
                      />
                    </>
                  )}
                  {mode === 'enrichment' && !!research?.profile.gaps.length && (
                    <details className="ci-gaps">
                      <summary>
                        Research gaps · {research.profile.gaps.length}
                      </summary>
                      <ul>
                        {research.profile.gaps.map((g) => (
                          <li key={g}>{g}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <footer className="ci-detail-footer">
                    This is company context. Contacts, consent and engagement must
                    come from verified operational data.
                  </footer>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {quickViewCompany && (
        <AccountQuickViewModal
          company={quickViewCompany}
          detail={detail?.domain === quickViewCompany.domain ? detail : null}
          detailLoading={detailLoading}
          signals={signals}
          matchedAccount={matchedQuickViewAccount}
          position={quickViewIndex}
          totalInCohort={companies.length}
          onStep={handleStepQuickView}
          onClose={() => setQuickViewDomain(null)}
          onOpenFullView={handleInspectAccount}
          onOpenFullDrawer={onOpenFullDrawer}
        />
      )}
    </div>
  );
}

function Score({
  score,
  company,
  profileFields,
  totalFields,
  newsCount,
  onNews,
  onPeers,
}: {
  score?: IntelligenceDetail['score'];
  company: string;
  profileFields: number;
  totalFields: number;
  newsCount: number;
  onNews: () => void;
  onPeers: () => void;
}) {
  const assessment = assessAccount(score);
  const weights = score?.weights || { fit: 0.35, intent: 0.4, coverage: 0.25 };
  const components = [
    ['fit', 'Account fit'],
    ['intent', 'Activity intent'],
    ['coverage', 'Buying-group coverage'],
  ] as const;
  const contribution = score
    ? Object.fromEntries(
        components.map(([key]) => [
          key,
          Number((score[key] * weights[key]).toFixed(1)),
        ])
      )
    : {};
  const completeness = totalFields
    ? Math.round((profileFields / totalFields) * 100)
    : 0;
  return (
    <section
      className={`ci-score ci-score-redesign is-${assessment.band}`}
      aria-label={`Dual Motion score for ${company}`}
    >
      <div className="ci-score-topline">
        <h3>Account assessment</h3>
        <span className="ci-provisional">Provisional · current ICP rules</span>
      </div>
      <div className="ci-assessment-main">
        <div className="ci-composite">
          <div className="ci-score-ring">
            <svg viewBox="0 0 112 112" aria-hidden="true">
              <circle
                cx="56"
                cy="56"
                r="49"
                fill="none"
                stroke="#e9edf3"
                strokeWidth="6"
              />
              <circle
                cx="56"
                cy="56"
                r="49"
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${((score?.composite || 0) / 100) * 307.88} 307.88`}
                transform="rotate(-90 56 56)"
              />
            </svg>
            <div>
              <strong>{score ? score.composite.toFixed(1) : '—'}</strong>
              <span>/ 100</span>
            </div>
          </div>
          <span>Dual Motion score</span>
        </div>
        <div className="ci-assessment-verdict">
          <span className={`ci-fit-label is-${assessment.band}`}>
            <i aria-hidden="true" />
            ICP attractiveness
          </span>
          <h4>{assessment.label}</h4>
          <p>{assessment.reason}</p>
          <p className="ci-assessment-context">
            {score && score.intent === 0 && score.coverage === 0
              ? 'Account fit contributes the current score. Activity intent and buying-group coverage are not established.'
              : 'The composite combines account fit, recorded intent and buying-group coverage.'}
          </p>
        </div>
      </div>
      <div className="ci-score-components">
        {components.map(([key, label]) => (
          <div key={key}>
            <div>
              <span>{label}</span>
              <b>
                {score ? score[key].toFixed(1) : '—'}
                <small> /100</small>
              </b>
            </div>
            <div className="ci-score-track">
              <span style={{ width: `${score?.[key] || 0}%` }} />
            </div>
            <p>
              {Math.round(weights[key] * 100)}% weight{' '}
              <span>→ {score ? contribution[key] : '—'} points</span>
            </p>
          </div>
        ))}
      </div>
      <div className="ci-assessment-signals">
        <div>
          <span>Buying readiness</span>
          <strong>{assessment.readiness}</strong>
        </div>
        <div>
          <span>Fit inputs supported</span>
          <strong>
            {score ? `${Math.round(score.fit_evidence_fraction * 100)}%` : 'Unknown'}
          </strong>
        </div>
        <div>
          <span>Research completeness</span>
          <strong>
            {completeness}%
            <small>
              {' '}
              · {profileFields}/{totalFields} fields
            </small>
          </strong>
        </div>
      </div>
      <div className="ci-assessment-next">
        <div>
          <span>Recommended next step</span>
          <strong>{assessment.next}</strong>
        </div>
        <a className="ci-button" href="#rules">
          Review ICP rules
          <ArrowUpRight size={14} />
        </a>
      </div>
      <div className="ci-context-links">
        <button onClick={onNews}>
          Explore {newsCount} news articles
          <ArrowUpRight size={13} />
        </button>
        <button onClick={onPeers}>
          Compare lookalike accounts
          <ArrowUpRight size={13} />
        </button>
      </div>
      <details className="ci-score-method">
        <summary>Why this score?</summary>
        <p>{score?.formula || 'Scores have not been calculated.'}</p>
        <p>
          Attractiveness describes alignment with the current ICP: strong ≥80
          fit, moderate ≥60, limited ≥40, low &lt;40. No supported fit inputs
          means unknown. It is not an investment rating or purchase probability.
        </p>
        <p>
          Fit-input coverage is the share of configured fit weight supported by
          data. Research completeness counts available researched fields; it does
          not mean all facts are independently verified.
        </p>
        {score && (
          <>
            <p>Industry input: {score.inputs.industry.value || 'Unknown'}</p>
            {sources(score.inputs.industry)}
            <p>
              Exact employee count:{' '}
              {score.inputs.headcount.value ??
                'Not established; ranges are excluded'}
            </p>
          </>
        )}
        <p>
          News, lookalikes, funding and company size alone do not establish
          engagement, contact identity or consent. Jev decisions remain paused in
          this research workspace.
        </p>
      </details>
    </section>
  );
}
