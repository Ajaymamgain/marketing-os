import test from 'node:test';
import assert from 'node:assert/strict';
import {assessAccount} from './intelligence-assessment.ts';
const score={fit:100,intent:0,coverage:0,composite:35,fit_evidence_fraction:.3};
test('high fit is distinct from buying readiness and composite',()=>{const a=assessAccount(score);assert.equal(a.label,'Strong ICP fit');assert.equal(a.readiness,'Research only');assert.equal(a.next,'Validate missing fit inputs')});
test('missing evidence does not become a low attractiveness rating',()=>{assert.equal(assessAccount().band,'unknown');assert.equal(assessAccount({...score,fit_evidence_fraction:0}).band,'unknown')});
test('fit bands expose the underlying fit score rather than inferred intent',()=>{assert.equal(assessAccount({...score,fit:79}).band,'moderate');assert.equal(assessAccount({...score,fit:45}).band,'limited');assert.equal(assessAccount({...score,fit:20}).band,'low')});
