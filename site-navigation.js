/* Shared website navigation; ordinary links also work on standalone tool pages. */
(() => {
  const isApp = () => typeof setActiveSpace === 'function';
  const views = new Set(['home', 'law', 'glossary', 'progress', 'bank-accreditation', 'contract-review', 'questionnaire-generator', 'questionnaire-fill', 'quotation-writing', 'client-recommendation']);
  const menuButton = document.querySelector('[data-site-menu]');
  const environment = document.querySelector('[data-site-environment]');
  const syncHeader = () => document.body.classList.toggle('site-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', syncHeader, { passive: true });
  syncHeader();
  const closeMenu = () => {
    if (environment) environment.open = false;
    document.body.classList.remove('site-menu-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    menuButton?.setAttribute('aria-label', 'Відкрити меню');
  };
  const jump = (id, focusSearch = false) => requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    if (focusSearch) document.getElementById('scenarioSearch')?.focus({ preventScroll: true });
  });
  function go(space, view = 'home', section = '') {
    closeMenu();
    setActiveSpace(space, view);
    if (section) jump(section, section === 'search');
  }
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-site-environment]') && environment) environment.open = false;
    if (event.target.closest('[data-site-environment] summary') && isApp()) setUtilityMenu(false);
    const menu = event.target.closest('[data-site-menu]');
    if (menu) {
      const open = !document.body.classList.contains('site-menu-open');
      document.body.classList.toggle('site-menu-open', open);
      menu.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
      return;
    }
    if (event.target.closest('.utility-menu-tool')) closeMenu();
    if (event.target.closest('[data-site-top]')) {
      window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      return;
    }
    // Respect open-in-new-tab and normal fallback navigation.
    if (!isApp() || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const home = event.target.closest('[data-site-home]');
    const space = event.target.closest('[data-site-space]');
    const view = event.target.closest('[data-site-view]');
    const browse = event.target.closest('[data-site-browse]');
    const search = event.target.closest('[data-site-search]');
    const scroll = event.target.closest('[data-site-scroll]');
    const slide = event.target.closest('[data-hero-slide]');
    if (home) { event.preventDefault(); go('learning'); }
    else if (space) { event.preventDefault(); go(space.dataset.siteSpace); }
    else if (view && views.has(view.dataset.siteView)) { event.preventDefault(); go(view.dataset.siteView === 'progress' ? 'learning' : 'products', view.dataset.siteView); }
    else if (browse) { event.preventDefault(); go(browse.dataset.siteBrowse, 'home', 'modules'); }
    else if (search) { event.preventDefault(); go('products', 'home', 'search'); }
    else if (scroll) {
      event.preventDefault(); closeMenu();
      if (!document.getElementById(scroll.dataset.siteScroll)) setActiveSpace('learning');
      jump(scroll.dataset.siteScroll);
    }
    else if (slide) { event.preventDefault(); setHomeHeroSlide(Number(slide.dataset.heroSlide)); }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && environment?.open) {
      environment.open = false;
      environment.querySelector('summary').focus();
      return;
    }
    if (event.key === 'Escape' && document.body.classList.contains('site-menu-open')) {
      closeMenu(); menuButton?.focus();
    }
  });
  if (isApp()) {
    const query = new URLSearchParams(location.search);
    const space = query.get('space') === 'products' ? 'products' : 'learning';
    const view = views.has(query.get('view')) ? query.get('view') : 'home';
    const section = ['modules', 'tools', 'search'].includes(query.get('section')) ? query.get('section') : '';
    if (query.has('space') || query.has('view') || section) {
      go(section === 'search' ? 'products' : space, view, section);
      // Query links initialize navigation once, without reapplying on reload.
      const language = query.get('lang');
      const languageQuery = ['uk', 'en'].includes(language) ? '?lang=' + language : '';
      history.replaceState(null, '', location.pathname + languageQuery + location.hash);
    }
  }
})();
