const bridge = window.NeptuneUpgrade;
if (bridge) {
  const { catalog, nativeFetch, sendTrack, bookingUrl } = bridge;
  let currentEpisode = null;
  let midrollShownFor = '';
  const bannerImpressions = new Set();
  const modal = document.querySelector('[data-video-modal]');
  const frame = modal?.querySelector('.modal-frame');
  const video = frame?.querySelector('video');
  if (modal && frame && video) {
    const details = document.createElement('div');
    details.className = 'modal-details';
    details.innerHTML = `<div><span class="modal-program"></span><h2 class="modal-title-full">Extrait Neptune Media</h2><p class="modal-description"></p></div><div class="modal-actions"><button type="button" class="modal-share">Partager</button><a class="modal-page-link" href="/emissions/">Voir l’émission</a><a class="modal-book-link" href="${bookingUrl()}">Passer à l’écran</a></div>`;
    frame.append(details);

    document.addEventListener('click', (event) => {
      const previous = currentEpisode?.id;
      const card = event.target.closest('[data-episode-id]');
      if (card) currentEpisode = catalog.episodes.find((item) => item.id === card.dataset.episodeId) || currentEpisode;
      if (event.target.closest('#heroPlay')) currentEpisode = catalog.episodes.find((item) => item.id === document.querySelector('#heroPlay')?.dataset.episodeId) || catalog.episodes[0];
      if (currentEpisode?.id !== previous) midrollShownFor = '';
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

    const midrollShell = document.createElement('div');
    midrollShell.className = 'upgrade-midroll-shell';
    midrollShell.hidden = true;
    midrollShell.innerHTML = `<span>PUBLICITÉ</span><video controls playsinline></video><a hidden target="_blank" rel="noopener sponsored">Découvrir l’annonceur</a>`;
    frame.append(midrollShell);
    const midrollVideo = midrollShell.querySelector('video');
    const midrollLink = midrollShell.querySelector('a');

    new MutationObserver(() => {
      if (modal.classList.contains('is-open')) updateDetails();
      else closeMidroll(false);
    }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    video.addEventListener('loadedmetadata', refreshAds);
    video.addEventListener('play', refreshAds);
    video.addEventListener('timeupdate', maybeStartMidroll);
    midrollVideo.addEventListener('play', () => {
      const id = midrollVideo.dataset.adId;
      if (id) trackAd('play', id);
    }, { once: false });
    midrollVideo.addEventListener('ended', () => closeMidroll(true));

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
      const bannerAd = contentPlaying ? (catalog.ads || []).find((item) => item.placement === 'banner' && item.assetUrl) : null;
      banner.hidden = !bannerAd;
      if (bannerAd) {
        banner.href = bannerAd.clickUrl || '#';
        banner.querySelector('img').src = bannerAd.assetUrl;
        banner.onclick = () => trackAd('click', bannerAd.id);
        const key = `${currentEpisode.id}:${bannerAd.id}`;
        if (!bannerImpressions.has(key)) {
          bannerImpressions.add(key);
          trackAd('impression', bannerAd.id);
        }
      }
    }

    function maybeStartMidroll() {
      if (!currentEpisode || !video.duration || midrollShownFor === currentEpisode.id || !midrollShell.hidden) return;
      if (absolute(video.currentSrc || video.src) !== absolute(currentEpisode.videoUrl)) return;
      if (video.currentTime / video.duration < .5) return;
      const ad = (catalog.ads || []).find((item) => item.placement === 'midroll' && item.assetUrl);
      if (!ad) return;
      midrollShownFor = currentEpisode.id;
      video.pause();
      midrollVideo.dataset.adId = ad.id;
      midrollVideo.src = ad.assetUrl;
      midrollLink.hidden = !ad.clickUrl;
      if (ad.clickUrl) {
        midrollLink.href = ad.clickUrl;
        midrollLink.onclick = () => trackAd('click', ad.id);
      }
      midrollShell.hidden = false;
      trackAd('impression', ad.id);
      midrollVideo.play().catch(() => {});
    }

    function closeMidroll(completed) {
      if (midrollShell.hidden) return;
      const adId = midrollVideo.dataset.adId;
      if (completed && adId) trackAd('complete', adId);
      midrollVideo.pause();
      midrollVideo.removeAttribute('src');
      midrollVideo.load();
      midrollVideo.dataset.adId = '';
      midrollShell.hidden = true;
      if (completed && modal.classList.contains('is-open')) video.play().catch(() => {});
    }

    async function trackAd(event, adId) {
      const sessionId = localStorage.getItem('neptune_media_session') || crypto.randomUUID();
      localStorage.setItem('neptune_media_session', sessionId);
      await nativeFetch('/api/ad-track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ event, adId, episodeId: currentEpisode?.id || '', sessionId }) }).catch(() => {});
    }
    function absolute(value) { try { return new URL(value, location.origin).toString(); } catch { return ''; } }
  }
}
