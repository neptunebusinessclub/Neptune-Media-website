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
      if (target.classList.contains('objection-faq') && target.dataset.objectionFaqVersion === '2') return true;

      const faq = document.createElement('section');
      faq.className = 'section objection-faq';
      faq.id = 'faq';
      faq.dataset.aidaStage = 'action';
      faq.dataset.objectionFaqVersion = '2';
      faq.innerHTML = `
        <div class="objection-faq__inner">
          <header class="objection-faq__header">
            <span class="objection-faq__eyebrow">Les vraies objections</span>
            <h2>Si vous êtes encore là, <em>voici les vraies questions.</em></h2>
            <p class="objection-faq__intro"><strong>Votre prudence est légitime.</strong> Voici des réponses claires, sans promesse floue.</p>
          </header>

          <div class="objection-faq__content">
            <div class="objection-faq__list" aria-label="Réponses aux objections avant de réserver">
              <details class="objection-faq__item" open>
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">01</span>
                  <span class="objection-faq__question-text">Et si je paie encore pour des vidéos inutiles&nbsp;?</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><p><span class="objection-faq__truth">Vous n’achetez pas un décor</span><strong>Tout part de ce que votre audience doit comprendre de vous.</strong> L’angle, les questions et les contenus servent ce message — pas seulement l’esthétique.</p></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">02</span>
                  <span class="objection-faq__question-text">Et si je suis mauvais face caméra&nbsp;?</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><p><span class="objection-faq__truth">Votre expertise suffit</span><strong>Aucun texte à apprendre. Aucun personnage à jouer.</strong> Avec Hors Norme, vous êtes guidé dans une vraie conversation et nous gardons ce qui vous ressemble.</p></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">03</span>
                  <span class="objection-faq__question-text">Et si je n’ai rien d’intéressant à raconter&nbsp;?</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><p><span class="objection-faq__truth">Vous avez déjà la matière</span><strong>Vos clients, vos décisions, vos erreurs et vos convictions sont votre contenu.</strong> Nous faisons émerger ce que vous savez déjà, sans inventer un personnage.</p></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">04</span>
                  <span class="objection-faq__question-text">Est-ce que ça peut vraiment m’apporter des clients&nbsp;?</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><p><span class="objection-faq__truth">Pas de promesse magique</span><strong>Une vidéo ne vend pas toute seule.</strong> Elle peut rendre votre valeur évidente, réduire la méfiance et donner à vos prospects une raison crédible de vous choisir.</p></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">05</span>
                  <span class="objection-faq__question-text">Est-ce que ça va me prendre trop de temps&nbsp;?</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><p><span class="objection-faq__truth">Vous ne devenez pas influenceur</span><strong>Votre effort est concentré sur une demi-journée.</strong> Neptune prépare le cadre, tourne et produit les contenus. Vous restez concentré sur votre entreprise.</p></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">06</span>
                  <span class="objection-faq__question-text">Et si je regrette après avoir réservé&nbsp;?</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><p><span class="objection-faq__truth">Vous gardez le contrôle</span><strong>Avant de payer, vous devez voir le format, ce qui est inclus et la suite.</strong> Si ce n’est pas clair, ne réservez pas. Une bonne décision n’a pas besoin de pression.</p></div>
              </details>
            </div>

            <p class="objection-faq__closing">Vous n’avez pas besoin d’être plus extraverti. <strong>Vous avez besoin d’être mieux compris.</strong></p>
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
    const existing = document.querySelector('link[data-objection-faq-styles]');
    if (existing) {
      existing.href = '/styles/faq-objections-v1.css?v=2';
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/styles/faq-objections-v1.css?v=2';
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
