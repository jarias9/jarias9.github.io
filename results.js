(() => {
  'use strict';

  function enhanceResults(section) {
    if (section.hasAttribute('data-results-enhanced')) return;

    const track = section.querySelector('.results-track');
    const viewport = section.querySelector('.results-window');
    const controls = section.querySelector('.results-controls');
    const previous = section.querySelector('[data-results-prev]');
    const next = section.querySelector('[data-results-next]');
    const count = section.querySelector('[data-results-count]');
    const status = section.querySelector('[data-results-status]');
    const pages = track ? Array.from(track.children).filter((page) => page.classList.contains('results-page')) : [];

    if (!viewport || !controls || !previous || !next || !count || pages.length < 2) return;

    let current = 0;
    let gesture = null;

    function updatePageAccess() {
      pages.forEach((page, index) => {
        const inactive = index !== current;
        page.toggleAttribute('inert', inactive);
        if (inactive) page.setAttribute('aria-hidden', 'true');
        else page.removeAttribute('aria-hidden');
      });
    }

    function render(announce) {
      track.style.setProperty('--results-offset', `${-current * 100}%`);
      count.textContent = `${current + 1} / ${pages.length}`;
      previous.setAttribute('aria-disabled', String(current === 0));
      next.setAttribute('aria-disabled', String(current === pages.length - 1));
      updatePageAccess();

      if (announce && status) {
        const label = pages[current].getAttribute('aria-label');
        status.textContent = `Highlights ${current + 1} of ${pages.length}${label ? `: ${label}` : ''}.`;
      }
    }

    function goTo(index) {
      const target = Math.max(0, Math.min(index, pages.length - 1));
      if (target === current) return;

      // Preserve focus if a future result card contains a link or another control.
      if (pages[current].contains(document.activeElement)) {
        (target > current ? next : previous).focus({ preventScroll: true });
      }

      current = target;
      render(true);
    }

    previous.type = 'button';
    next.type = 'button';
    if (!previous.hasAttribute('aria-label')) previous.setAttribute('aria-label', 'Previous highlights');
    if (!next.hasAttribute('aria-label')) next.setAttribute('aria-label', 'Next highlights');
    if (status) status.setAttribute('aria-atomic', 'true');

    previous.addEventListener('click', () => goTo(current - 1));
    next.addEventListener('click', () => goTo(current + 1));

    // Arrow keys belong to these controls only; page scrolling is unaffected elsewhere.
    controls.addEventListener('keydown', (event) => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (event.target !== previous && event.target !== next) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      goTo(current + (event.key === 'ArrowRight' ? 1 : -1));
    });

    // Touch swipes supplement the visible buttons. Mouse text selection stays native.
    viewport.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'touch') return;
      if (!event.isPrimary) {
        gesture = null;
        return;
      }
      if (event.target.closest('a, button, input, select, textarea, [contenteditable="true"]')) return;

      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
      viewport.setPointerCapture(event.pointerId);
    });

    viewport.addEventListener('pointerup', (event) => {
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      gesture = null;

      if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(dy) * 1.35) {
        goTo(current + (dx < 0 ? 1 : -1));
      }
    });

    viewport.addEventListener('pointercancel', () => { gesture = null; });
    viewport.addEventListener('lostpointercapture', () => { gesture = null; });

    // Print exposes both pages visually and in the printable accessibility tree.
    window.addEventListener('beforeprint', () => {
      pages.forEach((page) => {
        page.removeAttribute('inert');
        page.removeAttribute('aria-hidden');
      });
    });
    window.addEventListener('afterprint', updatePageAccess);

    render(false);
    section.setAttribute('data-results-enhanced', '');
    controls.hidden = false;
  }

  function initialize() {
    document.querySelectorAll('[data-results]').forEach(enhanceResults);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
