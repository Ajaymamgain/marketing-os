import React, { useEffect, useState, useRef } from 'react';
import { ArrowRight, RefreshCw, Sparkles, Database, ShieldCheck, Activity, CheckCircle2, Send, Plus, Trash2, ChevronDown, ChevronUp, Layers, X } from 'lucide-react';
import { AccountDemandUnit, ActiveNavTab, CustomPlaybook } from '../types';
import { JevDecisionCard } from '../components/JevDecisionCard';
import { PlaybookSkillPanel, PlaybookRunHistory } from './PlaybookSkillPanel';
import {
  AudiencePlaybookConfig,
  AudiencePlaybookPreview,
  MarketoPlaybookAsset,
  MarketoPlaybookAssets,
  PlaybookRun,
  applyAudiencePlaybook,
  fetchAudiencePlaybookConfig,
  fetchMarketoPlaybookAssets,
  fetchMarketoStaticLists,
  previewAudiencePlaybook,
  saveAudiencePlaybookConfig,
  fetchCustomPlaybooks,
  createCustomPlaybook,
  previewCustomPlaybook,
  toggleCustomPlaybook,
  deleteCustomPlaybook,
} from '../services/api';

interface Props { accounts: AccountDemandUnit[]; loading?: boolean; onNavigateTab?: (tab: ActiveNavTab) => void }

export const AudiencePlaybookView: React.FC<Props> = ({ accounts, loading = false, onNavigateTab }) => {
  const [selectedKey, setSelectedKey] = useState(() => sessionStorage.getItem('dm-playbook-demand-unit') || accounts[0]?.id || '');
  const [accountQuery, setAccountQuery] = useState('');
  const [listId, setListId] = useState('');
  const [playCode, setPlayCode] = useState('*');
  const [lists, setLists] = useState<Array<{ id: number; name: string }>>([]);
  const [plan, setPlan] = useState<AudiencePlaybookPreview | null>(null);
  const [config, setConfig] = useState<AudiencePlaybookConfig | null>(null);
  const [role, setRole] = useState('member');
  const [busy, setBusy] = useState<'lists' | 'apply' | 'config' | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [showAllRecipes, setShowAllRecipes] = useState(false);
  const [customBusy, setCustomBusy] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const canEdit = role === 'owner';
  const [previewMatches, setPreviewMatches] = useState<NonNullable<CustomPlaybook['matched_units']>>([]);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [assets, setAssets] = useState<MarketoPlaybookAssets | null>(null);
  const [assetQuery, setAssetQuery] = useState('');
  const [assetError, setAssetError] = useState<string | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [latestRun, setLatestRun] = useState<PlaybookRun | null>(null);

  // Custom Noul Playbooks state
  const [customLoadError, setCustomLoadError] = useState<string | null>(null);
  const [customPlaybooks, setCustomPlaybooks] = useState<CustomPlaybook[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedCustomId, setExpandedCustomId] = useState<string | null>(null);

  // Custom playbook modal form state
  const [formName, setFormName] = useState('Executive Surge Acceleration');
  const [formDescription, setFormDescription] = useState('Immediate executive alignment when an automated evaluation supports stage progression.');
  const [formAction, setFormAction] = useState('Dispatch VP-level Outbound & Prioritize Meeting Request');
  const [formLane, setFormLane] = useState('SALES_LANE');
  const [formSlaHours, setFormSlaHours] = useState(4);
  const [formNoulQuestion, setFormNoulQuestion] = useState('progress');
  const [formNoulThreshold, setFormNoulThreshold] = useState(0.70);
  const [formNoulOperator, setFormNoulOperator] = useState('>=');
  const [formMinFit, setFormMinFit] = useState(50);
  const [formMinIntent, setFormMinIntent] = useState(50);
  const [isSavingCustom, setIsSavingCustom] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!busy && document.visibilityState === 'visible') setRefreshVersion((value) => value + 1);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (loading) return;
    if (!accounts.some((account) => account.id === selectedKey)) {
      setSelectedKey(accounts[0]?.id || ''); setPlan(null); setConfig(null); setListId(''); setResult(null); setLatestRun(null);
    }
  }, [accounts, selectedKey, loading]);
  useEffect(() => { if (selectedKey) sessionStorage.setItem('dm-playbook-demand-unit', selectedKey); }, [selectedKey]);
  useEffect(() => {
    fetch('/v1/auth/me', { credentials: 'include' }).then((res) => res.ok ? res.json() : null)
      .then((session) => setRole(session?.role || 'member')).catch(() => setRole('member'));
  }, []);
  useEffect(() => {
    loadLists();
  }, []);
  useEffect(() => {
    if (!selectedKey) { setConfig(null); setListId(''); setConfigLoading(false); return; }
    let cancelled = false;
    setConfigLoading(true); setConfig(null); setListId('');
    fetchAudiencePlaybookConfig(selectedKey, playCode)
      .then((next) => { if (!cancelled) { setConfig(next); setListId(next.marketo_list_id ? String(next.marketo_list_id) : ''); } })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load playbook settings'); })
      .finally(() => { if (!cancelled) setConfigLoading(false); });
    return () => { cancelled = true; };
  }, [selectedKey, playCode]);
  useEffect(() => {
    if (!selectedKey || configLoading || !config) { setPlan(null); setPreviewLoading(false); return; }
    let cancelled = false;
    setPreviewLoading(true); setError(null);
    previewAudiencePlaybook(selectedKey, listId, playCode)
      .then((next) => {
        if (!cancelled) {
          setPlan(next);
          if (!listId && next.marketo_list_id) {
            setListId(String(next.marketo_list_id));
          }
          setCheckedAt(new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
        }
      })
      .catch((cause) => { if (!cancelled) { setPlan(null); setError(cause instanceof Error ? cause.message : 'Preview unavailable'); } })
      .finally(() => { if (!cancelled) setPreviewLoading(false); });
    return () => { cancelled = true; };
  }, [selectedKey, listId, playCode, refreshVersion, configLoading, config]);

  useEffect(() => {
    let cancelled = false;
    fetchMarketoPlaybookAssets()
      .then((next) => { if (!cancelled) setAssets(next); })
      .catch((cause) => { if (!cancelled) setAssetError(cause instanceof Error ? cause.message : 'Could not load Marketo programs'); });
    return () => { cancelled = true; };
  }, []);

  const loadCustomPlaybooks = async () => {
    try {
      const pbs = await fetchCustomPlaybooks();
      setCustomPlaybooks(pbs); setCustomLoadError(null);
    } catch (err) {
      setCustomLoadError(err instanceof Error ? err.message : 'Could not load custom rules');
    }
  };

  useEffect(() => {
    loadCustomPlaybooks();
  }, [refreshVersion]);

  const handleToggleCustom = async (id: string) => {
    if (!canEdit || customBusy) return;
    setCustomBusy(id);
    try {
      await toggleCustomPlaybook(id);
      loadCustomPlaybooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Toggle failed');
    } finally { setCustomBusy(null); }
  };

  const handleDeleteCustom = async (id: string) => {
    if (!canEdit || customBusy) return;
    setCustomBusy(id);
    try {
      await deleteCustomPlaybook(id);
      loadCustomPlaybooks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally { setCustomBusy(null); }
  };

  const handleCreateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit || !formName.trim()) return;
    setIsSavingCustom(true);
    setCustomError(null);
    try {
      await createCustomPlaybook({
        name: formName,
        description: formDescription,
        action: formAction,
        lane: formLane,
        sla_hours: Number(formSlaHours),
        noul_question: formNoulQuestion,
        noul_threshold: Number(formNoulThreshold),
        noul_operator: formNoulOperator,
        min_fit: Number(formMinFit),
        min_intent: Number(formMinIntent),
        is_active: true,
      });
      setIsModalOpen(false);
      loadCustomPlaybooks();
      setResult(`Playbook "${formName}" saved. It evaluates stored decisions and plans eligible accounts (${formNoulOperator} ${formNoulThreshold.toFixed(2)}); verified destination activation uses the separately approved Marketo skill and dedicated list mapping.`);
    } catch (err) {
      setCustomError(err instanceof Error ? err.message : 'Failed to create playbook');
    } finally {
      setIsSavingCustom(false);
    }
  };

  useEffect(() => {
    if (!isModalOpen) return;
    dialogRef.current?.showModal();
    dialogRef.current?.querySelector<HTMLInputElement>('input')?.focus();
    return () => dialogRef.current?.close();
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;
    let cancelled = false;
    setMatching(true); setPreviewMatches([]); setMatchError(null);
    const timer = window.setTimeout(() => {
      previewCustomPlaybook({name: 'Draft eligibility rule', lane: formLane,
        noul_question: formNoulQuestion, noul_operator: formNoulOperator,
        noul_threshold: formNoulThreshold, min_fit: formMinFit, min_intent: formMinIntent})
        .then((next) => { if (!cancelled) setPreviewMatches(next.matched_units); })
        .catch((cause) => { if (!cancelled) setMatchError(cause instanceof Error ? cause.message : 'Eligibility preview unavailable'); })
        .finally(() => { if (!cancelled) setMatching(false); });
    }, 300);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [isModalOpen, formLane, formNoulQuestion, formNoulOperator, formNoulThreshold, formMinFit, formMinIntent, refreshVersion]);

  const loadLists = async () => {
    setBusy('lists'); setError(null);
    try { setLists(await fetchMarketoStaticLists()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load Marketo lists'); }
    finally { setBusy(null); }
  };

  const currentListId = listId.trim();
  const validListId = /^[1-9]\d{0,14}$/.test(currentListId);
  const mappingSaved = validListId && String(config?.marketo_list_id ?? '') === currentListId;

  const apply = async () => {
    if (!canEdit || !plan?.can_apply || !mappingSaved || previewLoading || busy) return;
    setBusy('apply'); setError(null); setResult(null);
    try {
      const next = await applyAudiencePlaybook(selectedKey, currentListId, playCode);
      setResult(`${next.status === 'completed' ? 'Reconciled' : 'Partial result'} in Marketo: ${next.applied_count} confirmed, ${next.skipped_count} unverified, ${Math.max(0, next.requested_count - next.resolved_count)} unresolved.`);
      setRefreshVersion((v) => v + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Audience update failed'); }
    finally { setBusy(null); }
  };

  const saveMapping = async (enabled: boolean) => {
    if (!canEdit || !selectedKey || !validListId || busy || configLoading) return;
    setBusy('config'); setError(null); setResult(null);
    try {
      const next = await saveAudiencePlaybookConfig(selectedKey, currentListId, enabled, playCode);
      setConfig(next);
      setRefreshVersion((value) => value + 1);
      setResult(enabled ? `Mapping saved for ${next.need_key}.${plan?.mode !== 'local' ? ' This workspace is in dry run; no provider writes will occur.' : ' The worker will check eligibility before each update.'}` : `Mapping saved for ${next.need_key}; automatic updates are paused.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the mapping'); }
    finally { setBusy(null); }
  };


  const trace = plan?.data_trace;
  const step = plan?.recommendation.operational_next_action;
  const delivery = !plan ? 'Checking delivery' : plan.mode !== 'local' ? 'Dry run · no provider writes' : !config?.enabled ? 'Delivery paused' : plan.blockers.length ? 'Mapping enabled · blocked' : 'Ready for delivery';
  const decisionCurrent = plan?.recommendation.jev_applied && plan.recommendation.decision_current;
  const recipes = plan?.playbook_library || [];
  const displayedRecipes = showAllRecipes ? recipes : recipes.filter((recipe) => recipe.selected || ['EVENT_FOLLOW_UP', 'CONTENT_NURTURE', 'PRICING_FOLLOW_UP'].includes(recipe.code));
  const selectedPlayName = playCode === '*'
    ? 'General marketing audience (all eligible plays)'
    : recipes.find((recipe) => recipe.code === playCode)?.name || playCode.replaceAll('_', ' ');
  const marketoWriteVerified = Boolean(plan?.delivery_connection_ready && plan?.mode === 'local');
  const activationCapabilityLabel = !plan
    ? 'Checking capability'
    : marketoWriteVerified && mappingSaved
      ? 'Verified write capability · Marketo static list'
      : marketoWriteVerified
        ? 'Verified write capability · map a list to activate'
        : plan.mode !== 'local'
          ? 'Plan & preview only · dry run'
          : 'Plan & preview only · write setup required';
  const friendly = (value: string) => value.replaceAll('_', ' ');
  const date = (value?: string | null) => value ? new Date(value).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Not recorded';

  const filteredAccounts = accountQuery.trim()
    ? accounts.filter((account) =>
        [account.accountName, account.domain, account.solutionTarget].some((v) =>
          v?.toLowerCase().includes(accountQuery.trim().toLowerCase())
        )
      )
    : accounts;
  const selectorAccounts =
    selectedKey && !filteredAccounts.some((a) => a.id === selectedKey)
      ? [
          ...accounts.filter((a) => a.id === selectedKey),
          ...filteredAccounts,
        ]
      : filteredAccounts;

  return <div className="dm-playbooks">
    <div className="dm-page-head">
      <div><h1>Playbooks</h1><p>Review the next action, connect its destination, and track what the provider confirms.</p></div>
      <div className="dm-playbook-actions">
        <button className="dm-button dm-button-primary" disabled={!canEdit} onClick={() => setIsModalOpen(true)}>
          <Plus size={16}/> Create playbook
        </button>
        <button type="button" className="dm-button dm-button-secondary" disabled={!plan}
          onClick={() => document.getElementById('dm-automation-setup')?.scrollIntoView({block:'start'})}>Map a destination</button>
        <a href="#decisions" className="dm-button dm-button-secondary" onClick={(e) => { if (onNavigateTab) { e.preventDefault(); onNavigateTab('DECISION_OPS'); } }}>Decision Inbox</a>
        <a href="#operations-desk" className="dm-button dm-button-secondary" onClick={(e) => { if (onNavigateTab) { e.preventDefault(); onNavigateTab('OPERATIONS_DESK'); } }}>Operations Desk</a>
        <button type="button" className="dm-button dm-button-secondary" disabled={!plan}
          onClick={() => document.getElementById('playbook-runs')?.scrollIntoView({block:'start'})}>Run history <ArrowRight size={16}/></button>
      </div>
    </div>
    {!canEdit && <div className="dm-notice" role="status"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#64748b]"/><p>Workspace owner permission is required to create playbooks, approve Marketo skills and tools, save destination mappings, enable automatic delivery, or apply updates.</p></div>}
    <div className="dm-status-strip">
      <span className={plan?.mode === 'local' && plan.can_apply ? 'text-[#15803d]' : 'text-[#b45309]'}>{delivery}</span>
      <span>{activationCapabilityLabel} · Refreshes every 15 seconds{checkedAt ? ` · Checked ${checkedAt}` : ''}</span>
    </div>
    <section className="dm-panel dm-selector">
      <label className="max-w-[260px]">
        Filter demand units
        <input
          type="search"
          className="pb-list-input"
          placeholder={`Search ${accounts.length} demand units…`}
          value={accountQuery}
          onChange={(event) => setAccountQuery(event.target.value)}
        />
      </label>
      <label>
        Account &amp; demand need ({filteredAccounts.length} of {accounts.length})
        <select value={selectedKey} onChange={(event) => { setSelectedKey(event.target.value); setPlan(null); setConfig(null); setListId(''); setResult(null); setLatestRun(null); }}>
          <option value="">Select a demand unit</option>
          {selectorAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.accountName} · {account.solutionTarget}
            </option>
          ))}
        </select>
      </label>
      <button className="dm-button dm-button-secondary" disabled={busy !== null || previewLoading || configLoading} onClick={() => setRefreshVersion((value) => value + 1)}><RefreshCw size={16} className={previewLoading ? 'animate-spin' : ''}/> Refresh</button>
    </section>
    {error && <div role="alert" className="dm-notice dm-notice-warning">{error}</div>}
    {result && <div role="status" className="dm-notice">{result}</div>}
    {!plan && selectedKey && !error && <div className="dm-panel dm-loading" role="status">Reading the stored decision and its evidence…</div>}
    {plan && <>
      <div className="dm-playbook-grid">
        <section className="dm-panel dm-decision">
          <div className="dm-section-heading"><h2>Next best action</h2><span className="dm-badge">{decisionCurrent ? 'Decision + policy gates' : 'Historical recommendation'}</span></div>
          <h3>{step?.title || 'Awaiting an evaluated next step'}</h3><p>{step?.detail || 'The scoring workflow will record a decision when this unit is evaluated.'}</p>
          <div className="dm-owner"><span>Responsible team</span><strong>{step ? friendly(step.owner) : 'Not assigned'}</strong><span className="dm-badge">Recommendation</span></div>
          <div className="dm-strategy-grid">{[['Campaign strategy',plan.recommendation.campaign.name],['Audience segment',plan.recommendation.segment.name],['Preferred channel',plan.recommendation.channel.name]].map(([label,value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
          <div className="dm-audience-decision"><Sparkles size={16}/><div><strong>Audience decision</strong><p>{plan.recommendation.next_action?.reason || 'No audience destination has been evaluated yet.'}</p></div></div>
          <p className="dm-footnote">Decision recorded {date(plan.recommendation.decided_at)} · {friendly(plan.routing_state)} · {plan.stage}</p>
        </section>
        <section className="dm-panel">
          <div className="dm-section-heading"><h2>Why this decision?</h2><span className="dm-badge">Score / 100</span></div>
          <div className="dm-score-bars">{(['fit','intent','coverage'] as const).map((metric) => {
            const val = Math.max(0, Math.min(100, plan.recommendation.score[metric] || 0));
            return <div key={metric}><div><span className="capitalize">{metric}</span><strong className="tabular-nums">{val.toFixed(1)}</strong></div><div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#e2e8f0]" role="progressbar" aria-label={`${metric} score`} aria-valuenow={Math.round(val)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-[#1d4ed8]" style={{ width: `${val}%` }} /></div></div>;
          })}</div>
          <div className="dm-total"><span>Composite score</span><strong className="tabular-nums">{plan.recommendation.score.composite.toFixed(1)}</strong></div>
          <ul className="dm-evidence">{plan.evidence.map((item,index) => <li key={index}>{item}</li>)}</ul>
          <p className="dm-footnote">Scores are computed from recorded evidence. The next action is selected within coverage and consent rules.</p>
        </section>
      </div>
      <section className="dm-flow" aria-label="Automated playbook lifecycle">
        {[
          {icon:Database, label:'01 · Evidence received', value:`${trace?.signal_count ?? '—'} signals`, detail:trace?.sample_account ? 'Synthetic sample account' : 'Recorded workspace evidence'},
          {icon:Activity, label:'02 · Decision', value:decisionCurrent ? plan.recommendation.campaign.name : 'Awaiting a current decision', detail:`Score ${plan.recommendation.score.composite.toFixed(1)} / 100`},
          {icon:Sparkles, label:'03 · Skill & Marketo list', value:plan.delivery_transport === 'mcp' ? 'Adobe MCP skill' : plan.delivery_transport === 'legacy' ? 'Existing Marketo adapter' : 'Approve Adobe MCP skill', detail:config?.marketo_list_id ? `List #${config.marketo_list_id}` : 'Save a dedicated static list'},
          {icon:ShieldCheck, label:'04 · Readback & reconciliation', value:latestRun ? `${latestRun.applied_count} confirmed` : delivery, detail:latestRun ? `Last readback ${date(latestRun.completed_at)}` : 'Consent and eligibility checked before each update'},
        ].map((item) => <div key={item.label} className="dm-flow-step"><item.icon size={19}/><span>{item.label}</span><strong>{item.value}</strong><small>{item.detail}</small></div>)}
      </section>

      {/* Jev Decision Primitives Card (Choice, Score, Noul) */}
      <details className="dm-panel dm-setup"><summary>Recorded decision evaluation <span>{decisionCurrent ? 'Current decision' : 'Evaluation required before activation'}</span></summary><JevDecisionCard jevDecision={plan.jev_decision} /></details>
      <div className="dm-playbook-grid">
        <section className="dm-panel"><div className="dm-section-heading"><h2>Data behind the playbook</h2><span className="dm-badge">{trace?.sample_account ? 'Sample account' : 'Workspace records'}</span></div>
          <p className="dm-muted">Marketo activities become signals after identity and need mapping. Ad exports provide campaign reporting; they do not identify an individual buyer.</p>
          <div className="dm-source-tags">{trace?.sources.map((source) => <span key={source.name}>{source.name}<strong className="tabular-nums">{source.count.toLocaleString()}</strong></span>)}</div>
          <ol className="dm-timeline">{trace?.recent_signals.map((signal,index) => <li key={`${signal.at}-${index}`}><div><strong>{friendly(signal.type)}</strong><span className="tabular-nums">{signal.source} · {date(signal.at)}</span></div></li>)}</ol>
          {!trace?.recent_signals.length && <p className="dm-empty">No recorded signals for this account and need.</p>}
          <a href="#simulator" className="dm-text-link">Inspect the supplied CSV exports <ArrowRight size={14}/></a>
        </section>
        <section className="dm-panel"><div className="dm-section-heading"><h2>Audience & execution</h2><span className="dm-badge">{delivery}</span></div>
          <div className="dm-contact-counts">{[['Known contacts',plan.candidate_contacts],[plan.action === 'remove' ? 'Removal candidates' : 'Eligible contacts',plan.eligible_contacts],['Consent exclusions',plan.excluded_for_consent]].map(([label,value]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
          {plan.blockers.length > 0 && <div className="dm-notice dm-notice-warning"><strong>Delivery requirements</strong><ul>{plan.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul></div>}
          <h3 className="dm-small-heading">Recent integration jobs</h3>
          <div className="dm-job-list">{trace?.recent_jobs.map((job) => <div key={job.id}><span><strong>{friendly(job.action)}</strong><small>{job.destination} · {date(job.at)}</small></span><span className="dm-badge">{friendly(job.status)}</span></div>)}</div>
          {!trace?.recent_jobs.length && <p className="dm-empty">No delivery jobs recorded. A recommendation is not a delivery receipt.</p>}
        </section>
      </div>
      <section className="dm-panel">
        <div className="dm-section-heading">
          <div>
            <h2>Marketing operations playbooks</h2>
            <p className="dm-muted">
              Playbooks with a verified Marketo static-list write capability reconcile approved list
              membership; unmapped, dry-run, sales, coverage, and customer plays remain plan and
              preview only.
            </p>
          </div>
          <span className="dm-badge">
            {marketoWriteVerified ? 'Marketo static-list writes verified' : 'Plan & preview mode'}
          </span>
        </div>
        <div className="dm-recipe-grid">{displayedRecipes.map((recipe) => {
          const hasMappedList = Boolean(recipe.mapping.marketo_list_id);
          const hasVerifiedWrite = marketoWriteVerified && hasMappedList;
          const capabilityLabel = hasVerifiedWrite
            ? `Verified write · List #${recipe.mapping.marketo_list_id}`
            : hasMappedList
              ? `Plan & preview · write blocked (List #${recipe.mapping.marketo_list_id})`
              : 'Plan & preview only';
          return <article key={recipe.code} className={recipe.selected ? 'dm-recipe dm-recipe-selected' : 'dm-recipe'}>
            <div className="dm-section-heading">
              <span className="dm-badge">{recipe.selected ? 'Selected by current decision' : 'Available strategy'}</span>
              <span className={hasVerifiedWrite ? 'dm-badge dm-badge-ready' : 'dm-badge'}>{capabilityLabel}</span>
            </div>
            <h3>{recipe.name}</h3>
            <p>{recipe.detail}</p>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[#f1f5f9] pt-2.5 text-xs">
              <span className="text-[#64748b]">
                {recipe.mapping.enabled ? 'Automatic delivery on' : hasMappedList ? 'Mapping paused' : 'Not mapped to a static list'}
              </span>
              <button
                type="button"
                className="font-semibold text-[#1d4ed8] hover:underline"
                onClick={() => {
                  setPlayCode(recipe.code);
                  setConfig(null);
                  setListId('');
                  document.getElementById('dm-automation-setup')?.scrollIntoView({behavior: 'smooth', block: 'start'});
                }}
              >
                Open activation step →
              </button>
            </div>
          </article>;
        })}</div>
        <div className="dm-playbook-actions dm-library-actions">
          <button className="dm-button dm-button-secondary" aria-expanded={showAllRecipes} onClick={() => setShowAllRecipes(!showAllRecipes)}>{showAllRecipes ? 'Show key plays' : `View all ${recipes.length} strategies`}</button>
          <button className="dm-button dm-button-secondary" onClick={() => {document.getElementById('dm-automation-setup')?.scrollIntoView({behavior:'smooth',block:'start'});}}>Go to Marketo static-list activation <ArrowRight size={15}/></button>
        </div>
      </section>

      <section className="dm-panel" id="custom-playbooks" aria-labelledby="custom-playbooks-heading">
        <div className="dm-section-heading">
          <div>
            <h2 id="custom-playbooks-heading">Custom playbooks &amp; eligibility rules</h2>
            <p className="dm-muted">
              A created playbook evaluates stored decisions and plans eligible accounts. Verified
              destination activation uses the separately approved Marketo skill and dedicated list
              mapping.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="dm-badge">Plan &amp; preview only · no provider writes</span>
            <button
              type="button"
              className="dm-button dm-button-primary"
              disabled={!canEdit}
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={15} /> Create playbook
            </button>
          </div>
        </div>
        <p className="dm-muted">Action notes describe the intended workflow. Custom playbooks evaluate stored decisions and plan eligible accounts; verified destination activation requires the separately approved Marketo skill and dedicated static list mapping below.</p>
        {customLoadError && <p role="alert" className="dm-notice dm-notice-warning">{customLoadError} <button className="dm-button dm-button-secondary" onClick={loadCustomPlaybooks}>Retry playbooks</button></p>}
        {!customLoadError && !customPlaybooks.length && (
          <div className="dm-empty flex flex-wrap items-center justify-between gap-3">
            <span>No custom playbooks saved yet. Create a playbook to evaluate stored decisions and inspect which accounts qualify.</span>
            {canEdit && (
              <button type="button" className="dm-button dm-button-secondary" onClick={() => setIsModalOpen(true)}>
                <Plus size={14} /> Create playbook
              </button>
            )}
          </div>
        )}
        <div className="dm-recipe-grid">{customPlaybooks.map((cpb) => <article key={cpb.id} className="dm-recipe dm-custom-rule">
          <div className="dm-section-heading"><span className="dm-badge">{cpb.is_active ? 'Enabled rule' : 'Paused rule'}</span><span className="dm-badge">Plan &amp; preview · {friendly(cpb.lane)}</span></div>
          <h3>{cpb.name}</h3><p>{cpb.description}</p>
          <dl className="dm-rule-facts"><div><dt>Progress probability</dt><dd>{cpb.noul_operator} {Math.round(cpb.noul_threshold * 100)}%</dd></div><div><dt>Minimum fit / intent</dt><dd>{cpb.min_fit} / {cpb.min_intent}</dd></div><div><dt>Action note</dt><dd>{cpb.action}</dd></div></dl>
          <div className="dm-playbook-actions"><button className="dm-button dm-button-secondary" aria-expanded={expandedCustomId === cpb.id} onClick={() => setExpandedCustomId(expandedCustomId === cpb.id ? null : cpb.id)}>{expandedCustomId === cpb.id ? <ChevronUp size={15}/> : <ChevronDown size={15}/>} {cpb.matched_units_count ?? 0} qualifying demand units</button>
          <button className="dm-button dm-button-secondary" disabled={!canEdit || customBusy !== null} onClick={() => handleToggleCustom(cpb.id)}>{cpb.is_active ? 'Pause' : 'Enable'}</button><button className="dm-button dm-button-secondary" disabled={!canEdit || customBusy !== null} onClick={() => handleDeleteCustom(cpb.id)} aria-label={`Delete rule ${cpb.name}`}><Trash2 size={15}/></button></div>
          {expandedCustomId === cpb.id && <div className="dm-match-list">{cpb.matched_units?.length ? cpb.matched_units.map((m) => <div key={m.demand_unit_key}><strong>{m.account_domain}</strong><span>{friendly(m.need_key)} · {Math.round(m.noul_score * 100)}% progress · score {m.composite_score}</span></div>) : <p>No demand units meet this rule with a current, supported Decision evaluation.</p>}</div>}
        </article>)}</div>
      </section>

      <details className="dm-panel dm-setup"><summary>How Marketo runs the play <span>Lists, filters, and campaign flows</span></summary>
        <div className="dm-recipe-grid">
          <article className="dm-recipe"><h3>1. Static list · who enters</h3><p>Dual Motion adds eligible, consented contacts to the auto-managed list. Event, content, and pricing plays also require matching activity for that person. It removes them when consent, segment eligibility, or the chosen play changes. A list update itself does not send an email.</p></article>
          <article className="dm-recipe"><h3>2. Smart List · who qualifies</h3><p>Marketo evaluates filters such as Member of List, lifecycle status, and consent. Membership is computed from those rules; there is no direct add-to-Smart-List action.</p></article>
          <article className="dm-recipe"><h3>3. Smart Campaign · what happens</h3><p>Configure and activate an approved campaign in Marketo using Added to List or a scheduled Member of List filter. Its flow can send nurture, update program status, or alert an owner. Set qualification rules to prevent repeated sends.</p></article>
        </div><p className="dm-footnote">Program membership is separate from list membership. Campaign flows and Smart List rules must be configured in Marketo. Direct campaign execution and program enrollment are not implied by the list worker.</p>
      </details>

      {/* Unified Marketo Static-List Activation Workflow (Skill + Mapped List + Evidence + Blockers + Latest Readback) */}
      <section id="dm-automation-setup" className="dm-panel dm-setup space-y-5" aria-labelledby="pb-marketo-activation-title">
        <div className="dm-section-heading">
          <div>
            <h2 id="pb-marketo-activation-title">Marketo static-list activation</h2>
            <p className="dm-muted">
              Verify the Adobe MCP skill and tools, map the selected play’s dedicated static list,
              inspect available evidence and blocked reasons, and confirm provider readback in one
              workflow.
            </p>
          </div>
          <span className={marketoWriteVerified && mappingSaved ? 'dm-badge dm-badge-ready' : 'dm-badge'}>
            {activationCapabilityLabel}
          </span>
        </div>

        {/* Step A: Executing skill & verified Adobe MCP connection */}
        <PlaybookSkillPanel
          embedded
          refreshKey={refreshVersion}
          onApproved={() => setRefreshVersion(value => value + 1)}
          onNavigateTab={onNavigateTab}
        />

        {/* Step B: Selected play & mapped static list */}
        <div className="dm-playbook-grid">
          <div className="dm-selector m-0 flex-col items-stretch">
            <label className="w-full">Playbook scope
              <select value={playCode} disabled={busy !== null} onChange={(event) => { setPlayCode(event.target.value); setConfig(null); setListId(''); }}>
                <option value="*">General marketing audience (all eligible plays)</option>
                {plan.playbook_library?.map((recipe) => (
                  <option key={recipe.code} value={recipe.code}>
                    {recipe.name} ({recipe.mapping.enabled ? 'Active' : recipe.mapping.marketo_list_id ? 'Paused' : 'Unmapped'})
                  </option>
                ))}
              </select>
            </label>
            <p className="dm-footnote mt-1">
              Selected play: <strong>{selectedPlayName}</strong> · Need: <strong>{plan.need_key.replace('_', ' ')}</strong> · Stage: <strong>{plan.stage}</strong>
            </p>
          </div>
          <div className="dm-selector m-0 flex-col items-stretch">
            <label>Marketo static list ID
              <input className="pb-list-input" inputMode="numeric" list="pb-list-options" placeholder="e.g. 1001"
                value={listId} disabled={!canEdit || busy !== null || configLoading || Boolean(config?.marketo_list_id)}
                onChange={event => {setListId(event.target.value); setResult(null);}}/>
              <datalist id="pb-list-options">{lists.map(list => <option key={list.id} value={list.id}>{list.name}</option>)}</datalist>
            </label>
            <p className="dm-footnote mt-1">
              Mapped list: <strong>{currentListId ? `#${currentListId}` : 'None mapped'}</strong> · Pending action: <strong className="capitalize">{plan.action}</strong>
            </p>
          </div>
        </div>

        {/* Step C: Available evidence & latest readback summary */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-[#e2e8f0] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#0f172a]">Available evidence</h3>
              <span className="text-xs font-medium text-[#64748b]">
                {trace?.sample_account ? 'Synthetic sample account' : `${trace?.signal_count ?? 0} recorded signals`}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 border-y border-[#f1f5f9] py-2.5 text-xs tabular-nums">
              <div>
                <dt className="text-[#64748b]">Known contacts</dt>
                <dd className="mt-0.5 text-sm font-semibold text-[#0f172a]">{plan.candidate_contacts}</dd>
              </div>
              <div>
                <dt className="text-[#64748b]">{plan.action === 'remove' ? 'Removal candidates' : 'Eligible contacts'}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-[#0f172a]">{plan.eligible_contacts}</dd>
              </div>
              <div>
                <dt className="text-[#64748b]">Consent exclusions</dt>
                <dd className="mt-0.5 text-sm font-semibold text-[#0f172a]">{plan.excluded_for_consent}</dd>
              </div>
            </dl>
            {plan.evidence.length > 0 ? (
              <ul className="mt-2.5 space-y-1 text-xs text-[#475569]">
                {plan.evidence.slice(0, 4).map((item, idx) => (
                  <li key={idx}>• {item}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2.5 text-xs text-[#64748b]">No scored evidence summary recorded for this play yet.</p>
            )}
          </div>

          <div className="rounded-lg border border-[#e2e8f0] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#0f172a]">Latest readback</h3>
              <a href="#playbook-runs" className="text-xs font-semibold text-[#1d4ed8] hover:underline">
                Full history ↓
              </a>
            </div>
            {latestRun ? (
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs tabular-nums">
                <div>
                  <dt className="text-[#64748b]">Recorded at</dt>
                  <dd className="mt-0.5 font-medium text-[#0f172a]">{date(latestRun.completed_at)}</dd>
                </div>
                <div>
                  <dt className="text-[#64748b]">Destination &amp; transport</dt>
                  <dd className="mt-0.5 font-medium text-[#0f172a]">
                    List #{latestRun.marketo_list_id} · {latestRun.transport === 'mcp' ? `Adobe MCP (${latestRun.skill_digest?.slice(7, 19) || 'skill recorded'})` : 'Existing adapter'}
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748b]">Provider status</dt>
                  <dd className="mt-0.5 font-semibold capitalize text-[#0f172a]">
                    {latestRun.status?.replaceAll('_', ' ') || 'Recorded'} ({latestRun.action})
                  </dd>
                </div>
                <div>
                  <dt className="text-[#64748b]">Confirmed / Unverified</dt>
                  <dd className="mt-0.5 font-medium text-[#0f172a]">
                    {latestRun.applied_count} confirmed ({latestRun.added_count ?? '—'} added · {latestRun.removed_count ?? '—'} removed) · {Math.max(latestRun.requested_count - latestRun.applied_count, latestRun.skipped_count)} unverified
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-[#64748b]">
                No provider readback recorded for this demand unit yet. A plan preview or
                recommendation is not a confirmed Marketo write.
              </p>
            )}
          </div>
        </div>

        {/* Step D: Blocked reasons */}
        {plan.blockers.length > 0 && (
          <div role="status" className="dm-notice dm-notice-warning">
            <strong>Blocked reasons ({plan.blockers.length})</strong>
            <ul>
              {plan.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Step E: Owner-only activation controls */}
        <div className="dm-actions flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] pt-4">
          <div className="flex items-center gap-2 text-[13px] text-[#475569]">
            <CheckCircle2 size={16} className={config?.enabled && !plan.blockers.length ? 'text-[#15803d]' : 'text-[#b45309]'} />
            <span>Delivery status: <strong className={config?.enabled && !plan.blockers.length ? 'text-[#15803d]' : 'text-[#b45309]'}>{delivery}</strong></span>
          </div>
          <div className="pb-mapping-buttons">
            {!mappingSaved && <button className="dm-button dm-button-primary" onClick={() => saveMapping(false)}
              disabled={!canEdit || !validListId || !plan.delivery_connection_ready || busy !== null || configLoading}>Save list mapping</button>}
            {config?.enabled ? (
              <button className="dm-button dm-button-secondary" onClick={() => saveMapping(false)} disabled={!canEdit || busy !== null || configLoading}>Pause delivery</button>
            ) : mappingSaved && plan.mode === 'local' && (
              <button className="dm-button dm-button-primary" onClick={() => saveMapping(true)}
                disabled={!canEdit || !plan.delivery_connection_ready || busy !== null || configLoading}>Enable automatic delivery</button>
            )}
            <button className="dm-button dm-button-secondary" onClick={apply} disabled={!canEdit || !mappingSaved || !plan.can_apply || busy !== null || previewLoading || configLoading}>
              <Send size={13} className={busy === 'apply' ? 'animate-spin' : ''}/>
              {busy === 'apply' ? 'Applying…' : `Apply ${plan.action} once`}
            </button>
          </div>
        </div>
      </section>

      <PlaybookRunHistory demandUnitKey={selectedKey} refreshKey={refreshVersion} onLatestRun={setLatestRun} />
      <details className="dm-panel dm-setup">
        <summary>Provider destinations <span>Verified write vs plan &amp; preview availability</span></summary>
        <div className="dm-provider-list">{plan.providers.map((provider) => {
          const capLabel = provider.status === 'ready'
            ? 'Verified write capability'
            : provider.status === 'blocked'
              ? 'Write blocked'
              : 'Plan & preview only';
          return <div key={provider.id}>
            <div><strong>{provider.name}</strong><p>{provider.detail}</p></div>
            <span className={provider.status === 'ready' ? 'dm-badge dm-badge-ready' : 'dm-badge'}>{capLabel}</span>
          </div>;
        })}</div>
      </details>
    </>}
    {!plan && (
      <PlaybookSkillPanel
        refreshKey={refreshVersion}
        onApproved={() => setRefreshVersion(value => value + 1)}
        onNavigateTab={onNavigateTab}
      />
    )}
    <details className="dm-panel dm-setup"><summary>Browse Marketo assets <span>{assets ? `${assets.counts.programs} programs · ${assets.counts.smart_campaigns} campaigns · ${assets.counts.smart_lists} smart lists` : assetError ? 'Catalog unavailable' : 'Loading catalog…'}</span></summary>{assetError ? <p role="alert" className="dm-muted">{assetError}</p> : <MarketoAssetCatalog assets={assets} query={assetQuery} onQuery={setAssetQuery}/>}</details>
    {!selectedKey && <div className="dm-panel dm-empty">Select a demand unit to inspect its evidence and Marketo static-list activation.</div>}

    {isModalOpen && <dialog ref={dialogRef} className="dm-playbook-dialog" aria-labelledby="dm-rule-title" onCancel={() => setIsModalOpen(false)}>
      <div className="dm-section-heading"><div><h2 id="dm-rule-title">Create playbook</h2></div><button type="button" className="dm-button dm-button-secondary" aria-label="Close create playbook" onClick={() => setIsModalOpen(false)}><X size={18}/></button></div>
      <p className="dm-muted">This playbook evaluates stored decisions and plans eligible accounts. Verified destination activation uses the separately approved Marketo skill and dedicated list mapping.</p>
      <form onSubmit={handleCreateCustom} className="dm-rule-form">
        {customError && <p role="alert" className="dm-notice dm-notice-warning">{customError}</p>}
        <label>Playbook name<input required autoFocus maxLength={200} value={formName} onChange={(e) => setFormName(e.target.value)}/></label>
        <label>Purpose<textarea rows={2} value={formDescription} onChange={(e) => setFormDescription(e.target.value)}/></label>
        <div className="dm-rule-columns"><label>Operating lane<select value={formLane} onChange={(e) => setFormLane(e.target.value)}><option value="SALES_LANE">Sales follow-up</option><option value="MARKETING_LANE">Marketing nurture</option><option value="HOLD">Hold</option></select></label><label>Response target<select value={formSlaHours} onChange={(e) => setFormSlaHours(Number(e.target.value))}>{[4,12,24,48].map((hours) => <option key={hours} value={hours}>{hours} hours</option>)}</select></label></div>
        <label>Action note<input required value={formAction} onChange={(e) => setFormAction(e.target.value)}/><small>Describes the planned workflow; verified destination activation uses the separately approved Marketo skill and dedicated list mapping.</small></label>
        <fieldset><legend><Layers size={16}/> Entry criteria</legend><p className="dm-muted">Current automated evaluation, matching lane, and coverage above zero are always required. Missing or expired judgments never qualify.</p>
          <div className="dm-rule-columns"><label>Progression estimate<select value={formNoulQuestion} onChange={(e) => setFormNoulQuestion(e.target.value)}><option value="progress">Stage progression probability</option></select></label><label>Condition<select value={formNoulOperator} onChange={(e) => setFormNoulOperator(e.target.value)}><option value=">=">At least</option><option value="<=">At most</option></select></label></div>
          <label>Progress threshold <strong>{Math.round(formNoulThreshold * 100)}%</strong><input type="range" min={0} max={1} step={0.05} value={formNoulThreshold} onChange={(e) => setFormNoulThreshold(Number(e.target.value))}/></label>
          <div className="dm-rule-columns"><label>Minimum fit <strong>{formMinFit} / 100</strong><input type="range" min={0} max={100} step={5} value={formMinFit} onChange={(e) => setFormMinFit(Number(e.target.value))}/></label><label>Minimum intent <strong>{formMinIntent} / 100</strong><input type="range" min={0} max={100} step={5} value={formMinIntent} onChange={(e) => setFormMinIntent(Number(e.target.value))}/></label></div>
        </fieldset>
        <div className="dm-match-preview" aria-live="polite"><h3>{matching ? 'Checking stored decisions…' : matchError ? 'Preview unavailable' : `${previewMatches.length} qualifying demand units`}</h3>{matchError ? <p role="alert">{matchError}</p> : <div className="dm-match-list">{previewMatches.map((m) => <div key={m.demand_unit_key}><strong>{m.account_domain}</strong><span>{friendly(m.need_key)} · {Math.round(m.noul_score * 100)}% progress</span></div>)}{!matching && !previewMatches.length && <p>No current decisions meet all criteria. This preview uses the same server-side checks as saved playbooks.</p>}</div>}</div>
        <div className="dm-playbook-actions dm-dialog-footer"><button type="button" className="dm-button dm-button-secondary" onClick={() => setIsModalOpen(false)}>Cancel</button><button type="submit" className="dm-button dm-button-primary" disabled={!canEdit || isSavingCustom}>{isSavingCustom ? 'Saving…' : 'Save playbook'}</button></div>
      </form>
    </dialog>}

  </div>;
};

function matches(asset: MarketoPlaybookAsset, query: string) {
  const haystack = `${asset.name} ${asset.folder || ''} ${asset.type || ''} ${asset.status || ''}`.toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function MarketoAssetCatalog({ assets, query, onQuery }: { assets: MarketoPlaybookAssets | null; query: string; onQuery: (value: string) => void }) {
  const columns: Array<{ title: string; rows: MarketoPlaybookAsset[]; detail: (row: MarketoPlaybookAsset) => string }> = [
    { title: 'Programs', rows: assets?.programs || [], detail: (row) => [row.type, row.status, row.folder].filter(Boolean).join(' · ') },
    { title: 'Smart campaigns', rows: assets?.smart_campaigns || [], detail: (row) => [row.is_active ? 'Active' : row.status, row.smart_list_id ? `Smart list ${row.smart_list_id}` : ''].filter(Boolean).join(' · ') },
    { title: 'Smart lists', rows: assets?.smart_lists || [], detail: (row) => row.folder || 'No folder' },
  ];
  return <section className="dm-asset-catalog">
    <div className="dm-section-heading"><div><h3>Marketo playbook catalog</h3><p className="dm-muted">{assets ? `${assets.counts.programs} programs · ${assets.counts.smart_campaigns} campaigns · ${assets.counts.smart_lists} smart lists` : 'Loading catalog…'}</p></div><input value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Filter by name" aria-label="Filter Marketo assets" /></div>
    <div className="dm-recipe-grid">{columns.map((column) => {
      const rows = column.rows.filter((row) => matches(row, query));
      return <section key={column.title} className="dm-asset-column"><h4>{column.title} <span>{rows.length}</span></h4><ul>{rows.map((row) => <li key={row.id}><strong>{row.name}</strong><span>{column.detail(row)} · #{row.id}</span></li>)}{assets && !rows.length && <li>No matching assets.</li>}</ul></section>;
    })}</div>
  </section>;
}
