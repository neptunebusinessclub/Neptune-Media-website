(() => {
  'use strict';
  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    const section = document.querySelector('#probleme.problem-chat-static');
    if (section && section.dataset.chatBound !== '1') {
      section.dataset.chatBound = '1';
      ensureJourneyBefore(section);
      ensureGiftUpgrade();
      initialiseReveal(section);
    }

    ensureObjectionFaq();
  });

  function ensureJourneyBefore(section) {
    if (document.querySelector('#experience.journey-curve-section')) return;

    section.classList.add('inner-voice-section');
    delete document.documentElement.dataset.journeyCurveBound;

    const script = document.createElement('script');
    script.src = '/scroll-pipeline-v2.js?v=11';
    script.dataset.restoreJourney = '1';
    script.addEventListener('load', () => {
      requestAnimationFrame(() => section.classList.remove('inner-voice-section'));
    }, { once: true });
    document.head.append(script);
  }

  function ensureGiftUpgrade() {
    if (document.querySelector('script[data-gift-club-v2]')) return;

    const script = document.createElement('script');
    script.src = '/gift-club-v2.js?v=1';
    script.dataset.giftClubV2 = '1';
    document.head.append(script);
  }

  function initialiseReveal(section) {
    const items = [...section.querySelectorAll('.problem-chat-static__exchange, .problem-chat-static__conclusion')];
    if (!items.length) return;

    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || !('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    section.classList.add('is-chat-enhanced');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.24, rootMargin: '0px 0px -10% 0px' });

    items.forEach((item) => observer.observe(item));
  }

  function ensureObjectionFaq() {
    ensureFaqStylesheet();

    let mutationObserver = null;
    let timeout = 0;

    const mount = () => {
      const target = findFaqTarget();
      if (!target) return false;
      if (target.classList.contains('objection-faq')) return true;

      const faq = document.createElement('section');
      faq.className = 'section objection-faq';
      faq.id = 'faq';
      faq.dataset.aidaStage = 'action';
      faq.dataset.objectionFaqVersion = '1';
      faq.innerHTML = `
        <div class="objection-faq__inner">
          <header class="objection-faq__header">
            <span class="objection-faq__eyebrow">Les vraies objections</span>
            <h2>Si vous êtes encore là, c'est que vous vous posez <em>les mauvaises questions.</em></h2>
            <p class="objection-faq__intro"><strong>Vos hésitations sont légitimes.</strong> Elles prouvent que vous prenez votre image, votre argent et votre temps au sérieux. Elles méritent donc mieux que des promesses vagues.</p>
          </header>

          <div>
            <div class="objection-faq__list" aria-label="Réponses aux objections avant de réserver">
              <details class="objection-faq__item" open>
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">01</span>
                  <span class="objection-faq__question-text">« Et si je dépense encore de l’argent pour des vidéos qui ne changent rien ? »</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><p><span class="objection-faq__truth">Votre méfiance est justifiée</span><strong>Vous avez raison de ne plus acheter de “belles images” à l’aveugle.</strong> Ici, on commence par ce que votre audience doit comprendre de vous. Le format, les questions et les contenus sont construits autour de cet objectif — pas autour d’un décor.</p></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">02</span>
                  <span class="objection-faq__question-text">« Je ne suis pas à l’aise face caméra. Et si je donne une mauvaise image de mon entreprise ? »</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><p><span class="objection-faq__truth">Vous n’avez aucun rôle à jouer</span><strong>Être mal à l’aise ne dit rien de votre valeur.</strong> Vous n’avez pas à devenir présentateur ni à réciter un texte. Avec Hors Norme, vous êtes guidé comme dans une vraie conversation. Votre expertise fait le reste.</p></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">03</span>
                  <span class="objection-faq__question-text">« Honnêtement, je ne sais même pas ce que j’aurais d’intéressant à raconter. »</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><p><span class="objection-faq__truth">Vous avez déjà la matière</span><strong>Vous n’avez pas besoin d’inventer une histoire spectaculaire.</strong> Vos décisions, vos erreurs, vos convictions et les problèmes que vous résolvez chaque jour prouvent déjà votre savoir-faire. Notre travail est de les faire émerger clairement.</p></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">04</span>
                  <span class="objection-faq__question-text">« Et si personne ne regarde — ou si ça ne m’apporte aucun client ? »</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><p><span class="objection-faq__truth">Pas de fausse garantie</span><strong>Aucune équipe sérieuse ne peut vous promettre qu’une vidéo créera des clients toute seule.</strong> Elle peut en revanche rendre votre valeur plus claire, renforcer la confiance et vous donner des contenus crédibles à diffuser et réutiliser dans le temps.</p></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">05</span>
                  <span class="objection-faq__question-text">« Je n’ai pas le temps de devenir créateur de contenu. »</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><p><span class="objection-faq__truth">C’est précisément le problème résolu</span><strong>Vous avez autre chose à faire que jouer à l’influenceur.</strong> La préparation, le tournage et la production sont pensés pour concentrer l’effort en une expérience cadrée — pas pour ajouter un nouveau métier à votre agenda.</p></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">06</span>
                  <span class="objection-faq__question-text">« Comment savoir que je ne vais pas regretter après avoir réservé ? »</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><p><span class="objection-faq__truth">La prudence est saine</span><strong>Avant de payer, vous devez comprendre le format, ce qui est inclus, ce que vous recevrez et ce qui se passe ensuite.</strong> Si ce n’est pas clair pour vous, ne réservez pas. Une bonne décision n’a pas besoin de pression.</p></div>
              </details>
            </div>

            <p class="objection-faq__closing"><strong>Votre prudence n’est pas un frein.</strong> C’est la preuve que votre image compte. La seule mauvaise question serait de vous demander si vous devez devenir quelqu’un d’autre pour être visible.</p>
          </div>
        </div>`;

      target.replaceWith(faq);
      bindFaq(faq);
      return true;
    };

    if (mount()) return;

    mutationObserver = new MutationObserver(() => {
      if (!mount()) return;
      mutationObserver.disconnect();
      window.clearTimeout(timeout);
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    timeout = window.setTimeout(() => mutationObserver.disconnect(), 10000);
  }

  function findFaqTarget() {
    const byId = document.querySelector('#faq');
    if (byId) return byId;

    return [...document.querySelectorAll('section')].find((section) => {
      const text = normaliseText(section.textContent || '');
      const hasCurrentTitle = text.includes('les questions que vous vous posez avant de dire oui');
      const hasCurrentQuestions = text.includes('face camera') && text.includes('apres le paiement');
      return hasCurrentTitle || hasCurrentQuestions;
    }) || null;
  }

  function normaliseText(value) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’‘]/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function ensureFaqStylesheet() {
    if (document.querySelector('link[data-objection-faq-styles]')) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/styles/faq-objections-v1.css?v=1';
    link.dataset.objectionFaqStyles = '1';
    document.head.append(link);
  }

  function bindFaq(section) {
    const items = [...section.querySelectorAll('.objection-faq__item')];
    items.forEach((item) => {
      item.addEventListener('toggle', () => {
        if (!item.open) return;
        items.forEach((other) => {
          if (other !== item) other.open = false;
        });
      });
    });
  }
})();