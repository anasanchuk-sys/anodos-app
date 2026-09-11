import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const data = fs.readFileSync(new URL('../glossary-data.js', import.meta.url), 'utf8');
const ctx = vm.createContext({window:{}, console});
vm.runInContext(data, ctx);
const {terms, sources, groups} = ctx.window.AnodosGlossary;
const ids = new Set(terms.map(t => t.id));
assert.equal(ids.size, terms.length, 'IDs must be unique');
assert.equal(new Set(terms.map(t => t.term)).size, terms.length, 'Headwords must be unique');
for (const term of terms) {
  assert.ok(groups.includes(term.group));
  assert.ok(term.english && term.definition && term.practice);
  for (const id of term.related) assert.ok(ids.has(id), `${term.id}: broken relation ${id}`);
  for (const id of term.sourceIds) {
    assert.ok(sources[id], `${term.id}: unknown source ${id}`);
    assert.match(sources[id].url, /^(https:\/\/|#munich$)/);
  }
  assert.ok(term.sourceIds.length);
}
vm.runInContext(`const glossaryTerms=window.AnodosGlossary.terms; let glossarySearchTerm=''; let glossaryGroup=''; let activeGlossaryTermId='';\n` +
  app.slice(app.indexOf('function normalizeSemanticText('), app.indexOf('function splitSearchTerms(')) +
  app.slice(app.indexOf('function glossaryTermLabel('), app.indexOf('function setActiveGlossaryTerm(')), ctx);
const search = (q, group='') => {
  ctx.query=q;ctx.group=group;
  return vm.runInContext('glossarySearchTerm=query; glossaryGroup=group; filteredGlossaryTerms().map(r=>r.item.id)',ctx);
};
for (const [query,id] of [
  ['BI','business-interruption'],['SI','sum-insured'],['PML','pml'],['EML','eml'],['CAR','car'],['EAR','ear'],
  ['All risks','all-risks'],['all-risks','all-risks'],['coinsurance','coinsurance'],
  ['співстрахування','co-insurance'],['франшиза','deductible'],['безумовна','absolute-deductible'],
  ['ТМЦ','stock'],['валовий прибуток','gross-profit'],['SOV','statement-of-values'],
  ['відключення електроенергії','utilities'],['страхова сума','sum-insured']
]) assert.equal(search(query)[0],`glossary-${id}`,`Top match for ${query}`);
assert.equal(search('zzzzqwerty').length,0);
assert.equal(search('PML','Перерва в діяльності').length,0);
for (const group of groups) assert.equal(search('',group).length,terms.filter(t=>t.group===group).length);
for (const t of terms) assert.equal(search(t.term)[0], t.id, `Exact headword: ${t.term}`);
const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const sw=fs.readFileSync(new URL('../sw.js',import.meta.url),'utf8');
assert.ok(html.indexOf('glossary-data.js')<html.indexOf('./app.js'));
for (const asset of ['glossary-data.js?v=1','app.js?v=216','styles.css?v=197']) {assert.ok(html.includes(asset));assert.ok(sw.includes(asset));}
console.log(`Glossary OK: ${terms.length} complete entries, ${groups.length} categories, ${Object.keys(sources).length} source records; exact terms, abbreviations, filtering, references and offline asset manifest verified.`);
