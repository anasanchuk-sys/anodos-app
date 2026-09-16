/* Keep the player outside #screen so in-app navigation preserves playback. */
(() => {
  'use strict';
  if (document.querySelector('[data-focus-music]')) return;
  const videoId = 'qwosU7e9mqc';
  const copy = {
    uk: {
      button: 'Музика для концентрації', title: 'Час зосередитися',
      start: 'Увімкнути музику', stop: 'Вимкнути музику',
      subtitle: 'Фонова музика для роботи й навчання',
      close: 'Вимкнути музику й закрити', frame: 'YouTube - музика для концентрації',
      hint: 'Пауза та гучність - у плеєрі. Якщо музика не почалася, натисніть ▶.',
      link: 'Відкрити в YouTube ↗',
      loading: 'Завантаження плеєра…',
      unavailable: 'Плеєр не завантажився. Спробуйте відкрити музику в YouTube за посиланням нижче.',
      offline: 'Для відтворення музики потрібне з’єднання з інтернетом.'
    },
    en: {
      button: 'Focus music', title: 'Time to focus',
      start: 'Play focus music', stop: 'Stop music',
      subtitle: 'Background music for work and learning',
      close: 'Stop music and close', frame: 'YouTube - focus music',
      hint: 'Pause and volume are in the player. If music has not started, press ▶.',
      link: 'Open in YouTube ↗',
      loading: 'Loading player…',
      unavailable: 'The player has not loaded. Try opening the music in YouTube using the link below.',
      offline: 'An internet connection is needed to play music.'
    }
  };
  const root = document.createElement('aside');
  root.className = 'focus-music';
  root.dataset.focusMusic = '';
  // This component handles its own language updates without reloading the iframe.
  root.setAttribute('translate', 'no');
  root.innerHTML = `
    <section class="focus-music-panel" id="focusMusicPanel" aria-labelledby="focusMusicTitle" hidden>
      <div class="focus-music-heading">
        <div><h2 id="focusMusicTitle" data-focus-copy="title"></h2><p data-focus-copy="subtitle"></p></div>
        <button class="focus-music-close" type="button"><span aria-hidden="true">×</span></button>
      </div>
      <div class="focus-music-video"></div>
      <div class="focus-music-details">
        <p class="focus-music-status" role="status" hidden></p>
        <p data-focus-copy="hint"></p>
        <p class="focus-music-offline" role="status" data-focus-copy="offline" hidden></p>
        <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" rel="noopener noreferrer" data-focus-copy="link"></a>
      </div>
    </section>
    <button class="focus-music-toggle" type="button" aria-controls="focusMusicPanel" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14v-3a8 8 0 0 1 16 0v3M4 13h3v7H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2Zm16 0h-3v7h3a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2Z"/></svg>
      <span data-focus-copy="button"></span>
    </button>`;
  document.body.append(root);
  const panel = root.querySelector('.focus-music-panel');
  const toggle = root.querySelector('.focus-music-toggle');
  const close = root.querySelector('.focus-music-close');
  const video = root.querySelector('.focus-music-video');
  const status = root.querySelector('.focus-music-status');
  let loadingTimer;
  let loadingState = '';
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'uk';
  function localize() {
    const text = copy[language()];
    root.setAttribute('aria-label', text.button);
    root.querySelectorAll('[data-focus-copy]').forEach(el => { el.textContent = text[el.dataset.focusCopy]; });
    close.setAttribute('aria-label', text.close);
    toggle.setAttribute('aria-label', panel.hidden ? text.button : text.close);
    const frame = video.querySelector('iframe');
    if (frame) frame.title = text.frame;
    status.hidden = !loadingState;
    status.textContent = text[loadingState] || '';
    syncHomeControl();
  }
  function syncHomeControl() {
    const controls = document.querySelector('.spotlight-video-controls');
    if (!controls) return;
    const zone = controls.closest('.home-feature-zone');
    // Keep music visible above the rotating card, including on a phone.
    if (zone && zone.firstElementChild !== controls) zone.prepend(controls);
    let button = controls.querySelector('[data-focus-music-home]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'focus-music-home';
      button.dataset.focusMusicHome = '';
      button.setAttribute('translate', 'no');
      button.setAttribute('aria-controls', 'focusMusicPanel');
      button.innerHTML = '<span aria-hidden="true">♫</span><span data-focus-home-label></span>';
      button.addEventListener('click', () => panel.hidden ? open() : stop());
      controls.prepend(button);
    }
    const label = copy[language()][panel.hidden ? 'start' : 'stop'];
    const span = button.querySelector('[data-focus-home-label]');
    if (span.textContent !== label) span.textContent = label;
    button.setAttribute('aria-expanded', String(!panel.hidden));
  }
  function updateConnection() {
    root.querySelector('.focus-music-offline').hidden = navigator.onLine;
  }
  function stop() {
    // Removing the browsing context stops audio, including a still-loading embed.
    video.replaceChildren();
    clearTimeout(loadingTimer);
    loadingState = '';
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    localize();
    (document.querySelector('[data-focus-music-home]') || toggle).focus({preventScroll: true});
  }
  function open() {
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    const frame = document.createElement('iframe');
    const url = new URL(`https://www.youtube.com/embed/${videoId}`);
    url.search = new URLSearchParams({autoplay: '1', controls: '1', playsinline: '1',
      loop: '1', playlist: videoId, rel: '0', hl: language()}).toString();
    frame.title = copy[language()].frame;
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.width = '380';
    frame.height = '214';
    loadingState = 'loading';
    frame.addEventListener('load', () => {
      if (!frame.isConnected) return;
      clearTimeout(loadingTimer);
      loadingState = '';
      localize();
    }, {once: true});
    frame.src = url.href;
    video.replaceChildren(frame);
    loadingTimer = setTimeout(() => {
      loadingState = 'unavailable';
      localize();
    }, 15000);
    localize();
    updateConnection();
    close.focus({preventScroll: true});
  }
  toggle.addEventListener('click', () => panel.hidden ? open() : stop());
  close.addEventListener('click', stop);
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); stop(); }
  });
  window.addEventListener('anodos:languagechange', localize);
  window.addEventListener('online', updateConnection);
  window.addEventListener('offline', updateConnection);
  const screen = document.getElementById('screen');
  if (screen) new MutationObserver(syncHomeControl).observe(screen, {childList: true, subtree: true});
  localize();
  updateConnection();
})();
