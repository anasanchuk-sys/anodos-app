/* One discovery card per visit; published articles plus available Anodos tools. */
(function(scope) {
  'use strict';
  function pickNext(items, history = {}, random = Math.random) {
    let remaining = Array.isArray(history.remaining) ? history.remaining.filter(id => items.some(item => item.id === id)) : [];
    if (!remaining.length) remaining = items.map(item => item.id);
    let candidates = items.filter(item => remaining.includes(item.id) && item.id !== history.last);
    if (!candidates.length) candidates = items.filter(item => item.id !== history.last);
    if (!candidates.length) candidates = items;
    const alternate = candidates.filter(item => item.kind !== history.kind);
    if (alternate.length) candidates = alternate;
    const item = candidates[Math.floor(random() * candidates.length)];
    return {item, history:{remaining:remaining.filter(id => id !== item.id),last:item.id,kind:item.kind}};
  }
  function articleCards(data) {
    return (Array.isArray(data?.articles) ? data.articles : []).filter(item => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) && typeof item.title === 'string' && typeof item.summary === 'string').map(item => ({id:'article:'+item.slug,kind:'article',title:item.title,copy:item.summary,category:item.category,href:'./articles/'+item.slug+'.html'}));
  }
  if (typeof module !== 'undefined' && module.exports) {module.exports = {pickNext,articleCards}; return;}
  const features = [
    {id:'quality',title:'Що приховано в умовах договору?',titleEn:'What is in the policy wording?',copy:'Отримайте оцінку договору та PDF-висновок, щоб підготуватися до розмови зі страховиком.',copyEn:'Get a policy assessment and PDF report to prepare for a conversation with your insurer.',href:'./contract-quality.html'},
    {id:'gps',title:'Від адреси до точної точки на карті',titleEn:'From an address to a point on the map',copy:'Знайдіть координати об’єкта й скопіюйте їх для страхового запиту.',copyEn:'Find a property’s coordinates and copy them into your insurance enquiry.',href:'./geocode.html'},
    {id:'banks',title:'Які страховики акредитовані в банку?',titleEn:'Which insurers does the bank accept?',copy:'Перевірте акредитацію, коли готуєте страхування заставного майна.',copyEn:'Check accreditation when arranging cover for pledged property.',view:'bank-accreditation'},
    {id:'documents',title:'Ваші документи - під рукою',titleEn:'Your documents, close at hand',copy:'Знайдіть збережені опитувальники, котирування та висновки в архіві цього браузера.',copyEn:'Find saved questionnaires, quotations and reports in this browser’s document library.',view:'documents'},
    {id:'glossary',title:'Складний термін? Знайдіть пояснення',titleEn:'An unfamiliar term? Find an explanation',copy:'Страховий словник допоможе розібратися в професійних поняттях та умовах покриття.',copyEn:'Use the insurance glossary to understand professional terminology and coverage conditions.',view:'glossary'},
    {id:'learning',title:'Наступний крок у вашій експертизі',titleEn:'Take the next step in your expertise',copy:'Навчальні модулі, практичні матеріали й тести допоможуть систематизувати знання.',copyEn:'Learning modules, practical materials and tests help organise your knowledge.',href:'./?space=learning&section=modules',browse:'learning'},
    {id:'contacts',title:'Знайдіть потрібну людину в компанії',titleEn:'Find the right person at a company',copy:'Пошук контактів осіб, які ухвалюють рішення, із джерелами для перевірки.',copyEn:'Find decision makers’ contacts, with sources you can verify.',href:'./contacts.html',pro:true},
    {id:'osint',title:'Побачте бізнес за назвою компанії',titleEn:'Understand the business behind a company name',copy:'Дослідіть бізнес, власність та активи компанії за допомогою OSINT-аналітики.',copyEn:'Explore a company’s business, ownership and assets with OSINT analysis.',href:'./osint.html',pro:true}
  ].filter(item => !item.pro).map(item => ({...item,kind:'feature',href:item.href || './?space=products&view='+item.view}));
  const key='anodos-spotlight-history-v1';
  let current, pool=features, closed=false, history={};
  try {history=JSON.parse(sessionStorage.getItem(key)||'{}')||{};} catch (_) {}
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),3000);
  const ready=fetch('./insurance-news-data.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then(data=>{pool=[...features,...articleCards(data)];}).catch(()=>{}).finally(()=>{clearTimeout(timeout);advance();});
  function advance() {const chosen=pickNext(pool,history);current=chosen.item;history=chosen.history;try {sessionStorage.setItem(key,JSON.stringify(history));} catch (_) {}}
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const en=()=>document.documentElement.lang==='en';
  const t=(uk,english)=>en()?english:uk;
  function paint(stage) {
    if(!stage.isConnected)return;
    const card=stage.querySelector('[data-spotlight-card]'), restore=stage.querySelector('[data-spotlight-restore]');
    card.hidden=closed;restore.hidden=!closed;
    restore.textContent=t('Показати картку','Show card');
    stage.querySelector('[data-spotlight-close]').setAttribute('aria-label',t('Закрити картку й переглядати відео','Close card to view the video'));
    stage.querySelector('[data-spotlight-next]').textContent=t('Наступне →','Next →');
    stage.querySelector('[data-spotlight-hint]').textContent=t('Відкривайте Anodos','Discover Anodos');
    if(!current)return;
    card.dataset.cardId=current.id;
    card.dataset.kind=current.kind;
    const article=current.kind==='article';
    const label=article?t('Страховий огляд · Стаття','Insurance review · Article'):t('Можливості Anodos','Explore Anodos');
    const attrs=current.view?`data-site-view="${current.view}"`:current.browse?`data-site-browse="${current.browse}"`:'';
    const title=en()&&!article?current.titleEn:current.title,copy=en()&&!article?current.copyEn:current.copy;
    stage.querySelector('[data-hero-content]').innerHTML=`<p class="hero-category">${label}${current.pro?' <span class="spotlight-pro">ANODOS PRO</span>':''}</p><h1 id="homeHeroTitle" ${article?'lang="uk"':''}>${escape(title)}</h1><p class="home-hero-copy" ${article?'lang="uk"':''}>${escape(copy)}</p><div class="home-hero-actions"><a class="site-button" href="${escape(current.href)}" ${attrs}>${article?t('Читати статтю','Read article'):t('Відкрити','Open')} <span aria-hidden="true">↗</span></a></div>`;
  }
  function mount(stage) {
    const close=stage.querySelector('[data-spotlight-close]'),restore=stage.querySelector('[data-spotlight-restore]');
    close.addEventListener('click',()=>{closed=true;paint(stage);restore.focus({preventScroll:true});});
    restore.addEventListener('click',()=>{closed=false;paint(stage);close.focus({preventScroll:true});});
    stage.querySelector('[data-spotlight-next]').addEventListener('click',async()=>{await ready;if(!stage.isConnected)return;advance();paint(stage);});
    paint(stage);ready.then(()=>paint(stage));
  }
  new MutationObserver(()=>{const stage=document.querySelector('.home-stage');if(stage?.querySelector('[data-spotlight-card]'))paint(stage);}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
  scope.AnodosSpotlight={mount};
})(typeof window==='undefined'?globalThis:window);
