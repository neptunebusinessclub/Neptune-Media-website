const bridge = window.NeptuneUpgrade;
if (bridge) {
  const { catalog, nativeFetch, sendTrack, bookingUrl } = bridge;
  let currentEpisode = null;
  const modal = document.querySelector('[data-video-modal]');
  const frame = modal?.querySelector('.modal-frame');
  const video = frame?.querySelector('video');
  if (modal && frame && video) {
    const details = document.createElement('div');
    details.className = 'modal-details';
    details.innerHTML = `<div><span class="modal-program"></span><h2 class="modal-title-full">Extrait Neptune Media</h2><p class="modal-description"></p></div><div class="modal-actions"><button type="button" class="modal-share">Partager</button><a class="modal-page-link" href="/emissions/">Voir l’émission</a><a class="modal-book-link" href="${bookingUrl()}">Passer à l’écran</a></div>`;
    frame.append(details);

    document.addEventListener('click', (event) => {
      const card = event.target.closest('[data-episode-id]');
      if (card) currentEpisode = catalog.episodes.find((item) => item.id === card.dataset.episodeId) || currentEpisode;
      if (event.target.closest('#heroPlay')) currentEpisode = catalog.episodes.find((item) => item.id === document.querySelector('#heroPlay')?.dataset.episodeId) || catalog.episodes[0];
      if (currentEpisode) updateDetails();
    }, { capture: true });

    details.querySelector('.modal-share').addEventListener('click', async () => {
      const url = currentEpisode ? `${location.origin}/emissions/${currentEpisode.slug}/` : location.href;
      const data = { title: currentEpisode?.title || document.title, url };
      if (navigator.share) await navigator.share(data).catch(() => {});
      else await navigator.clipboard.writeText(url).catch(() => {});
      if (currentEpisode) sendTrack('share', currentEpisode.id);
    });

    const adLink = document.createElement('a');
    adLink.className = 'upgrade-ad-click';
    adLink.hidden = true;
    adLink.target = '_blank';
    adLink.rel = 'noopener sponsored';
    adLink.textContent = 'Découvrir l’annonceur';
    frame.append(adLink);

    const banner = document.createElement('a');
    banner.className = 'upgrade-banner';
    banner.hidden = true;
    banner.target = '_blank';
    banner.rel = 'noopener sponsored';
    banner.innerHTML = '<img alt="Publicité">';
    frame.append(banner);

    new MutationObserver(() => { if (modal.classList.contains('is-open')) updateDetails(); }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    video.addEventListener('loadedmetadata', refreshAds);
    video.addEventListener('play', refreshAds);

    function updateDetails() {
      if (!currentEpisode) return;
      details.querySelector('.modal-program').textContent = catalog.programs.find((item) => item.id === currentEpisode.programId)?.name || 'Neptune Media';
      details.querySelector('.modal-title-full').textContent = currentEpisode.title;
      details.querySelector('.modal-description').textContent = currentEpisode.description || '';
      details.querySelector('.modal-page-link').href = `/emissions/${encodeURIComponent(currentEpisode.slug)}/`;
      details.querySelector('.modal-book-link').href = bookingUrl(currentEpisode);
    }

    function refreshAds() {
      const src = absolute(video.currentSrc || video.src);
      const activeAd = (catalog.ads || []).find((item) => absolute(item.assetUrl) === src);
      adLink.hidden = !activeAd?.clickUrl;
      if (activeAd?.clickUrl) {
        adLink.href = activeAd.clickUrl;
        adLink.onclick = () => trackAd('click', activeAd.id);
      }
      const contentPlaying = currentEpisode && absolute(currentEpisode.videoUrl) === src;
      const bannerAd = contentPlaying ? (catalog.ads || []).find((item) => item.placement === 'banner' && item.assetUrl && item.active !== false) : null;
      banner.hidden = !bannerAd;
      if (bannerAd) {
        banner.href = bannerAd.clickUrl || '#';
        banner.querySelector('img').src = bannerAd.assetUrl;
        banner.onclick = () => trackAd('click', bannerAd.id);
      }
    }

    async function trackAd(event, adId) {
      const sessionId = localStorage.getItem('neptune_media_session') || crypto.randomUUID();
      localStorage.setItem('neptune_media_session', sessionId);
      await nativeFetch('/api/ad-track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ event, adId, episodeId: currentEpisode?.id || '', sessionId }) }).catch(() => {});
    }
    function absolute(value) { try { return new URL(value, location.origin).toString(); } catch { return ''; } }
  }
}
