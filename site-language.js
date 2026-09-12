/* Shared, offline UI localisation for the legacy renderers.
 * Match complete, reviewed phrases only. Never rewrite HTML, form values,
 * URLs, uploaded documents, quoted evidence or application data.
 */
(() => {
  'use strict';
  const dictionary = window.AnodosEnglish || {};
  const storageKey = 'anodos-language';
  const supported = value => value === 'en' || value === 'uk';
  const requested = new URLSearchParams(location.search).get('lang');
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch { /* Storage may be disabled. */ }
  let language = supported(requested) ? requested : supported(saved) ? saved : 'uk';
  const originals = new WeakMap();
  const attributes = new WeakMap();
  const translatableAttributes = ['aria-label', 'placeholder', 'title', 'alt'];
  const excluded = 'script, style, noscript, textarea, [contenteditable], [translate="no"], [data-language-switch], blockquote, pre, code';
  const normalize = value => value.replace(/\s+/g, ' ').trim();
  const exact = value => Object.prototype.hasOwnProperty.call(dictionary, value) ? dictionary[value] : value;
  const patterns = [
    [/^(.+): відкрити навчальний модуль$/, (_, name) => `${exact(name)}: open learning module`],
    [/^(.+): відкрити робочі матеріали$/, (_, name) => `${exact(name)}: open work resources`],
    [/^Виконано (\d+\/\d+) тестів · складено (\d+\/\d+)\. Враховано найкращу спробу\.$/, (_, done, passed) => `Attempted ${done} tests · passed ${passed}. Your best attempt is counted.`],
    [/^Виконано (\d+\/\d+) · складено (\d+\/\d+)$/, (_, done, passed) => `Attempted ${done} · passed ${passed}`],
    [/^Загальний результат (\d+) відсотків$/, (_, n) => `Overall score ${n} percent`],
    [/^(\d+) (?:банк|банки|банків) · (\d+) (?:страховик|страховики|страховиків)$/, (_, banks, insurers) => `${banks} banks · ${insurers} insurers`],
    [/^Термінів: (\d+)$/, (_, n) => `Terms: ${n}`],
    [/^Знайдено: (\d+) із (\d+)$/, (_, n, total) => `Found: ${n} of ${total}`],
    [/^(\d+) матеріалів BritMark$/, (_, n) => `${n} BritMark resources`],
    [/^(\d+) (пунктів|джерел|тези|теми|кейсів|питань|тести|файли)$/, (_, n, unit) => `${n} ${{пунктів:'items',джерел:'sources',тези:'key points',теми:'topics',кейсів:'cases',питань:'questions',тести:'tests',файли:'files'}[unit]}`],
    [/^(\d+)% для проходження$/, (_, n) => `${n}% to pass`],
    [/^(\d+) застереження · пошук$/, (_, n) => `${n} clauses · search`],
    [/^Прибрати(?: файл)? (.+)$/, (_, name) => `Remove ${name}`],
    [/^Версія документа (.+)$/, (_, name) => `Document version: ${name}`],
    [/^Тип документа (.+)$/, (_, name) => `Document type: ${name}`],
    [/^([\d.,]+) МБ$/, (_, n) => `${n} MB`]
  ];
  patterns.push([/^(\d+) результатів$/, (_, n) => `${n} results`]);
  patterns.push([/^Інші точки за цією адресою: (\d+)$/, (_, n) => `Other points at this address: ${n}`]);
  patterns.push([/^Пошук завершено\. Знайдено місць: (\d+)\.$/, (_, n) => `Search complete. Places found: ${n}.`]);
  patterns.push([/^(\d+) хв (\d+) с$/, (_, minutes, seconds) => `${minutes} min ${seconds} sec`]);
  patterns.push([/^(\d+) хв$/, (_, minutes) => `${minutes} min`]);
  const searchAliases = [
    [/\b(?:war|missiles?|drones?|shelling|invasion)\b/i, 'воєнні ризики ракета дрон'],
    [/\b(?:property|warehouses?|buildings?|equipment|stock)\b/i, 'майно склад будівля обладнання'],
    [/\bfire\b/i, 'пожежа'], [/\bflood(?:ing)?\b/i, 'затоплення вода'],
    [/\b(?:liability|third.party|damages)\b/i, 'відповідальність шкода третім особам'],
    [/\b(?:cargo|freight|shipment|marine)\b/i, 'вантажі перевезення'],
    [/\b(?:construction|erection|contractor)\b/i, 'будівельно-монтажні ризики підрядник'],
    [/\b(?:deductible|excess)\b/i, 'франшиза'], [/\b(?:exclusion|exclusions)\b/i, 'винятки'],
    [/\b(?:compensation|premium|eca)\b/i, 'компенсація премії ека'],
    [/\b(?:policy|coverage|cover)\b/i, 'договір покриття'],
    [/\b(?:law|regulation)\b/i, 'закон нормативна база'],
    [/\b(?:kharkiv|kharkov)\b/i, 'Харків'], [/\bsumy\b/i, 'Сумська область'],
    [/\bchernihiv\b/i, 'Чернігів'], [/\bkherson\b/i, 'Херсон']
  ];
  const expandQuery = query => [query, ...searchAliases.filter(([pattern]) => pattern.test(query)).map(([, terms]) => terms)].join(' ');
  function translate(value) {
    const key = normalize(value);
    let result = exact(key);
    if (result === key) {
      for (const [pattern, replacement] of patterns) {
        if (pattern.test(key)) { result = key.replace(pattern, replacement); break; }
      }
    }
    if (result === key && key.includes(' · ')) result = key.split(' · ').map(exact).join(' · ');
    return result === key ? value : value.replace(/\S[\s\S]*\S|\S/, result);
  }
  function updateText(node) {
    if (!node.parentElement || node.parentElement.closest(excluded)) return;
    const current = node.nodeValue;
    const record = originals.get(node);
    // A renderer may reuse a text node for a different status or result.
    const source = record && current === record.output ? record.source : current;
    const output = language === 'en' ? translate(source) : source;
    // Native options without a value attribute use their label as the value.
    // Keep the source value that the existing form handlers expect.
    if (output !== current && node.parentElement.matches('option:not([value])')) {
      node.parentElement.setAttribute('value', node.parentElement.textContent);
    }
    if (output !== current) node.nodeValue = output;
    originals.set(node, {source, output});
  }
  function updateAttributes(element) {
    if (element.closest(excluded)) return;
    let records = attributes.get(element);
    if (!records) { records = {}; attributes.set(element, records); }
    for (const name of translatableAttributes) {
      if (!element.hasAttribute(name)) continue;
      const current = element.getAttribute(name), record = records[name];
      const source = record && current === record.output ? record.source : current;
      const output = language === 'en' ? translate(source) : source;
      if (output !== current) element.setAttribute(name, output);
      records[name] = {source, output};
    }
    // An explicit lang parameter also works in a new tab or without storage.
    if (element.matches('a[href]') && !element.hasAttribute('download')) {
      const href = element.getAttribute('href');
      if (href.startsWith('#')) return;
      const url = new URL(href, location.href);
      if (url.origin !== location.origin || !/(?:\/|\.html)$/.test(url.pathname)) return;
      if (language === 'en') url.searchParams.set('lang', 'en');
      else url.searchParams.delete('lang');
      const next = url.pathname + url.search + url.hash;
      if (href !== next) element.setAttribute('href', next);
    }
  }
  function translateTree(root) {
    if (root.nodeType === Node.TEXT_NODE) { updateText(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE || root.closest(excluded)) return;
    updateAttributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.nodeType === Node.ELEMENT_NODE && node.matches(excluded) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.nodeType === Node.TEXT_NODE) updateText(node); else updateAttributes(node);
    }
  }
  const observer = new MutationObserver(records => {
    observer.disconnect();
    const roots = new Set();
    for (const record of records) {
      if (record.type === 'childList') record.addedNodes.forEach(node => roots.add(node));
      else roots.add(record.target);
    }
    roots.forEach(translateTree);
    observe();
  });
  const observe = () => observer.observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:translatableAttributes});
  const originalTitle = document.title;
  const metadata = [...document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"]')].map(element => ({element, source:element.content}));
  function apply() {
    observer.disconnect();
    document.documentElement.lang = language;
    document.title = language === 'en' ? translate(originalTitle) : originalTitle;
    metadata.forEach(({element, source}) => { element.content = language === 'en' ? translate(source) : source; });
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', language === 'en' ? 'en_GB' : 'uk_UA');
    document.querySelectorAll('[data-language-switch]').forEach(control => {
      control.setAttribute('aria-label', language === 'en' ? 'Language' : 'Мова');
      control.querySelectorAll('[data-language]').forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.language === language));
      });
    });
    translateTree(document.body);
    observe();
  }
  function setLanguage(value) {
    if (!supported(value)) return;
    language = value;
    try { localStorage.setItem(storageKey, value); } catch { /* URL retains the choice. */ }
    const url = new URL(location.href);
    url.searchParams.set('lang', value);
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    apply();
    window.dispatchEvent(new CustomEvent('anodos:languagechange', {detail:{language}}));
  }
  window.AnodosLanguage = {get current() { return language; }, setLanguage, expandQuery, translate: value => language === 'en' ? translate(String(value)) : String(value)};
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-language]');
    if (button) setLanguage(button.dataset.language);
  });
  if (supported(requested)) {
    try { localStorage.setItem(storageKey, language); } catch { /* Optional. */ }
  }
  apply();
})();
