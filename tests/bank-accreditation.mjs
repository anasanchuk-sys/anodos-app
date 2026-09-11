import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const root = new URL("../", import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), "utf8");
const context = vm.createContext({ window: {} });
vm.runInContext(read("bank-accreditation-data.js"), context);
const data = context.window.AnodosBankAccreditation;
const register = JSON.parse(read("research/bank-register.json"));
assert.equal(data.sourcePolicy, "official-web-only");
assert.equal(data.scope, "property");
assert.equal(data.banks.length, 59);
assert.equal(data.insurers.length, 25);
assert.deepEqual(Array.from(data.banks, b => b.id).sort(), register.banks.map(b => b.id).sort());
assert.equal(new Set(data.banks.map(b => b.id)).size, data.banks.length);
assert.equal(new Set(data.insurers.map(i => i.id)).size, data.insurers.length);
const bank = id => data.banks.find(b => b.id === id);
const ids = new Set(data.insurers.map(i => i.id));
const allowed = new Set([
  "raiffeisen.ua", "sensebank.ua", "oschadbank.ua", "otpbank.com.ua", "credit-agricole.ua",
  "static.privatbank.ua", "creditdnepr.com.ua", "ukrcapital.com.ua", "ukrgasbank.com",
  "procreditbank.com.ua", "eximb.com", "unexbank.ua", "cib.com.ua", "admin.banklviv.ua",
  "kredobank.com.ua", "mtb.ua", "bank.com.ua", "poltavabank.com", "pumb.ua",
  "crystalbank.com.ua", "tascombank.ua", "ukrsibbank.com", "sky.bank", "creditwest.ua",
  "globusbank.com.ua", "ap-bank.com", "accordbank.com.ua", "bank34.ua"
]);
let pairs = 0;
for (const b of data.banks) {
  assert.ok(b.name && b.legalForm && b.brandName);
  assert.equal(b.name, register.banks.find(r => r.id === b.id).name);
  for (const [id, r] of Object.entries(b.insurers)) {
    pairs++;
    assert.ok(ids.has(id));
    assert.equal(r.scope, "property");
    assert.ok(["public", "limited"].includes(r.status));
    assert.ok(r.coverage && r.source);
    const url = new URL(r.url);
    assert.equal(url.protocol, "https:");
    assert.ok(allowed.has(url.hostname.replace(/^www\./, "")), r.url);
    assert.ok(!r.url.includes("insurance-ended-events"));
    if (r.status === "limited") assert.ok(r.note);
  }
}
assert.ok(pairs >= 200);
assert.equal(data.banks.filter(b => Object.keys(b.insurers).length).length, 28);
assert.equal(Object.keys(bank("307123").insurers).length, 0, "Vostok agent listing is not property accreditation");
assert.ok(bank("307123").aliases.includes("Банк Восток"));
assert.equal(bank("322313").insurers.arsenal.status, "limited");
assert.match(bank("322313").insurers.arsenal.note, /Лише переукладення/);
assert.equal(bank("339500").insurers.arx.status, "limited");
assert.ok(!bank("300335").insurers.usg, "Raiffeisen USG motor-only");
assert.ok(!bank("325365").insurers.express, "Kredo Express motor-only");
assert.ok(bank("320478").insurers.express, "UGB explicitly lists Express under property");
assert.ok(bank("300528").insurers.colonnade);
assert.ok(!bank("300465").insurers.cardif, "Mixed property/liability bucket is not sufficient for Cardif collateral");
for (const i of data.insurers) {
  assert.ok(data.banks.some(b => b.insurers[i.id]));
  assert.doesNotMatch(i.name, /ЛАЙФ|Life|МетЛайф|Кардіф/i);
}
const app = read("app.js");
const renderer = app.slice(app.indexOf("function bankAccreditationStatusMeta"), app.indexOf("function renderContractReviewFile"));
for (const s of ["bankAccreditationSearch", "bankAccreditationInsurerSearch", "bankAccreditationConfirmed", "data-insurer-col", "record.coverage"]) assert.ok(renderer.includes(s));
assert.doesNotMatch(renderer, /researchedAt|Оновлено|Перевірено|Як читати таблицю|даних із пошти/);
assert.match(renderer, /публічного підтвердження не знайдено/);
for (const asset of ["app.js", "styles.css", "bank-accreditation-data.js"]) {
  const find = content => content.split('"').find(s => s.startsWith("./" + asset + "?v="));
  assert.equal(find(read("index.html")), find(read("sw.js")));
}
assert.match(read("sw.js"), /platform-shell-v336/);
console.log(`Property matrix OK: ${data.banks.length} banks, ${data.insurers.length} insurers, ${pairs} evidenced pairs, 28 banks with confirmation.`);
