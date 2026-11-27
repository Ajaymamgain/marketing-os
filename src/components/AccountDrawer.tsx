import React from 'react';
import { X, ArrowRight, Users, Activity } from 'lucide-react';
import { AccountDemandUnit, AutomationPlaybook } from '../types';
import { JevDecisionCard } from './JevDecisionCard';
import { EnrichmentEvidence } from './EnrichmentEvidence';
import { fetchJevDecision } from '../services/api';
interface Props { account: AccountDemandUnit | null; onClose: () => void; playbooks: AutomationPlaybook[]; onTriggerPlaybook: (playbookId: string, accountName: string) => void; }
export const AccountDrawer: React.FC<Props> = ({ account, onClose, playbooks, onTriggerPlaybook }) => {
  const [liveDecision,setLiveDecision] = React.useState<AccountDemandUnit['jevDecision'] | null>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const closeRef = React.useRef(onClose); closeRef.current=onClose;
  React.useEffect(() => {
    let active=true; setLiveDecision(account?.jevDecision || null);
    if(account?.id && !account.jevDecision) fetchJevDecision(account.id).then((decision)=>{if(active)setLiveDecision(decision);});
    return ()=>{active=false;};
  },[account?.id,account?.jevDecision]);
  React.useEffect(() => {
    if(!account?.id)return;
    const previous=document.activeElement as HTMLElement | null; const panel=panelRef.current; panel?.focus();
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();closeRef.current();}
      if(event.key!=='Tab'||!panel)return;
      const controls=Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), [tabindex="0"]')).filter((el)=>el.getClientRects().length>0);
      const first=controls[0];const last=controls.at(-1);
      if(!first){event.preventDefault();panel.focus();}
      else if(event.shiftKey&&(document.activeElement===first||document.activeElement===panel)){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    document.addEventListener('keydown',keydown);
    return ()=>{document.removeEventListener('keydown',keydown);previous?.focus();};
  },[account?.id]);
  if(!account)return null;
  const scoredAt=account.scoreAudit?.lastScoredAt;
  return <div className="fixed inset-0 z-50 flex justify-end bg-[#0f172a]/40 backdrop-blur-sm" onClick={(event)=>{if(event.target===event.currentTarget)onClose();}}>
    <div ref={panelRef} role="dialog" aria-modal="true" aria-label={`Demand unit: ${account.accountName}`} tabIndex={-1} className="w-full max-w-2xl bg-white h-full flex flex-col shadow-2xl outline-none">
      <header className="flex justify-between items-start gap-4 p-6 border-b border-[#e3e9f2]"><div className="min-w-0"><p className="dm-eyebrow">DEMAND UNIT</p><h2 className="text-xl font-semibold mt-2">{account.accountName}</h2><p className="dm-caption mt-1 break-words">{account.domain} · {account.solutionTarget}</p></div><button className="dm-button !p-3" aria-label="Close demand unit details" onClick={onClose}><X size={20}/></button></header>
      <div className="min-h-0 overflow-y-auto p-6 space-y-6">
        <section className="grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f2f5fc] p-4"><p className="dm-caption">Composite score</p><strong className="text-3xl block mt-2">{account.compositeScore}<span className="text-sm font-normal text-[#65748b]"> / 100</span></strong></div><div className="rounded-xl bg-[#f2f5fc] p-4"><p className="dm-caption">Current lane</p><strong className="text-lg block mt-2 capitalize">{(account.scoreAudit?.routingState || 'HOLD').replaceAll('_',' ').toLowerCase()}</strong><p className="dm-caption mt-1 capitalize">{account.stage.replaceAll('_',' ')}</p></div></section>
        <section><h3 className="font-semibold">Recorded scoring components</h3><p className="dm-caption mt-1">Policy combines fit, intent and supported coverage. Automated evaluation selects the next eligible action.</p><div className="space-y-4 mt-5">{[
          ['Account fit',account.scoreAudit?.fit ?? account.scores.firmographicFit],
          ['Decayed activity intent',account.scoreAudit?.intent ?? account.scores.intentSurge],
          ['Supported buying-group coverage',account.scoreAudit?.coverage ?? account.committee.coverageScore],
        ].map(([label,value])=><div key={String(label)}><div className="flex justify-between text-sm"><span>{label}</span><strong>{Number(value).toFixed(1)} / 100</strong></div><div className="h-2 bg-[#e9eef7] rounded-full mt-2"><div className="h-full bg-[#2457d6] rounded-full" style={{width:`${Number(value)}%`}}/></div></div>)}</div></section>
        <JevDecisionCard jevDecision={liveDecision || account.jevDecision}/>
        <EnrichmentEvidence account={account}/>
        <section><h3 className="font-semibold flex gap-2 items-center"><Users size={18}/>Buying-group evidence</h3><p className="dm-caption mt-2">{account.committee.totalIdentified} identified · {account.committee.members.filter((member)=>member.status==='active').length} coverage-ready · 3 required roles</p>{account.committee.missingRoles.length>0&&<div className="dm-notice dm-notice-warning mt-4">Missing supported roles: {account.committee.missingRoles.map((role)=>role.replaceAll('_',' ')).join(', ')}</div>}<div className="divide-y divide-[#e3e9f2] mt-4">{account.committee.members.map((member)=><div key={member.id} className="py-4"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{member.name}</strong><span className={`dm-badge ${member.status==='active'?'':'dm-badge-amber'}`}>{member.status==='active'?'Counts for coverage':'Not counted'}</span></div><p className="dm-caption mt-1">{member.title}</p><p className="text-sm mt-2 capitalize">{member.role.replaceAll('_',' ')}</p><p className="dm-caption mt-1">{member.keyNotes}</p><p className="dm-caption mt-1">Last engagement: {member.lastSeen && !Number.isNaN(Date.parse(member.lastSeen))?new Date(member.lastSeen).toLocaleString():'Not recorded'}</p></div>)}</div>{!account.committee.members.length&&<p className="dm-empty">No identified people recorded.</p>}</section>
        <div className="dm-notice"><Activity size={18} className="shrink-0"/><p>Product usage telemetry and deal value are not connected. Recorded marketing activity contributes to intent.</p></div>
        <section><h3 className="font-semibold">Audience operations playbooks</h3><p className="dm-caption mt-1">Open a playbook to review eligibility and destination mapping.</p><div className="divide-y divide-[#e3e9f2] mt-3">{playbooks.slice(0,3).map((playbook)=><div key={playbook.id} className="py-4"><h4 className="font-medium text-sm">{playbook.title}</h4><p className="dm-caption mt-1">{playbook.description}</p><button className="dm-text-button mt-2" onClick={()=>onTriggerPlaybook(playbook.id,account.accountName)}>Review playbook <ArrowRight size={16}/></button></div>)}</div>{!playbooks.length&&<p className="dm-empty">No playbooks available.</p>}</section>
      </div>
      <footer className="p-4 border-t border-[#e3e9f2] dm-caption">Last scored: {scoredAt && !Number.isNaN(Date.parse(scoredAt))?new Date(scoredAt).toLocaleString():'Not recorded'}</footer>
    </div>
  </div>;
};
