import React from 'react';
import { FileCheck2 } from 'lucide-react';
import { AccountDemandUnit } from '../types';
import { inspectDemandUnit, EnrichmentSnapshot, EnrichmentField, CompanyResearchProfile } from '../services/api';

const readable = (value: string) => value.replaceAll('_', ' ');

function InferredField({ label, field }: { label: string; field?: EnrichmentField }) {
  const accepted = field?.status === 'accepted' && field.value;
  return <div className="py-3 border-b border-[#e3e9f2] last:border-0">
    <div className="flex flex-wrap justify-between gap-2 text-sm">
      <span className="text-[#65748b]">{label}</span>
      <strong className="capitalize">{accepted ? readable(field.value!) : 'Unknown'}</strong>
    </div>
    {field && <p className="dm-caption mt-1">{accepted ? `Inferred · ${Math.round(field.confidence * 100)}% model confidence` : 'Evidence did not support an automatic classification'}</p>}
    {accepted && field.source && <p className="dm-caption mt-1 break-words">Source: {readable(field.source.source)} · {field.source.text}</p>}
    {accepted && field.observed_at && !Number.isNaN(Date.parse(field.observed_at)) && <p className="dm-caption mt-1">Source observed: {new Date(field.observed_at).toLocaleDateString()}</p>}
  </div>;
}

const fieldLabels:Record<string,string>={business_description:'Company overview',industry:'Industry',headquarters:'Headquarters',founded:'Founded',company_status:'Company status',employee_count:'Employees',products:'Products & offerings',target_customers:'Target customers',leadership:'Leadership',funding:'Funding & latest round',investors:'Investors',pricing:'Pricing',competitors:'Competitive landscape',partnerships:'Partnerships',market_position:'Market position'};

function CompanyProfile({research}:{research:CompanyResearchProfile}) {
  const profile=research.profile;
  return <div className="mt-5 border-t border-[#e3e9f2] pt-4">
    <h4 className="font-semibold text-sm">Company intelligence & news</h4>
    <p className="dm-caption mt-2">Multi-source research · collected {new Date(research.retrieved_at).toLocaleDateString()}. Candidate findings require review and do not change scores.</p>
    {profile.identity_notes && <p className="dm-caption mt-3">{profile.identity_notes}</p>}
    <div className="mt-4 divide-y divide-[#e3e9f2]">{Object.entries(fieldLabels).map(([key,label])=>{
      const fact=profile.fields[key];
      return <details key={key} className="py-3"><summary className="cursor-pointer text-sm font-medium">{label}{!fact?.value&&<span className="dm-caption ml-2">Not established</span>}</summary><p className="text-sm mt-3 whitespace-pre-wrap">{fact?.value||'No supported answer was found in this research run.'}</p>{fact?.as_of&&<p className="dm-caption mt-2">As of {fact.as_of}</p>}<div className="mt-2 flex flex-wrap gap-3">{fact?.source_urls.map((url,index)=><a className="dm-text-button text-xs" key={url} href={url} target="_blank" rel="noopener noreferrer">Source {index+1}</a>)}</div></details>;
    })}</div>
    <h5 className="font-semibold text-sm mt-6">Recent company news</h5>
    <p className="dm-caption mt-1">Up to five dated articles from the last 180 days. Publication and event dates are shown separately.</p>
    {profile.news.map(article=><article key={article.url} className="border border-[#e3e9f2] rounded-lg p-3 mt-3"><a className="font-medium text-sm text-[#2457d6]" href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a><p className="dm-caption mt-1">{article.publisher} · Published {article.published_at}</p>{article.event_date&&<p className="dm-caption">Event date {article.event_date}</p>}<p className="text-sm mt-2">{article.summary}</p><p className="dm-caption mt-2">{article.relevance}</p></article>)}
    {!profile.news.length&&<p className="dm-caption mt-3">No qualifying dated news was established in this run.</p>}
    {!!profile.gaps.length&&<details className="mt-5"><summary className="cursor-pointer text-sm font-medium">Research gaps ({profile.gaps.length})</summary><ul className="list-disc pl-5 mt-3 space-y-2 dm-caption">{profile.gaps.map(gap=><li key={gap}>{gap}</li>)}</ul></details>}
  </div>;
}

export function EnrichmentEvidence({ account }: { account: AccountDemandUnit }) {
  const [snapshot, setSnapshot] = React.useState<EnrichmentSnapshot | null>(null);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  React.useEffect(() => {
    let active = true;
    setSnapshot(null); setStatus('loading');
    inspectDemandUnit(account.id).then(result => {
      if (active) { setSnapshot(result.enrichment || null); setStatus('ready'); }
    }).catch(() => { if (active) setStatus('error'); });
    const timer=window.setInterval(()=>{
      inspectDemandUnit(account.id).then(result=>{if(active){setSnapshot(result.enrichment||null);setStatus('ready');}}).catch(()=>{});
    },30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [account.id, account.scoreAudit?.lastScoredAt]);
  const people = snapshot?.people || [];
  const observedIndustry = account.industry && !['unknown', 'not available'].includes(account.industry.toLowerCase());
  return <section aria-label="Enrichment evidence">
    <h3 className="font-semibold flex items-center gap-2"><FileCheck2 size={18}/>Enrichment evidence</h3>
    <p className="dm-caption mt-2">Profile classifications support scoring and campaign relevance. Inferences are shown with their source.</p>
    {status === 'loading' && <p role="status" className="dm-caption mt-4">Loading profile evidence…</p>}
    {status === 'error' && <p role="status" className="dm-notice dm-notice-warning mt-4">Profile evidence could not be loaded.</p>}
    {status === 'ready' && <>
      {snapshot?.account?.status === 'unavailable' && <p className="dm-notice dm-notice-warning mt-4">Automatic enrichment is temporarily unavailable. Observed data remains available.</p>}
      {snapshot?.external_research && <div className="mt-4 rounded-xl border border-[#e3e9f2] p-4">
        <h4 className="text-sm font-semibold">Company research · {snapshot.external_research.provider}</h4>
        <p className="dm-caption mt-2">Published funding ranking #{snapshot.external_research.ranking.position} · {snapshot.external_research.ranking.as_of}. Current startup eligibility requires review.</p>
        {snapshot.external_research.quote ? <blockquote className="text-sm mt-3">“{snapshot.external_research.quote}…”</blockquote> : <p className="dm-caption mt-3">No usable official-site passage was collected.</p>}
        {snapshot.external_research.source_url && <a className="dm-text-button mt-3 inline-block" href={snapshot.external_research.source_url} target="_blank" rel="noopener noreferrer">View official source</a>}
        <p className="dm-caption mt-2">Research candidate · not applied to scoring. Findings stay separate from accepted account fields.</p>
        {snapshot.external_research.detailed_profile && <CompanyProfile research={snapshot.external_research.detailed_profile}/>}
        {!snapshot.external_research.detailed_profile && snapshot.external_research.detailed_task && <p role="status" className="dm-caption mt-3">{['queued','running','completed'].includes(snapshot.external_research.detailed_task.status)?'Detailed company research and news are processing. This panel refreshes automatically.':'Detailed research needs attention; available source evidence remains visible.'}</p>}
      </div>}
      <div className="mt-3">
        {observedIndustry ? <div className="py-3 border-b border-[#e3e9f2]"><div className="flex justify-between gap-2 text-sm"><span className="text-[#65748b]">Industry</span><strong>{account.industry}</strong></div><p className="dm-caption mt-1">Observed · imported account record</p></div> : <InferredField label="Inferred industry" field={snapshot?.account?.fields.industry}/>}
        <InferredField label="Suggested business need" field={snapshot?.demand_unit?.fields.business_need}/>
      </div>
      {snapshot?.demand_unit?.status === 'no_data' && <p className="dm-caption mt-2">Need classification requires a configured need catalog and recent activity with identifiable product content.</p>}
      <p className="dm-caption mt-2">A suggested need does not change this demand unit’s assigned need.</p>
      {account.committee.members.map(member => {
        const profile = people.find(p => p.entity_key === `${account.id}|${member.email.toLowerCase()}`);
        return <details key={member.id} className="mt-3 rounded-xl border border-[#e3e9f2] px-4">
          <summary className="cursor-pointer py-3 text-sm font-medium">{member.name}<span className="block dm-caption mt-1">{member.title}</span></summary>
          {profile && profile.status !== 'complete' && <p className="dm-caption mb-3">{({no_data:'A job title is needed to classify this profile.', unavailable:'Automatic classification is temporarily unavailable.', stale:'Profile changed; classification will refresh with scoring.', pending:'Classification will run with scoring.'} as Record<string,string>)[profile.status]}</p>}
          <InferredField label="Department" field={profile?.fields.department}/>
          <InferredField label="Seniority" field={profile?.fields.seniority}/>
          <InferredField label="Persona" field={profile?.fields.persona}/>
        </details>;
      })}
      <p className="dm-caption mt-4">Employee count, revenue and contact details require source data. Company research is separate from accepted profile classifications.</p>
    </>}
  </section>;
}
