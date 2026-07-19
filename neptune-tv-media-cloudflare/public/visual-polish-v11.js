(() => {
  'use strict';

  const FINAL_THOUGHT = '« Je veux être plus visible. Mais je veux pas devenir quelqu’un d’autre pour y arriver. »';
  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    document.documentElement.dataset.visualPolish = 'v11';
    const home = document.body.matches('[data-home-structure="conversion-voice-v10"]');
    const emissions = location.pathname.replace(/\/+$/, '/') === '/emissions/';

    if (home) {
      applyHomepagePolish();
      window.addEventListener('neptune:catalog-ready', applyHomepagePolish);
      const observer = new MutationObserver(applyHomepagePolish);
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
      window.setTimeout(() => observer.disconnect(), 12000);
    }

    if (emissions) normalizeEmissionsFilters();
  });

  function applyHomepagePolish() {
    cleanHomepage();
    restoreFinalThought();
    curateHero();
  }

  function cleanHomepage() {
    document.querySelectorAll('.media-discovery,.catalog-tools,#livrables').forEach((element) => element.remove());
  }

  function restoreFinalThought() {
    const thought = document.querySelector('.voice-final .inner-voice-hook');
    if (thought && thought.textContent.trim() !== FINAL_THOUGHT) thought.textContent = FINAL_THOUGHT;
  }

  function curateHero() {
    const card = document.querySelector('#dynamicCatalog [data-episode-id], #dynamicCatalog [data-video-src]');
    const hero = document.querySelector('#heroPlay');
    const video = document.querySelector('#heroPreview');
    const source = document.querySelector('#heroPreviewSource');
    const title = document.querySelector('#heroEpisodeTitle');
    const motion = document.querySelector('#heroMotionToggle');
    if (!card || !hero || hero.dataset.visualCurated === (card.dataset.episodeId || card.dataset.videoTitle)) return;

    const image = card.querySelector('img');
    const heading = card.querySelector('h3');
    const cardTitle = heading?.textContent?.trim() || card.dataset.videoTitle || 'Émission Neptune Media';
    const poster = image?.currentSrc || image?.src || card.dataset.videoPoster || '';

    if (video) {
      video.pause();
      if (poster) video.poster = poster;
      video.removeAttribute('autoplay');
    }
    if (source) {
      source.removeAttribute('src');
      source.removeAttribute('data-src');
    }
    video?.load();
    if (motion) motion.hidden = true;
    if (title) title.textContent = cardTitle;

    hero.dataset.visualCurated = card.dataset.episodeId || card.dataset.videoTitle || cardTitle;
    hero.dataset.videoPoster = poster;
    hero.dataset.videoTitle = cardTitle;
    hero.onclick = (event) => {
      event.preventDefault();
      card.click();
    };
  }

  function normalizeEmissionsFilters() {
    const apply = () => {
      document.querySelectorAll('.catalogue-page > .program-pills').forEach((element) => element.remove());
      const panel = document.querySelector('.seo-search-panel');
      if (!panel) return false;
      document.body.dataset.emissionsSearchEnhanced = '1';
      return true;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10000);
  }
})();
