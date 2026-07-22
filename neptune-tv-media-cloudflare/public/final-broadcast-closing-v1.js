(() => {
  'use strict';

  const SHOWS = [
    ['1wXefDhQ-hJ7pVfcMqN0lBzVwEwGJWOTt', 'Votre entrepreneuriat mis en lumière'],
    ['1WIv_dedZftlp8zvIL6PDC0AIcuA2PYwT', 'Accident et renaissance'],
    ['1FettXDX4Ta48yR89gKxjJP4DbC4z5XJx', 'Le moment qui change tout'],
  ];

  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    ensureStylesheet();
    mountClosingSection();

    const observer = new MutationObserver(() => mountClosingSection());
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 12000);
  });

  function ensureStylesheet() {
    const href = '/styles/final-broadcast-closing-v1.css?v=1';
    const existing = document.querySelector('link[data-final-broadcast-closing]');
    if (existing) {
      existing.href = href;
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.finalBroadcastClosing = '1';
    document.head.append(link);
  }

  function mountClosingSection() {
    const existing = document.querySelector('.final-broadcast-closing');
    if (existing) {
      initialiseVideos(existing);
      return;
    }

    const target = findCurrentClosingBlock();
    const section = document.createElement('section');
    section.className = 'section final-broadcast-closing';
    section.id = 'passer-antenne';
    section.dataset.aidaStage = 'action';
    section.dataset.finalBroadcastVersion = '1';
    section.innerHTML = `
      <div class="container final-broadcast-closing__inner">
        <header class="final-broadcast-closing__header">
          <span class="final-broadcast-closing__eyebrow">Dernières émissions Neptune Media</span>
          <h2>La prochaine histoire visible peut être la vôtre.</h2>
          <p>Découvrez quelques passages récemment réalisés, puis choisissez le moment où votre expertise prendra enfin l’antenne.</p>
        </header>

        <div class="final-broadcast-closing__shows" aria-label="Dernières émissions réalisées par Neptune Media">
          ${SHOWS.map(([id, title], index) => showCard(id, title, index)).join('')}
        </div>

        <div class="final-broadcast-closing__primary-action">
          <div>
            <span>Votre place est de l’autre côté de la caméra</span>
            <h3>Votre entreprise mérite d’être vue, comprise et retenue.</h3>
          </div>
          <a class="final-broadcast-closing__button final-broadcast-closing__button--primary" href="https://media.neptunebusiness.com/" data-funnel data-track="final_broadcast_booking">
            <span>Je veux passer à l’antenne et gagner en visibilité</span>
            ${arrowIcon()}
          </a>
        </div>

        <div class="final-broadcast-closing__ecosystem">
          <p class="final-broadcast-closing__statement">Neptune Business, c'est l'écosystème d'opportunités à votre service.</p>
          <div class="final-broadcast-closing__network-actions">
            <a class="final-broadcast-closing__button final-broadcast-closing__button--network" href="https://www.neptunebusiness.com/register" data-track="final_join_business_network">
              <span>Rejoindre le réseau d’entreprise</span>
              ${networkIcon()}
            </a>
            <a class="final-broadcast-closing__button final-broadcast-closing__button--club" href="https://www.neptunebusiness.com" data-track="final_discover_business_club">
              <span>Découvrir le club</span>
              ${arrowIcon()}
            </a>
          </div>
        </div>
      </div>`;

    if (target) target.replaceWith(section);
    else {
      const main = document.querySelector('main');
      if (main) main.append(section);
      else document.body.insertBefore(section, document.querySelector('footer'));
    }

    initialiseVideos(section);
  }

  function showCard(id, title, index) {
    const poster = `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`;
    const source = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
    return `
      <article class="final-broadcast-card" style="--show-index:${index}">
        <video muted loop playsinline preload="none" poster="${poster}" data-final-show-video data-src="${source}" aria-label="${escapeHtml(title)}"></video>
        <span class="final-broadcast-card__shade" aria-hidden="true"></span>
        <div class="final-broadcast-card__copy">
          <span>Émission Neptune Media</span>
          <h3>${escapeHtml(title)}</h3>
          <span class="final-broadcast-card__watch">Voir un extrait ${playIcon()}</span>
        </div>
      </article>`;
  }

  function initialiseVideos(section) {
    if (section.dataset.videosBound === '1') return;
    section.dataset.videosBound = '1';

    const videos = [...section.querySelectorAll('[data-final-show-video]')];
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const loadAndPlay = (video) => {
      if (!video.src) {
        video.src = video.dataset.src;
        video.load();
      }
      if (!reducedMotion) video.play().catch(() => {});
    };

    const stop = (video) => video.pause();

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) loadAndPlay(entry.target);
          else stop(entry.target);
        });
      }, { rootMargin: '240px 0px', threshold: 0.08 });
      videos.forEach((video) => observer.observe(video));
    }

    videos.forEach((video) => {
      const card = video.closest('.final-broadcast-card');
      card?.addEventListener('mouseenter', () => loadAndPlay(video));
      card?.addEventListener('mouseleave', () => stop(video));
      card?.addEventListener('focusin', () => loadAndPlay(video));
      card?.addEventListener('focusout', () => stop(video));
    });
  }

  function findCurrentClosingBlock() {
    const sections = [...document.querySelectorAll('main > section, body > section')];
    return sections.find((section) => {
      const text = normalise(section.textContent || '');
      return text.includes('votre entreprise a deja de la valeur')
        || (text.includes('voir les creneaux disponibles') && text.includes('regarder neptune tv'));
    }) || null;
  }

  function normalise(value) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function escapeHtml(value) {
    return value.replace(/[&<>"]/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
    }[character]));
  }

  function arrowIcon() {
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 12h13M13 7l5 5-5 5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function playIcon() {
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5"/><path d="m10 8 6 4-6 4V8Z" fill="currentColor"/></svg>';
  }

  function networkIcon() {
    return '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="7" cy="8" r="3" stroke="currentColor" stroke-width="1.6"/><circle cx="17" cy="8" r="3" stroke="currentColor" stroke-width="1.6"/><path d="M2.5 19c.5-3.4 2-5.2 4.5-5.2s4 1.8 4.5 5.2M12.5 19c.5-3.4 2-5.2 4.5-5.2s4 1.8 4.5 5.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  }
})();
