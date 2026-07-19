from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "neptune-tv-media-cloudflare" / "public"
INDEX = PUBLIC / "index.html"
ROUTER = ROOT / "neptune-tv-media-cloudflare" / "src" / "public-router.js"
STREAMING_CSS = PUBLIC / "styles" / "neptune-streaming.css"
LANDING_JS = PUBLIC / "landing-conversion.js"
HOME_LIVE_JS = PUBLIC / "home-live.js"

NAV = '''<nav id="primary-navigation" class="nav" data-nav aria-label="Navigation principale">
      <a href="/direct/">Direct</a>
      <a href="/emissions/">Neptune TV</a>
      <a href="#formats">Les formats</a>
      <a href="#experience">Comment ça marche</a>
      <a href="#questions">Questions</a>
      <a href="/espace-client/">Espace client</a>
      <a class="nav-cta" data-funnel data-track="mobile_reservation" href="https://media.neptunebusiness.com/">Voir les offres et les créneaux</a>
    </nav>'''

MAIN = '''<main id="main-content" tabindex="-1">
  <section class="hero voice-hero" data-aida-stage="attention">
    <div class="container hero-grid">
      <div class="hero-copy">
        <p class="inner-voice-hook">« J’ai pas le temps de jouer à l’influenceur. Mais je peux pas continuer à être invisible. »</p>
        <h1>Votre entreprise est solide. <span class="gradient-text">Il faut que ça se voie.</span></h1>
        <p class="hero-subtitle">Neptune trouve le bon angle, vous guide sur un vrai plateau et transforme ce que vous savez déjà en émission et en contenus prêts à publier — sans vous demander de devenir vidéaste.</p>
        <div class="hero-actions">
          <a class="btn btn-primary" data-funnel data-track="hero_reservation" href="https://media.neptunebusiness.com/">Voir les formats et les créneaux</a>
          <a class="btn btn-secondary" href="#a-voir"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><path d="M10 8.7v6.6l5-3.3-5-3.3Z" fill="currentColor"/></svg>Regarder une émission</a>
        </div>
        <div class="hero-meta" aria-label="Ce que Neptune prend en charge">
          <span>Aucun texte à apprendre</span><span>Un vrai plateau</span><span>Production prise en charge</span>
        </div>
      </div>
      <div class="hero-media-wrap">
        <div class="hero-glow" aria-hidden="true"></div>
        <article class="hero-media" data-loading="true">
          <video id="heroPreview" data-autoplay muted loop playsinline preload="none" poster="/assets/posters/poster-neptune-media.webp" aria-hidden="true" tabindex="-1">
            <source id="heroPreviewSource" data-src="/assets/media/neptune-media-mis-en-lumiere.mp4" type="video/mp4">
          </video>
          <div class="hero-media-top"><span class="live-label">À la une</span><span class="real-label">Production Neptune</span></div>
          <button class="motion-toggle" id="heroMotionToggle" type="button" aria-pressed="false">Lancer l’aperçu</button>
          <div class="hero-media-copy">
            <small>Concept Libre · 44 s</small>
            <h2 id="heroEpisodeTitle">Votre entrepreneuriat mis en lumière</h2>
            <button class="video-trigger" id="heroPlay" type="button" data-video-src="/assets/media/neptune-media-mis-en-lumiere.mp4" data-video-poster="/assets/posters/poster-neptune-media.webp" data-video-title="Neptune Media — Votre entrepreneuriat mis en lumière" data-track="hero_video_play"><span class="play-dot" aria-hidden="true">▶</span> Regarder l’extrait</button>
          </div>
        </article>
      </div>
    </div>
  </section>

  <section class="aida-proof-strip voice-proof-strip" aria-label="Ce qui change concrètement">
    <div><b>Vous savez quoi dire</b><span>L’angle est préparé avec vous.</span></div>
    <div><b>Vous restez vous-même</b><span>Une conversation, pas un texte récité.</span></div>
    <div><b>Vous ne gérez pas la technique</b><span>Plateau, réalisation et production réunis.</span></div>
  </section>

  <section class="section proof-by-content" id="a-voir" data-aida-stage="attention">
    <div class="container">
      <div class="section-head section-head--minimal">
        <div><span class="eyebrow">Neptune TV</span><h2>À regarder.</h2></div>
      </div>
      <article class="continue-card" id="continueWatching" hidden>
        <img src="/assets/posters/default.svg" alt="">
        <div><small>Continuer à regarder</small><strong data-continue-title></strong><span data-continue-time></span></div>
        <button class="btn btn-secondary" type="button" data-continue-open>Reprendre</button>
      </article>
      <article class="live-now-card" data-home-live aria-busy="true">
        <div class="live-now-visual"><img src="/assets/posters/studio-wide.webp" alt="Plateau Neptune Media" loading="lazy" decoding="async"><span class="live-now-badge" data-home-live-badge>Programme</span></div>
        <div class="live-now-copy"><small>Neptune Media</small><h3 data-home-live-title>Regardez ce que Neptune met à l’antenne.</h3><p data-home-live-copy>Émissions complètes et extraits restent disponibles immédiatement.</p></div>
        <a class="btn btn-primary" data-home-live-action href="/direct/">Voir le direct</a>
      </article>
      <div class="content-rail-shell" data-content-rail>
        <div class="content-rail-head">
          <h3>Émissions complètes</h3>
          <div class="content-rail-controls" aria-label="Faire défiler les émissions"><button class="rail-control" type="button" data-rail-prev aria-label="Émissions précédentes">←</button><button class="rail-control" type="button" data-rail-next aria-label="Émissions suivantes">→</button></div>
        </div>
        <p id="catalogStatus" class="sr-only" role="status" aria-live="polite"></p>
        <div id="catalogError" class="catalog-error" role="alert" hidden>Le catalogue n’a pas pu être chargé. <button id="catalogRetry" type="button">Réessayer</button></div>
        <div class="video-grid" id="dynamicCatalog" data-rail-track data-media-kind="episode" aria-busy="true">
          <button class="media-card" type="button" data-video-src="/assets/media/accident-moto-entreprise.mp4" data-video-poster="/assets/posters/poster-accident.webp" data-video-title="Un accident de moto met fin à son entreprise" data-track="clip_accident"><img src="/assets/posters/poster-accident.webp" alt="Invitée racontant un accident de moto sur le plateau Neptune" loading="lazy" decoding="async"><span class="card-play" aria-hidden="true">▶</span><span class="media-card-copy"><span class="media-card-meta"><span>Hors Norme</span><span>20 s</span></span><h3>Un accident de moto met fin à son entreprise.</h3></span></button>
          <button class="media-card" type="button" data-video-src="/assets/media/storytelling-efficace.mp4" data-video-poster="/assets/posters/poster-storytelling.webp" data-video-title="Le secret d’un storytelling qui ne sonne pas faux" data-track="clip_storytelling"><img src="/assets/posters/poster-storytelling.webp" alt="Échange sur le storytelling pendant une émission Neptune" loading="lazy" decoding="async"><span class="card-play" aria-hidden="true">▶</span><span class="media-card-copy"><span class="media-card-meta"><span>Concept Libre</span><span>19 s</span></span><h3>Le storytelling utile ne s’invente pas.</h3></span></button>
          <button class="media-card" type="button" data-video-src="/assets/media/humain-avant-business.mp4" data-video-poster="/assets/posters/poster-humain.webp" data-video-title="L’humain avant le business" data-track="clip_humain"><img src="/assets/posters/poster-humain.webp" alt="Entrepreneure expliquant la place de l’humain dans le business" loading="lazy" decoding="async"><span class="card-play" aria-hidden="true">▶</span><span class="media-card-copy"><span class="media-card-meta"><span>Concept Libre</span><span>19 s</span></span><h3>L’humain avant le business.</h3></span></button>
          <button class="media-card" type="button" data-video-src="/assets/media/solution-video-pro.mp4" data-video-poster="/assets/posters/poster-video-pro.webp" data-video-title="Filmer chez soi ? Laissez tomber." data-track="clip_video_pro"><img src="/assets/posters/poster-video-pro.webp" alt="Dirigeant expliquant pourquoi une vidéo professionnelle est plus stratégique" loading="lazy" decoding="async"><span class="card-play" aria-hidden="true">▶</span><span class="media-card-copy"><span class="media-card-meta"><span>Concept Libre</span><span>57 s</span></span><h3>Filmer chez soi ? Laissez tomber.</h3></span></button>
        </div>
      </div>
      <div class="editorial-actions"><a class="btn btn-secondary" href="/emissions/">Explorer Neptune TV</a></div>
    </div>
  </section>

  <section class="inner-voice-section" id="probleme" data-aida-stage="interest">
    <div class="container">
      <div class="section-head voice-section-head"><div><span class="eyebrow">Ce que vous vous dites déjà</span><h2>Vous savez qu’il faut être visible. Pas au point d’en faire un deuxième métier.</h2></div></div>
      <div class="inner-voice-grid">
        <article class="inner-voice-card"><span>01</span><blockquote>« Mon entreprise est sérieuse. Sur internet, ça se voit pas. »</blockquote><p>Votre offre est travaillée. Votre image en ligne ne montre pas encore tout ce qu’il y a derrière.</p></article>
        <article class="inner-voice-card"><span>02</span><blockquote>« Je sais qu’il faut publier. Mais je sais jamais quoi dire. »</blockquote><p>Vous avez des années d’expérience. Devant une caméra, tout paraît soudain banal, commercial ou maladroit.</p></article>
        <article class="inner-voice-card"><span>03</span><blockquote>« J’ai pas le temps de filmer, monter et recommencer chaque semaine. »</blockquote><p>Vous avez déjà une entreprise à faire tourner. Vous n’avez pas à ajouter vidéaste à votre fiche de poste.</p></article>
        <article class="inner-voice-card"><span>04</span><blockquote>« J’ai déjà payé pour de belles vidéos qui n’ont rien changé. »</blockquote><p>Une belle image ne suffit pas. Sans angle fort ni raison de rester, elle finit oubliée dans un dossier.</p></article>
      </div>
      <div class="thought-bridge"><strong>Le problème n’est pas que vous n’avez rien à dire.</strong><p>C’est qu’on vous laisse seul avec la caméra, l’angle, le rythme et toute la production.</p></div>
    </div>
  </section>

  <section class="desire-section voice-solution" id="solution" data-aida-stage="desire">
    <div class="container">
      <div class="desire-hero"><div><span class="eyebrow">Ce que vous cherchez vraiment</span><h2>Être visible sans transformer votre vie en contenu.</h2></div><p>Vous apportez votre métier, votre histoire et vos convictions. Neptune construit tout ce qui permet aux bonnes personnes de les comprendre.</p></div>
      <div class="solution-voice-grid">
        <article class="solution-voice-card"><span>01</span><h3>« Je veux enfin savoir quoi dire. »</h3><p>Le bon angle est préparé avec vous. Vous arrivez en sachant où va l’échange, sans apprendre un texte.</p></article>
        <article class="solution-voice-card"><span>02</span><h3>« Je veux me reconnaître dans la vidéo. »</h3><p>Vous parlez comme vous parlez à vos clients. L’interviewer vous guide sans fabriquer un personnage.</p></article>
        <article class="solution-voice-card"><span>03</span><h3>« Je veux quelque chose qui me serve vraiment. »</h3><p>Selon l’offre choisie, votre intervention devient une émission et des contenus utilisables sur vos supports.</p></article>
      </div>
      <div class="proof-compact" aria-label="Preuves réelles">
        <article><img src="/assets/posters/studio-wide.webp" alt="Vue réelle du plateau Neptune Media" loading="lazy" decoding="async"><div><small>Avant</small><h3>Le message et l’angle sont préparés.</h3></div></article>
        <article><img src="/assets/posters/poster-accident.webp" alt="Extrait Hors Norme" loading="lazy" decoding="async"><div><small>Pendant</small><h3>Vous êtes guidé dans une vraie conversation.</h3></div></article>
        <article><img src="/assets/posters/poster-storytelling.webp" alt="Échange éditorial Neptune" loading="lazy" decoding="async"><div><small>Après</small><h3>Neptune prend en charge la production.</h3></div></article>
      </div>
    </div>
  </section>

  <section class="section format-choice-section" id="formats" data-aida-stage="desire">
    <div class="container">
      <div class="section-head"><div><span class="eyebrow">Deux formats</span><h2>Vous ne cherchez pas une vidéo. Vous cherchez la bonne manière de faire comprendre quelque chose.</h2></div></div>
      <div class="format-grid">
        <article class="format-card format-card--voice"><img src="/assets/posters/studio-wide.webp" alt="Interview Hors Norme sur le plateau Neptune" loading="lazy" decoding="async"><div class="format-card-content"><small>Votre histoire</small><h3>Hors Norme</h3><blockquote class="format-thought">« Les gens savent ce que je fais. Mais ils savent pas ce qui m’a poussé à le faire. »</blockquote><p>Le problème vécu, le déclic et les convictions qui expliquent pourquoi votre entreprise existe et pourquoi elle compte.</p><ul class="offer-list"><li>Trajectoire et histoire humaine</li><li>Interview narrative guidée</li></ul></div></article>
        <article class="format-card format-card--voice"><img src="/assets/posters/concept-libre-wide.webp" alt="Format Concept Libre sur le plateau Neptune" loading="lazy" decoding="async"><div class="format-card-content"><small>Votre objectif</small><h3>Concept Libre</h3><blockquote class="format-thought">« Mon offre est bonne. Mais j’arrive pas à l’expliquer simplement. »</blockquote><p>Un format construit autour de ce que votre audience doit comprendre, ressentir ou retenir : expertise, démonstration, lancement, jeu ou série.</p><ul class="offer-list"><li>Concept éditorial personnalisé</li><li>Mise en scène adaptable</li></ul></div></article>
      </div>
      <div class="format-compare-actions"><a class="btn btn-primary" data-funnel data-track="formats_compare" href="https://media.neptunebusiness.com/">Comparer les offres et les créneaux</a><p>Tarifs, livrables, délais, droits et conditions visibles avant confirmation.</p></div>
    </div>
  </section>

  <section class="section experience-voice" id="experience" data-aida-stage="desire">
    <div class="container">
      <div class="section-head"><div><span class="eyebrow">Un parcours guidé</span><h2>Vous n’arrivez jamais au tournage en vous demandant ce que vous allez bien pouvoir raconter.</h2></div></div>
      <div class="aida-process voice-process">
        <article><span>01 · CHOISIR</span><h3>« Je veux savoir où je vais. »</h3><p>On choisit l’intention et ce que l’émission doit faire comprendre.</p></article>
        <article><span>02 · PRÉPARER</span><h3>« Je veux être préparé sans réciter. »</h3><p>Vous préparez les idées importantes, pas des phrases à apprendre.</p></article>
        <article><span>03 · TOURNER</span><h3>« Je veux pouvoir parler normalement. »</h3><p>L’interviewer guide, relance et fait émerger ce qui compte.</p></article>
        <article><span>04 · RECEVOIR</span><h3>« Je veux que quelqu’un prenne la suite. »</h3><p>La production, le suivi et les fichiers sont centralisés dans votre espace.</p></article>
      </div>
      <div class="trust-bar" id="engagements"><div><b>Vous savez ce que vous réservez</b><span>Prix, périmètre et conditions consultables.</span></div><div><b>Vous êtes préparé avant la caméra</b><span>Vous connaissez les sujets et l’objectif.</span></div><div><b>Vous suivez tout au même endroit</b><span>Rendez-vous, production et fichiers réunis.</span></div></div>
    </div>
  </section>

  <section class="section faq-voice" id="questions">
    <div class="container faq-layout">
      <div class="faq-intro"><span class="eyebrow">Les vraies objections</span><h2>Les questions que vous vous posez avant de dire oui.</h2><p>Des réponses claires, sans promesse floue.</p></div>
      <div class="faq-list">
        <article class="faq-item" data-faq><button id="faq-button-1" type="button" aria-expanded="false" aria-controls="faq-answer-1"><span>Je suis pas à l’aise face caméra. C’est un problème ?</span><span aria-hidden="true">+</span></button><div id="faq-answer-1" class="faq-answer" role="region" aria-labelledby="faq-button-1" hidden><div><p>Non. La préparation et les relances sont justement conçues pour vous éviter de vous retrouver seul face à un objectif.</p></div></div></article>
        <article class="faq-item" data-faq><button id="faq-button-2" type="button" aria-expanded="false" aria-controls="faq-answer-2"><span>Je vais devoir apprendre un texte ?</span><span aria-hidden="true">+</span></button><div id="faq-answer-2" class="faq-answer" role="region" aria-labelledby="faq-button-2" hidden><div><p>Non. Vous préparez des idées et des moments importants. La conversation reste naturelle.</p></div></div></article>
        <article class="faq-item" data-faq><button id="faq-button-3" type="button" aria-expanded="false" aria-controls="faq-answer-3"><span>Comment savoir exactement ce que je vais recevoir ?</span><span aria-hidden="true">+</span></button><div id="faq-answer-3" class="faq-answer" role="region" aria-labelledby="faq-button-3" hidden><div><p>Les livrables, délais, droits et conditions sont indiqués dans l’offre affichée avant la confirmation.</p></div></div></article>
        <article class="faq-item" data-faq><button id="faq-button-4" type="button" aria-expanded="false" aria-controls="faq-answer-4"><span>J’ai déjà fait de belles vidéos qui n’ont rien changé. Qu’est-ce qui est différent ?</span><span aria-hidden="true">+</span></button><div id="faq-answer-4" class="faq-answer" role="region" aria-labelledby="faq-button-4" hidden><div><p>Neptune ne commence pas par la caméra. Le travail part de l’angle, de l’histoire et de ce que l’audience doit comprendre. Le rendu visuel vient soutenir ce message.</p></div></div></article>
        <article class="faq-item" data-faq><button id="faq-button-5" type="button" aria-expanded="false" aria-controls="faq-answer-5"><span>Je peux publier les contenus sur mes propres supports ?</span><span aria-hidden="true">+</span></button><div id="faq-answer-5" class="faq-answer" role="region" aria-labelledby="faq-button-5" hidden><div><p>Les droits d’utilisation applicables sont précisés dans l’offre et les conditions de votre commande.</p></div></div></article>
        <article class="faq-item" data-faq><button id="faq-button-6" type="button" aria-expanded="false" aria-controls="faq-answer-6"><span>Qu’est-ce qui se passe après le paiement ?</span><span aria-hidden="true">+</span></button><div id="faq-answer-6" class="faq-answer" role="region" aria-labelledby="faq-button-6" hidden><div><p>Votre espace client centralise le rendez-vous, la préparation, l’avancement de la production et les livrables prévus.</p></div></div></article>
      </div>
    </div>
  </section>

  <section class="cta-section aida-action voice-final" data-aida-stage="action">
    <div class="container cta-card">
      <p class="inner-voice-hook inner-voice-hook--final">« Je veux être plus visible. Mais je veux pas devenir quelqu’un d’autre pour y arriver. »</p>
      <h2>Votre entreprise a déjà de la valeur. Il est temps que ça se voie.</h2>
      <p>Découvrez le format adapté à ce que vous voulez raconter, expliquer ou lancer.</p>
      <div class="cta-actions"><a class="btn btn-primary" data-funnel data-track="final_reservation" href="https://media.neptunebusiness.com/">Voir les offres et les créneaux</a><a class="btn btn-secondary" href="/emissions/">Regarder Neptune TV</a></div>
      <small class="cta-reassurance">Offres consultables sans engagement · Conditions visibles avant confirmation</small>
    </div>
  </section>
</main>'''

LANDING = '''(() => {
  'use strict';
  const BOOKING = 'https://media.neptunebusiness.com/';
  const SESSION_KEY = 'neptune_media_session';
  const ready = (fn) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn();

  ready(() => {
    decorateBookingLinks();
    addMobileBar();
    bindMobileBarVisibility();
  });

  function decorateBookingLinks() {
    let sessionId = '';
    try { sessionId = localStorage.getItem(SESSION_KEY) || ''; } catch {}
    document.querySelectorAll('a[data-funnel]').forEach((link) => {
      const url = new URL(link.href || BOOKING, location.href);
      if (url.origin !== new URL(BOOKING).origin) return;
      url.searchParams.set('utm_source', 'webtv');
      url.searchParams.set('utm_campaign', 'neptune_media');
      if (!url.searchParams.has('utm_medium')) url.searchParams.set('utm_medium', link.dataset.format ? 'landing_format' : 'website');
      if (link.dataset.format) {
        url.searchParams.set('format', link.dataset.format);
        url.searchParams.set('offre', link.dataset.format);
        url.searchParams.set('utm_content', link.dataset.format);
      }
      if (sessionId) url.searchParams.set('session_id', sessionId);
      link.href = url.toString();
      if (!link.dataset.track) link.dataset.track = 'booking_click';
    });
  }

  function addMobileBar() {
    if (document.querySelector('.mobile-conversion-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'mobile-conversion-bar';
    bar.setAttribute('aria-label', 'Actions rapides');
    bar.innerHTML = `<a href="/emissions/"><span aria-hidden="true">▶</span> Neptune TV</a><a class="primary" data-funnel data-track="mobile_bar_reservation" href="${BOOKING}">Voir les créneaux</a>`;
    document.body.append(bar);
    decorateBookingLinks();
  }

  function bindMobileBarVisibility() {
    const bar = document.querySelector('.mobile-conversion-bar');
    const problem = document.querySelector('#probleme');
    const finalCta = document.querySelector('.voice-final');
    if (!bar || !problem) return;
    const update = () => {
      const start = problem.getBoundingClientRect().top < innerHeight * .72;
      const nearFinal = finalCta && finalCta.getBoundingClientRect().top < innerHeight * .72;
      bar.classList.toggle('is-visible', start && !nearFinal);
    };
    update();
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
  }
})();
'''

HOME_LIVE = '''const response = await fetch('/api/public/catalog', { headers: { Accept: 'application/json' } }).catch(() => null);
const catalog = response?.ok ? await response.json() : { episodes: [] };
const card = document.querySelector('[data-home-live]');

if (card) {
  const badge = card.querySelector('[data-home-live-badge]');
  const title = card.querySelector('[data-home-live-title]');
  const copy = card.querySelector('[data-home-live-copy]');
  const action = card.querySelector('[data-home-live-action]');
  const liveEpisodes = (catalog.episodes || []).filter((item) => {
    const metadata = item.metadata && typeof item.metadata === 'object' ? item.metadata : {};
    const declared = [metadata.format, metadata.type, metadata.orientation, ...(Array.isArray(metadata.tags) ? metadata.tags : [])].filter(Boolean).join(' ');
    const duration = Number(item.durationSeconds || 0);
    const isShort = metadata.short === true || metadata.vertical === true || /short|reel|vertical|portrait/i.test(String(declared)) || (!metadata.fullEpisode && duration > 0 && duration <= 90);
    return !isShort && item.status === 'published' && metadata.live !== false && (metadata.fullEpisode || String(item.videoUrl || '').startsWith('/media/'));
  });
  card.setAttribute('aria-busy', 'false');
  if (liveEpisodes.length) {
    if (badge) badge.textContent = 'En direct';
    if (title) title.textContent = 'Neptune Media est à l’antenne.';
    if (copy) copy.textContent = 'Regardez la diffusion en cours ou choisissez une émission complète.';
    if (action) { action.href = '/direct/'; action.textContent = 'Voir le direct'; }
  } else {
    if (badge) badge.textContent = 'À la demande';
    if (title) title.textContent = 'Les émissions restent disponibles immédiatement.';
    if (copy) copy.textContent = 'Choisissez une histoire, une expertise ou un format à regarder maintenant.';
    if (action) { action.href = '/emissions/'; action.textContent = 'Voir les émissions'; }
  }
}
'''

CSS = r'''/* Conversion voice architecture v10 */
body[data-home-structure="conversion-voice-v10"] .voice-hero{padding-top:clamp(72px,9vw,132px);padding-bottom:clamp(58px,8vw,108px)}
body[data-home-structure="conversion-voice-v10"] .hero-grid{align-items:center;gap:clamp(34px,6vw,92px)}
body[data-home-structure="conversion-voice-v10"] .inner-voice-hook{max-width:620px;margin:0 0 22px;padding-left:18px;border-left:2px solid rgba(118,214,255,.75);color:#c8d7eb;font-size:clamp(.98rem,1.35vw,1.14rem);font-weight:700;line-height:1.55;letter-spacing:-.01em}
body[data-home-structure="conversion-voice-v10"] .hero-copy h1{max-width:720px;font-size:clamp(2.8rem,5vw,5.35rem);line-height:.94;letter-spacing:-.055em}
body[data-home-structure="conversion-voice-v10"] .hero-subtitle{max-width:660px;font-size:clamp(1.02rem,1.45vw,1.2rem);line-height:1.62;color:#bcc9dc}
body[data-home-structure="conversion-voice-v10"] .hero-meta{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
body[data-home-structure="conversion-voice-v10"] .hero-meta span{padding:9px 12px;border:1px solid rgba(159,196,235,.16);border-radius:999px;background:rgba(8,17,38,.58);color:#dbe7f7;font-size:.78rem;font-weight:700}
body[data-home-structure="conversion-voice-v10"] .voice-proof-strip{grid-template-columns:repeat(3,minmax(0,1fr));border-block:1px solid rgba(152,195,231,.12);background:linear-gradient(90deg,rgba(5,12,28,.96),rgba(9,24,48,.86),rgba(5,12,28,.96))}
body[data-home-structure="conversion-voice-v10"] .voice-proof-strip>div{padding-block:20px}
body[data-home-structure="conversion-voice-v10"] .section-head--minimal{margin-bottom:24px}
body[data-home-structure="conversion-voice-v10"] .section-head--minimal h2{font-size:clamp(2.15rem,4vw,4rem)}
body[data-home-structure="conversion-voice-v10"] .proof-by-content{padding-top:clamp(62px,8vw,110px);padding-bottom:clamp(74px,9vw,124px)}
body[data-home-structure="conversion-voice-v10"] .proof-by-content .live-now-card{margin-bottom:34px}
body[data-home-structure="conversion-voice-v10"] .proof-by-content .editorial-actions{justify-content:flex-end}
body[data-home-structure="conversion-voice-v10"] .inner-voice-section{position:relative;padding:clamp(78px,10vw,148px) 0;overflow:hidden;border-block:1px solid rgba(142,199,237,.12);background:radial-gradient(circle at 12% 10%,rgba(26,116,170,.16),transparent 35%),linear-gradient(180deg,#020712,#061127 52%,#020712)}
body[data-home-structure="conversion-voice-v10"] .voice-section-head{max-width:940px;margin-bottom:44px}
body[data-home-structure="conversion-voice-v10"] .voice-section-head h2{max-width:820px;font-size:clamp(2.35rem,4.7vw,4.9rem);line-height:.96}
body[data-home-structure="conversion-voice-v10"] .inner-voice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
body[data-home-structure="conversion-voice-v10"] .inner-voice-card{position:relative;min-height:260px;padding:clamp(25px,3vw,38px);overflow:hidden;border:1px solid rgba(158,204,238,.15);border-radius:24px;background:linear-gradient(145deg,rgba(12,28,55,.9),rgba(5,12,28,.92));box-shadow:0 24px 60px rgba(0,0,0,.22)}
body[data-home-structure="conversion-voice-v10"] .inner-voice-card>span{display:block;margin-bottom:24px;color:#69d0ff;font-size:.72rem;font-weight:900;letter-spacing:.18em}
body[data-home-structure="conversion-voice-v10"] .inner-voice-card blockquote{margin:0;max-width:25ch;color:#fff;font-size:clamp(1.38rem,2.2vw,2.15rem);font-weight:850;line-height:1.12;letter-spacing:-.035em}
body[data-home-structure="conversion-voice-v10"] .inner-voice-card p{max-width:52ch;margin:22px 0 0;color:#aebcd0;line-height:1.6}
body[data-home-structure="conversion-voice-v10"] .inner-voice-card::after{content:'“';position:absolute;right:18px;bottom:-42px;color:rgba(97,205,255,.07);font-size:12rem;font-family:Georgia,serif;line-height:1}
body[data-home-structure="conversion-voice-v10"] .thought-bridge{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:30px;align-items:start;margin-top:26px;padding:30px;border:1px solid rgba(100,210,255,.22);border-radius:22px;background:rgba(12,33,62,.72)}
body[data-home-structure="conversion-voice-v10"] .thought-bridge strong{color:#fff;font-size:clamp(1.35rem,2.4vw,2.15rem);line-height:1.12}
body[data-home-structure="conversion-voice-v10"] .thought-bridge p{margin:0;color:#c2cee0;font-size:1.05rem;line-height:1.65}
body[data-home-structure="conversion-voice-v10"] .voice-solution{padding-block:clamp(82px,10vw,142px)}
body[data-home-structure="conversion-voice-v10"] .voice-solution .desire-hero h2{max-width:800px;font-size:clamp(2.4rem,4.8vw,4.8rem)}
body[data-home-structure="conversion-voice-v10"] .solution-voice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:38px}
body[data-home-structure="conversion-voice-v10"] .solution-voice-card{padding:28px;border:1px solid rgba(148,196,231,.14);border-radius:22px;background:rgba(7,18,39,.74)}
body[data-home-structure="conversion-voice-v10"] .solution-voice-card>span{color:#69d0ff;font-size:.72rem;font-weight:900;letter-spacing:.18em}
body[data-home-structure="conversion-voice-v10"] .solution-voice-card h3{margin:18px 0 12px;color:#fff;font-size:clamp(1.25rem,1.8vw,1.7rem);line-height:1.2}
body[data-home-structure="conversion-voice-v10"] .solution-voice-card p{margin:0;color:#aebcd0;line-height:1.62}
body[data-home-structure="conversion-voice-v10"] .format-choice-section{padding-block:clamp(80px,10vw,142px);background:linear-gradient(180deg,rgba(3,8,19,.96),rgba(7,18,39,.88))}
body[data-home-structure="conversion-voice-v10"] .format-choice-section .section-head{max-width:1050px}
body[data-home-structure="conversion-voice-v10"] .format-choice-section .section-head h2{max-width:980px;font-size:clamp(2.3rem,4.6vw,4.65rem)}
body[data-home-structure="conversion-voice-v10"] .format-card--voice{align-content:start}
body[data-home-structure="conversion-voice-v10"] .format-thought{margin:16px 0 18px;padding:16px 18px;border-left:2px solid #69d0ff;border-radius:0 12px 12px 0;background:rgba(7,22,45,.72);color:#e7f4ff;font-size:clamp(1.02rem,1.4vw,1.18rem);font-weight:800;line-height:1.45}
body[data-home-structure="conversion-voice-v10"] .format-compare-actions{display:flex;flex-direction:column;align-items:center;gap:14px;margin-top:34px;text-align:center}
body[data-home-structure="conversion-voice-v10"] .format-compare-actions p{max-width:680px;margin:0;color:#9fadc0;font-size:.86rem}
body[data-home-structure="conversion-voice-v10"] .experience-voice{padding-block:clamp(80px,10vw,140px)}
body[data-home-structure="conversion-voice-v10"] .experience-voice .section-head{max-width:980px}
body[data-home-structure="conversion-voice-v10"] .experience-voice .section-head h2{max-width:920px;font-size:clamp(2.3rem,4.5vw,4.45rem)}
body[data-home-structure="conversion-voice-v10"] .voice-process article h3{font-size:clamp(1.1rem,1.45vw,1.38rem);line-height:1.28}
body[data-home-structure="conversion-voice-v10"] .faq-voice{padding-block:clamp(82px,10vw,140px);background:linear-gradient(180deg,#020712,#061127)}
body[data-home-structure="conversion-voice-v10"] .faq-intro h2{font-size:clamp(2.2rem,4.3vw,4.25rem)}
body[data-home-structure="conversion-voice-v10"] .voice-final{padding-block:clamp(80px,10vw,136px)}
body[data-home-structure="conversion-voice-v10"] .voice-final .cta-card{padding:clamp(36px,6vw,76px)}
body[data-home-structure="conversion-voice-v10"] .inner-voice-hook--final{margin-inline:auto;text-align:left}
body[data-home-structure="conversion-voice-v10"] .voice-final h2{max-width:900px;margin-inline:auto;font-size:clamp(2.45rem,5vw,5rem)}
body[data-home-structure="conversion-voice-v10"] .cta-reassurance{display:block;margin-top:18px;color:#95a5ba;font-size:.78rem}
.mobile-conversion-bar{transform:translateY(calc(100% + 18px));opacity:0;pointer-events:none;transition:transform .28s ease,opacity .28s ease}
.mobile-conversion-bar.is-visible{transform:translateY(0);opacity:1;pointer-events:auto}
@media(max-width:900px){body[data-home-structure="conversion-voice-v10"] .inner-voice-grid,body[data-home-structure="conversion-voice-v10"] .solution-voice-grid{grid-template-columns:1fr}body[data-home-structure="conversion-voice-v10"] .thought-bridge{grid-template-columns:1fr}body[data-home-structure="conversion-voice-v10"] .voice-proof-strip{grid-template-columns:1fr}body[data-home-structure="conversion-voice-v10"] .voice-proof-strip>div{padding-block:14px}}
@media(max-width:760px){body[data-home-structure="conversion-voice-v10"] .voice-hero{padding-top:54px}body[data-home-structure="conversion-voice-v10"] .inner-voice-hook{font-size:.94rem}body[data-home-structure="conversion-voice-v10"] .hero-copy h1{font-size:clamp(2.55rem,12vw,3.8rem)}body[data-home-structure="conversion-voice-v10"] .inner-voice-card{min-height:0;padding:24px;border-radius:19px}body[data-home-structure="conversion-voice-v10"] .inner-voice-card blockquote{font-size:clamp(1.35rem,7vw,1.8rem)}body[data-home-structure="conversion-voice-v10"] .thought-bridge{padding:24px}body[data-home-structure="conversion-voice-v10"] .proof-by-content .live-now-card{grid-template-columns:1fr}body[data-home-structure="conversion-voice-v10"] .format-compare-actions .btn{width:100%}}
/* End conversion voice architecture v10 */'''


def replace_once(text: str, pattern: str, replacement: str, label: str) -> str:
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"Could not replace {label}")
    return updated


def patch_index() -> None:
    html = INDEX.read_text(encoding="utf-8")
    html = re.sub(r'<title>.*?</title>', '<title>Neptune Media — Émissions et contenus vidéo pour dirigeants</title>', html, count=1)
    html = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="Vous voulez être visible sans devenir influenceur ? Neptune prépare votre message, vous guide sur un vrai plateau et produit votre émission et ses contenus.">', html, count=1)
    html = re.sub(r'<meta property="og:title" content="[^"]*">', '<meta property="og:title" content="Neptune Media — Votre entreprise est solide. Il faut que ça se voie.">', html, count=1)
    html = re.sub(r'<meta property="og:description" content="[^"]*">', '<meta property="og:description" content="Préparation, plateau, interview et production pour dirigeants qui veulent être visibles sans jouer à l’influenceur.">', html, count=1)
    html = re.sub(r'data-home-structure="[^"]+"', 'data-home-structure="conversion-voice-v10"', html, count=1)
    html = re.sub(r'/styles/neptune-streaming\.css\?v=\d+', '/styles/neptune-streaming.css?v=10', html)
    html = replace_once(html, r'<nav id="primary-navigation" class="nav" data-nav aria-label="Navigation principale">.*?</nav>', NAV, 'navigation')
    html = replace_once(html, r'<main id="main-content" tabindex="-1">.*?</main>', MAIN, 'homepage main')
    INDEX.write_text(html, encoding="utf-8")


def patch_router() -> None:
    source = ROUTER.read_text(encoding="utf-8")
    source = re.sub(r'/home-live\.js\?v=\d+', '/home-live.js?v=4', source)
    source = re.sub(r'/landing-conversion\.js\?v=\d+', '/landing-conversion.js?v=5', source)
    source = source.replace("name: 'Neptune Media — Votre entrepreneuriat mis en lumière',", "name: 'Neptune Media — Votre entreprise est solide. Il faut que ça se voie.',")
    source = source.replace("description: 'Neptune Media prépare, tourne et monte des émissions professionnelles qui transforment l’histoire, l’expertise et les convictions d’une entreprise en contenu vidéo durable.',", "description: 'Neptune aide les dirigeants à être visibles sans devenir influenceurs : angle, préparation, plateau, interview et production sont pris en charge.',")
    ROUTER.write_text(source, encoding="utf-8")


def patch_css() -> None:
    text = STREAMING_CSS.read_text(encoding="utf-8")
    text = re.sub(r'/\* Conversion voice architecture v10 \*/.*?/\* End conversion voice architecture v10 \*/\s*', '', text, flags=re.S)
    STREAMING_CSS.write_text(text.rstrip() + '\n\n' + CSS + '\n', encoding="utf-8")


def main() -> None:
    patch_index()
    patch_router()
    patch_css()
    LANDING_JS.write_text(LANDING, encoding="utf-8")
    HOME_LIVE_JS.write_text(HOME_LIVE, encoding="utf-8")
    print('Applied Neptune emotional conversion architecture v10')


if __name__ == '__main__':
    main()
