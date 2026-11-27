import { useState } from 'react';
import { BookOpen, CheckCircle2 } from 'lucide-react';

export type InstructionProfile = { role_name: string; instructions: string; revision: number; updated_at: string | null };
type Draft = { workflow: string; role_name: string; instructions: string; revision: number };
const abilities: Record<string, string> = {
  'sync-investigation': 'Inspect recorded delivery outcomes, classify errors and prepare a repair plan.',
  'customer-onboarding': 'Analyze imported-data quality, unresolved issues and scoring progress.',
  'company-enrichment': 'Search company sources, extract supporting passages and prepare cited fact candidates for review.',
  'people-enrichment': 'Search and extract public professional names and titles for eligible companies, preserving identity uncertainty.',
  'configuration-analysis': 'Analyze score distribution and preview a validated configuration draft.',
};

export function OperationsInstructions({ workflow, label, profile, owner, light, expanded = false, save }: {
  workflow: string; label: string; profile: InstructionProfile; owner: boolean; light: boolean; expanded?: boolean;
  save: (body: Draft) => Promise<InstructionProfile>;
}) {
  const [draft, setDraft] = useState<InstructionProfile>(profile);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const current = dirty ? draft : profile;
  const field = `mt-2 block w-full rounded-lg border px-3 py-2.5 text-sm ${light ? 'border-slate-300 bg-white text-slate-950' : 'border-slate-600 bg-slate-950 text-slate-100'}`;
  function edit(change: Partial<InstructionProfile>) { setDraft({ ...current, ...change }); setDirty(true); setMessage(''); }
  const Container = expanded ? 'section' : 'details';
  const Heading = expanded ? 'h3' : 'summary';
  return <Container className={`auto-instructions mt-5 rounded-lg border p-4 ${light ? 'border-slate-200' : 'border-slate-700'}`}>
    <Heading className="text-sm font-semibold"><BookOpen className="mr-2 inline h-4 w-4 text-blue-500" />Job instructions · {label}</Heading>
    <p className="mt-3 text-sm leading-6">{abilities[workflow]} Add your company’s priorities, review criteria and preferred report format. Instructions apply to both manual jobs and enabled automatic workflows.</p>
    <form className="mt-4 space-y-4" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setMessage('');
      try { const next = await save({ workflow, role_name: current.role_name, instructions: current.instructions, revision: current.revision }); setDraft(next); setDirty(false); setMessage(`Saved version ${next.revision}. New jobs will use these instructions.`); }
      catch (error) { setMessage(error instanceof Error ? error.message : 'Instructions could not save.'); }
      finally { setBusy(false); }
    }}>
      <label className="block text-sm font-medium">Role name<input className={field} value={current.role_name} maxLength={80} required disabled={!owner || busy} onChange={event => edit({ role_name: event.target.value })} /></label>
      <label className="block text-sm font-medium">Job instructions<textarea className={`${field} min-h-36 leading-6`} value={current.instructions} maxLength={4000} disabled={!owner || busy} placeholder="Prioritize missing company industry evidence. Prefer official sources. Explain conflicts with existing data, cite every finding and summarize the next review step in five bullets." onChange={event => edit({ instructions: event.target.value })} /></label>
      <p className={`text-xs leading-5 ${light ? 'text-slate-600' : 'text-slate-300'}`}>{current.instructions.length}/4,000 characters · Saved version {profile.revision}. Keep credentials and raw customer records out of instructions. New tools and permissions require a developer-reviewed skill; prompts cannot enable provider writes, unrestricted code or score changes.</p>
      <div className="flex flex-wrap gap-3"><button type="submit" className="dm-button dm-button-primary" disabled={!owner || busy || !dirty || !current.role_name.trim()}>{busy ? 'Saving…' : 'Save instructions'}</button><button type="button" className="dm-button dm-button-secondary" disabled={busy || !dirty} onClick={() => { setDirty(false); setMessage(''); }}>Discard changes</button></div>
      <p className="text-xs leading-5">Saving cancels active jobs for this workflow so older instructions cannot continue running.</p>
      {message && <p role="status" className="flex items-start gap-2 text-sm"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />{message}</p>}
    </form>
  </Container>;
}
