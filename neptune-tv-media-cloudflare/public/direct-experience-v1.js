(() => {
  function enhanceDirectPage() {
    const page = document.querySelector('.live-page.live-page-immediate');
    if (!page || page.dataset.directEnhanced === 'true') return;
    page.dataset.directEnhanced = 'true';

    const playlist = page.querySelector('.youtube-playlist');
    const heading = playlist?.querySelector('.catalog-section-head');
    const eyebrow = heading?.querySelector('.eyebrow');
    const title = heading?.querySelector('h2');
    const description = heading?.querySelector('p');

    if (heading && eyebrow && title && !heading.querySelector('.direct-heading-copy')) {
      const copy = document.createElement('div');
      copy.className = 'direct-heading-copy';
      heading.insertBefore(copy, eyebrow);
      copy.append(eyebrow, title);
    }

    if (eyebrow) eyebrow.textContent = 'Chaîne officielle';
    if (title) title.textContent = 'Neptune Media en direct';
    if (description) description.textContent = 'La playlist officielle, diffusée directement depuis YouTube.';

    const frame = playlist?.querySelector('.youtube-playlist-frame');
    const iframe = frame?.querySelector('iframe');
    if (iframe) iframe.loading = 'eager';

    if (frame && !frame.nextElementSibling?.classList.contains('direct-player-status')) {
      const status = document.createElement('div');
      status.className = 'direct-player-status';
      status.setAttribute('aria-label', 'Statut du programme');
      status.innerHTML = '<span class="direct-live-pill"><i aria-hidden="true"></i>À l\'antenne</span><strong>Playlist officielle Neptune Media</strong><a href="/emissions/">Toutes les émissions</a>';
      frame.after(status);
    }

    const related = page.querySelector('.related');
    const relatedEyebrow = related?.querySelector(':scope > .eyebrow');
    const relatedTitle = related?.querySelector(':scope > h2');
    if (relatedEyebrow) relatedEyebrow.textContent = 'Programme';
    if (relatedTitle) relatedTitle.textContent = 'À suivre';

    if (related && !related.querySelector('.direct-all-link')) {
      const link = document.createElement('a');
      link.className = 'direct-all-link';
      link.href = '/emissions/';
      link.textContent = 'Tout voir';
      related.append(link);
    }

    page.querySelectorAll('.seo-card-media img').forEach((image) => {
      const useFallback = () => {
        if (image.dataset.fallbackApplied === 'true') return;
        image.dataset.fallbackApplied = 'true';
        image.src = '/assets/posters/poster-neptune-media.webp';
      };
      image.addEventListener('error', useFallback, { once: true });
      if (image.complete && image.naturalWidth === 0) useFallback();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceDirectPage, { once: true });
  } else {
    enhanceDirectPage();
  }
})();
