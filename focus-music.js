/* Native audio stays outside #screen and survives navigation between app views. */
(() => {
  'use strict';
  if (document.querySelector('[data-focus-music]')) return;
  const audioUrl = new URL('./assets/audio/dream-culture-kevin-macleod.mp3', document.currentScript.src).href;
  const copy = {
    uk: {start: 'Увімкнути музику', stop: 'Вимкнути музику', loading: 'Завантаження музики…',
      volume: 'Гучність музики', error: 'Не вдалося завантажити музику. Перевірте з’єднання та спробуйте ще раз.'},
    en: {start: 'Play focus music', stop: 'Stop music', loading: 'Loading music…',
      volume: 'Music volume', error: 'Could not load music. Check your connection and try again.'}
  };
  const root = document.createElement('aside');
  root.className = 'focus-music';
  root.dataset.focusMusic = '';
  root.setAttribute('translate', 'no');
  const audio = document.createElement('audio');
  audio.preload = 'none';
  audio.loop = true;
  audio.hidden = true;
  audio.volume = .25;
  try {
    const saved = localStorage.getItem('anodos-focus-volume');
    if (saved !== null && Number.isFinite(Number(saved))) audio.volume = Math.max(0, Math.min(1, Number(saved)));
  } catch { /* Browser storage is optional. */ }
  const floating = createControls();
  root.append(audio, floating);
  document.body.append(root);
  let wanted = false, loading = false, failed = false, generation = 0, loadingTimer;
  const language = () => document.documentElement.lang === 'en' ? 'en' : 'uk';

  function createControls() {
    const group = document.createElement('div');
    group.className = 'focus-music-controls';
    group.setAttribute('translate', 'no');
    group.innerHTML = '<button class="focus-music-button" type="button" aria-pressed="false"><span class="focus-music-symbol" aria-hidden="true"></span></button><input class="focus-music-volume" type="range" min="0" max="100" step="1" hidden><span class="focus-music-error" role="status" hidden></span>';
    group.querySelector('button').addEventListener('click', () => wanted ? stop() : start());
    group.querySelector('input').addEventListener('input', event => {
      audio.volume = Number(event.target.value) / 100;
      try { localStorage.setItem('anodos-focus-volume', String(audio.volume)); } catch { /* Optional. */ }
      paint();
    });
    return group;
  }
  function paintGroup(group) {
    const text = copy[language()];
    const button = group.querySelector('button');
    button.setAttribute('aria-pressed', String(wanted));
    button.setAttribute('aria-label', wanted ? text.stop : text.start);
    button.setAttribute('aria-busy', String(loading));
    button.title = loading ? text.loading : wanted ? text.stop : text.start;
    const volume = group.querySelector('input');
    volume.hidden = !wanted;
    volume.value = String(Math.round(audio.volume * 100));
    volume.setAttribute('aria-label', text.volume);
    volume.title = text.volume;
    const status = group.querySelector('[role="status"]');
    status.hidden = !failed;
    const error = failed ? text.error : '';
    if (status.textContent !== error) status.textContent = error;
  }
  function syncHome() {
    const controls = document.querySelector('.spotlight-video-controls');
    if (!controls) return;
    const zone = controls.closest('.home-feature-zone');
    if (zone && zone.firstElementChild !== controls) zone.prepend(controls);
    let group = controls.querySelector('[data-focus-music-home]');
    if (!group) {
      group = createControls();
      group.dataset.focusMusicHome = '';
      controls.prepend(group);
    }
    paintGroup(group);
  }
  function paint() {
    paintGroup(floating);
    syncHome();
  }
  function clearLoading() {
    clearTimeout(loadingTimer);
    loading = false;
  }
  function stop() {
    ++generation;
    wanted = false;
    failed = false;
    clearLoading();
    audio.pause();
    paint();
  }
  function fail() {
    ++generation;
    wanted = false;
    clearLoading();
    audio.pause();
    failed = true;
    paint();
  }
  function start() {
    const attempt = ++generation;
    wanted = true;
    loading = true;
    failed = false;
    // No audio request or playback before the visitor presses the button.
    if (!audio.hasAttribute('src')) audio.src = audioUrl;
    else if (audio.error) audio.load();
    loadingTimer = setTimeout(() => { if (attempt === generation && wanted) fail(); }, 25000);
    paint();
    audio.play().then(() => {
      if (attempt !== generation) return;
      if (!wanted) { audio.pause(); return; }
      clearLoading();
      paint();
    }).catch(() => { if (attempt === generation && wanted) fail(); });
  }
  audio.addEventListener('playing', () => {
    if (!wanted) { audio.pause(); return; }
    clearLoading();
    paint();
  });
  audio.addEventListener('pause', () => {
    if (!audio.paused) return;
    wanted = false;
    clearLoading();
    paint();
  });
  audio.addEventListener('error', fail);
  audio.addEventListener('volumechange', paint);
  window.addEventListener('anodos:languagechange', paint);
  const screen = document.getElementById('screen');
  if (screen) new MutationObserver(syncHome).observe(screen, {childList: true, subtree: true});
  // Attribution accompanies the track without interrupting listening.
  const footer = document.querySelector('.site-footer');
  if (footer) {
    const credit = document.createElement('p');
    credit.className = 'focus-music-credit';
    credit.setAttribute('translate', 'no');
    credit.innerHTML = '♫ <a href="https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1300046" target="_blank" rel="noopener noreferrer">Dream Culture - Kevin MacLeod (incompetech.com)</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>';
    footer.append(credit);
  }
  paint();
})();
