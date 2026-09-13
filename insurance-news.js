/* Progressive enhancement: all article text and links are already in the HTML. */
(() => {
  'use strict';
  const form = document.querySelector('[data-news-filters]');
  if (form) {
    const cards = [...document.querySelectorAll('[data-news-card]')];
    const count = document.querySelector('[data-result-count]');
    const empty = document.querySelector('[data-news-empty]');
    const normalize = value => value.normalize('NFKC').toLocaleLowerCase('uk').replace(/[’‘`]/g, "'").trim();
    const input = form.elements.q;
    const topic = form.elements.topic;
    const apply = () => {
      const terms = normalize(input.value).split(/\s+/).filter(Boolean);
      let found = 0;
      for (const card of cards) {
        const tags = JSON.parse(card.dataset.tags);
        const matches = (!topic.value || card.dataset.category === topic.value || tags.includes(topic.value)) && terms.every(term => normalize(card.dataset.search).includes(term));
        card.hidden = !matches;
        if (matches) found++;
      }
      count.textContent = `Матеріалів: ${found}`;
      empty.hidden = found > 0;
      const url = new URL(location.href);
      for (const [key, value] of [['q', input.value.trim()], ['topic', topic.value]]) {
        if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
      }
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    };
    const restore = () => {
      const query = new URLSearchParams(location.search);
      input.value = query.get('q') || '';
      topic.value = query.get('topic') || '';
      if (topic.selectedIndex < 0) topic.value = '';
      apply();
    };
    form.hidden = false;
    form.addEventListener('input', apply);
    form.addEventListener('change', apply);
    form.addEventListener('submit', event => { event.preventDefault(); apply(); });
    form.addEventListener('reset', () => setTimeout(apply, 0));
    window.addEventListener('popstate', restore);
    restore();
  }
  const share = document.querySelector('[data-share]');
  if (share && navigator.clipboard) {
    share.hidden = false;
    share.addEventListener('click', async () => {
      const status = document.querySelector('[data-share-status]');
      try {
        await navigator.clipboard.writeText(document.querySelector('link[rel=canonical]').href);
        status.textContent = 'Посилання скопійовано.';
      } catch { status.textContent = 'Не вдалося скопіювати. Скористайтеся адресою сторінки у браузері.'; }
    });
  }
})();
