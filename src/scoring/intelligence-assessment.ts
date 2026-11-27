export interface AssessmentScore {fit:number;intent:number;coverage:number;composite:number;fit_evidence_fraction:number}
export function assessAccount(score?:AssessmentScore){
  if(!score||score.fit_evidence_fraction<=0)return {band:'unknown',label:'Fit not established',reason:'More sourced firmographic evidence is needed to evaluate this account.',readiness:'Not established',next:'Complete the account profile'} as const;
  const fit=score.fit;
  const band=fit>=80?'strong':fit>=60?'moderate':fit>=40?'limited':'low';
  const label=band==='strong'?'Strong ICP fit':band==='moderate'?'Moderate ICP fit':band==='limited'?'Limited ICP fit':'Low ICP fit';
  const reason=band==='strong'?'The available firmographics align with your current target-account rules.':band==='moderate'?'The available firmographics partly match your current target-account rules.':'The available firmographics have limited alignment with your current target-account rules.';
  const readiness=score.intent<=0&&score.coverage<=0?'Research only':score.coverage<=0?'Coverage missing':score.intent<=0?'Engagement missing':'Review operating gates';
  const next=score.fit_evidence_fraction<.6?'Validate missing fit inputs':score.intent<=0?'Connect first-party activity':score.coverage<=0?'Verify buying-group coverage':'Review policy and destination eligibility';
  return {band,label,reason,readiness,next};
}
