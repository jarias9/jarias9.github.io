(() => {
  const root = document.documentElement;
  const themeButton = document.querySelector('.theme-toggle');
  const themeLabel = document.querySelector('.theme-label');
  const syncTheme = () => {
    const dark = root.dataset.theme === 'dark';
    themeButton.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
    themeLabel.textContent = dark ? 'Light' : 'Dark';
    document.querySelector('meta[name="theme-color"]').content = dark ? '#152126' : '#f3f0e8';
  };
  themeButton.hidden = false;
  syncTheme();
  themeButton.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('arias-theme', root.dataset.theme); } catch (_) {}
    syncTheme();
  });

  const simulation = document.querySelector('#rotorcraft-video');
  const simulationSwitcher = document.querySelector('.simulation-switcher');
  const simulationViews = [...simulationSwitcher.querySelectorAll('button')];
  simulationSwitcher.hidden = false;
  simulationViews.forEach(button => {
    button.addEventListener('click', () => {
      if (button.getAttribute('aria-pressed') === 'true') return;
      simulation.pause();
      simulation.poster = button.dataset.simulationPoster;
      simulation.src = button.dataset.simulationSrc;
      simulation.setAttribute('aria-label', button.dataset.simulationLabel);
      simulationViews.forEach(view => view.setAttribute('aria-pressed', String(view === button)));
      simulation.load();
    });
  });

  const shareButton = document.querySelector('.share-toggle');
  const dialog = document.querySelector('#share-dialog');
  const copyButton = document.querySelector('.copy-link');
  const status = document.querySelector('.copy-status');
  const canonical = document.querySelector('link[rel="canonical"]').href;
  if (typeof dialog.showModal === 'function') {
    shareButton.hidden = false;
    shareButton.addEventListener('click', () => { status.textContent = ''; dialog.showModal(); });
    dialog.addEventListener('click', event => { if (event.target === dialog) { const box=dialog.getBoundingClientRect(); if(event.clientX<box.left || event.clientX>box.right || event.clientY<box.top || event.clientY>box.bottom) dialog.close(); } });
  }
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(canonical);
      status.textContent = 'Link copied. Ready to share.';
    } catch (_) {
      status.textContent = canonical;
    }
  });
})();
