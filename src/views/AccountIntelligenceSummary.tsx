import {useEffect, useState} from 'react';
import {ArrowUpRight, Maximize2} from 'lucide-react';
import {CreativeOverview, fetchCreativeOverview, fetchIntelligenceNews, IntelligenceCompany, IntelligenceDetail, IntelligenceNews, PublicAdEvidence} from '../services/api';
import {assessAccount} from '../scoring/intelligence-assessment';
import {CreativeDialog, impressionLabel} from './AdIntelligencePanel';

interface Props {
  company: IntelligenceCompany;
  detail: IntelligenceDetail | null;
  onOpen: (view: 'enrichment' | 'lookalikes' | 'news' | 'ads') => void;
}
const date = (value: string) => new Date(value).toLocaleDateString('en', {month: 'short', day: 'numeric', timeZone: 'UTC'});

export function AccountIntelligenceSummary({company, detail, onOpen}: Props) {
  const [creatives, setCreatives] = useState<CreativeOverview | null>(null);
  const [news, setNews] = useState<IntelligenceNews | null>(null);
  const [creativeError, setCreativeError] = useState(false);
  const [newsError, setNewsError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [preview, setPreview] = useState<PublicAdEvidence | null>(null);
  const score = detail?.score || company.score;
  const assessment = assessAccount(score);
  const fields = detail?.detailed_profile?.profile.fields;

  useEffect(() => {
    let live = true;
    setCreatives(null); setNews(null); setCreativeError(false); setNewsError(false); setPreview(null);
    fetchCreativeOverview({brand: company.domain}).then(v => {if (live) setCreatives(v)}).catch(() => {if (live) setCreativeError(true)});
    fetchIntelligenceNews({domain: company.domain, days: '180', limit: '3'}).then(v => {if (live) setNews(v)}).catch(() => {if (live) setNewsError(true)});
    return () => {live = false};
  }, [company.domain, revision]);

  return <div className="ci-account-overview">
    <section className="ci-account-intro" aria-label="Account profile summary">
      <p>{fields?.business_description?.value || company.overview || detail?.quote || 'Company research has not been collected yet.'}</p>
      <div className="ci-account-facts"><span><small>Industry</small>{fields?.industry?.value || company.industry || 'Not established'}</span><span><small>Headquarters</small>{fields?.headquarters?.value || company.headquarters || 'Not established'}</span><span><small>Research coverage</small>{company.known_fields}/{company.total_fields} fields</span></div>
    </section>
    <section className="ci-account-score" aria-label="Account score summary">
      <div><span>Dual Motion score</span><strong>{score ? score.composite.toFixed(1) : '—'}<small> / 100</small></strong><p>{assessment.label}</p></div>
      {([['fit', 'Account fit'], ['intent', 'Activity intent'], ['coverage', 'Buying-group coverage']] as const).map(([key, label]) => <div key={key}><span>{label}</span><strong>{score ? score[key].toFixed(1) : '—'}</strong><p>{score ? `${Math.round((score.weights?.[key] ?? {fit: .35, intent: .4, coverage: .25}[key]) * 100)}% weight` : 'Awaiting score'}</p></div>)}
      <button className="ci-button" onClick={() => onOpen('enrichment')}>Score evidence<ArrowUpRight size={14}/></button>
    </section>
    <p className="ci-account-readiness">{assessment.readiness} · {assessment.next}</p>
    <section className="ci-account-creatives" aria-label={`${company.name} creative intelligence`}>
      <div className="ci-section-title"><div><h3>Ad creatives</h3><p className="ci-caption">{creatives ? `${creatives.total} visual groups · ${creatives.matching_records} ads with images` : 'Saved images for this account'}</p></div><button className="ci-button" onClick={() => onOpen('ads')}>All ad research<ArrowUpRight size={14}/></button></div>
      {creativeError ? <p className="ci-state" role="alert">Ad research could not load. <button className="ci-button" onClick={() => setRevision(v => v + 1)}>Retry</button></p> : !creatives ? <p className="ci-state" role="status">Loading saved creatives…</p> : !creatives.ads.length ? <div className="ci-account-empty"><p>No ad images collected for {company.name}.</p><button className="ci-button" onClick={() => onOpen('ads')}>Open ad research</button></div> : <div className="ci-account-gallery">{creatives.ads.slice(0, 6).map(ad => {
        const variant = ad.creative?.variants.find(v => v.poster);
        if (!variant?.poster) return null;
        return <article key={`${ad.platform}-${ad.ad_id}`}><button className="ci-account-image" onClick={() => setPreview(ad)} aria-label={`Preview ${company.name} creative`}><img loading="lazy" src={variant.poster} alt={variant.headline || `${company.name} ad creative`}/><span><Maximize2 size={14}/>Preview</span></button><div><span>{ad.platform === 'linkedin' ? 'LinkedIn' : 'Meta'} · {variant.kind}{(ad.group_size || 0) > 1 ? ` · ${ad.group_size} ads` : ''}</span>{ad.impressions && <strong>{impressionLabel(ad.impressions)}<small>{(ad.group_size || 0) > 1 ? ' impressions for one ad' : ' reported impressions'}</small></strong>}</div></article>;
      })}</div>}
    </section>
    <div className="ci-account-context">
      <section aria-label="Recent account news"><div className="ci-section-title"><h3>Recent developments</h3><button className="ci-button" onClick={() => onOpen('news')}>All news<ArrowUpRight size={14}/></button></div>{newsError ? <p role="alert">Company news could not load. <button className="ci-button" onClick={() => setRevision(v => v + 1)}>Retry</button></p> : !news ? <p role="status">Loading saved news…</p> : !news.articles.length ? <p>No dated news collected in the last 180 days.</p> : news.articles.slice(0, 3).map(a => <article key={a.url}><a href={a.url} target="_blank" rel="noopener noreferrer">{a.title}<ArrowUpRight size={13}/></a><span>{a.publisher} · {date(a.published_at)}</span></article>)}</section>
      <section aria-label="Similar accounts"><div className="ci-section-title"><h3>Similar accounts</h3><button className="ci-button" onClick={() => onOpen('lookalikes')}>Compare<ArrowUpRight size={14}/></button></div>{!detail?.lookalikes?.length ? <p>No supported peer matches collected.</p> : detail.lookalikes.slice(0, 3).map(peer => <div className="ci-account-peer" key={peer.domain}><div><strong>{peer.name}</strong><span>{peer.domain}</span></div><span>{peer.similarity.toFixed(1)}<small> / 100 similarity</small></span></div>)}<p className="ci-caption">Similarity describes the business. It does not establish competition or buying intent.</p></section>
    </div>
    {preview && <CreativeDialog ad={preview} onClose={() => setPreview(null)}/>}
  </div>;
}
