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
      if (target.classList.contains('objection-faq') && target.dataset.objectionFaqVersion === '3') return true;

      const faq = document.createElement('section');
      faq.className = 'section objection-faq';
      faq.id = 'faq';
      faq.dataset.aidaStage = 'action';
      faq.dataset.objectionFaqVersion = '3';
      faq.innerHTML = `
        <div class="objection-faq__inner">
          <header class="objection-faq__header">
            <span class="objection-faq__eyebrow">Projetez votre investissement</span>
            <h2>Si vous êtes encore là, <em>voici les vraies questions.</em></h2>
            <p class="objection-faq__intro"><strong>Votre contenu doit continuer à travailler après le tournage.</strong> Voici ce que cet investissement peut concrètement changer.</p>
          </header>

          <div class="objection-faq__content">
            <div class="objection-faq__list" aria-label="Résultats attendus de votre investissement contenu">
              <details class="objection-faq__item" open>
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">01</span>
                  <span class="objection-faq__question-text">Qu’est-ce que cet investissement doit changer pour mon entreprise&nbsp;?</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><div class="objection-faq__answer-inner"><p><span class="objection-faq__truth">Un actif, pas une dépense</span><strong>Vous ne repartez pas seulement avec une vidéo.</strong> Vous repartez avec un message clair, une émission crédible et des contenus réutilisables pour expliquer votre valeur, rassurer et vendre plus longtemps.</p></div></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">02</span>
                  <span class="objection-faq__question-text">Comment mes futurs clients vont-ils me percevoir après l’émission&nbsp;?</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><div class="objection-faq__answer-inner"><p><span class="objection-faq__truth">Plus clair. Plus crédible.</span><strong>Ils doivent comprendre plus vite ce que vous faites et pourquoi vous le faites différemment.</strong> Votre expertise cesse d’être une affirmation&nbsp;: elle devient visible.</p></div></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">03</span>
                  <span class="objection-faq__question-text">Comment ces contenus vont-ils m’aider avant même un rendez-vous&nbsp;?</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><div class="objection-faq__answer-inner"><p><span class="objection-faq__truth">Le contenu prépare la vente</span><strong>Un prospect qui connaît déjà votre approche arrive avec moins de doutes et de meilleures questions.</strong> Vous passez moins de temps à vous présenter, plus de temps à parler de son besoin.</p></div></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">04</span>
                  <span class="objection-faq__question-text">Combien de temps une demi-journée peut-elle continuer à travailler pour moi&nbsp;?</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><div class="objection-faq__answer-inner"><p><span class="objection-faq__truth">Bien après le tournage</span><strong>L’émission et ses extraits peuvent être rediffusés, repartagés et intégrés à vos supports.</strong> Votre passage devient une matière commerciale réutilisable, pas un contenu jetable.</p></div></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">05</span>
                  <span class="objection-faq__question-text">À quoi ressemble un vrai résultat, au-delà des vues&nbsp;?</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><div class="objection-faq__answer-inner"><p><span class="objection-faq__truth">Des conversations plus avancées</span><strong>Le bon résultat, c’est qu’un prospect comprenne votre valeur avant de vous appeler.</strong> Il vous identifie plus vite comme une option crédible et avance avec davantage de confiance.</p></div></div>
              </details>

              <details class="objection-faq__item">
                <summary class="objection-faq__question">
                  <span class="objection-faq__number">06</span>
                  <span class="objection-faq__question-text">Quand cet investissement devient-il rentable&nbsp;?</span>
                  <span class="objection-faq__icon" aria-hidden="true"></span>
                </summary>
                <div class="objection-faq__answer"><div class="objection-faq__answer-inner"><p><span class="objection-faq__truth">Quand il évite de repartir de zéro</span><strong>Il travaille chaque fois qu’il explique votre offre, rassure un prospect ou nourrit une prise de parole.</strong> Aucune promesse magique&nbsp;: sa rentabilité dépend aussi de la façon dont vous le diffusez et l’exploitez.</p></div></div>
              </details>
            </div>

            <p class="objection-faq__closing">Vous ne payez pas simplement pour être filmé. <strong>Vous investissez pour être compris avant même de prendre la parole.</strong></p>
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
      existing.href = '/styles/faq-objections-v1.css?v=3';
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/styles/faq-objections-v1.css?v=3';
    link.dataset.objectionFaqStyles = '1';
    document.head.append(link);
  }

  function bindFaq(section) {
    const items = [...section.querySelectorAll('.objection-faq__item')];
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    items.forEach((item) => {
      const summary = item.querySelector('.objection-faq__question');
      const answer = item.querySelector('.objection-faq__answer');
      if (!summary || !answer) return;

      item.dataset.accordionState = item.open ? 'open' : 'closed';
      summary.setAttribute('aria-expanded', item.open ? 'true' : 'false');
      answer.style.height = item.open ? 'auto' : '0px';

      summary.addEventListener('click', (event) => {
        event.preventDefault();

        const state = item.dataset.accordionState;
        if (state === 'open' || state === 'opening') {
          closeItem(item);
          return;
        }

        items.forEach((other) => {
          if (other !== item && other.open) closeItem(other);
        });
        openItem(item);
      });
    });

    function openItem(item) {
      const summary = item.querySelector('.objection-faq__question');
      const answer = item.querySelector('.objection-faq__answer');
      if (!summary || !answer) return;

      item.classList.remove('is-closing');
      item.open = true;
      item.dataset.accordionState = 'opening';
      summary.setAttribute('aria-expanded', 'true');
      answer.style.height = '0px';

      if (reducedMotion) {
        answer.style.height = 'auto';
        item.dataset.accordionState = 'open';
        return;
      }

      requestAnimationFrame(() => {
        answer.style.height = `${answer.scrollHeight}px`;
      });

      const finish = (event) => {
        if (event.target !== answer || event.propertyName !== 'height') return;
        if (item.dataset.accordionState !== 'opening') return;
        answer.style.height = 'auto';
        item.dataset.accordionState = 'open';
        answer.removeEventListener('transitionend', finish);
      };
      answer.addEventListener('transitionend', finish);
    }

    function closeItem(item) {
      const summary = item.querySelector('.objection-faq__question');
      const answer = item.querySelector('.objection-faq__answer');
      if (!summary || !answer || !item.open) return;

      item.dataset.accordionState = 'closing';
      item.classList.add('is-closing');
      summary.setAttribute('aria-expanded', 'false');
      answer.style.height = `${answer.scrollHeight}px`;

      if (reducedMotion) {
        answer.style.height = '0px';
        item.open = false;
        item.classList.remove('is-closing');
        item.dataset.accordionState = 'closed';
        return;
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          answer.style.height = '0px';
        });
      });

      const finish = (event) => {
        if (event.target !== answer || event.propertyName !== 'height') return;
        if (item.dataset.accordionState !== 'closing') return;
        item.open = false;
        item.classList.remove('is-closing');
        item.dataset.accordionState = 'closed';
        answer.removeEventListener('transitionend', finish);
      };
      answer.addEventListener('transitionend', finish);
    }
  }
})();