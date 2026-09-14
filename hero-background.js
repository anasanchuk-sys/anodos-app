/* Decorative video only. No request is made when reduced motion is enabled. */
(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  let motionEnabled = !connection?.saveData;
  const initialized = new WeakSet();
  const scenes = ['city', 'crosswalk', 'bird', 'bridge', 'forest',
    'sea', 'meadow', 'clouds', 'mountains', 'rain'];
  // Pick once per page load, keeping the same scene when the app redraws home.
  // Avoid an immediate repeat on refresh when session storage is available.
  let previousScene;
  try { previousScene = sessionStorage.getItem('anodos-hero-scene'); } catch (_) { /* Storage can be disabled. */ }
  const candidates = scenes.filter((scene) => scene !== previousScene);
  const selectedScene = candidates[Math.floor(Math.random() * candidates.length)];
  try { sessionStorage.setItem('anodos-hero-scene', selectedScene); } catch (_) { /* Random selection still works. */ }

  function sync() {
    document.querySelectorAll('[data-hero-video]').forEach((video) => {
      const hero = video.closest('.editorial-hero');
      const toggle = hero.querySelector('.hero-motion-toggle');
      if (!initialized.has(video)) {
        initialized.add(video);
        video.dataset.scene = selectedScene;
        video.dataset.src = `./assets/backgrounds/anodos-${selectedScene}.mp4?v=2`;
        video.poster = `./assets/backgrounds/anodos-${selectedScene}-poster.jpg?v=2`;
        video.muted = true;
        video.defaultPlaybackRate = 0.35;
        video.playbackRate = 0.35;
        video.addEventListener('error', () => hero.classList.remove('hero-video-ready'));
      }
      toggle.checked = motionEnabled && !reducedMotion.matches;
      if (!toggle.checked || document.hidden) {
        video.pause();
        return;
      }
      if (!video.getAttribute('src')) video.src = video.dataset.src;
      if (!video.paused) return;
      video.play().then(() => {
        // A pending autoplay promise must not override a user's pause.
        if (!motionEnabled || reducedMotion.matches || document.hidden || !video.isConnected) {
          video.pause();
          return;
        }
        hero.classList.add('hero-video-ready');
      }).catch(() => {
        if (!video.isConnected || !motionEnabled || document.hidden || reducedMotion.matches) return;
        // Keep the poster and allow an explicit tap to retry autoplay.
        toggle.checked = false;
        motionEnabled = false;
      });
    });
  }

  document.addEventListener('change', (event) => {
    if (!event.target.matches('.hero-motion-toggle')) return;
    motionEnabled = event.target.checked;
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  reducedMotion.addEventListener('change', sync);
  // The application replaces the home markup when switching spaces/routes.
  const screen = document.getElementById('screen');
  if (screen) new MutationObserver(sync).observe(screen, { childList: true, subtree: true });
  sync();
})();
