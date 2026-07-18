(() => {
  const nativeFetch = window.fetch.bind(window);
  const deferredImpressions = new Set();
  let catalog = { programs: [], episodes: [] };

  const isStreamingHome = () => document.body?.matches('[data-home-structure="streaming-aida-v3"]');

  window.fetch = async (input, init = {}) => {
    try {
      const url = new URL(typeof input === 'string' ? input : input.url, location.href);
      if (url.pathname === '/api/track' && String(init.method || 'GET').toUpperCase() === 'POST') {
        const payload = JSON.parse(String(init.body || '{}'));
        if (payload.event === 'impression' && payload.episodeId) {
          deferredImpressions.add(payload.episodeId);
          return Response.json({ ok: true, deferred: true });
        }
      }
    } catch {}
    return nativeFetch(input, init);
  };

  updateCopy();
  if (!isStreamingHome()) addDeliverables();
  start();

  async function start() {
    try {
      const response = await nativeFetch('/api/public/catalog', { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      catalog = await response.json();
      await waitForCards();
      if (isStreamingHome()) cleanupLegacyCatalogEnhancements();
      else {
        addEpisodeLinks();
        addDiscovery();
      }
      observeImpressions();
      trackBookingLinks();
      window.NeptuneUpgrade = { catalog, nativeFetch, sendTrack, bookingUrl };
      import('/upgrade-media.js?v=3').catch(console.error);
    } catch (error) { console.error('upgrade_failed', error); }
  }

  function updateCopy() {
    setText('.header-actions .btn-primary', 'Voir les créneaux');
    setText('.nav .nav-cta', 'Voir les créneaux disponibles');
    setText('[data-track="final_reservation"]', 'Voir les créneaux disponibles');
    const finalCopy = document.querySelector('.cta-card > p');
    if (finalCopy) finalCopy.textContent = 'Choisissez votre format, consultez les créneaux disponibles et transformez votre trajectoire en un contenu que votre audience aura envie de regarder.';
    const studioCopy = document.querySelector('#studio .studio-copy > p');
    if (studioCopy) studioCopy.textContent = 'Entrez sur le plateau en sachant exactement où vous allez tourner : cadrages, micros, habillage et environnement sont pensés pour mettre votre parole en valeur.';
    document.querySelectorAll('.format-card').forEach((card) => {
      const name = card.querySelector('h3')?.textContent?.trim();
      const links = card.querySelectorAll('a');
      if (!name || links.length < 2) return;
      const slug = name.toLowerCase().includes('hors') ? 'hors-norme' : 'concept-libre';
      links[0].href = `/programmes/${slug}/`;
      links[0].textContent = `Voir les émissions ${name}`;
      links[1].textContent = 'Voir les créneaux et tarifs';
    });
    const links = [...document.querySelectorAll('.footer-col a')];
    const legal = links.find((link) => /légales/i.test(link.textContent));
    const contact = links.find((link) => /^contact$/i.test(link.textContent.trim()));
    if (legal) legal.href = '/mentions-legales/';
    if (contact) contact.href = '/contact/';
    const column = document.querySelector('.footer-col:last-child');
    if (column && !column.querySelector('a[href="/confidentialite/"]')) {
      const privacy = document.createElement('a');
      privacy.href = '/confidentialite/';
      privacy.textContent = 'Confidentialité';
      column.insertBefore(privacy, contact || null);
    }
  }

  function addDeliverables() {
    const questions = document.querySelector('#questions');
    if (!questions || document.querySelector('#livrables')) return;
    const section = document.createElement('section');
    section.id = 'livrables';
    section.className = 'section deliverables-section';
    section.innerHTML = `<div class="container"><div class="section-head"><div><span class="eyebrow">Ce que vous achetez vraiment</span><h2>Une parole maîtrisée. Des contenus prêts à vivre.</h2></div><p>Neptune ne se limite pas à filmer. Le dispositif prépare, conduit et transforme votre prise de parole en actifs de communication exploitables.</p></div><div class="deliverables-grid">${deliverable('01','Un angle éditorial clair','Le problème, la scène et la conviction qui rendent votre histoire utile.')}${deliverable('02','Une préparation sans récitation','Vous savez où va la conversation tout en restant naturel.')}${deliverable('03','Une émission montée','Un contenu structuré, rythmé et habillé dans l’univers Neptune.')}${deliverable('04','Des moments forts réutilisables','Les séquences prévues dans votre offre sont adaptées à vos canaux.')}${deliverable('05','Des fichiers exploitables','Les livrables convenus sont remis pour votre communication.')}${deliverable('06','Une présence qui vous ressemble','Pas de discours corporate artificiel : une parole incarnée et crédible.')}</div><div class="qualification"><div><span class="eyebrow">C’est pour vous si</span><h3>Vous avez une histoire, une conviction ou un savoir-faire à rendre visible.</h3></div><div><span class="eyebrow">Ce n’est pas pour vous si</span><h3>Vous cherchez uniquement une captation rapide sans travail éditorial.</h3></div></div></div>`;
    questions.before(section);
  }

  async function waitForCards() {
    const grid = document.querySelector('#dynamicCatalog');
    if (!grid || grid.querySelector('[data-episode-id]')) return;
    await new Promise((resolve) => {
      const observer = new MutationObserver(() => {
        if (grid.querySelector('[data-episode-id]')) { observer.disconnect(); resolve(); }
      });
      observer.observe(grid, { childList: true });
      setTimeout(() => { observer.disconnect(); resolve(); }, 3000);
    });
  }

  function cleanupLegacyCatalogEnhancements() {
    document.querySelectorAll('.catalog-tools').forEach((item) => item.remove());
    document.querySelectorAll('#dynamicCatalog .media-card-wrap').forEach((wrap) => {
      const card = wrap.querySelector(':scope > [data-episode-id]');
      if (card) wrap.replaceWith(card);
      else wrap.remove();
    });
    document.querySelectorAll('#dynamicCatalog .media-detail-link').forEach((item) => item.remove());
  }

  function addEpisodeLinks() {
    const grid = document.querySelector('#dynamicCatalog');
    if (!grid) return;
    grid.querySelectorAll('[data-episode-id]').forEach((card) => {
      const episode = catalog.episodes.find((item) => item.id === card.dataset.episodeId);
      if (!episode || card.closest('.media-card-wrap')) return;
      const wrap = document.createElement('div');
      wrap.className = 'media-card-wrap';
      card.replaceWith(wrap);
      wrap.append(card);
      const link = document.createElement('a');
      link.className = 'media-detail-link';
      link.href = `/emissions/${encodeURIComponent(episode.slug)}/`;
      link.textContent = 'Détails, partage et transcription →';
      wrap.append(link);
    });
    const hero = document.querySelector('#heroPlay');
    const episode = catalog.episodes.find((item) => item.id === hero?.dataset.episodeId) || catalog.episodes[0];
    const copy = hero?.closest('.hero-media-copy');
    if (episode && copy && !copy.querySelector('.hero-detail-link')) {
      const link = document.createElement('a');
      link.className = 'hero-detail-link';
      link.href = `/emissions/${encodeURIComponent(episode.slug)}/`;
      link.textContent = 'Voir la page de l’émission →';
      copy.append(link);
    }
  }

  function addDiscovery() {
    const grid = document.querySelector('#dynamicCatalog');
    if (!grid || document.querySelector('.catalog-tools')) return;
    const tools = document.createElement('div');
    tools.className = 'catalog-tools';
    tools.innerHTML = `<label class="catalog-search"><span class="sr-only">Rechercher</span><input type="search" placeholder="Rechercher une histoire, un sujet, une émission…"></label><div class="catalog-filters"><button class="is-active" data-filter="all">Tout</button>${catalog.programs.map((item) => `<button data-filter="${escapeHtml(item.id)}">${escapeHtml(item.name)}</button>`).join('')}</div><a class="catalog-all-link" href="/emissions/">Toutes les émissions →</a>`;
    grid.before(tools);
    const input = tools.querySelector('input');
    let selected = 'all';
    const apply = () => {
      const query = normalize(input.value);
      grid.querySelectorAll('[data-episode-id]').forEach((card) => {
        const episode = catalog.episodes.find((item) => item.id === card.dataset.episodeId);
        const text = normalize(`${episode?.title} ${episode?.description} ${programName(episode?.programId)}`);
        card.closest('.media-card-wrap').hidden = (selected !== 'all' && episode?.programId !== selected) || Boolean(query && !text.includes(query));
      });
    };
    input.addEventListener('input', apply);
    tools.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
      selected = button.dataset.filter;
      tools.querySelectorAll('[data-filter]').forEach((item) => item.classList.toggle('is-active', item === button));
      apply();
    }));
  }

  function observeImpressions() {
    const targets = isStreamingHome()
      ? document.querySelectorAll('#dynamicCatalog [data-episode-id]')
      : document.querySelectorAll('.media-card-wrap');
    if (!('IntersectionObserver' in window)) {
      deferredImpressions.forEach((id) => sendTrack('impression', id));
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting || entry.intersectionRatio < .5) return;
      const id = entry.target.matches('[data-episode-id]')
        ? entry.target.dataset.episodeId
        : entry.target.querySelector('[data-episode-id]')?.dataset.episodeId;
      if (id) sendTrack('impression', id);
      observer.unobserve(entry.target);
    }), { threshold: [.5] });
    targets.forEach((item) => observer.observe(item));
  }

  function trackBookingLinks() {
    document.querySelectorAll('[data-funnel]').forEach((link) => link.addEventListener('click', () => {
      const episode = catalog.episodes[0];
      if (episode) sendTrack('booking_click', episode.id);
    }, { capture: true }));
  }

  async function sendTrack(event, episodeId) {
    if (!episodeId) return;
    deferredImpressions.delete(episodeId);
    const sessionId = getSessionId();
    await nativeFetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({ event, episodeId, sessionId, position: 0, delta: 0, referrer: document.referrer, device: { width: innerWidth, touch: navigator.maxTouchPoints > 0, language: navigator.language } }) }).catch(() => {});
  }
  function getSessionId() { let value = localStorage.getItem('neptune_media_session'); if (!value) { value = crypto.randomUUID(); localStorage.setItem('neptune_media_session', value); } return value; }
  function bookingUrl(episode) { const url = new URL('https://media.neptunebusiness.com/'); url.searchParams.set('utm_source','webtv'); url.searchParams.set('utm_medium',episode?'episode_modal':'website'); url.searchParams.set('utm_campaign','neptune_media'); if (episode) url.searchParams.set('episode',episode.slug || episode.id); return url.toString(); }
  function deliverable(number,title,text){return `<article><span>${number}</span><h3>${title}</h3><p>${text}</p></article>`;}
  function programName(id){return catalog.programs.find((item)=>item.id===id)?.name || 'Neptune Media';}
  function setText(selector,text){const item=document.querySelector(selector);if(item)item.textContent=text;}
  function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
})();