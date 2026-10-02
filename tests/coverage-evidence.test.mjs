import assert from 'node:assert/strict';
import { makePassages, resolveEvidence, finalizeCoverage } from '../lib/coverage-evidence.ts';
const pages=[{file:'Contract “A”.pdf',page:3,text:'Covered components: water pump.\nExclusions: damage from overheating.\nPrior authorization is required.'}];
const passages=makePassages(pages);
const good=finalizeCoverage({status:'Conditional',summary:'Water pump is listed; cause matters.',conditions:'Verify cause and authorization.',evidenceIds:['S1']},passages);
assert.equal(good.status,'Conditional');assert.equal(good.evidence[0].quote,pages[0].text);assert.equal(good.evidence[0].file,pages[0].file);assert.equal(good.evidence[0].page,3);
assert.equal(resolveEvidence(['S1','S1'],passages).evidence.length,1);
assert.equal(finalizeCoverage({status:'Appears covered',evidenceIds:['invented']},passages).status,'Unclear');
assert.equal(finalizeCoverage({status:'Appears covered',evidenceIds:[]},passages).status,'Unclear');
const unclear=finalizeCoverage({status:'Unclear',summary:'Selected plan is missing.',conditions:'Provide declarations.',evidenceIds:[]},passages);
assert.equal(unclear.summary,'Selected plan is missing.');
assert.equal(makePassages([{file:'empty',page:1,text:'  '}]).length,0);
const text=('Unchanged contract line with hyphen-\nated text and “quotes”.\n').repeat(200);
const chunks=makePassages([{file:'long.pdf',page:7,text}]);
const covered=new Uint8Array(text.length);
for(const p of chunks){assert.equal(p.text,text.slice(p.start,p.end));for(let i=p.start;i<p.end;i++)covered[i]=1;}
assert.ok(covered.every(x=>x===1));assert.equal(new Set(chunks.map(p=>p.id)).size,chunks.length);
console.log('PASS: verbatim citations, source metadata, invalid IDs, missing evidence, useful uncertainty, deduplication, and complete page coverage.');
