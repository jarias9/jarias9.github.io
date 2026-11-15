(() => {
  const figure = document.querySelector('.hero-visual');
  const video = document.querySelector('#hero-source');
  const poster = document.querySelector('.hero-fallback');
  const canvas = document.querySelector('#hero-canvas');
  const button = document.querySelector('.hero-motion');
  const label = button.querySelector('.motion-label');
  const symbol = button.querySelector('.motion-symbol');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  const width = 480;
  const height = 212;
  const frameCanvas = document.createElement('canvas');
  frameCanvas.width = width;
  frameCanvas.height = height;
  const frameContext = frameCanvas.getContext('2d', { alpha: true, willReadFrequently: true, colorSpace: 'srgb' });
  const output = canvas.getContext('2d', { alpha: true, colorSpace: 'srgb' });
  if (!frameContext || !output) return;

  let wantsPlayback = !reducedMotion.matches && !saveData;
  let visible = false;
  let ready = false;
  let started = false;
  let ended = false;
  let pending = false;
  let frameCallback = null;
  let animationFrame = null;
  let lastTime = -1;
  let failed = false;

  // Keep the original colored foreground. Only near-white matte/edge pixels
  // receive alpha; subtract the baked white from partially covered edges.
  // The small fixed buffer bounds work regardless of screen pixel density.
  const paint = source => {
    if (failed || (source === video && video.readyState < 2)) return false;
    try {
      frameContext.clearRect(0, 0, width, height);
      frameContext.drawImage(source, 0, 0, width, height);
      const frame = frameContext.getImageData(0, 0, width, height);
      const pixels = frame.data;
      const limit = width * 208 * 4;
      for (let i = 0; i < limit; i += 4) {
        const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
        const minimum = Math.min(r, g, b);
        if (minimum >= 247) {
          pixels[i + 3] = 0;
        } else if (minimum > 110) {
          const t = (minimum - 110) / 137;
          const alpha = 1 - t * t * (3 - 2 * t);
          const white = 1 - alpha;
          pixels[i] = (r - white * 254) / alpha;
          pixels[i + 1] = (g - white * 252) / alpha;
          pixels[i + 2] = (b - white * 254) / alpha;
          pixels[i + 3] = Math.round(alpha * 255);
        }
      }
      // The last four rows contain only the resampled source rule/padding.
      pixels.fill(0, limit);
      output.putImageData(frame, 0, 0);
      ready = true;
      figure.dataset.ready = 'true';
      return true;
    } catch (_) {
      failed = true;
      wantsPlayback = false;
      video.pause();
      stopFrames();
      button.hidden = true;
      // Keep the last successful cutout, or the original still if none exists.
      return false;
    }
  };
  const syncButton = () => {
    const playing = !video.paused && !ended;
    const action = playing || pending ? 'Pause' : ended ? 'Replay' : started ? 'Resume' : 'Play';
    label.textContent = action;
    symbol.textContent = action === 'Pause' ? 'Ⅱ' : action === 'Replay' ? '↻' : '▷';
    button.setAttribute('aria-label', `${action} hero animation`);
    figure.dataset.state = action.toLowerCase();
  };
  const stopFrames = () => {
    if (frameCallback !== null) video.cancelVideoFrameCallback(frameCallback);
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    frameCallback = animationFrame = null;
  };
  const scheduleFrame = () => {
    if (failed || video.paused || video.ended || !visible || document.hidden) return;
    if (frameCallback !== null || animationFrame !== null) return;
    if ('requestVideoFrameCallback' in video) {
      frameCallback = video.requestVideoFrameCallback(() => {
        frameCallback = null;
        if (video.paused || video.ended || !visible || document.hidden) return;
        if (paint(video)) scheduleFrame();
      });
    } else {
      animationFrame = requestAnimationFrame(() => {
        animationFrame = null;
        if (video.paused || video.ended || !visible || document.hidden) return;
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          if (!paint(video)) return;
        }
        scheduleFrame();
      });
    }
  };
  const reconcilePlayback = () => {
    if (failed || !ready || !visible || document.hidden || !wantsPlayback || ended) {
      video.pause();
      stopFrames();
      syncButton();
      return;
    }
    if (!video.paused || pending) return;
    if (!video.getAttribute('src')) video.src = video.dataset.src;
    pending = true;
    syncButton();
    video.play().then(() => {
      pending = false;
      started = true;
      if (!visible || document.hidden || !wantsPlayback || failed) {
        video.pause();
        stopFrames();
      } else {
        scheduleFrame();
      }
      syncButton();
    }).catch(error => {
      pending = false;
      if (error.name !== 'AbortError') wantsPlayback = false;
      syncButton();
      if (error.name === 'AbortError') reconcilePlayback();
    });
  };

  video.muted = video.defaultMuted = true;
  video.playsInline = true;
  button.addEventListener('click', () => {
    if (!video.paused || pending) {
      wantsPlayback = false;
      video.pause();
      stopFrames();
    } else {
      if (ended) { video.currentTime = 0; ended = false; }
      wantsPlayback = true;
      reconcilePlayback();
    }
    syncButton();
  });
  video.addEventListener('loadeddata', () => paint(video));
  video.addEventListener('playing', () => {
    started = true;
    stopFrames();
    if (paint(video)) scheduleFrame();
    syncButton();
  });
  video.addEventListener('pause', () => { stopFrames(); syncButton(); });
  video.addEventListener('seeked', () => paint(video));
  video.addEventListener('ended', () => {
    ended = true;
    wantsPlayback = false;
    stopFrames();
    paint(video);
    syncButton();
  });
  video.addEventListener('error', () => {
    wantsPlayback = false;
    pending = false;
    stopFrames();
    button.hidden = true;
    if (!failed) paint(poster);
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      reconcilePlayback();
    }, { threshold: .05 }).observe(figure);
  } else { visible = true; }
  document.addEventListener('visibilitychange', reconcilePlayback);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) { wantsPlayback = false; reconcilePlayback(); }
  });
  const preparePoster = () => {
    if (!poster.naturalWidth || started) return;
    if (paint(poster)) {
      button.hidden = false;
      reconcilePlayback();
    }
  };
  if (poster.complete) preparePoster();
  else poster.addEventListener('load', preparePoster, { once: true });
  syncButton();
})();
